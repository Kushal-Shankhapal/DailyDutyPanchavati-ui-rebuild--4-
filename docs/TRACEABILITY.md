<!--
Purpose: Traceability map: source evidence → requirement → implementation → verification.
Current role: Coverage ledger; grows with each implemented slice.
Last meaningful change: Created 2026-10-06 with audit-phase entries (requirements + evidence only).
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
| R-01 | 10/09 day roster fully representable (HQ, 6 chowkis, marshals, office, BIMA, बंद+charge, split times) | EV-01/02 | — | — |
| R-02 | 10/09 night roster + night directives + गुडमाॅर्निंग स्काॅड | EV-01/02 | — | — |
| R-03 | Leave/availability categories incl. hourly windows + date ranges + इतर ड्युटी | EV-02/03 | — | — |
| R-04 | Manpower matrix preserved (Office 09 / ME 233 / प्रत्यक्ष हजर 03), no blind recalc | EV-02 | — | — |
| R-05 | Officer summary (15 officers) derived+overridable | EV-02, EV-06 | — | — |
| R-06 | Sudden-duty-change ledger append-only | EV-02/03 | — | — |
| R-07 | Scan schedule: 4 sessions config + 12 hourly daily rows | EV-02 | — | — |
| R-08 | 11/09 event (रंगीत तालीम): 11 personnel + equipment lines + fall-in instruction + notice | EV-01/02 | — | — |
| R-09 | Event annex is extra physical page without schema change | EV-01/02/03 | — | — |
| R-10 | रिक्त ≠ बंद ≠ बिमा, all explicit | EV-02, EV-06 | — | — |
| R-11 | No autonomous scheduling/replacement (any mode) | EV-06 | — | — |
| R-12 | Copy-previous never modifies source; copy policy matrix respected | EV-03, EV-06 | — | — |
| R-13 | Finalized snapshot immutable; reprint from snapshot | EV-06 | — | — |
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
