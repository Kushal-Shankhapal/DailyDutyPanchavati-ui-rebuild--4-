// Purpose: authoring-layer contracts — browser assets are same-origin-only and fake-save-free,
//   authoring styles are separated from the frozen baseline, and the rendered page wires up
//   the edit affordances without inline scripts or print pollution.
// Current role: work unit 1009 (authoring app) verification.
// Last meaningful change: 2026-10-09 — created with the authoring layer.
// Constraint/dependency: needs the DB only for one projection (render context); all file
//   assertions are plain fs reads of web/ and design/.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { projectChart, type ChartDocument } from "../server/chart-document.js";
import { renderChart } from "../server/render/chart-html.js";
import { addOfficerBox } from "../server/assignments.js";
import { createRequire } from "node:module";

// The browser transliteration engine is a real dependency (MIT, offline). The test evaluates the
// client slice with the SAME library object the browser gets from /vendor/sanscript.js.
const require = createRequire(import.meta.url);
const Sanscript = require("@indic-transliteration/sanscript") as { t: (s: string, from: string, to: string) => string };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

let pool: pg.Pool;
let doc: ChartDocument;
let html: string;

beforeAll(async () => {
  pool = makePool(TEST_DB);
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date='2026-09-10'`)).rows;
  if (ch.length !== 1) throw new Error("test DB missing 10/09 chart — run npm run db:seed first");
  doc = await projectChart(pool, ch[0].chart_id);
  html = renderChart(doc).html;
});
afterAll(async () => { await pool.end(); });

describe("browser authoring asset (web/chart-authoring.js)", () => {
  const js = () => read("web/chart-authoring.js");

  // A syntax error in this file throws once, at load, in the browser only — every other check in
  // this suite reads it as TEXT and passes anyway, and the whole chrome silently dies (found live
  // 2026-10-13: a literal newline inside a single-quoted string). Compile it here instead.
  it("parses as JavaScript (a load-time syntax error would silently kill all chrome)", () => {
    expect(() => new Function(js())).not.toThrow();
  });

  // The bilingual input aid is Sanscript (a real library) plus a thin Marathi convention layer on
  // top, so it can be pinned exactly. The slice is taken between two stable anchors inside the IIFE
  // (the file itself needs a DOM, so it cannot be imported here); a moved anchor fails loudly instead
  // of silently skipping coverage.
  it("transliterates the real Panchavati name shapes both ways (Sanscript + Marathi conventions)", () => {
    const src = js();
    const start = src.indexOf("var PROTECTED_LATIN");
    const end = src.indexOf("function bilingualPair");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const { romanToDev, devToRoman, isProtectedLatin } = new Function(
      "window",
      `${src.slice(start, end)}; return { romanToDev, devToRoman, isProtectedLatin };`,
    )({ Sanscript }) as {
      romanToDev: (s: string) => string;
      devToRoman: (s: string) => string;
      isProtectedLatin: (s: string) => boolean;
    };
    // roman → Devanagari: ITRANS typing, no printed word-final virama, nasal+stop → anusvara
    for (const [roman, dev] of [
      ["gajendra pATIl", "गजेंद्र पाटील"], ["sunil pavAr", "सुनिल पवार"],
      ["gAngurDe", "गांगुर्डे"], ["kALArAma maMdIr", "काळाराम मंदीर"],
      ["paMchavaTI", "पंचवटी"], ["vishESh tapAs pathak", "विशेष तपास पथक"],
      ["caukI", "चौकी"], ["gaNesh", "गणेश"], ["paTil", "पटिल"],
      // a word-initial capital with no ITRANS meaning is plain capitalisation (Patil → पतिल,
      // Sanjay → संजय, Dattatray → दत्तात्रय) — how a clerk writes a name in English
      ["Patil", "पतिल"], ["Sanjay", "संजय"], ["dattAtray", "दत्तात्रय"],
      // …but the letters that DO carry ITRANS meaning keep it: the long vowels (Aher → आहेर,
      // Akash → आकाश) and the retroflex ट (Tukaram → टुकाराम), which Marathi names need
      ["Aher", "आहेर"], ["AkAsh", "आकाश"], ["TukArAm", "टुकाराम"],
      // a doubled nasal is a real conjunct, never folded to the anusvara
      ["jagannAth", "जगन्नाथ"], ["ThAkare", "ठाकरे"], ["lakShmaN", "लक्ष्मण"],
      ["j~nAneshvar", "ज्ञानेश्वर"],
    ] as const) expect(romanToDev(roman), roman).toBe(dev);
    // Devanagari → roman: Marathi schwa deletion (no trailing ‘a’), ASCII anusvara
    for (const [dev, roman] of [
      ["सुनिल", "sunil"], ["पाटील", "pATIl"], ["चौकी", "chaukI"], ["रिक्त", "rikt"],
      ["गजेंद्र", "gajendr"], ["बंद", "band"], ["विशेष", "visheSh"],
    ] as const) expect(devToRoman(dev), dev).toBe(roman);
    // digits are untouched (the Devanagari transform stays a display transform)
    expect(romanToDev("12/09/2026")).toBe("12/09/2026");
    expect(devToRoman("पोशि 2451")).toBe("poshi 2451");
    // AGENTS.md: codes and protected tokens are NEVER transliterated (CCTNS would otherwise
    // letter-map into Devanagari, MERS would become a Marathi word)
    expect(romanToDev("CCTNS")).toBe("CCTNS");
    expect(romanToDev("Dial 112 MERS set")).toContain("Dial 112 MERS");
    expect(isProtectedLatin("PROB_PSI")).toBe(true);
    expect(isProtectedLatin("(LHC),")).toBe(true);
    expect(isProtectedLatin("gajendra")).toBe(false);
    // a Devanagari word is never re-converted on the roman side (canonical spelling stays intact)
    expect(romanToDev("गजेंद्र")).toBe("गजेंद्र");
  });

  // The strongest check the aid can carry: every real name on the chart survives a trip to the
  // Latin side and back. Four SOURCE spellings are irregular (a doubled anusvara in one entry, a
  // ड-initial surname, a ष-initial surname, and a stray “QM” token) — they are listed rather than
  // ignored, and the list is capped so a systematic regression cannot hide behind it.
  it("round-trips every seeded staff name except the documented source oddities", () => {
    const src = js();
    const { romanToDev, devToRoman } = new Function(
      "window",
      `${src.slice(src.indexOf("var PROTECTED_LATIN"), src.indexOf("function bilingualPair"))};` +
      " return { romanToDev, devToRoman };",
    )({ Sanscript }) as { romanToDev: (s: string) => string; devToRoman: (s: string) => string };
    const IRREGULAR_SOURCE_SPELLINGS = ["दंुडाप्पा", "डावरे", "षेखर", "QM"];
    const names = [...new Set(doc.assignments.filter((a) => a.person).map((a) => a.person!.nameMr))];
    expect(names.length).toBeGreaterThan(100);
    const broken = names.filter((n) => romanToDev(devToRoman(n)) !== n)
      .filter((n) => !IRREGULAR_SOURCE_SPELLINGS.some((odd) => n.includes(odd)));
    expect(broken, `names that must round-trip: ${broken.join(", ")}`).toEqual([]);
    // the well-known ones, spelled the way the chart prints them
    for (const n of ["गजेंद्र पाटील", "सुनिल पवार", "हेमंत मोहिते", "काळाराम मंदीर", "चौकी"])
      expect(romanToDev(devToRoman(n)), n).toBe(n);
  });

  it("suggests a conversion, never applies one: the review strip gates every pair", () => {
    const src = js();
    // the engine is the library, not hand-written tables
    expect(src).toContain("window.Sanscript");
    expect(src).not.toContain("var TR_VOWELS");
    // the pair has an editable preview plus accept/dismiss, and the accept path is the ONLY writer
    expect(src).toContain('.tl-prev');
    expect(src).toContain('class="tl-ok"');
    expect(src).toContain('class="tl-no"');
    const apply = src.slice(src.indexOf("function apply() {"), src.indexOf('strip.querySelector(".tl-ok")'));
    expect(apply).toContain("target.value = value");
    // every flyer's prose field gets the companion through ONE hook (a new editor cannot forget it)
    expect(src).toContain("mountBilingualCompanions(document.getElementById(\"flyer-body\"))");
    // …and a buckle/phone/search field is never turned into a name editor
    expect(src).toContain("isNonProseField");
  });

  it("is local-only: no absolute URLs — every API call is a same-origin relative path", () => {
    expect(js()).not.toMatch(/https?:\/\//);
    expect(js()).not.toMatch(/fetch\(\s*["'`]https?:/);
    const targets = js().match(/\bapi\(\s*["'`]([^"'`]+)/g) ?? [];
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) {
      const p = t.replace(/\bapi\(\s*["'`]/, "");
      expect(p.startsWith("/"), `API target must be same-origin relative: ${p}`).toBe(true);
    }
  });

  // The transliteration engine is served from this repo's own dependency tree. A CDN <script> would
  // put a name typed by the clerk on someone else's server — the local-only rule is about the RUNTIME,
  // so this is checked rather than assumed.
  it("gets its transliteration engine locally, never from a CDN", () => {
    const server = read("server/index.ts");
    expect(server).toContain('app.get("/vendor/sanscript.js"');
    expect(server).toContain('"node_modules", "@indic-transliteration", "sanscript"');
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    expect(pkg.dependencies["@indic-transliteration/sanscript"]).toBeTruthy();
    expect(js()).not.toMatch(/cdn\.jsdelivr|unpkg\.com|cdnjs/);
  });

  it("never uses prompt() and never fakes a save", () => {
    expect(js()).not.toMatch(/\bprompt\s*\(/);
    expect(js()).not.toMatch(/alert\s*\(/);
    // every mutation goes through the narrow API
    expect(js()).toMatch(/\/assignments\/["'`]?\s*\+|\/assignments\//);
  });

  it("wires the required controls", () => {
    const src = js();
    for (const id of ["mode-btn", "finalize-btn", "amend-btn", "staff-search", "nc-submit"]) {
      expect(src, `missing wiring for ${id}`).toContain(id);
    }
    expect(src).toContain("data-add");           // add-box handling
    expect(src).toContain("chowki");
    expect(src).toContain("officer");            // officer box add is routed too
    expect(src).toContain("openRename");         // editable-name popover
    expect(src).toContain("/labels");            // …through the narrow labels API
    expect(src).not.toContain("toggleMode");      // dead inline-script API is gone
  });
});

describe("authoring styles separated from the frozen baseline", () => {
  it("design/compv3.css carries NO edit rules (its header comment is now true)", () => {
    const raw = read("design/compv3.css");
    expect(raw.match(/\{/g)!.length).toBe(raw.match(/\}/g)!.length);
    // strip comments first — the header HISTORICALLY mentions the removed machinery
    const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toContain("mode-edit");
    expect(css).not.toContain("flyer");
    expect(css).not.toContain("add-box");
  });

  it("web/authoring.css owns the affordances and hides ALL of them in print", () => {
    const css = read("web/authoring.css");
    expect(css.match(/\{/g)!.length).toBe(css.match(/\}/g)!.length);
    const printBlock = css.slice(css.lastIndexOf("@media print"));
    expect(printBlock.length).toBeGreaterThan(0);
    // the abbreviation bubble is a JS-positioned fixed layer now (#abbr-tip) — it must be hidden
    // in print like every other piece of chrome
    for (const sel of [".add-box", ".toast", ".flyer-overlay", ".flyer-card", "#abbr-tip"]) {
      expect(printBlock, `print must hide ${sel}`).toContain(sel);
    }
    expect(printBlock).toMatch(/display:\s*none\s*!important/);
  });
});

describe("rendered page wiring (renderChart output)", () => {
  it("links the authoring assets via placeholders (resolved by server/static renderers)", () => {
    expect(html).toContain('__AUTH_CSS_HREF__');
    expect(html).toContain('__AUTH_JS_SRC__');
    expect(html).toContain('<script src="__AUTH_JS_SRC__" defer></script>');
    // the offline transliteration engine loads before the authoring layer (it uses window.Sanscript)
    expect(html).toContain('<script src="__VENDOR_JS_SRC__" defer></script>');
    expect(html.indexOf("__VENDOR_JS_SRC__")).toBeLessThan(html.indexOf("__AUTH_JS_SRC__"));
    expect(html).not.toMatch(/<script(?![^>]*src)/); // no inline script blocks
  });

  it("carries machine-readable chart context on <body>", () => {
    expect(html).toContain('data-chart-date="2026-09-10"');
    expect(html).toMatch(/data-lifecycle="(DRAFT|VALIDATED|FINALIZED)"/);
  });

  it("edit-mode add controls: चौकी AND अधिकारी boxes are enabled and routed (no Coming Soon)", () => {
    expect(html).toContain('data-add="chowki"');
    expect(html).toContain("+ चौकी जोडा");
    const officer = html.match(/<button[^>]*data-add="officer"[^>]*>/)?.[0] ?? "";
    expect(officer).not.toBe("");
    expect(officer).not.toContain("disabled");    // finished feature — never a dead control
    // compact-v5: the officer add control is a TILE inside the officer band's own grid row
    // (beside the last box), not a full-width block underneath it.
    expect(html).toContain("+ अधिकारी बॉक्स");
    const officerButton = html.match(/<button[^>]*data-add="officer"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(officerButton).not.toContain("Coming Soon");
    expect(officerButton).toContain("add-box-tile");
    const bandStart = html.indexOf('class="grid g-off fit"');
    const bandEnd = html.indexOf('class="grid g-core"', bandStart);
    expect(bandStart).toBeGreaterThan(-1);
    expect(html.slice(bandStart, bandEnd), "add tile sits inside the officer band").toContain('data-add="officer"');
    const js = read("web/chart-authoring.js");
    expect(js).toContain('data-add") === "officer"');
    expect(js).toContain('api("/api/charts/" + DATE + "/officer"');
  });

  it("every staff slot is addressable; narrative rows are not slots", () => {
    const slots = html.match(/data-asn="\d+"/g) ?? [];
    expect(slots.length).toBeGreaterThan(100);
    expect(html).toContain('class="slot" data-asn=');
    // the Dial 112 narrative row must never become a slot
    const narrative = html.match(/<td[^>]*>[^<]*Dial 112/)?.[0] ?? "";
    expect(narrative).not.toContain("data-asn");
  });

  it("abbreviation tooltips exist with verified full forms (SR_PI = वपोनि)", () => {
    expect(html).toContain('data-full="वरिष्ठ पोलीस निरीक्षक"');
    expect(html).toMatch(/<abbr class="abbr"[^>]*>वपोनि<\/abbr>/);
    expect(html).toContain('tabindex="0"');       // keyboard focus, not title-only
    expect(html).toContain('aria-label="वरिष्ठ पोलीस निरीक्षक"');
  });

  it("sr-PI card follows the mock grammar: rank label + compact chart name, ठाणे प्रमुख chip kept", () => {
    const card = html.match(/<div class="sr-pi-card">[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? "";
    // visual contract (design/panchavati-compv3.html): <span class="rk"> label” + <span class="nm"> name
    expect(card).toContain('class="rk"');
    expect(card).toContain("वपोनि");                      // verified short form is what shows
    expect(card).toContain('data-full="वरिष्ठ पोलीस निरीक्षक"');  // full form on hover/focus
    expect(card).toContain("गजेंद्र पाटील");              // compact chart form (never the full master prose)
    expect(card).toContain("ठाणे प्रमुख");
  });

  it("chowki incharge line carries their time window as plain text; block name not duplicated inside sub-tables", () => {
    // user correction 2026-10-13: the source-backed window still prints, but as plain text — no
    // decorative middle dot and no coloured chip ("this is a chart, not ui").
    expect(html).toMatch(/<span class="tm">[^·<]+<\/span>/);
    expect(html).not.toContain('<span class="tm">· ');
    // the only surviving middle dot is verbatim source text inside a notice line
    expect(html).toContain("डी.टी.एस.॰नाशिक · दिनांक");
    // heading exists as the block name only — never repeated as an in-table role label
    expect(html).toMatch(/<div class="nm"[^>]*>काटया मारूती पोलीस चौकी<\/div>/);
    expect(html).not.toMatch(/<th class="role"[^>]*>काटया मारूती पोलीस चौकी<\/th>/);
    // …but person groups keep an (empty) role anchor so columns stay aligned
    expect(html).toMatch(/<th class="role" rowspan="\d+"><\/th>/);
  });

  it("toolbar keeps print button native and edit chrome marked no-print", () => {
    expect(html).toContain('class="toolbar no-print"');
    expect(html).toContain("window.print()");
    expect(html).not.toContain("toggleMode");
    expect(html).not.toContain("onclick=\"finalizeChart");
  });
});

describe("editable display names (per-chart rename support)", () => {
  it("every rename-able element carries a stable key + its SOURCE text", () => {
    expect(html).toContain('data-label="head.h1"');            // chart title
    expect(html).toContain('data-label="p1.desk.day"');        // table/section names
    expect(html).toContain('data-label="sec.matrix"');
    expect(html).toContain('data-default="मनुष्यबळ स्थिती दर्शक मॅट्रिक्स"');
    expect(html).toMatch(/data-label="blk\.[^"]+"/);           // chowki block names
    expect(html).toMatch(/data-label="role\.\d+"/);            // left-row role labels
    expect(html).toMatch(/data-label="grp\.\d+"/);             // left-row group headings
    expect(html).toMatch(/data-label="mcol\.[^"]+"/);          // matrix column headers
    expect(html).toMatch(/data-label="ssum\.col\.[^"]+"/);     // summary column headers
    expect(html).toMatch(/data-label="signoff\.\d"/);          // sign-off labels
    // the date line is D-rule derived — never rename-able
    expect(html).not.toContain('data-label="head.h3"');
  });

  it("override resolution: element scope > text scope > default; default kept for re-edit", () => {
    const custom = structuredClone(doc);
    custom.template.overrides = {
      ...custom.template.overrides,
      labels: { "sec.matrix": "नवीन मॅट्रिक्स नाव" },
      labelsAll: { "दिवस पाळी कर्तव्य": "Day Duty Desk" },
    };
    const out = renderChart(custom).html;
    // element scope
    expect(out).toMatch(/<h2[^>]*>नवीन मॅट्रिक्स नाव<\/h2>/);
    // text scope ("everywhere with this default name")…
    expect(out).toContain(">Day Duty Desk</div>");
    // …and data-default still holds the SOURCE text so the popover can re-address it
    expect(out).toContain('data-default="दिवस पाळी कर्तव्य"');
    // untouched names render their defaults
    expect(out).toMatch(/<h2[^>]*>रजा, साप्ताहिक सुट्टी व गैरहजर<\/h2>/);
    // the no-loss ledger must be unaffected by renames
    const r = renderChart(custom);
    expect(r.stats.rowsRendered).toBe(r.stats.rowsTotal);
  });
});

describe("addOfficerBox domain (real रिक्त seat + chart-local display entry)", () => {
  it("writes one fillable रिक्त रायटर seat in the office column and merges officerBoxes", async () => {
    const chartId = doc.chartId;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await addOfficerBox(client, { chartId, labelMr: "नवीन शाखा", titleMr: "उदा. अधिकारी" });
      expect(res.assignmentIds.length).toBe(1);
      const rows = (await client.query(
        `SELECT duty_title_mr, allocation_state, column_no, staff_id, notes_mr
           FROM daily_assignments WHERE assignment_id = $1`, [res.assignmentIds[0]])).rows;
      expect(rows.length).toBe(1);
      expect(rows[0].duty_title_mr).toBe("नवीन शाखा॰रायटर");   // seed grammar: label = the seat
      expect(rows[0].allocation_state).toBe("VACANT_RIKT");
      expect(Number(rows[0].column_no)).toBe(4);                // renderer's office desk column
      expect(rows[0].staff_id).toBeNull();                      // no invented person
      expect(rows[0].notes_mr).toBeNull();
      // override merged without clobbering other keys
      const ov = (await client.query(
        `SELECT presentation_overrides FROM daily_charts WHERE chart_id = $1`, [chartId])).rows[0]
        .presentation_overrides;
      expect(Array.isArray(ov.officerBoxes)).toBe(true);
      expect(ov.officerBoxes[ov.officerBoxes.length - 1].label).toBe("नवीन शाखा");
      // the renderer picks the box up: heading, chip, and a CLICKABLE रिक्त slot
      const rr = renderChart(await projectChart(client, chartId));
      expect(rr.html).toContain('data-label="box.नवीन शाखा"');
      expect(rr.html).toContain(">उदा. अधिकारी</div>");
      const boxSlice = rr.html.slice(rr.html.indexOf("नवीन शाखा"));
      expect(boxSlice.slice(0, 2000)).toMatch(/data-asn="\d+"/);  // fillable, not fake content
      // no-loss accounting still holds with the new row (213 rows → 213 rendered)
      expect(rr.stats.rowsRendered).toBe(rr.stats.rowsTotal);
      // duplicate label and blank labels are refused
      await expect(addOfficerBox(client, { chartId, labelMr: "नवीन शाखा" })).rejects.toThrow(/आधीच/);
      await expect(addOfficerBox(client, { chartId, labelMr: "   " })).rejects.toThrow(/labelMr/);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
