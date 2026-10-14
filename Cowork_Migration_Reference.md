<!--
Purpose: Consolidated migration reference for transitioning this session to Claude Desktop Cowork.
Current role: Master context packet — captures all rules, decisions, state, open questions, planning direction.
Last meaningful change: 2026-10-14 — built from conversation analysis + repo inspection.
Constraint: Cowork has read-only + limited edit/write repo access. This doc must be self-contained.
-->

# Cowork Migration Reference — Panchavati Daily Duty

> **Purpose**: One consolidated document for Claude Desktop Cowork. It captures every rule, decision, constraint, file map, and planning direction so Cowork can operate effectively with read-only + limited write access to the repo and the three sibling repos.

---

## 1. Core Rules (Hard Constraints)

### Product / Domain
- **Human-in-the-loop only.** The clerk chooses all personnel. Software calculates, validates, flags conflicts, preserves history, renders, and **suggests** derived data (weekly-offs from staff sources, repeating duty assignments, known daily patterns from the source Docx). Suggestions are presented for explicit clerk confirmation — never applied silently. No auto-fill, auto-replace, or "smart fill" that bypasses the clerk's explicit approval.
- **रिक्त ≠ बंद ≠ बिमा.** रिक्त = vacant seat · बंद = closed location · बिमा = per-assignment beat-marshal qualifier. BIMA is an explicit field. Never infer operational semantics from note text.
- **Immutable charts.** Finalized chart = immutable snapshot. Amendment = new version. Copy-previous never modifies the source chart.
- **PostgreSQL is the single store.** Physical PDF pages = render output, not domain truth. Never create page-specific tables or hardcode page geometry into the domain.
- **No information loss** from authoritative source charts. Secondary info → detail panels only.
- **No police operational data leaves the machine.** No external AI/API calls at runtime. One narrow exception: the demo deployment hosts the station's own 10/09 chart (approved 2026-10-13, recorded in OPEN_QUESTIONS T23 + DEPLOY.md). Everything else: no outbound calls, no keys, no CDN — the transliteration engine is served from this repo.
- **Never modify `reference/` files.** They are read-only evidence authority.
- **Never edit an applied migration.** Add a new one instead.
- **Marathi text wraps, never truncates.** Protected tokens (CCTNS, Dial 112 MERS, DB, MERS, rank codes PI/API/PSI/PROB_PSI/GPS/ASI/LASI/HC/LHC/PN/LPN/PC/LPC, TOTAL, Office, ME) are never translated or transliterated. Canonical spellings: बिमा (never विमा), पोशि (never पोषि). Devanagari digits are a display transform only.
- **Unfinished features are "Coming Soon" and disabled** — no half-usable controls.
- **Invariant 5 applies to the whole repo** (`db/`, `server/`, `scripts/`, `web/`):** no `fetch(`/`axios` for external data. New dev tools go in `tools/` only.

### Reading order (before ANY task)
1. `docs/CURRENT_STATE.md` — what is actually built and verified right now
2. `docs/SESSION_HANDOFF.md` — long-form state, traps, open designs
3. `docs/DOMAIN.md` — entities and rules
4. `docs/ARCHITECTURE.md` — how the pieces fit
5. `docs/OPEN_QUESTIONS.md` — what must not be guessed
6. The task's relevant slice of code
7. `reference/` evidence only when the task touches chart content or print

`docs/INITIAL_AUDIT.md` is the historical decision baseline for why this repo exists and what was reused/discarded.

### Session discipline (end of every coding session)
Update in this order of importance:
1. `docs/CURRENT_STATE.md` — implementation truth + verification status
2. `docs/OPEN_QUESTIONS.md` — new ambiguities discovered
3. `docs/TRACEABILITY.md` — source → requirement → implementation → test mappings touched
4. `changes/<id>/proposal.md` — for active work units
5. Tiny maintenance header on new/substantially changed files

---

## 2. Repository Structure

