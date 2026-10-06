<!--
Purpose: Screen-level UX specification for the Panchavati daily duty system.
Current role: Bridge between ARCHITECTURE.md and implementation; the UI truth the coding agent must follow.
Last meaningful change: Created 2026-10-06 (Phase 1 UI/UX pass) from the approved compact-v2 mockup, its live React profile, the SPI critique and the six contract MDs.
Constraint/dependency: Implements ARCHITECTURE.md + DOMAIN.md; never overrides them. Ambiguities resolve to OPEN_QUESTIONS.md, never to invented behavior.
-->

# UI_SPEC — Panchavati Daily Duty System

Status: **proposal for approval** (Phase 1). Grounded in:
- `reference/Kushal_compact_chart_critique.md` (SPI's fix list, some items already applied in the live profile)
- The approved compact-v2 mockup (`durvesh_pass_antigravity_updated_2026-09-29-compact-chart-v2-mockup.html`) — inspected in browser
- The live React implementation (`/api/charts/:id/print?profile=standardized_compact_v2`, `/duty-board/:date`) — inspected 2026-10-06 on port 3000
- The six contract MDs (INITIAL_AUDIT, ARCHITECTURE, DOMAIN, OPEN_QUESTIONS, TRACEABILITY, CURRENT_STATE)

Key verified facts this spec builds on:
- The compact-v2 **print profile** (5 landscape pages: Sr-PI box + officer grid + day/night core → 6-chowki day/night matrix + office/court desks → leave + court/bandobast → manpower + shift summary/ledger → officer summary + scan schedule + signatures) is the **approved visual direction**.
- The existing **duty-board screen** is the generic-dashboard anti-pattern (KPI cards, global filters, empty admin states). It is explicitly **not** the model for the new editor.
- Dev-DB charts currently render as all-रिक्त (unseeded fixture); the mockup holds the real 10/09 data. Data presence, not UI, is the difference.

---

## 1. Product principles

1. **The clerk edits the chart itself** — a digital duty register, not CRUD forms over database rows.
2. **Chart, not infographic.** Dense but readable; official operational-document aesthetic (landscape command board); color only with meaning.
3. **Information coverage ≠ visual simultaneity.** The compact board carries deployment truth; everything else lives in collapsible secondary panels.
4. **Human chooses.** Every picker suggests; nothing applies itself. No auto-fill, no auto-replace, no smart defaults beyond copy-previous.
5. **Marathi-first, wrap-never-truncate.** Devanagari digits are a display transform; protected tokens (CCTNS, Dial 112 MERS, DB, MERS, rank codes, TOTAL, Office, ME) stay Latin/verbatim.
6. **States are labeled, not just colored.** Grayscale-safe redundancy: text + shape first, color second.
7. **Unfinished = "Coming Soon" + disabled.** No half-usable controls.
8. **One mental model across screen and print:** the screen editor and the print packet are two views of the same ChartDocument.

## 2. Navigation

Fixed minimal nav (all screens, persistent top bar):

```
आजचा तक्ता | दैनिक तक्ते | शोध | मास्टर डेटा        [Coming Soon: सूचना पाठवणे, वापरकर्ता व्यवस्थापन]
```

- Left: station identity (पंचवटी पोलीस ठाणे · नाशिक शहर). Right: date/lifecycle context when a chart is loaded.
- No hamburger, no nested menus, no settings screens. Master data is the only "admin" surface and it is deliberately plain.
- Deep-linkable URLs: `/today`, `/charts`, `/charts/:date` (editor), `/charts/:date/print`, `/search`, `/master/:entity`.

## 3. Screen inventory

| # | Screen | Purpose | Priority |
|---|---|---|---|
| S1 | आजचा तक्ता (Today/Home) | "What is today's chart?" + actions | P0 |
| S2 | Chart Editor | Document-style authoring of the compact board | P0 |
| S3 | Staff picker (+ mini-create) | Contextual personnel selection | P0 |
| S4 | उद्याचा तक्ता (Tomorrow creation) | Copy-previous with availability overlay | P0 |
| S5 | दैनिक तक्ते (History) | Date list → read-only chart | P0 |
| S6 | शोध (Search) | Simple staff/duty/location/date search | P0 |
| S7 | मास्टर डेटा (Master CRUD) | Staff, ranks, duties, locations, units, equipment | P0 |
| S8 | Secondary panels (7) | Leave/manpower/officers/ledger/scan/notices/events | P0 |
| S9 | Lifecycle & conflict states | Validate/finalize/amend; warning presentation | P0 |
| S10 | Print packet | Compact board + continuation pages + event annex | P1 (after P0 acceptance on screen) |
| S11 | Event annex editor | Event personnel/equipment/instructions | P1 |

## 4. Screen: आजचा तक्ता (S1)

Home answers one question: **what is today's duty chart?** Not a dashboard.

```
┌──────────────────────────────────────────────────────────────────┐
| पंचवटी पोलीस ठाणे · नाशिक शहर          दिनांक: ०६ ऑक्टोबर २०२६    |
|                                            वार: मंगळवार · DRAFT   |
├──────────────────────────────────────────────────────────────────┤
| [संपादन करा]  [उद्याचा तक्ता]  [प्रिंट]  [अधिक ▾]                  |
├──────────────────────────────────────────────────────────────────┤
|                                                                  |
|              <COMPACT DUTY BOARD — read-only S2 view>            |
|   अधिकारी बॉक्सेस · HQ ओळी · चौकी मॅट्रिक्स · मार्शल/विशेष ·      |
|   कार्यालय/कोर्ट कक्ष   (secondary panels collapsed below)        |
|                                                                  |
├──────────────────────────────────────────────────────────────────┤
| ⚠ लक्ष देणे आवश्यक                                               |
| • २ रिक्त जागा  • १ रजा-conflict  • १ बंद चौकी (चार्ज → …)       |
└──────────────────────────────────────────────────────────────────┘
```

- **No chart today** → two actions only: "नवीन तक्ता सुरू करा" (blank from masters) and "मागील दिवसावरून कॉपी करा" (→ S4). Nothing else.
- **FINALIZED** → edit button becomes "दुरुस्ती (नवीन आवृत्ती)" (amendment → new draft version); print stays.
- Attention bar items are clickable → jump to the relevant block/panel.
- The board on Home is the **same component** as the editor board, read-only. One truth, two modes.

## 5. Screen: Chart Editor (S2) — the heart

Document-like authoring of the compact board. Layout mirrors the approved mockup's grammar, edited in place.

```
┌──────────────────────────────────────────────────────────────────┐
| ← आजचा तक्ता    ०६ ऑक्टोबर २०२६ · मंगळवार    DRAFT v1   [जतन ●]  |
| [प्रिंट] [तपासणी (Validate)] [अंतिम करा (Finalize)]               |
+------------------------------------------------------------------+
| अधिकारी                                                          |
| ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ |
| | वपोनि गजेंद्र| | पोनि सुनिल   | | पोनि नितीन   | | + अधिकारी | |
| | पाटील        | | पवार  [तपास] | | आंधळे  [प्रशा]| |           | |
| | रायटर: …     | | रायटर: …     | | रायटर: …     | |           | |
| | ऑपरेटर: …    | | ऑपरेटर: …    | |              | |           | |
| | [+ कर्मचारी] | | [+ कर्मचारी] | | [+ कर्मचारी] | |           | |
| └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ |
|                                                                  |
| HQ + मोबाईल + DB (दिवस | रात्र two-column table, rows editable)  |
|                                                                  |
| चौक्या  (blocks, 3-across, wrap)                                 |
| ┌────────────────────┐ ┌────────────────────┐ ┌────────────────┐ |
| | काटया मारूती चौकी  | | पंचवटी कारंजा चौकी | | मालेगांव स्टँड | |
| | अधि. सपोनि मोहिते  | | अधि. …             | | …              | |
| | (०९–१४)            | |                    | |                | |
| | दिवसपाळी ०९–२१     | | दिवसपाळी ०९–२१     | |                | |
| |   प्रभारी: …       | |   प्रभारी: …       | |                | |
| |   पोशि ५४२ आहेर    | |   …                | |                | |
| |   पोशि १९९८ …      | |                    | |                |
| |   [बिमा] पोशि …    | |                    | |                |
| |   [रिक्त +१ जागा]  | |                    | |                |
| | रात्रपाळी २१–०९     | | रात्रपाळी २१–०९     | |                |
| |   …                | |   बंद + चार्ज → …  | |                |
| | [+ कर्मचारी][+ ड्युटी]                  | |                | |
| └────────────────────┘ └────────────────────┘ └────────────────┘ |
|                                                                  |
| मार्शल / विशेष · कार्यालयीन शाखा · कोर्ट/समन्स/वॉरंट (same grammar)|
|                                                                  |
| [ + चौकी ] [ + ड्युटी ] [ + कर्मचारी ] [ + सूचना ] [ + इव्हेंट ]  |
+------------------------------------------------------------------+
| ▸ रजा / इतर ड्युटी   ▸ मनुष्यबळ   ▸ अधिकारी सारांश   ▸ … (S8)    |
└──────────────────────────────────────────────────────────────────┘
```

Rules:
- Editing happens **in place** in these blocks (click a person line → picker; click a state chip → toggle menu). No side forms, no modals-first editing. Modals only for creation flows (S3) and confirmations (finalize).
- The `+` action row is **contextual**: it always appends *below the thing you're looking at* when invoked from a block; from the page-level row it opens the same pickers with a target selector.
- Officer block grammar (from mockup + critique): name, optional branch tag chip `[तपास]/[प्रशा]/[गुन्हे]/[विशेष]`, then repeated support rows `रायटर: <person>` / `ऑपरेटर: <person>` (visual grouping only — SME N3; no formal relation asserted), each row editable via S3.
- Chowki block grammar: chowki name → अधि. <in-charge> with inline time window → two sub-columns दिवसपाळी/रात्रपाळी, each: प्रभारी line, BIMA-tagged people inline, remaining staff, explicit `रिक्त` dashed row when a seat exists and is unfilled, बंद + `चार्ज → <location>` line when closed. A chowki without BIMA shows **no BIMA row at all** (critique item). Charge note appears **once per shift** (critique item).
- HQ/day-night core: two-column labeled table (अधिकारी, ठाणे अंमलदार, मदतनीस, CCTNS, वायरलेस, लॉकअप, CR/डेल्टा/पिटर मोबा., DB पथक) exactly as the mockup; each right cell is a picker target; multi-person rows allowed (DB=6 etc.).
- Save: debounced autosave with जतन state (जतन होत आहे / जतन झाले / जतन अयशस्वी — retry keeps local edits). DRAFT/VALIDATED editable; FINALIZED read-only + amendment path.

## 6. Component: अधिकारी block

- Header: officer name (rank + name, no buckle), branch-tag chip if present.
- Rows: `रायटर:` / `ऑपरेटर:` support lines — consistent accent color for the role label across all screens and print (critique item).
- `+ कर्मचारी` on each row target; `+ ड्युटी` to add another support line type.
- The Sr-PI box sits above the officer grid: `वरिष्ठ पोलीस निरीक्षक: <name>` (colon, never the "—" dash — critique item), with रायटर/चालक (दिवस/रात्र)/RTPC (दिवस/रात्र) dotted slots as in the mockup.

## 7. Component: चौकी block

See grammar in §5. Additional rules:
- Timings display as Devanagari `(०९–१४)` inline after the in-charge (mockup pattern) and as shift sub-headers `दिवसपाळी ०९–२१` / `रात्रपाळी २१–०९`.
- Split-shift person: `(०९–१४)` / `(१६–२१)` chip on the person line.
- `बंद`: slate hatch background + `बंद` text + charge-destination line. Never an empty block.
- `रिक्त`: amber dashed `+ १ जागा रिक्त` tag. Blank ≠ रिक्त in scan panels (INV).
- BIMA: `[बिमा]` crimson chip inline on the person line; person-level only.

## 8. Assignment editing model (how a change happens)

One interaction grammar everywhere:
1. Click a person line (or empty slot) → **S3 picker** opens anchored to that slot.
2. Pick existing staff → line updates, autosave.
3. Or `➕ नवीन कर्मचारी जोडा` at picker bottom → mini-create form → save → **returns to the exact chart context** with the new person placed in the slot.
4. Clearing a filled line → slot becomes explicit `रिक्त` (never silently deleted history; replacement lineage records original).
5. Replacing a person on a filled line = same picker; on save, the system records a sudden-change ledger entry (original → new, reason prompt optional, actor/time automatic).

No field-count editing, no generic row forms. The 17-field assignment shape lives in the domain, not the UI.

## 9. Staff picker (S3)

```
┌──────────────────────────────┐
│ कर्मचारी जोडा                │
│ 🔍 कर्मचारी शोधा…            │
│ ──────────────────────────── │
│ पोशि ५४२ आहेर               │
│ पोहवा २१०० पाटील            │
│ पोशि १९९८ वाकचौरे           │
│ …                            │
│ ──────────────────────────── │
│ ➕ नवीन कर्मचारी जोडा        │
└──────────────────────────────┘
```

- Results show rank-abbr + buckle + name; typing filters live (name/buckle).
- Each result may carry a small availability hint (`साप्ताहिक सुट्टी` etc. when known for the chart date) — advisory only; selection is never blocked.
- Bottom `➕ नवीन कर्मचारी जोडा` → mini-create (rank dropdown, full name, buckle, phone optional) → save → return to slot. This interaction is preserved verbatim from the old StandardizedView (audit-mandated).

## 10. Mini staff creation

Fields: पद (rank dropdown, seeded), पूर्ण नाव (required), बक्कल नं (required), मोबाईल (optional). Save = create master staff + place in the invoking slot (one confirmation). Cancel returns empty-handed. Validation: unique buckle per rank class (soft warning, not block), name required.

## 11. Screen: उद्याचा तक्ता (S4 — Tomorrow flow)

```
उद्याचा तक्ता तयार करा
उद्या: ०७ ऑक्टोबर २०२६

आधार:
 ○ आजचा तक्ता (०६ ऑक्टोबर)
 ○ कालचा/निवडलेला तक्ता (date picker of finalized/draft charts)
 ○ रिकामा तक्ता (masters only)

[तक्ता तयार करा]
```

Result screen:
```
०७ ऑक्टोबर २०२६ · DRAFT
⚠ ४ उपलब्धता conflicts · ⚠ २ रिक्त जागा
[संपादन सुरू ठेवा] → opens S2 with conflicts pre-flagged
```

- Copy policy enforced by domain (EV-03 matrix); UI shows a one-line summary of what was copied vs re-validated. Source chart untouched (hash-tested invariant).
- Conflict chips are advisory: assignment retained, marked NEEDS_ATTENTION, linked to the availability row. The clerk resolves by editing; nothing is auto-replaced.

## 12. Secondary panels (S8)

Collapsible sections below the board (expanded state remembered per user):

| Panel | Contents | Source grammar |
|---|---|---|
| ▸ रजा / इतर ड्युटी | Category columns (साप्ताहिक सुट्टी, किरकोळ रजा w/ windows, अर्जित रजा ranges, सिक, गैरहजर, प्रसुती, बाल संगोपन, हायकोर्ट…) + इतर ड्युटी (निर्भया/दामिनी/मिसिंग सेल/कोर्ट पैरवी/वाघ जाप्ता/तपासकामी/प्रशिक्षण) — **side-by-side columns, not one vertical list** (critique item) | mockup p3 two-column |
| ▸ मनुष्यबळ | rank × status matrix; stored authoritative values + clearly-labeled derived values; **no explanatory footers/टीप lines** (critique item) | mockup p4 |
| ▸ अधिकारी सारांश | 15-row summary (derived suggestion + per-cell override, provenance-marked); no "१५ दुय्यम अधिकारी…" subtitle (critique item) | mockup p5 |
| ▸ अचानक ड्युटी बदल | append-only ledger rows (original→new, reason, time, actor) | DOMAIN |
| ▸ स्कॅन वेळापत्रक | 4 sessions config view + 12 hourly daily rows (picker targets); blanks stay blank | mockup p5 |
| ▸ सूचना | ordered chart notices (night directives etc.), add/edit/reorder | DOMAIN chart_notices |
| ▸ विशेष बंदोबस्त / इव्हेंट | event list for the date; opens S11 | DOMAIN events |

## 13. History & search (S5/S6)

**दैनिक तक्ते:**
```
[ आज ] [ उद्या ] [ अलीकडील ] [ ऐतिहासिक ]
०६ ऑक्टोबर २०२६   DRAFT v1
०५ ऑक्टोबर २०२६   FINALIZED v2
…                   (row click → read-only chart view)
```
Read-only chart = Home's board with editor affordances hidden; FINALIZED shows a "दुरुस्ती" button (amendment).

**शोध:** one form, three optional fields (कर्मचारी / ड्युटी-ठिकाण / दिनांक-श्रेणी) → result list of chart dates with matching lines; click → that chart with the match highlighted. Deliberately simple (R-20: "initially simple").

## 14. Master data (S7) — boring on purpose

Tabs: `[ कर्मचारी ] [ पदे ] [ ड्युटी ] [ ठिकाणे ] [ युनिट ] [ साहित्य ]`.

```
कर्मचारी                                    [ + कर्मचारी ]
नाव            पद       बक्कल    मोबाईल       स्थिती
गंदलवाड …      पोशि     ९१३      …            सक्रिय | [निष्क्रिय करा]
```

- Plain searchable table + create/edit form + **deactivate** (never delete when referenced; active flag). Reactivate possible.
- Ranks/duties/locations/units/equipment same grammar. No dashboards, no analytics.
- Seeded from old repo's verified reference data (49 duties, 16 ranks, 6 chowkis, staff directory).

## 15. Lifecycle UI (S9)

| State | Badge | What's editable | Buttons |
|---|---|---|---|
| DRAFT | amber `DRAFT` | everything | जतन · तपासणी · अंतिम करा · प्रिंट |
| VALIDATED | blue `VALIDATED` | everything (validation re-runs on edit) | अंतिम करा · प्रिंट |
| FINALIZED | green `FINALIZED` | nothing | प्रिंट · दुरुस्ती (→ new DRAFT v+1) |

- तपासणी runs domain validation; result = warnings list (advisory) + hard errors (integrity) — only hard errors block finalize.
- अंतिम करा requires a confirmation modal listing unresolved warnings ("X सूचना असूनही अंतिम करायचे?").
- Amendment never modifies the finalized version; the old version stays printable from its snapshot.

## 16. Conflict / attention UI

- Attention bar (Home) + inline chips (editor) use one vocabulary:
  - `रिक्त` amber dashed — seat exists, unfilled
  - `conflict` red-outline — assignment vs availability (retained, needs attention)
  - `बंद` slate hatch — closed location + charge line
  - `बिमा` crimson chip — qualifier, not a state
- Every warning is clickable → the exact block/panel. Warnings never auto-resolve, never block on their own.

## 17. BIMA / रिक्त / बंद presentation (canonical)

| Concept | Visual | Screen | Print |
|---|---|---|---|
| बिमा | `[बिमा]` crimson chip after name | inline chip | inline chip |
| रिक्त | amber dashed tag `+ १ जागा रिक्त` | dashed row | dashed row |
| बंद | slate hatch + `बंद` + `चार्ज → …` | hatched block header area | hatched block |
| प्रभारी | bold name + `प्रभारी` label | inline | inline |
| Branch tag | `[तपास]` blue-gray chip | inline | inline |
| Support roles | `रायटर:` / `ऑपरेटर:` colored label | label color consistent | same |

Text+shape redundancy mandatory (grayscale rule). Never color-only.

## 18. Responsive rules

Desktop-first (clerk workstation). Minimum comfortable width 1280px; the board compresses chowki blocks 3→2→1 across as width shrinks. Panels stack. **Tablets/phones: view-only** — editing is a workstation activity (Coming Soon for mobile editing). Print CSS is separate and always landscape for the board.

## 19. Print relationship

- Screen and print are separate renderers over the same ChartDocument (ARCHITECTURE).
- Print packet = compact board page(s) + continuation pages (leave/manpower/scan) + optional event annex; page count is content-driven (11/09 proof).
- The board's screen layout intentionally mirrors the print grammar (mockup) so the clerk is never surprised by print output.
- Print verification via browser preview + grayscale check (print-check skill); no visual-correctness claims without render inspection.

## 20. Component inventory

Shared, reusable, in priority order:
1. `ChartBoard` (read-only board = Home + history view)
2. `OfficerBlock`, `SrPIBox`, `ChowkiBlock`, `CoreTable` (day/night), `MarshalSpecialPanel`, `OfficeDeskPanel`, `CourtDeskPanel`
3. `StaffPicker` (+ `MiniStaffCreate`), `PersonLine` (name+buckle+chips+time window)
4. `StateChip` (बिमा/रिक्त/बंद/conflict/branch-tag), `TimeWindowChip`
5. `SecondaryPanel` (collapsible) × 7
6. `LifecycleBadge`, `AttentionBar`, `SaveStateIndicator`
7. `DateNav` (today/yesterday/tomorrow switcher with आज tag)
8. Master CRUD table + form (generic, per-entity config)
9. `EventBlock` (personnel/equipment/instructions) — P1
10. Print packet renderer (server-side HTML → PDF) — P1

## 21. Explicitly NOT implemented (v1)

- Generic dashboard analytics/KPI cards (anti-pattern, verified in old duty-board)
- Officer→Writer→RTPC formal relations (visual grouping only; SME N3)
- BIMA auto-derivation, availability auto-resolution, any auto-scheduling (INV-06 class)
- Manpower auto-reconciliation (ME/03 semantics unknown; SME N4/N5)
- Mobile editing, multi-user concurrency, RBAC, notifications (Coming Soon)
- OCR import machinery, WhatsApp/Telegram coupling
- Any new screen not in §3 inventory without a spec amendment

---

## Approval checklist for the user

1. Board grammar (mockup-derived) as the single editor + print grammar — yes/no
2. Secondary-panel set and their print pages (§12) — yes/no
3. Tomorrow-flow bases (§11) — yes/no
4. Master-data plainness (§14) — yes/no
5. Stitch brief (STITCH_BRIEF.md) as the visual exploration vehicle — yes/no
