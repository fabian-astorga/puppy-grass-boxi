/**
 * admin/js/sectionEditors.js — Section Editor Renderers
 * One function per content section. Returns HTML for the editor form.
 */
'use strict';

const SECTION_TITLES = {
  SITE: '⚙️ Sitio & Contacto', NAV: '🧭 Navegación', HERO: '🦸 Hero',
  WHAT_IS: '🌱 ¿Qué es?', BENEFITS: '✅ Beneficios', SIZES: '📦 Tamaños',
  HOW_IT_WORKS: '⚙️ Cómo funciona', DURABILITY: '📅 Durabilidad',
  TESTIMONIALS: '💬 Testimonios', FAQ: '❓ FAQ', CTA: '🎯 CTA Final',
  FOOTER: '🔻 Footer', COMMENTS: '📨 Comentarios',
};

const SECTION_EDITORS = {

  SITE(data) {
    return buildEditorSection({ id: 'site-brand', title: '🏷️ Marca & Contacto', content: `
      ${buildTextField({ id: 'site_name',     label: 'Nombre del sitio', value: data.name })}
      ${buildTextField({ id: 'site_tagline',  label: 'Tagline (footer)', value: data.tagline })}
      <div class="item-card__grid">
        ${buildTextField({ id: 'site_wa_number',  label: 'Número WhatsApp (con código)', value: data.wa_number, hint: 'Ej: 50661166969' })}
        ${buildTextField({ id: 'site_wa_display', label: 'WhatsApp visible',             value: data.wa_display, hint: 'Ej: 6116-6969' })}
      </div>
    ` }) +
    buildEditorSection({ id: 'site-seo', title: '🔍 SEO', collapsed: true, content: `
      ${buildTextField({ id: 'site_meta_title',    label: 'Título en Google', value: data.meta_title })}
      ${buildTextareaField({ id: 'site_meta_desc', label: 'Descripción en Google', value: data.meta_desc, hint: 'Máx 160 caracteres' })}
      ${buildTextField({ id: 'site_meta_keywords', label: 'Palabras clave', value: data.meta_keywords })}
    ` });
  },

  NAV(data) {
    return buildEditorSection({ id: 'nav-main', title: '🧭 Barra de navegación', content: `
      ${buildTextField({ id: 'nav_cta_label',  label: 'Texto botón "Pedir"', value: data.cta_label })}
      ${buildTextField({ id: 'nav_wa_message', label: 'Mensaje WhatsApp al hacer clic', value: data.wa_message })}
    ` });
  },

  HERO(data) {
    return buildEditorSection({ id: 'hero-main', title: '📣 Texto principal', content: `
      ${buildTextField({ id: 'hero_badge',    label: 'Badge superior', value: data.badge })}
      ${buildTextareaField({ id: 'hero_title', label: 'Título (H1)', value: data.title, hint: 'Usa &lt;em&gt;palabra&lt;/em&gt; para cursiva naranja' })}
      ${buildTextareaField({ id: 'hero_subtitle', label: 'Subtítulo', value: data.subtitle })}
      <div class="item-card__grid">
        ${buildTextField({ id: 'hero_cta_primary',   label: 'Botón WhatsApp', value: data.cta_primary })}
        ${buildTextField({ id: 'hero_cta_secondary', label: 'Botón secundario', value: data.cta_secondary })}
      </div>
      ${buildTextField({ id: 'hero_wa_message', label: 'Mensaje WhatsApp', value: data.wa_message })}
      ${buildArrayField({ id: 'hero_trust_items', label: 'Indicadores de confianza', values: data.trust_items, placeholder: 'Ej: ✅ Envío a domicilio' })}
    ` }) +
    buildEditorSection({ id: 'hero-image', title: '🖼️ Imagen del Hero', content: `
      ${buildImageField({ id: 'hero_image_src', label: 'Foto principal del Hero', value: data.image_src, hint: 'Recomendado: 900×675px o mayor, formato JPG/PNG' })}
      ${buildTextField({ id: 'hero_image_alt', label: 'Texto alternativo (accesibilidad)', value: data.image_alt })}
    ` }) +
    buildEditorSection({ id: 'hero-badges', title: '🏅 Badges flotantes', collapsed: true, content: `
      <div class="item-card__grid">
        ${buildTextField({ id: 'hero_badge_1_value', label: 'Badge 1 — Número', value: data.badge_1_value })}
        ${buildTextField({ id: 'hero_badge_1_label', label: 'Badge 1 — Texto',  value: data.badge_1_label })}
        ${buildTextField({ id: 'hero_badge_2_value', label: 'Badge 2 — Número', value: data.badge_2_value })}
        ${buildTextField({ id: 'hero_badge_2_label', label: 'Badge 2 — Texto',  value: data.badge_2_label })}
      </div>
    ` });
  },

  WHAT_IS(data) {
    return buildEditorSection({ id: 'whatis-main', title: '📝 Contenido', content: `
      ${buildTextField({ id: 'whatis_badge', label: 'Badge', value: data.badge })}
      ${buildTextField({ id: 'whatis_title', label: 'Título', value: data.title })}
      ${buildTextareaField({ id: 'whatis_body_1', label: 'Párrafo 1', value: data.body_1 })}
      ${buildTextareaField({ id: 'whatis_body_2', label: 'Párrafo 2', value: data.body_2 })}
      ${buildArrayField({ id: 'whatis_points', label: 'Puntos destacados', values: data.points, placeholder: 'Ej: 🌱 Césped natural' })}
    ` }) +
    buildEditorSection({ id: 'whatis-image', title: '🖼️ Imagen', content: `
      ${buildImageField({ id: 'whatis_image_src', label: 'Foto de sección', value: data.image_src })}
      ${buildTextField({ id: 'whatis_image_alt', label: 'Texto alternativo', value: data.image_alt })}
    ` });
  },

  BENEFITS(data) {
    return buildEditorSection({ id: 'benefits-header', title: '🗂️ Encabezado', content: `
      ${buildTextField({ id: 'benefits_badge',    label: 'Badge',     value: data.badge })}
      ${buildTextField({ id: 'benefits_title',    label: 'Título',    value: data.title })}
      ${buildTextField({ id: 'benefits_subtitle', label: 'Subtítulo', value: data.subtitle })}
    ` }) +
    buildEditorSection({ id: 'benefits-items', title: '🃏 Tarjetas', content: `
      <div class="item-list" id="benefits_items">
        ${data.items.map((item, i) => buildItemCard({ index: i, label: `Beneficio ${i+1}`, content: `
          <div class="item-card__grid">
            ${buildTextField({ id: `benefit_${i}_icon`,  label: 'Emoji', value: item.icon })}
            ${buildTextField({ id: `benefit_${i}_title`, label: 'Título', value: item.title })}
          </div>
          ${buildTextareaField({ id: `benefit_${i}_desc`, label: 'Descripción', value: item.desc })}
        ` })).join('')}
      </div>
    ` });
  },

  SIZES(data) {
    return buildEditorSection({ id: 'sizes-header', title: '🗂️ Encabezado', content: `
      ${buildTextField({ id: 'sizes_badge',    label: 'Badge',     value: data.badge })}
      ${buildTextField({ id: 'sizes_title',    label: 'Título',    value: data.title })}
      ${buildTextField({ id: 'sizes_subtitle', label: 'Subtítulo', value: data.subtitle })}
      ${buildTextField({ id: 'sizes_cta_advice', label: 'Texto asesoría', value: data.cta_advice })}
      ${buildTextField({ id: 'sizes_wa_message', label: 'Mensaje WhatsApp asesoría', value: data.wa_message })}
    ` }) +
    buildEditorSection({ id: 'sizes-items', title: '📦 Presentaciones', content: `
      <div class="item-list">
        ${data.items.map((item, i) => buildItemCard({ index: i, label: `${item.name}`, content: `
          <div class="item-card__grid">
            ${buildTextField({ id: `size_${i}_name`,       label: 'Nombre presentación', value: item.name })}
            ${buildTextField({ id: `size_${i}_price`,      label: 'Precio (ej: ₡12,700)', value: item.price || '' })}
          </div>
          ${buildTextareaField({ id: `size_${i}_desc`, label: 'Descripción corta', value: item.desc || '' })}
          <div class="item-card__grid">
            ${buildTextField({ id: `size_${i}_dimensions`, label: 'Medidas',  value: item.dimensions })}
            ${buildTextField({ id: `size_${i}_weight`,     label: 'Peso mascota', value: item.weight })}
            ${buildTextField({ id: `size_${i}_duration`,   label: 'Duración', value: item.duration })}
          </div>
          <div class="item-card__grid">
            ${buildToggleField({ id: `size_${i}_featured`, label: '⭐ Destacado', checked: item.featured })}
            ${buildTextField({ id: `size_${i}_ribbon`, label: 'Texto ribbon', value: item.ribbon || '' })}
          </div>
          ${buildImageField({ id: `size_${i}_illustration`, label: 'Ilustración de medidas', value: item.illustration || '' })}
          <div class="form-group" style="margin-top:1rem">
            <label class="form-label">🔄 Repuesto</label>
            <div style="border:1px solid var(--border);border-radius:8px;padding:1rem;margin-top:.4rem">
              ${buildToggleField({ id: `size_${i}_spare_enabled`, label: 'Mostrar sección de repuesto', checked: item.spare?.enabled || false })}
              ${buildTextField({ id: `size_${i}_spare_title`, label: 'Nombre del repuesto', value: item.spare?.title || '' })}
              ${buildTextareaField({ id: `size_${i}_spare_desc`, label: 'Descripción del repuesto', value: item.spare?.desc || '' })}
              ${buildTextField({ id: `size_${i}_spare_price`, label: 'Precio repuesto (ej: ₡18,500)', value: item.spare?.price || '' })}
            </div>
          </div>
          <input type="hidden" id="size_${i}_image_src" value="${item.image_src || ''}" />
        ` })).join('')}
      </div>
    ` });
  },

  HOW_IT_WORKS(data) {
    return buildEditorSection({ id: 'how-header', title: '🗂️ Encabezado', content: `
      ${buildTextField({ id: 'how_badge',    label: 'Badge',     value: data.badge })}
      ${buildTextField({ id: 'how_title',    label: 'Título',    value: data.title })}
      ${buildTextField({ id: 'how_subtitle', label: 'Subtítulo', value: data.subtitle })}
    ` }) +
    buildEditorSection({ id: 'how-steps', title: '👣 Pasos', content: `
      <div class="item-list">
        ${data.steps.map((step, i) => buildItemCard({ index: i, label: `Paso ${step.number}`, content: `
          <div class="item-card__grid">
            ${buildTextField({ id: `step_${i}_number`, label: 'Número', value: step.number })}
            ${buildTextField({ id: `step_${i}_icon`,   label: 'Emoji',  value: step.icon })}
          </div>
          ${buildTextField({ id: `step_${i}_title`, label: 'Título', value: step.title })}
          ${buildTextareaField({ id: `step_${i}_desc`, label: 'Descripción', value: step.desc })}
        ` })).join('')}
      </div>
    ` });
  },

  DURABILITY(data) {
    return buildEditorSection({ id: 'dur-main', title: '📝 Contenido', content: `
      ${buildTextField({ id: 'dur_badge',   label: 'Badge',   value: data.badge })}
      ${buildTextField({ id: 'dur_title',   label: 'Título',  value: data.title })}
      ${buildTextareaField({ id: 'dur_body_1', label: 'Párrafo 1', value: data.body_1 })}
      ${buildTextareaField({ id: 'dur_body_2', label: 'Párrafo 2', value: data.body_2 })}
      ${buildArrayField({ id: 'dur_points', label: 'Puntos', values: data.points })}
      <div class="item-card__grid">
        ${buildTextField({ id: 'dur_cta_label',  label: 'Botón CTA', value: data.cta_label })}
        ${buildTextField({ id: 'dur_wa_message', label: 'Mensaje WA', value: data.wa_message })}
      </div>
    ` }) +
    buildEditorSection({ id: 'dur-timeline', title: '📅 Timeline', collapsed: true, content: `
      <div class="item-list">
        ${data.timeline.map((t, i) => buildItemCard({ index: i, label: t.label, content: `
          <div class="item-card__grid">
            ${buildTextField({ id: `tl_${i}_label`, label: 'Etiqueta', value: t.label })}
            ${buildToggleField({ id: `tl_${i}_active`, label: 'Activo (verde)', checked: t.active })}
          </div>
          ${buildTextareaField({ id: `tl_${i}_desc`, label: 'Descripción', value: t.desc })}
        ` })).join('')}
      </div>
    ` });
  },

  TESTIMONIALS(data) {
    return buildEditorSection({ id: 'test-header', title: '🗂️ Encabezado', content: `
      ${buildTextField({ id: 'test_badge',    label: 'Badge',     value: data.badge })}
      ${buildTextField({ id: 'test_title',    label: 'Título',    value: data.title })}
      ${buildTextField({ id: 'test_subtitle', label: 'Subtítulo', value: data.subtitle })}
    ` }) +
    buildEditorSection({ id: 'test-items', title: '💬 Testimonios', content: `
      <div class="item-list">
        ${data.items.map((t, i) => buildItemCard({ index: i, label: t.name, content: `
          <div class="item-card__grid">
            ${buildTextField({ id: `test_${i}_name`,   label: 'Nombre', value: t.name })}
            ${buildTextField({ id: `test_${i}_avatar`, label: 'Emoji avatar', value: t.avatar })}
          </div>
          ${buildTextField({ id: `test_${i}_pet`,   label: 'Mascota', value: t.pet })}
          ${buildTextField({ id: `test_${i}_stars`, label: 'Estrellas (1-5)', value: String(t.stars) })}
          ${buildTextareaField({ id: `test_${i}_quote`, label: 'Testimonio', value: t.quote })}
        ` })).join('')}
      </div>
    ` });
  },

  FAQ(data) {
    return buildEditorSection({ id: 'faq-header', title: '🗂️ Encabezado', content: `
      ${buildTextField({ id: 'faq_badge',      label: 'Badge',   value: data.badge })}
      ${buildTextField({ id: 'faq_title',      label: 'Título',  value: data.title })}
      ${buildTextField({ id: 'faq_cta_label',  label: 'Botón',   value: data.cta_label })}
      ${buildTextField({ id: 'faq_wa_message', label: 'Mensaje WhatsApp', value: data.wa_message })}
    ` }) +
    buildEditorSection({ id: 'faq-items', title: '❓ Preguntas', content: `
      <div class="item-list">
        ${data.items.map((item, i) => buildItemCard({ index: i, label: `P${i+1}: ${item.question.substring(0,40)}...`, content: `
          ${buildTextField({ id: `faq_${i}_question`, label: 'Pregunta', value: item.question })}
          ${buildTextareaField({ id: `faq_${i}_answer`, label: 'Respuesta', value: item.answer })}
        ` })).join('')}
      </div>
    ` });
  },

  CTA(data) {
    return buildEditorSection({ id: 'cta-main', title: '🎯 CTA Final', content: `
      ${buildTextField({ id: 'cta_icon',      label: 'Emoji',     value: data.icon })}
      ${buildTextField({ id: 'cta_title',     label: 'Título',    value: data.title })}
      ${buildTextareaField({ id: 'cta_subtitle', label: 'Subtítulo', value: data.subtitle })}
      ${buildTextField({ id: 'cta_emphasis',  label: 'Texto bold', value: data.emphasis })}
      ${buildTextField({ id: 'cta_cta_label', label: 'Botón',     value: data.cta_label })}
      ${buildTextField({ id: 'cta_wa_message',label: 'Mensaje WA', value: data.wa_message })}
      ${buildTextField({ id: 'cta_note',      label: 'Nota final', value: data.note })}
    ` });
  },

  FOOTER(data) {
    return buildEditorSection({ id: 'footer-main', title: '🔻 Footer', content: `
      ${buildTextField({ id: 'footer_copyright', label: 'Copyright', value: data.copyright })}
      ${buildTextField({ id: 'footer_wa_label',  label: 'Texto WhatsApp', value: data.wa_label })}
    ` });
  },

  COMMENTS(data) {
    return buildEditorSection({ id: 'comments-text', title: '💬 Texto de la sección', content: `
      ${buildTextField({ id: 'comments_badge',   label: 'Badge',            value: data.badge })}
      ${buildTextField({ id: 'comments_title',   label: 'Título',           value: data.title })}
      ${buildTextareaField({ id: 'comments_subtitle', label: 'Subtítulo', value: data.subtitle })}
      ${buildTextField({ id: 'comments_placeholder_comment', label: 'Placeholder textarea', value: data.placeholder_comment })}
      ${buildTextField({ id: 'comments_placeholder_name',    label: 'Placeholder nombre',   value: data.placeholder_name })}
      ${buildTextField({ id: 'comments_btn_label',  label: 'Texto del botón',   value: data.btn_label })}
      ${buildTextField({ id: 'comments_success_msg', label: 'Mensaje de éxito', value: data.success_msg })}
      ${buildTextField({ id: 'comments_error_msg',   label: 'Mensaje de error',  value: data.error_msg })}
    ` }) +
    buildEditorSection({ id: 'comments-inbox', title: '📥 Comentarios recibidos', content: `
      <div id="comments-inbox-area">
        <p style="color:var(--text-muted);font-size:.88rem">Cargando comentarios...</p>
      </div>
    ` });
  },
};
