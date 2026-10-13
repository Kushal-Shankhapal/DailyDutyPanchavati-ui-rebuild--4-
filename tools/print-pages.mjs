// Capture the app's own print preview: one PNG per `.page` sheet in PRINT media, plus an optional
// Chrome print-to-PDF of the same page. Dev-time verification only (loopback only), like
// tools/print-audit.mjs — it lives outside scripts|server|db so the runtime no-network guard stays
// total, and it never talks to anything but 127.0.0.1.
//
// Why: "the exported PDF does not match the preview" can only be settled by measuring BOTH — the
// sheets as the engine lays them out for print, and the PDF those same sheets produce.
//
// Usage:  npm run dev            # in another terminal
//         node tools/print-pages.mjs [url] [--pdf <file>] [--out <prefix>] [--edit]
// Exit code 0 = captured; 1 = failure; 2 = missing Chrome / non-loopback URL.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
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

const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME.find((p) => existsSync(p)) ?? null;
if (!chromePath) {
  console.error("print-pages: no Chrome/Chromium found. Set CHROME_PATH and retry.");
  process.exit(2);
}

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? null : argv[i + 1];
};
const url = argv.find((a) => /^https?:\/\//.test(a)) ?? "http://127.0.0.1:3100/charts/2026-09-10";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//.test(url)) {
  console.error(`print-pages: refusing non-loopback target ${url} (local-only rule)`);
  process.exit(2);
}
const outPrefix = flag("--out") ?? ".tmp-preview";
const pdfFile = flag("--pdf");
const editMode = argv.includes("--edit");
const port = Number(process.env.PRINT_PAGES_PORT ?? 9334);
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
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "print-pages-"))}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function pageTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const t = (await res.json()).find((x) => x.type === "page" && x.webSocketDebuggerUrl);
      if (t) return t;
    } catch { /* engine not up yet */ }
    await sleep(250);
  }
  throw new Error(`CDP endpoint not reachable on port ${port}`);
}

let ws;
try {
  const target = await pageTarget();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const resolve = pending.get(msg.id);
    if (resolve) { pending.delete(msg.id); resolve(msg); }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
    return res.result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1400, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await send("Page.navigate", { url });
  await sleep(2500);
  if (editMode) {
    // edit mode is a client-side toggle persisted in sessionStorage
    await evaluate(`document.getElementById('mode-btn')?.click(), sessionStorage.setItem('pd_mode','edit'), true`);
    await sleep(800);
  }
  await send("Emulation.setEmulatedMedia", { media: "print" });
  await sleep(600);

  const boxes = await evaluate(`JSON.stringify([...document.querySelectorAll('.page')].map((p) => {
    const r = p.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }))`);
  const pages = JSON.parse(boxes ?? "[]");
  if (pages.length === 0) throw new Error("no .page boxes — wrong URL?");
  void pages;
  console.log(`print-pages ${url}${editMode ? "  (edit mode)" : ""}`);

  for (let i = 0; i < pages.length; i++) {
    const data = await evaluate(`(() => {
      const p = document.querySelectorAll('.page')[${i}];
      const r = p.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) });
    })()`);
    const box = JSON.parse(data);
    const png = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 },
    });
    const b64 = png.result?.data;
    if (!b64) throw new Error(`capture failed for sheet ${i + 1}`);
    const file = `${outPrefix}-p${i + 1}.png`;
    writeFileSync(file, Buffer.from(b64, "base64"));
    console.log(`  sheet ${i + 1}: ${box.w}x${box.h}px CSS → ${file}`);
  }

  if (pdfFile) {
    const res = await send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    const b64 = res.result?.data;
    if (!b64) throw new Error("printToPDF failed");
    writeFileSync(pdfFile, Buffer.from(b64, "base64"));
    console.log(`  PDF (Chrome print-to-PDF, print CSS) → ${pdfFile}`);
  }
} catch (err) {
  console.error(`print-pages: ${err.message}`);
  process.exitCode = 1;
} finally {
  ws?.close();
  chrome.kill();
}
