<!--
Purpose: the whole-chart coherence pass the user asked for at the end of the 13-item list
  (“brainstorm after everything planned, about the whole chart, everything fits good? anything
  repeated? missing? whitespace?”).
Current role: evidence-backed audit of the printed chart; each finding is either measured or it is
  labelled as a judgement call. Decisions that need the station are handed to OPEN_QUESTIONS.
Last meaningful change: 2026-10-13 — written after the print-fit repair and the Option-A layouts.
Constraint/dependency: read-only analysis; changes nothing in the renderer. Numbers come from
  `npm run print:audit`, the rendered HTML and the seeded database, not from memory.
-->

# Coherence audit — the 10/09 chart as it prints today (2026-10-13)

## 1. Does everything fit? Yes, with slack in known places

`npm run print:audit` (headless Chrome, print media, one `.page` box per A4 landscape sheet):

| Sheet | Content | Extent | Slack vs 775px |
|---|---|---|---|
| 1 | command hierarchy + Sr-PI card + officer band + day/night/office lanes | 658px | 117px |
| 2 | the six-chowki day/night band | 498px | **277px** |
| 3 | court/summons/warrant cards + special desk + गस्त व स्कॅनिंग schedule | 688px | 87px |
| 4 | availability (रजा, साप्ताहिक सुट्टी, गैरहजर) | 663px | 112px |
| 5 | notices + author tables + officer summary + sign-off | 579px | 196px |
| 6 | manpower matrix + shift summary + sudden changes | 649px | 126px |

The source chart itself is 6 pages, so sheet count parity holds. **Sheets 3 and 1 are the tight
ones** (87px and 117px) — they are the first to break when content is added, which is exactly how the
schedule overflow was caught. Sheet 3 now carries two unrelated sections (court cards + patrol
schedule) because it was the only place with room; if the schedule grows, the honest move is its own
sheet rather than more density.

## 2. Anything repeated? One person, one row — measured, not assumed

- **120 slot renders / 120 unique assignments**, and **106 distinct people printed, 0 of them on more
  than one sheet**. So the “one row, one home” property now holds *across* sheets, not just within a
  sheet (it was only ever checked inside one sheet before). The earlier duplicates the clerk spotted
  — कार्यालयीन अंमलदार / व.पो.नि.सो. रायटर / ठाणे अंमलदार कक्ष देखरेख / the blank रायटर under विशेष
  तपास पथक, plus the officer repeated in the office column and in the page-1 court desk — are gone by
  construction: the officer band owns its people, and a group whose every row is a person already
  printed in that band is not repeated (display-only; the row is still counted for the no-loss
  ledger).
- **Legitimate repetition that stays** (do not “fix” these): a rank+name also appears in the officer
  summary (a summary, by definition) and a person's name can legitimately appear in the matrix if the
  matrix row is about their post; the sign-off names the clerk, who may also be on the chart — the
  source does that too.
- **Still open on repetition:** whether a notice that also appears in a block's note column should be
  printed in both places is a *station* question, not a renderer one (OPEN_QUESTIONS N13).

## 3. Anything missing? Three real gaps, all recorded

1. **The guard/event annex is not built** (11/09 chart + event annex). Nothing on the printed chart
   claims to cover it, so this is a scope gap, not an error on the sheet.
2. **The mock's ऑपरेटर writers and the shift-summary numbers have no source evidence**, so the sheet
   prints an open रायटर seat and blank summary cells (T16). Deliberate: never invent a name.
3. **`name_en` is empty for every seeded staff master** (checked: 0 rows), and a few masters carry
   Latin `name_mr` (e.g. buckle 1347 → “Kushal”), which prints on page 1's Sr-PI रायटर line (T17).
   The new bilingual aid is the tool that fixes this in the clerk's own hands; it does not rewrite
   data by itself.

## 4. Where the whitespace is — and which of it is a decision

- **Sheet 2 (277px of empty paper) is the obvious candidate.** Options, in order of honesty:
  (a) leave it — a field sheet the constables read at the counter is allowed to breathe;
  (b) put the गस्त/स्कॅनिंग schedule back *only if* the chowki blocks themselves get slightly tighter
  print metrics (measured: the pair needs 777px today against 775px, i.e. it misses by 2px — too
  tight to re-break; the schedule needs its own home, which is what sheet 3 gives it);
  (c) grow the chowki boxes to fill the sheet (bigger names/times for a read-at-a-glance sheet).
  My recommendation: (c) if the clerk reads this sheet on the wall, (a) if it is an office copy.
- **Sheet 5 has 196px of slack** and will absorb the author tables the clerk adds (`+ तक्ता जोडा`)
  before anything else has to move — that is intentional, the notices sheet is the author's sheet.
- **Inside blocks**, the empty-vs-filled asymmetry is now visible by design: an unfilled seat is an
  ordinary empty cell (the clerk asked for that), so a short duty column shows blank cells rather
  than placeholder text. That reads correctly on paper and is what the source does too.

## 5. Fit between the sections (the “everything fits good?” judgement)

- Sheet 1 reads top-down as rank order (Sr-PI card → officer boxes → day/night/office lanes), which
  matches how the station reads its own register.
- Sheet 3 now mixes two kinds of content (court/summons/warrant cards, then the patrol/scanning
  schedule). Both are “special duty” material and the sheet has the room, but if the station wants
  one idea per sheet, the schedule is the section that should grow into a sheet of its own.
- Sheets 4–6 are clean single-purpose sheets (leave · notices · manpower). Sheet 6 pairs the matrix
  with the shift summary and sudden changes — the closest call, since all three are tabular; measured
  it still has 126px of room.
- Print density is applied only where needed (sheets 1, 3, 4 + the choreography rules), never below
  9.5px, and never by dropping a row: no-loss stays 212/212 with 120/120 unique slots.

## 6. What I would do next, in order

1. Fix the last `name_en` gap for the masters the clerk actually reads (bilingual aid → `name_en`),
   because a Latin name on a Marathi chart is the one thing a reader notices immediately (T17).
2. Build the advanced search from Kushal's `HistoricalSearchView.tsx` (T24) — read it first.
3. Decide the notice placement (N13) and then make notices CRUDable in their block context.
4. Sheet-2 whitespace decision (above) — cheap either way, but a station call.
5. 11/09 chart + event annex, then print verification of both days.
