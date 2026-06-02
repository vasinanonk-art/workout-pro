// v4.2.0 Stable Performance QA runtime
(function(){
  if(window.__workoutV420Runtime) return;
  window.__workoutV420Runtime=true;

  function hideCompleteOutsideLog(){
    try{
      const box=document.getElementById("exerciseCompleteBox");
      const active=document.querySelector(".page.active");
      if(box && active && active.id!=="log") box.style.display="none";
    }catch(e){}
  }

  function restoreSavedPage(){
    try{
      const saved=localStorage.getItem("workoutActivePage");
      if(!saved || !document.getElementById(saved)) return;
      document.querySelectorAll(".page").forEach(p=>{
        const on=p.id===saved;
        p.classList.toggle("active",on);
        p.style.display=on?"":"none";
      });
      document.querySelectorAll(".tab[data-page]").forEach(t=>t.classList.toggle("active",t.dataset.page===saved));
      hideCompleteOutsideLog();
    }catch(e){}
  }

  window.addEventListener("DOMContentLoaded",restoreSavedPage);
  document.addEventListener("click",function(e){
    if(e.target.closest && e.target.closest(".tab[data-page]")) setTimeout(hideCompleteOutsideLog,40);
  },true);
})();
