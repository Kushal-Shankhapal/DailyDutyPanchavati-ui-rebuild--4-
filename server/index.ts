// Purpose: Fastify 5 server entry point — REST API over the existing Kysely/pg layer.
// Current role: P1 server layer — exposes chart CRUD, lifecycle, copy-previous, masters CRUD.
// Last meaningful change: 2026-10-13 — narrow chart presentation route and stylesheet.
// Constraint/dependency: AGENTS.md hard rules; all mutations go through domain functions
//   that enforce invariants; no police data leaves the machine.
import Fastify from "fastify";
import cors from "@fastify/cors";
import fs from "node:fs";
import path from "node:path";
import { makePool, DEV_DB } from "./db.js";
import { projectChart, getSnapshot, weekdayMr, type ChartDocument } from "./chart-document.js";
import { finalizeChart, reopenForAmendment } from "./finalize.js";
import { reassignSlot, addChowkiBlock, addOfficerBox, removeChowkiBlock, removeOfficerBox, addSupportSeat, removeSupportSeat } from "./assignments.js";
import { renderChart } from "./render/chart-html.js";
import { registerChartPresentationRoute } from "./presentation.js";
import { registerStructureRoutes } from "./structure.js";
import { registerNoticeRoutes } from "./notices.js";

// PORT may be present-but-empty in some shells (Number("")===0 → random port);
// fall back to the documented 3100 unless a real port number is provided.
const port = Number(process.env.PORT) || 3100;
// Local default is loopback — the duty chart is not reachable from the LAN. A demo deployment
// sets HOST=0.0.0.0 because the platform proxies into the container from outside.
const host = process.env.HOST || "127.0.0.1";
const pool = makePool(DEV_DB);

// Logging (user question 2026-10-13: “Whenever I npm run dev … this outputs, is this normal?”).
// It IS normal pino output — Fastify logs every request at `info` — but it is noise for normal
// work, so the default dev experience is now CALM: one startup banner and no per-request lines.
// Level `warn` is what does that (request lines are `info`), so `LOG_LEVEL=info npm run dev`
// brings the full request stream back and `LOG_LEVEL=silent` mutes pino entirely. Real problems
// (errors, warnings) always print.
const LOG_LEVEL = process.env.LOG_LEVEL ?? "warn";
const app = Fastify({ logger: LOG_LEVEL === "silent" ? false : { level: LOG_LEVEL } });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
});

// Health
app.get("/health", async () => ({ ok: true, service: "panchavati" }));

// The browser asks for /favicon.ico on every page load; without a route it is a 404 in the log
// (and in the console). It is the same emblem the header uses, so serve that.
app.get("/favicon.ico", async (_req, reply) => {
  const abs = path.join(process.cwd(), "web", "assets", "Police_Logo.png");
  if (!fs.existsSync(abs)) return reply.code(204).send();
  return reply.header("Content-Type", "image/png").send(fs.readFileSync(abs));
});

// Static assets: frozen visual baseline (design/) + authoring layer (web/).
// Browser code lives in web/ — server/ stays fetch-free (local-only static scan, invariant tests).
const serveFile = (relPath: string, contentType: string) => async (_req: unknown, reply: { header: (k: string, v: string) => { send: (b: string) => unknown } }) => {
  const abs = path.join(process.cwd(), relPath);
  if (!fs.existsSync(abs)) return reply.header("Content-Type", "text/plain").send("not found");
  return reply.header("Content-Type", contentType).send(fs.readFileSync(abs, "utf8"));
};
app.get("/design/compv3.css", serveFile(path.join("design", "compv3.css"), "text/css; charset=utf-8"));
// The frozen visual baseline itself, served read-only so the chart can be reviewed side by side
// against the mock it must match (same origin → the mock's relative compv3.css link resolves).
app.get("/design/panchavati-compv3.html", serveFile(path.join("design", "panchavati-compv3.html"), "text/html; charset=utf-8"));

