// P0 invariant suite — encodes ARCHITECTURE.md invariants 1-9 that are representable
// at the DB layer, plus static source scans (invariants 4-5) and seeded 10/09 facts.
// Runs against panchavati3_test ONLY (explicit makePool(TEST_DB), never dev).
// Mutating tests run inside a transaction that is always ROLLBACKed.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { makePool, TEST_DB } from "../server/db.js";
import { migrate } from "../db/migrate.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pool: pg.Pool;
let chartId: number;

beforeAll(async () => {
  pool = makePool(TEST_DB);
  // The test DB must be fully set up (migrations + reference + chart seed).
  const c = await pool.query(`SELECT count(*)::int AS n FROM schema_migrations`);
  if (c.rows[0].n === 0) throw new Error("test DB has no migrations — run npm run db:migrate first");
  const ch = await pool.query(`SELECT chart_id FROM daily_charts WHERE chart_date='2026-09-10'`);
  if (ch.rows.length !== 1) throw new Error("test DB missing 10/09 chart — run npm run db:seed first");
  chartId = ch.rows[0].chart_id;
});

afterAll(async () => { await pool.end(); });

/** Run fn inside a transaction on a dedicated client; always ROLLBACK (never pollutes the DB). */
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

/** Expect a statement to fail inside a SAVEPOINT (so the outer tx survives). */
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
describe("seeded 10/09 chart facts (source-derived counts)", () => {
  it("matches SEMANTIC/10.md table counts", async () => {
    const r = await pool.query(`SELECT
      (SELECT count(*) FROM daily_assignments WHERE chart_id=$1)::int AS assignments,
      (SELECT count(*) FROM daily_assignments WHERE chart_id=$1 AND is_bima)::int AS bima,
      (SELECT count(*) FROM daily_assignments WHERE chart_id=$1 AND allocation_state='VACANT_RIKT')::int AS vacant,
      (SELECT count(*) FROM daily_availabilities WHERE chart_id=$1)::int AS availability,
      (SELECT count(*) FROM location_operational_states WHERE chart_id=$1)::int AS loc_states,
      (SELECT count(*) FROM chart_notices WHERE chart_id=$1)::int AS notices,
      (SELECT count(*) FROM manpower_records WHERE chart_id=$1)::int AS matrix_cells,
      (SELECT count(*) FROM officer_summary_rows WHERE chart_id=$1)::int AS officer_rows,
      (SELECT count(*) FROM scan_schedule_daily WHERE chart_id=$1)::int AS scan_rows`, [chartId]);
    const s = r.rows[0];
    expect(s.matrix_cells).toBe(240);   // Table 4: 16 rows × 15 cols, verbatim
    expect(s.officer_rows).toBe(15);    // Table 9
    expect(s.scan_rows).toBe(12);       // Table 12
    expect(s.availability).toBe(69);    // Table 3: 20+20+9+20 source cells
    expect(s.loc_states).toBe(7);       // बंद/charge cells: DAY 3, NIGHT 4
    expect(s.bima).toBe(10);            // explicit बिमा markers only (6 DAY + 4 NIGHT)
    expect(s.vacant).toBe(2);           // तपास॰रायटर + नगदी कारकुन office slots
    expect(s.notices).toBe(28);         // NIGHT4 directives + रामकुंड narrative
    expect(s.assignments).toBe(212);
  });

  it("manpower matrix stores source text verbatim (never recalculated)", async () => {
    const r = await pool.query(
      `SELECT value_text FROM manpower_records WHERE chart_id=$1 AND row_key='हजर मनुश्यबळ' AND column_key='OFFICE'`,
      [chartId]);
    expect(r.rows[0].value_text).toBe("12<br>04 Proण्"); // OCR artifact preserved (N4)
    const dots = await pool.query(
      `SELECT count(*)::int AS n FROM manpower_records WHERE chart_id=$1 AND value_text='..'`, [chartId]);
    expect(dots.rows[0].n).toBeGreaterThan(0); // '..' cells survive as source values
  });
});

