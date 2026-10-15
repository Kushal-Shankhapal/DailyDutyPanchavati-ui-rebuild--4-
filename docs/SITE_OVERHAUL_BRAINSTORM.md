<!--
  Purpose: Comprehensive analysis of the four codebases, their architectures, the legacy 6-page chart domain model, the North Star problem statement, concrete tool/option recommendations — and (§10) the design-first workflow brainstorm: order of operations, tool chain incl. the Framer-vs-Figma verdict, the EN-first language system, the measured layout-optimization loop, the dev lab, and the flow-inventory plan.
  Current role: Planning document — the single artifact a fresh session or AI coding agent can read.
  Last meaningful change: 2026-10-15 — §10 "The Brainstorm" added (design-first workflow + measured optimization loop; baseline re-measured live: 6 sheets, 655/496/685/663/579/664px, 212/212). 2026-10-14 — fact-verified line-by-line against the actual repos (§9 Verification Log); §1 repo comparison, §2.4 staff numbers, §8.1 authority table and several file paths corrected.
  Constraint: This is analysis + recommendation, not a commitment to implement. §7 options and §10 are UNAPPROVED until the user signs off.
-->

# Site Overhaul Brainstorm — Panchavati Daily Duty

> **Purpose:** One document that captures (A) what the four repos are, (B) the North Star problem statement, (C) the legacy 6-page chart domain model from source evidence, (D) a code architecture comparison, and (E) concrete recommendations for using v0/Bolt/Cursor to execute an overhaul.

> **Reading order:** Read `docs/CURRENT_STATE.md` and `docs/TRACEABILITY.md` first. This is the "what could be" layer.
>
> **⚠ Verification status (2026-10-14):** every factual claim in this document was checked against the actual files on disk (see §9). Claims that could not be executed here are labelled *unverified*. Repository-comparison claims supersede the earlier draft — the nested repos are **divergent forks, not copies**.

---

## 1. The Four Codebases

**Repository hierarchy:**
```
DailyDutyPanchavati-ui-rebuild (4)/          ← MAIN REPO (current work target)
├── server/, web/, db/, tests/, docs/        ← main repo contents
└── DailyDutyPanchavati-ui-rebuild/           ← ARJISH REPO (Arjish's React implementation)
    ├── src/server/, src/web/, db/, tests/    ← Arjish contents
    └── NEW DATA/kushals repo/archive/        ← KUSHAL'S REPO (archived fork + reference data + docs)
        ├── src/server/, src/web/             ← fork of Arjish's codebase — BUT DIVERGED (see note)
        └── Durvesh_Work/                     ← DURVESH REPO (Python Flask + SQLite alternative)
            ├── app.py, gen_duty_chart.js     ← Durvesh's Flask app (app.py = 189,639 bytes)
            └── templates/, static/           ← Durvesh's frontend templates
```

**⚠ Fork divergence (verified 2026-10-14 by `diff -rq`):** the archive is NOT a nested copy of Arjish's repo. 24 files differ and each side has files the other lacks:

| | Arjish repo | Kushal's archive |
|---|---|---|
| Chart formats | `standardized-compact-v2.ts` + `standardized-daily-duty-v1.ts` rendering profiles (the **v2 format suggested by sir**) | `StandardizedView.tsx` + `StandardizedAbsence/Manpower/ExtraSectionsView.tsx` (the **older Stitch-generated standardized chart**) — no v2 profiles |
| Comparison window | `Page1View.tsx` has तक्ता तुलना (Compare Chart Formats) | absent |
| Navbar | overflow/hamburger-style menu (`MoreVertical`/`overflowMenuOpen`) | flat grouped horizontal nav — `AppNav.tsx:571` literally says *"HORIZONTAL NAV BAR (flat, click-to-expand dropdowns, no hamburger)"* |
| Migrations | 18 | 20 |
| Standardized UI views | absent | present (see above) |

Both carry `Page1View.tsx`–`Page6View.tsx` (the legacy six-page chart with 10-Sept CRUD). Kushal's archive additionally holds the reference corpus (`EXCEL_RECONSTRUCTION/`, `ORIGINAL_VISUAL/`, `SEMANTIC/`), north-star docs and `UI_V0/`.

| Repo | Path (from main repo root) | Role | Frontend | Backend | Status |
|---|---|---|---|---|---|
| **Main repo** | `./` | Production system: server-rendered chart authoring, dense print-optimized CSS, 96 tests | Vanilla JS (`web/chart-authoring.js`) + dormant React (`src/app/`); server-rendered HTML | Fastify 5 + raw `pg` + 8 migrations + DB triggers | Active; whole-chart authoring (not just Page 1) + preview/PDF, print audit 6/6, 212/212 no-loss — verified 2026-10-14 (§9) |
| **Arjish repo** | `./DailyDutyPanchavati-ui-rebuild/` | React reference implementation with Kysely ORM and domain layer | React 19 + Tailwind + lucide-react (13+ views/routes in `App.tsx`) | Fastify 5 + Kysely + 18 migrations + `domain/` layer + Playwright config | Structure verified on disk; suite NOT executed here (*unverified*: “all major features”) |
| **Kushal's repo** | `./DailyDutyPanchavati-ui-rebuild/NEW DATA/kushals repo/archive/` | Diverged fork of Arjish's code + north-star docs + reference corpus + older standardized chart UI | Fork of Arjish's React + 4 extra `Standardized*View.tsx`; grouped no-hamburger nav | Same lineage, 20 migrations | Archive; source of north star docs, `UI_V0/`, reference data — divergences listed in §1 note |
| **Durvesh repo** | `./…/kushals repo/archive/Durvesh_Work/` | Python Flask + SQLite alternative with offline-first philosophy | Flask Jinja2 templates + vanilla JS | Python Flask + SQLite (`app.py` 189KB, `gen_duty_chart.js`) | Alternative/experimental; `.bat`/`.vbs` Windows launchers present (no `.exe` found on disk) |

**Key insight:** The main repo has superior correctness discipline (no-loss 212/212, print audit 6/6, freeze-on-finalize DB triggers, 96 tests — all re-verified 2026-10-14). The Arjish repo has the richer architectural vision (domain-driven design, Kysely ORM, events-first model, 13+ React views — *structure verified, behavior unverified here*). The overhaul path is **an option to evaluate, not a decision**: selectively port Arjish's architectural patterns — or adopt Arjish as the foundation and port the main repo's print audit and no-loss invariants into it. Both options need user approval before any work starts (§7).

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

**Page-count precision (2026-10-14 verification — three different numbers, do not conflate):**

| What | Count | Evidence |
|---|---|---|
| Logical sections | 6 | domain model above |
| Source chart sheets (10/09) | 6 | `reference/ORIGINAL_VISUAL/10.pdf`, TRACEABILITY R-19 |
| Source chart sheets (11/09, with event page) | 7 | event annex inserts one physical sheet |
| Current renderer output (compact-v5) | **6** | `npm run print:audit` 6/6 (655/496/685/663/579/664px ≤ 775) + `tests/render.test.ts` asserts `pages.length === 6`, re-run 2026-10-14 |
| Earlier compact-v4 renderer output | 7 | stale line still in `docs/CURRENT_STATE.md` §Print pagination — **known doc contradiction, CURRENT_STATE not yet cleaned** |

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

**Do not trust a single number here yet — the sources disagree (verified 2026-10-14):**

| Source | Count | Notes |
|---|---|---|
| `reference/SEMANTIC/Staff_Info.md` (16/06/2026) | **176** numbered person rows | secondary extraction; per-rank recount needed |
| Our DB seed (`db/seed/*.sql`, `npm run doctor`) | **179** staff, **17** ranks | what the app actually uses |
| Old/Apjish DB import (`docs/INITIAL_AUDIT.md`, `docs/ASTRA_TRANSITION_PACKET.md`) | **169** `staff_members` | historical import — the source of the old “169” figure |
| ⚠ Earlier draft of this doc | “169 across 12 ranks” with a table summing to **405** | **WRONG — withdrawn.** The rank table mixed manpower-matrix sanctioned counts (HC 46, PC 123…) with directory counts and cannot be reconciled as written. |

**Action required before any layout/staffing calculation:** rebuild the per-rank table from `Staff_Info.md` with explicit counting rules (one row = one person; officers appear once in Table 1; duplicates reported, never merged), reconcile 176 vs 179 vs 169, and only then publish numbers. Until that is done, use **179 (seed)** as the operational figure because that is what the renderer and tests use.

