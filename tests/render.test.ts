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

  it("renders the compact derived date line with Devanagari digits and computed weekday", () => {
    expect(html).toContain("१० सप्टेंबर २०२६, गुरुवार");
    expect(html).toContain("DRAFT"); // lifecycle badge from document
  });

  it("protected tokens are never digit-transformed", () => {
    expect(html).toContain("Dial 112 MERS");       // narrative rows (raw, not disp)
    expect(html).not.toContain("Dial ११२");
    expect(html).toContain("CCTNS");
  });

  it("matrix cells stay verbatim (escaped, Latin digits, OCR artifacts preserved)", () => {
    // Renderer contract (2026-10-14, chart-html.ts matrix cell): each part of a source cell
    // that contains the source's own <br> is escaped separately and the break is re-emitted
    // as a REAL <br> — the literal text "12&lt;br&gt;04" must never appear (it printed as
    // "<br>" on the sheet, the reported bug).
    expect(html).toContain("12<br>04 Proण्");
    expect(html).not.toContain("12&lt;br&gt;04");
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
    // compact-v5 sheet packing (2026-10-13): SIX readable sheets, one A4 landscape each. The
    // officer summary rides sheet 1, the patrol/scan schedule rides the notices sheet and the
    // sign-off closes the manpower sheet, so no sheet is half empty. Nothing was dropped to get
    // here — the no-loss ledger below is unchanged (212/212).
    // every sheet carries an anchor (id="sheet-N") so the header nav can jump to a sheet
    const pages = [...html.matchAll(/<div class="page[^"]*" id="sheet-(\d+)"/g)]
      .map((m) => ({ at: m.index!, n: Number(m[1]) }));
    expect(pages.length).toBe(6);
    const pageOf = (needle: string) => pages.filter((p) => p.at < html.indexOf(needle)).length;
    expect(pageOf("पोलीस अधिकारी कर्तव्य सारांश"), "officer summary rides the notices sheet").toBe(5);
    // 2026-10-13: the schedule moved off the chowki sheet to the court/special sheet — it measured
    // 810px vs 775px there once the chowki cells became equal-height (npm run print:audit).
    expect(pageOf("सुरक्षित नाशिक: गस्त व स्कॅनिंग वेळापत्रक"), "scan schedule rides the court/special sheet").toBe(3);
    // the colon form is the sign-off label; the header's clerk button carries the same words
    // without a colon, so the needle must keep the colon to address the printed block
    expect(pageOf("तक्ता तयार करणारे हजेरी लेखनिक:"), "sign-off closes the manpower sheet").toBe(6);
    expect((html.match(/<div class="page notices"[^>]*>/g) ?? []).length).toBe(1);
    // print-density sheets: the composite pages whose real source volume exceeds one
    // A4 at the mock's screen type scale (allowed to tighten in print, never to drop rows)
    expect((html.match(/<div class="page dense(?: command)?"[^>]*>/g) ?? []).length).toBe(3);
    // (`.h2` may carry data-label/data-default — editable names; markup text is the contract)
    expect(html).toMatch(/<div class="sec"><h2[^>]*>सूचना व निर्देश<\/h2><\/div>/);
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
