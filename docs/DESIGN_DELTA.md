<!--
Purpose: Deliverable F of DESIGN_REFINEMENT_BRIEF.md §18 — explicit design delta:
retained from HTML mockup / retained from React / changed / why / implement list.
Current role: Decision record connecting compact-v2 → compact-v3 → final React build.
Last meaningful change: 2026-10-07 — written after browser verification of both prototypes.
Constraint/dependency: Reads against design/compv3.* files; UI_SPEC.md stays the element authority.
-->

# DESIGN_DELTA — deliverable F

Prototypes: [design/panchavati-compv3.html](../design/panchavati-compv3.html) (realistic, 10/09 source data),
[design/panchavati-compv3-stress.html](../design/panchavati-compv3-stress.html) (stress),
[design/compv3.css](../design/compv3.css), [design/compv3-edit.js](../design/compv3-edit.js).
Baseline: `design/_refs/compact-v2-mockup.html` (copied from the approved mockup; `reference/` untouched).

## 1. Retained from the existing HTML mockup (compact-v2)

Everything that already worked — this was refinement, not reinvention:

| Retained | Where it lives now |
|---|---|
| Navy `#0b3568` / slate / white palette + chip color language (c-sr, c-off, c-vac, c-stop, c-ok, c-bima) | `compv3.css` `:root` — unchanged values |
| Noto Sans Devanagari typography, 12px base, wrap-not-truncate | `compv3.css` body + `.dt td{overflow-wrap:break-word}` |
| 5-page A4-landscape document structure (command+officers+core / chowki matrix / leave+court / manpower+summary+ledger / officer summary+scan+signoff) | same page order in both prototypes |
| `.blk` block cards, `.dt` label/value tables, `.chip` state pills, sub-shift DAY\|NIGHT columns, toolbar with संपादन/print | same class names → critique fixes applied in place |
| Grayscale-safe text+shape redundancy, print-color-adjust:exact | `compv3.css` |
| Protected-token handling (CCTNS, Dial 112 MERS, DB, MERS, rank codes) as literal text | both HTML files |

## 2. Retained from the existing React implementation

The old repo's `standardized_compact_v2` print profile proved the grammar can be produced from a DB:

- **Server-rendered chart → print pipeline** (ChartDocument → HTML → PDF) — kept as the target
  architecture; UI_SPEC §19 unchanged.
- **Component vocabulary** already validated in UI_SPEC §20 (ChartBoard, OfficerBlock, SrPIBox,
  ChowkiBlock, StaffPicker+MiniStaffCreate, StateChip, LifecycleBadge…) — the prototypes map 1:1 to
  these names.
- **Nav inventory + document-style editor with contextual `+`** from the old StandardizedView flow.
- **NOT retained:** the `/duty-board` generic dashboard (KPI cards, filters) — the verified
  anti-pattern; Latin digits in headers (fixed → Devanagari display transform); all-रिक्त fixture
  presentation (prototypes ship real 10/09 data).

## 3. What changed (and why each change is better)

### Critique-driven (all 8 items from `design/_refs/Kushal_compact_chart_critique.md`)

| # | Change | Why better |
|---|---|---|
| 1 | Sr-PI box: colon form `वरिष्ठ पोलीस निरीक्षक: गजेंद्र पाटील`, **centered** header + `ठाणे प्रमुख` chip, evenly spaced symmetric body groups | Reads as a title, not prose; the station commander's eye lands there first (user-confirmed in preview) |
| 2 | Full `रायटर` (never `राय.`), full staff names with buckle + full name | No abbreviation ambiguity; matches source authority |
| 3 | Role labels one consistent color everywhere (`th.role` navy-2, `th.bima-lb` crimson) | Scannable columns; color = role semantics only |
| 4 | Day/night core LEFT + office/court desks RIGHT in the page-1 lower band | Page 1 uses its free space; desks no longer stranded on page 2 |
| 5 | Chowki heading order: name → `अधि. <name>` → timing, centered and symmetric across all six blocks | Uniform rhythm; in-charge visible without reading the body |
| 6 | `.g4`/leave+court side-by-side 4-column grids (was accidentally vertical) | Leave scan takes one glance instead of scrolling |
| 7 | **Zero explanatory footers** — no टीप, no रँकनिहाय lines, no per-block totals prose; totals live as chips beside headers | Removes duplicated/derived text that can drift from data (no information loss: totals still present) |
| 8 | Officer boxes kept with role-label colors (not flattened) | Preserves officer→writer→RTPC visual grouping (SME N3) |

### Source-verification-driven (user's corrections on real 10/09 data)