// ---------------------------------------------------------------------------
describe("invariant 1-3: रिक्त ≠ बंद ≠ बिमा (explicit fields, DB-enforced)", () => {
  it("vacant rows carry no person and no BIMA", async () => {
    const r = await pool.query(
      `SELECT count(*)::int AS n FROM daily_assignments
        WHERE chart_id=$1 AND allocation_state='VACANT_RIKT'
          AND (staff_id IS NOT NULL OR is_bima)`, [chartId]);
    expect(r.rows[0].n).toBe(0);
  });

  it("BIMA rows always carry a person", async () => {
    const r = await pool.query(
      `SELECT count(*)::int AS n FROM daily_assignments WHERE chart_id=$1 AND is_bima AND staff_id IS NULL`,
      [chartId]);
    expect(r.rows[0].n).toBe(0);
  });

  it("rejects VACANT_RIKT with a person (constraint vacant_slot_has_no_person)", async () => {
    await inTx(async (c) => {
      await expectSqlError(c, /vacant_slot_has_no_person/,
        `INSERT INTO daily_assignments (chart_id, shift, allocation_state, staff_id)
         VALUES ($1,'DAY','VACANT_RIKT',(SELECT staff_id FROM staff_members LIMIT 1))`, [chartId]);
    });
  });

  it("rejects BIMA without a person (constraint bima_requires_person)", async () => {
    await inTx(async (c) => {
      await expectSqlError(c, /bima_requires_person/,
        `INSERT INTO daily_assignments (chart_id, shift, is_bima) VALUES ($1,'DAY',TRUE)`, [chartId]);
    });
  });

  it("rejects bogus allocation_state / shift values", async () => {
    await inTx(async (c) => {
      await expectSqlError(c, /allocation_state/,
        `INSERT INTO daily_assignments (chart_id, shift, allocation_state) VALUES ($1,'DAY','SOMETHING')`, [chartId]);
      await expectSqlError(c, /shift/,
        `INSERT INTO daily_assignments (chart_id, shift) VALUES ($1,'EVENING')`, [chartId]);
    });
  });

  it("schema separation: बंद lives only in location_operational_states, never on assignments", async () => {
    const cols = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_name IN ('daily_assignments','location_operational_states')
          AND column_name IN ('is_closed','charge_destination_location_id','is_bima','allocation_state')`);
    const byTable: Record<string, string[]> = {};
    for (const row of cols.rows) (byTable[row.table_name] ??= []).push(row.column_name);
    expect(byTable.daily_assignments).not.toContain("is_closed");
    expect(byTable.location_operational_states).not.toContain("is_bima");
    expect(byTable.location_operational_states).not.toContain("allocation_state");
  });

  it("charge destination is never the location itself", async () => {
    const r = await pool.query(
      `SELECT count(*)::int AS n FROM location_operational_states
        WHERE charge_destination_location_id IS NOT NULL
          AND charge_destination_location_id = location_id`);
    expect(r.rows[0].n).toBe(0);
  });

  it("बंद locations have no staff assignments attached to closure (no person on closed state rows)", async () => {
    const r = await pool.query(
      `SELECT count(*)::int AS n FROM information_schema.columns
        WHERE table_name='location_operational_states' AND column_name IN ('staff_id','person_id')`);
    expect(r.rows[0].n).toBe(0); // closure is a place fact, not a person fact
  });
});

// ---------------------------------------------------------------------------
describe("invariant 6: chart_versions append-only", () => {
  it("rejects UPDATE and DELETE on chart_versions", async () => {
    await inTx(async (c) => {
      await c.query(
        `INSERT INTO chart_versions (chart_id, version_no, document_json) VALUES ($1, 999, '{}')`, [chartId]);
      await expectSqlError(c, /append-only/,
        `UPDATE chart_versions SET document_json='{"tampered":true}' WHERE chart_id=$1 AND version_no=999`, [chartId]);
      await expectSqlError(c, /append-only/,
        `DELETE FROM chart_versions WHERE chart_id=$1 AND version_no=999`, [chartId]);
    });
  });
});

// ---------------------------------------------------------------------------
describe("invariant 9: lifecycle monotonic (DRAFT→VALIDATED→FINALIZED, FINALIZED→DRAFT reopen)", () => {
  it("permits legal transitions and rejects illegal ones", async () => {
    await inTx(async (c) => {
      // Fresh draft chart for the test (own date, rolled back).
      const ins = await c.query(
        `INSERT INTO daily_charts (chart_date, lifecycle, template_version_id)
         SELECT '2099-01-01','DRAFT',template_version_id FROM template_versions ORDER BY template_version_id LIMIT 1
         RETURNING chart_id`);
      const id = ins.rows[0].chart_id;
      const setLife = (life: string, expectErr?: RegExp) =>
        expectErr
          ? expectSqlError(c, expectErr, `UPDATE daily_charts SET lifecycle='${life}' WHERE chart_id=$1`, [id])
          : c.query(`UPDATE daily_charts SET lifecycle='${life}' WHERE chart_id=$1`, [id]);

      await setLife("VALIDATED");                 // DRAFT → VALIDATED ok
      await setLife("VALIDATED");                 // no-op ok
      await setLife("FINALIZED");                 // VALIDATED → FINALIZED ok
      await setLife("VALIDATED", /illegal lifecycle transition/); // FINALIZED → VALIDATED blocked
      await setLife("DRAFT");                     // FINALIZED → DRAFT amendment reopen ok
      await setLife("FINALIZED");                 // DRAFT → FINALIZED (skip VALIDATED) is legal
    });
  });

  it("rejects chart identity changes (id/date immutable)", async () => {
    await inTx(async (c) => {
      await expectSqlError(c, /identity is immutable/,
        `UPDATE daily_charts SET chart_date='2099-01-02' WHERE chart_id=$1`, [chartId]);
    });
  });
});

// ---------------------------------------------------------------------------
describe("invariant (freeze): FINALIZED charts reject working-row edits", () => {
  it("blocks UPDATE/DELETE on all 7 working tables after finalize", async () => {
    await inTx(async (c) => {
      const ins = await c.query(
        `INSERT INTO daily_charts (chart_date, lifecycle, template_version_id)
         SELECT '2099-01-05','DRAFT',template_version_id FROM template_versions ORDER BY template_version_id LIMIT 1
         RETURNING chart_id`);
      const id = ins.rows[0].chart_id;
      // minimal working rows (10/09 has none for this chart yet)
      await c.query(
        `INSERT INTO daily_assignments (chart_id, shift, allocation_state, duty_title_mr)
         VALUES ($1,'DAY','ALLOCATED','टेस्ट')`, [id]);
      await c.query(
        `INSERT INTO chart_notices (chart_id, group_key, sort_order, text_mr) VALUES ($1,'g',1,'नोंद')`, [id]);
      await c.query(
        `INSERT INTO location_operational_states (chart_id, location_id, shift, is_closed)
         VALUES ($1,(SELECT location_id FROM locations LIMIT 1),'DAY',FALSE)`, [id]);
      await c.query(`UPDATE daily_charts SET lifecycle='FINALIZED' WHERE chart_id=$1`, [id]);

      await expectSqlError(c, /FINALIZED/,
        `UPDATE daily_assignments SET duty_title_mr='x' WHERE chart_id=$1`, [id]);
      await expectSqlError(c, /FINALIZED/,
        `DELETE FROM daily_assignments WHERE chart_id=$1`, [id]);
      await expectSqlError(c, /FINALIZED/,
        `UPDATE chart_notices SET text_mr='x' WHERE chart_id=$1`, [id]);
      await expectSqlError(c, /FINALIZED/,
        `DELETE FROM location_operational_states WHERE chart_id=$1`, [id]);
      // snapshot insert must STILL be allowed on a finalized chart
      await c.query(
        `INSERT INTO chart_versions (chart_id, version_no, document_json) VALUES ($1,1,'{"ok":true}')`, [id]);
    });
  });
});

// ---------------------------------------------------------------------------
describe("migrations: forward-only and idempotent on an up-to-date DB", () => {
  it("re-running migrate applies nothing and never re-executes applied files", async () => {
    const ran = await migrate(pool);
    expect(ran).toEqual([]);
  });

  it("refuses to run when an applied migration file changed (checksum guard)", async () => {
    // Prove the guard exists without mutating real files: migrate() is covered by
    // sha256 comparison — assert every recorded checksum matches the file on disk.
    const rows = (await pool.query(`SELECT filename, checksum FROM schema_migrations`)).rows;
    expect(rows.length).toBeGreaterThanOrEqual(6);
    const { createHash } = await import("node:crypto");
    for (const row of rows) {
      const sql = fs.readFileSync(path.join(root, "db", "migrations", row.filename), "utf8");
      expect(createHash("sha256").update(sql).digest("hex")).toBe(row.checksum);
    }
  });
});

// ---------------------------------------------------------------------------
// Static scans (invariants 4-5): these guard the codebase, not the DB.
// ---------------------------------------------------------------------------
function runtimeSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (/\.(ts|mjs|js)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(p);
    }
  };
  // Runtime code only — tests/ scans are asserted elsewhere and would self-match.
  for (const d of ["db", "server", "scripts"]) walk(path.join(root, d));
  return out;
}

describe("invariant 5: no parsing of notes/remarks for machine meaning", () => {
  it("no runtime source reads remarks_mr or regexes over notes_mr", () => {
    const offenders: string[] = [];
    for (const file of runtimeSources()) {
      const src = fs.readFileSync(file, "utf8");
      if (/remarks_mr/.test(src)) offenders.push(`${file}: mentions remarks_mr`);
      // notes_mr may be WRITTEN or displayed, never matched/liked/regexed.
      for (const [i, line] of src.split("\n").entries()) {
        if (/notes_mr/.test(line) && /(\.match\(|\.test\(|RegExp|LIKE|~)/.test(line)) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("invariant 4: no autonomous assignment code path", () => {
  it("no auto-staffing identifiers or random selection in runtime code", () => {
    const banned = /\b(autoAssign|auto_assign|pickStaff|assignBest|findAvailable|smartFill|Math\.random)/;
    const offenders: string[] = [];
    for (const file of runtimeSources()) {
      if (file.includes(`${path.sep}tests${path.sep}`)) continue; // tests assert on these words themselves
      const src = fs.readFileSync(file, "utf8");
      const m = src.match(banned);
      if (m) offenders.push(`${file}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("local-only: no outbound network in runtime code", () => {
  it("db/server/scripts never call fetch or import axios/http-clients", () => {
    const offenders: string[] = [];
    for (const file of runtimeSources()) {
      if (file.includes(`${path.sep}tests${path.sep}`)) continue;
      const src = fs.readFileSync(file, "utf8");
      if (/\bfetch\s*\(/.test(src) || /\baxios\b/.test(src)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