### Main repo (the workspace)
- **Location**: `C:\Users\kusha\Desktop\DailyDutyPanchavati-ui-rebuild (4)`
- **DB**: PostgreSQL 17, trust auth as `postgres`; **`panchavati3_dev`** + **`panchavati3_test`** (old DBs untouched: `panchavati_dev`, `panchavati_test`, `panchavati_combined`, `panchavati2_dev`)
- **Git**: P0 committed 2026-10-08 (two commits: code `cc1ecf9`, docs `eedf45a`); everything after is uncommitted

### Directory map
```
docs/          — all docs (CURRENT_STATE, SESSION_HANDOFF, DOMAIN, ARCHITECTURE, OPEN_QUESTIONS, etc.)
server/        — Fastify server, domain layer, renderer (TypeScript)
  index.ts       — routes, /charts/:date, /api/*, print
  chart-document.ts — ChartDocument projection + projectChart()
  finalize.ts    — finalizeChart(), reopenForAmendment()
  assignments.ts — assignment CRUD (addOfficerBox, removeOfficerBox, etc.)
  chart-presentation.ts — PATCH /api/charts/:date/presentation
  presentation.ts — PATCH /api/charts/:date/presentation
  structure.ts   — PATCH /api/charts/:date/structure
  notices.ts     — notice CRUD
  db.ts          — fail-loud pg pool helper (test DB in NODE_ENV=test)
  render/
    chart-html.ts — THE renderer (HTML → Playwright PDF)
web/           — authoring layer
  chart-authoring.js — edit mode, staff picker, transliteration, presentation UI
  authoring.css — authoring/density/defect fixes (print + screen)
  chart-presentation.css — whitelisted presentation hooks
  assets/Police_Logo.png
db/            — migrations, seeds, migration runner
  migrate.ts        — sha256 checksum guard
  migrations/       — 0001–0008 (forward-only)
  seed/
    0001_reference_data.sql  — Layer-A masters
  seed-reference.ts — reference data seeder
  seed-chart-1009.ts — 10/09 chart seed (content authority = reference/SEMANTIC/10.md)
tests/         — Vitest suites (invariants, chart-document, render, render-fidelity, authoring, presentation, structure)
tools/         — print-audit.mjs (invariant 5 exception)
skills/        — project-local procedural skills (source-forensics, db-change, etc.)
design/        — frozen visual references (compv3.css, compv3.html)
reference/     — read-only evidence corpus (ORIGINAL_VISUAL, SEMANTIC, EXCEL_RECONSTRUCTION)
src/           — React app (dormant — will activate when it can render ChartDocument losslessly)
dist-app/      — built React output
render.yaml    — Render Blueprint (demo deployment)
```

### Three sibling repos
1. **Old repo A**: `DailyDutyPanchavati` (branch `render-main`, 2026-09-28) — source of reuse only
2. **Old repo B**: nested `DailyDutyPanchavati-ui-rebuild/DailyDutyPanchavati-ui-rebuild` (branch `p0-p1-implementation`) — Kushal's latest work
3. **Kushal's handoff**: `DailyDutyPanchavati-ui-rebuild/NEW DATA/kushals repo/archive/` — reference for UI patterns (AppNav.tsx, Page1View…Page6View.tsx, HistoricalSearchView.tsx)

### Key paths for Cowork
- AGENTS.md: `C:\Users\kusha\Desktop\DailyDutyPanchavati-ui-rebuild (4)\AGENTS.md`
- Active chart: server-rendered at `GET /charts/2026-09-10` (redirect from `/app/charts/:date`)
- Frozen visual baseline: `design/panchavati-compv3.html`
- Legacy six-page chart: separate app on `http://localhost:3101/charts/<date>` (`npm run legacy:start`)

---

## 3. Commands & Verification

### Primary gate
```bash
npm run check            # typescript + vitest (96 tests) + doctor × 2 DBs
npm run dev              # Fastify on 127.0.0.1:3100 (default LOG_LEVEL=warn)
npm run print:audit      # every .page box vs one A4 sheet (headless Chrome + CDP)
npm run render:chart     # static render -> .tmp-preview/chart-<date>.html
npm run build:app        # Vite build of the dormant React app
npm run legacy:start     # the legacy six-page chart app (:3101)
npm run demo             # this app + both legacy reference apps
npm run stop             # stop this project's ports
npm run stop:all         # kill all node processes
```

