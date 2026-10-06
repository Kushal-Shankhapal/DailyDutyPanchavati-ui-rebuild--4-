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

### T3 — Printer reality
Target A4 landscape compact board + continuation pages. Actual station printer (A4 laser? color or mono?) unconfirmed — grayscale-safe design covers both.

### T4 — Event model growth
Only रंगीत तालीम-type events have evidence. Do not add recurrence, approval flows, or external integrations until a second real event shape appears.

### T5 — Data migration from old system
Is any old dev-DB data (imported staff phone numbers etc.) worth extracting, or does the new system seed purely from `reference-data.sql` + Staff_Info.md? Recommendation: seeds only.

### T6 — New database names
Old `panchavati_dev/test` must stay untouched; new DBs named e.g. `panchavati3_dev/test` (confirm at P0).
