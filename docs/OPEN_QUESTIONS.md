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
