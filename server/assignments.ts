// Purpose: narrow, transactional assignment mutations — the ONLY write path the authoring
//   UI uses for staff slots (never a full-document replace).
// Current role: P1 authoring API domain layer (work unit 1009, vertical slice 1).
// Last meaningful change: 2026-10-09 — created (reassignSlot).
// Constraint/dependency: AGENTS.md hard rules — the clerk chooses personnel; software only
//   applies the explicit choice. रिक्त = slot state (staff_id NULL), BIMA stays an explicit
//   boolean (never derived); unrelated assignment columns are never touched by a slot edit.
//   FINALIZED charts are immutable (checked here AND by DB triggers in migration 0004).
import type { Queryable } from "./chart-document.js";

export interface ReassignInput {
  chartId: number;
  assignmentId: number;
  /** staff_id to place in the slot, or null to clear it back to रिक्त. */
  staffId: number | null;
  /** explicit BIMA qualifier; only meaningful with a person; defaults to the row's current value. */
  isBima?: boolean;
}

export interface ReassignResult {
  assignmentId: number;
  staffId: number | null;
  allocationState: "ALLOCATED" | "VACANT_RIKT";
  isBima: boolean;
}

/** Reassign ONE slot. Everything else about the row (shift, duty, location, column,
 *  ordering, time windows, notes, status, source) is preserved untouched. */
export async function reassignSlot(db: Queryable, input: ReassignInput): Promise<ReassignResult> {
  const chart = (await db.query(
    `SELECT lifecycle FROM daily_charts WHERE chart_id = $1 FOR UPDATE`, [input.chartId])).rows;
  if (chart.length !== 1) throw new Error(`no chart ${input.chartId}`);
  if (chart[0].lifecycle === "FINALIZED") {
    throw new Error("FINALIZED charts are immutable; use amendment");
  }

  const cur = (await db.query(
    `SELECT assignment_id, chart_id, staff_id, allocation_state, is_bima
       FROM daily_assignments WHERE assignment_id = $1 FOR UPDATE`,
    [input.assignmentId])).rows;
  if (cur.length !== 1) throw new Error(`no assignment ${input.assignmentId}`);
  if (Number(cur[0].chart_id) !== input.chartId) {
    throw new Error(`assignment ${input.assignmentId} does not belong to chart ${input.chartId}`);
  }

  let staffId: number | null = input.staffId;
  let isBima: boolean;
  if (staffId == null) {
    // clearing a slot → रिक्त slot state; a vacant seat never carries a person or BIMA
    isBima = false;
  } else {
    const s = (await db.query(
      `SELECT staff_id, active FROM staff_members WHERE staff_id = $1`, [staffId])).rows;
    if (s.length !== 1) throw new Error(`no staff ${staffId}`);
    if (!s[0].active) throw new Error(`staff ${staffId} is inactive (deactivated, not deleted)`);
    isBima = input.isBima ?? Boolean(cur[0].is_bima);
  }

  const updated = (await db.query(
    `UPDATE daily_assignments
        SET staff_id = $1,
            allocation_state = CASE WHEN $1::bigint IS NULL THEN 'VACANT_RIKT' ELSE 'ALLOCATED' END,
            is_bima = $2
      WHERE assignment_id = $3
      RETURNING assignment_id, staff_id, allocation_state, is_bima`,
    [staffId, isBima, input.assignmentId])).rows[0];

  return {
    assignmentId: Number(updated.assignment_id),
    staffId: updated.staff_id == null ? null : Number(updated.staff_id),
    allocationState: updated.allocation_state,
    isBima: Boolean(updated.is_bima),
  };
}

// ---- add chowki block (edit-mode `+ चौकी जोडा`) -------------------------------
export interface AddChowkiInput {
  chartId: number;
  /** existing master location to place on the chart… */
  locationId?: number;
  /** …or a brand-new location (kind required) */
  nameMr?: string;
  kind?: string;
}
export interface AddChowkiResult { locationId: number; assignmentIds: number[]; createdDutyCodes: string[]; }

const CHOWKI_KINDS = new Set(["CHOWKI", "MARSHAL_POST"]);

/** Add a chowki/marshal block to a DRAFT chart: ensures the Layer-A location and its
 *  DAY/NIGHT duty rows exist, then inserts a location label row + one रिक्त "अंमलदार"
 *  seat per shift (approved interaction grammar — DESIGN_INTERACTION_NOTES §8).
 *  Nothing is invented: no person, no timing, no BIMA — the clerk fills the seat. */
