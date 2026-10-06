<!--
Purpose: Current implementation truth for the clean-rebuild repo.
Current role: First-read state file; updated at the end of every working session.
Last meaningful change: Created 2026-10-06 — audit phase complete, no application code exists yet.
Constraint/dependency: Must reflect verified facts only; speculation belongs in OPEN_QUESTIONS.md.
-->

# CURRENT_STATE

> Updated: 2026-10-06 · Phase: **AUDIT (pre-implementation)** — awaiting user approval of the plan in `INITIAL_AUDIT.md` §4 before any build starts.

## Repository

- Location: `C:\Users\kusha\Desktop\DailyDutyPanchavati-ui-rebuild (4)` (workspace root)
- Contents so far: docs only (audit + contracts) + `skills/` + `reference/` (copied read-only evidence corpus from old repo A)
- Git: initialized locally at audit time; initial commit = audit docs
- No application code, no dependencies, no database created yet

## Verified environment

- Node v24.13.1, npm 11.11.1, git 2.55, PostgreSQL 17.7 (service running, trust auth as user `postgres`)
- Existing local DBs (old projects, untouched): `panchavati_dev`, `panchavati_test`, `panchavati_combined`, `panchavati2_dev` — the new system will create fresh DBs (names TBD at P0, e.g. `panchavati3_dev/test`); nothing in old DBs is mutated
- IDE: Freebuff desktop agent (file tools, terminal, code search, browser preview with screenshots/console, Playwright-grade verification, web search, todos, file-change hooks)

## Decisions made (audit)

1. Old repo A (`Desktop/DailyDutyPanchavati`, branch `render-main`) and old repo B (nested `DailyDutyPanchavati-ui-rebuild`, branch `p0-p1-implementation`) are one lineage at different fork points; both are source-of-reuse only, never resurrected wholesale.
2. Reuse list / discard list: `INITIAL_AUDIT.md` §2–§3.
3. Target architecture: `INITIAL_AUDIT.md` §4 — one normalized operational model, compact chart as primary product, physical pages as render output, events first-class but minimal.
4. Migration/seed source: old repo A's `db/seed/reference-data.sql` + `structural.sql` + semantic MD, NOT live DB dumps (night-shift fixture gap in old data; cleaner provenance from seeds).

## Next step (blocked on user approval)

P0 — Foundations: repo scaffold (Fastify+Kysely+React+Vite+Tailwind+Vitest+Playwright), migrations 0001+ (masters + daily core + events), idempotent seed import from old reference data, invariant skeleton, masters CRUD.

## Session log

| Date | Change | Verified by |
|---|---|---|
| 2026-10-06 | Audit of both old repos (schema, domains, print, tests, docs), reference corpus, 10/09 + 11/09 semantic charts, IDE capabilities; wrote audit + contract docs + skills | Read-only inspection; no checks to run (no code) |
