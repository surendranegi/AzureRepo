const express = require('express');
const router  = express.Router();
const { getDb } = require('../db/schema');

// ─── GET /api/history ────────────────────────────────────────────────────────
// Returns run history visible to the current user's role
router.get('/', (req, res) => {
  const db = getDb();
  const limit  = Math.min(parseInt(req.query.limit  || '50', 10), 200);
  const offset = parseInt(req.query.offset || '0', 10);

  let baseWhere = '';
  const queryParams = [];

  // Non-admins see only their own runs
  if (req.user.role !== 'it-admin' && req.user.role !== 'security-ops') {
    baseWhere = 'WHERE rh.run_by = ?';
    queryParams.push(req.user.username);
  }

  const rows = db.prepare(`
    SELECT rh.id, rh.run_by, rh.dc_target, rh.status, rh.duration_ms,
           rh.started_at, rh.finished_at,
           s.name AS script_name, s.category, s.risk_level
    FROM run_history rh
    JOIN scripts s ON s.id = rh.script_id
    ${baseWhere}
    ORDER BY rh.started_at DESC
    LIMIT ? OFFSET ?
  `).all(...queryParams, limit, offset);

  res.json(rows);
});

// ─── GET /api/history/:id ────────────────────────────────────────────────────
// Full detail including output/error for a single run
router.get('/:id', (req, res) => {
  const db  = getDb();
  const row = db.prepare(`
    SELECT rh.*, s.name AS script_name, s.category, s.risk_level
    FROM run_history rh JOIN scripts s ON s.id = rh.script_id
    WHERE rh.id = ?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Run not found' });

  // Only admin/security-ops or the run's own user may see full output
  if (req.user.role !== 'it-admin' && req.user.role !== 'security-ops' && row.run_by !== req.user.username) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ ...row, parameters: JSON.parse(row.parameters || '{}') });
});

module.exports = router;