export async function addChowkiBlock(db: Queryable, input: AddChowkiInput): Promise<AddChowkiResult> {
  const chart = (await db.query(
    `SELECT lifecycle FROM daily_charts WHERE chart_id = $1 FOR UPDATE`, [input.chartId])).rows;
  if (chart.length !== 1) throw new Error(`no chart ${input.chartId}`);
  if (chart[0].lifecycle === "FINALIZED") throw new Error("FINALIZED charts are immutable; use amendment");

  // ---- 1. resolve the location -------------------------------------------------
  let locationId: number;
  let locName: string;
  if (input.locationId != null) {
    const l = (await db.query(
      `SELECT location_id, name_mr, kind, active FROM locations WHERE location_id = $1`,
      [input.locationId])).rows;
    if (l.length !== 1) throw new Error(`no location ${input.locationId}`);
    if (!l[0].active) throw new Error(`location ${input.locationId} is inactive`);
    if (!CHOWKI_KINDS.has(l[0].kind)) throw new Error(`location kind ${l[0].kind} cannot become a chart block`);
    locationId = Number(l[0].location_id);
    locName = l[0].name_mr as string;
  } else {
    const name = (input.nameMr ?? "").trim();
    if (!name) throw new Error("nameMr is required when locationId is not given");
    if (!input.kind || !CHOWKI_KINDS.has(input.kind)) throw new Error("kind must be CHOWKI or MARSHAL_POST");
    const dup = (await db.query(
      `SELECT location_id FROM locations WHERE name_mr = $1 AND kind = $2 AND active`, [name, input.kind])).rows;
    if (dup.length > 0) throw new Error(`location "${name}" already exists — pick it from the list instead`);
    const created = (await db.query(
      `INSERT INTO locations (location_code, name_mr, kind, display_order)
       VALUES ('NEW_LOC_' || nextval('locations_location_id_seq')::text, $1, $2, 99)
       RETURNING location_id`, [name, input.kind])).rows[0];
    locationId = Number(created.location_id);
    locName = name;
  }

  // refuse a second block for the same location on this chart
  const already = (await db.query(
    `SELECT 1 FROM daily_assignments WHERE chart_id = $1 AND location_id = $2 LIMIT 1`,
    [input.chartId, locationId])).rows;
  if (already.length > 0) throw new Error("या तक्त्यावर ही चौकी आधीच आहे");

  // ---- 2. append at the end of the location-block columns ----------------------
  const colRow = (await db.query(
    `SELECT COALESCE(MAX(column_no), 2) AS col FROM daily_assignments
      WHERE chart_id = $1 AND location_id IS NOT NULL`, [input.chartId])).rows[0];
  const col = Number(colRow.col);

  // ---- 3. per shift: ensure duty master + label row + रिक्त seat ---------------
  const assignmentIds: number[] = [];
  const createdDutyCodes: string[] = [];
  for (const shift of ["DAY", "NIGHT"] as const) {
    let duty = (await db.query(
      `SELECT duty_id, duty_code FROM duty_definitions
        WHERE location_id = $1 AND default_shift = $2 ORDER BY duty_id LIMIT 1`,
      [locationId, shift])).rows;
    if (duty.length !== 1) {
      const code = `NEW_${shift}_${locationId}`;
      const ins = (await db.query(
        `INSERT INTO duty_definitions (duty_code, title_mr, section_code, default_shift, location_id, display_order)
         VALUES ($1, $2, $3, $4, $5, 99)
         ON CONFLICT (duty_code) DO UPDATE SET active = TRUE
         RETURNING duty_id, duty_code`,
        [code, locName, shift === "DAY" ? "DAY_DEPLOYMENT" : "NIGHT_DEPLOYMENT", shift, locationId])).rows[0];
      duty = [ins];
      createdDutyCodes.push(ins.duty_code as string);
    }
    const dutyId = Number(duty[0].duty_id);
    const maxSort = Number((await db.query(
      `SELECT COALESCE(MAX(sort_order), 0) AS m FROM daily_assignments
        WHERE chart_id = $1 AND shift = $2 AND column_no = $3`,
      [input.chartId, shift, col])).rows[0].m);

    const label = (await db.query(
      `INSERT INTO daily_assignments
         (chart_id, shift, duty_id, location_id, allocation_state, sort_order, column_no)
       VALUES ($1, $2, $3, $4, 'ALLOCATED', $5, $6)
       RETURNING assignment_id`,
      [input.chartId, shift, dutyId, locationId, maxSort + 10, col])).rows[0];
    const seat = (await db.query(
      `INSERT INTO daily_assignments
         (chart_id, shift, duty_title_mr, location_id, allocation_state, sort_order, column_no)
       VALUES ($1, $2, 'अंमलदार', $3, 'VACANT_RIKT', $4, $5)
       RETURNING assignment_id`,
      [input.chartId, shift, locationId, maxSort + 20, col])).rows[0];
    assignmentIds.push(Number(label.assignment_id), Number(seat.assignment_id));
  }
  return { locationId, assignmentIds, createdDutyCodes };
}

