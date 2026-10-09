# Panchavati Daily Duty Chart — Product & UI Design Specification v4

> **Status:** Implementation-Ready Specification (Authoritative v4 Baseline)  
> **Target Date Baseline:** १० सप्टेंबर २०२६ (Thursday / गुरुवार)  
> **Station:** पंचवटी पोलीस ठाणे, नाशिक शहर (Panchavati Police Station, Nashik City)  
> **Print Geometry:** A4 Landscape (२९७mm × २१०mm), exactly 5 physical pages  
> **Visual Baseline:** Evolved from SPI-approved `compact-v3` (`design/panchavati-compv3.html` & `design/compv3.css`)  
> **Domain Authority:** `docs/DOMAIN.md`, `docs/ARCHITECTURE.md`, `reference/SEMANTIC/`, `reference/EXCEL_RECONSTRUCTION/`

---

## 1. Product Direction

### 1.1 Core User & Primary Operational Workflow

* **Primary Persona:** Station Attendance Clerk (**हजेरी लेखनिक**), Panchavati Police Station.
* **Operating Context:** High-pressure operational environment; prepares the daily deployment chart under strict shift-handover deadlines (09:00 Day Shift, 21:00 Night Shift). 
* **Language Model:** **Marathi-First Unicode** for all chart data, headings, ranks, notes, and print output. The web application's UI chrome (buttons, system navigation, tooltips, modals) defaults to **English** for immediate clarity and clerk speed, with a planned 1-click toggle to Marathi. Protected operational tokens (`CCTNS`, `Dial 112 MERS`, `DB`, `MERS`, `Office`, `ME`, `TOTAL`, rank codes) are strictly preserved as-is.
* **Core Philosophy:** **The human clerk chooses all personnel.** The software never autonomously schedules, auto-fills, or silently replaces officers or constables. The application calculates totals, flags conflicts, enforces print geometry, and renders.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DAILY CLERK WORKING JOURNEY                           │
│                                                                             │
│  [1. Open Today]  ──▶  [2. Review Copy]  ──▶  [3. Toggle Edit Mode]        │
│  Loads 10/09/2026      Yesterday's draft       Subtle dashed affordances    │
│  in Preview Mode       auto-populated          and hover pencils appear     │
│         │                                                │                  │
│         ▼                                                ▼                  │
│  [6. Print A4]   ◀──  [5. Finalize v1]   ◀──  [4. Live CRUD Adjustments]   │
│  5 Landscape Sheets    Locks to immutable      Staff Picker, BIMA toggles,  │
│  Direct to Laser       snapshot JSONB          Closed posts, CL time spans  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Recommended Minimal Navigation

Avoid bloated SaaS dashboards, deep sidebars, and generic card grids. The duty chart **is** the application's primary working canvas.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  पंचवटी — दैनिक कर्तव्य वाटप   [DRAFT]     ◀ १० सप्टेंबर २०२६ (गुरूवार) ▶      [👁 Preview | ✏️ Edit]  💾 Save (3)  🖨 Print  ⚙  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Top Navigation Bar Elements
1. **Station Identifier & Lifecycle Badge (Left):**
   * Station title: `पंचवटी — दैनिक कर्तव्य वाटप`.
   * Status Pill: `[DRAFT]` (Amber), `[FINALIZED v1]` (Emerald), or `[AMENDMENT v2]` (Blue).
2. **Date & Shift Navigator (Center):**
   * Interactive Devanagari date display: `◀ १० सप्टेंबर २०२६ (गुरूवार) ▶`.
   * Left/Right chevrons step through dates.
   * Clicking the date text opens the calendar date-picker popover.
   * Guarded by an **Unsaved Work Interceptor** if edits are pending.
3. **Working Mode Toggle (Right):**
   * Segmented toggle: `[👁 Preview | ✏️ Edit]`.
   * Defaults to `Preview` on page load (clean, 100% print-accurate, zero UI clutter).
4. **Primary Action Buttons (Right):**
   * `💾 Save`: Disabled when no changes exist; lights up with an amber pill showing pending edits count (e.g., `Save (3)`). Keyboard shortcut: `Ctrl+S`.
   * `🖨 Print`: Always accessible; invokes browser print dialogue targeting `@media print`.
   * `⚙ Overflow Menu`: Access to Staff Master Data (`कर्मचारी मास्टर`), Copy-Forward from Date, Revert to Last Saved, and English/Marathi UI Chrome Toggle.

---

### 1.3 Main Screen Structure & Sticky Page Ribbon

Below the top navigation bar sits the **Sticky Section Jump Ribbon** allowing the clerk to instantly jump to any of the 5 canonical A4 pages without excessive scrolling:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  PAGE JUMP:  [1. ठाणे व अधिकारी]   [2. चौक्या व गस्त]   [3. रजा व इतर]   [4. मनुष्यबळ मॅट्रिक्स]   [5. अधिकारी सारांश व स्कॅन]  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### View / Edit State Matrix
* **Preview Mode (Default):**
  * Renders the complete 5-page A4 landscape document on an off-white canvas (`#e5e7eb`).
  * Completely clean: no pencil icons, no dotted outlines, no placeholder buttons.
  * What you see on screen is pixel-identical to the final printed sheets.
