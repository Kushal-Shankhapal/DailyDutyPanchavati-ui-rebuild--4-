<!--
Purpose: Target architecture of the clean rebuild (one operational model, many projections).
Current role: Design truth for implementation; changes only via evidence-backed decisions recorded here.
Last meaningful change: Created 2026-10-06 from INITIAL_AUDIT.md §4.
Constraint/dependency: PostgreSQL-only persistence; physical pages are render output; no page-specific domain tables.
-->

# ARCHITECTURE

> Status: approved-direction proposal (INITIAL_AUDIT §4) — finalize at P0 start.

## Product shape

Primary product = **current compact duty chart** (A4-landscape command board feel) for today's authoring + printing. The old six-page packet survives as a **reference and information-coverage test**, never as the UI. Extra content (e.g. 11/09 रंगीत तालीम) becomes an **event annex page** at print time — the schema does not change when the packet grows a physical page.

## Stack

- PostgreSQL 16/17 (single persistence; Kysely typed client)
- Fastify 5 server (`server/`): REST API + domain layer + print renderer (HTML → Playwright PDF)
- React 19 + Vite + Tailwind 4 (`web/`): authoring UI; display state, send mutations, no business rules
- Vitest (domain/invariant tests) + Playwright (e2e + print verification via IDE browser preview)
- Marathi-first Unicode throughout; Devanagari digits as display transform only

## Data model (core)

Masters (station configuration):
```
ranks               rank_code, name_mr, cadre, display_order
staff_members       name_mr, rank, buckle_no, phone?, active (deactivate, not delete)
locations           chowkis/office/fixed points; kind; active
duty_definitions    code, title_mr, default window, active
units               mobiles/patrol units (पिटर, सी.आर., डेल्टा, DB, पंचवटी 1)
equipment           catalog for allocation lines
event_types?        only if a second real event shape appears
```

Daily (one chart per date):
```
daily_charts            chart_date (unique), lifecycle DRAFT→VALIDATED→FINALIZED
chart_versions          immutable snapshot_json per version; append-only; FINALIZED reads replay from here
daily_assignments       person? + duty + location? + shift preset + start_time/end_time (typed, split-capable)
                        + allocation_state (ALLOCATED | VACANT_RIKT) + status (ACTIVE | NEEDS_ATTENTION)
                        + source (MANUAL | COPIED | REPLACED) + is_bima + notes_mr + unit?
daily_availabilities    staff + date + category (weekly-off, CL w/ windows, EL ranges, sick, maternity,
                        childcare, absent, deputation, training, court/pairvi, investigation, reserve,
                        Nirbhaya/Damini/Missing-cell, outside bandobast, other) + typed windows
location_operational_states  location + date + is_closed + charge_destination_location?
sudden_duty_changes     append-only ledger: original → replacement? + reason + time + actor/version
chart_notices           ordered instructions at chart scope (optional event/assignment link — SME N2)
scan_schedule_config    station-stable: 4 sessions, chowki order, mobile routing, 12 hourly windows
scan_schedule_daily     per-chart: hourly staff rows, daily routing overrides, notes
special_events          title_mr, type, date, time, venue/location, fall-in instruction
event_assignments       event + person + role? (11/09: 11 personnel)
event_equipment         event + person + equipment lines (name_mr, quantity, mandatory/extra)
event_instructions      ordered text notices bound to the event
```

Projections (never a second database):
```
ChartDocument       canonical per-chart document: header, day board, night board, office, marshals,
                    availability, manpower, officer summary, scan schedule, notices, events, diagnostics
BoardView           compact screen layout = pure function of ChartDocument
PrintHTML/PDF       compact print + continuation pages + event annex = pure functions of ChartDocument
```

## Server topology

```
client (React) ── REST ── Fastify
                          ├─ domain/      lifecycle, copy, conflicts, snapshots (pure functions + tx)
                          ├─ repos/       Kysely queries only
                          └─ print/       ChartDocument → HTML → Playwright PDF/PNG
```

Lifecycle rules: finalize writes `chart_versions` snapshot (everything needed to reprint without masters) and rejects further mutation with 409; amendment creates a new version + draft; copy-previous creates a new draft from the prior finalized chart plus known availability overlay → conflict warnings only; the source chart is never touched.

## Invariants (carried from old project, verified per-slice)

1. allocation_state ∈ {ALLOCATED, VACANT_RIKT}; रिक्त is a slot state, never a person
2. बंद lives only in location_operational_states (+ charge destination), never in assignment status
3. BIMA is a per-assignment boolean; no code path derives it from text
4. no code path chooses a staff member automatically (static scan + tests)
5. no parsing of `notes_mr`/`remarks_mr` for machine meaning (typed fields only)
6. chart_versions: no UPDATE/DELETE (trigger) — finalized snapshots immutable
7. copy never writes to the source chart (hash test)
8. conflicted copy survives + NEEDS_ATTENTION + linked availability; never auto-replaced
9. lifecycle monotonic DRAFT→VALIDATED→FINALIZED; no AMENDED pseudo-state
10. finalized rendering replays snapshot only (master-wipe test)
11. Marathi wrap-never-truncate (CSS + e2e check)
12. equipment/everything referenced: deactivate instead of delete

## UI map

Nav (minimal): आजचा तक्ता · दैनिक तक्ते · शोध · मास्टर डेटा (+ disabled Coming Soon items)
- **Home/Today**: date, lifecycle, strength summary, attention items, quick actions, read-only compact board
- **Chart editor**: document-like; contextual `+ कर्मचारी / + ड्युटी / + साहित्य / + सूचना / + इव्हेंट`; staff picker (search existing → "➕ नवीन कर्मचारी जोडा" mini form → save → return to exact context); secondary expandable panels for रजा/इतर ड्युटी, मनुष्यबळ, अचानक बदल, स्कॅन वेळापत्रक, सूचना, इव्हेंट
- **Chowki block**: name → प्रभारी → BIMA-tagged people → remaining staff → रिक्त if seat unfilled → बंद + charge destination if closed
- **Print**: separate screen/print CSS; compact board + continuation pages (leave/manpower/scan) + optional event annex; shape/text + color redundancy for grayscale; render + inspect before any visual claim

## What is deliberately NOT here

No page tables, no universal tree, no autonomous scheduling, no notification pipeline, no OCR/import machinery (until needed), no multi-tenancy, no cloud services, no WhatsApp/Telegram coupling.
