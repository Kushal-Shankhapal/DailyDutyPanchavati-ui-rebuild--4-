# P1-P4 Implementation Plan

**Status:** Specification for AI editors. This document tells the next editor exactly what to build, file by file. It is NOT Claude building it — Claude is producing this plan as the deliverable.

**Baseline that already exists (DO NOT REBUILD):** P0 DB foundation + P1 slice 1 (projection + finalize + render + tests) = green on `npm run verify`: typecheck + 31 tests + doctor, 7 migrations, seed counts verified.

## 0. Foundation already in place (skip all of this)

| Component | Path | Status |
|---|---|---|
| Migrations 0001-0007 | `db/migrations/NNNN_*.sql` | Applied, checksum-guarded |
| Reference seed | `db/seed/0001_reference_data.sql` | Idempotent masters (17 ranks, 179 staff, 6 chowkis + 5 marshal posts, 49 duties, 30 scan config) |
| Source-evidenced staff | `db/seed/0002_source_evidenced_staff.sql` | Applied (Home Guard, missing LPCs, GRADE_PSI) |
| 10/09 chart seed | `db/seed-chart-1009.ts` | 212 asgn, 10 बिमा, 2 रिक्त, 69 avail, 7 loc-states, 28 notices, 240 matrix, 15 officers, 12 scan |
| `server/db.ts` | pool helper, DEV_DB/TEST_DB, isTestRun | Done |
| `db/migrate.ts` | sha256 checksum migration runner | Done |
| `server/chart-document.ts` | `projectChart()`, `getSnapshot()`, `weekdayMr()`, `resolveNode()`, `ChartDocument` types | Done — 12 projection tests |
| `server/finalize.ts` | `finalizeChart()`, `reopenForAmendment()` | Done — 5 finalize tests |
| `server/render/chart-html.ts` | `renderChart()`, `toMr()` | Done — 9 render tests |
| `scripts/render-chart.ts` | render entry point → `.tmp-preview/` | Done |
| `scripts/create-dbs.mjs` | create panchavati3_dev/test | Done |
| `scripts/doctor.mjs` | 14 objective health checks | Done |
| `tests/invariants.test.ts` | 19 invariant tests | Done |
| `tests/chart-document.test.ts` | 12 projection/snapshot tests | Done |
| `tests/render.test.ts` | 9 render tests | Done |
| `design/compv3.css` | frozen visual baseline | Done (human-maintained) |
| `design/panchavati-compv3.html` | frozen realistic 10/09 prototype | Done |

**Total existing: 31 tests green.** All work below builds on this.

---

## P1 — Server layer: API + domain (in progress from the plan, NOT yet built)

### P1 task 1: Server entry point + API routes

**File: `server/index.ts`** (FASTIFY 5)

Create the Fastify server. **Do NOT use Kysely yet** — the existing code uses `pg` directly; follow that pattern until a separate task migrates (or skip Kysely entirely; pg is the established convention here).

Dependencies to add: `@fastify/cors`, `fastify`, `@fastify/rate-limit` (optional, for T2 single-user local).

Routes (all JSON in/out):

```
GET /health → { ok: true }
GET /api/charts/:date → ChartDocument (projection if DRAFT/VALIDATED, snapshot if FINALIZED)
PUT /api/charts/:date → upsert Layer B working rows (PATCH semantics — only provided sections written)
POST /api/charts/:date/finalize → { versionNo } or 409 on FINALIZED
POST /api/charts/:date/reopen → { ok: true } (FINALIZED→DRAFT) — 409 if not FINALIZED
POST /api/charts/:date/copy?to=DATE → { chartId, conflicts: [...] } (copy-previous)
GET /api/charts/:date/conflicts → conflict list from availability/assignment overlap
GET /api/masters → { ranks[], staff[], locations[], duties[], units[] }
GET /api/masters/staff/:id → single staff
POST /api/masters/staff → 201 { staffId }
PATCH /api/masters/staff/:id → { ok: true }
GET /api/masters/duties/:code → single duty
POST /api/masters/duties → 201 { dutyId }
PATCH /api/masters/duties/:code → { ok: true }
...similar for locations, units, ranks
GET /api/charts/:date/events → event list for chart
POST /api/charts/:date/events → 201 { eventId }
GET /api/events/:id → single event + assignments + equipment + instructions
PATCH /api/events/:id → { ok: true }
POST /api/events/:id/assignments → 201 { assignmentId }
POST /api/events/:id/equipment → 201 { equipmentId }
POST /api/events/:id/instructions → 201 { instructionId }
```

