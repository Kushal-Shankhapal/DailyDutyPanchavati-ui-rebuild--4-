<!--
Purpose: Complete working handoff — everything a fresh session needs to continue without re-analysis.
Current role: second-read state file (after docs/CURRENT_STATE.md) for anyone picking this up.
Last meaningful change: 2026-10-13 — chart presentation controls added on the existing JSONB path:
  safe per-element alignment/visibility/compact resolution, renderer hooks, PATCH route and 83 tests green.
Constraint/dependency: verified facts only; plans are labelled as plans; OPEN_QUESTIONS owns ambiguity.
-->

# SESSION_HANDOFF — Panchavati Daily Duty (as of 2026-10-13)

## 0. TL;DR for the next session

Repo works, `npm run check` is green (typecheck + 83 tests + doctor on both DBs) and the chart prints
as **7 A4 sheets, one `.page` box per sheet** (`npm run print:audit`). The renderer reproduces the
approved mock's grammar, folds marshal posts into chowkis and desk posts into page 1's special desk,
and carries the authoritative काळाराम spelling. **Built this pass (everything from the 10/12 user
 message):** per-chart editable names on 185 elements (§5.1), the अधिकारी box add (§5.2), the
 Arjish-style app header + date selector (§5.3), a local-only pseudo-login (§5.4), and the
 chowki-band text + edit-hover fixes (§6b). The 2026-10-13 presentation-controls slice is also complete:
 `PATCH /api/charts/:date/presentation` persists only enumerated properties under
 `presentation_overrides.elements`; renderer hooks resolve them in DRAFT/VALIDATED views and FINALIZED
 remains immutable. Nothing from the current ask is still open.

## 1. Where everything is

### Active chart surface (2026-10-13)

- `/app/charts/2026-09-10` redirects to `/charts/2026-09-10`; the server-rendered ChartDocument is the
  single active chart implementation. The iframe/duplicate React chart path was removed.
- The real chart now has persistent identity/navigation above a separate chart toolbar with lifecycle and
  chart actions. Printed identity is one compact Marathi-first line without `दिनांक`/`वार` labels.
- Consolidated design decisions are recorded in `docs/COMPACT_V4_DECISIONS.md` so future sessions do not
  rely on rereading the entire `mega.txt` before every UI change.
- React source remains dormant until it can project the same ChartDocument without data loss; `design/`
  remains a historical visual reference, not the authoritative 10/09 data source.

| Thing | Path |
|---|---|
| Workspace root (this repo) | `C:\Users\kusha\Desktop\DailyDutyPanchavati-ui-rebuild (4)` |
| Arjish's latest work (reference for the header) | `…(4)\DailyDutyPanchavati-ui-rebuild\` — React/Vite app; header component `src/web/components/AppNav.tsx`, styles `src/web/index.css` |
| Kushal's repo | `…(4)\DailyDutyPanchavati-ui-rebuild\NEW DATA\kushals repo\archive\` (also `NEW DATA\Kushal_Handoff\`, `NEW DATA\standard chart ref\`) |
| Frozen visual baseline (human-owned) | `design/compv3.css`, `design/panchavati-compv3.html` |
| Authoring layer (ours: edit chrome, density, tooltips) | `web/authoring.css`, `web/chart-authoring.js` |
| Renderer (server-side HTML projection) | `server/render/chart-html.ts` |
| Document projection / finalize | `server/chart-document.ts`, `server/finalize.ts`, `server/assignments.ts` |
| Web server (routes, render, authoring API) | `server/index.ts` (port 3100) |
| DB | PostgreSQL 17, trust auth as `postgres`; **`panchavati3_dev`** + **`panchavati3_test`** |
| Print/state evidence | `.tmp-preview/print/ours.pdf`, `.tmp-preview/print/mock.pdf`, `.tmp-preview/chart-2026-09-10.html` |

## 2. Run, verify, and the traps

