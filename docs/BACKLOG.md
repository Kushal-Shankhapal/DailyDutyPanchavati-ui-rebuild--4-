# BACKLOG — outstanding work as of 2026-10-13

Purpose: single resumable list of EVERYTHING the user asked for, with its evidence source, so a
fresh session never has to re-mine `mega.txt` (3474 lines) or `chat.json` (22 MB) to know what is
open. Status is honest: `DONE`, `PARTIAL`, `TODO`.

Reading order for a new session: `docs/CURRENT_STATE.md` → `docs/SESSION_HANDOFF.md` → this file.

Authority note: `chat.json` + `mega.txt` are **user words** (design authority); `docs/` decisions
still govern software behaviour; `reference/` still overrules everything for chart content.

---

## 0. Verified this session

- **DONE — Officer box CRUD.** `+ अधिकारी बॉक्स` (tile inside the officer band, beside the last
  box, not a full-width block below), delete with guards, rename through the labels API.
  Server: `server/assignments.ts` (`addOfficerBox`, `removeOfficerBox`), `POST /api/charts/:date/officer`,
  `DELETE /api/charts/:date/officer/:label`. Guards: FINALIZED → 409, a box holding a person → 409.
- **DONE — Chowki box CRUD.** `POST /api/charts/:date/chowki`, `DELETE /api/charts/:date/chowki/:locationId`
  (`addChowkiBlock`, `removeChowkiBlock`). Guards: a chowki another block's चार्ज points at → 409.
- **DONE — inline add tiles.** `+ चौकी जोडा` and `+ अधिकारी बॉक्स` are tiles in their own row,
  `.add-box`/`.add-box-tile`, hidden in print, disabled outside edit mode.
- **DONE — three-lane command band.** कार्यालयीन शाखा व कारकून now rides beside दिवस/रात्र
  (`.grid.g-core` = day │ night │ office) instead of owning half of another sheet; it needs ~294px
  against the night lane's ~451px, so it costs zero height.
- **DONE — appbar/nav.** Persistent identity bar (logo, station, product) + grouped Kushal-style
  nav (दैनिक कर्तव्य तक्ते / कार्यवाही / डेटा / समाकलन) with every older Arjish/Kushal feature
  visible and badged `WIP` / `Coming Soon`; language toggle EN|मराठी; login at the right.
- **DONE — date selector moved** out of the identity bar onto the chart toolbar (second bar).
- **DONE — one UI language at a time.** Markup ships both, CSS shows one
  (`[data-lang="en"]{display:none}`, `body.lang-en …`), choice persists in `localStorage.pd_lang`.
  The chart itself stays Marathi always (police data, not UI chrome).

## 1. Header / navigation / chrome

| # | Item | Evidence | Status |
|---|------|----------|--------|
| 1.1 | Nav dropdowns must open on **click only**, never on hover; click again collapses | live msg 2026-10-13 | DONE |
| 1.2 | Date menu opens **detached bottom-left** instead of under its button — anchor it | live msg 2026-10-13 | DONE |
| 1.3 | Date menu must list **आज / उद्या / मागील ७ दिवस / ऐतिहासिक demo तक्ता (१०/०९/२०२६)** like Kushal's and Arjish's pickers | live msg 2026-10-13 | DONE |
| 1.4 | DRAFT ⇄ FINALIZED both ways (finalize, and reopen a finalized chart back to draft mid-day) | chat.json req 0 | PARTIAL (both APIs exist; verify the toggle in the UI) |
| 1.5 | No emoji icons, no `·` separators, no em dashes in chrome (AI-vibe look) | chat.json req 0, req 7 | PARTIAL |
| 1.6 | WIP features should be **explorable** (their own pages), not only a toast | chat.json req 0 + req 4 ("we have made entire pages and popups for them"), live msg | DONE |
| 1.7 | Login is "kinda meh" — real auth is explicitly deferred; keep the local clerk login | chat.json req 0 | ACCEPTED AS IS |

## 2. Page 1 / command sheet layout

