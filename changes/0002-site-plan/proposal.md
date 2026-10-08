<!--
Purpose: Pre-implementation plan — site structure, navigation, screen UI, CRUD grammar, DB shape.
Current role: Proposal for user review (nothing here is implemented yet).
Last meaningful change: Created 2026-10-08 from user's CRUD direction (chart-wide label edits, date-picker navigation, 3-option staff menu, hover-pencil edit, alignment/size properties, no drag-drop).
Constraint/dependency: AGENTS.md hard rules; docs/UI_SPEC.md §18–21; compact-v3 prototypes = visual contract.

> **SUPERSEDED 2026-10-08** by docs/PRODUCT_UI_ARCHITECTURE.md (user decision: full architecture pass before P0; this proposal's §6 phases and §7 open questions were folded there as §14 defaults). Kept as decision history.
-->

# Site Plan — structure, navigation, UI and CRUD (for review, not yet built)

## 0. Guiding decisions (already settled)

- **The chart is the product.** Landing page = today's chart, print-accurate, read-only.
- **Preview mode is the default everywhere.** The user lands on exactly what the PDF will look like. Edit affordances exist only after entering edit mode, and never print.
- **No CRUD effort in the HTML mock.** The mock is frozen as the visual/interaction contract; the grammar below is implemented once, in React.
- **Two layers, one rule:** editing a *label/column name/rank code* edits the **template** (future charts inherit); editing a *person/posting* edits the **chart instance** (that date only). This is what makes "change वरिष्ठ पोलीस निरीक्षक → वपोनि everywhere" possible without touching old finalized charts.

## 1. Site structure & navigation

```
/                      → Today (redirects to /charts/<today>)
/charts                → Daily Charts: calendar strip + list/archive of charts
/charts/:date          → Chart view (preview mode) — THE main screen
/charts/:date/edit     → Same chart, edit mode (URL-guarded, exits back to :date)
/charts/:date/print    → Print/PDF view (zero chrome, auto window.print)
/amendments/:id        → Amendment view (new version of a finalized chart)
/master/staff          → Staff master (200+ people; table + detail drawer)
/master/chowkis        → Chowkis, beats, marshal posts (बंद/charge targets live here)
/master/ranks          → Rank codes (PI/API/…/LPC + display order + full forms)
/master/templates      → Chart template: section/label text, column layout, alignments
/search                → Global search: staff by name/buckle no, charts by date
```

Navigation chrome: single top bar (chart date + lifecycle badge on chart pages; section tabs on master pages). No sidebar dashboard — this is a document application, not a KPI panel (UI_SPEC §21).

## 2. Chart screen (the core) — component architecture

Each repeated element is one typed component file, per the user's modularity point:

```
src/components/chart/
  ChartPage.tsx          — one A4 sheet; owns pagination
  ChartHeader.tsx        — centred title block + lifecycle badge (DRAFT/FINALIZED)
  DateHeading.tsx        — the date line; whole thing is a button → CalendarPicker
  SrPiCard.tsx           — command box (rank label + person + writer/चालक/RTPC groups)
  OfficerBlock.tsx       — one officer card (rank, person, writer, operators)
  DutyTable.tsx          — label/value duty table (दिवसपाळी, कार्यालयीन, कोर्ट…)
  ChowkiBlock.tsx        — chowki card: head (name/अधि./timing) + DAY|NIGHT sub-cols
  SubShiftColumn.tsx     — one day/night column: person rows, बिमा rows, बंद+charge
  MarshalLine.tsx        — marshal-post line (slate, subordinate)
  ChargeLine.tsx         — charge-transfer line (red, once per shift)
  LeaveGroup.tsx / CourtGroup.tsx / MatrixTable.tsx / SummaryTable.tsx
  ScanSchedule.tsx / SignOffBlock.tsx
src/components/edit/     — never rendered in preview mode, never printed
  EditableText.tsx       — hover-pencil wrapper; inline text or opens EditFlyer
  PencilAffordance.tsx   — the clutter-free hover control (see §3)
  EditFlyer.tsx          — the universal popup: the 3-option staff menu
  StaffPicker.tsx        — search: name (EN↔MR), buckle number, rank filter
  StaffMasterForm.tsx    — full master-data form; "minimal add" mode for quick chart use
  CalendarPicker.tsx     — date navigation with unsaved-work warning
  LabelEditor.tsx        — template-layer text edit (column names, section titles)
  AlignmentControl.tsx   — L/C/R + vertical + size (fit/stretch) property editor
```

Rendering is data-driven: one `ChartDocument` JSON → these components. The compact-v3 CSS grammar ports almost verbatim.

## 3. CRUD grammar (user's four ideas, formalized)

**Mode rule.** Landing = preview, exactly print-accurate. संपादन toggle enters edit mode; every affordance below appears only then (hover-pencil on desktop; long-press/tap-target on mobile is a later decision — mobile editing stays Coming Soon for MVP).

**3.1 Everything editable, with versioning.**
- Clicking any text in edit mode (row label, column name, section title, chip text) opens the label editor.
- The editor always answers one question first: *"हे बदल कुठे जतन करायचे?"*
  - **या तक्त्यासाठी** (this chart only) → writes to the chart instance's `overrides`.
  - **टेम्पलेटमध्ये** (all future charts) → writes a **new template version**. Old finalized charts keep the old version — immutability rule holds.
- Custom savings = named template versions ("दिवसपाळी-सकाळ-स्वरूप") that the clerk can switch between.

**3.2 Date heading → calendar navigation.**
- The `दिनांक: … · वार: …` line is a button. Click → CalendarPicker (month grid, Marathi digits are a display transform).
- Selecting a date: if a chart exists → confirm dialog *"सध्याचे अजतन बदल गमावाल; जतन करायचे का?"* (save / discard / cancel) → navigate to that chart. If none → offer "नवीन तक्ता — आधीच्या दिवसापासून कॉपी करा?" (copy-previous creates a NEW version; never mutates the source).
- Direct date editing is never inline — only through the picker, per your rule.

**3.3 Person/rank editing — the universal 3-option flyer.**
- Hover (edit mode only) shows one pencil affordance — same component everywhere, clutter-free.
- Rank label (`वरिष्ठ पोलीस निरीक्षक`): opens rank picker (rank codes are protected tokens; full form shown as tooltip/subtext). Saving to the template propagates to all future charts.
- Person name: opens **EditFlyer** with exactly three options:
  1. **सध्याच्या कर्मचाऱ्याची माहिती बदला** — full StaffMasterForm (name with EN↔MR auto-convert, rank, buckle no, contact, duties). Greyed + "सध्या रिक्त" warning when the slot is empty.
  2. **दुसरा कर्मचारी निवडा** — StaffPicker: search by name (both scripts), buckle number, rank; "फक्त या पदासाठी पात्र" toggle filters by rank qualification.
  3. **नवीन कर्मचारी जोडा** — StaffMasterForm in minimal mode (name + rank + buckle only); a completeness report in Master Data later shows who's missing what.
- Empty officer box flow: "+ अधिकारी बॉक्स जोडा" → same flyer (option 1 greyed) → then writer/operator sub-slots each get the same 3-option menu.

**3.4 Alignment & size properties.**
- Every heading/column/row/box gets an AlignmentControl: horizontal (डावीकडे/मध्यभावी/उजवीकडे), vertical (वर/मध्ये/खाली), size (कॉन्टेन्टला फिट / संपूर्ण रुंदी).
- Stored as per-template-version layout metadata (`align_h`, `align_v`, `sizing` on the template's node tree), NOT per-chart hand-tuning — so it survives copy-previous and prints identically.
- **No drag-and-drop layout for v1** — agreed; revisit only if a real clerk workflow demands it.

**Deferred (recorded, not designed):** your further CRUD ideas get their own pass after this plan is approved.

## 4. DB shape (optimized, normalized — sketch)

PostgreSQL, single store; physical pages are render output only.

```
ranks(code PK, display_mr, full_form_mr, order)
staff(id, name_mr, name_en, rank_code→ranks, buckle_no UNIQUE, phone, …, missing_fields JSONB)
duty_locations(id, kind: chowki|beat|marshal_post|office|court, name_mr, parent_id NULL)
  -- marshal posts are rows here, so बंद+charge is a first-class fact, never parsed
chart_templates(id, name)  / template_versions(id→chart_templates, label_overrides JSONB,
  layout JSONB /* alignments, sizing, section order */, created_by, created_at)
charts(id, chart_date UNIQUE, template_version_id, status: draft|validated|finalized)
chart_versions(id→charts, data JSONB /* ChartDocument */, amended_from_id NULL,
  reason, created_at)          -- finalized = immutable snapshot; amendment = new version
postings(chart_version_id, location_id, shift: day|night, staff_id NULL, is_bima BOOL,
  is_closed BOOL, charge_to_location_id NULL)   -- रिक्त/बंद/बिमा independent, explicit
events_annex(chart_version_id, seq, kind, text_mr)   -- sudden-change ledger
```

Seed source: `reference/SEMANTIC/*.md` provenance files — never old DB dumps, never parsing Marathi notes.

## 5. Old-feature reuse

- **Reuse:** seeder SQL patterns + reference-data tables from old repo A; the print-profile concept; 10/09–11/09 requirement analysis docs; `reference/` evidence chain.
- **Discard:** the duty-board drag UI, any auto-scheduling/BIMA-derivation code, page-geometry tables.
- **Never import:** old chart data as truth — reseed from the semantic files.

## 6. Implementation phases (after your approval)

1. **P0 — DB + seed:** schema above, migrations, 10/09 seed, invariant tests (रिक्त≠बंद≠बिमा, no inferred BIMA).
2. **P1 — Chart read path:** ChartDocument → compact-v3 React render; `/charts/:date`; print view pixel-matched to the mock.
3. **P2 — Edit mode:** mode toggle, hover-pencil, EditFlyer (3 options), picker, minimal-add; preview-mode default.
4. **P3 — Template layer:** label editing, template versions, alignment/size properties, custom saves.
5. **P4 — Master Data + search + calendar navigation.**
6. **P5 — Amendments, finalization lifecycle, PDF export.**

## 7. Open questions (answer before P2)

1. EN↔MR auto-conversion: transliteration library acceptable, or manual dual-entry preferred for names?
2. Rank-qualification filtering (option 2): should the eligibility matrix live in `ranks` (rank→allowed posts) or per-location?
3. Template-version editing rights: any clerk, or should template edits be restricted (e.g. प्रभारी only)?
4. Custom saved template versions: shared station-wide, or personal to the clerk?
