<!--
  Purpose: Comprehensive analysis of the four codebases, their architectures, the legacy 6-page chart domain model, the North Star problem statement, and concrete recommendations for how to use v0/Bolt/Cursor to execute an overhaul.
  Current role: Planning document — the single artifact a fresh session or AI coding agent can read.
  Last meaningful change: 2026-10-14 — complete rewrite with accurate repo mapping and north star.
  Constraint: This is analysis + recommendation, not a commitment to implement.
-->

# Site Overhaul Brainstorm — Panchavati Daily Duty

> **Purpose:** One document that captures (A) what the four repos are, (B) the North Star problem statement, (C) the legacy 6-page chart domain model from source evidence, (D) a code architecture comparison, and (E) concrete recommendations for using v0/Bolt/Cursor to execute an overhaul.

> **Reading order:** Read `docs/CURRENT_STATE.md` and `docs/TRACEABILITY.md` first. This is the "what could be" layer.

---

## 1. The Four Codebases

**Repository hierarchy:**
```
DailyDutyPanchavati-ui-rebuild (4)/          ← MAIN REPO (current work target)
├── server/, web/, db/, tests/, docs/        ← main repo contents
└── DailyDutyPanchavati-ui-rebuild/           ← ARJISH REPO (Kushal's full implementation)
    ├── src/server/, src/web/, db/, tests/    ← Arjish contents
    └── NEW DATA/kushals repo/archive/        ← KUSHAL'S REPO (archived reference data + docs)
        ├── src/server/, src/web/             ← Kushal's archived codebase
        └── Durvesh_Work/                     ← DURVESH REPO (Python Flask + SQLite alternative)
            ├── app.py, gen_duty_chart.js     ← Durvesh's Flask app
            └── templates/, static/           ← Durvesh's frontend templates
```

| Repo | Path (from main repo root) | Role | Frontend | Backend | Status |
|---|---|---|---|---|---|
| **Main repo** | `./` | Production system: server-rendered chart authoring, dense print-optimized CSS, 96+ tests | Vanilla JS (`web/chart-authoring.js`) + dormant React (`src/app/`); server-rendered HTML | Fastify 5 + raw `pg` + 8 migrations + DB triggers | Active; Page 1 authoring/preview/PDF, print audit 6/6, 212/212 no-loss |
| **Arjish repo** | `./DailyDutyPanchavati-ui-rebuild/` | Full React + Tailwind reference implementation with Kysely ORM and domain layer | React 19 + Tailwind + lucide-react (13+ views) | Fastify 5 + Kysely + 20+ migrations + `domain/` layer | Complete; all major features |
| **Kushal's repo** | `./DailyDutyPanchavati-ui-rebuild/NEW DATA/kushals repo/archive/` | Archived version with reference data, documentation, north star docs | Same as Arjish (nested copy) | Same as Arjish (nested copy) | Archived; source of reference data and docs |
| **Durvesh repo** | `./DailyDutyPanchavati-ui-rebuild/NEW DATA/kushals repo/archive/Durvesh_Work/` | Python Flask + SQLite alternative with offline-first philosophy | Flask Jinja2 templates + vanilla JS | Python Flask + SQLite | Alternative/experimental; offline-capable Windows .exe |

**Key insight:** The main repo has superior correctness discipline (no-loss 212/212, print audit 6/6, freeze-on-finalize DB triggers, 96 tests). The Arjish repo has superior architectural vision (domain-driven design, Kysely ORM, events-first model, 13+ React views). The overhaul path is to **selectively port Arjish's architectural patterns** — or adopt Arjish as the foundation and port the main repo's print audit and no-loss invariants into it.

---


---

## 2. The North Star Problem Statement

### 2.1 What We're Solving

The Panchavati Police Station in Nashik City currently creates its daily duty chart by hand in a Word document (using legacy Kruti Dev 714 non-Unicode fonts through ISM V6 software). The clerk prints the chart, takes photos of the printout, and shares those photos in WhatsApp groups. To look up historical assignments (e.g., "who was on duty at Location X in September 2019"), the station must search through physical files, folders, and WhatsApp message history.

The digital system must:

1. Create and manage daily duty charts — editable authoring of the 6-page chart, save/reload reliably, preview, and PDF export
2. Perform CRUD operations — staff, ranks, duties, locations, chowkis, assignments, leave, notices
3. Generate accurate PDFs — matching the paper chart's structure and content, with Marathi text never truncated
4. Enable historical search — query across all charts for personnel, locations, duties, events, dates
5. Preserve clerk authority — the human clerk makes all staffing decisions; the software calculates, validates, detects conflicts, and renders
6. Support notifications — eventually send duty assignments to personnel via Telegram (free) or WhatsApp (awaiting legal approval)
7. Evolve beyond paper — support flexible station-specific formats, multi-station support, operational events (bandobast, festivals, VIP visits, elections)

### 2.2 Source Evidence: The Legacy 6-Page Chart

The reference charts (10/09/2026, 11/09/2026, 12/09/2026, 16/09/2026) and the Staff_Info directory (16/06/2026) are the authoritative source. The chart has six canonical logical sections that map to physical PDF pages (though physical page count can expand when special event content is inserted):