| # | Item | Evidence | Status |
|---|------|----------|--------|
| 2.1 | SR-PI box carries dotted **underlines** before दिवस:/रात्र: (चालक, RTPC) — remove them | live msg | DONE |
| 2.2 | SR-PI box is too thick — reduce its vertical padding | live msg | DONE |
| 2.3 | Gap between SR-PI card → officer band → day/night/office grid is almost touching — restore even spacing | live msg | DONE |
| 2.4 | Senior officer identity is ONE horizontal line (`वपोनि गजेंद्र पाटील ठाणे प्रमुख`) | mega.txt + chat req 0 | DONE |
| 2.5 | Support roles (writer / driver / RTPC / operator) are dynamic **horizontal columns**, driver+RTPC+operator split day/night | mega.txt | DONE |
| 2.6 | No `अधिकारी १ / अधिकारी २` heading row — start straight with the officer's name + branch | mega.txt (user's last design prompt) | DONE |
| 2.7 | Title line: `नाशिक शहर पोलीस आयुक्तालय   दैनिक कर्तव्य वाटप   १० सप्टेंबर २०२६, गुरुवार` — one centred line, no `दिनांक`/`वार` labels, no dots | mega.txt | DONE |
| 2.8 | Day and night stay visually comparable (same first three column families); do not restructure night | mega.txt + chat req 0 | DONE |
| 2.9 | Whitespace reduction is the **major** goal; night must never sit below day | chat.json req 7 | DONE |
| 2.10 | Kill the `· ०९–१४` dot style and the contrasting timing chips on chowki blocks | chat.json req 7 | DONE |
| 2.11 | 6 or 7 adaptive sheets is the ceiling; never more than the original's cost | mega.txt | DONE (6 sheets, all fit) |

## 3. CRUD completeness — "ensure EVERYTHING is crudable"

| # | Item | Evidence | Status |
|---|------|----------|--------|
| 3.1 | Officer box: add / rename / delete | live msg 1 | DONE |
| 3.2 | Chowki box: add / rename / delete | live msg 1 | DONE |
| 3.3 | SR-PI box: **nothing** was editable — make रायटर a real clickable slot (it is a real assignment row) | live msg 3 | DONE |
| 3.4 | SR-PI box: चालक / RTPC / ऑपरेटर day+night seats must be creatable, assignable and clearable (no source rows exist today, so a seat has to be created before it can be filled) | live msg 3 | DONE |
| 3.5 | SR-PI identity + `ठाणे प्रमुख` chip: editable | live msg 3 | PARTIAL (chip name renamable via labels; person swap TODO) |
| 3.6 | Audit **every** rendered element for CRUD: section headings, column titles, role labels, time windows, chips, notices | live msg 3 ("be logical about this") | TODO |
| 3.7 | CRUD popup: three sections — current person (edit master / clear), pick from existing staff (search name, English name, buckle, rank), create new staff — plus assignment fields (वेळ, बिमा, नोंद) | mega.txt + chat req 0 | PARTIAL |
| 3.8 | Popup must stay inside the viewport, scroll internally only when needed, restore the clicked slot, Esc + outside click, never reflow the chart behind it | mega.txt | PARTIAL |
| 3.9 | Clerk chooses all personnel; software never suggests or auto-fills | AGENTS.md | INVARIANT |

## 4. Presentation controls (approved earlier, server shipped, UI missing)

