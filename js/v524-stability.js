
(function(){
 if(window.__V524_PATCH__) return;
 window.__V524_PATCH__=true;

 function $(id){return document.getElementById(id);}
 function today(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 }

 function syncHeader(){
  try{
   document.title='Workout PRO v5.2.4';
   const u=$('userLine');
   if(u) u.textContent='Clean QA • Auto Week • Rest Rule • Double Progression • Quality • SFR • v5.2.4';
   const subs=document.querySelectorAll('header .sub');
   if(subs.length>1) subs[1].textContent='Updated 2026-06-09 • Build 2026-06-09';
  }catch(e){}
 }

 function dateGuard(){
  const el=$('date');
  if(!el||el.dataset.v524) return;
  el.dataset.v524='1';
  let locked=el.value||today();

  const keep=()=>{locked=el.value||today();};
  el.addEventListener('change',keep,true);
  el.addEventListener('input',keep,true);

  setInterval(()=>{
   try{
    const d=$('date');
    if(d && locked && d.value!==locked && document.activeElement!==d){
      d.value=locked;
    }
   }catch(e){}
  },500);
 }

 function saveGuard(){
  const btn=$('saveBtn');
  if(!btn||btn.dataset.v524) return;
  btn.dataset.v524='1';
  const txt=btn.textContent;

  btn.addEventListener('click',()=>{
    if(btn.disabled) return;
    setTimeout(()=>{
      btn.disabled=true;
      btn.textContent='กำลังบันทึก...';
      setTimeout(()=>{
        btn.disabled=false;
        btn.textContent=txt;
      },12000);
    },0);
  },true);
 }

 window.addEventListener('load',()=>{
   syncHeader();
   dateGuard();
   saveGuard();
 });
})();