* **Edit Mode:**
  * Active editing indicators appear on hover and keyboard focus.
  * Unallocated positions reveal a subtle dashed amber badge: `[+ रिक्त जागा]`.
  * Contextual add affordances (`+ अधिकारी`, `+ कर्मचारी`, `+ नोंद`) appear in card footers.
  * Cells respond to clicks by opening lightweight, anchored popovers.

---

## 2. Chart v4 Specification (Accurate Visual Refinements)

### 2.1 The 5-Page Canonical Architecture (A4 Landscape)

The physical chart strictly spans **5 landscape pages (297mm × 210mm)** with zero vertical spill:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PAGE 1: ठाणे मुख्यालय, वरिष्ठ अधिकारी व मुख्य पाळी कर्तव्य                              │
│ • Station Header + Lifecycle Badge                                                     │
│ • Senior PI Command Card (वरिष्ठ पोलीस निरीक्षक: गजेंद्र पाटील ठाणे प्रमुख)               │
│ • 4 Level-2 Officer Desk Blocks (तपास, प्रशा, गुन्हे, विशेष)                            │
│ • Lower Band 4 Equal Columns:                                                          │
│   Col 1: दिवस पाळी (09:00–21:00) | Col 2: रात्र पाळी (21:00–09:00)                    │
│   Col 3: कार्यालयीन शाखा व कारकून | Col 4: कोर्ट, समन्स, वॉरंट व विशेष कक्ष             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PAGE 2: सहा पोलीस चौक्या, बिट मार्शल व रात्रगस्त सुचना                                 │
│ • 6 Chowki Matrix (3×2 Grid): काटया मारूती, पंचवटी कारंजा, मालेगाव स्टँड,               │
│                               सरदार, फुले नगर, मेरी                                    │
│ • 5 Dedicated Beat Marshal Posts with Independent Closures & Charge Transfers          │
│ • Night Patrol Directives & Good Morning Squad (mirrored from Night DB Squad)         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PAGE 3: रजा, साप्ताहिक सुट्टी, गैरहजर व बाह्य बंदोबस्त                                  │
│ • Section A: 8 Categorized Leave Cards (साप्ताहिक सुट्टी, किरकोळ रजा, अर्जित रजा, सिक,    │
│              प्रसुती रजा, बाल संगोपन, गैरहजर, तपासकामी/प्रशिक्षण)                       │
│ • Section B: 4 Court & Special Units (सत्र न्यायालय, JMFC कोर्ट, दामिनी/निर्भया, रिझर्व्ह)│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PAGE 4: मनुष्यबळ स्थिती दर्शक मॅट्रिक्स व अचानक बदल नोंद                               │
│ • Strength Matrix (12 Ranks × Sanctioned/Present/Leaves; Office=09, ME=233, Direct=03)│
│ • Shift Summaries (Day, Night, Other × Officers, Men, Women, Total)                    │
│ • Sudden Duty Change Audit Ledger (अचानक ड्युटी बदल कारण मीमांसा)                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PAGE 5: पोलीस अधिकारी कर्तव्य सारांश, सुरक्षित ॲप वेळापत्रक व स्वाक्षरी                 │
│ • 15 Subordinate Officers Daily Duty Ledger (Sr. 1 to 15, Sr. PI excluded)             │
│ • Safe Nashik App Mobile Schedule (Morning, Afternoon, Night)                          │
│ • 12 Hourly QR Scan Windows (09:00 to 21:00)                                           │
│ • Official Tri-part Sign-off Block (लेखनिक, तपासणी अधिकारी, ठाणे शिक्का)               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Visual Hierarchy & Devanagari Typography Scale

Using **`Noto Sans Devanagari`** throughout, reinforced with Windows fallbacks (`Nirmala UI`, `Mangal`):

| Level | Component / Text | Size | Weight | Color Token | Screen / Print Rendering |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **L1** | Main Station Title | 17px | 800 | Deep Navy `#0b3568` | Centered, uppercase tracking |
| **L2** | Section & Page Headings | 13.5px | 800 | Dark Slate `#1f2937` | `#eef2f7` header fill strip |
| **L3** | **Chowki Name (Top of Card)** | 13.5px | **800** | Deep Navy `#0b3568` | **Highest chowki prominence** |
| **L4** | **Supervising Officer Full Name** | 12px | 700 | Primary Ink `#1f2937` | Directly below Chowki Name |
| **L4+**| **Officer Duty Hours (Pill Badge)**| 11px | **700** | Deep Navy `#0b3568` | **High-contrast pill**: bg `#e0eaf6`, border `1px solid #b6cde8` (Fixes thin/light issue!) |
| **L5** | Shift Titles (`दिवसपाळी` / `रात्रपाळी`) | 11px | 700 | Deep Navy `#1e3a5f` | Shift bar background `#f8fafc` |
| **L6** | Duty Role Labels (Left Col) | 10.5px | 700 | Muted Navy `#1e3a5f` | Right-padded, `white-space: normal` |
| **L7** | Assigned Staff Names (Right Col)| 11.5px | 600 | Cool Slate `#1f2937` | Marathi wraps, never truncates |
| **L8** | Leave Time Windows | 10.5px | 600 | Muted Ink `#4b5563` | **Strictly right-aligned** (`tabular-nums`) |
| **L9** | Sub-labels, Writers, Operators | 10px | 600 | Slate `#6b7280` | Prefix `ले:` or `ऑपे:` |

