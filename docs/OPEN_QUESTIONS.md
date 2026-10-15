<!--
Purpose: Genuine open questions and ambiguities that must not be answered by guessing.
Current role: Living register of uncertainty; each question leaves only via evidence or an explicit station/user decision.
Last meaningful change: Created 2026-10-06 from the audit of both old repos and the 10/09+11/09 charts.
Constraint/dependency: Aligned with 01_CONSOLIDATED_ANALYSIS.md "OPEN SME QUESTIONS"; never hard-code an answer without evidence.
-->

# OPEN_QUESTIONS

Rule: a question leaves only via evidence or an explicit station decision. Until then the system represents the unknown as an explicit, editable field — it never guesses, infers from note text, or silently reconciles.

## SME-gated (blocking semantics, not blocking build)

### N1 — BIMA trigger semantics
What operationally makes a person बिमा on a given day? (Beat assignment? Marshal pairing? Chowki-specific?) Model keeps `is_bima` as an explicit per-assignment boolean; no inference ever.

### N2 — Notice ownership
Do notices belong to the chart (day scope), an event, or a specific assignment? Current model: chart-scoped with optional event/assignment link. Confirm.

### N3 — RTPC / operator semantics
What is ऑपरेटर/RTPC? Is officer→writer→operator a real reporting relation or only visual grouping? Model: visual grouping only.

### N4 — Manpower `03` (दिवस व रात्रकरिता प्रत्यक्ष हजर)
Appears as `03` on all reference dates; no arithmetic reconciliation exists. Stored as clerk-entered authoritative value.

### N5 — `ME` column semantics (manpower matrix)
Expansion and meaning unverified. Preserved as protected token; totals stored as displayed values, never recalculated blindly.

### N6 — Equipment legal binding
Any policy/legal constraints on who may hold which equipment (arms, ammo counts)? Model: allocation lines with quantities only; no eligibility rules without SME.

### N7 — Home vs attached force (परि. prefixed officers)
Are परिविक्षाधीन/attached officers distinguished as source-unit vs home-station for any operational purpose (e.g. counting, leave rules)? Affects staff master (optional `source_unit` field).

### N8 — Generic deployment-context hierarchy
Any real evidence of a needed universal hierarchy (station → context → duty → position)? Deferred; plain FK model unless evidence forces change.

### N9 — सुरक्षित ॲप vs ग्रीन ॲप
Night charts say chowki officers do ग्रीन ॲप, day scan schedule says सुरक्षित ॲप. Two apps, or two names for the same routine? Affects scan-schedule config wording only (kept verbatim from source until resolved).

### N10 — Officer roster ownership
Who owns the 15-row officer duty summary and how is it maintained day-to-day? Model: derived-from-assignments with per-cell manual override; derivation marked DRAFT_SUGGESTION vs MANUAL_OVERRIDE (pattern proven in old repo).

### N11 — Time-window semantics beyond observed evidence
Observed: split shifts (09–14 + 16–21), hourly leave windows (08 ते 10), date ranges (28/08 ते 11/09), overnight night shift. Any other window semantics? Model supports typed start/end + optional multi-window; extends only with evidence.

### N12 — Office duty catalog authority
Office roles observed (Writer set, Cashier, Property Clerk, Confidential, Hazari Master, Crime Clerk, Baranishi, MOB/Missing, Warrant, Session Summons, Summons). Are these fixed positions or free daily duties? Model: duty_definitions seeded from source; clerk-editable daily.

## Technical / product (decided for MVP, revisit later)

### T1 — Auth & users
Single shared clerk user for MVP (old system pattern). RBAC deferred until station confirms roles (old `docs/future/rbac.md` exists if needed).

### T2 — Concurrency
Single-user local deployment; last-save-wins is acceptable now; optimistic locking only if multi-client use appears.

