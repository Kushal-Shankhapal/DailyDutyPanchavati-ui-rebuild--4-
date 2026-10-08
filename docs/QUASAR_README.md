# QuasarCyberTech Website

> **Production-grade full-stack cybersecurity enterprise website** with a React/Vite SSG frontend, Fastify API backend, PostgreSQL database, ECIES-encrypted form submissions, and a custom Blog CMS with multi-factor authentication.

---

## 1. Project Overview

QuasarCyberTech is a professional cybersecurity services firm. This repository contains the complete source code for their public-facing website and internal content management system.

**What this project is:**
- A marketing and capability showcase website for a cybersecurity consultancy
- A full-stack application with a static-site-generated (SSG) frontend served from a VPS
- A backend REST API serving blog content, encrypted contact/newsletter submissions, and a secured admin portal

**Key capabilities delivered by this codebase:**
- **Capabilities & Industries**: Data-driven pages for 6 cybersecurity capability pillars and 6 industry verticals, each with sub-capability deep-dives, FAQs, platform integrations, and related content
- **Platforms Showcase**: Dedicated pages for QStellar, QPulse, QLeap, and QRGT platforms
- **Blog CMS**: A fully custom-built admin portal at `/blogs/admin` with math captcha → password (scrypt) → TOTP 2FA → JWT cookie auth, Markdown editor with live preview, Cloudinary image upload, and view tracking
- **Encrypted Contact System**: Contact form submissions are encrypted client-side using X25519 ECDH + XChaCha20-Poly1305 before transmission. PII is stored encrypted at rest in PostgreSQL
- **Encrypted Newsletter System**: Same encryption stack with HMAC-based deduplication
- **SEO-first build**: Automatic sitemap.xml and robots.txt generation at build time; admin portal excluded from all indexing

---

## 2. Live URLs

| Resource | URL |
|---|---|
| Production Website | https://quasarcybertech.com |
| Blog Listing | https://quasarcybertech.com/blogs |
| Admin Portal | https://quasarcybertech.com/blogs/admin |
| API Health | https://quasarcybertech.com/api/blogs |

> ⚠️ The admin portal requires valid credentials. No credentials are stored in this repository.

---

## 3. Architecture Overview

