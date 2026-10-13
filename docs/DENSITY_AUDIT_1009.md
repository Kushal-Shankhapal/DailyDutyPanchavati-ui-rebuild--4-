<!--
Purpose: Evidence-first density/layout audit for the real 2026-09-10 chart.
Current role: Planning artifact before the next chart-layout implementation pass.
Last meaningful change: 2026-10-13 — exact DB counts and live DOM geometry captured.
Constraint: No product layout was changed while producing this audit.
-->

# 10/09 Compact-v4 Density Audit

## Scope

This audit uses the current normalized `panchavati3_dev` 10/09 DRAFT fixture and the live `/charts/2026-09-10` DOM. It does not treat the frozen `design/` mock as complete 10/09 data.

Verified fixture facts:

- 212 assignments
- DAY: 125 rows across source columns 1–4
- NIGHT: 77 rows across source columns 1–3
- 10 explicit BIMA assignments
- 2 explicit रिक्त slots
- 7 location-state rows
- 69 availability rows
- 28 notices
- 240 manpower cells
- 15 officer-summary rows
- 12 scan rows

The seed remains a provisional implementation fixture because its mechanical authority is `reference/SEMANTIC/10.md`; originals-first reconciliation is still a separate evidence task.

## Root Cause Found

The live Page 1 lower wrapper is rendered as:

```html
<div class="g-core">
```

The stylesheet defines the two-column grid on `.grid.g-core`, but the wrapper does not carry the `grid` class. Browser measurement at a 1440px viewport:

| Element | Measured height |
|---|---:|
| Page 1 | 1,138.13px |
| Senior officer block | 100px |
| Officer grid | 56.60px |
| Day core block | 417.94px |
| Night core block | 456.91px |
| Current `.g-core` | 874.85px |

Computed style reports `grid-template-columns: 1fr 1fr` but `display: block`; therefore the day and night blocks stack vertically. Adding the existing `grid` layout behavior would make the paired core height approximately `max(417.94, 456.91)`, saving about **417.94px** before any further density work.

This is a concrete bug, not a design guess.

## Other Measured Whitespace

The office/special sheet currently has two `.g-desk` blocks with equal measured heights:

| Block | Actual content is unequal, but measured height |
|---|---:|
| कार्यालयीन शाखा व कारकून | 756.61px |
| कोर्ट, समन्स, वॉरंट व विशेष कक्ष | 756.61px |

The equal height is CSS grid item stretching, not content demand. The office grid should use `align-items: start`; each register then grows only to its own content.

## Exact Assignment Density

### Source columns

| Shift | Column | Rows | Staffed | Vacant |
|---|---:|---:|---:|---:|
| DAY | 1 | 35 | 23 | 12 |
| DAY | 2 | 26 | 19 | 7 |
| DAY | 3 | 36 | 18 | 18 |
| DAY | 4 | 38 | 22 | 16 |
| NIGHT | 1 | 30 | 19 | 11 |
| NIGHT | 2 | 28 | 18 | 10 |
| NIGHT | 3 | 19 | 6 | 13 |

### Logical ownership

| Data family | Source rows | Proposed visual ownership |
|---|---:|---|
| Station/senior/officer core | DAY col 1 + NIGHT col 1 | Sheet 1, paired DAY/NIGHT lanes |
| Six chowkis | DAY col 2 + NIGHT col 2 | Sheet 2, 3×2 chowki matrix, each block DAY/NIGHT side by side |
| Marshal and fixed/special posts | DAY/NIGHT col 3 | Fold marshal state into paired chowki; fixed/special rows on Sheet 3 |
| Office and clerical | DAY col 4 | Sheet 3 office register |
| Court/summons/warrant | DAY col 4 court-coded rows | Sheet 3 court register |
| Availability | 69 rows | Sheet 4 flowing registers |
| Notices | 28 rows | Sheet 5 instruction register |
| Manpower/summaries | 240 cells + shift/ledger | Sheet 6 |
| Officer/scans/sign-off | 15 + 12 rows | Sheet 7 |

## Page 1 Row Plan

This is the row grammar to implement and measure, not a literal final pixel mock:

