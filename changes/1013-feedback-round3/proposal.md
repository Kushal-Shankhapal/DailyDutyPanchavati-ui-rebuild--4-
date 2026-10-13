<!--
Purpose: Work-unit record for the third user-feedback round (numbered list #1–#10 + two additions).
Current role: Captures what shipped, the two live-only defects, and the two briefs that gate the next layout work.
Last meaningful change: 2026-10-13 — round complete except the two brief-gated items.
Constraint: No migration, no reference/ file touched, no change to seeded chart data (dev DB left at 212 assignments / {} overrides).
-->

# 1013 — Feedback round 3: chrome, legacy reference, bilingual input, layout briefs

## Scope

User's numbered feedback (nav scale, WIP flyer language, dropdown cleanup, master data, legacy chart,
sticky second bar + layout button removal, bilingual date, equal chowki cells, two layout briefs) plus
two additions: bilingual text input, and "don't repeat a row another block already owns".

## Decisions

- **Legacy chart = Kushal's repo, linked not re-implemented.** That app has its own database
  (`panchavati_dev`), its own API and root-absolute assets, so proxying it renders a broken shell.
  The browser uses the same-origin `/legacy/<date>` (server 302 → `http://localhost:3101/charts/<date>`),
  the flyer probes reachability and otherwise prints `npm run legacy:start`. Keeps the
  "no absolute URLs in client code" invariant intact.
- **Master data is read-only on purpose.** The rows exist in the DB and are shown; the write paths that
  exist (`POST/PATCH /api/masters/staff`) serve the assignment flow. A master *editor* UI is not built,
  so it stays a labelled WIP leaf rather than a half-usable form.
- **Transliteration is an aid, never an authority.** Offline rule-based EN⇄MR, both directions, the
  hand-edited field always wins, nothing submitted automatically, no dictionary/service/network.
- **Layout work stays brief-gated.** The dense-table and notices changes move printed content, so they
  ship only after the station picks an option (`docs/BRIEF_DENSE_TABLES.md`, `docs/BRIEF_NOTICES.md`).

## Implementation

- `server/render/chart-html.ts`: `Names.e(..., empty)` (Sr-PI support groups report emptiness again),
  nav cleanup (no full-chart entry, master-data + legacy entries, संदर्भ separator), bilingual date in
  the second bar only.
- `server/index.ts`: `/legacy/:date` redirect (guarded date), earlier broken-bundle route removed.
- `web/chart-authoring.js`: `openMasters()` viewer, `openLegacy()` flyer with probe, offline
  `romanToDev`/`devToRoman`/`bindTranslit` + English name field, seat-before-label click priority.
- `web/authoring.css`: navbar scale, sticky chart bar, equal 3×2 chowki rows, translator hint,
  master-data + legacy flyer styles, dead `#layout-btn` / `body.mode-layout` rules removed.
- `scripts/start-legacy.mjs` + `npm run legacy:start` (:3101).
- `tests/authoring.test.ts`: client parse test + transliterator name table.

## Verification

- `npm run check` — typecheck, **85 tests**, doctor on both databases: green.
- `npm run print:audit` — 6/6 sheets fit one A4 (max 733px of 775).
- Live browser at 1440px: EN toggle (second bar Latin, chart Marathi, flyer English), master-data
  viewer (179 staff rows), legacy flyer up *and* down states, six chowki cells all 236px, seat click
  opens the staff picker, transliteration `prakaash → प्रकाश`.
- Duplicate-slot audit: 121 renders / 121 unique `data-asn`, 0 duplicates; no-loss 212/212.
- Dev DB untouched: 212 assignments, `presentation_overrides = {}`.
