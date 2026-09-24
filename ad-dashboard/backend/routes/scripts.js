const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { getDb }       = require('../db/schema');
const { runScript, SCRIPT_ROOT } = require('../scripts/runner');
const { analyzeScript }          = require('../scripts/ai-analyzer');
const { requireRole }            = require('../middleware/auth');
const logger  = require('../logger');

// ─── Domain Controllers allowlist ────────────────────────────────────────────
// Add or remove DCs here. The frontend DcSelector.jsx DC_MAP must also be
// updated to match — both lists control what reaches the WinRM runner.
// Connection uses the service account identity set in IIS App Pool / NSSM.
const ALLOWED_DCS = [
  // NAM — North America
  'DC01-NewYork.corp.abg.com',
  'DC02-Chicago.corp.abg.com',
  'DC03-Dallas.corp.abg.com',
  // EMEA — Europe / Middle East / Africa
  'DC01-London.corp.abg.com',
  'DC02-Frankfurt.corp.abg.com',
  'DC03-Dubai.corp.abg.com',
  // APAC — Asia Pacific
  'DC01-Singapore.corp.abg.com',
  'DC02-Sydney.corp.abg.com',
  'DC03-Tokyo.corp.abg.com',
  // DR — Disaster Recovery
  'DC01-DR.corp.abg.com',
  'DC02-DR.corp.abg.com',
];

// Multer: accept only .ps1 files, store in memory for AI analysis first
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 }, // 512 KB max
  fileFilter(req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() !== '.ps1') {
      return cb(new Error('Only .ps1 files are accepted'));
    }
    cb(null, true);
  }
});

// ─── GET /api/scripts ────────────────────────────────────────────────────────
// List scripts the user's role can access
router.get('/', (req, res) => {
  const db = getDb();
  const { category } = req.query;

  let query = 'SELECT * FROM scripts';
  const params = [];

  const accessible = req.user.categoryAccess;

  if (category && accessible.includes(category)) {
    query += ' WHERE category = ?';
    params.push(category);
  } else if (!category) {
    query += ` WHERE category IN (${accessible.map(() => '?').join(',')})`;
    params.push(...accessible);
  } else {
    return res.json([]); // category requested but not allowed
  }

  query += ' ORDER BY category, name';
  const rows = db.prepare(query).all(...params);

  res.json(rows.map(r => ({ ...r, parameters: JSON.parse(r.parameters) })));
});

// ─── GET /api/scripts/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Script not found' });

  if (!req.user.categoryAccess.includes(row.category)) {
    return res.status(403).json({ error: 'Access denied for this category' });
  }

  res.json({ ...row, parameters: JSON.parse(row.parameters) });
});

// ─── POST /api/scripts/upload ────────────────────────────────────────────────
// Upload a .ps1 file, run AI analysis, store metadata + file on disk
router.post('/upload', requireRole('it-admin'), upload.single('script'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { category } = req.body;
  const validCategories = ['user-mgmt','password-unlock','groups','security','reports','compliance'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const filename = req.file.originalname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const destDir  = path.join(SCRIPT_ROOT, category);
  const destPath = path.join(destDir, filename);

  try {
    // AI analysis runs first (on memory buffer) before writing to disk
    const content  = req.file.buffer.toString('utf-8');
    const analysis = await analyzeScript(content, filename);

    // Write to server filesystem
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destPath, content, 'utf-8');

    // Persist metadata to SQLite
    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO scripts
        (name, filename, category, description, risk_level, parameters, file_path, file_size, created_by, ai_analyzed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const info = stmt.run(
      analysis.description || filename,
      filename,
      analysis.category || category,
      analysis.description,
      analysis.risk_level,
      JSON.stringify(analysis.parameters || []),
      destPath,
      req.file.size,
      req.user.username
    );

    logger.info(`Script "${filename}" uploaded by ${req.user.username}`);
    res.status(201).json({ id: info.lastInsertRowid, ...analysis, filename });
  } catch (err) {
    logger.error(`Upload failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/scripts/:id/run ───────────────────────────────────────────────
// Execute a script against a DC
router.post('/:id/run', async (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Script not found' });

  if (!req.user.categoryAccess.includes(row.category)) {
    return res.status(403).json({ error: 'Access denied for this category' });
  }

  // Write/Destructive scripts require write access for the category
  if (['Write','Destructive'].includes(row.risk_level)) {
    if (!req.user.writeAccess.includes(row.category)) {
      return res.status(403).json({ error: 'Your role does not allow running Write/Destructive scripts in this category' });
    }
  }

  const { dcTarget, params = {}, credentials } = req.body;
  if (!dcTarget) return res.status(400).json({ error: 'dcTarget is required' });

  // Validate DC is in allowed list (defined at top of file)
  if (!ALLOWED_DCS.includes(dcTarget)) {
    return res.status(400).json({ error: 'Invalid DC target' });
  }

  // Validate credentials if provided — must have both username and password
  // Credentials are used for this request only and are never stored or logged
  let runCredentials = null;
  if (credentials) {
    const { username, password } = credentials;
    if (!username || !password) {
      return res.status(400).json({ error: 'Both username and password are required' });
    }
    // Basic sanity check on username format (DOMAIN\user or user@domain)
    if (!/^[\w\-.\\@]+$/.test(username) || username.length > 256) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
    runCredentials = { username, password };
  }

  // Insert run record as 'running' — run_by is the Windows Auth user, never the AD password
  const insertRun = db.prepare(`
    INSERT INTO run_history (script_id, run_by, dc_target, parameters, status)
    VALUES (?, ?, ?, ?, 'running')
  `);
  const { lastInsertRowid: runId } = insertRun.run(row.id, req.user.username, dcTarget, JSON.stringify(params));

  try {
    const result = await runScript(row.file_path, dcTarget, params, runCredentials);

    const status = result.exitCode === 0 ? 'success' : 'error';
    db.prepare(`
      UPDATE run_history SET status=?, output=?, error=?, duration_ms=?, finished_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(status, result.stdout, result.stderr || null, result.durationMs, runId);

    res.json({ runId, status, output: result.stdout, error: result.stderr, durationMs: result.durationMs });
  } catch (err) {
    db.prepare(`
      UPDATE run_history SET status='error', error=?, finished_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(err.message, runId);
    logger.error(`Script run ${runId} failed: ${err.message}`);
    res.status(500).json({ runId, status: 'error', error: err.message });
  }
});

// ─── DELETE /api/scripts/:id ─────────────────────────────────────────────────
router.delete('/:id', requireRole('it-admin'), (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  try {
    fs.unlinkSync(row.file_path);
  } catch (e) {
    logger.warn(`Could not delete file ${row.file_path}: ${e.message}`);
  }

  db.prepare('DELETE FROM scripts WHERE id = ?').run(req.params.id);
  logger.info(`Script "${row.filename}" deleted by ${req.user.username}`);
  res.json({ ok: true });
});

module.exports = router;
