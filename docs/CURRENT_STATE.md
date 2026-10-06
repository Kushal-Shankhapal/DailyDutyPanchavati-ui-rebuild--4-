<!--
Purpose: Current implementation truth for the clean-rebuild repo.
Current role: First-read state file; updated at the end of every working session.
Last meaningful change: Created 2026-10-06 — audit phase complete, no application code exists yet.
Constraint/dependency: Must reflect verified facts only; speculation belongs in OPEN_QUESTIONS.md.
-->

# CURRENT_STATE

> Updated: 2026-10-06 · Phase: **PHASE 1 — UI/UX SPECIFICATION PASS** (user-directed pause of P0 coding). UI_SPEC.md + UI_TRACEABILITY.md + STITCH_BRIEF.md written; Stitch visual pass is the next user-driven step.

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

## Phase 1 additions (2026-10-06, later session)

Verified by direct inspection (browser + live dev server):
1. **Approved compact-v2 mockup** (`durvesh_pass_antigravity_updated_2026-09-29-compact-chart-v2-mockup.html`) rendered and inspected in IDE browser preview: 5 landscape pages — Sr-PI box + officer grid + day/night core; 6-chowki day/night matrix + office/court desks; leave + court/bandobast; manpower + shift summary/ledger; officer summary + scan schedule + signature block. Palette `#0b3568` navy / slate / white, Noto Sans Devanagari, chip language (c-sr/c-off/c-vac/c-stop/c-ok).
2. **Old repo dev server ran successfully on port 3000** (`npm run dev`, user-confirmed setup): live React compact profile at `/api/charts/:id/print?profile=standardized_compact_v2` renders the same 5-page grammar from DB (currently all-रिक्त dev fixture; Latin digits in header — known gaps), and `/duty-board/:date` confirms the **generic-dashboard anti-pattern** (KPI cards, filter dropdowns) that the new Home must avoid. Server was stopped after inspection; old DB untouched.
3. SPI critique items still pending in the mockup file: "—" dash in Sr-PI box (must be colon), `राय.` shorthand (must be full `रायटर`), explanatory footers on manpower/officer/scan panels, vertical leave tables (want side-by-side).
4. Wrote **docs/UI_SPEC.md** (21 sections), **docs/UI_TRACEABILITY.md**, **docs/STITCH_BRIEF.md** (8-screen constrained Stitch pass). Decision: Stitch (not Figma) first; Figma deferred until a design system/handoff need exists.

## Next step (user-driven)

Run the Stitch pass with `docs/STITCH_BRIEF.md`, review outputs against `UI_SPEC.md`, fold accepted decisions into the spec, then approve P0 implementation. P0 (repo scaffold + migrations + seed import) remains unchanged and ready.

## Session log

| Date | Change | Verified by |
|---|---|---|
| 2026-10-06 | Audit of both old repos (schema, domains, print, tests, docs), reference corpus, 10/09 + 11/09 semantic charts, IDE capabilities; wrote audit + contract docs + skills | Read-only inspection; no checks to run (no code) |
| 2026-10-06 (later) | UI/UX pass: mockup rendered + inspected; old repo dev server started/verified/stopped (port 3000); UI_SPEC.md, UI_TRACEABILITY.md, STITCH_BRIEF.md written; changes/0001 opened | Browser screenshots + live URL inspection + DOM reads (this session) |
