// Purpose: start the LEGACY six-page chart app (Kushal's repo, bundled in
//   DailyDutyPanchavati-ui-rebuild/) on port 3100 as a read-only *reference* surface.
// Current role: `npm run legacy:start` — the "जुना ६-पृष्ठ तक्ता" entry in the header opens it.
// Last meaningful change: 2026-10-13 — added with the reference-chart menu entry.
// Constraint/dependency: reads its OWN database (panchavati_dev per that repo's .env) and has its
//   own API shape; nothing from it is wired into this repo's domain. Local only, no external calls.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legacyDir = path.join(root, "DailyDutyPanchavati-ui-rebuild");
const entry = path.join(legacyDir, "dist-server", "server", "index.js");
// 3100 is THIS repo's own chart server default — the legacy app must never collide with it.
const port = process.env.LEGACY_PORT || "3101";

if (!fs.existsSync(entry)) {
  console.error(`✗ legacy build not found: ${entry}\n  build it once with:\n    cd DailyDutyPanchavati-ui-rebuild && npm install && npm run build`);
  process.exit(1);
}

console.log(`legacy reference chart app → http://localhost:${port}  (this repo's own chart server keeps :3100)`);
const child = spawn(process.execPath, [entry], {
  cwd: legacyDir,
  env: { ...process.env, PORT: port },
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