**Identity matching rule (verified):** Primary key = buckle/service number where present; secondary = conservative normalized name + rank. Four daily-chart-only identities (badges 39, 1061, 1799, 2699) are indeed absent from Staff_Info and are already retained in `db/seed/0002_source_evidenced_staff.sql` as daily-source identities.

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
| Testing | Vitest | **96** tests (verified green 2026-10-14: typecheck + 96 tests + doctor ×2 DBs) |
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
│   ├── invariants.test.ts          — 19 schema/invariant tests (suite total: 96)
│   ├── chart-document.test.ts      — 12 projection fidelity tests
│   ├── render.test.ts              — No-loss 212/212
│   ├── render-fidelity.test.ts     — Structure/grammar parity with mock
│   ├── authoring.test.ts           — Bilingual, names, CRUD
│   └── presentation.test.ts        — Presentation overrides
│   ├── assignments.test.ts, structure.test.ts — assignment + table/column CRUD
│   ├── authoring.test.ts           — Bilingual, names, CRUD
│   └── presentation.test.ts        — Presentation overrides
├── tools/
│   └── print-audit.mjs             — Per-section A4 height measurement
├── scripts/
│   └── doctor.mjs                  — 14 objective environment checks
├── reference/                      — Source evidence (ORIGINAL_VISUAL, EXCEL_RECONSTRUCTION, SEMANTIC)
├── docs/                           — Project docs (CURRENT_STATE, ARCHITECTURE, DOMAIN, OPEN_QUESTIONS, …)
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
│   │   │   └── schema.generated.ts     — Auto-generated typed schema (44 interfaces)
│   │   ├── domain/                     — Domain-driven layer (~763 KB on disk)
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
│       ├── api/charts.ts              — Typed API client (~39 endpoint wrappers)
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
│   │   ├── migrations/                    — 18 forward-only SQL migrations
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
| ORM | Raw `pg` queries with manual typing | Kysely typed ORM with `schema.generated.ts` (44 interfaces) |
| Frontend | Vanilla JS (`chart-authoring.js`); dormant React (`src/app/`) | React 19 full SPA with 13+ views |
| Routing | Server-rendered `/charts/:date` + API routes; WIP flyers for unfinished features | Client-side React Router with 13+ routes |
| Data model | Compact chart as primary product; 8 migrations | Events-first: operational events link to daily charts; 18 migrations (Arjish) / 20 (archive) |
| Views | 1 active view (chart rendering); React dormant | 13+ views: Page1-6, Dashboard, Search, MasterData, Import |
| Styling | Flat CSS (`authoring.css`, `chart-presentation.css`); no Tailwind | Tailwind utility classes |
| Components | `chart-authoring.js` (vanilla DOM); `src/app/` stubs | React components with lucide-react icons |
| API design | REST API + server-rendered HTML | Typed API client with ~39 endpoint wrappers in `api/charts.ts` |
| CRUD | Narrow, focused on 10/09 compact chart | Full CRUD across 6 pages + events + master data |
| Print | `server/render/chart-html.ts` server-rendered HTML; `print-audit.mjs` | Same server-rendered approach; `standardized-*.ts` renderers |
| Testing | 96 Vitest tests (invariants, no-loss 212/212, render fidelity) in main repo; Arjish ships a larger suite (`tests/domain|unit|invariants|e2e` + Playwright) — **not executed here, unverified** |
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

**The gap:** The main repo has one active surface (the compact chart) with everything else badged WIP/Coming Soon. The Arjish repo ships all 13+ views as code (structure verified; runtime behavior *unverified* here) but with the "wrong" visual aesthetic for this project.

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
- ~39 typed endpoint wrappers with `requestJson<T>()`
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

