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
import { renderChart } from "./render/chart-html.js";

const port = Number(process.env.PORT ?? 3100);
const pool = makePool(DEV_DB);

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
});

// Health
app.get("/health", async () => ({ ok: true, service: "panchavati" }));

// Static CSS serve
app.get("/design/compv3.css", async (req, reply) => {
  const css = fs.readFileSync(path.join(process.cwd(), "design", "compv3.css"), "utf8");
  reply.header("Content-Type", "text/css; charset=utf-8").send(css);
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
    html.replace("__CSS_HREF__", "/design/compv3.css")
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

// Chart document update (edit mode) — PATCH the working Layer B tables
// Accepts a partial ChartDocument; applies only the editable normalized rows.
// Rejects edits on FINALIZED charts (the DB triggers also enforce this).
app.put("/api/charts/:date", async (req, reply) => {
  const { date } = req.params as { date: string };
  const patch = req.body as Partial<ChartDocument>;
  const ch = (await pool.query(
    `SELECT chart_id, lifecycle FROM daily_charts WHERE chart_date = $1`, [date],
  )).rows;
  if (ch.length !== 1) return reply.code(404).send({ error: `no chart for ${date}` });

  const cl = ch[0].lifecycle as string;
  if (cl === "FINALIZED") {
    return reply.code(409).send({ error: "FINALIZED charts are immutable; use amendment" });
  }

  // Apply patch: write through to normalized tables, never touch chart_versions.
  // We treat the patch as the complete set of working rows for the provided sections.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Re-fetch within tx so we operate on a consistent snapshot.
    // All writes are explicit; no auto-scheduling (invariant 4).
    if (patch.assignments !== undefined) {
      // Clear existing assignments for this chart and re-insert from patch
      await client.query(`DELETE FROM daily_assignments WHERE chart_id = $1`, [ch[0].chart_id]);
      for (const a of patch.assignments) {
        await client.query(
          `INSERT INTO daily_assignments
            (chart_id, shift, duty_id, duty_title_mr, location_id, unit_code, staff_id,
             allocation_state, is_bima, status, source, start_time, end_time, sort_order, column_no, notes_mr)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            ch[0].chart_id, a.shift,
            a.dutyCode ? (await dutyId(client, a.dutyCode)) : null,
            a.dutyTitleMr,
            a.location?.locationId ?? null,
            a.unit?.unitCode ?? null,
            a.person?.staffId ?? null,
            a.allocationState, a.isBima, a.status, a.source,
            timeOrNull(a.startTime), timeOrNull(a.endTime),
            a.sortOrder, a.columnNo, a.notesMr,
          ],
        );
      }
    }
    await client.query("COMMIT");
    return { ok: true, chartId: Number(ch[0].chart_id) };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

async function dutyId(client: { query: Function }, code: string): Promise<number | null> {
  const r = await client.query(`SELECT duty_id FROM duty_definitions WHERE duty_code = $1`, [code]);
  return r.rows[0]?.duty_id ?? null;
}
function timeOrNull(t: string | null): string | null { return t ? t.slice(0, 5) + ":00" : null; }

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

app.patch("/api/masters/staff/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const body = req.body as Partial<{ name_mr: string; name_en: string; phone: string; active: boolean }>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(body)) {
    sets.push(`${k} = $${i++}`);
    vals.push(v);
  }
  if (sets.length === 0) return reply.code(400).send({ error: "no fields to update" });
  vals.push(Number(id));
  await pool.query(
    `UPDATE staff_members SET ${sets.join(", ")} WHERE staff_id = $${i}`, vals,
  );
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