**Key implementation rules:**
- All routes that mutate Layer B check lifecycle first; FINALIZED → 409. (DB triggers ALSO enforce this, so this is defense-in-depth.)
- `PUT /api/charts/:date` accepts a `Partial<ChartDocument>` and writes only the sections present. For collections (assignments, availability, notices, etc.), use wipe-and-replace semantics within one transaction so partial updates don't leave dangling rows. For scalar overrides, merge.
- `GET /api/charts/:date` for a DRAFT chart calls `projectChart()` from the existing `server/chart-document.ts`. For FINALIZED, calls `getSnapshot().document`.
- Error response shape: `{ error: "message", code?: string }`.
- Use `makePool(DEV_DB)` from `server/db.ts`.

**File: `server/domain/copy-previous.ts`**

```typescript
// Copy a finalized source chart to a new date as DRAFT.
// Applies Copy Policy matrix (reference/SEMANTIC/All Pages_Daily Copy Policy...md).
export interface CopyResult {
 chartId: number;
 sourceHash: string; // hash of source snapshot (proves source untouched)
 conflicts: Conflict[]; // availability overlaps, double-bookings
 copiedSections: string[];
}
export interface Conflict {
 type: "AVAILABILITY_OVERLAP" | "DOUBLE_BOOKING";
 staffId: number;
 nameMr: string;
 detail: string; // "08:00-10:00 conflict with assignment at ..."
 severity: "warning";
}

export async function copyPrevious(
 pool: pg.Pool, sourceDate: string, targetDate: string
): Promise<CopyResult>
```

Logic:
1. Resolve source chart_id; get its snapshot via `getSnapshot()`.
2. Hash the snapshot `document_json` (sha256 on the JSON — proves source untouched).
3. Create new `daily_charts` row with target date, same `template_version_id`, DRAFT lifecycle.
4. Apply Copy Policy per section (see matrix below).
5. Overlay target-date availability (from `daily_availabilities` for the target date if it exists — but for a new date, start empty and flag any source-date overlaps).
6. Detect conflicts: for each assignment, check if the assigned staff has an availability entry overlapping that date/time. Return as warnings.
7. Insert all rows in one transaction. On success, return CopyResult.

**Copy Policy matrix** (from `reference/SEMANTIC/All Pages_Daily Copy Policy...md`):

| Source table | Policy | Target handling |
|---|---|---|
| `ranks`, `staff_members`, `locations`, `duty_definitions`, `units`, `scan_schedule_config`, `template_versions` | FIXED CONFIG | Never copied (shared masters); target chart references same |
| `daily_charts` (chart itself) | COPY+DAILY EDIT | New row, new date, DRAFT, same template pin |
| `chart_versions` | APPEND-ONLY | New chart starts fresh (no history) |
| `daily_assignments` | COPY | All rows copied with `source='COPIED'`; split times preserved; BIMA/rिक्त/बंद flags preserved |
| `location_operational_states` | COPY+DAILY EDIT | Copied; clerk reconfirms per shift |
| `daily_availabilities` | DAILY INPUT | NOT copied; target starts empty; conflicts detected against source assignments |
| `chart_notices` | AUTO-COPY | Copied (night directives may carry over) |
| `sudden_duty_changes` | APPEND-ONLY | NOT copied; target starts with empty ledger |
| `manpower_records` | AUTO-COPY | NOT copied verbatim — target re-enters (these are clerk-entered daily values); seed blanks |
| `officer_summary_rows` | COPY | Copied (roster carries over); source='COPY' |
| `scan_schedule_daily` | DAILY INPUT | Copied from config (hourly windows), NOT from staff assignments; target rows are blank staff, config provides times |
| `shift_summary_cells` | APPEND-ONLY | Seed blanks (like source) |

**File: `server/domain/conflicts.ts`**

```typescript
export async function detectConflicts(pool: pg.Pool, chartId: number): Promise<Conflict[]>
```

Detect:
1. Availability overlap: person assigned a duty AND has an availability row for the same date with overlapping time window.
2. Double booking: same person assigned to multiple duties at overlapping times.
3. Vacant seat count (रिक्त) — informational, not a conflict.

