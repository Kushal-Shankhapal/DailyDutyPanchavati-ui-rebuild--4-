# Visual brief — dense tables: स्कॅनिंग वेळापत्रक + कोर्ट/समन्स/वॉरंट (options, no implementation)

Status: **brief only** (user request 2026-10-13: brainstorm first, implement after a decision).
Author: agent session 2026-10-13. Evidence: `reference/SEMANTIC/10.md` (source cell authority),
`reference/ORIGINAL_VISUAL/10.pdf` (visual authority), `npm run print:audit` sheet heights.

## 1. What the source actually does (the efficiency the user is asking for)

The 10 Sept source **never** prints one row of the whole page per person, and never leaves a
half-empty page. Two mechanisms do the work:

1. **Grouped-by-duty lines, not per-person registers.** Court work appears inside the
   leave/other-duties block as a *heading line + names stacked under it* (source cells):

   | source heading (verbatim) | names under it |
   |---|---|
   | `मा.सेशन कोर्ट पैरवी` | पोहवा 500 गावित |
   | `मा.JMFC कोर्ट पैरवी` | पोशि 1996 पालवी, मपोशि 1014 गोसावी |
   | `जिल्हा व सत्र कोर्ट॰नाशिक` / `येथे सुरक्षा बंदोबस्तकामी` | `-` |
   | `वाघ जाप्ता` | पोशि 2149 खैरनार |
   | `मा. हायकोर्ट॰मुंबई` | (empty that day) |

   Four narrow columns × ~27 short rows hold this entire register — including leave, training,
   court, जप्ता, पथक — in **one sheet**, because each row is 1 line tall and only ~1/4 page wide.

2. **Equal-size session cards instead of one long table.** The scan/patrol schedule is the
   source's own four sessions (Tables 10–13), each a 6-row × 3–4 column mini-table:

   ```
   01) सकाळ सत्र 09:00 ते 15:00        02) दुपार सत्र 15:00 ते 21:00
   अ.नं | चौकी हद्द | मोबाईल | मार्शल     अ.नं | चौकी हद्द | मोबाईल | मार्शल
   01..06 × 6 rows                        01..06 × 6 rows
   03) बिट मार्शल + ऑफिस स्टाफ 09:00–21:00   04) रात्र सत्र 21:00 ते सकाळी 09:00
   12 hourly rows (अ.नं | चौकी | अंमलदार | वेळ)   6 rows (अ.नं | चौकी | मोबाईल)
   ```

   The long table only exists because our renderer flattens **all** scan rows into one body with
   a `वेळ` column — the source's own grouping (`सत्र`) is what keeps it short.

## 2. What is wrong today (measured)

| sheet | what renders | problem (measured live 2026-10-13, 1440px screen) |
|---|---|---|
| Sheet 2 — चौकी | 6 chowki blocks 3×2 (`grid-template-rows: 1fr 1fr`, all six measured **236px** — the equal-cell fix) **then** `.two` (session table ‖ scan table) | **both tables render 281px tall, but the session table holds only 3 rows** and the scan table 12: the short table is stretched to three times its natural height, so the white space sits *inside* it, right under the user's "first table" (print extent 733/775px — the sheet has only 42px slack, so the waste is internal, not at the sheet's foot) |
| Sheet 3 — कोर्ट | `.grid.g-desk.alone` → one full-width register, **one `<tr>` per staff** | measured **36 rows / 707px** on a sheet 840px tall (screen): each page-wide row carries one name and ~90% empty width, so the register is both tall and hard to scan — "left alone on this page" |

Nothing is missing data-wise — this is **presentation only**. No row may be dropped
(no-loss rule), so every option below rearranges, never filters.

## 3. Options — scan / patrol schedule (sheet 2)

### Option A — restore the source's four session cards *(recommended)*

```
┌ सुरक्षित नाशिक: गस्त व स्कॅनिंग वेळापत्रक ──────────────────────────────┐
│ ┌ १ सकाळ 09:00–15:00 ─┐ ┌ २ दुपार 15:00–21:00 ─┐ ┌ ३ रात्र 21:00–09:00 ┐ │
│ │ 6 rows × 3 cols     │ │ 6 rows × 3 cols     │ │ 6 rows × 3 cols     │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ │
│ ┌ ४ बिट मार्शल व ऑफिस स्टाफ 09:00–21:00 ───────────────────────────┐    │
│ │ 12 rows in 3 sub-columns (वेळ | चौकी हद्द | अंमलदार), 4 rows each │    │
│ └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```
* Pro: visually the source, equal-height cells, no dead space (the 3-column session row + one
  hour-column strip is a tight rectangle), prints 1:1 with the `स्कॅन` semantics intact.
