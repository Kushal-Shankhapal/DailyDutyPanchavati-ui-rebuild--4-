<!--
Purpose: Deliverable E of DESIGN_REFINEMENT_BRIEF.md §18 — how each core editor
interaction works, as demonstrated in the design prototypes and as it must be
built in React.
Current role: Authority for editor interaction grammar; pairs with DESIGN_DELTA.md (F).
Last meaningful change: 2026-10-07 — written after live verification of design/compv3-edit.js.
Constraint/dependency: Interactions must obey AGENTS.md hard rules (no auto-scheduling,
no BIMA inference, रिक्त ≠ बंद ≠ बिमा); UI_SPEC.md remains the element authority.
-->

# DESIGN_INTERACTION_NOTES — deliverable E

**Demonstrated live in:** [design/panchavati-compv3.html](../design/panchavati-compv3.html) and
[design/panchavati-compv3-stress.html](../design/panchavati-compv3-stress.html) via
[design/compv3-edit.js](../design/compv3-edit.js) — click **`संपादन`** in the toolbar, then interact.
Every flow below was exercised in the browser (2026-10-07 audit, zero console errors).

## Frame common to all interactions

- **Read mode is the default** (`केवळ वाचन`). `संपादन` toggles the edit layer on; toggling off removes
  every affordance and restores the exact read-mode DOM. The printed chart never shows editing chrome
  (all affordances are `.no-print`).
- **Nothing is autonomous.** The clerk clicks, picks, confirms; the software never schedules,
  replaces, or derives state on its own (AGENTS.md hard rule).
- **Autosave indicator:** every mutation flips the toolbar indicator to `जतन होत आहे…` →
  `जतन झाले` (debounced 700 ms in the prototype; in React this is the real mutation round-trip +
  `SaveStateIndicator`).
- **Picker lifecycle:** opens anchored below the cell (flips above when space is short, clamped to
  the viewport), closes on pick, `Escape`, or outside click. Cancelling with an empty pending row
  removes that row — no orphan `रिक्त` noise.
- **Change feedback = three channels:** amber flash on the cell (1.6 s), a ledger toast naming what
  happened, and the save indicator. In React the toast is backed by real ledger data (R-19).

## 1. Staff selection

1. In edit mode, click any editable person cell → the **staff picker** opens for that exact slot.
2. Type in `कर्मचारी शोधा…` to filter by name/buckle (live substring match).
3. Each row shows the **full name** (`पोशि ५४२ आहेर`) plus an availability hint when relevant
   (`सिक रजा`, `किरकोळ रजा`, `साप्ताहिक सुट्टी`, `दिवसपाळी बिमा`) — hints are *data from masters*,
   never inferred from notes.
4. Pick → cell fills, flash, toast `नेमणूक: <name>`, autosave runs.

The picker never leaves the page: no modal, no navigation, the clerk's place is preserved.

## 2. Staff creation (in context)

1. Picker footer: **`+ नवीन कर्मचारी जोडा`** → mini-form replaces the list *inside the picker*:
   `पद` (rank select), `पूर्ण नाव`, `बक्कल नं`, `मोबाईल (पर्यायी)`.
2. Validation: name and buckle are required — inline error `नाव व बक्कल नं आवश्यक आहे`,
   no silent defaults.
3. `जतन करा` → the staff member is created **and placed into the originating slot**, picker closes,
   toast `नवीन कर्मचारी जोडला व जागी बसवला`. `रद्द` returns to the list; nothing was created.

Creation always returns to the exact context the clerk started from (UI_SPEC §9 flow).

## 3. Assignment replacement

Replacing *is* selecting on an already-filled cell: click it → pick someone else → the line is
overwritten. Communication:

- Amber flash + toast naming the new assignment (React must additionally name the *previous*
  holder and append a `sudden_duty_changes` ledger entry — R-19).
- **BIMA never carries over.** The qualifier belongs to the person/assignment; `assign()` removes
  any `बिमा` chip so the replacement starts clean.

## 4. Clearing

- Per-cell **`×`** button (never offered on charge or closed rows) → the cell becomes
  **`रिक्त`** (amber, dashed pill), flash, toast `रिक्त केले: <name>`.
- `रिक्त` is an *explicit state*, not a deleted row: in React the assignment history/lineage is
  preserved (R-10, R-19).
- Clearing a person never touches a location's `बंद` state or anyone's `बिमा` — the three states are
  fully independent.

## 5. BIMA

