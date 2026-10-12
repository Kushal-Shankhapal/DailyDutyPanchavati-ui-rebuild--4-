// Purpose: browser authoring layer for the server-rendered duty chart — edit mode,
//   staff picker with REAL persistence, quick-create + master edit, रिक्त clear,
//   add-chowki control, finalize/amend, abbreviation tooltips (CSS-driven).
// Current role: production authoring UI (work unit 1009) — served at /chart-authoring.js.
// Last meaningful change: 2026-10-09 — created (replaces the dead inline prototype script
//   that only rewrote cell text and never persisted).//   Constraint/dependency: AGENTS.md hard rules — same-origin relative fetches ONLY (local-only),
//   no modal text-prompt hacks, no fake saves: every visual change goes through the narrow PATCH API and a
//   reload reads back from PostgreSQL. All chrome is .no-print / media-print hidden.
//   Browser code lives in web/ so the local-only static scan over db/server/scripts stays true.
(function () {
  "use strict";

  var DATE = document.body.getAttribute("data-chart-date") || "";
  var LIFECYCLE = document.body.getAttribute("data-lifecycle") || "";
  var mastersPromise = null;
  var mastersData = null;   // resolved masters (ranks/staff/locations/duties/units)
  var flyer = null;          // current dialog state
  var slotCtx = null;        // slot being edited
  var busy = false;

  // ---------- tiny helpers ----------------------------------------------------
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function api(path, opts) {
    var o = opts || {};
    o.headers = o.headers || { "Content-Type": "application/json" };
    return fetch(path, o).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || ("HTTP " + res.status));
        return body;
      });
    });
  }
  var toastTimer = null;
  function toast(msg, kind) {
    var old = document.querySelector(".toast");
    if (old) old.remove();
    var t = el("div", { class: "toast no-print " + (kind || ""), role: "status" }, esc(msg));
    document.body.appendChild(t);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 3200);
  }
  // Success feedback survives the reload: stash it, show it on the fresh page.
  function reloadSoon(ms, msg) {
    if (msg) { try { sessionStorage.setItem("pd_toast", msg); } catch (e) { /* ignore */ } }
    setTimeout(function () { location.reload(); }, ms || 500);
  }

  function loadMasters() {
    if (!mastersPromise) {
      mastersPromise = api("/api/masters").then(function (m) {
        mastersData = m;
        return m;
      }).catch(function (e) {
        toast("मास्टर डेटा लोड झाला नाही: " + e.message, "err");
        mastersData = { ranks: [], staff: [], locations: [], duties: [], units: [] };
        return mastersData;
      });
    }
    return mastersPromise;
  }
  function rankShort(code) {
    var list = (mastersData && mastersData.ranks) || [];
    var r = list.find(function (x) { return x.rank_code === code; });
    return (r && r.short_form_mr) || code || "";
  }
  function staffLabel(s) {
    var buck = s.buckle_no ? " " + s.buckle_no : "";
    return rankShort(s.rank_code) + buck + " " + (s.name_mr || "");
  }

  // ---------- edit mode -------------------------------------------------------
  function isEdit() { return document.body.classList.contains("mode-edit"); }
  function setMode(on) {
    document.body.classList.toggle("mode-edit", on);
    try { sessionStorage.setItem("pd_mode", on ? "edit" : "preview"); } catch (e) { /* private mode */ }
    var btn = document.getElementById("mode-btn");
    if (btn) btn.textContent = on ? "👁 पूर्वावलोकन (Preview Mode)" : "✏️ संपादन (Edit Mode)";
    document.querySelectorAll(".dt td.slot, [data-label]").forEach(function (node) {
      if (on) {
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "button");
        node.setAttribute("aria-label",
          node.classList.contains("slot")
            ? "संपादन करा: " + node.textContent.trim()
            : "नाव बदला: " + node.textContent.trim());
      } else {
        node.removeAttribute("tabindex");
        node.removeAttribute("role");
        node.removeAttribute("aria-label");
      }
    });
    if (!on) closeFlyer();
  }

  // ---------- slot context ----------------------------------------------------
  function slotContext(td) {
    var staff = td.getAttribute("data-staff");
    return {
      el: td,
      id: Number(td.getAttribute("data-asn")),
      staffId: staff ? Number(staff) : null,
      isBima: td.getAttribute("data-bima") === "1",
      shift: td.getAttribute("data-shift"),
      text: td.textContent.trim(),
      label: slotLabel(td),
    };
  }
  function slotLabel(td) {
    var tr = td.closest("tr");
    var th = tr && (tr.querySelector("th.role") || tr.querySelector("th.bima-lb"));
    if (th && th.textContent.trim()) return th.textContent.trim();
    var blk = td.closest(".blk");
    if (blk) {
      var nm = blk.querySelector(".ch-head .nm") || blk.querySelector(".bh .nm");
      if (nm) return nm.textContent.trim();
    }
    return "कर्तव्य";
  }

  // ---------- flyer shell -----------------------------------------------------
  function buildFlyer() {
    var overlay = el("div", { class: "flyer-overlay no-print", id: "flyer-overlay", hidden: "hidden" });
    overlay.innerHTML =
      '<div class="flyer-card" role="dialog" aria-modal="true" aria-labelledby="flyer-title">' +
      '  <div class="flyer-header"><h3 id="flyer-title">कर्मचारी निवडा</h3>' +
      '    <button type="button" class="flyer-close" id="flyer-close" aria-label="बंद करा">✕</button></div>' +
      '  <div class="flyer-body" id="flyer-body"></div>' +
      "</div>";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeFlyer(); });
    document.getElementById("flyer-close").addEventListener("click", closeFlyer);
    flyer = overlay;
  }
  function ensureFlyer() { if (!flyer) buildFlyer(); }
  function openFlyerShell(title) {
    ensureFlyer();
    document.getElementById("flyer-title").textContent = title;
    flyer.hidden = false;
    var first = flyer.querySelector("input, button.flyer-close");
    if (first) first.focus();
  }
  function closeFlyer() {
    if (flyer) flyer.hidden = true;
    slotCtx = null;
    busy = false;
  }

  // ---------- staff picker ----------------------------------------------------
  function openStaffPicker(ctx) {
    slotCtx = ctx;
    ensureFlyer();   // shell must exist before we fill #flyer-body
    loadMasters().then(function (m) {
      if (!slotCtx) return;
      var body = document.getElementById("flyer-body");
      var cur = m.staff.find(function (s) { return Number(s.staff_id) === ctx.staffId; });
      var curHtml = ctx.staffId
        ? '<div class="flyer-slot-info" id="slot-info">' + esc(ctx.label) + ": " + esc(ctx.text) + "</div>" +
          '<div id="cur-block">' +
          (cur ? '<p style="font-size:12px; color:#334155; margin:6px 0 4px;">सध्या: <b>' + esc(cur.name_mr) + "</b> (" + esc(rankShort(cur.rank_code)) + (cur.buckle_no ? " " + esc(cur.buckle_no) : "") + ")</p>" : "") +
          '<div class="flyer-actions">' +
          '  <button type="button" class="flyer-btn-ghost" data-act="edit-master">कर्मचाऱ्याची माहिती बदला</button>' +
          '  <button type="button" class="flyer-btn-danger" data-act="clear">रिक्त करा</button>' +
          "</div>" +
          '<label style="font-size:11.5px; display:flex; gap:6px; align-items:center; margin-top:8px; color:#334155;">' +
          '  <input type="checkbox" id="bima-toggle"' + (ctx.isBima ? " checked" : "") + "> बिमा (स्पष्ट निवड — फक्त ह्या नेमणुकीसाठी)</label>" +
          "</div>"
        : '<div class="flyer-slot-info" id="slot-info">' + esc(ctx.label) + ': <span style="color:#b45309;">सध्या रिक्त</span></div>';

      body.innerHTML = curHtml +
        '<div class="flyer-opt" style="cursor:default;">' +
        "  <h4>[१] हजर कर्मचारी निवडा</h4>" +
        "  <p>नाव, इंग्रजी नाव, बकल नंबर किंवा हुद्द्याने शोधा</p>" +
        '  <input type="search" id="staff-search" class="flyer-search" placeholder="🔍 नाव / बकल / हुद्दा..." aria-label="कर्मचारी शोधा">' +
        '  <div class="flyer-list" id="staff-list" role="listbox" aria-label="कर्मचारी यादी"></div>' +
        "</div>" +
        '<div class="flyer-opt" style="cursor:default;">' +
        "  <h4>[२] ➕ नवीन कर्मचारी जोडा</h4>" +
        "  <p>मास्टर रोस्टरमध्ये नवीन नोंद करून तात्काळ नियुक्त करा</p>" +
        '  <div class="flyer-mini-form">' +
        '   <input id="nc-name" placeholder="पूर्ण नाव मराठीत (उदा. पोशि ४५२ पवार)" aria-label="पूर्ण नाव मराठीत">' +
        '   <select id="nc-rank" aria-label="हुद्दा"></select>' +
        '   <input id="nc-buckle" placeholder="बकल नंबर (ऐच्छिक)" aria-label="बकल नंबर">' +
        '   <button type="button" class="flyer-btn-submit" id="nc-submit">सेव्ह व नियुक्त करा</button>' +
        "  </div>" +
        "</div>";

      var rankSel = document.getElementById("nc-rank");
      (m.ranks || []).forEach(function (r) {
        rankSel.appendChild(el("option", { value: r.rank_code }, esc(r.name_mr)));
      });

      document.getElementById("staff-search").addEventListener("input", function (e) {
        renderStaffList(e.target.value);
      });
      document.getElementById("nc-submit").addEventListener("click", quickCreate);
      renderStaffList("");
      openFlyerShell("कर्मचारी निवडा — " + ctx.label);
    });
  }

  function renderStaffList(q) {
    if (!mastersData) return;
    var list = document.getElementById("staff-list");
    if (!list) return;
    var query = (q || "").trim().toLowerCase();
    var active = (mastersData.staff || []).filter(function (s) { return s.active !== false; });
    var matched = active.filter(function (s) {
      if (!query) return true;
      return (s.name_mr && s.name_mr.toLowerCase().indexOf(query) >= 0) ||
        (s.name_en && s.name_en.toLowerCase().indexOf(query) >= 0) ||
        (s.buckle_no && String(s.buckle_no).indexOf(query) >= 0) ||
        (s.rank_code && s.rank_code.toLowerCase().indexOf(query) >= 0) ||
        (s.rank_code && rankShort(s.rank_code).toLowerCase().indexOf(query) >= 0);
    }).slice(0, 40);
    if (!matched.length) {
      list.innerHTML = '<div style="padding:8px; color:#94a3b8; font-size:11px;">कोणताही कर्मचारी सापडला नाही</div>';
      return;
    }
    list.innerHTML = "";
    matched.forEach(function (s) {
      var item = el("div", {
        class: "flyer-item", "data-staff": s.staff_id, role: "option", tabindex: "0",
      }, esc(staffLabel(s)));
      if (slotCtx && Number(s.staff_id) === slotCtx.staffId) item.classList.add("sg-top");
      item.addEventListener("click", function () { assignToSlot(Number(s.staff_id)); });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); assignToSlot(Number(s.staff_id)); }
      });
      list.appendChild(item);
    });
  }

  // ---------- real persistence paths ----------------------------------------
  function patchAssignment(body) {
    if (!slotCtx || busy) return;
    busy = true;
    setBusyButtons("जतन होत आहे...");
    api("/api/charts/" + DATE + "/assignments/" + slotCtx.id, {
      method: "PATCH", body: JSON.stringify(body),
    }).then(function () {
      closeFlyer();
      reloadSoon(400, "✓ जतन झाले — PostgreSQL मध्ये सुरक्षित");
    }).catch(function (e) {
      busy = false;
      setBusyButtons(null);
      toast("जतन अयशस्वी: " + e.message, "err");
    });
  }
  function setBusyButtons(label) {
    document.querySelectorAll("#flyer-body button").forEach(function (b) {
      if (label) { b.disabled = true; if (b.dataset.orig == null) b.dataset.orig = b.textContent; b.textContent = label; }
      else if (b.dataset.orig) { b.disabled = false; b.textContent = b.dataset.orig; }
    });
  }
  function assignToSlot(staffId) { patchAssignment({ staffId: staffId }); }

  function quickCreate() {
    var name = (document.getElementById("nc-name").value || "").trim();
    var rank = document.getElementById("nc-rank").value;
    var buckle = (document.getElementById("nc-buckle").value || "").trim();
    if (!name) { toast("कृपया पूर्ण नाव प्रविष्ट करा", "err"); return; }
    if (!rank) { toast("कृपया हुद्दा निवडा", "err"); return; }
    if (busy) return;
    busy = true;
    setBusyButtons("नोंद होत आहे...");
    api("/api/masters/staff", {
      method: "POST",
      body: JSON.stringify({ name_mr: name, rank_code: rank, buckle_no: buckle || null }),
    }).then(function (r) {
      // same real path as any assignment: the new master's REAL id goes into the slot
      return api("/api/charts/" + DATE + "/assignments/" + slotCtx.id, {
        method: "PATCH", body: JSON.stringify({ staffId: r.staff_id }),
      });
    }).then(function () {
      closeFlyer();
      reloadSoon(400, "✓ नवीन कर्मचारी जोडला व तक्त्यावर नेमला");
    }).catch(function (e) {
      busy = false;
      setBusyButtons(null);
      toast("नोंदणी अयशस्वी: " + e.message, "err");
    });
  }

  function openMasterEdit() {
    if (!slotCtx || !slotCtx.staffId || !mastersData) return;
    var s = mastersData.staff.find(function (x) { return Number(x.staff_id) === slotCtx.staffId; });
    if (!s) { toast("कर्मचारी माहिती सापडली नाही", "err"); return; }
    var host = document.getElementById("cur-block");
    host.innerHTML =
      '<div class="flyer-mini-form" style="margin-top:8px;">' +
      ' <label style="font-size:10.5px; color:#64748b;">नाव (मराठी)*<input id="me-name" value="' + esc(s.name_mr) + '"></label>' +
      ' <label style="font-size:10.5px; color:#64748b;">नाव (इंग्रजी)<input id="me-nameen" value="' + esc(s.name_en || "") + '"></label>' +
      ' <label style="font-size:10.5px; color:#64748b;">बकल नंबर<input id="me-buckle" value="' + esc(s.buckle_no || "") + '"></label>' +
      ' <label style="font-size:10.5px; color:#64748b;">फोन<input id="me-phone" type="tel" value="' + esc(s.phone || "") + '"></label>' +
      ' <div class="flyer-actions"><button type="button" class="flyer-btn-submit" id="me-save">जतन करा</button>' +
      ' <button type="button" class="flyer-btn-ghost" id="me-cancel">परत</button></div>' +
      "</div>";
    document.getElementById("me-cancel").addEventListener("click", function () { openStaffPicker(slotCtx); });
    document.getElementById("me-save").addEventListener("click", function () {
      var nameMr = (document.getElementById("me-name").value || "").trim();
      if (!nameMr) { toast("नाव आवश्यक आहे", "err"); return; }
      busy = true;
      api("/api/masters/staff/" + s.staff_id, {
        method: "PATCH",
        body: JSON.stringify({
          name_mr: nameMr,
          name_en: (document.getElementById("me-nameen").value || "").trim(),
          buckle_no: (document.getElementById("me-buckle").value || "").trim() || null,
          phone: (document.getElementById("me-phone").value || "").trim() || null,
        }),
      }).then(function () {
        closeFlyer();
        reloadSoon(400, "✓ कर्मचारी माहिती अद्ययावत झाली");
      }).catch(function (e) {
        busy = false;
        toast("जतन अयशस्वी: " + e.message, "err");
      });
    });
    document.getElementById("me-name").focus();
  }

  // ---------- add chowki -------------------------------------------------------
  function openAddChowki() {
    if (busy) return;
    ensureFlyer();   // shell must exist before we fill #flyer-body
    busy = true;
    Promise.all([loadMasters(), api("/api/charts/" + DATE)]).then(function (res) {
      busy = false;
      var m = res[0], doc = res[1];
      var present = {};
      (doc.assignments || []).forEach(function (a) {
        if (a.location) present[a.location.locationId] = true;
      });
      var avail = (m.locations || []).filter(function (l) {
        return l.active !== false && (l.kind === "CHOWKI" || l.kind === "MARSHAL_POST") && !present[Number(l.location_id)];
      });
      var body = document.getElementById("flyer-body");
      body.innerHTML =
        '<div class="flyer-slot-info">नवीन चौकी / मार्शल पोस्ट जोडा — डीफॉल्ट रिक्त ओळींसह</div>' +
        '<div class="flyer-opt" style="cursor:default;">' +
        "  <h4>[१] मास्टरमधील चौकी निवडा</h4>" +
        '  <div class="flyer-list" id="chowki-list" style="max-height:200px;"></div>' +
        "</div>" +
        '<div class="flyer-opt" style="cursor:default;">' +
        "  <h4>[२] ➕ नवीन चौकी जोडा (नवीन लोकेशन + ड्युटी)</h4>" +
        '  <div class="flyer-mini-form">' +
        '   <input id="cw-name" placeholder="चौकीचे पूर्ण नाव (मराठीत)" aria-label="चौकीचे नाव">' +
        '   <select id="cw-kind" aria-label="प्रकार"><option value="CHOWKI">चौकी</option><option value="MARSHAL_POST">मार्शल पोस्ट</option></select>' +
        '   <button type="button" class="flyer-btn-submit" id="cw-submit">जोडा</button>' +
        "  </div>" +
        "</div>";
      var list = document.getElementById("chowki-list");
      if (!avail.length) {
        list.innerHTML = '<div style="padding:8px; color:#94a3b8; font-size:11px;">सर्व मास्टर चौक्या या तक्त्यावर आधीच आहेत — खाली नवीन जोडा.</div>';
      } else {
        avail.forEach(function (l) {
          var item = el("div", { class: "flyer-item", tabindex: "0", role: "option" },
            esc(l.name_mr) + ' <span style="color:#94a3b8;">(' + esc(l.kind) + ")</span>");
          var go = function () { addChowki({ locationId: Number(l.location_id) }); };
          item.addEventListener("click", go);
          item.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
          });
          list.appendChild(item);
        });
      }
      document.getElementById("cw-submit").addEventListener("click", function () {
        var name = (document.getElementById("cw-name").value || "").trim();
        if (!name) { toast("कृपया चौकीचे नाव प्रविष्ट करा", "err"); return; }
        addChowki({ nameMr: name, kind: document.getElementById("cw-kind").value });
      });
      openFlyerShell("+ चौकी जोडा");
    }).catch(function (e) {
      busy = false;
      toast("चौकी जोडता आली नाही: " + e.message, "err");
    });
  }
  function addChowki(payload) {
    if (busy) return;
    busy = true;
    api("/api/charts/" + DATE + "/chowki", { method: "POST", body: JSON.stringify(payload) })
      .then(function () {
        closeFlyer();
        reloadSoon(400, "✓ चौकी जोडली — दोन्ही पाळ्यांत रिक्त ओळींसह");
      })
      .catch(function (e) {
        busy = false;
        toast("चौकी जोडता आली नाही: " + e.message, "err");
      });
  }

  // ---------- rename a chart-local display name -------------------------------
  // Every editable name renders with data-label (stable element key) + data-default (its
  // SOURCE text — never the overridden one). Two scopes, per the user's ask: this element
  // only, or everywhere the same default name appears on this chart. Blank = clear the
  // override and fall back to the default. Masters/data are never renamed.
  function openRename(target) {
    if (busy || !isEdit()) return;
    ensureFlyer();
    var key = target.getAttribute("data-label") || "";
    var def = target.getAttribute("data-default") || target.textContent.trim();
    var cur = target.textContent.trim();
    var body = document.getElementById("flyer-body");
    body.innerHTML =
      '<div class="flyer-slot-info">' + esc(cur) + "</div>" +
      '<div class="flyer-opt" style="cursor:default;">' +
      "  <h4>नाव बदला (फक्त नाव — डेटा व हुद्दे असेच राहतील)</h4>" +
      '  <div class="flyer-mini-form">' +
      '   <input id="rn-text" value="' + esc(cur) + '" aria-label="नवीन नाव" placeholder="रिक्त सोडल्यास मूळ नाव परतयेईल">' +
      '   <label class="rn-scope"><input type="radio" name="rn-scope" value="element" checked> फक्त हे — या तक्त्याच्या या ठिकाणी</label>' +
      '   <label class="rn-scope"><input type="radio" name="rn-scope" value="all"> सर्वत्र — जिथे हे मूळ नाव आहे तिथे सर्वत्र बदला</label>' +
      '   <div class="flyer-actions"><button type="button" class="flyer-btn-submit" id="rn-save">जतन करा</button>' +
      '   <button type="button" class="flyer-btn-ghost" id="rn-cancel">रद्द</button></div>' +
      "  </div>" +
      "</div>";
    // pre-select the scope that is ACTUALLY renaming this element right now (data-override)
    // — a blank save with that scope then truly reverts the name instead of doing nothing.
    var ovr = target.getAttribute("data-override");
    var radio = document.querySelector('input[name="rn-scope"][value="' + (ovr === "all" ? "all" : "element") + '"]');
    if (radio) radio.checked = true;
    document.getElementById("rn-cancel").addEventListener("click", closeFlyer);
    document.getElementById("rn-save").addEventListener("click", function () {
      if (busy) return;
      var scopeEl = document.querySelector('input[name="rn-scope"]:checked');
      busy = true;
      api("/api/charts/" + DATE + "/labels", {
        method: "PATCH",
        body: JSON.stringify({
          scope: scopeEl ? scopeEl.value : "element",
          key: key,
          defaultText: def,
          text: (document.getElementById("rn-text").value || "").trim(),
        }),
      }).then(function () {
        closeFlyer();
        reloadSoon(400, "✓ नाव जतन झाले");
      }).catch(function (e) {
        busy = false;
        toast("नाव जतन अयशस्वी: " + e.message, "err");
      });
    });
    openFlyerShell("नाव बदला");
    var inp = document.getElementById("rn-text");
    inp.focus();
    inp.select();
  }

  // ---------- add officer box -------------------------------------------------
  // Mirror of openAddChowki: a label (+ optional heading) → a real box with a रिक्त
  // रायटर seat the clerk fills later. No person, timing or BIMA is ever invented.
  function openAddOfficer() {
    if (busy) return;
    ensureFlyer();
    var body = document.getElementById("flyer-body");
    body.innerHTML =
      '<div class="flyer-slot-info">नवीन अधिकारी बॉक्स — डीफॉल्ट रिक्त रायटर ओळीसह</div>' +
      '<div class="flyer-opt" style="cursor:default;">' +
      "  <h4>[१] बॉक्सचे नाव / शाखा</h4>" +
      '  <div class="flyer-mini-form">' +
      '   <input id="ob-label" placeholder="लेबल (उदा. नवीन शाखा / तपास)" aria-label="बॉक्स लेबल">' +
      '   <input id="ob-title" placeholder="शीर्षक (ऐच्छिक — अधिकार्याचे नाव)" aria-label="शीर्षक">' +
      '   <button type="button" class="flyer-btn-submit" id="ob-submit">जोडा</button>' +
      "  </div>" +
      "</div>";
    document.getElementById("ob-submit").addEventListener("click", function () {
      var label = (document.getElementById("ob-label").value || "").trim();
      if (!label) { toast("कृपया बॉक्सचे नाव प्रविष्ट करा", "err"); return; }
      var title = (document.getElementById("ob-title").value || "").trim();
      if (busy) return;
      busy = true;
      api("/api/charts/" + DATE + "/officer", {
        method: "POST",
        body: JSON.stringify({ labelMr: label, titleMr: title || undefined }),
      }).then(function () {
        closeFlyer();
        reloadSoon(400, "✓ अधिकारी बॉक्स जोडला — रिक्त रायटर ओळीसह");
      }).catch(function (e) {
        busy = false;
        toast("बॉक्स जोडता आला नाही: " + e.message, "err");
      });
    });
    openFlyerShell("+ अधिकारी बॉक्स जोडा");
    document.getElementById("ob-label").focus();
  }

  // ---------- lifecycle -------------------------------------------------------
  function finalizeChart() {
    if (!confirm(DATE + " चा तक्ता अंतिम (Finalize) करायचा? नंतर तो वाचनीय (immutable) होईल.")) return;
    api("/api/charts/" + DATE + "/finalize", { method: "POST" })
      .then(function (r) { reloadSoon(500, "✓ तक्ता अंतिम झाले (आवृत्ती v" + r.versionNo + ")"); })
      .catch(function (e) { toast("अंतिम करणे अयशस्वी: " + e.message, "err"); });
  }
  function reopenChart() {
    if (!confirm("हा तक्ता सुधारणेसाठी पुनः DRAFT करायचा? अंतिम snapshot तरीही जपला जाईल (आधीच्या आवृत्ती).")) return;
    api("/api/charts/" + DATE + "/reopen", { method: "POST" })
      .then(function () { reloadSoon(500, "✓ सुधारणेसाठी पुनः DRAFT केले (snapshot जपला)"); })
      .catch(function (e) { toast("अयशस्वी: " + e.message, "err"); });
  }

  // ---------- events ----------------------------------------------------------
  function onDocumentClick(e) {
    var t = e.target;
    var act = t.closest && t.closest("[data-act]");
    if (act) {
      var a = act.getAttribute("data-act");
      if (a === "edit-master") { openMasterEdit(); return; }
      if (a === "clear") { patchAssignment({ staffId: null }); return; }
    }
    if (t.id === "bima-toggle") return; // change handler below
    var addBtn = t.closest && t.closest(".add-box");
    if (addBtn && !addBtn.disabled) {
      if (addBtn.getAttribute("data-add") === "chowki") openAddChowki();
      else if (addBtn.getAttribute("data-add") === "officer") openAddOfficer();
      return;
    }
    var nameEl = t.closest && t.closest("[data-label]");
    if (nameEl && isEdit()) { openRename(nameEl); return; }
    var slot = t.closest && t.closest("td.slot");
    if (slot && isEdit()) { openStaffPicker(slotContext(slot)); }
  }
  function onDocumentChange(e) {
    if (e.target.id === "bima-toggle" && slotCtx && slotCtx.staffId) {
      patchAssignment({ staffId: slotCtx.staffId, isBima: e.target.checked });
    }
  }
  function onDocumentKeydown(e) {
    if (e.key === "Escape" && flyer && !flyer.hidden) { closeFlyer(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("slot")) {
      if (isEdit()) { e.preventDefault(); openStaffPicker(slotContext(e.target)); }
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.hasAttribute && e.target.hasAttribute("data-label")) {
      if (isEdit()) { e.preventDefault(); openRename(e.target); }
    }
  }

  // ---------- header: date selector -------------------------------------------
  // The date control is chrome (`.no-print`): it only navigates between the chart dates that
  // actually exist in PostgreSQL — no calendar maths, no invented dates.
  var MR_DIGITS = "०१२३४५६७८९";
  function toMrDate(iso) {
    var p = String(iso).slice(0, 10).split("-");
    if (p.length !== 3) return iso;
    var t = function (s) { return String(s).replace(/\d/g, function (d) { return MR_DIGITS[Number(d)]; }); };
    return t(p[2]) + "/" + t(p[1]) + "/" + t(p[0]);
  }
  function initDateMenu() {
    var btn = document.getElementById("date-btn");
    var menu = document.getElementById("date-menu");
    if (!btn || !menu) return;
    var loaded = false;
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    function open() {
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      if (loaded) return;
      api("/api/charts").then(function (list) {
        loaded = true;
        if (!list || !list.length) {
          menu.innerHTML = '<div class="dm-head">कोणताही तक्ता सापडला नाही</div>';
          return;
        }
        menu.innerHTML = '<div class="dm-head">उपलब्ध तक्ते</div>' + list.map(function (c) {
          var cur = c.date === DATE ? " cur" : "";
          return '<div class="dm-item' + cur + '" role="option" tabindex="0" data-date="' + esc(c.date) + '">' +
            "<span>" + esc(toMrDate(c.date)) + '</span><span class="st">' + esc(c.lifecycle) + "</span></div>";
        }).join("");
        menu.querySelectorAll(".dm-item").forEach(function (it) {
          var go = function () { location.href = "/charts/" + it.getAttribute("data-date"); };
          it.addEventListener("click", go);
          it.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
          });
        });
      }).catch(function () {
        menu.innerHTML = '<div class="dm-head">तारखा लोड झाल्या नाहीत</div>';
      });
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    document.addEventListener("click", function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) close(); });
  }

  // ---------- pseudo-login (local only: no password, no server account) --------
  // Who is preparing this chart (तक्ता तयार करणारे हजेरी लेखनिक). The choice lives in this
  // browser only (localStorage) — the chart data in PostgreSQL is never touched, nothing leaves
  // the machine and there is no credential to leak. The buckle number is only asked for ranks
  // that actually carry one (cadre = CONSTABULARY); officers have none.
  var CLERK_KEY = "pd_clerk";
  // Devanagari digits are a display transform only (stored values stay Latin) — same rule as the
  // server renderer, so the header reads exactly like the chart it belongs to (पोशि ५६९, not 569).
  function mrDigits(s) {
    return String(s == null ? "" : s).replace(/\d/g, function (d) { return MR_DIGITS[Number(d)]; });
  }
  function getClerk() {
    try { return JSON.parse(localStorage.getItem(CLERK_KEY) || "null"); } catch (e) { return null; }
  }
  function clerkLabel(c) {
    if (!c) return "लॉगिन";
    return (c.rankShort || c.rankCode || "") +
      (c.buckleNo ? " " + mrDigits(c.buckleNo) : "") + " " + (c.nameMr || "");
  }
  function paintClerk() {
    var el = document.getElementById("ab-user");
    if (!el) return;
    var c = getClerk();
    el.textContent = c ? "लॉगिन: " + clerkLabel(c) : "लॉगिन";
    el.classList.toggle("on", !!c);
    el.title = c
      ? "तक्ता तयार करणारे हजेरी लेखनिक: " + clerkLabel(c)
      : "हजेरी लेखनिक म्हणून लॉगिन करा";
  }
  function setClerk(c) {
    try {
      if (c) localStorage.setItem(CLERK_KEY, JSON.stringify(c));
      else localStorage.removeItem(CLERK_KEY);
    } catch (e) { /* private mode: the chip simply stays signed out */ }
    paintClerk();
  }
  function buckleApplies(rankCode) {
    var r = ((mastersData && mastersData.ranks) || []).find(function (x) { return x.rank_code === rankCode; });
    return !!(r && r.cadre === "CONSTABULARY");
  }
  function openLogin() {
    ensureFlyer();
    busy = true;
    Promise.all([loadMasters(), api("/api/charts/" + DATE)]).then(function (res) {
      busy = false;
      var m = res[0], doc = res[1];
      var cur = getClerk();
      // Candidates = the chart's own हजेरी मास्तर / तयार करणारे हजेरी लेखनिक rows; if the source
      // names none, the clerk picks any active staff member from the master.
      var cands = [];
      (doc.assignments || []).forEach(function (a) {
        if (a.person && (a.dutyCode === "OFFICE_HAZARI_MASTER" || a.roleMr === "हजेरी मास्तर")) cands.push(a.person);
      });
      var seen = {};
      cands = cands.filter(function (p) { if (seen[p.staffId]) return false; seen[p.staffId] = 1; return true; });
      var body = document.getElementById("flyer-body");
      body.innerHTML =
        '<div class="flyer-slot-info">तक्ता तयार करणारे हजेरी लेखनिक — ' + esc(DATE) + "</div>" +
        (cur ? '<p style="font-size:12px; color:#334155; margin:6px 0 4px;">सध्या लॉगिन: <b>' + esc(clerkLabel(cur)) + "</b></p>" : "") +
        '<div class="flyer-opt" style="cursor:default;">' +
        "  <h4>[१] तक्त्यावरील हजेरी लेखनिक निवडा</h4>" +
        '  <div class="flyer-list" id="clerk-list" style="max-height:170px;"></div>' +
        "</div>" +
        '<div class="flyer-opt" style="cursor:default;">' +
        "  <h4>[२] नाव, हुद्दा व बकल नंबर</h4>" +
        '  <div class="flyer-mini-form">' +
        '   <input id="lg-name" placeholder="पूर्ण नाव" aria-label="नाव">' +
        '   <select id="lg-rank" aria-label="हुद्दा"></select>' +
        '   <input id="lg-buckle" placeholder="बकल नंबर" aria-label="बकल नंबर" inputmode="numeric">' +
        '   <button type="button" class="flyer-btn-submit" id="lg-save">लॉगिन करा</button>' +
        (cur ? '   <button type="button" class="flyer-btn-danger" id="lg-out">बाहेर पडा</button>' : "") +
        "  </div>" +
        "</div>";
      var rankSel = document.getElementById("lg-rank");
      (m.ranks || []).forEach(function (r) {
        rankSel.appendChild(el("option", { value: r.rank_code }, esc(r.name_mr)));
      });
      function syncBuckle() {
        var applies = buckleApplies(rankSel.value);
        document.getElementById("lg-buckle").style.display = applies ? "" : "none";
      }
      rankSel.addEventListener("change", syncBuckle);
      function fill(p) {
        document.getElementById("lg-name").value = p.nameMr || "";
        if (p.rankCode) rankSel.value = p.rankCode;
        document.getElementById("lg-buckle").value = p.buckleNo || "";
        syncBuckle();
      }
      var list = document.getElementById("clerk-list");
      if (!cands.length) {
        list.innerHTML = '<div style="padding:8px; color:#94a3b8; font-size:11px;">या तक्त्यावर हजेरी लेखनिक नोंद नाही — खाली नाव भरा.</div>';
      } else {
        cands.forEach(function (p) {
          // compact chart-name form, exactly as the chart prints it (rank + buckle + name)
          var label = mrDigits((p.rankShortFormMr || rankShort(p.rankCode)) +
            (p.buckleNo ? " " + p.buckleNo : "") + " " + (p.nameMr || ""));
          var item = el("div", { class: "flyer-item", tabindex: "0", role: "option" }, esc(label));
          var go = function () { fill(p); };
          item.addEventListener("click", go);
          item.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
          });
          list.appendChild(item);
        });
        fill(cands[0]);
      }
      if (cur) fill(cur);
      syncBuckle();
      var outBtn = document.getElementById("lg-out");
      if (outBtn) outBtn.addEventListener("click", function () { setClerk(null); closeFlyer(); toast("लॉगआउट झाले", "ok"); });
      document.getElementById("lg-save").addEventListener("click", function () {
        var name = (document.getElementById("lg-name").value || "").trim();
        if (!name) { toast("कृपया नाव प्रविष्ट करा", "err"); return; }
        var rc = rankSel.value;
        var buckle = (document.getElementById("lg-buckle").value || "").trim();
        setClerk({
          staffId: null, nameMr: name, rankCode: rc, rankShort: rankShort(rc),
          buckleNo: buckleApplies(rc) ? (buckle || null) : null,
        });
        closeFlyer();
        toast("लॉगिन: " + clerkLabel(getClerk()), "ok");
      });
      openFlyerShell("हजेरी लेखनिक लॉगिन");
    }).catch(function (e) {
      busy = false;
      toast("लॉगिन उघडता आले नाही: " + e.message, "err");
    });
  }

  // ---------- boot ------------------------------------------------------------
  if (!DATE) return; // not a chart page (or static render without server)
  var modeBtn = document.getElementById("mode-btn");
  if (modeBtn) modeBtn.addEventListener("click", function () { setMode(!isEdit()); });
  var finBtn = document.getElementById("finalize-btn");
  if (finBtn) finBtn.addEventListener("click", finalizeChart);
  var amendBtn = document.getElementById("amend-btn");
  if (amendBtn) amendBtn.addEventListener("click", reopenChart);
  initDateMenu();
  paintClerk();
  var userBtn = document.getElementById("ab-user");
  if (userBtn) {
    userBtn.addEventListener("click", function (e) { e.stopPropagation(); openLogin(); });
    loadMasters().then(paintClerk);   // rank short forms for the chip label
  }

  var restored = false;
  try { restored = sessionStorage.getItem("pd_mode") === "edit"; } catch (e) { /* ignore */ }
  if (restored && LIFECYCLE !== "FINALIZED") setMode(true);
  try {
    var pending = sessionStorage.getItem("pd_toast");
    if (pending) {
      sessionStorage.removeItem("pd_toast");
      setTimeout(function () { toast(pending, "ok"); }, 150);
    }
  } catch (e) { /* ignore */ }

  document.addEventListener("click", onDocumentClick);
  document.addEventListener("change", onDocumentChange);
  document.addEventListener("keydown", onDocumentKeydown);
})();
