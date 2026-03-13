/**
 * admin/js/admin.js — Admin Panel Controller
 */
'use strict';

let currentSection = 'SITE';
let content        = {};
let isDirty        = false;

const editorArea   = () => document.getElementById('editorArea');
const saveBtn      = () => document.getElementById('saveBtn');
const saveStatus   = () => document.getElementById('saveStatus');
const sectionTitle = () => document.getElementById('sectionTitle');
const toast        = () => document.getElementById('toast');

/* ── Dark mode ─────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('pgb_admin_theme') || 'light';
  applyAdminTheme(saved);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyAdminTheme(current === 'dark' ? 'light' : 'dark');
  });
}
function applyAdminTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('pgb_admin_theme', theme);
  const isDark = theme === 'dark';
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon)  icon.textContent  = isDark ? '☀️' : '🌙';
  if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
}

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  try {
    content = await API.getContent();
    renderSection(currentSection);
    bindSidebar();
    bindSaveBtn();
    bindLogout();
    bindBeforeUnload();
  } catch (err) {
    showEditor('<p style="color:red;padding:2rem">Error al cargar contenido: ' + err.message + '</p>');
  }
});

/* ── Section rendering ─────────────────────────────────────── */
function renderSection(section) {
  currentSection = section;
  isDirty = false;

  sectionTitle().textContent = SECTION_TITLES[section] || section;

  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.section === section));

  const editor = SECTION_EDITORS[section];
  const data   = content[section];

  if (!editor || !data) {
    showEditor('<p style="color:red;padding:2rem">Sección no encontrada.</p>');
    return;
  }

  showEditor(editor(data));
  bindCollapsibles();
  bindArrayEditors();
  bindImagePickers();   // ← NEW
  bindChangeTracking();

  // Load comments inbox if on COMMENTS section
  if (section === 'COMMENTS') loadCommentsInbox();

  setSaveBtn(false);
  setStatus('');
}

function showEditor(html) { editorArea().innerHTML = html; }

/* ── Saving ────────────────────────────────────────────────── */
function bindSaveBtn() {
  document.getElementById('saveBtn').addEventListener('click', saveCurrentSection);
}

async function saveCurrentSection() {
  setStatus('Guardando...', 'saving');
  setSaveBtn(true, 'Guardando...');
  try {
    const updates = collectFormData(currentSection);
    await API.saveSection(currentSection, updates);
    content[currentSection] = { ...content[currentSection], ...updates };
    isDirty = false;
    setStatus('✅ Guardado', 'saved');
    setSaveBtn(false);
    showToast('✅ Cambios guardados. El sitio se actualizó al instante.', 'success');
    setTimeout(() => setStatus(''), 4000);
  } catch (err) {
    setStatus('❌ Error al guardar', 'error');
    setSaveBtn(false);
    showToast('❌ ' + err.message, 'error');
  }
}

/* ── Data collection ───────────────────────────────────────── */
function collectFormData(section) {
  switch (section) {
    case 'SITE':         return collectSITE();
    case 'NAV':          return collectNAV();
    case 'HERO':         return collectHERO();
    case 'WHAT_IS':      return collectWHAT_IS();
    case 'BENEFITS':     return collectBENEFITS();
    case 'SIZES':        return collectSIZES();
    case 'HOW_IT_WORKS': return collectHOW_IT_WORKS();
    case 'DURABILITY':   return collectDURABILITY();
    case 'TESTIMONIALS': return collectTESTIMONIALS();
    case 'FAQ':          return collectFAQ();
    case 'CTA':          return collectCTA();
    case 'FOOTER':       return collectFOOTER();
    case 'COMMENTS':     return collectCOMMENTS();
    default: return {};
  }
}

function val(id)      { return document.getElementById(id)?.value?.trim() ?? ''; }
function checked(id)  { return document.getElementById(id)?.checked ?? false; }
function arrayVal(id) {
  return Array.from(document.querySelectorAll(`#${id} .array-item`))
    .map(el => el.value.trim()).filter(Boolean);
}

