// Purpose: contracts for the chart-local structure/values layer and the notice CRUD round.
// Current role: verification for the “everything CRUDable” work unit (user 2026-10-13, item 11).
// Last meaningful change: 2026-10-13 — created with the structure/notice endpoints.
// Constraint/dependency: DB tests always roll back; the seeded 10/09 chart is the baseline.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { projectChart } from "../server/chart-document.js";
import { finalizeChart } from "../server/finalize.js";
import { renderChart } from "../server/render/chart-html.js";
import {
  applyStructureOp, applyValueEdit, StructureError, patchChartStructure, patchChartValues,
} from "../server/structure.js";
import { addNotice, registerNoticeRoutes, removeNotice, updateNotice } from "../server/notices.js";

let pool: pg.Pool;
let chartId: number;

beforeAll(async () => {
  pool = makePool(TEST_DB);
  const rows = (await pool.query(
    `SELECT chart_id FROM daily_charts WHERE chart_date = '2026-09-10'`)).rows;
  if (rows.length !== 1) throw new Error("test DB missing 10/09 chart — run npm run db:seed first");
  chartId = Number(rows[0].chart_id);
});
afterAll(async () => { await pool.end(); });

describe("structure operations (pure)", () => {
  it("adds a clerk-owned table with its headers and refuses junk", () => {
    const out = applyStructureOp({}, { op: "table.add", title: "बंदोबस्त", columns: ["तपशील", "नोद"] });
    const tables = (out.structure as { tables: { id: string; title: string; columns: string[]; rows: string[][] }[] }).tables;
    expect(tables.length).toBe(1);
    expect(tables[0].title).toBe("बंदोबस्त");
    expect(tables[0].columns).toEqual(["तपशील", "नोद"]);
    expect(tables[0].rows.length).toBe(1);           // starts as one empty row, never fake content
    expect(tables[0].id).toMatch(/^[A-Za-z0-9-]{1,40}$/);
    // the stored shape is enumerated: a title is required and markup is refused
    expect(() => applyStructureOp({}, { op: "table.add", title: "  " })).toThrow(StructureError);
    expect(() => applyStructureOp({}, { op: "table.add", title: "<script>alert(1)</script>" })).toThrow(/अवैध/);
    expect(() => applyStructureOp({}, { op: "nope" })).toThrow(/अज्ञात क्रिया/);
  });

  it("adds/edits/removes columns, rows and cells, and never mutates its input", () => {
    const start = applyStructureOp({}, { op: "table.add", title: "T", columns: ["A"] });
    const id = (start.structure as { tables: { id: string }[] }).tables[0].id;
    const withCol = applyStructureOp(start, { op: "table.col.add", id, text: "B" });
    let t = (withCol.structure as { tables: { columns: string[]; rows: string[][] }[] }).tables[0];
    expect(t.columns).toEqual(["A", "B"]);
    expect(t.rows[0]).toEqual(["", ""]);              // the new column is added to every row
    const withRow = applyStructureOp(withCol, { op: "table.row.add", id });
    t = (withRow.structure as unknown as { tables: { columns: string[]; rows: string[][] }[] }).tables[0];
    expect(t.rows.length).toBe(2);
    const withCell = applyStructureOp(withRow, { op: "table.cell", id, row: 1, col: 1, text: "पोहवा १२ बारे" });
    t = (withCell.structure as unknown as { tables: { columns: string[]; rows: string[][] }[] }).tables[0];
    expect(t.rows[1][1]).toBe("पोहवा १२ बारे");
    const noCol = applyStructureOp(withCell, { op: "table.col.remove", id, index: 0 });
    t = (noCol.structure as unknown as { tables: { columns: string[]; rows: string[][] }[] }).tables[0];
    expect(t.columns).toEqual(["B"]);
    const noRow = applyStructureOp(noCol, { op: "table.row.remove", id, index: 0 });
    expect((noRow.structure as unknown as { tables: { rows: unknown[] }[] }).tables[0].rows.length).toBe(1);
    // the ORIGINAL object is untouched (pure merge)
    expect((start.structure as unknown as { tables: { columns: string[] }[] }).tables[0].columns).toEqual(["A"]);
    // bounds and lookups are enforced
    expect(() => applyStructureOp(start, { op: "table.cell", id, row: 9, col: 0, text: "x" })).toThrow(/ओळ/);
    expect(() => applyStructureOp(start, { op: "table.col.remove", id, index: 0 })).toThrow(/शेवटचा स्तंभ/);
    expect(() => applyStructureOp(start, { op: "table.remove", id: "does-not-exist" })).toThrow(/सापडला नाही/);
    expect(() => applyStructureOp(start, { op: "table.row.add", id: "__proto__" })).toThrow(StructureError);
  });

  it("tracks matrix columns: add, hide and remove (with its typed cells)", () => {
    const added = applyStructureOp({}, { op: "matrix.column.add", label: "होमगार्ड" });
    const key = (added.structure as { matrix: { addedColumns: { key: string }[] } }).matrix.addedColumns[0].key;
    expect(key).toMatch(/^ADD_[A-Z0-9]{8}$/);
    const withCell = applyStructureOp(added, { op: "matrix.cell", key: `मंजुर|${key}`, text: "2" });
    expect((withCell.structure as { matrix: { cells: Record<string, string> } }).matrix.cells[`मंजुर|${key}`]).toBe("2");
    const hidden = applyStructureOp(withCell, { op: "matrix.column.hide", key: "LHC" });
    expect((hidden.structure as { matrix: { hiddenColumns: string[] } }).matrix.hiddenColumns).toEqual(["LHC"]);
    const removed = applyStructureOp(hidden, { op: "matrix.column.remove", key });
    const matrix = (removed.structure as { matrix: { addedColumns: unknown[]; cells?: Record<string, string> } }).matrix;
    expect(matrix.addedColumns).toEqual([]);
    expect(matrix.cells).toBeUndefined();             // its cells go with it
    expect(() => applyStructureOp({}, { op: "matrix.cell", key: "bad", text: "1" })).toThrow(/अवैध/);
  });

  it("stores author-owned values and clears them, refusing unsafe keys", () => {
    const set = applyValueEdit({}, { key: "signoff.1", text: "पोहवा १ गुंबाडे" });
    expect((set.values as Record<string, string>)["signoff.1"]).toBe("पोहवा १ गुंबाडे");
    const cleared = applyValueEdit(set, { key: "signoff.1", text: "   " });
    expect(cleared.values).toBeUndefined();
    expect(() => applyValueEdit({}, { key: "__proto__.x", text: "a" })).toThrow(/अवैध/);
    expect(() => applyValueEdit({}, { key: "a<b", text: "a" })).toThrow(/अवैध/);
  });
});

