<!--
Purpose: Compaction-proof live tracker for work unit 1009 (make the app real: dev command, persisted editing, add-boxes, tooltips).
Current role: Single source of truth for THIS session — decisions, verified facts, what works / what doesn't, files changed, checks run. Re-read this file first after any context loss.
Last meaningful change: 2026-10-09 — created at session start (before code changes).
Constraint/dependency: AGENTS.md hard rules; only claims backed by code/tests may be recorded as done.
-->

# 1009 — Real authoring app (live tracker)

## Session decision (recorded, reversible)

STATUS: session decision for v1 — NOT yet an established project fact. Architecture docs may only be
updated after the approach is validated against editing, persistence AND print requirements.
Order of work (user directive 2026-10-09): (1) persisted assignment vertical slice first,
(2) quick-create staff follows the same real assignment path, (3) keep design/compv3.css stable —
new authoring styles live in a separate stylesheet; hover-border interaction preserved; add-box
controls restored; abbreviation tooltips must not appear in print. Also: finalize immutability is
an INSPECTED-CODE finding only until the relevant tests are rerun this session.

**View layer = server-rendered progressive enhancement** (Fastify `server/index.ts` serves the
ChartDocument HTML from `server/render/chart-html.ts` + one authoring script), NOT a React/Vite app.
Rationale: a lossless renderer already exists and is the print path; React would duplicate the chart
or need an iframe bridge + dual dev processes; the handoff explicitly forbids *blindly* adding React
and asks for the smallest maintainable setup. `docs/ARCHITECTURE.md`'s React line is the documented
target — mark it "not implemented; superseded-for-v1 by this decision" in docs at session end.
Domain architecture (A/B/C/D layers, lifecycle, narrow mutations) unchanged.

## ADDITION 2026-10-09 (user) — editable recurring relationships / assignment defaults

Requirement: model recurring operational relationships as **suggestions**, configurable by the clerk
through the real UI, saved to PostgreSQL, never forced onto dates. New evidence source:
`DailyDutyPanchavati-ui-rebuild/NEW DATA/REPORT/README.md` (reliable OCR, 4 reference dates:
10/11/12/16 Sep 2026).

Classification rule (user's 5 classes): 1 person-level attribute (staff master) · 2 reusable
relationship/default (relational table, FKs, CRUD) · 3 daily operational assignment (chart/Layer B) ·
4 presentation/template rule · 5 unverified hypothesis (optional candidate only, never fact).
Key examples: branch/officer → writer = default (NOT a staff column); standing duty → default staff;
chowki → usual in-charge; unit → usual personnel; duty → standard window = duty config;
बंद/charge = per-chart state; BIMA = per-assignment, never staff trait.

Safeguards: defaults are suggestions (accept/change/clear); unknown = NULL, never invented;
daily change never rewrites defaults or finalized snapshots; apply defaults only to EMPTY slots,
never overwrite explicit choices; deactivate/soft-delete, no cascade of staff/history;
seed ONLY source-verified relationships (Hazari Master पोहवा 692 गुंबाडे / Property Room Clerk
पोहवा 1091 गारे IF the verified source confirms across dates — check the OCR README + SEMANTIC);
no arbitrary JSON blobs for searchable relationships; no new migration needed per new duty/branch.
Plan: migration 0008 + relational defaults table + API CRUD (whitelisted, tx) + picker
"suggested" section + management UI + tests. **Do this AFTER slice 1 (persisted reassign) is green.**

## Verified facts (from inspection, not assumption)

- Latest commit `4d721c8`; clean tree at session start (only untracked `current_cmd_output.txt`).
- `package.json` scripts: NO `dev`. Existing: test, db:create/migrate/seed*, render:chart, db:setup,
  typecheck, doctor, verify, check. Deps: fastify, @fastify/cors, pg. NO react/vite/tailwind.
- Server: Fastify on 127.0.0.1:3100. Routes: GET /health, /design/compv3.css, / (→ /charts/2026-09-10),
  /charts/:date (HTML), GET/PUT /api/charts/:date, POST /api/charts/:date/finalize|reopen,
  GET /api/masters, POST/PATCH /api/masters/staff.
- **Dangerous/unfinished code found:**
  - `PUT /api/charts/:date` = full DELETE-all + reinsert assignments (footgun, currently unused by UI).
  - `PATCH /api/masters/staff/:id` interpolates request keys into SQL (whitelist needed).
  - Inline picker in `chart-html.ts`: `selectStaff()` only sets `innerText` — NOT persisted.
  - `submitNewStaff()` creates master but never assigns the returned staff_id to the slot.
  - `flyerEditDetails()` uses `prompt()` + innerText (forbidden by handoff).
- Renderer: `renderChart(doc)` → 5-page HTML, no-loss accounting, tests in `tests/render.test.ts`.
- compv3.css (frozen, human-owned) already contains `.mode-edit`/picker styles from commit 4d721c8;
  comment header disagrees with that code. **Do not edit compv3.css further** — new authoring styles
  go to a separate stylesheet served by the server.

## Status ledger — what works / what doesn't

(Update this section after every verification run.)

| Capability | State | Evidence |
|---|---|---|
| `npm run check` at session start | NOT YET RERUN | pending |
| `npm run dev` | ❌ missing script | package.json |
| Chart loads in browser (server HTML) | believed working (user ran render:chart) | rerun needed |
| Staff picker persists to PostgreSQL | ❌ fake (innerText only) | code read |
| Add-box controls (+ अधिकारी / + चौकी) | ❌ absent from renderer | code read |
| Abbreviation tooltips | ❌ absent | code read |
| Finalize immutability | ⏳ inspected-code finding (API 409 + DB triggers) | tests must be rerun this session before claiming ✅ |

## Files changed this session

(to be filled as work proceeds)

## Checks run

(to be filled; never claim an unrun check)

## Next three highest-value tasks

(to be filled at end)
