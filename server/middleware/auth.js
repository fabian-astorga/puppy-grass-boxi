/**
 * server/middleware/auth.js — JWT Authentication Middleware
 * ─────────────────────────────────────────────────────────────
 * Verifies the admin session JWT from a signed httpOnly cookie.
 *
 * FIX: Now also checks the token's jti against the revocation
 * blocklist — so logout immediately invalidates the token even
 * though the JWT's cryptographic signature is still valid.
 *
 * On success: calls next() and sets req.admin = payload
 * On failure: returns 401 JSON or redirects to /admin/login
 */

'use strict';

const jwt       = require('jsonwebtoken');
const config    = require('../config');
const { isRevoked } = require('../utils/tokenBlocklist');

function requireAuthApi(req, res, next) {
  const token = req.cookies?.[config.cookie.name];
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

    // FIX: Reject revoked tokens (logged-out sessions)
    if (isRevoked(payload.jti)) {
      return res.status(401).json({ error: 'Sesión expirada. Inicia sesión de nuevo.' });
    }

    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function requireAuthPage(req, res, next) {
  const token = req.cookies?.[config.cookie.name];
  if (!token) return res.redirect('/admin/login');

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

    if (isRevoked(payload.jti)) {
      return res.redirect('/admin/login');
    }

    req.admin = payload;
    next();
  } catch {
    return res.redirect('/admin/login');
  }
}

module.exports = { requireAuthApi, requireAuthPage };
