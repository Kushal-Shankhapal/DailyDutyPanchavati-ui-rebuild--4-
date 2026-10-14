<!--
Purpose: Current implementation truth for the clean-rebuild repo.
Current role: First-read state file; updated at the end of every working session.
Last meaningful change: 2026-10-13 (round 5) — bilingual fields on Sanscript with a review gate, calm dev output, Render blueprint, print-fit repair (sheet 2 overflow) and the header/date-menu/advanced-search corrections; 96 tests and print audit green.
Constraint/dependency: Must reflect verified facts only; speculation belongs in OPEN_QUESTIONS.md.
-->

# CURRENT_STATE

> Updated: 2026-10-13 (round 5) · Phase: **P1 — renderer fidelity + authoring + presentation controls + bilingual fields + deploy blueprint done** (`npm run check` green: typecheck + **96** tests + doctor; 8 migrations; `npm run print:audit` 6/6 sheets).

> **Active demo route (2026-10-13):** `/app/charts/2026-09-10` redirects to `/charts/2026-09-10`; there is one active chart implementation, the verified server-rendered ChartDocument surface. Its persistent header and chart toolbar now follow the consolidated decisions in `docs/COMPACT_V4_DECISIONS.md`. React source remains dormant until it can match the ChartDocument without loss. No migration or database reset was performed.
>
> **Live routes:** `npm run dev` (default `PORT=3100`; **IMPORTANT — other checkouts on this machine also listen on 3100/3000 (old `Desktop\DailyDutyPanchavati`, nested `DailyDutyPanchavati-ui-rebuild`); confirm the PID before judging a URL**). `GET /charts/:date` renders the chart, `GET /design/panchavati-compv3.html` serves the frozen visual baseline for side-by-side review, `npm run render:chart` writes `.tmp-preview/chart-<date>.html`.
>
> **Print pagination (2026-10-13):** one `.page` box = one A4 landscape sheet. The measured 10/09 compact-v4 output is 7 sheets, extents 768/485/580/663/518/575/673px vs 775px printable height — all fit. Page 1 is command-focused; office/court/special content has its own dense sheet rather than overflowing the chowki matrix. No row, name or value is dropped or truncated — no-loss stays 212/212.
>
> **Renderer fidelity (2026-10-11/12):** page 1 (Sr-PI card with `.rk` + रायटर/चालक/RTPC groups, 4 officer boxes `.g-off`, 4-column day/night/office/court band — the same 8 blocks the mock has, in the same grids), page 2 (the mock's 6 chowki blocks; each beat-marshal post folds into its paired chowki as a `मार्शल:` `.fx` line + merged staff rows; desk posts — पंचवटी १ मोबाईल / सायबर सेल / महिला कक्ष / वायरलेस महिला अंमलदार / काळाराम मंदीर गार्ड ड्युटी — render as role groups inside page 1's court/special desk), page 3 (leave section + court/bandobast section + notices), page 4 (matrix + summary + ledger — unchanged), page 5 (officer summary + sessions beside hourly scan + sign-off). Compact chart names (rank + buckle + surname) everywhere; source role column (`role_mr`) drives row labels. A4-landscape geometry 1122×794; page 2 exactly one sheet like the mock — pages 1 and 3 grow past one sheet with the full source volume (measured, OPEN_QUESTIONS T18).
>
> **Historical status line (kept for provenance):** 2026-10-08 · Phase: **P1 IN PROGRESS — slice 1 (ChartDocument projection + finalize snapshot) verified** (`npm run check` green: typecheck + 31 tests + doctor; 7 migrations). P0 was completed and committed the same day (2 commits: code `cc1ecf9`, docs `eedf45a`). User gave explicit P0 GO 2026-10-08 after architecture approval. Visual baseline FROZEN at compact-v3 (user-owned). Built: repo scaffold (package/tsconfig/vitest), migrations 0001–0006 on `panchavati3_dev` + `panchavati3_test`, Layer-A reference seeds, 10/09 chart seed from SEMANTIC/10.md, invariant test suite, doctor/verify scripts, README contract. Next phase (P1: ChartDocument projection + server/UI) NOT started — awaiting user go.

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