// Legacy reference chart (user request 2026-10-13): the real legacy six-page chart lives in
// Kushal's repo, which is a SEPARATE app — its own DB (panchavati_dev), its own API shape and its
// own React views (Page1View…Page6View.tsx). It is therefore NOT proxied through this server
// (root-absolute assets + different /api contract would render a broken shell). The header entry
// opens it directly at http://localhost:3100/charts/<date>; `npm run legacy:start` starts it, and
// the browser page probes reachability before embedding it. Nothing here imports that app's code.
// The browser keeps a SAME-ORIGIN url (/legacy/<date>) and this redirect is the only place that
// knows the other app's origin — the client-side invariant "no absolute URLs" stays intact.
// The reference app's origin is CONFIGURATION, never a hardcode: locally it is the supervised
// process on :3101 (`npm run legacy:start`, or the second service in `npm run demo`); on a deployed
// demo the legacy chart is its OWN service, so its public origin comes from LEGACY_URL and the
// redirect below follows it. No other file knows that origin, and the browser keeps a same-origin
// /legacy/<date> URL (client stays free of absolute URLs — local-only invariant).
// A deployment that has no reference app sets LEGACY_URL=none (or leaves it empty) and the entry
// answers an honest 404 instead of a dead link to a laptop's localhost (see render.yaml/docs/DEPLOY.md).
const legacyOrigin = (value: string | undefined, port: string): string | null => {
  if (value === undefined) return `http://localhost:${port}`;
  const trimmed = value.trim().replace(/\/$/, "");
  return trimmed === "" || trimmed.toLowerCase() === "none" ? null : trimmed;
};
const LEGACY_URL = legacyOrigin(process.env.LEGACY_URL, process.env.LEGACY_PORT || "3101");
const LEGACY_URL_2 = legacyOrigin(process.env.LEGACY_URL_2, process.env.LEGACY2_PORT || "3102");
const legacyRedirect = (base: string | null) => async (req: { params: unknown }, reply: {
  code: (n: number) => { send: (b: unknown) => unknown }; redirect: (u: string) => unknown;
}) => {
  const { date } = req.params as { date: string };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.code(400).send({ error: "bad date" });
  if (!base) {
    return reply.code(404).send({
      error: "संदर्भ तक्ता या डिप्लॉयमध्ये उपलब्ध नाही",
      hint: "legacy reference chart is a separate app — set LEGACY_URL to its origin (docs/DEPLOY.md)",
    });
  }
  return reply.redirect(`${base}/charts/${date}`);
};
app.get("/legacy/:date", legacyRedirect(LEGACY_URL));
// Second reference app (the other six-page build) — both can run side by side for comparison.
app.get("/legacy2/:date", legacyRedirect(LEGACY_URL_2));
app.get("/authoring.css", serveFile(path.join("web", "authoring.css"), "text/css; charset=utf-8"));
// Offline transliteration engine for the bilingual fields (Sanscript 1.3.3, MIT). It is served from
// this repo's own dependency tree — no CDN, no network call at runtime, so no chart data and no
// name ever leaves the machine (AGENTS.md). One copy, pinned by package.json + lockfile.
app.get("/vendor/sanscript.js", serveFile(
  path.join("node_modules", "@indic-transliteration", "sanscript", "sanscript.js"),
  "application/javascript; charset=utf-8",
));
app.get("/chart-presentation.css", serveFile(path.join("web", "chart-presentation.css"), "text/css; charset=utf-8"));
app.get("/chart-authoring.js", serveFile(path.join("web", "chart-authoring.js"), "text/javascript; charset=utf-8"));
// Maharashtra Police emblem for the app header — binary, so it cannot go through serveFile
// (which reads text). Local file only; nothing is fetched from the network.
app.get("/assets/police-logo.png", async (_req, reply) => {
  const abs = path.join(process.cwd(), "web", "assets", "Police_Logo.png");
  if (!fs.existsSync(abs)) return reply.code(404).send("not found");
  return reply.header("Content-Type", "image/png").header("Cache-Control", "no-cache").send(fs.readFileSync(abs));
});

// The verified server-rendered chart is the single active chart surface for now.
// React remains a future refactor surface, but must not create a second lossy projection.
app.get("/app", async (_req, reply) => reply.redirect("/charts/2026-09-10"));
app.get("/app/charts/:date", async (req, reply) => {
  const { date } = req.params as { date: string };
  return reply.redirect(`/charts/${date}`);
});

// Chart dates available for the header's date selector (the month grid the clerk jumps between).
app.get("/api/charts", async () => {
  // chart_date::text — pg maps a DATE column to a JS Date, and String(Date) is "Thu Sep 10 …",
  // so the cast keeps the ISO day the client expects.
  const rows = (await pool.query(
    `SELECT chart_date::text AS chart_date, lifecycle FROM daily_charts ORDER BY chart_date DESC`)).rows;
  return rows.map((r) => ({
    date: r.chart_date as string,
    lifecycle: r.lifecycle as string,
  }));
});

// Root redirects to today's baseline chart (10 Sept 2026)
app.get("/", async (req, reply) => {
  reply.redirect("/charts/2026-09-10");
});

