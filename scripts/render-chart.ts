// Purpose: render a chart (default 2026-09-10) from its ChartDocument projection to a
//   static HTML file under .tmp-preview/ for browser + print verification.
// Current role: P1 render entry point (`npm run render:chart`).
// Last meaningful change: 2026-10-08 — created at P1 (renderer slice).
// Constraint/dependency: renders from projection (DRAFT) or pass --snapshot to render a
//   FINALIZED chart_versions snapshot (reprint path — finalized charts render THIS only).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePool, DEV_DB, TEST_DB, isTestRun } from "../server/db.js";
import { projectChart, getSnapshot, weekdayMr, type ChartDocument } from "../server/chart-document.js";
import { renderChart } from "../server/render/chart-html.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dateArg = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? "2026-09-10";
const useSnapshot = process.argv.includes("--snapshot");

const pool = makePool(isTestRun() ? TEST_DB : DEV_DB);
try {
  const ch = (await pool.query(`SELECT chart_id, lifecycle FROM daily_charts WHERE chart_date=$1`, [dateArg])).rows;
  if (ch.length !== 1) throw new Error(`no chart for ${dateArg}`);
  let doc: ChartDocument;
  if (useSnapshot) {
    doc = (await getSnapshot(pool, ch[0].chart_id)).document;
  } else {
    if (ch[0].lifecycle === "FINALIZED") {
      throw new Error(`${dateArg} is FINALIZED — reprints render the snapshot; rerun with --snapshot`);
    }
    doc = await projectChart(pool, ch[0].chart_id);
  }
  if (doc.weekdayMr !== weekdayMr(doc.chartDate)) throw new Error("weekday mismatch (D-rule)");

  const { html, stats } = renderChart(doc);
  if (stats.rowsRendered !== stats.rowsTotal) {
    throw new Error(`no-loss accounting failed: rendered ${stats.rowsRendered}/${stats.rowsTotal} assignment rows`);
  }
  const outDir = path.join(root, ".tmp-preview");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `chart-${dateArg}${useSnapshot ? "-snapshot" : ""}.html`);
  fs.writeFileSync(outFile, html
    .replace("__CSS_HREF__", "../design/compv3.css")
    .replace("__AUTH_CSS_HREF__", "../web/authoring.css")
    .replace("__AUTH_JS_SRC__", "../web/chart-authoring.js"), "utf8");
  console.log(`✔ rendered ${dateArg} (${useSnapshot ? "snapshot" : "projection"}): rows ${stats.rowsRendered}/${stats.rowsTotal} → ${path.relative(root, outFile)}`);
} finally {
  await pool.end();
}
