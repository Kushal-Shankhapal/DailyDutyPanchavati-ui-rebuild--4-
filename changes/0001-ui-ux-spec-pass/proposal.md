<!--
Purpose: Active work unit: Phase 1 UI/UX specification pass (product freeze before implementation).
Current role: Tracks the UI spec work unit from decision to approval.
Last meaningful change: 2026-10-07 — design-refinement extension (compact-v3 prototypes, deliverables A–F) recorded.
Constraint/dependency: Implements no app code; produces UI_SPEC.md + UI_TRACEABILITY.md + design prototypes + DESIGN_REFINEMENT_BRIEF deliverables.
-->

# changes/0001 — UI/UX Specification Pass

## Decision (user, 2026-10-06)

Pause implementation. Sequence: **MD analysis → lock product/domain decisions → Stitch visual pass → review/refine → implementation.** Figma deferred. The approved compact-v2 mockup (SPI-endorsed, with pending critique fixes) is the visual direction; the old duty-board screen is the confirmed anti-pattern.

## Artifacts

| Artifact | Status |
|---|---|
| docs/UI_SPEC.md (21 sections) | written, §18 revised 2026-10-07, awaiting approval |
| docs/UI_TRACEABILITY.md | written + prototype-verification section 2026-10-07, awaiting approval |
| docs/STITCH_BRIEF.md (8 screens + review protocol) | SUPERSEDED 2026-10-06 by DESIGN_REFINEMENT_BRIEF.md |
| docs/DESIGN_REFINEMENT_BRIEF.md (user's brainstorm + SPI critique + A–F output contract) | written |
| design/compv3.css + panchavati-compv3.html (realistic, deliverables A/B/C) | built + browser-verified 2026-10-07 |
| design/panchavati-compv3-stress.html (deliverable D) | built + browser-verified 2026-10-07 |
| design/compv3-edit.js (deliverable E interactions) | built + exercised 2026-10-07 |
| docs/DESIGN_INTERACTION_NOTES.md (E) + docs/DESIGN_DELTA.md (F) | written 2026-10-07 |
| Mockup inspection (rendered, DOM-mapped, screenshot) | done 2026-10-06 |
| Old repo dev-server inspection (port 3000, compact profile + duty-board) | done 2026-10-06, server stopped |

## Verification evidence

- Mockup rendered in IDE browser preview at 1440px; 5 pages mapped via DOM (`h2` inventory, `.blk` block grammar, `.chip` state language).
- Live profile URL `http://localhost:3000/api/charts/<id>/print?profile=standardized_compact_v2` rendered the same grammar from the dev DB; `/duty-board/2026-09-10` captured the anti-pattern (KPI cards / filters / empty state).
- Dev server PID 20616 stopped after inspection; port 3000 verified free; old DB untouched.

## Open items before P0

1. User review of the two compact-v3 prototypes (realistic + stress) — accept/reject; fallback per user = Figma Make.
2. User approval of UI_SPEC.md §approval-checklist.
3. Decide UI_SPEC §18 mobile question: keep mobile editing Coming Soon (recommended, current text) or enable it in v1 (design already supports it).
4. Answer OPEN_QUESTIONS T7 (Devanagari header digits) and T8 (was Stitch licensing — likely moot now Stitch is superseded).

## Verification evidence (design pass, 2026-10-07)

- Print fit: page-1 content extent 769px ≤ 794px (A4 landscape), all 5 pages exactly 794px, print-media rules injected for measurement.
- Breakpoints 1440/1025/768/390: correct grid collapses, overflowX 0, truncations 0 (after fixing `100vw`→`100%` scrollbar overflow).
- Source fidelity: काटया मारूती = 0 बिमा rows / 0 बंद / charge once per shift in both prototypes (stress file had a काटया-बिमा violation; found and fixed during audit).
- Console: zero errors/warnings on both files at all tested widths.

## Exit criteria

UI_SPEC.md approved (user sign-off recorded here) → changes/0001 closed → P0 implementation starts against the frozen spec.
