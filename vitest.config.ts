// Vitest config — scope to THIS repo's tests only. The workspace contains an archived
// copy of the old repo (DailyDutyPanchavati-ui-rebuild/) whose test files must never
// run here (they test a discarded implementation and require its own dependencies).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // DB-backed tests open pools and run transactions; give them headroom.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
