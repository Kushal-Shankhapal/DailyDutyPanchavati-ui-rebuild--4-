const BASE = "http://127.0.0.1:3100";
const j = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t.slice(0, 120); }
  return { status: r.status, body: d };
};
const html = async () => (await fetch(BASE + "/charts/2026-09-10")).text();
const ok = (label, cond, extra) => console.log((cond ? "PASS " : "FAIL ") + label + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));

// baseline
const before = await html();
ok("baseline renders the clerk-added box 'hnn' with a delete control", before.includes('data-box-label="hnn"'));
ok("baseline: 6 chowki delete controls", (before.match(/data-box-del="chowki"/g) || []).length === 6, (before.match(/data-box-del="chowki"/g) || []).length);

// 1. add an officer box
const add = await j("POST", "/api/charts/2026-09-10/officer", { labelMr: "तपासणी बॉक्स", titleMr: "चाचणी" });
ok("POST /officer → 201", add.status === 201, add.body);
const after = await html();
ok("new box renders with its own ✕ control", after.includes('data-box-label="तपासणी बॉक्स"'));

// 2. duplicate label refused
const dup = await j("POST", "/api/charts/2026-09-10/officer", { labelMr: "तपासणी बॉक्स" });
ok("duplicate label → 409", dup.status === 409, dup.body);

// 3. delete it
const del = await j("DELETE", "/api/charts/2026-09-10/officer/" + encodeURIComponent("तपासणी बॉक्स"));
ok("DELETE /officer/:label → 200 + removed seat", del.status === 200 && del.body.removedAssignmentIds.length === 1, del.body);
const after2 = await html();
ok("box gone from the render", !after2.includes('data-box-label="तपासणी बॉक्स"'));

// 4. guards
const source = await j("DELETE", "/api/charts/2026-09-10/officer/" + encodeURIComponent("तपास"));
ok("template/source box cannot be deleted → 404", source.status === 404, source.body);
const missing = await j("DELETE", "/api/charts/2026-09-10/chowki/999999");
ok("unknown chowki → 404", missing.status === 404, missing.body);
const filled = await j("DELETE", "/api/charts/2026-09-10/chowki/1");  // काटया: has people
ok("chowki holding people → 409", filled.status === 409, filled.body);

// 5. add a chowki with seats, then delete it
const cw = await j("POST", "/api/charts/2026-09-10/chowki", { nameMr: "चाचणी चौकी", kind: "CHOWKI" });
ok("POST /chowki → 201", cw.status === 201, cw.body);
const cwId = cw.body && cw.body.locationId;
const cwDel = await j("DELETE", "/api/charts/2026-09-10/chowki/" + cwId);
ok("DELETE /chowki/:id → removed the empty rows + states", cwDel.status === 200 && cwDel.body.removedAssignmentIds.length >= 2, cwDel.body);

// 6. the user's junk box
const junk = await j("DELETE", "/api/charts/2026-09-10/officer/" + encodeURIComponent("hnn"));
ok("junk 'hnn' box deleted (user's test box)", junk.status === 200, junk.body);
console.log("cleanup rows to remove afterwards:", JSON.stringify({ testLocationId: cwId, createdDutyCodes: cw.body && cw.body.createdDutyCodes }));