**File: `server/domain/manpower.ts`**

```typescript
export interface ManpowerDerived {
 totalByRank: Record<string, { approved: number; present: number; derived?: number }>;
 totals: { officers: number; constables: number; women: number; me: number };
 office: number; // from manpower_records Office row
 reconciled: boolean; // true if arithmetic closes (10/09 has N4/N5 — will be false)
}
export async function deriveManpower(chartId: number): Promise<ManpowerDerived>
```

This computes provable totals (मंजूर × status matrix → sums) but NEVER auto-reconciles ME/03. The result flags where source shows `..` or unverified values (N4/N5).

**File: `server/domain/officer-summary.ts`**

```typescript
export async function deriveOfficerSummary(chartId: number): Promise<OfficerRow[]>
```

Derive from assignments: each officer (rank ≤ API) assigned on the chart date → `dutyText` = their duty assignment. Returns 15 rows for 10/09. Supports `source: SUGGESTION` (derived) vs `OVERRIDE` (clerk-edited via `officer_summary_rows.source` column already exists).

### P1 task 2: Extend the seed — 11/09 chart with event

**File: `db/seed-chart-1109.ts`**

Mirror `seed-chart-1009.ts` structure exactly. Source authority: `reference/SEMANTIC/11.md`.

Key differences from 10/09 (all must be represented):
- Day roster columns 1-4: carry-over मोहिते 16-21 (night), परेड कमी पोलीस मुख्यालय block
- Chowki बंद/charge differences: कारंजा day बंद→काटया, etc. (different loc states)
- Night directives carry over
- **Event Table 3: गणेशोत्सव रंगीत तालीम** — 11 personnel, equipment lines, fall-in 10:00 at पो.स्टे.मैदान

Event seed data (from 11.md Table 3):
- `special_events`: title_mr='गणेशोत्सव रंगीत तालीम', event_date='2026-09-11', start_time='10:00', venue_mr='पो.स्टे.मैदान फॅलिंग'
- `event_assignments` (11 rows, seq 1-11, with roles from source)
- `event_equipment` — lines for अतिरिक्त साहित्य (search light+दोर, megaphone, video camera, gas gun+cells 10/8, 12-bore rounds 40, SLR plastic 50 / live 35, shield+stick, helmet+chin+body) and अनिवार्य साहित्य (shield, stick, helmet, chin guard, body protector)
- `event_instructions` — fall-in text + absentee warning (गैरहजर नोंद + कसुरी अहवाल)
- Notices for the event

Counts to verify: 11/09 chart will have MORE assignments than 10/09 (day roster differs + event personnel). The seed must produce verifiable counts.

### P1 task 3: API route tests

**File: `tests/api.test.ts`** (uses fastify.inject, in-memory test DB)

- GET /health
- GET /api/charts/2026-09-10 → returns ChartDocument with correct counts
- PUT /api/charts/:date with sample patch → rows updated
- POST /api/charts/:date/finalize → versionNo=1, snapshot exists
- POST /api/charts/:date/finalize again → 409
- POST /api/charts/:date/reopen → lifecycle DRAFT
- POST /api/charts/:date/copy?to=2026-09-11 → returns CopyResult with conflicts (if any)
- Master CRUD: create staff, patch staff, verify
- Finalized chart PUT → 409

---

## P2 — Frontend (React 19 + Vite + Tailwind 4)

### P2 task 1: Vite + React scaffold

**Directory: `web/`**

Files:
- `web/package.json` — React 19, Vite, Tailwind 4, lucide-react, clsx, dayjs (for date formatting), typed APIs for fetch
- `web/vite.config.ts` — proxy `/api` → `http://localhost:3100`, server port 5173
- `web/tsconfig.json` — extends root `../tsconfig.json`, include `src/**/*`
- `web/tailwind.config.js` — content: `["./index.html", "./src/**/*.{ts,tsx}"]`, theme extend with compact-v3 palette
- `web/index.html` — root div, lang=भ
- `web/src/main.tsx` — React 19 strict mode, createRoot
- `web/src/app.tsx` — router (wouter or react-router-dom 6), nav bar, conditional routes

