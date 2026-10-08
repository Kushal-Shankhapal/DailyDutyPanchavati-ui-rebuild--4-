<!--
Purpose: SUPERSEDED — was the Stitch generation brief for the one controlled UI exploration pass.
Current role: Historical only. Do not use; `docs/DESIGN_REFINEMENT_BRIEF.md` replaced it on 2026-10-06.
Last meaningful change: 2026-10-06 — marked superseded after the user's design-refinement decision (implementation-led refinement of compact-v2 instead of a blank-canvas tool pass).
Constraint/dependency: Kept for traceability; UI_TRACEABILITY references moved to the new brief.
-->

> **⚠ SUPERSEDED (2026-10-06).** This brief framed the next step as buying "layout + hierarchy + density decisions" from Stitch. That decision has changed: the layout/hierarchy/density work already exists in compact-v2 (HTML mockup + live React profile), so the active contract is **`docs/DESIGN_REFINEMENT_BRIEF.md`** — *validate and refine the existing compact-v2 design against real data, responsive constraints, and interaction requirements*. Date convention in the new brief: reference १० सप्टेंबर २०२६ · product ०६ ऑक्टोबर २०२६ · tomorrow ०७ ऑक्टोबर २०२६ (this file mixed them). Kept for traceability only.

# STITCH_BRIEF — one controlled visual pass (SUPERSEDED)

How to use: paste the COMMON BLOCK first as the project context/design-system prompt, then generate screens one at a time with each screen block. Review each output against UI_SPEC.md (the section numbers below) before accepting. Expect 2–3 iterations per screen, not pixel perfection — we are buying **layout + hierarchy + density decisions**, which then get rewritten into `UI_SPEC.md` amendments and implemented in React by the coding agent.

## COMMON BLOCK (paste before every screen)

```
Design a DESKTOP-FIRST operational web app for an Indian police station duty-chart clerk.

STATION: पंचवटी पोलीस ठाणे, नाशिक शहर (Marathi, Devanagari script, Marathi-first UI).

AESTHETIC: official operational command document. Calm, dense but readable, print-influenced.
Reference feel: a landscape police duty register — ruled tables, boxed officer cards, crisp 1px borders.
Palette: deep navy headers (#0b3568 family), slate grays for structure, white surfaces,
        restrained functional accents ONLY for states (see below). No gradients, no shadows-heavy
        cards, no rounded-2xl SaaS look, no illustrations, no icons-for-decoration.
Font: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', sans-serif. Devanagari digits for dates/times.

STATE LANGUAGE (fixed, never restyle):
- [बिमा] = crimson chip after a person's name (beat-marshal qualifier)
- रिक्त = amber DASHED tag "+ १ जागा रिक्त" (vacant seat)
- बंद = slate hatched fill + text "बंद" + line "चार्ज → <ठिकाण>" (closed location)
- [तपास] [प्रशा] [गुन्हे] = small blue-gray branch-tag chips after officer names
- रायटर: / ऑपरेटर: support-role labels = one consistent accent color everywhere
- FINALIZED / DRAFT / VALIDATED lifecycle badges: green / amber / blue

NAVIGATION (every screen, slim top bar):
पंचवटी पोलीस ठाणे · नाशिक शहर | आजचा तक्ता | दैनिक तक्ते | शोध | मास्टर डेटा
(current item active; date + lifecycle badge on the right when a chart is loaded)

HARD RULES:
- Do NOT invent features, filters, analytics, KPI cards, charts/graphs, notifications, settings, or admin panels.
- Do NOT turn any screen into a generic dashboard or CRUD admin.
- Marathi text WRAPS, never truncates or ellipsizes.
- Every empty seat shows रिक्त explicitly; nothing is silently blank on the duty board.
- Editing happens by clicking person lines / slots; contextual "+ कर्मचारी" actions open a picker
  (search list + bottom "➕ नवीन कर्मचारी जोडा" mini-create). Show pickers where the screen asks.
- Human chooses everything: no auto-assigned people, no "suggestions" that apply themselves.

SAMPLE PEOPLE (use exactly these shapes; rank-abbr + buckle + surname):
officers: वपोनि गजेंद्र पाटील · पोनि सुनिल पवार [तपास] · पोनि नितीन आंधळे [प्रशा] · पोनि सुधीर पाटील [गुन्हे]
constables: पोशि ५४२ आहेर · पोशि १९९८ वाकचौरे · पोहवा २१०० पाटील · पोशि २२७२ गायकवाड [बिमा] ·
            पोशि १२४४ महाले [बिमा] · पोशि ९१३ गंदलवाड · पोहवा ५०९ बाविस्कर · पोशि २३१२ भाबड [बिमा]
SIX CHOWKIS (fixed order): काटया मारूती · पंचवटी कारंजा · मालेगांव स्टँड · सरदार · फुले नगर · मेरी
DATE: दिनांक: १० सप्टेंबर २०२६ · वार: गुरुवार · दिवसपाळी ०९:००–२१:०० · रात्रपाळी २१:००–०९:००
```