function collectSITE() {
  return {
    name: val('site_name'), tagline: val('site_tagline'),
    logo_icon: val('site_logo_icon') || '',
    wa_number: val('site_wa_number'), wa_display: val('site_wa_display'),
    wa_base: `https://wa.me/${val('site_wa_number')}`,
    meta_title: val('site_meta_title'), meta_desc: val('site_meta_desc'),
    meta_keywords: val('site_meta_keywords'),
  };
}
function collectNAV() {
  return {
    cta_label:  val('nav_cta_label'),
    wa_message: val('nav_wa_message'),
    links: content.NAV.links,
  };
}
function collectHERO() {
  return {
    badge: val('hero_badge'), title: val('hero_title'), subtitle: val('hero_subtitle'),
    cta_primary: val('hero_cta_primary'), cta_secondary: val('hero_cta_secondary'),
    cta_secondary_href: '#como-funciona',
    wa_message: val('hero_wa_message'),
    image_src: val('hero_image_src'), image_alt: val('hero_image_alt'),
    badge_1_value: val('hero_badge_1_value'), badge_1_label: val('hero_badge_1_label'),
    badge_2_value: val('hero_badge_2_value'), badge_2_label: val('hero_badge_2_label'),
    trust_items: arrayVal('hero_trust_items'),
  };
}
function collectWHAT_IS() {
  return {
    badge: val('whatis_badge'), title: val('whatis_title'),
    body_1: val('whatis_body_1'), body_2: val('whatis_body_2'),
    points: arrayVal('whatis_points'),
    image_src: val('whatis_image_src'), image_alt: val('whatis_image_alt'),
  };
}
function collectBENEFITS() {
  const count = document.querySelectorAll('[id^="benefit_"][id$="_title"]').length;
  const items = Array.from({ length: count }, (_, i) => ({
    icon: val(`benefit_${i}_icon`), title: val(`benefit_${i}_title`), desc: val(`benefit_${i}_desc`),
  }));
  return { badge: val('benefits_badge'), title: val('benefits_title'), subtitle: val('benefits_subtitle'), items };
}
function collectSIZES() {
  const count = document.querySelectorAll('[id^="size_"][id$="_name"]').length;
  const items = Array.from({ length: count }, (_, i) => ({
    name:         val(`size_${i}_name`),
    desc:         val(`size_${i}_desc`),
    dimensions:   val(`size_${i}_dimensions`),
    weight:       val(`size_${i}_weight`),
    duration:     val(`size_${i}_duration`),
    price:        val(`size_${i}_price`),
    featured:     checked(`size_${i}_featured`),
    ribbon:       val(`size_${i}_ribbon`) || null,
    illustration: val(`size_${i}_illustration`),
    image_src:    val(`size_${i}_image_src`),
    spare: {
      enabled: checked(`size_${i}_spare_enabled`),
      title:   val(`size_${i}_spare_title`),
      desc:    val(`size_${i}_spare_desc`),
      price:   val(`size_${i}_spare_price`),
    },
  }));
  return {
    badge: val('sizes_badge'), title: val('sizes_title'), subtitle: val('sizes_subtitle'),
    cta_advice: val('sizes_cta_advice'), wa_message: val('sizes_wa_message'), items,
  };
}
function collectHOW_IT_WORKS() {
  const count = document.querySelectorAll('[id^="step_"][id$="_title"]').length;
  const steps = Array.from({ length: count }, (_, i) => ({
    number: val(`step_${i}_number`), icon: val(`step_${i}_icon`),
    title: val(`step_${i}_title`), desc: val(`step_${i}_desc`),
  }));
  return { badge: val('how_badge'), title: val('how_title'), subtitle: val('how_subtitle'), steps };
}
function collectDURABILITY() {
  const count = document.querySelectorAll('[id^="tl_"][id$="_label"]').length;
  const timeline = Array.from({ length: count }, (_, i) => ({
    label: val(`tl_${i}_label`), desc: val(`tl_${i}_desc`), active: checked(`tl_${i}_active`),
  }));
  return {
    badge: val('dur_badge'), title: val('dur_title'),
    body_1: val('dur_body_1'), body_2: val('dur_body_2'),
    points: arrayVal('dur_points'), cta_label: val('dur_cta_label'),
    wa_message: val('dur_wa_message'), timeline,
  };
}
function collectTESTIMONIALS() {
  const count = document.querySelectorAll('[id^="test_"][id$="_name"]').length;
  const items = Array.from({ length: count }, (_, i) => ({
    name: val(`test_${i}_name`), pet: val(`test_${i}_pet`),
    stars: parseInt(val(`test_${i}_stars`)) || 5,
    avatar: val(`test_${i}_avatar`), quote: val(`test_${i}_quote`),
  }));
  return { badge: val('test_badge'), title: val('test_title'), subtitle: val('test_subtitle'), items };
}
function collectFAQ() {
  const count = document.querySelectorAll('[id^="faq_"][id$="_question"]').length;
  const items = Array.from({ length: count }, (_, i) => ({
    question: val(`faq_${i}_question`), answer: val(`faq_${i}_answer`),
  }));
  return { badge: val('faq_badge'), title: val('faq_title'), cta_label: val('faq_cta_label'), wa_message: val('faq_wa_message'), items };
}
function collectCTA() {
  return {
    icon: val('cta_icon'), title: val('cta_title'), subtitle: val('cta_subtitle'),
    emphasis: val('cta_emphasis'), cta_label: val('cta_cta_label'),
    wa_message: val('cta_wa_message'), note: val('cta_note'),
  };
}
function collectFOOTER() {
  return { copyright: val('footer_copyright'), wa_label: val('footer_wa_label') };
}
function collectCOMMENTS() {
  return {
    badge:                val('comments_badge'),
    title:                val('comments_title'),
    subtitle:             val('comments_subtitle'),
    placeholder_comment:  val('comments_placeholder_comment'),
    placeholder_name:     val('comments_placeholder_name'),
    btn_label:            val('comments_btn_label'),
    success_msg:          val('comments_success_msg'),
    error_msg:            val('comments_error_msg'),
  };
}