| Logical Section | Physical Page | Content |
|---|---|---|
| Section 1 | Page 1 | Day Shift Core (09:00–21:00): Station header, 6 chowki blocks, standing office duties, PSO, marshals, BIMA qualifiers, outpost closures |
| Section 2 | Page 2 | Night Shift Core (21:00–09:00): Same chowki structure, night patrol vehicles, night instructions, Good Morning Squad, lockup |
| Section 3 | Page 3 (or 4 if event) | Leave & Special Duties: Weekly off, casual/earned/sick/maternity leave, outstation investigations, training, court attachments, standing external attachments |
| Section 4 | Page 4 (or 5) | Manpower Matrix: 12 rank columns + Office/ME totals, sanctioned vs present strength, sudden duty change audit ledger |
| Section 5 | Page 5 (or 6) | Officer Duty Summary: 15 subordinate officers (#2–#16), changing daily कर्तव्य field, Senior PI omitted (shown on Page 1 header) |
| Section 6 | Page 6 (or 7) | Patrol & Scan Schedule: Morning 09–15, Afternoon 15–21, 12 hourly slots 09–10 through 20–21, Night 21–09 mappings |

**Key architectural invariant from the 11/09 chart:** Logical sections are canonical; physical PDF page counts are fluid. When an Equipment & Dress Rehearsal Table (रंगीत तालीम) is inserted for special events, it expands the page count but doesn't change the logical structure. The database schema must never hardcode PDF cell coordinates.

### 2.3 Daily Copy Policy (What gets copied vs. recalculated vs. input daily)

| Data Element | Classification | Meaning |
|---|---|---|
| FIXED CONFIGURATION | Structural grid, chowki listing order, standing office duty titles, patrol vehicle call-signs, 12 rank columns, 15 officer roster, 12 hourly scan slots | Never changes day-to-day; master data |
| AUTO-COPY | Permanent standing office clerks (Hazari Master, Property Room Clerk), permanent external postings, multi-month leave baselines, night patrol boilerplate instructions | Copied from previous chart as baseline; clerk can edit |
| COPY+DAILY EDIT | Field personnel allocations, PSO, chowki officers, marshals, BIMA qualifiers, outpost closures (बंद), split-shift timing, active leave registrations, hourly scan personnel | Copied as starting point, clerk edits each day |
| DAILY INPUT | One-day parade/event notices, outstation investigation directives, festival bandobast, equipment tables, sudden duty change reasons | Entered fresh each day |
| RECALCULATE | Present manpower counts in Page 4 matrix, Page 5 officer duties | Derived from assignments + availability |
| APPEND-ONLY | Sudden Duty Change Audit Ledger (कारण मीमांसा) | Never modified, only appended |
| DAILY EDIT | Per-chart labels/renames, presentation overrides (align/compact/hide), slot notes | Clerk can edit essentially every visible value |

### 2.4 Staff Master Data

The staff directory (16/06/2026) contains 169 active staff across 12 ranks:

| Rank Code | Marathi Prefix | English | Count |
|---|---|---|---|
| PI | वपोनि / पोनि | Police Inspector | 2 |
| API | सपोनि | Assistant PI | 6 |
| PSI | पोउनि | Police Sub-Inspector | 9 |
| GPS | ग्रेपोउनि | Grade-I PI | 1 |
| ASI | सपोउनि | Assistant Sub-Inspector | 4 |
| LASI | मसपोउनि | Lady ASI | 4 |
| HC | पोहवा | Head Constable | 46 |
| LHC | मपोहवा | Lady HC | 53 |
| PN | पोना | Probationary Constable | 3 |
| LPN | मपोना | Lady Probationary | 4 |
| PC | पोशि | Police Constable | 123 |
| LPC | मपोशि | Lady Police Constable | 150 |

**Identity matching rule:** Primary key = buckle/service number where present; secondary = conservative normalized name + rank. Four daily-chart-only identities (badges 39, 1061, 1799, 2699) are not in the Staff_Info directory and must be retained as daily-source identities until confirmed.

### 2.5 The 5 Hard Domain Invariants

1. `रिक्त ≠ बंद ≠ बिमा` — Three distinct states: vacant slot, chowki closed, beat marshal BIMA qualifier. All explicit, never conflated.
2. No-loss rendering — Every assignment row appears exactly once in the rendered chart (212/212 row count parity verified against source PDFs)
3. Freeze-on-finalize — Finalized charts become immutable snapshots; amendments create new versions
4. Clerk authority — Software never auto-selects or auto-replaces staff; the clerk is the operational decision-maker
5. Print correctness — `npm run print:audit` measures per-section heights; all sections must fit within A4 (≤775px at 1122×794px landscape)

---

---

## 3. Current Repo Architecture (MAIN REPO)

### 3.1 Stack Overview

The main repo is a **correctness-first, server-rendered** system:

| Layer | Technology | Notes |
|---|---|---|
| Frontend (production) | Vanilla JS + Server-rendered HTML | `web/chart-authoring.js` with CRUD; server renders HTML for print fidelity |
| Frontend (React) | React 19 + TypeScript | Dormant `src/app/` stub; not wired to backend |
| Build | Vite | For React app; server runs via `tsx` |
| Backend | Fastify 5 + TypeScript | REST API + server-side rendering |
| Database | PostgreSQL 17 | Single store, no ORM |
| Migrations | 8 forward-only SQL files | `db/migrate.ts` with SHA-256 checksum guard |
| Rendering | Server-rendered HTML | `server/render/chart-html.ts` — the print authority |
| Testing | Vitest | 96+ tests (invariants, no-loss rendering, render fidelity) |
| CSS | Flat CSS with semantic class names | `web/authoring.css`, `web/chart-presentation.css` — no Tailwind, no Bootstrap |

### 3.2 Directory Structure (MAIN REPO)

```
DailyDutyPanchavati-ui-rebuild (4)/
├── server/
│   ├── index.ts                    — Fastify entry: REST API + server-rendered HTML
│   ├── db.ts                       — pg pool helper (fail-loud)
│   ├── chart-document.ts           — ChartDocument projection (B-tables → document)
│   ├── finalize.ts                 — finalizeChart(), reopenForAmendment()
│   ├── assignments.ts              — Assignment CRUD (slots, chowki, officer, support)
│   ├── presentation.ts             — PATCH /presentation route
│   ├── chart-presentation.ts       — Safe enum contract for presentation overrides
│   ├── structure.ts                — PATCH /structure route (tables/columns)
│   ├── notices.ts                  — Notice CRUD
│   └── render/
│       └── chart-html.ts           — THE renderer: ChartDocument → HTML (print authority)
├── web/
│   ├── chart-authoring.js          — Vanilla JS authoring (edit mode, picker, transliteration)
│   ├── authoring.css               — Authoring + print density (no cards, no shadows)
│   ├── chart-presentation.css      — Whitelisted presentation hooks
│   └── assets/
│       └── Police_Logo.png         — Station emblem
├── src/app/                        — Minimal React app (dormant)
│   ├── main.tsx                    — Stub with ChartView, AppNav, AssignmentEditor
│   └── styles.css                  — Compact style overrides
├── db/
│   ├── migrate.ts                  — SHA-256 checksum guard
│   ├── migrations/0001–0008/       — Forward-only migrations
│   └── seed/
│       ├── 0001_reference_data.sql  — Layer-A masters (ranks, staff, locations, duties)
│       └── seed-chart-1009.ts       — 10/09 chart seed from SEMANTIC/10.md
├── tests/
│   ├── invariants.test.ts          — 31 schema/invariant tests
│   ├── chart-document.test.ts      — 12 projection fidelity tests
│   ├── render.test.ts              — No-loss 212/212
│   ├── render-fidelity.test.ts     — Structure/grammar parity with mock
│   ├── authoring.test.ts           — Bilingual, names, CRUD
│   └── presentation.test.ts        — Presentation overrides
├── tools/
│   └── print-audit.mjs             — Per-section A4 height measurement
├── scripts/
│   └── doctor.mjs                  — 14 objective environment checks
├── reference/                      — Source evidence (ORIGINAL_VISUAL, SEMANTIC)
├── docs/                           — Project docs (CURRENT_STATE, IMPLEMENTATION_CONTRACT)
├── package.json                    — Dependencies + scripts
└── render.yaml                     — Deploy blueprint for Render.com
```

### 3.3 Arjish Repo Architecture

The Arjish repo (`./DailyDutyPanchavati-ui-rebuild/`) is a complete rewrite with modern patterns:

```
DailyDutyPanchavati-ui-rebuild/         ← Arjish repo
├── src/
│   ├── server/
│   │   ├── index.ts                    — Fastify 5 (full operational API)
│   │   ├── db/
│   │   │   ├── kysely.ts               — Kysely typed ORM instance
│   │   │   └── schema.generated.ts     — Auto-generated typed schema (35+ tables)
│   │   ├── domain/                     — Domain-driven layer (260+ KB)
│   │   │   ├── chart-lifecycle.ts      — ChartRepository (create, validate, finalize, amend)
│   │   │   ├── chart-copy.ts           — Copy previous chart with conflict resolution
│   │   │   ├── assignments.ts          — Slot allocation with ledger
│   │   │   ├── availability.ts         — AvailabilityRepository, ConflictEvaluator
│   │   │   ├── master-data.ts          — Master data management
│   │   │   ├── daily-chart-document.ts — buildPage1Document, getDailyChartDocument
│   │   │   ├── daily-specials.ts       — Daily specials
│   │   │   ├── operational/            — Events-first model
│   │   │   │   ├── operational-repository.ts  — 86KB main repo
│   │   │   │   ├── document-projection.ts     — Document projection engine
│   │   │   │   ├── types.ts                   — Domain types
│   │   │   │   ├── assignment.ts, duty.ts,
│   │   │   │   ├── event.ts, location.ts, etc.
│   │   │   ├── audit/                  — AuditRepository, VersionHistory
│   │   │   ├── communications/         — WhatsAppWorkflowService, GOWA adapter
│   │   │   ├── import/                 — LegacyImportService, OCR providers
│   │   │   ├── rendering/              — Rendering profiles (compact, standardized)
│   │   │   └── search/                 — HistoricalSearchRepository
│   │   ├── print/
│   │   │   ├── page1-6-document.ts    — Per-page HTML renderers
│   │   │   ├── daily-chart-document.ts — Daily chart document for print
│   │   │   └── standardized-*.ts      — Rendering profiles
│   │   └── integrations/whatsapp/
│   │       └── gowa-adapter.ts         — WhatsApp HTTP adapter
│   └── web/
│       ├── api/charts.ts              — Typed API client (40+ endpoint wrappers)
│       ├── components/                — AppNav, ShiftCard, DutyAuthoring, etc.
│       ├── App.tsx                    — React Router (13+ routes)
│       ├── Page1View–Page6View.tsx    — Full page authoring views
│       ├── OperationalDashboardView.tsx
│       ├── HistoricalSearchView.tsx
│       ├── MasterDataManagementView.tsx
│       ├── LegacyImportView.tsx
│       ├── types.ts                   — Shared TS interfaces
│       ├── i18n.ts                    — Marathi-first i18n
│       └── index.css                  — Tailwind imports
├── db/
│   ├── migrations/                    — 20+ forward-only SQL migrations
│   └── seed/
├── tests/
└── package.json (dependencies: kysely, fastify, react@19, tailwindcss, lucide-react, i18next, playwright)
```

### 3.4 Durvesh Repo Architecture (Python Alternative)

The Durvesh repo (`Durvesh_Work/`) is a Python Flask + SQLite implementation:

| Aspect | Main Repo | Arjish Repo | Durvesh Repo |
|---|---|---|---|
| Language | TypeScript | TypeScript | Python 3 |
| Framework | Fastify 5 | Fastify 5 | Flask |
| Database | PostgreSQL 17 | PostgreSQL 17 | SQLite |
| Frontend | Vanilla JS + dormant React | React 19 + Tailwind | Flask Jinja2 templates |
| ORM | Raw pg | Kysely | Raw SQLite |
| Deployment | Render.com | Render.com | Single .exe/.bat on Windows |
| Notifications | Future: Telegram/WhatsApp | Telegram/WhatsApp | Telegram + Twilio (SMS/WhatsApp) |
| Philosophy | Cloud-native, correctness-first | Full operational system | Desktop-first, offline-capable |

Durvesh's `app.py` (190KB) uses SQLite for zero-dependency deployment. Its `gen_duty_chart.js` generates the 6-page chart. It bundles as a Windows .exe with a `.secret_key` file and desktop shortcut.

---


---

## 4. Code Architecture Comparison

### 4.1 Main Repo vs Arjish Repo

| Aspect | Main Repo | Arjish Repo |
|---|---|---|
| Server | Fastify 5, REST API, server-rendered HTML, raw `pg` | Fastify 5, full operational API, Kysely ORM |
| ORM | Raw `pg` queries with manual typing | Kysely typed ORM with `schema.generated.ts` (35+ interfaces) |
| Frontend | Vanilla JS (`chart-authoring.js`); dormant React (`src/app/`) | React 19 full SPA with 13+ views |
| Routing | Server-rendered `/charts/:date` + API routes; WIP flyers for unfinished features | Client-side React Router with 13+ routes |
| Data model | Compact chart as primary product; 8 migrations | Events-first: operational events link to daily charts; 20+ migrations |
| Views | 1 active view (chart rendering); React dormant | 13+ views: Page1-6, Dashboard, Search, MasterData, Import |
| Styling | Flat CSS (`authoring.css`, `chart-presentation.css`); no Tailwind | Tailwind utility classes |
| Components | `chart-authoring.js` (vanilla DOM); `src/app/` stubs | React components with lucide-react icons |
| API design | REST API + server-rendered HTML | Typed API client with 40+ endpoint wrappers |
| CRUD | Narrow, focused on 10/09 compact chart | Full CRUD across 6 pages + events + master data |
| Print | `server/render/chart-html.ts` server-rendered HTML; `print-audit.mjs` | Same server-rendered approach; `standardized-*.ts` renderers |
| Testing | 96 Vitest tests (invariants, no-loss 212/212, render fidelity) | Similar test coverage; Playwright E2E |
| Domain layer | Minimal (`server/` files only) | Full domain layer: `domain/operational/`, `domain/audit/`, etc. |
| DB Triggers | Freeze-on-finalize on 7 working tables | Application-level finalize |
| Dev output | `LOG_LEVEL=warn`; calm development | Logger configured separately |
| Print audit | `tools/print-audit.mjs` — per-section A4 height measurement | No equivalent automated print verification |
| No-loss guarantee | Test asserts 212/212 rows, 0 duplicate IDs | No equivalent assertion |
| Visual style | Dense (11px/12px body, no cards, no shadows) | Tailwind cards (`rounded-xl shadow-2xs`), generous whitespace |

### 4.2 The Visual Difference: Density vs Cards

**Main repo visual philosophy:** Dense, print-optimized, banded, no visual chrome. This is deliberate and driven by user feedback.

- `authoring.css` — flat CSS with semantic class names (`.sr-pi-card`, `.chowki-grid`, etc.)
- No dashboard cards, no shadows, no rounded corners
- 11px/12px body text, 9px bands — dense, print-optimized
- Marathi-first typography (Noto Sans Devanagari)
- Hover effects: outline + tint only (no content injection, stable geometry)
- No icons in navigation (text-based nav per user request)

**Arjish repo visual philosophy:** Generic "modern web app" aesthetic — the opposite of what the user wants.

- Tailwind utility classes with `bg-[#f8fafc]` light gray background
- Dashboard cards (`rounded-xl border border-slate-200 bg-white shadow-2xs`)
- Generous whitespace (`p-4`, `gap-4`, `space-y-6`)
- Icon buttons with hover states (`lucide-react` on every button)
- 12px/13px body text, larger interactive targets

**Critical:** Adopting Arjish's visual components wholesale would undo 3+ rounds of user feedback demanding more density and less web-app-like treatment.

### 4.3 Routing Comparison

| Route | Main Repo | Arjish Repo |
|---|---|---|
| `/charts/:date` | Server-rendered compact chart (print authority) | `/chart/:id` — Page1View (React) |
| `/api/charts` | List charts | Same |
| `/api/charts/:date/...` | PATCH/POST/DELETE for CRUD | Same (typed client wrappers) |
| `/` | WIP flyer / dashboard | OperationalDashboardView (full) |
| `/chart/:id/page2`–`page6` | Not yet built (WIP badges) | Page2View–Page6View (full) |
| `/search` | WIP placeholder | HistoricalSearchView (full) |
| `/masters` | Read-only viewer | MasterDataManagementView (full CRUD) |
| `/import` | WIP badge | LegacyImportView (OCR pipeline) |

**The gap:** The main repo has one active surface (the compact chart) with everything else badged WIP/Coming Soon. The Arjish repo has all 13+ views fully implemented but with the "wrong" visual aesthetic for this project.

### 4.4 API Design Comparison

**Main repo API endpoints (server/index.ts):**
- `GET /api/charts` — List charts
- `GET /api/charts/:date` — Get chart details
- `POST /api/charts/:date/officer` — Add officer box
- `PATCH /api/charts/:date/labels` — Per-chart label overrides (185 elements)
- `PATCH /api/charts/:date/presentation` — Presentation overrides (align/compact/hide)
- `PATCH /api/charts/:date/structure` — Table/column CRUD
- `POST /api/charts/:date/notice` — Notice CRUD
- `DELETE /api/charts/:date/notice/:id` — Delete notice
- `PATCH /api/charts/:date/finalize` — Finalize chart
- `GET /charts/:date` — Server-rendered chart HTML

**Arjish repo API client (web/api/charts.ts):**
- 40+ typed endpoint wrappers with `requestJson<T>()`
- Per-page document endpoints: `/api/charts/:id/page1-document` through `page6-document`
- Slot-level CRUD: `allocateSlot`, `vacateSlot`, `setBima`, `setNote`, `replaceAssignment`
- Support seat CRUD: `addSupportSeat`, `removeSupportSeat`
- Directive overrides: `setDirectiveOverride` with content overrides
- Matrix cell updates: `updateMatrixCell` for Page 4
- Officer duty overrides: `setOfficerDuty` for Page 5
- Scan schedule management: `setHourlyScanAssignment`, `setScanSlotOverride`
- Search API: `searchAssignments` with comprehensive filter parameters
- Chart lifecycle: `createChart`, `copyChart`, `validateChart`, `finalizeChart`, `reopenForAmendment`
- Master data: Full CRUD for staff, ranks, duties, locations, shifts, units, resources

---


---

## 5. The Legacy 6-Page Chart: Detailed Domain Model

### 5.1 Page 1 — Day Shift Core (09:00–21:00)

From `SEMANTIC/10.md` Table 1 and `reference/EXCEL_RECONSTRUCTION/10th_sept_page_1`:

**Structure:** 4-column × 27-row banded table (A4 landscape, 1122×794px)

| Column | Width | Content |
|---|---|---|
| A (142pt) | Left margin / station header | पंचवटी पो.स्टे. |
| B (160pt) | Chowki name + chowki officer | 6 chowki blocks: Katya Maruti, Panchavati Karanja, Malegaon Stand, Sardar, Phule Nagar, Meri |
| C (55pt) | Beat marshal / closure state | Marshal charge, बंद (closed), or empty (रिक्त) |
| D (198pt) | Officer/staff assignment | Rank prefix + buckle + name |
| E (119pt) | Office duties / special desks | Writer, Cashier, Property Room Clerk, etc. |

**Fixed Configuration (Section 1):**
- 6 chowkis in order: Katya Maruti, Panchavati Karanja, Malegaon Stand, Sardar, Phule Nagar, Meri
- Standing office duties: Writer, Cashier (नगदी कारकुन), Property Room Clerk (मुद्देमाल कारकुन), etc.
- Patrol mobile call-signs: पिटर मोबाईल, सी.आर. मोबाईल, डेल्टा मोबाईल, गुन्हे शोध पथक/DB, पंचवटी 1 मोबाईल

**Daily Data:**
- Senior PI: वपोनि गजेंद्र पाटील (header)
- PSO: पोहवा 1452 लांडे
- Chowki officers: सपोनि हेमंत मोहिते (Katya), सपोनि प्रशांत बोरसे (Karanja), etc.
- Beat marshals: each chowki has a marshal; बंद = chowki closed, charge transferred
- BIMA qualifiers: 2272 गायकवाड, 1244 महाले, 2157 गुंजाळ, etc. (marked in marshal column)

### 5.2 Page 2 — Night Shift Core (21:00–09:00)

From `SEMANTIC/10.md` Table 2:

**Structure:** Same 4-column layout as Page 1, but for night shift

**Fixed Configuration:**
- Same 6 chowkis (different ordering: Katya first, Meri last)
- Night patrol boilerplate: Column 4 standard instruction
- Good Morning Squad roster (dynamically derived from active night DB team)

**Daily Data:**
- Night Checking Officer: सपोनि हेमंत मोहिते
- Night PSO: सपोउनि शेवाळे
- Night DB team: 1558 काळे, 1025 वायकंडे, 973 आगोणे, 2069 चारोस्कर, 597 चितळकर, 2517 घाडगे
- Night BIMA: 2167 चौधरी, 769 नागरे, 1426 तांदळे, 2523 शिलावट
- Night lockup: मपोहवा 1726 गवळी, मपोशि 2658 शिंदे, पोशि 2321 चोरघे

### 5.3 Page 3 — Leave & Special Duties

From `SEMANTIC/Page 3.md`:

**Three recurring categories structure:**

1. **Leave Registers (दैनिक डेटा):**
   - Weekly Off (साप्ताहिक सुट्टी) — e.g., पोउनि प्रकाश नेमाणे (Sunday)
   - Casual Leave (किरकोळ रजा) with hourly windows — e.g., पोहवा 391 शिंदे 08 ते 10
   - Earned Leave (अर्जित रजा) — e.g., पोहवा 1693 भोये 28/08 ते 11/09
   - Sick Leave (सिक) — e.g., पोशि 106 साताळकर
   - Maternity Leave (प्रसुती रजा) — e.g., मपोशि 2671 गवारे 22/06 ते 18/12
   - Child Care Leave (बाल संगोपन रजा) — e.g., मपोशि 2208 गवळी 18/08 ते 16/10
   - Absenteeism (गैरहजर)

2. **Standing External Attachments (फिक्स्ड कॉन्फिग):**
   - ACP Office Deputation (प्रतिनियुक्तीवर — मा.सपोआ.साो.पं.वि कार्या.)
   - DCP Zone 1 Office (मा.पो.उप.आ.परि.1 कार्यालय)
   - Nirbhaya Squad (पंचवटी निर्भया पथक)
   - Damini Squad (दामिनी पथक)
   - Missing Cell (मिसिंग सेल कामी)
   - Session Court Pairvi (मा.सेशन कोर्ट पैरवी — पोहवा 500 गावित)
   - JMFC Court Pairvi (JMFC कोर्ट पैरवी — पोशि 1996 पालवी, मपोशि 1014 गोसावी)

3. **Event-Driven Deployments (डेली/इव्हेंट):**
   - Outstation Investigation (तपासकामी) — e.g., तपासकामी - गु�रात राज्य
   - Training (प्रशिक्षण) — e.g., डी.टी.एस. नाशिक
   - Festival Bandobast — e.g., गणेश मुर्ती विक्री केंद्र बंदोबस्त

**Special case (11/09):** Extra physical page with Equipment & Dress Rehearsal Table (रंगीत तालीम):
- 11 constables with gear assignments (mega phone, video camera, search light, gas gun, 12-bore shotgun, SLR rifle, shields, lathis, helmets, body protectors)
- Fall-in instruction: 10:00 AM

### 5.4 Page 4 — Manpower Matrix

From `SEMANTIC/Page 4.md`:

**Structure:** 12 rank columns + 2 summary columns = 14 columns

| Rank Code | Marathi Prefix | Column |
|---|---|---|
| PI | पोनि/वपोनि | Office TOTAL |
| API | सपोनि | Office TOTAL |
| PSI | पोउनि | Office TOTAL |
| GPS | ग्रेपोउनि | — |
| ASI | सपोउनि | ME TOTAL |
| LASI | मसपोउनि | ME TOTAL |
| HC | पोहवा | ME TOTAL |
| LHC | मपोहवा | ME TOTAL |
| PN | पोना | ME TOTAL |
| LPN | मपोना | ME TOTAL |
| PC | पोशि | ME TOTAL |
| LPC | मपोशि | ME TOTAL |

**Key relationships:**
- Office TOTAL = PI + API + PSI = 09 (sanctioned)
- ME TOTAL = ASI + LASI + HC + LHC + PN + LPN + PC + LPC = 233 (sanctioned)
- Present manpower = 151 (Male: 106 + Female: 45)
- `दिवस व रात्रकरिता प्रत्यक्ष हजर` = 03 (no proven formula; stable template value)

**Audit Ledger (कारण मीमांसा):** Append-only log of mid-shift changes at the bottom of Page 4.

### 5.5 Page 5 — Officer Duty Summary

From `SEMANTIC/Page 5.md`:

**Structure:** 15 numbered rows (officers #2–#16 from directory), 4 columns (अ.नं, अधिकारी, कर्तव्य, —)

| Row | Officer | 10/09 कर्तव्य | 11/09 कर्तव्य | 16/09 कर्तव्य |
|---|---|---|---|---|
| 1 | पो.नि.सुनिल पवार (गुन्हे) | उपस्थित | साप्ताहिक सुट्टी | उपस्थित |
| 2 | पो.नि.सुधीर पाटील | उपस्थित | उपस्थित | उपस्थित |
| ... | ... | ... | ... | ... |
| 15 | परि.पोउनि.अशोक दिंडे | साप्ताहिक सुट्टी | पंचवटी १ मोबाईल - दिवसपाळी | पंचवटी १ मोबाईल - दिवसपाळी |

**Key insight:** Senior PI (वपोनि गजेंद्र पाटील) is omitted from Page 5 — he appears on the Page 1 header. The कर्तव्य field is the only thing that changes daily; it's a derived projection from Pages 1-3 assignments.

### 5.6 Page 6 — Patrol & Scan Schedule

From `SEMANTIC/Page 6.md`:

**Four tables:**

| Table | Time | Structure | Classification |
|---|---|---|---|
| Table 01 | 09:00–15:00 | 6 chowkis; mobile=chowki incharge; marshal=beat marshal; Sardar→Malegaon Stand Marshal | FIXED CONFIG |
| Table 02 | 15:00–21:00 | Meri+Phule Nagar→CR Mobile; Katya+Karanja→Delta Mobile; Malegaon+Sardar→DB Mobile | FIXED CONFIG |
| Table 03 | 09:00–21:00 (12 hourly slots) | 12 windows (09-10 through 20-21); chowki rotation fixed; personnel daily | Slots fixed, personnel COPY+EDIT |
| Table 04 | 21:00–09:00 | 6-row jurisdiction→mobile mapping + standard night instruction | FIXED CONFIG |

**Standard night instruction (printed footer):** `रात्रपाळी चौकीचे अंमलदार आपआपले चौकी हद्दीतील ग्रीन ॲप करतील.`

---


---

## 6. What v0 / Bolt / Cursor Could Do With This Project

### 6.1 Understanding the Tooling Options

**v0 (by Vercel):** AI-powered UI generation. You describe or paste a design, and v0 generates React + Tailwind components. Best for: visual component scaffolding, design-to-code, style iteration.

**Bolt (by StackBlitz):** AI coding agent in the browser. Generates full projects, installs dependencies, runs dev servers. Best for: rapid prototyping, full-stack scaffolding, end-to-end feature generation.

**Cursor:** AI-first code editor with deep codebase understanding. Best for: refactoring existing code, understanding large codebases, surgical edits, agentic workflows.

### 6.2 What Each Tool Could Contribute

**Cursor — Port Arjish's Domain Layer (Recommended Phase 1):**
- Understand both codebases (main repo at `./` + Arjish at `./DailyDutyPanchavati-ui-rebuild/`)
- Port the domain layer from Arjish `src/server/domain/` into the main repo's architecture
- Port Kysely ORM setup (keep existing raw `pg` for backward compatibility)
- Generate `schema.generated.ts` from existing migrations
- Port the typed API client pattern (`web/api/charts.ts` equivalent for main repo's REST routes)
- **Strength:** Cursor can do this incrementally, understanding both codebases and finding the right mapping points

**v0 — Visual Component Generation (Phase 2):**
- Generate the 13+ React views as TypeScript components from the design mockups (`design/panchavati-compv3.html`, `reference/UI_V0/`)
- Produce Tailwind component variants matching the user's feedback ("kill the dot style", "reduce vertical padding", "no dashboard cards")
- Generate bilingual EN/MR toggle components with Devanagari-first typography
- Generate the operational dashboard, historical search filters, master data CRUD forms
- Generate mobile-responsive layouts at the 3 breakpoints (1100px, 650px, 800px)
- Import `Dashboard_Visual_Reference.png` and `panchavati-compv3.html` as design prompts
- **Limitation:** v0 defaults to generic "modern web app" aesthetics — would need explicit prompts to match the dense, card-free style

**Bolt — Full System Prototyping (Phase 3, for new features):**
- Generate a complete Fastify + Kysely + React stack from scratch (if needed for greenfield features)
- Scaffold new domain modules (e.g., the operational events-first model from `domain/operational/`)
- Generate the OCR import pipeline with `LocalProcessOcrProvider`
- Set up Playwright E2E tests for new workflows
- **Limitation:** Starting over loses the 96-test invariant suite and 212/212 no-loss guarantee

**Bolt Figma Import Support:**
- Bolt can import Figma designs directly (File → Import Figma)
- The `reference/EXCEL_RECONSTRUCTION/` folder has HTML exports that can be converted to Figma
- The `reference/ORIGINAL_VISUAL/` PDFs can be placed as design references
- The `design/panchavati-compv3.html` can serve as a visual spec

### 6.3 Recommended Tool Sequence

1. **Cursor (Phase 1 — Backend Modernization):**
   - Port Kysely ORM into main repo as typed layer (keep raw `pg` for existing queries)
   - Port domain layer from Arjish (`src/server/domain/`) — operational/, audit/, rendering/
   - Generate typed API client for existing REST endpoints
   - Keep all 96 tests green throughout

2. **Cursor (Phase 2 — Views):**
   - Port Page1View from Arjish as editable authoring surface
   - Keep `server/render/chart-html.ts` as print authority
   - Port Page2View through Page6View incrementally
   - Run no-loss test (212/212) after each page

3. **v0 (Phase 3 — UI Polish):**
   - Generate Tailwind component variants matching user feedback (dense, no cards)
   - Generate dashboard and search views from `Dashboard_Visual_Reference.png`
   - Generate master data CRUD forms
   - Import into Cursor-managed codebase

4. **Bolt (Phase 4 — New Features):**
   - Prototype OCR import pipeline (isolated, not in main codebase)
   - Prototype WhatsApp/Telegram integration
   - Experiment with events-first operational model

### 6.4 The Complete Prompt for AI Builders (v0/Bolt)

If handing this to v0 or Bolt, here is the complete problem statement prompt:

**PROBLEM:** Build a digital daily duty chart system for Panchavati Police Station, Nashik City.

**CURRENT WORKFLOW:** Clerk creates a 6-page Word doc (Kruti Dev 714 font), prints it, photographs it, shares via WhatsApp. Historical lookup requires digging through physical files.

**SOURCE EVIDENCE (provided in reference/):**
- 4 duty charts (10/09, 11/09, 12/09, 16/09/2026) in PDF + DOCX + semantic markdown
- Staff directory (169 personnel, 12 ranks, 16/06/2026)
- Daily copy policy (`SEMANTIC/All Pages_Daily Copy Policy...md`)
- Layout specs (`docs/layout/page-1-layout-spec.md`)
- Visual mockups (`design/panchavati-compv3.html`)

**SIX CANONICAL SECTIONS:**
1. Day Shift Core (09:00–21:00): 6 chowki blocks, office duties, PSO, marshals, BIMA
2. Night Shift Core (21:00–09:00): Same chowki structure, patrol, Good Morning Squad
3. Leave & Special Duties: Weekly off, casual/earned/sick/maternity leave, investigations, training
4. Manpower Matrix: 12 rank columns (PI/API/PSI/GPS/ASI/LASI/HC/LHC/PN/LPN/PC/LPC) + Office/ME totals
5. Officer Duty Summary: 15 officers (#2–#16), changing daily कर्तव्य
6. Patrol & Scan Schedule: 4 tables (morning, afternoon, 12 hourly slots, night)

**FIVE HARD INVARIANTS:**
1. `रिक्त ≠ बंद ≠ बिमा` (three distinct states — never conflated)
2. No-loss: every assignment appears exactly once (212/212 rows)
3. Freeze-on-finalize: finalized charts are immutable
4. Clerk authority: software never auto-selects staff
5. Print: all 6 pages fit A4 landscape (≤775px)

**VISUAL STYLE:** Dense and print-optimized. No dashboard cards. No shadows. No rounded corners. 11px/12px body text. Marathi-first. No icons in navigation.

**TECH STACK:** React 19 + TypeScript + Tailwind CSS frontend, Fastify 5 + Kysely + TypeScript backend, PostgreSQL 17, Playwright for PDF.

---


---

## 7. Recommendations

### 7.1 Strategic Recommendation: Two-Phase Approach

**Option A (Recommended): Port Arjish's patterns into main repo**
- Use Cursor to port the domain layer, Kysely ORM, and typed API client
- Use v0 to generate React views matching the dense visual style
- Preserve the main repo's 96 tests, no-loss invariant, and print audit
- Risk: Integration complexity; Arjish's Tailwind-heavy code doesn't match

**Option B: Adopt Arjish repo as foundation, port main repo's correctness**
- Use Arjish as the base codebase (it already has all 13+ views working)
- Port the main repo's `print-audit.mjs`, no-loss tests, and freeze-on-finalize triggers
- Replace Arjish's Tailwind card aesthetic with dense CSS overrides
- Risk: Losing the main repo's proven workflow and user feedback integration

**Recommended: Option A with Option B as fallback.** The main repo's `chart-html.ts` renderer and `chart-authoring.js` are battle-tested. Start by porting Arjish's domain layer and API client using Cursor, then generate views with v0.

### 7.2 Priority Matrix

| Priority | Feature | Source | Tool | Risk | Effort |
|---|---|---|---|---|---|
| P0 | Port Kysely ORM + domain layer | Arjish `src/server/domain/` | Cursor | Medium | 2-3 weeks |
| P0 | Generate typed API client | Arjish `web/api/charts.ts` | Cursor | Low | 1 week |
| P0 | Keep 96 tests green throughout | Main repo `tests/` | Cursor | Low | Ongoing |
| P1 | Port Page1View (editable authoring) | Arjish `src/web/Page1View.tsx` | Cursor + v0 | High | 2 weeks |
| P1 | Port Page2View–Page6View | Arjish `src/web/Page[2-6]View.tsx` | Cursor | High | 4 weeks |
| P1 | Operational dashboard components | Arjish `OperationalDashboardView.tsx` | v0 | Low | 1 week |
| P1 | Historical search view | Arjish `HistoricalSearchView.tsx` | v0 | Low | 1 week |
| P2 | Master data CRUD forms | Arjish `MasterDataManagementView.tsx` | v0 + Cursor | Medium | 2 weeks |
| P2 | OCR import pipeline | Arjish `LegacyImportView.tsx` | Bolt prototype | High | 1 week (proto) |
| P2 | WhatsApp/Telegram integration | Durvesh repo + Arjish | Bolt prototype | High | 1 week (proto) |
| P3 | Canvas/table editing (AFFiNE/React Flow) | Open source libraries | Research spike | Medium | 2 weeks |

### 7.3 Preserving Non-Negotiable Invariants

Any porting must preserve these hard invariants:

1. **No-loss rendering:** The 212/212 test must pass for every chart view. The server renderer (`server/render/chart-html.ts`) remains the print authority — React views are for editing, not printing.

2. **Print audit:** `tools/print-audit.mjs` must continue to measure ≤775px per section on A4 landscape. Any new view that renders for print must pass this check.

3. **Freeze-on-finalize:** DB triggers (not application logic) enforce immutability at the database level.

4. **Static analysis guards:** `scripts/doctor.mjs` (14 checks) + `new Function(js())` parse tests must cover any new JS/CSS.

5. **No external data at runtime:** No `fetch()`/`axios` for external data. WhatsApp and OCR are WIP badges, not live integrations.

6. **Clerk authority:** Software never auto-selects or auto-replaces staff. All assignments are clerk-driven.

7. **Visual density:** Maintain the dense, banded, print-optimized CSS. Reject generic Tailwind card aesthetics.

### 7.4 Visual Direction: Hybrid Approach

**Keep:** The main repo's dense CSS architecture (`web/authoring.css`). The user's feedback is clear — no cards, no shadows, no rounded corners, whitespace reduction is the goal.

**Adopt selectively from Arjish:**
- The domain-driven backend structure (`domain/operational/`, `domain/rendering/`)
- The Kysely typed ORM layer
- The 40+ endpoint wrappers in the typed API client
- The 6-page rendering profile concept (implemented with main repo's CSS grammar, not Tailwind cards)

**Do NOT adopt:**
- Tailwind utility classes for the chart surface — keep `authoring.css` dense overrides
- Dashboard card aesthetics (`rounded-xl shadow-2xs bg-white`)
- Generous whitespace (`p-4`, `gap-4`, `space-y-6`)
- Icon-heavy UI — use lucide-react sparingly, not on every button

### 7.5 The AFFiNE / Canvas Table Tooling Question

For the user's question about open-source canvas/table editing tools:

**AFFiNE** is the most promising candidate — it supports:
- Edgeless Mode: infinite canvas with floating cards
- Database blocks: tables with sort/filter/cross-link
- CRDT-based offline-first resilience
- AGPL-3.0 license (open source)

However, AFFiNE would need significant customization to:
- Match the dense, print-optimized aesthetic (AFFiNE defaults to Notion-like generous whitespace)
- Support Marathi-first typography and Devanagari rendering
- Integrate with the PostgreSQL backend and Kysely ORM
- Maintain the no-loss rendering invariant (212/212 rows)

**Recommendation:** Use AFFiNE concepts (floating nodes, auto-sort tables) to inform the **operational dashboard** design, but do not adopt AFFiNE directly. Instead, use **React Flow** (the engine behind `table-canvas`) to build a custom canvas for duty slot drag-and-drop within the existing React app.

| Tool | Use Case | Verdict |
|---|---|---|
| AFFiNE | Future operational dashboard canvas | Research spike (P3) — not for chart authoring |
| Focalboard | Task-oriented Kanban + table | Too simple; no infinite canvas |
| Vikunja | Task planning with views | Not relevant for police duty charts |
| React Flow | Custom canvas for slot drag-and-drop | Adopt as dev dependency for dashboard |
| Canvas Datagrid | High-performance table rendering | Adopt for staff roster tables |

### 7.6 Implementation Roadmap

**Phase 1 (1-2 weeks): Backend Modernization**
- Use Cursor to port Kysely ORM into main repo
- Create `src/server/domain/` mapping from Arjish
- Add typed API client for existing REST endpoints
- Ensure all 96 tests pass

**Phase 2 (2-4 weeks): 6-Page React Views**
- Use Cursor to port Page1View from Arjish
- Keep `server/render/chart-html.ts` as print authority
- Port Page2View through Page6View incrementally
- Run no-loss test after each page

**Phase 3 (1-2 weeks): Operational Surfaces**
- Use v0 to generate dashboard, search, and master data views
- Generate from `Dashboard_Visual_Reference.png` and `design/panchavati-compv3.html`
- Import into Cursor-managed codebase

**Phase 4 (2+ weeks): Advanced Features + Canvas**
- Use Bolt to prototype OCR import pipeline (isolated)
- Use Bolt to prototype WhatsApp/Telegram integration (isolated)
- Research spike: React Flow for canvas-style dashboard editing
- Integrate Canvas Datagrid for high-performance staff tables

### 7.7 Conclusion

The path forward is clear: **Use Cursor to port Arjish's domain layer and typed API client into the main repo, use v0 to generate React views that match the user's dense visual feedback, and use Bolt only for isolated prototyping of OCR/WhatsApp features.** Preserve the 96 tests, no-loss 212/212 invariant, and print audit throughout. For the open-source canvas tooling question, adopt React Flow at the dev-dependency level for future dashboard enhancements, but reject AFFiNE/Focalboard as not-a-fit for this project's print-optimized, Marathi-first, clerk-authority requirements.

---

## 8. Appendix: Key Files to Read

### 8.1 Source Evidence (Authority)

| File | Path (from main repo) | Purpose |
|---|---|---|
| 10/09 chart | `reference/ORIGINAL_VISUAL/10.pdf` | Visual authority |
| 11/09 chart | `reference/ORIGINAL_VISUAL/11.pdf` | Visual authority (with event page) |
| 12/09 chart | `reference/ORIGINAL_VISUAL/12.pdf` | Visual authority |
| 16/09 chart | `reference/ORIGINAL_VISUAL/16.pdf` | Visual authority |
| 10/09 semantic | `reference/SEMANTIC/10.md` | Exact text authority |
| 11/09 semantic | `reference/SEMANTIC/11.md` | Exact text authority |
| 16/09 semantic | `reference/SEMANTIC/16.md` | Exact text authority |
| Page 3 analysis | `reference/SEMANTIC/Page 3.md` | Leave & special duties structure |
| Page 4 analysis | `reference/SEMANTIC/Page 4.md` | Manpower matrix |
| Page 5 analysis | `reference/SEMANTIC/Page 5.md` | Officer roster |
| Page 6 analysis | `reference/SEMANTIC/Page 6.md` | Scan schedule |
| Staff directory | `reference/SEMANTIC/Staff_Info.md` | 169 personnel, 12 ranks |
| Copy policy | `reference/SEMANTIC/All Pages_Daily Copy Policy...md` | Copy vs. recalculate rules |
| Reference data | `reference/PANCHAVATI_REFERENCE_DATA.v2.md` | Canonical reference |

### 8.2 Arjish Repo Key Files

| File | Path | Purpose |
|---|---|---|
| API client | `../DailyDutyPanchavati-ui-rebuild/src/web/api/charts.ts` | 40+ typed endpoint wrappers |
| Domain layer | `../DailyDutyPanchavati-ui-rebuild/src/server/domain/` | Operational, audit, rendering, search |
| Schema | `../DailyDutyPanchavati-ui-rebuild/src/server/db/schema.generated.ts` | Kysely typed schema |
| Page 1 view | `../DailyDutyPanchavati-ui-rebuild/src/web/Page1View.tsx` | Day shift authoring |
| Page 2 view | `../DailyDutyPanchavati-ui-rebuild/src/web/Page2View.tsx` | Night shift authoring |
| Page 3 view | `../DailyDutyPanchavati-ui-rebuild/src/web/Page3View.tsx` | Leave & special duties |
| Page 4 view | `../DailyDutyPanchavati-ui-rebuild/src/web/Page4View.tsx` | Manpower matrix |
| Page 5 view | `../DailyDutyPanchavati-ui-rebuild/src/web/Page5View.tsx` | Officer summary |
| Page 6 view | `../DailyDutyPanchavati-ui-rebuild/src/web/Page6View.tsx` | Scan schedule |
| Dashboard | `../DailyDutyPanchavati-ui-rebuild/src/web/OperationalDashboardView.tsx` | Command center |
| Search | `../DailyDutyPanchavati-ui-rebuild/src/web/HistoricalSearchView.tsx` | Multi-faceted search |

### 8.3 Main Repo Key Files

| File | Purpose |
|---|---|
| `server/index.ts` | Fastify entry: REST API + server-rendered HTML |
| `server/render/chart-html.ts` | THE renderer: ChartDocument → HTML (print authority) |
| `server/chart-document.ts` | ChartDocument projection |
| `server/finalize.ts` | finalizeChart(), reopenForAmendment() |
| `server/assignments.ts` | Assignment CRUD |
| `web/chart-authoring.js` | Vanilla JS authoring UI |
| `web/authoring.css` | Dense print-optimized CSS |
| `tests/render.test.ts` | No-loss 212/212 test |
| `tools/print-audit.mjs` | Per-section A4 height measurement |
| `docs/IMPLEMENTATION_CONTRACT.md` | Settled implementation decisions |
| `docs/CURRENT_STATE.md` | Current implementation state |
