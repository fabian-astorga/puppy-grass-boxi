/**
 * admin/js/api.js — Admin API Client
 * ─────────────────────────────────────────────────────────────
 * Thin wrapper around fetch for all server calls.
 *
 * FIX: All state-changing requests (POST, PUT, PATCH, DELETE)
 * now include the X-CSRF-Token header, read from the pgb_csrf
 * cookie that the server sets on login. This implements the
 * double-submit cookie CSRF protection pattern.
 *
 * Attacker sites cannot read cookies from another origin, so
 * they cannot forge this header — even if sameSite: 'none'
 * causes the session cookie to be sent cross-origin.
 */
'use strict';

/**
 * Read a cookie value by name.
 * Used to extract the CSRF token for mutation requests.
 */
function getCookie(name) {
  const match = document.cookie.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/**
 * Build fetch options with CSRF header for mutating requests.
 * @param {string} method
 * @param {object} [body]
 * @returns {RequestInit}
 */
function mutationOptions(method, body) {
  const csrfToken = getCookie('pgb_csrf');
  const headers = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  return {
    method,
    credentials: 'include',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
}

const API = {
  async login(password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    return data;
  },

  async logout() {
    await fetch('/api/auth/logout', mutationOptions('POST'));
  },

  async getContent() {
    const res = await fetch('/api/content', { credentials: 'include' });
    if (!res.ok) throw new Error('Error al cargar el contenido');
    return res.json();
  },

  async saveSection(section, data) {
    const res = await fetch(`/api/content/${section}`, mutationOptions('PUT', data));
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Error al guardar');
    return body;
  },
};

// ── Image Upload ─────────────────────────────────────────────
Object.assign(API, {
  async uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const res = await fetch('/api/upload', mutationOptions('POST', {
            filename: file.name,
            mimeType: file.type,
            data:     base64,
          }));
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Error al subir imagen');
          resolve(body);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  },

  async listImages() {
    const res = await fetch('/api/upload/list', { credentials: 'include' });
    if (!res.ok) throw new Error('Error al listar imágenes');
    const body = await res.json();
    return body.images || [];
  },

  async markCommentRead(id) {
    const res = await fetch(`/api/comments/${id}/read`, mutationOptions('PATCH'));
    if (!res.ok) throw new Error('Error al marcar comentario');
    return res.json();
  },

  async deleteComment(id) {
    const res = await fetch(`/api/comments/${id}`, mutationOptions('DELETE'));
    if (!res.ok) throw new Error('Error al eliminar comentario');
    return res.json();
  },
});