Update root `package.json`: add `"dev:web": "vite --port 5173 --open"` in `web/`, or add `web` as separate package. Decision: monorepo-lite, `web/` has its own package.json, root has orchestration scripts:

```json
// root package.json additions
"scripts": {
 "dev": "node server/index.ts & vite --port 5173 --open", // dev both
 "dev:server": "tsx server/index.ts",
 "dev:web": "cd web && vite --port 5173 --open",
 "build": "npm run typecheck && cd web && vite build",
 "preview": "cd web && vite preview",
}
```

Actually simpler: `web/` is fully self-contained with its own package.json/node_modules, root scripts proxy. Use `tsx` (already installed) for the server; add Fastify deps to root package.json.

### P2 task 2: API client + types

**File: `web/src/lib/api.ts`**

```typescript
// Typed client wrapping fetch('/api/...')
export const api = {
 health: () => fetch('/api/health').then(r => r.json()),
 getChart: (date: string) => fetch(`/api/charts/${date}`).then(r => r.json() as Promise<ChartDocument>),
 updateChart: (date: string, patch: Partial<ChartDocument>) => fetch(`/api/charts/${date}`, {method: 'PUT', body: JSON.stringify(patch)}).then(r => r.json()),
 finalize: (date: string) => fetch(`/api/charts/${date}/finalize`, {method: 'POST'}).then(r => r.json()),
 reopen: (date: string) => fetch(`/api/charts/${date}/reopen`, {method: 'POST'}).then(r => r.json()),
 copyPrevious: (sourceDate: string, targetDate: string) => fetch(`/api/charts/${sourceDate}/copy?to=${targetDate}`, {method: 'POST'}).then(r => r.json()),
 getConflicts: (date: string) => fetch(`/api/charts/${date}/conflicts`).then(r => r.json()),
 getMasters: () => fetch('/api/masters').then(r => r.json()),
 createStaff: (body: {name_mr: string; rank_code: string; buckle_no?: string; phone?: string}) => fetch('/api/masters/staff', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}).then(r => r.json()),
 // ... etc for all master CRUD
}
```

**File: `web/src/lib/types.ts`** — re-export all types from `server/chart-document.ts` (ChartDocument, DocAssignment, etc.) plus client-only types (Conflict list shape from the /conflicts endpoint).

### P2 task 3: Navigation + Home (Today) screen

**File: `web/src/components/layout/AppNav.tsx`**

Minimal nav bar:
```
आजचा तक्ता | दैनिक तक्ते | शोध | मास्टर डेटा | Coming Soon: सूचना पाठवणे, वापरकर्ता व्यवस्थापन
```
Station identity on left (पंचवटी पोलीस ठाणे · नाशिक शहर). Date/lifecycle on right when chart loaded. No hamburger, no settings.

**File: `web/src/components/layout/TodayScreen.tsx`** (S1)

- Load today's chart via `api.getChart(todayDate)`.
- If no chart: "नवीन तक्ता सुरू करा" (blank) + "मागील दिवसापासून कॉपी करा" (→ DateSwitchFlow, default to yesterday).
- If chart exists: render `<ChartBoard doc={doc} readOnly />` + attention summary bar (counts of रिक्त, conflicts, बंद chowkis).
- Action buttons: संपादन (→ /charts/:date/edit), उद्याचा तक्ता, प्रिंट.
- FINALIZED → button shows "दुरुस्ती (नवीन आवृत्ती)" (amendment path).

### P2 task 4: Chart Board (read-only compact board)

**File: `web/src/components/chart/ChartBoard.tsx`**

Consumes `ChartDocument`, renders the compact board using compv3.css class vocabulary. **Import `design/compv3.css` as the stylesheet.** This is the read-only version of S2.

Components (all render-only, data-driven from ChartDocument):

