/**
 * public/js/main.js — Application Entry Point
 */
'use strict';

async function fetchContent() {
  try {
    const res = await fetch('https://puppy-grass-boxi.onrender.com/api/content');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[main] Error al cargar contenido:', err);
    return {};
  }
}

/* ── Spare accordion ───────────────────────────────────────── */
function initSpareAccordions() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.spare-toggle');
    if (!btn) return;
    const body    = btn.nextElementSibling;
    const isOpen  = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !isOpen);
    const icon    = btn.querySelector('.spare-toggle__icon');
    if (icon) icon.textContent = isOpen ? '+' : '−';
    if (isOpen) {
      body.hidden = true;
    } else {
      body.hidden = false;
    }
  });
}

/* ── Comments form ─────────────────────────────────────────── */
function initCommentsForm() {
  const form     = document.getElementById('comments-form');
  if (!form) return;

  const textarea  = document.getElementById('comments-textarea');
  const nameInput = document.getElementById('comments-name');
  const submitBtn = document.getElementById('comments-submit');
  const feedback  = document.getElementById('comments-feedback');
  const charCount = document.getElementById('comments-char');

  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len}/1000`;
      charCount.style.color = len > 900 ? 'var(--color-accent)' : '';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const comment = textarea ? textarea.value.trim() : '';
    if (!comment || comment.length < 3) {
      showFeedback('Por favor escribe un comentario.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    feedback.hidden = true;

    try {
      const res = await fetch('https://puppy-grass-boxi.onrender.com/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment,
          name: nameInput ? nameInput.value.trim() : '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showFeedback(data.error || CONTENT.COMMENTS?.error_msg || 'Error al enviar.', 'error');
      } else {
        showFeedback(CONTENT.COMMENTS?.success_msg || '¡Gracias! Tu comentario fue enviado.', 'success');
        form.reset();
        if (charCount) charCount.textContent = '0/1000';
      }
    } catch {
      showFeedback(CONTENT.COMMENTS?.error_msg || 'Error de red. Intenta de nuevo.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = CONTENT.COMMENTS?.btn_label || 'Enviar comentario';
    }
  });

  function showFeedback(msg, type) {
    feedback.textContent = msg;
    feedback.className   = `comments-feedback comments-feedback--${type}`;
    feedback.hidden      = false;
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ── Init ──────────────────────────────────────────────────── */
async function init() {
  window.CONTENT = await fetchContent();
  renderAll();
  initNavbar();
  initCarousel();
  initFAQ();
  initSpareAccordions();
  initCommentsForm();
  requestAnimationFrame(initAnimations);
}

document.addEventListener('DOMContentLoaded', init);