### T3 — Printer reality — ✅ RESOLVED 2026-10-08 (user)
Station prints in **color**. Color accents render as designed; the grayscale-safe semantic design (shape + text label + color, never color alone) is kept anyway as defense for mono printouts/photocopies. Target stays A4 landscape compact board + continuation pages.

### T4 — Event model growth
Only रंगीत तालीम-type events have evidence. Do not add recurrence, approval flows, or external integrations until a second real event shape appears.

### T5 — Data migration from old system
Is any old dev-DB data (imported staff phone numbers etc.) worth extracting, or does the new system seed purely from `reference-data.sql` + Staff_Info.md? Recommendation: seeds only.

### T6 — New database names
Old `panchavati_dev/test` must stay untouched; new DBs named e.g. `panchavati3_dev/test` (confirm at P0).

### T7 — Header digit style — ✅ RESOLVED 2026-10-08 (user)
Devanagari display transform everywhere confirmed (R-17 stands). Latin digits in the old React profile were a defect, not a style.

### T8 — Stitch output — ✅ CLOSED 2026-10-08 (user)
Moot. Stitch designs are old/outdated and superseded by the frozen compact-v3 baseline; they are neither used nor committed as design authority. No licensing question remains.

## From the PRODUCT_UI_ARCHITECTURE pass (2026-10-08)

Each carries a recommended default (docs/PRODUCT_UI_ARCHITECTURE.md §14); none blocks P0. A question leaves only via evidence or explicit user decision.

### T9 — Template edit permissions
Any clerk may edit template labels/properties for MVP (single shared user, T1); schema keeps `created_by` so RBAC can arrive without migration. Alternative: प्रभारी-only. Confirm when multi-user becomes real.

### T10 — EN↔MR staff-name transliteration
Default: manual dual-entry (`name_mr` required, `name_en` optional) + assisted transliteration later (suggestion + explicit accept, never silent overwrite). Library/service choice deferred until a real phase needs it. Distinct from label translation (`LabelLocalizer`).

### T11 — Staff eligibility matrix source (SME-gated)
What makes a staff member eligible for which post (for the `फक्त पात्र कर्मचारी` picker filter)? No evidence yet — toggle ships disabled (Coming Soon); rules enter the DB only with SME input. Likely home: rank→post matrix on `ranks`/`duty_definitions`.

### T12 — Custom template version sharing
Default: station-shared (one station, one clerk). Revisit only if multi-clerk arrives.

### T13 — Chart B-detail storage shape — ✅ RESOLVED 2026-10-08 (user, hybrid)
**Hybrid model, decided before P0:** normalized B tables (assignments, availability, location states, notices, scan rows, manpower, events + `charts.presentation_overrides`) are the editing source of truth for CRUD/search/integrity. The ChartDocument is a typed projection for render. At FINALIZE the complete document is materialized into `chart_versions.document_json` — an immutable snapshot; reprints/PDFs of finalized charts render from that snapshot only, never from today's master or template data. Amendments start fresh drafts in the normalized tables. Full statement: docs/PRODUCT_UI_ARCHITECTURE.md §15.

## From the P0 seed pass (2026-10-08)

### T14 — नगदी कारकुन seat pairing (10/09 seed)
SEMANTIC/10.md Table 1 col 4 (content authority) flows: … पोनि.प्रशासन॰रायटर → पोहवा 936 अहिरराव → पोनि.तपास॰रायटर (**no person**) → नगदी कारकुन (**no person**) → मुद्देमाल कारकुन … . The compact-v3 mock visually paired पोहवा 1347 जाधव with a nearby desk instead. The P0 seed follows the source flow and represents both empty seats as explicit `VACANT_RIKT` slots (vacant ≠ closed ≠ बिमा — slot state, never a person). If the mock pairing reflects clerk reality rather than the 10/09 source page, it is a chart-edit concern (clerk fills the seat), not a seed/schema concern. SME to confirm the intended desk pairing when the editor exists; no schema change either way.

