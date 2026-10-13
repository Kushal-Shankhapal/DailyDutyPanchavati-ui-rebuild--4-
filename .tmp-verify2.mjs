import pg from "pg";
const BASE = "http://127.0.0.1:3100";
const pool = new pg.Pool({ host: "127.0.0.1", port: 5432, user: "postgres", database: "panchavati3_dev" });
const j = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t.slice(0, 120); }
  return { status: r.status, body: d };
};
const ok = (l, c, e) => console.log((c ? "PASS " : "FAIL ") + l + (e !== undefined ? "  → " + JSON.stringify(e) : ""));

// --- cleanup the leftovers from the earlier partial run -----------------------
const leftoverLoc = (await pool.query(`SELECT location_id FROM locations WHERE location_code LIKE 'NEW_LOC_%'`)).rows.map(r => Number(r.location_id));
for (const id of leftoverLoc) {
  const del = await j("DELETE", "/api/charts/2026-09-10/chowki/" + id);
  console.log("cleanup chowki", id, "→", del.status, JSON.stringify(del.body));
}
await pool.query(`DELETE FROM duty_definitions WHERE duty_code LIKE 'NEW_DAY_%' OR duty_code LIKE 'NEW_NIGHT_%'`);
await pool.query(`DELETE FROM locations WHERE location_code LIKE 'NEW_LOC_%'`);
await pool.query(`UPDATE daily_charts SET presentation_overrides = '{}'::jsonb WHERE chart_date = '2026-09-10'`);
const base = (await pool.query(`SELECT (SELECT count(*) FROM daily_assignments a JOIN daily_charts c ON c.chart_id=a.chart_id WHERE c.chart_date='2026-09-10')::int AS rows`)).rows[0];
console.log("after cleanup: assignments =", base.rows, "(expect 212)");

// --- full CRUD re-verification ------------------------------------------------
const html = async () => (await fetch(BASE + "/charts/2026-09-10")).text();
const kateya = (await pool.query(`SELECT location_id FROM locations WHERE name_mr LIKE 'काटया%' LIMIT 1`)).rows[0].location_id;
let h = await html();
ok("no clerk-added box left", !h.includes('data-box-label='), (h.match(/data-box-del="officer"/g) || []).length);
ok("6 chowki ✕ controls", (h.match(/data-box-del="chowki"/g) || []).length === 6, (h.match(/data-box-del="chowki"/g) || []).length);

const add = await j("POST", "/api/charts/2026-09-10/officer", { labelMr: "चाचणी बॉक्स" });
ok("POST /officer → 201", add.status === 201, add.body);
ok("renders with its own ✕", (await html()).includes('data-box-label="चाचणी बॉक्स"'));
ok("duplicate → 409", (await j("POST", "/api/charts/2026-09-10/officer", { labelMr: "चाचणी बॉक्स" })).status === 409);
const d1 = await j("DELETE", "/api/charts/2026-09-10/officer/" + encodeURIComponent("चाचणी बॉक्स"));
ok("DELETE /officer → 200, one empty seat removed", d1.status === 200 && d1.body.removedAssignmentIds.length === 1, d1.body);
ok("gone from the render", !(await html()).includes('data-box-label="चाचणी बॉक्स"'));

ok("template box not deletable → 404", (await j("DELETE", "/api/charts/2026-09-10/officer/" + encodeURIComponent("तपास"))).status === 404);
ok("unknown chowki → 404", (await j("DELETE", "/api/charts/2026-09-10/chowki/999999")).status === 404);
const guard = await j("DELETE", "/api/charts/2026-09-10/chowki/" + kateya);
ok("chowki holding people → 409 (id " + kateya + ")", guard.status === 409, guard.body);

const cw = await j("POST", "/api/charts/2026-09-10/chowki", { nameMr: "चाचणी चौकी", kind: "CHOWKI" });
ok("POST /chowki → 201", cw.status === 201, cw.body);
const cwId = cw.body && cw.body.locationId;
ok("new chowki renders as a 7th block with ✕", (await html()).split('data-box-del="chowki"').length - 1 === 7);
const cd = await j("DELETE", "/api/charts/2026-09-10/chowki/" + cwId);
ok("DELETE /chowki → empty rows + states removed", cd.status === 200 && cd.body.removedAssignmentIds.length === 4, cd.body);

// remove the test master rows this verification created
await pool.query(`DELETE FROM duty_definitions WHERE duty_code LIKE 'NEW_DAY_%' OR duty_code LIKE 'NEW_NIGHT_%'`);
await pool.query(`DELETE FROM locations WHERE location_code LIKE 'NEW_LOC_%'`);
const fin = (await pool.query(`SELECT (SELECT count(*) FROM daily_assignments a JOIN daily_charts c ON c.chart_id=a.chart_id WHERE c.chart_date='2026-09-10')::int AS rows, (SELECT presentation_overrides FROM daily_charts WHERE chart_date='2026-09-10') AS ov`)).rows[0];
console.log("final DB state: rows =", fin.rows, "| overrides =", JSON.stringify(fin.ov));
await pool.end();
