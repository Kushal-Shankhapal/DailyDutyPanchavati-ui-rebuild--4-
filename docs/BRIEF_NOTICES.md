# Visual brief — सूचना व निर्देश: where notices belong, and the CRUD audit (options, no implementation)

Status: **brief only** (user request 2026-10-13). Evidence: `reference/SEMANTIC/10.md`,
`server/chart-document.ts` (projection), `db/migrations/0003_chart_core.sql` (`chart_notices`),
`server/render/chart-html.ts` (sheet 5).

## 1. What the source does with notices

There is **no notices page** in the 10 Sept source. Notice text is a *cell next to the row it
concerns* — the source grid's fourth (note) column:

| source row (verbatim) | notice cell |
|---|---|
| `(चेकिंग-1) काटया मारूती पोलीस चौकी …` | `रात्रगस्त सुचना` |
| `… मेरी पोलीस चौकी …` | `रात्रड्युटी सुचना` |
| `पो.स्टे.लाॅकअप गार्ड / होम 23605 भडांगे` | `महत्वाचे सुचना` |
| `Dial 112 MERS set` | (itself a note-shaped value inside the desk cell) |

So the source's rule is: **a notice lives with the duty it modifies.** One line of context, zero
page cost. Our separate "सूचना व अधिकारी सारांश" sheet is the thing that wastes a page.

## 2. What we have today

- `chart_notices` (per chart): `chart_id, group_key, sort_order, text_mr` → projected as
  `doc.notices[{groupKey, sortOrder, textMr}]`.
- `renderChart` → sheet 5: `.sec` heading (rename-only via `n.e("sec.notices")`), then one
  `.blk` per `group_key` with a count chip, each line printed as plain text — **no `data-asn`,
  no click target, no API**. The sheet also carries the officer summary and the sudden-change
  table (`tail.officerSummarySection`).

## 3. Options — where the notices should live

### Option A — pin each notice to its duty block *(source-faithful, recommended)*

`chart_notices.group_key` already names the group. Map it to the block/section it belongs to
(chowki key, desk key, or `general`) and render the notice as the **note line inside that block's
header cell**, exactly like the source's note column. A `general`/unmapped notice stays as one
compact strip at the bottom of sheet 1.

```
┌ काटया मारूती पोलीस चौकी                       [note-column]
│ अधि. मपोशि 2677 सवंद्रे · 21:00 ते 09:00      रात्रगस्त सुचना
```
* Pro: removes an entire sheet from the print run; every notice is read where it applies; the
  no-loss ledger is unchanged (the text still prints once, just not on its own page).
* Con: `group_key` values in the seed are not 1:1 with block keys yet → needs a mapping decision
  (fall back to "general strip" for anything unmapped, so nothing is lost or guessed).
* Effort: medium. Risk: low-medium (mapping, not rendering).

### Option B — keep the notice blocks, migrate them onto a sheet that has room

Sheet 5 currently holds notices **and** the officer summary, and the change table. If the notices
block moves to sheet 1's bottom (or sheet 6's, beside the sign-off), sheet 5 disappears and the
officer summary rides sheet 1 — the packing the compact-v5 renderer already does for other tails.
* Pro: smaller change than A (no per-block mapping); one less `@page` to keep under A4.
* Con: notices still live away from their duties — the user's actual complaint stands, just
  with less paper spent.
* Effort: small. Risk: low.

### Option C — per-sheet notice footer strips

