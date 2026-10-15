<!--
Purpose: Product/UI architecture — the three data layers, editing grammar, navigation, versioning and component design for the real application.
Current role: Required pre-P0 deliverable (user decision 2026-10-08: architecture before any DB work). Awaiting user approval.
Last meaningful change: Created 2026-10-08 from the user's 21-point architecture directive.
Constraint/dependency: AGENTS.md hard rules; visual baseline = design/panchavati-compv3.html + compv3.css — **NOTE (2026-10-15): no longer "FROZEN".** The user re-opened layout work (*"v3 is not frozen mock anymore, we have problems, that's why I am trying to optimize and improve our current render design"*); treat the mock as a historical visual reference and see OPEN_QUESTIONS T30 + docs/SITE_OVERHAUL_BRAINSTORM.md §10. Supersedes changes/0002-site-plan/proposal.md.
-->

# PRODUCT_UI_ARCHITECTURE

**Status: APPROVED — P0 awaiting explicit go. No migrations, seed, or app code until P0 go.**

The chart is finished. This document designs the application *around* the chart: how a clerk safely edits it without turning it into a generic CRUD system or an arbitrary page builder.

---

## 1. Site map (minimal — a document application, not a dashboard)

```
Today
 └── Today's chart            →  /charts/<today>      (the landing page)

Charts
 ├── Date/history list        →  /charts
 ├── Open chart               →  /charts/:date
 └── Search (name/buckle/date)→  /search

Chart (one date)
 ├── Preview (default)        →  /charts/:date
 ├── Edit                     →  /charts/:date/edit
 ├── Print / PDF              →  /charts/:date/print
 └── Versions / Amendments    →  /charts/:date/versions

Master Data
 ├── Staff                    →  /master/staff
 ├── Ranks                    →  /master/ranks
 ├── Duties                   →  /master/duties
 ├── Chowkis / Locations      →  /master/locations
 └── Template configuration   →  /master/templates

Coming Soon — disabled placeholders only, never half-usable controls
```

Explicitly rejected: analytics dashboard, KPI home, sidebar maze, settings pages, generic admin UI.

## 2. Preview / Edit model

- **Preview is the default for every route.** Preview uses the same ChartDocument and visual grammar as print — print is a print projection of the same document. Zero editing chrome.
- **Edit mode** exists only on `/charts/:date/edit`, entered via an explicit `संपादन` action; exit returns to preview.
- In Edit mode: subtle pencil on hover/focus (desktop), contextual `+`, restrained field affordances, keyboard/focus accessible. Print **never** renders editing controls (guaranteed by the print stylesheet, as in the frozen mock).
- Mobile: editing is **Coming Soon** (UI_SPEC §18); mobile gets view-only projection. When editing arrives on mobile it must use explicit touch controls, never hover.

## 3. Chart navigation model (date flow)

The date line `दिनांक: … · वार: …` looks like ordinary document text in Preview. In Edit mode it becomes a control. Clicking it:

1. opens a calendar date picker (never an inline text field);
2. user selects a target date;
3. system checks for unsaved work on the current chart;
4. dirty → dialog: **जतन करून स्विच करा / बदल टाकून स्विच करा / रद्द**;
5. target chart exists → open it; does not exist → offer "आधीच्या दिवसापासून कॉपी" (copy-previous creates a NEW draft; source untouched) or blank draft;
6. never silently overwrites another date's chart.

This is a reusable navigation pattern (`DateSwitchFlow`), not chart-specific code.

## 4. The three data layers (the core boundary)

### Layer A — Master Data
Long-lived entities independent of any chart: Staff, Rank, Buckle number, DutyDefinition, Location/Chowki, MarshalPost, Unit, equipment attributes.
**Editing master data NEVER mutates historical finalized charts.** Historical charts render from their own snapshot (§9), so master edits only affect *new* work.

### Layer B — Chart Data
Data belonging to one date/chart/version: assignments, BIMA qualifier, chowki shift state (बंद + charge destination), marshal-post state, availability (leave/court/training), manpower matrix values, notices, scan-schedule daily rows, sudden-change ledger, lifecycle status.
Assignment rows reference master staff by ID but the chart snapshot remains historically reproducible.

### Layer C — Template / Presentation Configuration
How charts are *presented*: section/section-order, column headings, label short-forms (`वरिष्ठ पोलीस निरीक्षक` → `वपोनि`), field labels, alignment/width/span/visibility properties, restrained style tokens.
**Not chart data, not master data.** Stored as structured configuration consumed by known renderers — **never** arbitrary HTML/CSS/JS storage (cross-station audit warning upheld).

