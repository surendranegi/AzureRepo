/**
 * AI script analyzer — uses Claude API to inspect a PowerShell script and
 * return structured metadata: description, parameters, risk level, category.
 *
 * Only the script TEXT is sent to the API. No AD data, no credentials,
 * no output from previous runs. (ABG ABGCS-956 compliance)
 */
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_PROMPT = `You are an expert PowerShell / Active Directory engineer.
Analyse the PowerShell script below and return ONLY a valid JSON object with these fields:

{
  "description": "One clear sentence describing what this script does",
  "risk_level": "Read" | "Write" | "Destructive",
  "category": "user-mgmt" | "password-unlock" | "groups" | "security" | "reports" | "compliance",
  "parameters": [
    {
      "name": "ParameterName",
      "type": "string" | "number" | "boolean" | "choice",
      "label": "Human-readable label",
      "required": true | false,
      "choices": ["opt1","opt2"]    // only when type=choice
    }
  ]
}

Risk level rules:
- Read: script only reads/queries AD data, no modifications
- Write: script creates, modifies, or enables/disables AD objects
- Destructive: script deletes objects, resets passwords, or makes irreversible changes

Category rules:
- user-mgmt: create/modify/disable/enable user accounts
- password-unlock: password resets, account unlocks
- groups: group membership, group policy
- security: audit, permissions, privileged accounts, ACLs
- reports: data export, reporting, list queries
- compliance: SOX, ISO, GDPR, policy checks

Return ONLY the JSON. No markdown, no explanation.`;

/**
 * Analyse a PowerShell script file content using Claude.
 *
 * @param {string} scriptContent - Raw text of the .ps1 file
 * @param {string} filename      - Original filename (used as context hint)
 * @returns {Promise<{description, risk_level, category, parameters}>}
 */
async function analyzeScript(scriptContent, filename) {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not set — returning placeholder analysis');
    return buildFallback(filename);
  }

  const truncated = scriptContent.slice(0, 8000); // cap at 8k chars
  const userMessage = `Filename: ${filename}\n\n\`\`\`powershell\n${truncated}\n\`\`\``;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: `${ANALYSIS_PROMPT}\n\n${userMessage}` }
      ]
    });

    const raw = response.content[0]?.text?.trim() || '';
    const parsed = JSON.parse(raw);

    // Basic validation
    if (!parsed.description || !parsed.risk_level || !parsed.category) {
      throw new Error('Incomplete AI response');
    }
    if (!Array.isArray(parsed.parameters)) parsed.parameters = [];

    logger.info(`AI analyzed "${filename}": ${parsed.category} / ${parsed.risk_level}`);
    return parsed;
  } catch (err) {
    logger.error(`AI analysis failed for "${filename}": ${err.message}`);
    return buildFallback(filename);
  }
}

function buildFallback(filename) {
  return {
    description: `PowerShell script: ${filename}`,
    risk_level: 'Read',
    category: 'reports',
    parameters: []
  };
}

module.exports = { analyzeScript };
