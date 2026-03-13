/**
 * server/setup.js — One-Time Setup Script
 * ─────────────────────────────────────────────────────────────
 * Run once to create the hashed admin credentials file.
 *
 * Usage:
 *   1. Set ADMIN_PASSWORD in your .env file
 *   2. Run: node server/setup.js
 *
 * This generates server/data/auth.json with a bcrypt hash.
 * Never stores plain-text passwords.
 */

'use strict';

const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config();

const SALT_ROUNDS = 12;
const AUTH_PATH   = path.join(__dirname, 'data', 'auth.json');

async function setup() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ Error: ADMIN_PASSWORD no está definida en .env');
    console.error('   Agrega: ADMIN_PASSWORD=tu_contraseña_segura');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  console.log('🔐 Generando hash de contraseña...');
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const authData = {
    username:      'admin',
    passwordHash:  hash,
    createdAt:     new Date().toISOString(),
  };

  // Ensure data directory exists
  fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true });
  fs.writeFileSync(AUTH_PATH, JSON.stringify(authData, null, 2));

  console.log('✅ Credenciales guardadas en server/data/auth.json');
  console.log('   Usuario: admin');
  console.log('   Contraseña: [la que definiste en .env]');
  console.log('\n🚀 Ahora puedes iniciar el servidor con: npm start');
}

setup().catch(err => {
  console.error('Error durante setup:', err);
  process.exit(1);
});
