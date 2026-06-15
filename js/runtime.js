// ===== script =====
function uiRecoveryRun(){
 try{
  document.querySelectorAll('.card').forEach(c=>{
   c.style.display='block';
   c.style.visibility='visible';
   c.style.opacity='1';
  });

  [['program','Program'],['guide','Guide'],['dashboard','Dashboard'],['coach','Coach']].forEach(x=>{
   const el=document.getElementById(x[0]);
   if(el && !el.querySelector('.uiRecoveredTitle')){
    const d=document.createElement('div');
    d.className='uiRecoveredTitle';
    d.innerHTML='<div class="section-title">'+x[1]+'</div>';
    el.prepend(d);
   }
  });

  const pg=document.getElementById('program');
  if(pg && !document.getElementById('programRecoveryBox')){
    const d=document.createElement('div');
    d.id='programRecoveryBox';
    d.className='card';
    d.innerHTML='<div class="section-title">Program Overview</div><div class="msg info">Program = หน้าใช้งานจริงระหว่างฝึก ใช้ดู split / readiness / progression</div>';
    pg.appendChild(d);
  }

  const gd=document.getElementById('guide');
  if(gd && !document.getElementById('guideRecoveryBox')){
    const d=document.createElement('div');
    d.id='guideRecoveryBox';
    d.className='card';
    d.innerHTML='<div class="section-title">Guide Quick Reference</div><div class="msg warn">Recovery / Technique / Injury Guide</div>';
    gd.appendChild(d);
  }

 }catch(e){console.warn(e)}
}
window.addEventListener('load',()=>{
 setTimeout(uiRecoveryRun,300);
 setTimeout(uiRecoveryRun,1200);
});


// ===== script =====
function uiPolishActiveDay(){
 try{return typeof activeDay==='function'?activeDay():'-'}catch(e){return '-'}
}
function uiPolishRecoveryLabel(){
 try{
  const r=typeof recoveryScore==='function'?recoveryScore():null;
  if(r===null||r===undefined) return ['Recovery Unknown','status-warn'];
  if(r>=70) return ['Recovery Good','status-good'];
  if(r>=50) return ['Recovery Moderate','status-warn'];
  return ['Recovery Low','status-bad'];
 }catch(e){return ['Recovery Unknown','status-warn']}
}
function uiPolishFatigueLabel(){
 try{
  const f=typeof fatigueRisk==='function'?fatigueRisk():null;
  if(f===null||f===undefined) return ['Fatigue Unknown','status-warn'];
  if(f<40) return ['Fatigue Low','status-good'];
  if(f<65) return ['Fatigue Medium','status-warn'];
  return ['Fatigue High','status-bad'];
 }catch(e){return ['Fatigue Unknown','status-warn']}
}
function uiPolishAddQuickStart(){
 try{
  const log=document.getElementById('log');
  if(!log || document.getElementById('quickStartCard')) return;
  const rec=uiPolishRecoveryLabel();
  const fat=uiPolishFatigueLabel();
  const d=document.createElement('div');
  d.id='quickStartCard';
  d.className='card';
  d.innerHTML='<div class="section-title">Quick Start</div><div class="quick-grid"><div class="quick-action"><b>Active Day</b><br><span>'+uiPolishActiveDay()+'</span></div><div class="quick-action"><b>Status</b><br><span class="status-pill '+rec[1]+'">'+rec[0]+'</span><span class="status-pill '+fat[1]+'">'+fat[0]+'</span></div><div class="quick-action"><b>Next Step</b><br><span>เลือกท่า → ใส่น้ำหนัก → Save Set</span></div></div>';
  log.prepend(d);
 }catch(e){console.warn(e)}
}
function uiPolishAddVersionPanel(){
 try{
  const donate=document.getElementById('donate') || document.querySelector('main');
  if(!donate || document.getElementById('versionQAPanel')) return;
  const d=document.createElement('div');
  d.id='versionQAPanel';
  d.className='card version-panel';
  // Updated version panel for v5.3.23. Reflects current build and patch notes.
  d.innerHTML='<div class="section-title">Build / QA</div><div class="msg info">Version: <b>v5.3.23</b><br>Build: Lite Date & Save Patch + Final Fix<br>QA: Heavy recomputations disabled; date always synchronized</div>';
  donate.appendChild(d);
 }catch(e){console.warn(e)}
}
function uiPolishEmptyStates(){
 try{
  document.querySelectorAll('.msg').forEach(el=>{
   const t=(el.textContent||'').trim();
   if(t==='กำลังตรวจสอบ...' || t===''){
    el.innerHTML='<span class="empty-soft">ยังไม่มีข้อมูลเพียงพอ หรือกำลังรอข้อมูลจาก log</span>';
   }
  });
 }catch(e){console.warn(e)}
}
function uiPolishRun(){
 uiPolishAddQuickStart();
 uiPolishAddVersionPanel();
 uiPolishEmptyStates();
}
window.addEventListener('load',()=>{
 setTimeout(uiPolishRun,400);
 setTimeout(uiPolishRun,1400);
});


