const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ad-dashboard.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    logger.info(`SQLite database opened at ${DB_PATH}`);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scripts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      filename    TEXT NOT NULL UNIQUE,
      category    TEXT NOT NULL CHECK(category IN ('user-mgmt','password-unlock','groups','security','reports','compliance')),
      description TEXT,
      risk_level  TEXT NOT NULL DEFAULT 'Read' CHECK(risk_level IN ('Read','Write','Destructive')),
      parameters  TEXT NOT NULL DEFAULT '[]',  -- JSON array of parameter definitions
      file_path   TEXT NOT NULL,               -- absolute path on server filesystem
      file_size   INTEGER,
      created_by  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      ai_analyzed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS run_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      script_id   INTEGER NOT NULL REFERENCES scripts(id),
      run_by      TEXT NOT NULL,
      dc_target   TEXT NOT NULL,
      parameters  TEXT NOT NULL DEFAULT '{}',  -- JSON object of param name→value
      status      TEXT NOT NULL CHECK(status IN ('running','success','error','timeout')),
      output      TEXT,
      error       TEXT,
      duration_ms INTEGER,
      started_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      role       TEXT NOT NULL CHECK(role IN ('it-admin','helpdesk-l1','helpdesk-l2','security-ops','reports-viewer')),
      granted_by TEXT,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_run_history_script ON run_history(script_id);
    CREATE INDEX IF NOT EXISTS idx_run_history_user   ON run_history(run_by);
    CREATE INDEX IF NOT EXISTS idx_run_history_dc     ON run_history(dc_target);
  `);
}

module.exports = { getDb };