- `ChartShell` — page wrapper, includes headHtml
- `ChartHeader` — date line + lifecycle badge (DRAFT/VALIDATED/FINALIZED)
- `SrPIBox` — वरिष्ठ पोलीस निरीक्षक + रायटर/चालक rows, uses `doc.assignments` filtered to SR_PI/PI + OFFICE_WRITER duty
- `OfficerGrid` / `OfficerBlock` — officer cards with support rows (रायटर/ऑपरेटर), from `doc.officerSummary`
- `CoreTable` — HQ/marshal office desk rows (day/night), renders `doc.assignments` column 1
- `ChowkiGrid` — 6 chowki blocks in a wrapping grid
- `ChowkiBlock` — name + अधि. in-charge + दिवसपाळी/रात्रपाळी sub-columns, BIMA chips, रिक्त tags, बंद + चार्ज lines (uses `doc.locationStates` for closure/charge)
- `MarshalSpecialPanel` — marshal posts + special duties (column 3 blocks), marshal lines from `doc.locationStates`
- `OfficeDeskPanel` — office/clerk desk rows (column 4, split court duties per template config)
- `Section` — titled section wrapper
- `StateChip` — variants: c-bima (crimson), c-vac (amber dashed), c-stop (slate hatch), c-ok (default)
- `PersonLine` — rank short form + buckle + name + chips (बिमा, branch tag, time window)
- `AttentionBar` — summary of issues, clickable to jump to section

The board must match the frozen `design/panchavati-compv3.html` class structure exactly (the mock uses the same compv3.css). The React components reproduce that HTML structure from the ChartDocument.

### P2 task 5: Chart Editor (S2)

**File: `web/src/components/edit/ChartEditor.tsx`**

- Wraps ChartBoard in edit mode.
- Edit affordances: hover-pencil on person lines (desktop), contextual `+` blocks.
- **DateSwitchFlow** — clicking the date line opens a calendar; dirty → dialog (जतन करून स्विच / बदल टाकून / रद्द).

Contextual `+` buttons (from UI_SPEC §5):
- `+ अधिकारी बॉक्स जोडा` — above officer grid
- `+ चौकी जोडा` — above chowki grid
- `+ कर्मचारी` on any person line → opens PersonAssignmentEditor
- `+ सूचना` — notice editor
- `+ िव्हेंट` — event editor (S11)

**File: `web/src/components/edit/PersonAssignmentEditor.tsx`**

The universal staff picker flyout (UI_SPEC §6). Opened from any editable slot:

```
Edit: <slot label from template>
Current: <name> / सध्या रिक्त if empty
[ कर्मचाऱ्याची माहिती बदला ] (→ StaffEditor modal)
[ दुसरा कर्मचारी निवडा ] (→ StaffPicker with search)
[ + नवीन कर्मचारी जोडा ] (→ StaffQuickCreate, returns to slot)
```

**File: `web/src/components/edit/StaffPicker.tsx`**

Searchable list: rank-abbr + buckle + name. Filters on Marathi name, English name (if present), buckle, rank. Toggle `फक्त पात्र कर्मचारी` — **disabled, Coming Soon tooltip** (T11, SME-gated).

**File: `web/src/components/edit/StaffQuickCreate.tsx`**

Fields: पद (rank dropdown from masters), पूर्ण नाव (required), बक्कल नं (required), मोबाईल (optional). Save → POST /api/masters/staff → place in slot → return to context. Cancel → return empty-handed. Unique buckle soft warning only.

**File: `web/src/components/edit/StaffEditor.tsx`**

Full master staff editor (Layer A edit) — form prefilled with all fields.

### P2 task 6: Secondary panels (S8)

Collapsible panels below the board (expanded state remembered per user in memory). Each panel is a separate component:

| Panel | File | Contents |
|---|---|---|
| ▸ रजा / इतर ड्युटी | `panels/LeavePanel.tsx` | Category columns, side-by-side (not vertical) |
| ▸ मनुष्यबळ | `panels/ManpowerPanel.tsx` | rank × status matrix, verbatim values, labeled derived values |
| ▸ अधिकारी सारांश | `panels/OfficerSummaryPanel.tsx` | 15-row table with source/suggestion/override marker |
| ▸ अचानक ड्युटी बदल | `panels/ChangeLedgerPanel.tsx` | append-only ledger rows |
| ▸ स्कॅन वेळापत्रक | `panels/ScanPanel.tsx` | 4 sessions config + 12 hourly rows (picker targets) |
| ▸ सूचना | `panels/NoticesPanel.tsx` | ordered notices, add/edit/reorder |
| ▸ विशेष बंदोबस्त / िव्हेंट | `panels/EventsPanel.tsx` | event list → S11 editor |

### P2 task 7: Master data screens (S7)

**File: `web/src/components/master/MasterCRUD.tsx`**

