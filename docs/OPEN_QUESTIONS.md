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