### Component Map

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                     │
│                                                             │
│  React 19 + Vite SSG (vite-react-ssg)                      │
│  ├── Static HTML pages pre-rendered at build time           │
│  ├── Client-side navigation via React Router v6            │
│  ├── formCrypto.ts: X25519 + XChaCha20 envelope encryption │
│  └── /blogs/admin: SPA-only, no SSG, no sitemap entry      │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS (REST JSON API)
               │ Encrypted envelopes for POST /contact, /newsletter, /admin/*
               ▼
┌─────────────────────────────────────────────────────────────┐
│                     FASTIFY API SERVER                      │
│                     (Node.js / TypeScript)                  │
│                                                             │
│  Plugins: @fastify/helmet, @fastify/cors, @fastify/rate-limit│
│  Routes:                                                    │
│  ├── GET  /api/blogs, /api/blogs/:slug   (public)          │
│  ├── POST /api/contact                  (encrypted)        │
│  ├── POST /api/newsletter               (encrypted)        │
│  ├── GET  /api/admin/captcha            (math challenge)    │
│  ├── POST /api/admin/login              (captcha+password)  │
│  ├── POST /api/admin/verify-totp        (TOTP + preauth)   │
│  └── CRUD /api/admin/blogs/*            (JWT-gated)        │
│                                                             │
│  Crypto:                                                    │
│  ├── xchacha.ts: X25519 ECDH + XChaCha20-Poly1305 decrypt │
│  └── adminCrypto.ts: scrypt, JWT, TOTP, captcha, rate-limit│
└──────────────┬──────────────────────────────────────────────┘
               │ pg driver / PostgreSQL wire protocol
               ▼
┌─────────────────────────────────────────────────────────────┐
│                      POSTGRESQL DATABASE                    │
│                                                             │
│  Tables:                                                    │
│  ├── blog_posts       — blog content (plaintext + metadata) │
│  ├── newsletter       — encrypted PII + HMAC dedup         │
│  └── contact_submissions — encrypted PII + workflow status  │
└─────────────────────────────────────────────────────────────┘

         ┌──────────────────┐      ┌────────────────────┐
         │   CLOUDINARY CDN │      │   SMTP PROVIDER    │
         │                  │      │                    │
         │ All images served│      │ nodemailer sends:  │
         │ via f_auto,q_auto│      │ • User confirmation│
         │ URL-based, no    │      │ • Admin notification│
         │ binary uploads   │      │   on contact/newsletter│
         └──────────────────┘      └────────────────────┘
```

### Key Architectural Principles

- **Separation of concerns**: Frontend handles rendering and client-side encryption. Backend handles decryption, validation, storage, and email.
- **CDN-first media**: Zero binary assets in Git. All images are Cloudinary URLs resolved through `assets.ts`.
- **Static-first with dynamic fallback**: Blog pages are dynamic (no SSG pre-render) so new posts appear immediately without a rebuild.
- **Security at the application layer**: Form payloads are encrypted before they leave the browser, independent of TLS.

---

## 4. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI component library |
| Vite | 8 | Build tool and dev server |
| vite-react-ssg | 0.9.x | Static site generation for pre-rendering |
| React Router | v6 | Client-side routing |
| TypeScript | 5.8 | Type safety across the codebase |
| Tailwind CSS | 3.4 | Utility-first styling |
| Framer Motion | 12 | Animations and transitions |
| react-hook-form + zod | latest | Form validation |
| lucide-react | 0.46 | Icon library |
| react-helmet-async | 3 | SEO meta tag management |
| Embla Carousel | 8 | Carousels |
| Recharts | 2 | Data visualisation |
| react-simple-maps | 3 | World map on About page |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Fastify | 5 | HTTP framework |
| @fastify/helmet | 13 | Security headers |
| @fastify/cors | 11 | CORS policy enforcement |
| @fastify/rate-limit | 10 | Global per-IP rate limiting |
| pg | 8 | PostgreSQL client |
| nodemailer | 8 | SMTP email sending |
| zod | 3 | Schema validation for env + routes |
| dotenv | 16 | Environment variable loading |
| tsx | 4 | TypeScript execution for scripts |

### Security / Cryptography
| Technology | Purpose |
|---|---|
| @noble/curves (x25519) | Ephemeral ECDH key agreement |
| @noble/ciphers (xchacha20poly1305) | AEAD authenticated encryption |
| @noble/hashes (hkdf, sha3, hmac) | Key derivation, HMAC deduplication, IP hashing |
| Node.js `crypto` (scrypt, HMAC) | Password hashing, JWT signing, TOTP |

### Infrastructure
| Component | Purpose |
|---|---|
| Cloudinary | Image hosting and on-the-fly optimisation |
| PostgreSQL 17 | Primary relational database |
| SMTP (configurable) | Transactional email delivery |
| GitHub Actions | CI/CD trigger on push to `main` |
| Self-hosted VPS | Nginx reverse proxy + Node.js API process |

---

## 5. Repository Structure

```
QuasarCyberTech_Website/
│
├── App.tsx                        # Route definitions (vite-react-ssg RouteRecord[])
├── index.tsx                      # Application entry point
├── index.html                     # HTML shell
├── vite.config.ts                 # Vite config: SSG, code splitting, sitemap/robots generation
├── tailwind.config.cjs            # Tailwind theme extensions
├── styles.css                     # Global CSS, CSS custom properties, font imports
│
├── src/
│   ├── api/
│   │   └── blogs.ts               # Public blog fetch functions + DB→BlogPost normaliser
│   │
│   ├── config/
│   │   ├── cloudinary.ts          # Cloudinary base URL + cld() URL builder
│   │   ├── themeConfig.ts         # ALL design tokens: colors, typography, gradients, layout
│   │   └── navigationConfig.ts    # Mega menu data structure for Navbar
│   │
│   ├── constants/
│   │   └── assets.ts              # Central asset registry — every image URL in one place
│   │
│   ├── data/
│   │   ├── capabilitiesData.ts    # 6 capability pillars with sub-capabilities, FAQs, approaches
│   │   ├── industriesData.ts      # 6 industry verticals with challenges, solutions, slugs
│   │   ├── subCapabilityFaqs.ts   # FAQ content for each sub-capability
│   │   └── subCapabilityPoints.ts # Bullet-point highlights for sub-capabilities
│   │
│   ├── lib/
│   │   ├── formCrypto.ts          # Browser-side ECIES encryption (X25519 + XChaCha20-Poly1305)
│   │   └── adminCrypto.ts         # Re-export shim for admin form crypto
│   │
│   ├── pages/
│   │   ├── Home.tsx               # Homepage — hero, capabilities grid, platforms, blog highlights
│   │   ├── About.tsx              # About Us — vision, mission, leadership, global presence map
│   │   ├── Contact.tsx            # Contact form with client-side encryption
│   │   ├── Careers.tsx            # Careers page with job listings
│   │   ├── Platforms.tsx          # QStellar, QPulse, QLeap, QRGT showcase
│   │   ├── CapabilitiesOverview.tsx  # Capability pillar listing page
│   │   ├── IndustriesOverview.tsx    # Industry listing page
│   │   ├── IndustryIndividual.tsx    # Individual industry page (slug-driven)
│   │   ├── PrivacyPolicy.tsx         # Privacy policy
│   │   ├── TermsConditions.tsx       # Terms and conditions
│   │   ├── NotFound.tsx              # 404 page
│   │   ├── Forbidden.tsx             # 403 page
│   │   │
│   │   ├── capabilities/
│   │   │   └── [slug].tsx         # Dynamic capability detail page with tab bar, FAQ, platform card
│   │   │
│   │   ├── blogs/
│   │   │   ├── BlogsOverview.tsx  # Blog listing with search, category filter, newsletter widget
│   │   │   └── BlogIndividual.tsx # Single blog post render (Markdown + metadata)
│   │   │
│   │   └── admin/
│   │       └── BlogAdmin.tsx      # Full CMS admin portal (auth + CRUD + Markdown editor)
│   │
│   ├── components/
│   │   ├── Navbar.tsx             # Mega-menu navbar with auto-hide + reveal zone
│   │   ├── Footer.tsx             # Footer with links, social icons, newsletter widget
│   │   ├── Hero.tsx               # Reusable hero section with parallax image
│   │   ├── PageHero.tsx           # Page-level hero with configurable image blending
│   │   ├── CTASection.tsx         # Reusable dark/light CTA banner (used on every page)
│   │   ├── QCTSecureFramework.tsx # SECURE framework accordion cards section
│   │   ├── PlatformHighlights.tsx # Platform cards on homepage
│   │   ├── FeaturedInsights.tsx   # Blog preview cards on homepage
│   │   ├── TrustIndicators.tsx    # Metrics / trust stats section
│   │   ├── Partners.tsx           # Partner logo strip
│   │   ├── AccreditationBar.tsx   # Certifications bar
│   │   ├── Testimonials.tsx       # Client testimonial carousel
│   │   ├── MilestonesJourney.tsx  # Company timeline
│   │   ├── ServiceAreaPanel.tsx   # Service area grid
│   │   ├── LeadershipVision.tsx   # Leadership team section
│   │   │
│   │   ├── capabilities/
│   │   │   └── cards/
│   │   │       └── CapabilityCardSimple.tsx  # Reusable capability card (used in grids)
│   │   │
│   │   ├── blogs/
│   │   │   └── SidebarWidget.tsx  # Newsletter subscribe widget in blog sidebar
│   │   │
│   │   └── seo/                   # SEO meta components using react-helmet-async
│   │
│   ├── layouts/
│   │   └── RootLayout.tsx         # Root layout wrapping all pages (Navbar + ScrollToTop + Footer)
│   │
│   └── seo/                       # Page-level SEO data files
│
├── server/
│   ├── package.json               # Backend dependencies (Fastify, pg, nodemailer, noble crypto)
│   │
│   └── src/
│       ├── index.ts               # Fastify server bootstrap: plugins, routes, DB check, listen
│       ├── config.ts              # Zod-validated environment schema — fails loudly on bad config
│       │
│       ├── routes/
│       │   ├── blogs.ts           # GET /api/blogs, GET /api/blogs/:slug (public)
│       │   ├── contact.ts         # POST /api/contact (decrypt → validate → store → email)
│       │   ├── newsletter.ts      # POST /api/newsletter (decrypt → dedup → store → email)
│       │   └── admin/
│       │       ├── auth.ts        # Captcha, login, TOTP verify, logout endpoints
│       │       └── blogs.ts       # Admin CRUD: list, get, create, update, delete, publish
│       │
│       ├── crypto/
│       │   ├── xchacha.ts         # decryptPayload(), encryptField(), emailHmac(), hashIp()
│       │   ├── adminCrypto.ts     # JWT, scrypt password, TOTP, preauth tokens, captcha, rate limiter
│       │   ├── keygen.ts          # CLI: generate SERVER_ECDH_PRIVATE_KEY keypair
│       │   └── adminKeygen.ts     # CLI: generate ADMIN_PASSWORD_HASH + ADMIN_TOTP_SECRET
│       │
│       ├── db/
│       │   ├── pool.ts            # pg Pool singleton + checkDbConnection()
│       │   ├── queries.ts         # Contact and newsletter DB queries
│       │   └── blogQueries.ts     # Blog CRUD and view increment queries
│       │
│       ├── mail/
│       │   └── mailer.ts          # nodemailer transport + sendContactMail() + sendNewsletterMail()
│       │
│       ├── middleware/
│       │   └── adminAuth.ts       # Fastify preHandler: JWT cookie validation + IP whitelist
│       │
│       └── scripts/
│           ├── seed-blogs.ts      # Seed blog_posts table from static data
│           ├── export-data.ts     # Export blog_posts to hosted-blogs-export.json
│           └── diagnostic.ts     # DB connectivity and table diagnostics
│
├── server/sql/
│   ├── 001_init.sql               # Schema: newsletter, contact_submissions tables
│   └── 002_blog_posts.sql         # Schema: blog_posts table
│
├── .github/
│   └── workflows/
│       └── deploy.yml             # CI: push to main → SSH → run deploy.sh on VPS
│
├── deploy.sh                      # VPS-side deploy script (pull, install, build, restart)
├── uploadAssets.cjs               # Cloudinary batch upload utility
├── cloudinary-map.json            # Local path → Cloudinary public_id mapping
└── start-dev-env.bat              # Windows: one-click open of 3 PowerShell terminals
```

---

## 6. Key Design Decisions

### 6.1 Centralised Asset Registry (`src/constants/assets.ts`)

**Problem**: With 100+ images across 15+ pages, hardcoding Cloudinary URLs creates maintenance nightmares.

**Solution**: Every image URL in the entire codebase is defined once in `ASSETS` in `assets.ts`. Components import from this object rather than writing URLs inline.

```ts
// How assets are referenced everywhere
import { ASSETS } from '@/constants/assets';
<img src={ASSETS.capabilities.subCapabilities.offensive.web} />
```

The `getAsset()` helper converts a logical path to a full Cloudinary URL via the `cld()` function in `src/config/cloudinary.ts`, which automatically appends `f_auto,q_auto` for format and quality optimisation.

**Benefit**: Changing the Cloudinary cloud name or any asset path requires editing one file. Adding new assets follows a clear pattern.

### 6.2 Cloudinary Integration

- **Upload**: The `uploadAssets.cjs` script reads from `cloudinary-map.json` and uploads local files to Cloudinary in batch. This is run manually when new assets are added.
- **Delivery**: All images use `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/<path>` — Cloudinary automatically serves WebP/AVIF based on browser support.
- **No binary assets in Git**: The repository contains zero image files. This keeps the repository under ~10MB.

### 6.3 Data-Driven Architecture

All content is defined in TypeScript data files, not hardcoded in components:

| File | What it drives |
|---|---|
| `capabilitiesData.ts` | The 6 capability pillars, their sub-capabilities, positioning text, `whatWeAssess` lists, industry applications, delivery approach steps, platform association, related capability links |
| `industriesData.ts` | The 6 industry verticals, their slugs, hero content, challenges, and solutions |
| `subCapabilityFaqs.ts` | FAQ question/answer pairs keyed by sub-capability slug |
| `subCapabilityPoints.ts` | Bullet point highlights keyed by sub-capability slug |

**Adding a new capability sub-page** requires only adding an entry to `capabilitiesData.ts`. The `[slug].tsx` page component reads all data, selects the matching sub-capability, and renders it automatically.

### 6.4 Slug Reuse Strategy

- Capability slugs (e.g., `offensive-security`) are used as URL paths AND as keys in `themeConfig.ts` for per-capability hero image movement controls.
- Sub-capability slugs (e.g., `web-application-security-testing`) are used as URL hash anchors AND as keys into the FAQ, image, and points lookup maps.
- Industry slugs are auto-generated from the industry name and used for both routing and content lookup.
- This means **slug = single source of truth** across routing, data, visuals, and SEO.

### 6.5 SSG with Dynamic Blog Fallback

Most pages are pre-rendered at build time (SSG) for performance. However, blog individual pages have `getStaticPaths: () => []` — meaning they are **not pre-rendered**. This is intentional: new blog posts become live immediately without requiring a site rebuild. The blog list page (`/blogs`) fetches from the API on load.

### 6.6 Security-First Design Choices

- **No plaintext PII in transit**: Contact and newsletter payloads are ECIES-encrypted in the browser using ephemeral X25519 keypairs before the HTTP request is sent. The server receives ciphertext, not plaintext.
- **No plaintext PII at rest**: All PII fields in PostgreSQL (`email_enc`, `name_enc`, `phone_enc`, `message_enc`) are XChaCha20-Poly1305 ciphertext blobs.
- **Email deduplication without storing emails**: Newsletter deduplication uses `HMAC-SHA3-256(email, secret_key)`. The HMAC is stored, not the email. Uniqueness is enforced via a `UNIQUE` constraint on `email_hmac`.
- **IP privacy**: Rate-limiting uses `SHA3-256(ip_address)` — never the raw IP.
- **Admin route hidden from search engines**: `/blogs/admin` is excluded from `sitemap.xml` and has `Disallow: /blogs/admin` in `robots.txt`.
- **Separated VITE\_ vs server-only secrets**: Only `VITE_*` prefixed variables are bundled into the frontend. All crypto keys, SMTP credentials, and admin secrets are server-only.

---

## 7. Core Features & Functional Modules

### 7a. Blog CMS / Admin Portal (`src/pages/admin/BlogAdmin.tsx`)

#### Login Flow (Multi-Step)

```
Step 1 → GET /api/admin/captcha
         Server returns: { id, question: "3 × 7" }

Step 2 → POST /api/admin/login
         Client sends ECIES-encrypted envelope containing: { captchaId, captchaAnswer, password }
         Server decrypts, verifies captcha (single-use, 10-min TTL),
         then verifies password against scrypt hash (N=65536, r=8, p=1)
         If TOTP enabled → returns { preauthToken }

Step 3 → POST /api/admin/verify-totp
         Client sends ECIES-encrypted envelope containing: { preauthToken, code, ts, sig }
         sig = HMAC-SHA256(preauthToken_bytes, `${code}:${ts}`)
         Server verifies HMAC sig, consumes preauth token (single-use, IP-bound, 5-min TTL),
         validates 6-digit TOTP with ±1 window (±30s clock skew tolerance)
         On success → sets HttpOnly, SameSite=Strict, Secure admin_token cookie (7-day JWT)
```

**Security properties**: Each login attempt uses a fresh encrypted envelope. Even if a network log captures the POST body, no credentials are visible. The HMAC signature on the TOTP step binds the code to the specific preauth session — a replayed code from another session is rejected.

#### CRUD Operations
- **List**: `GET /api/admin/blogs` — returns all posts (draft + published) ordered by `created_at DESC`
- **Create**: `POST /api/admin/blogs` — creates a new draft
- **Update**: `PUT /api/admin/blogs/:id` — updates any field; first publish sets `published_at` via `COALESCE`
- **Delete**: `DELETE /api/admin/blogs/:id` — hard delete
- **Publish/Unpublish**: Toggle `published` flag on update

#### Markdown Editor
- Built-in `<textarea>` with live-preview panel using `dangerouslySetInnerHTML` for rendered Markdown
- Supports full Markdown including tables, code blocks, and headings
- `react-resizable-panels` splits the editor and preview side by side on desktop

#### Cloudinary Image Upload
- The admin can paste or upload a cover image URL
- Images are referenced as Cloudinary URLs in the `image_url` column; no binary storage in PostgreSQL

#### JSON Backup System
- The `npm run export` server script (`server/src/scripts/export-data.ts`) exports all blog posts to `hosted-blogs-export.json` as a local backup
- The `npm run seed:blogs` script can re-import from static `blogsData` if the DB needs to be reset

---

### 7b. Public Blog System

**Listing Page** (`src/pages/blogs/BlogsOverview.tsx`):
- Fetches from `GET /api/blogs` on mount via `src/api/blogs.ts`
- Client-side search by title/excerpt/tags
- Category filter tabs using `BLOG_CATEGORIES` constant
- Newsletter subscribe widget embedded in sidebar
- Cache-busted fetch URL (`?cb=${Date.now()}`) to prevent stale CDN responses

**Individual Blog Page** (`src/pages/blogs/BlogIndividual.tsx`):
- Fetches a single post by slug from `GET /api/blogs/:slug`
- Renders Markdown `content` field as HTML
- Displays tags, author, read time, category, and publication date
- Increments view count via the backend on each load
- Returns 404 if slug is not found or post is not published

**API Fallback Behaviour** (`src/api/blogs.ts`):
- If the API returns a non-200 response, `fetchBlogs()` returns an empty array (no stale static data injected)
- Smart origin detection: if the site is running on a non-localhost domain but `VITE_API_URL` points to `localhost`, the client automatically switches to relative paths (so the VPS-hosted site always hits its own API)

---

### 7c. Contact Us System (`src/pages/Contact.tsx`)

**Encryption flow:**
1. User fills out the form (name, company, designation, email, phone, service interest, message)
2. On submit, `encryptFormPayload(formData)` is called in the browser:
   - Generates a fresh ephemeral X25519 keypair
   - Derives shared secret with server's public key (`VITE_SERVER_ECDH_PUBLIC_KEY`)
   - Stretches to 32-byte cipher key via `HKDF-SHA3-256`
   - Encrypts the JSON payload with `XChaCha20-Poly1305` + random 24-byte nonce
   - Returns `{ ephemeralPublicKey, nonce, ciphertext }` (all hex-encoded)
3. The encrypted envelope is POSTed to `/api/contact`
4. Server decrypts, validates with Zod, checks per-IP rate limit, stores encrypted PII in DB
5. Triggers async email: user confirmation + admin notification

**Anti-abuse mechanisms:**
- Global Fastify rate limit: 60 requests/minute per IP
- Per-IP/day DB-level limit: `MAX_CONTACT_PER_IP_PER_DAY` (default: 5)
- IP is stored only as `SHA3-256(ip)` — never in plaintext

---

### 7d. Newsletter System (`server/src/routes/newsletter.ts`)

- Same ECIES encryption flow as contact
- **Deduplication**: `email_hmac = HMAC-SHA3-256(normalised_email, EMAIL_HMAC_KEY)`. The DB has a `UNIQUE` constraint on `email_hmac` — duplicate subscriptions are silently ignored via `ON CONFLICT DO NOTHING`
- **Rate limiting**: `MAX_NEWSLETTER_PER_IP_PER_DAY` (default: 3) enforced at DB level
- Subscribe widgets appear in: blog sidebar (`SidebarWidget.tsx`), blog overview page footer, and site footer
- On subscribe: user receives a welcome email, admin receives a notification

---

### 7e. Careers Page (`src/pages/Careers.tsx`)

- Lists open roles with descriptions, requirements, and responsibilities
- Role data is defined inline in the component
- Apply button links to an external Google Form (URL configured in the component)
- `/careers/apply` is listed in `robots.txt` as `Disallow` and excluded from the sitemap

---

## 8. Local Development Setup

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 20.x LTS |
| PostgreSQL | 17 |
| npm | 10.x |

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd QuasarCyberTech_Website
```

### Step 2 — Install Dependencies

**Windows (PowerShell):**
```powershell
npm install
npm --prefix .\server install
```

**Mac/Linux:**
```bash
npm install
npm --prefix ./server install
```

### Step 3 — Create the Database

**Windows:**
```powershell
# Start PostgreSQL service if not running
Get-Service postgresql-X64-17 | Start-Service

# Create database and run migrations
$env:PGPASSWORD="<your-pg-password>"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U postgres -c "CREATE DATABASE qctweb;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U postgres -d qctweb -f .\server\sql\001_init.sql
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U postgres -d qctweb -f .\server\sql\002_blog_posts.sql
```

**Mac/Linux:**
```bash
psql -U postgres -c "CREATE DATABASE qctweb;"
psql -U postgres -d qctweb -f ./server/sql/001_init.sql
psql -U postgres -d qctweb -f ./server/sql/002_blog_posts.sql
```

### Step 4 — Generate Crypto Keys and Admin Credentials

```bash
cd server

# Generate the X25519 ECDH keypair (for form encryption)
npm run keygen
# Output: SERVER_ECDH_PRIVATE_KEY=<hex> and the matching public key for VITE_SERVER_ECDH_PUBLIC_KEY

# Generate admin password hash + TOTP secret
npm run admin:keygen
# Output: ADMIN_PASSWORD_HASH=<scrypt-hash> and ADMIN_TOTP_SECRET=<base32>
```

Save the outputs — you will need them in the next step.

### Step 5 — Configure Environment Variables

Create **`server/.env`** (server-only, never commit this file):

```env
NODE_ENV=development
PORT=3002
FRONTEND_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://<user>:<password>@localhost:5432/qctweb

SERVER_ECDH_PRIVATE_KEY=<64-hex-chars-from-keygen>
DB_ENCRYPTION_KEY=<64-hex-chars-generate-separately>
EMAIL_HMAC_KEY=<64-hex-chars-generate-separately>

SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
NOTIFY_EMAIL=<admin-notification-email>

ADMIN_PASSWORD_HASH=<output-from-admin-keygen>
ADMIN_JWT_SECRET=<64-hex-chars-generate-separately>
ADMIN_TOTP_SECRET=<base32-output-from-admin-keygen>
ADMIN_ALLOWED_IPS=

MAX_CONTACT_PER_IP_PER_DAY=5
MAX_NEWSLETTER_PER_IP_PER_DAY=3
```

Create **`.env.local`** (frontend — VITE\_ vars are bundled into the client):

```env
VITE_API_URL=http://localhost:3002
VITE_SERVER_ECDH_PUBLIC_KEY=<64-hex-chars-public-key-from-keygen>
VITE_CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
```

> 🔒 **NEVER** put `SERVER_ECDH_PRIVATE_KEY`, `ADMIN_PASSWORD_HASH`, `ADMIN_JWT_SECRET`, or any SMTP credentials in `.env.local`. Vite bundles `VITE_*` variables into the browser-readable JavaScript.

### Step 6 — Seed the Database (Optional)

```bash
cd server
npm run seed:blogs
```

This populates the `blog_posts` table with the static blog data from `blogsData.ts`.

### Step 7 — Start All Services

Open **3 separate terminals**:

**Terminal 1 — Backend API:**
```bash
npm --prefix ./server run dev
# Expected: [db] Connection verified
# Expected: [server] Listening on port 3002 (development)
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# Expected: Local: http://localhost:5173/
```

### Step 8 — Verify Setup

```powershell
# Test API health
Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing
# Expected: StatusCode 200, {"status":"ok"}

# Test blog API
Invoke-WebRequest -Uri "http://localhost:3002/api/blogs" -UseBasicParsing

# Test admin captcha (requires backend running)
Invoke-WebRequest -Uri "http://localhost:3002/api/admin/captcha" -UseBasicParsing
```

Then open `http://localhost:5173/blogs/admin` in your browser.

### Common Issues

| Problem | Likely Cause | Fix |
|---|---|---|
| Backend fails to start | Missing or invalid env var | Check the Zod validation error in the console |
| Captcha doesn't load | Backend not running | Start `npm --prefix ./server run dev` |
| Blogs show empty list | `VITE_API_URL` wrong | Set to `http://localhost:3002` in `.env.local` |
| Login fails at TOTP step | Clock skew > 30s | Sync system clock; TOTP accepts ±1 window |
| DB connection refused | PostgreSQL not running | Start the PostgreSQL service |
| `VITE_SERVER_ECDH_PUBLIC_KEY` missing | Keygen not run | Run `npm run keygen` in `server/` |

---

## 9. Environment Variables Reference

### Backend (`server/.env`)

| Variable | Required | Purpose | Format |
|---|---|---|---|
| `NODE_ENV` | Yes | Runtime mode | `development` \| `production` \| `test` |
| `PORT` | Yes | API listen port | Integer (e.g., `3002`) |
| `FRONTEND_ORIGIN` | Yes | Allowed CORS origin | URL (e.g., `https://quasarcybertech.com`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `SERVER_ECDH_PRIVATE_KEY` | Yes | X25519 private key for decrypting form submissions | 64 hex chars (32 bytes) |
| `DB_ENCRYPTION_KEY` | Yes | XChaCha20 key for encrypting PII at rest in PostgreSQL | 64 hex chars (32 bytes) |
| `EMAIL_HMAC_KEY` | Yes | HMAC key for deterministic email deduplication | 64 hex chars (32 bytes) |
| `SMTP_HOST` | Yes | SMTP server hostname | e.g., `smtp.example.com` |
| `SMTP_PORT` | Yes | SMTP server port | Integer (e.g., `587`) |
| `SMTP_USER` | Yes | SMTP authentication username | Email address |
| `SMTP_PASS` | Yes | SMTP authentication password | String |
| `NOTIFY_EMAIL` | Yes | Admin notification recipient | Email address |
| `ADMIN_PASSWORD_HASH` | Yes | scrypt hash of admin password | `<hex-salt>:<hex-derivedKey>` |
| `ADMIN_JWT_SECRET` | Yes | HMAC-SHA256 key for JWT signing | 64 hex chars (32 bytes) |
| `ADMIN_TOTP_SECRET` | No | Base32 TOTP secret for 2FA | Base32 string (e.g., from Google Authenticator) |
| `ADMIN_ALLOWED_IPS` | No | IP whitelist for admin routes (empty = allow all) | Comma-separated IPs |
| `MAX_CONTACT_PER_IP_PER_DAY` | No | Contact form rate limit per IP | Integer (default: 5) |
| `MAX_NEWSLETTER_PER_IP_PER_DAY` | No | Newsletter rate limit per IP | Integer (default: 3) |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud for admin uploads | String |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key | String |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret | String |

### Frontend (`.env.local`)

| Variable | Required | Purpose | Format |
|---|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL | `http://localhost:3002` or production URL |
| `VITE_SERVER_ECDH_PUBLIC_KEY` | Yes | X25519 public key — used by `formCrypto.ts` to encrypt form payloads | 64 hex chars (32 bytes) |
| `VITE_CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name for image delivery | String (e.g., `dvwtuqqrr`) |

> ⚠️ `VITE_SERVER_ECDH_PUBLIC_KEY` is safe to expose — it is only the **public** key. The corresponding private key must stay in `server/.env` only.

---

## 10. System Architecture & Security

### Authentication Flow (Admin Portal)

The admin login is a 3-step challenge-response protocol:

1. **Captcha** — Server issues a single-use arithmetic challenge (e.g., `4 × 6`). Valid for 10 minutes. Stored in server memory, not in DB. Rejected after first use (replay-proof).
2. **Password Verification** — The password is transmitted inside a fully encrypted ECIES envelope. Server decrypts, then verifies with `scrypt(N=65536, r=8, p=1)` — deliberately slow to resist brute force. If TOTP is configured, a `preauthToken` is issued (32 random bytes, IP-bound, single-use, 5-minute TTL).
3. **TOTP Verification** — The TOTP code + preauthToken + timestamp are wrapped in a second ECIES envelope. Server verifies the HMAC signature (binding the code to the specific session), consumes the preauth token, then verifies the TOTP code against RFC 6238 with ±1 window. On success, issues a 7-day HS256 JWT in an `HttpOnly; SameSite=Strict; Secure` cookie.

### Encryption Stack

```
Browser (formCrypto.ts):
  1. ephPriv, ephPub = X25519.generateKeypair()
  2. shared = X25519.DH(ephPriv, serverPubKey)
  3. key = HKDF-SHA3-256(shared, salt="qct-xchacha20", info="form-payload", len=32)
  4. nonce = random_bytes(24)
  5. ciphertext = XChaCha20-Poly1305.encrypt(key, nonce, JSON.stringify(payload))
  6. POST { ephemeralPublicKey, nonce, ciphertext }  ← all hex-encoded

Server (xchacha.ts):
  1. shared = X25519.DH(serverPrivKey, ephPub)
  2. key = HKDF-SHA3-256(shared, same salt/info)
  3. plaintext = XChaCha20-Poly1305.decrypt(key, nonce, ciphertext)
  4. JSON.parse(plaintext)  →  validated by Zod
```

**Perfect Forward Secrecy**: Each submission discards the ephemeral private key after use. Compromising the server private key cannot decrypt past submissions.

### Database Encryption (at rest)

```
encryptField(plain):
  nonce = random_bytes(24)
  key = DB_ENCRYPTION_KEY (from env)
  output = [24B nonce | XChaCha20-Poly1305(key, nonce, plain)]
  → stored as PostgreSQL BYTEA

emailHmac(email):
  → HMAC-SHA3-256(EMAIL_HMAC_KEY, normalise(email))
  → stored as BYTEA, used for UNIQUE constraint (dedup without decryption)

hashIp(ip):
  → SHA3-256(ip)
  → stored as BYTEA, used for rate-limit queries only
```

### Rate Limiting (layered)

| Layer | Mechanism | Limit |
|---|---|---|
| Fastify global | @fastify/rate-limit per IP | 60 req/min |
| Login attempts | In-memory map per IP | 5 attempts / 15 min |
| Contact DB | Per IP per day via ip_hash query | `MAX_CONTACT_PER_IP_PER_DAY` |
| Newsletter DB | Per IP per day via ip_hash query | `MAX_NEWSLETTER_PER_IP_PER_DAY` |

---

## 11. Deployment Overview

### CI/CD Flow

```
Developer pushes to main branch
        ↓
GitHub Actions (.github/workflows/deploy.yml)
  Trigger: push to main
  Runner: self-hosted (VPS)
        ↓
Executes: bash /opt/QCTWeb/deploy.sh
  1. git pull origin main
  2. npm install (frontend)
  3. npm run build (SSG — generates dist/)
  4. npm --prefix server install
  5. npm --prefix server run build
  6. Restart API process (PM2 / systemd — process manager TBD per VPS config)
```

### What is Confirmed

- `GET https://quasarcybertech.com/api/blogs` returns published blog data → backend is live
- `https://quasarcybertech.com/blogs/admin` serves the admin UI → frontend static files are served
- `GET https://quasarcybertech.com/api/admin/captcha` returns a captcha challenge → admin routes are reachable
- Nginx acts as reverse proxy routing `/api/*` to the Fastify process and all other paths to the static `dist/` output

### What Requires VPS Access to Confirm

- Exact process manager (systemd unit name, PM2 process name, or other)
- Exact API port used in Nginx upstream config (believed to be 3002)
- Whether `/health` is proxied publicly (currently returns 404 from outside)

### Robots & Sitemap

- `sitemap.xml` is auto-generated at build time by `vite.config.ts` → `writeSeoArtifacts()`
- `robots.txt` is also auto-generated; it allows major search engines and social crawlers, blocks all known AI training bots (GPTBot, CCBot, anthropic-ai, etc.), and disallows `/blogs/admin`
- SEO meta tags from `react-helmet-async` are hoisted into `<head>` at SSG time by the `liftSeoTagsIntoHead()` hook

---

## 12. Contributing Guidelines

### Adding New Content (Data Files)

Most content changes require editing only data files — no component changes needed:

| Goal | File to Edit |
|---|---|
| Add a new sub-capability | `src/data/capabilitiesData.ts` — add entry to the relevant capability's `subCapabilities` array |
| Add FAQs for a sub-capability | `src/data/subCapabilityFaqs.ts` — add keyed entry using the sub-capability slug |
| Add a new industry | `src/data/industriesData.ts` — add a new industry object with slug, content, etc. |
| Add a new nav menu item | `src/config/navigationConfig.ts` |
| Add an image | Upload to Cloudinary → add URL to `src/constants/assets.ts` |

### Adding a New Blog Post

1. Log in to `/blogs/admin`
2. Click **New Post**
3. Fill in title, slug, category, excerpt, content (Markdown), cover image URL, tags, and read time
4. Use **Live Preview** to review formatting
5. Click **Publish** when ready

No code changes or rebuilds are required. Blog posts are served dynamically from the API.

### Safe Handling of Secrets

- **Never commit** `server/.env` or `.env.local` — both are in `.gitignore`
- **Never put server secrets in VITE\_ variables** — they will be bundled into the public JavaScript
- **Rotate secrets immediately** if any are accidentally exposed (especially `SERVER_ECDH_PRIVATE_KEY`, `ADMIN_JWT_SECRET`, and `ADMIN_PASSWORD_HASH`)
- **Generate fresh keys** for each environment (local, staging, production) using `npm run keygen` and `npm run admin:keygen`
- The `ADMIN_ALLOWED_IPS` variable can be set to a comma-separated list of trusted IPs to add an additional layer of access control to the admin portal

### Code Style

- TypeScript strict mode is enabled
- All design tokens (colors, typography, spacing, gradients) must be sourced from `src/config/themeConfig.ts` — do not hardcode values in components
- All image URLs must go through `src/constants/assets.ts` — do not write Cloudinary URLs directly in JSX
- Run `npm run lint` before pushing

### Running the Full Auth Flow Test

```bash
cd server
node .\tmp-admin-auth-test.cjs
# Expected output:
# auth_flow_ok=true
# admin_blogs_count=<number>
```

---

## Appendix: Useful Scripts

| Command | Directory | Purpose |
|---|---|---|
| `npm run dev` | Root | Start frontend dev server (http://localhost:5173) |
| `npm run build` | Root | SSG build — outputs to `dist/` with sitemap + robots |
| `npm run lint` | Root | Run ESLint |
| `npm --prefix ./server run dev` | Root | Start backend with hot-reload |
| `npm --prefix ./server run keygen` | Root | Generate X25519 keypair |
| `npm --prefix ./server run admin:keygen` | Root | Generate scrypt password hash + TOTP secret |
| `npm --prefix ./server run seed:blogs` | Root | Seed blog_posts from static data |
| `npm --prefix ./server run export` | Root | Export blog_posts to hosted-blogs-export.json |
| `npm --prefix ./server run diagnostic` | Root | Run DB connectivity diagnostic |