// Live ChartBoard View (HTML screen + print preview & edit shell)
app.get("/charts/:date", async (req, reply) => {
  const { date } = req.params as { date: string };
  const rows = await pool.query(
    `SELECT chart_id, lifecycle FROM daily_charts WHERE chart_date = $1`, [date],
  );
  if (rows.rows.length !== 1) return reply.code(404).send(`<h3>No chart found for ${date}</h3>`);

  const { chart_id, lifecycle } = rows.rows[0];
  let doc: ChartDocument;
  if (lifecycle === "FINALIZED") {
    doc = (await getSnapshot(pool, chart_id)).document;
  } else {
    doc = await projectChart(pool, chart_id);
  }
  const { html } = renderChart(doc);
  reply.header("Content-Type", "text/html; charset=utf-8").send(
    html
      .replace("__CSS_HREF__", "/design/compv3.css")
      .replace("__AUTH_CSS_HREF__", "/authoring.css")
      .replace("__PRESENTATION_CSS_HREF__", "/chart-presentation.css")
      .replace("__VENDOR_JS_SRC__", "/vendor/sanscript.js")
      .replace("__AUTH_JS_SRC__", "/chart-authoring.js")
  );
});


// Resolve a chart by date (today's view)
app.get("/api/charts/:date", async (req, reply) => {
  const { date } = req.params as { date: string };
  const rows = await pool.query(
    `SELECT chart_id, lifecycle, template_version_id FROM daily_charts WHERE chart_date = $1`, [date],
  );
  if (rows.rows.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const { chart_id, lifecycle } = rows.rows[0];
  let doc: ChartDocument;
  if (lifecycle === "FINALIZED") {
    doc = (await getSnapshot(pool, chart_id)).document;
  } else {
    doc = await projectChart(pool, chart_id);
  }
  if (doc.weekdayMr !== weekdayMr(doc.chartDate)) throw new Error("weekday mismatch (D-rule)");
  return doc;
});

// Narrow slot mutation (edit mode): reassign ONE staff slot through the domain layer.
// Deliberately NOT a full-document write — a single-slot edit must never be able to
// erase unrelated assignment rows (handoff §6). FINALIZED → 409 (also DB-enforced).
app.patch("/api/charts/:date/assignments/:id", async (req, reply) => {
  const { date, id } = req.params as { date: string; id: string };
  const body = (req.body ?? {}) as { staffId?: number | null; isBima?: boolean };
  if (!("staffId" in body)) return reply.code(400).send({ error: "staffId is required (null = रिक्त)" });
  const staffId = body.staffId === null ? null : Number(body.staffId);
  if (staffId != null && !Number.isFinite(staffId)) return reply.code(400).send({ error: "staffId must be a number or null" });

  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date])).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await reassignSlot(client, {
      chartId: Number(ch[0].chart_id),
      assignmentId: Number(id),
      staffId,
      isBima: typeof body.isBima === "boolean" ? body.isBima : undefined,
    });
    await client.query("COMMIT");
    return res;
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = (e as Error).message;
    if (/immutable|no chart|no assignment|does not belong|no staff|inactive/.test(msg)) {
      return reply.code(/immutable/.test(msg) ? 409 : 400).send({ error: msg });
    }
    throw e;
  } finally {
    client.release();
  }
});

// Add a chowki/marshal block (edit-mode `+ चौकी जोडा`) — Layer-A location + Layer-B rows
// created together in one transaction; starts with रिक्त seats only (no invented persons).
app.post("/api/charts/:date/chowki", async (req, reply) => {
  const { date } = req.params as { date: string };
  const body = (req.body ?? {}) as { locationId?: number; nameMr?: string; kind?: string };
  if (body.locationId == null && !body.nameMr) {
    return reply.code(400).send({ error: "locationId or nameMr is required" });
  }
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date])).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await addChowkiBlock(client, {
      chartId: Number(ch[0].chart_id),
      locationId: body.locationId != null ? Number(body.locationId) : undefined,
      nameMr: body.nameMr,
      kind: body.kind,
    });
    await client.query("COMMIT");
    return reply.code(201).send(res);
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = (e as Error).message;
    if (/immutable|already|kind|location|nameMr|no chart/.test(msg)) {
      return reply.code(/immutable|already/.test(msg) ? 409 : 400).send({ error: msg });
    }
    throw e;
  } finally {
    client.release();
  }
});

