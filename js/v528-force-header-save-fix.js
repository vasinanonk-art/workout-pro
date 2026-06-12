// ===== Workout PRO v5.2.8 Force Header Sync + Save Guard =====
// Purpose:
// 1) Force all visible version labels to v5.2.8 after app.module.js/runtime scripts overwrite the header.
// 2) Keep save button protected from double-tap and reduce perceived post-save freeze.
// 3) Does not change Firestore schema, calendar rules, workout split, or progression rules.

(function(){
  "use strict";
  if(window.__WORKOUT_PRO_V528_FORCE_PATCH__) return;
  window.__WORKOUT_PRO_V528_FORCE_PATCH__ = true;

  var VERSION = "v5.2.8";
  var BUILD_DATE = "2026-06-12";
  var BUILD_LABEL = "Force Header Sync + Save Guard";

  function $(id){ return document.getElementById(id); }
  function safe(fn, label){
    try{ return fn(); }
    catch(e){ console.warn("[Workout PRO v5.2.8]", label || "safe", e); }
  }

  function textReplaceAll(root){
    if(!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      if(!n.nodeValue) return;
      var old = n.nodeValue;
      var next = old
        .replace(/v5\.2\.\d+/g, VERSION)
        .replace(/Updated\s+\d{4}-\d{2}-\d{2}/g, "Updated " + BUILD_DATE)
        .replace(/Build\s+\d{4}-\d{2}-\d{2}/g, "Build " + BUILD_DATE)
        .replace(/v5\.2\.8Modern UI/g, VERSION + " Modern UI");
      if(next !== old) n.nodeValue = next;
    });
  }

  function forceHeader(){
    safe(function(){
      document.title = "Workout PRO " + VERSION;

      var userLine = $("userLine");
      if(userLine){
        var text = userLine.textContent || "";
        if(text.indexOf("krit") >= 0 || text.indexOf("Team:") >= 0){
          // Preserve identity/team format if app has already replaced this line.
          text = text.replace(/v5\.2\.\d+/g, VERSION);
          if(text.indexOf(VERSION) < 0) text += " / " + VERSION;
          userLine.textContent = text;
        }else{
          userLine.textContent = "Clean QA • Auto Week • Rest Rule • Double Progression • Quality • SFR • " + VERSION;
        }
      }

      var headerSubs = document.querySelectorAll("header .sub");
      if(headerSubs.length >= 2){
        headerSubs[1].textContent = "Updated " + BUILD_DATE + " • Build " + BUILD_DATE + " • " + BUILD_LABEL;
      }

      document.querySelectorAll(".badge,.status-pill,.version-panel,.v5-hero,.hero,header").forEach(function(el){
        textReplaceAll(el);
        if(el.innerHTML){
          el.innerHTML = el.innerHTML
            .replace(/v5\.2\.\d+Modern UI/g, VERSION + " Modern UI")
            .replace(/v5\.2\.8Modern UI/g, VERSION + " Modern UI");
        }
      });

      var hero = document.querySelector("#modernHero, .v5-hero, .hero, main .card");
      if(hero) textReplaceAll(hero);
    }, "forceHeader");
  }

  // Force again after other legacy scripts run.
  function installHeaderWatch(){
    if(window.__v528HeaderWatchInstalled) return;
    window.__v528HeaderWatchInstalled = true;
    var header = document.querySelector("header");
    if(header && window.MutationObserver){
      var obs = new MutationObserver(function(){ 
        clearTimeout(window.__v528HeaderTimer);
        window.__v528HeaderTimer = setTimeout(forceHeader, 30);
      });
      obs.observe(header, {childList:true, subtree:true, characterData:true});
    }
  }

  // Save UX guard: prevents rapid double taps and recovers button state.
  function installSaveGuard(){
    var btn = $("saveBtn");
    if(!btn || btn.dataset.v528SaveGuard === "1") return;
    btn.dataset.v528SaveGuard = "1";
    var original = btn.textContent || "+ บันทึกเซตนี้";
    var saving = false;

    function release(){
      saving = false;
      var b = $("saveBtn");
      if(b){
        b.disabled = false;
        b.textContent = original;
        b.classList.remove("saving");
      }
    }

    btn.addEventListener("click", function(e){
      if(saving){
        e.preventDefault();
        e.stopImmediatePropagation();
        var sd = $("saveDebug");
        if(sd){
          sd.className = "msg warn";
          sd.textContent = "กำลังบันทึกอยู่ รอผลลัพธ์ก่อน";
        }
        return false;
      }
      saving = true;
      setTimeout(function(){
        var b = $("saveBtn");
        if(b){
          b.disabled = true;
          b.textContent = "กำลังบันทึก...";
          b.classList.add("saving");
        }
        clearTimeout(window.__v528SaveRelease);
        window.__v528SaveRelease = setTimeout(release, 12000);
      }, 0);
    }, true);

    var debug = $("saveDebug");
    if(debug && window.MutationObserver){
      var obs = new MutationObserver(function(){
        var t = debug.textContent || "";
        if(
          t.indexOf("บันทึกสำเร็จ") >= 0 ||
          t.indexOf("Save error") >= 0 ||
          t.indexOf("Login ก่อน") >= 0 ||
          t.indexOf("ใส่ Team ID") >= 0 ||
          t.indexOf("กรอก Weight") >= 0 ||
          t.indexOf("ยังพักไม่ครบ") >= 0 ||
          t.indexOf("ยังไม่สามารถบันทึก") >= 0
        ){
          setTimeout(release, 350);
        }
      });
      obs.observe(debug, {childList:true, subtree:true, characterData:true});
    }
  }

  function addQaPanel(){
    safe(function(){
      var setup = $("setup");
      if(!setup || $("v528QaPanel")) return;
      var d = document.createElement("div");
      d.id = "v528QaPanel";
      d.className = "card";
      d.innerHTML =
        "<h3>v5.2.8 QA</h3>" +
        "<div class='msg ok'>" +
        "Force Header Sync: ON<br>" +
        "Build Date: " + BUILD_DATE + "<br>" +
        "Save Guard: ON<br>" +
        "Firestore schema unchanged<br>" +
        "Calendar/rest/progression logic unchanged" +
        "</div>";
      setup.appendChild(d);
    }, "addQaPanel");
  }

  function boot(){
    forceHeader();
    installHeaderWatch();
    installSaveGuard();
    addQaPanel();
    setTimeout(forceHeader, 100);
    setTimeout(forceHeader, 500);
    setTimeout(forceHeader, 1200);
    setTimeout(forceHeader, 2500);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }

  window.addEventListener("load", function(){
    boot();
    setTimeout(boot, 1000);
  });

  document.addEventListener("visibilitychange", function(){
    if(!document.hidden) setTimeout(forceHeader, 100);
  });
})();
