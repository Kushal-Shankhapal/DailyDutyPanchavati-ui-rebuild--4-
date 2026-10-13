<!--
Purpose: Plan-of-attack for the next chart layout/density pass — evidence first, no code yet.
Current role: Awaiting user decision; the ONLY new artifact of this session.
Last meaningful change: 2026-10-13 — written from live DOM measurements, DB queries, print audit, and the user's own prompts.
Constraint: Plan only. No code, schema, migration, reference file or mock was changed while producing this.
-->

# 1012 — Compact density / layout pass (PLAN ONLY — nothing implemented yet)

**Status:** awaiting your decision. Nothing below has been executed.

---

## 0. Continuity — where the last three AIs stopped

| Commit | Who | What landed |
|---|---|---|
| `a249911` | astra | presentation controls (1011): `server/chart-presentation.ts`, `PATCH /api/charts/:date/presentation`, `data-presentation` hooks, `web/chart-presentation.css`, 83 tests |
| `4f1e0c8` | GitHub Copilot | `docs/COMPACT_V4_DECISIONS.md`, `docs/DENSITY_AUDIT_1009.md`, React shell files (`src/app/*`, `app.html`, vite config), `tools/density-audit-1009.mjs`, unreviewed CSS churn in `web/authoring.css` |

**Copilot's final turn changed no layout code at all.** It only *audited* (`changes/…/DENSITY_AUDIT_1009.md: "No chart layout code was changed during this audit"`). Verified: `git status` is clean except your screenshot and `chat.json`.

Its last two prompts (chat.json `#8`, `#9`) both **failed** — `400 Tool 'tool_search' is not supported with gpt-5` — so the handoff it promised never got written. What I resumed from instead: `#0`, `#1`, `#7` (your real asks), the tail of `mega.txt`, and the two docs it left.

The state I measured against: dev server on `127.0.0.1:3100` (PID belongs to your terminal), `panchavati3_dev`, one DRAFT chart for 2026-09-10.

---

## 1. Measured reality — screen at 1440×1000 (live DOM, this session)

The A4-landscape box is **1123 × 794px**, so **317px of the viewport sits unused horizontally**.

| # | Print sheet holds | Box height | Content extent | Dead space at bottom | Verdict |
|---:|---|---:|---:|---:|---|
| 1 | identity + Sr-PI + 4 officers + DAY/NIGHT core | 1138 | 1112 | 26 | **overflows the sheet by 344px on screen** |
| 2 | six chowkis (3 × 2 grid) | 794 | 533 | **261** | a third of the sheet empty |
| 3 | office register + court/summons/warrant/special | 854 | 828 | 26 | overflows by 60px |
| 4 | leave/suttī registers + other duties | 1092 | 1065 | 27 | overflows by 298px |
| 5 | notices (12 rows of instructions) | 794 | 534 | **260** | a third empty |
| 6 | manpower matrix + shift summary/ledger | 794 | 582 | **212** | quarter empty |
| 7 | officer summary + scan tables + sign-off | 794 | 676 | 118 | mostly full |

### 1.1 False whitespace — space that exists only because of CSS, not content

| Where | Measured | Cause |
|---|---:|---|
| Sheet 1, DAY/NIGHT core | DAY block 418px **+ NIGHT block 457px stacked = 875px** | wrapper has `grid-template-columns: 1fr 1fr` but computes `display: block` |
| Sheet 3, office register | box stretched to **757px** for **291px** of rows | CSS grid items stretch to equal height with the court register (751px, genuinely full) |
| Sheet 2, chowki blocks | row 1 all 217px, row 2 all 238px, though चारंजा/सरदार have **1 row each** | same equal-height stretching, per grid row |
| **Total false whitespace** | **≈ 1,218px ≈ 1.5 A4 sheets** | |

### 1.2 Print truth (`npm run print:audit`, run just now — exit 0)

```
✓ sheet 1 (dense) 768px   ✓ sheet 2 485px (-290)   ✓ sheet 3 (dense) 580px (-195)
✓ sheet 4 (dense) 663px   ✓ sheet 5 518px (-257)   ✓ sheet 6 575px (-200)
✓ sheet 7 673px (-102)    →  all 7 sheets fit one A4 sheet
```