### Seeding (deliberate, never automatic in deploy build)
```bash
npm run db:seed:reference   # Layer-A masters (idempotent)
npm run db:seed:chart       # 10/09 chart (wipe-and-reseed, DRAFT only)
# With PANCHAVATI_KEEP_EXISTING=1, skips charts that already have rows
```

### Verification traps (do not rediscover)
1. **`npm run start|dev` has no watch for the renderer.** Editing `server/**` requires server restart (`netstat -ano | grep :3100` → `taskkill //PID <pid> //T //F`).
2. **Preview screenshots are intermittent.** Reload/reopen the tab and retry; prefer DOM measurements or `npm run print:audit`.
3. **`code_search`/ripgrep is broken** in some environments (`ENOENT … rg.exe`). Use `grep -n` via terminal.
4. **Chrome CLI needs a Windows path**: `--print-to-pdf="$(cygpath -w …)"`
5. **Invariant 5**: no `fetch(`/axios in `db/`, `server/`, `scripts/`, `web/`. Dev tools with HTTP go in `tools/` only.
6. **`authoring.css` applies on screen AND print**; only its `@media print` blocks are print-only. `compv3.css` is human-owned.
7. **Pages are A4 landscape**: `.page` = 1122×794 px, `@page margin 0`, print padding 5mm.
8. **Port conflict**: other checkouts also listen on 3100/3000. Confirm the PID before judging a URL.
9. **Dev DB must be clean**: restore to 212 assignments + `presentation_overrides = {}` after testing.

### Test files and what they cover
| File | Tests | What it covers |
|---|---|---|
| `tests/invariants.test.ts` | 19 | Seeded counts vs source (212 assignments, 10 बिमा, 2 रिक्त, 7 loc-states, 69 availability, 28 notices, 240 matrix cells, 15 officers, 12 scan rows); schema constraints; static scans (no auto-assign, no remarks parsing, no outbound network) |
| `tests/chart-document.test.ts` | 12 | Projection fidelity, column stacks, रिक्त/बिमा/बंद facts, template pinning, override resolution, finalize snapshot ≡ projection, freeze, master-edit independence, amendment chain |
| `tests/render.test.ts` | — | No-loss 212/212, verbatim matrix cells, protected tokens, 7 `.page` boxes |
| `tests/render-fidelity.test.ts` | 10+ | Structure, no stray blocks, no officer duplication, section presence, marshal fold, desk-post fold, in-charge once per block |
| `tests/authoring.test.ts` | — | Conversion table, protected tokens, name round-trips (175/179), review gate, no CDN, parse test for client JS, enabled controls |
| `tests/presentation.test.ts` | — | Validation, safe resolution/merge, JSONB persistence, FINALIZED 409, no source-row change |
| `tests/structure.test.ts` | — | Table/column CRUD structure |

---

## 4. Current Verified State (as of 2026-10-13)

### What works
- **`npm run check` green**: typecheck + 96 tests + doctor × 2 DBs
- **Print:audit 6/6 sheets fit** (all ≤ 775px printable height)
- **Render:chart 212/212 rows lossless**
- **Active chart at `/charts/2026-09-10`**: server-rendered ChartDocument, full CRUD enabled, presentation controls, bilingual chrome
- **10/09 chart seeded**: 212 assignments · 10 बिमा · 2 रिक्त · 69 availability · 7 loc-states · 28 notices · 240 matrix cells (verbatim) · 15 officers · 12 scan rows
- **7 A4 sheets**: 1 command/core · 2 chowki band · 3 office/court/special · 4 availability/notices · 5 manpower · 6 officer summary + scan + sign-off