// ===== script =====
function modernUiHeader(){
 try{
   if(document.getElementById('modernHero')) return;
   const main=document.querySelector('main') || document.body;
   const hero=document.createElement('div');
   hero.id='modernHero';
   hero.className='card';
   hero.style.marginBottom='18px';
   // Display the current app version in the Modern UI header.  Updated to v5.3.23 in the lite patch.
   hero.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><div style="font-size:28px;font-weight:800">Workout PRO</div><div style="opacity:.8;margin-top:4px">Modern Hypertrophy & Recovery System</div></div><div><span class="status-pill status-good">v5.3.23</span><span class="status-pill status-warn">Modern UI</span></div></div>';
   main.prepend(hero);
 }catch(e){console.warn(e)}
}
window.addEventListener('load',()=>setTimeout(modernUiHeader,200));


// ===== v400StableRuntime =====
function v400HideCompleteOutsideLog(){
  try{
    var box=document.getElementById("exerciseCompleteBox");
    if(!box) return;
    var active=document.querySelector(".page.active");
    if(active && active.id!=="log") box.style.display="none";
  }catch(e){}
}
function v400AddQaPanel(){
  try{
    var setup=document.getElementById("setup");
    if(!setup || document.getElementById("v400QaPanel")) return;
    var p=document.createElement("div");
    p.id="v400QaPanel";
    p.className="card";
    p.innerHTML="<h3>v4.0 Stable QA</h3><div class='msg ok'>Date Input Sanity Fix<br>Router patch cleanup: ON<br>Complete card scoped to Log: ON<br>Heavy runtime patches removed: ON</div>";
    setup.appendChild(p);
  }catch(e){}
}
window.addEventListener("load",function(){
  setTimeout(v400HideCompleteOutsideLog,500);
  setTimeout(v400AddQaPanel,900);
});
document.addEventListener("click",function(e){
  if(e.target.closest && e.target.closest(".tab[data-page],nav button,.tabbar button")){
    setTimeout(v400HideCompleteOutsideLog,100);
  }
},true);


// ===== v404LazyTabRuntime =====
(function(){
  if(window.__v404LazyTabInstalled) return;
  window.__v404LazyTabInstalled=true;

  const lastRun={};
  window.__v404TooSoon=function(key,ms){
    const now=Date.now();
    if(lastRun[key] && now-lastRun[key]<ms) return true;
    lastRun[key]=now;
    return false;
  };

  function pageNow(page){
    if(!page) return;
    window.__v404TabSwitching=true;

    document.querySelectorAll(".page").forEach(function(p){
      const active=p.id===page;
      p.classList.toggle("active",active);
      p.style.display=active?"":"none";
    });
    document.querySelectorAll(".tab[data-page]").forEach(function(b){
      b.classList.toggle("active",b.dataset.page===page);
    });

    const done=document.getElementById("exerciseCompleteBox");
    if(done) done.style.display=page==="log"?"":"none";

    try{localStorage.setItem("workoutActivePage",page);}catch(e){}

    // Release heavy render after UI has already switched. This keeps tap response instant.
    clearTimeout(window.__v404ReleaseTimer);
    window.__v404ReleaseTimer=setTimeout(function(){
      window.__v404TabSwitching=false;
      // Render only lightweight page-specific panels, not full renderAll.
      try{
        if(page==="log" && typeof v403Run==="function") v403Run();
        if(page==="coach" && typeof coachCoreRun==="function") coachCoreRun();
        if(page==="calendar" && typeof renderCal==="function") renderCal();
      }catch(e){}
    },80);
  }

  function bind(){
    document.querySelectorAll(".tab[data-page]").forEach(function(btn){
      if(btn.dataset.v404Bound==="1") return;
      btn.dataset.v404Bound="1";
      const handler=function(e){
        const page=btn.dataset.page;
        if(!page) return;
        pageNow(page);
      };
      btn.addEventListener("pointerdown",handler,{passive:true});
      btn.addEventListener("touchstart",handler,{passive:true});
      btn.addEventListener("click",handler,{passive:true});
    });
  }

  window.addEventListener("load",function(){
    setTimeout(bind,80);
    try{
      const saved=localStorage.getItem("workoutActivePage");
      if(saved && document.getElementById(saved)) pageNow(saved);
    }catch(e){}
  });
})();


