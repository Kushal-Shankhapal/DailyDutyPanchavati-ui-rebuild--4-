# 1010 — Renderer fidelity diagnosis (reference vs production renderer)

Purpose: evidence-backed divergence list demanded by the corrective review, before any code change.
Reference (visual contract): `design/panchavati-compv3.html` + `design/compv3.css`.
Production renderer: `server/render/chart-html.ts` (serves `/charts/:date` and `.tmp-preview/*.html`).
Content authority (per AGENTS.md order): `reference/SEMANTIC/10.md` (source text), `reference/EXCEL_RECONSTRUCTION/`.
Date traced: 2026-09-10.

## 0. Root-cause summary (why output diverges repeatedly)

1. **The renderer was built as "full data coverage, 5-page skeleton" (its own header says
   "visual polish iterates on user screenshots")** — i.e. it approximated the mock's class
   vocabulary instead of reproducing the mock's section hierarchy and block grammar. Each fix
   was a symptom patch; the structural gaps below accumulated.
2. **Data-to-display mapping was never re-checked against the source's compact cell forms.**
   The staff master (from `reference/SEMANTIC/Staff_Info.md` = "Full Name, Mo.No." docx) stores
   FULL names (`हेमंत रमाकांत आहेर`), while source chart cells use compact chart forms
   (`पोशि 542 आहेर`). The renderer prints `personLine = rank + buckle + full name` everywhere,
   which is faithful to the MASTER but not to the CHART.
3. **`walkBlocks` keys blocks by `D${dutyCode}` for any labelled row**, but the seed keeps the
   current duty context on continuation labels (`बंद`, `मार्शल चा चार्ज…`, `चौकी चा चार्ज…`,
   `एम.टी.सेक्षन कडील चालक`). Inheriting the duty code makes continuation rows look like post
   heads → standalone stray blocks (`बंद` ×5, `चौकी चा चार्ज…` standalone, duplicate
   `पंचवटी १ मोबाईल` because DAY_PANCHAVATI1/NIGHT_PANCHAVATI1 have different duty codes but
   no location → two `D…` keys).
4. **One seed cell never got its duty code**: `{ d: "महिला कक्ष" }` (DAY3) — the duty
   `DAY_WOMEN_DESK` exists in `db/seed/0001_reference_data.sql:106` but the seed cell omits
   `code:`, so the women's desk inherits `DAY_MARSHAL_MERI` and mis-groups.
5. **CSS is NOT the problem**: both the live route and the generated preview serve the exact
   mock stylesheet (`/design/compv3.css` from `server/index.ts:64`, `../design/compv3.css`
   from `scripts/render-chart.ts:41`). Geometry breaks downstream of wrong/missing DOM
   (stray blocks, add-box grid children in edit mode, long full names widening cells,
   missing `.g-off` band changing page-1 proportions).

## 1. Section-by-section divergence

