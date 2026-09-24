/**
 * PowerShell script runner.
 *
 * Executes a .ps1 file against a remote DC using WinRM (Invoke-Command).
 * Script arguments are passed as a PS hashtable — no string concatenation.
 *
 * Credentials are passed via environment variables (PS_CRED_USER / PS_CRED_PASS)
 * on the child process — NOT via command-line arguments, which are visible in
 * Task Manager / process listings. The env vars exist only for the lifetime of
 * the child process and are never logged.
 *
 * Requires: PowerShell 7+ (pwsh) installed on the server.
 */
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../logger');

const SCRIPT_ROOT = process.env.SCRIPT_ROOT || 'D:\\ADScripts';
const TIMEOUT_MS  = parseInt(process.env.PS_TIMEOUT_MS || '60000', 10);

/**
 * Run a PowerShell script against a Domain Controller via WinRM.
 *
 * @param {string} scriptPath   - Full path to the .ps1 file on the server
 * @param {string} dcTarget     - Fully-qualified DC hostname
 * @param {Object} params       - Script param() key/value pairs
 * @param {Object} [credentials]- { username: 'CORP\\user', password: '...' }
 *                                If omitted, runs under the process identity (service account)
 * @returns {Promise<{stdout, stderr, exitCode, durationMs}>}
 */
function runScript(scriptPath, dcTarget, params = {}, credentials = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Build a hashtable literal for -ArgumentList — values are never interpolated
    const hashEntries = Object.entries(params)
      .map(([k, v]) => `${sanitizeParamName(k)} = ${toPsLiteral(v)}`)
      .join('; ');
    const argHashtable = `@{ ${hashEntries} }`;

    // Wrapper script: build PSCredential from env vars if provided,
    // then call Invoke-Command. The credential block is included only
    // when credentials are supplied — otherwise uses process identity.
    const credBlock = credentials
      ? `
$_pass = ConvertTo-SecureString $env:PS_CRED_PASS -AsPlainText -Force
$_cred = [System.Management.Automation.PSCredential]::new($env:PS_CRED_USER, $_pass)
$_credParam = @{ Credential = $_cred }`
      : `$_credParam = @{}`;

    const wrapperScript = `
$ErrorActionPreference = 'Stop'
${credBlock}
$scriptBlock = [scriptblock]::Create((Get-Content -Raw -LiteralPath '${escapePsPath(scriptPath)}'))
Invoke-Command -ComputerName '${escapePsString(dcTarget)}' -ScriptBlock $scriptBlock -ArgumentList ${argHashtable} @_credParam
`.trim();

    const psArgs = ['-NonInteractive', '-NoProfile', '-Command', wrapperScript];

    // Credentials go into the child env, not the command line
    const childEnv = { ...process.env };
    if (credentials) {
      childEnv.PS_CRED_USER = credentials.username;
      childEnv.PS_CRED_PASS = credentials.password;
    }

    const runAs = credentials ? credentials.username : '(service account)';
    logger.info(`Running "${path.basename(scriptPath)}" against ${dcTarget} as ${runAs}`);

    const child = spawn('pwsh', psArgs, {
      env: childEnv,
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
      logger.info(`"${path.basename(scriptPath)}" finished in ${durationMs}ms, exit=${exitCode}`);
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
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escapePsPath(p)   { return p.replace(/'/g, "''"); }
function escapePsString(s) { return s.replace(/'/g, "''"); }

module.exports = { runScript, SCRIPT_ROOT };
