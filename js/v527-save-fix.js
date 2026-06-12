// ===== Workout PRO v5.2.8 Save Fix =====
(function(){
  "use strict";
  // Prevent double-loading of this patch.
  if(window.__WORKOUT_PRO_V527_SAVE_FIX__) return;
  window.__WORKOUT_PRO_V527_SAVE_FIX__ = true;

  // Simple helper to get elements by id.
  function $(id){ return document.getElementById(id); }

  // Apply the patch to override saveSet with a lighter implementation.
  function applyPatch(){
    try{
      const origSave = window.saveSet || (typeof saveSet === "function" ? saveSet : null);
      if(typeof origSave !== "function") return;
      // Avoid patching more than once.
      if(origSave.__v527patched) return;
      let isSaving = false;
      const patched = async function(...args){
        // Concurrency guard: ignore additional calls while a save is in progress.
        if(isSaving) return;
        isSaving = true;
        const btn = $("saveBtn");
        if(btn) btn.disabled = true;
        // Temporarily override heavy post-save functions to no-op.
        const heavyNames = ["v403Run","fullStabilizationRun","coachCoreRun","runAuthDebugGuardSafe","permissionSafeRun","plateauLiveRecompute"];
        const originalFuncs = {};
        heavyNames.forEach(function(name){
          originalFuncs[name] = window[name];
          window[name] = function(){};
        });
        const origStable = window.stableRenderAllPanels;
        window.stableRenderAllPanels = function(){};
        try{
          // Call the original saveSet implementation.
          await origSave.apply(this, args);
        }catch(err){
          // Let the original implementation handle the error via its own alert/messages.
          throw err;
        }finally{
          // Restore the heavy functions.
          heavyNames.forEach(function(name){ window[name] = originalFuncs[name]; });
          window.stableRenderAllPanels = origStable;
          // Perform a lightweight sync after a short delay.
          setTimeout(function(){
            try{
              if(typeof sync === "function"){ sync(); }
              else if(typeof window !== "undefined" && typeof window.sync === "function"){ window.sync(); }
            }catch(_){/* ignore */}
          }, 500);
          // Trigger a single stable render and re-enable the button.
          setTimeout(function(){
            try{
              if(typeof origStable === "function"){ origStable(); }
              else if(typeof window !== "undefined" && typeof window.stableRenderAllPanels === "function"){ window.stableRenderAllPanels(); }
            }catch(_){/* ignore */}
            if(btn) btn.disabled = false;
            isSaving = false;
          }, 800);
        }
      };
      patched.__v527patched = true;
      // Replace the global saveSet with our patched version.
      window.saveSet = patched;
    }catch(e){
      console.warn("[v5.2.8 save fix]", e);
    }
  }

  // Wait until the original code has had a chance to define saveSet, then patch it.
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(applyPatch, 600); });
  } else {
    setTimeout(applyPatch, 600);
  }
})();