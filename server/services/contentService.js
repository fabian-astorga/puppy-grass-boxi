/**
 * server/services/contentService.js — Content Service (Hardened)
 * ─────────────────────────────────────────────────────────────
 * Security enhancements vs original:
 *   - Async atomic writes via fileWriter utility (concurrent-safe)
 *   - Section whitelist enforced here as second layer of defense
 *   - getContent() uses readJsonSafe (never throws on corrupt file)
 */

'use strict';

const path           = require('path');
const config         = require('../config');
const logger         = require('../utils/logger');
const { atomicWriteJson, readJsonSafe } = require('../utils/fileWriter');

const CONTENT_PATH = path.resolve(config.paths.content);
const DATA_DIR     = path.resolve(config.paths.dataDir);
const ALLOWED      = new Set(config.allowedSections);

/**
 * Reads the full content object.
 * Returns an empty object on error (never throws).
 */
function getContent() {
  return readJsonSafe(CONTENT_PATH, {});
}

/**
 * Atomically writes the full content object.
 * @param {object} data
 * @returns {Promise<void>}
 */
async function saveContent(data) {
  await atomicWriteJson(CONTENT_PATH, data, DATA_DIR);
}

/**
 * Updates a single whitelisted section.
 * @param {string} section
 * @param {object} updates
 * @returns {Promise<object>} updated full content
 */
async function updateSection(section, updates) {
  // Second-layer whitelist check (first is in the route)
  if (!ALLOWED.has(section)) {
    const err = new Error(`Sección no permitida: "${section}"`);
    err.status = 400;
    throw err;
  }

  const content = getContent();

  if (!(section in content)) {
    const err = new Error(`Sección desconocida: "${section}"`);
    err.status = 400;
    throw err;
  }

  content[section] = { ...content[section], ...updates };
  await saveContent(content);
  return content;
}

module.exports = { getContent, saveContent, updateSection };
