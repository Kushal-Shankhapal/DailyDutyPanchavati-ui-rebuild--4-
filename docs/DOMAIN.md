<!--
Purpose: Domain entities and operational rules distilled from the 10/09 + 11/09 charts and old-repo decisions.
Current role: Meaning authority — code implements this, never the reverse.
Last meaningful change: Created 2026-10-06 from audit evidence.
Constraint/dependency: Every concept traceable in TRACEABILITY.md; unknowns governed by OPEN_QUESTIONS.md.
-->

# DOMAIN

Station: पंचवटी पोलीस ठाणे, नाशिक शहर. Charts are per-date documents containing two shifts.

## Vocabulary (exact, protected)

| Term | Meaning | Distinguisher |
|---|---|---|
| रिक्त | an existing duty slot with no person | state of a slot |
| बंद | location/chowki operationally closed that shift | state of a location; carries चार्ज → destination note |
| बिमा | per-person beat-marshal qualifier on an assignment | boolean field on assignment; `[बिमा]` chip |
| प्रभारी | the in-charge person of a chowki block | display role of an assignment |
| चार्ज (transfer) | consequence text of बंद ("चौकी चा चार्ज X कडे") | structured location-state field, not free note |

Never: विमा, पोषि. Never translate: CCTNS, Dial 112 MERS, DB, MERS, rank codes, TOTAL, Office, ME.

## Three distinct facts (verified 2026-10-08 against source Table 1)