describe("structure persistence and lifecycle", () => {
  it("writes a table into presentation_overrides without touching assignments", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const before = (await client.query(
        `SELECT (SELECT count(*)::int FROM daily_assignments WHERE chart_id = $1) AS n`, [chartId])).rows[0].n;
      const overrides = await patchChartStructure(client, "2026-09-10", {
        op: "table.add", title: "चाचणी तक्ता", columns: ["तपशील"],
      }) as { structure: { tables: { id: string }[] } };
      const id = overrides.structure.tables[0].id;
      await patchChartStructure(client, "2026-09-10", { op: "table.cell", id, row: 0, col: 0, text: "नोंद" });
      await patchChartValues(client, "2026-09-10", { key: "signoff.3", text: "ठाणे शिक्का" });
      const doc = await projectChart(client, chartId);
      const html = renderChart(doc).html;
      expect(html).toContain("चाचणी तक्ता");
      expect(html).toContain("नोंद");
      expect(html).toContain('data-value-key="signoff.3"');
      expect(html).toContain("ठाणे शिक्का");
      const after = (await client.query(
        `SELECT (SELECT count(*)::int FROM daily_assignments WHERE chart_id = $1) AS n`, [chartId])).rows[0].n;
      expect(after).toBe(before);
      // ...and the no-loss ledger is unaffected by a clerk-added table (it holds no chart rows)
      const stats = renderChart(await projectChart(client, chartId)).stats;
      expect(stats.rowsRendered).toBe(stats.rowsTotal);
      // FINALIZED refuses both writers
      await finalizeChart(client, chartId);
      await expect(patchChartStructure(client, "2026-09-10", { op: "table.remove", id }))
        .rejects.toMatchObject({ statusCode: 409 });
      await expect(patchChartValues(client, "2026-09-10", { key: "signoff.3", text: "x" }))
        .rejects.toMatchObject({ statusCode: 409 });
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });
});