## SCREEN 1 — आजचा तक्ता (Today / Home)

```
Design the TODAY screen. It answers ONE question: "आजचा ड्युटी तक्ता काय आहे?"

Layout top→bottom:
1. Chart header strip: date/weekday (Devanagari), lifecycle badge DRAFT, action buttons:
   [संपादन करा] [उद्याचा तक्ता] [प्रिंट] [अधिक ▾]
2. THE COMPACT DUTY BOARD (read-only view of the editor screen):
   - Sr-PI box: "वरिष्ठ पोलीस निरीक्षक: गजेंद्र पाटील" with रायटर/चालक/RTPC dotted slots
   - one row of officer cards (name + branch chip + रायटर/ऑपरेटर lines)
   - HQ day/night two-column table (अधिकारी, ठाणे अंमलदार, मदतनीस, CCTNS, वायरलेस,
     लॉकअप, CR मोबा., डेल्टा/पिटर, DB पथक)
   - 6 chowki blocks (3 across × 2 rows), each: chowki name → "अधि. <in-charge> (०९–१४)"
     → दिवसपाळी ०९–२१ and रात्रपाळी २१–०९ sub-columns with people lines, one [बिमा] chip visible,
     one block showing बंद + "चार्ज → मालेगांव स्टँड", one showing "+ १ जागा रिक्त"
   - marshal/special row + office/court desk row (compact)
3. Collapsed secondary panel row: ▸ रजा / इतर ड्युटी ▸ मनुष्यबळ ▸ अधिकारी सारांश
   ▸ अचानक बदल ▸ स्कॅन वेळापत्रक ▸ सूचना ▸ इव्हेंट
4. Bottom attention strip: "⚠ लक्ष देणे आवश्यक — • २ रिक्त • १ रजा-conflict • १ बंद चौकी"

NO analytics cards, NO charts, NO welcome banner, NO KPI tiles.
```

## SCREEN 2 — Chart Editor

```
Design the CHART EDITOR: the same board, now EDITABLE, like a digital duty register.

Same layout as the Today board plus:
- Header: ← आजचा तक्ता | date | DRAFT v1 | save-state indicator "जतन झाले"
- Buttons: [प्रिंट] [तपासणी] [अंतिम करा]
- Every person line and empty slot is hoverable with a subtle edit affordance.
- Contextual action row at the board bottom: [+ चौकी] [+ ड्युटी] [+ कर्मचारी] [+ सूचना] [+ इव्हेंट]
- Show ONE chowki block in "active edit" state: its "+ कर्मचारी" button pressed and the
  STAFF PICKER popover open anchored to the block (search field, 4 sample results,
  bottom "➕ नवीन कर्मचारी जोडा").
- Show ONE officer card with an empty ऑपरेटर: row displaying a faint "+ कर्मचारी" affordance.
- The बंद chowki shows its hatch + charge line; the vacant seat shows the amber dashed tag.
```

## SCREEN 3 — Staff picker + mini-create

```
Design the STAFF PICKER as two stacked states in one screen:
1. Picker popover (as opened from a chowki block): title "कर्मचारी जोडा",
   search "🔍 कर्मचारी शोधा…", results list (rank-abbr + buckle + name, 5 rows,
   one row carrying a small gray availability hint "साप्ताहिक सुट्टी"),
   divider, bottom action "➕ नवीन कर्मचारी जोडा".
2. The mini-create form (same popover, second state): fields पद (dropdown of
   पोशि/पोहवा/मपोशि/…), पूर्ण नाव, बक्कल नं, मोबाईल (ऐच्छिक), buttons [जतन करा] [रद्द].
Keep both states compact (popover-sized, not full-page).
```

## SCREEN 4 — उद्याचा तक्ता (Tomorrow)

