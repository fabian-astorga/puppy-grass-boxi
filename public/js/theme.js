'use strict';
function getSavedTheme()  { return localStorage.getItem('pgb_theme') || 'light'; }
function applyTheme(t)    { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('pgb_theme', t); }
function toggleTheme()    { applyTheme(getSavedTheme() === 'dark' ? 'light' : 'dark'); updateIcons(); }
function updateIcons() {
  const isDark = getSavedTheme() === 'dark';
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', String(isDark));
  });
}
function initTheme() {
  applyTheme(getSavedTheme());
  updateIcons();
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
}
document.addEventListener('DOMContentLoaded', initTheme);