Content total **4,262px** across 7 boxes; a 7-box capacity is 5,425px → **the chart prints 1,163px of empty paper**, and `docs/CURRENT_STATE.md` (7 sheets) and `changes/1011/proposal.md` ("6/6 sheets") **disagree** — the printer says 7.

### 1.3 Data reality — `panchavati3_dev`, 2026-09-10 (SQL run just now)

| Shift | col 1 | col 2 | col 3 | col 4 | Total rows | Staffed | Groups | Locations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| DAY | 35 | 26 | 36 | 38 | **135** | 82 | 11 | 12 |
| NIGHT | 30 | 28 | 19 | — | **77** | 43 | 5 | 12 |
| **All** | | | | | **212** | **125** | 15 titles | 12 |

Plus: 10 बिमा, **2** explicit `VACANT_RIKT`, 7 location-state rows, 69 availability rows, 28 notices, 240 matrix cells, 15 officer rows, 12 scan rows.

---

## 2. The four defects (each with a one-line surgical fix and measured yield)

| # | Defect | Evidence | Fix | Yield |
|---:|---|---|---|---|
| **D1** | DAY and NIGHT cores stack instead of sitting side by side | `.g-core` computes `display:block` while its own CSS asks for `1fr 1fr`; children `blk core:418` + `blk core:457` | give the wrapper the `.grid` class (or key the CSS off `.g-core`) | **−418px** on sheet 1 |
| **D2** | Office register inflated to the court register's height | office box 757px / content 291px, `align-items: normal` | `align-items: start` on the desk grid | **−465px** of false blank |
| **D3** | Chowki blocks stretched per grid row | 1-row चौकी boxes are 217 / 238px tall | per-block natural height (or a denser `3×2` rewrite) | **−335px** |
| **D4** | Noise you explicitly rejected | 11 × `·` separators, colored per-chowki timing chips (`chip c-vac`/`c-sr`), `वेळ:` repeated per band, double borders around cards | render timing once per shift as plain text; drop `·`; keep `बंद`/`चार्ज`/`मार्शल`/`बिमा` as **text**, never color-only | visual only |

**Verified: D1, D2, D3, D4 are all cosmetic/packaging. None of them drops, truncates or reorders a single source row** — no-loss accounting (renderer `212/212`) is unaffected.

---

## 3. Your stated rules → the kill list I will hold

1. Night must **not** sit below day (that is the whole complaint).
2. No `· ०९–१४` dot separators. No contrasting timing chip on every chowki. `वेळ:` at most once per shift band.
3. No card around every block, no double borders, no decorative pills, no dashboard chrome.
4. No one-large-row-per-person; group role labels, let names wrap inside the group.
5. The 4 officer boxes stay horizontal (SPI-suggested) — do not collapse them.
6. Whitespace is the enemy; but readability and no-loss beat forcing a sheet count.
7. Marathi wraps, never truncates; protected English tokens untouched; `रिक्त` ≠ `बंद` ≠ `बिमा`.
8. Persistent header/nav stays; chart toolbar stays below it. One language at a time. Unfinished = Coming Soon.
9. No guessed data, no invented relationships, no design decisions without measurement.

---

## 4. Options — pick the floor you're comfortable with

### A. Surgical repair *(safest; ~30–45 min)*
Only D1 + D2 + D3 + D4. CSS-first (`web/authoring.css`) plus, at most, one class name in `server/render/chart-html.ts`.
**Expect:** ≈1,218px of false whitespace gone; 7 sheets → **6** in print; sheet 1 stops overflowing on screen.
**Risk:** very low. **Reversible:** yes (one stylesheet). **Confidence:** high on the 1,218px (DOM-measured), medium on exactly 6 sheets.

### B. A + repack *(recommended first real pass; ~2–3 h)*
A, then re-partition sheets so short registers fill the empty column space instead of starting a new sheet. Target layout:

| Print sheet | Content | Est. print extent |
|---|---|---:|
| 1 | identity + Sr-PI + 4 officers + **paired DAY│NIGHT col-1 lanes, families aligned row-by-row** | ~470 |
| 2 | six chowkis 3×2, natural heights, day│night inside each, marshal folded, no chips | ~500 |
| 3 | office register │ court/summons/warrant/special (top-aligned, independent flow) | ~600 |
| 4 | leave/suttī + other duties, densified | ~640 |
| 5 | notices + sign-off strip | ~560 |
| 6 | manpower matrix + summary/ledger + officer summary + scan | ~740 |
| | **total** | **~3,510 vs 4,650 capacity → 6 sheets with margin** |

