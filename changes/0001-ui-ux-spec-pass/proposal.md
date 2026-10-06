<!--
Purpose: Active work unit: Phase 1 UI/UX specification pass (product freeze before implementation).
Current role: Tracks the UI spec work unit from decision to approval.
Last meaningful change: Created 2026-10-06 when the user paused P0 and ordered a UI/design pass first.
Constraint/dependency: Implements no code; produces UI_SPEC.md + UI_TRACEABILITY.md + STITCH_BRIEF.md.
-->

# changes/0001 — UI/UX Specification Pass

## Decision (user, 2026-10-06)

Pause implementation. Sequence: **MD analysis → lock product/domain decisions → Stitch visual pass → review/refine → implementation.** Figma deferred. The approved compact-v2 mockup (SPI-endorsed, with pending critique fixes) is the visual direction; the old duty-board screen is the confirmed anti-pattern.

## Artifacts

| Artifact | Status |
|---|---|
| docs/UI_SPEC.md (21 sections) | written, awaiting approval |
| docs/UI_TRACEABILITY.md | written, awaiting approval |
| docs/STITCH_BRIEF.md (8 screens + review protocol) | written, ready to run |
| Mockup inspection (rendered, DOM-mapped, screenshot) | done 2026-10-06 |
| Old repo dev-server inspection (port 3000, compact profile + duty-board) | done 2026-10-06, server stopped |

## Verification evidence

- Mockup rendered in IDE browser preview at 1440px; 5 pages mapped via DOM (`h2` inventory, `.blk` block grammar, `.chip` state language).
- Live profile URL `http://localhost:3000/api/charts/<id>/print?profile=standardized_compact_v2` rendered the same grammar from the dev DB; `/duty-board/2026-09-10` captured the anti-pattern (KPI cards / filters / empty state).
- Dev server PID 20616 stopped after inspection; port 3000 verified free; old DB untouched.

## Open items before P0

1. User approval of UI_SPEC.md §approval-checklist.
2. Run Stitch pass (STITCH_BRIEF.md) → review → fold accepted decisions into UI_SPEC.md.
3. Answer OPEN_QUESTIONS T7 (Devanagari header digits) and T8 (Stitch artifact licensing).

## Exit criteria

UI_SPEC.md approved (user sign-off recorded here) → changes/0001 closed → P0 implementation starts against the frozen spec.