| Change | Why better |
|---|---|
| काटया मारूती renders **no** बिमा rows, is **not** बंद day or night, and has **no** charge line in front of it | Chart matches source truth; `रिक्त/बंद/बिमा` stay independent explicit states |
| Charge lines (`चौकी चा चार्ज → …`, `मार्शल चा चार्ज …`) render **once per shift**, never inside a बिमा row | Prevents the v2 bug of `बिमा: चार्ज मालेगाव कडे` rows implying a beat that does not exist |
| Marshal lines restyled slate+subordinate (`.fx.mrsh`: `मार्शल: बंद · चार्ज → …`) | A closed **marshal post** can never be misread as the **chowki** being बंद |
| Stress prototype also carries zero काटया बिमा rows (fixed during audit) | Domain rules hold even in synthetic data |

### Print & responsive engineering (found by measurement)

| Change | Why better |
|---|---|
| Print density block (body 11px, tighter paddings; dead `zoom:0.9` rule removed after measurement) | Page 1 content extent measured **769px ≤ 794px** A4-landscape height — fits one sheet with margin; all 5 pages exactly 794px, zero overflow |
| `.page` width `100vw → 100%` (also ≤1120 rule), toast `left/right` anchoring | `100vw` includes the scrollbar → 2–3px horizontal overflow at ~1025px; now `overflowX: 0` at every breakpoint |
| Breakpoints: ≥1121 desktop sheets → ≤1120 chowkis 3→2 → ≤1000 stack + officers 4→2 → ≤768 mobile projection → ≤420 single-column shifts | One grammar, five projections; DAY\|NIGHT sub-columns retained on mobile (identity of the chart) |
| Sticky stacked header on mobile (top:52px), tables scroll inside `.tbl-wrap` only | No page-level horizontal scroll ever; wide tables stay readable (verified 390px: overflowX 0, 1 in-wrapper scroll) |

### Edit-mode layer (new — deliverable E detail in DESIGN_INTERACTION_NOTES)

| Change | Why better |
|---|---|
| Toolbar `संपादन` toggle; affordances exist only in edit mode and never print | Read-only default protects the finalized-chart feel |
| Slot → picker → staff list / mini-create → return-to-slot; clear→`रिक्त`; replace→flash+ledger toast; person-level बिमा; per-shift बंद+charge input; rowspan-aware contextual `+` | Every mutation is explicit, human-driven, visible — no auto-scheduling, no BIMA inference |
| Autosave indicator (`जतन होत आहे…` → `जतन झाले`), change-flash animation | Clerk always knows the chart saved |

### Round 3 (2026-10-07 — six chart fixes + source-fidelity completeness)

User asked (with screenshot): remove corner station block, consistent type scale, Excel-shrink page-1 tables, drop  numbered badges, explain marshal-vs-bima, centre sign-off. Applied + verified:

| # | Change | Why better |
|---|---|---|
| ① | Corner station block removed from every page `.head` (identity lives in the centred title); dead `.head .hl` CSS deleted | Cleaner header; DRAFT badge stays top-right (user loves it) |
| ② | Declared type scale (`.sec h2` 13/800 → block 12.5 → titles 10.5/700 → `th` 10.5/700 → `td` 11.5/600); values never bold — writer line re-styled, `sr-pi` values match duty values exactly | One rule everywhere; mixed weights were inconsistent |
| ③ | Page-1 lower band now `repeat(4,1fr)` — day/night/office/court side by side; `th{white-space:normal}` lets long labels wrap inside their column; mobile falls 2-col then 1-col | Excel-shrink: all four tables in one row committed to equal columns; no reflow gaps |
| ④ | `.sec .no` badge markup + CSS removed from all 6 headings (both files) | Numbered chips (=hits) are DesignerNow noise, not chart semantics |
| ⑤ | Marshal rows EXPLAINED (user asked "why marshal when chowki band? / we have bima, why marshal?") | Marshal = separate duty POST in the original chart's third column (काटया मारूती मार्शल, पंचवटी कारंजा मार्शल…), a different post from बिमा (per-person beat qualifier) and from chowki charge; the source itself lists कारंजा chowki charge → काटया AND कारंजा मार्शल बंद → मालेगाव for the same shift — both genuinely exist; REMOVED nothing (AGENTS no-loss rule) |
| ⑥ | `.signoff{ text-align:center }` — all three signature blocks centred | User request |
| + | **Source-fidelity completeness add (10/09 data):** डेल्टा/पिटर split → पिटर मोबा. rows restored (source १२४३ महाले + २३५१ निमजे); ठाणे अंमलदार कक्ष देखरेख row restored (पोनि सुनिल पवार तपास); scan table 12 rows (both day cycles per source tables 12[09–15] + [15–21] rows) | No information loss from the authoritative source chart |

### Round 2 (user preview feedback, 2026-10-07)