// ---- add officer box (edit-mode `+ अधिकारी बॉक्स जोडा`) --------------------------
export interface AddOfficerBoxInput {
  chartId: number;
  /** box label / branch name shown as the chip (e.g. "नवीन शाखा") — required */
  labelMr: string;
  /** optional heading (the officer's post/name); falls back to the label */
  titleMr?: string;
}
export interface AddOfficerBoxResult {
  label: string;
  writerDutyTitle: string;
  assignmentIds: number[];
}

interface BoxLike { label: string; title?: string; writerDutyTitle?: string; writerRole?: string; }

/** Add an अधिकारी box to a DRAFT chart — the officer-box twin of addChowkiBlock.
 *  Two writes, one transaction:
 *   1. presentation_overrides.officerBoxes += { label, title?, writerDutyTitle, writerRole }
 *      (chart-local display config — the renderer appends these to the template's boxes),
 *   2. a REAL VACANT_RIKT रायटर seat in the office column (DAY, column 4 — the renderer's
 *      office desk) whose duty_title is the box's writerDutyTitle. The seed's own grammar for
 *      the vacant तपास writer: the label row IS the रिक्त seat, so the box's role cell and
 *      its fillable slot are one addressable row (data-asn), not fake content.
 *  Nothing is invented: no person, no timing, no BIMA — the clerk fills the seat. */
export async function addOfficerBox(db: Queryable, input: AddOfficerBoxInput): Promise<AddOfficerBoxResult> {
  const label = (input.labelMr ?? "").trim();
  if (!label) throw new Error("labelMr is required");

  const rows = (await db.query(
    `SELECT c.lifecycle, c.presentation_overrides, tv.layout
       FROM daily_charts c
       JOIN template_versions tv ON tv.template_version_id = c.template_version_id
      WHERE c.chart_id = $1 FOR UPDATE OF c`, [input.chartId])).rows;
  if (rows.length !== 1) throw new Error(`no chart ${input.chartId}`);
  if (rows[0].lifecycle === "FINALIZED") throw new Error("FINALIZED charts are immutable; use amendment");

  const ov = { ...((rows[0].presentation_overrides as Record<string, unknown>) ?? {}) };
  const baseBoxes = ((rows[0].layout as Record<string, unknown>).officerBoxes as BoxLike[] | undefined) ?? [];
  const extraBoxes = (ov.officerBoxes as BoxLike[] | undefined) ?? [];
  if ([...baseBoxes, ...extraBoxes].some((b) => b.label === label)) {
    throw new Error(`या नावाचा अधिकारी बॉक्स आधीच आहे`);
  }

  // The renderer's office desk is DAY column 4 (chart-html col4); append after its last row.
  const writerDutyTitle = `${label}॰रायटर`;
  const maxSort = Number((await db.query(
    `SELECT COALESCE(MAX(sort_order), 0) AS m FROM daily_assignments
      WHERE chart_id = $1 AND shift = 'DAY' AND column_no = 4`, [input.chartId])).rows[0].m);
  const seatRow = (await db.query(
    `INSERT INTO daily_assignments (chart_id, shift, duty_title_mr, allocation_state, sort_order, column_no)
     VALUES ($1, 'DAY', $2, 'VACANT_RIKT', $3, 4)
     RETURNING assignment_id`, [input.chartId, writerDutyTitle, maxSort + 10])).rows[0];

  const title = (input.titleMr ?? "").trim();
  const box: BoxLike = { label, ...(title ? { title } : {}), writerDutyTitle, writerRole: "रायटर" };
  ov.officerBoxes = [...extraBoxes, box];
  await db.query(
    `UPDATE daily_charts SET presentation_overrides = $1 WHERE chart_id = $2`,
    [ov, input.chartId]);

  return {
    label,
    writerDutyTitle,
    assignmentIds: [Number(seatRow.assignment_id)],
  };
}