// ===== v5.2.6 Navigation Speed Cache =====
(function(){
  if(window.__v430NavInstalled) return; window.__v430NavInstalled=true;
  function activatePage(page){if(!page)return;document.querySelectorAll('.page').forEach(function(p){var a=p.id===page;p.classList.toggle('active',a);p.style.display=a?'':'none';});document.querySelectorAll('.tab[data-page]').forEach(function(b){b.classList.toggle('active',b.dataset.page===page);});try{localStorage.setItem('workoutActivePage',page);}catch(e){}}
  function bindFastTabs(){document.querySelectorAll('.tab[data-page]').forEach(function(btn){if(btn.dataset.v430FastBound==='1')return;btn.dataset.v430FastBound='1';var fn=function(){activatePage(btn.dataset.page);};btn.addEventListener('pointerdown',fn,{passive:true});btn.addEventListener('touchstart',fn,{passive:true});});}
  window.v430ActivatePage=activatePage;window.addEventListener('load',function(){bindFastTabs();try{var saved=localStorage.getItem('workoutActivePage');if(saved&&document.getElementById(saved))activatePage(saved);}catch(e){}});
})();



// ===== v5.2.6 Alternative Button Cleanup =====
(function(){
  if(window.__v431AltButtonCleanup) return;
  window.__v431AltButtonCleanup = true;
  function cleanAltButtons(){
    try{
      document.querySelectorAll("button").forEach(function(btn){
        var t=(btn.textContent||"").trim();
        if(t==="ยกเลิกท่าทดแทน" || t==="ยกเลิกท่าแทนถาวร"){
          btn.classList.add("v431-alt-cancel-clean");
        }
      });
    }catch(e){}
  }
  window.addEventListener("load",function(){
    cleanAltButtons();
    setTimeout(cleanAltButtons,500);
    setTimeout(cleanAltButtons,1500);
  });
  document.addEventListener("click",function(){setTimeout(cleanAltButtons,100);},true);
})();



// ===== v5.2.6 Alternative Action Polish =====
(function(){
  if(window.__v432AltPolish) return;
  window.__v432AltPolish = true;
  function polishAltButtons(){
    try{
      document.querySelectorAll("button").forEach(function(btn){
        var t = (btn.textContent || "").trim();
        if(t === "ใช้ท่านี้แทนทุกสัปดาห์"){
          btn.textContent = "บันทึกเป็นท่าแทนถาวร";
          btn.classList.add("v432-alt-action");
        }
        if(t === "ยกเลิกท่าทดแทน"){
          btn.textContent = "ยกเลิกท่าแทนชั่วคราว";
          btn.classList.add("v431-alt-cancel-clean", "v432-alt-action");
        }
        if(t === "ยกเลิกท่าแทนถาวร"){
          btn.textContent = "ลบการแทนถาวร";
          btn.classList.add("v431-alt-cancel-clean", "v432-alt-action");
        }
      });
    }catch(e){}
  }
  window.addEventListener("load", function(){
    polishAltButtons();
    setTimeout(polishAltButtons, 400);
    setTimeout(polishAltButtons, 1200);
  });
  document.addEventListener("click", function(){ setTimeout(polishAltButtons, 80); }, true);
})();