1. **BIMA** = person-level qualifier on an *assignment* (that constable's posting IS the beat). Exists only where a person row exists.
2. **Marshal post** = a *separate operational post* with its own staffing — the source chart carries a dedicated marshal column (काटया मारूती मार्शल, पंचवटी कारंजा मार्शल, मालेगांव स्टँड मार्शल, फुले नगर मार्शल, मेरी मार्शल). It can be बंद with charge transferred while the neighbouring chowki is fully staffed.
3. **Chowki closure** = the *chowki* itself closed, charge to another chowki.

Source evidence (कारंजा day shift, Table 1): chowki column shows `सपोनि प्रशांत बोरसे 16 ते 21` + `चौकी चा चार्ज काटया मारूती चौकी कडे` while the marshal column independently shows `पंचवटी कारंजा मार्शल → बंद → चार्ज मालेगाव स्टँड कडे`. The DB therefore carries three explicit fields — `assignment.is_bima`, marshal-post `location_operational_state`, chowki `location_operational_state` — never inferred by parsing notes.

## Entities

### Masters
- **Rank** — 16 canonical codes; officers render rank+name, constables rank+buckle+name.
- **StaffMember** — full name, rank, buckle/service no, phone, active. Deactivation over deletion.
- **Location** — six chowkis (काटया मारूती, पंचवटी कारंजा, मालेगांव स्टॅड, सरदार, फुलेनगर, मेरी) + station + office + fixed points (काळाराम मंदिर, रामकुंड, मार्केट यार्ड…). Chowki order for scan config is stable configuration, not schema.
- **DutyDefinition** — recurring duties (HQ block, office catalog, marshal groups, मोबाईल पथक, गुडमाॅर्निंग स्काॅड…). ~49 seeded from source; clerk-editable.
- **Unit** — पिटर/सी.आर./डेल्टा/DB/पंचवटी 1 मोबाईल; optional on assignments.

### Daily
- **DailyChart** — one per date; DAY 09:00–21:00 and NIGHT 21:00–09:00 (overnight, belongs to start date) are station-configured shift presets; assignments may carry typed split windows (09–14 + 16–21).
- **Assignment** — person? + duty + location? + shift + typed start/end + allocation state + status + source + BIMA + notes + unit?. One person may appear in multiple rows (source does this); one row may hold multiple people when the source does (support via multiple assignment rows sharing a slot grouping — SME N12).
- **Availability** — separate from assignment. Categories observed: साप्ताहिक सुट्टी, किरकोळ रजा (hourly), अर्जित रजा (date range), सिक, गैरहजर, प्रसुती रजा, बाल संगोपन रजा, हायकोर्ट-मुंबई, तपासकामी (city/state), प्रशिक्षण, प्रतिनियुक्ती, निर्भया/दामिनी पथक, मिसिंग सेल, कोर्ट पैरवी (सेशन/JMFC), वाघ जाप्ता, पो.स्टे.रिझर्व्ह, बाहेर बंदोबस्त. Availability conflicts produce warnings only.
- **LocationOperationalState** — per date+location: closed? + charge destination.
- **SuddenDutyChange** — append-only ledger (कारण मीमांसा): original person, replacement?, reason, time, actor/version context.
- **ChartNotice** — ordered instructions: night directives (गुडमाॅर्निंग स्काॅड composition + रामकुंड पेट्रोलिंग + पुतळा भेटी + चौकी अंमलदार गस्त + बिट मार्शल 2-तास रिपोर्ट/सुरक्षित ॲप स्कॅन + आस्थापना बंद), day notices, event notices.
- **ScanSchedule** — stable config: morning 09–15 (chowki→in-charge), afternoon 15–21 (chowki→mobile: मेरी+फुलेनगर→सी.आर., काटया+कारंजा→डेल्टा, स्टॅड+सरदार→DB), 12 hourly windows 09–21 (rotating chowki, daily person), night 21–09 (chowki→mobile) + ग्रीन ॲप note. Daily rows: hourly staff, overrides.
- **ManpowerRecord** — rank × status matrix (मंजुर संख्याबळ, हजर मनुष्यबळ, Office=09, ME=233, प्रत्यक्ष हजर=03, deductions). Stored authoritative values + clearly-labeled derived values; never auto-reconciled.
- **OfficerSummary** — 15 subordinate officers (roster #2–#16; senior PI excluded) × कर्तव्य; derived suggestion with manual override; provenance recorded.

### Events
- **SpecialEvent** — e.g. गणेशोत्सव रंगीत तालीम, 11/09/2026, 10:00 fall-in at पो.स्टे.मैदान. Not hardcoded to Ganesh; type is data.
- **EventAssignment** — event + person + optional role (11/09: 11 personnel, rows 1–11 of Table 3).
- **EventEquipment** — event + person + lines: अतिरिक्त साहित्य (search light+दोर, मेगाफोन, व्हिडीओ कॅमेरा, गॅस गन+सेल with counts, षाॅटनग 12 बोअर+राउंड, एस.एल.आर+राउंड types, षिल्ड व लाठी) and अनिवार्य साहित्य (षिल्ड, लाठी, हेल्मेट, षिनगार्ड, बाॅडी प्रोटेक्टर).
- **EventInstruction** — fall-in order text + absentee warning (गैरहजर नोंद + कसुरी अहवाल).
- **Event annex** — print projection only; the packet's extra physical page is a renderer fact (11/09 evidence), never a schema fact.

## Lifecycle & history
DRAFT → VALIDATED → FINALIZED (no AMENDED state). Finalize freezes a complete snapshot; reprint replays snapshot. Correction = new version, fresh draft. Copy-previous: structural baseline + reusable roles copied; availability re-overlaid for the new date; conflicts flagged; source untouched.

## Human control
The clerk picks every person. Software may: compute totals where proven, flag conflicts, warn on double-booking/leave overlap, suggest (never apply) page-5-style drafting. It must never: auto-select, auto-replace, auto-reconcile contradictory source numbers, or invent duties/procedure.

## Time
Typed columns only (HH:MM + dates). Displayed Devanagari digits (०९ ते १४) are presentation of typed values. Machine meaning never comes from note text.

## Information preservation rule
Every block in the 10/09 and 11/09 source packets (see INITIAL_AUDIT §7 coverage tables) must be representable. Anything not on the compact board lives in a secondary panel — data-first, not page-first.
