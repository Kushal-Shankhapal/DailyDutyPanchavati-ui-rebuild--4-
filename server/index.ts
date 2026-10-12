// Purpose: Fastify 5 server entry point — REST API over the existing Kysely/pg layer.
// Current role: P1 server layer — exposes chart CRUD, lifecycle, copy-previous, masters CRUD.
// Last meaningful change: 2026-10-09 — created at P1 start.
// Constraint/dependency: AGENTS.md hard rules; all mutations go through domain functions
//   that enforce invariants; no police data leaves the machine.
import Fastify from "fastify";
import cors from "@fastify/cors";
import fs from "node:fs";
import path from "node:path";
import { makePool, DEV_DB } from "./db.js";
import { projectChart, getSnapshot, weekdayMr, type ChartDocument } from "./chart-document.js";
import { finalizeChart, reopenForAmendment } from "./finalize.js";
import { reassignSlot, addChowkiBlock, addOfficerBox } from "./assignments.js";
import { renderChart } from "./render/chart-html.js";

// PORT may be present-but-empty in some shells (Number("")===0 → random port);
// fall back to the documented 3100 unless a real port number is provided.
const port = Number(process.env.PORT) || 3100;
const pool = makePool(DEV_DB);

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
});

// Health
app.get("/health", async () => ({ ok: true, service: "panchavati" }));

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
app.get("/authoring.css", serveFile(path.join("web", "authoring.css"), "text/css; charset=utf-8"));
app.get("/chart-authoring.js", serveFile(path.join("web", "chart-authoring.js"), "text/javascript; charset=utf-8"));
// Maharashtra Police emblem for the app header — binary, so it cannot go through serveFile
// (which reads text). Local file only; nothing is fetched from the network.
app.get("/assets/police-logo.png", async (_req, reply) => {
  const abs = path.join(process.cwd(), "web", "assets", "Police_Logo.png");
  if (!fs.existsSync(abs)) return reply.code(404).send("not found");
  return reply.header("Content-Type", "image/png").header("Cache-Control", "no-cache").send(fs.readFileSync(abs));
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

const start = async () => {
  try {
    await app.listen({ port, host: "127.0.0.1" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
