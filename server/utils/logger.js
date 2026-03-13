/**
 * server/utils/logger.js — Minimal Production-Safe Logger
 * ─────────────────────────────────────────────────────────────
 * Wraps console with:
 *   - Structured output (timestamp + level + message)
 *   - Sensitive data redaction
 *   - Separate info/warn/error/security levels
 *
 * No external dependencies. Render captures stdout/stderr.
 */

'use strict';

const isProd = process.env.NODE_ENV === 'production';

function timestamp() {
  return new Date().toISOString();
}

/**
 * Redact sensitive fields from log messages.
 * Prevents passwords/tokens from appearing in logs.
 */
function redact(message) {
  if (typeof message !== 'string') return message;
  return message
    .replace(/(password|secret|token|hash|auth)[=:\s]+\S+/gi, '$1=[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\$2[aby]\$\d+\$\S+/g, '[BCRYPT_HASH]');
}

const logger = {
  info(message, meta) {
    const msg = redact(String(message));
    if (meta) {
      console.log(JSON.stringify({ ts: timestamp(), level: 'info', msg, ...sanitizeMeta(meta) }));
    } else {
      console.log(`[${timestamp()}] INFO  ${msg}`);
    }
  },

  warn(message, meta) {
    const msg = redact(String(message));
    console.warn(`[${timestamp()}] WARN  ${msg}${meta ? ' ' + JSON.stringify(sanitizeMeta(meta)) : ''}`);
  },

  error(message, err) {
    const msg = redact(String(message));
    const errInfo = err ? (isProd ? { name: err.name, msg: err.message } : { stack: err.stack }) : {};
    console.error(JSON.stringify({ ts: timestamp(), level: 'error', msg, ...errInfo }));
  },

  /** Security-relevant events: login attempts, auth failures, rate limits */
  security(event, meta) {
    const safe = sanitizeMeta(meta || {});
    console.log(JSON.stringify({ ts: timestamp(), level: 'security', event, ...safe }));
  },
};

function sanitizeMeta(meta) {
  const safe = {};
  const sensitiveKeys = /password|secret|token|hash|auth|cookie/i;
  for (const [k, v] of Object.entries(meta)) {
    safe[k] = sensitiveKeys.test(k) ? '[REDACTED]' : v;
  }
  return safe;
}

module.exports = logger;