// Rename a chart-local display name (edit-mode rename popover) — TABLE / SECTION / COLUMN /
// LEFT-ROW titles only. Lives in presentation_overrides (labels = this element,
// labelsAll = everywhere the same default name appears), so it snapshots with the chart at
// FINALIZE and never touches masters, duties, people or any other chart. Blank text clears
// the override (back to the default name). FINALIZED → 409, exactly like the slot PATCH.
app.patch("/api/charts/:date/labels", async (req, reply) => {
  const { date } = req.params as { date: string };
  const body = (req.body ?? {}) as { scope?: string; key?: string; defaultText?: string; text?: string };
  const scope = body.scope;
  const key = String(body.key ?? "").trim();
  const defaultText = String(body.defaultText ?? "").trim();
  const text = String(body.text ?? "").trim();
  if (scope !== "element" && scope !== "all") {
    return reply.code(400).send({ error: "scope must be element or all" });
  }
  if (scope === "element" && !key) return reply.code(400).send({ error: "key is required for scope=element" });
  if (scope === "all" && !defaultText) return reply.code(400).send({ error: "defaultText is required for scope=all" });
  if ([key, defaultText, text].some((s) => s.length > 160)) {
    return reply.code(400).send({ error: "name too long (max 160 characters)" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ch = (await client.query(
      `SELECT chart_id, lifecycle, presentation_overrides FROM daily_charts WHERE chart_date = $1 FOR UPDATE`, [date])).rows;
    if (ch.length !== 1) {
      await client.query("ROLLBACK");
      return reply.code(404).send({ error: `no chart for ${date}` });
    }
    if (ch[0].lifecycle === "FINALIZED") {
      await client.query("ROLLBACK");
      return reply.code(409).send({ error: "FINALIZED charts are immutable; use amendment" });
    }
    const ov = { ...((ch[0].presentation_overrides as Record<string, unknown>) ?? {}) };
    if (scope === "element") {
      const labels = { ...((ov.labels as Record<string, string>) ?? {}) };
      if (text === "") delete labels[key]; else labels[key] = text;
      ov.labels = labels;
    } else {
      const labelsAll = { ...((ov.labelsAll as Record<string, string>) ?? {}) };
      if (text === "") delete labelsAll[defaultText]; else labelsAll[defaultText] = text;
      ov.labelsAll = labelsAll;
    }
    const upd = (await client.query(
      `UPDATE daily_charts SET presentation_overrides = $1 WHERE chart_id = $2 RETURNING presentation_overrides`,
      [ov, ch[0].chart_id])).rows[0];
    await client.query("COMMIT");
    return { ok: true, presentation_overrides: upd.presentation_overrides };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

// Enumerated per-element display controls only; source rows and labels are untouched.
registerChartPresentationRoute(app, pool);
// Chart-local STRUCTURE (clerk-owned tables, matrix columns, typed values) and the author-entered
// notice lines — same narrow-write discipline: bounded operations, DRAFT only, FINALIZED → 409.
registerStructureRoutes(app, pool);
registerNoticeRoutes(app, pool);

// Add an अधिकारी box (edit-mode `+ अधिकारी बॉक्स जोडा`) — display entry in
// presentation_overrides.officerBoxes + a real रिक्त रायटर seat in the office column.
// No invented person: the clerk fills the seat through the normal slot picker.
app.post("/api/charts/:date/officer", async (req, reply) => {
  const { date } = req.params as { date: string };
  const body = (req.body ?? {}) as { labelMr?: string; titleMr?: string };
  if (!body.labelMr || !body.labelMr.trim()) {
    return reply.code(400).send({ error: "labelMr is required" });
  }
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date])).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await addOfficerBox(client, {
      chartId: Number(ch[0].chart_id),
      labelMr: body.labelMr,
      titleMr: body.titleMr,
    });
    await client.query("COMMIT");
    return reply.code(201).send(res);
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = (e as Error).message;
    if (/immutable|already|आधीच|labelMr|no chart/.test(msg)) {
      return reply.code(/immutable|already|आधीच/.test(msg) ? 409 : 400).send({ error: msg });
    }
    throw e;
  } finally {
    client.release();
  }
});

// Remove a chart block (edit-mode ✕) — the clerk's own undo for the two add controls.
// Same guards as the domain layer: FINALIZED → 409, a block that holds a person → 409,
// a chowki another block charges to → 409. Nothing but this chart's own rows is touched.
const removeErrorReply = (reply: { code: (n: number) => { send: (b: unknown) => unknown } }, msg: string) => {
  if (/immutable|कर्मचारी|चार्ज|आधीच/.test(msg)) return reply.code(409).send({ error: msg });
  if (/no officer box|चौकी नाही/.test(msg)) return reply.code(404).send({ error: msg });
  return reply.code(400).send({ error: msg });
};

app.delete("/api/charts/:date/officer/:label", async (req, reply) => {
  const { date, label } = req.params as { date: string; label: string };
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date])).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await removeOfficerBox(client, {
      chartId: Number(ch[0].chart_id),
      label: decodeURIComponent(label),
    });
    await client.query("COMMIT");
    return { ok: true, ...res };
  } catch (e) {
    await client.query("ROLLBACK");
    return removeErrorReply(reply, (e as Error).message);
  } finally {
    client.release();
  }
});

