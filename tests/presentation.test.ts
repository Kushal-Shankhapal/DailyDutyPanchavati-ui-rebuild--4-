// Purpose: focused contracts for chart-local presentation controls.
// Current role: verifies safe resolution/persistence and lifecycle rejection.
// Last meaningful change: 2026-10-13 — initial alignment/visibility/compact slice.
// Constraint: transactions always roll back; seeded chart remains the test baseline.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { getSnapshot, projectChart } from "../server/chart-document.js";
import { finalizeChart } from "../server/finalize.js";
import { renderChart } from "../server/render/chart-html.js";
import {
  mergePresentationPatch, resolvePresentation, validatePresentationPatch,
} from "../server/chart-presentation.js";
import { patchChartPresentation, registerChartPresentationRoute } from "../server/presentation.js";

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

describe("presentation override validation and resolution", () => {
  it("accepts only the enumerated presentation fields and values", () => {
    expect(validatePresentationPatch({
      key: "support.srpi.rtpc", horizontalAlign: "center", verticalAlign: "middle",
      hidden: true, compact: false,
    })).toMatchObject({ key: "support.srpi.rtpc", hidden: true });
    expect(() => validatePresentationPatch({ key: "x", horizontalAlign: "justify" })).toThrow(/horizontalAlign/);
    expect(() => validatePresentationPatch({ key: "x", verticalAlign: "baseline" })).toThrow(/verticalAlign/);
    expect(() => validatePresentationPatch({ key: "x", compact: "yes" })).toThrow(/compact/);
    expect(() => validatePresentationPatch({ key: "x", color: "red" })).toThrow(/only key/);
    expect(() => validatePresentationPatch({ key: "x", text: "<script>" })).toThrow(/only key/);
    expect(() => validatePresentationPatch({ key: "x", horizontalAlign: "left", extra: "onclick" })).toThrow(/only key/);
    for (const invalid of [null, [], {}, { key: "x" }, { key: "__proto__", hidden: true },
      { key: "x", hidden: "true" }, { key: "x", horizontalAlign: "<img onerror=alert()>" },
      { key: "x", style: { color: "red" }, compact: true }]) {
      expect(() => validatePresentationPatch(invalid)).toThrow();
    }
  });

  it("merges one element without clobbering labels/other elements and supports clears", () => {
    const base = {
      labels: { "sec.matrix": "मॅट्रिक्स" },
      elements: { "sec.matrix": { hidden: false, compact: true }, "support.srpi.rtpc": { hidden: true } },
    };
    const merged = mergePresentationPatch(base, validatePresentationPatch({
      key: "sec.matrix", horizontalAlign: "right", hidden: null,
    }));
    expect(merged.labels).toEqual(base.labels);
    expect(merged.elements).toEqual({
      "sec.matrix": { compact: true, horizontalAlign: "right" },
      "support.srpi.rtpc": { hidden: true },
    });
  });

  it("resolves explicit chart values over layout values and ignores unsafe stored values", async () => {
    const doc = await projectChart(pool, chartId);
    doc.template.layout.elements = {
      "sec.matrix": { horizontalAlign: "left", verticalAlign: "top", compact: false },
      "support.srpi.rtpc": { hidden: false },
    };
    doc.template.overrides.elements = {
      "sec.matrix": { horizontalAlign: "center", hidden: true, color: "red", css: "body{}" },
    };
    expect(resolvePresentation(doc, "sec.matrix")).toEqual({
      horizontalAlign: "center", verticalAlign: "top", hidden: true, compact: false,
    });
    expect(resolvePresentation(doc, "support.srpi.rtpc")).toEqual({ hidden: false });
    const rendered = renderChart(doc);
    expect(rendered.html).toContain('data-presentation="sec.matrix"');
    expect(rendered.html).toContain('data-horizontal-align="center"');
    expect(rendered.html).toContain('data-presentation-hidden="true"');
    expect(rendered.html).not.toContain('data-css=');
    expect(rendered.presentationElements.some((e) => e.key === "support.srpi.operator" && e.empty)).toBe(true);
  });
});

