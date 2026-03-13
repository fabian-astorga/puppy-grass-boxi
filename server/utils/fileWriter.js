/**
 * server/utils/fileWriter.js — Atomic JSON File Writer
 * ─────────────────────────────────────────────────────────────
 * Provides safe, atomic writes to JSON files using:
 *   1. Write-lock per file path (prevents concurrent corruption)
 *   2. Write-to-temp + rename (atomic swap — avoids partial writes)
 *   3. Path confinement check (prevents path traversal)
 *
 * Usage:
 *   const { atomicWriteJson, readJsonSafe } = require('./fileWriter');
 *   await atomicWriteJson('/abs/path/to/file.json', dataObject);
 *   const data = readJsonSafe('/abs/path/to/file.json', []);
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Per-path write queues — prevents concurrent writes to same file
// Map<filePath, Promise>
const writeQueues = new Map();

/**
 * Atomically write JSON data to a file.
 * - Serializes concurrent writes per file path via a promise queue
 * - Writes to a .tmp file first, then renames (atomic on same FS)
 * - Validates the path stays within an allowed directory
 *
 * @param {string} filePath   — absolute path to target file
 * @param {*}      data       — JSON-serializable value
 * @param {string} [allowedDir] — if set, path must be inside this dir
 * @returns {Promise<void>}
 */
function atomicWriteJson(filePath, data, allowedDir) {
  // Path confinement: ensure the resolved path is inside the allowed dir
  if (allowedDir) {
    const resolved = path.resolve(filePath);
    const allowed  = path.resolve(allowedDir);
    if (!resolved.startsWith(allowed + path.sep) && resolved !== allowed) {
      return Promise.reject(new Error(`Path traversal blocked: ${filePath}`));
    }
  }

  // Serialize writes to this file through a queue
  const current = writeQueues.get(filePath) || Promise.resolve();
  const next = current.then(() => _doWrite(filePath, data));

  // Store the tail of the queue; clean up when done
  writeQueues.set(filePath, next.catch(() => {}).then(() => {
    if (writeQueues.get(filePath) === next) writeQueues.delete(filePath);
  }));

  return next;
}

function _doWrite(filePath, data) {
  return new Promise((resolve, reject) => {
    const tmpPath = filePath + '.tmp';
    try {
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(tmpPath, json, { encoding: 'utf8', flag: 'w' });
      fs.renameSync(tmpPath, filePath); // atomic on same filesystem
      resolve();
    } catch (err) {
      // Clean up orphan temp file if it exists
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
      reject(err);
    }
  });
}

/**
 * Synchronously read and parse a JSON file.
 * Returns defaultValue if file doesn't exist or is malformed.
 *
 * @param {string} filePath
 * @param {*}      [defaultValue=[]]
 * @returns {*}
 */
function readJsonSafe(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

module.exports = { atomicWriteJson, readJsonSafe };