```
Design TWO states:
1. Creation dialog "उद्याचा तक्ता तयार करा": target date ०७ ऑक्टोबर २०२६,
   radio bases: ○ आजचा तक्ता (१० ऑक्टोबर) ○ कालचा तक्ता ○ रिकामा तक्ता, button [तक्ता तयार करा].
2. Result editor header for ०७ ऑक्टोबर (DRAFT v1) with a copy-findings strip:
   "⚠ ४ उपलब्धता conflicts · ⚠ २ रिक्त जागा — [संपादन सुरू ठेवा]"
   and the board below with two person-lines carrying red-outline conflict chips.
```

## SCREEN 5 — दैनिक तक्ते (History)

```
Design the HISTORY screen: a plain date list, newest first.
Rows: "०६ ऑक्टोबर २०२६ — DRAFT v1", "०५ ऑक्टोबर २०२६ — FINALIZED v2", "०४ …", "०३ …"
Top segmented filter: [ आज ] [ उद्या ] [ अलीकडील ] [ ऐतिहासिक ]
Row hover shows [पहा] and (on the finalized row) [दुरुस्ती].
Clicking a row opens the read-only chart (same board, no edit affordances).
No table sorting UI, no pagination controls beyond a simple "आणखी…" link.
```

## SCREEN 6 — शोध (Search)

```
Design the SEARCH screen: one quiet form, not a dashboard.
Fields: कर्मचारी [____] · ड्युटी/ठिकाण [____] · दिनांक [____]–[____] · [शोधा]
Below: results list of chart dates, each row showing the matching line, e.g.:
"१० सप्टेंबर २०२६ — पोशि ९१३ गंदलवाड · मालेगांव स्टँड चौकी · दिवसपाळी"
Result rows clickable (opens the chart with the match highlighted).
```

## SCREEN 7 — मास्टर डेटा (Master data)

```
Design the MASTER DATA screen: deliberately plain admin table, six tabs:
[ कर्मचारी ] [ पदे ] [ ड्युटी ] [ ठिकाणे ] [ युनिट ] [ साहित्य ]
Active tab कर्मचारी: search box, [+ कर्मचारी] button, table columns
नाव | पद | बक्कल | मोबाईल | स्थिती (सक्रिय) | कृती [संपादा] [निष्क्रिय करा]
One row shown as निष्क्रिय (grayed, [पुन्हा सक्रिय करा]).
No cards, no stats, no charts. Boring and obvious.
```

## SCREEN 8 — Secondary panels / Event annex editor

```
Design TWO states:
1. The editor screen with ▸ रजा / इतर ड्युटी panel EXPANDED: leave categories as
   SIDE-BY-SIDE columns (साप्ताहिक सुट्टी | किरकोळ रजा | अर्जित रजा | सिक/गैरहजर |
   इतर ड्युटी), each a compact list of "rank+buckle+name (+ window/range)" lines
   with [+ कर्मचारी] at each column foot. NOT one vertical table.
2. EVENT ANNEX editor (reached from ▸ विशेष बंदोबस्त / इव्हेंट): event header
   "गणेशोत्सव रंगीत तालीम — ११/०९/२०२६ · १०:०० फॉल-इन, पो.स्टे. मैदान",
   personnel table (अ.क्र | नाव व बक्कल | अतिरिक्त साहित्य | अनिवार्य साहित्य) with 3 sample rows
   (सर्च लाईट+दोर / मेगाफोन / व्हिडीओ कॅमेरा; mandatory column: षिल्ड·लाठी·हेल्मेट·षिनगार्ड),
   instructions block with the 10:00 fall-in order text, [+ कर्मचारी] [+ साहित्य] [+ सूचना] actions,
   and a [इव्हेंट ॲनेक्स प्रिंट] button.
```

## Review protocol (after generation)

For each screen, check against UI_SPEC.md:
- §1 principles (no invented features, wrap-not-truncate, labeled states)
- §5–§7 grammar (officer/chowki block structure exactly as specified)
- §12 side-by-side leave columns, no footers/टीप lines
- §17 state language fidelity (chips/hatch/dash)
- Anti-pattern list (§21) absent
Accept = goes into UI_SPEC amendments; Reject = one revision round with a concrete, spec-cited change list. Then update UI_SPEC.md and UI_TRACEABILITY.md and hand the package to the implementation agent.
