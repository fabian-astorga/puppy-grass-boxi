/**
 * server/routes/authRoutes.js — Authentication Routes
 * ─────────────────────────────────────────────────────────────
 * POST /api/auth/login   — validate credentials, issue JWT + CSRF token
 * POST /api/auth/logout  — revoke JWT (blocklist jti), clear cookies
 * GET  /api/auth/me      — verify current session
 *
 * Security hardening applied:
 *   - Rate limit: 10 attempts / 15 min per IP (spoofing-resistant)
 *   - bcrypt constant-time comparison
 *   - Password length cap (prevents bcrypt DoS on huge strings)
 *   - JWT includes jti for revocation support
 *   - CSRF token issued alongside session cookie on login
 *   - Logout adds jti to revocation blocklist — token dies immediately
 *   - Structured security logging of all auth events
 */

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');
const config   = require('../config');
const logger   = require('../utils/logger');
const { requireAuthApi }                         = require('../middleware/auth');
const { createRateLimiter, generateCsrfToken,
        CSRF_COOKIE_NAME, requireCsrf }          = require('../middleware/security');
const { revokeToken }                            = require('../utils/tokenBlocklist');

const router    = express.Router();
const AUTH_PATH = path.resolve(config.paths.auth);

// Strict rate limit on login — 10 attempts per 15 min per IP
// createRateLimiter uses rightmost XFF (spoofing-resistant)
const loginLimiter = createRateLimiter(config.rateLimit.login);

/* ── POST /api/auth/login ─────────────────────────────────── */
router.post('/login', loginLimiter, async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',').pop()?.trim()
    || req.socket?.remoteAddress || 'unknown';

  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      logger.security('login_invalid_input', { ip });
      return res.status(400).json({ error: 'Contraseña requerida' });
    }

    // Cap length — prevents bcrypt DoS amplification attack
    if (password.length > 128) {
      logger.security('login_oversized_password', { ip });
      return res.status(400).json({ error: 'Contraseña inválida' });
    }

    if (!fs.existsSync(AUTH_PATH)) {
      logger.error('auth.json not found');
      return res.status(500).json({ error: 'Sistema no configurado. Ejecuta npm run setup.' });
    }

    const auth  = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8'));
    const valid = await bcrypt.compare(password, auth.passwordHash);

    if (!valid) {
      logger.security('login_failed', { ip });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Include jti (JWT ID) for revocation support on logout
    const jti   = crypto.randomUUID();
    const token = jwt.sign(
      { username: auth.username, role: 'admin', jti },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn, algorithm: 'HS256' }
    );

    // Session cookie — httpOnly, not readable by JS
    res.cookie(config.cookie.name, token, {
      httpOnly: config.cookie.httpOnly,
      sameSite: config.cookie.sameSite,
      secure:   config.cookie.secure,
      maxAge:   config.cookie.maxAge,
    });

    // CSRF token cookie — NOT httpOnly so client JS can read and send it
    // as X-CSRF-Token header on mutations. Attacker on another origin
    // cannot read this cookie, so cannot forge the header.
    const csrfToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,             // must be readable by admin JS
      sameSite: config.cookie.sameSite,
      secure:   config.cookie.secure,
      maxAge:   config.cookie.maxAge,
    });

    logger.security('login_success', { ip, username: auth.username });
    return res.json({ ok: true, username: auth.username, csrfToken });

  } catch (err) {
    logger.error('[auth/login]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/* ── POST /api/auth/logout ────────────────────────────────── */
router.post('/logout', requireAuthApi, requireCsrf, (req, res) => {
  // Immediately revoke the token — any captured copy stops working
  if (req.admin?.jti && req.admin?.exp) {
    revokeToken(req.admin.jti, req.admin.exp);
  }

  res.clearCookie(config.cookie.name, {
    httpOnly: config.cookie.httpOnly,
    sameSite: config.cookie.sameSite,
    secure:   config.cookie.secure,
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    sameSite: config.cookie.sameSite,
    secure:   config.cookie.secure,
  });

  logger.security('logout', { ip: req.ip, username: req.admin?.username });
  res.json({ ok: true });
});

/* ── GET /api/auth/me ─────────────────────────────────────── */
router.get('/me', requireAuthApi, (req, res) => {
  res.json({ username: req.admin.username, role: req.admin.role });
});

module.exports = router;
