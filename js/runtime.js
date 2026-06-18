(function(){
  const VERSION='v5.5.3';
  function syncLabels(){
    document.title='Workout PRO '+VERSION;
    document.querySelectorAll('.badge,.version').forEach(el=>{ if(/v\d+\.\d+\.\d+/.test(el.textContent)) el.textContent=VERSION; });
    const userLine=document.getElementById('userLine');
    if(userLine) userLine.textContent='Clean Rebuild • Single State Engine • Day Lock • Log Stable • '+VERSION;
  }
  window.WORKOUT_PRO_VERSION=VERSION;
  window.addEventListener('DOMContentLoaded', syncLabels);
  window.addEventListener('load', syncLabels);
})();