## P1 authoring + chrome round (2026-10-12, later pass — all user asks from the 10/12 message)

Built and browser-verified on the live route (each item also covered by tests where noted):

1. **Chowki-band text fixes (user: “everything should end in its line”)** — the chowki in-charge
   no longer repeats as the sub-col's first row (it is the `.ch-head .of` line only; the duplicate
   dragged a wrapped time chip along), and `.fx` state lines split into `.st` (nowrap) + `.dst`
   (wraps) so no line breaks mid-phrase or leaves an orphan word. Verified: every `.fx` line is
   1–2 balanced lines, zero spill.
2. **Edit-mode hover flicker fixed (user report)** — the hover `::after` ✎ glyph re-flowed cells.
   Affordance is now outline + tint only; geometry identical hovered or not (`getComputedStyle`
   `::after.content === 'none'` on `[data-label]`, 185/185 elements).
3. **Arjish-style app header + date selector** — `#appbar` (emblem + station/product identity +
   date button with Marathi weekday + dropdown of real chart dates + lifecycle badge + actions +
   clerk chip), navy `#0e1e38`, sticky, `.no-print`; `GET /api/charts` (note: `chart_date::text`,
   pg returns a JS `Date` otherwise); logo served from `web/assets/Police_Logo.png`.
4. **Pseudo-login (local-only)** — `लॉगिन` chip → flyer with the chart's own हजेरी लेखनिक candidates
   (10/09: गुंबाडे / पवार / गांगुर्डे) or name+rank+buckle form; buckle field only for
   `cadre = CONSTABULARY`; state in `localStorage['pd_clerk']`; no server call, no schema change.
5. **Per-chart editable names (user: table/chart/column/left-row names)** — renderer emits
   `data-label` (stable key) + `data-default` (SOURCE text) + `data-override` (which scope is
   active) on **185 elements**: chart title, all section/table titles, desk/block/sub-col names,
   matrix/summary/officer/scan column headers, left-row group+role labels, sign-off labels.
   Storage `daily_charts.presentation_overrides.labels` (element) / `.labelsAll` (everywhere this
   default text appears) → projected into `doc.template.overrides` so snapshots carry their names;
   `PATCH /api/charts/:date/labels` (FINALIZED → 409, blank clears, 160-char cap).
   UI: edit mode → dotted-outline hover → click/Enter → popover with फक्त हे / सर्वत्र radio
   (pre-selected from `data-override`) → PATCH → reload. D-rule values (date/weekday line) are
   NOT rename-able; people's names and matrix cell VALUES are never touched.
6. **अधिकारी box add (user: “just like the chowki box”)** — button enabled (Coming Soon gone);
   `POST /api/charts/:date/officer` → `addOfficerBox()` writes `presentation_overrides.officerBoxes`
   entry + ONE `VACANT_RIKT` seat whose `duty_title` is the writer title (the seed's own grammar for
   the vacant तपास writer: label row = the fillable seat, `data-asn` clickable). Renderer appends
   extra boxes after the template's; office-walk hardened so a FILLED seat stays in ITS box instead
   of drifting into the preceding one (verified live: assign → renders in-box, not in office desk).
   Duplicate label → 409; blank → 400; no invented person/timing/BIMA.

Verification status: `npm run check` green (typecheck + 77 tests + doctor ×2 DBs) after ALL edits;
`npm run print:audit` 6/6 sheets still fit (attributes add no layout); live browser E2E for rename
(element scope → reload; scope=all → reload; blank → revert to default; night desk untouched),\ officer-box add → fill → in-box render, and DB restored to baseline (212 rows,
`presentation_overrides = {}`) after testing. Known limitation: the FINALIZED 409 path of the two
new routes is enforced in code but not exercised by a test (no finalized chart exists to try it on);
curl-argv on Windows mangles Devanagari — use the browser or file-based payloads for manual API tests.

## Chart presentation controls (2026-10-13)