### 7 sheets map
| Sheet | Content |
|---|---|
| 1 | Sr-PI identity, 4 subordinate officers, day/night core, office/court/special desk posts |
| 2 | Six-chowki day/night matrix, BIMA, marshal (folded into chowki), बंद/चार्ज |
| 3 | Office/clerical, court, summons, warrant, special duties, notices |
| 4 | Leave and other duties (availability) |
| 5 | Manpower matrix, source values, summaries, sudden-change ledger |
| 6 | Officer summary, scan schedule (session cards + hourly strip) |
| 7 | Sign-off (clerk + सम्पादक + प्रमुख) |

### CRUD that ships (all user asks from 2026-10-13 resolved)
- **Officer box**: add / rename / delete (tile in officer band row)
- **Chowki box**: add / rename / delete
- **Sr-PI box**: रायटर is a real clickable slot; चालक/RTPC/ऑपरेटर day+night seats creatable + clearable
- **Support seats**: POST/DELETE `/api/charts/:date/support`
- **Per-chart labels**: rename any of 185 text elements, element scope + all scope (`PATCH …/labels`)
- **Per-element presentation**: align, compact, hide (`PATCH …/presentation`, 189 elements)
- **Structure**: add/remove tables, columns, rows (`PATCH …/structure`)
- **Notices**: CRUD lines (`server/notices.ts`)
- **Clerk sign-off**: editable values via `PATCH …/values`

