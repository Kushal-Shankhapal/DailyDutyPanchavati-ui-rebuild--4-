// Purpose: start a LEGACY six-page chart app as a read-only *reference* surface — the header's
//   “जुना ६-पृष्ठ तक्ता” entry opens it (via the same-origin /legacy/<date> redirect).
// Current role: `npm run legacy:start` (Kushal's build, the one that loads data into the six-page
//   chart) and `npm run legacy:start:arjish` (the bundled Arjish build) — user 2026-10-13:
//   “it opened arjish's work, not mine … I guess we can have both running for reference”.
// Last meaningful change: 2026-10-13 — default switched to Kushal's build; two apps, two ports;
//   child process is always reaped (nothing survives Ctrl+C — user asked for clean exits).
// Constraint/dependency: these are SEPARATE apps with their OWN databases and API shapes. Nothing
//   from them is imported here and nothing of ours is written into them. Their dependencies resolve
//   from the parent folder's node_modules (Kushal's archive has no install of its own).
//   Local only — no external service is contacted.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = path.join(root, "DailyDutyPanchavati-ui-rebuild");

/** The two reference apps. Ports never collide with this repo's own chart server (:3100). */
export const LEGACY_APPS = {
  kushal: {
    key: "kushal",
    label: "कुशल — ६-पृष्ठ तक्ता (डेटासह)",
    dir: path.join(bundle, "NEW DATA", "kushals repo", "archive"),
    port: Number(process.env.LEGACY_PORT || 3101),
    database: "panchavati_combined",
  },
  arjish: {
    key: "arjish",
    label: "अर्जिश — ६-पृष्ठ तक्ता (संदर्भ)",
    dir: bundle,
    port: Number(process.env.LEGACY2_PORT || 3102),
    database: "panchavati_dev",
  },
};

const requested = process.argv.includes("--arjish") || process.env.LEGACY_APP === "arjish"
  ? "arjish" : (process.env.LEGACY_APP === "kushal" ? "kushal" : (process.argv.includes("--kushal") ? "kushal" : null));
export const APP_KEY = requested ?? "kushal";

export function legacyEntry(app) {
  return path.join(app.dir, "dist-server", "server", "index.js");
}

export function legacyBuildHint(app) {
  return `  build it once with:\n    cd "${path.relative(root, app.dir)}" && npm install && npm run build`;
}

/** Spawn a legacy app and hand back the child. Never detached: the caller's Ctrl+C reaps it. */
export function spawnLegacy(app, { quiet = false } = {}) {
  const entry = legacyEntry(app);
  if (!fs.existsSync(entry)) {
    throw new Error(`✗ legacy build not found: ${entry}\n${legacyBuildHint(app)}`);
  }
  if (!quiet) {
    console.log(`${app.label} → http://localhost:${app.port}  (this repo's own chart server keeps :3100)`);
  }
  return spawn(process.execPath, [entry], {
    cwd: app.dir,
    env: { ...process.env, PORT: String(app.port) },
    stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

// Started directly (`npm run legacy:start`) → run until the child exits.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const app = LEGACY_APPS[APP_KEY];
  try {
    const child = spawnLegacy(app);
    const stop = () => { child.kill(); process.exit(0); };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    child.on("exit", (code) => process.exit(code ?? 0));
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    process.exit(1);
  }
}
