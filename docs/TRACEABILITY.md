<!--
Purpose: Traceability map: source evidence → requirement → implementation → verification.
Current role: Coverage ledger; grows with each implemented slice.
Last meaningful change: 2026-10-12 — authoring/chrome round added (editable names, अधिकारी box, header/date, pseudo-login); R-18 officer button now enabled (feature finished).
Constraint/dependency: Implementation/Test columns stay honest — "—" until code exists; never pre-ticked.
-->

# TRACEABILITY

Status legend: ⬜ requirement recorded · 🔨 implemented · ✅ verified (test/inspection named)

## Evidence sources (authority order)

| ID | Source | Role |
|---|---|---|
| EV-01 | `reference/ORIGINAL_VISUAL/10.pdf`, `11.pdf` (+12/16) | visual authority |
| EV-02 | `reference/SEMANTIC/10.md`, `11.md` | exact text authority (human-verified) |
| EV-03 | `reference/SEMANTIC/Page 3.md` + `All Pages_Daily Copy Policy…md` | section structure + copy policy |
| EV-04 | `reference/EXCEL_RECONSTRUCTION/10th|11th_sept_page_1` | verified cell/layout authority (Page 1) |
| EV-05 | `reference/SEMANTIC/Staff_Info.md` + old repo `db/seed/reference-data.sql` | staff/rank/seed authority |
| EV-06 | `01_CONSOLIDATED_ANALYSIS.md` (Desktop) + old repo `docs/IMPLEMENTATION_CONTRACT.md` | decision authority |
| EV-07 | `Kushal_Handoff/Current_Prompt_to_Follow.md` (NEW DATA) | compact-chart critique list |

## Requirements map

| Req | Statement (source) | Evidence | Implementation | Verification |
|---|---|---|---|---|
| R-01 | 10/09 day roster fully representable (HQ, 6 chowkis, marshals, office, BIMA, बंद+charge, split times) | EV-01/02 | 🔨 0001/0003 + `db/seed-chart-1009.ts` DAY1–4 | ✅ tests/invariants.test.ts (212 rows, 10 बिमा, 2 रिक्त, 7 loc-states vs source) |
| R-02 | 10/09 night roster + night directives + गुडमाॅर्निंग स्काॅड | EV-01/02 | 🔨 NIGHT1–3 + `chart_notices` seed (28) | ✅ same suite (notices/vacant/bima counts) |
| R-03 | Leave/availability categories incl. hourly windows + date ranges + इतर ड्युटी | EV-02/03 | 🔨 0003/0005 (`daily_availabilities`, nullable staff) + seed (69) | ✅ count matches Table 3 cell-by-cell (20+20+9+20) |
| R-04 | Manpower matrix preserved (Office 09 / ME 233 / प्रत्यक्ष हजर 03), no blind recalc | EV-02 | 🔨 0003 `manpower_records` (verbatim value_text) + seed (240) | ✅ verbatim test: `12<br>04 Proण्` + `..` cells preserved |
| R-05 | Officer summary (15 officers) derived+overridable | EV-02, EV-06 | 🔨 0003 `officer_summary_rows` (source/suggestion/override) + seed 15 | ✅ officer_rows=15 (derivation/override UI = P1) |
| R-06 | Sudden-duty-change ledger append-only | EV-02/03 | 🔨 0003 `sudden_duty_changes` (UNIQUE chart+seq) | 🔨 trigger pattern proven by chart_versions test (ledger UI = P1) |
| R-07 | Scan schedule: 4 sessions config + 12 hourly daily rows | EV-02 | 🔨 0001 config (30 rows) + 0003 `scan_schedule_daily` + seed 12 | ✅ scan_rows=12, doctor scan_cfg=30 |
| R-08 | 11/09 event (रंगीत तालीम): 11 personnel + equipment lines + fall-in instruction + notice | EV-01/02 | — | — |
| R-09 | Event annex is extra physical page without schema change | EV-01/02/03 | — | — |
| R-10 | रिक्त ≠ बंद ≠ बिमा, all explicit | EV-02, EV-06 | 🔨 0003 CHECKs + `location_operational_states` + 0004 | ✅ 8 tests: CHECK rejections, schema-shape, bima/vacant row audits |
| R-11 | No autonomous scheduling/replacement (any mode) | EV-06 | 🔨 no code path exists; AGENTS/README contract | ✅ static scan test (auto-assign identifiers + Math.random absent) |
| R-12 | Copy-previous never modifies source; copy policy matrix respected | EV-03, EV-06 | — (P1: copy feature) | — |
| R-13 | Finalized snapshot immutable; reprint from snapshot | EV-06 | 🔨 0004 triggers + `server/finalize.ts` + `server/chart-document.ts` (getSnapshot) | ✅ 6 tests: triggers (append-only/freeze), snapshot ≡ projection, master-edit independence, amendment v2→v1 chain, v1 immutable |
| R-14 | Masters CRUD end-to-end; deactivate over delete | EV-06 | — | — |
| R-15 | Today/tomorrow/history flows | EV-06 | — | — |
| R-16 | Compact print readable + grayscale-safe; Marathi never truncated | EV-06, EV-07 | — | — |
| R-17 | Marathi-first Unicode; protected tokens; Devanagari display digits | EV-06 | — | — |
| R-18 | Unfinished features = disabled Coming Soon | EV-06 | — | — |
| R-19 | Change ledger records original/replacement/reason/time/actor | EV-02/03 | — | — |
| R-20 | Search over historical charts (initially simple) | EV-06 | — | — |

