'use strict';
function initCarousel() {
  const track = document.getElementById('testimonialsTrack');
  const dots  = document.getElementById('testimonialDots');
  const prev  = document.getElementById('prevTestimonial');
  const next  = document.getElementById('nextTestimonial');
  if (!track || !CONTENT.TESTIMONIALS) return;

  // Render cards
  track.innerHTML = CONTENT.TESTIMONIALS.items.map(buildTestimonialCard).join('');

  const cards   = track.querySelectorAll('.testimonial-card');
  let   current = 0;
  let   perView = getPerView();
  let   total   = Math.ceil(cards.length / perView);
  let   timer   = null;

  function getPerView() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640)  return 2;
    return 1;
  }

  function renderDots() {
    if (!dots) return;
    total = Math.ceil(cards.length / perView);
    dots.innerHTML = Array.from({length: total}, (_, i) =>
      `<button class="carousel__dot${i === current ? ' carousel__dot--active' : ''}"
               aria-label="Ir al grupo ${i+1}" data-i="${i}"></button>`
    ).join('');
    dots.querySelectorAll('.carousel__dot').forEach(d => {
      d.addEventListener('click', () => goTo(parseInt(d.dataset.i)));
    });
  }

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, total - 1));
    const offset = current * perView;
    const pct    = 100 / perView;
    track.style.transform = `translateX(-${offset * pct}%)`;
    // Update card widths
    cards.forEach(c => { c.style.flex = `0 0 calc(${100/perView}% - 1rem)`; });
    // Update dots
    dots.querySelectorAll('.carousel__dot').forEach((d, i) =>
      d.classList.toggle('carousel__dot--active', i === current));
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo((current + 1) % total), 5000);
  }

  // Set initial card widths
  cards.forEach(c => { c.style.flex = `0 0 calc(${100/perView}% - 1rem)`; c.style.margin = '0 0.5rem'; });
  renderDots();
  resetTimer();

  prev?.addEventListener('click', () => goTo((current - 1 + total) % total));
  next?.addEventListener('click', () => goTo((current + 1) % total));

  window.addEventListener('resize', () => {
    const newPV = getPerView();
    if (newPV !== perView) { perView = newPV; current = 0; cards.forEach(c => { c.style.flex = `0 0 calc(${100/perView}% - 1rem)`; }); renderDots(); goTo(0); }
  }, { passive: true });
}