## From the renderer-fidelity pass (2026-10-11)

### T15 — Marshal posts on page 2: own blocks, or folded into the paired chowki?
**Evidence.** The source chart keeps marshal posts in their own column (SEMANTIC/10.md Table 1/2 col 3) and the DB models them as real posts (`locations.kind = MARSHAL_POST`, e.g. `MARSHAL_KATYA_MARUTI`). The approved mock instead shows them *inside* the paired chowki: a closed marshal post appears as one `.fx mrsh` line in the chowki's shift sub-column (`मार्शल: बंद · चार्ज → मालेगाव स्टँड`), and a staffed marshal's people appear in that chowki's sub-column. The mock also omits / de-duplicates several source posts on pages 2–3 (it shows 6 chowki blocks; the 10/09 source also has महिला कक्ष, सायबर सेल, काळाराम गार्ड, पंचवटी १ मोबाईल and five marshal posts), so byte-parity with the mock would require dropping source rows.
**RESOLVED 2026-10-11 (user, option b).** Chart data stays untouched and every source row still renders exactly once; only the render position moves.
1. **Marshal fold.** `layout.marshalPostForChowki` (chowki location code → marshal location code, Layer C display config in the reference seed) folds each marshal post into its paired chowki: its own typed बंद/charge state prints as a `मार्शल:` `.fx` line and its staff rows merge into the same shift sub-column. सरदार चौकी has no marshal post in the source, so it is absent from the map and keeps no `मार्शल:` line — exactly the mock. The pairing is NOT taken from `scan_schedule_config` (its `CHOWKI_SARDAR → MARSHAL_MALEGAON_STAND` row is scan-beat routing, not ownership).
2. **Desk-post fold.** Posts that are not chowki/marshal blocks fold into page 1's `कोर्ट, समन्स, वॉरंट व विशेष कक्ष` desk as one role group per source title: location-less posts (पंचवटी १ मोबाईल, सायबर सेल, महिला कक्ष, वायरलेस महिला अंमलदार, एम.टी.सेक्षन कडील चालक) by having no location, and `FIXED_POINT` posts (काळाराम मंदीर गार्ड ड्युटी) via `layout.specialDeskLocationKinds`. A title staffed in both shifts prints twice with the source's own दिवसपाळी/रात्रपाळी wording; a single-shift title prints unqualified.
**Verified:** page 2 renders exactly the mock's 6 chowki blocks in `.grid.g-chowki` and is 794px = one A4 sheet; `.tmp-preview` structural checks + `tests/render-fidelity.test.ts`; no-loss 212/212.

**Consequence outstanding (T18 below):** the mock fits every page on one A4 sheet, but with the full 10/09 source data pages 1 and 3 do not.

### T18 — Print pagination: one `.page` must equal one A4 sheet — ✅ RESOLVED 2026-10-12 (user, print-density)
**Problem (measured 2026-10-11, screen):** with the full 10/09 source volume the mock's five pages do not each fit one sheet (page 1 = 1.39 A4, page 3 = 2.03 A4; pages 2/4/5 = 1.00). The mock fits because its sample data is smaller — every source row must render (hard rule), so height parity by dropping rows was never available.

