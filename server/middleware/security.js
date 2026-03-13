/**
 * server/middleware/security.js — Security Middleware
 * ─────────────────────────────────────────────────────────────
 * Provides:
 *   1. securityHeaders()      — comprehensive HTTP security headers
 *   2. createRateLimiter()    — in-process IP-based rate limiting,
 *                               resistant to X-Forwarded-For spoofing
 *   3. sanitizeText()         — strip HTML/control chars from user input
 *   4. sanitizeContentHtml()  — allowlist-based HTML sanitizer for
 *                               admin content fields that use innerHTML
 *   5. sanitizeHref()         — validate URL protocol (block javascript:)
 *   6. validateCommentBody()  — validated input for POST /api/comments
 *   7. requireCsrf()          — double-submit CSRF token verification
 *
 * No external packages required — pure Node.js + Express.
 */

'use strict';

const crypto = require('crypto');

/* ══════════════════════════════════════════════════════════════
   1. SECURITY HEADERS
   ══════════════════════════════════════════════════════════════ */

function securityHeaders() {
  return function setSecurityHeaders(req, res, next) {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // CSP — separate policy for admin vs public site
    const isAdmin = req.path.startsWith('/admin');
    if (isAdmin) {
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'",
      ].join('; '));
    } else {
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
      ].join('; '));
    }

    next();
  };
}

/* ══════════════════════════════════════════════════════════════
   2. RATE LIMITER — X-Forwarded-For spoofing resistant
   ─────────────────────────────────────────────────────────────
   FIX: Previous version used req.ip which is derived from
   X-Forwarded-For and can be spoofed by the client.

   With Render's infrastructure, the load balancer APPENDS the
   client's real IP to X-Forwarded-For before hitting the app.
   We take the RIGHTMOST IP in the chain — that is the one the
   Render proxy added, which is not attacker-controllable.

   This makes rate limits bypass-resistant even with
   X-Forwarded-For: <spoofed1>, <spoofed2>, ... tricks.
   ══════════════════════════════════════════════════════════════ */

/**
 * Extract the most trustworthy client IP from the request.
 * Uses rightmost X-Forwarded-For entry (proxy-added, not client-controlled).
 * Falls back to socket address if header is absent.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
function extractRealIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    // Split and take the rightmost non-empty value — added by Render's proxy
    const ips = xff.split(',').map(s => s.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }
  // No XFF header — direct connection (local dev / testing)
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * @param {object} opts
 * @param {number} opts.windowMs   — window in ms (default 15 min)
 * @param {number} opts.max        — max requests per window
 * @param {string} [opts.message]  — error message
 * @returns Express middleware
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Demasiadas solicitudes. Intenta más tarde.' } = {}) {
  // Map<ip, { count, resetAt }>
  const store = new Map();

  // Periodic cleanup — avoid unbounded memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now >= entry.resetAt) store.delete(ip);
    }
  }, windowMs);
  if (cleanupInterval.unref) cleanupInterval.unref();

  return function rateLimiter(req, res, next) {
    // Use spoofing-resistant IP extraction
    const ip  = extractRealIp(req);
    const now = Date.now();

    let entry = store.get(ip);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

/* ══════════════════════════════════════════════════════════════
   3. PLAIN TEXT SANITIZER (for comments / names)
   ══════════════════════════════════════════════════════════════ */

/**
 * Strip HTML tags, dangerous entities, and control characters.
 * Result is safe plain text — never rendered as HTML.
 *
 * @param {string} str
 * @returns {string}
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;|&gt;|&amp;|&quot;|&#/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/* ══════════════════════════════════════════════════════════════
   4. HTML CONTENT SANITIZER (for admin content fields)
   ─────────────────────────────────────────────────────────────
   FIX: Admin content is rendered via innerHTML in the public
   site. Without sanitization, a compromised admin account can
   inject arbitrary XSS payloads that execute for all visitors.

   Strategy: allowlist of safe inline HTML tags only.
   The CMS legitimately uses <em> for italic text and <br> for
   line breaks. All other tags are stripped.

   Allowed: <em>, <strong>, <br>, <b>, <i>, <span>
   Blocked: <script>, <img>, <svg>, <iframe>, event handlers,
            javascript: URLs, data: URIs, and everything else.
   ══════════════════════════════════════════════════════════════ */

const ALLOWED_HTML_TAGS = new Set(['em', 'strong', 'b', 'i', 'br', 'span']);

/**
 * Sanitize a string that will be rendered as innerHTML.
 * Strips all tags not in the allowlist, and strips all attributes
 * (including event handlers and src/href) from allowed tags.
 *
 * @param {string} str
 * @returns {string}
 */
function sanitizeContentHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    // Pass 1 — opening tags: rebuild allowed ones without attributes, strip the rest
    // e.g. <em> → <em>  |  <div onclick=evil> → ''  |  <script> → ''
    .replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
      const t = tag.toLowerCase();
      if (ALLOWED_HTML_TAGS.has(t)) return t === 'br' ? '<br>' : '<' + t + '>';
      return '';
    })
    // Pass 2 — closing tags: keep allowed, strip the rest
    // e.g. </em> → </em>  |  </script> → ''
    .replace(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g, (match, tag) => {
      const t = tag.toLowerCase();
      return (ALLOWED_HTML_TAGS.has(t) && t !== 'br') ? '</' + t + '>' : '';
    })
    // Pass 3 — catch any remaining malformed/partial angle-bracket sequences
    // that weren't matched by the tag regexes above (e.g. stray '<' or '>')
    // Note: at this point all valid allowed tags have been reconstructed as
    // clean ASCII like '<em>' — we only strip sequences that still contain
    // characters that couldn't form a valid allowed tag.
    // Use a negative lookahead to protect the reconstructed allowed tags.
    .replace(/<(?!\/?(?:em|strong|b|i|br|span)>)[^>]*>/gi, '')
    // Remove null bytes and dangerous control chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/* ══════════════════════════════════════════════════════════════
   5. HREF SANITIZER (block javascript: and data: protocols)
   ─────────────────────────────────────────────────────────────
   FIX: Admin can save javascript:... in href fields which are
   assigned directly to element.href in renderer.js, allowing
   XSS-on-click for all public site visitors.
   ══════════════════════════════════════════════════════════════ */

const SAFE_URL_PATTERN = /^(https?:\/\/|\/|#)/i;

/**
 * Validate and sanitize a URL stored in content.
 * Blocks javascript:, data:, vbscript:, and other dangerous protocols.
 * Returns the original value if safe, or '#' fallback if dangerous.
 *
 * @param {string} url
 * @param {string} [fallback='#']
 * @returns {string}
 */
function sanitizeHref(url, fallback = '#') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  return SAFE_URL_PATTERN.test(trimmed) ? trimmed : fallback;
}

/* ══════════════════════════════════════════════════════════════
   6. COMMENT BODY VALIDATOR MIDDLEWARE
   ══════════════════════════════════════════════════════════════ */

function validateCommentBody(req, res, next) {
  const { comment, name } = req.body || {};

  if (!comment || typeof comment !== 'string') {
    return res.status(400).json({ error: 'El comentario es requerido.' });
  }

  const cleanComment = sanitizeText(comment);
  const cleanName    = sanitizeText((name || '').toString()).slice(0, 80) || 'Anónimo';

  if (cleanComment.length < 3) {
    return res.status(400).json({ error: 'El comentario es demasiado corto.' });
  }
  if (cleanComment.length > 1000) {
    return res.status(400).json({ error: 'El comentario no puede superar 1000 caracteres.' });
  }

  req.body.comment = cleanComment;
  req.body.name    = cleanName;
  next();
}

/* ══════════════════════════════════════════════════════════════
   7. CSRF PROTECTION — Double-Submit Cookie Pattern
   ─────────────────────────────────────────────────────────────
   FIX: With sameSite: 'none' (required for Netlify → Render
   cross-origin auth), the admin session cookie is sent on ANY
   cross-origin POST — including from attacker-controlled pages.
   This means logout (and in theory any state-changing endpoint)
   is vulnerable to CSRF.

   Solution: Double-submit cookie pattern.
   - On login: generate a random CSRF token, set it in a
     non-httpOnly cookie (readable by JS on the same origin).
   - On protected mutations: the client reads the cookie and
     sends it as X-CSRF-Token header.
   - Server compares header vs cookie — attacker cannot read
     or set the cookie from another origin, so they cannot
     forge the header value.
   ══════════════════════════════════════════════════════════════ */

const CSRF_COOKIE_NAME = 'pgb_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token.
 * @returns {string} 32-byte hex string
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware: verify CSRF token on state-changing requests.
 * Compares X-CSRF-Token header against pgb_csrf cookie.
 * Skip on GET/HEAD/OPTIONS (safe methods).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                   next
 */
function requireCsrf(req, res, next) {
  // Safe methods don't need CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const headerToken = req.headers[CSRF_HEADER_NAME];
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieToken) {
    return res.status(403).json({ error: 'CSRF token ausente' });
  }

  // Constant-time comparison to prevent timing attacks
  const headerBuf = Buffer.from(String(headerToken).slice(0, 64));
  const cookieBuf = Buffer.from(String(cookieToken).slice(0, 64));

  if (headerBuf.length !== cookieBuf.length ||
      !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return res.status(403).json({ error: 'CSRF token inválido' });
  }

  next();
}

module.exports = {
  securityHeaders,
  createRateLimiter,
  extractRealIp,
  sanitizeText,
  sanitizeContentHtml,
  sanitizeHref,
  validateCommentBody,
  requireCsrf,
  generateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