> [!IMPORTANT]
> **Resolution of Officer Duty Times:** In `compact-v3`, times such as `०९–१४` were rendered at font-weight 400 in faint gray, making them difficult to scan. In v4, officer times are elevated to a **High-Contrast Duty Pill**: `font-weight: 700; color: #0b3568; background: #e0eaf6; padding: 1.5px 6px; border-radius: 3px; border: 1px solid #b6cde8;`.

---

### 2.3 Staff Name Formatting & Wrapping Rules

The Maharashtra Police naming convention is strictly enforced:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POLICE PERSONNEL DISPLAY GRAMMAR                         │
│                                                                             │
│  OFFICER CADRE:       [Rank Short]  [First Name]  [Surname]                 │
│  (No buckle numbers)  सपोनि प्रशांत बोरसे                                    │
│                       पोनि सुनिल पवार (तपास)                                │
│                                                                             │
│  CONSTABULARY CADRE:  [Rank Short]  [Buckle Number]  [Surname]              │
│  (Buckle is mandatory)पोहवा १३४७ जाधव                                       │
│                       पोशि ५४२ आहेर                                         │
│                       मपोशि १४२१ शेळके   (Female prefix 'म')                │
│                                                                             │
│  HOME GUARD:          होम  [5-Digit Number]  [Surname]                      │
│                       होम २३५२० खाडे                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Strict Formatting Rules
1. **Never Concatenate with `+`:**
   * In legacy entries, paired staff were often written as `पोशि ५४२ आहेर + पोशि १९९८ वाकचौरे`.
   * **Rule:** Every individual is rendered on a **dedicated row/block** inside a semantic `<div>`. This ensures each person can be individually clicked, edited, or reassigned.
2. **Text Wrapping Invariant:**
   * Marathi names, ranks, and notes must **wrap naturally** (`overflow-wrap: break-word; white-space: normal;`). 
   * `text-overflow: ellipsis` and horizontal scrollbars inside printable cells are strictly prohibited.
3. **No Incomplete Display:**
   * Never display a standalone buckle number without its rank and surname if the source supports them.
   * If a person's surname is recorded, display the full `[Rank] [Buckle] [Surname]`.
4. **Devanagari Digits as Display Transform:**
   * Buckle numbers and times are stored as standard integers/ISO strings (`1347`, `09:00`) in the database, and rendered as Devanagari numerals (`१३४७`, `०९:००`) purely at the presentation layer.

---

### 2.4 The Three Distinct Operational States

Per `docs/DOMAIN.md`, software must never conflate these three states:

| State Token | Marathi Literal | Semantic Meaning | Visual Rendering in v4 |
| :--- | :--- | :--- | :--- |
| **`VACANT_RIKT`** | **`[रिक्त]`** | An established duty slot that has no staff assigned today. | Muted amber dashed pill: `border: 1px dashed #fde68a; background: #fffbeb; color: #b45309; font-style: italic;` |
| **`CLOSED`** | **`[बंद]`** | An entire outpost or marshal post is shut down for that shift. | Alert slate chip: `background: #eaeff5; color: #334155; border: 1px solid #cbd5e1;`. Shift column displays 45° diagonal CSS hatching + destination text (e.g. `चौकी चा चार्ज काटया मारूती चौकी कडे`). |
| **`BIMA`** | **`[बिमा]`** | Per-assignment Beat Marshal operational qualification. | Dedicated crimson badge: `background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; font-weight: 700;`. Canonical spelling is `बिमा` (never `विमा`). |

---

### 2.5 Detailed Page-by-Page Layout Refinements

#### Page 1: Station Command & Core Desks
* **Header:**
  * 3-column balanced CSS grid. H1 `नाशिक शहर पोलीस आयुक्तालय`, H2 `दैनिक कर्तव्य वाटप`, H3 `दिनांक: १० सप्टेंबर २०२६ · वार: गुरुवार`.
* **Senior PI Command Box (`.sr-pi-card`):**
  * Centered symmetric card: `वरिष्ठ पोलीस निरीक्षक: गजेंद्र पाटील [ठाणे प्रमुख]`.
  * Grouped columns: `रायटर: पोहवा १३४७ जाधव`, `चालक: (रिक्त line)`, `RTPC: (रिक्त line)`.
  * Dotted write-in guidelines replaced with solid thin hairline borders (`0.75pt #9ca3af`) to withstand high-speed laser printing.