app.delete("/api/charts/:date/chowki/:locationId", async (req, reply) => {
  const { date, locationId } = req.params as { date: string; locationId: string };
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date])).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await removeChowkiBlock(client, {
      chartId: Number(ch[0].chart_id),
      locationId: Number(locationId),
    });
    await client.query("COMMIT");
    return { ok: true, ...res };
  } catch (e) {
    await client.query("ROLLBACK");
    return removeErrorReply(reply, (e as Error).message);
  } finally {
    client.release();
  }
});

// Sr-PI support seats (edit-mode `+ जागा` / ✕ inside the station-officer card). Same guards as
// the block routes: DRAFT only (enforced in the domain layer), a seat holding a person cannot be
// deleted, and a duplicate seat is refused instead of silently reused.
const supportErrorReply = (reply: { code: (n: number) => { send: (b: unknown) => unknown } }, msg: string) => {
  if (/immutable/.test(msg)) return reply.code(409).send({ error: msg });
  if (/जागा आधीच|role must|shift must|does not belong|सपोर्ट जागा/.test(msg)) {
    return reply.code(/जागा आधीच|सपोर्ट जागा/.test(msg) ? 409 : 400).send({ error: msg });
  }
  return reply.code(400).send({ error: msg });
};

app.post("/api/charts/:date/support", async (req, reply) => {
  const { date } = req.params as { date: string };
  const body = (req.body ?? {}) as { role?: string; shift?: "DAY" | "NIGHT" };
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date])).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await addSupportSeat(client, {
      chartId: Number(ch[0].chart_id), role: body.role ?? "", shift: body.shift as "DAY" | "NIGHT",
    });
    await client.query("COMMIT");
    return reply.code(201).send(res);
  } catch (e) {
    await client.query("ROLLBACK");
    return supportErrorReply(reply, (e as Error).message);
  } finally {
    client.release();
  }
});

app.delete("/api/charts/:date/support/:id", async (req, reply) => {
  const { date, id } = req.params as { date: string; id: string };
  const assignmentId = Number(id);
  if (!Number.isFinite(assignmentId) || assignmentId <= 0) {
    return reply.code(400).send({ error: "assignment id must be a number" });
  }
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date])).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await removeSupportSeat(client, { chartId: Number(ch[0].chart_id), assignmentId });
    await client.query("COMMIT");
    return { ok: true, ...res };
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = (e as Error).message;
    if (/immutable/.test(msg)) return reply.code(409).send({ error: msg });
    if (/no assignment/.test(msg)) return reply.code(404).send({ error: msg });
    return supportErrorReply(reply, msg);
  } finally {
    client.release();
  }
});

// Finalize
app.post("/api/charts/:date/finalize", async (req, reply) => {
  const { date } = req.params as { date: string };
  const ch = (await pool.query(
    `SELECT chart_id FROM daily_charts WHERE chart_date = $1`, [date],
  )).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });
  try {
    const res = await finalizeChart(pool, ch[0].chart_id);
    return { versionNo: res.versionNo };
  } catch (e) {
    const msg = (e as Error).message;
    if (/FINALIZED|only DRAFT|VALIDATED/.test(msg)) return reply.code(409).send({ error: msg });
    throw e;
  }
});

// Reopen for amendment
app.post("/api/charts/:date/reopen", async (req, reply) => {
  const { date } = req.params as { date: string };
  const ch = (await pool.query(
    `SELECT chart_id, lifecycle FROM daily_charts WHERE chart_date = $1`, [date],
  )).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });
  const cl = ch[0].lifecycle as string;
  if (cl !== "FINALIZED") return reply.code(409).send({ error: `chart is ${cl}, not FINALIZED` });
  await reopenForAmendment(pool, ch[0].chart_id);
  return { ok: true };
});