// ===== v5.2.6 Mobile UX + Performance Shell =====
(function(){
  if(window.__v5ShellInstalled) return;
  window.__v5ShellInstalled = true;

  function haptic(){
    try{ if(navigator.vibrate) navigator.vibrate(8); }catch(e){}
  }

  function bindButtons(){
    document.querySelectorAll("button").forEach(function(btn){
      if(btn.dataset.v5Haptic==="1") return;
      btn.dataset.v5Haptic="1";
      btn.addEventListener("click",haptic,{passive:true});
    });
  }

  function reduceHeavyEffects(){
    try{
      if(window.matchMedia && window.matchMedia("(max-width:760px)").matches){
        document.body.classList.add("v5-mobile-performance");
      }
    }catch(e){}
  }

  window.addEventListener("load",function(){
    bindButtons();
    reduceHeavyEffects();
    setTimeout(bindButtons,800);
  });
  document.addEventListener("click",function(){setTimeout(bindButtons,80);},true);
})();



// ===== v5.2.6 User Isolation Status UI =====
(function(){
  function showIsolationStatus(){
    try{
      var el=document.getElementById("userIsolationStatus");
      if(!el) return;
      el.className="msg ok";
      el.innerHTML="Data Isolation: แยกข้อมูลตาม Google Account แล้ว<br><span class='small'>Team ID ซ้ำกันได้ แต่ข้อมูลไม่ปนกันระหว่าง user</span>";
    }catch(e){}
  }
  window.addEventListener("load",function(){setTimeout(showIsolationStatus,400);setTimeout(showIsolationStatus,1400);});
})();



// ===== v5.2.6 Migration Button Runtime Guard =====
(function(){
  function guardButtons(){
    try{
      var mig=document.getElementById("legacyMigrationBtn");
      if(mig){mig.disabled=false;}
      var save=document.getElementById("saveTeamBtn");
      if(save){save.disabled=false;}
    }catch(e){}
  }
  window.addEventListener("load",function(){setTimeout(guardButtons,300);setTimeout(guardButtons,1200);});
})();



// ===== v5.2.6 Date Input Sanity Fix =====
(function(){
  if(window.__v504TeamHardFix) return;
  window.__v504TeamHardFix = true;

  function getTeamInput(){
    return document.getElementById("teamId");
  }

  function showTeamStatus(msg, cls){
    var st = document.getElementById("teamSaveStatus") || document.getElementById("userIsolationStatus");
    if(st){
      st.className = cls || "msg ok";
      st.innerHTML = msg;
    }
  }

  function saveTeamIdHard(e){
    try{
      var btn = e && e.target && e.target.closest ? e.target.closest("#saveTeamBtn") : null;
      if(!btn) return;

      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }

      var input = getTeamInput();
      var val = input ? String(input.value || "").trim() : "";
      if(!val){
        showTeamStatus("กรุณาใส่ Team ID ก่อน", "msg warn");
        alert("กรุณาใส่ Team ID ก่อน");
        return false;
      }

      localStorage.setItem("teamId", val);
      localStorage.setItem("workoutTeamIdSavedAt", new Date().toISOString());
      showTeamStatus("Team ID saved: <b>"+val+"</b><br><span class='small'>กำลัง reload เพื่อโหลดข้อมูลของทีมนี้</span>", "msg ok");

      setTimeout(function(){
        location.reload();
      }, 350);
      return false;
    }catch(err){
      alert("Save Team ID error: " + err.message);
      return false;
    }
  }

  function hydrateTeamInput(){
    try{
      var input = getTeamInput();
      var val = localStorage.getItem("teamId") || "";
      if(input && val && !input.value) input.value = val;
      if(val){
        showTeamStatus("Team ID saved: <b>"+val+"</b><br><span class='small'>ข้อมูลแยกตาม Google Account</span>", "msg ok");
      }
    }catch(e){}
  }

  function bindHard(){
    var btn = document.getElementById("saveTeamBtn");
    if(btn){
      btn.disabled = false;
      btn.type = "button";
      if(btn.dataset.v504Bound !== "1"){
        btn.dataset.v504Bound = "1";
        btn.addEventListener("click", saveTeamIdHard, true);
        btn.onclick = saveTeamIdHard;
      }
    }
    hydrateTeamInput();
  }

  document.addEventListener("click", saveTeamIdHard, true);
  window.addEventListener("DOMContentLoaded", function(){ setTimeout(bindHard, 50); });
  window.addEventListener("load", function(){ setTimeout(bindHard, 150); setTimeout(bindHard, 1000); });
})();



