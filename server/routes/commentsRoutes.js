/**
 * server/routes/commentsRoutes.js — Comments Routes
 * ─────────────────────────────────────────────────────────────
 * POST   /api/comments          — public submission
 * GET    /api/comments          — admin: list all
 * PATCH  /api/comments/:id/read — admin: mark as read
 * DELETE /api/comments/:id      — admin: delete
 *
 * Security hardening applied:
 *   - Rate limit (10 / 15 min per IP, spoofing-resistant)
 *   - Input sanitization (HTML stripped, control chars removed)
 *   - Atomic file writes (no race conditions)
 *   - MAX_COMMENTS cap (prevents disk fill)
 *   - ID format validation (alphanumeric only)
 *   - CSRF verification on admin mutation endpoints
 */

'use strict';

const express  = require('express');
const path     = require('path');
const crypto   = require('crypto');
const config   = require('../config');
const logger   = require('../utils/logger');
const { requireAuthApi }                  = require('../middleware/auth');
const { createRateLimiter,
        validateCommentBody, requireCsrf } = require('../middleware/security');
const { atomicWriteJson, readJsonSafe }   = require('../utils/fileWriter');

const router = express.Router();
const COMMENTS_FILE = path.resolve(config.paths.comments);
const DATA_DIR      = path.resolve(config.paths.dataDir);
const MAX_COMMENTS  = 500;

const commentLimiter = createRateLimiter(config.rateLimit.comments);

function generateId() {
  return crypto.randomBytes(8).toString('hex'); // 16 hex chars, cryptographically random
}

function isValidId(id) {
  return typeof id === 'string' && /^[a-f0-9]{16}$/.test(id);
}

/* ── POST /api/comments ──────────────────────────────────── */
router.post('/', commentLimiter, validateCommentBody, async (req, res) => {
  try {
    const { comment, name } = req.body;

    const entry = {
      id:        generateId(),
      comment,
      name,
      createdAt: new Date().toISOString(),
      read:      false,
    };

    const comments = readJsonSafe(COMMENTS_FILE, []);

    if (comments.length >= MAX_COMMENTS) {
      comments.splice(MAX_COMMENTS - 1); // keep newest MAX_COMMENTS - 1, make room for new
    }

    comments.unshift(entry);
    await atomicWriteJson(COMMENTS_FILE, comments, DATA_DIR);

    logger.info('comment_submitted', { id: entry.id });
    return res.status(201).json({ ok: true, id: entry.id });

  } catch (err) {
    logger.error('[comments/post]', err);
    return res.status(500).json({ error: 'Error al guardar el comentario.' });
  }
});

/* ── GET /api/comments ───────────────────────────────────── */
router.get('/', requireAuthApi, (req, res) => {
  res.json(readJsonSafe(COMMENTS_FILE, []));
});

/* ── PATCH /api/comments/:id/read ───────────────────────── */
router.patch('/:id/read', requireAuthApi, requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });

    const comments = readJsonSafe(COMMENTS_FILE, []);
    const comment  = comments.find(c => c.id === id);
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado.' });

    comment.read = true;
    await atomicWriteJson(COMMENTS_FILE, comments, DATA_DIR);

    logger.info('comment_marked_read', { id, admin: req.admin?.username });
    res.json({ ok: true });

  } catch (err) {
    logger.error('[comments/patch]', err);
    res.status(500).json({ error: 'Error al actualizar.' });
  }
});

/* ── DELETE /api/comments/:id ────────────────────────────── */
router.delete('/:id', requireAuthApi, requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });

    const comments = readJsonSafe(COMMENTS_FILE, []);
    const idx      = comments.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Comentario no encontrado.' });

    comments.splice(idx, 1);
    await atomicWriteJson(COMMENTS_FILE, comments, DATA_DIR);

    logger.info('comment_deleted', { id, admin: req.admin?.username });
    res.json({ ok: true });

  } catch (err) {
    logger.error('[comments/delete]', err);
    res.status(500).json({ error: 'Error al eliminar.' });
  }
});

module.exports = router;
