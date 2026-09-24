require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const logger      = require('./logger');
const { authMiddleware } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In production, IIS serves both backend and frontend so CORS is only needed for dev
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS policy violation'));
  },
  credentials: true
}));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests' }
}));

// Tighter limit on script execution endpoint
app.use('/api/scripts/:id/run', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Script execution rate limit reached' }
}));

app.use(express.json({ limit: '1mb' }));

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.use('/api/', authMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/scripts',  require('./routes/scripts'));
app.use('/api/history',  require('./routes/history'));
app.use('/api/users',    require('./routes/users'));

// Health check (no auth)
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ─── Serve React build in production ─────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => res.sendFile(path.join(staticPath, 'index.html')));
}

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

app.listen(PORT, '127.0.0.1', () => {
  logger.info(`AD Dashboard backend listening on 127.0.0.1:${PORT}`);
});

module.exports = app;
