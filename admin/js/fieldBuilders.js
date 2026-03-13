/**
 * admin/js/fieldBuilders.js — Reusable Form Field Builders
 * Pure functions: receive config, return HTML strings or DOM nodes.
 */
'use strict';

/** Text input field */
function buildTextField({ id, label, value = '', hint = '', placeholder = '' }) {
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}</label>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
      <input class="form-input" type="text" id="${id}" name="${id}"
             value="${escAttr(value)}" placeholder="${escAttr(placeholder)}" />
    </div>`;
}

/** Textarea field */
function buildTextareaField({ id, label, value = '', hint = '', large = false }) {
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}</label>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
      <textarea class="form-textarea ${large ? 'form-textarea--lg' : ''}"
                id="${id}" name="${id}">${escText(value)}</textarea>
    </div>`;
}

/** Checkbox / boolean toggle */
function buildToggleField({ id, label, checked = false, hint = '' }) {
  return `
    <div class="form-group">
      <label class="form-toggle" for="${id}">
        <input type="checkbox" id="${id}" name="${id}" ${checked ? 'checked' : ''} />
        <span class="form-label" style="margin:0">${label}</span>
      </label>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}

/**
 * Array editor — for simple string arrays (trust_items, points, etc.)
 * Renders inline add/remove rows with a hidden JSON input.
 */
function buildArrayField({ id, label, values = [], hint = '', placeholder = 'Elemento...' }) {
  const rows = values.map((v, i) => `
    <div class="array-row" data-index="${i}">
      <input class="form-input array-item" type="text"
             value="${escAttr(v)}" placeholder="${escAttr(placeholder)}" />
      <button class="btn-icon btn-icon--remove" type="button"
              title="Eliminar" aria-label="Eliminar elemento">✕</button>
    </div>`).join('');

  return `
    <div class="form-group">
      <label class="form-label">${label}</label>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
      <div class="array-editor" id="${id}">
        ${rows}
        <button class="btn-icon btn-icon--add" type="button"
                data-array="${id}" title="Agregar" aria-label="Agregar elemento">+ Agregar</button>
      </div>
    </div>`;
}

/**
 * Collapsible section wrapper for groups of fields.
 */
function buildEditorSection({ title, id, content, collapsed = false }) {
  return `
    <div class="editor-section ${collapsed ? 'collapsed' : ''}" id="sec-${id}">
      <div class="editor-section__header" role="button" tabindex="0"
           aria-expanded="${!collapsed}" data-toggle="${id}">
        <span class="editor-section__title">${title}</span>
        <span class="editor-section__toggle" aria-hidden="true">▾</span>
      </div>
      <div class="editor-section__body">${content}</div>
    </div>`;
}

/** Item card for repeating items (benefits, FAQ rows, etc.) */
function buildItemCard({ index, label, content }) {
  return `
    <div class="item-card" data-item-index="${index}">
      <div class="item-card__label">${label}</div>
      ${content}
    </div>`;
}

/** Escape helpers */
function escAttr(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
function escText(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
}

/**
 * Image picker field — shows current image, upload button, and gallery picker.
 * @param {string} id       — field id (stores the /images/... url)
 * @param {string} label    — field label
 * @param {string} value    — current image url
 * @param {string} hint     — optional hint text
 */
function buildImageField({ id, label, value = '', hint = '' }) {
  const thumb = value
    ? `<img src="${escAttr(value)}" alt="Imagen actual" class="img-picker__preview" id="${id}_preview" />`
    : `<div class="img-picker__empty" id="${id}_preview">Sin imagen</div>`;

  return `
    <div class="form-group img-picker-group" data-img-field="${id}">
      <label class="form-label">${label}</label>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
      <input type="hidden" id="${id}" name="${id}" value="${escAttr(value)}" />
      <div class="img-picker">
        <div class="img-picker__thumb">${thumb}</div>
        <div class="img-picker__controls">
          <label class="btn btn--sm btn--outline img-picker__upload-btn" title="Subir nueva imagen">
            📤 Subir imagen
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                   class="img-picker__file" style="display:none" data-target="${id}" />
          </label>
          <button type="button" class="btn btn--sm btn--ghost img-picker__gallery-btn"
                  data-target="${id}">🖼️ Galería</button>
          <span class="img-picker__status" id="${id}_status"></span>
        </div>
        <div class="img-picker__url-row">
          <input class="form-input form-input--sm" type="text" id="${id}_url"
                 placeholder="URL manual: /images/foto.jpg o https://..."
                 value="${escAttr(value)}" />
          <button type="button" class="btn btn--sm btn--primary img-picker__url-apply"
                  data-target="${id}">Aplicar</button>
        </div>
      </div>
    </div>`;
}
