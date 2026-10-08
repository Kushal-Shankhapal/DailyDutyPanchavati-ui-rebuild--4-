<!--
Purpose: Current implementation truth for the clean-rebuild repo.
Current role: First-read state file; updated at the end of every working session.
Last meaningful change: 2026-10-08 — P1 started: ChartDocument projection + finalize snapshot slice verified (31 tests total); migration 0007 (assignment column_no, manpower display_order).
Constraint/dependency: Must reflect verified facts only; speculation belongs in OPEN_QUESTIONS.md.
-->

# CURRENT_STATE

> Updated: 2026-10-08 · Phase: **P1 IN PROGRESS — slice 1 (ChartDocument projection + finalize snapshot) verified** (`npm run check` green: typecheck + 31 tests + doctor; 7 migrations). P0 was completed and committed the same day (2 commits: code `cc1ecf9`, docs `eedf45a`). User gave explicit P0 GO 2026-10-08 after architecture approval. Visual baseline FROZEN at compact-v3 (user-owned). Built: repo scaffold (package/tsconfig/vitest), migrations 0001–0006 on `panchavati3_dev` + `panchavati3_test`, Layer-A reference seeds, 10/09 chart seed from SEMANTIC/10.md, invariant test suite, doctor/verify scripts, README contract. Next phase (P1: ChartDocument projection + server/UI) NOT started — awaiting user go.

## Repository

- Location: `C:\Users\kusha\Desktop\DailyDutyPanchavati-ui-rebuild (4)` (workspace root)
- Contents: docs + skills + reference (read-only corpus) + `db/` (migrations, seeds, runners) + `server/db.ts` + `scripts/` + `tests/` + `design/` (frozen baseline) + README.md contract
- Git: P0 committed 2026-10-08 (two commits: code foundation, then docs/design record)
- Dependencies: pg 8.13; dev: tsx, typescript 5.7, vitest 2.1, @types/pg, @types/node (65 packages, lockfile present)

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

## Design-refinement additions (2026-10-07)

User replaced the Stitch/Figma step with a hands-on refinement pass over compact-v2, guided by a pasted brainstorm + 8-item SPI critique (`design/_refs/Kushal_compact_chart_critique.md`), plus direct corrections during preview (no बिमा row where source has none; charge once per shift; काटया मारूती verified NOT closed day/night with all fields checked against `reference/SEMANTIC/10.md`; centered symmetric Sr-PI box).

Built and browser-verified (all via `preview_evaluate` geometry audits + captures; zero console errors):
1. **docs/DESIGN_REFINEMENT_BRIEF.md** — full brainstorm + critique + output contract (A–F); STITCH_BRIEF.md marked SUPERSEDED.
2. **design/compv3.css** — shared stylesheet: compact-v2 palette + all 8 critique fixes, symmetric centered header/Sr-PI, `.fx.mrsh` marshal lines, breakpoints ≥1121/≤1120/≤1000/≤768/≤420, edit-mode + picker + toast styles, A4-landscape print block (page-1 content extent measured 769px ≤ 794px — fits one sheet).
3. **design/panchavati-compv3.html** — deliverable A/B/C: 5-page realistic prototype on true 10/09 source data (काटया = 0 बिमा rows, 0 बंद, charge once per shift, marshal lines slate/subordinate).
4. **design/panchavati-compv3-stress.html** — deliverable D: long names/duties, 5 रिक्त lines, 10 बंद cells, multi-person बिमा groups, day/night, charge transfer. Audit found + fixed a काटया-बिमा violation and a `100vw`-scrollbar horizontal overflow.
5. **design/compv3-edit.js** — deliverable E demo: संपादन toggle → slot → picker → pick or mini-create → return-to-slot; clear→रिक्त; replace→flash+ledger toast; person-level बिमा; per-shift बंद+charge; rowspan-aware contextual `+`; autosave indicator; all affordances no-print.
6. **docs/DESIGN_INTERACTION_NOTES.md** (E) + **docs/DESIGN_DELTA.md** (F) written; **UI_SPEC §18** rewritten with the measured breakpoint contract + mobile decision (v1 mobile view-only, editing Coming Soon — open for user confirmation); UI_TRACEABILITY gained a prototype-verification section.
7. **Round 2 (user preview feedback, 2026-10-07):** edit-mode add-boxes (`+ अधिकारी बॉक्स जोडा` / `+ चौकी जोडा`), `वेळ:` headers shortened (no `वाजेपावेतो`) + contrast up (11px/ink-soft), chowki sub-titles centered without redundant `०९–२१`/`२१–०९`, leave/court count chips neutralized. **Four latent edit-JS defects found & fixed** (they had existed since the first edit-mode build): `[data-grp-last]` cleanup destroyed TDs → empty rows → toggle crash; `groupRows` never walked back to the TH row (multi-row rowspan growth dead); `addToGroup` registered the pending row before `openPicker`, whose closePicker immediately destroyed it (the `+` flow never kept a row); pick/create now keep the row, cancel reverts rowspan. Re-audit: both files @1440/390 clean, print fit 769/794, edit battery (add→pick→cancel→OFF→ON) zero console errors.

