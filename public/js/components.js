/**
 * public/js/components.js — Pure HTML builders
 */
'use strict';

function buildWaUrl(baseUrl, message) {
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

function buildStars(count) {
  return '★'.repeat(Math.min(5, Math.max(1, count)));
}

/* BENEFIT CARD */
function buildBenefitCard({ icon, title, desc }) {
  return `
    <article class="benefit-card" role="listitem">
      <span class="benefit-card__icon" aria-hidden="true">${icon}</span>
      <h3 class="benefit-card__title">${title}</h3>
      <p class="benefit-card__desc">${desc}</p>
    </article>`;
}

/* SIZE CARD */
function buildSizeCard(size, waBase) {
  const msg    = `Hola! Me interesa el Boxi ${size.name} (${size.dimensions}) para mi mascota`;
  const waHref = buildWaUrl(waBase, msg);

  const ribbon = size.ribbon
    ? `<div class="size-card__ribbon">${size.ribbon}</div>` : '';

  const illustration = size.illustration
    ? `<div class="size-card__illus-wrap">
         <img src="${size.illustration}" alt="Medidas ${size.name}" class="size-card__illus" loading="lazy" />
       </div>` : '';

  const priceRow = size.price
    ? `<div class="size-card__price">${size.price}</div>` : '';

  const spareSection = (size.spare && size.spare.enabled)
    ? `<div class="size-card__spare">
         <button class="spare-toggle" aria-expanded="false" type="button">
           <span class="spare-toggle__label">🔄 Repuesto disponible</span>
           <span class="spare-toggle__icon" aria-hidden="true">+</span>
         </button>
         <div class="spare-body" hidden>
           <p class="spare-body__title">${size.spare.title || 'Repuesto'}</p>
           <p class="spare-body__desc">${size.spare.desc}</p>
           <div class="spare-body__price">${size.spare.price}</div>
         </div>
       </div>` : '';

  return `
    <article class="size-card${size.featured ? ' size-card--featured' : ''}" role="listitem">
      ${ribbon}
      <div class="size-card__body">
        <div class="size-card__name">${size.name}</div>
        <p class="size-card__desc">${size.desc || ''}</p>
        ${illustration}
        <div class="size-card__specs">
          <div class="size-card__spec">
            <span class="size-card__spec-label">📐 Medidas</span>
            <span class="size-card__spec-value">${size.dimensions}</span>
          </div>
          <div class="size-card__spec">
            <span class="size-card__spec-label">⚖️ Peso mascota</span>
            <span class="size-card__spec-value">${size.weight}</span>
          </div>
          <div class="size-card__spec">
            <span class="size-card__spec-label">📅 Duración</span>
            <span class="size-card__spec-value">${size.duration}</span>
          </div>
        </div>
        ${priceRow}
        ${spareSection}
        <a href="${waHref}" class="btn btn--primary size-card__cta" target="_blank" rel="noopener noreferrer">
          Pedir este Boxi
        </a>
      </div>
    </article>`;
}

/* STEP CARD */
function buildStep({ number, icon, title, desc }) {
  return `
    <article class="step-card" role="listitem">
      <div class="step-card__number">${number}</div>
      <span class="step-card__icon" aria-hidden="true">${icon}</span>
      <h3 class="step-card__title">${title}</h3>
      <p class="step-card__desc">${desc}</p>
    </article>`;
}

/* TIMELINE ITEM */
function buildTimelineItem({ label, desc, active }) {
  return `
    <div class="timeline-item${active ? ' timeline-item--active' : ''}" role="listitem">
      <div class="timeline-item__dot"></div>
      <div>
        <div class="timeline-item__label">${label}</div>
        <div class="timeline-item__desc">${desc}</div>
      </div>
    </div>`;
}

/* TESTIMONIAL CARD */
function buildTestimonialCard({ name, pet, stars, avatar, quote }) {
  return `
    <article class="testimonial-card">
      <div class="testimonial-card__stars">${buildStars(stars)}</div>
      <p class="testimonial-card__quote">"${quote}"</p>
      <div class="testimonial-card__author">
        <div class="testimonial-card__avatar" aria-hidden="true">${avatar}</div>
        <div>
          <div class="testimonial-card__name">${name}</div>
          <div class="testimonial-card__pet">${pet}</div>
        </div>
      </div>
    </article>`;
}

/* FAQ ITEM */
function buildFaqItem({ question, answer }, index) {
  return `
    <div class="faq-item" role="listitem">
      <button class="faq-item__trigger"
              aria-expanded="false"
              aria-controls="faq-answer-${index}"
              id="faq-question-${index}">
        ${question}
        <span class="faq-item__icon" aria-hidden="true">+</span>
      </button>
      <div class="faq-item__body"
           id="faq-answer-${index}"
           role="region"
           aria-labelledby="faq-question-${index}">
        <p class="faq-item__answer">${answer}</p>
      </div>
    </div>`;
}