/* ── Image pickers ─────────────────────────────────────────── */
function bindImagePickers() {
  // File upload
  document.querySelectorAll('.img-picker__file').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file   = e.target.files[0];
      if (!file) return;
      const target = input.dataset.target;
      const status = document.getElementById(`${target}_status`);
      try {
        status.textContent = '⏳ Subiendo...';
        status.style.color = 'var(--color-text-muted)';
        const result = await API.uploadImage(file);
        setImageFieldValue(target, result.url);
        status.textContent = '✅ Subida exitosa';
        status.style.color = 'green';
        markDirty();
        setTimeout(() => { status.textContent = ''; }, 3000);
      } catch (err) {
        status.textContent = '❌ ' + err.message;
        status.style.color = 'red';
      }
    });
  });

  // URL manual apply
  document.querySelectorAll('.img-picker__url-apply').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const url    = document.getElementById(`${target}_url`)?.value?.trim();
      if (url) { setImageFieldValue(target, url); markDirty(); }
    });
  });

  // Gallery picker
  document.querySelectorAll('.img-picker__gallery-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.target;
      await openGalleryModal(target);
    });
  });
}

function setImageFieldValue(fieldId, url) {
  // Update the hidden input
  const input = document.getElementById(fieldId);
  if (input) input.value = url;

  // Update the URL text input
  const urlInput = document.getElementById(`${fieldId}_url`);
  if (urlInput) urlInput.value = url;

  // Update preview
  const preview = document.getElementById(`${fieldId}_preview`);
  if (preview) {
    if (url) {
      preview.outerHTML = `<img src="${url}" alt="Vista previa" class="img-picker__preview" id="${fieldId}_preview" />`;
    } else {
      preview.outerHTML = `<div class="img-picker__empty" id="${fieldId}_preview">Sin imagen</div>`;
    }
  }
}

/* ── Gallery modal ─────────────────────────────────────────── */
async function openGalleryModal(targetField) {
  // Remove existing modal if any
  document.getElementById('galleryModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'galleryModal';
  modal.innerHTML = `
    <div class="gallery-modal__backdrop"></div>
    <div class="gallery-modal__box" role="dialog" aria-label="Galería de imágenes" aria-modal="true">
      <div class="gallery-modal__header">
        <h3>🖼️ Galería de imágenes</h3>
        <button class="gallery-modal__close" aria-label="Cerrar">✕</button>
      </div>
      <div class="gallery-modal__upload-zone">
        <label class="gallery-upload-label">
          <span>📤 Subir nueva imagen (JPG, PNG, WEBP — máx 5MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" id="galleryUploadInput" style="display:none" />
        </label>
        <span id="galleryUploadStatus"></span>
      </div>
      <div class="gallery-modal__grid" id="galleryGrid">
        <div class="gallery-loading">Cargando imágenes...</div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Close handlers
  modal.querySelector('.gallery-modal__close').addEventListener('click', () => modal.remove());
  modal.querySelector('.gallery-modal__backdrop').addEventListener('click', () => modal.remove());
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); }
  });

  // Upload in gallery
  modal.querySelector('#galleryUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('galleryUploadStatus');
    try {
      status.textContent = '⏳ Subiendo...';
      const result = await API.uploadImage(file);
      status.textContent = '✅ Subida exitosa';
      await loadGalleryGrid(document.getElementById('galleryGrid'), targetField, modal);
      setTimeout(() => { status.textContent = ''; }, 2000);
    } catch (err) {
      status.textContent = '❌ ' + err.message;
    }
  });

  // Load existing images
  await loadGalleryGrid(document.getElementById('galleryGrid'), targetField, modal);
}

async function loadGalleryGrid(grid, targetField, modal) {
  grid.innerHTML = '<div class="gallery-loading">Cargando...</div>';
  try {
    const images = await API.listImages();
    if (images.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">No hay imágenes. Sube una arriba.</div>';
      return;
    }
    grid.innerHTML = images.map(img => `
      <button class="gallery-img-btn" data-url="${img.url}" title="${img.name}" type="button">
        <img src="${img.url}" alt="${img.name}" loading="lazy" />
        <span>${img.name.length > 22 ? img.name.slice(0,22)+'...' : img.name}</span>
      </button>`).join('');

    grid.querySelectorAll('.gallery-img-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setImageFieldValue(targetField, btn.dataset.url);
        markDirty();
        modal.remove();
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="gallery-empty">Error: ${err.message}</div>`;
  }
}

