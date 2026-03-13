/**
 * public/js/renderer.js
 * Renders ALL content from window.CONTENT into the DOM.
 *
 * Security: href values from content.json are validated client-side
 * before assignment (defense-in-depth — server sanitizes on save too).
 */
'use strict';

function setHtml(id, html)      { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function setText(id, text)      { const el = document.getElementById(id); if (el) el.textContent = text; }
function setAttr(id, attr, val) { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); }
function waUrl(n, m) { return `https://wa.me/${n}?text=${encodeURIComponent(m)}`; }

/**
 * Validate a URL before assigning to href.
 * Blocks javascript:, data:, vbscript: and other dangerous protocols.
 * Returns '#' for any URL that doesn't start with https?://, /, or #.
 * Server-side sanitizeHref() is the primary control; this is defense-in-depth.
 */
function safeHref(url, fallback) {
  if (!url || typeof url !== 'string') return fallback || '#';
  const t = url.trim();
  return /^(https?:\/\/|\/|#)/i.test(t) ? t : (fallback || '#');
}

/* NAV */
function renderNav() {
  const { SITE, NAV } = CONTENT;
  if (!NAV) return;

  const cta = document.getElementById('nav-cta');
  if (cta) { cta.textContent = NAV.cta_label; cta.href = waUrl(SITE.wa_number, NAV.wa_message); }

  const navList = document.getElementById('nav-links');
  if (navList) navList.innerHTML = (NAV.links || []).map(l =>
    `<li><a href="${l.href}" class="navbar__link">${l.label}</a></li>`).join('');

  const mobileWa = document.getElementById('mobile-wa-btn');
  if (mobileWa) { mobileWa.textContent = `💬 ${NAV.cta_label}`; mobileWa.href = waUrl(SITE.wa_number, NAV.wa_message); }

  const mobileLinks = document.getElementById('mobile-nav-links');
  if (mobileLinks) mobileLinks.innerHTML = (NAV.links || []).map(l =>
    `<a href="${l.href}">${l.label}</a>`).join('');

  const waFloat = document.getElementById('wa-float');
  if (waFloat) waFloat.href = waUrl(SITE.wa_number, NAV.wa_message);
}

/* HERO */
function renderHero() {
  const { HERO, SITE } = CONTENT;
  if (!HERO) return;
  setText('hero-badge', HERO.badge);
  setHtml('hero-title', HERO.title);
  setText('hero-subtitle', HERO.subtitle);

  const p = document.getElementById('hero-cta-primary');
  if (p) { p.textContent = HERO.cta_primary; p.href = waUrl(SITE.wa_number, HERO.wa_message); }

  const s = document.getElementById('hero-cta-secondary');
  if (s) { s.textContent = HERO.cta_secondary; s.href = safeHref(HERO.cta_secondary_href, '#como-funciona'); }

  const trust = document.getElementById('hero-trust');
  if (trust) trust.innerHTML = (HERO.trust_items || []).map(i =>
    `<span class="trust-item">${i}</span>`).join('');

  setText('hero-badge-1-value', HERO.badge_1_value);
  setText('hero-badge-1-label', HERO.badge_1_label);
  setText('hero-badge-2-value', HERO.badge_2_value);
  setText('hero-badge-2-label', HERO.badge_2_label);

  setAttr('hero-img', 'src', HERO.image_src);
  setAttr('hero-img', 'alt', HERO.image_alt);
}

/* QUÉ ES */
function renderWhatIs() {
  const { WHAT_IS } = CONTENT;
  if (!WHAT_IS) return;
  setText('whatis-badge', WHAT_IS.badge);
  setText('whatis-title', WHAT_IS.title);
  setHtml('whatis-body-1', WHAT_IS.body_1);
  setHtml('whatis-body-2', WHAT_IS.body_2);

  const list = document.getElementById('whatis-points');
  if (list) list.innerHTML = (WHAT_IS.points || []).map(p => `<li>${p}</li>`).join('');

  setAttr('whatis-img', 'src', WHAT_IS.image_src);
  setAttr('whatis-img', 'alt', WHAT_IS.image_alt);
}

/* BENEFICIOS */
function renderBenefits() {
  const { BENEFITS } = CONTENT;
  if (!BENEFITS) return;
  setText('benefits-badge', BENEFITS.badge);
  setText('benefits-title', BENEFITS.title);
  setText('benefits-subtitle', BENEFITS.subtitle);
  setHtml('benefitsGrid', (BENEFITS.items || []).map(buildBenefitCard).join(''));
}

/* TAMAÑOS */
function renderSizes() {
  const { SIZES, SITE } = CONTENT;
  if (!SIZES) return;
  setText('sizes-badge', SIZES.badge);
  setText('sizes-title', SIZES.title);
  setText('sizes-subtitle', SIZES.subtitle);

  const base = `https://wa.me/${SITE.wa_number}`;
  setHtml('sizesGrid', (SIZES.items || []).map(s => buildSizeCard(s, base)).join(''));

  const link = document.getElementById('sizes-advice-link');
  if (link) { link.textContent = SIZES.cta_advice; link.href = waUrl(SITE.wa_number, SIZES.wa_message); }
}

/* CÓMO FUNCIONA */
function renderSteps() {
  const { HOW_IT_WORKS } = CONTENT;
  if (!HOW_IT_WORKS) return;
  setText('how-badge', HOW_IT_WORKS.badge);
  setText('how-title', HOW_IT_WORKS.title);
  setText('how-subtitle', HOW_IT_WORKS.subtitle);
  setHtml('stepsGrid', (HOW_IT_WORKS.steps || []).map(buildStep).join(''));
}

/* DURABILIDAD — sin lista de puntos */
function renderDurability() {
  const { DURABILITY, SITE } = CONTENT;
  if (!DURABILITY) return;
  setText('durability-badge', DURABILITY.badge);
  setText('durability-title', DURABILITY.title);
  setHtml('durability-body-1', DURABILITY.body_1);
  setHtml('durability-body-2', DURABILITY.body_2);

  const cta = document.getElementById('durability-cta');
  if (cta) { cta.textContent = DURABILITY.cta_label; cta.href = waUrl(SITE.wa_number, DURABILITY.wa_message); }

  setHtml('durabilityTimeline', (DURABILITY.timeline || []).map(buildTimelineItem).join(''));
}

/* TESTIMONIOS */
function renderTestimonialHeaders() {
  const { TESTIMONIALS } = CONTENT;
  if (!TESTIMONIALS) return;
  setText('testimonials-badge', TESTIMONIALS.badge);
  setText('testimonials-title', TESTIMONIALS.title);
  setText('testimonials-subtitle', TESTIMONIALS.subtitle);
}

/* FAQ */
function renderFAQ() {
  const { FAQ, SITE } = CONTENT;
  if (!FAQ) return;
  setText('faq-badge', FAQ.badge);
  setText('faq-title', FAQ.title);
  setHtml('faqList', (FAQ.items || []).map((item, i) => buildFaqItem(item, i)).join(''));

  const cta = document.getElementById('faq-cta');
  if (cta) { cta.textContent = FAQ.cta_label; cta.href = waUrl(SITE.wa_number, FAQ.wa_message); }
}

/* CTA FINAL */
function renderCTA() {
  const { CTA, SITE } = CONTENT;
  if (!CTA) return;
  setText('cta-icon', CTA.icon);
  setText('cta-title', CTA.title);
  setText('cta-subtitle', CTA.subtitle);
  setText('cta-emphasis', CTA.emphasis);
  setText('cta-note', CTA.note);

  const btn = document.getElementById('cta-btn');
  if (btn) { btn.textContent = CTA.cta_label; btn.href = waUrl(SITE.wa_number, CTA.wa_message); }
}

/* COMENTARIOS — renderiza texto desde content.json */
function renderComments() {
  const { COMMENTS } = CONTENT;
  if (!COMMENTS) return;
  setText('comments-badge', COMMENTS.badge);
  setText('comments-title', COMMENTS.title);
  setText('comments-subtitle', COMMENTS.subtitle);

  const textarea = document.getElementById('comments-textarea');
  if (textarea) textarea.placeholder = COMMENTS.placeholder_comment;

  const nameInput = document.getElementById('comments-name');
  if (nameInput) nameInput.placeholder = COMMENTS.placeholder_name;

  const btn = document.getElementById('comments-submit');
  if (btn) btn.textContent = COMMENTS.btn_label;
}

/* FOOTER */
function renderFooter() {
  const { FOOTER, SITE, NAV } = CONTENT;
  if (!FOOTER) return;
  setText('footer-copyright', FOOTER.copyright);

  const wa = document.getElementById('footer-wa');
  if (wa) { wa.textContent = FOOTER.wa_label; wa.href = `https://wa.me/${SITE.wa_number}`; }

  // Render footer nav links from content
  const links = FOOTER.nav_links || (NAV && NAV.links) || [];
  const footerNav = document.getElementById('footer-nav-links');
  if (footerNav) {
    footerNav.innerHTML = links.map(l =>
      `<a href="${l.href}">${l.label}</a>`).join('');
  }
}

/* META */
function renderMeta() {
  const { SITE } = CONTENT;
  if (SITE.meta_title) document.title = SITE.meta_title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && SITE.meta_desc) desc.setAttribute('content', SITE.meta_desc);
}

/* RENDER ALL */
function renderAll() {
  try { renderMeta();               } catch(e) { console.error('[renderer] meta', e); }
  try { renderNav();                } catch(e) { console.error('[renderer] nav', e); }
  try { renderHero();               } catch(e) { console.error('[renderer] hero', e); }
  try { renderWhatIs();             } catch(e) { console.error('[renderer] whatis', e); }
  try { renderBenefits();           } catch(e) { console.error('[renderer] benefits', e); }
  try { renderSizes();              } catch(e) { console.error('[renderer] sizes', e); }
  try { renderSteps();              } catch(e) { console.error('[renderer] steps', e); }
  try { renderDurability();         } catch(e) { console.error('[renderer] durability', e); }
  try { renderTestimonialHeaders(); } catch(e) { console.error('[renderer] testimonials', e); }
  try { renderFAQ();                } catch(e) { console.error('[renderer] faq', e); }
  try { renderCTA();                } catch(e) { console.error('[renderer] cta', e); }
  try { renderComments();           } catch(e) { console.error('[renderer] comments', e); }
  try { renderFooter();             } catch(e) { console.error('[renderer] footer', e); }
}