Built without a migration and without changing `web/chart-authoring.js` or `web/authoring.css`:

1. `server/chart-presentation.ts` defines the safe `presentation_overrides.elements` contract: horizontal
   `left|center|right`, vertical `top|middle|bottom`, optional `hidden`, and `compact`; null clears one
   property. Unknown fields/unsafe stored values are stripped from this namespace before persistence.
2. `server/presentation.ts` exposes `PATCH /api/charts/:date/presentation`, accepts only a known rendered
   element key, locks the chart row, rejects FINALIZED with 409, and merges into the existing JSONB without
   changing assignments, labels, or source data. Finalize projection already carries the JSONB into the
   immutable snapshot.
3. `server/render/chart-html.ts` emits stable `data-presentation` hooks and resolves overrides for editable
   labels/sections, including explicit empty support hooks for Sr-PI चालक/RTPC/ऑपरेटर groups. No support
   group is auto-hidden; only an explicit chart override hides it. `web/chart-presentation.css` contains the
   whitelisted display hooks and is loaded separately from the frozen and authoring stylesheets.

Verification: `npm run check` (typecheck + **83 tests** + doctor on both DBs); focused presentation,
authoring, render and fidelity tests all pass; `npm run print:audit` remains **6/6 sheets fitting one A4**
(750/518/680/551/608/705px), and a live invalid-value PATCH returned 400. Persistence is also asserted
in the finalized snapshot. No migration or reference file changed.

## Next step (user-driven)

**Renderer parity is the blocking milestone.** The renderer reproduces the mock's section grammar and look, including the two folds the mock draws (marshal posts inside their paired chowki; desk posts inside page 1's special desk — OPEN_QUESTIONS T15 resolved), and every `.page` box now prints as exactly one A4 sheet (T18 resolved: print-only density on the two composite pages + the notices on their own sheet; the source chart itself is 6 sheets). Page 2 is exactly the mock's six-chowki sheet. Byte-parity with the mock's five sample-data pages is impossible without dropping source rows — visual/design parity plus complete content is the rule.

After that: assignment defaults (suggestions, not auto-fill), 11/09 chart seed + event annex page, print verification of both days, and the still-open P1 items. Done this round: per-chart editable names, अधिकारी box add, header/date selector, pseudo-login. Deferred-with-defaults: T9 (template rights), T10 (transliteration), T11 (eligibility, SME-gated), T12 (template sharing); T14 (desk pairing) SME-confirm when editor exists.

## Session log

