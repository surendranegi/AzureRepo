/**
 * PowerShell script runner.
 *
 * Executes a .ps1 file against a remote DC using WinRM (Invoke-Command).
 * Arguments are passed as a hashtable via -ArgumentList so no string
 * concatenation ever touches user input (prevents injection).
 *
 * Requires: PowerShell 7+ (pwsh) installed on the server.
 * The server's service account must have WinRM access to the target DC.
 */
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../logger');

const SCRIPT_ROOT = process.env.SCRIPT_ROOT || 'D:\\ADScripts';
const TIMEOUT_MS  = parseInt(process.env.PS_TIMEOUT_MS || '60000', 10);

/**
 * Run a PowerShell script against a Domain Controller via WinRM.
 *
 * @param {string} scriptPath - Full path to the .ps1 file on the server
 * @param {string} dcTarget   - Fully-qualified DC hostname, e.g. DC01-NewYork.corp.abg.com
 * @param {Object} params     - Key/value pairs matching the script's param() block
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number, durationMs: number}>}
 */
function runScript(scriptPath, dcTarget, params = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Build a hashtable literal for -ArgumentList so values are never interpolated
    const hashEntries = Object.entries(params)
      .map(([k, v]) => `${sanitizeParamName(k)} = ${toPsLiteral(v)}`)
      .join('; ');
    const argHashtable = `@{ ${hashEntries} }`;

    // The wrapper script: loads the target script as a scriptblock and
    // calls Invoke-Command with the argument hashtable
    const wrapperScript = `
$ErrorActionPreference = 'Stop'
$scriptBlock = [scriptblock]::Create((Get-Content -Raw -LiteralPath '${escapePsPath(scriptPath)}'))
Invoke-Command -ComputerName '${escapePsString(dcTarget)}' -ScriptBlock $scriptBlock -ArgumentList ${argHashtable}
`.trim();

    const psArgs = ['-NonInteractive', '-NoProfile', '-Command', wrapperScript];

    logger.info(`Running script "${path.basename(scriptPath)}" against ${dcTarget}`);

    const child = spawn('pwsh', psArgs, {
      timeout: TIMEOUT_MS,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Script timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS + 2000);

    child.on('close', exitCode => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      logger.info(`Script "${path.basename(scriptPath)}" finished in ${durationMs}ms, exit=${exitCode}`);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode, durationMs });
    });

    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Whitelist param names to [A-Za-z0-9_] only */
function sanitizeParamName(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid parameter name: ${name}`);
  }
  return name;
}

/** Convert a JS value to a safe PowerShell literal */
function toPsLiteral(value) {
  if (value === null || value === undefined) return '$null';
  if (typeof value === 'boolean') return value ? '$true' : '$false';
  if (typeof value === 'number') return String(value);
  // String: escape single quotes by doubling them, wrap in single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Escape a file path for use in single-quoted PS string (forward slashes only) */
function escapePsPath(p) {
  return p.replace(/'/g, "''");
}

/** Escape a hostname for use in single-quoted PS string */
function escapePsString(s) {
  return s.replace(/'/g, "''");
}

module.exports = { runScript, SCRIPT_ROOT };
