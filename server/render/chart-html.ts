// Purpose: ChartDocument → HTML (screen + print projection of the SAME document —
//   PRODUCT_UI_ARCHITECTURE §12). Visual grammar = frozen design/compv3.css + the
//   compact-v3 mock's class vocabulary; data = the document only (never re-derived).
// Current role: P1 renderer v1 — full data coverage, 5-page skeleton; visual polish
//   iterates on user screenshots (user owns the visual pass).
// Last meaningful change: 2026-10-08 — created at P1 (renderer slice).
// Constraint/dependency: AGENTS.md hard rules — no notes parsing (notes only echoed
//   as text), protected tokens (Dial 112, CCTNS, MERS…) never digit-transformed,
//   Marathi wraps never truncates (CSS handles), derived weekday computed once here.
import type {
  ChartDocument, DocAssignment, DocPerson, DocLocationState, MatrixColumn,
} from "../chart-document.js";

// ---- display helpers -------------------------------------------------------------
const DEV_DIGITS = "०१२३४५६७८९";
/** Devanagari digit display transform (T7) — display ONLY, never touches the store.
 *  Protected tokens (Dial 112, etc.) are never digit-transformed per AGENTS.md. */
export function toMr(s: string): string {
  const protectedTokens = ["Dial 112"];
  let res = s;
  const stash: string[] = [];
  for (const token of protectedTokens) {
    if (res.includes(token)) {
      const key = `__PROT_${String.fromCharCode(65 + stash.length)}__`;
      res = res.replaceAll(token, key);
      stash.push(token);
    }
  }
  res = res.replace(/[0-9]/g, (d) => DEV_DIGITS[Number(d)]);
  stash.forEach((token, idx) => {
    const key = `__PROT_${String.fromCharCode(65 + idx)}__`;
    res = res.replaceAll(key, token);
  });
  return res;
}
const h = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MONTHS_MR = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
  "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];

/** Display text: escaped + Devanagari digits. For source fields that may contain
 *  protected tokens (notices/narratives like "Dial 112 MERS") use raw() instead. */
const disp = (s: string | null | undefined): string => (s == null || s === "" ? "" : toMr(h(s)));
const raw = (s: string | null | undefined): string => (s == null ? "" : h(s));

function personLine(p: DocPerson): string {
  const rank = p.rankShortFormMr ?? p.rankCode;
  const buckle = p.buckleNo ? ` ${toMr(p.buckleNo)}` : "";
  return `${h(rank)}${buckle} ${h(p.nameMr)}`;
}
function timeRange(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const sh = start.slice(0, 2), eh = end.slice(0, 2);
  const sm = start.slice(3, 5), em = end.slice(3, 5);
  return sm === "00" && em === "00" ? `${toMr(sh)}–${toMr(eh)}` : `${toMr(start.slice(0, 5))}–${toMr(end.slice(0, 5))}`;
}
function hhmm(t: string | null): string { return t ? t.slice(0, 5) : ""; }

// ---- row classification (structure only — notes never parsed, only echoed) -------
const isLabel = (r: DocAssignment): boolean => r.person === null && r.notesMr === null;
const isVacant = (r: DocAssignment): boolean => r.allocationState === "VACANT_RIKT";

export interface RenderStats {
  rowsTotal: number;
  rowsRendered: number;   // must equal rowsTotal — the no-loss accounting
}

interface Group { label: DocAssignment | null; rows: DocAssignment[]; }

