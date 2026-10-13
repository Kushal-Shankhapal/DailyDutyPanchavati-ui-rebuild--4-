import fs from "node:fs";
import pg from "pg";

const pool = new pg.Pool({ database: "panchavati3_dev", user: "postgres", host: "127.0.0.1" });
const query = (sql) => pool.query(sql).then((result) => result.rows);

const main = async () => {
    const byColumn = await query(`
    SELECT shift, column_no, count(*)::int AS rows,
           count(*) FILTER (WHERE staff_id IS NOT NULL)::int AS staffed,
           count(*) FILTER (WHERE staff_id IS NULL)::int AS vacant
      FROM daily_assignments a JOIN daily_charts c USING (chart_id)
     WHERE c.chart_date = '2026-09-10'
     GROUP BY shift, column_no ORDER BY shift, column_no`);
    const byLocation = await query(`
    SELECT shift, column_no, coalesce(l.name_mr, '(location-less)') AS location,
           count(*)::int AS rows,
           count(*) FILTER (WHERE staff_id IS NOT NULL)::int AS staffed
      FROM daily_assignments a JOIN daily_charts c USING (chart_id)
      LEFT JOIN locations l USING (location_id)
     WHERE c.chart_date = '2026-09-10'
     GROUP BY shift, column_no, l.name_mr ORDER BY shift, column_no, location`);
    const groups = await query(`
    SELECT shift, column_no, coalesce(a.duty_title_mr, d.title_mr, '(untitled)') AS duty,
           count(*)::int AS rows,
           count(*) FILTER (WHERE staff_id IS NOT NULL)::int AS staffed
      FROM daily_assignments a JOIN daily_charts c USING (chart_id)
      LEFT JOIN duty_definitions d USING (duty_id)
     WHERE c.chart_date = '2026-09-10'
     GROUP BY shift, column_no, duty ORDER BY shift, column_no, min(a.sort_order)`);
    const states = await query(`
    SELECT s.shift, l.name_mr, s.is_closed, coalesce(ch.name_mr, '') AS charge_to
      FROM location_operational_states s JOIN daily_charts c USING (chart_id)
      JOIN locations l ON l.location_id = s.location_id
      LEFT JOIN locations ch ON ch.location_id = s.charge_destination_location_id
     WHERE c.chart_date = '2026-09-10'
     ORDER BY s.shift, l.display_order`);
    const report = [
        "# 10/09 Density Audit",
        "",
        "> Generated from `panchavati3_dev` normalized chart data. This is a measurement artifact, not a source-authority claim.",
        "",
        "## Assignments By Shift/Column",
        "",
        "| Shift | Source column | Rows | Staffed | Vacant |",
        "|---|---:|---:|---:|---:|",
        ...byColumn.map((r) => `| ${r.shift} | ${r.column_no} | ${r.rows} | ${r.staffed} | ${r.vacant} |`),
        "",
        "## Assignments By Shift/Column/Location",
        "",
        "| Shift | Column | Location | Rows | Staffed |",
        "|---|---:|---|---:|---:|",
        ...byLocation.map((r) => `| ${r.shift} | ${r.column_no} | ${r.location} | ${r.rows} | ${r.staffed} |`),
        "",
        "## Duty Groups",
        "",
        "| Shift | Column | Duty group | Rows | Staffed |",
        "|---|---:|---|---:|---:|",
        ...groups.map((r) => `| ${r.shift} | ${r.column_no} | ${r.duty} | ${r.rows} | ${r.staffed} |`),
        "",
        "## Location States",
        "",
        "| Shift | Location | Closed | Charge destination |",
        "|---|---|---|---|",
        ...states.map((r) => `| ${r.shift} | ${r.name_mr} | ${r.is_closed ? "बंद" : "कार्यरत"} | ${r.charge_to || ""} |`),
        "",
    ].join("\n");
    fs.writeFileSync(".tmp-density-1009.md", report, "utf8");
    console.log(report);
    await pool.end();
};

main().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