* Con: needs the renderer to group by `session` (data already carries it: `scanSessions` +
  per-row session label), and the hourly table needs a 3×4 fold (repeat the header every 4 rows).
* Effort: medium (renderer + CSS only). Risk: low.

### Option B — one table, session as a spanning band

Keep the current single table but replace the `वेळ` column with **session band rows**
(`<tr class="band"><th colspan=3>सकाळ सत्र 09:00 ते 15:00</th></tr>`), exactly as the source
prints "01) सकाळ सत्र …" above its table. The second (session) table disappears entirely.
* Pro: smallest change; removes the short-vs-long table mismatch at the root.
* Con: less compact than A (one column of chowki names repeats), still a tall single table.
* Effort: small. Risk: low.

### Option C — side-by-side pairing by session

Two columns: left = चौकी पेट्रोलिंग (4 sessions stacked, 6 rows each), right = बीट मार्शल
hourly (12 rows). Each column is ~equal height because the two halves are the same six chowkis.
* Pro: fills the width, no repeating headings; mirrors "who scans for whom".
* Con: horizontal pairing is a *new* reading order the source does not have — the clerk may
  mis-read which chowki a marshal belongs to unless the rows are aligned (they are, 1:1).
* Effort: medium. Risk: medium (reading-order change → needs a station opinion).

## 4. Options — court / summons / warrant (sheet 3)

### Option A — grouped court cards, two columns *(recommended)*

```
┌ कोर्ट, समन्स, वॉरंट व विशेष कक्ष ──────────────────────────────────────┐
│ ┌ मा.सेशन कोर्ट पैरवी ─┐ ┌ मा.JMFC कोर्ट पैरवी ─┐ ┌ विशेष कक्ष ──────┐ │
│ │ पोहवा 500 गावित      │ │ पोशि 1996 पालवी     │ │ होम 23685 शिंदे  │ │
│ │ …हजर राहिल्यास +2    │ │ मपोशि 1014 गोसावी   │ │ …                │ │
│ └──────────────────────┘ └─────────────────────┘ └──────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```
One small card per court/desk (the source's own headings), each card a 1-column name list in a
3-column grid. A 30-name register becomes ~6–8 short cards side by side → roughly ¼ the height,
zero wasted width, and the source's vocabulary ("मा.सेशन कोर्ट पैरवी") is preserved verbatim.
* Pro: matches the source's grouped-line idea while keeping today's data model (one row per
  person stays a row — only its *container* changes).
* Con: cards of different heights unless the CSS grid equalises rows (`grid-auto-rows: 1fr`);
  long courts (सेशन with 5+) will dominate.
* Effort: medium. Risk: low.

### Option B — grouped list inside the existing desk table (no cards)

Keep the single register but render a **sub-heading row** (`<tr class="grp"><th colspan=6>`) when
the duty/court changes, and put 2–3 names per cell instead of one.
* Pro: minimal renderer change, prints like a register (familiar to the station).
* Con: still one wide table; row heights vary; less dramatic a win than A.
* Effort: small. Risk: low.

### Option C — add the source's duty × rank matrix under the register

The source also prints a manpower matrix (`Table 4`) whose rows include `मा. कोर्ट /पैरवी … 03`,
`मा. हायकोर्ट॰मुंबई`, `अंगरक्षक/जाप्ता` with counts per rank column. The names could live in
Option A cards while the *counts* stay in that matrix — the row of numbers is what an officer
reads first.
* Pro: adds real command value; already have `manpower_records` with `is_derived` cells.
* Con: a second representation of the same people → must be labelled derived, never editable.
* Effort: medium–large. Risk: medium (needs a decision that the matrix is derived, D-rule).

## 5. Suggested sequence (if the user approves)

1. Sheet 2 → Option A (source-faithful, biggest visual win, the whitespace the user pointed at).
2. Sheet 3 → Option A; if the clerk prefers a register, fall back to B.
3. Re-run `npm run print:audit` after each step; the target is every sheet ≤ A4 with **no gap
   taller than ~80px inside a sheet** and no sheet below ~55% fill.
4. Option C (court matrix) is a separate work unit — it introduces derived cells.

## 6. Guardrails these options must respect

- No row is dropped or merged away: `rowsRendered === rowsTotal` stays 212/212.
- `रिक्त` ≠ `बंद` ≠ `बिमा`; a grouping row is a heading, never a seat (no clickable slot).
- Protected tokens (CCTNS, Dial 112 MERS, TOTAL, Office, ME, rank codes) stay verbatim.
- Every name cell keeps its `data-asn` slot so the clerk can still click and assign.
- Marathi wraps; nothing truncates — cards grow, they never clip.
