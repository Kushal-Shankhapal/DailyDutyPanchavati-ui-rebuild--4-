// P1 tests — ChartDocument projection + finalize snapshot (T13 hybrid model, §9/§15).
// All mutating tests run inside a transaction that is always ROLLBACKed, so the seeded
// 10/09 chart in panchavati3_test stays DRAFT and re-seedable.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { projectChart, getSnapshot, weekdayMr, resolveNode, type ChartDocument } from "../server/chart-document.js";
import { finalizeChart, reopenForAmendment } from "../server/finalize.js";

let pool: pg.Pool;
let chartId: number;
let pinnedTemplateVersionId: number;

beforeAll(async () => {
  pool = makePool(TEST_DB);
  const ch = await pool.query(`SELECT chart_id, template_version_id FROM daily_charts WHERE chart_date='2026-09-10'`);
  if (ch.rows.length !== 1) throw new Error("test DB missing 10/09 chart — run npm run db:seed first");
  chartId = ch.rows[0].chart_id;
  pinnedTemplateVersionId = Number(ch.rows[0].template_version_id); // bigint → string in pg
});
afterAll(async () => { await pool.end(); });

async function inTx(fn: (c: pg.PoolClient) => Promise<void>): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await fn(c);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    c.release();
  }
}

async function expectSqlError(c: pg.PoolClient, match: RegExp, sql: string, params: unknown[] = []) {
  await c.query("SAVEPOINT sp_expect");
  let msg = "";
  try {
    await c.query(sql, params);
  } catch (e) {
    msg = (e as Error).message;
  }
  await c.query("ROLLBACK TO SAVEPOINT sp_expect");
  expect(msg, `expected error matching ${match} for: ${sql}`).toMatch(match);
}