* **Level-2 Officer Grid (`.g-off.fit`):**
  * 4 equal columns: `पोनि सुनिल पवार (तपास)`, `पोनि नितीन आंधळे (प्रशा)`, `पोनि सुधीर पाटील (गुन्हे)`, `परि.पोउनि अर्चना वाघ (विशेष)`.
* **Lower Band (`.p1-lower`):**
  * 4 equal columns in one horizontal row:
    1. **दिवस पाळी कर्तव्य (०९:०० ते २१:००):** PSO पोहवा १४५२ लांडे, CCTNS मपोहवा २०८१ पवार, वायरलेस मपोशि १४२१ शेळके, Mobiles (पिटर, सीआर, डेल्टा), DB Squad (५ staff), Lockup Guard (३ staff).
    2. **रात्र पाळी कर्तव्य (२१:०० ते ०९:००):** Night In-Charge सपोनि हेमंत मोहिते, Night PSO सपोउनि शेवाळे, Mobiles, Night DB Squad (६ staff), Lockup Guard (३ staff).
    3. **कार्यालयीन शाखा व कारकून:** हजेरी मास्तर, मुद्देमाल, बारनिशी, गोपनिय शाखा (३ staff), क्राईम कारकून.
    4. **कोर्ट, समन्स, वॉरंट व विशेष कक्ष:** समन्स, वॉरंट, MOB/मिसिंग, एटीसी सेल, काळाराम मंदिर गार्ड.

#### Page 2: Six Chowkis & Beat Marshal Matrix
* **3-Column × 2-Row Grid:**
  1. `काटया मारूती चौकी` (Supervising Officer: `सपोनि हेमंत मोहिते · [०९–१४]`)
  2. `पंचवटी कारंजा चौकी` (Supervising Officer: `सपोनि प्रशांत बोरसे · [१६–२१]`)
  3. `मालेगाव स्टँड चौकी` (Chowki Open; Beat Marshals active)
  4. `सरदार चौकी` (Chowki Open; Beat coverage routed to Malegaon Stand)
  5. `फुले नगर चौकी` (Supervising Officer: `सपोनि शरद पाटील`)
  6. `मेरी चौकी` (Chowki Open; Beat Marshals active)
* **5 Dedicated Beat Marshal Posts:**
  * Rendered as distinct operational rows with independent charge handovers:
    * `काटया मारूती मार्शल`: `[बंद]` `मार्शल चा चार्ज मालेगाव स्टॅंन्ड कडे`
    * `पंचवटी कारंजा मार्शल`: `[बंद]` `मार्शल चा चार्ज मालेगाव स्टॅंन्ड कडे`
    * `मालेगाव स्टॅंड मार्शल`: `पोशि २२७२ गायकवाड [बिमा]`, `पोशि १२४४ महाले [बिमा]`, `Dial 112 MERS set`
    * `फुले नगर मार्शल`: `पोशि २१५७ गुंजाळ [बिमा]`, `पोशि २९१४ रोकडे [बिमा]`
    * `मेरी मार्शल`: `पोशि १६४४ गायकवाड [बिमा]`, `पोशि २३१२ भाबड [बिमा]`, `Dial 112 MERS set`

#### Page 3: Leaves, Availabilities & Court Units
* **Section A (`रजा, साप्ताहिक सुट्टी व गैरहजर`):**
  * 8 cards across 4 columns: साप्ताहिक सुट्टी (२० staff), किरकोळ रजा (१० staff), अर्जित रजा, सिक/वैद्यकीय, प्रसुती रजा, बाल संगोपन, गैरहजर, तपासकामी/प्रशिक्षण (गुजरात व सातारा पथके).
  * **Time Alignment Fix:** All hourly windows (`०८ ते १०`, `०८ ते १२`, `०९ ते १२`) and date spans (`२८/०८ ते ११/०९`) use `margin-left: auto; text-align: right;` inside a dedicated right flex container.
* **Section B (`कोर्ट पैरवी व विशेष क्षेत्रीय बंदोबस्त`):**
  * सत्र न्यायालय पैरवी, JMFC कोर्ट पैरवी, दामिनी व निर्भया पथक, पो.स्टे. रिझर्व्ह (ग्रेपोउनि अशोक काकड).

#### Page 4: Manpower Matrix & Audit Ledger
* **Manpower Matrix:**
  * 12 rank columns (`PI` through `LPC`) + `Office TOTAL` (०९) + `ME TOTAL` (२३३).
  * Direct count row preserved: `दिवस व रात्रकरिता प्रत्यक्ष हजर: ०३`.
* **Shift Summaries (Tables 5, 6, 7):**
  * Day, Night, and Other shift breakdowns for Officers, Men, Women, Total.
* **Sudden Duty Change Audit Ledger (अचानक ड्युटी बदल कारण मीमांसा):**
  * 3 columns: `अ.नं.`, `तपषिल` (Replacement reason & personnel), `नोंद` (Station Diary GD reference).