### Round 3 (2026-10-07 — six chart fixes + source-fidelity completeness)

Six user-requested chart fixes applied to both prototypes and verified: ① corner station block removed (`.head .hl` deleted, both files + CSS); ② declared table type scale, values never bold (writer line fixed in Sr-PI box); ③ page-1 lower band restructured to **four equal columns in one row** (दिवस पाळी | रात्र पाळी | कार्यालयीन | कोर्ट — nested `p1-desks`/`g-core` wrappers removed; `th` white-space normal so labels wrap); ④ numbered `.sec .no` badges removed (6 headings × 2 files, CSS rule deleted); ⑤ marshal-vs-bima **explained with source evidence** (marshal is a separate duty post column in the original chart; कारंजा day genuinely has both `चौकी चा चार्ज → काटया` AND `मार्शल बंद → मालेगाव` — source `reference/SEMANTIC/10.md` table 1; nothing removed, hard rule); ⑥ `.signoff` text-align center. **Completeness additions restoring source uniqueness:** पिटर मोबा. rows (१२४३ महाले, २३५१ निमजे), ठाणे अंमलदार कक्ष देखरेख (पोनि सुनिल पवार तपास), and the hourly scanning table extended 6→12 rows per source tables 12+road-app row (source no-loss rule).

Re-verified after all changes: div counts balanced (255/255, 247/247 by script); realistic desktop @1300 (band 4×258px, pageW 1123, overflowX 0, truncations 0, print fit 657/794); breakpoints 1025 (4-col band, 0 overflow) / 768 (1-col, sticky) / 390 (stacked, only tbl-wrap scroll); stress print fit 725/794; edit battery pick/cancel/OFF-ON with 0 empty rows and clean console on both files.

Verification status: print fit ✅, desktop 1440 ✅, breakpoint sweep 1025/768/390 ✅ (overflowX 0, truncations 0), stress semantics ✅, console clean ✅. Not yet verified: real browser `window.print()` PDF output (print-check skill at P0), grayscale print check.

### Round 4 (2026-10-08 — user bug reports + plan-before-build)

