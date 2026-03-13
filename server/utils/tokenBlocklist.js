/**
 * server/utils/tokenBlocklist.js — In-Memory JWT Revocation
 * ─────────────────────────────────────────────────────────────
 * FIX: JWTs are stateless — logout only clears the browser
 * cookie but the token remains cryptographically valid until
 * its expiration (8 hours). If a token is somehow captured,
 * the attacker retains access even after admin logs out.
 *
 * Solution: maintain an in-memory set of revoked JWT IDs (jti).
 * Each token gets a unique jti on creation. On logout, the jti
 * is added to the blocklist. Auth middleware rejects blocklisted
 * tokens even if they have a valid signature.
 *
 * Each blocklist entry auto-expires when the token would have
 * expired naturally — so the set stays small in production.
 *
 * Note: This is in-process only. A restart clears the blocklist.
 * Since restarted processes also invalidate all old cookies
 * (different process memory), this is acceptable for this scale.
 */

'use strict';

// Set of revoked jti values
// Map<jti, expiresAtMs> — used for auto-cleanup
const blocklist = new Map();

/**
 * Add a JWT jti to the revocation list.
 * Automatically removes itself when the token would have expired.
 *
 * @param {string} jti        — JWT ID to revoke
 * @param {number} expSeconds — JWT exp claim (Unix timestamp in seconds)
 */
function revokeToken(jti, expSeconds) {
  if (!jti) return;
  const expiresAtMs = expSeconds * 1000;
  const ttlMs = expiresAtMs - Date.now();
  if (ttlMs <= 0) return; // already expired, no need to track

  blocklist.set(jti, expiresAtMs);

  // Auto-cleanup when the token would have expired naturally
  const timer = setTimeout(() => blocklist.delete(jti), ttlMs);
  if (timer.unref) timer.unref(); // don't block process exit
}

/**
 * Check whether a jti has been revoked.
 *
 * @param {string} jti
 * @returns {boolean}
 */
function isRevoked(jti) {
  if (!jti) return false;
  if (!blocklist.has(jti)) return false;

  // Defensive: check expiry (cleanup may have been delayed)
  if (Date.now() > blocklist.get(jti)) {
    blocklist.delete(jti);
    return false;
  }
  return true;
}

/** Return current blocklist size — for diagnostics only */
function size() { return blocklist.size; }

module.exports = { revokeToken, isRevoked, size };
