<!--
  Purpose: The read-FIRST dossier for an external AI taking over planning + implementation of the Panchavati daily duty chart: mission, authorized boundaries, measured current state, the owner's complete feedback register, architecture guidance, traps already paid for, and the questions to ask the owner.
  Current role: Onboarding artifact for the receiving AI (Kushal/Durvesh's collaborator). Companion to docs/UI_HANDOFF_BRIEF.md (interface spec + paste-ready prompts) and §10 of docs/SITE_OVERHAUL_BRAINSTORM.md (tool survey + order of operations).
  Last meaningful change: 2026-10-16 — created from the owner's braindump + the six answered decisions (T26–T30) + the whole accumulated feedback register in docs/BACKLOG.md / mega.txt / chat.json.
  Constraint/dependency: Superseded by nothing; AGENTS.md hard rules still apply. The owner authorized (2026-10-16, T31) sharing this repository — including real personnel data — with the receiving AI.
-->

# AI_HANDOFF — read this first

**You are being handed a live, working project.** One previous AI lineage built what is in this repo; another (you, apparently — you built `DailyDutyPanchavati-ui-rebuild`, the "Arjish repo") built a much larger React/Vite version that is *inside this same folder tree*. The owner wants you to take over: plan it, improve the design, and implement it — with the freedom to change anything you judge wrong.

> **The one-sentence brief:** build the software that produces the Panchavati Police Station's daily duty chart — a **printed paper form**, ~212 personnel assignments across 6 sheets — with an app whose layout is dense, symmetric and optimised against the *real* data, where **everything is editable from an empty chart to a finished one and back**, where **one clerk makes every personnel decision**, and where the **printed output is the product**.

**Nothing in this document is a rule you must not question.** §4 lists invariants that come from the station's own operating rules and are enforced by tests — if you think one is wrong, say so with evidence and the owner will decide. §10 lists decisions already made — re-open them with a reason if you disagree. Everything else is context, numbers and lessons, offered so you don't have to re-derive them.

---

## 0. How to use this file

| Step | Time | What |
|---|---|---|
| 1 | 10 min | Read §1–§5. That is the whole project: what it is, what is built, what is broken, what the numbers are. |
| 2 | 5 min | Read §9 (questions for the owner) and §10 (already decided) so you don't ask twice. |
| 3 | — | Ask the owner your own questions (§9 is where the ones *we* want answered live; add yours). |
| 4 | as needed | §6 is the feedback register (every ask the owner has made, organised), §7 the architecture guidance, §8 the traps, §13 the file map. |
| 5 | before coding | `AGENTS.md` → `docs/CURRENT_STATE.md` → the code slice you are touching. |

**Do not read `chat.json` (21 MB) or `mega.txt` (3,474 lines) wholesale.** They are the raw logs of the owner's messages to earlier AIs — the *design authority* for tone, dislikes and intent — but they are unedited chat. §6 distils them. Grep them for a specific phrase when §6 references one (it cites the line numbers).

---

## 1. The project in 60 seconds

**The station:** Panchavati Police Station, Nashik City, Maharashtra. **User of the software:** one clerk. **Working language:** Marathi (Devanagari) for the chart; English for the app chrome (a product decision — see §10 #3).

**The artifact that matters:** the *दैनिक कर्तव्य तक्ता* — the daily duty chart. On paper it is **6 sheets** (A4 landscape) containing roughly **212 personnel assignments** across six chowkis, station desks, court/summons registers, leave and availability rows, a manpower matrix, an officer summary and a patrol/scanning schedule. The station currently produces it by hand/legacy tooling; the north-star workflow is **print → photograph → WhatsApp** to the staff, so *legibility of a phone photo of paper* is a real acceptance criterion, not a nicety.

**What the software is allowed to do:** calculate, flag, render and store. **What it must never do:** choose a person. No auto-assignment, no "smart fill", no suggested replacement that applies itself. Every personnel decision is the clerk's.

**Current implementation status (verified 2026-10-16):** a working Fastify + PostgreSQL + server-rendered-HTML app that produces the real 10/09 chart in **6 sheets, all fitting A4, 212/212 rows lossless**, with a large REST API, real CRUD for most surfaces, a measured print audit, 96 tests, and a design mock (`design/panchavati-compv3.*`) that was the visual starting point. **The design is NOT frozen** — the owner has re-opened the layout itself and considers the current render "kinda broken" but far along: *"v3 is not a frozen mock anymore, we have problems, that's why I am trying to optimize and improve our current (render) design."*

**The owner's stated priority, in their words:** *"main goal or priority: nice optimised chart layout and CRUDable enough to actually generate a day's daily duty chart of panchavati, and properly export it."* Everything else (dashboards, OCR, WhatsApp, search, multi-station) is visible-but-deferred.

---

## 2. Read order (and what to skip)

There are **three prior codebases** here, all worth knowing, only one of them is the live one:

| Repo | Path | What it is |
|---|---|---|
| **This repo (live)** | `./` | Fastify + Postgres + server-rendered chart. Everything measured and tested lives here. |
| **Arjish repo (yours?)** | `./DailyDutyPanchavati-ui-rebuild/` | React 19 + Vite + Tailwind + Kysely + a `domain/` layer + 13+ views. **Built by you**, per the owner — so *you already know this code*. Do not re-analyse it; tell the owner what to cherry-pick. |
| **Kushal archive** | `./DailyDutyPanchavati-ui-rebuild/NEW DATA/kushals repo/archive/` | A diverged fork of your repo + the north-star docs + the reference corpus + a "standardized chart" UI. 24 files differ from yours (verified by `diff -rq`). |
| **Durvesh prototype** | elsewhere on the owner's desktop | Flask + SQLite (`app.py`, 190 KB). Historical; not a foundation. |

**Read in this order:**

| # | File | Why you need it | Skip if |
|---|---|---|---|
| 1 | **this file** | mission, boundaries, feedback, traps | — |
| 2 | `docs/CURRENT_STATE.md` | implementation truth + verification status, session by session. The *only* file that says what actually works. | never |
| 3 | `docs/UI_HANDOFF_BRIEF.md` | the interface/CRUD/interaction spec, incl. the real `ChartDocument` field names, the API surface, the three-state render contract, the print contract, and 10 paste-ready prompts for UI AIs. **This is the most useful design document in the repo.** | never |
| 4 | `docs/SITE_OVERHAUL_BRAINSTORM.md` | the analysis: repo comparison, tool survey (free/OSS/local verdicts), the order of operations, the layout-optimisation loop with numbers, the citation-backed Framer/Figma verdict | never |
| 5 | `docs/PRODUCT_UI_ARCHITECTURE.md` | site map, the three data layers (A masters / B chart / C presentation), the CRUD grammar, the versioning model | never |
| 6 | `AGENTS.md` | the hard rules + authority order (what wins when sources disagree) | never |
| 7 | `docs/BACKLOG.md` | **the complete register of every owner ask with its status** (DONE / PARTIAL / TODO) as of 2026-10-13. §6 of this file is its continuation. | never |
| 8 | `docs/COMPACT_V4_DECISIONS.md` + `docs/DENSITY_AUDIT_1009.md` + `docs/BRIEF_DENSE_TABLES.md` | the per-sheet row plans, the measured whitespace audit, the dense-table options that were chosen | when you touch layout |
| 9 | `docs/DOMAIN.md`, `docs/ARCHITECTURE.md`, `docs/OPEN_QUESTIONS.md` | entities/rules, how the pieces fit, and every ambiguity we refused to guess at | before changing data model |
| 10 | `docs/DESIGN_INTERACTION_NOTES.md` | the already-specified interaction flows (picker, create, replace, clear, बिमा, बंद, contextual +) | when building the editor |
| 11 | `docs/SESSION_HANDOFF.md`, `docs/ASTRA_TRANSITION_PACKET.md`, `docs/QUASAR_README.md`, `docs/New_Claude_Plan.md`, `docs/COHERENCE_AUDIT_1013.md` | earlier hand-off packets and audits — useful archaeology, partially superseded | when tracing why something is the way it is |
| 12 | `design/panchavati-compv3.html` + `design/compv3.css` | the original visual mock. **Historical visual reference only for the officer boxes and the day/night command tables**; everything else may change. Not a frozen baseline. | if you prefer your own visual system |
| 13 | `reference/` (54 MB, never modify) | the source authority: `ORIGINAL_VISUAL/` PDFs (Tier 1), `EXCEL_RECONSTRUCTION/` (Tier 2), `SEMANTIC/` (Tier 3) | never (but do not bulk-read it; §13) |

**Authority order when sources disagree** (from `AGENTS.md`, do not invert it): reference PDFs > human-verified Unicode XLSX/HTML > SEMANTIC > `docs/` decisions > research > current code. If evidence is ambiguous: **stop, implement the representable part, and record the ambiguity** in `docs/OPEN_QUESTIONS.md`. Never guess Marathi text.

**Token-saving notes.** `db/seed-chart-1009.ts` + the seeded dev DB already contain the real chart — you do not need to re-extract it from the PDFs. `docs/CURRENT_STATE.md` + `docs/BACKLOG.md` + this file already distil ~3 sessions of work. The 21 MB `chat.json` and the nested repos are the expensive things; skip them unless a specific question needs them.

---

## 3. The mission, as acceptance criteria

The owner's ask is concrete. A run of this project is "done" for this phase when a clerk can:

1. **Open a real date** and see the station's chart rendered from the database (not a mock).
2. **Edit everything**: every seat, row, column, table, heading, notice, officer box, chowki, support seat, leave row, matrix cell, sign-off value — add, read, update, delete — **starting from an empty chart and reaching a full one**, and the reverse.
3. **Arrange the page**: move blocks, change columns, change what is on which sheet — with a UI that is pleasant and logical, not the current four-button float control.
4. **Save multiple chart templates/formats**, browse and reuse them.
5. **Finalize → print** a chart that looks like the station's sheet, **from the same design that is on screen** (the owner explicitly rejected the idea that the old server renderer stays the print authority: *"whatever optimized chart we will build in react, same looking thing should be printed"*).
6. **Export** PNG/PDF as well as print, from an export menu worth using.
7. Do all of it in a stack where **a CSS change does not need a page reload** (the owner's single strongest complaint about the current build).

Everything below that is a bonus. The owner is explicit: *"We have a lot of features and side stuff to get distracted into but remember main goal or priority."*

---

## 4. Boundaries

### 4.1 The invariants (enforced by the database and by tests)

These come from the station's real operating rules; breaking one silently is the worst failure mode in this project.

| # | Invariant | Why it exists |
|---|---|---|
| 1 | **`रिक्त` ≠ `बंद` ≠ `बिमा`.** Vacant *seat* ≠ closed *location* ≠ beat-marshal *qualifier*. Three separate fields, three renderings, never conflated, **never inferred from Marathi notes by regex**. | They mean operationally different things; a heuristic that merges them prints a wrong chart. |
| 2 | **`बिमा` is an explicit per-assignment field.** It is never carried over on replacement. | Owner's rule; it is a real operational qualifier. |
| 3 | **The clerk chooses every person.** Software calculates, flags, renders. No auto-fill, no suggestion that applies itself. | The whole product thesis. |
| 4 | **No information loss.** Every assignment prints exactly once (currently **212/212**, asserted in `tests/render.test.ts`). Secondary info goes to a detail panel, never the bin. | The paper chart is the legal/operational record. |
| 5 | **`FINALIZED` = immutable snapshot.** An amendment creates a **new version**; `copy-previous` never modifies the source chart. | Enforced by DB triggers. |
| 6 | **PostgreSQL is the single store.** Physical PDF pages are render output, never domain truth. **Never create page-specific tables**, never hardcode page geometry into the domain. | This is exactly the bug that made the older repos painful (duplicated "parallel models"). |
| 7 | **Marathi wraps, never truncates.** Protected tokens are never translated or transliterated: `CCTNS, Dial 112 MERS, DB, MERS, TOTAL, Office, ME`, and the rank codes `PI/API/PSI/PROB_PSI/GPS/ASI/LASI/HC/LHC/PN/LPC`. Canonical spellings: **बिमा** (never विमा), **पोशि** (never पोषि). Devanagari digits are a display transform. | Police text is exact by nature. |
| 8 | **Unfinished features are honest**: labelled `Coming Soon` / `WIP` and disabled — never a half-usable control. | Owner's rule; an explorable placeholder page is wanted, not a bare toast. |

### 4.2 What the owner has explicitly authorized (so you are not violating anything)

- **Sharing this repo — including real personnel data — with you** (2026-10-16, recorded as `OPEN_QUESTIONS` **T31**). *"Use everything real, yeah you can paste, we can use this data and we have permission."* Personnel names, buckle numbers, the real 10/09 chart, the seeded database, screenshots of real sheets: all cleared for this collaboration. Two practical guards the owner would still expect: **do not publish the repo or its data publicly**, and **do not connect to a live database or use a real credential** you may find in the environment.
- **The live demo deployment** may host the station's own 10/09 chart (T23, 2026-10-13, `render.yaml` + `docs/DEPLOY.md`).
- **The transliteration engine must stay local/offline.** This one was *not* relaxed: no cloud API for name conversion.

### 4.3 The stack question (settled in principle, open in detail)

The owner's answer (2026-10-16, T28): *"Yeah react + vite sounds good, or whatever is better for such complex dynamic stuff."* So:

- **React + Vite (or better) for everything clicked** — the owner's explicit pain is the server-rendered HTML + vanilla-JS authoring layer where *"needs reload for every small edit"*. `src/app/` already holds a dormant React 19 + Vite stub (`npm run build:app`).
- **The printed sheet must come from the same design as the screen.** See §7.2 — this is the single most consequential architecture decision left, and the owner has removed the old "server renderer is the print authority" constraint.

---

## 5. Where the project actually stands (16 October 2026, measured)

### 5.1 What works and is verified

| Capability | Evidence |
|---|---|
| Real 10/09 chart renders from Postgres | `npm run dev` → `/charts/2026-09-10` |
| **6 sheets, all ≤ 775 px A4-landscape** | `npm run print:audit` → 655 / 496 / 685 / 663 / 579 / 664 px |
| **212/212 rows lossless** | `npm run render:chart` + `tests/render.test.ts` |
| Suite green | `npm run check` → typecheck + **96 tests** + `doctor` on both DBs |
| Seed shape | `npm run doctor` → ranks 17 · staff 179 · locations 15 · duties 61 · scan cfg 30 |
| Assignment CRUD | `PATCH /api/charts/:date/assignments/:id` (narrow per-field) |
| Chowki block CRUD | `POST/DELETE /api/charts/:date/chowki[/:locationId]` (guards: 409 on finalized; 409 if a charge points at it) |
| Officer box CRUD | `POST/DELETE /api/charts/:date/officer[/:label]` (same guards) |
| Sr-PI support seats (चालक / RTPC / ऑपरेटर) | `POST /api/charts/:date/support`, `DELETE …/support/:id` |
| Rename any of ~185 bound labels | `PATCH /api/charts/:date/labels` (+ per-chart overrides, "फक्त हे / सर्वत्र") |
| Presentation overrides per element (align / vertical / compact / hide) | `PATCH /api/charts/:date/presentation`, restore bar for hidden items |
| **Structure editing** (free tables, add/remove rows & columns, matrix columns, typed cells) | `server/structure.ts`, `PATCH /api/charts/:date/structure` |
| Notices | `server/notices.ts`, `PATCH …/notices/:id` |
| Sign-off values (clerk name etc.) | `PATCH /api/charts/:date/values` |
| Finalize / reopen (amendment version) | `POST …/finalize`, `POST …/reopen`; DB triggers freeze a finalized chart |
| Chrome | identity bar + grouped nav (दैनिक कर्तव्य तक्ते / कार्यवाही / डेटा / समाकलन) + date selector + local login + **EN\|मराठी toggle** + WIP/Coming-Soon flyer pages + a master-data viewer |
| Offline transliteration | `@indic-transliteration/sanscript` (MIT) served from this repo's own `node_modules` via `/vendor/sanscript.js` + a Marathi convention layer; **175/179 seeded names round-trip**; a review strip ("वापरा / रद्द") before anything is written |
| Legacy reference | Kushal's old six-page chart as a separate app on `:3101`, **linked, not re-implemented** (`npm run legacy:start`) |
| Deploy | `render.yaml` (Render blueprint) + `docs/DEPLOY.md` + `npm run demo` / `stop` / `stop:all` |
| Demo deploy boot — **fixed 2026-10-16** | the demo chart the clerk had **finalized** made `db:seed:chart` throw, so the Render start command (`db:migrate && db:seed && npm start`) never reached `npm start` and every deploy failed with *"no open ports detected"* (log: `Error: chart 2026-09-10 is FINALIZED — refusing to reseed a non-DRAFT chart`). `db/seed-chart-1009.ts` now evaluates `PANCHAVATI_KEEP_EXISTING` **before** the non-DRAFT guard, so a populated chart is skipped whatever its lifecycle; verified both ways (skip exit 0 on a FINALIZED chart; a deliberate local reseed still refuses with exit 1). **Do not reorder those two guards.** |

### 5.2 What is broken, ugly or missing (the owner's own list)

1. **The stack**: server-rendered HTML + 110 KB of vanilla JS → full reload for every CSS/JS tweak. The owner hates it and does not want it patched — they want the next build on React/Vite.
2. **The layout**: page 1 overloaded; sheets asymmetric with visible whitespace; three lanes became two moves back and forth (see §6.2); the "कोर्ट, समन्स, वॉरंट व विशेष कक्ष" block overflowed and was pushed down.
3. **The EN↔MR toggle is "clearly broken"** — it is hand-wired as 72 `data-lang` spans in the renderer + 41 in the client flyers, with Marathi still hard-coded in places. Coverage is partial **by construction**.
4. **The float/align control is bad**: *"we currently have a basic maybe broken feature of those layout edits like float left right or centre or up down, but the UI and those buttons are so badly displayed, and very limited options."*
5. **Dynamic layout does not exist**: rows/columns can be added in some places, but blocks cannot be arranged, and there is no notion of saved layout templates.
6. **Transliteration wiring fails in the UI** even though the engine passes its tests.
7. **Page-1/nav clutter**: a "future more chowkis" nav item added by an earlier AI (*"stupid ai added that"*), emoji icons, double English+Marathi labels side by side, dots and em-dashes (*"looks ugly and gives AI vibes"*).
8. **No versions screen, no search page, no master-data editing** (all badged WIP).
9. **The event annex (11/09, Ganapati bandobast, 7 pages)** is not built.

### 5.3 The measured baseline — the numbers you should not have to re-derive

| Signal | Value | Command |
|---|---|---|
| Sheets for 10/09 | **6** | `npm run print:audit` |
| Extent vs 775 px usable (A4 landscape 794 − 19 px pad) | **655 · 496 · 685 · 663 · 579 · 664** | `npm run print:audit` |
| Unused height | **−120 · −279 · −90 · −112 · −196 · −111 px** | derived |
| Fill ratio | 84.5% · **64.0%** · 88.4% · 85.5% · **74.7%** · 85.7% | derived |
| Assignments | **212** (DAY 125 / NIGHT 77), incl. **2** `रिक्त` | DB + `render:chart` |
| Explicit `बिमा` | **10** | DB |
| Closed locations (charge transferred) | **7** | DB |
| Availability rows | **69** | DB |
| Notices | **28** | DB |
| Manpower matrix cells | **240** | DB |
| Officer rows / scan rows | **15** / **12** | DB |
| Dense-sheet body type | **9.5–10 px** (general print guidance ≈ 11–12 pt; the real reader is a phone photo) | CSS + T18 decision |
| Horizontal page overflow | 0 | browser check |

**The layout thesis that falls out of those numbers** (and the one the owner agreed with): a sheet with 36% unused height is not a sheet that needs more content — **it is a sheet whose type could be bigger.** Spend slack on legibility, never on whitespace. And it is now explicitly allowed for the page count to grow: the owner answered *"Yes pls, special event should be handled by our tool, and its ok if the page counts increase — the source 11 Sept also has 7 pages for that Ganapati bandobast."*

---

## 6. The feedback register (everything the owner has asked for, organised)

Source keys: **[B]** = `docs/BACKLOG.md` (has line-level status per item), **[M]** = `mega.txt` line, **[C]** = `chat.json`, **[N]** = the 2026-10-15/16 braindump in this session. Where an item is `DONE` in the current stack, the point is **not** "do it again" — it is "this is what the owner wants, and the new build must not lose it".

### 6.1 W1 — The stack: React + Vite, and no reload-per-edit

- **[N]** *"Current html rendered should be abolished, react is way better I think (or any better suited tool whatever his AI chooses)."* **[N]** *"I hate the current static kinda html js stack, needs reload for every small edit."*
- **What is good and must survive**: the REST API (narrow per-field PATCH, one mutation per action), the domain invariants and their tests, the print measurement gates, the seeded real chart, the legacy link, the deploy setup.
- **Recommended shape**: Vite + React 19 SPA for chrome/editor/preview over the existing API; `tsc --noEmit --watch` beside it (Vite does not type-check); a catalog-driven language system (§6.7); the chart layout itself as **shared components that render both to the screen and to the printed page** (§7.2).
- **Alternatives if you judge them better**: Next.js/Remix (SSR-per-route, heavier); SvelteKit/Solid (smaller, faster, fewer React libs); or stay vanilla but with a proper dev server + HMR. The owner's only firm requirement is *no reload-per-edit* and *modular/dynamic*.

### 6.2 W2 — The chart layout itself (**the top priority**)

This is where the owner wants the most thought. Their words:

- **[N]** *"Currently the chart isn't nicely arranged, bad, not symmetric, whitespace on some pages."*
- **[M] 849** *"Visually clean, stress or clutter free, ai artifacts free, should look like a chart made for efficiency, not fancy UI. I kinda hate the cards for every chart or box, makes double borders. Just divide the page in clean 3 or 4 parts if possible without wasting too much whitespace."*
- **[N]** *"go from top to bottom, optimize everything by theoretically planning and visualizing the entire chart with 10 sept data, see what needs change, plan them."*
- **[M] 2165** *"Page 1 is overloaded… I recently brought कार्यालयीन शाखा व कारकून and कोर्ट, समन्स, वॉरंट व विशेष कक्ष to the front page thinking they can fit… maybe move them back again to page 2."*
- **[M] 837** *"Feels like you are just trying to recreate the current old panchavati 6 page chart… we don't want that, we have already tried implementing the same design 1 to 1."*
- **Historical sequence to respect (a real requirement, not noise)**: page 1 was tried with only day/night → too much whitespace → two more columns were added → the court block overflowed → it moved down → **now three lanes**. The owner wants this class of change to be a *configuration*, not a code edit (§6.3).
- **Two things the owner protects**: (a) the **Sr-PI officer box layout** (main officer centred on top, officers below, then day/night columns) because **an SPI specifically suggested it** — *"sir might be angry saying that why are we going back to the same old format"*; (b) **day and night stay visually comparable** (the source's first three column families are the same for day and night; only the last column differs).
- **The source-of-truth comparison you must do before proposing anything**: compare the mock and the current render against the **original 6-page chart** in `reference/ORIGINAL_VISUAL/` (and the SEMANTIC/EXCEL reconstruction). The owner's benchmark question is *"is this really an improvement over the original or less efficient, ugly? I want honest upgrade on original 6-page stuff."*
- **Recommended method** (this is the loop, not a style opinion): one sheet at a time, real data, measure, change, re-measure — with two extra instruments the repo lacks today: **largest internal gap** and **ink coverage** per sheet. `docs/SITE_OVERHAUL_BRAINSTORM.md` §10.4 has the queue and the target values; `tools/print-audit.mjs`, `tools/print-pages.mjs` and `tools/density-audit-1009.mjs` are the existing instruments.

### 6.3 W3 — Dynamic layout and structure editing

- **[N]** *"Dynamic chart layout would be great… maybe if we can arrange them in app, like drag and drop kinda, dynamic stuff, it will be cool… I genuinely feel like we need some tool or library support to actually get those clean, dynamic, editable movable layout tables and stuff. (if drag and drop is too hard then some alternative)."*
- **[N]** *"some cruds like adding more duties, rows, columns, etc. is not supported."*
- **[B] 4.1–4.4** — the existing half-feature: per-element `horizontalAlign / verticalAlign / compact / hidden` via `presentation_overrides.elements[key]` + `PATCH …/presentation`. **Keep the capability, replace the UI** (owner: the current buttons are *"so badly displayed, and very limited"*).
- **Research verdict (October 2026), summarised** — this is a *print-document layout* problem, not a dashboard problem:
  - **Do not** make absolute x/y/width/height dashboard coordinates the source of truth. Dashboard grids that position absolutely or use transforms are exactly what browsers cannot paginate: `react-grid-layout` issue #589 is the canonical "grid items cut in half across printed pages" report, and Gridstack's own print mode has to convert positioned widgets back into normal flow. `react-mosaic` is a tiling window manager; `tldraw` is an infinite canvas with a production licence key; `GrapesJS` edits HTML/CSS templates; `Craft.js` is a framework you must finish building; `react-dnd` is stale-adjacent.
  - **Recommended model: layout as data over a finite set of slots.** Pages → rows → slots (`left` / `right` / `full`) → block ids, with stable ids, an allow-listed block registry, a `schemaVersion`, and pure tested migrations. Then per-table controls: column presets, show/hide, reorder, row add/remove. Free positions are a *convenience over the slots*, never the layout model.
  - **What "drag and drop" means here (the owner clarified this, 2026-10-16):** **snapping / tiling, not free placement.** Dragging a block to another page or beside another block must make the layout **auto-arrange itself symmetrically and follow the layout rules** — *"like adjusting or tiling windows in Windows 11"* — never put the block at the mouse's precise pixel position. That is not a contradiction of the slots model; it *is* the slots model. The drag is a gesture that resolves to a valid slot arrangement; the arrangement is the data, the pixels are an output.
- **If you want drag**, 2026's live options are **dnd-kit** (MIT, actively developed, but the rewritten cross-framework API — use the new docs, not 2024 tutorials), **Atlassian pragmatic-drag-and-drop** (Apache-2.0, headless), or **Puck** (MIT, ~0.23, an embeddable visual editor for your own React components) if you want a real page-builder experience. **Gridstack 13.1+** is the only one with first-party print handling, but its print mode deliberately abandons pixel-exact packing. Whichever you pick, the drop targets are slots and the result must be a valid tiling.
  - **Always provide a non-drag alternative**: named presets/templates ("Standard", "Event day"), move-up/move-down buttons, and CSS-grid-area slots. NN/g's own guidance is that drag-and-drop is imprecise; a move-earlier/later control is more usable for reordering.
  - **Templates ≠ instances**: a saved *template* defines the structure; a *dated chart* is an instance with the clerk's real assignments. Applying a template must preview what changes and never silently overwrite a finished day. This is exactly the separation Planday/When I Work make and it is what this station needs daily.
- **File to read first**: `server/structure.ts` + `PATCH /api/charts/:date/structure` already implement free tables, row/column add-remove, matrix columns and typed cells. That is the seed for the general editor.

#### Also required: menu-driven CRUD *pages* (not only in-place editing)

A second owner (Durvesh) asks for **separate, menu/nav-reachable pages for adding, updating and deleting duties, officers and the rest** — the pattern he has in his own repo's navbar, and the "master data" + CRUD surfaces that existed in the Arjish and Kushal repos. In-place editing on the chart is the daily path; the **menu pages are the management path** (a table per entity: list, search, create, edit, deactivate, with an in-use guard). Both are wanted; neither replaces the other. Logged as **T35**.

### 6.4 W4 — CRUD completeness ("zero → full chart → zero")

- **[N]** *"Focus on everything crudable, editable, layout changable in site or app only, so a strong table or chart editor with their own police data or db support… Everything that can be added, also can be deleted, updated, read. So we can go from zero to full chart to zero and empty again."*
- **[B] 3.6** is the open audit item: *"Audit **every** rendered element for CRUD: section headings, column titles, role labels, time windows, chips, notices."*
- **Recommended interaction grammar** (from the Oct-2026 practitioner research; the repo's `docs/DESIGN_INTERACTION_NOTES.md` already matches it, keep it):
  | Task | Pattern |
  |---|---|
  | Toggle a qualifier (बिमा), edit a short independent value | inline |
  | Pick / replace / clear the person in a seat | **searchable picker anchored to the seat**, seat stays visible, keyboard arrows + Enter + Escape; a separate **clear** action |
  | Create a staff member | inline mini-form inside the same popover; **create-and-place** in one action, stated in words ("नवीन कर्मचारी जोडला व जागी बसवला") |
  | Close a location (बंद) + charge | dialog/popover with a **required typed reason** — never a default, never a preselection; block commit while empty |
  | Add a row / column / block | explicit table action, insert, focus the new item, undoable |
  | Anything destructive or consequential | confirm + undo, never silent |
- **Save model**: explicit document-level save with a visible dirty state (this document is a *set of linked edits*, not independent fields); a navigation guard with Save / Discard / Stay; "Save and print" as a first-class path; autosave only if you also give a persistent save-state and retry. GitLab's design guidance (manual save by default for form-like documents) and NN/g both land here.
- **Undo must cover structural changes**, not just cell edits: replace person, clear seat, toggle बिमा, close location, add row, add column, delete box. Give actions labels ("Undo: clear seat 4"). Note the trap AG Grid documents: sorting/filtering clears its edit-undo stack, so a grid's built-in undo is not your domain history.
- **`रिक्त` vs empty**: the owner's rule from an earlier round — an empty/रिक्त row may be *hidden* per element for compactness, **but never dropped from the document or the no-loss ledger**.

### 6.5 W5 — Site chrome

- **[N]** *"Site UI should be overhauled, consistent design, simple, logical, no unnecessary clicks like that arjish's hamburger menu. I kinda like my current navbar (can be better arranged and some stuff like future more chowkis can be removed from it, stupid ai added that). I also like the secondary navbar for specific pages like chart preview and editor. Also like our old export button from Kushal's repo which expanded into png, pdf, etc."*
- **[M] 2162** the identity bar must stay **persistent and consistent** (daily use), with the logo + महाराष्ट्र पोलीस / पंचवटी पोलीस ठाणे / नाशिक शहर lockup; **page-specific things (DRAFT tag, edit, print) belong in the second bar**, not the main header.
- **[M] 2164** *"hate the double english marathi thing, use the eng to marathi toggle in the navbar"*; **no emoji icons** (*"goofy"*) — remove/replace them with something better.
- **[M] 3007 / [M] 2165** no `·` dots, no em-dashes (*"looks ugly and gives AI vibes"*).
- **[B] 1.1** dropdowns open **on click only**, never on hover; **1.3** the date selector lists आज / उद्या / मागील ७ दिवस / जुने तक्ते (already ported from Kushal's/Arjish's picker — T20 resolved, the reference file is named in `OPEN_QUESTIONS`).
- **Export menu**: the old Kushal-repo button that expands into PNG / PDF / print is the model. Recommend: Print (A4 landscape, 6 or 7 sheets), Save as PDF, Save sheet as PNG, plus a future WhatsApp send (badged).
- **Nav grouping** (from **[B] 5**): Dashboard · दैनिक कर्तव्य तक्ते (→ पृष्ठ १–६ + इव्हेंट अॅनेक्स) · कार्यवाही (कार्यकारी डॅशबोर्ड / कर्तव्य फलक / बंदोबस्त व विशेष मोहीम / ऐतिहासिक शोध) · डेटा (मास्टर डेटा / दस्तऐवज आयात OCR / जुने तक्ते / अहवाल व PDF निर्यात) · समाकलन (WhatsApp / Telegram / इतर ठाणी / टेम्पलेट बिल्डर) — every older feature visible with an honest badge.

### 6.6 W6 — Multiple chart templates/formats

- **[N]** *"Multiple table formats or templates can be saved, their menus, browsing etc all UI neatly planned and brainstormed first."*
- **Recommended model**: `chart_templates` (structure + column presets + block placement + labels, versioned) vs `charts` (a dated instance). Template menu: list, preview (thumbnail + differences), apply (with a preview of what will change), duplicate, save-as, archive. Applying to a non-empty chart offers merge / replace / add — explicitly, never silently.
- **[B] `तक्ता टेम्पलेट बिल्डर`** is currently a Coming-Soon leaf — this workstream is what un-badges it.

### 6.7 W7 — Language: chart always Marathi, chrome English

Owner's answer (2026-10-16, T27): *"UI default in english (optional marathi toggle, but if we add, we have to make sure turn every text in every UI, popups, etc to marathi also), chart in marathi."*

- **Decided**: chrome defaults to **English**; a Marathi chrome toggle is **optional**; the chart itself and all chart data stay **Marathi, always** — *including in print*.
- **The hard consequence, and it is the owner's own rule**: if the toggle exists it must be **complete** — every nav item, toolbar button, flyer, popover, table header, empty state, error message, tooltip and aria-label. A partial toggle is exactly the "broken" state being complained about. **Recommended: ship the chrome English-only with no toggle until coverage is 100%**, then enable it; or build the catalog first and never ship a half-wired one.
- **Three text authorities, keep them apart**: (1) **chrome strings** — EN is the source, MR the translation, in one catalog (compile-time-keyed, e.g. `typesafe-i18n` MIT ~1 kB, or `i18next` if ecosystem matters more); (2) **chart presentation text** (section titles, role labels, column heads, sign-off) — Marathi on the sheet, tooltips may carry the full form, stored in Layer C (`template_versions.labels` / `charts.presentation_overrides`); (3) **chart data** (names, notices, duties, matrix values) — Marathi source text, never translated, never silently transliterated.
- **Protected tokens never translate** (§4.1 #7). Devanagari digits are a display transform. `<html lang>` should be `en` for the chrome while the sheet container keeps `lang="mr"`.
- **Open** (T22.1): whether chart-local text (element names, notice lines, free-table titles) gets a *stored* English twin. Today the Latin field is an entry aid only. Do not decide silently.

### 6.8 W8 — Transliteration, done properly

- **[N]** *"that eng to mar and vice versa is clearly broken"*; **[N]** *"for the tools we will have to use like react tables or some eng to marathi or vice versa names conversion library, free or open source is preferred, we don't want our data going out to that library cloud or something for name conversion."*
- **Already true**: `@indic-transliteration/sanscript` (MIT, pure JS, offline, already a dependency) + a documented Marathi convention layer (word-final virama dropped; nasal+virama → anusvara; doubled nasal stays a conjunct; Devanagari→roman drops the word-final inherent 'a'; anusvara folds to 'n' only before a stop; capitals keep their ITRANS meaning; digits/punctuation pass through; protected tokens excluded). Measured **175/179** seeded names round-trip; the four exceptions are documented source oddities. Reviewed in `tests/authoring.test.ts`.
- **What is broken is the wiring, not the engine**: coverage/hand-off in the UI. **Recommended**: one component (`BilingualField`-style) used everywhere, a review strip before anything is written, both fields always editable, and no silent overwrite.
- **Do not use** AI4Bharat's `@indic-transliterate` default mode — it calls a cloud endpoint. A local IndicXlit model would be a separate project. Aksharamukha's JS licence is unverified — avoid until settled.
- **Open** (T22): anusvara vs न्; whether uppercase T/D/N/L/S stays the retroflex convention or the clerk gets a ट/ड/ण/ळ picker; which field is canonical when both are typed.

### 6.9 W9 — Print and export as a first-class feature

- A4 landscape, zero margin, one fixed page container per sheet (1122 × 794 px, 19 px bottom padding), chrome/popovers/hidden elements excluded, sheet labels visible, no browser-added headers/footers, **page count exactly 6 for 10/09** (7+ allowed when an event annex exists), every row present.
- **Acceptance is a command, not a rendering**: `npm run print:audit` (each sheet ≤ 775 px) + `npm run render:chart` (212/212). Whatever you build, keep a machine-checkable version of this.
- **Tell the clerk about the browser print dialog** (paper A4, landscape, background graphics ON, headers/footers OFF) — and do not promise CSS can suppress browser headers (it cannot, reliably).
- **PNG/PDF export** for the WhatsApp workflow; the export menu is a real screen, not a toast.

### 6.10 W10 — The legacy/source comparison surface

- **[M] 837** the old six-page chart stays in the site *for reference and comparison* — **but not** as two big charts side by side (*"seems kinda goofy, eh bad"*). Today it is a separate linked app (:3101). Decide whether it stays a link or becomes a read-only comparison view.

### 6.11 W11 — Deferred features the owner wants kept visible (and easy for you to restore)

OCR import, WhatsApp/Telegram, dashboards, duty board, बंदोबस्त, historical search, master-data editing, multi-station, template builder, event annex. All are badged. The owner notes *"he can restore those OCR and WhatsApp thingies pretty quickly as he only made those in that repo (its his) in the first place"* — so treat the Arjish repo as the source for those, not this one.

### 6.12 W12 — Learn from analogues (the owner's own suggestion)

*"Maybe his AI can also research about existing similar sounding tools like school timetable manager or something, maybe helpful to study their architecture, UI, etc."* — Done, and the findings are worth using:

- **aSc TimeTables** is the closest manual-editing model: cards picked up and placed into positions that the app marks **OK / occupied / questionable / unavailable**, allowing a doubtful placement *but flagging it*, and prompting to resolve collisions. That is exactly this app's contract: **human places, software flags**.
- **FET** (AGPL) generates automatically — not the workflow, but its print/CSS approach is worth a look; **FET edit+print** (MIT) is a small manual card-editor with warnings and undo/redo, closer to what we need; **UniTime** (Apache-2.0) is a large change-management study.
- **When I Work / Planday / Deputy**: copy-a-day with explicit conflict policies (allow / avoid / overwrite / move-to-open), day/week templates distinct from dated schedules, open-shift (vacant) states, bulk updates, and shift history. **Copy-previous with a review step, never silent.**
- **Police-specific:** CopMap and PolicePAD (India) exist but could not be verified behind logins; both advertise *automatic* assignment, which is the one thing we must not copy. No public reference implementation of "one clerk manually fills a printed chart" was found.
- **Hacker News on scheduling tools:** paper and spreadsheets win because they are flexible; the hard part is **making coverage gaps visible without becoming an overcomplicated rules engine**. That is the design brief for our dashboard/flags in one sentence.

---

## 7. Architecture guidance (options, with a recommendation)

### 7.1 What to keep, what to replace

| Surface | Verdict | Why |
|---|---|---|
| PostgreSQL schema (8 migrations) + the seeded real 10/09 chart | **Keep** | It is the source of truth and it is clean: `charts`, `assignments`, `location_states`, `availability`, `chart_notices`, `manpower_cells`, `shift_summaries`, `officer_summary`, `scan_schedule`, `sudden_changes`, `events`, `staff_masters`, plus Layer-C template/override tables. No page-specific tables, freeze-on-finalize triggers. |
| REST API | **Keep and extend** | Narrow per-field PATCH; one mutation per user action; no "save everything" endpoint. New UI consumes it. |
| `ChartDocument` projection | **Keep** | It is the contract between DB and UI; field names are documented in `docs/UI_HANDOFF_BRIEF.md` §2. |
| Server-rendered chrome + `web/chart-authoring.js` | **Replace** | The 110 KB vanilla-JS layer is the thing being abolished. |
| The *chart layout* rendering | **Re-architect, don't discard** | See 7.2 — the geometry knowledge (band structure, print density rules, the three lanes, the density fixes) is valuable; the implementation should become React components. |
| Invariants + tests + `print:audit` + `doctor` | **Keep, retarget** | They are the only objective graders this project has. Retarget them at the new render path. |
| Visual system (navy/white/blue/red/yellow semantics, flat CSS, dense tables, no cards for chart content) | **Keep the grammar, you may restyle** | `COMPACT_V4_DECISIONS.md` records what was tried and rejected. `design/panchavati-compv3.*` is a historical reference. |
| Tailwind/shadcn | **Optional, not a requirement** | The project deliberately prints from flat CSS. If you adopt a utility system, make sure the printed stylesheet is still deterministic. |

### 7.2 The one decision to make early: one layout, two renders

The owner removed the old constraint: the print output must look like **whatever optimised design you build**, not like the old server renderer. That leaves three honest options:

| Option | How | Consequence |
|---|---|---|
| **A (recommended) — one React layout, rendered twice** | The sheet components are shared. The screen renders them client-side; `/print/:date` renders the *same components* server-side (`renderToStaticMarkup`) into a paginated A4 document, which the browser prints or a headless Chromium turns into a PDF. | One geometry to maintain; `print:audit` retargets at the server-rendered HTML; 212/212 and ≤775 px stay machine-checkable. Requires the components to be SSR-safe (no `window` at render time). |
| **B — React print view + client print CSS** | A dedicated print route in the SPA with `@page` + per-sheet containers + `break-inside`, printed from the browser (or `react-to-print`). | Fewer moving parts, but pagination and measurement now depend on the browser at print time; you must keep a headless check. |
| **C — two implementations** | React on screen, the old server renderer for print. | **Rejected** — the owner explicitly does not want this, and it is how the two drift apart. |

Whichever you pick, the *non-negotiable* part is the **grader**: something that, on the real 10/09 data, prints the sheet count, per-sheet extent, fill ratio and row parity. Extend `tools/print-audit.mjs` or write its successor.

### 7.3 The screen/editor architecture that fits this data

```
PostgreSQL
  ↓
Fastify REST API            (narrow PATCH, one mutation per action, 409 on finalized)
  ↓
ChartDocument               (one projection, Md + En-free: chart data stays Marathi)
  ↓
React app (Vite, HMR)
  ├── ChartEditor      — the six sheets as editable components (block registry, slots)
  ├── Editor overlays  — picker, create-staff, close-with-reason, rename, structure, undo
  ├── Chrome           — identity bar, grouped nav, second bar, date selector, export menu
  ├── MasterData       — staff / ranks / duties / locations / units / templates
  └── PrintPreview     — the same sheet components, paginated, measured
  ↓
Print path (option A/B above) → paper / PDF / PNG
```

Rules the current code already follows and that are worth keeping: the client never queries Postgres directly and never re-implements a domain rule; one user action = one API call; a finalized chart refuses writes with 409; nothing is inferred from Marathi note text.

### 7.4 Layout as data (the model to adopt for §6.3)

```ts
type LayoutTemplate = {
  schemaVersion: number;
  id: string; name: string;
  page: { size: "A4"; orientation: "landscape"; count: number; padPx: 19 };
  blocks: Array<{
    id: string;                      // stable
    type: "dutyTable" | "chowkiGrid" | "officerBand" | "court" | "notices"
        | "manpower" | "summary" | "scanSchedule" | "freeTable" | "signOff" | ...;
    props: Record<string, unknown>;
    table?: {
      columnSetId: "compact" | "standard" | "wide";
      columns: Array<{ id: string; visible: boolean; order: number }>;
    };
  }>;
  pages: Array<{
    id: string;
    rows: Array<{ id: string; slots: Array<{ id: "left" | "right" | "full"; blockId: string | null }> }>;
  }>;
};
```

Validate it at runtime; version it; give it pure migrations (`v1 → v2 → v3`); store it in Postgres with an owner, a name and a revision; render print from the semantic model — **never from stored HTML or a library's DOM state**.

---

## 8. Traps already paid for (so you don't pay again)

1. **The mock lied.** `design/panchavati-compv3.html` fits every page on one A4 sheet **only because its sample data is smaller than the real chart**. With the real 212 assignments it needed a density pass, extra columns and a different sheet split. **Never design, prompt a design tool, or judge a layout on mock data.** Use the real 10/09 chart.
2. **Absolute positioning and print do not mix.** Dashboard grid libraries position with coordinates/transforms; browsers paginate normal flow. Keep the print representation in flow, or render it separately.
3. **Never print a virtualised table.** Only the visible rows are mounted — you will print a subset. If you virtualise the editor, print from the data.
4. **Drag-and-drop is not a layout model.** Constrain it to slots, always ship a non-drag alternative, and never let a drag write arbitrary geometry.
5. **Don't infer operational meaning from Marathi notes.** `बिमा`, `रिक्त`, `बंद` and charge destinations are explicit fields. A regex over `remarks_mr` is forbidden by the project's hard rules.
6. **Don't send a typed name to a transliteration cloud API.** The engine must stay local (Sanscript is already vendored from this repo's own `node_modules`; `/vendor/sanscript.js` — no CDN).
7. **Copy-previous must never mutate the source chart**, and finalize must never be silently reversible. Amendments are new versions; DB triggers enforce it.
8. **Never create page-specific tables or hardcode page geometry into the domain.** That mistake is why the older repos hurt.
9. **Tests passing does not mean the UI works.** A load-time `SyntaxError` in the client script once killed all chrome while every test was green. Leave a real browser check in the loop (the repo has `tools/print-pages.mjs` screenshots for exactly this).
10. **Don't "fill" whitespace with content.** Rows may be hidden per element for compactness but never dropped; and invented content is worse than slack.
11. **Aesthetics are a requirement here, not polish.** Explicitly disliked: emoji icons, `·` dots and em-dashes, double EN+MR labels, card-per-box double borders, hamburger menus, "generic AI dashboard" look, KPI tiles, generous whitespace. Explicitly liked: the persistent identity bar, the second per-page bar, the grouped nav, the rich date selector, Kushal's expanding export button.
12. **Page 1 is a political document.** The Sr-PI layout came from an SPI's suggestion. Restructuring it back into "everyone in one table" risks an angry senior officer — keep the emphasis on the important people while making it denser.
13. **Do not silently "improve" Marathi text.** Spelling is canonical (`बिमा`, `पोशि`), the source PDFs outrank everything, and ambiguous text gets recorded as an open question instead of guessed.

---

## 9. Questions we would like you to ask us (with our recommended answers)

Ask these before finalising your design — the owner prefers being asked to being guessed at, and each one changes real code. **Six were answered on 2026-10-16 (see §10b); the rest still stand.**

| # | Question | Recommended answer |
|---|---|---|
| Q1 | **Page count**: is 7 sheets acceptable on a busy normal day if it buys clearly larger type, and should sheet boundaries follow content or a fixed section-to-sheet map? | Yes to 7 when the content needs it (owner already agreed; the source 11/09 chart has 7 for the Ganapati bandobast). Prefer a **stable section-to-sheet map** so the clerk's muscle memory survives. |
| Q2 | **Which sheets to redesign first?** Measured slack says sheet 2 (64% full) → sheet 5 (75%) → sheet 1, but the owner said "top to bottom". | Follow the owner: **top to bottom, planning the whole chart first**, then optimise in that order — but use the slack numbers to decide *how* each sheet changes. |
| Q3 | **Print architecture**: one React layout rendered server-side for print (option A), or a React print route printed from the browser (option B)? | **A** — one geometry, one grader, no drift. |
| Q4 | **Layout editing**: slots + presets + move buttons (no free drag), or real drag-and-drop on top of slots? | Slots + presets + move buttons **first**; add drag as a convenience later if the clerk still wants it. |
| Q5 | **Templates**: does a saved template include labels/columns/block placement only, or also default assignments? | Structure + labels + column presets + placement. **Never default people** (that would cross the no-auto-assignment line). |
| Q6 | **Marathi chrome toggle**: ship English-only until coverage is complete, or ship the toggle with partial coverage badged? | **English-only until 100% coverage**, then enable. A partial toggle is the bug being fixed. |
| Q7 | **Save model**: explicit save with a dirty guard, or autosave per field? | **Explicit** document save + dirty guard + "save and print". Autosave only with a persistent state indicator. |
| Q8 | **Undo scope**: how far back, and does it survive save/navigation? | Document-level undo covering structural ops, labelled actions, cleared on save; keep a server-side version history separately. |
| Q9 | **`रिक्त` rows**: hide-when-empty per element is already a feature — should the *default* be hidden for known-empty optional rows (RTPC/ऑपरेटर)? | Offer it as a per-element switch, **default off** (hiding is a decision the clerk makes), and never hide a row from the no-loss ledger. |
| Q10 | **The legacy comparison**: keep it a separate linked app, or build a read-only comparison surface? | Keep the link (cheap, honest); revisit only if the clerk asks for side-by-side. **No two-charts-side-by-side layout** (explicitly disliked). |
| Q11 | **Event annex (11/09)**: should it be a first-class chart kind with its own extra sheets, or an add-on section? | A first-class annex attached to a date, adding its own sheets; the source has 7 pages for that day and the owner wants the tool to handle it. |
| Q12 | **Master data**: who may create/deactivate a person, and what happens to charts that reference them? | Deactivation never deletes history; an in-use guard names the affected charts; search across finalized charts comes later (T24 requires reading Kushal's `HistoricalSearchView.tsx` first). |
| Q13 | **Auth**: real login now or keep the local pseudo-login? | Keep the pseudo-login for now (owner: *"real auth is explicitly deferred"*); do not build auth before the chart is done. |
| Q14 | **Notifications/integrations**: WhatsApp/Telegram are badges — wire them or leave them? | Leave badged. If wired later, they must run from the station's own machine with the owner's explicit approval (the runtime makes no outbound calls today). |
| Q15 | **What can you change without asking?** | Everything *inside* this repo that does not break §4.1, move `reference/`, or edit an applied migration. Ask before deleting a working surface or changing the database in a way that would lose the seeded chart. |
| Q16 | **Where should your output land?** | Code in this repo, decisions recorded in `docs/OPEN_QUESTIONS.md` + `docs/CURRENT_STATE.md`, and any deviation from `docs/` surfaced rather than silently applied. |

---

## 10. Already decided — do not re-litigate without a reason

| # | Decision | Date | Source |
|---|---|---|---|
| 1 | The owner (Kushal/Durvesh) is the product authority; the clerk is the only personnel decision-maker | always | `AGENTS.md` |
| 2 | Marathi-first chart, Unicode (never Kruti Dev); the sheet always prints Marathi | 2026-10-06 → | `AGENTS.md`, T27 |
| 3 | **Chrome defaults to English; Marathi chrome is an optional toggle that must be complete; the chart stays Marathi** | 2026-10-16 | T27 |
| 4 | **React + Vite (or better) for chrome/editor; no reload-per-edit; and the print must come from the same optimised design** | 2026-10-16 | T28 |
| 5 | **Real data may be shared with you, incl. personnel; you are the working AI** | 2026-10-16 | T31 |
| 6 | **Layout work goes top-to-bottom over the whole chart, planned theoretically first, on the real 10/09 data** | 2026-10-16 | T30 |
| 7 | **Page count may exceed 6 when content needs it; event days get annex sheets; the tool must handle the 11/09-type annex** | 2026-10-16 | T30 |
| 8 | Dense-table layout: the source's per-session cards for the scan schedule, one card per court heading for the court register (option A/A) | 2026-10-13 | T21 |
| 9 | The date selector copies Kushal's repo implementation (named file in `OPEN_QUESTIONS` T20) | 2026-10-13 | T20 |
| 10 | Finalized = immutable; amendments are versions; copy-previous never mutates the source | — | `AGENTS.md` + DB triggers |
| 11 | Transliteration engine = Sanscript + a documented Marathi convention layer, local only, review strip before write | 2026-10-13 | T22 |
| 12 | The legacy six-page chart is a *link*, not a re-implementation | 2026-10-13 | T19 |
| 13 | The demo deployment may carry the real 10/09 chart | 2026-10-13 | T23 |
| 14 | `design/panchavati-compv3.*` is a historical visual reference, **not a frozen baseline** | 2026-10-15 | owner |
| 15 | Nothing is auto-scheduled; analytics dashboards / KPI tiles / hero sections / card-per-box / emoji chrome / dots and em-dashes / hamburger menus are rejected on sight | 2026-10-06 → | `AGENTS.md`, mega.txt |

### 10b. Answered in the follow-up round (2026-10-16, later the same day)

| # | Question | Outcome |
|---|---|---|
| A1 | What goes to the receiving AI | **Everything** — minus `node_modules` in every repo and the temp files (the cleanup was performed on this checkout). |
| A2 | First milestone | **Your call.** React (or better) preferred; *starting by optimising the chart layout while implementing it in a clean React build* is explicitly fine — *"the chart is the priority right now"*. Brainstorming first is welcome. |
| A3 | Print architecture (**T32**) | **Your call** — options A/B/C are in T32. |
| A4 | Layout editing (**T34**) | **Slots + presets + move controls, and drag that SNAPS** — see the clarification in §6.3: a dragged block must auto-arrange symmetrically per the layout rules, never land at the mouse's pixel position. |
| A5 | Marathi chrome toggle (**T33**) | **Build the catalog first, then ship the toggle complete.** |
| A6 | The old server-rendered authoring layer | **Your call.** |
| A7 | Which repo the new build lives in | **Your call.** |
| A8 | Menu-driven CRUD pages (**T35**, raised for Durvesh) | **Required** — separate menu-reachable pages for add/update/delete of duties, officers and the rest, in addition to in-place chart editing. |
| A9 | The demo deploy that was failing | **Fixed here on 2026-10-16** (seed guard order) — see §5.1. Deploy it again and it boots. |

---

## 11. How to work with us

- **Verify with commands, not vibes.** The repo's gates are `npm run check` (typecheck + tests + doctor ×2 DBs), `npm run print:audit` (per-sheet extent), `npm run render:chart` (row parity), plus a real browser pass. Whatever you replace, leave an equivalent grader behind. A green suite never proved the UI worked here (§8.9).
- **Authority order** (§2) — reference PDFs beat `docs/`, and `docs/` beats your inference. When you must contradict a document, say which one and why.
- **Ambiguity is recorded, not resolved.** `docs/OPEN_QUESTIONS.md` is the project's honesty ledger (N-series = needs a subject-matter person; T-series = technical/product). Add to it rather than guessing Marathi text, semantics or operational meaning.
- **Document what you decide.** Keep `docs/CURRENT_STATE.md` (what actually works, with verification status) and the doc headers (`Purpose / Current role / Last meaningful change / Constraint`) current. The owner has had to re-explain context across several AIs; every artifact you write is insurance against that.
- **The owner's working style**: sends numbered feedback lists with screenshots and live-DOM observations; checks things in the browser immediately; wants small verifiable steps, honest status, no half-features; dislikes emoji/AI-vibe aesthetics; prefers free/OSS and local-first tools; will overrule you with the station's real-world constraint (a senior officer's preference, a printer's behaviour) and expects that to win.
- **Never modify `reference/`.** Never edit an applied migration — add a new one.

---

## 12. Packaging (what to send, what to strip)

The checkout runs to ~900 MB because it carries the reference corpus **and** the nested repos on top of the code. For a hand-off bundle, keep the code, docs and reference corpus; strip the generated/duplicated weight (**this cleanup was performed on 2026-10-16**: `node_modules` and the temp files are gone from this checkout, so reinstall with `npm ci` before running anything):

```bash
# from the folder that CONTAINS the project folder
zip -r panchavati-handoff.zip "<project folder>" \
  -x "*/node_modules/*"  "*/.git/*"     "*/dist/*"     "*/dist-app/*" \
  -x "*.tmp-*"           "*/.tmp-preview/*" "*/.tmp-xlsx/*" \
  -x "*/panic-*/node_modules/*"
```

| Item | Size | Send? |
|---|---|---|
| `docs/` (31 files), `server/`, `web/`, `db/`, `src/`, `tests/`, `tools/`, `skills/`, `scripts/`, `design/` | ≈ 2 MB total | **Yes** |
| `reference/` — original PDFs, Excel reconstruction, SEMANTIC (source authority) | 54 MB | **Yes** (it is the ground truth for chart content) |
| `DailyDutyPanchavati-ui-rebuild/` — *your* earlier repo + Kushal's archive | large | **Optional.** You built it — if your environment already has it, strip it and tell us which parts to cherry-pick. Keep the archive (`…/NEW DATA/kushals repo/archive/`) if you need the north-star docs. |
| `chat.json` (raw owner↔AI log) | 21 MB | Optional; **§6 already distils it**. |
| `mega.txt` (owner's messages) | 0.1 MB | Yes, cheap and it is the owner's own voice — but grep, don't read. |
| `pdfs.zip` | 13.7 MB | Redundant with `reference/`. |
| 52 `.tmp-*` working files + `dev-server.log` + `current_cmd_output.txt` | ~2 MB | No — deleted from this checkout on 2026-10-16. |
| `node_modules/` | ~101 MB here | **No** — `npm ci` restores it. |

Also in the bundle, unmissable: this file, `docs/UI_HANDOFF_BRIEF.md`, `docs/SITE_OVERHAUL_BRAINSTORM.md`, `docs/CURRENT_STATE.md`, `docs/BACKLOG.md`, `docs/OPEN_QUESTIONS.md`, `AGENTS.md`.

---

## 13. Appendix — the repo at a glance

### 13.1 Where the truth lives

| Question | Authoritative source |
|---|---|
| What does the printed chart look like? | `reference/ORIGINAL_VISUAL/*.pdf` (Tier 1) |
| Exact cell text | `reference/EXCEL_RECONSTRUCTION/` (Tier 2 — Page 1 only, 10/09 + 11/09) |
| Secondary text evidence | `reference/SEMANTIC/` (Tier 3, ~1% error) |
| What should the software do? | `docs/` |
| What does it actually do? | the code + `npm run check` |
| What is still undecided? | `docs/OPEN_QUESTIONS.md` |
| What did the owner ask for? | `docs/BACKLOG.md`, `mega.txt`, `chat.json` (and §6 above) |

### 13.2 Key files

| Path | What |
|---|---|
| `server/index.ts` | Fastify: REST API + the server-rendered chart |
| `server/render/chart-html.ts` | the current renderer (≈1,265 lines) — the geometry knowledge to port |
| `server/chart-document.ts` | DB → `ChartDocument` projection |
| `server/structure.ts`, `server/notices.ts`, `server/assignments.ts`, `server/finalize.ts` | the CRUD/domain services |
| `web/authoring.css` | the dense print + screen CSS (the real tinkering surface) |
| `web/chart-authoring.js` | ≈110 KB vanilla-JS editor — the thing being replaced |
| `src/app/` | dormant React 19 + Vite stub (`npm run build:app`) |
| `db/migrations/0001–0008`, `db/seed-chart-1009.ts` | schema + the real chart seed |
| `tools/print-audit.mjs`, `tools/print-pages.mjs`, `tools/density-audit-1009.mjs` | the measuring instruments |
| `tests/` (8 files, 96 tests) | invariants, render fidelity, no-loss, authoring/transliteration |
| `skills/` | the project's own method packages (source-forensics, db-change, current-chart-ui, print-check, verify-slice, session-handoff, event-annex) |
| `design/panchavati-compv3.html` + `compv3.css` | the original mock (reference, not baseline) |
| `docs/UI_HANDOFF_BRIEF.md` §7 | 10 paste-ready prompts (P0–P9) for UI-generating AIs |

### 13.3 The commands

```
npm run dev            # server + chart, LOG_LEVEL=warn
npm run check          # typecheck + tests + doctor on both DBs   ← the main gate
npm run print:audit    # per-sheet A4 extent (6/6 must fit)
npm run render:chart    # lossless render, row parity (212/212)
npm run doctor         # seed shape + health checks
npm run build:app      # builds the dormant React stub
npm run legacy:start   # Kushal's old six-page chart on :3101
npm run demo / stop / stop:all
```

---

*Written 2026-10-16 by the previous AI lineage for the receiving AI. If you change a conclusion in here, change the document — the next hand-off inherits it.*
