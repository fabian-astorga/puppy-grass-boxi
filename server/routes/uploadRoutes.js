/**
 * server/routes/uploadRoutes.js — Image Upload Routes
 * ─────────────────────────────────────────────────────────────
 * POST /api/upload      — upload image (base64, auth + CSRF required)
 * GET  /api/upload/list — list uploaded images (auth required)
 *
 * Security hardening applied:
 *   - Auth required (JWT cookie)
 *   - CSRF verification on POST
 *   - Magic bytes validation (actual file content, not just MIME claim)
 *   - Path confinement (double-check resolved path stays in IMAGES_DIR)
 *   - Filename sanitized (path.basename + regex + timestamp)
 *   - Atomic write (tmp → rename)
 *   - 5MB decoded size limit
 */

'use strict';

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const config  = require('../config');
const logger  = require('../utils/logger');
const { requireAuthApi } = require('../middleware/auth');
const { requireCsrf }    = require('../middleware/security');

const IMAGES_DIR     = path.resolve(config.paths.images);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  'image/jpeg': { ext: '.jpg',  magic: [0xFF, 0xD8, 0xFF] },
  'image/jpg':  { ext: '.jpg',  magic: [0xFF, 0xD8, 0xFF] },
  'image/png':  { ext: '.png',  magic: [0x89, 0x50, 0x4E, 0x47] },
  'image/webp': { ext: '.webp', magic: [0x52, 0x49, 0x46, 0x46] },
  'image/gif':  { ext: '.gif',  magic: [0x47, 0x49, 0x46, 0x38] },
};

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

function validateMagicBytes(buffer, mimeType) {
  const info = ALLOWED_TYPES[mimeType];
  if (!info) return false;
  return info.magic.every((byte, i) => buffer[i] === byte);
}

/* ── POST /api/upload ─────────────────────────────────────── */
router.post('/', requireAuthApi, requireCsrf, (req, res) => {
  try {
    const { filename, mimeType, data } = req.body;

    if (!filename || !mimeType || !data) {
      return res.status(400).json({ error: 'Faltan campos: filename, mimeType, data' });
    }
    if (typeof data !== 'string') {
      return res.status(400).json({ error: 'El campo data debe ser base64' });
    }

    const typeInfo = ALLOWED_TYPES[mimeType];
    if (!typeInfo) {
      return res.status(400).json({ error: `Tipo no permitido: ${mimeType}` });
    }

    let buffer;
    try { buffer = Buffer.from(data, 'base64'); }
    catch { return res.status(400).json({ error: 'Datos base64 inválidos' }); }

    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(413).json({ error: 'Imagen muy grande. Máximo 5MB.' });
    }

    if (!validateMagicBytes(buffer, mimeType)) {
      logger.security('upload_magic_mismatch', { mimeType, admin: req.admin?.username, ip: req.ip });
      return res.status(400).json({ error: 'El archivo no coincide con el tipo declarado' });
    }

    const baseName  = path.basename(filename);
    const safeName  = baseName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
    const finalName = `${safeName}_${Date.now()}${typeInfo.ext}`;
    const filePath  = path.join(IMAGES_DIR, finalName);

    // Path confinement
    if (!path.resolve(filePath).startsWith(IMAGES_DIR + path.sep)) {
      logger.security('upload_path_traversal', { filename, admin: req.admin?.username, ip: req.ip });
      return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }

    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, filePath);

    logger.info('image_uploaded', { file: finalName, admin: req.admin?.username });
    res.json({ url: `/images/${finalName}`, name: finalName });

  } catch (err) {
    logger.error('[upload/post]', err);
    res.status(500).json({ error: 'Error al guardar imagen' });
  }
});

/* ── GET /api/upload/list ─────────────────────────────────── */
router.get('/list', requireAuthApi, (req, res) => {
  try {
    const files = fs.readdirSync(IMAGES_DIR)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => ({ name: f, url: `/images/${f}` }))
      .sort((a, b) => {
        const ta = fs.statSync(path.join(IMAGES_DIR, a.name)).mtimeMs;
        const tb = fs.statSync(path.join(IMAGES_DIR, b.name)).mtimeMs;
        return tb - ta;
      });
    res.json({ images: files });
  } catch (err) {
    logger.error('[upload/list]', err);
    res.status(500).json({ error: 'Error al listar imágenes' });
  }
});

module.exports = router;