**Decision: a print-only density pass, not content loss.** (Rejected alternatives: raw spill onto continuation sheets with no header; keeping the mock's 4-column grids.)
1. The renderer marks the two composite sheets `.page.dense`. `web/authoring.css` relaxes row metrics for them **in print only** (screen keeps the mock's generous scale): body `.p`/`.dt` 10px/9.5px with line-height 1.15, tighter block/body padding, tighter header/section margins, and six columns instead of four for the dense leave/court grids (the mock's four columns leave whole grid rows half empty when one list — साप्ताहिक सुट्टी, 20 people — is far longer than its neighbours). No value, name or row is dropped, reordered or truncated; nothing goes below 9.5px.
2. **The notices section (`सूचना व निर्देश`) gets its own sheet.** The mock draws no notice section at all, so no mock page is contradicted; the 10/09 source itself needs **6 sheets** (`reference/ORIGINAL_VISUAL/10.pdf` = 6 pages), which is exactly what the renderer now produces.

**Verified 2026-10-12** with `npm run print:audit` (headless Chrome, print media, CDP): sheet 1 (dense) 750px, sheet 2 518, sheet 3 (dense) 680, sheet 4 551, sheet 5 608, sheet 6 705 — all ≤ 775px printable height, all six fit. Cross-checked with `chrome --print-to-pdf` on `/charts/2026-09-10`: **6 PDF pages for 6 `.page` boxes** (no spill), vs 8 before the fix (mock.pdf = 5). Row completeness unchanged: no-loss 212/212 in `tests/render.test.ts`.

**Residual difference (accepted):** printed sheets 1 and 3 carry tighter type than the mock's sample pages, and the dense leave/court grids print 6 columns instead of 4. Both are consequences of printing the real chart rather than sample data.

### T16 — Mock content that has no source evidence
Recorded, not rendered (never invent): the mock's officer boxes show `ऑपरेटर` writers (पोशि ३११२ शेवाळे, पोशि १८८१ जाधव, पोशि ०५९५ पगारे) and a `विशेष तपास पथक` writer; `reference/SEMANTIC/10.md`, the EXCEL reconstruction and Staff_Info contain none of them. The renderer therefore shows a `विशेष तपास पथक` box with an open रायटर slot and no `ऑपरेटर` rows. The mock's shift-summary numbers (पाळीनिहाय सारांश) are likewise absent from the source (Tables 5–7 are blank) — the renderer prints the blanks. Confirm against `reference/ORIGINAL_VISUAL/` PDFs; if the PDFs carry them, they get seeded, not invented.

## From the 2026-10-13 feedback batch

### N13 — Do notices belong to a duty block? (new, blocks the notices brief)
The 10/09 source keeps notice text in the note column *beside the row it concerns* (`रात्रगस्त सुचना`, `रात्रड्युटी सुचना`, `महत्वाचे सुचना`) and has no notices page, while `chart_notices.group_key` in our DB is seeded from the source's grouping, not from block keys. Before `docs/BRIEF_NOTICES.md` option A can be built, the station must confirm (a) which notices belong to a specific chowki/desk and which are station-wide (“general”), and (b) that moving a notice under its block is acceptable when it also appears in the circular. Until then: no notice is moved, re-grouped or auto-classified.

### T19 — Legacy reference chart surface
Kushal's legacy six-page chart is a separate app (own DB `panchavati_dev`, own API, React `Page1View…Page6View.tsx`). Decision made 2026-10-13: it is linked (own tab, `npm run legacy:start`), never re-implemented or proxied. Open: should it eventually be *ported* into this repo as a read-only comparison surface (large), or stay a link indefinitely? Also open: should the legacy app be started automatically by `npm run dev`, or stay an explicit one-command reference?

### T20 — Date selector design
The selector was rebuilt this round (anchored menu, grouped आज/उद्या/मागील ७ दिवस/जुने तक्ते) but the user still prefers the look in Kushal's/Arjish's repo. Need: a screenshot or the specific component from those repos to copy the visual (month grid vs list, chip styling, weekday placement). No design is guessed until that reference is supplied.

### T21 — Dense-table layout choices (which option)
`docs/BRIEF_DENSE_TABLES.md` proposes, for the scan schedule, (A) the source's four session cards, (B) one table with session band rows, (C) side-by-side session pairing; and for the court register, (A) grouped court cards, (B) sub-heading rows in the register, (C) an added duty × rank matrix. All are presentation-only and no row is dropped. The station must pick before implementation; A/A is recommended. A/C would introduce derived cells and therefore needs the D-rule sign-off.

### T22 — Transliteration conventions (extends T10)
The shipped offline converter follows a documented encoding (see `docs/CURRENT_STATE.md` item 9). Open questions: (a) is inserting anusvara for `n/m`+consonant acceptable (`saLunkhe` → साळुंखे) or should it be न्? (b) should uppercase `T/D/N/L/S` stay the retroflex convention, or should the clerk get a picker for ट/ड/ण/ळ? (c) whose name forms become the canonical `name_mr` when both fields are typed? No answer is assumed; both fields stay editable.

### T17 — Chart staff names that are Latin in the master
`staff_members.name_mr` for some seeded constables is Latin (e.g. buckle 1347 → `Kushal`), so the chart prints `पोहवा १३४७ Kushal` where the source page shows a Marathi surname. T10 (dual-entry transliteration) covers the fix; flagging it because it is visible on page 1's Sr-PI रायटर line.
## From the 2026-10-13 round 5 (the 13-item list + bilingual ask)

### T20 — Date selector design — ✅ RESOLVED 2026-10-13
The user pointed at the selector in Kushal's repo and said to copy it as-is. The reference is
`DailyDutyPanchavati-ui-rebuild/NEW DATA/kushals repo/archive/src/web/components/AppNav.tsx` (the
date block at the top of the identity bar: calendar icon, date + `आज` badge, weekday underneath,
chevron) and its panel (search box, `आगामी` / `अलीकडील ७ दिवस` / `ऐतिहासिक व डेमो तारखा` groups, a
weekday + availability dot per row, the current row highlighted). Our selector already carried that
grammar; this round brought the last differences in (one scroll region, pinned search row, the
advanced-search entry at the end of the search row). No design is guessed — the file above is the
authority.

### T21 — Dense-table layout choices — ✅ RESOLVED 2026-10-13 (user: “do all the recommended A options”)
Option **A** of both briefs: the scan/patrol schedule prints as the source's own per-session cards
plus the hourly strip folded into three sub-columns, and the court/summons/warrant register prints as
one card per heading (the source prints a heading with names under it, never a page-wide register).
Presentation only — no row added, dropped or reclassified, and no derived cell, so the D-rule is not
touched. `docs/BRIEF_DENSE_TABLES.md` and `docs/BRIEF_NOTICES.md` stay as the option record.

### T22 — Transliteration engine and conventions (extends T10)
**Settled this round:** the engine is Sanscript (MIT, offline, served from the repo's own
`node_modules` — see CURRENT_STATE §4) with a documented Marathi convention layer, a review strip
before anything is written into a field, and protected tokens never transliterated. Two sub-questions
remain open and are NOT guessed:
1. **Where does the English companion live for chart-local text?** Master staff rows already have
   `staff_masters.name_en`, but chart-local text (element names, sign-off values, notice lines,
   free-table titles/headers/cells, matrix columns) stores only its Marathi text. Today the Latin
   field is an ENTRY aid for that edit session (review → accept into the Marathi field). Persisting a
   stored twin needs a decision on shape (`presentation_overrides.i18n` map vs a `text_en` column on
   `chart_notices`) and on what consumes it — the chart prints Marathi only. Nothing is stored until
   the user says which surfaces need a permanent English value.
2. **Should the romanized form become `name_en` automatically** when a staff master is created from
   the picker, or stay a suggestion the clerk accepts? Today the form sends whatever is in the English
   field (auto-filled only if the clerk never typed one) — the clerk can always see and edit it first.

### T23 — Public demo URL vs “no police data leaves the machine” — ✅ RESOLVED 2026-10-13 (user)
**User decision (2026-10-13): the demo deployment may carry the station's real 10/09 chart — “do it,
we have permission”.** The build therefore runs `npm run db:seed` (reference masters + the 10/09
chart) and `PANCHAVATI_KEEP_EXISTING=1` stops a redeploy from wiping a populated chart, so the
clerk's edits survive. Recorded here, in `render.yaml`, in `docs/DEPLOY.md`, and pointed at from
AGENTS.md's data rule. Scope of the authorization: this demo deployment only. For every other
environment the rule stands unchanged — the app makes no outbound call, no key is used, and the
transliteration engine is served from this repo rather than a CDN.

### T24 — Advanced search page (future, reference-first)
The date menu now carries an icon-only WIP entry for advanced search, wired to the same Coming-Soon
flyer as the navbar's ऐतिहासिक शोध leaf — no second implementation exists. **Before any planning or
building of the real page, read the old one**: Kushal's repo implements it as
`…/kushals repo/archive/src/web/HistoricalSearchView.tsx` (filters by date/staff/location/duty/
operation with a `SlidersHorizontal` affordance, results across finalized charts, operational
assignments and events), served at `/search` and described in `AppNav.tsx` as
`ऐतिहासिक शोध (Search) — तारीख, कर्मचारी, स्थान, कर्तव्य व मोहीम शोध`. The user's instruction is
explicit: learn from that implementation instead of designing a new one. Also note it needs its OWN
data decision (which surfaces are searchable) before code.

### T25 — Matrix cell `12<br>04 Proण्` vs `12<br>04 Pro.` + row-key spelling (seed/tests conflict)
**Discovered 2026-10-14 (fact-check of SITE_OVERHAUL_BRAINSTORM.md §9).** Commit `9e7db4f` changed
`db/seed-chart-1009.ts` to write `12<br>04 Pro.` and row-key `हजर मनुष्यबळ`, citing
`reference/SEMANTIC/Page 4.md` (`12 (+4 Pro)`) and `reference/SEMANTIC/16.md` (`12<br>04 Pro.`).
But: (a) the **test DB still holds the old values** (`12<br>04 Proण्`, `हजर मनुश्यबळ` from
`reference/SEMANTIC/10.md` — the actual 10/09 source); (b) three tests assert the old values
(`tests/invariants.test.ts:83`, `tests/chart-document.test.ts:126`, `tests/render.test.ts`);
(c) a fresh `npm run db:seed` would therefore break the suite.

**Evidence is split and none of it is Tier 2:** SEMANTIC/10.md (same day) says `Proण्`;
SEMANTIC/16.md (different day) says `Pro.`; Page 4.md paraphrases as `(+4 Pro)`; the
EXCEL_RECONSTRUCTION covers Page 1 only (the matrix lives on the manpower sheet — outside
reconstruction). The original PDF `reference/ORIGINAL_VISUAL/10.pdf` is the Tier-1 tiebreaker
(visual check of the OFFICE column of हजर मनुष्यबळ) — or the OCR report
(`DailyDutyPanchavati-ui-rebuild/NEW DATA/REPORT/`).

**Do not reseed and do not “fix” the tests until the user/source answers.** Same question applies
to the row-key spelling मनुश्यबळ vs मनुष्यबळ (10.md uses the first; the new seed comment uses the
second). Resolution options: (1) visual check of 10.pdf → align seed + tests to Tier 1;
(2) treat as day-specific variants (each date's own SEMANTIC file wins for that date);
(3) OCR-report cross-check. Option 2 is the conservative default if no check is done.

## From the 2026-10-15 design round (brainstorm + tool survey)

User reports recorded this round, none of them patched in the current stack by the user's own
instruction (*"dont try to fix these, just make sure next time we use react or something better"*):
**(a)** the server-rendered HTML + vanilla JS authoring stack costs a full page reload for every CSS/JS
tweak; **(b)** the EN↔MR toggle is "clearly broken"; **(c)** `design/panchavati-compv3.*` is **no
longer a frozen baseline** — the current render design is actively being optimised. Evidence for (b):
the toggle is hand-wired as 72 `data-lang` spans in the renderer plus 41 in `web/chart-authoring.js`,
with real Marathi strings still hard-coded (so coverage is partial by construction); the repo's own
transliteration assertion is 175/179 names round-tripping (`tests/authoring.test.ts`), i.e. the engine
works on seeded names but the wiring is not reliable in the UI.

### T26 — Design-tool data boundary (which sanitized fixture may go to a hosted UI AI)
The hard rule is that no police operational data leaves the machine; every UI-generating tool (v0,
Bolt, Lovable, Figma Make / MCP, Stitch, Uizard) receives what is pasted into it. Before any design
tool is used, three things must be decided: **(1)** may the fixture keep the real *public* place names
(the six chowkis, court names) with everything personnel-related invented; **(2)** may a screenshot of
a **redacted** printed sheet be used as a layout reference; **(3)** which tools are acceptable at all.
Recommended: structure + public geography yes, personnel/notices/leave reasons invented, no live
sheet screenshot, hosted tools only for chrome exploration. Fixture spec: `docs/UI_HANDOFF_BRIEF.md` §8.
**Trap found while writing it:** `docs/STITCH_BRIEF.md`'s SAMPLE PEOPLE block has the right *shape* but
contains **real personnel names** — do not paste it anywhere.

### T27 — Chrome language default and persistence
EN-first chrome with a one-at-a-time Marathi toggle is the agreed direction, and the mechanism partly
exists (72 + 41 `data-lang` labels). Open: **(a)** is English the default for every clerk, or a
remembered per-clerk choice; **(b)** is that choice stored per browser or on the (future) user record;
**(c)** does the *edit-mode* chrome (flyers, pickers, toasts) count as chrome (EN-first) or as chart
text (Marathi)? Recommended: EN default, remembered per browser for now, all editor chrome in the
catalog. Related: T22 (transliteration) stays open and unchanged — nothing is stored as a twin yet.

### T28 — Static stack → React + Vite migration for the authoring surfaces
Direction from the user (2026-10-15): the next build of the authoring/chrome surfaces must not be
server-rendered HTML + vanilla JS with reload-per-edit. Recommended shape: **Vite + React 19 SPA over
the existing REST API for everything that is clicked, with `server/render/chart-html.ts` kept as the
print authority** (a React re-implementation of the printed sheet would put 212/212 and ≤775 px at
risk). `src/app/` already holds the dormant React + Vite stub (`npm run build:app`). Open: does the
migration happen before or after the layout optimisation pass (T30), and does the chart preview also
move to React or stay server-rendered (it is the same artifact that prints)?

### T29 — First UI-AI run, and the throwaway CRUD sandbox
Which tool gets the first run on the prompt pack: **v0 free tier** (7 messages/day, can read the repo,
generates React/TS components) or a **Bolt free-tier sandbox** (1M tokens/month, includes a database)
that recreates a clean schema and proves the CRUD flows with synthetic data before any of it touches
this repo? Also undecided: whether the sandbox result is used *only* for interaction learnings
(recommended) or as a code source. Lovable is the alternative but cannot import this repo and has
documented Supabase row-level-security footguns. *Not blocked on anything — just needs a pick.*

### T30 — Baseline re-opened: layout priority, and sheets vs legibility
With `design/panchavati-compv3.*` no longer frozen, the chart layout itself is back on the table.
Measured 2026-10-15: sheets 2 and 5 are the sparsest (64% and 75% fill; 279 px and 196 px of unused
height) while sheet 3 is 88% full, and the dense sheets print body text at 9.5–10 px — below general
print guidance, in a workflow that reads the chart as **phone photos of paper**. Two decisions:
**(1)** is the priority order sheet 2 → sheet 5 → sheet 1 (measured slack), or the clerk's own pain
first; **(2)** is a 7th sheet acceptable on a non-event day if it buys noticeably larger type, or is
**6 sheets a hard rule** (today's render is 6, and 7 is reserved for event days with an annex)?
Recommendation: legibility wins where the two conflict, because the photo is the real reader.