```bash
npm run dev                 # Fastify on 127.0.0.1:3100
npm run check               # THE gate: typecheck + vitest + doctor (both DBs)
npm run print:audit         # print-fit: every .page box vs one A4 sheet (headless Chrome + CDP)
npm run render:chart        # static render -> .tmp-preview/chart-<date>.html
npm run db:seed:reference   # Layer-A masters (idempotent)
npm run db:seed:chart       # 10/09 chart (wipe-and-reseed, DRAFT only)
NODE_ENV=test …             # same commands target panchavati3_test
```

Traps that cost time before — do not rediscover them:

1. **`npm run start|dev` has no watch for the renderer.** Editing `server/**` requires a server
   restart (`netstat -ano | grep :3100` → `taskkill //PID <pid> //T //F`), otherwise you debug stale HTML.
2. **Preview screenshots are intermittent** ("webview is not being composited"). Reload/reopen the tab
   and retry; for anything precise prefer DOM measurements (`preview_evaluate`) or `npm run print:audit`.
3. **`code_search`/ripgrep is broken** in this environment (`ENOENT … rg.exe`). Use `grep -n` via the
   terminal, or Python for Unicode-aware scans.
4. **Chrome CLI needs a Windows path**: `--print-to-pdf="$(cygpath -w …)"`; binary at
   `C:\Program Files\Google\Chrome\Application\chrome.exe` (`CHROME_PATH` overrides).
5. **Invariant 5 scans `db/`, `server/`, `scripts/` for any `fetch(`/axios.** A new dev tool that talks
   HTTP goes in **`tools/`** (that is why `tools/print-audit.mjs` lives there) — never weaken the scan.
6. **`authoring.css` applies on screen *and* in print**; only its `@media print` blocks are print-only.
   `compv3.css` is human-owned: authoring/density/defect fixes go in `authoring.css`.
7. Pages are A4 **landscape**: `.page` = 1122×794 px, `@page margin 0`, print padding 5mm.

## 3. Verified state of the chart (10/09 source)

- 212 assignments · 10 बिमा · 2 रिक्त · 69 availability · 7 location states · 28 notices ·
  240 matrix cells (verbatim) · 15 officer rows · 12 scan rows. No-loss accounting: 212/212.
 **Print pagination = 7 sheets**, all inside the printable height (audit: 768 / 485 / 580 / 663 / 518 /
  575 / 673px vs 775px printable height). Sheet map: 1 command/core · 2 six-chowki band ·
  3 office/court/special · 4 availability · 5 notices · 6 manpower matrix · 7 officer summary +
  scan schedule + sign-off.
- Page 1 = the mock's same 8 blocks in the same grids; page 2 = the mock's 6 chowki blocks; pages 4–5
  match; page 3 matches structurally (data volume differs).
- **Print density**: sheets 1, 3 and 4 carry `.page.dense`; Page 1 has an additional command-only
  metric adjustment. Screen remains more spacious. Row values are never dropped, truncated or reordered.

## 3b. Database baseline after Astra transition audit (2026-10-12)

- Both project databases now contain the agreed clean baseline: reference masters/templates plus the
  deterministic 10/09 DRAFT chart. Older databases (`panchavati_dev`, `panchavati2_dev`,
  `panchavati_combined`, etc.) were not touched.
- Commands actually run: `NODE_ENV=test npm run db:setup`, then `npm run db:seed` from the workspace root.
- Verified in both `panchavati3_dev` and `panchavati3_test`: 8 migrations, one `2026-09-10:DRAFT` chart,
  212 assignments, 179 staff masters, and `presentation_overrides = {}`.
- `npm run check`: **77/77 tests passed**, typecheck passed, doctor passed for both databases.
- `npm run print:audit` with a live local server: all **6/6 A4 sheets fit** (750/518/680/551/608/705px).
- The chart seed is still mechanically sourced from `reference/SEMANTIC/10.md`; the user has explicitly
  required an originals-first re-verification pass before treating that seed as authoritative.

