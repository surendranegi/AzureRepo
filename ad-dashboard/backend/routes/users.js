const express = require('express');
const router  = express.Router();
const { getDb } = require('../db/schema');
const { requireRole } = require('../middleware/auth');
const logger  = require('../logger');

const VALID_ROLES = ['it-admin','helpdesk-l1','helpdesk-l2','security-ops','reports-viewer'];

// ─── GET /api/users ──────────────────────────────────────────────────────────
router.get('/', requireRole('it-admin'), (req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT id, username, role, granted_by, granted_at FROM user_roles ORDER BY username').all();
  res.json(rows);
});

// ─── POST /api/users ─────────────────────────────────────────────────────────
router.post('/', requireRole('it-admin'), (req, res) => {
  const { username, role } = req.body;
  if (!username || !role) return res.status(400).json({ error: 'username and role required' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const safe = username.toLowerCase().replace(/[^a-z0-9_.@\-\\]/g, '');
  const db = getDb();

  try {
    const info = db.prepare(
      'INSERT OR REPLACE INTO user_roles (username, role, granted_by) VALUES (?, ?, ?)'
    ).run(safe, role, req.user.username);
    logger.info(`Role "${role}" assigned to "${safe}" by ${req.user.username}`);
    res.status(201).json({ id: info.lastInsertRowid, username: safe, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/users/:id ────────────────────────────────────────────────────
router.patch('/:id', requireRole('it-admin'), (req, res) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const db  = getDb();
  const row = db.prepare('SELECT * FROM user_roles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE user_roles SET role = ?, granted_by = ? WHERE id = ?')
    .run(role, req.user.username, req.params.id);

  logger.info(`Role updated to "${role}" for "${row.username}" by ${req.user.username}`);
  res.json({ ok: true });
});

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────
router.delete('/:id', requireRole('it-admin'), (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM user_roles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });

  // Prevent removing yourself
  if (row.username === req.user.username) {
    return res.status(400).json({ error: 'Cannot remove your own access' });
  }

  db.prepare('DELETE FROM user_roles WHERE id = ?').run(req.params.id);
  logger.info(`Access removed for "${row.username}" by ${req.user.username}`);
  res.json({ ok: true });
});

// ─── GET /api/users/me ───────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  res.json({
    username:       req.user.username,
    role:           req.user.role,
    categoryAccess: req.user.categoryAccess,
    writeAccess:    req.user.writeAccess
  });
});

module.exports = router;