describe("presentation override persistence and lifecycle", () => {
  it("persists a narrow element patch and leaves assignment/source data unchanged", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const originalDoc = await projectChart(client, chartId);
      const before = (await client.query(
        `SELECT (SELECT count(*)::int FROM daily_assignments WHERE chart_id=$1) AS count,
                presentation_overrides FROM daily_charts WHERE chart_id=$1`, [chartId])).rows[0];
      const result = await patchChartPresentation(client, "2026-09-10", {
        key: "support.srpi.rtpc", hidden: true, compact: true,
      });
      expect(result.presentation).toEqual({ hidden: true, compact: true });
      const after = (await client.query(
        `SELECT (SELECT count(*)::int FROM daily_assignments WHERE chart_id=$1) AS count,
                presentation_overrides FROM daily_charts WHERE chart_id=$1`, [chartId])).rows[0];
      expect(after.count).toBe(before.count);
      expect(after.presentation_overrides.elements["support.srpi.rtpc"]).toEqual({ hidden: true, compact: true });
      const doc = await projectChart(client, chartId);
      expect(doc.assignments).toEqual(originalDoc.assignments);
      expect(doc.availability).toEqual(originalDoc.availability);
      expect(doc.locationStates).toEqual(originalDoc.locationStates);
      expect(doc.notices).toEqual(originalDoc.notices);
      const html = renderChart(doc).html;
      expect(html).toContain('data-presentation="support.srpi.rtpc"');
      expect(html).toContain('data-presentation-hidden="true"');
      const finalized = await finalizeChart(client, chartId);
      const finalizedElements = finalized.document.template.overrides.elements as Record<string, unknown>;
      expect(finalizedElements["support.srpi.rtpc"])
        .toEqual({ hidden: true, compact: true });
      const snapshotElements = (await getSnapshot(client, chartId)).document.template.overrides.elements as Record<string, unknown>;
      expect(snapshotElements["support.srpi.rtpc"])
        .toEqual({ hidden: true, compact: true });
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });

  it("rejects FINALIZED charts before writing presentation_overrides", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await finalizeChart(client, chartId);
      await expect(patchChartPresentation(client, "2026-09-10", {
        key: "sec.matrix", hidden: true,
      })).rejects.toMatchObject({ statusCode: 409 });
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });

  it("returns HTTP validation/lookup errors and FINALIZED 409 without changing the snapshot", async () => {
    const client = await pool.connect();
    const app = Fastify();
    try {
      await client.query("BEGIN");
      registerChartPresentationRoute(app, client);
      const patch = (date: string, payload: unknown) => app.inject({
        method: "PATCH", url: `/api/charts/${date}/presentation`, payload: payload as object,
      });
      expect((await patch("2026-09-10", { key: "head.h2", horizontalAlign: "justify" })).statusCode).toBe(400);
      expect((await patch("2026-02-30", { key: "head.h2", hidden: true })).statusCode).toBe(400);
      expect((await patch("2099-12-30", { key: "head.h2", hidden: true })).statusCode).toBe(404);
      expect((await patch("2026-09-10", { key: "head.h3", hidden: true })).statusCode).toBe(400);
      const valid = await patch("2026-09-10", { key: "head.h2", horizontalAlign: "right", verticalAlign: "middle" });
      expect(valid.statusCode).toBe(200);
      expect(valid.json().presentation).toEqual({ horizontalAlign: "right", verticalAlign: "middle" });
      // Reset-one-property is a narrow merge, then clearing all properties removes the entry.
      expect((await patch("2026-09-10", { key: "head.h2", horizontalAlign: null })).json().presentation)
        .toEqual({ verticalAlign: "middle" });
      const cleared = await patch("2026-09-10", { key: "head.h2", verticalAlign: null });
      expect(cleared.json().presentation_overrides.elements?.["head.h2"]).toBeUndefined();
      const snapshot = await finalizeChart(client, chartId);
      const frozen = await patch("2026-09-10", { key: "head.h2", horizontalAlign: "left" });
      expect(frozen.statusCode).toBe(409);
      expect(frozen.json().error).toMatch(/FINALIZED.*immutable/);
      expect((await getSnapshot(client, chartId)).document).toEqual(snapshot.document);
    } finally {
      await app.close();
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
  });
});