## Acceptance runs (planned)

- **A-10/09:** seed + author + finalize + print 10/09 packet; checklist = INITIAL_AUDIT §7 table 1 fully representable.
- **A-11/09:** same + event authoring + annex page; checklist = §7 table 2; assert no schema migration needed for the extra page.
- **A-copy:** copy 10/09→11/09 as clerk would; source hash unchanged; conflicts flagged.
- **A-print:** rendered compact print inspected in browser preview (screen + grayscale emulation); Marathi wrap verified.

## Old-invariant carryover

The 12 old INV rules (old repo `docs/decisions/INVARIANTS.md`) are carried into ARCHITECTURE §"Invariants" (renumbered 1–12 there); their old verification mechanisms (DB CHECKs, static scanner, DB tests, snapshot-replay test) are reused per-slice as implementation lands.

## Renderer fidelity pass (2026-10-11, work unit 1010)

| Req | Requirement | Evidence | Implementation | Test |
|---|---|---|---|---|
| R-16 | Compact print readable; sections match the approved mock; Marathi never truncated | EV-06/07 + `design/panchavati-compv3.html` | `server/render/chart-html.ts` (page 1 officer band `.sr-pi-card`+`.g-off`, page 2 one block per post, page 3 leave/court sections, page 5 session+scan `.two`) | 🔨 `tests/render-fidelity.test.ts` (10 tests) — structure, no stray blocks, no officer duplication, section presence |
| R-17 | Marathi-first display; protected tokens; role labels from the source | EV-06 | `chartName()` compact chart names + `roleMr` row labels (migration 0008) + `disp()`/`raw()` scoping | 🔨 `render.test.ts` (protected tokens), `render-fidelity.test.ts` (compact names, `>रायटर</th>`), `authoring.test.ts` (abbr tooltips) |
| R-18 | Unfinished features disabled, never half-built | EV-06 | chowki add-box enabled (working); officer add-box was Coming Soon until its feature shipped 2026-10-12 — it is now enabled AND complete (nothing half-built is exposed) | `authoring.test.ts` (enabled + routed, `not.toContain("Coming Soon")`, no inline handlers) |
| — | No information loss on the chart (`रिक्त` ≠ `बंद` ≠ `बिमा`) | EV-02/03 | renderer no-loss accounting: every assignment row counted exactly once — continuation labels absorb into the typed `.fx` state line only when that line exists | 🔨 `render.test.ts` (212/212), `scripts/render-chart.ts` fails loud on any mismatch |

## Renderer fidelity rounds 2–3 (2026-10-12, work unit 1010)

