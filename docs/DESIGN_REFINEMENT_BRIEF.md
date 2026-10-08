<!--
Purpose: The design contract for the compact-chart refinement pass (replaces STITCH_BRIEF.md).
Current role: Governs design/ prototype work and any future design-tool pass (Figma Make, etc.).
Last meaningful change: Created 2026-10-06 from the user-approved ChatGPT brainstorm; date conventions corrected (reference १० सप्टेंबर, product ०६ ऑक्टोबर, tomorrow ०७ ऑक्टोबर २०२६).
Constraint/dependency: Subordinate to AGENTS.md hard rules, DOMAIN.md, ARCHITECTURE.md, UI_SPEC.md, OPEN_QUESTIONS.md. Never authorizes domain invention.
-->

# Panchavati Police Duty Chart — Design Refinement Brief

Status: **active design contract** (2026-10-06). Supersedes `STITCH_BRIEF.md`.
Date conventions used everywhere in this pass:

- **reference/source example:** १० सप्टेंबर २०२६ (the real 10/09 chart evidence)
- **current product date:** ०६ ऑक्टोबर २०२६
- **tomorrow:** ०७ ऑक्टोबर २०२६

## 0. Purpose

We are NOT designing this application from scratch.

We already have a working visual direction and partial implementation for a compact Panchavati Police Station daily duty chart.

Your job is to **inspect the existing design and improve it**, not replace its information architecture with a generic dashboard, SaaS admin panel, or AI-generated UI pattern.

The final product must remain a:

> **compact operational police duty register / command board**

It is NOT:

- an analytics dashboard
- a KPI dashboard
- a CRM
- a generic CRUD admin panel
- a card-heavy SaaS application
- a decorative mobile app
- a conventional HR scheduling application

---

# 1. SOURCE MATERIAL — USE ALL OF THESE

Treat the following as different kinds of authority.

### A. Existing compact HTML mockup

Use the existing:

`durvesh_pass_antigravity_updated_2026-09-29-compact-chart-v2-mockup.html`

This is the primary visual reference for the compact chart.

Preserve its successful characteristics:

- landscape command-board layout
- compact information density
- officer section
- day/night structure
- six-chowki matrix
- office/court areas
- leave/special duty areas
- manpower/summary information
- restrained color coding
- strong table/grid structure
- Marathi-first typography

Do NOT recreate it from a textual description if the actual HTML is available.

Inspect the actual implementation first.

### B. Existing React compact implementation

Use the existing React compact profile:

`/api/charts/:id/print?profile=standardized_compact_v2`

This is another primary visual reference for the compact chart.

Compare the HTML mockup and React implementation.

Where they disagree:

1. determine whether the difference is intentional,
2. preserve the better solution,
3. do not blindly copy either implementation.

The goal is to produce a **combined, improved version**.

### C. Real Panchavati source material

Use the verified 10/09 and 11/09 Panchavati duty-chart evidence supplied with the project (`reference/SEMANTIC/`, `reference/EXCEL_RECONSTRUCTION/`, `reference/ORIGINAL_VISUAL/`).

The real source material is required to test whether the layout survives real operational content.

Pay particular attention to:

- long Marathi names
- long duty descriptions
- officer names/ranks
- day/night assignments
- chowki postings
- BIMA
- बंद
- चार्ज transfer
- रिक्त
- leave
- special duty
- court duty
- bandobast
- manpower
- officer summary
- scan schedule
- notices/instructions
- event/equipment information from 11/09

Do not invent meanings for unresolved terminology.

---

# 2. EXISTING PROJECT DOCUMENTATION

The following project documents describe the domain and UX contract:

- `ARCHITECTURE.md`
- `DOMAIN.md`
- `UI_SPEC.md`
- `UI_TRACEABILITY.md`
- `OPEN_QUESTIONS.md`
- `TRACEABILITY.md`
- `CURRENT_STATE.md`
- `INITIAL_AUDIT.md`

These are constraints, not suggestions.

If the design tool proposes something that conflicts with them, flag it instead of silently changing the domain.

---

# 3. CORE DESIGN PRINCIPLE

The chart itself is the product.

The application UI should feel like a **digital version of an operational duty register**, not an application that happens to contain a duty chart.

Prioritize:

1. information density
2. readability
3. spatial relationships
4. fast scanning by police staff
5. compactness
6. print compatibility
7. Marathi readability
8. grayscale survivability
9. predictable editing
10. responsive behavior

Do NOT prioritize:

- visual novelty
- decorative illustrations
- large whitespace
- giant cards
- rounded SaaS components
- gradients
- excessive shadows
- decorative icons
- KPI widgets
- analytics
- dashboard charts

---

# 4. START FROM THE EXISTING CHART

Before generating anything:

1. inspect the existing HTML,
2. inspect the existing React compact profile,
3. compare them,
4. identify the strongest layout decisions,
5. identify remaining weaknesses,
6. propose targeted improvements.

Do not throw away the existing chart and generate a new design from scratch.

The desired result should look like a **refined successor to the current compact-v2 chart**, not like a completely different application.

---

# 5. PRIMARY DESKTOP LAYOUT

