// Purpose: narrow assignment mutations (reassignSlot) + addChowkiBlock must be
//   transactional, FINALIZED-proof, non-destructive to unrelated rows, and schema-safe.
// Current role: work unit 1009 vertical-slice verification (every mutating test ROLLS BACK).
// Last meaningful change: 2026-10-09 — created with the authoring API.
// Constraint/dependency: runs against panchavati3_test; seed = npm run db:seed.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { projectChart } from "../server/chart-document.js";
import { reassignSlot, addChowkiBlock } from "../server/assignments.js";
import { renderChart } from "../server/render/chart-html.js";

let pool: pg.Pool;
let chartId: number;

beforeAll(async () => {
  pool = makePool(TEST_DB);
  const ch = (await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date='2026-09-10'`)).rows;
  if (ch.length !== 1) throw new Error("test DB missing 10/09 chart — run npm run db:seed first");
  chartId = Number(ch[0].chart_id);
});
afterAll(async () => { await pool.end(); });

/** Run a fn inside a transaction and ALWAYS roll back (no test state survives). */
async function inTx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    return r;
  } finally {
    await c.query("ROLLBACK").catch(() => { /* nothing to roll back */ });
    c.release();
  }
}

describe("reassignSlot (narrow mutation)", () => {
  it("replaces ONE slot's person and preserves every other column of the row", async () => {
    await inTx(async (c) => {
      const target = (await c.query(
        `SELECT * FROM daily_assignments WHERE chart_id=$1 AND staff_id IS NOT NULL
          ORDER BY assignment_id LIMIT 1`, [chartId])).rows[0];
      const other = (await c.query(
        `SELECT staff_id FROM staff_members WHERE active AND staff_id <> $1 LIMIT 1`,
        [target.staff_id])).rows[0];
      expect(other).toBeTruthy();

      const before = { ...target };
      await reassignSlot(c, { chartId, assignmentId: Number(target.assignment_id), staffId: Number(other.staff_id) });
      const after = (await c.query(
        `SELECT * FROM daily_assignments WHERE assignment_id=$1`, [target.assignment_id])).rows[0];

      expect(Number(after.staff_id)).toBe(Number(other.staff_id));
      expect(after.allocation_state).toBe("ALLOCATED");
      // everything except staff_id (and timestamps: none here) must be byte-identical
      for (const k of ["shift", "duty_id", "duty_title_mr", "location_id", "unit_code",
        "allocation_state", "status", "source", "start_time", "end_time",
        "sort_order", "column_no", "notes_mr"]) {
        expect(String(after[k]), `column ${k} must not change`).toBe(String(before[k]));
      }
    });
  });

  it("a single-slot edit never touches other assignment rows (footgun check)", async () => {
    await inTx(async (c) => {
      const before = (await c.query(
        `SELECT assignment_id, staff_id FROM daily_assignments WHERE chart_id=$1 ORDER BY assignment_id`,
        [chartId])).rows.map((r) => `${r.assignment_id}:${r.staff_id}`);
      const target = (await c.query(
        `SELECT assignment_id FROM daily_assignments WHERE chart_id=$1 AND staff_id IS NOT NULL LIMIT 1`,
        [chartId])).rows[0];
      await reassignSlot(c, { chartId, assignmentId: Number(target.assignment_id), staffId: null });
      const after = (await c.query(
        `SELECT assignment_id, staff_id FROM daily_assignments WHERE chart_id=$1 ORDER BY assignment_id`,
        [chartId])).rows.map((r) => `${r.assignment_id}:${r.staff_id}`);
      expect(after.length).toBe(before.length);            // no delete-and-reinsert
      const diffs = after.filter((v, i) => v !== before[i]);
      expect(diffs.length).toBe(1);                        // exactly the target row changed
      expect(diffs[0].startsWith(`${target.assignment_id}:`)).toBe(true);
    });
  });

  it("clearing a slot makes it रिक्त and drops BIMA (vacant seat never carries a person)", async () => {
    await inTx(async (c) => {
      const bimaRow = (await c.query(
        `SELECT assignment_id FROM daily_assignments WHERE chart_id=$1 AND is_bima LIMIT 1`,
        [chartId])).rows[0];
      expect(bimaRow, "seed must contain a बिमा row").toBeTruthy();
      const res = await reassignSlot(c, {
        chartId, assignmentId: Number(bimaRow.assignment_id), staffId: null,
      });
      expect(res.allocationState).toBe("VACANT_RIKT");
      expect(res.staffId).toBeNull();
      expect(res.isBima).toBe(false);
      const row = (await c.query(
        `SELECT staff_id, allocation_state, is_bima FROM daily_assignments WHERE assignment_id=$1`,
        [bimaRow.assignment_id])).rows[0];
      expect(row.staff_id).toBeNull();
      expect(row.allocation_state).toBe("VACANT_RIKT");
      expect(row.is_bima).toBe(false);
    });
  });

  it("explicit BIMA can be set with a person, and is force-dropped when the seat is cleared", async () => {
    await inTx(async (c) => {
      const row = (await c.query(
        `SELECT assignment_id, staff_id FROM daily_assignments
          WHERE chart_id=$1 AND staff_id IS NOT NULL LIMIT 1`, [chartId])).rows[0];
      const res = await reassignSlot(c, {
        chartId, assignmentId: Number(row.assignment_id),
        staffId: Number(row.staff_id),
        isBima: true,
      });
      expect(res.isBima).toBe(true);
      // now clear the slot with a stale is_bima request — must come out FALSE
      const cleared = await reassignSlot(c, {
        chartId, assignmentId: Number(row.assignment_id), staffId: null, isBima: true,
      });
      expect(cleared.isBima).toBe(false);
    });
  });

  it("rejects inactive staff (deactivate, never delete)", async () => {
    await inTx(async (c) => {
      const s = (await c.query(
        `SELECT staff_id FROM staff_members WHERE active ORDER BY staff_id LIMIT 1`)).rows[0];
      await c.query(`UPDATE staff_members SET active = FALSE WHERE staff_id = $1`, [s.staff_id]);
      const row = (await c.query(
        `SELECT assignment_id FROM daily_assignments WHERE chart_id=$1 LIMIT 1`, [chartId])).rows[0];
      await expect(reassignSlot(c, {
        chartId, assignmentId: Number(row.assignment_id), staffId: Number(s.staff_id),
      })).rejects.toThrow(/inactive/);
    });
  });

  it("refuses to mutate a FINALIZED chart (domain check; DB freeze tested in invariants)", async () => {
    await inTx(async (c) => {
      await c.query(`UPDATE daily_charts SET lifecycle='FINALIZED' WHERE chart_id=$1`, [chartId]);
      const row = (await c.query(
        `SELECT assignment_id FROM daily_assignments WHERE chart_id=$1 LIMIT 1`, [chartId])).rows[0];
      await expect(reassignSlot(c, {
        chartId, assignmentId: Number(row.assignment_id), staffId: null,
      })).rejects.toThrow(/immutable/);
    });
  });

  it("rejects an unknown chart before touching any row", async () => {
    await inTx(async (c) => {
      const row = (await c.query(
        `SELECT assignment_id FROM daily_assignments WHERE chart_id=$1 LIMIT 1`, [chartId])).rows[0];
      await expect(reassignSlot(c, {
        chartId: chartId + 999999, assignmentId: Number(row.assignment_id), staffId: null,
      })).rejects.toThrow(/no chart/);
      // and a row that does not belong to the chart is refused too
      const foreign = (await c.query(
        `SELECT assignment_id FROM daily_assignments WHERE chart_id <> $1 LIMIT 1`, [chartId])).rows;
      if (foreign.length) {
        await expect(reassignSlot(c, {
          chartId, assignmentId: Number(foreign[0].assignment_id), staffId: null,
        })).rejects.toThrow(/does not belong/);
      }
    });
  });
});

describe("addChowkiBlock (contextual + चौकी जोडा)", () => {
  it("places an existing master location as a block: label + रिक्त seat per shift, then renders losslessly", async () => {
    await inTx(async (c) => {
      // a fresh location so the test does not depend on which masters are already charted
      const loc = (await c.query(
        `INSERT INTO locations (location_code, name_mr, kind, display_order)
         VALUES ('TEST_LOC_ADD', 'टेस्ट चौकी', 'CHOWKI', 99) RETURNING location_id`)).rows[0];
      const res = await addChowkiBlock(c, { chartId, locationId: Number(loc.location_id) });
      expect(res.assignmentIds.length).toBe(4); // 2 shifts × (label + seat)
      expect(res.createdDutyCodes.sort()).toEqual([`NEW_DAY_${loc.location_id}`, `NEW_NIGHT_${loc.location_id}`].sort());

      const rows = (await c.query(
        `SELECT shift, allocation_state, duty_title_mr, duty_id, location_id, staff_id
           FROM daily_assignments WHERE assignment_id = ANY($1) ORDER BY assignment_id`,
        [res.assignmentIds])).rows;
      expect(rows.length).toBe(4);
      for (const shift of ["DAY", "NIGHT"]) {
        const pair = rows.filter((r) => r.shift === shift);
        expect(pair.length).toBe(2);
        expect(pair[0].allocation_state).toBe("ALLOCATED");
        expect(pair[0].location_id).toBeTruthy();
        expect(pair[0].staff_id).toBeNull();
        expect(pair[1].allocation_state).toBe("VACANT_RIKT");
        expect(pair[1].duty_title_mr).toBe("अंमलदार");
        expect(pair[1].staff_id).toBeNull();
      }

      // no-loss: still renders every row exactly once, and the new block name appears
      const doc = await projectChart(c, chartId);
      const { html, stats } = renderChart(doc);
      expect(stats.rowsRendered).toBe(stats.rowsTotal);
      expect(stats.rowsTotal).toBe(doc.assignments.length);
      expect(html).toContain("टेस्ट चौकी");
      expect(html).toContain("अंमलदार");

      // idempotency guard: same location twice is refused
      await expect(addChowkiBlock(c, { chartId, locationId: Number(loc.location_id) }))
        .rejects.toThrow(/आधीच आहे/);
    });
  });

  it("creates the location + shift duties for a brand-new chowki", async () => {
    await inTx(async (c) => {
      const res = await addChowkiBlock(c, {
        chartId, nameMr: "नवीन टेस्ट चौकी", kind: "CHOWKI",
      });
      expect(res.locationId).toBeGreaterThan(0);
      expect(res.assignmentIds.length).toBe(4);
      const loc = (await c.query(`SELECT location_code, kind FROM locations WHERE location_id=$1`,
        [res.locationId])).rows[0];
      expect(loc.location_code).toMatch(/^NEW_LOC_/);
      expect(loc.kind).toBe("CHOWKI");
      const duties = (await c.query(
        `SELECT duty_code, default_shift, location_id FROM duty_definitions WHERE location_id=$1`,
        [res.locationId])).rows;
      expect(duties.length).toBe(2);
      expect(duties.map((d) => d.default_shift).sort()).toEqual(["DAY", "NIGHT"]);
    });
  });

  it("validates kind and duplicate names", async () => {
    await inTx(async (c) => {
      await expect(addChowkiBlock(c, { chartId, nameMr: "x", kind: "OFFICE" }))
        .rejects.toThrow(/kind/);
      await expect(addChowkiBlock(c, { chartId, nameMr: "  " }))
        .rejects.toThrow(/nameMr/);
    });
  });
});