| Date | Change | Verified by |
|---|---|---|
| 2026-10-06 | Audit of both old repos (schema, domains, print, tests, docs), reference corpus, 10/09 + 11/09 semantic charts, IDE capabilities; wrote audit + contract docs + skills | Read-only inspection; no checks to run (no code) |
| 2026-10-06 (later) | UI/UX pass: mockup rendered + inspected; old repo dev server started/verified/stopped (port 3000); UI_SPEC.md, UI_TRACEABILITY.md, STITCH_BRIEF.md written; changes/0001 opened | Browser screenshots + live URL inspection + DOM reads (this session) |
| 2026-10-07 | Design refinement: compact-v3 CSS + realistic/stress prototypes + edit-mode JS; deliverables A–D verified (print fit, 4 breakpoints, stress semantics, console); E/F docs written; UI_SPEC §18 + UI_TRACEABILITY updated | `preview_evaluate` geometry audits at 1440/1025/768/390 + mobile/desktop captures + DOM counts |
| 2026-10-07 (round 2) | User feedback applied: add-boxes, वेळ header, chowki sub-titles, neutral count chips; 4 edit-JS defects fixed (toggle crash, + row loss, rowspan growth, pending-row ordering) | Full edit battery + geometry/print/mobile re-audits on both files; console clean |
| 2026-10-07 (round 3) | Six chart fixes (corner block out, type scale, 4-col page-1 band, badges off, sign-off centered, marshal explained) + completeness adds (पिटर मोबा., कक्ष देखरेख, 12 scan rows); marshal question answered from source | Div-balance script + geometry/print/breakpoint audits @1300/1025/768/390 + edit battery on both files (print extents 657 & 725 ≤ 794) |
| 2026-10-08 (P0) | DB foundation: scaffold, migrations 0001–0006, Layer-A seeds, 10/09 chart seed (SEMANTIC authority), 19-test invariant suite, doctor/verify, README contract, T14 | `npm run verify` green end-to-end (typecheck + 19 tests + doctor ×2 DBs); seed re-run idempotent with identical counts on dev+test |
| 2026-10-09 (P1) | Fastify server (`/charts/:date`, `/api/charts/:date`, slot PATCH, chowki POST, finalize/amend), `server/render/chart-html.ts` (5-page projection + print), `web/chart-authoring.js` + `authoring.css` (edit mode, staff picker, slot persistence), assignment domain layer (`server/assignments.ts`) | Browser E2E on the live route: render → edit mode → picker → PATCH → reload persistence; typecheck + 62 tests green |
| 2026-10-11 (1010) | Renderer fidelity pass against `design/panchavati-compv3.html`: compact chart names, `role_mr` migration 0008 + seed role column, block keying by location/post title, `.fx` absorption of continuation labels, officer band (card + `.g-off` boxes) with the officer rows removed from the generic desk, court desk title, page-3 leave/court sections, page-5 session table; mock served read-only for review | `npm run check` green (typecheck + **72** tests + doctor ×2 DBs, 8 migrations); no-loss 212/212; 5-page render inspected in the browser at 1440px vs the mock (pages 4–5 exactly 794px = A4 landscape) |
| 2026-10-12 (1010 r2/r3) | Mock-draw folds implemented (T15 resolved): `layout.marshalPostForChowki` folds each beat-marshal post into its paired chowki (`मार्शल:` `.fx` line + merged staff rows; सरदार चौकी correctly has none) and `layout.specialDeskLocationKinds: ["FIXED_POINT"]` folds काळाराम into page 1's special desk together with the location-less posts, so page 2 is exactly the mock's 6 chowki blocks; dual-shift desk titles carry the source's दिवसपाळी/रात्रपाळी wording (dual = distinct shifts, not group count). Seed-time correction: `काळाराम मंदिर` → **`काळाराम मंदीर`** (location + both duty titles) — `reference/EXCEL_RECONSTRUCTION/.../sheet001.htm` cell text and `reference/SEMANTIC/10.md` lines 37/87 both carry the long ी, the short-ि form was a seed typo. **Print pagination fixed (T18 resolved):** `.page.dense` print-density in `web/authoring.css` for the two composite pages + the notices section on its own sheet | `npm run check` green (typecheck + **74** tests + doctor ×2 DBs); no-loss 212/212; `npm run print:audit` = all 6 sheets fit one A4 (print media, headless Chrome); `chrome --print-to-pdf` = 6 pages for 6 boxes (was 8) |
| 2026-10-12 (authoring round) | User asks all built: chowki-band line fixes + hover-flicker fix; Arjish AppNav-style header + date dropdown (`/api/charts`, logo asset); local pseudo-login (हजेरी लेखनिक picker, CONSTABULARY-only buckle); **per-chart editable names** (`data-label`/`data-default`/`data-override` on 185 elements, `PATCH …/labels`, फक्त हे/सर्वत्र popover, `presentation_overrides.labels[All]`); **अधिकारी box add** (enabled button, `POST …/officer` → `addOfficerBox` = override entry + one fillable रिक्त writer seat, office-walk hardened so filled seats stay in their box); handoff doc `docs/SESSION_HANDOFF.md` written for the next session | `npm run check` green (**77** tests, +3 new: rename resolution, addOfficerBox txn, enabled-button contract); `npm run print:audit` 6/6; live browser E2E (rename both scopes + revert, box add → fill → in-box render); dev DB restored to 212 rows + `presentation_overrides = {}` after testing |
| 2026-10-13 (compact-v5) | Full chrome + CRUD pass driven by live user feedback: grouped nav (दैनिक कर्तव्य तक्ते / कार्यवाही / डेटा / समाकलन) with every older Arjish–Kushal feature visible and badged WIP/Coming Soon; EN\|मराठी toggle (one language at a time, chrome only — the chart always prints Marathi); date selector moved from the identity bar to the chart toolbar (anchored under its own button, grouped आज/उद्या/मागील ७ दिवस/जुने तक्ते); login rightmost; officer-box and chowki CRUD (add/rename/delete with guards) and the add controls as tiles inside their own row; कार्यालयीन शाखा व कारकून rides beside दिवस/रात्र (three lanes); Sr-PI card fully CRUDable (रायटर as a real slot, चालक/RTPC/ऑपरेटर seats via POST/DELETE …/support), thinner card, no dotted underlines, 9px/8px band gaps; de-duplication — the card owns its रायटर row and the office column no longer repeats it; **presentation controls UI** (स्वरूप → align/vertical/compact/hide on 189 elements + restore bar for hidden ones); WIP leaves open an honest placeholder page; bilingual+emoji chrome removed. Exhaustive resumable list: **docs/BACKLOG.md** |
| 2026-10-13 (compact-v5) — verification | npm run check (typecheck + 83 tests + doctor x2), npm run print:audit 6/6 (685/715/558/663/569/649px), npm run render:chart 212/212 lossless, live API suite 17/17 (support-seat CRUD, presentation PATCH round-trip, nav/date/lang chrome), browser screenshots at 1440px. Dev DB clean: 212 assignments, presentation_overrides = {} |