## 3c. Transition decisions confirmed with the user

- Migrate the screen preview/authoring experience to React; keep the existing ChartDocument and server renderer as
  the print/PDF authority for the first React milestone.
- Use Kushal's grouped navigation tree without the chart-type/profile dropdown: Dashboard; Daily Duty Charts →
  Panchavati pages; Operations; Data. Unfinished leaves stay disabled/Coming Soon.
- Plan a real `app_users`/session/audit identity path, but do not add or apply that migration until its schema and
  user flow are separately reviewed. The current local pseudo-login remains the working behavior meanwhile.

## 4. Decisions made (and the evidence)

| Decision | Evidence / where recorded |
|---|---|
| Beat-marshal posts fold into their paired chowki (own typed बंद/चार्ज state survives as a `मार्शल:` line) | user GO; `layout.marshalPostForChowki`; सरदार चौकी has no marshal in the source → no line. OPEN_QUESTIONS T15 closed |
| Desk posts (मोबाईल, सायबर सेल, महिला कक्ष, वायरलेस महिला अंमलदार, काळाराम) fold into page 1's special desk, one role group per source title | `layout.specialDeskLocationKinds: ["FIXED_POINT"]`; dual-shift titles carry the source's दिवसपाळी/रात्रपाळी wording. T15 closed |
| `काळाराम मंदीर` (long ी), not मंदिर | `reference/EXCEL_RECONSTRUCTION/10th_sept_daily_duty_chart_page_1/HTML/…/sheet001.htm` cell codepoints + `reference/SEMANTIC/10.md:37,87` (the mock's मंदिर is the artifact's typo) |
| Print density instead of content loss; notices on their own sheet | user choice; 6 sheets = the source's own count. OPEN_QUESTIONS T18 closed |
| Special-desk labels stay one-per-source-title (not the mock's merged `मंदिर / महिला`, `ATC / सायबर`) | user choice — nothing invented/merged away |
| Print-fit is verified by tool, not by eye | `tools/print-audit.mjs` + `npm run print:audit` (loopback-only guard) |

## 5. USER ASKS — all closed 2026-10-12 (design kept, implementation notes added)

### 5.1 Per-chart editable names — ✅ DONE 2026-10-12
**As implemented (differs from the draft below in two ways: no schema/projection change was needed —
`labels`/`labelsAll` sit inside the already-projected `presentation_overrides`, which lands in
`doc.template.overrides`, so FINALIZE snapshots carry their names for free; and each element also
emits `data-override` so the popover knows which scope is live):**
- **Renderer** `makeNames(doc)` → `Names{t,a}`: `t(key,def)` = element override → text-keyed
  override → default; `a(key,def)` emits `data-label` (stable key) + `data-default` (SOURCE text,
  never the override) + `data-override="element|all"`. Wired on **185 elements**: `head.h1/h2`,
  `p1.desk.*`, `box.<label>`(+`.nm`/`.role`), `blk.<key>`(+`.DAY|NIGHT`), `grp.<asnId>`,
  `role.<asnId>`, `sec.*`, `avail.*`, `notice.*`, `mcol.*`, `mrow.*`, `ssum.*`, `chg.h.*`,
  `off.h.*`, `scan.s/h.*`, `signoff.1-3`. NOT rename-able by rule: the date/weekday line (D-rule),
  person names, matrix cell VALUES, state words (बंद/चार्ज).
- **API** `PATCH /api/charts/:date/labels` `{scope:"element"|"all", key?, defaultText?, text}` →
  merged under a row lock; FINALIZED → 409; blank text deletes the entry (back to default);
  160-char cap.
- **UI** edit mode → dotted hover (outline+tint only) → click/Enter → flyer with input +
  फक्त हे / सर्वत्र radios (pre-selected from `data-override`) → PATCH → reload.
- **Verified** browser E2E: element rename, scope=all rename (night desk untouched), blank revert,
  `data-override` round-trip; test `override resolution …` in tests/authoring.test.ts.

#### original design brief (kept for reference)
> "make every table, chart or column name, left rows name editable, just their names, for the user to
> tweak namings as per their likings for that version of the chart."

Scope: **per chart** (never masters, never other dates). UI must offer **both** scopes (user's words:
"There should be an option saying only for this all apply all wide").

- **Storage** — `daily_charts.presentation_overrides` (jsonb, already exists):
  `{ "labels": { "<elementKey>": "<new>" }, "labelsAll": { "<originalText>": "<new>" } }`.
- **Projection** — add `labels`/`labelsAll` to `ChartDocument` (`server/chart-document.ts`, from
  `daily_charts.presentation_overrides`); keeps snapshots self-contained (finalize stores the document).
- **Renderer** — one helper used at every named element:
  `const L = (key, text) => labels[key] ?? labelsAll[text] ?? text;`
  and emit `data-label="<key>" data-label-text="<default text>"` so the UI can address it.
  Sites to wire (in `server/render/chart-html.ts`): `headHtml` h1/h2; `.sec h2`; `deskBlock` titles
  (day/night/office/court); officer box chip + रायटर role th; `.ch-head .nm` (location name);
  `.sub-col-title`; availability section titles + availability block keys; notices title + notice group
  keys; matrix `<th>` labels (template `matrixColumns`) + row keys; shift-summary labels + `<th>`;
  officer-summary/scan/sign-off headings and `<th>`s.
  Suggested key scheme: `head.h1`, `sec.<code>`, `p1.desk.<day|night|office|court>`,
  `p1.box.<label>.chip|role`, `p2.blk.<locationCode>`, `p2.blk.<locationCode>.<SHIFT>.title`,
  `p2.row.<assignmentId>`, `p3.avail.<groupKey>`, `p3.notice.<groupKey>`, `p4.mcol.<key>`,
  `p4.scol.<label>`, `p5.*`, `signoff.*`.
- **API** — `PATCH /api/charts/:date/labels` with `{ scope: "element"|"all", key?, text?, nameMr|null }`
  → merge into `presentation_overrides`; refuse on FINALIZED (409) exactly like the chowki route.
- **UI** — in edit mode, any `[data-label]` gets a dotted hover box; click opens a small popover
  (input + radio "फक्त हे / सर्वत्र" + जतन/पुसा) → PATCH → reload. Reuse the flyer shell pattern in
  `web/chart-authoring.js`. A blank value clears the override (falls back to the default name).

### 5.2 "Add अधिकारी box" — ✅ DONE 2026-10-12
**As implemented:** `server/assignments.ts` → `addOfficerBox()` in one transaction: (1)
`presentation_overrides.officerBoxes += {label, title?, writerDutyTitle:"<label>॰रायटर",
writerRole:"रायटर"}` (merged without clobbering labels; duplicate label → 409; blank → 400),
(2) ONE `VACANT_RIKT` row with `duty_title_mr = writerDutyTitle` in DAY column 4 (the renderer's
office desk). The seed's own grammar: **the label row IS the रिक्त seat**, so the box's रायटर
cell is a real `data-asn` slot. (The draft's label-row + seat-row pair was rejected — the office
walk classifies a second vacant row as a non-matching label and it fell out of the box.) The
renderer appends extra boxes after the template's, and the office walk was hardened so a FILLED
writer seat stays in ITS box (verified live: assign → renders in-box, not the office desk, not the
preceding box). Button enabled, `openAddOfficer()` flyer routed in `onDocumentClick`.
**Verified:** add → 213 assignments / 5 boxes / clickable रिक्त seat; test `addOfficerBox domain`
(txn + rollback) in tests/authoring.test.ts; dev DB restored afterwards (212 rows, overrides `{}`).

#### original design brief (kept for reference)
Mirror the working chowki add (`POST /api/charts/:date/chowki` + `addChowkiBlock` in
`server/assignments.ts`, UI `openAddChowki` in `web/chart-authoring.js`).
- `POST /api/charts/:date/officer` `{ labelMr, titleMr? }` → append
  `presentation_overrides.officerBoxes += { label, writerRole: "रायटर", writerDutyTitle: "<label>॰रायटर" }`,
  then insert into the day office column (column 4) a label row carrying that writer duty title plus a
  `VACANT_RIKT` seat row, so the box's रायटर row is a real, fillable slot.
- Renderer: `officerBoxes = [...template.layout.officerBoxes, ...(overrides.officerBoxes ?? [])]`, and
  `writerTitles` must include the extra boxes' `writerDutyTitle` values.
- UI: the button already exists — `<button class="add-box" data-add="officer" disabled>+ अधिकारी बॉक्स
  जोडा (Coming Soon)</button>` in `chart-html.ts`; enable it in edit mode and route it in
  `onDocumentClick` (currently only `data-add="chowki"` is handled).

### 5.3 Arjish-style header + date selector — ✅ DONE 2026-10-12
**Built:** `chart-html.ts` emits `<div class="toolbar no-print" id="appbar">` (emblem + "पंचवटी पोलीस
ठाणे / नाशिक शहर | Panchavati Police Station" + divider + "Daily Duty Chart / दैनिक कर्तव्य तक्ता"),
right side = date button (`१०/०९/२०२६` + Marathi weekday, 🗓) opening a dropdown of real chart dates,
lifecycle badge, existing actions (संपादन / अंतिम करा / प्रिंट) and the clerk chip. Styles in
`web/authoring.css` (`#appbar …`, navy `#0e1e38`, sticky, 56px). Behaviour in `chart-authoring.js`
(`initDateMenu()` → `GET /api/charts`, click navigates to `/charts/<date>`). Logo: copied to
`web/assets/Police_Logo.png`, served by `GET /assets/police-logo.png` (binary route).
**Verified:** bar 56px, sticky, `rgb(14,30,56)`, nothing spills; dropdown lists `१०/०९/२०२६ DRAFT`;
click navigates; `npm run check` green; `npm run print:audit` still 6/6 (the bar is `.no-print`).
**Gotcha fixed:** `SELECT chart_date` returns a JS `Date` → the route now uses `chart_date::text`.
Still to do if the user wants it: month calendar popover (today it lists existing chart dates only).

#### original design brief (kept for reference)
Source: `<ws>/DailyDutyPanchavati-ui-rebuild/src/web/components/AppNav.tsx`.
Design to port (the app is server-rendered HTML + vanilla JS, so re-implement, don't import React):
- Dark navy sticky bar (`#0e1e38`), left: Maharashtra Police emblem + "पंचवटी पोलीस ठाणे" /
  "नाशिक शहर | Panchavati Police Station" + divider + "Daily Duty Chart / दैनिक कर्तव्य तक्ता".
- Right: **date control** = calendar-icon button showing `dd/mm/yyyy` + Marathi weekday, opening a
  dropdown of available chart dates; plus lifecycle badge (DRAFT/VALIDATED/FINALIZED), version/amendment
  chips, and the existing actions (संपादन / अंतिम करा / प्रिंट) folded in.
- Needs a tiny API for the dropdown: `GET /api/charts` → `[{chart_date, lifecycle}]` (or reuse
  `SELECT chart_date FROM daily_charts ORDER BY chart_date DESC`).
- Logo asset: `Maharashtra_Police_Logo.png` exists at both
  `DailyDutyPanchavati-ui-rebuild/Maharashtra_Police_Logo.png` and `…\NEW DATA\…`; copy it into this repo
  (e.g. `web/assets/Maharashtra_Police_Logo.png`) and serve it (a route in `server/index.ts`, or a static
  dir) — never from `reference/`.
- Chrome stays `.no-print`; the printed sheets keep their own `.head`.

### 5.4 Pseudo-login — ✅ DONE 2026-10-12 (local only)
**Built:** `web/chart-authoring.js` — `#ab-user` chip in the header (`लॉगिन` when signed out,
`लॉगिन: पोशि ५६९ यश विकास पवार` when signed in, tooltip `तक्ता तयार करणारे हजेरी लेखनिक: …`).
Clicking it opens the flyer with (1) the chart's own हजेरी लेखनिक candidates — on 10/09 exactly the
three the user named: **पोहवा ६९२ अनिल बाळु गुंबाडे · पोशि ५६९ यश विकास पवार · मपोशि ६६९ मयुरी अर्जन
गांगुर्डे** — and (2) a name + rank + buckle form where **the buckle field appears only for
`cadre = CONSTABULARY` ranks** (verified: hidden for SR_PI, shown for PC). State lives in
`localStorage['pd_clerk']` = `{staffId, nameMr, rankCode, rankShort, buckleNo}`; a "बाहेर पडा" button
clears it. No password, no server call, no schema change, nothing leaves the machine.
**Verified:** chip renders + persists across reload; buckle visibility rule holds; digits display in
Devanagari (`पोशि ५६९`) while storage stays Latin (display transform only).
**If enforcement is ever wanted** (e.g. audit who edited what) that is a real `app_users` table +
migration 0009 + server-side session — ask the user first.

#### original design brief (kept for reference)
- Account creation: pick **name + rank + buckle number**, with the buckle field shown **only for ranks
  where it applies** (`ranks.cadre = 'CONSTABULARY'` has buckles; `OFFICER` ranks do not — see the ranks
  table in §6). Candidates come from the staff master (`GET /api/masters` → `staff`).
- Reference identity set from the chart's sign-off line (तक्ता तयार करणारे हजेरी लेखनिक):
  पोहवा ६९२ गुंबाडे · पोशि ५६९ पवार · मपोशि ६६९ गांगुर्डे.
- Navbar top-right shows `लॉगिन: तक्ता तयार करणारे हजेरी लेखनिक: <rank buckle name>` (the chosen one).
- Keep it local-only: no cloud, no password, no secrets (AGENTS hard rule). Simplest honest
  implementation: `localStorage` key (e.g. `pd_clerk`) holding `{staffId, nameMr, rankCode, buckleNo}`,
  set by the dialog, read by the header + `web/chart-authoring.js`; add a "लॉगिन बदला / बाहेर पडा"
  action. If the user later wants it enforced in the DB, that becomes a real table + migration 0009 —
  **ask first**, do not silently grow the schema.

## 6. Data model you will need

- `daily_charts(chart_id, chart_date, lifecycle DRAFT|VALIDATED|FINALIZED, template_version_id,
  presentation_overrides jsonb)` — overrides live here.
- `daily_assignments(chart_id, shift DAY|NIGHT, duty_id, duty_title_mr, location_id, staff_id,
  allocation_state ALLOCATED|VACANT_RIKT, is_bima, role_mr, start_time, end_time, notes_mr, sort_order,
  column_no)` — `column_no` is the source duty-column identity (1 staff desks / 2 chowkis /
  3 marshal+specials / 4 office+court / 5 notices).
- `locations(kind STATION|CHOWKI|MARSHAL_POST|OFFICE|COURT|FIXED_POINT)`; marshal/desk folding config is
  **template display config**, not data: `template_versions.layout.marshalPostForChowki`,
  `.specialDeskLocationKinds`, `.courtDutyCodes`, `.officerBoxes`, `.matrixColumns`,
  `.availabilitySections`, `.scanSessions`.
- Ranks (`rank_code`, `short_form_mr`, `cadre`): OFFICER = SR_PI वपोनि, PI पोनि, API सपोनि, PSI पोउनि,
  PROB_PSI परि.पोउनि, PROB_LPSI परि.मपोउनि, GRADE_PSI ग्रेपोउनि; CONSTABULARY = ASI सपोउनि, LASI मसपोउनि,
  HC पोहवा, DRIVER_HC चापोहवा, LHC मपोहवा, PN पोना, PC पोशि, DRIVER_PC चापोशि, LPC मपोशि; HOME_GUARD होम.
- Three facts never blur: `रिक्त` (VACANT_RIKT slot) ≠ `बंद` (location state) ≠ `बिमा` (explicit boolean).

## 6b. Chowki-band + edit-mode fixes (done 2026-10-12, user-reported defects)

- **Duplicate in-charge row removed.** The chowki's in-charge (person + time window) printed twice:
  once in `.ch-head .of` (the mock's grammar) and again as the sub-col's first table row, which dragged
  a wrapped stray time chip along. The renderer now treats that row as *represented by the heading*:
  filtered from the sub-col rows, still `count(...)`-ed for the no-loss ledger. Test:
  `tests/render-fidelity.test.ts` asserts exactly one `हेमंत मोहिते` inside the काटया block.
- **`.fx` state lines no longer break mid-phrase.** `stateFx()` now emits
  `<span class="st">बंद · चार्ज →</span> <span class="dst">destination</span>`; `web/authoring.css`
  keeps `.st` nowrap so only the destination can wrap. Measured: every `.fx` line is 1–2 balanced
  lines, zero horizontal spill, no orphan word.
- **Edit-mode flicker gone.** `body.mode-edit .dt td.slot:hover::after{content:" ✎"}` injected a glyph
  that re-flowed the cell on hover (the "everything adjusts/flickers" effect). Removed — the affordance
  is the dashed outline + tint only; geometry is identical hovered or not.

## 7. Working rules (do not relearn the hard way)

- Read `AGENTS.md` first: authority order, hard rules (clerk chooses all personnel; no autonomous
  filling; never parse Marathi notes for machine meaning; finalized = immutable snapshot; never modify
  `reference/`; never edit an applied migration; protected tokens never translated/transliterated).
- Marathi text wraps, never truncates. Devanagari digits are a display transform only.
- Session discipline: update `docs/CURRENT_STATE.md`, `docs/OPEN_QUESTIONS.md`,
  `docs/TRACEABILITY.md`, `changes/<id>/proposal.md` (work unit `1010-renderer-fidelity` is active).
- Verify with `npm run check`; for print/UI changes also `npm run print:audit` + a browser look.
- Never commit/push unless the user asks (nothing in this repo is committed since the 10/08 P0 commits).

## 8. Open questions snapshot

- **T16** — mock content with no source evidence (ऑपरेटर writers, विशेष box writer, shift-summary
  numbers; source Tables 5–7 blank). Never invent; check `reference/ORIGINAL_VISUAL/` PDFs first.
- **T17** — a few staff names are Latin in the master (`पोहवा १३४७ Kushal`); needs transliteration (T10).
- **T15/T18** — closed 2026-10-12 (see §4).
- **T14** — नगदी कारकुन seat pairing; SME confirm when the editor exists.

## 9. Next steps, in the order that keeps the repo green

1. Assignment defaults (suggestions, never auto-fill — hard rule).
2. 11/09 chart seed + event annex page; print verification of both days.
3. Deferred T9–T12 (template rights, transliteration, eligibility, sharing).
Nothing from the 10/12 user message remains open (§5.1–§5.4 all DONE).

Uncommitted work: the whole working tree since the 10/08 P0 commits (renderer, authoring layer,
seeds, docs, `tools/print-audit.mjs`, `web/assets/Police_Logo.png`) — the user has not asked for a
commit; do not create one unprompted.