Tabs: कर्मचारी | पदे | ड्युटी | ठिकाणे | युनिट | साहित्य. Plain searchable table + create/edit form (A-edit). Deactivate (never delete when referenced). No dashboards.

### P2 task 8: Search + History (S5/S6)

**File: `web/src/components/search/SearchScreen.tsx`**

One form: कर्मचारी name/buckle, ड्युटी, दिनांक range → results = chart dates with matching lines, click → highlight.

**File: `web/src/components/history/ChartHistory.tsx`**

Date list: आज | उद्या | अलीकडील | ऐतिहासिक. Row = date + lifecycle badge + version count. Click → read-only ChartBoard (Home-style).

### P2 task 9: Print preview (S10)

**File: `web/src/components/print/PrintPreview.tsx`**

Uses the same ChartDocument. Calls server endpoint `GET /api/charts/:date/print` which returns the HTML (from `server/render/chart-html.ts`). Browser print → PDF. Uses compv3.css print block.

The server already has `scripts/render-chart.ts` — expose it as an endpoint:
```
GET /api/charts/:date/print?snapshot=true
```
Returns `{ html: string, css: string }` or renders server-side. Or: React renders the same compv3 CSS to a print view and uses `window.print()`.

### P2 task 10: React + Vite integration tests

**File: `web/src/lib/render.test.tsx`** (Vitest + React Testing Library, OR rely on Playwright)

Actually: keep tests in `tests/` at root. The existing vitest config scopes to `tests/`. Add web tests there or use Playwright per the README. For P2, **skip exhaustive web unit tests** — rely on:
- Server-side tests (invariants + projection + render) which already verify data fidelity
- Manual/browser verification per the AGENTS.md workflow (browser preview with screenshot/console)
- P4 acceptance runs (A-10/09, A-11/09) which verify end-to-end

---

## P3 — Events (special event authoring + annex print)

### P3 task 1: Event API already defined in P1 task 1

The server routes for events exist from P1. The frontend EventBlock is in PRODUCT_UI_ARCHITECTURE §10 as a P1/P3 boundary.

### P3 task 2: Event editor screen (S11)

**File: `web/src/components/events/EventEditor.tsx`**

- Event form: शीर्षक (title_mr), तारीख, वेळ, ठिकाणी (venue), fall-in instruction
- Event personnel table: 11 rows (for रंगीत तालीम), each with person picker + role column
- Event equipment lines: अतिरिक्त साहित्य + अनिवार्य साहित्य, each with quantity fields
- Event instructions: ordered text notices
- Save → POST /api/events/:id + sub-collection routes
- Preview: shows event annex page layout

### P3 task 3: Event annex print extension

**File: `server/render/chart-html.ts`** — extend `renderChart()` to emit a 6th page when `doc.events.length > 0`:

```
Page 6: विशेष बंदोबस्त / गणेशोत्सव रंगीत तालीम
 Event title + date + time + venue
 Fall-in instruction (10:00, पो.स्टे.मैदान)
 Personnel table: 11 rows × (name + role)
 Equipment table: अतिरिक्त साहित्य (with quantities) + अनिवार्य साहित्य
 Instructions: ordered notices
```

This proves R-09: extra physical page = renderer output, no schema change.

---

## P4 — Acceptance + hardening

### P4 task 1: A-10/09 acceptance run

1. `npm run db:setup` (fresh DBs, migrations, seeds)
2. `npm run db:seed:chart` (10/09 chart)
3. `npm run render:chart` (projection render → `.tmp-preview/chart-2026-09-10.html`)
4. Open in browser preview → verify all sections present, Marathi readable, protected tokens intact, `..` cells preserved
5. `npm run verify` — all green
6. Checklist from INITIAL_AUDIT §7 Table 1: every legacy block is representable — **assert in tests**

### P4 task 2: A-11/09 acceptance run

1. `NODE_ENV=test npm run db:seed:chart -- 1109` (after P3 task 1 seed built)
2. Render 11/09 → 6th page (event annex) appears
3. Assert: no schema migration was needed for the extra page (the snapshot from 10/09 finalize renders identically, then 11/09 adds event page)
4. Verify all 11/09-specific differences rendered (परेड block, carry-over मोहिते, different बंद/charge states)

### P4 task 3: A-copy acceptance