From `SEMANTIC/10.md` Table 1 and `reference/EXCEL_RECONSTRUCTION/10th_sept_daily_duty_chart_page_1/` (Tier-2 exact text for this page):

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
- Generate the 13+ React views as TypeScript components from the design mockups (`design/panchavati-compv3.html` in this repo; `UI_V0/` and `Dashboard_Visual_Reference.png` live in Arjish's repo / the archive, not here)
- Produce Tailwind component variants matching the user's feedback ("kill the dot style", "reduce vertical padding", "no dashboard cards")
- Generate bilingual EN/MR toggle components with Devanagari-first typography
- Generate the operational dashboard, historical search filters, master data CRUD forms
- Generate mobile-responsive layouts at the 3 breakpoints (1100px, 650px, 800px)
- Import `Dashboard_Visual_Reference.png` (Arjish/archive copy) and `design/panchavati-compv3.html` as design prompts
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
- Staff directory (176 rows semantic / 179 seeded — reconcile first, §2.4; 16/06/2026)
- Human-verified Page-1 HTML/XLSX for 10/09 + 11/09 (`reference/EXCEL_RECONSTRUCTION/`)
- Daily copy policy (`SEMANTIC/All Pages_Daily Copy Policy…md`)
- Visual mockups (`design/panchavati-compv3.html` — historical visual reference, **no longer a frozen baseline**, T30)

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

**TECH STACK (proposal — NOT approved):** React 19 + TypeScript + Tailwind CSS frontend, Fastify 5 + Kysely + TypeScript backend, PostgreSQL 17, Playwright for PDF. The current main repo instead runs vanilla JS + flat CSS + raw `pg` (§3.1); adopting this stack is a §7 decision awaiting user sign-off, and the user's stated direction is a **client-side Vite + React SPA (no SSR)** talking to the existing API.

---


---

## 7. Recommendations

> **⚠ All of §7 is an options menu, not a plan.** Nothing here is approved. The user reviews the brainstorm, picks options, and only then does any phase begin (user instruction, 2026-10-14: *ask before deciding*).
>
> **→ Read §10 first.** §10 (2026-10-15) turns this menu into a design-first workflow and says which row of it is actually worth doing; where §6–§7 and §10 disagree, §10 is the newer reading. The one §7 decision that gates everything downstream is §7.1 (Option A vs B).

### 7.1 Strategic Recommendation: Two-Phase Approach (options)

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

**Recommended (by analysis only): Option A with Option B as fallback — subject to user approval.** The main repo's `chart-html.ts` renderer and `chart-authoring.js` are heavily exercised (96 tests, print audit, live demo) — “battle-tested” is not claimed; the precise labels are *automated-test verified* + *browser verified* + *print verified* (§9). Start by porting Arjish's domain layer and API client using Cursor, then generate views with v0.

### 7.2 Priority Matrix (options — nothing scheduled until approved)

> Each row is a candidate work item. “Tool” = suggested instrument, not a commitment. Effort figures are rough estimates, not commitments.

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

**Recommendation (preliminary — validate before adopting):** Use AFFiNE concepts (floating nodes, auto-sort tables) to inform the **operational dashboard** design, but do not adopt AFFiNE directly. Instead, evaluate **React Flow** for a custom canvas for duty slot drag-and-drop and **Canvas Datagrid** for staff roster tables — both as research spikes (fit, maintenance, accessibility, licensing, bundle size) before they become dev dependencies.

| Tool | Use Case | Verdict (preliminary) |
|---|---|---|
| AFFiNE | Future operational dashboard canvas | Research spike (P3) — not for chart authoring |
| Focalboard | Task-oriented Kanban + table | Too simple; no infinite canvas |
| Vikunja | Task planning with views | Not relevant for police duty charts |
| React Flow | Custom canvas for slot drag-and-drop | **Candidate** — research spike before adopting for dashboard |
| Canvas Datagrid | High-performance table rendering | **Candidate** — research spike before adopting for roster tables |

### 7.6 Implementation Roadmap (draft — NOT approved; ordering TBD by user)

> ⚠ ChatGPT's fact-check (2026-10-14) correctly noted this roadmap jumped ahead of the site-wide brainstorm. It stays here as a menu of phases; the sitemap/design brainstorm (navbar, CRUD pages, editor interaction) comes first and is user-gated.

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

### 7.7 Conclusion (working hypothesis — not a decision)

The path under consideration: **Use Cursor to port Arjish's domain layer and typed API client into the main repo, use v0 to generate React views that match the user's dense visual feedback, and use Bolt only for isolated prototyping of OCR/WhatsApp features.** Preserve the 96 tests, no-loss 212/212 invariant, and print audit throughout. For the open-source canvas tooling question, React Flow and Canvas Datagrid remain research candidates; AFFiNE/Focalboard are currently assessed as not-a-fit for this project's print-optimized, Marathi-first, clerk-authority requirements. **None of this is approved until the user says so.**

---

## 8. Appendix: Key Files to Read

### 8.1 Source Evidence (Authority)

**Corrected authority order (per `AGENTS.md`, which overrides any earlier table):**
1. `reference/ORIGINAL_VISUAL/` PDFs/PNGs — visual authority.
2. `reference/EXCEL_RECONSTRUCTION/` — human-verified Unicode XLSX/HTML — exact text/cell authority **where reconstructed** (today only `10th_sept_daily_duty_chart_page_1/` and `11th_sept_daily_duty_chart_page_1/` — Page 1 only, two days only).
3. `reference/SEMANTIC/` — **secondary semantic aid, fallible (~1% error per user)** — NOT “exact text authority” as an earlier draft claimed.
4. `docs/` — decision authority for software behavior.
5. Research/analysis — input only.
6. Current code + passing tests — implementation truth, not source truth.

| File | Path (from main repo) | Establishes | Tier |
|---|---|---|---|
| 10/09 chart | `reference/ORIGINAL_VISUAL/10.pdf` (+ `…_pngs/`) | Visual authority, 6 source sheets | 1 |
| 11/09 chart | `reference/ORIGINAL_VISUAL/11.pdf` (+ `…_pngs/`) | Visual authority (with event page) | 1 |
| 12/09, 16/09 charts | `reference/ORIGINAL_VISUAL/12.pdf`, `16.pdf` | Visual authority | 1 |
| Staff directory (PDF) | `reference/ORIGINAL_VISUAL/Staff_Info.pdf` | Original staff list as printed | 1 |
| Human-verified Page 1 HTML/XLSX | `reference/EXCEL_RECONSTRUCTION/10th_sept_daily_duty_chart_page_1/` (and `11th_…`) | Exact text/cell for Page 1 of two days — **only place a “verbatim” claim is Tier-2 strong** | 2 |
| OCR baseline report | `DailyDutyPanchavati-ui-rebuild/NEW DATA/REPORT/` (self-contained: `README.md`, `images/`, `data/`) | Offline OCR evaluation for legacy import (North-Star M14+, page-1 baseline) — candidate text + method, not truth | 3 |
| 10/09, 11/09, 16/09 semantic | `reference/SEMANTIC/10.md`, `11.md`, `16.md` | Working transcription for navigation/hypotheses — verify before promoting to schema rules | 3 |
| Page 3–6 analyses | `reference/SEMANTIC/Page 3.md` … `Page 6.md` | Structure hypotheses for leave/matrix/officer/scan sections | 3 |
| Staff semantic | `reference/SEMANTIC/Staff_Info.md` | 176 rows (count needs reconciliation, §2.4) | 3 |
| Copy policy | `reference/SEMANTIC/All Pages_Daily Copy Policy for Panchavati Police Station Duty Chart.md` | Copy vs. recalculate ideas — secondary | 3 |
| Canonical reference data | `DailyDutyPanchavati-ui-rebuild/reference/PANCHAVATI_REFERENCE_DATA.v2.md` and the copy in `…/kushals repo/archive/` — **not present in this repo's `reference/`** | Cross-repo reference | 3 |

**Conflict rule:** preserve the discrepancy, identify source + date, ask the user when evidence cannot resolve it. Never turn an extraction or an agent's interpretation into a permanent database invariant.

### 8.2 Arjish Repo Key Files (paths relative to this repo's root)

| File | Path | Purpose |
|---|---|---|
| API client | `DailyDutyPanchavati-ui-rebuild/src/web/api/charts.ts` | ~39 typed endpoint wrappers |
| Domain layer | `DailyDutyPanchavati-ui-rebuild/src/server/domain/` | Operational, audit, rendering, search |
| Schema | `DailyDutyPanchavati-ui-rebuild/src/server/db/schema.generated.ts` | Kysely typed schema (44 generated interfaces) |
| Page 1 view | `DailyDutyPanchavati-ui-rebuild/src/web/Page1View.tsx` | Day shift authoring + तुलना comparison window |
| Page 2–6 views | `…/src/web/Page2View.tsx` … `Page6View.tsx` | Night / leave / matrix / officer / scan |
| Dashboard | `…/src/web/OperationalDashboardView.tsx` | Command center |
| Search | `…/src/web/HistoricalSearchView.tsx` | Multi-faceted search |
| Nav (hamburger-style) | `…/src/web/components/AppNav.tsx` | Arjish nav — overflow-menu pattern |
| Nav (grouped, no hamburger) | `…/NEW DATA/kushals repo/archive/src/web/components/AppNav.tsx` | Kushal nav — flat grouped dropdowns (`AppNav.tsx:571`) |
| Older standardized chart UI | `…/NEW DATA/kushals repo/archive/src/web/Standardized*.tsx` (4 files) | Kushal-only Stitch-era standardized format |
| North star docs | `…/NEW DATA/kushals repo/archive/POLICE_DUTY_REGISTER_PRODUCT_MVP_and_NORTH_STAR.md` + `Manual_North_Star_By_Kushal.md` | Problem statement source |
| OCR baseline report | `…/NEW DATA/REPORT/` | Self-contained OCR evaluation (images + raw outputs) |

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
| `docs/ARCHITECTURE.md` | How the pieces fit (note: `docs/IMPLEMENTATION_CONTRACT.md` was cited in an earlier draft but does not exist in this repo — it lives in the nested repos) |

---

## 9. Verification Log (2026-10-14)

Everything below was checked directly on disk / by running the repo's own tooling this day. Statuses used: **verified** (executed and observed), **on-disk** (file exists / content read, behavior not executed), **unverified** (claimed but not re-confirmed), **corrected** (earlier draft was wrong).

| # | Claim checked | Result |
|---|---|---|
| V1 | `npm run check` (typecheck + tests + doctor ×2 DBs) | **verified FAILING at session start** — two regressions from same-day commits; **fixed this session → 96/96 green** (see fix notes below) |
| V2 | `npm run print:audit` 6/6 sheets | **verified** — 655/496/685/663/579/664px, all ≤ 775px A4 landscape (dev server on :3100) |
| V3 | No-loss 212/212 | **verified** — part of green suite (`tests/render.test.ts`) |
| V4 | `npm run doctor` — 14 checks, seed counts | **verified** — ranks=17, staff=179, locations=15, duties=61, scan_cfg=30, 10/09 chart present |
| V5 | Repo hierarchy / nested paths (§1) | **verified** — all four repos exist at the stated paths |
| V6 | Kushal archive = copy of Arjish | **corrected** — `diff -rq`: 24 files differ; each side has unique files (v2 profiles + compare window only in Arjish; `Standardized*View.tsx` + grouped nav only in Kushal; migrations 18 vs 20) |
| V7 | Main repo migrations = 8 | **verified** — `db/migrations/0001–0008` |
| V8 | Arjish migrations = “20+” | **corrected** — 18 in Arjish, 20 in archive |
| V9 | Staff “169 across 12 ranks”, table sums 405 | **corrected** — Staff_Info.md has 176 numbered rows; our seed 179/17 ranks; old DB import 169; original table unreliable → §2.4 rewritten |
| V10 | §8.1 semantic = “Exact text authority” | **corrected** — AGENTS.md authority order restored; EXCEL_RECONSTRUCTION = Tier 2 (only Page 1, 10/09 + 11/09); OCR report located at `New DATA/REPORT/` |
| V11 | `reference/PANCHAVATI_REFERENCE_DATA.v2.md` in main repo | **corrected** — absent from this repo's `reference/`; exists only in Arjish root + archive |
| V12 | `docs/layout/page-1-layout-spec.md`, `reference/UI_V0/`, `Dashboard_Visual_Reference.png` (cited in §6) | **corrected** — none exist in main repo; UI_V0 + dashboard PNG live in archive/Arjish |
| V13 | `docs/IMPLEMENTATION_CONTRACT.md` (cited §8.3) | **corrected** — not in main `docs/`; exists in nested repos |
| V14 | North star claims (Kruti Dev 714, ISM V6, photos→WhatsApp, Telegram) | **on-disk verified** — `Manual_North_Star_By_Kushal.md` contains all of them verbatim |
| V15 | Durvesh = Flask + SQLite, `app.py` 190KB, `gen_duty_chart.js` | **on-disk verified** — `app.py` = 189,639 bytes; `.bat`/`.vbs` launchers present; **no `.exe` found** (corrected) |
| V16 | Badges 39/1061/1799/2699 absent from Staff_Info, kept as daily-source identities | **verified** — all four in `db/seed/0002_source_evidenced_staff.sql` |
| V17 | Rendered matrix cell = escaped `&lt;br&gt;` | **corrected** — renderer intentionally emits a REAL `<br>` (parts escaped separately) since commit `9e7db4f`; stale test assertion updated |
| V18 | `PGSSLMODE=require` in `db/migrate.ts` | **fix scoped, not removed** — user confirmed it exists for Render TLS; now gated on `DATABASE_URL` so Render deploy keeps TLS while local trust-auth tests connect normally |
| V19 | Arjish “Complete; all major features” / Playwright E2E | **unverified** — structure on disk only; suite not executed here |
| V20 | 7-sheet vs 6-sheet output | **corrected** — current renderer = 6 sheets (test asserts 6); the 7-sheet line in CURRENT_STATE is stale compact-v4 (doc contradiction logged, not yet cleaned) |

**Fix notes (both landed 2026-10-14, `npm run check` re-run green after each):**

1. **`db/migrate.ts`** — `process.env.PGSSLMODE = "require"` was set unconditionally at import time (commit `a87b4d1`, for Render's free Postgres). `tests/invariants.test.ts` imports this module, so every local test connection was forced to SSL → *“The server does not support SSL connections”* → 19 tests skipped/failed. Fix: gate on `if (process.env.DATABASE_URL)` — Render always sets it (deploy behavior unchanged), local dev/test never does.
2. **`tests/render.test.ts`** — asserted the old escaped output `12&lt;br&gt;04 Proण्`, but commit `9e7db4f` deliberately changed the renderer to re-emit a real `<br>` (literal “&lt;br&gt;” printing on paper was the reported bug; each part is still escaped, no injection possible). Fix: assert `12<br>04 Proण्` present and `12&lt;br&gt;04` absent.

**Known latent issue (not fixed here, needs a user/authority call):** the seed file `db/seed-chart-1009.ts` now writes `12<br>04 Pro.` + row-key `हजर मनुष्यबळ` (changed 2026-10-14 citing SEMANTIC Page 4 + 16.md), but the **test DB still holds the old values** (`Proण्` / `मनुश्यबळ` from SEMANTIC 10.md) and tests assert the old values. `npm run db:seed` on a fresh DB would break 3 test files. Evidence is split: `SEMANTIC/10.md` (the actual 10/09 source) says `Proण्`, `16.md` (different day) says `Pro.`, Tier-2 EXCEL reconstruction covers Page 1 only (matrix is Page 4-ish, outside reconstruction). → Record in OPEN_QUESTIONS before reseeding; do not guess.

---

## 10. The Brainstorm (2026-10-15) — design-first, real-data-first, measured

> **What this section is.** §1–§5 analyse, §6–§7 list tools and options, §8–§9 catalogue evidence. This section is the *brainstorm* those sections were missing: **the order of operations, which tool does which job, how the language switch works, how a chart-layout optimization actually gets measured, where manual tinkering should happen, and what the first design artifact should be.**
>
> **It deliberately respects three user decisions** (2026-10-14): finalized records are **versioned**; the **first design deliverable is flows** (not screens); and the chrome is **English-first with an EN|मराठी toggle** for UI and forms. Nothing here is approved — §7 still needs a sign-off, and §10 does not start any work.
>
> **Where §10 and §6–§7 disagree, §10 is the newer reading.** Its one-line thesis: **the printed sheet *is* the product; no design tool can design it — the chrome can be designed, the sheet has to be measured.**

### 10.1 The order of operations (and why this order, specifically)

The tempting order — open a design tool, mock screens, then wire data — is wrong for this product, and there is already evidence in this repo for why.

**Evidence: the mock lied.** `design/panchavati-compv3.html` fits every page on one A4 sheet only because its sample data is smaller than the real 10/09 chart. With the real 212 assignments the same visual grammar needed a print-density pass, an extra sheet, and six-column leave/court grids (OPEN_QUESTIONS T18, resolved 2026-10-12). A screenshot-clean design exploration on mock data would have reproduced that lie — and any AI design tool fed *that* mock would have produced a beautiful, unfittable design.

**The measured baseline (re-captured live 2026-10-15, this repo, dev server on :3100):**

| Signal | Measured value | Command |
|---|---|---|
| Sheets produced for 10/09 | **6** (sheet 1/3/4 dense) | `npm run print:audit` |
| Extent vs 775px A4 landscape | 655 · 496 · 685 · 663 · 579 · 664 | `npm run print:audit` |
| Slack per sheet (unused height) | **−120 · −279 · −90 · −112 · −196 · −111 px** | `npm run print:audit` |
| Fill ratio per sheet | 84.5% · **64.0%** · 88.4% · 85.5% · **74.7%** · 85.7% | derived from the above |
| Row no-loss | **212/212** | `npm run render:chart` |
| Suite + environment | typecheck + 96 tests + doctor ×2 DBs, green | `npm run check` |
| Seed shape | ranks 17 · staff 179 · locations 15 · duties 61 · scan_cfg 30 | `npm run doctor` |

So the design pipeline for *this* product is:

```
DATA (real 10/09, in a live route)
  → FLOWS (what the clerk does; artifact #1, user-chosen)
    → DENSITY SPEC (per-sheet row plan + numbers, artifact #2)
      → CHROME SPEC (navbar / forms / search / dashboard, artifact #3)
        → CODE (renderer + CSS + React surfaces)
          → VERIFY (print:audit ≤775px, 212/212, browser pass)
            ↺ iterate
```

| Stage | Artifact | Authority that already exists | Done-when gate |
|---|---|---|---|
| 0 · Truth | live chart route with real data | `server/render/chart-html.ts`, `db/seed-chart-1009.ts` | `npm run print:audit` prints 6 sheets; `render:chart` 212/212 |
| 1 · Flows | `docs/FLOWS.md` v1 | `DESIGN_INTERACTION_NOTES.md` §1–8, `PRODUCT_UI_ARCHITECTURE.md` §3/§7/§8 | every flow has entry / happy path / empty / error / exit written down |
| 2 · Density | `docs/DENSITY_SPEC.md` v1 | `DENSITY_AUDIT_1009.md`, `BRIEF_DENSE_TABLES.md`, `COMPACT_V4_DECISIONS.md` | each sheet has a row plan **and** a numeric budget |
| 3 · Chrome | `docs/CHROME_SPEC.md` v1 | `UI_SPEC.md`, `design/panchavati-compv3.*`, `COMPACT_V4_DECISIONS.md` | EN-first strings listed; every control maps to a flow |
| 4 · Code | renderer/CSS/React | the docs above | §7.1 approved, then the ordinary gates |
| 5 · Verify | evidence | `tools/print-audit.mjs` | all six sheets ≤ 775px, no row added/dropped |

**Rule that falls out of the table:** no design work happens on data that is not the real chart, and no design is "done" until a command in this repo says so.

### 10.2 Which tool does which job

| Job | Tool | Verdict | Why |
|---|---|---|---|
| The printed sheet (all 6) | **the repo's own renderer** (`server/render/chart-html.ts` + `web/authoring.css` + `print-audit`) | **Only candidate** | It is the print authority, it is measured, and its output is what the clerk prints. No design tool produces it. |
| Density exploration | `/dev/lab` scratch route (§10.6) + `print:audit` | **Build this** | One sheet at true A4 with a ruler overlay and a variant switch beats any canvas tool. |
| App chrome (navbar, toolbar, flyers) | CSS-first today; **React + Vite next** (§10.2 stack verdict) | **Recommended** | ~1 navbar + a handful of flyers; the grammar is settled but the implementation path is the one being replaced. |
| Chrome *if* the app grows to 13+ views (§7.1 Option B) | **Figma** (agent + Make + MCP/Code Connect) | **Option, not now** | Only pays off when there are many screens; then design there and hand-code, never export. |
| Concept exploration on a synthetic fixture | Google Stitch / Uizard | **Tolerated, low value** | Screenshot-to-screen tools are mobile/"vibe" oriented; they cannot express a 27-row banded print table. Use only for loose chrome ideas, never for the sheet. |
| Website sections | Relume, Framer | **Not applicable** | Website/marketing generators. |
| Repo-aware implementation | Cursor / Claude Code (this agent) | **Yes** | Has `npm run check` as an objective grader (§10.8). |

#### The full tool survey (every tool in `docs/External_UI_Tools.txt` + this doc's own list)

> **Added 2026-10-15** at the user's request: *cover every tool in the research file, not just Figma and Framer*. Columns: **Free?** (what the free tier actually is, October 2026) · **Local?** (*does my data have to leave the machine* — the project's hard rule) · **Verdict for Panchavati**.

**(a) Design canvases**

| Tool | What it is | Free? | Local? | Verdict |
|---|---|---|---|---|
| **Penpot** | The open-source Figma alternative | **Free + MPL-2.0**, self-host anywhere; Enterprise paid | **Yes — the only design canvas that can be fully local** (self-hosted + its self-hostable MCP server) | **The free/OSS design canvas to pick** *if* a canvas is ever needed. Exports CSS/HTML/SVG snippets, not React components. |
| **Brilliant Design** | Local-file design tool with JSX export | **Full tool free forever** (public projects, 2 GB); Personal $20/mo | Local files on disk — **not self-hosted but offline-capable**; its MCP can drive the canvas locally | **Strong candidate for hands-on tinkering**: real local files + JSX/HTML export. Proprietary, so no lock-in risk to the repo — its output is a starting point, never a build artifact. |
| **Open Design** (`nexu-io/open-design`) | Agent-driven prototype workspace | **Free + Apache-2.0**, Windows desktop + Docker | Local-first; offline depends on the model you point it at | Worth a look for agent-generated HTML prototypes. Verify the repo — "Open Design" is an ambiguous name. |
| **Figma** (design agent GA 2026-10-06, Make, MCP, Code Connect) | The industry canvas + design→code bridges | Starter **500 AI credits/mo**; Pro seat 3,000; Make ≈100+ credits per generated app | **No** — remote MCP endpoint (`mcp.figma.com`), Code Connect uploads repo metadata | **Only under §7.1 Option B** (13+ chrome screens), and only with a sanitized fixture (§10.8). Never for the printed sheet. |
| **Google Stitch** | AI design canvas + `DESIGN.md` | Free daily credits (no official pricing page; treat numbers as unverified) | **No** — cloud | Exploration only, on the geometry fixture. Its **`DESIGN.md` format is worth stealing** as the shape of our own fixture/spec file. |
| **Uizard** | Screenshot/wireframe → mockups, incl. desktop software | **3 AI generations/month**, 2 projects, 5 screens; Pro $12/mo (React handoff is paid) | **No** — cloud | No. Cannot express a 27-row banded print table. |
| **Relume** | Website sitemap/wireframes → React+Tailwind/shadcn export | Free with 30 React components; Starter $18/mo | **No** — cloud | No — website sections, not app grids. |
| **Flowstep** | Multi-screen user flows | Unverified | **No** — cloud | Maybe for the flows artifact *if* sanitized — but our flow list is 14 rows and can be drawn locally instead (see Excalidraw below). |
| **Moda** | Editable graphics/slides/PDFs | Free 500 credits/mo (**watermark on free exports**); Pro $30/mo | **No** — cloud | No — collateral, not app UI. |
| **Animos** | Animated templates | Pricing unverified | Cloud | No. |
| **Excalidraw** | Hand-drawn diagrams/wireframes | **Free/open-source**, works offline as a PWA | **Yes** (local-first; collaboration is the only networked part) | **Yes — for the flow diagrams** (artifact #1) and for quick wireframes of the popups. No code export, which is fine. |
| **tldraw** | Canvas SDK | Source-available: **production requires a license key** (100-day trial) | Local-capable | **Avoid** — the license trap. |
| **AFFiNE / Focalboard / Vikunja** | Notion-ish canvas / Kanban / task planner | OSS (AFFiNE AGPL-3.0) | Self-hostable | Unchanged from §7.5: AFFiNE concepts only; the others are not a fit. |

**(b) UI-generating AIs ("give me screens")**

| Tool | What it is | Free? | Local? | Verdict |
|---|---|---|---|---|
| **v0 (Vercel)** | Prompt → React/Tailwind/shadcn, **imports a GitHub repo**, branches + PRs | Free **7 messages/day** (or a $5 allowance); $20–30/mo | **No** — cloud sandbox | **Best of this group for generating chrome components into the real repo** — it can see our code. Ask for plain CSS, not Tailwind, and one component per message (7/day is tight). |
| **Bolt.new** | Full-stack generator + hosting + databases | Free **1M tokens/month** (300k/day), includes hosting and unlimited databases | **No** — cloud | **The sandbox for the CRUD/DB experiment** (§7 of `UI_HANDOFF_BRIEF.md`): clean schema, real CRUD, synthetic data. Never the real chart. |
| **Lovable** | Prompt → full-stack app with built-in backend or your Supabase | Free **5 build credits/day** (~30/mo) | **No** — cloud | Alternative sandbox. **Cannot import an existing repo** (sync only goes one way), and its Supabase integration has documented RLS footguns — fine for a throwaway prototype, wrong for us to build on. |
| **Figma Make** | Prompt → interactive app; can edit a local repo **in closed beta** | Starter 500 credits/mo (150/day cap) | No (beta local-repo flow is the exception) | Later, maybe. Its normal GitHub push only updates a repo Make itself created. |
| **Framer 3.0** | Hosted website builder with canvas agents | Basic $10/mo, Pro $30/mo (1,000/3,000 credits; ~300 credits per landing page) | **No** — hosted, **and no HTML export for self-hosting** | **Not usable here** — see the verdict below. Excellent for a public marketing/landing site if one is ever needed. |
| **Dovetail AI / UXia** | Synthetic-persona usability testing | Paid | No | Not yet — could test a *sanitized* fixture once flows exist. Low value for a one-clerk tool. |

**(c) Coding agents ("write it in my repo")**

| Tool | Free? | Runs offline? | Verdict |
|---|---|---|---|
| **Aider** | **Free, OSS** (you pay a model if cloud) | **Yes, with Ollama/LM Studio** — the only fully-local route | Best *free + local* option for careful, Git-reviewable edits. |
| **Cline** | **Free, OSS (Apache-2.0)** | **Yes, with a local model** | Good autonomous multi-file agent inside VS Code. |
| **Zed** | Editor free forever; Pro $10/mo | Yes — supports local providers | Fine free editor if its Windows build suits you. |
| **Claude Code / this agent** | Paid | No (prompts go to the provider) | What we are already using; the objective grader (`npm run check`) makes it effective here. |
| **Cursor** | Paid; Privacy Mode ≠ local | No | Not needed on top of what we have. |
| **Gemini CLI** | **Disputed** — the quota page says 1,000 req/day but Google's own notice says consumer sign-in stopped 2026-06-18 | No | Do not build a workflow on it without testing. |
| **GitHub Copilot Free** | 2,000 completions/month | No | Fallback completion only. |
| **Windsurf / Trae** | Free tier exists; both **unverified** (Windsurf's pricing page now redirects to Devin) | No | Unverified — ignore for planning. |
| ~~Roo Code~~ / ~~Void~~ / ~~Continue.dev~~ | **Dead**: Roo Code shut down 2026-05-15; Void deprecated; Continue.dev repo archived/read-only | — | Do not adopt. |

**(d) Libraries (all local code — none of these send anything anywhere)**

| Library | Licence | Verdict |
|---|---|---|
| **TanStack Table v8** (`react-table` v7 is its predecessor — the npm package name is the same family) | **MIT**, headless | **The table foundation if a React grid is built** — you own the markup, which print fidelity requires. Grouped/multi-row headers via nested column defs; `rowSpan` needs manual handling; **never print a virtualized table** (unrendered rows cannot print). |
| **MUI / MUI X Data Grid Community** | MIT core (Pro/Premium paid) | Alternative if speed beats fit; its Material grid fights the dense grammar, and print export ≠ matching the paper form. |
| **React Flow** | MIT | Candidate for a future canvas editing surface (unchanged from §7.5). |
| **Canvas Datagrid** | Verify licence before adopting | Candidate for very large rosters only. |
| **TanStack Charts 1.0/1.1** | **MIT** | Optional later; use its **SVG** path for print. Nothing in the north star needs charts today. |
| **Sanscript** (`@indic-transliteration/sanscript`) | **MIT**, pure JS | **Already in use** and the fix path for the transliteration complaint — offline, no API. Caveat: it is a *formal scheme converter*, not a Marathi spell-checker (no schwa deletion model for Marathi). |
| **AI4Bharat `@indic-transliterate`** | MIT component, **but its default mode calls an API** | **Do not use its default** — sending a typed name to a cloud endpoint violates the data rule. A local IndicXlit model would be a separate project. |
| **Aksharamukha / Aksharamukha.js** | AGPL-3.0 (original); JS package licence unverified | **Avoid** until the licence question is settled. |
| **typesafe-i18n** | **MIT**, ~1 kB | **Recommended for the EN-first chrome catalog** — generated types make a missing Marathi string a compile error. |
| **i18next + react-i18next** | **MIT**, ~22 kB | Alternative when ecosystem matters more than compile-time completeness. |
| **Lingui / FormatJS** | MIT / BSD-3 | Also fine; not needed for a two-language catalog. |
| **Devanagari fonts**: Noto Sans Devanagari (v2.007, Sep 2026, fixes Marathi **Rakar**), **Hind** (best for dense UI), Mukta, Tiro Devanagari Marathi (literary print) | **OFL-1.1** | **Self-host WOFF2; never a font CDN.** Baloo Bhai 2 / Gotu are **display** faces — not for duty-chart rows. |

**(e) Sources worth following** (the user asked for the creator list too): Mizko, DesignCourse, Michal Malewicz, Griffin Wooldridge, Juxtopposed, Punit Chawla — plus **Hacker News** (the ASCII-first sketching idea below), **r/UXDesign** and **r/LocalLLaMA** for workflow reality checks, and **Mobbin** for pattern references. Treat creator videos as *leads*: in the research run for this document, most YouTube/Reddit pages could not be read as text, so nothing here is attributed to a creator's specific claim.

**The practical shortlist for this project (free/OSS first):**

1. **Excalidraw** (free, offline) — draw the flow diagrams and popup wireframes by hand.
2. **Penpot** or **Brilliant** — only if a real canvas is wanted; Penpot to stay fully open-source, Brilliant for local files + JSX snippets.
3. **v0 free tier** — generate one chrome component at a time against the repo (7 messages/day).
4. **Bolt free tier** — a throwaway sandbox to prove a clean-schema CRUD flow.
5. **Aider/Cline + a local model** — the only route where nothing leaves the machine.
6. **Nothing at all for the six printed sheets.** They are measured, not designed.

#### The Framer vs Figma question, answered directly

**Framer does have AI support** — Framer 3.0 ships canvas agents that generate/revise pages and sections, work with your content, styles and CMS, and run SEO checks, billed in AI credits (Basic $10 / Pro $30 per month with 1,000 / 3,000 credits; ~300 credits for a landing page). **But Framer is the wrong tool for this project**: it is a *hosted website builder*, and Framer's own help says it does **not** offer HTML export for self-hosting. There is no path from Framer into a Fastify + PostgreSQL + server-rendered HTML repository, so its excellent AI sits on the wrong side of the wall.

**Figma is the better fit** for design-and-handoff work: its design agent went GA in October 2026, Figma Make turns prompts into an interactive app, and the **MCP server + Code Connect** let a coding agent consume real design context (components, variables, layout) and map it to real repo components — framework-agnostic, so a plain-CSS design system is not a blocker. Two caveats: (a) the "Make in your local codebase" flow that edits a real repository was in **closed beta** at the time of writing, and (b) the Bud acquisition (July 2026) is **not** a shipped Figma capability — the team was acquired, the product was shut down.

**The verdict for Panchavati:** *neither tool touches the sheet.* Use Figma **only if and when** the chrome grows into many screens (i.e. only under §7.1 Option B); otherwise the honest answer is that **the design tool this project needs is a ruler and a measurement script**, both of which it already has. Sources: [Framer agents](https://www.framer.com/agents/) · [Framer pricing](https://www.framer.com/pricing) · [Framer export policy](https://www.framer.com/help/articles/can-i-export-my-website-to-html-and-self-host-it/) · [Figma agent](https://help.figma.com/hc/en-us/articles/37998629035799-Work-with-the-Figma-agent-in-design-files) · [Figma Make](https://help.figma.com/hc/en-us/articles/31304412302231-Explore-Figma-Make) · [Figma MCP](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) · [Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect) · [Bud acquisition](https://techcrunch.com/2026/07/07/figma-acquires-team-behind-a-vibe-coding-app/).

**On libraries** (asked in the pasted research): if a real clerk-facing data grid ever needs to be built, **TanStack Table v8** is the fit — MIT, headless, you own the markup, which is exactly what a print-fidelity project requires. MUI X Data Grid Community is also MIT and comes with a print export, but its prebuilt Material grid fights the dense grammar. **TanStack Charts** (past 1.0, MIT, server-rendered SVG) is a later, optional addition — charts are not the paper form, and nothing in §2's north star needs them. Neither library sends data anywhere; TanStack is local code, which respects the project's data rule.

#### The stack verdict: React + Vite, not reload-per-edit HTML

The user's complaint is a real, dated diagnosis, not a preference: **the authoring UI is server-rendered HTML + vanilla JS, so every CSS or JS tweak costs a full page reload** — and the EN↔MR toggle (72 `data-lang` spans plus 41 in the client flyers) is hand-wired inside that same reload-bound code, which is exactly why it keeps breaking.

The fix is already half-present in the repo: `src/app/` is a **dormant React 19 + Vite stub** (`npm run build:app` builds it), and the server already exposes a REST API for everything the UI edits. So the direction is:

| Keep | Change |
|---|---|
| `server/render/chart-html.ts` as **print authority** (server-rendered, measured by `print:audit`) | The **authoring + chrome surfaces** move to a React SPA on **Vite** (`npm run dev` → HMR, state preserved, sub-50 ms updates, no reload) |
| The normalized B-layer tables + narrow REST API (already built) | The **language switch** becomes catalog-driven (typesafe-i18n) instead of duplicated inline spans |
| The 6 sheets' geometry and all invariants | The **date/nav/flyer** code that currently lives in a 110 kB `chart-authoring.js` becomes typed components |

Notes that make this cheap rather than risky: Vite does **not** type-check (run `tsc --noEmit --watch` beside it), React Fast Refresh still falls back to a full reload when a module's exports change shape, and the print path must **not** be re-implemented in React — a React print view that drifts from the server renderer would break the 212/212 and ≤775px guarantees. The safest split is therefore: **server renderer for what prints, React for what is clicked.**

This is a real migration decision, not a task for today (the user said explicitly: *don't fix it now, make sure the next build uses it*). It is logged as **OPEN_QUESTIONS T28**.

### 10.3 The language system: English-first chrome, Marathi sheet

The user's direction — *English-first UI and forms, with an EN|मराठी toggle* — is **half-built already** and the remaining half is small, provided the three text authorities are kept apart.

**Already in the repo (verified 2026-10-15):** the chrome markup carries **72 `data-lang` spans** — 36 MR/EN pairs — in `server/render/chart-html.ts` (e.g. `<span data-lang="mr">पंचवटी पोलीस ठाणे</span><span data-lang="en">Panchavati Police Station</span>`), and the client flyers in `web/chart-authoring.js` use the **same rule** for 41 more labels (the comment at `chart-authoring.js:288` states it: *one language at a time, no emoji*). The toggle shows one language at a time (never both), and it is **chrome-only — the chart always prints Marathi** (CURRENT_STATE 2026-10-13).

**Three text authorities — keep them apart:**

| # | Text | Language | Where it lives |
|---|---|---|---|
| 1 | **Chrome strings** (nav, toolbar, buttons, flyers, form labels, picker, toast, empty states) | **EN is the source; MR is a translation** | new: one catalog keyed by string id, consumed by the renderer + flyers |
| 2 | **Chart presentation text** (section titles, role labels, column heads, sign-off block) | **Marathi only** on the sheet; tooltips may carry the full form | Layer C — `template_versions.labels` + `charts.presentation_overrides` (already exists) |
| 3 | **Chart data** (names, notices, duties, matrix numbers) | **Marathi source text, never translated, never transliterated silently** | Layer A staff masters + Layer B chart rows |

**What is actually missing (the work item):**

1. **Extract the inline pairs into one catalog** — today the strings are hand-written pairs scattered across the renderer and the client JS, so the chrome cannot be reviewed as a language set and a new control can ship with one language missing. One catalog, `en` complete and authoritative, `mr` verified, is the EN-first refactor.
2. **Finish the coverage, and flip the source direction.** The mechanism is shared but partial: some strings are still hard-coded Marathi with no EN twin (e.g. the flyer title `कर्मचारी निवडा`, several `aria-label`s in `web/chart-authoring.js`). EN-first means every chrome string resolves through the catalog, with Marathi as the translation rather than the source.
3. **Default = EN, with a remembered choice.** Decide where the clerk's toggle is stored (per-browser or per-user) — **OPEN_QUESTIONS T27**.
4. **Flip the page default** — `<html lang="mr">` (`chart-html.ts:1152`) becomes `en` for the chrome, while the sheet's own container keeps `lang="mr"` (a printed sheet is Marathi by definition, whatever the chrome shows).

**Hard rules unchanged:** protected tokens (CCTNS, Dial 112 MERS, DB, MERS, TOTAL, Office, ME, PI/API/PSI/GPS/ASI/LASI/HC/LHC/PN/PC/LPC) are never translated; Devanagari digits stay a display transform; `बिमा` is never `विमा`; and the sheet itself never switches language.

**Do not decide yet:** whether chart-local text (element names, notice lines, free-table titles) gets a *stored* English twin. That is **T22.1**, still open — today the Latin field is an entry aid, and nothing is stored as a twin.

### 10.4 The layout optimization loop (real data, measured)

This is the "optimized chart layout with real data" the user asked for, as a loop rather than an opinion.

**The objective function (all measurable today):**

| Metric | Target | Current | Where measured |
|---|---|---|---|
| Sheets | 6 normal days; 7 only for event/day with an annex | 6 | `print:audit` + `tests/render.test.ts` |
| Per-sheet extent | ≤ 775px (A4 landscape; 794 − 19px padding) | 655/496/685/663/579/664 | `print:audit` |
| No row added/dropped | 212/212 exactly once | 212/212 | `render:chart` |
| Page-level horizontal overflow | 0 | 0 | browser/print check |
| Minimum print type | ≥ 9.5px | 9.5–10px on dense sheets | CSS + T18 decision |
| Largest internal gap | ≲ 80px (from `BRIEF_DENSE_TABLES` §5) | **not yet instrumented** | *new metric* |
| Ink coverage / photo legibility | *to be defined on the first measurement* | **not yet instrumented** | `tools/png-ink.py` exists |

**The single most important insight: slack is a budget, not waste.** Sheets 2 and 5 have 279px and 196px of unused height — but the north-star workflow is *print → photograph → WhatsApp*, so a sheet's real reader is looking at a phone photo of paper. A page with 36% slack is a page whose type could be **larger**, not a page that needs more content squeezed in. So the loop has two legitimate moves and one forbidden one:

- **Allowed:** spend slack on legibility (type scale / leading / band spacing) — decide per sheet.
- **Allowed:** re-balance sheets — move content from a sheet at 88% fill (sheet 3) toward a sparse neighbour (sheet 2 or 5) when the sheet boundaries allow it.
- **Forbidden:** dropping, merging or reclassifying rows to make a sheet fuller (no-loss rule), or inventing content to fill whitespace.

**Candidate queue, ranked by measured slack:**

| Order | Sheet | Slack | What to try first |
|---|---|---|---|
| 1 | Sheet 2 | −279px (64% fill) | absorb sheet-3 pressure or raise the type scale of the scan/session cards |
| 2 | Sheet 5 | −196px (75% fill) | notices + officer summary; candidates for absorption of sheet-6 summary rows |
| 3 | Sheet 1 | −120px | dense already — leave unless type grows |
| 4 | Sheet 4 | −112px | leave/court grids, currently 6 columns in print (T18) |
| 5 | Sheet 6 | −111px | manpower + ledger |
| 6 | Sheet 3 | −90px (88% fill) | the *source* of pressure — look here for what to move out |

**Loop mechanics (one sheet per iteration):**

1. Pick exactly one sheet from the queue.
2. Render a variant behind a **dev-only** switch (a `?variant=` query parameter read by the renderer; **never** a Layer C `presentation_overrides` write — variants are not chart data and must not leak into the domain).
3. Run the grader: `npm run print:audit` (extent + slack), `npm run render:chart` (212/212), screenshot the sheet (`tools/print-pages.mjs`).
4. Compare **on the same real 10/09 data**, then keep or drop.
5. Record the outcome in the density spec's variant log (one line: variant, sheet, before/after extent, kept/rejected, reason).

**Instrumentation to add before this loop is worth running** (small, self-contained, no domain change): teach `tools/print-audit.mjs` to also print **fill ratio**, **largest internal gap** and **ink coverage** per sheet. Right now it prints `extent 496px (-279px vs the sheet)` — the interface is already the right shape; the extra numbers just make the grader complete. Until then the loop's "before/after" is one number, not a curve.

### 10.5 System-design planning: what "design first" concretely produces

Design-first fails when it produces pictures. It works when it produces **versioned written artifacts with numbers and states**, which is also what this repo already does everywhere else (COMPACT_V4_DECISIONS.md, UI_SPEC.md, BRIEF_DENSE_TABLES.md).

The user chose **flows** as deliverable #1. The flow inventory should be assembled from what already exists rather than invented:

| # | Flow | Already specified in | Missing |
|---|---|---|---|
| F1 | Open today's chart (preview) | PRODUCT_UI_ARCHITECTURE §2 | — |
| F2 | Enter/leave edit mode, save-state | DESIGN_INTERACTION_NOTES frame | — |
| F3 | Assign a person (pick / replace) | DESIGN_INTERACTION_NOTES §1, §3 | — |
| F4 | Create a staff member in context | DESIGN_INTERACTION_NOTES §2 | — |
| F5 | Clear a seat → रिक्त | DESIGN_INTERACTION_NOTES §4 | — |
| F6 | Toggle बिमा (never inferred) | DESIGN_INTERACTION_NOTES §5 | — |
| F7 | Close a chowki/column → बंद + चार्ज → | DESIGN_INTERACTION_NOTES §6 | — |
| F8 | Contextual `+` (add person / officer box / chowki) | DESIGN_INTERACTION_NOTES §7–8 | — |
| F9 | Switch date / create from previous | PRODUCT_UI_ARCHITECTURE §3 | copy-findings presentation |
| F10 | Finalize / amend (version) | PRODUCT_UI_ARCHITECTURE §9 | the *screen* for version history |
| F11 | Print / PDF | §7 of this doc (print authority) | browser print affordance spec |
| F12 | Search historical charts | **T24 — read Kushal's `HistoricalSearchView.tsx` first** | the whole screen |
| F13 | Master data CRUD | PRODUCT_UI_ARCHITECTURE §5 | the whole screen set |
| F14 | Dashboard / duty board (WIP leaves) | badge exists, implementation does not | the whole screen set |

So deliverable #1 is **assembly + 4 unwritten flows (F11–F14)**, not a blank sheet. Each flow needs: entry point, happy path, empty state, error/conflict state, exit, and the *data decision* it depends on. That is a day of writing, not a design project — and it is the artifact that makes the chrome spec cheap to write.

### 10.6 Where manual tinkering should happen (the dev lab)

The user wants to get hands dirty by hand. The surfaces that exist today:

| Surface | What it is |
|---|---|
| `http://127.0.0.1:3100/charts/2026-09-10` | the real chart, live (server-rendered) |
| `http://127.0.0.1:3100/design/panchavati-compv3.html` | the compact-v3 mock — **a historical visual reference, NOT a frozen baseline** (user, 2026-10-15: *v3 is not a frozen mock anymore, we have problems, that's why I'm optimizing the current render design*) |
| `http://127.0.0.1:3100/legacy/2026-09-10` | the old six-page app, linked only (T19) |
| `web/authoring.css` | dense print/screen CSS — the real tinkering surface |
| `npm run print:audit` / `tools/print-pages.mjs` | heights, and per-sheet PNGs |
| `tools/density-audit-1009.mjs` | DOM geometry on the live page |

The missing surface is small and worth building first: **`/dev/lab`** — render **one sheet** at true A4 (1122×794) with (a) a mm/px ruler and the 775px extent line drawn over the page, (b) markers for any gap over ~80px, (c) a variant selector, and (d) a side-by-side compare. That turns hand-tinkering from "change CSS and squint" into "change CSS and read the number", and it is a *dev-only route* — no domain, no migration, no risk to the print authority.

Why not tinker inside a design tool instead: everything in this repo's UI is either (i) the print grammar of the six measured sheets — which no canvas tool reproduces, or (ii) a thin chrome whose source of truth is CSS + server-rendered HTML. A tool that cannot export into that stack turns hand-tinkering into re-typing. (Once the chrome is React + Vite per §10.2, this calculus changes for the chrome only — hot reload tinkering gets *better*, not worse.)

### 10.7 The AI-tool workflow, calibrated to this repo

The pasted research's "3-level AI integration" maps cleanly, and this repo is unusually well set up for levels 2–3 because it owns an **objective grader**:

| Level | What it means here | Asset that already exists |
|---|---|---|
| L1 · Prompt | Write spec text (flows, density budgets, chrome copy) from docs | the whole `docs/` corpus + `reference/SEMANTIC` (secondary, ~1% error, T10/§8.1) |
| L2 · Chained | agent edits → `npm run check` → `print:audit` → screenshot → next edit | `npm run check`, `print:audit`, `render:chart`, `doctor` |
| L3 · Agentic | skills that carry the *method*, not just the prompt | `skills/` (source-forensics, db-change, current-chart-ui, print-check, verify-slice, session-handoff, event-annex) |

**On the `design.md` anchor hack from the research — do not adopt it.** The counter-argument in the same research is the correct one: a single thin markdown file fails on complex systems and long files confuse the model; targeted, modular skills win. This repo *already implements that shape*: `AGENTS.md` = rules and hard constraints, `docs/UI_SPEC.md` = element/component grammar, `COMPACT_V4_DECISIONS.md` = token + rejected-approach record, `web/authoring.css` = the actual tokens, `skills/` = method. Adding a `design.md` would create a fifth partial source of truth.

**Two skills worth adding** (the method, not the prompt):

- `layout-variant` — the §10.4 loop: pick a sheet, render a dev variant, run the grader, compare before/after on the same data, record keep/drop.
- `design-flow-spec` — produce/maintain a flow entry with entry, happy path, empty, error, exit, and the data decision it depends on.

**And the drift audit:** the research's best practical tip is auditing designs for *drift* from the source of truth. This repo already has the pattern (`docs/COHERENCE_AUDIT_1013.md`) — repeat it after each design pass, comparing the specs against the renderer, not against each other.

### 10.8 The privacy boundary — the constraint the pasted research ignores

Every tool in the pasted research is a hosted service, and this project's hard rule is that **no police operational data leaves the machine** (AGENTS.md; the only exception is the demo deployment of the station's own 10/09 chart, T23). A setting that stops *training* is not a setting that stops *transmission* — Figma's MCP endpoint is remote, Stitch/Uizard/Relume are online, v0 runs in a cloud sandbox, and even local editors send prompts to a model provider.

**Therefore the rule for design tools:**

1. **Never** feed a real chart, a real printed-sheet screenshot, a real staff name, or a database connection to a hosted design tool or MCP server.
2. **Do** use a **geometry-true, data-free fixture** for exploration — but note the trap: `docs/STITCH_BRIEF.md`'s COMMON BLOCK + SAMPLE PEOPLE block has exactly the right *shape* (six chowkis in fixed order, rank + buckle + surname geometry, the fixed state vocabulary) and its own header calls them sample people, yet several of those names are **real personnel from the source chart** (e.g. `वपोनि गजेंद्र पाटील`). So do not paste it: reuse its *geometry* with invented names. The fixture spec lives in `docs/UI_HANDOFF_BRIEF.md` §8.
3. Anything that reaches a hosted tool must first pass the check: *could a stranger learn anything operational from this?* If yes, it does not go.

That is a real cost — it means the "paste the design tool a screenshot of my app" workflow is off the table — and it is worth an explicit decision rather than an assumption: **OPEN_QUESTIONS T26**.

### 10.9 Recommended next steps (small, verifiable, in order)

1. **Build `/dev/lab`** (one sheet, true A4, ruler + extent line + gap markers + variant switch). Small, dev-only, no domain change; it is the tool the user's "hands dirty" ask actually needs.
2. **Extend `tools/print-audit.mjs`** with fill ratio, largest internal gap and ink coverage per sheet — the grader for the loop.
3. **Write `docs/FLOWS.md` v1** (deliverable #1): assemble F1–F10 from the existing interaction docs, write F11–F14, flag the data decision behind each. No code.
4. **Freeze the §7.1 decision** (Option A vs B). Everything about chrome scope — including whether Figma is worth adopting at all — hangs on this one choice.
5. **Then** the density spec (artifact #2) with a numeric budget per sheet, and only then a design tool, and only on the sanitized fixture.

**What I would do first, if asked:** steps 1–3, in that order. They are each under a day, they produce artifacts the user can react to, and none of them commits the project to a design tool.

### 10.10 Community-sourced working tips (and what to ignore)

Researched 2026-10-15 across vendor docs, Hacker News, practitioner blogs and creator channels (Reddit blocked automated reading, so no Reddit claim is presented as verified).

**Do:**

- **Sketch in ASCII/text before generating.** Draw the intended layout in characters, decide structure and states, *then* let the UI AI style it (Hacker News *ASCII-driven development* discussion). This matches how §10.5 already works: flows and row plans are text artifacts.
- **Specify geometry, not vibes.** "Dense operations console, 1440×900, 224 px left nav, 36 px row height, sticky header, fixed column widths, subtle rules, no hero, no cards" beats "make a dashboard" — v0's own guide says vague visual intent gets filled with generic defaults.
- **One component per prompt, one change per turn.** Both v0 and Bolt guidance: broad "make it better" edits disturb unrelated regions.
- **Hand the tool real components, not a mood board.** Bolt's design-system docs say *code* is the stronger context than documentation alone — so for us: paste the actual CSS tokens and one real rendered sheet, not adjectives.
- **Promote a sanitized fixture into a single file** and reuse it across tools (shape stolen from Stitch's `DESIGN.md` idea; hostile to nothing, and it keeps the data rule).
- **Read the real PDF/print result, never a screen screenshot.** Our `print:audit` + `tools/print-pages.mjs` already do this; any UI-AI-generated chrome must be checked against the same gate.
- **Verify "CRUD" before believing it.** Generated apps frequently fake persistence; ask for a named schema + a test that survives refresh, then verify the database (Bolt/Lovable sandboxes especially). Lovable's own Supabase docs warn that missing row-level-security policies can expose data — a throwaway sandbox is fine, a real deployment is not.
- **Legibility is measurable even without a universal rule.** There is no WCAG minimum font size, but general print guidance lands at ~11–12 pt body text (16 pt for low-vision audiences), and WCAG's contrast floor is 4.5:1. Our dense sheets print at 9.5–10 px — **that gap is the real argument for spending the measured slack (§10.4) on type size**, and the acceptance test is a *phone photo of the printed sheet*, not a screenshot.
- **Keep authoring on the printed geometry, with editing as overlays.** Practitioners do not agree on one-view vs two-views WYSIWYG, but the safe pattern is: real page size / section order / page breaks preserved while editing, controls as overlay affordances that never print, and a separate print-preview verification step (which this repo already has as a command).

**Ignore:**

- **A single `design.md` as the source of truth** — the same research that popularised it also shows it fails on complex systems and confuses models when long. This repo already has the modular version (rules → `AGENTS.md`, components → `docs/UI_SPEC.md`, rejected approaches → `COMPACT_V4_DECISIONS.md`, tokens → `web/authoring.css`, method → `skills/`).
- **Tailwind/shadcn as a "design system"** — they are implementation defaults, not a house style, and this project deliberately prints from flat CSS.
- **Screenshot-only prompting** — the tool guesses which of geometry/hierarchy/colour you meant; say which, and say what must *not* change.
- **Marketing-site tooling for an internal tool** (Relume, Framer, hero/landing generators).

**The one artefact this section produced beyond the analysis:** `docs/UI_HANDOFF_BRIEF.md` — the interface/CRUD/interaction specification written *as ready-to-paste prompts* for Figma Make / v0 / Bolt / Lovable / Stitch, grounded in the real `ChartDocument` shapes and a current-vs-legacy layout comparison.

---