| # | Item | Evidence | Status |
|---|------|----------|--------|
| 4.1 | Move/float any editable element: left / centre / right, top / middle / bottom | mega.txt (user's last design prompt) | DONE |
| 4.2 | Hide an empty/रिक्त/no-data row per element (RTPC, ऑपरेटर …) to compact the sheet | mega.txt | DONE |
| 4.3 | `compact` toggle per element | mega.txt | DONE |
| 4.4 | Contract: `presentation_overrides.elements[key] = {horizontalAlign, verticalAlign, hidden, compact}`, `PATCH /api/charts/:date/presentation`, `null` clears, FINALIZED → 409 | `changes/1011-presentation-controls/proposal.md` | DONE (server) |

## 5. Feature inventory to keep visible (badged WIP / Coming Soon)

From `mega.txt`: Dashboard; दैनिक कर्तव्य तक्ते → पंचवटी तक्ता → ६ पृष्ठे; कार्यवाही → कार्यकारी
डॅशबोर्ड / कर्तव्य फलक / बंदोबस्त व विशेष मोहीम / ऐतिहासिक शोध / इव्हेंट अ‍ॅनेक्स; डेटा → मास्टर डेटा /
दस्तऐवज आयात (OCR) / जुने तक्ते प्रतवारी / अहवाल व PDF निर्यात; समाकलन → WhatsApp वर तक्ता पाठवा /
Telegram अलर्ट / इतर ठाणी (बहु-ठाणे) / तक्ता टेम्पलेट बिल्डर.
Also: guided English→Marathi transliteration for names and free text (explicitly desired, local only).

| # | Item | Status |
|---|------|--------|
| 5.1 | All of the above visible in nav with honest badges | DONE |
| 5.2 | Each opens an honest "Coming Soon / what it will do" page instead of a bare toast | DONE |
| 5.3 | Guided EN→MR transliteration aid for names/free text | TODO (deferred, local only) |
| 5.4 | No external calls with chart data; WhatsApp/Telegram stay badges, never wired | INVARIANT |

## 6. Verification debt

| # | Item | Status |
|---|------|--------|
| 6.1 | Verify CRUD live end-to-end (add → rename → assign → delete, officer + chowki + SR-PI seats) and clear junk boxes | DONE (212 rows restored) |
| 6.2 | `npm run check` (typecheck + invariants + tests + doctor) | DONE |
| 6.3 | `npm run print:audit` — all sheets fit A4 | DONE (6/6) |
| 6.4 | Lossless render (`npm run render:chart`, row count parity) | DONE (212/212) |
| 6.5 | Screenshots of all sheets + the new chrome at the end of the session | DONE |

## 7. Explicitly deferred (do not implement without a user decision)

11/09 event annex; legacy six-page viewer as the *authoring* screen (kept only as a reference
render); OCR import; full historical search; real authentication; multi-station; cloud/WhatsApp/
Telegram runtime; full template builder. These are visible as badges only.

## 8. Hard rules this backlog may not break

- Clerk chooses all personnel; software calculates, flags and renders only.
- `रिक्त` ≠ `बंद` ≠ `बिमा`; बिमा is an explicit field, never inferred from Marathi text.
- FINALIZED chart = immutable snapshot; amendment = new version.
- PostgreSQL is the single store; never create page-specific tables.
- Marathi wraps, never truncates. Protected tokens are never translated or transliterated.
  Canonical spellings: बिमा (never विमा), पोशि (never पोषि).
- Unfinished features are labelled and honest; never a half-usable control.
- Never modify `reference/`. Never edit an applied migration. No chart data leaves the machine.

## Session log — 2026-10-13 (second pass)

| # | What shipped | How it was verified |
|---|---|---|
| 1 | Nav dropdowns open on click only (hover/focus-within removed), click again closes | live DOM: click → open, click → closed |
| 2 | Date menu reworked — the wrapper had no `position:relative`, so the menu anchored to the sticky toolbar (measured left: -47px, detached). Now anchored to its own button and grouped आज / उद्या / मागील ७ दिवस / जुने तक्ते; an empty group says तक्ता नाही instead of offering a dead date | live DOM: menu left = button left = 16, top = button bottom + 6, four group heads rendered, no off-screen overflow |
| 3 | Sr-PI card CRUD — रायटर is a real slot (same picker as any desk row); चालक / RTPC / ऑपरेटर day+night seats are created with + जागा and removed with ✕ (POST / DELETE /api/charts/:date/support) | API: 201 create, 409 duplicate, 400 bad role, 200 delete, 404 missing; render carries both controls |
| 4 | Card corrections — no dotted underlines before दिवस:/रात्र:, thinner card, real gaps between card → officer band → desk grid (9px / 8px, were ~0) | live geometry; sheet 1 fell 750px → 685px; print:audit still 6/6 |
| 5 | One row, one home — the card owns its रायटर row and the office column no longer repeats that same assignment | writer name occurs exactly 1 time in the whole render; 121 slot renders / 121 unique ids |
| 6 | Presentation controls UI — a स्वरूप button in the chart toolbar; click any of 189 highlighted elements for horizontal / vertical / compact / hide, and hidden elements are listed in a restore bar so hiding is never one-way | live: panel opens → PATCH → reload → data-horizontal-align=right persisted and computed; cleared back to {}; invalid value → 400 |
| 7 | WIP leaves open an honest placeholder page instead of a toast — visible, explorable, never a half-usable control | click handler wired to the existing flyer shell; 13 data-wip leaves in the nav |
| 8 | Bilingual + emoji chrome removed (the 👁 पूर्वावलोकन (Preview Mode) button) → single-language [data-lang] spans | no emoji left in renderer or client; screenshot shows Marathi-only chrome |

Full gates: `npm run check` (typecheck + **83 tests** + doctor x2 DBs), `npm run print:audit` **6/6** (685/715/558/663/569/649px), `npm run render:chart` **212/212** lossless, live API suite 17/17. Dev DB left clean: 212 assignments, `presentation_overrides = {}`.

## 9. User numbered feedback, third round (2026-10-13)

| # | Item | Status |
|---|------|--------|
| 1 | Navbar logo + station name too small vs the other nav elements | DONE (40px logo, 15.5/12px lockup) |
| 2 | WIP flyer text stayed Marathi when EN toggled | DONE (bilingual `data-lang` spans all through) |
| 3 | Drop “संपूर्ण तक्ता (सर्व पृष्ठे)” from the Daily Duty Charts dropdown | DONE |
| 4 | Drop the WIP badge from the group buttons; expose the master data we actually have | DONE (`data-masters` → real viewer over `GET /api/masters`: staff searchable, chowki/duty tags, counts). Master *editing* remains a labelled WIP leaf |
| 5 | Drop “जुने तक्ते प्रतवारी” from डेटा; add the legacy 10 Sept chart in a संदर्भ section | DONE — legacy = the real six-page chart in Kushal's repo (`Page1View…Page6View.tsx`), a separate local app on :3101, linked not proxied; `npm run legacy:start`; flyer probes reachability and prints the start command when down (T19) |
| 6a | Make the 2nd (chart) bar sticky | DONE (`top: 56px`, under the identity bar) |
| 6b | Remove the buggy standalone लेआउट button; fold layout options into element editing | DONE (button + dead CSS removed; align/vertical/compact/hide live in the element flyer) |
| 7 | 2nd-bar date + weekday in Latin when EN is toggled (chart stays Marathi); redesign the selector | DONE for the bilingual part; the selector redesign still needs the Kushal/Arjish reference (T20) |
| 8 | Six chowki boxes equal size, 3×2, no two tall chowkis stacked | DONE (`grid-template-rows: 1fr 1fr` + `align-items: stretch`) |
| 9 | Scan-schedule whitespace + one-row-per-staff court register | BRIEF DONE, NOT IMPLEMENTED — `docs/BRIEF_DENSE_TABLES.md` (3 options each, A/A recommended, station to pick: T21) |
| 10 | Move सूचना व निर्देश into/near their blocks; explain why notices are not CRUDable | BRIEF DONE, NOT IMPLEMENTED — `docs/BRIEF_NOTICES.md` (3 placement options + the four-class CRUD audit; notices are author text in `chart_notices`, so they CAN be made CRUDable: needs id-in-render + endpoints + flyer; N13 needs the block mapping) |
| 11 | Bilingual input (separate Marathi field, EN↔MR as you type) | DONE — offline `romanToDev`/`devToRoman` + `bindTranslit`; English name field added to the create form; manual edits always win; no network (T22) |
| 12 | “Don’t list the same row again where it adds no info — for all such occurrences” | DONE by audit: 121 slot renders / 121 unique `data-asn` ids, 0 duplicates; the Sr-PI card owns its रायटर row and the office column no longer repeats it |
| 13 | Blocking test failure left by the previous round | FIXED — `Names.e(..., empty)` restored for the Sr-PI support groups |
| 14 | Seats inside a labelled group opened the rename flyer instead of the staff picker (found live with the browser, not by any test) | FIXED — click priority is now seat → label |
| 15 | A load-time SyntaxError in the client script killed all chrome while every test passed | FIXED + guarded: `new Function(js())` parse test and a transliterator name-table test added (`tests/authoring.test.ts`, 85 tests total) |

Next (needs a user decision, in order): pick the dense-table option (T21) → pick the notice placement (N13/T21) → implement notice CRUD (id → endpoint → flyer) → date-selector visual from the Kushal/Arjish reference (T20) → then the 11/09 chart + event annex.
