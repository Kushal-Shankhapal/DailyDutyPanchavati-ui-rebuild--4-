<!--
Purpose: Comprehensive A-to-Z development plan — the full path from the current verified state (P0 DB foundation + P1 renderer v1) to a complete, usable application.
Current role: Master plan for the entire remaining build; single source of truth for what comes next.
Last meaningful change: 2026-10-08 — created from AGENTS.md, all docs/, all code, all evidence.
Constraint/dependency: AGENTS.md hard rules; compact-v3 design frozen; PRODUCT_UI_ARCHITECTURE §14 four deferred decisions have explicit defaults; T10/T11/T12/T14 remain open but non-blocking.
-->

# A-TO-Z DEVELOPMENT PLAN

## Table of contents

[0. Current state summary](#0-current-state-summary)
[1. Phase roadmap at a glance](#1-phase-roadmap-at-a-glance)
[2. Phase P2 — Fastify server layer](#2-phase-p2---fastify-server-layer)
[3. Phase P3 — Authoring UI (React)](#3-phase-p3---authoring-ui-react)
[4. Phase P4 — Master Data UI](#4-phase-p4---master-data-ui)
[5. Phase P5 — History, search, lifecycle, PDF](#5-phase-p5---history-search-lifecycle-pdf)
[6. Phase P6 — 11/09 events + annex](#6-phase-p6---1109-events--annex)
[7. Phase P7 — Production hardening](#7-phase-p7---production-hardening)
[8. Cross-cutting concerns](#8-cross-cutting-concerns)
[9. Verification strategy](#9-verification-strategy)
[10. Risk register](#10-risk-register)

---

## 0. Current state summary

### What is already built and verified (as of 2026-10-08)

**Database (P0 — complete):**
- 7 forward-only migrations with SHA-256 checksum guard — `db/migrations/0001` through `0007`
- Layer A seeds: 17 ranks · 179 staff · 15 locations · 4 units · 56 duties · 30 scan config rows · 1 template + version
- 10/09 chart seed from `reference/SEMANTIC/10.md` (content authority) — 212 assignments, 10 बिमा, 2 रिक्त, 7 loc-states, 28 notices, 240 manpower cells, 15 officer rows, 12 scan rows
- Immutability triggers: `chart_versions` append-only; working table freeze when FINALIZED; lifecycle monotonic DRAFT→VALIDATED→FINALIZED (FINALIZED→DRAFT only via amendment reopen)
- Invariants: रिक्त ≠ बंद ≠ बिमा (explicit CHECKs); BIMA per-assignment boolean never derived; no notes_mr parsing for meaning

**Server — domain + projection (P1 slice 1 — complete):**
- `server/chart-document.ts` — typed `ChartDocument` (15 sections), `projectChart()` (normalized B → document with Layer-A resolved at projection time), `weekdayMr()` (D-rule), `resolveNode()` (chart overrides → pinned template → defaults), `getSnapshot()` (reprint read path)
- `server/finalize.ts` — `finalizeChart()` (row lock → project → version_no = prev+1 → JSON snapshot → FINALIZED; round-trips through getSnapshot) + `reopenForAmendment()` (FINALIZED→DRAFT)
- `server/render/chart-html.ts` — full 5-page HTML renderer producing the compact board from a ChartDocument: page 1 (Sr-PI + day/night/office/court band), page 2 (chowki/marshal blocks), page 3 (availability + notices), page 4 (manpower matrix + sudden-change ledger), page 5 (officer summary + scan schedule + sign-off)

**Tests (P1 slice 1 — complete):**
- `tests/chart-document.test.ts` — 12 tests: projection fidelity vs seeded source, template pinning + overrides, finalize snapshot immutability + master-edit independence, amendment chain
- `tests/render.test.ts` — 7 tests: no-loss accounting (212 rows rendered), Devanagari digits on date line, protected tokens (Dial 112, CCTNS), verbatim matrix cells (`12<br>04 Proण्`), रिक्त/बिमा/बंद chips, key sections present, 5 pages
- `tests/invariants.test.ts` — 19 tests: seeded counts vs source, CHECK rejections, schema-shape assertions, lifecycle transitions, migration checksum equality, static scan (no auto-assign, no notes parsing)
- Total: **38 tests, all passing**

**What does NOT yet exist:**
- Fastify server with HTTP routes (no `/charts`, `/api`, or print endpoints)
- React UI (`web/` folder does not exist yet — the project has only Node/TypeScript for server and tests)
- Copy-previous from yesterday's chart (S4 Tomorrow flow)
- 11/09 event authoring + annex page
- Master Data CRUD UI (S7)
- History list (S5) or search (S6)
- Multi-user auth (single shared clerk for MVP, per T1)

### Key architectural decisions already settled

1. **T13 (hybrid model)** — normalized B tables while editing → typed ChartDocument projection → immutable `chart_versions.document_json` snapshot at FINALIZE. Finalized reprints render from snapshot only.
2. **"या तकट्यासाठी" (this-chart-only)** — lives in `daily_charts.presentation_overrides JSONB`, resolved chart-overrides → pinned template version → renderer defaults.
3. **Compact-v3 visual baseline** — `design/compv3.css` + `design/panchavati-compv3.html` are FROZEN. No further chart redesign. The server renderer (`chart-html.ts`) already implements the 5-page compact grammar.
4. **Four deferred decisions (PRODUCT_UI_ARCHITECTURE §14):** T10 transliteration = manual dual-entry (name_mr required, name_en optional); T11 eligibility = toggle shipped disabled (Coming Soon); T9 template rights = any clerk now; T12 template sharing = station-shared.
5. **Single clerk user** for MVP (T1); no RBAC, no concurrency control beyond last-save-wins.
6. **No external APIs** at runtime — PostgreSQL local only, Playwright local for PDF.

---

## 1. Phase roadmap at a glance

```
P0 ✅  Database foundation          (DONE 2026-10-08)
  ├── migrations 0001–0007
  ├── Layer-A seeds
  ├── 10/09 chart seed
  └── invariant tests + doctor

P1 ✅  Server domain + projection   (DONE 2026-10-08, slice 1)
  ├── server/chart-document.ts (projection + snapshot read)
  ├── server/finalize.ts (finalize + reopen)
  └── server/render/chart-html.ts (5-page HTML renderer)

P2 🚧  Fastify server layer          (NEXT — 2–3 days)
  ├── server/routes/         HTTP REST endpoints
  ├── server/server.ts       Fastify app bootstrap
  ├── server/middleware/     lifecycle guards
  ├── db/operations/         server-side mutation functions
  └── server/index.ts        entry point (replaces scripts/render-chart.ts)

P3     Authoring UI (React)          (4–5 days)
  ├── web/                  Vite + React + Tailwind
  ├── components/chart/     read-only render from ChartDocument JSON
  ├── components/edit/      edit-mode affordances (never printed)
  └── lib/                  api client + chartDocument types

P4     Master Data UI               (2 days)
  ├── /master/staff, /master/ranks, /master/duties, /master/locations

P5     History, search, lifecycle   (2–3 days)
  ├── /charts (history list)
  ├── /search
  ├── lifecycle actions (validate/finalize/amend)
  └── PDF export (Playwright)

P6     11/09 events + annex         (1–2 days)
  ├── special_events CRUD
  └── event annex page in renderer

P7     Production hardening         (1 day)
  ├── installer script (npm)
  ├── Electron wrapper (optional, for local desktop)
  ├── docs cleanup
  └── A-to-Z verification
```

### Estimated timeline

Assuming single-developer velocity with daily verification:
- **P2**: 2–3 days (server layer + route tests)
- **P3**: 4–5 days (React board + edit mode)
- **P4**: 2 days (master data CRUD)
- **P5**: 2–3 days (history/search/lifecycle/PDF)
- **P6**: 1–2 days (events + annex)
- **P7**: 1 day (packaging/hardening)

**Total**: ~12–16 development days to full v1.

---

## 2. Phase P2 — Fastify server layer

### 2.1 Files to create

| File | Purpose |
|---|---|
| `server/server.ts` | Fastify app bootstrap: register plugins, error handler, lifecycle hooks |
| `server/index.ts` | CLI entry point — starts the HTTP server on `PORT` (default 3000), connects pool |
| `server/routes/charts.ts` | GET /api/charts (list), GET /api/charts/:date (today + history by date), POST /api/charts (create blank), POST /api/charts/:date/copy (copy-previous) |
| `server/routes/chart/:id.ts` | GET /api/charts/:id/document (projection), GET /api/charts/:id/snapshot (finalized snapshot), POST /api/charts/:id/validate, POST /api/charts/:id/finalize, POST /api/charts/:id/reopen (amend) |
| `server/routes/slots.ts` | POST /api/assignments/:id/assign (set person), DELETE (clear -> rikt), PATCH (toggle bima) |
| `server/routes/staff.ts` | GET /api/staff (list), GET /api/staff/search?q= (picker search), POST /api/staff (mini-create from picker) |
| `server/routes/masters.ts` | GET /api/masters (ranks, units, duties for dropdowns) |
| `server/routes/print.ts` | GET /api/charts/:id/print (HTML), GET /api/charts/:id/print.pdf (Playwright PDF) |
| `server/middleware/lifecycle.ts` | Middleware: 409 if FINALIZED on mutating routes, 400 on illegal lifecycle actions |
| `db/operations/chart-mutations.ts` | Server-side mutation functions (assign person, clear slot, toggle bima, set loc state, reopen) — all wrapped in transactions with audit trail |

### 2.2 API contract

All endpoints return JSON with `{ data, meta?, error? }` pattern. Lifecycle actions return `{ before, after }` so the UI can update optimistically.

Key endpoints:

GET  /api/charts                    → ChartListItem[] (date, lifecycle, version)
GET  /api/charts/today              → redirect to /charts/<today>
GET  /api/charts/:date/document     → ChartDocument (projection if DRAFT/VALIDATED, snapshot if FINALIZED)
POST /api/charts                    → create new DRAFT chart (date provided)
POST /api/charts/:date/copy          → copy-previous (source chart_id provided, returns conflicts)
POST /api/charts/:id/validate        → run domain validation, return warnings + errors
POST /api/charts/:id/finalize        → finalize (409 if already FINALIZED)
POST /api/charts/:id/reopen          → reopen for amendment (FINALIZED→DRAFT)
GET  /api/staff                     → staff list for master table
GET  /api/staff/search?q=           → search by name/buckle/rank
POST /api/staff                     → create staff member
GET  /api/assignments/:id           → slot detail
PATCH /api/assignments/:id          → assign/replace staff (records sudden_duty_change)
DELETE /api/assignments/:id         → clear → rikt
PATCH /api/assignments/:id/bima     → toggle bima boolean
PATCH /api/locations/:id/state      → set closed/charge for a location+shift
GET  /api/masters/ranks             → rank dropdown values
GET  /api/masters/duties            → duty definitions
GET  /api/masters/locations          → locations for assign/location
GET  /api/charts/:id/print           → HTML (print view, same renderer)
GET  /api/charts/:id/print.pdf       → PDF (Playwright)
GET  /api/charts/:id/versions         → version history list

### 2.3 Server bootstrap

`server/server.ts`:
- `import Fastify from 'fastify'`
- Register `@fastify/cors` (dev only, localhost)
- Register `@fastify/sensible` for HTTP error helpers
- Error handler: log to stdout in dev, swallow internals in prod (no data leak)
- Health check: `GET /api/health` → `{ status: "ok", version }`
- Register route files from `server/routes/`
- Export `buildApp()` for testing

`server/index.ts`:
- Read `PORT` from env (default 3000)
- Listen on `127.0.0.1` only (no external exposure)
- Log "Server running at http://127.0.0.1:3000"
- Graceful shutdown on SIGTERM (close pool)

### 2.4 Mutation operations (db/operations/chart-mutations.ts)

All mutations wrapped in `BEGIN/COMMIT` with rollback on error. Audit trail via `sudden_duty_changes` ledger.

```typescript
interface AssignPersonInput {
  chartId: number;
  assignmentId: number;
  staffId: number | null;       // null = clear → rikt
  notesMr: string | null;       // clerk reason for sudden change
}

interface ToggleBimaInput {
  chartId: number;
  assignmentId: number;
  isBima: boolean;
}

interface SetLocationStateInput {
  chartId: number;
  locationId: number;
  shift: 'DAY' | 'NIGHT';
  isClosed: boolean;
  chargeDestinationId: number | null;
}
```

Each function checks lifecycle (only DRAFT/VALIDATED mutable) before proceeding. If replacing a person on a filled slot, append to `sudden_duty_changes`.

### 2.5 Print route

`server/routes/print.ts`: uses `projectChart()` or `getSnapshot()` depending on lifecycle, then `renderChart()` from `server/render/chart-html.ts`, injects `design/compv3.css` inline or via `<link>`, returns HTML string.

PDF route: uses Playwright (chromium headless) to render the HTML → PDF buffer. Same pattern as old repo's `print/pdf.ts` but simplified.

### 2.6 Test plan for P2

- `tests/api.test.ts` — integration tests against the real test DB via Fastify inject:
  - Project 10/09 chart as FINALIZED, verify snapshot path works
  - Assign person to a rikt slot, verify row updates + sudden_duty_changes entry
  - Attempt mutation on FINALIZED chart → expect 409
  - Toggle bima, verify boolean flips
  - Set location closed + charge, verify location_operational_states row
  - Copy 10/09 → 11/09, verify conflicts flagged, source hash unchanged
  - Finalize → reopen → finalize, verify version chain


---

## 3. Phase P3 — Authoring UI (React)

### 3.1 Why React (not continued server-side HTML)

The renderer (`chart-html.ts`) produces the print/read preview from a `ChartDocument`. The editing UI needs:
- Client-side state (draft edits before save)
- Picker/popover interactions (StaffPicker anchored to slot)
- Focus management (tab order, keyboard navigation)
- Mobile touch targets + responsive collapse

React 19 + Vite + Tailwind 4 is the right tool. The server renderer stays as the **print/preview** path; React is the **editing** path. Both consume the same `ChartDocument` JSON shape, so the grammar stays identical.

### 3.2 Project scaffold

```
web/
├── vite.config.ts          (server: http://127.0.0.1:5173, proxy /api → server:3000)
├── index.html              (single div#root, load compv3.css via <link>)
├── package.json            (react, react-dom, vite, tailwind, lucide-react, axios)
├── src/
│   ├── main.tsx            (ReactDOM.createRoot, BrowserRouter for /charts/:date/edit)
│   ├── App.tsx             (top bar + route outlet)
│   ├── routes/             (React Router v6 — Today, Charts, ChartEditor, MasterData, Search)
│   ├── components/
│   │   ├── chart/          (read-only components driven by ChartDocument)
│   │   │   ├── ChartShell.tsx      — owns the page, renders all 5 pages
│   │   │   ├── Page1.tsx           — Sr-PI card + day/night/office/court band
│   │   │   ├── Page2.tsx           — chowki/marshal blocks (3-across grid)
│   │   │   ├── Page3.tsx           — availability + notices (g4 side-by-side)
│   │   │   ├── Page4.tsx           — manpower matrix + shift summary + sudden changes
│   │   │   ├── Page5.tsx           — officer summary + scan schedule + sign-off
│   │   │   ├── OfficerBlock.tsx    — rank+name+branch chip + writer/operator rows
│   │   │   ├── ChowkiBlock.tsx     — name → in-charge → day/night sub-columns
│   │   │   ├── ShiftColumn.tsx     — persons + bima + rikt rows, closed+charge line
│   │   │   ├── PersonLine.tsx      — rank short + buckle + name + bima chip + time
│   │   │   └── StateChip.tsx       — bima (crimson), rikt (amber dashed), bandh (slate)
│   │   ├── edit/                   (mounted only in /edit; unmounted in preview + print)
│   │   │   ├── EditToolbar.tsx     — संपादन toggle + संपादन button + SaveState
│   │   │   ├── PencilAffordance.tsx — hover-pencil (desktop); long-press (mobile later)
│   │   │   ├── StaffPicker.tsx     — search-by-name/buckle/rank with availability hints
│   │   │   ├── MiniStaffCreate.tsx — rank + name + buckle + phone (inline in picker)
│   │   │   └── UnsavedChangesDialog.tsx — before date navigation
│   │   └── shared/
│   │       ├── DateNav.tsx         — today/yesterday/tomorrow with आज tag
│   │       ├── LifecycleBadge.tsx  — DRAFT/VALIDATED/FINALIZED color badge
│   │       ├── AttentionBar.tsx    — top-level conflict/vacant/bandh summary
│   │       └── SaveStateIndicator.tsx
│   ├── lib/
│   │   ├── api.ts                  — typed API client (axios instance + typed endpoints)
│   │   ├── types.ts                — re-export ChartDocument types from server/chart-document.ts
│   │   └── utils.ts                — toMr, weekdayMr, personLine, timeRange (shared with server)
│   └── styles/
│       └── index.css               — imports compv3.css tokens + edit-mode additions
├── tsconfig.json                   (strict, references server types)
└── vite.config.ts
```

### 3.3 The component architecture

The React side mirrors exactly what the HTML renderer already does — just in JSX. The `renderGroups()` function in `chart-html.ts` that segments rows into label/value pairs with BIMA runs becomes the `ChowkiBlock` + `ShiftColumn` + `PersonLine` component tree.

**Key component: ChartEditor**

```
<ChartShell doc={ChartDocument} mode={preview|edit}>
  <ChartHeader>
    <DateControl>         ← click → DateSwitchFlow (calendar picker)
    <LifecycleBadge>
    {mode === 'edit' && <EditToolbar>}
  </ChartHeader>

  <Page1>
    <SrPiCard person={doc.srPi} writer={doc.writer} />
    <div class="p1-lower">
      <DeskBlock title="दिवस पाळी" rows={dayCol1} />
      <DeskBlock title="रात्र पाळी" rows={nightCol1} />
      <DeskBlock title="कार्यालयीन" rows={officeRows} />
      {courtSplit && <DeskBlock title="कोर्ट" rows={courtRows} />}
    </div>
  </Page1>

  <Page2>
    <ChowkiGrid blocks={chowkiBlocks} />
  </Page2>

  <Page3> ... </Page3>
  <Page4> ... </Page4>
  <Page5> ... </Page5>

  <SecondaryPanels>     ← 7 collapsible panels below board
</ChartShell>
```

### 3.4 Edit mode mechanics

- **Preview is default.** URL `/charts/:date` shows the read board. `संपादन` button → navigate to `/charts/:date/edit`.
- **Edit mode** (`/charts/:date/edit`): same `ChartShell` but with `mode="edit"` prop. Hover shows `PencilAffordance` on editable cells. Print button is disabled (or strips edit layer via `?print`).
- **StaffPicker** opens as a popover anchored to the clicked cell. Typing filters by name/buckle (live). Picker footer: `+ नवीन कर्मचारी जोडा` → swaps to `MiniStaffCreate` form inside the same popover.
- **All mutations optimistic** + debounced autosave (700ms). SaveState: `जतन होत आहे…` → `जतन झाले` / `जतन अयशस्वी`.
- **No page reload:** React state holds the working ChartDocument; every mutation patches local state optimistically, then fires API PUT.

### 3.5 Component mapping (design/Interaction → React)

| DESIGN_INTERACTION_NOTES flow | React component |
|---|---|
| Staff selection (click cell → picker → pick) | `<PersonLine onClick={openStaffPicker}>` + `<StaffPicker onSelect={assign}>` |
| Staff creation (picker footer → mini-form → save → return) | `<MiniStaffCreate onSave={createAndAssign}>` inside picker |
| Replacement (click filled cell → pick new → ledger entry) | `assign()` calls `PATCH /api/assignments/:id` which records sudden_duty_changes |
| Clearing (× button → संक्री) | `PATCH /api/assignments/:id { staff_id: null, allocation_state: 'VACANT_RIKT' }` |
| BIMA toggle | `PATCH /api/assignments/:id/bima { is_bima: true }` |
| बंद (per shift column) | `PATCH /api/locations/:id/state { is_closed: true, charge_destination_id: ... }` |
| Contextual + (rowspan-aware group add) | `<button onClick={addPersonToGroup}>` that appends to existing role group |

### 3.6 Shared utilities

Port `toMr()`, `weekdayMr()`, `personLine()` from `server/render/chart-html.ts` into `web/src/lib/utils.ts` — the client needs them for rendering. TypeScript shared types: the `ChartDocument` interface in `server/chart-document.ts` is the single source of truth; the React side imports it via a path alias or re-exports it.

### 3.7 Test plan for P3

- Component tests (`vitest` + `@testing-library/react`):
  - `ChowkiBlock` renders with bima rows only when `isBima === true` (no bima row when source has none)
  - `PersonLine` renders Devanagari digits for buckle number
  - `StaffPicker` filters correctly on name/buckle input
  - Edit mode renders pencil affordances; preview mode does not
  - Print view (CSS `@media print`) hides all `.no-print` elements
- E2E tests (`playwright`):
  - Load `/charts/2026-09-10` → board renders 5 pages, 212 rows, 10 bima chips, 2 rikt chips
  - Enter `/charts/2026-09-10/edit` → click a rikt cell → pick staff → cell fills + flash + toast
  - Navigate date → dirty → dialog appears → discard returns to clean
  - Print view matches preview layout (same component tree)


---

## 4. Phase P4 — Master Data UI

Single shared clerk user (T1). Master Data screens are deliberately "boring" — plain searchable tables with create/edit + **deactivate** (never delete when referenced).

### 4.1 Screens (all under `/master/`)

| Route | Component | Fields |
|---|---|---|
| `/master/staff` | StaffMaster | name_mr, name_en, rank_code, buckle_no, phone, active toggle |
| `/master/ranks` | RankMaster | rank_code (protected, not editable), name_mr, short_form_mr, cadre, display_order |
| `/master/duties` | DutyMaster | duty_code, title_mr, section_code, default_shift, location_id, display_order |
| `/master/locations` | LocationMaster | location_code (protected), name_mr, kind, display_order, active |
| `/master/units` | UnitMaster | unit_code (protected), name_mr, unit_type, display_order |

### 4.2 Generic CRUD table pattern

One `GenericCrudTable` component parameterized by entity config:

```typescript
interface EntityConfig {
  name: string;           // "कर्मचारी"
  route: "/master/staff";
  fields: FieldConfig[];
  searchFields: string[];  // which fields to search
}

interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "date";
  selectOptions?: (db) => Promise<Option[]>;  // for rank_code, duty_code FK
  required?: boolean;
  protected?: boolean;  // never translated/transliterated
}
```

### 4.3 Key rules

- **Deactivate, never delete:** staff with assignments → only toggle `active=FALSE`. DB FK + `is_active` flag.
- **Protected tokens** (CCTNS, rank codes, etc.) rendered as read-only — never translatable.
- **No rank auto-derivation** from name — rank is an explicit FK.
- **Staff reconciliation:** unique on `(rank_code, buckle_no)` (nullable) + `(rank_code, name_mr)` — matches old seed rule.
- **EN↔MR names (T10):** `name_mr` required, `name_en` optional. Transliteration assist deferred — user enters both manually.

### 4.4 Test plan for P4

- `tests/master-data.test.ts`:
  - Deactivate staff with assignments → assignments still render (person name preserved in snapshot)
  - Try to delete referenced staff → 400 error (FK guard)
  - Create staff → appears in StaffPicker
  - Search by buckle number returns correct person


---

## 5. Phase P5 — History, search, lifecycle, PDF

### 5.1 Today screen (S1 — Home)

URL: `/` → redirect to `/charts/today`.

```
┌─────────────────────────────────────────┐
| पंचवटी पोलीस ठाणे · नाशिक शहर   दिनांक: ०६ ओक्तोबर २०२६  |
|                                वार: मंगळवार · DRAFT   |
├─────────────────────────────────────────┤
| [संपादन करा] [उद्याचा तक्ता] [प्रिंट]     |
├─────────────────────────────────────────┤
| <COMPACT DUTY BOARD read-only S2 view>   |
├─────────────────────────────────────────┤
| ⚠ लक्ष द्यावे लागते                     |
| • २ रिक्त जागा  • १ conflict • १ बंद   |
└─────────────────────────────────────────┘
```

- Board is the **same component** as the editor board (`ChartBoard` read-only mode).
- No chart today → two actions: "नवीन तक्ता सुरू करा" (blank) + "मागील दिवसावरून कॉपी करा".
- FINALIZED → edit button becomes "दुरुस्ती (नवीन आवृत्ती)" → opens amendment flow.

### 5.2 History screen (S5)

URL: `/charts`

```
[ आज ] [ उद्या ] [ अलीकडील ] [ ऐतिहासिक ]
०६ ओक्तोबर २०२६   DRAFT v1
०५ ओक्तोबर २०२६   FINALIZED v2
...          (row click → read-only chart)
```

API: `GET /api/charts` returns all charts (date, lifecycle, version_no). Row click → `/charts/:date` (preview mode).

### 5.3 Tomorrow flow (S4)

`GET /api/charts/tomorrow` → if exists, show it; if not → copy-previous dialog:

```
उद्याचा तक्ता तयार करा
आधार:
 ☐ आजचा तक्ता (०६ ओक्तोबर)
 ☐ कालचा/निवडलेला तक्ता (date picker)
 ☐ रिकामा तक्ता (masters only)
[तक्ता तयार करा]
```

API: `POST /api/charts/:date/copy { source_chart_date, target_date, copy_policy }`. Returns `{ chart_id, conflicts: [...] }`.

Copy policy (from `reference/SEMANTIC/All Pages_Daily Copy Policy...md`):
- Copy: assignments, operational states, special duties, equipment lines
- Re-overlay: availability (date-specific leaves/court become conflicts)
- Exclude: date-bound leaves, investigation, training, events, sudden changes

### 5.4 Search (S6)

Simple single-form search. One screen, three optional filters:

```
[कर्मचारी _____________]
[ड्युटी/ठिकाण  _________]
[दिनांक _____________]
[शोध]
```

Results: list of chart dates with matching lines; click → that chart with match highlighted.

API: `GET /api/search?q=...&type=staff|duty|date` → returns `{ date, highlights: [{ section, line }] }[]`.

### 5.5 Lifecycle UI flow

| State | Editable? | Buttons | Route |
|---|---|---|---|
| DRAFT | Yes | जतन · तपासणी · अंतिम करा · प्रिंट | /charts/:date/edit |
| VALIDATED | Yes | अंतिम करा · प्रिंट | /charts/:date/edit |
| FINALIZED | No | प्रिंट · दुरुस्ती | /charts/:date |

- तपासणी runs domain validation → returns warnings list (advisory) + hard errors (integrity). Only hard errors block finalize.
- अंतिम करा → confirmation modal: "X सूचना असूनही अंतिम करायचे?" → POST `/api/charts/:id/finalize`.
- दुरुस्ती → POST `/api/charts/:id/reopen` → navigates to `/charts/:date/edit` as DRAFT v+1.

### 5.6 PDF export (P1 print via P2 server route — moved to P5 for clarity)

Route: `GET /api/charts/:id/print.pdf`

Uses Playwright to render the same HTML from `renderChart()` → PDF buffer. Same as `scripts/render-chart.ts` pattern, but over HTTP. Returns `Content-Type: application/pdf` + `Content-Disposition: filename=chart-2026-09-10.pdf`.

Alternative: client-side `window.print()` from the screen preview (the preview IS the print CSS). For a downloadable PDF without a printer dialog, the server route is better.

### 5.7 Test plan for P5

- `/charts/today` renders the 10/09 chart in read-only mode (pencil affordances hidden)
- FINALIZED badge shows green; edit button disabled
- Amend button on FINALIZED chart → new DRAFT v+1 appears in history
- Search by staff name → returns charts containing that person
- PDF download via `/print.pdf` returns valid PDF (check Content-Type header)
- Copy-previous → 11/09 created with correct conflicts


---

## 6. Phase P6 — 11/09 events + annex

### 6.1 What 11/09 needs

From `reference/SEMANTIC/11.md`: the 11/09 chart has a स्वयंपाक व्यायाम (cooking practice event) — 11 personnel + equipment allocation + fall-in instruction + notice. This is the **annex page** (extra physical page that requires no schema change).

### 6.2 Event entity (already in schema)

Already in migration 0003:
- `special_events(event_id, chart_id, title_mr, event_date, start_time, venue_mr, fall_in_mr)`
- `event_assignments(event_assignment_id, event_id, staff_id, role_mr, sort_order)`
- `event_equipment` — needs adding (migration 0008)

```sql
-- 0008_event_equipment.sql
CREATE TABLE event_equipment (
  equipment_id bigserial PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES special_events(event_id) ON DELETE CASCADE,
  staff_id bigint REFERENCES staff_members(staff_id),
  category text NOT NULL CHECK (category IN ('mandatory', 'extra')),  -- अनिवार्य साहित्य / अतिरिक्त साहित्य
  item_mr text NOT NULL,    -- shield, lathi, helmet, etc.
  quantity integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
```

### 6.3 Event editor (S11)

Modal triggered from the Secondary Panel `▸ विशेष बंदोबस्त / इव्हेंट`:

```
Special Event: स्वयंपाक व्यायाम
Date: ११ सप्टेंबर २०२६
Time: १०:००
Venue: पो.स्टे. मैदान
Fall-in: ०९:३० पॉइंट नंबर १

Personnel (11):
[1] [2] [3] ... (staff picker per row, role column optional)

Equipment:
[अतिरिक्त साहित्य]
- सर्च लाइट + दोर × 1
- मेगाफोन × 1
[अनिवार्य साहित्य]
- षिल्ड × 11
- लाठी × 11
...
[जतन करा]
```

### 6.4 Event annex page in renderer

Add to `server/render/chart-html.ts` in `renderChart()`:

```typescript
// If doc.events.length > 0, append an annex page:
const eventHtml = doc.events.map((e) => `
  <div class="page">
    <div class="sec"><h2>${disp(e.titleMr)}</h2></div>
    <div class="blk">
      <div class="bh"><div class="nm">विवरण</div></div>
      <div class="body">
        <div class="p"><span class="lb">दिनांक:</span> <span class="n">${disp(e.eventDate)}</span></div>
        <div class="p"><span class="lb">वेळ:</span> <span class="n">${disp(e.startTime)}</span></div>
        <div class="p"><span class="lb">ठिकाण:</span> <span class="n">${disp(e.venueMr)}</span></div>
        <div class="p"><span class="lb">फॉल-इन:</span> <span class="n">${disp(e.fallInMr)}</span></div>
      </div>
    </div>
    <div class="blk">
      <div class="bh"><div class="nm">प्रशिक्षु तालीमी म्हणून नेमलेले सदस्य</div></div>
      <div class="body">
        <table class="dt"><tbody>
          ${e.assignments.map((a) => `<tr><td>${personLine(a.person)}</td><td>${disp(a.roleMr)}</td></tr>`).join("")}
        </tbody></table>
      </div>
    </div>
    ...equipment tables...
  </div>
`).join("");
```

### 6.5 Test plan for P6

- Seed 11/09 chart with event data
- Render → 11/09 has 6 pages (5 standard + 1 annex)
- Annex contains 11 personnel + equipment + fall-in instruction
- No-ops when no events (chart_dates without events stay 5 pages)


---

## 7. Phase P7 — Production hardening

### 7.1 Packaging

Current `package.json` has no `start` script for the server. Add:

```json
// package.json additions
"scripts": {
  ...
  "dev": "NODE_ENV=development npm-run-all --parallel dev:server dev:ui",
  "dev:server": "tsx server/index.ts",
  "dev:ui": "vite --cwd web",
  "build": "tsc --noEmit && vite build --cwd web",
  "start": "tsx server/index.ts",
  "start:prod": "node server/index.js"
}
```

### 7.2 Desktop deployment

The user works in a Desktop/IDE environment. Options:
1. **Serve + browser** — `npm run dev` starts Vite dev server at `http://127.0.0.1:5173`; server proxy to `127.0.0.1:3000`. User opens in Chrome/Edge.
2. **Electron wrapper** — bundle the React app + a local Fastify server in an Electron shell for a true local-desktop app.
3. **Static export** — for read-only viewing, `npm run build` produces static HTML that can be served by any file server.

**Recommendation:** Start with option 1 (serve + browser) for dev and v1. Electron is P7 hardening if the user wants a double-clickable app.

### 7.3 Database setup automation

Enhance `scripts/create-dbs.mjs` to also migrate + seed:

```bash
# New script: db-setup.mjs
# Creates DBs, runs migrations on both, seeds reference data
node scripts/db-setup.mjs
```

Or add to README:
```bash
npm run db:setup           # create DBs
npm run db:migrate         # migrate dev DB
NODE_ENV=test npm run db:migrate  # migrate test DB
npm run db:seed:reference  # Layer A masters
NODE_ENV=test npm run db:seed:chart  # 10/09 seed on test
```

### 7.4 CI/CD (local-only, no cloud)

One `scripts/ci.mjs`:
```bash
#!/usr/bin/env node
# Local CI runner — runs verify + all checks
# Not connected to any service; just runs locally on demand
```

Or skip CI — the existing `npm run verify` is the gate.

### 7.5 Documentation cleanup

After all features are built:
- Archive `docs/STITCH_BRIEF.md` (already superseded)
- Ensure `docs/CURRENT_STATE.md` reflects final state (add P2+ phases)
- Update `docs/OPEN_QUESTIONS.md` with T15+ if new questions arise
- Update `docs/TRACEABILITY.md` with new requirements (search, history, PDF, events)

### 7.6 A-to-Z verification checklist

Before declaring v1 complete:
- [ ] `npm run verify` green (typecheck + 38 existing tests + new tests)
- [ ] `npm run doctor` green on both DBs
- [ ] 10/09 chart renders correctly in browser (5 pages, all 212 rows)
- [ ] 10/09 chart FINALIZE → reopen → FINALIZE flow works, version chain correct
- [ ] Copy 10/09 → 11/09 preserves assignments, flags conflicts, source hash unchanged
- [ ] Staff picker finds person by name/buckle/rank
- [ ] Mini-create creates staff → appears in picker
- [ ] BIMA toggle works, saved to DB
- [ ] बंद + charge works per shift column
- [ ] Master Data CRUD: create/edit/deactivate staff + ranks/duties/locations
- [ ] History list shows charts with lifecycle badges
- [ ] Search returns expected results
- [ ] PDF export produces valid PDF via `/print.pdf`
- [ ] Print preview matches screen (same component tree)
- [ ] No `notes_mr` parsing anywhere (static scan + code review)
- [ ] No auto-scheduling code anywhere (static scan)
- [ ] No external API calls at runtime (offline-capable)


---

## 8. Cross-cutting concerns

### 8.1 Typography & script rules (locked by AGENTS.md)

- **Marathi-first**, Unicode throughout. Noto Sans Devanaghi for body.
- **Devanagari digits are a display transform only.** `09:00` → `०९:००` at render time. Never stored as digits.
- **Protected tokens** (never translated/transliterated):
  - Rank codes: SR_PI, PI, API, PSI, PROB_PSI, PROB_LPSI, GRADE_PSI, ASI, LASI, HC, DRIVER_HC, LHC, PN, PC, DRIVER_PC, LPC
  - Operational: CCTNS, Dial 112 MERS, DB, MERS, TOTAL, Office, ME
  - Canonical spellings: बिमा (not विमा), पोशि (not पोषि)
- **Marathi wraps, never truncates.** CSS: `overflow-wrap: break-word` on all text cells. Verified at every breakpoint.

### 8.2 The three-state rule (locked by AGENTS.md)

| State | Meaning | Storage |
|---|---|---|
| रिक्त | slot exists, no person | `allocation_state='VACANT_RIKT'`, `staff_id=NULL` |
| बंद | location closed that shift | `location_operational_states.is_closed=TRUE` |
| बिमा | per-assignment beat-marshal qualifier | `daily_assignments.is_bima=TRUE` |

Never interchanged, never inferred from notes text. Each has a DB CHECK constraint:
- `vacant_slot_has_no_person` — rikt implies no staff
- `bima_requires_person` — bima implies someone is assigned
- `charge_never_self` — charge destination ≠ self

### 8.3 Immutability model (T13 resolved)

```
Editing (DRAFT/VALIDATED):
  Normalized B tables (daily_charts, daily_assignments, location_operational_states,
    daily_availabilities, chart_notices, scan_schedule_daily, manpower_records,
    officer_summary_rows, special_events, event_assignments, event_equipment)
    ↓ projection (projectChart())
  ChartDocument JSON (typed, with resolved master names + computed weekday)
    ↓ at FINALIZE
  chart_versions (immutable snapshot, append-only trigger, no UPDATE/DELETE)

Reprint (FINALIZED):
  getSnapshot() → document_json (no live FK joins needed)

Amendment:
  reopenForAmendment(FINALIZED → DRAFT)
    ↓ edit normalized B tables
    ↓ new finalize = new version_no, amended_from references previous
```

### 8.4 Template system (Layer C)

Templates own **presentation structure** only, never arbitrary HTML/CSS/JS:
- Section order, column headings, label short-forms, alignment/width/visibility
- Stored as JSONB in `template_versions`: `labels JSONB, layout JSONB`
- A chart pins `template_version_id` at creation — template edits create new versions, never modify existing charts
- "या तकट्यासाठी" (this-chart-only) overrides stored in `daily_charts.presentation_overrides JSONB`

Deferred decisions (PRODUCT_UI_ARCHITECTURE §14):
- T10: Manual dual-entry for EN/MR names now; transliteration assist later
- T11: Eligibility matrix toggle disabled (Coming Soon); enabled only with SME evidence
- T9: Any clerk can edit templates for MVP; RBAC later
- T12: Station-shared templates (one station, one clerk)

### 8.5 Copy-previous policy

From `reference/SEMANTIC/All Pages_Daily Copy Policy...md`, enforced in domain (`chart-copy.ts` + test):

**AUTO-COPY:**
- Structural assignments (day/night core duties)
- Chowki + marshal operational state (बंद/charge)
- Standing special duties (ACP/DCP deputations, squads, court pairvi, bodyguard)
- Equipment lines

**RE-OVERLAY (date-specific, conflict-checked):**
- Daily availability rows → overlaid for new date → conflicts flagged
- Hourly scan staff → re-validated against new date availability
- Officer summary → re-derived (source/override preserved)

**EXCLUDE:**
- Daily leaves (date-bound)
- Investigation, training duties (date-bound)
- New events (not copied)
- Sudden duty change ledger (fresh for new chart)

### 8.6 Static source-scan invariants

`tests/invariants.test.ts` already scans the codebase for:
- No `Math.random()` in assignment logic
- No `auto_assign`, `auto_select`, `autofill` identifiers
- No `notes_mr`/`remarks_mr` parsing for machine meaning (regex, substring matching for logic)
- No outbound network calls in server code
- `chart_versions` has append-only trigger (no UPDATE/DELETE)
- `daily_charts.lifecycle` CHECK on transition

### 8.7 Test database strategy

- `panchavati3_dev` — writable dev DB for manual testing
- `panchavati3_test` — wiped + re-seeded before each test run
- All mutation tests run inside `BEGIN/ROLLBACK` transactions — the seed is never modified
- `package.json` scripts use `NODE_ENV=test` for test DB operations


---

## 9. Verification strategy

### 9.1 Test layers

| Layer | Tooling | Scope | Runs in |
|---|---|---|---|
| Unit (domain) | vitest | projection, finalize, invariants, mutations | local + CI |
| Unit (UI) | vitest + @testing-library/react | component rendering, edit mode, state chips | local |
| Integration (API) | vitest (Fastify inject) | full HTTP request/response cycles | local |
| E2E (browser) | playwright | real user flows (picker, edit, finalize, PDF) | local CI |
| Print | print-check skill | page height ≤ 794px, no overflow, Marathi wraps | local |
| Static scan | vitest (regex) | no auto-assign, no notes parsing, no external calls | local |
| Doctor | custom script | environment + DB state + checksums | local |

### 9.2 The gate

`npm run check` = `npm run verify` = typecheck + test + doctor.

Every phase ends with this green. The plan does not move forward until this passes.

### 9.3 Acceptance runs (from TRACEABILITY.md)

- **A-10/09:** seed + author + finalize + print 10/09 packet; checklist = INITIAL_AUDIT §7 table 1 fully representable.
- **A-11/09:** same + event authoring + annex page; checklist = §7 table 2; assert no schema migration needed for the extra page.
- **A-copy:** copy 10/09→11/09 as clerk would; source hash unchanged; conflicts flagged.
- **A-print:** rendered compact print inspected in browser preview (screen + grayscale emulation); Marathi wrap verified.

### 9.4 What "verified" means per artifact type

| Artifact | Verified by |
|---|---|
| DB schema/invariants | tests/invariants.test.ts + doctor |
| ChartDocument projection | tests/chart-document.test.ts |
| HTML renderer | tests/render.test.ts + print-check skill |
| API endpoints | tests/api.test.ts (Fastify inject) |
| React components | vitest @testing-library + manual storybook |
| User flows | playwright E2E |
| Print output | browser preview + grayscale emulation (print-check skill) |
| Responsiveness | browser viewport tests at 1440/1120/1000/768/420 |


---

## 10. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Playwright unavailable in local env → PDF export fails | Medium | High | Server routes use same HTML renderer; if Playwright missing, fall back to browser `window.print()` from preview |
| R2 | 10/09 seed doesn't match live React mockup layout | Low | Medium | Acceptance run A-10/09 validates source fidelity; mismatches are logged as source-vs-layout deltas |
| R3 | Copy-previous introduces conflicting assignments silently | Low | High | Conflict evaluation (`ConflictEvaluator`) marks NEEDS_ATTENTION; tests verify source hash unchanged |
| R4 | React edit mode diverges from frozen compv3.html CSS | Medium | Medium | Components port `compv3.css` class names verbatim; print CSS reuses same classes; verification via render tests + print-check |
| R5 | User enters data not in SEMANTIC evidence (e.g. new event type) | High | Low | Schema is generic (event_type field); new shapes require SME input → OPEN_QUESTIONS entry |
| R6 | Multi-user concurrency not handled (single clerk) | Low | Low | T2 resolved → last-save-wins; revisit if multi-clerk arrives |
| R7 | Marathi text overflows cells (wrap failure) | Low | Medium | CSS `overflow-wrap: break-word` on all cells; print-check verifies no truncation at 390px |
| R8 | Template edit accidentally changes finalized chart rendering | Low | High | Template pinning (chart pins `template_version_id`); tests verify pin holds after new template version |
| R9 | Old repo archive contaminates test runs | Low | Medium | vitest config scoped to `tests/**/*.test.ts` only; archive excluded by design |
| R10 | External API call leaks operational data | Low | Critical | Static scan test asserts no `fetch`/`axios`/`http` outbound calls in server code; local-only PostgreSQL |
| R11 | DB migration drift (applied migration changed on disk) | Low | Medium | Migrate runner stores SHA-256 checksums; doctor verifies equality; refused on drift |
| R12 | Staff name transliteration (EN↔MR) quality | Medium | Low | T10: manual dual-entry now; transliteration assist deferred until a real phase needs it |
| R13 | 11/09 event annex page requires schema migration | Medium | Medium | Schema already has `special_events` + `event_assignments`; only `event_equipment` needs adding (P6) |
| R14 | Performance: 212 assignments × 5 pages render slow | Low | Low | Projection is single SQL; renderer is single-pass string concat; cache on projection for repeated reads |

### 10.1 Decisions that could change direction

| Decision | Current | Alternative | Impact if flipped |
|---|---|---|---|
| React + Vite for UI (vs. HTMX server-rendered) | React 19 + Vite + Tailwind 4 | HTMX + AlpineJS (lighter, no build step) | If HTMX chosen, P3 becomes routes returning HTML fragments instead of SPA; server does more rendering |
| React Router (SPA routing) | React Router v6 | Server renders each route | If server rendering chosen, routes become Fastify views returning HTML strings |
| Playwright PDF | Playwright headless | `weasyprint` or CSS Paged Media polyfill | Lighter dependency but lower fidelity; Playwright reuses Chrome rendering that matches browser preview |
| Single-file DB (PostgreSQL) | PostgreSQL 17 local | SQLite | Loses triggers + CHECK enforcement; violates AGENTS "PostgreSQL is the single store" rule |

---

## Appendix A: File inventory (current repo, as of 2026-10-08)

```
DailyDutyPanchavati-ui-rebuild/     ← workspace root (this folder)
├── AGENTS.md                        ← agent contract (reading order, hard rules)
├── README.md                        ← operator contract (commands, layer authority)
├── package.json                     ← scripts, deps (pg only; no server framework yet)
├── tsconfig.json                    ← strict TS, scoped to db/ + server/ + tests/ + scripts/
├── vitest.config.ts                 ← test config (scoped to tests/**)
├── .npmrc                           ← local npm config
├── changes/                         ← work-unit proposals (0001=UI spec, 0002=superseded site plan)
│   └── 0001-ui-ux-spec-pass/
│   └── 0002-site-plan/
├── db/
│   ├── migrations/                  ← 0001–0007 (forward-only, SHA-256 guarded)
│   ├── seed/
│   │   └── 0001_reference_data.sql  ← Layer A masters
│   │   └── 0002_source_evidenced_staff.sql
│   ├── seed-reference.ts            ← TS runner for 0001
│   ├── seed-chart-1009.ts           ← 708-line 10/09 seed from SEMANTIC/10.md
│   └── migrate.ts                   ← migration runner
├── server/
│   ├── db.ts                        ← pg pool helper (dev/test selection)
│   ├── chart-document.ts            ← ChartDocument projection + getSnapshot
│   ├── finalize.ts                  ← finalizeChart + reopenForAmendment
│   └── render/
│       └── chart-html.ts            ← 462-line 5-page HTML renderer
├── scripts/
│   ├── create-dbs.mjs               ← creates panchavati3_dev/test
│   ├── doctor.mjs                   ← 14-check diagnostics
│   └── render-chart.ts              ← CLI to render chart to static HTML
├── tests/
│   ├── invariants.test.ts           ← 19 tests (DB constraints + static source scans)
│   ├── chart-document.test.ts       ← 12 tests (projection + finalize + snapshot)
│   └── render.test.ts               ← 7 tests (HTML renderer output)
├── design/                          ← FROZEN compact-v3 visual baseline
│   ├── compv3.css                   ← shared stylesheet
│   ├── panchavati-compv3.html       ← realistic 10/09 prototype
│   └── _refs/                       ← critique + old mockup refs
├── reference/                       ← READ-ONLY evidence corpus
│   ├── ORIGINAL_VISUAL/             ← 10.pdf, 11.pdf, Staff_Info.pdf
│   ├── EXCEL_RECONSTRUCTION/        ← verified XLSX/HTML for Page 1
│   ├── SEMANTIC/                    ← 10.md, 11.md, 16.md, Page analyses, Staff_Info.md
│   ├── Kushal_compact_chart_critique.md
│   └── README.md                    ← evidence authority order
└── skills/                          ← project-local agent skills
    └── ...                          ← source-forensics, db-change, current-chart-ui, print-check, etc.
```

### What the plan says to DELETE or change

- `scripts/render-chart.ts` → **update** to use API or mark legacy (P2)
- `DailyDutyPanchavati-ui-rebuild/` (old repo archive under workspace) → **leave untouched**, reference only

### What new top-level dirs are created

- `web/` — React app (P3)
- `server/routes/` — Fastify routes (P2)
- `server/middleware/` — lifecycle guards (P2)
- `db/operations/` — mutation functions (P2)

---

## Appendix B: API shape (detailed contract)

The React UI will call these. Server implements them in P2. The `ChartDocument` type is already defined in `server/chart-document.ts` and is the contract for what the frontend receives.

### GET /api/charts
```typescript
// Returns all charts, newest first
{ data: ChartListItem[] }
interface ChartListItem {
  chartId: number;
  date: string;        // YYYY-MM-DD
  weekdayMr: string;   // computed
  lifecycle: "DRAFT" | "VALIDATED" | "FINALIZED";
  versionNo: number;
}
```

### GET /api/charts/:date/document
```typescript
// Returns ChartDocument (projection for DRAFT/VALIDATED, snapshot for FINALIZED)
// 10/09 chart has: 212 assignments, 10 bima, 2 rikt, 7 loc-states, 28 notices,
//                  240 manpower cells, 15 officer rows, 12 scan rows, 0 events
{ data: ChartDocument }
```

### POST /api/charts
```typescript
// Create a new DRAFT chart for a date (blank or copy-previous)
// Body: { date: string, sourceChartDate?: string }
// Returns: { data: { chartId: number, date: string, lifecycle: "DRAFT" } }
```

### POST /api/charts/:id/finalize
```typescript
// Finalize chart — materializes snapshot, freezes working rows
// Returns 409 if already FINALIZED
// Returns: { data: { versionNo: number, document: ChartDocument } }
```

### POST /api/charts/:id/reopen
```typescript
// Reopen FINALIZED chart as DRAFT for amendment
// Returns 400 if not FINALIZED
// Returns: { data: { chartId: number, lifecycle: "DRAFT", newVersionNo: number } }
```

### PATCH /api/assignments/:id
```typescript
// Assign/replace staff on a slot (records sudden_duty_changes on replacement)
// Body: { staffId: number | null, allocationState?: "ALLOCATED" | "VACANT_RIKT" }
// Returns: { data: Assignment }
```

### PATCH /api/assignments/:id/bima
```typescript
// Toggle bima flag
// Body: { isBima: boolean }
// Returns: { data: { assignmentId: number, isBima: boolean } }
```

### GET /api/staff/search?q=
```typescript
// StaffPicker search — filters by name_mr, name_en, buckle_no, rank_code
// Returns: { data: StaffSearchResult[] }
interface StaffSearchResult {
  staffId: number;
  nameMr: string;
  rankCode: string;
  rankShortForm: string | null;
  buckleNo: string | null;
}
```

### GET /api/charts/:id/print
```typescript
// HTML for print view — same renderChart() but without toolbar
// Query: ?snapshot=true for finalized charts
// Returns: text/html
```

### GET /api/charts/:id/print.pdf
```typescript
// PDF via Playwright
// Returns: application/pdf
```