/* ── Comments inbox ───────────────────────────────────────── */
async function loadCommentsInbox() {
  const area = document.getElementById('comments-inbox-area');
  if (!area) return;
  area.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">Cargando...</p>';
  try {
    const res = await fetch('/api/comments', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const comments = await res.json();

    if (comments.length === 0) {
      area.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;padding:.5rem 0">No hay comentarios todavía.</p>';
      return;
    }

    area.innerHTML = comments.map(c => `
      <div class="comment-card${c.read ? '' : ' comment-card--unread'}" data-id="${c.id}">
        <div class="comment-card__header">
          <span class="comment-card__name">${escHtml(c.name)}</span>
          <span class="comment-card__date">${new Date(c.createdAt).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
          ${c.read ? '' : '<span class="comment-card__badge">Nuevo</span>'}
        </div>
        <p class="comment-card__text">${escHtml(c.comment)}</p>
        <div class="comment-card__actions">
          ${!c.read ? `<button class="btn-ghost-sm comment-mark-read" data-id="${c.id}">✓ Marcar como leído</button>` : ''}
          <button class="btn-ghost-sm btn-ghost-sm--danger comment-delete" data-id="${c.id}">🗑 Eliminar</button>
        </div>
      </div>`).join('');

    // Bind actions
    area.querySelectorAll('.comment-mark-read').forEach(btn => {
      btn.addEventListener('click', async () => {
        await API.markCommentRead(btn.dataset.id);
        loadCommentsInbox();
      });
    });
    area.querySelectorAll('.comment-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este comentario?')) return;
        await API.deleteComment(btn.dataset.id);
        loadCommentsInbox();
      });
    });
  } catch (err) {
    area.innerHTML = `<p style="color:red;font-size:.88rem">Error: ${err.message}</p>`;
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── UI bindings ───────────────────────────────────────────── */
function bindSidebar() {
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isDirty) {
        const leave = confirm('Tienes cambios sin guardar. ¿Salir sin guardar?');
        if (!leave) return;
      }
      renderSection(btn.dataset.section);
    });
  });
}

function bindCollapsibles() {
  document.querySelectorAll('[data-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.editor-section');
      section.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', !section.classList.contains('collapsed'));
    });
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
    });
  });
}

function bindArrayEditors() {
  document.querySelectorAll('.array-editor').forEach(editor => {
    editor.querySelector('.btn-icon--add')?.addEventListener('click', () => {
      const placeholder = editor.querySelector('.btn-icon--add').dataset.placeholder || 'Nuevo elemento';
      const row = document.createElement('div');
      row.className = 'array-row';
      row.innerHTML = `<input class="form-input array-item" type="text" placeholder="${placeholder}" />
        <button class="btn-icon btn-icon--remove" type="button" title="Eliminar">✕</button>`;
      editor.insertBefore(row, editor.querySelector('.btn-icon--add'));
      row.querySelector('input').focus();
      markDirty();
    });
    editor.addEventListener('click', e => {
      const btn = e.target.closest('.btn-icon--remove');
      if (btn) { btn.closest('.array-row').remove(); markDirty(); }
    });
  });
}

function bindChangeTracking() {
  editorArea().addEventListener('input', markDirty);
  editorArea().addEventListener('change', markDirty);
}

function bindLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (isDirty) {
      const leave = confirm('Tienes cambios sin guardar. ¿Cerrar sesión?');
      if (!leave) return;
    }
    await API.logout();
    window.location.href = '/admin/login';
  });
}

function bindBeforeUnload() {
  window.addEventListener('beforeunload', e => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  });
}

function markDirty() {
  if (!isDirty) { isDirty = true; setSaveBtn(false); setStatus('Cambios sin guardar', 'saving'); }
}
function setSaveBtn(loading, text = 'Guardar cambios') {
  const btn = saveBtn(); btn.disabled = loading; btn.textContent = text;
}
function setStatus(text, type = '') {
  const el = saveStatus(); el.textContent = text;
  el.className = 'save-status' + (type ? ` ${type}` : '');
}
function showToast(message, type = '') {
  const el = toast(); el.textContent = message;
  el.className = 'toast' + (type ? ` ${type}` : '');
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 3500);
}
