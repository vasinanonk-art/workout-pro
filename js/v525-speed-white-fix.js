// ===== Workout PRO v5.2.5 Exercise Speed + White Screen Fix =====
// Scope: Mobile stability after exercise change + scroll, dropdown speed, save debounce, version sync.
// Does not change Firestore schema, workout progression rules, or calendar rules.

(function(){
  "use strict";
  if (window.__WORKOUT_PRO_V525_SPEED_WHITE_FIX__) return;
  window.__WORKOUT_PRO_V525_SPEED_WHITE_FIX__ = true;

  var BUILD = {
    version: "v5.2.5",
    buildDate: "2026-06-09",
    label: "Exercise Speed + White Screen Fix",
    qa: "Dropdown fast path / Scroll repaint guard / Save guard / Header sync"
  };

  function $(id){ return document.getElementById(id); }
  function safe(fn, label){
    try { return fn(); }
    catch(e){ console.warn("[Workout PRO v5.2.5]", label || "safe", e); }
  }

  function todayLocalKey(){
    var d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  // ---------- Version Sync ----------
  function syncVersion(){
    safe(function(){
      document.title = "Workout PRO " + BUILD.version;

      var bodyHtmlTargets = [
        "userLine",
        "versionQAPanel",
        "v524QaPanel"
      ];

      bodyHtmlTargets.forEach(function(id){
        var el = $(id);
        if (!el) return;
        if (el.innerHTML) {
          el.innerHTML = el.innerHTML
            .replace(/v5\.2\.\d+/g, BUILD.version)
            .replace(/Updated\s+\d{4}-\d{2}-\d{2}/g, "Updated " + BUILD.buildDate)
            .replace(/Build\s+\d{4}-\d{2}-\d{2}/g, "Build " + BUILD.buildDate);
        }
      });

      var header = document.querySelector("header");
      if (header) {
        header.innerHTML = header.innerHTML
          .replace(/v5\.2\.\d+/g, BUILD.version)
          .replace(/Updated\s+\d{4}-\d{2}-\d{2}/g, "Updated " + BUILD.buildDate)
          .replace(/Build\s+\d{4}-\d{2}-\d{2}/g, "Build " + BUILD.buildDate);
      }

      document.querySelectorAll(".badge,.status-pill,.version-panel,.card").forEach(function(el){
        if (!el || !el.innerHTML || el.dataset.v525NoVersionPatch === "1") return;
        if (el.innerHTML.indexOf("v5.2.") >= 0) {
          el.innerHTML = el.innerHTML
            .replace(/v5\.2\.\d+/g, BUILD.version)
            .replace(/v5\.2\.5Modern UI/g, BUILD.version + " Modern UI")
            .replace(/Updated\s+\d{4}-\d{2}-\d{2}/g, "Updated " + BUILD.buildDate)
            .replace(/Build\s+\d{4}-\d{2}-\d{2}/g, "Build " + BUILD.buildDate);
        }
      });
    }, "syncVersion");
  }

  // ---------- CSS stability patch ----------
  function injectStabilityCss(){
    if ($("v525StabilityCss")) return;
    var style = document.createElement("style");
    style.id = "v525StabilityCss";
    style.textContent = `
      html, body {
        min-height: 100%;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
      }
      body.v525-exercise-changing *,
      body.v525-saving * {
        transition: none !important;
        animation-duration: 0.001s !important;
      }
      .page {
        contain: layout paint style;
      }
      .page.active {
        min-height: 60vh;
      }
      .card {
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      #log {
        min-height: 100vh;
        padding-bottom: 160px;
      }
      #exercise, #date, #saveBtn {
        touch-action: manipulation;
      }
      #v525Overlay {
        position: fixed;
        left: 14px;
        right: 14px;
        bottom: 96px;
        z-index: 9999;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(15, 23, 42, .94);
        border: 1px solid rgba(96,165,250,.45);
        color: #fff;
        font: 13px/1.35 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        display: none;
        box-shadow: 0 12px 35px rgba(0,0,0,.35);
      }
      body.v525-show-overlay #v525Overlay {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay(){
    if ($("v525Overlay")) return $("v525Overlay");
    var d = document.createElement("div");
    d.id = "v525Overlay";
    d.textContent = "กำลังปรับหน้าจอ...";
    document.body.appendChild(d);
    return d;
  }

  function showOverlay(text, ms){
    var d = ensureOverlay();
    d.textContent = text || "กำลังปรับหน้าจอ...";
    document.body.classList.add("v525-show-overlay");
    clearTimeout(window.__v525OverlayTimer);
    window.__v525OverlayTimer = setTimeout(function(){
      document.body.classList.remove("v525-show-overlay");
    }, ms || 900);
  }

  // ---------- Date guard ----------
  var dateState = { touched:false, value:"", until:0, timer:null };
  function bindDateGuard(){
    var input = $("date");
    if (!input || input.dataset.v525DateGuard === "1") return;
    input.dataset.v525DateGuard = "1";

    if (!input.value) input.value = todayLocalKey();
    dateState.value = input.value;

    function lock(){
      dateState.touched = true;
      dateState.value = input.value || todayLocalKey();
      dateState.until = Date.now() + 10000;
      safe(function(){ localStorage.setItem("workout_last_selected_date", dateState.value); }, "date localStorage");
    }

    input.addEventListener("input", lock, true);
    input.addEventListener("change", lock, true);
    input.addEventListener("focus", function(){ dateState.value = input.value || todayLocalKey(); }, true);

    if (!dateState.timer) {
      dateState.timer = setInterval(function(){
        if (!dateState.touched || Date.now() > dateState.until) return;
        var el = $("date");
        if (el && dateState.value && el.value !== dateState.value) {
          el.value = dateState.value;
        }
      }, 250);
    }
  }

  // ---------- Save guard ----------
  function bindSaveGuard(){
    var btn = $("saveBtn");
    if (!btn || btn.dataset.v525SaveGuard === "1") return;
    btn.dataset.v525SaveGuard = "1";

    var original = btn.textContent || "+ บันทึกเซตนี้";

    function release(){
      window.__workoutProSaving = false;
      document.body.classList.remove("v525-saving");
      var b = $("saveBtn");
      if (b) {
        b.disabled = false;
        b.textContent = original;
      }
    }

    function mark(){
      window.__workoutProSaving = true;
      document.body.classList.add("v525-saving");
      var b = $("saveBtn");
      if (b) {
        b.disabled = true;
        b.textContent = "กำลังบันทึก...";
      }
      var debug = $("saveDebug");
      if (debug) {
        debug.className = "msg info";
        debug.textContent = "กำลังบันทึก... ห้ามกดซ้ำ";
      }
      clearTimeout(window.__v525SaveTimer);
      window.__v525SaveTimer = setTimeout(release, 12000);
    }

    btn.addEventListener("click", function(e){
      if (window.__workoutProSaving) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var debug = $("saveDebug");
        if (debug) {
          debug.className = "msg warn";
          debug.textContent = "กำลังบันทึกอยู่ รอผลลัพธ์ก่อน";
        }
        return false;
      }
      setTimeout(mark, 0);
    }, true);

    var debug = $("saveDebug");
    if (debug && window.MutationObserver) {
      new MutationObserver(function(){
        var t = debug.textContent || "";
        if (
          t.indexOf("บันทึกสำเร็จ") >= 0 ||
          t.indexOf("Save error") >= 0 ||
          t.indexOf("Login ก่อน") >= 0 ||
          t.indexOf("Team ID") >= 0 ||
          t.indexOf("กรอก Weight") >= 0 ||
          t.indexOf("กรอก Weight และ Reps") >= 0
        ) {
          setTimeout(release, 250);
          setTimeout(blankPageGuard, 300);
        }
      }).observe(debug, {childList:true, subtree:true, characterData:true});
    }
  }

  // ---------- Exercise switch fast path ----------
  var lastExercise = "";
  var heavyTimer = null;
  var scrollProtectUntil = 0;

  function knownTarget(ex){
    var map = {
      "Barbell Bench Press":4, "Incline Dumbbell Press":3, "Seated Shoulder Press":3,
      "Dumbbell Lateral Raise":4, "Cable Triceps Pushdown":3,
      "Lat Pulldown":4, "Barbell Row":4, "Seated Cable Row":3, "Face Pull":3, "Dumbbell Curl":3,
      "Incline Machine Press":3, "Chest Supported Row":3, "Machine Shoulder Press":3, "Cable Fly":3,
      "Hammer Curl":3, "Overhead Triceps Extension":3,
      "Back Squat":4, "Romanian Deadlift":4, "Leg Press":3, "Walking Lunge":3,
      "Lying Leg Curl":3, "Standing Calf Raise":4
    };
    return map[ex] || 3;
  }

  function fastPaintExercise(ex){
    var target = knownTarget(ex);
    var targetShow = $("targetShow");
    if (targetShow) targetShow.textContent = String(target);

    var setStatus = $("setStatus");
    if (setStatus) {
      setStatus.className = "msg info";
      setStatus.innerHTML =
        "Fast Mode: เปลี่ยนท่าแล้ว<br><b>" + (ex || "-") + "</b> • Target " + target + " sets";
    }

    var pr = $("prStatus");
    if (pr) pr.innerHTML = "กำลังโหลดสถิติของ <b>" + (ex || "-") + "</b>...";

    var wk = $("weekSuggest");
    if (wk) wk.textContent = "กำลังโหลดข้อมูลสัปดาห์ก่อน...";

    var next = $("nextWeekBox");
    if (next) next.textContent = "กำลังคำนวณน้ำหนักครั้งถัดไป...";
  }

  function deferHeavyExerciseWork(){
    clearTimeout(heavyTimer);
    heavyTimer = setTimeout(function(){
      var run = function(){
        safe(function(){ if (typeof window.renderMediaPanel === "function") window.renderMediaPanel(); }, "renderMediaPanel");
        safe(function(){ if (typeof window.applyCanonicalSetDisplay === "function") window.applyCanonicalSetDisplay(($("exercise") || {}).value); }, "applyCanonicalSetDisplay");
        safe(function(){ if (typeof window.updatePR === "function") window.updatePR(); }, "updatePR");
        safe(function(){ if (typeof window.updateWeeklySuggestion === "function") window.updateWeeklySuggestion(); }, "updateWeeklySuggestion");
        safe(function(){ if (typeof window.updateWeekly === "function") window.updateWeekly(); }, "updateWeekly");
        safe(function(){ if (typeof window.updateNextWeekRecommendation === "function") window.updateNextWeekRecommendation(); }, "updateNextWeekRecommendation");
        safe(function(){ if (typeof window.historySummaryForCurrent === "function") window.historySummaryForCurrent(); }, "historySummaryForCurrent");
        document.body.classList.remove("v525-exercise-changing");
        setTimeout(blankPageGuard, 100);
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(run, {timeout: 1500});
      } else {
        setTimeout(run, 350);
      }
    }, 350);
  }

  function bindExerciseFastPath(){
    var ex = $("exercise");
    if (!ex || ex.dataset.v525FastPath === "1") return;
    ex.dataset.v525FastPath = "1";
    lastExercise = ex.value || "";

    ex.addEventListener("change", function(){
      var val = ex.value || "";
      if (val === lastExercise) return;
      lastExercise = val;

      document.body.classList.add("v525-exercise-changing");
      scrollProtectUntil = Date.now() + 2500;

      fastPaintExercise(val);
      showOverlay("เปลี่ยนท่าแล้ว กำลังโหลดข้อมูลเบื้องหลัง...", 700);
      deferHeavyExerciseWork();
      setTimeout(blankPageGuard, 80);
    }, true);

    ex.addEventListener("pointerdown", function(){
      scrollProtectUntil = Date.now() + 2500;
    }, {passive:true});
  }

  // ---------- Scroll white screen guard ----------
  var scrollTimer = null;
  function bindScrollGuard(){
    if (window.__v525ScrollGuardBound) return;
    window.__v525ScrollGuardBound = true;

    window.addEventListener("scroll", function(){
      if (Date.now() > scrollProtectUntil && !document.body.classList.contains("v525-exercise-changing")) return;

      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function(){
        blankPageGuard();
        forceRepaintActivePage();
      }, 80);
    }, {passive:true});

    document.addEventListener("touchmove", function(){
      if (Date.now() <= scrollProtectUntil) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function(){
          blankPageGuard();
          forceRepaintActivePage();
        }, 80);
      }
    }, {passive:true});
  }

  function forceRepaintActivePage(){
    safe(function(){
      var active = document.querySelector(".page.active") || $("log");
      if (!active) return;
      active.style.transform = "translateZ(0)";
      active.style.opacity = "0.999";
      setTimeout(function(){
        active.style.opacity = "";
      }, 60);
    }, "forceRepaintActivePage");
  }

  function blankPageGuard(){
    safe(function(){
      var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
      if (!pages.length) return;

      var active = pages.find(function(p){
        return p.classList.contains("active") && p.style.display !== "none";
      });

      if (active && active.getBoundingClientRect().height > 20) return;

      var saved = "log";
      try { saved = localStorage.getItem("workoutActivePage") || "log"; } catch(e) {}
      var target = $(saved) || $("log") || pages[0];

      pages.forEach(function(p){
        var on = p === target;
        p.classList.toggle("active", on);
        p.style.display = on ? "" : "none";
      });

      forceRepaintActivePage();
    }, "blankPageGuard");
  }

  function addQaPanel(){
    safe(function(){
      var setup = $("setup");
      if (!setup || $("v525QaPanel")) return;

      var card = document.createElement("div");
      card.id = "v525QaPanel";
      card.className = "card";
      card.dataset.v525NoVersionPatch = "1";
      card.innerHTML =
        "<h3>v5.2.5 Speed / White Screen QA</h3>" +
        "<div class='msg ok'>" +
        "Version: <b>" + BUILD.version + "</b><br>" +
        "Exercise Fast Path: ON<br>" +
        "Scroll White Screen Guard: ON<br>" +
        "Date Guard: ON<br>" +
        "Save Guard: ON<br>" +
        "Core Firestore schema unchanged: YES" +
        "</div>";
      setup.appendChild(card);
    }, "addQaPanel");
  }

  function boot(){
    injectStabilityCss();
    ensureOverlay();
    syncVersion();
    bindDateGuard();
    bindSaveGuard();
    bindExerciseFastPath();
    bindScrollGuard();
    blankPageGuard();
    addQaPanel();

    setTimeout(syncVersion, 400);
    setTimeout(bindExerciseFastPath, 500);
    setTimeout(blankPageGuard, 900);
    setTimeout(syncVersion, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("load", function(){
    boot();
    setTimeout(boot, 1200);
    setTimeout(blankPageGuard, 2500);
  });

  document.addEventListener("visibilitychange", function(){
    if (!document.hidden) setTimeout(blankPageGuard, 100);
  });
})();
