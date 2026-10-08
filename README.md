<!--
Purpose: Repository contract — how to operate this repo without asking an agent.
Current role: P0 README (Quasar-derived engineering practices only; no SaaS/infra imports).
Last meaningful change: 2026-10-08 — created at P0 (DB foundation) completion.
Constraint/dependency: AGENTS.md is the authority contract; this file documents commands and boundaries.
-->

# Panchavati Daily Duty — clean rebuild

Marathi-first daily duty chart for **one station** (Panchavati PS, Nashik City). One clerk user.
Local-only: **no police operational data leaves this machine** (no cloud, no external APIs at runtime).

`AGENTS.md` is the standing agent contract (reading order, hard rules).
This README is the **operator contract**: what this repo is, which layer owns which fact,
and the exact commands that prove the repo is healthy.

## Architecture in one screen

```
Layer A  masters (ranks, staff, locations, duties, units, scan config, templates)
            ↓  never derived from chart data; seeded from reference/ evidence only
Layer B  operational chart data (assignments, availability, loc states, notices,
            manpower, officer summary, scan rows)   ← editing source of truth (DRAFT)
            ↓  ChartDocument projection (P1)
Layer C  chart_versions.document_json  ← immutable snapshot at FINALIZE;
            reprints and amendments replay THIS, never today's masters
Layer D  derived values (computed totals)   ← rendered, never editable, never stored
            ↓
       preview / print (physical pages are render output, not domain truth)
```

Templates (`template_versions`) own presentation structure; a chart pins its
`template_version_id` at creation. "This chart only" visual tweaks live in
`daily_charts.presentation_overrides` (JSONB, keyed by template node id) — never
baked into master data or code.

### Which layer is authoritative for each fact

| Fact | Authority |
|---|---|
| Staff name, rank, buckle no. | Layer A (master data) |
| Who works today | Layer B (chart data) |
| `बिमा` | explicit `is_bima` boolean per assignment — never inferred from text |
| `रिक्त` | explicit `allocation_state='VACANT_RIKT'` — a slot state, never a person |
| `बंद` + charge destination | explicit `location_operational_states` row — a place fact, never a person fact |
| Officer title / section order / colors | template (`template_versions` + `presentation_overrides`) |
| Manpower matrix cell text | Layer B, stored **verbatim from source** — never recalculated |
| Finalized chart contents | `chart_versions.document_json` snapshot |
| Historical PDF/XLSX/HTML | `reference/` corpus (read-only evidence) |

### What must never be inferred

- BIMA, closure, or any operational meaning from `notes_mr`/`remarks_mr` (no regex parsing, ever).
- Personnel choices — the clerk chooses; software calculates, flags, renders only.
- `..`, blanks, or OCR artifacts in source tables are **display values**, not zeros.

## Commands

```bash
npm install                # once
npm run db:create          # creates panchavati3_dev + panchavati3_test (if missing)
npm run db:migrate         # forward-only migrations (both DBs: run with NODE_ENV=test too)
npm run db:seed:reference  # Layer A masters (idempotent)
npm run db:seed:chart      # 10/09 chart seed from reference/SEMANTIC/10.md (wipe-and-reseed, DRAFT only)
npm run db:seed            # reference + chart

npm test                   # invariant suite (vitest, always runs against panchavati3_test)
npm run typecheck          # tsc --noEmit (strict)
npm run doctor             # objective environment diagnostics (exit 1 on any failure)
npm run verify             # typecheck + test + doctor — THE gate before claiming done
npm run check              # alias of verify (the command AGENTS.md tells agents to run)
```

Fresh-machine setup: `npm install && npm run db:setup`, then
`NODE_ENV=test npm run db:migrate && NODE_ENV=test npm run db:seed` for the test DB,
then `npm run verify`.

## Rules for changing schema or data

- Migrations: `db/migrations/NNNN_*.sql`, forward-only. **Never edit an applied file**
  (the runner stores sha256 checksums and refuses drift). Roll back by adding a new file.
- No personnel/chowki names inside migrations — masters go in `db/seed/*.sql`,
  daily chart data in `db/seed-chart-*.ts`.
- Seeds must derive from `reference/` evidence, never from old database dumps.
- `reference/` is read-only. The frozen visual baseline is `design/compv3.css` +
  `design/panchavati-compv3.html` (maintained by the human, not by agents).

## Evidence status vocabulary (used across docs/)

```
Confirmed           human-verified against source
Evidence-backed     derived from reference/ but not yet human-spot-checked
Implementation decision   engineering choice, not a domain claim (recorded, reversible)
SME-gated           needs the clerk/officer to decide (docs/OPEN_QUESTIONS.md)
Unknown             intentionally unfilled — never replace with an assumption
```

## Repository map

```
AGENTS.md            standing agent contract (authority + hard rules)
README.md            this file — operator contract
docs/                CURRENT_STATE (what is true now), DOMAIN, ARCHITECTURE,
                     PRODUCT_UI_ARCHITECTURE (approved), OPEN_QUESTIONS (intentional unknowns),
                     TRACEABILITY (source→requirement→implementation→test)
db/                  migrations/, seed/, runners (migrate, seed-reference, seed-chart-1009)
server/              db.ts (fail-loud pool; test runs target panchavati3_test)
scripts/             create-dbs.mjs, doctor.mjs
tests/               invariants.test.ts (DB constraints + triggers + static source scans)
design/              frozen compact-v3 visual/print baseline (human-owned)
reference/           read-only evidence corpus (PDF/XLSX/HTML/semantic)
changes/             work-unit proposals
skills/              project-local agent skills
```

## Hygiene

- `.env`, credentials, database dumps, and real operational data never enter git.
- Old repo copies under this workspace (e.g. `DailyDutyPanchavati-ui-rebuild/`) are
  archives — not part of this build; vitest is scoped to `tests/` so they never run here.
- Quasar README (`docs/QUASAR_README.md`) is an **engineering-practice reference only**:
  its SaaS dependencies, auth/deployment model, and public-web assumptions are out of scope.