## User-feedback batch #1–#10 + two additions (2026-10-13, third round)

Driven by the user's numbered list. What shipped:

1. **Navbar scale** — logo 34→40px, station lockup 14→15.5px / 10.5→12px against the 13px nav buttons.
2. **WIP flyer is bilingual** — every line in the placeholder flyer carries `data-lang` mr/en spans, so the EN toggle switches the whole page, chrome only (the chart still always prints Marathi).
3. **"संपूर्ण तक्ता (सर्व पृष्ठे)" removed** from the Daily Duty Charts dropdown (it only reloaded the same page).
4. **Group badges** — the WIP tag came off the group buttons (it stays on the leaves). **डेटा → मास्टर डेटा is now a REAL viewer** (`openMasters`, `GET /api/masters` already existed): counts, searchable staff table (हुद्दा / बकल / नाव mr+en / निष्क्रिय), chowki+kind tags, duty tags. Read-only; editing/creating masters stays a separate badged WIP item. Reason it is read-only today: the write paths that exist are `POST/PATCH /api/masters/staff` (used by the assignment flow) — a full master editor UI is not built, so no half-usable form was shipped.
5. **"जुने तक्ते प्रतवारी (Coming Soon)" removed** from डेटा. The legacy chart now has its own entry in a **संदर्भ (Reference)** section at the end of the Daily Duty Charts dropdown: **जुना ६-पृष्ठ तक्ता — १० सप्टेंबर २०२६**. It is the real legacy six-page chart from Kushal's repo (`src/web/Page1View…Page6View.tsx`), which is a **separate local app** with its own database (`panchavati_dev`), its own API and root-absolute assets — therefore it opens in its own tab at `http://localhost:3101/charts/<date>` instead of being proxied (a proxy renders a broken shell). `npm run legacy:start` starts it; the flyer probes reachability first (no-cors fetch) and, when it is down, prints the exact start command + a retry instead of a dead link. An interim route that served another repo's `dist/` bundle was removed.
6. **Second bar is sticky** (`top: 56px`, under the identity bar) and the **buggy standalone लेआउट button is gone** — its dead `#layout-btn` / `body.mode-layout` CSS was deleted rather than left behind; align/vertical/compact/hide now live inside the clicked element's own edit flyer, with the restore bar for hidden elements bound to edit mode.
7. **Second-bar date/weekday follow the EN toggle** (`१०/०९/२०२६, गुरुवार` ⇄ `10/09/2026, Thursday`) and only there — the chart body stays Marathi. The date menu was rebuilt (anchored to its own button, grouped आज/उद्या/मागील ७ दिवस/जुने तक्ते). The user has since asked for a *different* selector design (Kushal/Arjish): see OPEN_QUESTIONS T20.
8. **Six chowki boxes are equal cells** — `.page > .grid.g-chowki { grid-template-rows: 1fr 1fr; align-items: stretch }`, so both rows are the taller row's height and no two tall chowkis can stack into a taller grid.
9. **Bilingual text input (new)** — `web/chart-authoring.js` now carries an offline roman⇄Devanagari transliterator (`romanToDev` / `devToRoman`) plus `bindTranslit`. "नवीन कर्मचारी जोडा" gained the missing English field (`#nc-nameen`) and both it and "कर्मचारी माहिती बदला" convert live in both directions; the field the clerk types in by hand always wins (the aid never overwrites a manual edit) and nothing is submitted automatically. No key, no dictionary, no network. Encoding documented in the form hint: `aa=आ ii/ee=ई uu/oo=ऊ`, `T/D/N/L/S` = ट/ड/ण/ळ/ष, `r`+consonant = र्, `n/m`+consonant = ं, `wa` = वा.
10. **De-duplication re-audited (one row, one home)** — an audit script rendered the projection and checked every assignment: **121 slot renders / 121 unique `data-asn` ids, 0 duplicate slot ids** on 10/09, with no-loss 212/212.
11. **Presented as briefs, not built** (user asked for options first): `docs/BRIEF_DENSE_TABLES.md` (scan-schedule whitespace + the one-row-per-staff court register — source evidence, 3 options each, recommended path) and `docs/BRIEF_NOTICES.md` (where सूचना व निर्देश belong + the full "why is X not CRUDable" audit with the four element classes).