describe("notice CRUD (chart_notices) and its HTTP surface", () => {
  it("adds, edits, re-groups and deletes a notice line; FINALIZED answers 409", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const before = (await client.query(
        `SELECT count(*)::int AS n FROM chart_notices WHERE chart_id = $1`, [chartId])).rows[0].n;
      const { noticeId } = await addNotice(client, "2026-09-10", { text: "नवीन सूचना ओळ", group: "चाचणी गट" });
      expect((await client.query(
        `SELECT count(*)::int AS n FROM chart_notices WHERE chart_id = $1`, [chartId])).rows[0].n).toBe(before + 1);
      await updateNotice(client, "2026-09-10", noticeId, { text: "बदललेली ओळ", group: "दुसरा गट" });
      const row = (await client.query(
        `SELECT text_mr, group_key, sort_order FROM chart_notices WHERE notice_id = $1`, [noticeId])).rows[0];
      expect(row.text_mr).toBe("बदललेली ओळ");
      expect(row.group_key).toBe("दुसरा गट");
      expect(Number(row.sort_order)).toBeGreaterThan(0);
      const doc = await projectChart(client, chartId);
      const html = renderChart(doc).html;
      expect(html).toContain(`data-notice="${noticeId}"`);
      expect(html).toContain("बदललेली ओळ");
      // markup and blank text are refused
      await expect(addNotice(client, "2026-09-10", { text: "<b>x</b>" })).rejects.toThrow(/अवैध/);
      await expect(addNotice(client, "2026-09-10", { text: "   " })).rejects.toThrow(/आवश्यक/);
      await removeNotice(client, "2026-09-10", noticeId);
      expect((await client.query(
        `SELECT count(*)::int AS n FROM chart_notices WHERE chart_id = $1`, [chartId])).rows[0].n).toBe(before);
      await expect(removeNotice(client, "2026-09-10", noticeId)).rejects.toMatchObject({ statusCode: 404 });
      await finalizeChart(client, chartId);
      await expect(addNotice(client, "2026-09-10", { text: "x" }))
        .rejects.toMatchObject({ statusCode: 409 });
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });

  it("answers HTTP 400/404/201/409 through the registered routes", async () => {
    const client = await pool.connect();
    const app = Fastify();
    try {
      await client.query("BEGIN");
      registerNoticeRoutes(app, client);
      const post = (payload: unknown) => app.inject({
        method: "POST", url: "/api/charts/2026-09-10/notices", payload: payload as object,
      });
      expect((await post({ text: "" })).statusCode).toBe(400);
      expect((await app.inject({ method: "PATCH", url: "/api/charts/2026-09-10/notices/99999", payload: { text: "x" } })).statusCode).toBe(404);
      expect((await app.inject({ method: "DELETE", url: "/api/charts/2026-09-10/notices/abc" })).statusCode).toBe(400);
      const created = await post({ text: "HTTP सूचना", group: "गट" });
      expect(created.statusCode).toBe(201);
      const id = created.json().noticeId as number;
      expect((await app.inject({
        method: "PATCH", url: `/api/charts/2026-09-10/notices/${id}`, payload: { text: "बदल", group: "गट२" },
      })).statusCode).toBe(200);
      expect((await app.inject({ method: "DELETE", url: `/api/charts/2026-09-10/notices/${id}` })).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: "/api/charts/2099-01-01/notices", payload: { text: "x" } })).statusCode).toBe(404);
    } finally {
      await app.close();
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });
});
