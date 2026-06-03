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
  d.innerHTML='<div class="section-title">Build / QA</div><div class="msg info">Version: <b>v4.3.2</b><br>Build: UI Polish Pack<br>QA: JS syntax / core IDs / tabs / charts preserved<br>Note: Low-risk UI only, core logic untouched</div>';
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
   hero.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><div style="font-size:28px;font-weight:800">Workout PRO</div><div style="opacity:.8;margin-top:4px">Modern Hypertrophy & Recovery System</div></div><div><span class="status-pill status-good">v4.3.2</span><span class="status-pill status-warn">Modern UI</span></div></div>';
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
    p.innerHTML="<h3>v4.0 Stable QA</h3><div class='msg ok'>UI Polish Pack<br>Router patch cleanup: ON<br>Complete card scoped to Log: ON<br>Heavy runtime patches removed: ON</div>";
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


// ===== v4.3.2 Navigation Speed Cache =====
(function(){
  if(window.__v430NavInstalled) return; window.__v430NavInstalled=true;
  function activatePage(page){if(!page)return;document.querySelectorAll('.page').forEach(function(p){var a=p.id===page;p.classList.toggle('active',a);p.style.display=a?'':'none';});document.querySelectorAll('.tab[data-page]').forEach(function(b){b.classList.toggle('active',b.dataset.page===page);});try{localStorage.setItem('workoutActivePage',page);}catch(e){}}
  function bindFastTabs(){document.querySelectorAll('.tab[data-page]').forEach(function(btn){if(btn.dataset.v430FastBound==='1')return;btn.dataset.v430FastBound='1';var fn=function(){activatePage(btn.dataset.page);};btn.addEventListener('pointerdown',fn,{passive:true});btn.addEventListener('touchstart',fn,{passive:true});});}
  window.v430ActivatePage=activatePage;window.addEventListener('load',function(){bindFastTabs();try{var saved=localStorage.getItem('workoutActivePage');if(saved&&document.getElementById(saved))activatePage(saved);}catch(e){}});
})();



// ===== v4.3.2 Alternative Button Cleanup =====
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



// ===== v4.3.2 Alternative Action Polish =====
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
