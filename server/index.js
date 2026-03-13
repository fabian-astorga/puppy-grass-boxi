/**
 * server/index.js
 * Express application entry point
 */

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const logger = require('./utils/logger');
const { securityHeaders, createRateLimiter } = require('./middleware/security');
const { requireAuthApi, requireAuthPage } = require('./middleware/auth');

const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const commentsRoutes = require('./routes/commentsRoutes');

// ── Auto-setup auth file if missing ─────────────────────────────
const authFile = path.resolve('server/data/auth.json');

if (!fs.existsSync(authFile)) {
  try {
    logger.info('auth.json not found, running automatic setup...');
    require('./setup');
    logger.info('Automatic setup completed successfully.');
  } catch (err) {
    logger.error('Automatic setup failed:', err);
  }
}

const app = express();

// Trust proxy — Render sits behind a load balancer
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────
app.use(securityHeaders());

// ── CORS ────────────────────────────────────────────────────────
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // same-origin requests

    if (config.allowedOrigins.length === 0) {
      return callback(new Error('CORS: No origins configured'), false);
    }

    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked: ${origin}`);
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ── Body parsers ────────────────────────────────────────────────
app.use('/api/auth', express.json({ limit: '10kb' }));
app.use('/api/comments', express.json({ limit: '10kb' }));
app.use('/api/content', express.json({ limit: '100kb' }));
app.use('/api/upload', express.json({ limit: config.limits.upload }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.use(cookieParser());

// ── Global API rate limit ──────────────────────────────────────
const globalApiLimiter = createRateLimiter(config.rateLimit.api);
app.use('/api/', globalApiLimiter);

// ── API routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/comments', commentsRoutes);

// ── Admin panel ────────────────────────────────────────────────
// Public login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.resolve('admin/login.html'));
});

// Public login JS
app.use('/admin/js/login.js', express.static(path.resolve('admin/js/login.js')));
app.use('/admin/js/api.js', express.static(path.resolve('admin/js/api.js')));

// Protected admin JS
app.use(
  '/admin/js',
  requireAuthApi,
  express.static(path.resolve('admin/js'), {
    index: false,
    dotfiles: 'deny',
  })
);

// Protected admin CSS
app.use(
  '/admin/css',
  requireAuthPage,
  express.static(path.resolve('admin/css'), {
    index: false,
    dotfiles: 'deny',
  })
);

// Protected admin dashboard
app.get('/admin', requireAuthPage, (req, res) => {
  res.sendFile(path.resolve('admin/index.html'));
});

// Admin static fallback
app.use(
  '/admin',
  express.static(path.resolve('admin'), {
    index: false,
    dotfiles: 'deny',
  })
);

// ── Public site ────────────────────────────────────────────────
app.use(
  express.static(path.resolve('public'), {
    dotfiles: 'deny',
  })
);

// Catch-all SPA route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }

  res.sendFile(path.resolve('public/index.html'));
});

// ── Global error handler ───────────────────────────────────────
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

// ── Start server ───────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info('Puppy Grass Boxi started', {
    port: config.port,
    env: config.nodeEnv,
    origins: config.allowedOrigins.join(', ') || '(same-origin only)',
  });
});

module.exports = app;