/**
 * server/utils/contentSanitizer.js — Content Field Sanitizer
 * ─────────────────────────────────────────────────────────────
 * FIX: The admin PUT /api/content/:section endpoint stores
 * arbitrary HTML into content.json without sanitization. That
 * HTML is then injected into the public site via innerHTML in
 * renderer.js. A compromised admin account (or an attacker who
 * bypasses auth) can plant XSS payloads that execute for every
 * public site visitor.
 *
 * This module defines:
 *  - HREF_FIELDS:          keys whose values are URLs (sanitize protocol)
 *  - HTML_FIELDS:          keys whose values may contain limited inline HTML
 *  - sanitizeSectionData() walk a content section object and apply the
 *                          correct sanitizer to each known field type.
 */

'use strict';

const { sanitizeContentHtml, sanitizeHref, sanitizeText } = require('../middleware/security');

/* ── Field type registries ────────────────────────────────── */

/**
 * Fields that store URLs — must only allow safe protocols.
 * Any javascript:, data:, vbscript:, etc. will be replaced with '#'.
 */
const HREF_FIELDS = new Set([
  'cta_secondary_href', 'href', 'wa_base', 'image_src',
  'illustration', 'avatar',
]);

/**
 * Fields that intentionally contain limited inline HTML.
 * Rendered with innerHTML — only allowlisted tags survive.
 * Allowed tags: <em>, <strong>, <b>, <i>, <br>, <span>
 */
const HTML_FIELDS = new Set([
  'title', 'body_1', 'body_2',
]);

/**
 * Recursively sanitize all string fields in a content section object.
 *
 * Rules applied per field:
 *  - If the field name is in HREF_FIELDS → sanitizeHref()
 *  - If the field name is in HTML_FIELDS → sanitizeContentHtml()
 *  - All other strings                   → sanitizeText() (plain text)
 *
 * Arrays of strings are walked element-by-element as plain text.
 * Nested objects are recursed (e.g. spare sub-objects in SIZES).
 * Non-string primitives (numbers, booleans) are returned untouched.
 *
 * @param {*}      data      — section data (any value from content.json)
 * @param {string} [key='']  — parent key name (used for field-type lookup)
 * @returns {*} sanitized clone
 */
function sanitizeSectionData(data, key = '') {
  if (typeof data === 'string') {
    if (HREF_FIELDS.has(key))  return sanitizeHref(data);
    if (HTML_FIELDS.has(key))  return sanitizeContentHtml(data);
    return sanitizeText(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeSectionData(item, key));
  }

  if (data !== null && typeof data === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(data)) {
      result[k] = sanitizeSectionData(v, k);
    }
    return result;
  }

  // Numbers, booleans, null — return as-is
  return data;
}

module.exports = { sanitizeSectionData, HREF_FIELDS, HTML_FIELDS };