**Risk:** low–medium (sheet composition changes; print:audit + render-fidelity tests guard it). **Confidence:** high for 6 sheets, low for 5.

### C. B + structural redesign of sheets 1–2 *(real design work; ~half a day)*
Paired lanes with **family alignment** so गुन्हे शोध/DB sits opposite गुन्हे शोध/DB, हजरपाळी opposite हजरपाळी, etc. (the audit's family table). Chowki blocks become a true `3×2` with day│night as internal columns and no per-row stretching. Marshal stays a folded `.fx` line.
**Note:** your original "6 chowki" instinct came from an SPI; this keeps it.
**Risk:** medium (touches `chart-html.ts` structure; every change re-measured). **Confidence:** medium-high.

### D. C + screen/print split *(bold, and probably what you actually want long-term)*
Screen stops pretending to be paper: fluid full-width layout (uses all 1440px, kills the 317px gutter), sticky band headings, no A4 boxes on screen. **Print keeps the A4 sheet boxes untouched** — `print:audit` and the print renderer remain the authority.
**Risk:** medium (must not perturb print). **Confidence:** high that it looks better; must prove print is byte-identical in sheet count.

### E. Boldest — the card-less ledger
Delete per-block card chrome entirely: one continuous ruled table per sheet, groups as row-bands, thin rules only, maximum density (spreadsheet, not UI). Highest density possible, fewest borders — but the furthest from the frozen compact-v3 look you approved.
**Risk:** high (visual baseline change). **Confidence:** high density, uncertain acceptance.

---

## 5. Row / column budget — what actually has to fit (real 10/09 numbers)

### 5.1 Sheet 1 paired core — family alignment proposal

```
दिवस पाळी कर्तव्य                          │ रात्र पाळी कर्तव्य
ठाणे अमलदार कक्ष देखरेख  (पंचवटी पो.स्टे.) │ ठाणे अमलदार
ठाणे अमलदार  पोहवा १४५२ लाडे                │ रात्र गस्त अधिकारी
हजरपाळी  पोशि २५७१ देशमुख                  │ (चेकिंग-१)
CCTNS  मपोहवा २०८१ पवार                    │ रात्र गुन्हे शोध पथक/DB
वायरलेस  मपोशि १४२१ शेळके                  │ पो.स्टे. लॉकअप गार्ड
...
19 group rows                               │ 21 group rows
```
Left column 19 rows × ~21px ≈ 412px; right 21 rows ≈ 451px → **paired band ≈ max ≈ 460px** instead of 875px.
DAY col 1 = 35 source rows / 23 staffed / 2 titles; NIGHT col 1 = 30 rows / 19 staffed / 1 title.

### 5.2 Sheet 2 chowkis (real row counts, measured)

| चौकी | rows | today's box | natural height needed | wasted |
|---|---:|---:|---:|---:|
| काटया मारूती | 4 | 217 | ~110 | 107 |
| पंचवटी कारंजा | 1 | 217 | ~60 | 157 |
| मालेगांव स्टॅंड | 13 | 217 | ~217 | 0 |
| सरदार | 1 | 238 | ~60 | 178 |
| फुलेनगर | 9 | 238 | ~180 | 58 |
| मेरी | 13 | 238 | ~238 | 0 |
| **total** | **41** | **1,344** | **~865** | **~480** |

3 × 2 matrix, day│night inside each block → sheet 2 ≈ 500–560px (currently 533 with 261px wasted at the bottom, plus ~480px wasted internally).

### 5.3 Rest of the chart

| Sheet | Registers | Rows | Notes |
|---|---|---:|---|
| 3 | office (13 rows) │ court/summons/warrant/special (36 rows) | 49 | office side has ~465px of false blank to fill |
| 4 | leave/suttī + other duty registers | 69 availability | currently 1,065px content in a 794 box |
| 5 | notices | 28 | five groups: रात्रगस्त / रात्रड्युटी / महत्वाचे / ग्रीन अॅप / रामकुंड |
| 6 | manpower matrix (240 cells) + shift summary + sudden-change ledger | 240 + 12 | |
| 7 | officer summary (15) + session & scan (12) + sign-off | 27 | |

**Fit math:** print content 4,262px − false whitespace ≈ **3,500px** → 6 × 775px capacity. **6 sheets is reachable; 5 needs option C/E.** *(confidence: high / low)*

---

## 6. Two things I found that are wrong in the docs (not guesses — queried)

1. **`docs/DENSITY_AUDIT_1009.md` says "DAY: 125 rows".** The DB says **DAY = 135** (35+26+36+38, and the audit's own table sums to 135). **125 is the *staffed* count**, not the row count. 135 + 77 = 212 ✓. Minor, but it is the kind of number you said not to guess.
2. **The audit's "vacant" column is not रिक्त.** 85 of 212 rows carry **no person**; only **2** are explicit `VACANT_RIKT`. The other 83 are personless rows with mostly `NULL duty_title`. If those are intentional editable slots, they are correct but they are *not* the same thing as रिक्त, and they should not be counted as source vacancies. If they are seed artifacts, they inflate the fixture. **I need your call before I treat them as "data that must fit".**
3. `CURRENT_STATE.md` says 7 sheets; `changes/1011/proposal.md` says "6/6 sheets". Print audit today: **7**. Documentation drift to fix either way.

---

## 7. Execution order I propose (once you approve an option)

1. Lock a baseline: `npm run check` + `npm run print:audit` + a screen measurement snapshot (so the "after" numbers are comparable).
2. D1 → D2 → D3 (one at a time, re-measuring each): these are the measured wins.
3. D4 noise removal, re-checking `बंद`/`चार्ज`/`मार्शल`/`बिमा` stay explicit text.
4. If option B/C: re-partition sheets; after each move re-run `print:audit` until no sheet exceeds 775px and no sheet wastes >150px.
5. Gates: `npm run check` (typecheck + 83 tests + doctor ×2 DBs), `npm run print:audit`, `chrome --print-to-pdf` = one page per sheet, no-loss 212/212, then a fresh screenshot for you.
6. Docs: `CURRENT_STATE.md`, `TRACEABILITY.md`, this proposal, `SESSION_HANDOFF.md`.

---

## 8. What I will not touch

Database, migrations, seeds, `presentation_overrides` semantics, lifecycle, CRUD rules, `reference/`, the frozen mock (`design/panchavati-compv3.html`), the print authority boundary (`chart-document.ts` projection + `chart-html.ts` no-loss accounting). No new migration. No reset. No reseed.

---

## 9. Questions for you (asked interactively as well)

1. **Which option is the floor?** A (surgical) / B (A + repack to 6) / C (structural) / D (C + screen-print split) / E (card-less ledger).
2. **Is 6 print sheets the target, or "as few as possible, readability wins"?**
3. **The 85 personless rows** — investigate and report before layout, or ignore them for now?
4. **Screen layout** — keep A4-width paper even on screen (chart-like, WYSIWYG) or go fluid full-width for the screen and keep A4 only for print?

---

## Appendix — reproducing every number above

Screen numbers — dev server on `127.0.0.1:3100`, viewport 1440×1000, in the browser console:

```js
[...document.querySelectorAll('.page')].map(p => ({ h: Math.round(p.getBoundingClientRect().height) }));
getComputedStyle(document.querySelector('.g-core')).display;   // "block"  ← D1
[..document.querySelectorAll('.g-desk > *')].map(d => Math.round(d.getBoundingClientRect().height)); // [757, 757] ← D2
```

Print: `npm run print:audit` (headless Chrome, print media, A4 landscape = 794px, printable 775px).

Data (read-only, `panchavati3_dev`):

```sql
select a.shift, a.column_no, count(*)::int rows, count(a.staff_id)::int staffed,
       count(*) filter (where a.staff_id is null)::int unstaffed
from daily_assignments a join daily_charts c on c.chart_id = a.chart_id
where c.chart_date = '2026-09-10' group by 1,2 order by 1,2;

select a.status, a.allocation_state, count(*)::int n, count(a.staff_id)::int staffed
from daily_assignments a join daily_charts c on c.chart_id = a.chart_id
where c.chart_date = '2026-09-10' group by 1,2;
```

`GET /charts/2026-09-10` is the live surface measured; the running server was yours and was left untouched.