**Two defects the browser pass caught (tests could not):**

- **Seats were unreachable inside a labelled group.** The slot click handler checked
  `closest("[data-label]")` *before* `closest(".slot")`, so clicking a filled seat whose group
  carries a label (e.g. the Sr-PI card's रायटर under `data-label="support.srpi.writer"`) opened the
  RENAME flyer instead of the staff picker — the CRUD the user asked for was silently bypassed on
  exactly the card the round was about. Priority is now seat → label; a group label stays renameable
  by clicking its own text.
- **A load-time SyntaxError in `web/chart-authoring.js`** (a literal newline inside a single-quoted
  string in the two new flyers) killed the ENTIRE client chrome — no language toggle, no nav, no
  flyer — while every test still passed, because every test reads that file as text. `node --check`
  plus a new `tests/authoring.test.ts` case (`new Function(js())` must not throw) now cover it, and
  a second new case pins the transliterator's name table in both scripts.

**Also fixed this round:** the blocking `tests/presentation.test.ts` failure — the Sr-PI support groups (रायटर/चालक/RTPC/ऑपरेटर) had lost the `empty` flag when their seats became dynamic, so the hide-to-compact control had no honest empty target. `Names.e` now takes the flag explicitly and each support group passes `seatGroupEmpty(role)` / `writerRow === null`.

Verification for this round: `npm run check` (typecheck + **85 tests** + doctor ×2 DBs) green; `npm run print:audit` 6/6; `npm run render:chart` no-loss 212/212; duplicate-slot audit 0; legacy reference app reachable (HTTP 200 on `/charts/2026-09-10`, port 3101); browser pass at 1440px on `/charts/2026-09-10` for the chrome (nav scale, sticky bar, EN toggle, master-data flyer, legacy flyer, chowki grid geometry).

## Round 5 (2026-10-13 — the 13-item user list + bilingual engine + print-fit repair)

All numbers below are measured, not estimated.

### 1. Calm dev output (user item 1: “is this normal?”)

It WAS normal — Fastify logs every request through pino — but it is noise, so the default changed:
`server/index.ts` now starts at `LOG_LEVEL=warn` (request lines are `info`, so they simply do not
print), prints ONE startup banner (chart URL, frozen mock, API, the legacy reference entry, the bind
address, how to stop, how to get request logs back), and answers `/favicon.ico` with the emblem
instead of a 404. `LOG_LEVEL=info npm run dev` restores the old stream; `LOG_LEVEL=silent` mutes it.
Ctrl+C now closes the Fastify instance and the pg pool before exiting. Verified: banner printed,
`favicon.ico` 200, zero request lines while browsing.

### 2. Deployability (user item 2: “manual running won't work when we deploy for the demo”)

- `LEGACY_URL` / `LEGACY_URL_2` are configuration, and `LEGACY_URL=none` makes `/legacy/<date>` an
  honest 404 instead of a redirect to a laptop's `localhost:3101`.
- `HOST` (loopback by default; `0.0.0.0` for a platform) — the server previously hardcoded
  `127.0.0.1`, which no host could reach.
- `server/db.ts` now uses the database inside `DATABASE_URL` instead of forcing the local
  `panchavati3_dev`/`panchavati3_test` names (the local split still wins when its own env var is set
  on purpose, so dev and test behaviour is unchanged).
- `render.yaml` — a Render Blueprint (one web service + Postgres, `npm ci --include=dev && npm run
  db:migrate` in the build, `/health` check). **The build does not seed**: the chart seed is the
  station's real 10/09 allocation, and putting it behind a public URL is the user's decision, not a
  build side effect (OPEN_QUESTIONS T23).
- `docs/DEPLOY.md` — the operator steps, including `npm run demo` (chart app + both reference apps,
  one Ctrl+C reaps everything) and `npm run stop` / `stop:all`.

### 3. Print-fit repair (found by `npm run print:audit`, not by eye)

Sheet 2 measured **810px against 775px** — the chowki sheet was carrying the गस्त/स्कॅनिंग schedule
as well, and once the chowki cells became equal-height (an earlier user ask) the pair no longer fit.
Fix: the schedule moved to the court/special sheet (688px), the chowki sheet returns to being the
mock's six-chowki sheet (498px), and print-density rules now cover the new session cards and the
folded hourly strip. `npm run print:audit` → **all 6 sheets fit** (658 / 498 / 688 / 663 / 579 /
649px). `tools/print-audit.mjs` also gained per-section heights for an overflowing sheet, so the next
overflow says which part grew. Structural guard: `tests/render.test.ts` + `render-fidelity.test.ts`
assert the schedule is NOT on the chowki sheet.

### 4. Bilingual fields: a real transliteration library + a review gate (user's new ask)

- **Engine replaced.** The hand-written roman⇄Devanagari tables are gone. `@indic-transliteration/
  sanscript` 1.3.3 (MIT) does the transliteration, served from this repo's own dependency tree via
  `/vendor/sanscript.js` (no CDN, no network call, no key — chart data still never leaves the
  machine; `tests/authoring.test.ts` pins the local route and the package pin).
- **A documented MARATHI CONVENTION layer** sits on top, because Sanscript is Sanskrit-first:
  roman→Devanagari uses `itrans`; a word-final virama is dropped (गजेंद्र, never गजेन्द्र्); a nasal
  + virama before a stop becomes the anusvara (gajendra → गजेंद्र, gAngurDe → गांगुर्डे) while a
  doubled nasal stays a conjunct (jagannAth → जगन्नाथ); Devanagari→roman drops the word-final
  inherent ‘a’ (सुनिल → sunil, पाटील → pATIl, रिक्त → rikt) and folds the anusvara to ‘n’ only before
  a stop (संवद्रे stays saMvadre); a word-initial capital with no ITRANS meaning is plain
  capitalisation (Patil → पतिल, Sanjay → संजय) while A/I/U/T keep their long-vowel/retroflex meaning
  (Aher → आहेर, TukArAm → टुकाराम); digits and punctuation pass through untouched (Devanagari digits
  stay a display transform), and protected tokens (CCTNS, Dial 112 MERS, DB, MERS, TOTAL, Office, ME,
  the rank codes) are NEVER transliterated.
- **Measured quality:** every seeded staff name round-trips Devanagari → roman → Devanagari except
  four documented source oddities (a doubled-anusvara entry, डावरे, षेखर, and a stray “QM” token):
  **175/179 exact**, asserted in `tests/authoring.test.ts`.
- **Review gate (the “see, verify and edit before moving on” ask).** A conversion is never applied
  silently: `bilingualPair()` offers the suggested text in an editable review strip with वापरा /
  रद्द, and only वापरा writes it into the other field. ONE hook (`mountBilingualCompanions`) mounts a
  companion field + strip for the prose field of EVERY flyer, so a new editor cannot ship without the
  aid; buckle/phone/search/number fields are explicitly excluded. Verified live: typing
  `gajendra pATIl` in the companion offered “गजेंद्र पाटील”, left the field at “पोशि ५६९ …” until
  वापरा, then wrote it.

### 5. UI corrections in the same round

- **Sr-PI card header centred symmetrically** — `justify-content: center`, fixed 12px inner gap;
  measured 101px / 101px margin either side of “वपोनि गजेंद्र पाटील · ठाणे प्रमुख”.
- **Date selector has ONE scroll region** (it had two nested ones). The panel is a clipped flex
  column now: the search row is pinned, only `.dm-list` scrolls, and the search input itself never
  scrolls (`min-width: 0`, border-box, no `type=search` decoration).
- **Advanced-search entry** added at the right of that search row: an icon-only, honestly badged WIP
  button that opens the same Coming-Soon entry as the navbar's ऐतिहासिक शोध leaf. The real page is
  NOT started — OPEN_QUESTIONS T24 requires reading Kushal's `HistoricalSearchView.tsx` first.

### Verification for this round

`npm run check` green (typecheck + **96** tests + doctor on both DBs); `npm run print:audit` 6/6;
`npm run render:chart` 212/212 rows lossless with the vendor script tag resolved; live browser pass on
`/charts/2026-09-10` for the bilingual pair (suggestion → accept), the centred card header, the
single-scroll date menu and the WIP advanced-search icon. Both databases were restored to the
documented baseline (212 assignments, `presentation_overrides = {}`).

## Fact-check + red-build repair (2026-10-14)

Two same-day commits (`a87b4d1` TLS, `9e7db4f` renderer/seed) had left `npm run check` **RED** at
session start. Both fixed here; **96/96 + doctor green re-verified after the fixes**, plus
`npm run print:audit` 6/6 (655/496/685/663/579/664px) against a live dev server:

1. **`db/migrate.ts`** — the unconditional `process.env.PGSSLMODE = "require"` (added for Render's
   TLS-only Postgres; user-confirmed intent) leaked into local test connections via
   `tests/invariants.test.ts`'s import → *“server does not support SSL connections”* → 19 tests
   skipped. Fix: gated on `process.env.DATABASE_URL` — **Render deploy behavior unchanged**
   (Render always sets it), local trust-auth works again.
2. **`tests/render.test.ts`** — stale assertion expected escaped `12&lt;br&gt;04…`, but commit
   `9e7db4f` deliberately made the renderer re-emit a REAL `<br>` (each part still escaped; literal
   “<br>” on paper was the reported bug). Assertion updated to the intentional contract
   (`12<br>04 Proण्` present, `12&lt;br&gt;04` absent).

**Latent issue recorded, NOT fixed (authority call needed):** the seed now writes
`12<br>04 Pro.` / `हजर मनुष्यबळ` while the test DB + 3 tests hold `Proण्` / `मनुश्यबळ`
(SEMANTIC/10.md) — a fresh reseed would break the suite. Logged as **OPEN_QUESTIONS T25**
(Tier-1 PDF check needed; do not reseed first).

**Docs:** `docs/SITE_OVERHAUL_BRAINSTORM.md` fact-checked line-by-line against the actual repos
(new §9 Verification Log V1–V20; §1 fork-divergence table; §2.2 page-count table; §2.4 staff-count
rewrite; §8.1 authority tiers corrected per AGENTS.md; §6/§7 relabelled as unapproved options).
`docs/OPEN_QUESTIONS.md` gained T25.