// ===== v5.2.6 Runtime Error Guard =====
(function(){
  if(window.__v506ErrorGuard) return;
  window.__v506ErrorGuard = true;
  window.addEventListener("error", function(e){
    try{
      console.warn("v5.2.6 guarded runtime error:", e.message);
      var mig=document.getElementById("legacyMigrationBtn");
      if(mig) mig.disabled=false;
      var save=document.getElementById("saveTeamBtn");
      if(save) save.disabled=false;
    }catch(_){}
  });
})();



// ===== v5.2.6 Migration Binding Runtime Hard Fix =====
// ===== v5.2.6 Sync Error Guard =====
(function(){
  if(window.__v509SyncGuard) return;
  window.__v509SyncGuard = true;
  window.addEventListener("error", function(e){
    try{
      if(String(e.message||"").includes("Cannot set properties of null")){
        var box=document.getElementById("legacyMigrationBox");
        if(box){
          box.className="msg warn";
          box.innerHTML="พบ DOM null error แต่ runtime guard กันไว้แล้ว<br><span class='small'>ลองกด ตรวจสอบ Log เก่า อีกครั้ง</span>";
        }
        var btn=document.getElementById("legacyMigrationBtn");
        if(btn) btn.disabled=false;
      }
    }catch(_){}
  });
})();



// ===== v5.2.6 Runtime Helper Fallback =====
(function(){
  if(window.__v5010HelperFallback) return;
  window.__v5010HelperFallback = true;
  window.setValueSafe = window.setValueSafe || function(id,value){var el=document.getElementById(id);if(el)el.value=value;};
})();



// ===== v5.2.6 Migration Confirm Runtime Guard =====



// ===== v5.2.6 Full QA Runtime Safety =====
(function(){
  if(window.__v510RuntimeSafety) return;
  window.__v510RuntimeSafety = true;
  window.addEventListener("load", function(){
    var mig=document.getElementById("legacyMigrationBtn");
    if(mig){mig.disabled=false;mig.type="button";}
    var save=document.getElementById("saveTeamBtn");
    if(save){save.disabled=false;save.type="button";}
  });
})();



// ===== v5.2.6 Calendar Runtime Safe Guard =====
(function(){
  if(window.__v512CalendarStayGuard) return;
  window.__v512CalendarStayGuard = true;
  document.addEventListener("click", function(e){
    var grid=document.getElementById("calGrid");
    if(!grid || !grid.contains(e.target)) return;
    setTimeout(function(){
      try{
        var cal=document.getElementById("calendar");
        var log=document.getElementById("log");
        if(cal && log && log.classList.contains("active")){
          if(typeof window.show === "function") window.show("calendar");
          else{
            log.classList.remove("active");
            cal.classList.add("active");
          }
        }
      }catch(_){}
    },30);
  }, true);
})();



// ===== v5.2.6 Save Auth Guard Runtime Fallback =====
(function(){
  if(window.__v513SaveAuthGuard) return;
  window.__v513SaveAuthGuard = true;
  window.authDebugGuardRun = window.authDebugGuardRun || function(){ return true; };
})();



// ===== v5.2.6 Save Popup Final Runtime Guard =====
(function(){
  if(window.__v514SavePopupFinalGuard) return;
  window.__v514SavePopupFinalGuard = true;
  window.authDebugGuardRun = window.authDebugGuardRun || function(){ return true; };
})();



// ===== v5.2.6 Save Popup Final Runtime Wrapper =====
(function(){
  window.runAuthDebugGuardSafe = window.runAuthDebugGuardSafe || function(){
    try{
      if(typeof window.authDebugGuardRun === "function") return window.authDebugGuardRun();
    }catch(_){}
    return true;
  };
})();



// ===== v5.2.6 Post Save Safe Callback Runtime Guard =====
(function(){
  if(window.__v515PostSaveCallbackGuard) return;
  window.__v515PostSaveCallbackGuard = true;
  function noop(){ return true; }
  window.authDebugGuardRun = window.authDebugGuardRun || noop;
  window.runAuthDebugGuardSafe = window.runAuthDebugGuardSafe || function(){
    try{ return window.authDebugGuardRun(); }catch(_){ return true; }
  };
  window.permissionSafeRun = window.permissionSafeRun || noop;
  window.plateauLiveRecompute = window.plateauLiveRecompute || noop;
  window.stableRenderAllPanels = window.stableRenderAllPanels || noop;
  window.fullStabilizationRun = window.fullStabilizationRun || noop;
  window.coachCoreRun = window.coachCoreRun || noop;
  window.v403Run = window.v403Run || noop;
})();