Three user-reported issues fixed in the realistic prototype and verified by measurement: ① header title/DRAFT no longer centered after ① of round 3 removed the corner block (3-col `1fr auto 1fr` grid auto-placed 2 children into cols 1–2) — fixed with explicit `.head .hc{grid-column:2}` / `.hr{grid-column:3}` (+ mobile placement), measured titleOffset 0; ② doubled 2px frame on all 7 `.tbl-wrap` tables (wrapper border + table's collapsed cell borders) — wrapper border removed, measured 0px; ③ `सुरक्षित नाशिक — गस्त…` em dash → colon. **Stress prototype FROZEN by user decision** (nonsense filler text, no further maintenance). **No more edit-mode work in the mock** (user: see bigger picture; CRUD belongs in the real system). CRUD direction recorded (editable labels w/ template-vs-instance layering, date-heading → calendar picker with unsaved-work warning, universal 3-option staff flyer — edit master / pick w/ search+rank filter / minimal add, hover-pencil, alignment/size properties, NO drag-drop v1).

**Plan-before-implementation deliverable:** changes/0002-site-plan/proposal.md — site structure (7 routes, chart-first), React component tree, CRUD grammar §3, normalized DB sketch (template_versions + chart_versions + postings with explicit रिक्त/बंद/बिमा), reuse/discard list, P0–P5 phases, 4 open questions for the user. Awaiting user approval before any P0 code.

### Round 4b (2026-10-08 — repo cleanup + architecture-before-P0)

User verdict: visual work ✅ approved; stress prototype ❌ delete; mock CRUD ❌ stop; compact-v3 ✅ frozen as visual baseline; immediate DB ❌ too early — one architecture pass first.

Executed: ① `design/panchavati-compv3-stress.html` deleted; ② `design/compv3-edit.js` deleted and ALL prototype-only edit machinery removed from the mock (संपादन button, fake save indicator, `+ जोडा` boxes, `body.edit`/`.ed`/`.picker`/`.toast`/`.add-box`/`.vac-line`/`.chg-flash`/`.closed-banner` CSS) — mock is now pure frozen visual/print baseline (CSS 19092 bytes, braces balanced 169/169; native `onclick="window.print()"` on the print button); interaction grammar preserved in docs only. ③ **docs/PRODUCT_UI_ARCHITECTURE.md** written (15+ sections: site map, Preview/Edit model, date-switch flow, three-layer A/B/C boundary + element classification table, CRUD grammar per layer, PersonAssignmentEditor, template editing + versioning model, component tree, responsive/print strategy, MVP permissions, the four deferred decisions with recommended defaults, conceptual DB entities). ④ DOMAIN.md gained the verified three-fact distinction (BIMA = person qualifier / marshal post = separate operational post / chowki closure) with Table-1 source evidence. ⑤ OPEN_QUESTIONS.md gained T9–T13 with recommended defaults (none blocks P0; T11 SME-gated). ⑥ changes/0002-site-plan/proposal.md marked SUPERSEDED by PRODUCT_UI_ARCHITECTURE.md.

**Verification note:** browser-preview verification of the cleaned mock was abandoned at the user's instruction (preview tooling issues); on-disk verification only (file content, balanced braces, grep-confirmed edits). The user will handle the visual pass personally.

### Round 4c (2026-10-08 — architecture review applied)

User review verdict: architecture APPROVED with three pre-P0 clarifications; visual design process closed. All three applied to docs/PRODUCT_UI_ARCHITECTURE.md: ① "या तक्त्यासाठी" template overrides given explicit storage — `charts.presentation_overrides JSONB` keyed by template node id, resolved chart-overrides → pinned template version → renderer defaults; ② T13 resolved as hybrid (normalized B tables while editing → ChartDocument projection → immutable `chart_versions.document_json` snapshot at finalize; finalized reprints render from snapshot only); ③ derived values (weekday, proven totals, Devanagari digits) formally excluded from editing — D-rule added to §5. Also: "byte-for-byte" preview wording corrected to same-document/same-grammar projection. User resolved: T3 (color printer), T7 (Devanagari transform confirmed), T8 (Stitch closed as moot).

## P0 (2026-10-08 — explicit user GO; completed same day)

Built and verified:
1. **Scaffold:** `package.json` (scripts below), `tsconfig.json` (strict), `vitest.config.ts` (scoped to `tests/` — the archived old-repo copy inside this workspace is never collected), deps installed.
2. **DBs:** fresh `panchavati3_dev` + `panchavati3_test` created (old `panchavati*/panchavati2*` untouched). Fail-loud pool helper `server/db.ts` (test runs → test DB).
3. **Migrations 0001–0006** (forward-only, sha256 checksum guard in `db/migrate.ts`; applied to BOTH DBs, doctor confirms 0 pending / 0 drift): masters → templates (with `presentation_overrides` per T13) → chart core (assignments/availabilities/loc-states/notices/manpower/officer/scan/events) → immutability triggers (chart_versions append-only, FINALIZED freeze on 7 working tables, lifecycle monotonic incl. FINALIZED→DRAFT amendment reopen) → availability staff nullable → HOME_GUARD cadre.
4. **Layer-A seeds** (`db/seed/*.sql`, idempotent, both DBs): ranks 17 · staff 179 · locations 15 · units 4 · duties 56 · scan config 30 · template "Panchavati Compact v3" + 1 version.
5. **10/09 chart seed** (`db/seed-chart-1009.ts`, content authority = `reference/SEMANTIC/10.md`, wipe-and-reseed DRAFT-only, fails loud on any unresolvable person/location): **212 assignments · 10 बिमा · 2 रिक्त · 69 availability · 7 loc-states · 28 notices · 240 matrix cells (verbatim) · 15 officer rows · 12 scan rows** — counts match source tables cell-for-cell; verified identical on dev + test + repeated runs.
6. **Invariant tests** (`tests/invariants.test.ts`, 19 tests, all green): seeded counts vs source; verbatim matrix (`12<br>04 Proण्` preserved); रिक्त/बंद/बिमा separation incl. schema-shape assertions; CHECK rejections; chart_versions append-only; FINALIZED freeze (snapshot insert still allowed); lifecycle legal/illegal transitions; migration idempotency + checksum equality; static scans (no remarks_mr/notes_mr parsing, no auto-assign identifiers, no outbound network).
7. **Engineering contract (Quasar-derived, constrained):** `npm run doctor` (14 objective checks, exit 1 on failure), `npm run verify` (typecheck + test + doctor — green), `README.md` (layer diagram, per-fact authority table, command surface, evidence-status vocabulary, hygiene rules).
8. **OPEN_QUESTIONS T14** recorded (नगदी कारकुन seat pairing: seed follows SEMANTIC source flow with explicit रिक्त slots; mock pairing is a clerk-edit concern, no schema impact).

Seed-time corrections made against source: PI name spelling `आंधळे` (SEMANTIC) over `आंधाळे`; two desk/scan person refs PC 2357 (पोशि, not हवा) per Table 1 col4 + Table 12.

## P1 slice 1 (2026-10-08 — user GO, completed same day)

1. **Migration 0007** (both DBs, reversible): `daily_assignments.column_no` (source duty-column identity — was unrepresentable, sort_order alone is ambiguous across column stacks) + `manpower_records.display_order` (source matrix row order). Template seed now fills `layout.matrixColumns` (15 keys) + `shiftSummaryColumns` (fill-if-empty, never clobbers clerk edits) — column heading order is Layer C per architecture.
2. **`server/chart-document.ts`** — typed `ChartDocument` (15 top-level sections), `projectChart()` (normalized B → document with Layer-A values resolved at projection time so snapshots render without live FKs), `weekdayMr()` (D-rule, computed never stored), `resolveNode()` (overrides → pinned template → undefined), `getSnapshot()` (reprint read path).
3. **`server/finalize.ts`** — `finalizeChart()` (Pool or in-tx client; row lock → project → version_no = prev+1 → JSON snapshot → FINALIZED; round-trips through getSnapshot before returning) + `reopenForAmendment()` (FINALIZED→DRAFT, snapshot untouched).
4. **`tests/chart-document.test.ts`** — 12 tests: projection fidelity vs seeded source (counts, column stacks {DAY 35/26/36/38, NIGHT 30/28/19}, रिक्त/बिमा/बंद facts, matrix row+template column order with verbatim cells), template pinning (chart keeps pin when head moves) + override resolution, finalize snapshot ≡ projection (deep equal), freeze + double-finalize refusal, master-edit independence (snapshot unchanged, live projection differs — why reprints use snapshots), amendment chain (v2 amended_from v1, v1 immutable + content). All mutating tests roll back.

Bugs caught and fixed while making the gate green: `a.duty_code` vs join alias, `loc_id` alias missing → `Number(undefined)`=NaN (now fail-loud in `locOf`), bigint→string in tests.

## Next step (user-driven)

**Continuing P1** — ChartDocument → HTML renderer (print/preview projection of the same document), server layer, then authoring UI per PRODUCT_UI_ARCHITECTURE. Chart redesign is closed; mock edits only if the user reports a visual defect. Deferred-with-defaults: T9 (template rights), T10 (transliteration), T11 (eligibility, SME-gated), T12 (template sharing); T14 (desk pairing) SME-confirm when editor exists.

## Session log

| Date | Change | Verified by |
|---|---|---|
| 2026-10-06 | Audit of both old repos (schema, domains, print, tests, docs), reference corpus, 10/09 + 11/09 semantic charts, IDE capabilities; wrote audit + contract docs + skills | Read-only inspection; no checks to run (no code) |
| 2026-10-06 (later) | UI/UX pass: mockup rendered + inspected; old repo dev server started/verified/stopped (port 3000); UI_SPEC.md, UI_TRACEABILITY.md, STITCH_BRIEF.md written; changes/0001 opened | Browser screenshots + live URL inspection + DOM reads (this session) |
| 2026-10-07 | Design refinement: compact-v3 CSS + realistic/stress prototypes + edit-mode JS; deliverables A–D verified (print fit, 4 breakpoints, stress semantics, console); E/F docs written; UI_SPEC §18 + UI_TRACEABILITY updated | `preview_evaluate` geometry audits at 1440/1025/768/390 + mobile/desktop captures + DOM counts |
| 2026-10-07 (round 2) | User feedback applied: add-boxes, वेळ header, chowki sub-titles, neutral count chips; 4 edit-JS defects fixed (toggle crash, + row loss, rowspan growth, pending-row ordering) | Full edit battery + geometry/print/mobile re-audits on both files; console clean |
| 2026-10-07 (round 3) | Six chart fixes (corner block out, type scale, 4-col page-1 band, badges off, sign-off centered, marshal explained) + completeness adds (पिटर मोबा., कक्ष देखरेख, 12 scan rows); marshal question answered from source | Div-balance script + geometry/print/breakpoint audits @1300/1025/768/390 + edit battery on both files (print extents 657 & 725 ≤ 794) |
| 2026-10-08 (P0) | DB foundation: scaffold, migrations 0001–0006, Layer-A seeds, 10/09 chart seed (SEMANTIC authority), 19-test invariant suite, doctor/verify, README contract, T14 | `npm run verify` green end-to-end (typecheck + 19 tests + doctor ×2 DBs); seed re-run idempotent with identical counts on dev+test |
