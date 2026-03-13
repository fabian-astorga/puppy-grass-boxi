/**
 * server/index.js — Express Application Entry Point
 * ─────────────────────────────────────────────────────────────
 * Security hardening applied:
 *   - Comprehensive security headers (CSP, HSTS, Permissions-Policy)
 *   - CORS restricted to configured allowed origins
 *   - Separate body-size limits per route
 *   - Global API rate limiting (spoofing-resistant IP extraction)
 *   - FIX: Admin JS/CSS served behind auth — not public
 *   - Sensitive server info hidden in production
 *   - Structured logging
 */

'use strict';

const express      = require('express');
const path         = require('path');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const config       = require('./config');
const logger       = require('./utils/logger');
const { securityHeaders, createRateLimiter } = require('./middleware/security');
const { requireAuthApi, requireAuthPage }     = require('./middleware/auth');

const authRoutes     = require('./routes/authRoutes');
const contentRoutes  = require('./routes/contentRoutes');
const uploadRoutes   = require('./routes/uploadRoutes');
const commentsRoutes = require('./routes/commentsRoutes');

const app = express();

// Trust proxy — Render sits behind a load balancer
// Note: Rate limiter uses rightmost XFF (spoofing-resistant), not req.ip
app.set('trust proxy', 1);

// ── Security headers (must be first) ──────────────────────
app.use(securityHeaders());

// ── CORS ──────────────────────────────────────────────────
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // same-origin
    if (config.allowedOrigins.length === 0) {
      return callback(new Error('CORS: No origins configured'), false);
    }
    if (config.allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// ── Body parsers — strict size limits per route ───────────
app.use('/api/auth',     express.json({ limit: '10kb' }));
app.use('/api/comments', express.json({ limit: '10kb' }));
app.use('/api/content',  express.json({ limit: '100kb' }));
app.use('/api/upload',   express.json({ limit: config.limits.upload }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.use(cookieParser());

// ── Global API rate limit ──────────────────────────────────
const globalApiLimiter = createRateLimiter(config.rateLimit.api);
app.use('/api/', globalApiLimiter);

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/content',  contentRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/comments', commentsRoutes);

// ── Admin Panel ────────────────────────────────────────────
// Public: login page only
app.get('/admin/login', (req, res) => {
  res.sendFile(path.resolve('admin/login.html'));
});

// Login JS is public (needed before auth)
app.use('/admin/js/login.js', express.static(path.resolve('admin/js/login.js')));
app.use('/admin/js/api.js',   express.static(path.resolve('admin/js/api.js')));

// FIX: Protect admin JS and CSS behind authentication
// An unauthenticated visitor now gets 401/redirect instead of
// reading the full admin panel source code and API schema.
app.use('/admin/js',  requireAuthApi,  express.static(path.resolve('admin/js'),  { index: false, dotfiles: 'deny' }));
app.use('/admin/css', requireAuthPage, express.static(path.resolve('admin/css'), { index: false, dotfiles: 'deny' }));

// Protected admin dashboard
app.get('/admin', requireAuthPage, (req, res) => {
  res.sendFile(path.resolve('admin/index.html'));
});

// Admin static assets fallback
app.use('/admin', express.static(path.resolve('admin'), {
  index: false,
  dotfiles: 'deny',
}));

// ── Public Site ────────────────────────────────────────────
app.use(express.static(path.resolve('public'), { dotfiles: 'deny' }));

// Catch-all SPA route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }
  res.sendFile(path.resolve('public/index.html'));
});

// ── Global Error Handler ───────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`[${req.method} ${req.path}]`, err);

  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: 'Acceso no permitido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Solicitud demasiado grande' });
  }

  const message = config.isProd ? 'Error interno del servidor' : err.message;
  res.status(err.status || 500).json({ error: message });
});

// ── Start Server ───────────────────────────────────────────
app.listen(config.port, () => {
  logger.info('Puppy Grass Boxi started', {
    port: config.port,
    env:  config.nodeEnv,
    origins: config.allowedOrigins.join(', ') || '(same-origin only)',
  });
});

module.exports = app;
