<!--
Purpose: Initial repo + tooling + reference audit for the clean Panchavati rebuild.
Current role: One-time decision baseline; becomes historical once architecture is approved.
Last meaningful change: Created 2026-10-06 from forensics of both old repos, reference corpus and 10/09+11/09 charts.
Constraint/dependency: Based on read-only inspection of C:\Users\kusha\Desktop\DailyDutyPanchavati and the nested DailyDutyPanchavati-ui-rebuild; no old file was modified.
-->

# INITIAL_AUDIT — Panchavati Daily Duty System (Clean Rebuild)

Date: 2026-10-06 · Mode: audit only, no implementation

---

## 0. Environment found

| Item | Finding |
|---|---|
| Workspace root | `C:\Users\kusha\Desktop\DailyDutyPanchavati-ui-rebuild (4)` — **empty**, no git |
| Old repo A | `Desktop\DailyDutyPanchavati` — git, branch `render-main`, last commit 2026-09-28. Oldest lineage; the "Page1..Page6" six-page system with the standardized-chart work |
| Old repo B | (this workspace)`DailyDutyPanchavati-ui-rebuild` — git, branch `p0-p1-implementation`, 39 commits, last commit "extracted zip" 2026-10-06. Same app lineage; adds rendering profiles incl. `standardized-compact-v2` |
| Migration lineage | Identical 0001–0012 in both; A continues to 0020 (adds 0019/0020 note-style + annotations), B continues to 0018 (Arjish operational_* line + import/audit/communications) |
| PostgreSQL 17 | Running locally. DBs: `panchavati_dev`, `panchavati_test` (43 tables: six-page + operational_*), `panchavati_combined`, `panchavati2_dev` (30 tables: abandoned template_section/position_group/operational_slot experiment). Local dev server ran on port 3100 (per screenshot filename) |
| Node | v24.13.1, npm 11.11.1 |
| Source data authority | Old repo A `reference/` — SEMANTIC (10.md, 11.md, 12.md, 16.md, Staff_Info.md, per-page analyses, Daily Copy Policy), ORIGINAL_VISUAL (10/11/12/16 PDFs, Staff_Info), CONVERTED_PDF, ORIGINAL_DOCX, EXCEL_RECONSTRUCTION (verified 10/11 Sept Page-1 workbooks + HTML), cross-station evidence (Mumbai, Sakarwada, Gangapur, Cyber) |
| Live PG data | `panchavati_dev` holds seeded staff + 2026-09-10/16 chart fixtures — extractable via script if needed |

**Repo lineage decision:** A and B are the same application at different fork points (B = A + Arjish operational_* base + profiles + import/audit/WhatsApp). One audit covers both. Do not resurrect either wholesale.

---

## 1. What exists (old repos, verified from code)

### 1.1 Backend (both repos, TS + Fastify 5 + Kysely + node-pg-migrate)
- Migrations 0001–0018/0020:
  - Core: `app_users, ranks, staff_members, shifts, duty_sections, locations, duty_definitions, daily_duty_charts, duty_slots, daily_assignments, location_operational_states, daily_availabilities, sudden_duty_changes, hourly_scan_assignments, chart_versions`
  - Page overrides: `page2..page6_draft_overrides` + `daily_specials`, `slot_daily_note`, `slot_daily_annotations`
  - Operational (B/Arjish): `operational_duty_categories/_duties/_locations/_units/_resources/_presence_records/_events/_assignments/_assignment_staff/_assignment_resources` + presence≠assignment, events, M2M equipment
  - Comms/audit/import: `outbound_communications`, `audit_events`, `draft_checkpoints`, `import_*`
- Domain layer: lifecycle (DRAFT→VALIDATED→FINALIZED, immutable snapshots, 409 CHART_FINALIZED), copy-previous with copy policy, availability conflict checks, change ledger, catalog baseline generation, search, master-data CRUD.
- 12 domain invariants (INV-01..12) with DB CHECKs, static scanner (`check-invariants.mjs` bans auto-selection + remarks parsing), and DB test suite (33 invariant tests).
- Test theatre: 15+ test files / 157 tests (repo A claims green; B untested here).

