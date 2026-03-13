/**
 * server/routes/contentRoutes.js — Content API Routes
 * ─────────────────────────────────────────────────────────────
 * GET  /api/content          — full content (public)
 * PUT  /api/content/:section — update one section (admin only)
 *
 * Security hardening applied:
 *   - Section whitelist (blocks unknown/dangerous keys)
 *   - Prototype pollution guard (__proto__, constructor, etc.)
 *   - FIX: sanitizeSectionData() applied to ALL incoming updates
 *     before writing to disk — strips XSS from HTML fields,
 *     validates URL protocols, and plain-text-cleans all other fields.
 *   - CSRF token verification on mutation
 */

'use strict';

const express                    = require('express');
const { requireAuthApi }         = require('../middleware/auth');
const { requireCsrf }            = require('../middleware/security');
const contentService             = require('../services/contentService');
const { sanitizeSectionData }    = require('../utils/contentSanitizer');
const config                     = require('../config');
const logger                     = require('../utils/logger');

const router = express.Router();
const ALLOWED_SECTIONS = new Set(config.allowedSections);

function isAllowedSection(section) {
  return typeof section === 'string' && ALLOWED_SECTIONS.has(section);
}

function hasDangerousKeys(obj, depth = 0) {
  if (depth > 5 || typeof obj !== 'object' || obj === null) return false;
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.keys(obj)) {
    if (dangerous.includes(key)) return true;
    if (typeof obj[key] === 'object' && hasDangerousKeys(obj[key], depth + 1)) return true;
  }
  return false;
}

/* ── GET /api/content ─────────────────────────────────────── */
router.get('/', (req, res) => {
  try {
    const content = contentService.getContent();
    res.json(content);
  } catch (err) {
    logger.error('[content/get]', err);
    res.status(500).json({ error: 'Error al leer el contenido' });
  }
});

/* ── PUT /api/content/:section ────────────────────────────── */
router.put('/:section', requireAuthApi, requireCsrf, async (req, res) => {
  try {
    const section = (req.params.section || '').toUpperCase().trim();
    const rawUpdates = req.body;

    // 1. Section whitelist
    if (!isAllowedSection(section)) {
      logger.warn(`content_invalid_section: "${section}"`, { admin: req.admin?.username });
      return res.status(400).json({ error: `Sección no permitida: "${section}"` });
    }

    // 2. Must be a plain object
    if (!rawUpdates || typeof rawUpdates !== 'object' || Array.isArray(rawUpdates)) {
      return res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON' });
    }

    // 3. Prototype pollution guard
    if (hasDangerousKeys(rawUpdates)) {
      logger.security('prototype_pollution_attempt', {
        section, admin: req.admin?.username, ip: req.ip,
      });
      return res.status(400).json({ error: 'Payload inválido' });
    }

    // 4. FIX: Sanitize all string fields before storage
    //    - HTML fields: allowlist-based tag stripping
    //    - href fields: protocol validation (blocks javascript:)
    //    - all others: plain text (strips HTML entirely)
    const safeUpdates = sanitizeSectionData(rawUpdates);

    const updated = await contentService.updateSection(section, safeUpdates);

    logger.info('content_updated', { section, admin: req.admin?.username });
    res.json({ ok: true, section, data: updated[section] });

  } catch (err) {
    logger.error('[content/put]', err);
    const status  = err.status || 500;
    const message = config.isProd ? 'Error al guardar' : err.message;
    res.status(status).json({ error: message });
  }
});

module.exports = router;