Every sheet gets a 2–3 column `सूचना` strip at its foot holding only the notices whose
`group_key` maps to that sheet (a "this sheet" filter over Option A's mapping).
* Pro: keeps a labelled notice area (familiar, easy to print and read) while never spending a
  whole page; works even for sheets with several unrelated notices.
* Con: duplication risk if a notice applies to two sheets → must be one home (first match wins)
  or it prints twice, which the station rejects.
* Effort: medium. Risk: medium.

**Recommended:** A, with C as the fallback for notices whose block is on another sheet. Under any
option the notice text is printed exactly once — the no-loss and one-row-one-home rules hold.

## 4. Why the notices are not CRUDable today (and what it would take)

Short answer: **not a data limitation — a missing surface.** They are CRUDable in principle:

| layer | today | what it needs |
|---|---|---|
| storage | `chart_notices` per chart (group_key, sort_order, text_mr) — no `notice_id` projected | project `notice_id` into `DocNotice` + render it as `data-notice="<id>"` |
| render | plain text lines, rename-only heading | mark each line as an editable target (same `.slot`-style affordance, edit mode only) |
| API | none | `POST/PATCH/DELETE /api/charts/:date/notices` (whitelist `text_mr`, `group_key`, `sort_order`), FINALIZED → 409 |
| UI | none | reuse the existing assignment flyer: edit text / move group / delete, plus "＋ सूचना जोडा" |

No invariant blocks this: notices are **author-entered text**, not calculated values, so the
"clerk decides everything" rule is satisfied by giving the clerk the pen. Until those four pieces
land, the honest label is "येथे बदल करता येत नाही — अजून तयार नाही" rather than a silent
non-clickable line.

## 5. The full "why is X not CRUDable" audit

Every element on the sheet falls into one of four classes. This is the reason list the user asked
for, and the rule we should print in edit mode (a legend chip: **स्वयं-गणित** vs **बदलता येते**).

1. **Editable today** — value cells with `data-asn` (person/रिक्त seats, chowki seats, SR-PI
   support seats), block headings, section headings, column titles and chips via
   `data-label` (element or everywhere), date-independent text via the label scope radio.
2. **Editable via the same path, not marked yet** — `chart_notices` lines (§4), `manpower_records`
   rows that are NOT `is_derived`, `scan_schedule` rows, `shift_summaries` rows,
   `sudden_changes` rows, `officer_summary` rows (which mirror assignments — edit the assignment,
   not the mirror). All have per-chart tables with an id; each needs (a) an id in the render,
   (b) an endpoint, (c) a flyer. Same recipe, no new architecture.
3. **Derived — must NOT be hand-editable** (this is the "maybe they are autocalculated" case):
   - `weekday` — computed from the date (D-rule); editing it would let the chart lie about time.
   - manpower `TOTAL` / `Office` / `ME` columns and the मंजुर संख्याबळ comparison rows —
     arithmetic over the roster.
   - shift summaries (`दिवसपाळी/रात्रपाळी समरी`) and the पर्यवेक्षक summary — counts of the rows.
   - officer summary rows and `signoff` names — mirrors of assignment rows; the mirror must
     follow the source of truth, never diverge.
   - Officer/station identity (`पंचवटी पोलीस ठाणे`, `नाशिक शहर`) — station identity, not chart data.
   Editing any of these would create a second source of truth, so they stay read-only with the
   **स्वयं-गणित** chip. If the user wants them editable, the correct change is to edit the input
   they are computed from.
4. **Fixed chrome** — print/language/edit/finalize controls, `रिक्त`/`बंद` state words, the
   `×`/`✕` control glyphs: UI, not chart content.

## 6. Suggested sequence

1. Ship §4 (notice CRUD: id in render → endpoint → flyer) — it is the concrete part of "everything
   should be crudable" that is missing today.
2. Then move the notices with Option A/B (a print-layout decision the station should see first).
3. Add the **स्वयं-गणित** legend chip in edit mode so class 3 is self-explaining.

## 7. Guardrails

- `chart_notices` is per chart; a FINALIZED chart keeps its snapshot and answers 409 to edits
  (amendment = new version).
- Notice text is verbatim source/court text: no translation, no transliteration, protected tokens
  intact; Marathi wraps, never truncates.
- No notice is invented, reordered by meaning, or auto-classified — grouping is by stored
  `group_key` only.