/** Assignment rows → grouped label/value table rows (rowspan labels, बिमा runs). */
function renderGroups(rows: DocAssignment[], count: (n: number) => void): string {
  const groups: Group[] = [];
  for (const r of rows) {
    if (isLabel(r)) groups.push({ label: r, rows: [] });
    else (groups.length ? groups[groups.length - 1] : (groups.push({ label: null, rows: [] }), groups[groups.length - 1])).rows.push(r);
  }
  let html = "";
  for (const g of groups) {
    const title = g.label ? disp(g.label.dutyTitleMr ?? "") : "";
    if (g.label) count(1);
    if (g.rows.length === 0) {
      const cell = g.label && isVacant(g.label)
        ? `<span class="chip c-vac">रिक्त</span>`
        : `<span class="blank"></span>`;
      html += `<tr class="g"><th class="role">${title}</th><td>${cell}</td></tr>\n`;
      continue;
    }
    // segment into runs of same bima flag; first run carries the group label
    type Run = { bima: boolean; rows: DocAssignment[] };
    const runs: Run[] = [];
    for (const r of g.rows) {
      const b = r.person !== null && r.isBima;
      if (!runs.length || runs[runs.length - 1].bima !== b) runs.push({ bima: b, rows: [] });
      runs[runs.length - 1].rows.push(r);
      count(1);
    }
    runs.forEach((run, ri) => {
      const th = ri === 0
        ? `<th class="role" rowspan="${run.rows.length}">${title}</th>`
        : run.bima
          ? `<th class="bima-lb" rowspan="${run.rows.length}">बिमा</th>`
          : `<th class="role" rowspan="${run.rows.length}"></th>`;
      run.rows.forEach((r, yi) => {
        const trCls = yi === 0 ? ` class="g"` : "";
        html += `<tr${trCls}>${yi === 0 ? th : ""}<td>${valueHtml(r)}</td></tr>\n`;
      });
    });
  }
  return html;
}

function valueHtml(r: DocAssignment): string {
  if (r.person) {
    let s = personLine(r.person);
    const tr = timeRange(r.startTime, r.endTime);
    if (tr) s += ` <span class="win duty-time">· ${tr}</span>`;
    if (r.notesMr) s += ` <span class="win">${raw(r.notesMr)}</span>`;
    return s;
  }
  // narrative row — source text echoed verbatim (protected tokens intact)
  return `<span class="nil">${raw(r.notesMr)}</span>`;
}

// ---- column walk → blocks (page 2 grammar) ---------------------------------------
interface Block {
  key: string;
  name: string;
  kind: string;                 // location kind or 'DUTY'
  locationId: number | null;
  day: DocAssignment[];
  night: DocAssignment[];
  incharge: DocPerson | null;
}

function walkBlocks(doc: ChartDocument, cols: number[]): { blocks: Block[]; loose: DocAssignment[] } {
  const blocks: Block[] = [];
  const byKey = new Map<string, Block>();
  const loose: DocAssignment[] = [];
  for (const shift of ["DAY", "NIGHT"] as const) {
    for (const col of cols) {
      let cur: Block | null = null;
      for (const r of doc.assignments.filter((a) => a.shift === shift && a.columnNo === col)) {
        if (isLabel(r) && r.dutyCode != null) {
          const key = r.location ? `L${r.location.locationId}` : `D${r.dutyCode}`;
          let b = byKey.get(key);
          if (!b) {
            b = {
              key,
              name: r.location ? r.location.nameMr : (r.dutyTitleMr ?? r.dutyCode),
              kind: r.location ? r.location.kind : "DUTY",
              locationId: r.location ? r.location.locationId : null,
              day: [], night: [], incharge: null,
            };
            byKey.set(key, b); blocks.push(b);
          }
          cur = b;
          (shift === "DAY" ? b.day : b.night).push(r);  // header row rendered as block name
          if (!b.incharge && r.person) b.incharge = r.person;
          continue;
        }
        if (cur) {
          (shift === "DAY" ? cur.day : cur.night).push(r);
          if (r.person && !cur.incharge) cur.incharge = r.person;
        } else {
          loose.push(r);
        }
      }
    }
  }
  return { blocks, loose };
}

// ---- state fx (चार्ज/बंद lines from explicit location states) ---------------------
function stateFx(states: DocLocationState[], locationId: number | null, shift: "DAY" | "NIGHT", marshal: boolean): string {
  if (locationId == null) return "";
  const s = states.find((x) => x.location.locationId === locationId && x.shift === shift);
  if (!s) return "";
  const cls = marshal ? "fx mrsh" : "fx";
  const lb = marshal ? `<span class="lb">मार्शल:</span> ` : "";
  const parts: string[] = [];
  if (s.isClosed) parts.push(`<span class="sl">बंद</span>`);
  if (s.chargeTo) parts.push(`चार्ज → ${disp(s.chargeTo.nameMr)}`);
  if (parts.length === 0) return "";
  return `<div class="${cls}">${lb}${parts.join(" · ")}</div>`;
}

