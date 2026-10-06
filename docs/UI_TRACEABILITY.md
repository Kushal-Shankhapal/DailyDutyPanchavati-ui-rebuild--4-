<!--
Purpose: Visual traceability: UI element → domain source → requirement → verification.
Current role: Companion to TRACEABILITY.md for the UI layer; updated as screens land.
Last meaningful change: Created 2026-10-06 (Phase 1 UI/UX pass).
Constraint/dependency: UI_SPEC.md is the element authority; ⬜/🔨/✅ statuses stay honest.
-->

# UI_TRACEABILITY

Status: ⬜ specified · 🔨 implemented · ✅ verified (name the check/inspection)

## Core states & chips

| UI element | Domain source | Requirement | Status | Verification |
|---|---|---|---|---|
| `[बिमा]` crimson chip (person-level) | daily_assignments.is_bima | R-10 | ⬜ | grayscale screenshot + INV test (no derivation) |
| `रिक्त` amber dashed `+ १ जागा रिक्त` | allocation_state = VACANT_RIKT | R-10 | ⬜ | state test + grayscale |
| `बंद` hatched block + `चार्ज → …` line | location_operational_states + charge_destination | R-10 | ⬜ | state test + grayscale |
| `प्रभारी` bold in-charge line | assignment role display | R-01 | ⬜ | render inspection |
| `[तपास]/[प्रशा]/[गुन्हे]` branch chip | duty/branch qualifier (explicit field) | R-01, R-17 | ⬜ | render inspection |
| Split-time chip `(०९–१४)` | typed start/end | R-01 | ⬜ | render + type test |
| Devanagari display digits | display transform only | R-17 | ⬜ | render inspection (header dates, chips) |

## Editor interactions

| UI element | Domain source | Requirement | Status | Verification |
|---|---|---|---|---|
| `+ कर्मचारी` picker per slot | StaffMember selection | R-14, R-11 | ⬜ | e2e: pick → autosave → reload shows person |
| `➕ नवीन कर्मचारी जोडा` mini-create → return to context | StaffMember create | R-14 | ⬜ | e2e: create-in-context |
| Replacement on filled line → ledger entry | sudden_duty_changes | R-19 | ⬜ | domain test + UI notice |
| Clear → explicit रिक्त (history preserved) | allocation state + lineage | R-10, R-19 | ⬜ | domain test |
| Contextual `+ ड्युटी / + सूचना / + इव्हेंट` | duty_definitions / chart_notices / special_events | R-01, R-08 | ⬜ | e2e per action |
| Chowki block grammar (name→अधि.→timings→2 sub-cols) | ChartDocument projection | R-01, R-02 | ⬜ | mockup-vs-render screenshot diff |

## Screens & flows

| UI element | Domain source | Requirement | Status | Verification |
|---|---|---|---|---|
| आजचा तक्ता (board + attention bar) | ChartDocument (today) | R-15 | ⬜ | e2e: today shows today's chart |
| उद्याचा तक्ता (copy bases + overlay + conflicts) | copy service + availability | R-12, R-15 | ⬜ | e2e: copy → source hash unchanged → conflicts flagged |
| दैनिक तक्ते history list → read-only view | charts + versions | R-15, R-20 | ⬜ | e2e |
| शोध (staff/duty/location/date → chart hit) | search | R-20 | ⬜ | e2e: find person → open chart → highlight |
| मास्टर डेटा tabs + deactivate | masters CRUD | R-14 | ⬜ | e2e per entity incl. deactivate |
| Lifecycle badges + finalize confirm + amendment | lifecycle | R-13 | ⬜ | e2e: finalize → lock → amend → v2 |
| Secondary panels (7, collapsible) | ChartDocument sections | R-01..R-08 coverage | ⬜ | coverage checklist A-10/09 |
| Attention bar → jump-to-block | conflicts/attention | R-03 | ⬜ | e2e click-through |

## Print layer

| UI element | Domain source | Requirement | Status | Verification |
|---|---|---|---|---|
| Compact board print page | ChartDocument → print renderer | R-16 | ⬜ | print-check skill (render + grayscale) |
| Continuation pages (leave/manpower/scan) | same | R-03, R-04, R-07 | ⬜ | print-check |
| Event annex extra page (zero schema change) | special_events | R-08, R-09 | ⬜ | A-11/09 acceptance run |
| Finalized reprint from snapshot | chart_versions | R-13 | ⬜ | master-wipe replay test |

## Anti-patterns guarded against (negative checks)

| Guard | Origin | Verification |
|---|---|---|
| No KPI/dashboard analytics on Home | duty-board anti-pattern (verified 2026-10-06) | spec review of S1 build |
| No BIMA row in chowkis without BIMA | critique item | render inspection |
| Charge note appears once per shift | critique item | render inspection |
| No explanatory footers/टीप on manpower/officer/scan panels | critique items | render inspection |
| `रायटर` spelled full (never `राय.`) in board cells | critique item | string check on renderer output |
| Sr-PI box uses colon, never "—" dash | critique item | render inspection |