| # | Reference (compv3) | Production renderer | Verdict |
|---|---|---|---|
| 1 | `.toolbar` (print button only + prototype chrome) | toolbar + date nav + edit/finalize buttons | OK (product chrome, `no-print`) |
| 2 | `.head` (h1/h2/h3 + DRAFT chip) | same ✓ | OK |
| 3 | `.sr-pi-card` with `.rk` rank label, groups रायटर / चालक / **RTPC** | card without `.rk`, groups रायटर / चालक only, no RTPC | **MISSING** `.rk` + RTPC group |
| 4 | `.grid.g-off.fit` — **4 officer boxes** (name + chip + रायटर/ऑपरेटर rows) | **absent** (only a disabled add-box button) | **MISSING SECTION** |
| 5 | `.p1-lower` — 4 desk blocks; court title `कोर्ट, समन्स, वॉरंट व विशेष कक्ष` | `.p1-lower` ✓, title `कोर्ट, समन्स व वॉरंट` | title differs (visual grammar = mock) |
| 6 | Day desk groups start `अधिकारी` (mock moved SR-PI→card, 3 officers→boxes) | desk keeps source leadership group + card | **kept = source** (10.md Table 1 col 1); desk unchanged, boxes added alongside (same pattern as today's SR-PI card) |
| 7 | Page 2 `.grid.g-chowki` only (no `.sec` heading) | extra `.sec h2` + **stray blocks** (`बंद`, `चौकी चा चार्ज…`, dup mobiles, `महिला कक्ष` D-block) + `इतर` block | **STRUCTURE BROKEN** (walkBlocks root cause 3+4) |
| 8 | Chowki block = `.ch-head` + `.sub-shift-wrap` + `.fx` state lines | same ✓ once blocks are correct | OK after fix |
| 9 | Page 3: leave section `.grid.g4` + **`कोर्ट पैरवी व विशेष क्षेत्रीय बंदोबस्त` section** + (source has no notices section; renderer keeps `सूचना व निर्देश`) | one flat availability grid (group blocks), no court section | **SECTION MISSING** — split availability into leave section (blocks per source sub-header/category) + court section (group `इतर ड्युटी` blocks per category); notices stay (no-loss) |
| 10 | Page 4 matrix + shift summary + sudden-change ledger | same ✓ | OK |
| 11 | Page 5: officer summary `.two` + **sessions table (पेट्रोलिंग/बीट मार्शल)** beside hourly scan `.two` + `.signoff` | officer summary ✓, **sessions table missing**, hourly scan full width | **MISSING** (source: SEMANTIC/10.md Tables 10, 11, 13) |
| 12 | `(चेकिंग-१ )` not shown as orphan blank row | zero-row label renders `<th>…</th><td><span class="blank">` | **renders as orphan blank cell** |

## 2. Label / data-mapping findings (traced, not guessed)

- **`(चेकिंग-१ )`**: source cell text is literally `(चेकिंग-1 )` — 10.md Table 2 row 1 col 1,
  seeded verbatim at `db/seed-chart-1009.ts:301`. It is the night checking-officer section
  heading (SEMANTIC "Page 1 and 2 Analysis" §Night: "Night Checking Officer (चेकिंग-1)").
  It is NOT an internal code. Rendering fix: zero-row person-less labels become a
  full-width heading row (`th[colspan]`) instead of a label + empty cell.
  The next row `(पंचवटी पो.स्टे.)` carries duty `NIGHT_CHECKING_OFFICER` whose title
  `रात्र गस्त अधिकारी` already renders as the group label ✓.
- **Full names**: master `staff_members.name_mr` = full names (Staff_Info docx — user-confirmed).
  Source chart cells use compact forms: buckled ranks → `रॅंक बकल अडनाव`
  (`पोशि 542 आहेर`), OFFICER cadre → `रॅंक नाव अडनाव` (`पोनि सुनिल पवार`),
  name-keyed ASI/LASI (no buckle) → `रॅंक अडनाव` (`सपोउनि शेवाळे`).
  Verified against every officer/ASI cell in 10.md Tables 1–3. Fix = display-only transform
  in `personLine` (master data untouched; `toMr`/rank-short precedents exist). Golden tests
  will pin sample cells.
- **Mock vs source conflicts** (source wins, recorded here per "record, never guess"):
  - mock तपास box shows `रायटर पोहवा ९३६ अहिरराव`, but source col-4 says
    `पोनि.तपास॰रायटर → (रिक्त)` and 936 अहिरराव belongs to `पोनि.प्रशासन॰रायटर` →
    renderer shows रिक्त for the तपास box.
  - mock officer-box `ऑपरेटर` names (३११२ शेवाळे, १८८१ जाधव, ०५९५ पगारे) and the
    `विशेष तपास पथक` box are **not present in 10.md, not in the EXCEL reconstruction, not in
    Staff_Info** → NOT rendered (no invented relationships; recorded in OPEN_QUESTIONS for
    visual verification against ORIGINAL_VISUAL PDF).
  - mock leave/court block merges vs source 4-column structure: renderer blocks by source
    sub-header (category) inside two sections — structure from source, section titles/blocks
    grammar from mock.
- **बंद/चार्ज rows**: seed stores BOTH assignment label rows AND typed
  `location_operational_states` (7 states — invariants test pins both counts). The typed
  state line is canonical; the label rows are absorbed into the block's `.fx` line at render
  time (counted once — no-loss accounting intact), which removes the stray blocks without
  touching seeded counts (212 assignments / 7 states stay).
- **Office writer rows → officer boxes**: bound by explicit source duty titles
  (`पोनि.गुन्हे॰रायटर` etc.) via template-layout config `officerBoxWriters` — config is
  display grouping (Layer C), not operational data; rows move out of the office desk into
  the boxes (rendered exactly once, still editable slots).

## 3. Planned fixes (this work unit)

1. `server/chart-document.ts` — expose `labelFromDuty` (label text came from duty definition)
   and `cadre` on DocPerson (display derivation input).
2. `db/seed-chart-1009.ts` — `महिला कक्ष` cell gets `code: "DAY_WOMEN_DESK"` (duty exists).
3. `db/seed/0001_reference_data.sql` — fill-if-missing template layout keys:
   `officerBoxWriters`, `scanSessions` (Tables 10/11/13 aggregates, source-verified).
4. `server/render/chart-html.ts` — compact chart names; `.rk` + RTPC card; `.g-off` officers
   grid; court title; walkBlocks keying by location/duty-title with continuation rows kept in
   their block; state-line absorption; heading rows for empty labels; availability split into
   leave + court sections (per-category blocks); page-2 extra heading removed; sessions table
   beside hourly scan.
5. Tests — golden compact-name cells, officers-grid/sessions presence, no-loss counts pinned.
6. Browser gate — side-by-side screenshots (mock vs `/charts/2026-09-10` vs `.tmp-preview`)
   at desktop and print dimensions; record results in the handoff section below.

## 4. Handoff (files / tests / visual verification)

### 4.1 Files changed

- `db/migrations/0008_assignment_role.sql` (new) — `daily_assignments.role_mr`: the source chart's own
  role/qualifier column (9 rows on 10/09 had one folded into `notes_mr`). Display only, never parsed.
- `db/seed-chart-1009.ts` — the person cell's 3rd element now lands in `role_mr` instead of `notes_mr`.
- `db/seed/0001_reference_data.sql` — template layout config: `officerBoxes` (4 posts: तपास/प्रषा/गुन्हे/
  विशेष, each bound to the source's own officer qualifier + its office-column writer title),
  `availabilitySections` (leave vs court/bandobast — the source's own column groups),
  `courtDutyCodes` / `scanSessions` (already present from the earlier pass).
- `server/chart-document.ts` — `DocAssignment.roleMr` projected from `role_mr` (`cadre`/`labelFromDuty`
  were already exposed).
- `server/render/chart-html.ts` — the whole fidelity change: block keying, `.fx` absorption, officer band,
  role/bima row grouping, court title, page-3 sections, page-5 sessions, always-aligned label column.
- `server/index.ts` — serve `design/panchavati-compv3.html` read-only so the baseline can be reviewed
  side by side with the chart on one origin.
- `tests/render-fidelity.test.ts` (new, 10 tests) + updated `tests/authoring.test.ts` (the Sr-PI card's
  wording test now asserts the mock's `.rk` + abbreviation grammar the user-approved baseline specifies).
- `docs/CURRENT_STATE.md`, `docs/OPEN_QUESTIONS.md` (T15–T17), `docs/TRACEABILITY.md`, this file.

### 4.2 Checks actually run

- `npm run check` → typecheck green, **72 tests green**, doctor green on BOTH DBs (8 migrations, 0 pending,
  0 checksum drift). Test DB was migrated + reseeded (`NODE_ENV=test npm run db:migrate && npm run db:seed`).
- `npm run render:chart` → `rows 212/212` (no-loss accounting holds after every regrouping).
- Rendered `212 assignments · 10 बिमा · 2 रिक्त · 69 availability · 7 loc-states · 28 notices ·
  240 matrix cells · 15 officer rows · 12 scan rows` — unchanged from the P0/P1 baseline, as required.

### 4.3 Visual verification (browser, 1440px viewport; `/charts/2026-09-10` on a local server)

- **Port warning recorded:** `3100`/`3000` on this machine belong to OTHER checkouts
  (`Desktop\DailyDutyPanchavati`, nested `DailyDutyPanchavati-ui-rebuild`) — a screenshot of
  `http://127.0.0.1:3100/charts/2026-09-10` is a different app entirely, not this renderer. Verified this
  run on `PORT=3200` with `.tmp-preview/server-3200.log` + `curl` 200 before screenshotting.
- Page geometry: `.page` = **1122 × 794 px** (A4 landscape) on pages 1, 4, 5.
- **Page 1** — matches the mock: centred head + DRAFT badge; `.sr-pi-card` with `.rk` label, name, ठाणे प्रमुख
  chip and रायटर / चालक (दिवस·रात्र) / RTPC (दिवस·रात्र) groups; `.g-off` band with **4 officer boxes**
  (तपास with a रिक्त slot, प्रषा, गुन्हे, विशेष तपास पथक with an open slot); the 4-column band
  दिवस पाळी कर्तव्य | रात्र पाळी कर्तव्य | कार्यालयीन शाखा व कारकून | **कोर्ट, समन्स, वॉरंट व विशेष कक्ष**.
  The station-officer rows no longer repeat in the day desk (it now starts at ठाणे अंमलदार कक्ष देखरेख).
- **Page 2** — 15 blocks in the mock's 3-column `.grid.g-chowki`; the stray `बंद` / `चौकी चा चार्ज…` blocks
  and the duplicated `पंचवटी १ मोबाईल` block are **gone**; each chowki block keeps `.ch-head` + `.sub-shift-wrap`
  + `.fx` state lines and the `.sub-col.shut` hatching.
- **Page 3** — the two sections (रजा… / कोर्ट पैरवी व विशेष क्षेत्रीय बंदोबस्त) plus सूचना व निर्देश, one `.blk`
  per source category with count chips, exactly the mock's `.grid.g4` grammar.
- **Pages 4–5** — unchanged design; page 5 now pairs the session table (Tables 10/11) with the hourly scan
  table in a `.two`, then the sign-off.

### 4.4 Round 2/3 update (2026-10-12) — the mock's folds are now implemented

1. **Marshal fold done (T15 resolved).** `layout.marshalPostForChowki` (reference seed, chowki location code
   → marshal location code) folds each marshal post into its paired chowki: its own typed बंद/चार्ज state
   prints as a `मार्शल:` `.fx.mrsh` line and its staff rows merge into the same shift sub-column. सरदार चौकी
   has no marshal post in the source and is absent from the map, so it keeps no `मार्शल:` line — exactly
   the mock. `foldMarshalPosts()` keeps every row (no-loss 212/212) and the three-fact distinction
   (रिक्त / बंद / बिमा) intact: only the render position moves.
2. **Desk-post fold done.** `walkBlocks()` now sends a post to page 1's court/special desk when it is a
   labelled duty post with no location (पंचवटी १ मोबाईल, सायबर सेल, महिला कक्ष, वायरलेस महिला अंमलदार,
   एम.टी.सेक्षन कडील चालक) **or** its location kind is listed in `layout.specialDeskLocationKinds`
   (`["FIXED_POINT"]` → काळाराम मंदीर गार्ड ड्युटी). `specialDeskRows()` groups by source title; a title
   staffed in both shifts prints twice carrying the source's own दिवसपाळी/रात्रपाळी wording (dual is
   decided by *distinct shifts*, so two same-shift posts of one title are never mislabelled a pair).
   **Result: page 2 is exactly the mock's six `.ch-head` blocks in `.grid.g-chowki`, 794px = one A4 sheet.**
3. **Spelling corrected against authority.** `काळाराम मंदिर` → **`काळाराम मंदीर`** in the location and both
   duty titles. Evidence: `reference/EXCEL_RECONSTRUCTION/10th_sept_daily_duty_chart_page_1/HTML/10_Sept_Page_1_files/sheet001.htm`
   cell text (codepoints म=092E ं=0902 द=0926 ी=0940 र=0930) and `reference/SEMANTIC/10.md:37,87`. The
   mock's own `मंदिर` is the design artifact's typo; the mock is design authority, not text authority.

### 4.5 Known remaining differences (recorded, deliberately NOT “fixed” by inventing or dropping data)

1. **Pages 1 and 3 exceed one A4 sheet at the mock's screen type scale** with the full 10/09 source volume
   (screen: page 1 = 1.39 A4, page 3 = 2.03 A4; pages 2/4/5 = 1.00 ✓). The overflow is real source content —
   page 1's court/special desk is 788px vs the mock's 297px, page 3's leave grid 632 vs 265 and court grid
   307 vs 95 — so byte/height parity would require dropping rows (refused). **RESOLVED 2026-10-12
   (T18):** those two sheets carry `.page.dense` and `web/authoring.css` relaxes row metrics **in print
   only** (10px/9.5px rows, line-height 1.15, tighter paddings, six columns for the dense leave/court
   grids); the notices section prints on its own sheet. `npm run print:audit` (headless Chrome, print
   media) reports all six sheets inside 775px printable height, and `chrome --print-to-pdf` emits 6 pages
   for 6 `.page` boxes (was 8). The 10/09 source chart itself is 6 sheets
   (`reference/ORIGINAL_VISUAL/10.pdf`), so 6 printed sheets equals the source, not a regression.
2. **The mock's special-desk grouping labels differ.** The mock merges titles into role labels
   (`मंदिर / महिला`, `ATC / सायबर`); this renderer prints one role group per source title
   (महिला कक्ष · वायरलेस महिला अंमलदार · काळाराम मंदीर गार्ड ड्युटी - दिवसपाळी/- रात्रपाळी · सायबर सेल …)
   so no title is invented and nothing merges away. Design-review item, not a data defect.
3. **Mock chowki names are short forms** (`मालेगाव स्टँड (LVWM)`, `काटया मारूती चौकी`); the renderer prints
   the location master's canonical names (`मालेगांव स्टॅड पोलीस चौकी`). Names are data → master wins.
4. **Pages 2–3 carry more blocks than the mock** because the mock omits/de-duplicates real source posts
   (महिला कक्ष, सायबर सेल, काळाराम गार्ड, पंचवटी १ मोबाईल, the marshal posts). Byte-parity would require
   dropping source rows — refused under the no-loss rule.
5. **No `ऑपरेटर` rows / विशेष box writer** — the mock's names exist in no source (T16); the boxes show an
   open slot instead. Likewise the mock's shift-summary numbers (source Tables 5–7 are blank) are not printed.
6. **`पोहवा १३४७ Kushal`** — Latin name in the staff master (T17), visible on the Sr-PI रायटर line.
7. The source's role column is only populated for the rows the seed captured; rows the source leaves without
   a role keep an empty label cell (so the role column stays aligned), where the mock prints a generic
   `अंमलदार`. That generic label is not in the data, so it is not printed.