// ---------------------------------------------------------------------------
describe("projection fidelity (seeded 10/09 chart)", () => {
  let doc: ChartDocument;
  beforeAll(async () => { doc = await projectChart(pool, chartId); });

  it("basic facts: date, derived weekday, counts", () => {
    expect(doc.chartDate).toBe("2026-09-10");
    expect(doc.weekdayMr).toBe("गुरुवार");          // D-rule: computed, matches source वार
    expect(doc.lifecycle).toBe("DRAFT");
    expect(doc.assignments).toHaveLength(212);
    expect(doc.availability).toHaveLength(69);
    expect(doc.notices).toHaveLength(28);
    expect(doc.manpower).toHaveLength(240);
    expect(doc.officerSummary).toHaveLength(15);
    expect(doc.scanSchedule).toHaveLength(12);
    expect(doc.locationStates).toHaveLength(7);
  });

  it("reconstructs the source column stacks (Table 1/2 column identity)", () => {
    const day = doc.assignments.filter((a) => a.shift === "DAY");
    const night = doc.assignments.filter((a) => a.shift === "NIGHT");
    const countBy = (xs: typeof doc.assignments) => {
      const m = new Map<number, number>();
      for (const a of xs) m.set(a.columnNo, (m.get(a.columnNo) ?? 0) + 1);
      return Object.fromEntries([...m.entries()].sort((a, b) => a[0] - b[0]));
    };
    expect(countBy(day)).toEqual({ 1: 35, 2: 26, 3: 36, 4: 38 });
    expect(countBy(night)).toEqual({ 1: 30, 2: 28, 3: 19 }); // night col 4 = notices, not assignments
    // sortOrder is monotonic within each (shift, column) stack
    const groups = new Map<string, number[]>();
    for (const a of doc.assignments) groups.set(`${a.shift}:${a.columnNo}`,
      [...(groups.get(`${a.shift}:${a.columnNo}`) ?? []), a.sortOrder]);
    for (const orders of groups.values()) {
      expect([...orders].sort((x, y) => x - y)).toEqual(orders);
    }
  });

  it("explicit रिक्त slots: 2, person-less, with source labels", () => {
    const vacant = doc.assignments.filter((a) => a.allocationState === "VACANT_RIKT");
    expect(vacant).toHaveLength(2);
    expect(vacant.every((a) => a.person === null)).toBe(true);
    const titles = vacant.map((a) => a.dutyTitleMr);
    expect(titles).toContain("पोनि.तपास॰रायटर");
    expect(titles).toContain("नगदी कारकुन");
  });

  it("explicit बिमा: 10, every one an actual person with resolved master values", () => {
    const bima = doc.assignments.filter((a) => a.isBima);
    expect(bima).toHaveLength(10);
    for (const a of bima) {
      expect(a.person).not.toBeNull();
      expect(a.person!.nameMr.length).toBeGreaterThan(0);
      expect(a.person!.rankCode.length).toBeGreaterThan(0);
    }
    const gaikwad = bima.find((a) => a.person!.buckleNo === "2272" && a.shift === "DAY");
    expect(gaikwad?.person!.nameMr).toContain("गायकवाड");
    expect(gaikwad?.person!.rankCode).toBe("PC");
  });

  it("explicit बंद + charge: 6 closed, 1 charge-only (कारंजा day)", () => {
    const closed = doc.locationStates.filter((s) => s.isClosed);
    expect(closed).toHaveLength(6);
    const katyaDay = doc.locationStates.find((s) => s.location.code === "MARSHAL_KATYA_MARUTI" && s.shift === "DAY");
    expect(katyaDay?.isClosed).toBe(true);
    expect(katyaDay?.chargeTo?.code).toBe("MARSHAL_MALEGAON_STAND");
    const karanjaDay = doc.locationStates.find((s) => s.location.code === "CHOWKI_KARANJA" && s.shift === "DAY");
    expect(karanjaDay?.isClosed).toBe(false);          // charge ≠ closed (three-fact distinction)
    expect(karanjaDay?.chargeTo?.code).toBe("CHOWKI_KATYA_MARUTI");
    expect(doc.locationStates.filter((s) => !s.isClosed && s.chargeTo)).toHaveLength(1);
  });

  it("manpower matrix: source row order + template column order, verbatim values", () => {
    expect(doc.template.layout.matrixColumns).toHaveLength(15);
    const firstRow = doc.manpower.filter((c) => c.displayOrder === 0);
    expect(firstRow).toHaveLength(15);
    expect(firstRow[0]).toMatchObject({ rowKey: "मंजूर संख्याबळ", columnKey: "PI", valueText: "02" });
    expect(firstRow[14]).toMatchObject({ columnKey: "ME", valueText: "233" });
    const lastRow = doc.manpower.filter((c) => c.displayOrder === 150);
    expect(lastRow[0].rowKey).toBe("दिवस व रात्रकरिता प्रत्यक्ष हजर");
    const haijr = doc.manpower.find((c) => c.rowKey === "हजर मनुश्यबळ" && c.columnKey === "OFFICE");
    expect(haijr?.valueText).toBe("12<br>04 Proण्");   // verbatim, never recalculated
    const haijOrder = doc.manpower.filter((c) => c.rowKey === "हजर मनुश्यबळ").map((c) => c.columnKey);
    expect(haijOrder).toEqual(["PI","API","PSI","GPS","ASI","LASI","LASI#2","HC","LHC","PN","LPN","PC","LPC","OFFICE","ME"]);
  });

  it("assignment context resolves duty titles from row label or duty definition", () => {
    const first = doc.assignments.find((a) => a.shift === "DAY" && a.columnNo === 1);
    expect(first?.dutyCode).toBe("DAY_STATION_LEADERSHIP");
    expect(first?.dutyTitleMr).toBeTruthy();           // duty_definitions.title_mr fallback
    const anyRowLabel = doc.assignments.find((a) => a.dutyTitleMr === "महिला कक्ष");
    expect(anyRowLabel).toBeTruthy();                  // row label beats context duty
  });
});

// ---------------------------------------------------------------------------
describe("template pinning + presentation overrides (§9, §5)", () => {
  it("a chart keeps its pin even when a newer template version exists; overrides resolve chart-only", async () => {
    await inTx(async (c) => {
      const head = (await c.query(
        `INSERT INTO template_versions (template_id, note, created_by)
         SELECT template_id, 'newer head', 'test' FROM chart_templates
         RETURNING template_version_id`)).rows[0].template_version_id;
      const chart = (await c.query(
        `INSERT INTO daily_charts (chart_date, lifecycle, template_version_id, presentation_overrides)
         VALUES ('2099-02-01','DRAFT',$1,'{"officer.title":{"label":"वपोनि"}}')
         RETURNING chart_id`, [pinnedTemplateVersionId])).rows[0].chart_id;
      const doc = await projectChart(c, chart);
      expect(doc.template.templateVersionId).toBe(pinnedTemplateVersionId); // NOT the new head
      expect(doc.template.templateVersionId).not.toBe(head);
      expect(doc.template.overrides).toEqual({ "officer.title": { label: "वपोनि" } });
      expect(resolveNode(doc, "officer.title")).toEqual({ label: "वपोनि" });
      expect(resolveNode(doc, "does.not.exist")).toBeUndefined();
      expect(doc.weekdayMr).toBe(weekdayMr("2099-02-01")); // derived helper sanity
    });
  });
});