Target:

- desktop-first
- landscape operational-board feel
- A4 landscape print compatibility
- potentially A3 landscape where required
- dense but readable
- no unnecessary scrolling for the primary chart when practical

The main chart should visually prioritize:

### Level 1 — Command

- station identity
- date
- lifecycle state
- Sr-PI / senior officer area

### Level 2 — Officers

Officer assignments and support-role information.

Do not invent a formal officer → writer → RTPC organizational relationship.

Where the source only provides a visual support-role slot, represent it visually without asserting an unverified domain relationship.

Use full `रायटर`, never `राय.`.

### Level 3 — Chowkis

Six chowkis arranged compactly.

Preferred starting structure:

3 × 2 grid on desktop.

Each chowki should expose:

- chowki name
- प्रभारी / relevant role
- relevant timing information
- DAY
- NIGHT
- assigned personnel
- BIMA where explicitly present
- बंद where explicitly present
- charge destination where applicable

Do not create a BIMA row unless the actual assignment has BIMA.

### Level 4 — HQ / Office / Court / Special

Use compact tables or blocks rather than oversized cards.

### Level 5 — Secondary operational information

Leave, manpower, officer summary, scan schedule, notices, change ledger and event information may be collapsible/secondary on screen.

The information must remain accessible without cluttering the primary command board.

---

# 6. STATE PRESENTATION

States must be understandable without color.

### रिक्त

Means an existing duty slot has no assigned person.

Use:

- dashed treatment
- explicit `रिक्त`
- restrained amber accent

Never confuse रिक्त with a missing database record.

### बंद

Means the location/chowki is operationally closed for that shift.

Use:

- restrained hatch/disabled structure
- explicit `बंद`
- `चार्ज → <destination>` when charge transfer exists

Never represent बंद as merely an empty slot.

### बिमा

BIMA is a per-person assignment qualifier.

Use:

`[बिमा]`

directly associated with the relevant person.

Do not derive BIMA automatically.

Do not create BIMA from arbitrary note text.

---

# 7. TYPOGRAPHY

Primary language:

Marathi / Devanagari.

Preferred fonts:

- Noto Sans Devanagari
- Nirmala UI
- Mangal
- appropriate system fallback

Use Devanagari display digits for dates and times.

Important rule:

## WRAP — NEVER TRUNCATE

Real police names and duty names can be long.

Do not use:

- ellipsis
- hidden overflow
- clipped names
- one-line forced cells

The layout must adapt to content.

---

# 8. COLOR

Color is semantic, not decorative.

Recommended visual family:

- deep navy for structural headers
- slate/grey for secondary structure
- white background/surfaces
- restrained functional accents

Existing semantic conventions:

- BIMA → crimson
- रिक्त → amber
- बंद → slate/hatched
- branch tags → restrained blue-grey
- lifecycle state → small status badge

The chart must remain understandable when printed in grayscale.

---

# 9. MOBILE / RESPONSIVE DESIGN IS REQUIRED

Do NOT treat mobile as an afterthought.

The desktop chart and mobile chart should share the same information architecture but may use different spatial projections.

Do NOT simply shrink the desktop chart.

Do NOT create microscopic tables.

### Mobile strategy

Use:

- stacked sections
- horizontal sub-columns where useful
- compact two-column day/night structures
- collapsible secondary sections
- readable names
- touch-sized controls
- sticky/minimal chart header where appropriate

The six chowkis can become vertically stacked blocks on narrow screens.

Example:

```text
काटया मारुती

DAY
प्रभारी: ...
०९–१४
कर्मचारी...

NIGHT
प्रभारी: ...
२१–०९
कर्मचारी...
```

But retain the same underlying chart grammar.

---

# 10. TABLES ARE ALLOWED AND PREFERRED

Do not replace every table with cards.

Tables are often the correct UI for operational data.

Use:

- ruled tables
- compact grids
- boxed sections
- aligned columns
- consistent row hierarchy

Cards should be used only where they genuinely improve scanning.

The existing chart is intentionally closer to a **document/table system** than a modern marketing UI.

Preserve that character.

---

# 11. EDITOR UX

The final application must allow a clerk to edit the chart itself.

Do not turn editing into a sequence of database CRUD forms.

Preferred pattern:

```text
[person / slot]
       ↓
click
       ↓
staff picker
       ↓
existing staff OR
➕ नवीन कर्मचारी जोडा
       ↓
return to the exact original chart position
```

Contextual actions may include:

- `+ कर्मचारी`
- `+ ड्युटी`
- `+ सूचना`
- `+ इव्हेंट`
- `+ साहित्य`

Do not invent additional actions.

Editing should preserve the visual structure of the chart.

---

# 12. INTERACTION TEST CASES

If the tool supports an interactive prototype, test these explicitly.

### Test A — Assign employee

Open a duty slot → choose an employee → return to the same chart position.

### Test B — Create employee

Open staff picker → `➕ नवीन कर्मचारी जोडा` → create employee → return to original slot.

### Test C — Clear assignment

Clear a filled assignment.

Result must display:

`रिक्त`

### Test D — Replace assignment

