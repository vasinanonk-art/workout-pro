// ===== Workout PRO v5.3.18 Lightweight Patch =====
// This patch reduces UI slowness by disabling heavy post-save recomputation
// and forces the date input to synchronize with the current day whenever the page loads.
(function(){
  "use strict";
  // Prevent double application
  if(window.__WORKOUT_PRO_V530_LITE_PATCH__) return;
  window.__WORKOUT_PRO_V530_LITE_PATCH__ = true;
  function $(id){ return document.getElementById(id); }
  // Apply a light wrapper around saveSet to avoid heavy post-save calls
  function applyPatch(){
    try{
      const origSave = window.saveSet || (typeof saveSet === "function" ? saveSet : null);
      if(typeof origSave !== "function") return;
      if(origSave.__v530patched) return;
      let inProgress = false;
      const patched = async function(...args){
        if(inProgress) return;
        inProgress = true;
        const btn = $("saveBtn");
        if(btn) btn.disabled = true;
        // temporarily replace heavy functions with no-ops during save
        const heavyNames = [
          "v403Run",
          "fullStabilizationRun",
          "coachCoreRun",
          "runAuthDebugGuardSafe",
          "permissionSafeRun",
          "plateauLiveRecompute",
          "stableRenderAllPanels"
        ];
        const originals = {};
        heavyNames.forEach(function(name){ originals[name] = window[name]; window[name] = function(){}; });
        try{
          await origSave.apply(this, args);
        }catch(err){
          // propagate error through original implementation
          throw err;
        }finally{
          // restore heavy functions
          heavyNames.forEach(function(name){ window[name] = originals[name]; });
          // perform a single lightweight sync; no stableRender to keep UI responsive
          setTimeout(function(){ try{ if(typeof sync === "function"){ sync(); } }catch(_){} }, 500);
          if(btn) btn.disabled = false;
          inProgress = false;
        }
      };
      patched.__v530patched = true;
      window.saveSet = patched;
    }catch(e){ console.warn("[v5.3.18 lite patch]", e); }
  }
  // Force the date input to current date
  function forceDate(){
    try{
      if(typeof calSyncDateToToday === "function"){ calSyncDateToToday(true); return; }
    }catch(_){}
    const dateEl = $("date");
    if(!dateEl) return;
    try{
      if(typeof localDateKey === "function"){ dateEl.value = localDateKey(); return; }
    }catch(_){}
    // fallback: use ISO local date
    const now = new Date();
    now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
    dateEl.value = now.toISOString().slice(0,10);
  }
  // Run patch and date force after DOM ready
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(function(){ applyPatch(); forceDate(); }, 600); });
  }else{
    setTimeout(function(){ applyPatch(); forceDate(); }, 600);
  }
})();