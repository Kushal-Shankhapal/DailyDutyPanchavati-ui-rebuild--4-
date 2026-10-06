---
name: verify-slice
description: Full verification pass for a completed slice (typecheck, invariants, tests, UI/print inspection). Use before marking any feature done.
---
# Verify Slice Procedure
1. npm run check (tsc + static invariant scan + vitest) — capture exit status honestly.
2. If DB touched: migrations applied to dev AND test; invariant tests green.
3. If UI touched: exercise the real flow in IDE browser preview (today -> edit -> save -> reload; copy; finalize; reprint).
4. If print touched: run print-check skill.
5. Update docs/CURRENT_STATE.md (what exists, verified-by) and TRACEABILITY.md rows from ⬜/🔨 to ✅ with the concrete test/inspection names. Never mark ✅ from a green build alone.