1. Finalize 10/09 → produces chart_versions snapshot
2. `POST /api/charts/2026-09-10/copy?to=2026-09-11`
3. Assert: source chart hash unchanged (project fresh, compare)
4. Assert: target is DRAFT with `source='COPIED'` on assignments
5. Assert: availability conflicts returned as warnings (if any)
6. Assert: manpower/shift_summary seeded blank (DAILY INPUT policy)
7. Assert: officer_summary carries over with `source='COPY'`

### P4 task 4: Print verification (print-check skill)

1. Render 10/09 to HTML → browser preview
2. `window.print()` → PDF (A4 landscape)
3. Check: page-1 content extent ≤ 794px (fits one sheet)
4. Grayscale emulation: verify shape + text label redundancy (no color-only states)
5. Marathi wrap verification: no truncation on long names/duties
6. Save PDF artifact for visual comparison

---

## Verification gates (run `npm run check` = typecheck + test + doctor)

| Phase | Tests to add | Minimum green count |
|---|---|---|
| P1 | `tests/api.test.ts` (15 tests), `tests/copy-previous.test.ts` (8 tests), `tests/conflicts.test.ts` (6 tests) | ~22 new → total 53 |
| P2 | No new unit tests (manual/browser verification per AGENTS.md) | stays 53 |
| P3 | `tests/event-render.test.ts` (6 tests) — 11/09 render + annex page | ~6 new → total 59 |
| P4 | Acceptance checks pass (A-10/09, A-11/09, A-copy) | + print verification |

---

## File index (master list for the editor)

**Server:**
- `server/index.ts` — Fastify entry (NEW)
- `server/domain/copy-previous.ts` — copy logic (NEW)
- `server/domain/conflicts.ts` — conflict detection (NEW)
- `server/domain/manpower.ts` — derivation (NEW)
- `server/domain/officer-summary.ts` — officer derivation (NEW)
- `server/api.ts` — route plugin registration (NEW, or inline in index.ts)

**Web:**
- `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`, `web/tailwind.config.js`, `web/index.html`
- `web/src/main.tsx`, `web/src/app.tsx`
- `web/src/lib/api.ts`, `web/src/lib/types.ts`, `web/src/lib/chartDocument.ts`
- `web/src/components/layout/AppNav.tsx`, `TodayScreen.tsx`
- `web/src/components/chart/` (ChartBoard.tsx + 15 sub-components)
- `web/src/components/edit/` (ChartEditor, PersonAssignmentEditor, StaffPicker, StaffQuickCreate, StaffEditor, DateSwitchFlow, UnsavedChangesDialog, EditFlyout)
- `web/src/components/panels/` (7 panels)
- `web/src/components/master/MasterCRUD.tsx`
- `web/src/components/history/ChartHistory.tsx`
- `web/src/components/search/SearchScreen.tsx`
- `web/src/components/print/PrintPreview.tsx`
- `web/src/components/events/EventEditor.tsx`
- `web/src/styles/app.css` (imports compv3.css, adds @media print rules)

Yes, that completes the implementation plan. Let me summarize what was delivered:

I produced a **detailed, file-by-file implementation plan for P1-P4** covering:

- **P1 (Server):** Fastify REST API (`server/index.ts`), copy-previous domain logic with the Copy Policy matrix, conflict detection, manpower/officer derivation, API route tests
- **P2 (Frontend):** Vite+React 19 scaffold, API client + types, navigation + Home screen, compact board components (15 components matching the frozen compv3.css), editor with contextual `+` actions, PersonAssignmentEditor/StaffPicker/StaffQuickCreate, 7 secondary panels, master CRUD, search/history, print preview
- **P3 (Events):** Event editor screen, event annex page in the renderer (proving R-09: extra physical page = renderer output)
- **P4 (Acceptance):** A-10/09, A-11/09, A-copy acceptance runs + print verification with grayscale checks

The plan builds on the **already-verified green baseline** (P0 + P1 slice 1: migrations 0001-0007, seed, ChartDocument projection, finalize, 31 tests). It respects all hard rules: no BIMA inference from text, रिक्त ≠ बंद ≠ बिमा, finalized snapshots immutable, Marathi wrap-never-truncate, protected tokens preserved, no auto-scheduling, and every SME question recorded in OPEN_QUESTIONS.md rather than guessed.

The full plan is in the text above — copy as needed.