- Person-level toggle: a **`बिमा`** button appears in the affordance row of occupied chowki cells;
  clicking adds/removes the crimson `बिमा` chip before that person's name.
- Scope is explicitly one assignment — the toast says `बिमा जोडले (फक्त या नेमणूकाला)`.
- **No row where there is no बिमा:** chowkis without source बिमा render no बिमा row at all
  (verified: काटया मारूती = 0 bima rows in both prototypes; real source 10/09).
- Never derived — no regex over Marathi notes, no inference from duty text (AGENTS.md).
- React mapping: `daily_assignments.is_bima` boolean; UI only writes it.

## 6. बंद (per shift column)

- Each DAY/NIGHT column title offers **`बंद करा`** → the column becomes hatched (45° pattern) and a
  banner appears: **`बंद — चार्ज → [input]`**. The charge destination is *typed explicitly* by the
  clerk — there is no default and no inference.
- While closed, the column's staff rows are hidden from the projection (data remains in the
  document); the charge line shows **once** for that shift.
- **`पुनः उघडा`** restores the column exactly as it was — closing never destroys the underlying
  assignments.
- Static `बंद` shifts (e.g. सरदार night on 10/09) reopen from their shut state the same way.
- **Marshal posts are visually subordinate:** closed marshal lines render slate
  (`मार्शल: बंद · चार्ज → मालेगाव स्टँड`, `.fx.mrsh`) so a closed *marshal post* never reads as the
  *chowki* being `बंद`.
- `बंद` ≠ `रिक्त`: closing a location does not scatter `रिक्त` rows anywhere.

## 7. Contextual `+`

- A **`+`** button appears only on the **last cell of a person group** (same role label, e.g. the
  रायटर group of a core table) — never on arbitrary cells.
- Clicking it inserts a new row carrying **`रिक्त`** immediately after the group and opens the
  picker on that row, so the flow is: `+` → pick/create → filled.
- **Rowspan-aware:** the role label grows (`rowspan + 1`) and group markers are recomputed, so the
  next `+` still targets the right group.
- It only ever adds *another person to an existing role* — it never invents a new role label,
  never reorders, never schedules (hard rule).
- The prototype also scopes `+` per context: office/court desk rows and officer-block lines use the
  same mechanism (UI_SPEC §8 grammar: contextual add, no global "add duty" dialog).

## 8. Adding an officer box / a chowki block (2026-10-07)

- The officers grid and the chowki grid each carry a dashed **add-box** placeholder —
  `+ अधिकारी बॉक्स जोडा` and `+ चौकी जोडा` — visible **only in edit mode** (never prints).
- Clicking it appends a new empty block *before* the placeholder: an officer box with one
  रिक्त रायटर line, or a chowki with DAY|NIGHT sub-columns each holding one रिक्त अंमलदार line.
- The new block is immediately fully editable: cells open the picker, contextual `+` works
  (group rowspan grows), and each new shift column gets its own `बंद करा` control.
- No names, branches, or roles are invented — the block starts as `नवीन अधिकारी` /
  `नवीन चौकी` with `रिक्त` lines; the clerk fills everything explicitly.
- React mapping: appends a new OfficerBox / ChowkiBlock node to the ChartDocument and marks
  the chart dirty; block *rename* is the same inline-edit path used elsewhere.

## Touch & keyboard notes

- At ≤768 px every edit control is ≥36 px tall (`.ed button { min-height:36px }`), verified at
  390 px effective width.
- `Escape` closes the picker; cells are focusable with visible focus ring
  (`:focus-visible`, dashed navy outline).
- Printed output = read mode, byte-for-byte the same grammar (affordances, pickers, toasts,
  banners are all print-hidden).

## React implementation mapping

| Interaction | Prototype mechanism | React/domain mechanism |
|---|---|---|
| Selection | `openPicker`/`assign` over demo `STAFF` array | `StaffPicker` reading masters + availability; commit → assignment mutation |
| Creation | `renderCreate`/`saveCreate` | `MiniStaffCreate` → StaffMember create → assign to originating slot |
| Replacement | `assign` on filled cell + flash/toast | same mutation + `sudden_duty_changes` ledger row + notice naming old→new |
| Clearing | `clearSlot` → `रिक्त` pill | allocation → VACANT_RIKT, history preserved |
| BIMA | chip toggle in cell | `is_bima` boolean on the assignment; zero derivation |
| बंद | `.closed` class + charge input | `location_operational_states` + `charge_destination` (explicit field) |
| Contextual `+` | `addToGroup` + rowspan fix-up | append person to existing role group in the ChartDocument |
