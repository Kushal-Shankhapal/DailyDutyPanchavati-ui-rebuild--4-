// Renderer tests — the ChartDocument → HTML projection must be lossless (every
// assignment row rendered), keep protected tokens intact, and never leak internals.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { projectChart, type ChartDocument } from "../server/chart-document.js";
import { renderChart, toMr } from "../server/render/chart-html.js";

let pool: pg.Pool;
let doc: ChartDocument;
let html: string;
let rowsRendered: number;

beforeAll(async () => {
  pool = makePool(TEST_DB);
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date='2026-09-10'`)).rows;
  if (ch.length !== 1) throw new Error("test DB missing 10/09 chart — run npm run db:seed first");
  doc = await projectChart(pool, ch[0].chart_id);
  const r = renderChart(doc);
  html = r.html;
  rowsRendered = r.stats.rowsRendered;
});
afterAll(async () => { await pool.end(); });

describe("renderChart (10/09)", () => {
  it("no-loss accounting: every assignment row is rendered exactly once", () => {
    expect(rowsRendered).toBe(doc.assignments.length); // 212
  });

  it("renders derived date line with Devanagari digits and computed weekday", () => {
    expect(html).toContain("दिनांक: १० सप्टेंबर २०२६");
    expect(html).toContain("वार: गुरुवार");
    expect(html).toContain("DRAFT"); // lifecycle badge from document
  });

  it("protected tokens are never digit-transformed", () => {
    expect(html).toContain("Dial 112 MERS");       // narrative rows (raw, not disp)
    expect(html).not.toContain("Dial ११२");
    expect(html).toContain("CCTNS");
  });

  it("matrix cells stay verbatim (escaped, Latin digits, OCR artifacts preserved)", () => {
    expect(html).toContain("12&lt;br&gt;04 Proण्");
    expect(html).toContain(">..</td>"); // '..' cells verbatim (muted)
    expect(html).toContain("muted");
    expect(html).toContain("मनुष्यबळ स्थिती दर्शक मॅट्रिक्स");
  });

  it("explicit रिक्त chips and बिमा labels present", () => {
    expect((html.match(/chip c-vac/g) ?? []).length).toBe(2);
    expect(html).toContain(`<th class="bima-lb"`);
    expect(html).toContain("बंद");                    // location state fx
    expect(html).toContain("चार्ज →");
  });

  it("key sections present: chowki blocks, availability, notices, officers, scan, signoff", () => {
    for (const needle of [
      "काटया मारूती पोलीस चौकी", "मार्शल", "साप्ताहिक सुट्टी", "इतर ड्युटी",
      "रात्रगस्त सुचना", "पो.नि.सुनिल पवार (गुन्हे)", "मेरी पोलीस चौकी",
      "तयार करणारे हजेरी लेखनिक", "अधिकारी कर्तव्य सारांश",
    ]) expect(html, `missing: ${needle}`).toContain(needle);
    expect((html.match(/<div class="page">/g) ?? []).length).toBe(5);
    for (const o of doc.officerSummary) {
      expect(html, `missing officer row: ${o.officerText}`).toContain(o.officerText);
    }
  });

  it("no internal leakage (undefined / [object Object] / NaN)", () => {
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("NaN");
  });

  it("toMr is a pure display transform", () => {
    expect(toMr("PC 2357 Dial 112")).toBe("PC २३५७ Dial 112"); // caller decides scope
  });
});
