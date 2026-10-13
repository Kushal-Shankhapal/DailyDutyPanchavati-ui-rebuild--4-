// Purpose: ONE command for a demo/dev session — this repo's chart server plus BOTH legacy
//   reference chart apps — with every child reaped when you press Ctrl+C.
// Current role: `npm run demo` (user 2026-10-13: the manual “run this in another terminal” step
//   cannot survive a demo, let alone a deployed one).
// Last meaningful change: 2026-10-13 — created with the supervisor round.
// Constraint/dependency: children are NOT detached and are killed on exit, SIGINT and SIGTERM, so
//   closing this one process leaves nothing behind. The legacy apps keep their own ports/databases
//   (see scripts/start-legacy.mjs). Local only — no external service, no data leaves the machine.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEGACY_APPS, spawnLegacy, legacyEntry, legacyBuildHint } from "./start-legacy.mjs";
import { stopProjectServers, PROJECT_PORTS } from "./stop-servers.mjs";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--no-watch") ? ["tsx", "server/index.ts"] : ["tsx", "watch", "server/index.ts"];

// A stale listener would silently shadow the new one — clean our own ports first and say so.
const stale = stopProjectServers(PROJECT_PORTS);
if (stale.length) console.log(`stopped ${stale.length} stale listener(s): ${stale.join(", ")}`);

const children = [];
const chart = spawn(process.platform === "win32" ? "npx.cmd" : "npx", dev, {
  cwd: root, env: { ...process.env, PORT: String(PROJECT_PORTS[0]) }, stdio: "inherit",
});
children.push(chart);

for (const app of Object.values(LEGACY_APPS)) {
  if (!fs.existsSync(legacyEntry(app))) {
    console.log(`· ${app.label}: skipped (not built)\n${legacyBuildHint(app)}`);
    continue;
  }
  const child = spawnLegacy(app, { quiet: true });
  child.stdout?.on("data", (b) => process.stdout.write(`[${app.key}] ${b}`));
  child.stderr?.on("data", (b) => process.stderr.write(`[${app.key}] ${b}`));
  console.log(`· ${app.label} → http://localhost:${app.port}`);
  children.push(child);
}

let closing = false;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  // any port still held by a child of ours (Windows does not always deliver SIGTERM through to
  // a grandchild) is cleaned explicitly, so nothing is left running after Ctrl+C.
  const left = stopProjectServers(PROJECT_PORTS);
  if (left.length) console.log(`cleaned up ${left.length} leftover listener(s)`);
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => { for (const child of children) { if (!child.killed) child.kill(); } });
chart.on("exit", (code) => shutdown(code ?? 0));

console.log(`\nchart authoring app → http://localhost:${PROJECT_PORTS[0]}  (Ctrl+C stops everything)\n`);
