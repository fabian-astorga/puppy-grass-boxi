/**
 * admin/js/login.js — Login Form Handler
 */
'use strict';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const password  = document.getElementById('password').value;
  const btn       = document.getElementById('loginBtn');
  const errorEl   = document.getElementById('loginError');

  btn.disabled    = true;
  btn.textContent = 'Verificando...';
  errorEl.hidden  = true;

  try {
    await API.login(password);
    window.location.href = '/admin';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden      = false;
    btn.disabled        = false;
    btn.textContent     = 'Entrar al panel';
    document.getElementById('password').focus();
  }
});

// Allow Enter key to submit
document.getElementById('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('loginForm').requestSubmit();
});
