<!--
Purpose: One-file transition packet for the next AI session (omnirush.ai gpt-6-astra) so it does not
have to re-analyze the whole project. Derived from the work done in the Freebuff session that built
the Arjish-style header, date selector, local pseudo-login, per-chart editable names, and the अधिकारी
box add, plus the surrounding audit/recon work done this session.
Current role: The handoff doc for whoever continues implementation.
Honesty rule used while writing: numbers are only stated where they were actually observed this session;
anything uncertain is labelled uncertain.
-->

# ASTRA TRANSITION PACKET — Panchavati Daily Duty Chart

## 0. What this project is, in one paragraph

A web app for Panchavati Police Station, Nashik City, that replaces the old paper/DOCX daily duty chart
workflow (legacy Kruti Dev 714 Marathi, manually prepared, photographed, and sent on WhatsApp) with a
digitized, editable, searchable system. One station for now, one clerk user for now. Marathi-first,
Unicode.

The product has two chart formats in the team's thinking:
1. The **current Panchavati 6-page chart** (the old format they actually use) — preserved as reference/legacy.
2. The **new compact chart** (`design/panchavati-compv3.html` + `design/compv3.css`) — the approved visual
   baseline and the primary implementation target.

The long-term North Star (from Kushal's notes) is: generate tomorrow's chart, edit same-day, finalize and
preserve immutable history, PDF export per chart/page, historical search, and eventually GOWA/WhatsApp
dispatch. This session's implementation focus was the new compact chart and its editing chrome.

---

## 1. People and repos

- **You (Kushal):** owner/operator. Non-technical daily users are clerks and 12th-pass staff; UI must be
  friendly for them. Marathi priority; English toggle acceptable.
- **Arjish:** built a separate, further-along React/Vite repo. Source of the **header design** we ported.
- **Durvesh:** built a small Python/Flask app (in `NEW DATA/kushals repo/archive/Durvesh_Work/`) that took
  English input and auto-converted to Marathi. Worth reusing for the English→Marathi input idea, but only
  as a guided conversion the user can see and edit — never silent overwrites.
- **SPI sir:** rejected Kushal's earlier standardized single-page "too long / scrolling" chart; preferred
  the original 6-page Panchavati layout. That critique is why the team studied the first 3 pages and built
  `design/panchavati-compv3.html` as a mock of that denser layout.

### Repo map (exact paths)

- **This repo (workspace root):** `C:\Users\kusha\Desktop\DailyDutyPanchavati-ui-rebuild (4)`
  - Our code: `docs/`, `skills/`, `reference/` (read-only corpus), `db/`, `server/`, `scripts/`,
    `tests/`, `web/`, `design/` (frozen visual baseline), `tools/`, `package.json`, `tsconfig.json`,
    `vitest.config.ts`, `.env`.
- **Arjish's latest work:** `DailyDutyPanchavati-ui-rebuild\`
  - Header design source: `src/web/components/AppNav.tsx`, styles `src/web/index.css`.
  - Its own setup/docs: `Panchavati_PROJECT_FILE_MAP (1).md`, `Panchavati_SETUP (1).md`, `SETUP.md`.
  - Its own DB: PostgreSQL `panchavati_dev` (port 5432 shared, different DB name). On this machine it
    also has `panchavati2_dev`, `panchavati3_dev`, `panchavati_combined`, etc. — old and current variants.
- **Kushal's repo (archive):** `DailyDutyPanchavati-ui-rebuild\NEW DATA\kushals repo\archive\`
  - Most useful docs: `Manual_North_Star_By_Kushal.md`, `POLICE_DUTY_REGISTER_PRODUCT_MVP_and_NORTH_STAR.md`,
    `PANCHAVATI_REFERENCE_DATA.v2.md`, `Standardized_Chart_Kushal.html`, `Points_from_Kushal/Points_from_Kushal.md`,
    `docs/CROSS_STATION_TARGET_ARCHITECTURE_PROPOSAL_2026-09.md`, `docs/FORENSIC_VISUAL_ANALYSIS_10PDF_2026-09.md`.
  - Other subdirs: `Durvesh_Work/`, `EXCEL_RECONSTRUCTION/`, `SEMANTIC/`, `ORIGINAL_VISUAL/`, `ORIGINAL_DOCX/`,
    `CONVERTED_PDF/`, `Chart_mock_html/`, etc.
- **Reports:** `DailyDutyPanchavati-ui-rebuild\NEW DATA\REPORT\README.md` — our OCR work summary.

---

## 2. What was built in the session that just ended (this repo)

All of the following are **built and verified** in the current repo as of the last working session. Do not
re-implement them; reuse them.

### 2.1 App header + date selector (Arjish-style)

- Implemented in the server-rendered HTML, not by importing Arjish's React code.
- Renderer: `server/render/chart-html.ts` emits `<div class="toolbar no-print" id="appbar">`.
- Styles: `web/authoring.css` (navy `#0e1e38`, sticky, `.no-print`, ~56px bar).
- Behaviour: `web/chart-authoring.js` `initDateMenu()` → `GET /api/charts` → dropdown of real chart dates;
  clicking navigates to `/charts/<date>`.
- Logo served from `web/assets/Police_Logo.png` via a server route — never from `reference/`.
- Gotcha fixed: `SELECT chart_date` in pg returns a JS `Date`; the API route uses `chart_date::text`.

### 2.2 Local pseudo-login

- File: `web/chart-authoring.js`.
- Header chip: `लॉगिन` when signed out; `लॉगिन: पोशि ५६९ यश विकास पवार` (or whichever is picked) when signed in.
- Tooltip on the chip: `तक्ता तयार करणारे हजेरी लेखनิก: …`.
- Picker offers the chart's own हजेरी लेखनिक candidates. For 10/09 those are exactly the three you named:
  **पोहवा ६९२ अनिल बाळु गुंबाडे · पोशि ५६९ यश विकास पवार · मपोशि ६६९ मयुरी अर्जन गांगुर्डे**.
- Also offers a name + rank + buckle form, where **the buckle field is shown only for `cadre = CONSTABULARY`**.
  Hidden for officers (e.g. SR_PI), shown for constabulary ranks (e.g. PC).
- State in `localStorage['pd_clerk']` = `{staffId, nameMr, rankCode, rankShort, buckleNo}`. "बाहेर पडा" clears it.
- No password, no server call, no schema change, nothing leaves the machine.
- Display uses Devanagari digits (e.g. `पोशि ५६९`) while storage stays Latin — display transform only.

### 2.3 Per-chart editable names

- Renderer emits `data-label` (stable key) + `data-default` (SOURCE text) + `data-override` (which scope is active)
  on **185 elements**: chart title, section/table titles, desk/block/sub-col names, matrix/summary/officer/scan
  column headers, left-row group + role labels, sign-off labels.
- Storage: `daily_charts.presentation_overrides.labels` (per-element) and `.labelsAll` (everywhere this default
  text appears). These live inside the already-projected `presentation_overrides`, which lands in
  `doc.template.overrides`, so finalized snapshots carry their names for free.
- API: `PATCH /api/charts/:date/labels` `{scope:"element"|"all", key?, defaultText?, text}`. FINALIZED → 409.
  Blank clears the override back to default. 160-char cap.
- UI: edit mode → dotted-outline hover (outline+tint only, no layout shift) → click/Enter → flyer with input +
  फक्त हे / सर्वत्र radios (pre-selected from `data-override`) → PATCH → reload.
- **What is NOT editable by rule:** the date/weekday line, people's names, matrix cell values, state words like
  बंद/चार्ज.

### 2.4 अधिकारी box add (mirror of the working chowki box)

- Button enabled in edit mode; `openAddOfficer()` flyer routed in `onDocumentClick`.
- API: `POST /api/charts/:date/officer`.
- Domain: `server/assignments.ts` → `addOfficerBox()` writes `presentation_overrides.officerBoxes` entry (label,
  optional title, writer duty title derived as `"<label>॰रायटर"`, writer role `"रायटर"`) **and** inserts ONE
  `VACANT_RIKT` seat row whose `duty_title` is the writer title, into the day office column (column 4).
- The seed's own grammar: the label row IS the fillable seat, so the box's रायटर cell is a real `data-asn` slot.
- Duplicate label → 409; blank label → 400. No invented person/timing/BIMA.
- Renderer appends extra officer boxes after the template's; the office-walk was hardened so a FILLED writer seat
  stays in ITS box (verified live: assign → renders in-box, not the preceding box, not the office desk).

### 2.5 Chowki-band text + edit-hover fixes

- Chowki in-charge no longer duplicated as the sub-col's first row; `.fx` lines split into `.st` (nowrap) +
  `.dst` (wraps) so nothing breaks mid-phrase or leaves an orphan word. Every `.fx` line is 1–2 balanced lines,
  zero spill.
- Edit hover: affordance is now outline + tint only; geometry identical hovered or not.

---

## 3. Where the project stands right now (must-read)

### 3.1 Docs (read these first, in order)

1. `docs/CURRENT_STATE.md` — implementation truth + verification status.
2. `docs/SESSION_HANDOFF.md` — long-form state, traps, open designs.
3. `docs/OPEN_QUESTIONS.md` — what must not be guessed.
4. `docs/ARCHITECTURE.md` — how the pieces fit.
5. `docs/DOMAIN.md` — entities and rules.
6. `docs/ASTRA_TRANSITION_PACKET.md` — this file.
7. `docs/PRODUCT_UI_ARCHITECTURE.md` — the approved product/UI architecture (P1 slice 1 + authoring model).

### 3.2 Frozen visual baseline (do not change unless the user says so)

- `design/compv3.css`
- `design/panchavati-compv3.html`

### 3.3 Our implementation files (the real system)

- `server/index.ts` — server: routes, render, authoring API.
- `server/render/chart-html.ts` — server-side HTML projection (the chart renderer).
- `server/chart-document.ts` — ChartDocument projection + finalize snapshot read/write.
- `server/finalize.ts` — finalize + amend.
- `server/assignments.ts` — assignment domain layer incl. `addOfficerBox()`.
- `web/chart-authoring.js` — edit chrome, date menu, pseudo-login, rename popover, add-box flyers.
- `web/authoring.css` — edit chrome, print density, tooltips, appbar styles.
- `db/migrations/` — forward-only migrations; never edit an applied one, add a new one.
- `db/seed/` — reference/structural seeds.
- `scripts/` — `db:migrate`, `db:seed:reference`, `db:seed:chart` (10/09), `render:chart`, `doctor`, etc.
- `tests/` — typecheck + vitest suite.

---

## 4. The data model (what exists today, in this repo)

### 4.1 Core chart tables

- `daily_charts(chart_id, chart_date, lifecycle DRAFT|VALIDATED|FINALIZED, template_version_id,
  presentation_overrides jsonb)` — overrides live here.
- `daily_assignments(chart_id, shift DAY|NIGHT, duty_id, duty_title_mr, location_id, staff_id,
  allocation_state ALLOCATED|VACANT_RIKT, is_bima, role_mr, start_time, end_time, notes_mr, sort_order, column_no)`
  — `column_no` is the source duty-column identity.
- `daily_charts.presentation_overrides` (jsonb) holds: `labels`, `labelsAll`, `officerBoxes`, and the rest of the
  existing override shape — reuse it, do not invent new top-level tables for per-chart UI names.

### 4.2 Masters / reference

- `ranks(rank_code, short_form_mr, cadre, …)` — OFFICER ranks have no buckle; CONSTABULARY ranks have buckles.
  This is why the pseudo-login buckle field is shown conditionally.
- `staff_members` — staff master.
- `locations(kind STATION|CHOWKI|MARSHAL_POST|OFFICE|COURT|FIXED_POINT, …)`.
- `duties` — duty master.
- `template_versions` — the template system; marshal/desk folding config is **template display config**, not data:
  `template_versions.layout.marshalPostForChowki`, `.specialDeskLocationKinds`, `.courtDutyCodes`,
  `.officerBoxes`, `.matrixColumns`, `.availabilitySections`, `.scanSessions`.

### 4.3 Operational distinctions — never merge these

- `रिक्त` = an existing duty slot with no person.
- `बंद` = a location/chowki operationally closed for that shift; its charge-transfer info is separate.
- `बिमा` = a per-person assignment qualifier; never infer it by parsing notes.
- `प्रभारी` = person in charge of a chowki block.
- `चार्ज` = the transfer/destination associated with a closure.
- A chowki and its neighbouring marshal post can have different operational states. Model them separately.
- Canonical spellings: बिमा (not विमा), पोशि (not पोषि), काळाराम मंदीर (long ी, not मंदिर).

### 4.4 Protected English terms (do not translate)

`CCTNS`, `Dial 112 MERS`, `DB`, `MERS`, rank codes, `TOTAL`, `Office`, `ME`, and other source English terms
unless an approved rule establishes a Marathi equivalent. Never guess expansions.

---

## 5. Source-of-truth rules (non-negotiable)

1. **Original source files are authoritative.** Original DOCX, original PDFs, unmodified PNG/visual references.
2. **Semantic extractions and OCR are aids, not authority.** They can be wrong. The team observed this directly:
   the semantic extraction wrongly used `काळाराम मंदिर` (short ि) where the Excel reconstruction cell text and the
   semantic 10.md lines 37/87 both actually carry the long ी form `काळाराम मंदीर`.
3. **When sources disagree, record the discrepancy and verify against the original.** Do not guess, merge similar
   names, or infer relationships from nearby text.
4. **Never silently invent a person, rank, duty, closure, replacement, or police procedure.**
5. **Do not parse `remarks_mr`/note text for machine meaning.** BIMA, closure, charge, रिक्त are explicit fields.
6. **Finalized chart = immutable snapshot.** Amendment = new version. Copy-previous never modifies the source chart.
7. **No police operational data leaves the machine.** No external AI/API calls with chart data, no cloud services
   in the runtime.
8. **Never modify `reference/` files.**
9. **Never edit an applied migration; add a new one.**

---

## 6. Current database state (this repo) — verified this session

### 6.1 What was done to the DB for the Astra transition

- Both project databases now contain the agreed non-production baseline: reference masters/templates plus
  the deterministic 10/09 DRAFT chart. No older `panchavati_*` database was touched.
- Commands actually run from this workspace: `NODE_ENV=test npm run db:setup`, then `npm run db:seed`
  for the development database. This initialized the previously empty test database and wiped/reseeded the
  DRAFT chart through the repository's existing chart-seed path; no destructive `dropdb` was run.
- The baseline removes the prior chart UI-debugging rows/overrides without changing migration history.

### 6.2 Current row counts (observed this session)

**This repo, `panchavati3_dev` and `panchavati3_test`:**
- 1 daily chart in each: `2026-09-10`, lifecycle `DRAFT`.
- Reference seed output in each: `ranks 17, staff 179, locations 15, duties 61, scan_cfg 30,
  template_versions 1`.
- Chart seed output in each: `212 assignments, 10 बिमा, 2 रिक्त, 69 availability, 7 location states,
  28 notices, 240 matrix cells, 15 officer rows, 12 scan rows`.
- `presentation_overrides` is `{}` in both databases after the baseline reset/reseed.

**Arjish's DB, `panchavati2_dev` (observed this session, for context only — do not use as our source of truth):**
- 169 staff_members, 2 daily_duty_charts (10-Sept + 16-Sept), 179 duty_slots, 50 duty_definitions, 6 locations,
  16 ranks.
- Of the 169 staff, the roster is constabulary-heavy (most carry buckles); I did not re-assert the exact buckle/officer
  split in this packet because one confirmation query returned empty stdout and I will not invent a precise number.

### 6.3 Seed authority caveat and how to refresh the provisional 10/09 chart

- The project has `npm run db:seed:chart` (script `db/seed-chart-1009.ts`). Its current implementation source is
  `reference/SEMANTIC/10.md`, so treat the resulting chart as a **provisional implementation fixture** until the
  originals-first source audit is completed. It is wipe-and-reseed, DRAFT only, and fails loud on any unresolvable
  person/location.

---

## 7. The two most important reference charts

### 7.1 10-Sept (most studied)

- Original: `reference/ORIGINAL_VISUAL/10.pdf` and `reference/ORIGINAL_DOCX/10-09-2026 duty chart.docx`.
- Excel reconstruction (derived, for layout forensics): `reference/EXCEL_RECONSTRUCTION/10th_sept_daily_duty_chart_page_1/`.
- Semantic aid (can be wrong): `reference/SEMANTIC/10.md`.
- Our 10/09 chart seed (when re-run) reproduces 212 assignments, 10 बिमा, 2 रिक्त, 69 availability, 7 location states,
  28 notices, 240 matrix cells (verbatim), 15 officer rows, 12 scan rows — no-loss 212/212.

### 7.2 11-Sept

- Original: `reference/ORIGINAL_VISUAL/11.pdf` (has the extra 7th page for Ganpati bandobast).
- Also has an `11th_sept_daily_duty_chart_page_1` Excel reconstruction under `reference/EXCEL_RECONSTRUCTION/`.
- 11-Sept is useful because it exercises the extra page; 10-Sept is the primary fidelity target.

### 7.3 Staff_Info.pdf

- Canonical source is the **original DOCX** (`reference/ORIGINAL_DOCX/Full Name ,Mo.No.16.06.2026.docx` and similar).
- `Staff_Info.md` and `PANCHAVATI_REFERENCE_DATA.v2.md` are **AI-extracted semantic aids** and can be wrong.
- Treat the original DOCX as the staff directory authority; treat the semantic extractions as untrusted until verified.

---

## 8. The staff-count comparison you asked about (honest, with confidence)

You asked for a comparison like: total staff in Staff_Info vs what 10/11-Sept charts show vs our DB. Here is the
honest state, not a fabricated precise table.

### 8.1 What I actually know

- Our freshly-reset + seeded DB (this session) has **179 staff master rows** after `db:seed:reference`.
- Arjish's DB has **169 staff_members** (observed this session).
- The 10-Sept chart in Arjish's DB has **212 day+night slots, all allocated** (no रिक्त in the Arjish fixture).
- The 16-Sept chart in Arjish's DB has **66 day slots only** — it was loaded as a DAY-only fixture; there is no NIGHT
  half for 16-Sept in that DB. (Autumn note: the source 16-Sept chart is also a 6-page chart; the Arjish fixture only
  carried page 1 / day.)
- 10-Sept in Arjish's DB has both DAY (22+18+14+21 = 75 slots across the four groups) and NIGHT (38 slots) — I observed
  the DAY and NIGHT slot rows directly this session.

### 8.2 What I did NOT verify precisely

- The exact total staff count in `Staff_Info.pdf` as printed. The PDF is the canonical source, but I did not re-count it
  this session from the original DOCX/PDF myself; the semantic extractions are untrusted.
- The exact number of distinct people that appear across the 10/11-Sept original charts. That requires going back to the
  originals, because staff can repeat across days and shifts.
- Whether our 179 master staff equals the station's real roster. It is a seed from a semantic reference file that can be
  wrong.

### 8.3 Confidence

- **High confidence:** our DB has 179 staff after the reference seed; Arjish's DB has 169.
- **Medium confidence:** 10-Sept has 75 DAY slots + 38 NIGHT slots = 113 total slots in Arjish's DB (observed directly).
- **Low confidence / unverified:** exact Staff_Info total, exact distinct-person count across 10+11 Sept, whether 179 is
  the true station roster size.

### 8.4 Recommended first task for Astra

Run the comparison properly against the originals, and report it as evidence, not as a number to trust blindly:

1. Count distinct staff in `Staff_Info.pdf` / its source DOCX (original, not semantic extraction).
2. Count distinct people actually visible in the 10-Sept and 11-Sept original charts.
3. Compare both to our DB's 179 master staff and to the people actually appearing in the 10/11-Sept chart seeds.
4. Decide whether our master staff list is good enough, and where it is missing/wrong.
5. Also examine Kushal's standardized chart (`Standardized_Chart_Kushal.html`) not to rebuild it, but to study the
   groupings/insights and note what was good and what SPI rejected and why.

Mark each number with its source and confidence.

---

## 9. What to do next (the real next steps, not the one-time handoff)

### 9.1 Immediate

1. Read `docs/CURRENT_STATE.md`, then `docs/SESSION_HANDOFF.md`, then `docs/OPEN_QUESTIONS.md`, then this file.
2. Decide whether the 10/09 chart seed should be re-run now. If yes: `npm run db:seed:chart` (or the project's chart
   seed script) after the reference seed.
3. Run `npm run check` after any change.

### 9.2 Chart-first objective

- Primary objective: get the new compact chart working with real data, fully CRUDable, with the chart looking clean and
  chart-like (no unnecessary cards/borders/noise), every table/chart/column/left-row name editable, अधिकारी box add
  working, header + date selector + pseudo-login working.
- The old 6-page chart is reference/legacy. Optionally import/display it later to show comparisons, but do not spend the
  primary effort rebuilding it.

### 9.3 UI/UX direction you gave

- You do not like the current navbar; Kushal's repo navbar was the best.
- You want the Arjish-style header and date selector (already built in this repo).
- You want chart to be clean, low-noise, not stressful on the eye — but the website UI itself can still be worked on;
  the chart itself should stay clean.
- You want English→Marathi input conversion (reuse Durvesh's idea), but as guided conversion the user can edit, not silent.

### 9.4 Process direction you gave

- Ask many questions **before** planning and before implementing small things (UI, navbar elements, DB, migrations, seeds,
  scripts, etc.).
- Do not silently grow the schema. If real auth/audit is wanted later, that is a real `app_users` table + migration;
  ask first.
- Keep finished features real (persist through API to PostgreSQL, survive reload). Incomplete features should be clearly
  labelled WIP / Coming Soon / Planned.

### 9.5 Decisions confirmed after this packet was first written (2026-10-12)

- **DB baseline:** reference masters + 10/09 DRAFT chart in both project databases; older databases remain untouched.
- **Evidence gate:** originals first. Original visual PDFs/PNG/DOCX are authoritative; verified XLSX/HTML may
  support cell/layout checking; semantic/OCR outputs are candidate aids only until promoted by source verification.
- **Legacy chart:** keep the old six-page packet as a read-only/reference comparison later; do not rebuild it in the
  first compact-v3 milestone.
- **UI stack:** migrate the application UI to React, but preserve the existing ChartDocument/domain boundary and
  server-side renderer/print path unless a later explicit decision changes that contract.
- **Navigation:** implement Kushal's grouped navigation tree without the chart-type/profile dropdown: Dashboard;
  Daily Duty Charts → Panchavati pages; Operations; Data. Leaves that are not real yet remain disabled/Coming Soon.
- **React boundary:** React owns the screen preview and authoring experience first; the existing ChartDocument and
  server-side renderer remain the print/PDF authority for this migration.
- **Auth direction:** plan a real `app_users`/session/audit identity path, but do not add the migration or enforce it
  until the schema and user flow are separately reviewed. The current local pseudo-login remains the working behavior.
- **English→Marathi:** plan guided conversion for staff names and free text; show the suggestion, allow correction,
  and never silently overwrite or call an external service with police data.
- **Staff audit:** report both distinct-person counts and assignment/appearance counts for Staff_Info, 10/09 and 11/09,
  with source and confidence labels rather than one ambiguous total.

---

## 10. Traps that cost time before (do not rediscover them)

1. The dev server does not watch the renderer: editing `server/**` needs a server restart, otherwise you debug stale HTML.
2. Preview screenshots are intermittent; for anything precise prefer DOM measurements or `npm run print:audit`.
3. This environment's ripgrep/code_search is broken; use `grep -n` via terminal, or Python for Unicode-aware scans.
4. `authoring.css` applies on screen and in print; only its `@media print` blocks are print-only.
5. `design/compv3.css` is human-owned; authoring/density/fix CSS goes in `authoring.css`.
6. Pages are A4 landscape: `.page` box = 1122×794 px; `@page margin 0`; print padding 5mm.
7. The FINALIZED 409 path for the new label/officer routes is enforced in code; there is no finalized chart present to
   exercise it automatically unless one is created.
8. curl on Windows can mangle Devanagari in argv; use the browser or file-based payloads for manual API tests involving
   Marathi text.
9. The project limit on customer variables and the reserved auth variable names matter if you touch hosting/auth later.

---

## 11. Transition questions answered; feature-level approval still required

The transition choices above are answered. Before each consequential feature, Astra must still ask about its exact
scope, data fields, migration need, source evidence, and acceptance check rather than silently expanding the schema or UI.

---

## 12. One-line summary for Astra's first 30 minutes

This repo already contains the new compact chart renderer, edit chrome, Arjish-style header + date selector, local
pseudo-login, per-chart editable names, and the अधिकारी box add. Both project DBs now have the clean reference +
10/09 DRAFT baseline, and `npm run check` is green with 77 tests plus the 6-sheet print audit. The real next work is
an originals-first source audit, React UI migration, CRUD hardening, and Kushal-inspired navigation without a chart-type
dropdown. Keep semantic/OCR material provisional, ask before consequential schema/UI/architecture changes, and never
claim chart fidelity without checking the original visual sources.