| Visual row/band | Contents | Density rule |
|---|---|---|
| Identity | `नाशिक शहर पोलीस आयुक्तालय` / `दैनिक कर्तव्य वाटप` / `१० सप्टेंबर २०२६, गुरुवार` | One line; no `दिनांक`, `वार`, dot, em dash or pill |
| Senior command | `वपोनि गजेंद्र पाटील ठाणे प्रमुख` | One horizontal line |
| Senior support | Writer, then source-backed driver/RTPC/operator columns | Dynamic columns; unsupported groups hidden only by explicit presentation override |
| Officer row 1 | Officer boxes 1 and 2 | Name + branch first; compact writer/RTPC/operator lines below |
| Officer row 2 | Officer boxes 3 and 4 | Same geometry; no `अधिकारी १/२` heading row |
| Paired core | DAY and NIGHT column-1 duty groups side by side | Shared group families align vertically where possible; each cell may contain multiple people |

The paired core should not repeat every person as a large card. Its left role column is compact; the value column wraps Marathi names within the group.

### Column-1 group families to align

| Comparable family | DAY data | NIGHT data |
|---|---|---|
| Station amaldar | ठाणे अंमलदार / room watch | ठाणे अंमलदार |
| Attendance | हजरपाळी | हजरपाळी |
| CCTNS | CCTNS | CCTNS |
| Wireless | वायरलेस | वायरलेस |
| Peter mobile | पिटर मोबाईल | पिटर मोबाईल |
| CR mobile | सी.आर. मोबाईल | सी.आर. मोबाईल |
| DB/crime search | गुन्हे शोध पथक/DB | गुन्हे शोध पथक/DB |
| Lockup | पो.स्टे. लॉकअप गार्ड | पो.स्टे. लॉकअप गार्ड |
| Day-only | Delta mobile, station-specific rows |  |
| Night-only |  | checking, night patrol officer |

This alignment uses the actual group families and does not fabricate personnel relationships.

## Sheet 2 Chowki Matrix

Use six blocks in a 3×2 matrix at wide desktop widths, 2×3 at narrower desktop, and retain DAY/NIGHT as internal columns until the mobile projection breakpoint.

Each block:

```text
चौकी नाव
अधि. <प्रभारी>  <plain source-backed time only when present>
दिवसपाळी                         रात्रपाळी
role | staff                     role | staff
BIMA rows inline                 BIMA rows inline
मार्शल: बंद / चार्ज ...          only when explicit
```

Rules:

- No blue timing chip.
- No `·` separator.
- No `वेळ:` label on every chowki.
- No `०९–१४` chip beside every heading.
- If a source-backed in-charge window is shown, use plain text after the person, e.g. `अधि. ... ०९ ते १४`.
- `बंद`, `चार्ज`, `मार्शल` and `बिमा` remain explicit text/state semantics, not color-only signals.
- Marshal rows may fold into the chowki visually, but their separate operational state must remain represented.

## Sheet 3 Office/Special

Two independent flowing registers, aligned to the top:

| Left register | Right register |
|---|---|
| कार्यालयीन शाखा व कारकून | कोर्ट, समन्स, वॉरंट व विशेष कक्ष |
| role once, people below | duty once, people below |
| no equal-height blank fill | no card-per-person treatment |

The measured current equal-height behavior is false whitespace and should be removed with top alignment.

## Timing Rule

The chart should show shift identity once:

```text
दिवसपाळी ०९:०० ते २१:००        रात्रपाळी २१:०० ते ०९:००
```

Do not repeat timing as a colored chip on every chowki. Do not render decorative `·` separators. Typed assignment windows remain available in the editor/detail context and appear in the chart only where source data explicitly supplies a meaningful split window.

## Whitespace Budget

Measured facts support these immediate geometry changes:

1. Fix the missing `grid` class on the Page 1 paired core: estimated screen saving ≈ 418px at the measured 1440px viewport.
2. Set `.g-desk` to `align-items: start`: removes artificial equal-height office/court blank space.
3. Keep the four officer blocks exempt from aggressive collapse because their horizontal presence is SPI-approved.
4. Keep the chowki matrix dense and side-by-side; do not make DAY and NIGHT sequential inside each block.
5. Hide repeated screen page headers after the first page while retaining repeated headers for print, if screen inspection confirms the repeated identity is distracting.
6. Measure again at desktop widths 1440, 1200, 1024 and 768 before changing typography.

## Acceptance Checks Before Implementation

- DOM computed style confirms Page 1 core is `display:grid` with two columns.
- Day and night core blocks share one vertical band on desktop.
- Page 1 height is reduced by the measured stacking amount without row loss.
- Six chowki blocks remain present and each retains DAY/NIGHT internal structure.
- `बिमा`, `बंद`, marshal and charge lines remain explicit.
- No `·` timing separators or colored per-chowki timing chips remain.
- Office/court registers top-align and do not stretch to the same height.
- Full no-loss count remains 212/212.
- `npm run check` and `npm run print:audit` pass after implementation.