### Element classification table (§6 of the directive)

| Representative chart element | Layer | Owner / storage |
|---|---|---|
| `दत्तात्रय बाळकृष्ण सांगळे` (person name) | A (reference) rendered inside B (assignment) | `staff` + assignment FK; finalized charts snapshot the rendered value |
| `वरिष्ठ पोलीस निरीक्षक` / short form `वपोनि` | C | template label (full form kept; short form on hover/tooltip) |
| Section titles (`मनुष्यबळ स्थिती दर्शक मॅट्रिक्स`, `सुरक्षित नाशिक: गस्त…`) | C | template label |
| Column headings (PI, API, HC…) | C (display order/visibility) over A (rank codes — protected tokens, never translated) | template + `ranks` |
| Field labels (`रायटर:`, `चालक:`, `RTPC:`, `दिवस:`/`रात्र:`) | C | template label |
| `बिमा`, `रिक्त`, `बंद`, `चौकी चा चार्ज → …` | B | explicit structured fields on assignments / location states — never parsed from notes |
| Marshal-post line (`मार्शल: बंद · चार्ज → …`) | B (state) over A (marshal post = a location kind) | `location_operational_state` on a marshal-post location |
| Chart date + weekday (`दिनांक…· वार: गुरुवार`) | B (date) + D (weekday derived from date) | `charts.chart_date`; weekday computed, not stored, not editable |
| Timings (`०९:०० ते २१:००`, split windows) | B (typed HH:MM values); Devanagari digits = D display transform | assignment windows |
| Chowki names, duty names, unit names | A (master) — label overrides may come from C | master tables |
| Leave/court/training categories | A (category enumeration) + B (per-person availability rows) | `availability` |
| Manpower matrix numbers | B — stored authoritative values + clearly-labeled derived totals; never auto-reconciled | `manpower_records` |
| Scan schedule (config vs daily rows) | A (station config) + B (daily person rows) | scan config + daily rows |
| DRAFT / VALIDATED / FINALIZED badge | B (lifecycle state of the chart) | `charts.status` |
| Sign-off block names (तयार करणारे / तपासणी अधिकारी) | B (who, today) rendered under C (block structure/labels) | chart fields + template |
| Derived totals (`एकूण`, प्रत्यक्ष हजर) | D where arithmetic is proven; B-stored where source shows unreconciled values (N4) | computed or stored-with-provenance |

## 5. CRUD grammar (one rule per layer)

