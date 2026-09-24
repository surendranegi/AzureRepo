/**
 * Windows Authentication middleware.
 *
 * When hosted behind IIS with Windows Authentication enabled, IIS sets the
 * LOGON_USER server variable which Express receives as the HTTP header
 * X-Iis-Logon-User (IIS rewrites it).  In dev the DEV_USER env var is used.
 *
 * The middleware attaches req.user = { username, role } to every request.
 */
const { getDb } = require('../db/schema');
const logger = require('../logger');

const ROLE_HIERARCHY = ['reports-viewer', 'helpdesk-l1', 'helpdesk-l2', 'security-ops', 'it-admin'];

// Categories each role may access (read)
const ROLE_CATEGORY_ACCESS = {
  'it-admin':        ['user-mgmt','password-unlock','groups','security','reports','compliance'],
  'helpdesk-l2':     ['password-unlock','user-mgmt','groups'],
  'helpdesk-l1':     ['password-unlock'],
  'security-ops':    ['security','reports','compliance'],
  'reports-viewer':  ['reports']
};

// Categories each role may WRITE (run write/destructive scripts)
const ROLE_WRITE_ACCESS = {
  'it-admin':    ['user-mgmt','password-unlock','groups','security','reports','compliance'],
  'helpdesk-l2': ['password-unlock','user-mgmt','groups'],
  'helpdesk-l1': ['password-unlock'],
  'security-ops':['security','reports','compliance'],
  'reports-viewer': []
};

function resolveUsername(req) {
  // IIS Windows Auth header
  if (req.headers['x-iis-logon-user']) return req.headers['x-iis-logon-user'];
  // Dev fallback
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_USER) return process.env.DEV_USER;
  return null;
}

async function authMiddleware(req, res, next) {
  const rawUsername = resolveUsername(req);
  if (!rawUsername) {
    return res.status(401).json({ error: 'Unauthenticated — Windows Auth required' });
  }

  // Strip domain prefix (CORP\username → username)
  const username = rawUsername.includes('\\')
    ? rawUsername.split('\\')[1].toLowerCase()
    : rawUsername.toLowerCase();

  const db = getDb();
  const row = db.prepare('SELECT role FROM user_roles WHERE username = ?').get(username);

  if (!row) {
    logger.warn(`Unauthorised access attempt by ${username}`);
    return res.status(403).json({ error: `User "${username}" has no role assigned. Contact IT Admin.` });
  }

  req.user = {
    username,
    role: row.role,
    categoryAccess: ROLE_CATEGORY_ACCESS[row.role] || [],
    writeAccess:    ROLE_WRITE_ACCESS[row.role] || []
  };

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole, ROLE_CATEGORY_ACCESS, ROLE_WRITE_ACCESS };