// ---------------------------------------------------------------------------
describe("finalize: immutable snapshot (T13, §9)", () => {
  it("materializes version 1 equal to the projection, freezes working rows, round-trips", async () => {
    await inTx(async (c) => {
      const before = await projectChart(c, chartId);
      const res = await finalizeChart(c, chartId);
      expect(res.versionNo).toBe(1);
      expect(res.document.lifecycle).toBe("FINALIZED");
      // snapshot == projection at finalize time (except the lifecycle stamp)
      expect({ ...res.document, lifecycle: before.lifecycle }).toEqual(before);

      // working rows freeze; snapshot inserts still allowed
      await expectSqlError(c, /FINALIZED/,
        `UPDATE daily_assignments SET notes_mr='x' WHERE chart_id=$1`, [chartId]);
      await expectSqlError(c, /FINALIZED/,
        `DELETE FROM chart_notices WHERE chart_id=$1`, [chartId]);

      // double-finalize refuses
      await expect(finalizeChart(c, chartId)).rejects.toThrow(/FINALIZED/);

      // reader path returns the stored document
      const snap = await getSnapshot(c, chartId);
      expect(snap.versionNo).toBe(1);
      expect(snap.document).toEqual(res.document);
      expect(snap.document.weekdayMr).toBe("गुरुवार");
      expect(snap.amendedFromVersionId).toBeNull();
    });
  });

  it("reprint reads the snapshot, not today's masters (master-edit independence)", async () => {
    await inTx(async (c) => {
      await finalizeChart(c, chartId);
      const snap1 = await getSnapshot(c, chartId);
      const person = snap1.document.assignments.find((a) => a.person !== null)!.person!;
      await c.query(`UPDATE staff_members SET name_mr='बदललेले नाव' WHERE staff_id=$1`, [person.staffId]);
      const snap2 = await getSnapshot(c, chartId);
      expect(snap2.document.assignments.find((a) => a.person !== null)!.person!.nameMr)
        .toBe(person.nameMr);                          // snapshot unchanged
      const fresh = await projectChart(c, chartId);
      expect(fresh.assignments.find((a) => a.person !== null)!.person!.nameMr)
        .toBe("बदललेले नाव");                          // live projection WOULD differ → why reprints use snapshots
    });
  });

  it("amendment: reopen → edit → version 2 references version 1; version 1 untouched", async () => {
    await inTx(async (c) => {
      const v1res = await finalizeChart(c, chartId);
      const v1doc = v1res.document;
      const v1id = (await c.query(
        `SELECT chart_version_id FROM chart_versions WHERE chart_id=$1 AND version_no=1`, [chartId]))
        .rows[0].chart_version_id;

      await reopenForAmendment(c, chartId);
      // working rows editable again in the new draft round
      await c.query(`UPDATE daily_assignments SET notes_mr='संशोधन नोंद' WHERE assignment_id=$1`,
        [v1doc.assignments[0].assignmentId]);
      const v2res = await finalizeChart(c, chartId);
      expect(v2res.versionNo).toBe(2);

      const v2meta = (await c.query(
        `SELECT amended_from_version_id FROM chart_versions WHERE chart_id=$1 AND version_no=2`, [chartId]))
        .rows[0];
      expect(Number(v2meta.amended_from_version_id)).toBe(Number(v1id));

      const v1 = await getSnapshot(c, chartId, 1);
      expect(v1.document).toEqual(v1doc);              // v1 never mutated (append-only)
      expect(v1.document.assignments[0].notesMr).toBeNull();
      const v2 = await getSnapshot(c, chartId, 2);
      expect(v2.document.assignments[0].notesMr).toBe("संशोधन नोंद");
      expect(v2.document.lifecycle).toBe("FINALIZED");
    });
  });

  it("refuses to finalize a non-existent chart or an already-finalized one", async () => {
    await expect(finalizeChart(pool, 99999999)).rejects.toThrow(/no chart/);
    await inTx(async (c) => {
      await finalizeChart(c, chartId);
      await expect(finalizeChart(c, chartId)).rejects.toThrow(/FINALIZED/);
    });
  });
});
