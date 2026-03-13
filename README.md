<div align="center">

<br />

# 🌿 Puppy Grass Boxi

**Landing page de producto + panel de administración CMS**
<br />Sanitarios de césped natural para mascotas · Costa Rica

<br />

[![Node.js](https://img.shields.io/badge/Node.js-≥18-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Deploy: Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)
[![Deploy: Netlify](https://img.shields.io/badge/Frontend-Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://netlify.com)
[![Security Audit](https://img.shields.io/badge/Security-Red%20Team%20Audited-critical?style=flat-square)](SECURITY.md)

<br />

</div>

---

## Índice

- [Descripción general](#descripción-general)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación local](#instalación-local)
- [Variables de entorno](#variables-de-entorno)
- [Deploy en producción](#deploy-en-producción)
- [Panel de administración](#panel-de-administración)
- [API Reference](#api-reference)
- [Seguridad](#seguridad)
- [Persistencia de datos en Render](#persistencia-de-datos-en-render)

---

## Descripción general

Puppy Grass Boxi es una landing page de producto con un panel de administración CMS integrado. Todo el contenido del sitio — textos, precios, imágenes, FAQ, testimonios — es editable desde el panel admin sin tocar código.

**Stack:**

- **Frontend:** HTML + CSS + JavaScript vanilla · Servido como sitio estático en Netlify
- **Backend:** Node.js + Express · Servido en Render
- **Datos:** Archivos JSON en disco (sin base de datos)
- **Auth:** JWT en cookie `httpOnly` + CSRF double-submit token

---

## Arquitectura del sistema

```
┌─────────────────────────────┐            HTTPS             ┌──────────────────────────────┐
│        Netlify              │  ─── fetch /api/content ───▶  │          Render              │
│                             │                               │                              │
│  public/index.html          │  ◀── JSON response ─────────  │  Node.js + Express           │
│  public/js/*.js             │                               │  server/index.js             │
│  public/css/*.css           │  ─── JWT cookie + CSRF ────▶  │                              │
│                             │       (admin mutations)       │  ┌─────────────────────────┐ │
└─────────────────────────────┘                               │  │   server/data/          │ │
                                                              │  │   content.json          │ │
┌─────────────────────────────┐                               │  │   comments.json         │ │
│  Admin Panel (auth-gated)   │  ─── auth cookie + CSRF ───▶  │  │   auth.json             │ │
│  admin/index.html           │                               │  └─────────────────────────┘ │
│  admin/js/*.js              │  ◀── JSON responses ────────  │                              │
└─────────────────────────────┘                               └──────────────────────────────┘
```

El frontend en Netlify consume la API del backend en Render.
La autenticación usa JWT en cookies `httpOnly` junto con un CSRF double-submit token.
El backend no necesita base de datos — el estado se persiste en archivos JSON con escrituras atómicas.

---

## Estructura del proyecto

```
puppy-grass-boxi/
│
├── public/                        # Sitio público (deploy en Netlify)
│   ├── index.html
│   ├── css/
│   │   ├── globals.css
│   │   ├── theme.css
│   │   ├── components.css
│   │   └── sections.css
│   ├── js/
│   │   ├── main.js                # Entry point: carga contenido e inicializa todo
│   │   ├── renderer.js            # Renderiza CONTENT en el DOM (con safeHref)
│   │   ├── components.js          # Builders de tarjetas HTML
│   │   ├── animations.js
│   │   ├── carousel.js
│   │   ├── faq.js
│   │   ├── navbar.js
│   │   └── theme.js
│   └── images/                    # Imágenes estáticas + uploads del admin
│
├── admin/                         # Panel de administración (protegido por JWT)
│   ├── index.html
│   ├── login.html
│   ├── css/
│   │   └── admin.css
│   └── js/
│       ├── api.js                 # Cliente HTTP — incluye X-CSRF-Token en mutaciones
│       ├── admin.js               # Controlador principal del panel
│       ├── fieldBuilders.js       # Helpers de formularios con escaping
│       ├── sectionEditors.js      # Editor visual por sección CMS
│       └── login.js
│
├── server/                        # Backend Node.js (deploy en Render)
│   ├── index.js                   # Express app + middleware stack
│   ├── config.js                  # Configuración centralizada + validación al arrancar
│   ├── setup.js                   # Script one-time: genera auth.json con bcrypt hash
│   │
│   ├── middleware/
│   │   ├── auth.js                # JWT verify + algoritmo forzado + blocklist check
│   │   └── security.js            # Headers, rate limiter (IP-spoof resistant),
│   │                              # sanitizeContentHtml, sanitizeHref, requireCsrf
│   │
│   ├── routes/
│   │   ├── authRoutes.js          # /login (emite JWT + CSRF) · /logout (revoca JWT)
│   │   ├── contentRoutes.js       # GET / · PUT /:section (con sanitización completa)
│   │   ├── commentsRoutes.js      # CRUD comentarios
│   │   └── uploadRoutes.js        # Subida de imágenes con magic bytes validation
│   │
│   ├── services/
│   │   └── contentService.js      # Lectura / escritura de content.json
│   │
│   ├── utils/
│   │   ├── fileWriter.js          # Atomic JSON writes: write-queue + tmp→rename
│   │   ├── logger.js              # Logger estructurado con redacción de datos sensibles
│   │   ├── tokenBlocklist.js      # Revocación de JWT por jti (logout inmediato)
│   │   └── contentSanitizer.js   # Sanitización recursiva de campos por tipo
│   │
│   └── data/                      # Datos en disco
│       ├── content.json           # ✅ En Git — contenido inicial del sitio
│       ├── auth.json              # ❌ Ignorado — generado por setup (hash bcrypt)
│       └── comments.json          # ❌ Ignorado — generado en runtime
│
├── .env.example                   # Template de variables de entorno
├── .gitignore
├── netlify.toml                   # Configuración de deploy para Netlify
├── render.yaml                    # Configuración de deploy para Render
└── package.json
```

---

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/puppy-grass-boxi.git
cd puppy-grass-boxi

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno
cp .env.example .env
# Editar .env y completar los valores (ver sección siguiente)

# 4. Generar credenciales del admin
#    Crea server/data/auth.json con el hash bcrypt de tu contraseña
npm run setup

# 5. Iniciar el servidor
npm start
# Modo desarrollo con hot-reload:
npm run dev
```

El servidor corre en **http://localhost:3000**

| URL | Descripción |
|-----|-------------|
| `http://localhost:3000` | Sitio público |
| `http://localhost:3000/admin/login` | Login del panel admin |
| `http://localhost:3000/admin` | Panel admin (requiere auth) |

---

## Variables de entorno

Copia `.env.example` como `.env` y rellena cada valor:

```dotenv
# Puerto del servidor (Render lo sobreescribe automáticamente)
PORT=3000

# Entorno: development | production
NODE_ENV=development

# JWT Secret — OBLIGATORIO en producción, mínimo 32 caracteres
# Generar uno seguro con:
#   npm run generate-secret
JWT_SECRET=cambia_esto_por_un_secreto_largo_y_aleatorio_minimo_32_chars

# Contraseña del admin — solo se usa durante npm run setup
# Puedes eliminarla después de ejecutar el setup
ADMIN_PASSWORD=tu_contrasena_segura_aqui

# Orígenes CORS permitidos (separados por comas)
# Desarrollo: dejar vacío (localhost se agrega automáticamente)
# Producción: URL completa de Netlify
ALLOWED_ORIGINS=https://tu-sitio.netlify.app
```

> **⚠️ Nunca hagas commit de `.env`** — está en `.gitignore` por defecto.

---

## Deploy en producción

### Backend → Render

#### Opción A — Auto-deploy con `render.yaml` (recomendado)

1. Conecta el repositorio en [dashboard.render.com](https://dashboard.render.com) → **New → Web Service**
2. Render detecta `render.yaml` automáticamente
3. En **Environment Variables** del dashboard, agrega manualmente:

| Variable | Cómo obtenerla |
|----------|---------------|
| `JWT_SECRET` | Ejecuta `npm run generate-secret` localmente |
| `ADMIN_PASSWORD` | Elige una contraseña segura (≥12 chars). Puedes eliminarla después del primer deploy |
| `ALLOWED_ORIGINS` | `https://tu-sitio.netlify.app` |
| `NODE_ENV` | `production` |

El `buildCommand` en `render.yaml` ejecuta `npm run setup` automáticamente en cada deploy.

#### Opción B — Configuración manual

```
Build Command:    npm install --omit=dev && node server/setup.js
Start Command:    npm start
Health Check:     /api/content
```

---

### Frontend → Netlify

Antes de deployar el frontend, actualiza la URL del backend en **dos lugares**:

**1. `public/js/main.js`** — apuntar fetch al backend de Render:
```javascript
const res = await fetch('https://TU-APP.onrender.com/api/content');
```

**2. `netlify.toml`** — agregar el dominio de Render al CSP:
```toml
Content-Security-Policy = "... connect-src 'self' https://TU-APP.onrender.com; ..."
```

Luego:

```bash
# Con Netlify CLI
npm install -g netlify-cli
netlify deploy --dir=public --prod
```

O conecta el repositorio en [app.netlify.com](https://app.netlify.com) con **Publish directory:** `public`.

---

## Panel de administración

Accede en `/admin/login` con la contraseña configurada durante `npm run setup`.

### Secciones editables

| Sección | Contenido |
|---------|-----------|
| `SITE` | Nombre del negocio, tagline, número de WhatsApp, meta SEO |
| `NAV` | Links de navegación, textos de CTA |
| `HERO` | Título, subtítulo, imagen principal, badges de confianza |
| `WHAT_IS` | Sección "¿Qué es?" con imagen |
| `BENEFITS` | Tarjetas de beneficios (icono + título + descripción) |
| `SIZES` | Productos con precio, dimensiones, peso, repuesto disponible |
| `HOW_IT_WORKS` | Pasos del proceso de compra |
| `DURABILITY` | Sección de durabilidad con timeline |
| `TESTIMONIALS` | Testimonios de clientes con avatar y estrellas |
| `FAQ` | Preguntas frecuentes (acordeón) |
| `CTA` | Sección de llamado a la acción final |
| `FOOTER` | Texto de copyright y links |
| `COMMENTS` | Bandeja de comentarios recibidos + textos del formulario público |

### Gestión de imágenes

El panel incluye un image picker con:
- Subida directa desde el equipo (JPG, PNG, WEBP, GIF — máx 5 MB)
- Galería de imágenes ya subidas para reutilizarlas
- Validación de tipo real por magic bytes (no solo extensión)

---

## API Reference

Todos los endpoints de mutación requieren el header `X-CSRF-Token` con el valor
de la cookie `pgb_csrf` emitida al hacer login.

### Autenticación

```
POST /api/auth/login
  Body:     { "password": "..." }
  Response: { ok, username, csrfToken }
  Cookies:  pgb_admin_token (httpOnly) + pgb_csrf (readable by JS)

POST /api/auth/logout
  Headers:  X-CSRF-Token
  Auth:     JWT cookie requerida
  Effect:   Revoca el JWT en blocklist + limpia ambas cookies

GET  /api/auth/me
  Auth:     JWT cookie requerida
  Response: { username, role }
```

### Contenido

```
GET  /api/content
  Auth:     No requerida (público)
  Response: Objeto content.json completo

PUT  /api/content/:section
  Auth:     JWT cookie requerida
  Headers:  X-CSRF-Token
  Params:   section = SITE | NAV | HERO | WHAT_IS | BENEFITS | SIZES |
                      HOW_IT_WORKS | DURABILITY | TESTIMONIALS | FAQ |
                      CTA | FOOTER | COMMENTS
  Body:     Objeto con los campos de la sección a actualizar
  Effect:   Sanitiza todos los campos antes de escribir a disco
```

### Comentarios

```
POST   /api/comments
  Auth:     No requerida (público, rate limited: 10/15 min)
  Body:     { "comment": "...", "name": "..." }

GET    /api/comments
  Auth:     JWT requerida

PATCH  /api/comments/:id/read
  Auth:     JWT + X-CSRF-Token

DELETE /api/comments/:id
  Auth:     JWT + X-CSRF-Token
```

### Imágenes

```
POST /api/upload
  Auth:     JWT + X-CSRF-Token
  Body:     { "filename": "...", "mimeType": "image/jpeg", "data": "<base64>" }
  Response: { url, name }

GET  /api/upload/list
  Auth:     JWT requerida
  Response: { images: [{ name, url }] }
```

---

## Seguridad

Este proyecto fue sometido a un análisis de red team completo. A continuación se documenta cada vulnerabilidad identificada y el control implementado para mitigarla.

### Controles activos

| Control | Implementación | Archivo |
|---------|---------------|---------|
| **Rate limiting resistente a IP spoofing** | `extractRealIp()` usa el IP más a la derecha del `X-Forwarded-For` — el que agrega el proxy de Render, no controlable por el cliente | `middleware/security.js` |
| **CSRF double-submit** | `pgb_csrf` cookie (no-httpOnly) + `X-CSRF-Token` header en todas las mutaciones. Comparación constant-time con `crypto.timingSafeEqual()` | `middleware/security.js`, `routes/authRoutes.js` |
| **JWT revocación inmediata** | `tokenBlocklist` por `jti` — logout invalida el token al instante aunque su firma siga siendo válida | `utils/tokenBlocklist.js`, `middleware/auth.js` |
| **Algoritmo JWT forzado** | `jwt.verify()` usa `{ algorithms: ['HS256'] }` — bloquea el ataque `alg: none` | `middleware/auth.js` |
| **Sanitización de HTML en contenido** | `sanitizeContentHtml()` — allowlist de tags `<em> <strong> <b> <i> <br> <span>`. Todos los atributos (event handlers, src, href) son eliminados antes de guardar | `middleware/security.js`, `utils/contentSanitizer.js` |
| **Bloqueo de `javascript:` en hrefs** | `sanitizeHref()` server-side + `safeHref()` client-side como defensa en profundidad | `middleware/security.js`, `public/js/renderer.js` |
| **Sanitización recursiva de contenido** | `sanitizeSectionData()` recorre el objeto de actualización completo aplicando el sanitizador correcto por nombre de campo (href, html, texto plano) | `utils/contentSanitizer.js`, `routes/contentRoutes.js` |
| **Admin JS protegido** | `/admin/js/*.js` y `/admin/css/` servidos detrás de `requireAuthApi` — solo accesibles con sesión válida | `server/index.js` |
| **bcrypt DoS prevention** | Cap de 128 caracteres en contraseña antes de `bcrypt.compare()` | `routes/authRoutes.js` |
| **Path traversal (uploads)** | `path.basename()` + sanitización regex + `path.resolve().startsWith(IMAGES_DIR)` | `routes/uploadRoutes.js` |
| **Magic bytes validation** | Los uploads verifican los bytes reales del archivo (no solo el MIME declarado por el cliente) | `routes/uploadRoutes.js` |
| **Prototype pollution** | `hasDangerousKeys()` rechaza `__proto__`, `constructor`, `prototype` | `routes/contentRoutes.js` |
| **Atomic file writes** | Write-queue por archivo + write-to-tmp → rename — sin corrupción por concurrencia | `utils/fileWriter.js` |
| **Section allowlist** | `allowedSections` en config + doble verificación en route y service | `config.js`, `routes/contentRoutes.js`, `services/contentService.js` |
| **CORS estricto** | Allowlist via `ALLOWED_ORIGINS` — bloquea orígenes no autorizados. `X-CSRF-Token` incluido en `allowedHeaders` | `server/index.js` |
| **Security headers** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` (prod), CSP diferenciada admin/público | `middleware/security.js` |
| **Fingerprinting** | `X-Powered-By` eliminado. Mensajes de error genéricos en producción | `middleware/security.js`, `server/index.js` |
| **XSS en comentarios** | `sanitizeText()` server-side + `escHtml()` en el panel admin — doble capa | `middleware/security.js`, `admin/js/admin.js` |
| **Comment ID regex** | IDs de 16 chars hexadecimales — bloquea path injection en parámetros URL | `routes/commentsRoutes.js` |
| **MAX_COMMENTS** | Tope de 500 comentarios — previene llenado del disco | `routes/commentsRoutes.js` |
| **Body size limits** | Auth: 10 kb · Comments: 10 kb · Content: 100 kb · Upload: 6 mb | `server/index.js` |
| **dotfiles** | `express.static({ dotfiles: 'deny' })` — `.env` y archivos ocultos no servidos | `server/index.js` |
| **server/data/ no expuesto** | El directorio de datos está fuera del static path | `server/index.js` |
| **Structured logging** | Nivel `security` para eventos de auth, redacción automática de passwords/tokens/hashes en logs | `utils/logger.js` |

### Cadena de ataque mitigada

El escenario de mayor riesgo — un atacante que compromete la cuenta admin y planta XSS para todos los visitantes — está bloqueado en tres capas independientes:

```
Atacante envía PUT /api/content/HERO con payload XSS
        │
        ▼
[Capa 1] requireCsrf()          → rechaza si no hay X-CSRF-Token válido
        │ (si bypasea CSRF)
        ▼
[Capa 2] sanitizeSectionData()  → sanitizeContentHtml() elimina <script>,
        │                          event handlers, javascript: en hrefs
        │ (si llegara al disco)
        ▼
[Capa 3] safeHref() en client   → bloquea javascript: antes de asignar a .href
```

---

## Persistencia de datos en Render

Los archivos en `server/data/` tienen políticas distintas:

| Archivo | Git | Razón |
|---------|-----|-------|
| `content.json` | ✅ Tracked | Contenido inicial del sitio — parte del repositorio |
| `auth.json` | ❌ Ignorado | Contiene hash bcrypt de la contraseña — se genera con `npm run setup` |
| `comments.json` | ❌ Ignorado | Datos de usuarios — se genera en runtime |

> **⚠️ Plan Free de Render:** El disco es efímero — `server/data/` se borra en cada redeploy o reinicio del proceso. `content.json` se restaura desde Git en cada build. Para preservar comentarios entre deploys, considera:
>
> - **Render Starter ($7/mes):** Agrega un Disk mount en `/app/server/data`
> - **Base de datos gratuita:** MongoDB Atlas, Supabase o PlanetScale como alternativa al filesystem

---

<div align="center">
<sub>Hecho con 🌿 para Puppy Grass Boxi · Costa Rica</sub>
</div>