// Masters CRUD
app.get("/api/masters", async () => {
  const [ranks, staff, locations, duties, units] = await Promise.all([
    pool.query(`SELECT rank_code, name_mr, short_form_mr, cadre, display_order FROM ranks ORDER BY display_order`),
    pool.query(`SELECT staff_id, name_mr, name_en, rank_code, buckle_no, phone, active FROM staff_members ORDER BY name_mr`),
    pool.query(`SELECT location_id, location_code, name_mr, kind, display_order, active FROM locations ORDER BY display_order`),
    pool.query(`SELECT duty_id, duty_code, title_mr, section_code, location_id, display_order, active FROM duty_definitions ORDER BY display_order`),
    pool.query(`SELECT unit_code, name_mr, unit_type, display_order, active FROM units ORDER BY display_order`),
  ]);
  return {
    ranks: ranks.rows, staff: staff.rows, locations: locations.rows,
    duties: duties.rows, units: units.rows,
  };
});

// Master staff CRUD
app.post("/api/masters/staff", async (req, reply) => {
  const body = req.body as { name_mr: string; name_en?: string; rank_code: string; buckle_no?: string; phone?: string };
  if (!body.name_mr || !body.rank_code) {
    return reply.code(400).send({ error: "name_mr and rank_code are required" });
  }
  const r = await pool.query(
    `INSERT INTO staff_members (name_mr, name_en, rank_code, buckle_no, phone, active)
     VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING staff_id`,
    [body.name_mr, body.name_en ?? null, body.rank_code, body.buckle_no ?? null, body.phone ?? null],
  );
  return reply.code(201).send({ staff_id: Number(r.rows[0].staff_id) });
});

// Master staff edit — WHITELISTED columns only (request keys never reach SQL text).
// Deactivate instead of delete (invariant 12); finalized charts are unaffected (snapshots).
const STAFF_EDITABLE = new Set(["name_mr", "name_en", "buckle_no", "phone", "active"]);
app.patch("/api/masters/staff/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const body = (req.body ?? {}) as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(body)) {
    if (!STAFF_EDITABLE.has(k)) return reply.code(400).send({ error: `field not editable: ${k}` });
    sets.push(`${k} = $${i++}`);
    vals.push(v);
  }
  if (sets.length === 0) return reply.code(400).send({ error: "no fields to update" });
  vals.push(Number(id));
  const r = await pool.query(
    `UPDATE staff_members SET ${sets.join(", ")} WHERE staff_id = $${i} RETURNING staff_id`, vals,
  );
  if (r.rows.length !== 1) return reply.code(404).send({ error: `no staff ${id}` });
  return { ok: true };
});

/** One human-readable startup block instead of a stream of JSON: what is running, where, and how
 *  to stop it (user 2026-10-13, items 1 + 4 — “is this normal?” and “make sure you close every
 *  terminal or node process”). */
function banner() {
  const base = `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`;
  const date = process.env.CHART_DATE || "2026-09-10";
  const legacy = LEGACY_URL ?? "(not configured — set LEGACY_URL, docs/DEPLOY.md)";
  console.log([
    "",
    "  पंचवटी दैनिक कर्तव्य तक्ता — dev server",
    "  " + "─".repeat(64),
    `  तक्ता (chart)        ${base}/charts/${date}`,
    `  नमुना (frozen mock)  ${base}/design/panchavati-compv3.html`,
    `  API                  ${base}/api/charts`,
    `  जुना ६-पृष्ठ तक्ता    ${base}/legacy/${date}`,
    `                       ↳ ${legacy}  (start it: npm run legacy:start)`,
    `  bound to             ${host}:${port}${host === "0.0.0.0" ? "  (reachable from outside this machine — deployment mode)" : "  (loopback only)"}`,
    "  " + "─".repeat(64),
    "  both reference apps + this server:  npm run demo",
    "  per-request log lines:              LOG_LEVEL=info npm run dev",
    "  stop: Ctrl+C   ·   clean up left-over servers: npm run stop",
    "",
  ].join("\n"));
}

/** Ctrl+C must actually stop this process (and free the port) — nothing left behind. */
let closing = false;
const shutdown = async (signal: string) => {
  if (closing) return;
  closing = true;
  console.log(`\n  ${signal} — stopping the chart server …`);
  try { await app.close(); } catch { /* already closed */ }
  try { await pool.end(); } catch { /* pool already drained */ }
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

const start = async () => {
  try {
    await app.listen({ port, host });
    banner();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
