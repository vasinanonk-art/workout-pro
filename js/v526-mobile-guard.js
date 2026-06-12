// ===== Workout PRO v5.2.8 Mobile White Screen Guard =====
(function(){
  "use strict";
  if(window.__WORKOUT_PRO_V526_MOBILE_GUARD__) return;
  window.__WORKOUT_PRO_V526_MOBILE_GUARD__ = true;

  var VERSION = "v5.2.8";
  var BUILD_DATE = "2026-06-09";

  function $(id){ return document.getElementById(id); }
  function safe(fn){ try{return fn();}catch(e){console.warn("[v5.2.8 mobile]",e);} }

  function injectCss(){
    if($("v526MobileCss")) return;
    var s=document.createElement("style");
    s.id="v526MobileCss";
    s.textContent = `
      html, body {
        min-height: 100%;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
        background: #050814;
      }
      .page {
        min-height: 70vh;
        contain: layout style;
      }
      .page.active {
        display: block !important;
      }
      #log {
        min-height: 120vh;
        padding-bottom: 180px;
      }
      .card {
        backface-visibility: hidden;
        transform: translateZ(0);
      }
      body.v526-exercise-changing .card,
      body.v526-exercise-changing .page {
        transition: none !important;
        animation: none !important;
      }
      #exercise {
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(s);
  }

  function syncVersion(){
    safe(function(){
      document.title = "Workout PRO " + VERSION;
      var htmlTargets = document.querySelectorAll("header,.card,.badge,.status-pill,#userLine");
      htmlTargets.forEach(function(el){
        if(!el || !el.innerHTML) return;
        if(el.innerHTML.indexOf("v5.2.") >= 0 || el.innerHTML.indexOf("Build ") >= 0){
          el.innerHTML = el.innerHTML
            .replace(/v5\.2\.\d+/g, VERSION)
            .replace(/Updated\s+\d{4}-\d{2}-\d{2}/g, "Updated " + BUILD_DATE)
            .replace(/Build\s+\d{4}-\d{2}-\d{2}/g, "Build " + BUILD_DATE)
            .replace(/v5\.2\.6Modern UI/g, VERSION + " Modern UI");
        }
      });
    });
  }

  function recoverActivePage(){
    safe(function(){
      var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
      if(!pages.length) return;
      var active = pages.find(function(p){
        return p.classList.contains("active") && p.style.display !== "none";
      });
      if(active && active.getBoundingClientRect().height > 50) return;

      var target = $("log") || pages[0];
      try{
        var saved = localStorage.getItem("workoutActivePage");
        if(saved && $(saved)) target = $(saved);
      }catch(e){}

      pages.forEach(function(p){
        var on = p === target;
        p.classList.toggle("active", on);
        p.style.display = on ? "block" : "none";
      });
    });
  }

  var lastScroll = 0;
  function bindScrollGuard(){
    if(window.__v526ScrollBound) return;
    window.__v526ScrollBound = true;
    window.addEventListener("scroll", function(){
      lastScroll = Date.now();
      clearTimeout(window.__v526ScrollTimer);
      window.__v526ScrollTimer = setTimeout(function(){
        recoverActivePage();
        var active=document.querySelector(".page.active");
        if(active){
          active.style.opacity="0.999";
          setTimeout(function(){ active.style.opacity=""; }, 50);
        }
      }, 80);
    }, {passive:true});

    document.addEventListener("touchmove", function(){
      if(Date.now() - lastScroll < 3000){
        clearTimeout(window.__v526TouchTimer);
        window.__v526TouchTimer=setTimeout(recoverActivePage,100);
      }
    }, {passive:true});
  }

  function boot(){
    injectCss();
    syncVersion();
    bindScrollGuard();
    recoverActivePage();
    setTimeout(syncVersion, 500);
    setTimeout(recoverActivePage, 1200);
    setTimeout(syncVersion, 1800);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", function(){ boot(); setTimeout(boot, 1200); });
  document.addEventListener("visibilitychange", function(){ if(!document.hidden) setTimeout(recoverActivePage,100); });
})();
