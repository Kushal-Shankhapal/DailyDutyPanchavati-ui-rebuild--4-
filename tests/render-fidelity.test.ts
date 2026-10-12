// Purpose: pin the renderer's fidelity to the approved visual contract
//   (design/panchavati-compv3.html + design/compv3.css) so the structure cannot silently
//   drift back to one-off blocks or full-name prose.
// Current role: work unit 1010 (renderer fidelity) regression gate.
// Last meaningful change: 2026-10-11 — created with the fidelity pass.
// Constraint/dependency: structural assertions only (class vocabulary + grouping); exact
//   source text stays in reference/SEMANTIC/10.md and is asserted by the seed/invariant tests.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { projectChart, type ChartDocument } from "../server/chart-document.js";
import { renderChart } from "../server/render/chart-html.js";

let pool: pg.Pool;
let doc: ChartDocument;
let html: string;

beforeAll(async () => {
  pool = makePool(TEST_DB);
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date='2026-09-10'`)).rows;
  if (ch.length !== 1) throw new Error("test DB missing 10/09 chart — run db:seed first");
  doc = await projectChart(pool, ch[0].chart_id);
  html = renderChart(doc).html;
});
afterAll(async () => { await pool.end(); });

describe("renderer fidelity vs design/panchavati-compv3.html", () => {
  it("page 2 has no stray blocks: continuation rows stay inside their post", () => {
    // बंद / चार्ज continuation cells are carried by the block's typed .fx line — never a block
    expect(html).not.toContain('<div class="nm">बंद</div>');
    expect(html).not.toContain("चौकी चा चार्ज");
    const blockNames = [...html.matchAll(/<div class="(?:nm|ch-head)"[^>]*>[^<]*/g)].map((m) => m[0]);
    expect(blockNames.length).toBeGreaterThan(0);
    // a chowki block is named by its post, not by its charge line
    // (`.nm` may carry data-label/data-default — editable-name attributes; text is the contract)
    expect(html).toMatch(/<div class="ch-head"><div class="nm"[^>]*>काटया मारूती पोलीस चौकी<\/div>/);
  });

  it("page 2 is the six-chowki matrix: special posts are NOT blocks", () => {
    // the mock's page 2 = chowkis only; मोबाईल / सायबर / काळाराम / महिला कक्ष are role groups
    // inside page 1's कोर्ट, समन्स, वॉरंट व विशेष कक्ष desk (dual-shift posts carry the
    // source's own दिवसपाळी/रात्रपाळी wording — SEMANTIC officer-summary convention).
    const chowkiNames = [...html.matchAll(/<div class="ch-head"><div class="nm"[^>]*>([^<]*)/g)].map((m) => m[1]);
    expect(chowkiNames.length).toBe(6);
    for (const nm of ["पंचवटी १ मोबाईल", "सायबर सेल", "काळाराम", "महिला कक्ष"]) {
      expect(chowkiNames.some((c) => c.includes(nm)), `special leaked as page-2 block: ${nm}`).toBe(false);
    }
    expect(html).toContain("दिवसपाळी");
    expect(html).toContain("रात्रपाळी");
  });

  it("special posts render as role groups in the page-1 court/special desk", () => {
    const desk = html.slice(html.indexOf("कोर्ट, समन्स, वॉरंट व विशेष कक्ष"));
    // mobile post: one group per shift, source title + source shift word
    expect(desk).toContain("पंचवटी १ मोबाईल - दिवसपाळी");
    expect(desk).toContain("पंचवटी १ मोबाईल - रात्रपाळी");
    // single-shift posts print unqualified (source spellings kept verbatim — मंदीर vs मंदिर)
    expect(desk).toContain("सायबर सेल");
    expect(desk).toContain("काळाराम मंदीर गार्ड ड्युटी");
    expect(desk).toContain("महिला कक्ष");
  });

  it("page 1 carries the officers band (.g-off boxes) below the Sr-PI card", () => {
    expect(html).toContain('class="grid g-off fit"');
    expect(html).toContain('class="sr-pi-card"');
    // box heads come from the source's own branch qualifier; the writers from the office column
    for (const chip of ["तपास", "प्रषा", "गुन्हे", "विशेष"]) {
      expect(html, `missing officer box chip ${chip}`).toMatch(new RegExp(`<span class="chip c-off"[^>]*>${chip}<\\/span>`));
    }
    expect(html).toContain("विशेष तपास पथक");
    // तपास writer row is रिक्त in the source → slot chip, never an invented name
    expect(html).toContain(`<span class="chip c-vac">रिक्त</span>`);
  });

  it("officers are NOT repeated inside the generic day desk", () => {
    // नितीन आंधळे (प्रषा) exists only in the station-officer band → exactly one day render,
    // plus the verbatim officer-summary row on page 5.
    const dayBand = html.slice(0, html.indexOf("रजा, साप्ताहिक सुट्टी व गैरहजर"));
    expect((dayBand.match(/नितीन आंधळे/g) ?? []).length).toBe(1);
  });

  it("office desk keeps the clerk rows; the branch writers render in the officer boxes", () => {
    const grid = html.slice(html.indexOf('class="grid g-off fit"'), html.indexOf('class="p1-lower"'));
    expect((grid.match(/>रायटर<\/th>/g) ?? []).length).toBe(4);   // one writer row per box
    const desk = html.slice(html.indexOf("कार्यालयीन शाखा व कारकून"), html.indexOf("कोर्ट, समन्स"));
    expect(desk).toContain("नगदी कारकुन");
    expect(desk).toContain("हजेरी मास्तर");
  });

  it("compact chart names: role rows are labelled, names are never the full master prose", () => {
    expect(html).toContain('>रायटर</th>');                 // role label becomes the row label
    expect(html).not.toContain("आहेर रायटर");              // …not a trailing note after the name
    expect(html).not.toContain("हेमंत विजय मोहिते");        // 3-token master name never printed
    expect(html).toContain("हेमंत मोहिते");                // compact chart form instead
  });

  it("orphan source labels render as full-width heading rows, not label + empty cell", () => {
    expect(html).toMatch(/<th class="role" colspan="2"[^>]*>\(चेकिंग-१ \)<\/th>/);
    expect(html).not.toMatch(/<th class="role" colspan="2"><\/th>/);
  });

  it("page 3 is split into the leave section and the court/bandobast section", () => {
    expect(html).toMatch(/<h2[^>]*>रजा, साप्ताहिक सुट्टी व गैरहजर<\/h2>/);
    expect(html).toMatch(/<h2[^>]*>कोर्ट पैरवी व विशेष क्षेत्रीय बंदोबस्त<\/h2>/);
  });

  it("page 5 pairs the session table with the hourly scan table", () => {
    expect(html).toMatch(/<th[^>]*>सत्र व वेळ<\/th>/);
    expect(html).toContain("बीट मार्शल नेमणूक");
    expect(html).toMatch(/<th[^>]*>स्कॅन चौकी हद्द<\/th>/);
  });

  it("page 1 court desk carries the mock's full title", () => {
    expect(html).toContain("कोर्ट, समन्स, वॉरंट व विशेष कक्ष");
  });

  it("beat-marshal posts fold into their paired chowki (mock grammar; T15 closed)", () => {
    // template layout.marshalPostForChowki pairs 5 marshal posts on the 10/09 chart; each prints
    // as a `मार्शल:` .fx line inside its chowki — never as a standalone block (the mock's band).
    const blockOf = (name: string): string => {
      // match the `.nm` TEXT node (attrs may sit on the open tag): ">name</div>"
      const i = html.indexOf(`>${name}</div>`);
      expect(i, `missing block ${name}`).toBeGreaterThan(-1);
      const j = html.indexOf('<div class="blk">', i);
      return html.slice(i, j === -1 ? undefined : j);
    };
    expect((html.match(/<div class="fx mrsh">/g) ?? []).length).toBe(5);
    for (const nm of ["काटया मारूती मार्शल", "पंचवटी कारंजा मार्शल", "फुले नगर मार्शल", "मेरी मार्शल"]) {
      expect(html, `marshal post leaked as its own block: ${nm}`).not.toContain(`<div class="nm">${nm}</div>`);
    }
    // कारंजा: the chowki's own charge line and the marshal's line stack in one sub-col (mock)
    const karanja = blockOf("पंचवटी कारंजा पोलीस चौकी");
    // state word and destination live in their own spans so the line never breaks mid-phrase
    expect(karanja).toContain('<span class="st">चार्ज →</span> <span class="dst">काटया मारूती पोलीस चौकी</span>');
    expect(karanja).toContain('<div class="fx mrsh">');

    // the in-charge prints ONCE, in the block heading (the mock's grammar) — never as a first
    // row inside the sub-col as well (that duplicate dragged a wrapped time chip along)
    const katya = blockOf("काटया मारूती पोलीस चौकी");
    expect(katya).toContain('<div class="of">अधि. ');
    expect((katya.match(/हेमंत मोहिते/g) ?? []).length).toBe(1);
    // the marshal's own staff rows merge into the chowki's sub-col (source lists them in the
    // marshal cell — the fold moves them, never drops them: render:chart rows stay 212/212)
    expect(blockOf("मेरी पोलीस चौकी")).toContain("Dial 112 MERS set");
    // सरदार चौकी has no marshal post in the source → no marshal line, exactly the mock
    expect(blockOf("सरदार पोलीस चौकी")).not.toContain("fx mrsh");
  });
});