| Req | Requirement | Evidence | Implementation | Test |
|---|---|---|---|---|
| R-16a | Page 2 shows the mock's six-chowki band; each beat-marshal post prints inside its paired chowki (own typed बंद/चार्ज state preserved) | `design/panchavati-compv3.html` page 2; `reference/SEMANTIC/10.md` col 3 | `foldMarshalPosts()` + `layout.marshalPostForChowki` (reference seed) + `stateFx(..., marshal)` `.fx.mrsh` line | 🔨 `tests/render-fidelity.test.ts` (6 chowki heads, `मार्शल:` `.fx` lines, no marshal block) + `render.test.ts` no-loss 212/212 |
| R-16b | Desk posts (मोबाईल / सायबर सेल / महिला कक्ष / काळाराम) print as role groups in page 1's special desk, never as page-2 blocks | mock page 1 `कोर्ट, समन्स, वॉरंट व विशेष कक्ष`; `reference/SEMANTIC/10.md` col 3 | `walkBlocks()` desk-post branch + `specialDeskRows()` + `layout.specialDeskLocationKinds` (FIXED_POINT) | 🔨 `render-fidelity.test.ts` (no special leaks as a block; desk carries each title, dual shifts carry दिवसपाळी/रात्रपाळी) |
| R-17a | Authoritative spelling for काळाराम (long ी) — Excel reconstruction + SEMANTIC agree against the seed's short ि | `reference/EXCEL_RECONSTRUCTION/10th_sept_daily_duty_chart_page_1/HTML/.../sheet001.htm` (codepoints 092E 0902 0926 0940 0930); `reference/SEMANTIC/10.md:37,87` | `db/seed/0001_reference_data.sql` location `FIXED_KALARAM` + `DAY_KALARAM`/`NIGHT_KALARAM` titles (idempotent `ON CONFLICT DO UPDATE`) | 🔨 `render-fidelity.test.ts` asserts the desk label; doctor seed-count sanity |
| R-19 | Print pagination: one `.page` = one A4 sheet, no spilled content | mock pages all 794px; `reference/ORIGINAL_VISUAL/10.pdf` = 6 sheets | `web/authoring.css` print-density block (`.page.dense`, row metrics only — nothing dropped/truncated) + notices on their own sheet; renderer marks pages 1 and 3 `dense` | 🔨 `npm run print:audit` (headless Chrome print media: all 6 sheets ≤ 775px) + `chrome --print-to-pdf` = 6 pages; `render.test.ts` (6 boxes, 2 dense, notices sheet) |

## Authoring + chrome round (2026-10-12, user asks from the 10/12 message)

| Req | Requirement (user words) | Evidence | Implementation | Test / verification |
|---|---|---|---|---|
| R-20a | "everything should end in its line, no overflow — same for all chowki boxes" | user screenshot (wrapped stray time chip, duplicate in-charge) | renderer prints the in-charge ONCE in `.ch-head .of`; `stateFx` splits `.st` (nowrap) + `.dst` (wraps); `web/authoring.css` `.fx/.dt text-wrap:pretty` | 🔨 `render-fidelity.test.ts` (in-charge once per block, state spans) + measured in browser: 1–2 balanced lines, zero spill |
| R-20b | edit mode must not flicker/reflow on hover — "just the dotted hover box" | user report (hover `::after` ✎ re-flowed cells) | slot hover no longer injects content; `[data-label]:hover` = outline + tint only | 🔨 browser: `::after.content === 'none'`, geometry stable; authoring.css has no hover `content:` on slots/labels |
| R-20c | "my header and date selector from arjish repo" (Arjish AppNav) | `<ws>/DailyDutyPanchavati-ui-rebuild/src/web/components/AppNav.tsx` (user-named path, in-project) | `#appbar` markup in `chart-html.ts` + styles in `authoring.css` + `initDateMenu()`; `GET /api/charts` (`chart_date::text`); `web/assets/Police_Logo.png` route | 🔨 browser: bar 56px sticky, dropdown lists dates, click navigates; `print:audit` unaffected (`.no-print`) |
| R-20d | pseudo-login: choose name/rank/buckle (buckle only where applicable); top-right shows "लॉगिन: …" | user; sign-off line तक्ता तयार करणारे हजेरी लेखनिक; `ranks.cadre` | `localStorage['pd_clerk']` + `#ab-user` chip + `openLogin()` (chart candidates + form; buckle only for CONSTABULARY) | 🔨 browser: chip renders/persists, buckle hidden for OFFICER ranks; no server call, no schema change |
| R-20e | "make every table, chart or column name, left rows name editable … for that version of the chart" (both scopes) | user | `makeNames()` → `data-label`/`data-default`/`data-override` on 185 elements; `presentation_overrides.labels`/`labelsAll`; `PATCH /api/charts/:date/labels` (409 FINALIZED); rename flyer | 🔨 `authoring.test.ts` (key coverage + `override resolution: element > text > default` + no-loss unchanged) + browser E2E both scopes + blank revert |
| R-20f | "add the ability to add adhikari box, just like the chowki box" | user; officer-box grammar in `design/panchavati-compv3.html` + seed writer rows | `addOfficerBox()` (override entry + ONE रिक्त writer seat = the label row, DAY col 4) + `POST /api/charts/:date/officer` + enabled button/flyer + office-walk fill fix | 🔨 `authoring.test.ts` (`addOfficerBox domain`, rollback, dup/blank refused) + browser E2E: add → fill → person renders in ITS box; dev DB restored to 212/`{}` |