#### Page 5: Officer Summary, QR Schedule & Sign-off
* **Officer Duty Summary:**
  * 15 subordinate officers (#2 to #16) mapped to assigned daily tasks.
* **Safe Nashik App QR Scan Schedule:**
  * Morning (09–15), Afternoon (15–21), Night (21–09).
  * 12 Hourly Scan Checkpoints (09:00 to 21:00) cycling through chowki beats.
* **Formal Tri-Part Sign-Off Block:**
  1. तक्ता तयार करणारे हजेरी लेखनिक (Chart Preparation Clerk)
  2. तपासणी अधिकारी / ठाणे प्रभारी (Inspecting Officer / In-Charge)
  3. ठाणे शिक्का व दैनिक डायरी नोंद (Station Stamp & General Diary Reference)

---

### 2.6 Contrast, Color & A4 Print Constraints

* **Screen Palette:** Deep authority navy (`#0b3568`), cool slate text (`#1f2937`), soft structural fills (`#eef2f7`, `#f8fafc`), clean white paper cards (`#ffffff`).
* **Dual-Encoding for Grayscale Photocopies:**
  * Never rely on color alone. Every colored chip combines a distinctive text label (`[बिमा]`, `[बंद]`, `[रिक्त]`), a unique border style (solid, dashed, dotted), and specific background hatching.
* **Print Stylesheet (`@media print`):**
  * `@page { size: A4 landscape; margin: 0; }`
  * Body padding: `5mm 7mm`.
  * Screen toolbar and page ribbons carry `display: none !important;`.
  * Headers invert from heavy ink-consuming solid backgrounds to white with crisp 1.5pt solid borders.
  * Measured height for Page 1 is **769px ≤ 794px physical limit**, guaranteeing single-sheet fit.

---

## 3. Interaction & CRUD Specification

### 3.1 Edit Affordances & Discoverability

* **Preview Mode:** Default on load. The chart is clean, calm, and readable. No edit buttons or icons visible.
* **Edit Mode:**
  * Editable cells display a very subtle `1px dashed #cbd5e1` outline on hover.
  * A micro-pencil icon (`✏️`, 11px, `#64748b`) appears in the top-right corner of the hovered slot.
  * Keyboard navigation (`Tab` / `Shift+Tab`) moves focus between editable duty slots with a high-contrast 2px royal blue outline (`#2563eb`).
  * Pressing `Enter` or `Space` opens the editing popover for the focused slot. `Escape` dismisses any open menu.

---

### 3.2 Inline Editing vs. Contextual Popovers

| Target Element | Interaction Trigger | Editing Interface | Scope of Change |
| :--- | :--- | :--- | :--- |
| **Template Labels** (e.g., `वरिष्ठ पोलीस निरीक्षक` ↔ `वपोनि`, Duty names) | Click on label text in Edit Mode | **Inline Text Input** with checkmark `✓` and cancel `✕` | **Template Level:** Persists across all future charts generated from this template. |
| **Staff Assignment Slot** | Click on staff name or `[रिक्त]` slot | **Universal 3-Option Staff Picker Flyer** | **Chart Instance:** Affects this specific date/shift assignment only. |
| **Duty Time Window** | Click on duty time pill (e.g., `[०९–१४]`) | **Devanagari Time Range Popover** | **Chart Instance:** Updates slot start/end hours. |
| **Location Closure State** | Click on Chowki / Marshal status badge | **Operational State Toggle Popover** (Open ↔ Closed + Charge destination) | **Chart Instance:** Sets `is_closed` and destination location. |
| **Date & Day Header** | Click on date in top navigation bar | **Calendar Date Navigator Popover** | **Navigation Action:** Switches active chart (with unsaved changes check). |
| **Cell Formatting** (Alignment, Span) | Right-click on cell in Edit Mode | **Formatting Context Menu** | Choice: "Apply to This Chart" vs "Update Master Template". |

---

### 3.3 The Universal 3-Option Staff Picker Flyer

When the clerk clicks any staff assignment or empty slot, a lightweight, anchored popover opens:

```
┌───────────────────────────────────────────────────────────┐
│  कर्मचारी नेमणूक (Staff Allocation)                     ✕  │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  [१] सध्याच्या कर्मचाऱ्याची माहिती बदला (Edit Master)      │
│      सपोनि प्रशांत बोरसे यांचे रेकॉर्ड संपादित करा           │
│                                                           │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  [२] हजर कर्मचारी निवडा (Select Existing Staff)            │
│      ┌─────────────────────────────────────────────────┐  │
│      │ 🔍 नाव, बकल नंबर किंवा हुद्दा शोधा...            │  │
│      └─────────────────────────────────────────────────┘  │
│      [ ] फक्त पात्र अधिकारी दाखवा (Coming Soon)           │
│      ┌─────────────────────────────────────────────────┐  │
│      │ सपोनि प्रशांत बोरसे (उपलब्ध)                     │  │
│      │ पोहवा १३४७ जाधव     — सध्या: वपोनि रायटर        │  │
│      │ पोशि ५४२ आहेर       — सध्या: काटया मारूती रायटर  │  │
│      │ पोशि १२४४ महाले     — सध्या: मालेगाव स्टँड बिमा │  │
│      └─────────────────────────────────────────────────┘  │
│                                                           │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  [३] ➕ नवीन कर्मचारी जोडा (Add New Staff to Master)      │
│      नाव, हुद्दा व बकल नंबर भरून तात्काळ नियुक्त करा       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### Option Details
* **Option ① — Edit Current Staff Details (`माहिती बदला`):**
  * Opens the Master Staff Drawer for the assigned person.
  * Fields: Marathi Name (`name_mr`), English Name (`name_en`), Rank dropdown, Buckle number, Mobile number.
  * **Disabled/Greyed out** if the slot is currently `[रिक्त]`.
* **Option ② — Select Existing Staff (`हजर कर्मचारी निवडा`):**
  * Fast virtualized list supporting 200+ police personnel.
  * Search bar filters instantaneously across Marathi names, English transliterations, buckle numbers, and rank codes.
  * Displays current deployment status next to each person to prevent unintended double-booking.
  * **Double-Booking Protection:** If selected staff is already assigned on today's chart, displays an inline amber warning: `"हा कर्मचारी आधीच [ठाणे पहारा - दिवसपाळी] येथे नियुक्त आहे. येथे हलवायचे?"` with `Confirm Move` and `Cancel`.
  * **Eligibility Filter Toggle:** Toggle for `"फक्त पात्र कर्मचारी"` is present but set to disabled (`Coming Soon`) per SME open questions.
* **Option ③ — Add New Staff (`➕ नवीन कर्मचारी जोडा`):**
  * Lightweight mini-form directly inside the popover:
    * `पूर्ण नाव (मराठी)` (Required)
    * `हुद्दा (Rank)` (Required dropdown of 16 ranks)
    * `बकल नंबर (Buckle No.)` (Optional for officers, mandatory for constabulary)
  * Clicking `सेव्ह व नियुक्त करा` (Save & Assign) writes the person to the station master roster and immediately assigns them to the slot without losing context.

---

### 3.4 Date Switching & Unsaved Work Protection

When the clerk clicks on a date in the navigation bar or uses the `◀ / ▶` arrows:

```
┌───────────────────────────────────────────────────────────┐
│  ⚠️ सेव्ह न केलेले बदल (Unsaved Changes)                 │
├───────────────────────────────────────────────────────────┤
│  तुमच्याकडे १० सप्टेंबर २०२६ च्या तक्त्यावर ३ बदल प्रलंबित │
│  आहेत. नवीन तारखेवर जाण्यापूर्वी काय करायचे?             │
│                                                           │
│  [💾 सेव्ह करा व पुढे जा]   [बदल रद्द करा]   [येथेच थांबा] │
└───────────────────────────────────────────────────────────┘
```

1. **`सेव्ह करा व पुढे जा` (Save & Navigate):** Atomically commits pending changes to PostgreSQL, then loads the target chart.
2. **`बदल रद्द करा` (Discard & Navigate):** Reverts local draft changes and transitions to the target date.
3. **`येथेच थांबा` (Cancel):** Closes modal, remains on the current date with pending edits intact.

---

### 3.5 Finalization & Amendment Lifecycle

* **Draft State (`DRAFT`):**
  * Normal working state. Edits, additions, and reassignments are saved freely.
  * Action button in toolbar: `[✅ तक्ता अंतिम करा (Finalize)]`.
* **Finalize Action:**
  * Prompts for confirmation: `"हा तक्ता अंतिम (Finalize) करायचा? यानंतर तक्ता वाचनीय (Read-Only) होईल."`
  * Locks the chart row, serializes the canonical `ChartDocument` into `chart_versions.document_json`, and sets status to `FINALIZED`.
* **Finalized State (`FINALIZED`):**
  * Chart is **completely immutable**. The `Edit` toggle is replaced with a locked badge: `[🔒 Finalized · v1]`.
  * Printing directly replays the frozen snapshot JSON, completely decoupled from future master roster changes.
* **Amendment Workflow:**
  * To correct a finalized chart, the clerk clicks `[📝 अमेंडमेंट तयार करा (Create Amendment)]`.
  * The system creates `v2` as a fresh draft cloned from `v1`. The historical `v1` remains permanently archived in the audit database.

---

## 4. Component & Behavior Rules

### 4.1 Reusable UI Component Architecture (React 19 + TypeScript)

```
src/components/
├── navigation/
│   ├── NavBar.tsx              // Top bar: Station title, DateNav, ModeToggle, SaveButton, GearMenu
│   ├── DateNav.tsx             // Interactive date display + calendar picker + unsaved guard
│   └── SectionJumpRibbon.tsx   // Sticky jump pills for Pages 1 through 5
├── board/
│   ├── ChartCanvas.tsx         // Enforces A4 Landscape dimensions (297mm × 210mm) per sheet
│   ├── SrPiCard.tsx            // Senior PI Command Box with writer/driver slots
│   ├── OfficerDeskGrid.tsx     // 4 Level-2 officer desk blocks (तपास, प्रशा, गुन्हे, विशेष)
│   ├── P1LowerBand.tsx         // 4-column balanced grid for Page 1 lower section
│   ├── ChowkiMatrix.tsx        // 3×2 grid of Chowki cards + 5 dedicated beat marshal rows
│   ├── ChowkiCard.tsx          // Single chowki: header, supervising officer, day/night columns
│   ├── LeaveMatrix.tsx         // Categorized leave cards with right-aligned time windows
│   ├── ManpowerMatrix.tsx      // Formal 12-rank strength table with Office=09 and ME=233
│   ├── SuddenDutyLedger.tsx    // Audit log table for mid-shift duty changes
│   ├── OfficerSummaryTable.tsx // 15 subordinate officers duty ledger
│   └── ScanScheduleTable.tsx   // QR patrol sessions and 12 hourly checkpoint rows
├── flyers/
│   ├── StaffPickerFlyer.tsx    // Universal 3-option staff allocation popover
│   ├── StaffMasterDrawer.tsx   // Slide-in master record editor
│   ├── TimeRangePopover.tsx    // Devanagari 24-hr time picker popover
│   └── FormatContextMenu.tsx   // Right-click text alignment and box-span controls
└── shared/
    ├── StatusBadge.tsx         // Dual-encoded badges for [बिमा], [बंद], [रिक्त]
    ├── DutyTimePill.tsx        // High-contrast duty hours pill badge
    └── ConfirmDialog.tsx       // Modal dialogs for Finalize, Unsaved work, Reassign
```

---

### 4.2 Visual State Matrix

| Component | Preview Mode | Edit Mode (Idle) | Edit Mode (Hover/Focus) | Active Popover Open | Validation Warning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`StaffSlot`** | Clean ink text | Clean ink text | `1px dashed #cbd5e1`, ✏️ icon | Solid blue ring `2px #2563eb` | Amber ring + tooltip |
| **`DutyTimePill`** | Blue-tint pill | Blue-tint pill | ✏️ icon on pill edge | Popover time spinners open | Red border if start ≥ end |
| **`ChowkiCard`** | 1.5px solid border | 1.5px solid border | Border darkens to `#64748b` | Sub-column highlighted | — |
| **`ClosedColumn`** | 45° diagonal hatch | 45° diagonal hatch | Status toggle pill visible | Operational toggle modal | Destination required |
| **`SaveButton`** | Hidden / Inactive | Muted gray | Amber pill `Save (N)` | Spinner during commit | Red flash on error |

---

### 4.3 Consistent Interaction Rules

1. **Hover Reveals, Click Acts:** No permanent edit buttons clutter the board. Visual affordances reveal themselves upon mouse hover or keyboard focus; clicking triggers the interaction.
2. **Escape Always Dismisses:** Pressing `Escape` closes any open popover, drawer, or modal without committing changes.
3. **Single Active Editor:** Opening an editor on any cell automatically commits or dismisses any previously opened editor.
4. **Anchored Popovers:** Popovers anchor directly to their trigger element and automatically adjust positioning to stay within the viewport.
5. **No Data Loss on Navigation:** Switching between `Preview` and `Edit` modes never discards uncommitted data.
6. **Print Always Functions:** The `Print` button is always operational, generating output directly from the current view state.

---

## 5. Decisions & Unresolved Questions

### 5.1 Immediate Approved Decisions (v3 → v4)

1. **A4 Landscape Frozen:** The chart is strictly an **A4 Landscape 5-sheet document** (297mm × 210mm).
2. **Elevate Officer Duty Times:** Implemented as a high-contrast pill (`#0b3568` on `#e0eaf6`, border `#b6cde8`, font-weight 700) to permanently fix the "too thin and light" readability issue.
3. **Right-Align Leave Times:** In Section 3 (`रजा, साप्ताहिक सुट्टी व गैरहजर`), all hourly windows (`०८ ते १०`) and date ranges are right-aligned using tabular figures.
4. **Eliminate `+` Concatenation:** All paired staff are broken into distinct semantic rows/divs.
5. **Full Rank, Buckle & Surname:** Constabulary must always render as `[Rank] [Buckle] [Surname]`.
6. **Universal 3-Option Staff Flyer:** Every staff assignment interaction uses the unified 3-option flyer (Edit Details, Select Existing, Add New).
7. **Two Global Working Modes:** Default `Preview` (clean) vs `Edit` (interactive).
8. **Immutable Finalization:** Finalizing seals the chart into an immutable snapshot JSONB. Edits require creating an amendment version.
9. **No Autonomous Scheduling:** The software calculates totals and flags errors, but never auto-fills or auto-replaces personnel.
10. **English UI Chrome / Marathi Chart Content:** Navigation and dialog buttons default to English for operational clarity, while chart content is 100% Marathi Unicode.

---

### 5.2 Questions Requiring Domain Confirmation (`NEEDS DOMAIN CONFIRMATION`)

| # | Question / Topic | Context & Impact | Interim v4 UI Behavior |
| :--- | :--- | :--- | :--- |
| **Q1** | **`अहवाल नोंदवला` Semantics** | Appears on Page 4 Table 8 (`अचानक बदल`). Is this a binary flag (yes/no), a General Diary entry number, or a text summary? | Rendered as a free-text field in the Sudden Change Ledger for recording GD numbers/notes. |
| **Q2** | **`स्थानिक ठाणे बाहेर` Classification** | Does this represent temporary city bandobast, or formal deputation to DCP/ACP offices? | Modeled as a dedicated section under External Duties on Page 3. |
| **Q3** | **Rank Eligibility Rules for Officers** | Can an ASI or Head Constable be assigned to supervisory chowki officer slots? | The "Eligible Ranks Only" filter toggle in the Staff Picker is rendered as **Disabled ("Coming Soon")**. |
| **Q4** | **Direct Count `03` on Manpower Matrix** | Appears consistently as `03` across all reference charts without clear formula reconciliation. | Treated as an authoritative, clerk-editable template value. |
| **Q5** | **`ME` Column Acronym Expansion** | Represents the constabulary cadre total (233), but exact expansion is unconfirmed. | Preserved as a protected token and displayed as `ME`. |
| **Q6** | **RTPC / Operator Hierarchy** | Is the Wireless Operator permanently paired with an officer, or dynamically assigned daily? | Rendered as an assignment slot within the officer card without hard relational constraints. |
| **Q7** | **Event Annex Dynamic Page Injection** | On special days (e.g. Ganesh Festival rehearsal), an equipment table pushes pages 3–5 back by one sheet. | Handled dynamically at print time by injecting an `EventAnnex` page without altering the core 5-page template. |

---

## 6. Acceptance Criteria

### 6.1 Chart Visual Fidelity & Typography
- [ ] Rendered strictly across **5 physical A4 Landscape pages** (297mm × 210mm) with zero unwanted page overflow.
- [ ] Chowki Name is the most prominent element within each chowki card (13.5px / 800 weight / Navy `#0b3568`).
- [ ] Officer duty times are clearly legible via the high-contrast duty pill (`#0b3568` on `#e0eaf6`, font-weight 700).
- [ ] Leave section times (`०८ ते १०`) are strictly right-aligned using tabular figures.
- [ ] Staff names follow police syntax: Officers (`[Rank] [Name]`), Constabulary (`[Rank] [Buckle] [Surname]`).
- [ ] No `+` concatenation anywhere; multi-person assignments are rendered as vertically stacked items.
- [ ] Marathi text wraps naturally (`overflow-wrap: break-word; white-space: normal`); no text truncation or ellipsis.
- [ ] The three distinct states are visually separated: `[रिक्त]` (amber dashed), `[बंद]` (slate hatched), `[बिमा]` (crimson chip).
- [ ] Canonical spellings verified: `बिमा` (never `विमा`), `पोशि` (never `पोषि`).
- [ ] Protected tokens rendered verbatim: `CCTNS`, `Dial 112 MERS`, `DB`, `MERS`, `Office`, `ME`, `TOTAL`.

### 6.2 Application CRUD & Usability
- [ ] Application loads in **Preview Mode** by default, presenting a clean, 100% print-accurate view.
- [ ] Edit affordances (dashed outlines, micro-pencil icons) appear only on hover or focus in **Edit Mode**.
- [ ] Keyboard navigation (`Tab`, `Enter`, `Escape`) functions across all editable slots.
- [ ] Clicking any staff slot opens the **Universal 3-Option Staff Picker Flyer**.
- [ ] Staff search instantaneously filters 200+ personnel by Marathi name, English transliteration, buckle number, or rank.
- [ ] Option ③ allows adding a missing staff member and immediately assigns them to the active slot.
- [ ] Double-booking an already assigned staff member triggers a confirmation warning.
- [ ] Date navigation intercepts unsaved changes with a Save / Discard / Cancel dialog.
- [ ] Template label edits explicitly indicate that changes will apply to all future charts.
- [ ] Finalizing a chart locks it into read-only mode and generates an immutable snapshot.
- [ ] Amending a finalized chart preserves version 1 and opens version 2 in draft status.

### 6.3 Print & Grayscale Quality
- [ ] `@media print` generates exactly 5 landscape pages without clipping or blank overflow sheets.
- [ ] Page 1 total vertical extent does not exceed 769px.
- [ ] Heavy navy backgrounds invert to white with crisp 1.5pt solid borders to conserve printer toner.
- [ ] Grayscale prints and photocopies remain 100% legible through dual-encoding (text + borders + hatching).
