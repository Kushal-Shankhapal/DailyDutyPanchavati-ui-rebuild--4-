<!--
  Purpose: The interface + CRUD + interaction specification for the Panchavati duty-chart app, written so it can be pasted into UI-generating AIs (Figma Make, v0, Bolt, Lovable, Stitch) and used as the design brief for the React rebuild.
  Current role: Design hand-off artifact (companion to §10 of docs/SITE_OVERHAUL_BRAINSTORM.md; the flows artifact is deliverable #1, this is #2 and #3 merged into one source).
  Last meaningful change: 2026-10-15 — created from the real `ChartDocument` fields + the measured render baseline (6 sheets, 655/496/685/663/579/664 px) + a current-vs-legacy layout comparison.
  Constraint/dependency: AGENTS.md hard rules; §8 = what may leave the machine (nothing operational, ever); this document is spec + prompts, it implements nothing.
-->

# UI_HANDOFF_BRIEF — Panchavati Daily Duty

> **What this is.** The human brief (§1–§6) and the machine prompts (§7) for everything in this app *except* the six printed sheets. The sheets are measured, not designed — `npm run print:audit`.
>
> **Who uses what.** *The user* reads §1–§6 and edits that prose. *A UI AI* (v0 / Bolt / Figma Make / Stitch) gets §7.P0 first, then exactly one prompt afterwards. *The coding agent* implements from §4–§6 and verifies with `npm run check`.

---

## 1. The product in one page

**Who:** one clerk, Panchavati Police Station, Nashik City. Marathi is the working language; the chrome is English-first per the user's 2026-10-14 direction (see §5.6).

**What:** the daily duty chart the station already produces on paper. Six printed sheets contain ~212 personnel assignments. The clerk is the sole decision-maker; the software calculates, flags and renders — **it never schedules, replaces, or infers**.

**The one sentence that governs every screen:** *software may calculate, flag and render; the human chooses every person.*

**Five invariants that no screen may violate** (each one is enforced in the database or by tests):

1. `रिक्त` (vacant seat) ≠ `बंद` (closed location) ≠ `बिमा` (beat-marshal qualifier) — three explicit states, never conflated, never inferred from Marathi notes.
2. No-loss: every assignment prints exactly once (212/212).
3. Finalize = immutable snapshot; an amendment is a new version; copy-previous never touches the source chart.
4. Clerk authority: no auto-assignment, no suggestions that apply themselves.
5. Print correctness: six sheets, each ≤ 775 px of A4 landscape.

**Rejected on sight** (say this to any AI tool): analytics dashboards, KPI tiles, hero sections, marketing cards, generous whitespace, icon-only navigation, dark-mode-first design, gamification, "AI-suggested staff", auto-fill, drag-and-drop auto-scheduling.

---

## 2. The real data contract

### 2.1 Shape and counts (measured 2026-09-10, live)

| Thing | Count |
|---|---|
| Assignments | **212** (DAY 125, NIGHT 77) — includes 2 explicit `रिक्त` seats |
| Explicit `बिमा` flags | **10** (per-assignment boolean) |
| Location operational states | 7 (closed / charge-transferred) |
| Availability rows (leave, court, training, other duty) | 69 |
| Notices | 28 |
| Manpower matrix cells | 240 |
| Officer-summary rows | 15 |
| Scan-schedule rows | 12 |
| Chowkis | 6 (fixed order) |
| Staff masters | 179 · ranks 17 · locations 15 · duties 61 · scan config 30 |

### 2.2 Entities — use these exact field names

The UI renders a projection called **`ChartDocument`**. A prompt that names these fields produces code that matches the API; a prompt that invents field names does not.

```ts
ChartDocument {
  chartId, chartDate /* YYYY-MM-DD */, weekdayMr /* computed from the date — never editable */,
  lifecycle: "DRAFT" | "VALIDATED" | "FINALIZED",
  template: { templateVersionId, labels, layout: { matrixColumns, shiftSummaryColumns }, overrides },
  assignments, locationStates, availability, notices, manpower, shiftSummaries,
  officerSummary, scanSchedule, suddenChanges, events
}

Assignment {
  assignmentId, shift: "DAY"|"NIGHT", columnNo, sortOrder,
  dutyCode, dutyTitleMr, labelFromDuty,
  location: { locationId, code, nameMr, kind } | null,
  unit, person: { staffId, nameMr, rankCode, rankShortFormMr, cadre, buckleNo } | null,
  allocationState: "ALLOCATED"|"VACANT_RIKT",
  isBima, status: "ACTIVE"|"NEEDS_ATTENTION", source: "MANUAL"|"COPIED"|"REPLACED",
  startTime, endTime /* HH:MM:SS, typed split windows */, notesMr /* display only */, roleMr
}

LocationState   { shift, location, isClosed, chargeTo: { locationId, code, nameMr } | null }
Availability    { sortOrder, groupKey, category, person | null, windowStart, windowEnd, timeStart, timeEnd, detailMr }
Notice          { noticeId, groupKey, sortOrder, textMr }
ManpowerCell    { displayOrder, rowKey, columnKey, valueText /* verbatim, may contain <br> */, isDerived }
ShiftSummary    { summaryKey: "DAY"|"NIGHT"|"OTHER", columnKey, valueText }
OfficerRow      { rowNo, officerText, dutyText, source: "SOURCE"|"SUGGESTION"|"OVERRIDE" }
ScanRow         { sessionCode, sequence, startTime, endTime, location, person, noteMr }
SuddenChange    { seq, original, replacement, detailMr, noteMr, createdAt }
Event           { eventId, titleMr, eventDate, startTime, venueMr, fallInMr, assignments[] }
```

`location.kind ∈ STATION | CHOWKI | MARSHAL_POST | OFFICE | COURT | FIXED_POINT`.

### 2.3 The three states, and how they must render

| State | Kind | Field | Rendering contract |
|---|---|---|---|
| **रिक्त** | seat | `allocationState = VACANT_RIKT` | amber dashed seat tag; still clickable; never a person, never a deleted row |
| **बंद** | place | `locationStates[].isClosed` + `chargeTo` | slate hatched shift column + one line `चार्ज → <name>` typed by the clerk; the column's rows stay in the document but hide from the projection |
| **बिमा** | assignment | `isBima` | crimson chip **before** the person's name; toggled per assignment; **never** carried over on replacement |

**Protected tokens — never translated, transliterated or re-cased:** CCTNS, Dial 112 MERS, DB, MERS, TOTAL, Office, ME, and the rank codes `PI / API / PSI / PROB_PSI / GPS / ASI / LASI / HC / LHC / PN / LPN / PC / LPC`. Canonical Marathi: **बिमा** (never विमा), **पोशि** (never पोषि).

### 2.4 Lifecycle

`DRAFT → VALIDATED → FINALIZED`. Finalized is immutable; `सुधारणा सुरू करा` opens a **new version**, never mutates the original. `source` on an assignment says where a row came from (`MANUAL` typed, `COPIED` from a previous chart, `REPLACED` changed after copy). `status = NEEDS_ATTENTION` is a flag for the clerk, never an automatic action.

### 2.5 API surface the UI talks to (already built)

```
GET    /api/charts                      GET/POST /api/charts/:date
PATCH  /api/charts/:date/assignments/:id      POST /api/charts/:date/chowki
PATCH  /api/charts/:date/chowki/:locationId   POST /api/charts/:date/officer
PATCH  /api/charts/:date/officer/:label       POST /api/charts/:date/support
DELETE /api/charts/:date/support/:id          PATCH /api/charts/:date/notices/:id
PATCH  /api/charts/:date/labels               PATCH /api/charts/:date/structure
PATCH  /api/charts/:date/presentation         PATCH /api/charts/:date/values
POST   /api/charts/:date/finalize             POST /api/charts/:date/reopen
GET/POST /api/masters · /api/masters/staff · PATCH /api/masters/staff/:id
```

Rules for the UI: one mutation per user action; PATCH is narrow (send only the changed field); never a bulk "save everything" endpoint; never optimistic-only — reflect the response.

---

## 3. Current render vs the legacy six-page chart

Both are six sheets; they are **not the same six**. The legacy chart groups by *shift*; our render groups by *visual family*.

| Legacy (10.pdf, the chart the station uses today) | Ours (current render, measured) |
|---|---|
| P1 Day shift core (09:00–21:00): 6 chowkis, office desks, PSO, marshals, BIMA | **S1** Daily duty chart — Sr-PI + 4 officer blocks + day/night core **paired side by side** |
| P2 Night shift core (21:00–09:00): **the same chowki blocks again** | **S2** Chowkis, patrol & scanning — 6 chowki blocks (DAY\|NIGHT inside each) + the source's 4 session cards + the hourly strip |
| P3 Leave & special duties (incl. court/training/outstation) | **S3** Court, summons, warrant & special desks — one card per source heading |
| P4 Manpower matrix (12 rank columns + Office/ME totals) | **S4** Leave & other duties — grouped registers |
| P5 Officer duty summary (15 officers, daily कर्तव्य) | **S5** Notices & officer summary |
| P6 Patrol & scan schedule (4 session tables) | **S6** Manpower & summary (+ sudden-change ledger) |

### 3.1 What the re-grouping bought, and what it cost

**Bought (measured):** day and night are compared side by side instead of on two pages (the clerk's most common question — *"who covers this at night?"* — is now one eye movement); the six chowki blocks appear **once**, not twice; every sheet fits one A4 sheet with no row dropped (extents 655 / 496 / 685 / 663 / 579 / 664 px of 775 px).

**Cost / risk to fix in the optimization pass:**

| Finding | Evidence | Implication |
|---|---|---|
| **Sheet 2 is one-third empty** (496/775 = 64%) while **sheet 3 is 88% full** | `print:audit` | the largest single structural win: re-balance content, or spend the slack on type size |
| **Sheet 5 at 75% fill** after S6 took the manpower block | `print:audit` | second re-balance candidate |
| **The print body drops to 9.5–10 px** on the dense sheets | T18 decision + CSS | below general print guidance (~11–12 pt body); the acceptance test is a **phone photo of the printed page**, because the north-star workflow is print → photograph → WhatsApp |
| **Court/leave registers print 6 columns instead of the mock's 4** | T18 | denser but harder to scan; a candidate for re-review once slack is redistributed |
| **The clerk's legacy mental model is "day page, then night page"** | the legacy chart itself | our pairing is better for cross-checking but must not lose the ability to *read one shift straight down*; the chowki DAY\|NIGHT split inside each block preserves it |

### 3.2 What must be kept from the legacy chart regardless of layout

The legacy chart is the artifact the station trusts. Anything we rearrange must still answer its five questions the same way: who is on which chowki by shift; who is on leave/court/other duty today; what the office desks are; the rank-wise manpower counts; the officer-wise duty line. **No row, number or name may disappear** — only its container may change.

---

## 4. Screen inventory

| # | Screen | Purpose | Key regions | States it must show |
|---|---|---|---|---|
| S1 | **App shell** | identity + navigation + language + date | station identity, grouped nav (दैनिक कर्तव्य तक्ते / कार्यवाही / डेटा / समाकलन), date control, EN\|मराठी toggle, clerk identity | current item, WIP badge, Coming-Soon badge |
| S2 | **Chart preview** (default) | read the chart exactly as printed | six sheet containers at true A4 | DRAFT / VALIDATED / FINALIZED badge, print action |
| S3 | **Chart edit mode** | edit the same geometry | the six sheets + editor overlays + contextual `+` | dirty, saving, saved, failed, NEEDS_ATTENTION flags |
| S4 | **Assignment editor** (CRUD popup) | change who occupies one seat | §5.1 ladder + §7.P3 | empty seat, current holder, replaced, बिमा off after replace, leave warning |
| S5 | **Staff picker + inline create** | find or create a person without leaving the page | search field, result rows with availability hint, create form | no results, duplicate warning, mandatory-field error |
| S6 | **Close location (बंद)** | close a shift column and name the charge destination | hatch, banner, charge input, `पुनः उघडा` | closed, charge empty (blocked), reopened-exactly-as-before |
| S7 | **Contextual add** | add a person to an existing role group / officer box / chowki | dashed add-box, `+` on the last cell of a group | new row starts `रिक्त`, picker opens on it |
| S8 | **Date switch / new chart** | move to another day | calendar picker → unsaved-work dialog → copy-previous or blank | exists / does not exist / dirty / copy findings |
| S9 | **Versions & amendments** | see history, start an amendment | version list, snapshot preview, `सुधारणा सुरू करा` | finalized read-only, amendment draft |
| S10 | **Print / PDF** | produce the sheets | print view, per-sheet page boxes | hidden chrome, page count, browser-print notice |
| S11 | **Master data** | staff / ranks / duties / locations / units | plain admin table + tabs | active/inactive, in-use guard on deactivate |
| S12 | **Historical search** | find past assignments | filter row (person, duty/location, date range), result rows | no results, WIP gating until T24 is answered |
| S13 | **Presence-check / dashboard** (WIP) | future operational view | not designed yet | badges only — must not pretend to work |
| S14 | **Coming-Soon page** | honest placeholder for the six WIP leaves | title + one line | never a half-usable control |

---

## 5. Interaction grammar

Sourced from NN/g, Baymard, GOV.UK, USWDS, W3C and practitioner discussions (see §10 of `SITE_OVERHAUL_BRAINSTORM.md`); where a rule is this project's own, it says so.

### 5.1 The editing-surface ladder — pick the lightest surface that works

| Task | Surface | Why |
|---|---|---|
| Replace / clear the person in one seat | **anchored popover on the cell** | keeps the clerk's place; the slot stays visible |
| Toggle `बिमा` | **inline chip in the row** | one boolean, one click, instant feedback |
| Close a column (बंद) | **inline banner with a typed charge field** | the consequence must be visible in place |
| Create a staff member | **non-modal side panel** (or in-picker second state) | several fields; must not hide the chart |
| Finalize / delete / deactivate | **modal**, explicit about consequences | irreversible |
| **Never** | a full-page route for a slot edit; a modal for routine assignment | context loss = mis-assignment |

Whatever surface opens: **the originating slot keeps a visible active state**, and on close the focus and scroll return to it. No silent state changes.

### 5.2 Save model

- **Autosave**, with one persistent status near the chart title: `जतन होत आहे…` → `जतन झाले` → `जतन झाले नाही — पुन्हा प्रयत्न`.
- A toast may confirm a change, but a **failed save must never be a toast alone** (it can lose a whole chart) — it stays on screen with a retry.
- Navigation guard only while a mutation is pending or failed. Do **not** re-ask about work that is already saved.
- `Undo` for ordinary reversible edits (assign, clear, chip, close). Bigger mistakes are covered by versions/amendments, not by a confirm dialog on every action.
- Confirmation dialogs only for irreversible consequences; routine undoable edits get an undo, not an alert.

### 5.3 Picker grammar (the search-and-select list)

- A **labelled combobox**, not a 200-row dropdown.
- Match fields, in this priority order: buckle number → exact Marathi name → prefix match → substring → typo-tolerant. Show which field matched.
- **Availability is secondary text**, visually separated from the name: `साप्ताहिक सुट्टी`, `किरकोळ रजा 08 ते 10`, `दिवसपाळी बिमा`. Hints come from data, never inferred from notes.
- Keyboard-first: arrows move, Enter selects, Escape closes; the search field keeps focus throughout; selecting never navigates away or submits anything.
- **Inline create** carries the typed query into the create form. Enter must **never** silently create a person. Warn on likely duplicates (same name+rank).
- No results → offer `+ नवीन कर्मचारी जोडा` with the query pre-filled; creation returns the person **into the originating slot**.

### 5.4 Validation grammar

- **Warn what the clerk may legitimately override; block only what cannot be accepted.** Assigning someone on leave is a warning with a visible reason (`आज साप्ताहिक सुट्टी`) — permitted, flagged.
- Validate on "continue"/commit, not on every keystroke. Preserve everything the clerk typed.
- Inline message at the field + (for multi-field surfaces) a summary that links to it.
- **No silent defaults, ever**: an empty seat renders `रिक्त`, never a guessed person; `chargeTo` has no default; `बिमा` never carries over.
- Destructive actions name what is affected (`हा नेमणूक रिक्त करायचा?`).

### 5.5 Density and legibility contract

| Rule | Value |
|---|---|
| Print sheet | A4 landscape, 1122 × 794 px, `@page margin 0`, 19 px bottom padding → **775 px usable** |
| Minimum print type | 9.5 px today on dense sheets — **below general print guidance**; the measured slack (§3.1) is the budget to raise it |
| Grouping cue | thin rules, banded headers, zebra rows — **not** whitespace |
| Devanagari | `line-height` unitless; never a fixed cell height that can clip a matra; test `क्ष`, `त्र`, `ज्ञ`, रakar conjuncts, `ळ` |
| Contrast | ≥ 4.5:1 for body text (3:1 large); states also carry shape + text, never colour alone |
| Screen rows | 32–36 px, sticky headers inside sheet wrappers, page-level horizontal overflow always 0 |
| Touch (≤768 px) | every control ≥ 36 px; no hover-only affordances |
| Fonts | self-hosted WOFF2 (Hind / Noto Sans Devanagari family in use); **never a font CDN** |

### 5.6 Language contract (EN-first chrome, Marathi sheet)

- **One language at a time** — never both labels side by side.
- Chrome defaults to **English**; `मराठी` is a complete translation, not a fallback. The chart sheet itself is **always Marathi** and is unaffected by the toggle.
- Strings live in **one catalog** (keys, not duplicated spans) so a missing translation is a build error.
- **Never translated/transliterated:** protected tokens (§2.3), rank codes, Marathi data values, place names on the sheet.
- Devanagari digits are a **display transform**, applied to dates/times/numbers on the sheet only.

### 5.7 Accessibility floor

Keyboard reachable everywhere (the picker, chips, close/open, date control); visible `:focus-visible` ring; `aria-expanded` on menus; the selected language and lifecycle announced, not only coloured; `aria-label` on every icon-only control (and icon-only navigation is itself discouraged).

---

## 6. Component inventory (names the AI should use)

```
shell/      AppShell  IdentityBar  NavGroup  DateControl  LanguageToggle  ClerkBadge  ComingSoonPage
chart/      Sheet  SheetHeader  ChartToolbar  LifecycleBadge  SrPiCard  OfficerBlock  OfficerGrid
            ChowkiBlock  ShiftColumn  PersonRow  SeatTag(रिक्त)  BimaChip  ClosedBanner(बंद)  ChargeLine
            RoleGroup  SessionCard  HourlyStrip  CourtCard  LeaveGroup  ManpowerMatrix  ShiftSummary
            NoticeList  OfficerSummaryTable  SuddenChangeLedger  ScanSchedule  SignOff  PrintSheet
edit/       EditOverlay  SlotAffordance  AssignmentEditor  StaffPicker  StaffQuickCreate  StaffSidePanel
            BimaToggle  CloseLocationControl  ContextualAdd  AddBox  DateSwitchFlow  UnsavedChangesDialog
            SaveStateIndicator  UndoBar  NeedsAttentionFlag
master/     MasterTable  MasterTabs  StaffEditorRow  InUseGuard  DeactivateDialog
search/     SearchFilterBar  ResultRow  EmptySearch
lib/        chartDocument.ts (types)  api.ts (typed client)  i18n catalog  digits.ts (display transform)
```

Rules: no component zoo (build one only where repetition, interaction or semantics justify it); every chart component takes a typed `ChartDocument` slice — no `any` payloads; **no React component ever renders the printed sheet for print** (the server renderer stays the print authority).

---

## 7. THE PROMPT PACK

Paste **P0 first in every tool, in every session**, then exactly one numbered prompt. Replace `⟨…⟩` placeholders. Never paste real chart data — §8.

### P0 — master context (always first)

```
You are designing an internal tool for a police station duty-chart clerk (Panchavati
Police Station, Nashik City, India). Marathi is the printing language; the interface
chrome is English-first with a one-at-a-time Marathi toggle.

WHAT IT IS: the daily duty chart, printed on 6 sheets of A4 landscape (~212 personnel
assignments). The clerk is the only decision-maker. The software calculates, flags and
renders — it NEVER chooses or replaces a person.

HARD RULES (violating any of these makes the design unusable):
1. Three distinct states, never conflated: रिक्त = vacant seat, बंद = closed location
   (with a typed "charge transferred to" value), बिमा = per-assignment qualifier chip.
2. Every assignment renders exactly once on the printed sheet. Never drop, merge or
   hide a row to make a layout work.
3. Never auto-assign, never suggest a person that applies itself, never infer a
   qualifier from note text.
4. Never translate or transliterate these tokens: CCTNS, Dial 112 MERS, DB, MERS,
   TOTAL, Office, ME, PI, API, PSI, GPS, ASI, LASI, HC, LHC, PN, LPN, PC, LPC.
   Canonical Marathi spellings: बिमा (never विमा), पोशि (never पोषि).
5. Marathi text wraps; it is never truncated, ellipsized or clipped.

VISUAL LANGUAGE (follow exactly — this is not a marketing site):
- A landscape duty register / government form. Ruled tables, thin 1px rules, banded
  header rows, boxed officer cards, crisp borders, near-white background.
- Palette: deep navy #0b3568 headers, slate greys for structure, white surfaces.
  Functional accents ONLY for states: crimson for बिमा, amber dashed for रिक्त,
  slate hatch for बंद, blue-grey for posting chips.
- Type: self-hosted Devanagari-capable sans (Hind / Noto Sans Devanagari), 11-12px
  body on dense screens, unitless line-height. Devanagari digits are a display
  transform for dates/times on the sheet only.
- Density: 32-36px screen rows, compact padding, sticky section headers, sticky first
  columns where useful. Zero page-level horizontal overflow.

FORBIDDEN: hero sections, KPI tiles, gradient/glassmorphism, drop shadows on cards,
rounded-2xl cards, oversized whitespace, decorative illustrations, icon-only nav,
dark mode, invented features, invented fields, "AI assistant" affordances,
fake data that looks real.

STATE VOCABULARY (fixed, never restyle):
  LIFE CYCLE BADGES: DRAFT amber · VALIDATED blue · FINALIZED green
  SEAT: रिक्त amber dashed tag, still clickable
  QUALIFIER: बिमा crimson chip before the name
  LOCATION: बंद slate 45° hatch + one line "चार्ज → <place>"
  WARNING: NEEDS_ATTENTION small triangle + reason text (never colour alone)

Deliver at 1440x900 desktop first, then state the responsive behaviour at 1120px,
1000px, 768px and 420px. Use only the fields and actions listed in the prompt that
follows; ask before adding anything.
```

### P1 — app shell (use in: v0, Figma Make, Stitch)

```
Using P0, design the app shell only.

Top identity bar: police emblem, "पंचवटी पोलीस ठाणे / Panchavati Police Station",
"Nashik City". Right side: the enabled language toggle (EN | मराठी, one language
visible at a time), clerk identity, sign-out.

Below it, a grouped navigation bar (text labels, no hamburger, no icons-only):
  दैनिक कर्तव्य तक्ते ▾   (Today's chart, Daily charts, Sheet jump list)
  कार्यवाही ▾            (Dashboard [WIP], Duty board [WIP], Bandobast [Coming Soon],
                          Historical search [Coming Soon], Event annex [Coming Soon])
  डेटा ▾                 (Master data, Edit master data [WIP], Document import / OCR
                          [Coming Soon], Reports & PDF [Coming Soon])
  समाकलन ▾               (Send chart on WhatsApp [Coming Soon])
Every non-working item carries an honest badge (WIP / Coming Soon) — no half-usable
controls, and no route that pretends to work.

A chart toolbar sits below the navigation, only when a chart is open: chart title,
date + weekday, lifecycle badge, संपादन (edit), अंतिम करा (finalize), प्रिंट, and a
date control that opens a grouped panel (आज / उद्या / मागील ७ दिवस / जुने तक्ते) with a
pinned search row and one single scroll region.

Do NOT put lifecycle/edit/finalize/print actions in the identity bar.
Deliver: shell at 1440px, the date panel open, one nav group expanded, an English
variant and a Marathi variant of the same shell.
```

### P2 — chart preview (use in: v0, Stitch)

```
Using P0, design the read-only chart screen (default view).
Six sheet containers, each exactly A4 landscape proportions, stacked with a small gap,
each with a sheet label ("पृष्ठ १ — दैनिक कर्तव्य तक्ता"). Inside sheet 1:
- one compact centred identity line: नाशिक शहर पोलीस आयुक्तालय · दैनिक कर्तव्य वाटप · १० सप्टेंबर २०२६, गुरुवार
- senior officer on one line: वपोनि ⟨name⟩ ठाणे प्रमुख, with रायटर / चालक / RTPC slots
- four subordinate officer blocks in two compact rows (name + posting chip first, then
  their रायटर/ऑपरेटर lines) — no "अधिकारी १" heading row
- one paired day/night core table: group labels once, people wrapping inside their
  group; दिवसपाळी ०९:००-२१:०० and रात्रपाळी २१:००-०९:०० shown once, not as a chip per row
Inside sheet 2: six chowki blocks in a 3x2 grid, each with chowki name, प्रभारी, a
दिवसपाळी | रात्रपाळी split, बिमा chips, रिक्त tags, and an optional मार्शल: बंद · चार्ज →
line; below them the source's four session cards (सकाळ / दुपार / रात्र / बिट मार्शल व
ऑफिस स्टाफ) plus the 12-row hourly strip folded into three sub-columns.
Zero editing affordances, zero hover pencils, zero buttons inside the sheets.
Deliver: sheets 1 and 2 at 1440px and the print stylesheet that hides all chrome.
```

### P3 — assignment editor, the CRUD popup (use in: v0, Figma Make)

```
Using P0, design the ASSIGNMENT EDITOR — the surface for changing who occupies one
seat in a dense chart. This is the most-used control in the product; spend the effort.

Trigger: click any person line or empty seat in edit mode. Surface: a popover anchored
to that exact cell (flip above when short of space, clamped to the viewport — never a
full-page modal, never a centred dialog for a routine edit). The originating cell stays
highlighted while the popover is open.

Contents, in this order:
  header   ⟨slot label from the template: रायटर / अंमलदार / चौकी प्रभारी / मार्शल …⟩
           and, when relevant, the chowki name and shift (दिवसपाळी ०९:००-२१:००)
  current  the current person as rank-abbr + buckle + name, with a small posting chip;
           if empty, the amber dashed रिक्त tag instead of a name
  actions  [कर्मचारी माहिती बदला]  (edit masters — disabled with an explanation when empty)
           [दुसरा कर्मचारी निवडा]   (opens the picker, P4)
           [रिक्त करा]              (clear → the seat becomes रिक्त, not deleted)
  qualifiers  [बिमा] toggle — person-level, off by default after a replacement,
           with the note "फक्त या नेमणुकाला" so the scope is unambiguous
  timing   start/end fields for typed split windows (only where the source has one)
  notes    free text, explicitly labelled display-only ("मजकूर फक्त दिसण्यासाठी")

Behaviour contract: Escape / outside click closes and restores focus to the cell;
picking a person fills the cell with an amber flash and a ledger toast; the previous
holder is named in the toast (replacement is a recorded event, never a silent swap);
the save indicator flips जतन होत आहे… → जतन झाले; no confirmation dialog for undoable
edits; a warning (not a block) when the chosen person has an availability conflict that
day, with the reason text from data — never inferred.
Deliver: closed state (anchored to a chowki cell), open state, the replacement toast,
the leave-warning state, and the Marathi and English versions of the same panel.
```

### P4 — staff picker + inline create (use in: v0, Stitch)

```
Using P0, design the staff picker that opens from P3. Popover-sized, anchored under the
cell; it never navigates away and the chart stays visible.

State 1 — list: a labelled search field ("कर्मचारी शोधा — नाव, बक्कल क्रमांक, हुद्दा"),
result rows as rank-abbr + buckle + full Marathi name, with availability shown as
separate secondary text on the right (साप्ताहिक सुट्टी · किरकोळ रजा ०८ ते १० ·
दिवसपाळी बिमा). Keyboard: arrows move, Enter selects, Escape closes. Matching order
buckle → exact name → prefix → substring; show nothing else on the row.
State 2 — empty: "कोणीही सापडले नाही" plus [+ नवीन कर्मचारी जोडा] carrying the typed
query into the form.
State 3 — create (inside the same popover): पद (rank select), पूर्ण नाव (Marathi,
required), नाव (English/roman, optional, offered as a suggested conversion with an
explicit वापरा accept — never written silently), बक्कल क्रमांक (required), मोबाईल
(optional). Inline errors "नाव व बक्कल क्रमांक आवश्यक आहे" — no silent defaults.
Save does two things and says so: creates the person AND places them in the originating
slot ("नवीन कर्मचारी जोडला व जागी बसवला").
Deliver: all three states, plus a duplicate-name warning state.
```

### P5 — close a location (बंद) and transfer charge (use in: v0)

```
Using P0, design the बंद control. Each shift column header carries a discreet
"बंद करा" action in edit mode only.
When closed: the column takes a slate 45° hatch, its staff rows hidden from the
projection (the data stays), and a single banner appears over it:
  बंद — चार्ज → [ type the destination here ]
The destination is always typed by the clerk: no default, no dropdown pre-selection,
no suggestion. Committing with an empty charge value is blocked with an inline reason.
State must be legible without colour: hatch + the word बंद + the charge line.
"पुनः उघडा" restores the column exactly as it was, including every assignment.
A closed MARSHAL post renders as a muted sub-line (मार्शल: बंद · चार्ज → ⟨place⟩) so a
closed marshal post never reads as the chowki being बंद.
Never scatter रिक्त rows when closing, and never merge the two states.
Deliver: open column, closing (charge empty, blocked), closed, reopened, and the
closed-marshal variant inside a chowki block.
```

### P6 — a single sheet layout with real numbers (use in: any, incl. Stitch)

```
Using P0, design ONE sheet: the chowki + patrol + scanning sheet, at true A4 landscape
(1122 x 794 px, 19 px bottom padding → 775 px usable height). It currently renders at
496 px of 775 (64% full) — that slack must be spent on legibility, NOT on whitespace.

Contents, in this order: (1) six chowki blocks in a 3x2 grid, each with chowki name,
प्रभारी line, दिवसपाळी | रात्रपाळी sub-columns, बिमा chips before names, रिक्त tags,
optional मार्शल line; (2) the four source session cards — सकाळ ०९:००-१५:००,
दुपार १५:००-२१:००, रात्र २१:००-०९:०० (six rows each: अ.नं | चौकी हद्द | मोबाईल | मार्शल),
and बिट मार्शल व ऑफिस स्टाफ ०९:००-२१:०० (12 hourly rows folded into three sub-columns
वेळ | चौकी हद्द | अंमलदार, four rows per sub-column).
Constraints: every row present (no dropping, no merging names into cells that hide
individuals), no decorative pills, no colour chips for timing, body type no smaller
than 10 px, and a target fill of 80-95% of the 775 px with the extra height going to
type size and row rhythm.
Deliver: the sheet at 100% scale, plus a one-line statement of the measured height you
expect each block to occupy.
```

### P7 — master data (use in: v0, Bolt/Lovable sandbox)

```
Using P0, design the master-data screen: deliberately plain, one table, no cards.
Tabs: कर्मचारी | पदे | कर्तव्ये | ठिकाणे (चौक्या) | युनिट | टेम्पलेट.
The कर्मचारी tab is the important one: search box, [+ कर्मचारी] action, and a table with
columns नाव (Marathi) | नाव (English) | पद | बक्कल क्रमांक | मोबाईल | युनिट | स्थिती |
कृती [संपादा] [निष्क्रिय करा]. Show one row in the निष्क्रिय (inactive, greyed) state
with [पुन्हा सक्रिय करा]. Deactivating a person who is referenced by a chart must show
an in-use guard naming the affected charts, and deactivation never deletes history.
Editing happens in a side panel, not a modal; the table keeps its scroll and sort.
Two states in one delivery: 40 rows (dense, sticky header), and the row being edited
in the side panel. No stats, no charts, no dashboard framing.
```

### P8 — historical search (use in: Stitch/Stitch-like exploration only)

```
Using P0, design a quiet one-form search page (not a dashboard):
filters कर्मचारी | कर्तव्य / ठिकाण | दिनांक from-to | [शोधा]; results as rows of
"⟨date⟩ — ⟨rank buckle name⟩ · ⟨location⟩ · ⟨shift⟩" that open the chart at the match.
Include an empty state and a "too many results — narrow the range" state.
NOTE: this screen is explicitly reference-first — an existing implementation must be
studied before any design is finalised; mark your output as a proposal, not a spec.
```

### P9 — print view (use in: any; acceptance is a command, not a rendering)

```
Using P0, specify the print output: A4 landscape, zero page margin, each sheet a fixed
1122 x 794 px container with 19 px bottom padding, all navigation/toolbars/popovers/
badges hidden, sheet labels visible, no browser-added headers or footers, page count
exactly 6 for this data, and every table row present.
Also specify what the clerk sees before printing: a short notice about the browser
print dialog (paper A4, landscape, background graphics ON, headers/footers OFF) and a
"print preview" framing that shows the same six containers.
Acceptance in our repo is `npm run print:audit` (each sheet ≤775 px) plus
`npm run render:chart` (212/212 rows) — a screen rendering is never proof.
```

---

## 8. The safe fixture — what may leave the machine

**Hard rule (AGENTS.md):** no police operational data leaves the machine. Every hosted tool (v0, Bolt, Lovable, Figma/Figma Make/MCP, Stitch, Uizard) receives prompts and content, so anything pasted must be **sanitized first**.

| May be pasted | Must be replaced |
|---|---|
| Structure: field names, sheet composition, row counts, column geometry | Personnel names, buckle numbers, phone numbers |
| `रिक्त` / `बंद` / `बिमा` semantics and the state vocabulary | Real duty/leave reasons, notice text, investigation details |
| Public place names (chowkis, court names) — *the user's call, T26* | Any screenshot of a real printed sheet |
| Invented staff shaped like the real ones | Any database connection or export |

**The fixture to build once** (a single file under `docs/`, reused by every tool): six chowkis in fixed order, ~24 **invented** staff rows with realistic Devanagari shapes (e.g. `पोहवा १०२ देशपांडे`, `मपोशि ३१४ जोशी`, `पोशि २०९ कुलकर्णी`), a senior officer line, 6 assignments per chowki across two shifts, 2 `रिक्त` seats, 1 closed chowki with a charge line, 3 `बिमा` chips, 4 leave rows, 2 notices, and a 12-row manpower matrix with `..` and `12<br>04`-shaped cells.

Note the trap: `docs/STITCH_BRIEF.md`'s sample block has exactly this *shape*, and it is **not safe to paste** — several of its names are real personnel from the source chart. Reuse its geometry, never its values.

---

## 9. Which prompt goes to which tool

| Prompt | Tool | Why |
|---|---|---|
| P0 | all, always | context + hard rules |
| P1 shell, P3 editor, P4 picker, P5 बंद, P7 master table | **v0 free tier** (7 messages/day — one component per message) | generates real React/TS that can come into the repo; can read the repo |
| P1/P2/P6 exploration, P8 search | **Stitch** (free), or **Penpot** locally | exploration only; Penpot if the work must stay on the machine |
| P2/P6 alternatives, P3 in Figma terms | **Figma Make** (500 Starter credits) | only when a canvas review is wanted |
| **the CRUD sandbox experiment** | **Bolt free tier** (1M tokens/month, includes a database) or Lovable (5 credits/day, no repo import) | proves a clean schema + real CRUD with synthetic data, inside no real system |
| anything with real chart data | **nothing** — use a local model with Aider/Cline, or don't | §8 |

**The Bolt/Lovable sandbox experiment** (the user's "recreate a clean DB and test actual CRUD" idea, worth doing once): mirror the normalized B-layer tables — `charts`, `assignments`, `locations`, `staff_members`, `location_states`, `availability`, `notices`, `manpower_cells` — seed the §8 fixture, then build: assign/replace, clear to `रिक्त`, toggle `बिमा`, close with a required charge value, inline staff create, table structure editing (rename/add column), notices, finalize-locks-the-chart. Verify in the sandbox (not by reading the chat): changes survive a refresh, reload of the page shows the persisted state, closing with an empty charge is refused, deactivating an in-use person is guarded, and no silent default ever appears. Then extract only the *interaction learnings*, never the code — the real repo keeps its own schema, and the security footguns reported for generated Supabase apps (missing row-level-security policies) are exactly why nothing here becomes production.

---

## 10. Open decisions (need the user)

1. **T26** — may the sanitized fixture use the real public chowki names, and may it be pasted into a hosted tool? (Recommended: yes to structure + public place names; never personnel.) ans: Use everything real, yeah you can paste, we can use this data and we have permission.
2. **T27** — should the chrome default to English and remember the clerk's choice **per browser** or **per user record**? ans: UI default in english (optional marathi toggle, but if we add, we have to make sure turn every text in every UI, popups, etc to marathi also), chart in marathi.
3. **T28** — confirm the React + Vite migration target for the authoring/chrome surfaces, with the server renderer kept as the print authority. ans: Yeah react + vite sounds good, or whatever is better for such complex dynamic stuff. also dont treat server rendered as print authority, we have to optimize that design also, whetever optimized chart we will build in react, same looking thing should be printed.
4. **T29** — which UI AI gets the first run: v0 free tier against the repo (7 messages/day), or a Bolt sandbox first to shake out the CRUD flow? ans: for now my friend has his custom AI, we gonna use that, dont worry about this.
5. **Layout priority** — the measured slack says sheet 2 → sheet 5 → sheet 1 (§10.4 of the brainstorm). Confirm that order, or name the clerk's own pain first. ans: go from top to bottom, optimize everything by theoritically planning and visualizing the entire chart with 10 sept data, see what needs change, plan them, etc.
6. **Legibility vs sheet count** — is it acceptable for a *non-event* day to print 7 sheets if that buys noticeably larger type for the phone-photo workflow, or is 6 a hard rule? ans: Yes pls, special event should be handled by our tool ,and its ok if the page counts increase, the source 11sept also has 7 pages for that ganapati bandobast.