Replace an existing person.

The UI should visually communicate that the assignment changed.

### Test E — BIMA

Add BIMA to a person.

Only that person's assignment receives the BIMA qualifier.

### Test F — बंद

Close a chowki for a shift.

The UI should display:

`बंद`

and the charge destination where applicable.

### Test G — Long name

Insert a deliberately long Marathi name.

Nothing should truncate.

### Test H — Long duty

Insert a long Marathi duty title.

Nothing should clip or break the grid unexpectedly.

### Test I — Mobile

Test the same data at:

- 1440px
- 1280px
- 1024px
- 768px
- 430px
- 390px

The design should remain usable at every width.

---

# 13. PRINT COMPATIBILITY

The primary chart is also a document.

Desktop screen design must not destroy print geometry.

Target:

- A4 landscape
- grayscale-safe
- predictable page breaks
- no decorative browser-only elements in print
- Marathi text fully visible
- no clipped cells

The screen and print should share the same conceptual ChartDocument.

They do not need identical CSS.

---

# 14. KNOWN FIXES FROM THE EXISTING COMPACT-V2

Preserve these decisions:

### Fix 1

Sr-PI box:

Use a colon.

Do NOT use the long dash:

`Sr-PI — ...`

Prefer:

`Sr-PI: ...`

(वरिष्ठ पोलीस निरीक्षक: गजेंद्र पाटील — the rank title may carry a distinct color for hierarchy.)

### Fix 2

Always:

`रायटर`

Never:

`राय.`

### Fix 3

Remove explanatory footer text such as unnecessary `टीप` blocks.

The chart should explain itself through structure and labels.

### Fix 4

Leave/court/bandobast secondary tables should prefer side-by-side layouts when space permits rather than unnecessarily vertical stacking.

### Fix 5

Do not introduce KPI cards or dashboard analytics.

### Fix 6

Do not add decorative icons simply because an AI UI generator thinks they improve the interface.

### Fix 7 (full SPI critique list, `reference/Kushal_compact_chart_critique.md`)

All eight numbered critique items apply: symmetric header spacing; colon in Sr-PI box + consistent palette; officer boxes retained with consistent role-label colors; day/night core shifted left with office/court desks moved to their right; chowki heading order = chowki name → अधि. <name> → timing, symmetric; full `रायटर`/`अंमलदार` labels and full staff names (buckle + surname) in chowki cells; no BIMA row when no BIMA; charge note once per shift; `काटया मारूती चौकी` verified NOT closed day or night against the real source; leave/court tables side-by-side; remove redundant totals/explanatory footers (`पुढील पाळीत परत`, `रँकनिहाय…`, both `टीप` paragraphs, `पाळी सारांश (डावीकडे) · बदल नोंद (उजवीकडे)`, `१५ दुय्यम अधिकारी…`, `४ सत्रे…`); chart not infographic.

---

# 15. WHAT YOU ARE ALLOWED TO CHANGE

You MAY improve:

- spacing
- column widths
- typography
- border hierarchy
- section grouping
- responsive breakpoints
- mobile stacking
- interaction affordances
- contextual controls
- density
- alignment
- visual hierarchy
- print/screen relationship

You MAY combine the best aspects of the existing HTML and React implementations.

You MAY propose a better compact arrangement if you can demonstrate that it improves readability or density.

---

# 16. WHAT YOU MUST NOT CHANGE

Do NOT invent:

- new domain concepts
- new police terminology
- BIMA semantics
- RTPC semantics
- officer hierarchy
- manpower formulas
- automatic staff assignment
- automatic replacement
- automatic BIMA
- inferred relationships
- generic scheduling logic
- analytics dashboards

Do not silently "fix" unresolved domain questions.

Unknowns remain unknown until explicitly resolved.

---

# 17. SUCCESS CRITERIA

The resulting design should make a police clerk think:

> "This is my duty register, just on a computer."

It should NOT make them think:

> "This is a web dashboard with a duty chart inside it."

A successful design is:

- compact
- calm
- operational
- document-like
- Marathi-first
- highly scannable
- responsive
- editable
- print-safe
- grayscale-safe
- visually close to the existing compact-v2 direction
- better than the current implementation without discarding its strengths

---

## 18. OUTPUT REQUIRED

Do not generate eight unrelated screens.

First produce:

### A. Desktop Today/Editor chart

The main compact chart.

### B. Mobile Today/Editor chart

The responsive projection of the same chart.

### C. One populated realistic example

Use realistic Panchavati-style data derived from the supplied source evidence.

### D. One stress-test example

Use:

- long names
- long duties
- रिक्त
- बंद
- BIMA
- charge transfer
- day/night
- multiple personnel

### E. Interaction notes

List how the following work:

- staff selection
- staff creation
- assignment replacement
- clearing
- BIMA
- बंद
- contextual `+`

### F. Design delta

Explicitly state:

1. what was retained from the existing HTML,
2. what was retained from the existing React implementation,
3. what was changed,
4. why each change is better,
5. what should be implemented in the final React application.

Do not redesign the product unnecessarily.

The goal is refinement, not reinvention.
