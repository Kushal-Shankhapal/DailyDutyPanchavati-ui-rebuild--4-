<!--
Purpose: Work-unit record for chart presentation controls.
Current role: Captures the persisted JSONB contract and verified implementation slice.
Last meaningful change: 2026-10-13 — slice complete.
Constraint: Existing daily_charts.presentation_overrides only; no migration or source-data mutation.
-->

# 1011 — Chart presentation controls

## Decision

Persist per-element display properties at `daily_charts.presentation_overrides.elements[key]`:

```json
{
  "horizontalAlign": "left | center | right",
  "verticalAlign": "top | middle | bottom",
  "hidden": true,
  "compact": true
}
```

PATCH input is narrow, property values are enum/boolean only, and `null` clears one property.
The server accepts only element keys emitted by the current ChartDocument renderer. No HTML, CSS,
JavaScript, labels, assignments, or finalized snapshots are writable through this control.

## Implementation

- `server/chart-presentation.ts`: validation, safe resolution, normalized merge.
- `server/presentation.ts`: row-locked `PATCH /api/charts/:date/presentation`, FINALIZED 409.
- `server/render/chart-html.ts`: stable `data-presentation` attributes and resolved values.
- `web/chart-presentation.css`: whitelisted alignment/hidden/compact hooks; existing authoring files untouched.
- `tests/presentation.test.ts`: validation, resolution, persistence/source-row preservation, FINALIZED rejection.

## Verification

`npm run check` passed: typecheck, 83 Vitest tests, and doctor against both project databases.
`npm run print:audit` passed: all 6 sheets fit (750/518/680/551/608/705px). A live invalid-value PATCH
returned 400; tests assert the override is carried into the finalized snapshot.