- **A-edit** (master): full form editor; versionless rows with `active` flag (deactivate, don't delete). Completeness report later surfaces missing fields.
- **B-edit** (chart): every mutation explicit and human-driven; software calculates, flags and renders only — never auto-schedules, never infers BIMA (AGENTS.md hard rules).
- **C-edit** (template): label/property edits always ask *where to apply*:
  - **या तक्त्यासाठी** → writes to the chart's **presentation-overrides map** (explicit storage, never implicit): `chart.presentation_overrides JSONB`, keyed by template node id (`"officer.title": {label: "वपोनि"}`, `"sec.foo": {align_h: "center"}`). Resolution at render time: chart overrides → pinned template version → renderer defaults. Other charts on the same template version are untouched.
  - **टेम्पलेटमध्ये** → creates a **new template version** (future charts only); the chart keeps its pin (§9).
- **D-rule (derived values are never editable):** proven derived values — weekday from date, computed totals (`एकूण` where arithmetic is proven), the Devanagari digit display transform — recompute from their inputs and must never become editable text boxes. Only values the source shows as unreconciled (manpower `03`, `ME`) live in Layer B as authoritative clerk-entered data (N4/N5).

## 6. PersonAssignmentEditor (one reusable component)

The same flyout for **every** person-bearing slot: Sr-PI, officer, writer, operator, chowki in-charge, marshal, court/office/patrol rows.

```
┌─ Edit: <slot label from template> ─────────┐
│ Current: दत्तात्रय बाळकृष्ण सांगळे          │
│ [ कर्मचाऱ्याची माहिती बदला ]   ← disabled +  │
│     "सध्या रिक्त" note if slot empty        │
│ [ दुसरा कर्मचारी निवडा ]                    │
│ [ + नवीन कर्मचारी ]                         │
└────────────────────────────────────────────┘
```

1. **Edit current** → master staff editor (Layer A).
2. **Select another** → StaffPicker: search by Marathi name, English name, buckle number, rank. Toggleable `फक्त पात्र कर्मचारी` filter — UI ships now, but **eligibility rules stay off until their source is established** (no invented qualification semantics).
3. **Add new** → two modes: *Quick add* (rank, name, buckle — minimum for the chart) with `जतन करा व येथे नेमा`; *Full master entry* (all fields).

Officer-block creation reuses this: create empty officer position → immediately request officer assignment via the editor → then expose writer/operator slots, same component. **No officer→writer→RTPC organizational relation is formalized** (SME N3 stands: visual grouping only).

## 7. Date-change workflow
See §3 (`DateSwitchFlow`). Unsaved-work detection is a global editor state (dirty flag on the ChartDocument), consumed by both the date flow and route-leave guards.

## 8. Template editing workflow

Preview shows template-bound text as document text. Edit mode reveals a pencil on hover/focus → label editor:

```
Edit label
Current (full):  वरिष्ठ पोलीस निरीक्षक
Short display:   [वपोनि]        (shown on chart; full form on hover)
Apply:  ○ या तक्त्यासाठी   ○ या टेम्पलेटच्या पुढील तक्त्यांसाठी
        [रद्द] [जतन करा]
```

- Exact UI is a design detail; the contract is: current value shown, full/short forms distinguishable, apply-scope explicit, finalized charts never silently change.
- A finalized chart's rendered output is immutable even if the template later changes (§9 guarantees this).
- Protected tokens (CCTNS, Dial 112 MERS, DB, MERS, rank codes, TOTAL, Office, ME) are never translatable/transliterable by the label editor.

## 9. Versioning model

| State | Mutability | Mechanism |
|---|---|---|
| Draft chart | Mutable | normalized B-layer working data (assignments, availability, states… — editing source of truth per T13) |
| Validated chart | Mutable via allowed editing rules only | same normalized B-layer data, stricter validation on save |
| Finalized chart | **Immutable snapshot** | complete ChartDocument materialized into `chart_versions.document_json` at finalize; reprint/PDF replays this snapshot only |
| Amendment | New version, never mutation | fresh normalized B-layer draft referencing `amended_from` |
| Template version | Separate versioned configuration | new version on template edit |

**Renderer/template binding:** every chart pins a `template_version_id` at creation. New charts use the template's head version. Existing charts — draft or finalized — keep their pin, so a template edit can never retroactively change any existing chart's rendering. A draft may be *explicitly* upgraded to a newer template version by the clerk.

## 10. Component architecture (React + TypeScript)

```
src/components/chart/      (render-only; data-driven from ChartDocument)
  ChartShell  ChartPage  ChartHeader  DateControl  LifecycleBadge
  SrPiCard  OfficerGrid  OfficerBlock  DutyTable
  ChowkiGrid  ChowkiBlock  ShiftColumn  PersonRow  StateChip
  ChargeTransfer  MarshalLine  Section  DataTable
  LeaveGroup  CourtGroup  MatrixTable  SummaryTable  ScanSchedule  SignOff
  PrintView
src/components/edit/       (mounted only in Edit mode; never printed)
  PersonAssignmentEditor  StaffPicker  StaffQuickCreate  StaffEditor
  TemplateLabelEditor  AlignmentControl  EditFlyout
  DateSwitchFlow  UnsavedChangesDialog  DatePickerDialog
  SaveState
src/lib/
  chartDocument.ts (types)  renderer.ts  template.ts  api.ts
```

Components exist only where repetition, interaction complexity, domain semantics or testability justify them — no component zoo. All chart code passes typed `ChartDocument` objects; no `any`-shaped payloads.

## 11. Responsive strategy
The frozen compv3 breakpoint contract, ported verbatim: ≥1121 desktop sheets → ≤1120 compact (chowkis 3→2) → ≤1000 narrow (stack, officers 4→2) → ≤768 mobile projection (stacked sections, DAY|NIGHT retained, sticky header) → ≤420 small phone. Tables scroll inside wrappers only; page-level horizontal overflow is always 0.

## 12. Print / screen relationship
One ChartDocument, two projections of the same component tree: screen CSS (interactive, responsive) and print CSS (A4 landscape, `@page margin 0`, 11px density, measured page-1 fit ≤ 794px). Editing chrome is unmountable/not-printable by construction. Grayscale-safe semantic states (shape + text label + color, never color alone).

## 13. Permissions / ownership assumptions (MVP)
- Single shared clerk user (OPEN_QUESTIONS T1). All template edits currently allowed — restriction is a later decision (T9).
- No multi-client concurrency (T2: last-save-wins).
- No police data leaves the machine; no external AI/API calls with chart data (AGENTS.md).

## 14. The four deferred decisions (recommended defaults — none blocks P0)

| # | Question | Recommended default | Alternatives | Decide now? |
|---|---|---|---|---|
| 1 | EN↔MR staff names | **Manual dual-entry fields now** (`name_mr` required, `name_en` optional); assisted transliteration (`NameTransliterator` — suggestion + `[वापरा]` accept button, never silent overwrite) as a later phase. Separate from `LabelLocalizer` (translation of rank titles). Library choice deferred. | Browser/API transliteration now | No — defer |
| 2 | Eligibility matrix | Ship the `फक्त पात्र कर्मचारी` toggle disabled with "Coming Soon" tooltip; when SME evidence exists, store rank→post eligibility in `ranks`/`duty_definitions` (not per-location). | Per-location eligibility table | No — SME-gated (new Q T11) |
| 3 | Template edit rights | Any clerk can edit templates now (single-user MVP makes the distinction moot); schema keeps `created_by` so RBAC can be added without migration. | प्रभारी-only now | No — defer with T1 |
| 4 | Template version sharing | Station-shared (all custom template versions visible to the station) — it's one station, one clerk. Personal-only adds plumbing for zero benefit today. | Per-clerk versions | No — defer |

## 15. Conceptual database entities (level only — no DDL until approval)

```
Layer A:  ranks(code, display_mr, full_form_mr, short_form_mr, sort_order)
          staff(id, name_mr, name_en, rank_code, buckle_no, phone, active, …)
          duty_locations(id, kind: chowki|marshal_post|office|court|fixed_point, name_mr, …)
          duty_definitions(id, name_mr, category, …)   units(id, name_mr, …)
Layer B (editing source of truth — normalized, per T13 resolution):
          charts(id, chart_date UNIQUE, template_version_id, status,
                 presentation_overrides JSONB   /* "या तक्त्यासाठी" C-values live HERE */)
          assignments, availability, location_operational_state,
          notices, scan_config, scan_rows, manpower_records,
          officer_summary_overrides, sudden_changes, events, event_assignments
Layer B (history — immutable):
          chart_versions(id, chart_id, document_json /* full ChartDocument snapshot,
                         materialized at FINALIZE; reprints render from THIS, never
                         from today's master/template data */,
                         amended_from_id, reason, created_at)
Layer C:  chart_templates(id, name, is_default)
          template_versions(id, template_id, labels JSONB, layout JSONB,
                            created_by, created_at, note)
```

**T13 resolved — hybrid model (user decision 2026-10-08):**

```
MASTER DATA → normalized chart tables (editing CRUD, search, integrity)
                    ↓ projection
              ChartDocument → React Preview / Print renderer (same grammar)
                    ↓ at FINALIZE
   chart_versions.document_json = immutable snapshot → PDF of finalized charts
```

While editing, the normalized B tables are the source of truth (sane CRUD/search/FKs); the ChartDocument is a typed projection. Finalization materializes the complete snapshot; amendment starts a fresh draft in the normalized tables. Marshal posts are location rows, so बंद+charge is a first-class fact, never parsed from notes (see DOMAIN.md).

## 16. Repository state after this pass (clean-up record)

- `design/panchavati-compv3-stress.html` — **deleted** (user decision: discarded, no dead fixtures).
- `design/compv3-edit.js` — **deleted**; edit-only CSS (`body.edit`, `.ed`, `.picker`, `.toast`, `.add-box`, `.vac-line`, `.chg-flash`, `.closed-banner`) and edit-only markup (संपादन button, save indicator, `+ जोडा` boxes) **removed** from the mock. The mock is now a pure frozen visual/print baseline (CSS + HTML + native print button only).
- Interaction grammar survives in docs/DESIGN_INTERACTION_NOTES.md and this document — that is its only home now.
- No further chart redesign; compact-v3 is the accepted visual baseline. **Superseded 2026-10-15** — the baseline is re-opened and the layout optimisation pass is a live workstream (OPEN_QUESTIONS T30).
