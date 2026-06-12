// ===== Workout PRO v5.2.9 Clean Runtime =====
// Clean Build: No Migration UI, forced version sync, save guard, no stacked legacy patch scripts.

(function(){
  "use strict";
  if(window.__WORKOUT_PRO_V529_CLEAN_RUNTIME__) return;
  window.__WORKOUT_PRO_V529_CLEAN_RUNTIME__ = true;

  const VERSION = "v5.2.9";
  const BUILD_DATE = "2026-06-12";
  const BUILD_LABEL = "Clean Build No Migration";

  function $(id){ return document.getElementById(id); }
  function safe(fn, label){ try{ return fn(); }catch(e){ console.warn("[Workout PRO " + VERSION + "]", label || "safe", e); } }

  function replaceText(root){
    if(!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      if(!n.nodeValue) return;
      const old = n.nodeValue;
      let next = old
        .replace(/v5\.2\.\d+/g, VERSION)
        .replace(/Updated\s+\d{4}-\d{2}-\d{2}/g, "Updated " + BUILD_DATE)
        .replace(/Build\s+\d{4}-\d{2}-\d{2}/g, "Build " + BUILD_DATE)
        .replace(/v5\.2\.9Modern UI/g, VERSION + " Modern UI");
      if(next !== old) n.nodeValue = next;
    });
  }

  function forceVersion(){
    safe(() => {
      document.title = "Workout PRO " + VERSION;
      const userLine = $("userLine");
      if(userLine){
        const current = userLine.textContent || "";
        if(current.includes("krit") || current.includes("Team:")){
          userLine.textContent = current.replace(/v5\.2\.\d+/g, VERSION).replace(/\s*\/\s*$/, "");
          if(!userLine.textContent.includes(VERSION)) userLine.textContent += " / " + VERSION;
        }else{
          userLine.textContent = "Clean QA • Auto Week • Rest Rule • Double Progression • Quality • SFR • " + VERSION;
        }
      }
      const subs = document.querySelectorAll("header .sub");
      if(subs.length >= 2){
        subs[1].textContent = "Updated " + BUILD_DATE + " • Build " + BUILD_DATE + " • " + BUILD_LABEL;
      }
      replaceText(document.body);
      document.querySelectorAll(".badge,.status-pill").forEach(el => {
        el.textContent = (el.textContent || "").replace(/v5\.2\.\d+/g, VERSION).replace(/v5\.2\.9Modern UI/g, VERSION + " Modern UI");
      });
    }, "forceVersion");
  }

  function removeMigration(){
    safe(() => {
      ["migrationCard","legacyMigrationBox","legacyMigrationBtn"].forEach(id => {
        const el = $(id);
        if(el) {
          const card = el.closest && el.closest(".card");
          if(card) card.remove(); else el.remove();
        }
      });
      document.querySelectorAll("h3").forEach(h => {
        if((h.textContent || "").trim().toLowerCase().includes("migration")){
          const card = h.closest(".card");
          if(card) card.remove();
        }
      });
    }, "removeMigration");
  }

  function installSaveGuard(){
    const btn = $("saveBtn");
    if(!btn || btn.dataset.v529SaveGuard === "1") return;
    btn.dataset.v529SaveGuard = "1";
    const original = btn.textContent || "+ บันทึกเซตนี้";
    let saving = false;

    function release(){
      saving = false;
      const b = $("saveBtn");
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
        const sd = $("saveDebug");
        if(sd) {
          sd.className = "msg warn";
          sd.textContent = "กำลังบันทึกอยู่ รอผลลัพธ์ก่อน";
        }
        return false;
      }
      saving = true;
      setTimeout(() => {
        const b = $("saveBtn");
        if(b){
          b.disabled = true;
          b.textContent = "กำลังบันทึก...";
          b.classList.add("saving");
        }
        clearTimeout(window.__v529SaveRelease);
        window.__v529SaveRelease = setTimeout(release, 12000);
      }, 0);
    }, true);

    const debug = $("saveDebug");
    if(debug && window.MutationObserver){
      new MutationObserver(() => {
        const t = debug.textContent || "";
        if(
          t.includes("บันทึกสำเร็จ") ||
          t.includes("Save error") ||
          t.includes("Login ก่อน") ||
          t.includes("ใส่ Team ID") ||
          t.includes("กรอก Weight") ||
          t.includes("ยังพักไม่ครบ") ||
          t.includes("ยังไม่สามารถบันทึก")
        ) setTimeout(release, 350);
      }).observe(debug, {childList:true, subtree:true, characterData:true});
    }
  }

  function addQaPanel(){
    safe(() => {
      const setup = $("setup");
      if(!setup || $("v529QaPanel")) return;
      const d = document.createElement("div");
      d.id = "v529QaPanel";
      d.className = "card";
      d.innerHTML = `<h3>${VERSION} QA</h3><div class="msg ok">Clean Build: ON<br>Migration Removed: ON<br>Header Sync: ON<br>Save Guard: ON<br>Firestore schema unchanged<br>Calendar/rest/progression unchanged</div>`;
      setup.appendChild(d);
    }, "addQaPanel");
  }

  function boot(){
    removeMigration();
    forceVersion();
    installSaveGuard();
    addQaPanel();
    setTimeout(() => { removeMigration(); forceVersion(); }, 100);
    setTimeout(() => { removeMigration(); forceVersion(); }, 500);
    setTimeout(() => { removeMigration(); forceVersion(); }, 1200);
    setTimeout(() => { removeMigration(); forceVersion(); }, 2500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", () => { boot(); setTimeout(boot, 1000); });
  document.addEventListener("visibilitychange", () => { if(!document.hidden) setTimeout(boot, 100); });
})();