### What's dormant (NOT yet built)
- 11/09 chart seed + event annex page (R-08)
- Assignment suggestions (never auto-fill — hard rule)
- Real authentication (pseudo-login only, local `localStorage`)
- Advanced search page (needs Kushal's `HistoricalSearchView.tsx` read first — T24)
- English companion persistence for chart-local text (T22.1)
- Full template builder
- OCR import, WhatsApp/Telegram runtime coupling
- Multi-station support

---

## 5. Open Questions (Must Not Be Guessed)

### SME-gated (blocks semantics, not build)
- **N1**: BIMA trigger semantics — what makes a person बिमा that day? Model keeps `is_bima` boolean; no inference.
- **N2**: Notice ownership — chart vs event vs assignment scope. Current: chart-scoped with optional link.
- **N3**: RTPC/operator meaning — visual grouping only until confirmed.
- **N4**: Manpower `03` (प्रत्यक्ष हजर) — stored clerk-entered, never recalculated.
- **N5**: `ME` column semantics — preserved as protected token; totals stored, not recalculated.
- **N6**: Equipment legal binding — allocation lines only; no eligibility rules without SME.
- **N7**: Home station vs attached force (परि. prefixed officers) — needs `source_unit` field?
- **N8**: Generic deployment-context hierarchy — deferred until evidence demands.
- **N9**: सुरक्षित ॲप vs ग्रीन ॲप — two apps or same routine? Affects scan-config wording only.
- **N10**: Officer roster ownership — who maintains the 15-row summary?
- **N11**: Time-window semantics beyond observed evidence (split shifts, hourly windows on leave).
- **N12**: Office duty catalog authority — seeded from source; clerk-editable daily.
- **N13**: Do notices belong to a duty block? (blocks the notices brief)

### Technical/product decisions (decided for MVP, revisit later)
- **T1**: Auth & users — single shared clerk user for MVP; RBAC deferred until station confirms roles.
- **T2**: Concurrency — single-user local deployment; last-save-wins acceptable now.
- **T3**: Printer reality — station prints in color. ✅ RESOLVED 2026-10-08 (user).
- **T4**: Event model growth — only रंगीत तालीम-type events have evidence. No recurrence/approval/integrations.
- **T5**: Data migration — seeds only, not live DB dumps. ✅ DECIDED.
- **T6**: New database names — `panchavati3_dev/test`. ✅ CONFIRMED at P0.
- **T7**: Header digit style — Devanagari display transform everywhere. ✅ RESOLVED 2026-10-08.
- **T8**: Stitch output — moot. Stitch designs superseded. ✅ CLOSED 2026-10-08.
- **T9**: Template edit permissions — any clerk for MVP (single shared user, T1); schema keeps `created_by`.
- **T10**: EN↔MR staff-name transliteration — manual dual-entry + Sanscript engine with review gate. ✅ SETTLED.
- **T11**: Staff eligibility matrix — toggle ships disabled (Coming Soon); rules enter DB only with SME input.
- **T12**: Custom template version sharing — station-shared (one station, one clerk) for now.
- **T13**: Chart B-detail storage — hybrid: normalized B tables while editing → ChartDocument projection → immutable `chart_versions.document_json` snapshot at finalize. ✅ RESOLVED 2026-10-08.
- **T14**: नगदी कारकुन seat pairing — seed follows SEMANTIC source flow with explicit रिक्त slots; SME to confirm when editor exists.
- **T15**: Marshal posts on page 2 — fold into paired chowki. ✅ RESOLVED 2026-10-11 (user, option b).
- **T16**: Mock content with no source evidence (ऑपरेटर writers, विशेष box writer, shift-summary numbers). Never invent; check `reference/ORIGINAL_VISUAL/` PDFs first.
- **T17**: Staff names Latin in master (पोहवा १३४७ Kushal) — needs transliteration (T10).
- **T18**: Print pagination — one `.page` = one A4 sheet. ✅ RESOLVED 2026-10-12 (print-density pass).
- **T19**: Legacy reference chart surface — linked (own tab), never re-implemented. ✅ RESOLVED 2026-10-13.
- **T20**: Date selector design — copy from Kushal's AppNav.tsx. ✅ RESOLVED 2026-10-13.
- **T21**: Dense-table layout choices — Option A of both briefs (scan session cards + folded hourly strip; court register as grouped headings). ✅ RESOLVED 2026-10-13.
- **T22**: Transliteration conventions — Sanscript + Marathi convention layer + protected tokens + review strip. ✅ SETTLED.
- **T23**: Public demo URL — demo may carry the station's real 10/09 chart, with `PANCHAVATI_KEEP_EXISTING=1`. ✅ RESOLVED 2026-10-13.
- **T24**: Advanced search page — read Kushal's `HistoricalSearchView.tsx` first. NOT BUILT.

---

## 6. Data Model (Key Tables)

### Masters (station configuration)
```sql
ranks              rank_code, name_mr, cadre, display_order
staff_members      name_mr, name_en?, rank, buckle_no, phone?, active
locations          kind (STATION|CHOWKI|MARSHAL_POST|OFFICE|COURT|FIXED_POINT), active
duty_definitions   code, title_mr, default_window, active
units              code, title_mr
equipment          code, title_mr, category
template_versions  version, name_mr, layout (JSONB), is_active
```

### Daily (one chart per date)
```sql
daily_charts              chart_date (unique), lifecycle, template_version_id,
                          presentation_overrides (JSONB)
chart_versions            immutable snapshot (version_no, document_json, created_at)

daily_assignments         chart_id, shift, duty_id, duty_title_mr, location_id,
                          staff_id, allocation_state (ALLOCATED|VACANT_RIKT),
                          is_bima, role_mr, start_time, end_time, status,
                          source (MANUAL|COPIED|REPLACED), notes_mr, unit_id,
                          sort_order, column_no

daily_availabilities      chart_id, staff_id, date, category, start_time?, end_time?,
                          notes_mr

location_operational_states chart_id, location_id, is_closed, charge_destination_location?

sudden_duty_changes       chart_id, original_staff_id, replacement_staff_id?, reason_mr,
                          change_time, actor

chart_notices             chart_id, group_key, order_seq, text_mr, scope_json?

scan_schedule_config      session_name, day_type, chowki_order, mobile_routing
scan_schedule_daily       chart_id, session_name, hour_slot, staff_id, notes

special_events            title_mr, type, date, time, venue_location_id, fall_in_text_mr
event_assignments         event_id, staff_id, role_mr?
event_equipment           event_id, staff_id, name_mr, quantity, is_mandatory
event_instructions        event_id, order_seq, text_mr

manpower_records          chart_id, rank_code, status, value_text (verbatim)
officer_summary_rows      chart_id, officer_no, duty_title_mr, source, suggestion, override
```

### Three critical distinctions (never blur)
1. **रिक्त** = `allocation_state = 'VACANT_RIKT'` (slot state, never a person)
2. **बंद** = `location_operational_states.is_closed = true` (location state, with charge destination)
3. **बिमा** = `daily_assignments.is_bima = true` (per-assignment boolean, never inferred)

---

## 7. API Endpoints (REST)

### Chart lifecycle
- `GET /api/charts` — list charts `[{chart_date, lifecycle}]`
- `GET /api/charts/:date` — full chart document
- `PATCH /api/charts/:date/lifecycle` — draft/validated/finalized transitions
- `POST /api/charts/:date/finalize` — freeze snapshot
- `POST /api/charts/:date/reopen` — FINALIZED → DRAFT (amendment)

### Assignments (CRUD)
- `POST /api/charts/:date/assignments` — create assignment
- `PATCH /api/charts/:date/assignments/:id` — update (staff, बिमा, time, notes)
- `DELETE /api/charts/:date/assignments/:id` — clear (→ रिक्त)
- `POST /api/charts/:date/officer` — add अ�िकारी box (creates override + 1 रिक्त writer seat)
- `DELETE /api/charts/:date/officer/:label` — remove officer box (409 if holding a person)
- `POST /api/charts/:date/chowki` — add chowki block
- `DELETE /api/charts/:date/chowki/:locationId` — remove (409 if charge points to it)
- `POST /api/charts/:date/support` — create चालक/RTPC/ऑपरेटर seat
- `DELETE /api/charts/:date/support/:role` — remove support seat

### Presentation (no migration — JSONB overrides)
- `PATCH /api/charts/:date/labels` — rename text element (`{scope: "element"|"all", key?, text}`)
- `PATCH /api/charts/:date/presentation` — align/compact/hide (`{elementKey: {horizontalAlign, verticalAlign, hidden, compact}}`)
- `PATCH /api/charts/:date/structure` — add/remove tables, columns, rows
- `PATCH /api/charts/:date/values` — sign-off values
- `PATCH /api/charts/:date/structure/notices` — notice lines CRUD

### Masters
- `GET /api/masters` — counts + staff/location/duty references
- `POST /api/masters/staff` — used by assignment flow (create new staff)
- `PATCH /api/masters/staff/:id` — edit master

### Render
- `GET /charts/:date` — HTML render (the active surface)
- `GET /chart-pdf/:date` — PDF (via Playwright)
- `GET /design/panchavati-compv3.html` — frozen visual baseline
- `GET /assets/police-logo.png` — logo
- `GET /vendor/sanscript.js` — transliteration engine (local, no CDN)

### Guards
- FINALIZED charts → 409 on all mutations
- Duplicate labels → 409
- Blank required fields → 400
- Invalid presentation values → 400

---

## 8. Key Files to Know (for Cowork)

### Renderer (print authority)
- `server/render/chart-html.ts` — THE HTML renderer (7 pages, one A4 landscape each)
- `web/authoring.css` — print density rules + authoring styles (`.page.dense` media blocks)
- `web/chart-presentation.css` — whitelisted presentation hooks (`data-presentation`)

### Server logic
- `server/chart-document.ts` — ChartDocument projection (`projectChart()`, `getSnapshot()`, `weekdayMr()`)
- `server/finalize.ts` — `finalizeChart()` (lock → project → snapshot → FINALIZED), `reopenForAmendment()`
- `server/assignments.ts` — assignment CRUD + `addOfficerBox()`, `addChowkiBlock()`, support seats
- `server/chart-presentation.ts` — safe presentation overrides contract
- `server/structure.ts` — table/column/row structure changes
- `server/notices.ts` — notice CRUD

### Client (authoring layer)
- `web/chart-authoring.js` — edit mode, staff picker, transliteration (`romanToDev`/`devToRoman`), presentation UI, support seat CRUD
- `web/authoring.css` — edit-mode affordances, `@media print` density rules
- `node_modules/@indic-transliteration/sanscript/` — transliteration library (MIT, local)

### Seeds
- `db/seed/0001_reference_data.sql` — Layer-A masters (ranks, staff, locations, duties, units)
- `db/seed-chart-1009.ts` — 10/09 chart seed (authority = `reference/SEMANTIC/10.md`)

### Verification
- `tools/print-audit.mjs` — print-fit checker (invariant 5 exception)
- `tests/` — 96 tests across 7 suites

### Decisions
- `docs/COMPACT_V4_DECISIONS.md` — consolidated design decisions (do NOT reintroduce rejected layouts)
- `docs/BACKLOG.md` — resumable list of everything the user asked for
- `docs/DOMAIN.md` — entity definitions + 3 critical facts (BIMA/marshal/closure distinction)
- `docs/ARCHITECTURE.md` — data model + invariants + UI map
- `docs/OPEN_QUESTIONS.md` — all open questions with status

---

## 9. Next Steps (User-Driven Priority)

1. **Assignment defaults** — suggestions only, never auto-fill (hard rule)
2. **11/09 chart seed + event annex page** — R-08, needs event authoring
3. **Print verification of both days** — 10/09 is verified; 11/09 pending its seed
4. **T9–T12 deferred** (template rights, transliteration conventions, eligibility, sharing) — have defaults
5. **Chart-wide coherence pass** — see `docs/COHERENCE_AUDIT_1013.md` for honest findings

### Explicitly deferred (NO implementation without a user decision)
- 11/09 event annex (needs 11/09 seed first)
- Legacy six-page viewer as authoring screen (kept as reference render only)
- OCR import
- Full historical search (T24 — read Kushal's code first)
- Real authentication
- Multi-station
- Cloud/WhatsApp/Telegram runtime
- Full template builder

---

## 10. Entry Prompt for Cowork

When starting a new Cowork session, use this prompt to initialize:

```
You are an expert engineer working on the Panchavati Daily Duty chart system — a PostgreSQL-backed, 
Fastify/React/Marathi-first application for a single police station in Nashik. 

READ THESE FILES FIRST (mandatory pre-flight):
1. docs/CURRENT_STATE.md — what is built and verified now
2. docs/SESSION_HANDOFF.md — state, traps, open designs
3. docs/DOMAIN.md — entities and rules (especially the BIMA vs marshal vs closure distinction)
4. docs/ARCHITECTURE.md — data model and invariants
5. docs/OPEN_QUESTIONS.md — what must NOT be guessed
6. AGENTS.md — reading order and hard rules

KEY CONSTRAINTS:
- Human-in-the-loop only: clerk chooses all personnel, software calculates/flags/renders
- RIKH ≠ BAND ≈ BIMA — never infer from Marathi note text
- Finalized charts are immutable snapshots
- PostgreSQL is the only store; no page-specific tables
- 212/212 rows verified lossless on 10/09 — never regress
- All sheets must fit one A4 (A4 landscape = 775px printable height)
- No police data leaves the machine (no external API calls, no CDN; Sanscript served locally)
- Never modify reference/ files or edit applied migrations
- npm run check is the gate: typecheck + 96 tests + doctor × 2 DBs

AVAILABLE TOOLS: file read/write/edit, terminal (bash), code search (grep -n), browser preview with 
screenshots/console, git. NOT available: ripgrep binary (use grep via terminal), network fetch of 
external URLs (WebFetch/WebSearch only for general knowledge, NOT for pulling repo content).

You have read + limited write access to the repo. For HTTP/API testing use the browser or file-based 
curl payloads (Windows curl mangles Devanagari). Always restore the DB to baseline (212 assignments, 
presentation_overrides = {}) after testing.
```

---

## 11. Plugin/MCP Configuration for Cowork

If configuring Claude Desktop Cowork's MCP servers, the recommended JSON:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/DailyDutyPanchavati-ui-rebuild (4)"]
    }
  }
}
```

Note: PostgreSQL MCP server is optional since `server/db.ts` handles connections. Shell/terminal access covers `npm run` commands.

---