### 1.2 Frontend + print
- React 19 + Vite + Tailwind 4, `AppNav` tabs, per-page views, MR/EN toggle.
- Print: per-page HTML renderers + unified six-page doc + Playwright PDF (A4, Devanagari fonts, `printBackground`), PNG export.
- Compact direction already prototyped: `standardized-compact-v2` profile (A4 landscape, 5 pages, chowki matrix, officer grid, leave/manpower/scan pages) + handoff mock HTML + a follow-up critique (Current_Prompt_to_Follow.md) listing concrete fixes (labels, officer boxes with रायटर/ऑपरेटर rows, chowki heading structure, less vertical रजा tables, no explanatory footers).

### 1.3 Reference data
- Verified semantic charts for 4 dates (10/11/12/16 Sept 2026), Staff_Info directory (officers #1–16 + constables), Page-3 comparative analysis + Daily Copy Policy matrix (FIXED CONFIG / AUTO-COPY / COPY+DAILY EDIT / DAILY INPUT / APPEND-ONLY per table), manpower analysis, invariant list, seed SQL (ranks/shifts/duties/locations/units) and demo fixtures.

---

## 2. What to REUSE (selectively, in the new repo)

1. **Masters & seed data (highest value):** `ranks` (16 canonical codes, Marathi labels), `shifts` (DAY 09–21 / NIGHT 21–09 overnight), `locations` incl. the six chowkis, `duty_definitions` (~49 recurring), `staff_members` import (169 records, `Staff_Info`-derived), `reference-data.sql` + `structural.sql` — copy, don't regenerate.
2. **Core daily schema shape:** `daily_duty_charts` (lifecycle CHECK), `duty_slots` (ALLOCATED/VACANT_RIKT), `daily_assignments` (+`is_beat_marshal_bima`), `location_operational_states` (is_closed), `daily_availabilities` (typed date/time), `sudden_duty_changes` (append-only), `chart_versions` (immutable snapshot).
3. **Invariant system:** the 12 invariants + static scanner pattern + DB tests as a template for our invariants.
4. **Domain logic patterns (port, not copy):** lifecycle with 409 guards, copy-previous policy matrix, availability conflict detection (conflict = finding, never replacement), baseline generation (0 auto-assignments), snapshot freeze + replay for finalized charts.
5. **Print infrastructure:** Playwright PDF pipeline, Devanagari font embedding, `printBackground`, screen/print separation, grayscale-aware state encoding ideas (chips + hatch + dashes + text).
6. **Event/equipment modeling (from operational_* line):** event → assignment → M2M staff/resources is the right minimal shape for रंगीत तालीम; simplify (drop category registry, presence, versioning of events for now).
7. **Evidence discipline:** authority order (visual PDF > verified XLSX > semantic MD > specs > code), protected tokens (CCTNS, Dial 112 MERS, rank codes, TOTAL, Office, ME), `बिमा/रिक्त/बंद` distinctions, Devanagari display digits, canonical spellings.
8. **Reference corpus itself:** copy `reference/SEMANTIC`, `ORIGINAL_VISUAL`, `CONVERTED_PDF`, `EXCEL_RECONSTRUCTION`, cross-station folders into the new repo (small, ~30 files) so evidence travels with the code.
9. **Compact-v2 critique list** (Current_Prompt_to_Follow.md) as input to our chart editor + print design.

## 3. What to DISCARD / do NOT copy

1. Old StandardizedView / Page1..Page6 UIs and per-page React views — replaced by compact board + detail panels.
2. Page-specific geometry: `docs/layout/page-1-*.md` cell maps, 142/160/55/198/119 pt columns, per-page CSS — physical pagination is renderer output now.
3. Page-specific domain tables: `page2..page6_draft_overrides`, `hourly_scan_assignments`, `scan_sessions/scan_schedule_slots`, `daily_specials` — replaced by generic notice / scan-config / availability models.
4. The dual `operational_*` schema — concept (event/assignment/resource) reused, tables not copied; two parallel domain systems in one repo is the old repos' core disease.
5. `panchavati2` template_section/position_group/operational_slot experiment — abandoned.
6. Duplicate seed/reset systems, one-off debug scripts (`fix-date-loading-final.cjs` etc.), render-deploy hacks, WhatsApp/GOWA integration (future, needs approval), legacy OCR import machinery (future need at most).
7. Hardcoded anything: chowki order, six-page page count, 15-officer roster as a page, office role list as layout truth.
8. Test-theatre patterns where tests assert fixture values rather than invariants.

---

## 4. Proposed clean architecture (phased)

**Stack (unchanged from what works):** PostgreSQL 16/17 · Fastify 5 + Kysely · React 19 + Vite + Tailwind 4 · Vitest + Playwright. Monorepo-lite: `server/` + `web/` + `db/` + `docs/`.

```
masters: ranks, staff_members, locations, duty_definitions, units, equipment, event_types?
daily:   daily_charts (date, lifecycle) ← chart_versions (immutable snapshots)
         daily_assignments (person/duty/location/times/shift/state/status/BIMA/notes/unit)
         daily_availabilities (staff, date, category, typed windows)
         location_operational_states (date, location, is_closed, charge_destination)
         scan_schedule_config (station config) / scan_schedule_daily (per-chart rows)
         chart_notices (chart/event/assignment-scope, order)
         special_events, event_assignments, event_equipment, event_instructions
history: sudden_duty_changes (append-only ledger) — all fields typed, never parsed from text
```

Key design decisions (evidence-backed):
1. **No page tables.** Sections (day/night/HQ/chowkis/marshals/office/leave/manpower/officers/scan/notices/events) are domain groupings + renderer zones; physical pages are CSS `@page` output. 11/09 annex = `special_events` + renderer, zero schema change.
2. **One assignment model** (not per-page slot tables) with shift presets (`DAY`/`NIGHT` as station config), typed start/end (supports split 09–14/16–21), allocation state, status, BIMA boolean.
3. **Availability separate** from assignment; conflicts surface as warnings; finalization never hard-blocked by warnings.
4. **Events first-class but small**: date/time/fall-in/personnel(role optional)/equipment(lines with quantities)/instructions + printable annex.
5. **Scan schedule = config + daily rows**, mirroring the Copy Policy matrix (FIXED CONFIG vs DAILY INPUT).
6. **Notices** attach at chart scope (with optional event/assignment scope — SME question N2).
7. **Manpower/officer summary** = stored authoritative values + derived values clearly labeled (never auto-reconcile ME/03).
8. **API:** thin REST; `GET/PUT chart document`, `POST assignments`, lifecycle transitions, copy, masters CRUD; snapshot replay for FINALIZED.
9. **UI:** four nav items (आजचा तक्ता / दैनिक तक्ते / शोध / मास्टर डेटा) + disabled Coming Soon; document-style editor with contextual `+` actions and the staff-picker→mini-create→return-to-context flow from the old StandardizedView interaction.
10. **Print:** compact A4 landscape board + leave/manpower/scan continuation pages + optional event annex; shape/text + color redundancy; render-and-inspect before claiming correctness.

**Phases:**
- **P0 — Foundations:** repo scaffold, PG connection, migrations 0001+ (masters + daily core), seed import from old `reference-data.sql`, invariant skeleton (RIKT≠BANDA≠BIMA, no-auto-assign, no-remarks-parsing), masters CRUD API+UI.
- **P1 — Daily core:** charts lifecycle, assignments editor (chowki blocks, HQ, office, marshals, BIMA, रिक्त, बंद+charge), availability panel, copy-previous + conflict warnings, change ledger, finalize/snapshot/reprint.
- **P2 — Full packet:** manpower + officer summary panels, scan schedule config+daily, notices, search; compact print + continuation pages.
- **P3 — Events:** special event authoring (गणेशोत्सव रंगीत तालीम as first data), event annex print.
- **P4 — Hardening:** 10/09 + 11/09 acceptance runs end-to-end, grayscale print verification, auth decision, deployment.

---

## 5. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Rebuilding the six-page UI by inertia | Compact board is primary; six-page only as reference. Acceptance = information coverage, not page count |
| R2 | Scope creep toward "event platform" / generic hierarchy | Events stay minimal; no universal tree until SME forces it |
| R3 | Two-schema disease recurring (six-page + operational) | One schema; PR rule: no new table without mapping to DOMAIN.md entity |
| R4 | Marathi text corruption (transliteration, truncation, wrong digits) | Protected tokens, Unicode-only, wrap-never-truncate, Devanagari digits display-only |
| R5 | Print quality unknown until rendered | Render early (P1), grayscale checks, never claim visual correctness without inspection |
| R6 | SME questions blocking build | Represent unknowns as explicit editable fields; default to source text; questions listed in OPEN_QUESTIONS |
| R7 | Copy-previous leaking stale one-day content | Port the Copy Policy matrix verbatim into copy logic + tests |
| R8 | Old fixture data only covers day-page for 10/09 (night was loader gap) | Use semantic MD as seed source of truth; treat old DB dumps as convenience only |
| R9 | Long Marathi names/duties breaking layout | wrap→grow→break contract enforced in CSS + tests |
| R10 | Local DB drift dev/test | Migrations + idempotent seeds applied to both; scripted verify |

---

## 6. Unresolved SME questions (MUST NOT be guessed)

Carried into docs/OPEN_QUESTIONS.md in full; summary:
1. BIMA trigger semantics (what makes a person BIMA that day) — explicit per-assignment flag only.
2. RTPC/operator meaning + officer→writer→operator relation (visual grouping only until confirmed).
3. Manpower `03` (प्रत्यक्ष हजर) + `ME` column semantics; printed sums don't reconcile.
4. Equipment: legal binding/policy constraints around arms/ammo allocation — model allocation only.
5. Home station vs attached force (परि. prefixed officers) — source-unit field needed?
6. Generic deployment-context hierarchy — deferred until evidence demands.
7. सुरक्षित ॲप vs ग्रीन ॲप relationship (two apps? same scan routine?).
8. Officer roster ownership (who maintains the 15-row summary).
9. Notice ownership: chart vs event vs assignment scope.
10. Time-window semantics beyond observed evidence (split shifts, hourly windows on leave).

---

## 7. 10/09 and 11/09 information-coverage findings

Sources: `reference/SEMANTIC/10.md`, `11.md` (+ visual PDFs, Excel reconstructions, copy-policy doc).

### 10/09 (normal daily packet) — every fact must be representable
| Legacy block | Contents observed | New-home proposal |
|---|---|---|
| Day roster (T1) | HQ officers+PSO, हजरपाळी, CCTNS, वायरलेस, पिटर/सी.आर./डेल्टा मोबाईल, DB, लॉकअप; 6 chowkis; 4 marshal groups (काटया/कारंजा/मालेगांव/फुलेनगर) with बंद + charge-transfer; मेरी मार्शल; काळाराम गार्ड; महिला कक्ष; सायबर सेल; पंचवटी 1 मोबाईल + MT driver; office column (कार्यालयीन अंमलदार, रायटर set, नगदी/मुद्देमाल कारकुन, गोपनिय, बारनिषी, MOB/मिसिंग, वॉरंट, सेशन/समन्स) | day board: HQ block / chowki blocks / marshal-special / officer+support strip / office panel |
| Split times | मोहिते 09 ते 14 (day), बोरसे 16 ते 21 | typed start/end on assignment |
| BIMA | 10 explicit per-person बिमा markers (गायकवाड 2272, महाले 1244, गुंजाळ 2157, रोकडे 2914, भाबड 2312…) | per-assignment boolean, `[बिमा]` chip |
| बंद + charge | काटया मारूती बंद → मालेगाव स्टँड; कारंजा बंद → मालेगाव स्टँड | location_operational_states + charge_destination |
| Night roster (T2) | चेकिंग-1, ठाणे अंमलदार, हजरपाळी, CCTNS, वायरलेस, पिटर/सीआर मोबाईल, DB, lockup; chowkis; marshal groups with बंद/charge; Panchavati-1 | night board (same components, NIGHT shift preset) |
| Night directives | गुडमाॅर्निंग स्काॅड (4 names), रामकुंड पेट्रोलिंग, पुतळा भेटी, चौकी अंमलदार गस्त, DB अंमलदार, बिट मार्शल 2-तास रिपोर्ट + सुरक्षित ॲप स्कॅन, DB/CR मोबाईल आस्थापना बंद | chart notices (night scope) |
| Leave/other (T3) | साप्ताहिक सुट्टी, किरकोळ रजा (hourly windows), अर्जित रजा (date ranges), हायकोर्ट, सिक, प्रसुती, बाल संगोपन, गैरहजर, रिझर्व्ह, तपासकामी (गुजरात/सातारा), प्रशिक्षण (DTS), इतर ड्युटी (निर्भया/दामिनी/मिसिंग सेल/कोर्ट पैरवी/वाघ जाप्ता) | daily_availabilities (categories) + इतर ड्युटी as availability-with-duty or assignment-outside — SME N10 nuance |
| Manpower (T4) | rank × status matrix incl. मंजुर/हजर rows, Office 09, ME 233, `03` प्रत्यक्ष हजर, non-reconciling sums | stored authoritative values + labeled derived values |
| Summaries (T5–7) | दिवस/रात्र/इतर ड्युटी समरी (अधिकारी/अंमलदार/महिला) | derived + editable summary panel |
| Change ledger (T8) | अचानक ड्युटी बदल कारण मीमांसा (empty on 10/09) | sudden_duty_changes append-only |
| Officer roster (T9) | 15 officers + कर्तव्य incl. "9 ते 14 व नाईट" | officer summary = derived-from-assignments with manual override |
| Scan schedule (T10–13) | morning chowki→in-charge mapping, afternoon mobile mapping, 12 hourly slots (person named per hour), night chowki→mobile routing + ग्रीन ॲप note | scan config (mappings) + daily rows (hourly staff) |

**10/09 verdict:** fully representable with the proposed model. Nothing requires page-specific tables.

### 11/09 (expansion packet) — everything above PLUS
| Extra block | Contents observed | New-home proposal |
|---|---|---|
| Event table (11.md Table 3) | 11 personnel × (अतिरिक्त साहित्य / अनिवार्य साहित्य): search light+दोर, megaphone, video camera, gas gun+cells (शॉटरेज 10/लॉगरेज 08/हॅन्डग्रेनेड 10), 12-bore (राउंड 40), SLR (प्लॅस्टीक 50/जिवंत 35), षिल्ड+लाठी, हेल्मेट+षिनगार्ड+बाॅडी प्रोटेक्टर | special_event (गणेशोत्सव रंगीत तालीम) + event_assignments (11 staff) + event_equipment (typed lines w/ quantities) |
| Fall-in instruction | 10:00 पो.स्टे.मैदान फाॅलिंग + absentees → कसुरी अहवाल warning | event_instructions (time+venue+order) |
| Event notice | गांभिर्याने नोंद घ्यावी… खबरदारी | event_instructions / notice |
| Extra physical page | event page pushes leave table to physical page 4 | renderer annex; **no schema change** — proven by this source itself |
| Day-roster differences | मोहिते 16 ते 21 (night carry-over), परेड कमी पोलीस मुख्यालय block, different बंद/charge states (कारंजा→काटया) | same models as 10/09 |
| Leave additions | तपासकामी पुणे परत, दंगा काबु प्रशिक्षण (11–12/09), additional weekly-off names | availability categories already cover |
| Scan schedule | same 4 sessions, different hourly staff | config + daily rows already cover |

**11/09 verdict:** representable with the same core schema + events. The packet's own behavior (page shift) proves physical pagination must remain renderer output — exactly the design constraint.

---

## 8. Skill / IDE tool audit

**Host IDE (Freebuff) native capabilities confirmed in this session:** file read/write/edit, terminal, code search/glob, git, web search, structured todos, browser preview with screenshot/interaction/console/video (Playwright-grade — usable for print verification), preview HTML serving, file-change hooks, persistent docs. Equivalent to everything the old `.kilo` skills did; no separate engine needed.

**Old `.kilo` skills (repo A):** `db-change`, `print-check`, `check-invariants` — good procedures; being re-created project-locally, adapted to the new architecture.

**Project-local skills proposed (small, procedural):** `source-forensics`, `db-change`, `current-chart-ui`, `print-check`, `verify-slice`, `session-handoff`, `event-annex` — see `skills/`.

**Memory approach:** lightweight durable docs (AGENTS.md, docs/CURRENT_STATE.md, OPEN_QUESTIONS.md, ARCHITECTURE.md, DOMAIN.md, TRACEABILITY.md, changes/<id>/proposal.md). No Bonsai/Headroom runtime integration; police data stays local; browser preview and Playwright run locally only.

---

## 9. Decision requests for the user (before P0)

1. Approve the compact-first architecture + phased plan (§4).
2. Confirm: copy reference corpus into new repo `reference/` (read-only).
3. Confirm: extract seed/staff data from old repo's `reference-data.sql` + semantic MD (not from live DB dumps).
4. Any preference on repo location (this workspace is currently empty)?
5. Auth: keep single shared clerk user (like old system) for MVP, or defer entirely?