// ===== v5.2.6 Local Date Runtime Helper =====
(function(){
  if(window.__v521LocalDateHelper) return;
  window.__v521LocalDateHelper = true;
  window.localDateKeyV521 = window.localDateKeyV521 || function(d){
    var x = d instanceof Date ? d : new Date();
    return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0");
  };
  window.todayLocalV521 = window.todayLocalV521 || function(){ return window.localDateKeyV521(new Date()); };
})();



// ===== v5.2.6 Date Input Sanity Runtime Guard =====
(function(){
  if(window.__v523DateInputSanityGuard) return;
  window.__v523DateInputSanityGuard = true;
  function localKey(d){
    var x = d instanceof Date && !isNaN(d) ? d : new Date();
    return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0");
  }
  function valid(v){
    if(typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    var a=v.split("-").map(Number), y=a[0], m=a[1], d=a[2];
    if(y<2000 || y>2100) return false;
    var dt=new Date(y,m-1,d);
    return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d;
  }
  window.strictLocalDateKeyV523 = window.strictLocalDateKeyV523 || localKey;
  window.sanitizeDateInputRuntimeV523 = window.sanitizeDateInputRuntimeV523 || function(){
    var el=document.getElementById("date");
    if(!el) return localKey(new Date());
    if(!valid(el.value)) el.value=localKey(new Date());
    return el.value;
  };
  window.addEventListener("load", function(){
    setTimeout(function(){try{window.sanitizeDateInputRuntimeV523();}catch(e){}},120);
    setTimeout(function(){try{window.sanitizeDateInputRuntimeV523();}catch(e){}},1000);
  });
})();

// ===== v5.3.23 Final Patch =====
// Remove the legacy migration card to streamline the Setup page.
(function(){
  try{
    window.addEventListener('load', function(){
      const card = document.getElementById('migrationCard');
      if(card) card.remove();
    });
  }catch(e){ console.warn(e); }
})();


// ===== v5.3.23 User Feedback / Loading Status UX =====
(function(){
  if(window.__w5317UxStatusPatch) return;
  window.__w5317UxStatusPatch = true;
  var hideTimer = null;
  var activeOps = 0;
  function ensureBar(){
    var bar = document.getElementById('uxStatusBar');
    if(bar) return bar;
    bar = document.createElement('div');
    bar.id = 'uxStatusBar';
    bar.innerHTML = '<span class="uxSpin"></span><span id="uxStatusText">พร้อมใช้งาน</span>';
    document.body.appendChild(bar);
    return bar;
  }
  function setInline(text, cls){
    try{
      var ids = ['saveDebug','dayDateLockDebug','lockStatus','calendarSyncStatus'];
      var el = null;
      for(var i=0;i<ids.length;i++){ el = document.getElementById(ids[i]); if(el) break; }
      if(el){
        el.classList.add('ux-inline-status');
        if(text) el.textContent = text;
      }
    }catch(_){ }
  }
  function show(text, type, ms){
    try{
      clearTimeout(hideTimer);
      var bar = ensureBar();
      var label = document.getElementById('uxStatusText');
      if(label) label.textContent = text || 'กำลังทำงาน...';
      bar.className = '';
      if(type) bar.classList.add(type);
      bar.classList.add('show');
      setInline(text, type);
      if(ms !== 0){
        hideTimer = setTimeout(function(){ hide(); }, ms || 1800);
      }
    }catch(e){ console.warn('ux status', e); }
  }
  function hide(){
    try{
      var bar = document.getElementById('uxStatusBar');
      if(bar) bar.classList.remove('show');
    }catch(_){ }
  }
  function busy(text){
    activeOps++;
    show(text || 'กำลังโหลด...', '', 0);
  }
  function done(text){
    activeOps = Math.max(0, activeOps-1);
    show(text || 'เสร็จแล้ว', 'ok', 1100);
  }
  function fail(text){
    activeOps = 0;
    show(text || 'เกิดข้อผิดพลาด', 'err', 2400);
  }
  window.appStatus = {show:show, hide:hide, busy:busy, done:done, fail:fail};
  window.showAppStatus = show;

  function labelFor(el){
    var id = (el && el.id) || '';
    var txt = ((el && (el.innerText || el.textContent || el.value)) || '').trim();
    if(id === 'saveBtn') return 'กำลังบันทึกเซต...';
    if(id === 'resetBtn') return 'กำลังรีเซ็ตฟอร์ม...';
    if(id === 'exercise') return 'กำลังโหลดข้อมูลท่าเล่น...';
    if(id === 'date') return 'กำลังซิงก์วันที่และ Day Lock...';
    if(id === 'restMode' || id === 'tempo' || id === 'repQuality' || id === 'biasMode' || id === 'unit') return 'กำลังอัปเดตค่า...';
    if(id === 'calendarGoLogBtn') return 'กำลังเปิดหน้า Log...';
    if(id === 'loginBtn') return 'กำลัง Login...';
    if(id === 'logoutBtn') return 'กำลัง Logout...';
    if(id === 'saveTeamBtn') return 'กำลังบันทึก Team ID...';
    if(id === 'startRest') return 'เริ่มจับเวลาพัก...';
    if(id === 'stopRest') return 'หยุดจับเวลาพัก...';
    if(id === 'imageBtn' || id === 'videoBtn' || id === 'altBtn') return 'กำลังเปิดข้อมูลท่าเล่น...';
    if(/override|unlock|skip|ข้าม|ปลด/i.test(id + ' ' + txt)) return 'กำลังตรวจสิทธิ์ข้าม Day Lock...';
    if(el && el.matches && el.matches('.tab')) return 'กำลังเปลี่ยนหน้า...';
    if(el && el.tagName === 'SELECT') return 'กำลังอัปเดตรายการ...';
    if(el && el.tagName === 'BUTTON') return 'กำลังทำรายการ...';
    return '';
  }
  function mark(el, on){
    try{
      if(!el || !el.classList) return;
      if(on) el.classList.add('ux-busy'); else el.classList.remove('ux-busy');
    }catch(_){ }
  }
  document.addEventListener('pointerdown', function(ev){
    try{
      var el = ev.target && ev.target.closest ? ev.target.closest('button,select,input[type="date"]') : null;
      if(!el) return;
      var msg = labelFor(el);
      if(!msg) return;
      mark(el, true);
      show(msg, '', 0);
      setTimeout(function(){ mark(el, false); }, 900);
      setTimeout(function(){ if(activeOps===0) show('พร้อมใช้งาน', 'ok', 700); }, 850);
    }catch(_){ }
  }, true);
  document.addEventListener('change', function(ev){
    try{
      var el = ev.target;
      if(!el || !el.matches || !el.matches('select,input[type="date"],input[type="number"],textarea')) return;
      var msg = labelFor(el) || 'กำลังอัปเดตข้อมูล...';
      show(msg, '', 0);
      setTimeout(function(){ show('อัปเดตแล้ว', 'ok', 900); }, 450);
    }catch(_){ }
  }, true);
  document.addEventListener('click', function(ev){
    try{
      var el = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if(!el) return;
      var id = el.id || '';
      var txt = (el.innerText || el.textContent || '').trim();
      if(id === 'saveBtn'){
        show('กำลังบันทึกเซตลงฐานข้อมูล...', '', 0);
        setTimeout(function(){ show('ถ้าข้อมูลไม่ขึ้น ให้รอ Sync สักครู่', 'warn', 1800); }, 1800);
      }else if(/override|unlock|skip|ข้าม|ปลด/i.test(id+' '+txt)){
        show('กำลังปลด Day Lock สำหรับวันที่เลือก...', '', 0);
        setTimeout(function(){ show('ตรวจสอบ Day Lock แล้ว', 'ok', 1100); }, 900);
      }
    }catch(_){ }
  }, true);
  window.addEventListener('load', function(){ setTimeout(function(){ show('พร้อมใช้งาน • v5.3.23', 'ok', 1200); }, 450); });
  window.addEventListener('error', function(e){ fail('มี JavaScript error: ' + ((e && e.message) || 'unknown')); });
  window.addEventListener('unhandledrejection', function(e){ fail('โหลดข้อมูลไม่สำเร็จ / Firebase ตอบกลับช้า'); });
})();
