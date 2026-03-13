/**
 * server/config.js — Centralized Server Configuration
 * ─────────────────────────────────────────────────────────────
 * All environment-dependent settings live here.
 * Validates required secrets at startup — fails fast in production.
 */

'use strict';

require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

// ── Production secret validation ───────────────────────────
if (isProd) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('[config] FATAL: JWT_SECRET must be set and >=32 chars in production.');
    process.exit(1);
  }
}

// ── CORS allowed origins ───────────────────────────────────
function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const origins = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (!isProd) {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return origins;
}

const config = {
  port:       parseInt(process.env.PORT || '3000', 10),
  jwtSecret:  process.env.JWT_SECRET || 'dev-secret-CHANGE-IN-PRODUCTION-min-32-chars!!',
  nodeEnv:    process.env.NODE_ENV   || 'development',
  isProd,

  allowedOrigins: parseAllowedOrigins(),

  paths: {
    public:   'public',
    admin:    'admin',
    dataDir:  'server/data',
    content:  'server/data/content.json',
    auth:     'server/data/auth.json',
    comments: 'server/data/comments.json',
    images:   'public/images',
  },

  jwtExpiresIn: '8h',

  cookie: {
    name:     'pgb_admin_token',
    httpOnly: true,
    sameSite: isProd ? 'none' : 'strict',
    secure:   isProd,
    maxAge:   8 * 60 * 60 * 1000,
  },

  limits: {
    json:    '100kb',
    upload:  '6mb',
    comment: 1000,
    name:    80,
  },

  rateLimit: {
    comments: { windowMs: 15 * 60 * 1000, max: 10,  message: 'Demasiados comentarios. Intenta en 15 minutos.' },
    login:    { windowMs: 15 * 60 * 1000, max: 10,  message: 'Demasiados intentos de acceso. Intenta en 15 minutos.' },
    api:      { windowMs: 15 * 60 * 1000, max: 300, message: 'Demasiadas solicitudes. Intenta mas tarde.' },
  },

  allowedSections: [
    'SITE', 'NAV', 'HERO', 'WHAT_IS', 'BENEFITS', 'SIZES',
    'HOW_IT_WORKS', 'DURABILITY', 'TESTIMONIALS', 'FAQ', 'CTA', 'FOOTER', 'COMMENTS',
  ],
};

module.exports = config;