| Change | Why better |
|---|---|
| Dashed **`+ अधिकारी बॉक्स जोडा` / `+ चौकी जोडा`** add-boxes in the two grids (edit-mode only, no-print) | Extra officers/chowkis are the clerk's explicit choice; new blocks are fully editable (picker, contextual `+`, per-shift बंद) and nothing is invented — they start with `रिक्त` lines |
| `वेळ: ०९:०० ते २१:००` (dropped `वाजेपावेतो`), `.bh .win` 10px→11px + ink-faint→ink-soft | Shorter header line, readable contrast |
| Chowki `दिवसपाळी`/`रात्रपाळी` sub-titles centered, redundant `०९–२१`/`२१–०९` removed (the block already states timing) | Removes redundant info; symmetric titles (source authority: times live in the chowki heading) |
| Leave/court count chips neutralized (`.chip.num` — no c-vac/c-off/c-stop coloring) | Counts are counts, not statuses — color was distracting and implied semantics that do not exist |
| **Edit-mode crash fixes:** `[data-grp-last]` cleanup no longer deletes TDs (was leaving empty `<tr>` that crashed the next toggle); `groupRows` walks back to the group's TH row (multi-row rowspan growth never worked); `addToGroup` opens the picker *before* registering the pending row (closePicker was destroying the just-added row — the `+` flow had never actually kept a row); pick/create now keep the pending row, cancel reverts rowspan; cell-less-row guards | The editor's core flows now survive ON→OFF→ON cycles, pick, cancel and create-in-context with zero console errors |

## 4. What to implement in the final React application

**Build as-is from the prototypes:**

1. `compv3.css` tokens + component classes as the style basis (`:root` palette, `.blk`, `.dt`,
   `.chip`, `.ch-head`, `.fx/.fx.mrsh`, `.sub-shift-wrap`, `.g-*` grids, `.vac-line`, `.picker`,
   `.toast`, print block) — port into the React stylesheet almost verbatim.
2. Five-page document layout with the exact page order and the page-1 lower band (core left,
   desks right).
3. Responsive rules at the same breakpoints — especially ≤768 stacked projection with retained
   DAY|NIGHT and ≥36px touch targets.
4. Print CSS: A4 landscape, `@page` margin 0, density block; verification = print preview per page
   (print-check skill) + the 769/794 fit expectation for a page-1-density chart.
5. Editor interaction grammar exactly as documented in DESIGN_INTERACTION_NOTES §1–7
   (picker/mini-create/replace/clear/बिमा/बंद/contextual `+`), wired to real domain mutations.
6. Lifecycle badge (DRAFT/VALIDATED/FINALIZED) in the header third; DRAFT shown in prototypes.
7. UI_SPEC §20 component list — the prototypes are the visual contract for components 1–7.

**Deliberately NOT implemented (unchanged from UI_SPEC §21):** KPI/dashboard cards, BIMA
auto-derivation, auto-scheduling, mobile editing (Coming Soon), OCR, new screens.

**Open spec decision to record before P0:** UI_SPEC §18 must adopt the measured breakpoint
contract above (see its updated text) — the old "3→2→1 chowki" sentence was the only spec line the
prototypes refined.

## 5. Verification evidence (this pass)

| Check | Result |
|---|---|
| Desktop 1440px — realistic | g-off 4col, p1-lower 2col, g-chowki 3col, g4 4col, two 2col, pageW 1123, Sr-PI centered, colon yes / dash-in-title no, `राय.` 0, footers 0, काटया बिमा 0 / बंद 0, truncations 0, overflowX 0, console clean |
| Print fit (simulated print media) | all 5 pages 794px, page-1 content extent 769px, overflow none |
| 1025px — stress | chowkis 2col, overflowX 0 (after `100vw→%` fix), truncations 0 |
| 768px — stress | all matrices 1col, DAY\|NIGHT 2col retained, sticky head, overflowX 0 |
| 390px — stress + realistic | all 1col (shift cols stack at ≤420), overflowX 0, 1 in-wrapper table scroll (designed), truncations 0 |
| Stress semantics | vacLines 5, बंद cells 10 (काटया 0), bima rows 5 (काटया 0), charge lines 4, footers 0 |
| Console | zero errors/warnings on both files at all tested widths |
| Round 2 re-audit (2026-10-07): realistic + stress @1440 | grids intact, `sub-col-title .tm` 0, `.bh .win` shortened/11px/ink-soft, 8 neutral count chips (0 colored), 2 add-boxes (hidden in read mode), काटया बिमा 0 / बंद 0, truncations 0, overflowX 0 |
| Round 3 re-audit (2026-10-07): realistic @1300 + stress | ① `.hl` 0 both files; ② writer value fw 600, `hasB false`; ③ band 4 cols × 258px one row; ④ `.no` 0 both files; ⑥ signoff center ✓ | 
| Print fit after Round 3 | realistic page-1 extent 657 ≤ 794; stress 725 ≤ 794 (long-name stress grew rows, not past the sheet) |
| Breakpoints after Round 3 | 1025: band 4-col, overflowX 0, trunc 0 · 768: 1-col + sticky head · 390: stacked, only `.tbl-wrap` scroll (designed) |
| Edit battery after Round 3 | pick keeps row (17→18), Escape reverts (19→18), 0 empty rows, OFF→ON rebuild rows 61→61, console clean on both files |
| Source-fidelity (round 3 adds) | पिटर मोबा. rows + कक्ष देखरेख row present; hourly scan table 12 rows (source no-loss) |
