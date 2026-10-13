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
    // Only declare a JSON body when one is actually sent: Fastify rejects a request that
    // announces application/json with an empty body (it broke every DELETE call).
    if (o.body) o.headers = o.headers || { "Content-Type": "application/json" };
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

  // ---------- EN ⇄ मराठी लिप्यंतर (offline, rule-based, approximate) -----------
  // The clerk types a name in EITHER script and the other field is filled as a suggestion which
  // stays fully editable — nothing is submitted on its own, and no dictionary, key or service is
  // involved (invariant: no chart data leaves the machine). Encoding, shown in every form hint:
  //   aa=आ  ii/ee=ई  uu/oo=ऊ | T=ट D=ड N=ण L=ळ S=ष | r+consonant = र् | n/m+consonant = ं | wa=वा
  var TR_VOWELS = [
    ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ou", "औ", "ौ"],
    ["ee", "ई", "ी"], ["ii", "ई", "ी"], ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
    ["A", "आ", "ा"], ["I", "ई", "ी"], ["U", "ऊ", "ू"],
    ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"],
    ["o", "ओ", "ो"], ["R", "ऋ", "ृ"],
  ];
  var TR_CONSONANTS = [
    ["wa", "वा"], ["kshh", "क्ष"], ["ksh", "क्ष"], ["shri", "श्री"],
    ["dny", "ज्ञ"], ["jny", "ज्ञ"], ["chh", "छ"], ["C", "छ"], ["kh", "ख"], ["gh", "घ"],
    ["ch", "च"], ["jh", "झ"], ["Th", "ठ"], ["Dh", "ढ"], ["th", "थ"], ["dh", "ध"],
    ["ph", "फ"], ["bh", "भ"], ["sh", "श"], ["Sh", "ष"], ["S", "ष"], ["ny", "ञ"],
    ["ng", "ंग"], ["T", "ट"], ["D", "ड"], ["N", "ण"], ["L", "ळ"],
    ["k", "क"], ["g", "ग"], ["j", "ज"], ["t", "त"], ["d", "द"], ["n", "न"],
    ["p", "प"], ["f", "फ"], ["b", "ब"], ["m", "म"], ["y", "य"], ["r", "र"],
    ["l", "ल"], ["v", "व"], ["w", "व"], ["s", "स"], ["h", "ह"],
  ];
  function trMatch(table, s, i) {
    for (var k = 0; k < table.length; k++) {
      var t = table[k];
      if (s.substr(i, t[0].length) === t[0]) return { len: t[0].length, val: t[1], matra: t[2] };
    }
    return null;
  }
  function trConsonant(table, s, i) {
    for (var k = 0; k < table.length; k++) {
      if (s.substr(i, table[k][0].length) === table[k][0]) return { len: table[k][0].length, val: table[k][1] };
    }
    return null;
  }
  // A capital letter at the START of a word is just capitalisation (Patil → पतिल, Deshmukh →
  // देशमुख); a capital INSIDE a word is the retroflex marker the hint documents (paTil → पटिल,
  // gaNesh → गणेश, saaLunkhe → साळुंखे). Without this, “Patil” became “Pअतिल” and “Deshmukh”
  // became डेशमुख — found live 2026-10-13.
  function trNormalize(input) {
    var s = String(input || "");
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var prev = i > 0 ? s.charAt(i - 1) : "";
      out += (!/[A-Za-z]/.test(prev) && /[A-Z]/.test(ch)) ? ch.toLowerCase() : ch;
    }
    return out;
  }
  function romanToDev(input) {
    var s = trNormalize(input);
    var out = "";
    var i = 0;
    while (i < s.length) {
      var ch = s.charAt(i);
      if (!/[A-Za-z]/.test(ch)) { out += ch; i += 1; continue; }
      var c = trConsonant(TR_CONSONANTS, s, i);
      if (c) {
        i += c.len;
        var v = trMatch(TR_VOWELS, s, i);
        if (v) { out += c.val + v.matra; i += v.len; continue; }   // consonant + matra
        var next = s.charAt(i);
        if (!/[A-Za-z]/.test(next)) { out += c.val; continue; }    // word-final: inherent अ
        // न / म before another consonant is the anusvara (shinde → शिंदे, saLunkhe → साळुंखे),
        // decided BEFORE the consonant is written — otherwise the letter leaks through.
        if (c.val === "न" || c.val === "म") { out += "ं"; continue; }
        // A vowel-less ‘r’ right after a ONE-LETTER consonant is the repha (pra→प्र, kra→क्र,
        // tri→त्र). In “para” the ‘a’ between p and r was already consumed as that consonant's
        // matra, so “para” stays पर; “wa” (वा) already carries its own vowel, so “pawar” = पवार.
        if (next === "r" && c.len === 1 && c.val !== "र") { out += c.val + "्"; continue; }
        if (c.val === "र") { out += "र्"; continue; }
        out += c.val;                                              // bare consonant = inherent अ
        continue;
      }
      var v2 = trMatch(TR_VOWELS, s, i);
      if (v2) { out += v2.val; i += v2.len; continue; }
      out += ch;
      i += 1;
    }
    return out;
  }
  var DEV_CONS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng", "च": "ch", "छ": "chh",
    "ज": "j", "झ": "jh", "ञ": "ny", "ट": "T", "ठ": "Th", "ड": "D", "ढ": "Dh",
    "ण": "N", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p",
    "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l",
    "व": "v", "श": "sh", "ष": "Sh", "स": "s", "ह": "h", "ळ": "L", "क़": "q",
    "क्ष": "ksh", "ज्ञ": "dny", "श्री": "shri",
  };
  var DEV_MATRA = {
    "ा": "aa", "ि": "i", "ी": "ii", "ु": "u", "ू": "uu", "ृ": "R", "े": "e",
    "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ँ": "n", "ः": "h", "्": "",
  };
  var DEV_INDEP = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ii", "उ": "u", "ऊ": "uu", "ऋ": "R",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o",
  };
  function devToRoman(input) {
    var s = String(input || "");
    var out = "";
    var i = 0;
    while (i < s.length) {
      var two = s.substr(i, 2);
      var ch = s.charAt(i);
      if (DEV_CONS[two]) { out += DEV_CONS[two]; i += 2; continue; }
      if (DEV_CONS[ch]) {
        out += DEV_CONS[ch];
        i += 1;
        var m = DEV_MATRA[s.charAt(i)];
        if (m !== undefined) { out += m; i += 1; continue; }
        out += (i >= s.length) ? "" : "a";                  // inherent अ, dropped at word end
        continue;
      }
      if (DEV_INDEP[ch] !== undefined) { out += DEV_INDEP[ch]; i += 1; continue; }
      if (DEV_MATRA[ch] !== undefined) { out += DEV_MATRA[ch]; i += 1; continue; }
      out += ch;
      i += 1;
    }
    return out;
  }
  // TWO fields, either script, live both ways — but the field the clerk touched by hand always
  // wins: once they edit Marathi themselves the English field stops overwriting it (and vice
  // versa), so the aid can never fight the person entering the name.
  function bindTranslit(mrEl, enEl) {
    if (!mrEl || !enEl) return;
    var mrManual = false, enManual = false;
    mrEl.addEventListener("input", function () {
      mrManual = true;
      if (enManual) return;
      enEl.value = devToRoman(mrEl.value);
    });
    enEl.addEventListener("input", function () {
      enManual = true;
      if (mrManual) return;
      mrEl.value = romanToDev(enEl.value);
    });
  }

  // ---------- edit mode -------------------------------------------------------
  function isEdit() { return document.body.classList.contains("mode-edit"); }
  function setMode(on) {
    document.body.classList.toggle("mode-edit", on);
    try { sessionStorage.setItem("pd_mode", on ? "edit" : "preview"); } catch (e) { /* private mode */ }
    var btn = document.getElementById("mode-btn");
    // ONE language at a time, no emoji — the label swaps through the same [data-lang] rule as
    // the rest of the chrome (user correction 2026-10-13).
    if (btn) {
      btn.innerHTML = on
        ? '<span data-lang="mr">पूर्वावलोकन</span><span data-lang="en">Preview</span>'
        : '<span data-lang="mr">संपादन</span><span data-lang="en">Edit</span>';
    }
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
    // the Sr-PI card has no `.blk` heading — its group label (रायटर: / चालक: / …) names the seat
    var grp = td.closest(".grp");
    if (grp) {
      var glb = grp.querySelector(".lb");
      if (glb && glb.textContent.trim()) return glb.textContent.trim();
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
        '   <input id="nc-nameen" placeholder="Full name in English — auto-converts to Marathi" aria-label="पूर्ण नाव इंग्रजीत">' +
        '   <p class="tr-hint">इंग्रजीत टाइप करा → मराठी आपोआप भरते. ट/ड/ण/ळ साठी T/D/N/L, आ साठी aa.</p>' +
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
      bindTranslit(document.getElementById("nc-name"), document.getElementById("nc-nameen"));
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
    var nameEn = (document.getElementById("nc-nameen").value || "").trim();
    var rank = document.getElementById("nc-rank").value;
    var buckle = (document.getElementById("nc-buckle").value || "").trim();
    if (!name && nameEn) name = romanToDev(nameEn);   // typed English only → the Marathi name
    if (!name) { toast("कृपया पूर्ण नाव प्रविष्ट करा", "err"); return; }
    if (!rank) { toast("कृपया हुद्दा निवडा", "err"); return; }
    if (busy) return;
    busy = true;
    setBusyButtons("नोंद होत आहे...");
    api("/api/masters/staff", {
      method: "POST",
      // both scripts are stored (the picker already searches name_mr AND name_en)
      body: JSON.stringify({ name_mr: name, name_en: nameEn || devToRoman(name), rank_code: rank, buckle_no: buckle || null }),
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
      ' <p class="tr-hint">एकीकडे टाइप करा → दुसरीकडे आपोआप भरते (T=ट, D=ड, N=ण, L=ळ, aa=आ)</p>' +
      ' <label style="font-size:10.5px; color:#64748b;">बकल नंबर<input id="me-buckle" value="' + esc(s.buckle_no || "") + '"></label>' +
      ' <label style="font-size:10.5px; color:#64748b;">फोन<input id="me-phone" type="tel" value="' + esc(s.phone || "") + '"></label>' +
      ' <div class="flyer-actions"><button type="button" class="flyer-btn-submit" id="me-save">जतन करा</button>' +
      ' <button type="button" class="flyer-btn-ghost" id="me-cancel">परत</button></div>' +
      "</div>";
    bindTranslit(document.getElementById("me-name"), document.getElementById("me-nameen"));
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
      "</div>" +
      // Layout controls live WHERE the element is edited (user 2026-10-13: drop the standalone
      // लेआउट button — it only worked with edit mode on and could not be left). Align, compact,
      // hide and a one-tap revert, all for the element you just clicked.
      (target.hasAttribute("data-presentation") ? pvSectionHtml(target) : "");
    wirePvControls(body, key);
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

  // ---------- remove a clerk-added box / block --------------------------------
  // The undo of `+ अधिकारी बॉक्स` and `+ चौकी जोडा`. Confirmed first, because it deletes the
  // block's own (empty) rows from THIS chart — the master location/duty and the source chart
  // are untouched. The server refuses when a person is assigned in the block (409) or when
  // another block's चार्ज points at the chowki (409); those messages surface in the toast.
  function removeOfficerBox(label) {
    if (busy || !label) return;
    if (!confirm('अधिकारी बॉक्स "' + label + '" काढायचा?\n\nयातील रिक्त जागा या तक्त्यावरून वजा होतील. मास्टर डेटा सुरक्षित राहील.')) return;
    busy = true;
    api("/api/charts/" + DATE + "/officer/" + encodeURIComponent(label), { method: "DELETE" })
      .then(function () { closeFlyer(); reloadSoon(400, "✓ बॉक्स काढला"); })
      .catch(function (e) { busy = false; toast("बॉक्स काढता आला नाही: " + e.message, "err"); });
  }
  function removeChowkiBox(locationId) {
    if (busy || !locationId) return;
    if (!confirm("ही चौकी काढायची?\n\nतिच्या रिक्त ओळी व तिच्या बंद/चार्ज नोंदी या तक्त्यावरून वजा होतील. मास्टर लोकेशन सुरक्षित राहील.")) return;
    busy = true;
    api("/api/charts/" + DATE + "/chowki/" + encodeURIComponent(locationId), { method: "DELETE" })
      .then(function () { closeFlyer(); reloadSoon(400, "✓ चौकी काढली"); })
      .catch(function (e) { busy = false; toast("चौकी काढता आली नाही: " + e.message, "err"); });
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
    // Sr-PI support seat: `+ जागा` creates a real VACANT_RIKT row, ✕ removes it again. The
    // server refuses both when the chart is FINALIZED and when a person is in the seat.
    var seatAdd = t.closest && t.closest("[data-add-seat]");
    if (seatAdd) {
      if (!isEdit() || busy) return;
      busy = true;
      api("/api/charts/" + DATE + "/support", {
        method: "POST",
        body: JSON.stringify({ role: seatAdd.getAttribute("data-add-seat"), shift: seatAdd.getAttribute("data-shift") }),
      }).then(function () { busy = false; reloadSoon(400, "✓ जागा तयार झाली — आता नेमा"); })
        .catch(function (e) { busy = false; toast("जागा तयार झाली नाही: " + e.message, "err"); });
      return;
    }
    var seatDel = t.closest && t.closest("[data-del-seat]");
    if (seatDel) {
      if (!isEdit() || busy) return;
      if (!confirm("ही जागा काढायची?\n\nजर तिवर कर्मचारी नेमला असेल तर आधी ती जागा रिक्त करा.")) return;
      busy = true;
      api("/api/charts/" + DATE + "/support/" + encodeURIComponent(seatDel.getAttribute("data-del-seat")), { method: "DELETE" })
        .then(function () { busy = false; reloadSoon(400, "✓ जागा काढली"); })
        .catch(function (e) { busy = false; toast("जागा काढता आली नाही: " + e.message, "err"); });
      return;
    }
    var delBtn = t.closest && t.closest("[data-box-del]");
    if (delBtn) {
      if (!isEdit()) return;   // the control is rendered only in edit mode; never act outside it
      if (delBtn.getAttribute("data-box-del") === "officer") {
        removeOfficerBox(delBtn.getAttribute("data-box-label"));
      } else {
        removeChowkiBox(delBtn.getAttribute("data-location-id"));
      }
      return;
    }
    var addBtn = t.closest && t.closest(".add-box");
    if (addBtn && !addBtn.disabled) {
      if (addBtn.getAttribute("data-add") === "chowki") openAddChowki();
      else if (addBtn.getAttribute("data-add") === "officer") openAddOfficer();
      return;
    }
    // Priority: a SEAT is more specific than the group label around it. Checking [data-label]
    // first made every seat inside a labelled group (e.g. the Sr-PI card's रायटर, whose group
    // carries data-label="support.srpi.writer") open the RENAME flyer instead of the staff
    // picker — the seat became unreachable in edit mode (found live 2026-10-13). Labels that are
    // not seats still rename, and a group label is renameable by clicking its own text.
    var slot = t.closest && t.closest(".slot");
    if (slot && isEdit()) { openStaffPicker(slotContext(slot)); return; }
    var nameEl = t.closest && t.closest("[data-label]");
    if (nameEl && isEdit()) { openRename(nameEl); }
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
        // Grouped the way a clerk thinks about dates (Kushal/Arjish picker grammar): आज, उद्या,
        // मागील ७ दिवस, then the older charts. Only dates that really exist are links — an empty
        // group says so instead of offering a dead date.
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var dayMs = 86400000;
        var groups = [
          { key: "today", head: "आज", items: [] },
          { key: "tmrw", head: "उद्या", items: [] },
          { key: "week", head: "मागील ७ दिवस", items: [] },
          { key: "old", head: "जुने तक्ते (संदर्भासाठी)", items: [] },
        ];
        list.forEach(function (c) {
          var d = new Date(c.date + "T00:00:00");
          var back = Math.round((today - d) / dayMs);
          var g = back === 0 ? groups[0] : back === -1 ? groups[1] : (back >= 1 && back <= 7) ? groups[2] : groups[3];
          g.items.push(c);
        });
        menu.innerHTML = groups.map(function (g) {
          var body = g.items.length
            ? g.items.map(function (c) {
              var cur = c.date === DATE ? " cur" : "";
          return '<div class="dm-item' + cur + '" role="option" tabindex="0" data-date="' + esc(c.date) + '">' +
            '<span><span data-lang="mr">' + esc(toMrDate(c.date)) + '</span><span data-lang="en">' + esc(c.date.split("-").reverse().join("/")) + '</span></span>' +
            '<span class="st">' + esc(c.lifecycle) + "</span></div>";
            }).join("")
            : '<div class="dm-none">तक्ता नाही</div>';
          return '<div class="dm-head">' + esc(g.head) + "</div>" + body;
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

  // ---------- header: language toggle + grouped nav ---------------------------
  // One UI language at a time: the markup ships both, CSS shows one, the choice persists in
  // localStorage. The CHART itself is police data and always prints Marathi — this only
  // switches the application chrome, never a rendered chart value.
  function applyLang(mode) {
    var en = mode === "en";
    document.body.classList.toggle("lang-en", en);
    document.body.classList.toggle("lang-mr", !en);
    try { localStorage.setItem("pd_lang", en ? "en" : "mr"); } catch (e) { /* private mode */ }
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang-set]"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-lang-set") === (en ? "en" : "mr"));
    });
  }
  function initLang() {
    var saved = "mr";
    try { saved = localStorage.getItem("pd_lang") || "mr"; } catch (e) { /* private mode */ }
    applyLang(saved);
  }
  function initNav() {
    document.addEventListener("click", function (e) {
      var langBtn = e.target.closest && e.target.closest("[data-lang-set]");
      if (langBtn) { applyLang(langBtn.getAttribute("data-lang-set")); return; }
      // Anything not built yet is VISIBLE and explorable, but says so honestly instead of
      // pretending to work (never a half-usable control, never a silent dead link).
      var wip = e.target.closest && e.target.closest("[data-wip]");
      if (wip) {
        e.preventDefault();
        openWip(wip.getAttribute("data-wip"));
        return;
      }
      // Master data is REAL and already in the database (ranks, staff, chowkis, duties, units) —
      // so the menu opens the actual rows instead of a "coming soon" badge (user 2026-10-13).
      var masters = e.target.closest && e.target.closest("[data-masters]");
      if (masters) {
        e.preventDefault();
        openMasters();
        return;
      }
      var legacy = e.target.closest && e.target.closest("[data-legacy]");
      if (legacy) {
        e.preventDefault();
        openLegacy();
        return;
      }
      var groupBtn = e.target.closest && e.target.closest(".ab-gbtn");
      var openGroups = document.querySelectorAll(".ab-group.open");
      if (groupBtn) {
        var wasOpen = groupBtn.parentNode.classList.contains("open");
        Array.prototype.forEach.call(openGroups, function (g) {
          g.classList.remove("open");
          g.querySelector(".ab-gbtn").setAttribute("aria-expanded", "false");
        });
        if (!wasOpen) {
          groupBtn.parentNode.classList.add("open");
          groupBtn.setAttribute("aria-expanded", "true");
        }
        return;
      }
      if (!(e.target.closest && e.target.closest(".ab-group"))) {
        Array.prototype.forEach.call(openGroups, function (g) { g.classList.remove("open"); });
      }
    });
  }

  // ---------- presentation controls (align / hide / compact) --------------------
  // The server contract shipped first (PATCH /api/charts/:date/presentation + ~190 elements
  // carrying data-presentation). The controls now live INSIDE the element's own edit flyer — no
  // floating mode, no standalone button (user correction 2026-10-13: the लेआउट button only worked
  // with edit mode on and could not be left). Hidden elements are listed in a restore bar for as
  // long as edit mode is on, so hiding is never a one-way door.
  var pvKey = null;
  function closePvPanel() { var p = document.getElementById("pv-panel"); if (p) p.remove(); }
  function pvPatch(body) {
    if (busy) return;
    busy = true;
    api("/api/charts/" + DATE + "/presentation", { method: "PATCH", body: JSON.stringify(body) })
      .then(function () { busy = false; closePvPanel(); closeFlyer(); reloadSoon(400, "✓ स्वरूप जतन झाला"); })
      .catch(function (e) { busy = false; toast("स्वरूप जतन अयशस्वी: " + e.message, "err"); });
  }
  function pvRowsHtml(el) {
    var h = el.getAttribute("data-horizontal-align") || "";
    var v = el.getAttribute("data-vertical-align") || "";
    var compact = el.getAttribute("data-compact") === "true";
    var row = function (field, list, cur) {
      return '<div class="pv-row" data-pv-field="' + field + '">' + list.map(function (o) {
        return '<button type="button" class="pv-b' + (cur === o[0] ? " on" : "") + '" data-pv-val="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    };
    return row("horizontalAlign", [["left", "डावी"], ["center", "मध्ये"], ["right", "उजवी"]], h)
      + row("verticalAlign", [["top", "वर"], ["middle", "मध्ये"], ["bottom", "खाली"]], v)
      + '<div class="pv-row">'
      + '<button type="button" class="pv-b' + (compact ? " on" : "") + '" data-pv-flag="compact">कॉम्पॅक्ट</button>'
      + '<button type="button" class="pv-b" data-pv-flag="hidden">लपवा</button>'
      + '<button type="button" class="pv-b pv-clear" data-pv-clear="1">पूर्ववत करा</button></div>';
  }
  function pvSectionHtml(el) {
    return '<div class="flyer-opt" style="cursor:default;">'
      + "<h4>स्वरूप — स्थान, कॉम्पॅक्टनेस व लपवणे</h4>"
      + '<div class="pv-block" data-pv-for="' + esc(el.getAttribute("data-presentation") || "") + '">'
      + pvRowsHtml(el) + "</div></div>";
  }
  function wirePvControls(scope, key) {
    var block = scope.querySelector("[data-pv-for]");
    if (!block) return;
    block.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".pv-b");
      if (!b) return;
      e.preventDefault();
      if (b.hasAttribute("data-pv-clear")) {
        pvPatch({ key: key, horizontalAlign: null, verticalAlign: null, hidden: null, compact: null });
      } else if (b.hasAttribute("data-pv-val")) {
        var patch = { key: key };
        patch[b.parentNode.getAttribute("data-pv-field")] = b.getAttribute("data-pv-val");
        pvPatch(patch);
      } else {
        var p2 = { key: key };
        p2[b.getAttribute("data-pv-flag")] = true;
        pvPatch(p2);
      }
    });
  }
  function renderHiddenBar() {
    var old = document.getElementById("pv-hidden");
    if (old) old.remove();
    api("/api/charts/" + DATE).then(function (doc) {
      if (!isEdit()) return;
      var ov = (doc.template && doc.template.overrides && doc.template.overrides.elements) || {};
      var hidden = Object.keys(ov).filter(function (k) { return ov[k] && ov[k].hidden === true; });
      if (!hidden.length) return;
      var bar = document.createElement("div");
      bar.id = "pv-hidden";
      bar.innerHTML = '<span class="pvh-t">लपवलेले घटक</span>' + hidden.map(function (k) {
        return '<button type="button" class="pv-b" data-pv-show="' + esc(k) + '" title="परत दाखवा">' + esc(k) + '</button>';
      }).join("");
      document.body.appendChild(bar);
    }).catch(function () { /* chrome only — never blocks the chart */ });
  }
  function openPvPanel(el) {
    closePvPanel();
    pvKey = el.getAttribute("data-presentation");
    if (!pvKey) return;
    var h = el.getAttribute("data-horizontal-align") || "";
    var v = el.getAttribute("data-vertical-align") || "";
    var compact = el.getAttribute("data-compact") === "true";
    var row = function (field, list, cur) {
      return '<div class="pv-row" data-pv-field="' + field + '">' + list.map(function (o) {
        return '<button type="button" class="pv-b' + (cur === o[0] ? " on" : "") + '" data-pv-val="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    };
    var p = document.createElement("div");
    p.id = "pv-panel";
    p.innerHTML = '<div class="pv-t">स्वरूप</div><div class="pv-k">' + esc(pvKey) + "</div>"
      + row("horizontalAlign", [["left", "डावी"], ["center", "मध्ये"], ["right", "उजवी"]], h)
      + row("verticalAlign", [["top", "वर"], ["middle", "मध्ये"], ["bottom", "खाली"]], v)
      + '<div class="pv-row">'
      + '<button type="button" class="pv-b" data-pv-flag="hidden">लपवा</button>'
      + '<button type="button" class="pv-b' + (compact ? " on" : "") + '" data-pv-flag="compact">कॉम्पॅक्ट</button>'
      + '<button type="button" class="pv-b pv-x" data-pv-close="1">✕</button></div>';
    document.body.appendChild(p);
    var r = el.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(window.innerWidth - 248, r.left)) + "px";
    p.style.top = Math.round(r.bottom + window.pageYOffset + 6) + "px";
  }
  function initPresentation() {
    // The restore bar follows edit mode — there is no separate layout mode any more.
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function () {
      if (document.body.classList.contains("mode-edit")) renderHiddenBar();
      else { var b = document.getElementById("pv-hidden"); if (b) b.remove(); }
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    if (document.body.classList.contains("mode-edit")) renderHiddenBar();
    document.addEventListener("click", function (e) {
      var show = e.target.closest && e.target.closest("[data-pv-show]");
      if (!show) return;
      e.stopPropagation();
      pvPatch({ key: show.getAttribute("data-pv-show"), hidden: null });
    });
  }

  // ---------- master data (REAL rows, read-only) -------------------------------
  // The station already HAS this data — ranks, staff, chowkis, duties, units — so the menu shows
  // the actual rows instead of a "coming soon" badge (user 2026-10-13: "at least what is in our
  // master data or DB currently should be visible"). Editing/creating new masters beyond the
  // staff the assignment flow already creates stays a labelled WIP item; nothing here writes.
  function openMasters() {
    if (busy) return;
    ensureFlyer();
    var body = document.getElementById("flyer-body");
    body.innerHTML = '<div class="flyer-slot-info">डेटाबेसमधील प्रत्यक्ष नोंदी — फक्त पाहण्यासाठी</div>'
      + '<div class="flyer-opt" style="cursor:default;"><div id="md-out">लोड होत आहे…</div></div>';
    openFlyerShell("मास्टर डेटा");
    loadMasters().then(function (m) {
      var out = document.getElementById("md-out");
      if (!out) return;
      var staffRows = (m.staff || []).map(function (s) {
        return '<tr data-md-name="' + esc((s.name_mr || "") + " " + (s.name_en || "") + " " + (s.buckle_no || "")) + '">'
          + '<td>' + esc(rankShort(s.rank_code)) + '</td>'
          + '<td>' + esc(s.buckle_no || "—") + '</td>'
          + '<td>' + esc(s.name_mr || "") + (s.name_en ? ' <span class="md-en">' + esc(s.name_en) + "</span>" : "")
          + (s.active === false ? ' <span class="md-off">निष्क्रिय</span>' : "") + "</td></tr>";
      }).join("");
      out.innerHTML =
        '<div class="md-counts">'
        + '<span>कर्मचारी <b>' + (m.staff || []).length + '</b></span>'
        + '<span>चौक्या/ठिकाणे <b>' + (m.locations || []).length + '</b></span>'
        + '<span>कर्तव्ये <b>' + (m.duties || []).length + '</b></span>'
        + '<span>हुद्दे <b>' + (m.ranks || []).length + '</b></span>'
        + '<span>घटक <b>' + (m.units || []).length + '</b></span></div>'
        + '<h4>कर्मचारी मास्टर</h4>'
        + '<input type="search" id="md-search" class="flyer-search" placeholder="नाव / बकल / हुद्दा शोधा" aria-label="मास्टर डेटा शोधा">'
        + '<div class="md-scroll"><table class="md-tbl"><thead><tr><th>हुद्दा</th><th>बकल</th><th>नाव</th></tr></thead><tbody id="md-staff">' + staffRows + "</tbody></table></div>"
        + '<h4>चौक्या व ठिकाणे</h4>'
        + '<div class="md-tags">' + (m.locations || []).map(function (l) {
          return '<span class="md-tag">' + esc(l.name_mr) + " <i>" + esc(l.kind || "") + "</i></span>";
        }).join("") + "</div>"
        + '<h4>कर्तव्ये</h4>'
        + '<div class="md-tags">' + (m.duties || []).map(function (d) {
          return '<span class="md-tag">' + esc(d.title_mr) + " <i>" + esc(d.duty_code) + "</i></span>";
        }).join("") + "</div>"
        + '<p class="wip-note">हे सगळे डेटाबेसमधील खरे मास्टर आहेत (PostgreSQL). नवीन नोंदी जोडणे, OCR/दस्तऐवज आयात व मास्टर संपादनाची पूर्ण पाने अजून तयार नाहीत — तोपर्यंत ती कर्मचारी निवडण्याच्या ठिकाणी (नवीन कर्मचारी जोडा / माहिती बदला) आणि याच पडद्यावर वाचता येतात.</p>';
      var search = document.getElementById("md-search");
      search.addEventListener("input", function () {
        var q = search.value.trim().toLowerCase();
        var rows = document.querySelectorAll("#md-staff tr");
        Array.prototype.forEach.call(rows, function (r) {
          var hay = (r.getAttribute("data-md-name") || "").toLowerCase();
          r.hidden = q !== "" && hay.indexOf(q) < 0;
        });
      });
    });
  }

  // ---------- legacy six-page chart (Kushal's repo) — a separate local app -------
  // User 2026-10-13: the legacy chart is the ACTUAL six-page chart implemented in Kushal's repo
  // (src/web/Page1View…Page6View.tsx), not a design mock. That app has its own database
  // (panchavati_dev), its own API shape and root-absolute assets, so it is shown in its own tab
  // at its own origin instead of being re-implemented or proxied (a proxy would render a broken
  // shell). `npm run legacy:start` starts it; this flyer probes it first and says plainly when it
  // is not running — never a dead link and never a pretend chart.
  // Same-origin by design: the server's /legacy/<date> route redirects to the legacy app (which
  // keeps :3101 because this repo's own chart server owns :3100). No absolute URL in the browser
  // code — that is both the local-only invariant and one fewer thing to get wrong.
  var LEGACY_URL = "/legacy/" + DATE;
  function legacyProbe(cb) {
    var done = false;
    var finish = function (up) { if (!done) { done = true; cb(up); } };
    setTimeout(function () { finish(false); }, 2500);
    // opaque no-cors request: resolves when SOMETHING answers, rejects when nothing is listening.
    try {
      fetch(LEGACY_URL, { mode: "no-cors", cache: "no-store" })
        .then(function () { finish(true); }, function () { finish(false); });
    } catch (e) { finish(false); }
  }
  function openLegacy() {
    ensureFlyer();
    var body = document.getElementById("flyer-body");
    body.innerHTML = '<div class="flyer-slot-info">जुना ६-पृष्ठ तक्ता — १० सप्टेंबर २०२६</div>'
      + '<div class="flyer-opt" style="cursor:default;">'
      + "<h4>स्वतंत्र संदर्भ अ‍ॅप (स्वतःचा डेटाबेस)</h4>"
      + '<p class="wip-note">हा डिसेंबर-आधीचा सहा-पृष्ठ तक्ता आहे — स्वतंत्र अ‍ॅप, स्वतंत्र डेटाबेस (panchavati_dev) व स्वतःचे API. तुलनेसाठी इथेच उघडतो; याचे बदल या तक्त्यावर परिणाम करत नाहीत.</p>'
      + '<div id="lg-status" class="lg-status">तपासत आहे…</div>'
      + '<div id="lg-body"></div></div>';
    openFlyerShell("जुना ६-पृष्ठ तक्ता");
    var paint = function (up) {
      var st = document.getElementById("lg-status");
      var host = document.getElementById("lg-body");
      if (!st || !host) return;
      if (up) {
        st.className = "lg-status on";
        st.textContent = "चालू आहे — जुना अ‍ॅप (पोर्ट ३१०१) उत्तर देत आहे";
        host.innerHTML = '<div class="lg-actions"><button type="button" class="flyer-btn-submit" id="lg-open">नवीन टॅबमध्ये उघडा</button></div>'
          + '<iframe id="lg-frame" class="lg-frame" src="' + esc(LEGACY_URL) + '" title="जुना ६-पृष्ठ तक्ता" loading="lazy"></iframe>';
        document.getElementById("lg-open").addEventListener("click", function () {
          window.open(LEGACY_URL, "_blank", "noopener");
        });
      } else {
        st.className = "lg-status off";
        st.textContent = "बंद आहे — सध्या चालू नाही";
        host.innerHTML = '<p class="wip-note">उघडण्यासाठी टर्मिनलमध्ये एकदा चालवा:</p>'
          + '<p class="lg-cmd">npm run legacy:start</p>'
          + '<div class="lg-actions"><button type="button" class="flyer-btn-ghost" id="lg-retry">पुन्हा तपासा</button></div>';
        document.getElementById("lg-retry").addEventListener("click", function () {
          st.className = "lg-status";
          st.textContent = "तपासत आहे…";
          host.innerHTML = "";
          legacyProbe(paint);
        });
      }
    };
    legacyProbe(paint);
  }

  // ---------- WIP leaves: visible AND explorable ------------------------------
  // A planned feature opens its own honest placeholder page (never a dead link, never a
  // half-usable control). It says plainly that the feature is not built yet and what it will
  // hold, so the older Arjish/Kushal pages stay discoverable exactly as the user asked.
  function openWip(name) {
    ensureFlyer();
    document.getElementById("flyer-body").innerHTML =
      '<div class="flyer-slot-info"><span data-lang="mr">' + esc(name) + ' — येणारे वैशिष्ट्य</span><span data-lang="en">' + esc(name) + ' — planned feature</span></div>' +
      '<div class="flyer-opt" style="cursor:default;">' +
      '  <h4><span data-lang="mr">सध्याची स्थिती</span><span data-lang="en">Current status</span></h4>' +
      '  <p class="wip-note"><span data-lang="mr">हे वैशिष्ट्य अजून तयार नाही. मेनूमध्ये दिले आहे म्हणूनच पाहता येते — बिना तयार असलेल्या पानावर क्लिक करून काम चालू करता येणार नाही.</span><span data-lang="en">This feature is not built yet. It is listed so you can see what is planned — clicking a page that does not exist will never start work.</span></p>' +
      '  <p class="wip-note"><span data-lang="mr"><b>प्लॅन:</b> तक्ता पाहणे व बदल जतन, कर्मचारी/चौक्या/हुद्द्यांचा मास्टर डेटा, जुन्या तक्त्यांचा संदर्भ व प्रतवारी, OCR आयात, व WhatsApp/Telegram शेअरिंग — सर्व केवळ स्थानिक डेटावर, कोणताही बाहेरील कॉल नाही.</b></span><span data-lang="en"><b>Planned:</b> chart viewing and saving edits, master data for staff/chowkis/duties, historical reference and comparison, OCR import, and WhatsApp/Telegram sharing — all local only, no external calls.</span></p>' +
      '  <div class="flyer-mini-form"><button type="button" class="flyer-btn-submit" id="wip-ok"><span data-lang="mr">समजले</span><span data-lang="en">Got it</span></button></div>' +
      "</div>";
    document.getElementById("wip-ok").addEventListener("click", closeFlyer);
    openFlyerShell(name + " (WIP)");
  }

  // ---------- boot ------------------------------------------------------------
  if (!DATE) return; // not a chart page (or static render without server)
  initLang();
  initNav();
  initPresentation();
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