// ---- page sections ---------------------------------------------------------------
function headHtml(doc: ChartDocument): string {
  const [y, m, d] = doc.chartDate.split("-");
  const dateLine = `दिनांक: ${toMr(d)} ${MONTHS_MR[Number(m) - 1]} ${toMr(y)} · वार: ${h(doc.weekdayMr)}`;
  const lc = doc.lifecycle.toLowerCase();
  return `<div class="head">
    <div class="hc">
      <div class="h1">नाशिक शहर पोलीस आयुक्तालय</div>
      <div class="h2">दैनिक कर्तव्य वाटप</div>
      <div class="h3">${dateLine}</div>
    </div>
    <div class="hr"><span class="lc lc-${lc}">${doc.lifecycle}</span></div>
  </div>`;
}

function page(title: string, doc: ChartDocument, body: string): string {
  return `<div class="page">
  ${headHtml(doc)}
${body}
</div>`;
}

export function renderChart(doc: ChartDocument): { html: string; stats: RenderStats } {
  const stats: RenderStats = { rowsTotal: doc.assignments.length, rowsRendered: 0 };
  const count = (n: number) => { stats.rowsRendered += n; };
  const col = (shift: "DAY" | "NIGHT", c: number) =>
    doc.assignments.filter((a) => a.shift === shift && a.columnNo === c);
  const dtTable = (rows: DocAssignment[]) =>
    `<table class="dt"><tbody>\n${renderGroups(rows, count)}</tbody></table>`;

  const courtCodes = (doc.template.layout.courtDutyCodes as string[] | undefined) ?? [];
  const day4 = col("DAY", 4);
  const courtSplit = courtCodes.length > 0 && day4.some((r) => courtCodes.includes(r.dutyCode ?? ""));
  const officeRows = courtSplit ? day4.filter((r) => !courtCodes.includes(r.dutyCode ?? "")) : day4;
  const courtRows = courtSplit ? day4.filter((r) => courtCodes.includes(r.dutyCode ?? "")) : [];

  // ---- page 1: Sr-PI + day/night/office/court band ----
  const srpi = doc.assignments.find((a) => a.shift === "DAY" && a.person?.rankCode === "SR_PI")?.person ?? null;
  const writer = doc.assignments.find((a) => a.dutyCode === "OFFICE_WRITER" && a.person)?.person ?? null;
  const srPiCard = srpi ? `<div class="sr-pi-card">
    <div class="sr-pi-header">
      <div class="sr-pi-title"><span class="rk">वरिष्ठ पोलीस निरीक्षक:</span> <span class="nm">${h(srpi.nameMr)}</span></div>
      <span class="chip c-sr">ठाणे प्रमुख</span>
    </div>
    <div class="sr-pi-body">
      <div class="grp">
        <span class="lb">रायटर:</span>
        <div class="ln">${writer ? `<span>${personLine(writer)}</span>` : `<span class="blank"></span>`}</div>
      </div>
      <div class="grp">
        <span class="lb">चालक:</span>
        <div class="ln"><span class="k">दिवस:</span><span class="blank"></span></div>
        <div class="ln"><span class="k">रात्र:</span><span class="blank"></span></div>
      </div>
    </div>
  </div>` : "";

  const deskBlock = (title: string, win: string | undefined, rows: DocAssignment[]) =>
    `<div class="blk core">
      <div class="bh"><div class="nm">${title}</div>${win ? `<span class="win">${win}</span>` : ""}</div>
      <div class="body">${dtTable(rows)}</div>
    </div>`;

  const p1Lower = `<div class="p1-lower">
      ${deskBlock("दिवस पाळी कर्तव्य", "वेळ: ०९:०० ते २१:००", col("DAY", 1))}
      ${deskBlock("रात्र पाळी कर्तव्य", "वेळ: २१:०० ते ०९:००", col("NIGHT", 1))}
      ${deskBlock("कार्यालयीन शाखा व कारकून", undefined, officeRows)}
      ${courtSplit ? deskBlock("कोर्ट, समन्स व वॉरंट", undefined, courtRows) : ""}
  </div>`;

  const page1 = page("", doc, `  ${srPiCard}
${p1Lower}`);

  // ---- page 2: location blocks (chowkis, marshal posts, special duties) ----
  const { blocks, loose } = walkBlocks(doc, [2, 3]);
  const blockHtml = (b: Block): string => {
    const marshal = b.kind === "MARSHAL_POST";
    const sub = (shift: "DAY" | "NIGHT", title: string) => {
      const rows = shift === "DAY" ? b.day : b.night;
      const st = b.locationId != null
        ? stateFx(doc.locationStates, b.locationId, shift, marshal) : "";
      const closed = doc.locationStates.some(
        (s) => s.location.locationId === b.locationId && s.shift === shift && s.isClosed);
      if (rows.length === 0 && !st) return "";
      return `<div class="sub-col${closed ? " shut" : ""}">
            <div class="sub-col-title"><span>${title}</span></div>
            ${st}
            ${dtTable(rows)}
          </div>`;
    };
    const incharge = b.incharge
      ? `<div class="of">अधि. ${personLine(b.incharge)}</div>` : "";
    return `<div class="blk">
      <div class="ch-head"><div class="nm">${disp(b.name)}</div>${incharge}</div>
      <div class="body"><div class="sub-shift-wrap">
        ${sub("DAY", "दिवसपाळी")}
        ${sub("NIGHT", "रात्रपाळी")}
      </div></div>
    </div>`;
  };
  const looseHtml = loose.length
    ? `<div class="blk"><div class="ch-head"><div class="nm">इतर</div></div>
      <div class="body">${dtTable(loose)}</div></div>` : "";
  const page2 = page("", doc, `  <div class="sec"><h2>चौकी, मार्शल पोस्ट व विशेष दायित्वे</h2></div>
  <div class="grid g-chowki">
    ${blocks.map(blockHtml).join("\n    ")}
    ${looseHtml}
  </div>`);

  // ---- page 3: availability + notices ----
  const availByGroup = new Map<string, typeof doc.availability>();
  for (const a of doc.availability) {
    const k = a.groupKey ?? a.category;
    if (!availByGroup.has(k)) availByGroup.set(k, []);
    availByGroup.get(k)!.push(a);
  }
  const availBlock = (name: string, items: typeof doc.availability) => {
    const lines = items.map((a) => {
      const win = a.detailMr ? `<span class="win">${disp(a.detailMr)}</span>` : "";
      if (!a.person) {
        return `<div class="p"><span class="r">${disp(a.category)}</span><span class="n nil">—</span>${win}</div>`;
      }
      const cat = a.category !== name ? `<span class="r">${disp(a.category)}</span>` : "";
      return `<div class="p">${cat}<span class="n">${personLine(a.person)}</span>${win}</div>`;
    }).join("\n        ");
    return `<div class="blk">
      <div class="bh"><div class="nm">${disp(name)}</div><span class="chip num">${toMr(String(items.length))}</span></div>
      <div class="body">
        ${lines}
      </div>
    </div>`;
  };
  const noticeGroups = new Map<string, string[]>();
  for (const n of doc.notices) {
    const k = n.groupKey ?? "सूचना";
    if (!noticeGroups.has(k)) noticeGroups.set(k, []);
    noticeGroups.get(k)!.push(n.textMr);
  }
  const noticeBlocks = [...noticeGroups.entries()].map(([k, lines]) =>
    `<div class="blk">
      <div class="bh"><div class="nm">${disp(k)}</div><span class="chip num">${toMr(String(lines.length))}</span></div>
      <div class="body">
        ${lines.map((t) => `<div class="p"><span class="n">${raw(t)}</span></div>`).join("\n        ")}
      </div>
    </div>`).join("\n    ");

  const page3 = page("", doc, `  <div class="sec"><h2>रजा, साप्ताहिक सुट्टी व गैरहजर</h2></div>
  <div class="grid g4">
    ${[...availByGroup.entries()].map(([k, v]) => availBlock(k, v)).join("\n    ")}
  </div>

  <div class="sec" style="margin-top:10px;"><h2>सूचना व निर्देश</h2></div>
  <div class="grid g4">
    ${noticeBlocks}
  </div>`);

  // ---- page 4: manpower matrix + shift summary + sudden changes ----
  const mcols = (doc.template.layout.matrixColumns as MatrixColumn[] | undefined) ?? [];
  const matrixHead = `<tr><th>तपशील</th>${mcols.map((c) => `<th class="num">${h(c.label)}</th>`).join("")}</tr>`;
  const rowOrder = [...new Set(doc.manpower.map((c) => c.displayOrder))].sort((a, b) => a - b);
  const matrixBody = rowOrder.map((ord) => {
    const cells = doc.manpower.filter((c) => c.displayOrder === ord);
    const rowKey = cells[0]?.rowKey ?? "";
    const tds = mcols.map((mc) => {
      const cell = cells.find((c) => c.columnKey === mc.key);
      const v = cell ? cell.valueText : "";
      const muted = v === ".." || v === "" ? " muted" : "";
      return `<td class="num${muted}">${h(v)}</td>`;  // verbatim source values — NEVER toMr
    }).join("");
    return `<tr><th>${disp(rowKey)}</th>${tds}</tr>`;
  }).join("\n      ");

  const sumLabel: Record<string, string> = {
    DAY: "दिवसपाळी (०९:०० ते २१:००)", NIGHT: "रात्रपाळी (२१:०० ते ०९:००)", OTHER: "इतर ड्युटी / रजा / कोर्ट",
  };
  const sumCols = (doc.template.layout.shiftSummaryColumns as string[] | undefined) ?? [];
  const sumBody = (["DAY", "NIGHT", "OTHER"] as const).map((k) => {
    const tds = sumCols.map((c) => {
      const cell = doc.shiftSummaries.find((s) => s.summaryKey === k && s.columnKey === c);
      return `<td class="num">${disp(cell?.valueText ?? "")}</td>`;
    }).join("");
    return `<tr><th>${sumLabel[k]}</th>${tds}</tr>`;
  }).join("\n      ");

  const changeBody = doc.suddenChanges.map((c) =>
    `<tr><td class="num">${toMr(String(c.seq))}</td><td>${disp(c.detailMr)}</td><td>${disp(c.noteMr ?? "")}</td></tr>`)
    .join("\n      ") || `<tr><td class="num">—</td><td class="nil">नोंद नाही</td><td></td></tr>`;

  const page4 = page("", doc, `  <div class="sec"><h2>मनुष्यबळ स्थिती दर्शक मॅट्रिक्स</h2></div>
  <div class="tbl-wrap">
  <table class="tbl">
    <thead>
      ${matrixHead}
    </thead>
    <tbody>
      ${matrixBody}
    </tbody>
  </table>
  </div>

  <div class="sec" style="margin-top:10px;"><h2>पाळीनिहाय सारांश व अचानक बदल नोंद</h2></div>
  <div class="two">
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>पाळी</th>${sumCols.map((c) => `<th class="num">${h(c)}</th>`).join("")}</tr></thead>
        <tbody>
      ${sumBody}
        </tbody>
      </table>
    </div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th class="num" style="width:32px">अ.नं.</th><th>अचानक बदल तपशील</th><th style="width:40%">नोंद / कारण</th></tr></thead>
        <tbody>
      ${changeBody}
        </tbody>
      </table>
    </div>
  </div>`);

  // ---- page 5: officer summary + scan schedule + sign-off ----
  const offHalf = Math.ceil(doc.officerSummary.length / 2);
  const officerTable = (rows: typeof doc.officerSummary) => `<div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th class="num" style="width:30px">अ.नं.</th><th>अधिकारी</th><th>कर्तव्य वाटप</th></tr></thead>
        <tbody>
        ${rows.map((o) => `<tr><td class="num">${toMr(String(o.rowNo))}</td><td>${disp(o.officerText)}</td><td>${disp(o.dutyText)}</td></tr>`).join("\n        ")}
        </tbody>
      </table>
    </div>`;

  const scanBody = doc.scanSchedule.map((s) =>
    `<tr><th class="win num">${toMr(hhmm(s.startTime))} ते ${toMr(hhmm(s.endTime))}</th><td>${s.location ? disp(s.location.nameMr) : ""}</td><td>${s.person ? personLine(s.person) : ""}</td></tr>`)
    .join("\n        ");

  const hazari = doc.assignments.filter((a) => a.dutyCode === "OFFICE_HAZARI_MASTER" && a.person).map((a) => personLine(a.person!));
  const signoff = `<div class="signoff">
    <div class="sig">तक्ता तयार करणारे हजेरी लेखनिक:<br>${hazari.map((p) => `<b>${p}</b>`).join(" / ") || "<b>—</b>"}</div>
    <div class="sig">तपासणी अधिकारी (प्रभारी):<br>${srpi ? `<b>${h(srpi.nameMr)}</b> · वरिष्ठ पोलीस निरीक्षक` : "<b>—</b>"}</div>
    <div class="sig">ठाणे शिक्का व दैनिक डायरी नोंद:<br>ठाणे दैनंदिनी नोंद क्र. ____ / ${toMr(doc.chartDate.slice(0, 4))}</div>
  </div>`;

  const page5 = page("", doc, `  <div class="sec"><h2>पोलीस अधिकारी कर्तव्य सारांश</h2></div>
  <div class="two">
    ${officerTable(doc.officerSummary.slice(0, offHalf))}
    ${officerTable(doc.officerSummary.slice(offHalf))}
  </div>

  <div class="sec" style="margin-top:10px;"><h2>सुरक्षित नाशिक: गस्त व स्कॅनिंग वेळापत्रक</h2></div>
  <div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th class="num">वेळ</th><th>स्कॅन चौकी हद्द</th><th>नियुक्त अंमलदार</th></tr></thead>
      <tbody>
        ${scanBody}
      </tbody>
    </table>
  </div>

  ${signoff}`);

  const html = `<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>पंचवटी दैनिक कर्तव्य तक्ता — ${doc.chartDate}</title>
<link rel="stylesheet" href="__CSS_HREF__">
</head>
<body>

<div class="toolbar no-print">
  <span class="tt">पंचवटी दैनिक कर्तव्य तक्ता<small>· ${doc.chartDate} · ${doc.lifecycle}</small></span>
  <div style="display:inline-flex; align-items:center; gap:8px; margin-left:12px;">
    <a href="/charts/2026-09-09" style="color:#9ca3af; text-decoration:none; padding:3px 6px; border:1px solid #374151; border-radius:3px;">◀ ९ सप्टें</a>
    <span style="font-weight:700; color:#fff;">${toMr(doc.chartDate.split("-")[2])} ${MONTHS_MR[Number(doc.chartDate.split("-")[1]) - 1]}</span>
    <a href="/charts/2026-09-11" style="color:#9ca3af; text-decoration:none; padding:3px 6px; border:1px solid #374151; border-radius:3px;">११ सप्टें ▶</a>
  </div>
  <span class="sp"></span>
  <button id="mode-btn" onclick="toggleMode()">✏️ संपादन (Edit Mode)</button>
  ${doc.lifecycle === "DRAFT" ? `<button id="finalize-btn" class="print" style="background:#15803d; border-color:#15803d;" onclick="finalizeChart('${doc.chartDate}')">✅ अंतिम करा (Finalize)</button>` : `<span class="lc lc-finalized">FINALIZED</span>`}
  <button class="print" onclick="window.print()">🖨 प्रिंट / PDF (A4)</button>
</div>

<div id="staff-flyer" class="flyer-overlay no-print" style="display:none;" onclick="if(event.target===this)closeFlyer()">
  <div class="flyer-card">
    <div class="flyer-header">
      <h3 id="flyer-title">कर्मचारी नेमणूक (Staff Allocation)</h3>
      <button class="flyer-close" onclick="closeFlyer()">✕</button>
    </div>
    <div class="flyer-body">
      <div id="flyer-target-info" style="font-size:12px; font-weight:700; color:#1e293b; padding-bottom:6px; border-bottom:1px solid #e2e8f0;"></div>
      
      <div class="flyer-opt" onclick="flyerEditDetails()">
        <h4>[१] सध्याच्या कर्मचाऱ्याची माहिती बदला (Edit Master)</h4>
        <p>नाव, हुद्दा, बकल नंबर किंवा संपर्क माहिती संपादित करा</p>
      </div>

      <div class="flyer-opt" style="cursor:default;">
        <h4>[२] हजर कर्मचारी निवडा (Select Existing Staff)</h4>
        <p>२00+ कर्मचाऱ्यांच्या रोस्टरमधून शोधा</p>
        <input type="text" id="flyer-search" class="flyer-search" placeholder="🔍 नाव, बकल नंबर किंवा हुद्दा शोधा..." oninput="filterStaff(this.value)">
        <div id="flyer-roster" class="flyer-list">
          <div style="padding:10px; text-align:center; color:#94a3b8; font-size:11px;">शोधण्यासाठी टाईप करा...</div>
        </div>
      </div>

      <div class="flyer-opt" style="cursor:default;">
        <h4>[३] ➕ नवीन कर्मचारी जोडा (Add New Staff)</h4>
        <p>मास्टर रोस्टरमध्ये नवीन नोंद करून तात्काळ नियुक्त करा</p>
        <div class="flyer-mini-form">
          <input type="text" id="new-name-mr" placeholder="पूर्ण नाव मराठीत (उदा. पोशि ४५२ पवार)">
          <select id="new-rank">
            <option value="PC">पोलीस शिपाई (PC / पोशि)</option>
            <option value="HC">पोलीस हवालदार (HC / पोहवा)</option>
            <option value="PN">पोलीस नाईक (PN / पोना)</option>
            <option value="ASI">सहाय्यक पोलीस उपनिरीक्षक (ASI / सपोउनि)</option>
            <option value="PSI">पोलीस उपनिरीक्षक (PSI / पोउनि)</option>
            <option value="API">सहाय्यक पोलीस निरीक्षक (API / सपोनि)</option>
            <option value="PI">पोलीस निरीक्षक (PI / पोनि)</option>
          </select>
          <input type="text" id="new-buckle" placeholder="बकल नंबर (ऐच्छिक)">
          <button type="button" class="flyer-btn-submit" onclick="submitNewStaff()">सेव्ह व नियुक्त करा</button>
        </div>
      </div>
    </div>
  </div>
</div>

${page1}

${page2}

${page3}

${page4}

${page5}

<script>
let currentTargetEl = null;
let allStaff = [];

function toggleMode() {
  document.body.classList.toggle('mode-edit');
  const isEdit = document.body.classList.contains('mode-edit');
  const btn = document.getElementById('mode-btn');
  if (isEdit) {
    btn.innerHTML = '👁 पूर्वावलोकन (Preview Mode)';
    btn.classList.add('on');
    attachSlotListeners();
  } else {
    btn.innerHTML = '✏️ संपादन (Edit Mode)';
    btn.classList.remove('on');
    closeFlyer();
  }
}

function attachSlotListeners() {
  document.querySelectorAll('.dt td, .p .n').forEach(el => {
    if (!el.dataset.hasFlyer) {
      el.dataset.hasFlyer = 'true';
      el.addEventListener('click', (e) => {
        if (!document.body.classList.contains('mode-edit')) return;
        openFlyer(el);
      });
    }
  });
}

async function openFlyer(el) {
  currentTargetEl = el;
  const text = el.innerText.trim();
  document.getElementById('flyer-target-info').innerText = 'निवडलेले पद: ' + (text || '[रिक्त जागा]');
  document.getElementById('staff-flyer').style.display = 'flex';
  if (allStaff.length === 0) {
    try {
      const res = await fetch('/api/masters');
      if (res.ok) {
        const data = await res.json();
        allStaff = data.staff || [];
      }
    } catch (e) {
      console.warn('Could not load master staff:', e);
    }
  }
  filterStaff('');
}

function closeFlyer() {
  document.getElementById('staff-flyer').style.display = 'none';
  currentTargetEl = null;
}

function filterStaff(q) {
  const container = document.getElementById('flyer-roster');
  if (!allStaff.length) {
    container.innerHTML = '<div style="padding:10px; color:#94a3b8; font-size:11px;">मास्टर डेटा उपलब्ध नाही</div>';
    return;
  }
  const query = q.trim().toLowerCase();
  const matched = allStaff.filter(s => 
    !query || 
    (s.name_mr && s.name_mr.includes(query)) ||
    (s.name_en && s.name_en.toLowerCase().includes(query)) ||
    (s.buckle_no && String(s.buckle_no).includes(query)) ||
    (s.rank_code && s.rank_code.toLowerCase().includes(query))
  ).slice(0, 30);

  if (!matched.length) {
    container.innerHTML = '<div style="padding:8px; color:#94a3b8; font-size:11px;">कोणताही कर्मचारी सापडला नाही</div>';
    return;
  }
  container.innerHTML = matched.map(s => {
    const buckle = s.buckle_no ? ' ' + s.buckle_no : '';
    const label = (s.rank_code || '') + buckle + ' ' + (s.name_mr || '');
    return '<div class="flyer-item" onclick="selectStaff(\\'' + label.replace(/'/g, "\\\\'") + '\\')">' + label + '</div>';
  }).join('');
}

function selectStaff(label) {
  if (currentTargetEl) {
    currentTargetEl.innerText = label;
  }
  closeFlyer();
}

function flyerEditDetails() {
  if (!currentTargetEl) return;
  const current = currentTargetEl.innerText.trim();
  const next = prompt('कर्मचारी नाव / पद संपादित करा:', current);
  if (next !== null && next.trim() !== '') {
    currentTargetEl.innerText = next.trim();
  }
  closeFlyer();
}

async function submitNewStaff() {
  const nameMr = document.getElementById('new-name-mr').value.trim();
  const rank = document.getElementById('new-rank').value;
  const buckle = document.getElementById('new-buckle').value.trim();
  if (!nameMr) {
    alert('कृपया पूर्ण नाव प्रविष्ट करा');
    return;
  }
  try {
    const res = await fetch('/api/masters/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_mr: nameMr, rank_code: rank, buckle_no: buckle || undefined })
    });
    if (res.ok) {
      const label = rank + (buckle ? ' ' + buckle : '') + ' ' + nameMr;
      if (currentTargetEl) currentTargetEl.innerText = label;
      closeFlyer();
    } else {
      const err = await res.json();
      alert('त्रुटी: ' + (err.error || 'नोंदणी अयशस्वी'));
    }
  } catch (e) {
    alert('नेटवर्क त्रुटी: ' + e.message);
  }
}

async function finalizeChart(date) {
  if (!confirm(date + ' चा कर्तव्य तक्ता अंतिम (Finalize) करायचा का? हा तक्ता नंतर वाचनीय (Read-only) होईल.')) return;
  try {
    const res = await fetch('/api/charts/' + date + '/finalize', { method: 'POST' });
    if (res.ok) {
      alert('तक्ता यशस्वीरीत्या अंतिम करण्यात आला!');
      location.reload();
    } else {
      const err = await res.json();
      alert('त्रुटी: ' + (err.error || 'अंतिम करणे अयशस्वी'));
    }
  } catch (e) {
    alert('त्रुटी: ' + e.message);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeFlyer();
});
</script>
</body>
</html>`;

  return { html, stats };
}
