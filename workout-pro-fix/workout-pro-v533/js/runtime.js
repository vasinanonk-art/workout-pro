(function(){
  function fix(){
    try{
      const el = document.getElementById('userLine');
      if(el){
        el.innerHTML = el.innerHTML.replace(/v\d+\.\d+\.\d+/g, 'v5.3.3');
      }
      document.title = "Workout PRO v5.3.3";
    }catch(e){}
  }
  window.addEventListener('load', fix);
  setTimeout(fix, 500);
})();

(function(){
  window.addEventListener('load', function(){
    const el = document.getElementById('migrationCard');
    if(el) el.remove();
  });
})();
