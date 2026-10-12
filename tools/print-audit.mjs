// Print-fit audit: every `.page` box must fit ONE A4 landscape sheet in print.
//
// Why `tools/` and not `scripts/`: scripts|server|db are the runtime set that invariant 5 scans for
// ANY `fetch(`/axios use — "no outbound network in runtime code" (police data never leaves the
// machine). This is dev-time verification, not runtime, so it lives outside that set and keeps the
// runtime guard total instead of punching an exemption in it. It nevertheless talks to the loopback
// interface only — the guard below enforces that — so it cannot ship chart data anywhere either.
//
// Why this exists: the frozen visual baseline (design/compv3.css) keeps the screen view roomy and
// only tightens in print. Whether a page therefore fits a sheet cannot be seen from screen
// geometry or from the HTML — it has to be measured in a real engine under print media. This
// script drives headless Chrome over CDP (no npm dependencies) and prints each sheet's extent.
//
// Usage:  npm run dev            # in another terminal (serves /charts/:date)
//         npm run print:audit    # default http://127.0.0.1:3100/charts/2026-09-10
//         npm run print:audit -- http://127.0.0.1:3100/charts/2026-09-11
// Env:    CHROME_PATH (default: usual Chrome/Chromium location per platform)
//
// Exit code 0 = every sheet fits (A4 minus page padding); 1 = at least one sheet overflows.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_CHROME = {
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
}[process.platform] ?? [];

const chromePath =
  process.env.CHROME_PATH ?? DEFAULT_CHROME.find((p) => existsSync(p)) ?? null;
if (!chromePath) {
  console.error(
    "print-audit: no Chrome/Chromium found. Set CHROME_PATH to the executable and retry.",
  );
  process.exit(2);
}

const url = process.argv[2] ?? "http://127.0.0.1:3100/charts/2026-09-10";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//.test(url)) {
  console.error(`print-audit: refusing non-loopback target ${url} (local-only rule)`);
  process.exit(2);
}
const port = Number(process.env.PRINT_AUDIT_PORT ?? 9333);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "print-audit-"))}`,
    url,
  ],
  { stdio: "ignore" },
);

async function pageTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const target = (await res.json()).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (target) return target;
    } catch {
      /* engine not up yet */
    }
    await sleep(250);
  }
  throw new Error(`CDP endpoint not reachable on port ${port}`);
}

const MEASURE = `(() => {
  const A4 = 210 / 25.4 * 96;                 // A4 landscape height in CSS px (print width 297mm)
  const pages = [...document.querySelectorAll('.page')];
  if (pages.length === 0) return JSON.stringify({ error: 'no .page boxes — wrong URL?' });
  const bottomPad = parseFloat(getComputedStyle(pages[0]).paddingBottom);
  return JSON.stringify({
    a4: Math.round(A4),
    bottomPad: Math.round(bottomPad),
    sheets: pages.map((p, i) => {
      const extent = Math.round(
        p.lastElementChild.getBoundingClientRect().bottom - p.getBoundingClientRect().top,
      );
      return {
        sheet: i + 1,
        dense: p.classList.contains('dense'),
        extent,
        over: Math.round(extent - (A4 - bottomPad)),
      };
    }),
  });
})()`;

let ws;
try {
  const target = await pageTarget();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url });
  await sleep(2500); // let fonts/styles settle before measuring
  await send("Emulation.setEmulatedMedia", { media: "print" });
  await sleep(500);

  const res = await send("Runtime.evaluate", { expression: MEASURE, returnByValue: true });
  const value = res.result?.result?.value;
  if (!value) throw new Error(`measurement failed: ${JSON.stringify(res)}`);
  const { a4, bottomPad, sheets, error } = JSON.parse(value);
  if (error) throw new Error(error);

  console.log(`print-audit ${url}`);
  console.log(`  A4 landscape = ${a4}px, page padding-bottom = ${bottomPad}px`);
  for (const s of sheets) {
    const mark = s.over > 0 ? "✗ OVERFLOW" : "✓";
    console.log(
      `  ${mark} sheet ${s.sheet}${s.dense ? " (dense)" : "        "} extent ${s.extent}px ` +
        `(${s.over > 0 ? `+${s.over}` : s.over}px vs the sheet)`,
    );
  }
  const bad = sheets.filter((s) => s.over > 0);
  console.log(
    bad.length === 0
      ? `  all ${sheets.length} sheets fit one A4 sheet`
      : `  ${bad.length} sheet(s) overflow: ${bad.map((b) => b.sheet).join(", ")}`,
  );
  process.exitCode = bad.length === 0 ? 0 : 1;
} finally {
  ws?.close();
  chrome.kill();
}
