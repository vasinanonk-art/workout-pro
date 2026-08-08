const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("js/app.module.js","utf8").replace(/^import .*;\n/gm,"");

function element(value=""){
  return {value:String(value),textContent:"",className:"",innerHTML:"",disabled:false,options:[],querySelectorAll(){ return []; },addEventListener(type,fn){ this.listeners??={}; this.listeners[type]=fn; }};
}
function deferred(){
  let resolve,reject;
  const promise=new Promise((res,rej)=>{ resolve=res; reject=rej; });
  return {promise,resolve,reject};
}
function snapshot(logs){ return {docs:logs.map(({id,...data})=>({id,data:()=>data}))}; }

function loadApp(storageSeed={},storageUnavailable=false){
  const storage=new Map(Object.entries(storageSeed));
  const elements={};
  const calls={adds:[],updates:[],snapshots:[],errors:[],authCallback:null,addDeferred:null,updateDeferred:null};
  let nextId=1;
  const document={
    getElementById:id=>elements[id]||null,
    querySelectorAll:()=>[],
    createElement:tag=>tag==="option"?{value:"",textContent:"",dataset:{},disabled:false,selected:false}:element(),
    body:{classList:{add(){},remove(){}}},
    addEventListener(){}
  };
  const context={
    console:{...console,error:(...args)=>calls.errors.push(args)},
    Date,
    Intl,
    Math,
    Map,
    Set,
    Blob,
    URL,
    setTimeout:fn=>{ fn(); return 1; },
    clearTimeout(){},
    setInterval:()=>1,
    clearInterval(){},
    document,
    navigator:{},
    Notification:{permission:"denied",requestPermission:()=>Promise.resolve("denied")},
    localStorage:{
      getItem:key=>{ if(storageUnavailable) throw new Error("blocked"); return storage.has(key)?storage.get(key):null; },
      setItem:(key,value)=>{ if(storageUnavailable) throw new Error("blocked"); storage.set(key,String(value)); },
      removeItem:key=>{ if(storageUnavailable) throw new Error("blocked"); storage.delete(key); }
    },
    window:{addEventListener(){},open(){},AudioContext:null},
    initializeApp:()=>({}), getAuth:()=>({}), getFirestore:()=>({}), GoogleAuthProvider:function(){},
    signInWithPopup:()=>Promise.resolve(), signOut:()=>Promise.resolve(),
    onAuthStateChanged:(auth,fn)=>{ calls.authCallback=fn; },
    collection:(...args)=>args, query:(...args)=>args, orderBy:(...args)=>args,
    doc:(...args)=>args.length===1?{id:`auto-${nextId++}`}:{id:String(args.at(-1))}, serverTimestamp:()=>({server:true}),
    setDoc:async(ref,payload)=>{ calls.adds.push({ref,payload}); if(calls.addDeferred) return calls.addDeferred.promise; },
    updateDoc:async(ref,payload)=>{ calls.updates.push({ref,payload}); if(calls.updateDeferred) return calls.updateDeferred.promise; }, deleteDoc:async()=>{},
    onSnapshot:(q,next)=>{ calls.snapshots.push(next); return ()=>{}; }
  };
  context.window.document=document;
  context.window.Notification=context.Notification;
  context.globalThis=context;
  const expose=`\n;globalThis.__app={state,bind,saveSet,subscribeLogs,renderExerciseSelect,resolveSelectedExercise,renderCalendar,renderRecent,renderSetup,updateFormDerived,restorePersistentAlt,readPersistentAlt,writePersistentAlt,clearPersistentAlt,isValidDateKey,clearScopedWorkoutState,setRender(fn){renderAll=fn},setTimer(fn){startTimer=fn}};`;
  vm.runInNewContext(source+expose,context,{filename:"js/app.module.js"});
  context.__app.setRender(()=>{});
  context.__app.setTimer(()=>{});
  return {api:context.__app,storage,elements,calls};
}

function form(elements,values={}){
  const defaults={weight:50,reps:8,rir:2,sleepHours:7,soreness:2,stress:2,tempo:"2-0-1",repQuality:"good",biasMode:"auto",restMode:"auto",restSec:75,unit:"kg",note:"",date:"2026-08-08"};
  for(const [id,value] of Object.entries({...defaults,...values})) elements[id]=element(value);
  for(const id of ["tempo","repQuality","biasMode","restMode","unit"]){ elements[id].options=[{value:elements[id].value}]; }
  elements.appStatusBar=element();
  elements.saveBtn=element();
}

test("malformed and wrong-schema startup storage falls back without crashing",()=>{
  const {api}=loadApp({sessionExerciseByDateV556:"{broken",dayLockOverridesV540:'{"wrong":true}'});
  assert.deepEqual(Object.keys(api.state.sessionExerciseByDate),[]);
  assert.equal(api.state.overrideKeys.size,0);
});

test("unavailable startup storage falls back without crashing",()=>{
  const {api}=loadApp({},true);
  assert.equal(api.state.teamId,"Beer-Team");
  assert.deepEqual(Object.keys(api.state.sessionExerciseByDate),[]);
  assert.equal(api.state.overrideKeys.size,0);
});

test("real date validation rejects impossible dates",()=>{
  const {api}=loadApp();
  assert.equal(api.isValidDateKey("2024-02-29"),true);
  assert.equal(api.isValidDateKey("2026-02-29"),false);
  assert.equal(api.isValidDateKey("2026-13-01"),false);
});

test("completed historical edit keeps exercise and bypasses new-set guards",async()=>{
  const {api,elements,calls,storage}=loadApp({"persistent_alt_Lat Pulldown":JSON.stringify({version:1,name:"Machine Pulldown"}),sessionExerciseByDateV556:JSON.stringify({"2026-01-01":"Barbell Bench Press"})});
  form(elements,{weight:90,reps:6,note:"updated"});
  const original={id:"log-1",date:"2026-01-01",week:3,day:"Day 2",plannedExercise:"Lat Pulldown",exercise:"Machine Pulldown",weightKg:80,reps:5,rir:2,targetSets:4,createdMs:1};
  api.state.user={uid:"user-1"};
  api.state.logs=[original,...[2,3,4].map(i=>({...original,id:`log-${i}`,createdMs:i}))];
  api.state.editingId="log-1";
  api.state.selectedDate=original.date;
  api.state.selectedExercise=original.plannedExercise;
  api.state.selectedAlt={name:original.exercise,original:original.plannedExercise};
  const select=element();
  select.appendChild=function(option){ this.options.push(option); };
  select.insertBefore=function(option){ this.options.unshift(option); };
  Object.defineProperty(select,"innerHTML",{set(){ this.options=[]; },get(){ return ""; }});
  elements.exercise=select;
  api.resolveSelectedExercise();
  assert.equal(api.state.selectedExercise,"Lat Pulldown");
  assert.equal(api.state.selectedAlt.name,"Machine Pulldown");
  api.renderExerciseSelect();
  assert.equal(api.state.selectedExercise,"Lat Pulldown");
  api.updateFormDerived();
  assert.equal(elements.saveBtn.disabled,false);
  await api.saveSet();
  assert.equal(calls.updates.length,1);
  assert.deepEqual(
    [calls.updates[0].payload.date,calls.updates[0].payload.week,calls.updates[0].payload.day,calls.updates[0].payload.plannedExercise,calls.updates[0].payload.exercise],
    [original.date,original.week,original.day,original.plannedExercise,original.exercise]
  );
  assert.equal(storage.get("persistent_alt_Lat Pulldown"),JSON.stringify({version:1,name:"Machine Pulldown"}));
});

test("calendar date click does not replace historical exercise context",()=>{
  const {api,elements}=loadApp();
  const cells=[];
  const grid=element();
  Object.defineProperty(grid,"innerHTML",{
    set(html){
      cells.length=0;
      for(const match of html.matchAll(/data-date="([^"]+)"/g)){
        const cell=element();
        cell.dataset={date:match[1]};
        cells.push(cell);
      }
    },
    get(){ return ""; }
  });
  grid.querySelectorAll=()=>cells;
  elements.calGrid=grid;
  api.state.editingId="historical";
  api.state.selectedExercise="Lat Pulldown";
  api.state.selectedDate="2026-01-01";
  api.state.calendarMonth="2026-02";
  api.renderCalendar();
  assert.ok(cells.length>0);
  cells[0].listeners.click();
  assert.equal(api.state.selectedExercise,"Lat Pulldown");
});

test("exercise dropdown change does not replace historical exercise context",()=>{
  const {api,elements}=loadApp();
  elements.exercise=element("Barbell Bench Press");
  api.state.editingId="historical";
  api.state.selectedExercise="Lat Pulldown";
  api.bind();
  elements.exercise.listeners.change({target:elements.exercise});
  assert.equal(api.state.selectedExercise,"Lat Pulldown");
  assert.equal(elements.exercise.value,"Lat Pulldown");
});

test("logout clears account-scoped logs and pending writes",()=>{
  const {api,calls}=loadApp();
  api.state.user={uid:"user-1"};
  api.state.logs=[{id:"old"}];
  api.state.pendingWrites.set("pending",{id:"pending"});
  calls.authCallback(null);
  assert.equal(api.state.logs.length,0);
  assert.equal(api.state.pendingWrites.size,0);
  assert.equal(api.state.subscriptionScope,null);
});

test("team switch clears old logs before subscribing to the new scope",()=>{
  const {api,elements,calls}=loadApp();
  api.state.user={uid:"user-1"};
  api.state.teamId="old-team";
  api.state.logs=[{id:"old"}];
  api.state.pendingWrites.set("pending",{type:"add",optimistic:{id:"pending"}});
  elements.teamId=element("new-team");
  elements.saveTeamBtn=element();
  api.bind();
  elements.saveTeamBtn.listeners.click();
  assert.equal(api.state.logs.length,0);
  assert.equal(api.state.pendingWrites.size,0);
  assert.equal(api.state.teamId,"new-team");
  assert.equal(api.state.subscriptionScope,"user-1|new-team");
  assert.equal(calls.snapshots.length,1);
});

test("snapshot before add promise resolution does not duplicate optimistic add",async()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{weight:60,reps:10});
  api.state.user={uid:"user-1"};
  api.state.selectedDate="2026-08-08";
  api.subscribeLogs();
  calls.addDeferred=deferred();
  const saving=api.saveSet();
  const id=api.state.logs[0].id;
  calls.snapshots[0](snapshot([{id,date:"2026-08-08",week:1,day:"Day 1",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:60,reps:10,rir:2}]));
  assert.equal(api.state.logs.length,1);
  assert.equal(api.state.logs[0].id,id);
  assert.equal(api.state.pendingWrites.size,1);
  calls.addDeferred.resolve();
  await saving;
  assert.equal(api.state.logs.length,1);
  assert.equal(api.state.pendingWrites.size,0);
});

test("add promise before snapshot reconciles to one server record by id",async()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{weight:62.5,reps:8});
  api.state.user={uid:"user-1"};
  api.state.selectedDate="2026-08-08";
  api.subscribeLogs();
  await api.saveSet();
  const id=api.state.logs[0].id;
  assert.equal(api.state.pendingWrites.size,0);
  calls.snapshots[0](snapshot([{id,date:"2026-08-08",week:1,day:"Day 1",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:62.5,reps:8,rir:2}]));
  assert.equal(api.state.logs.length,1);
  assert.equal(api.state.logs[0].id,id);
});

test("stale update snapshot cannot revert optimistic update while pending",async()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{weight:90,reps:6});
  const original={id:"log-1",date:"2026-01-01",week:2,day:"Day 1",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:80,reps:5,rir:2,targetSets:4,createdMs:1};
  api.state.user={uid:"user-1"};
  api.state.logs=[original];
  api.state.editingId=original.id;
  api.state.selectedDate=original.date;
  api.state.selectedExercise=original.plannedExercise;
  api.subscribeLogs();
  calls.updateDeferred=deferred();
  const saving=api.saveSet();
  calls.snapshots[0](snapshot([original]));
  assert.equal(api.state.logs.length,1);
  assert.equal(api.state.logs[0].weightKg,90);
  assert.equal(api.state.pendingWrites.size,1);
  calls.updateDeferred.resolve();
  await saving;
  assert.equal(api.state.logs[0].weightKg,90);
  assert.equal(api.state.pendingWrites.size,0);
});

test("successful update clears pending state and keeps optimistic result",async()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{weight:85,reps:7});
  const original={id:"log-1",date:"2026-01-01",week:2,day:"Day 1",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:80,reps:5,rir:2,targetSets:4,createdMs:1};
  api.state.user={uid:"user-1"};
  api.state.logs=[original];
  api.state.editingId=original.id;
  api.state.selectedDate=original.date;
  api.state.selectedExercise=original.plannedExercise;
  await api.saveSet();
  assert.equal(calls.updates.length,1);
  assert.equal(api.state.pendingWrites.size,0);
  assert.equal(api.state.logs[0].weightKg,85);
  assert.equal(api.state.editingId,null);
});

test("failed add removes optimistic record",async()=>{
  const {api,elements,calls}=loadApp();
  form(elements);
  api.state.user={uid:"user-1"};
  api.state.selectedDate="2026-08-08";
  calls.addDeferred=deferred();
  const saving=api.saveSet();
  assert.equal(api.state.logs.length,1);
  calls.addDeferred.reject(new Error("add failed"));
  await saving;
  assert.equal(api.state.logs.length,0);
  assert.equal(api.state.pendingWrites.size,0);
});

test("failed update restores previous record",async()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{weight:95,reps:6});
  const original={id:"log-1",date:"2026-01-01",week:2,day:"Day 1",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:80,reps:5,rir:2,targetSets:4,createdMs:1,note:"before"};
  api.state.user={uid:"user-1"};
  api.state.logs=[original];
  api.state.editingId=original.id;
  api.state.selectedDate=original.date;
  api.state.selectedExercise=original.plannedExercise;
  calls.updateDeferred=deferred();
  const saving=api.saveSet();
  assert.equal(api.state.logs[0].weightKg,95);
  calls.updateDeferred.reject(new Error("update failed"));
  await saving;
  assert.equal(api.state.logs[0],original);
  assert.equal(api.state.logs[0].weightKg,80);
  assert.equal(api.state.logs[0].note,"before");
  assert.equal(api.state.pendingWrites.size,0);
});

test("invalid inputs are rejected before writes",async()=>{
  const cases=[
    {weight:"NaN"}, {weight:-1}, {reps:1.5}, {reps:0}, {rir:6},
    {sleepHours:13}, {soreness:0}, {stress:6}, {date:"2026-02-29"}
  ];
  for(const values of cases){
    const {api,elements,calls}=loadApp();
    form(elements,values);
    api.state.user={uid:"user-1"};
    api.state.selectedDate=String(values.date||"2026-08-08");
    await api.saveSet();
    assert.equal(calls.adds.length,0,JSON.stringify(values));
  }
});

test("stored HTML is escaped in note and Team ID rendering",()=>{
  const {api,elements}=loadApp();
  elements.recent=element();
  elements.debug=element();
  elements.teamSaveStatus=element();
  api.state.teamId='<img src=x onerror="boom()">';
  api.state.logs=[{id:"x",date:"2026-08-08",plannedExercise:"Barbell Bench Press",exercise:'<img onerror="boom()">',note:'<script>boom()</script>',weightKg:1,reps:1,rir:1,createdMs:1}];
  api.renderRecent();
  api.renderSetup();
  assert.doesNotMatch(elements.recent.innerHTML,/<script>|<img/i);
  assert.match(elements.recent.innerHTML,/&lt;script&gt;/);
  assert.doesNotMatch(elements.teamSaveStatus.innerHTML,/<img/i);
});

test("kg remains canonical and lb is unavailable",async()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{weight:42.5,unit:"kg"});
  api.state.user={uid:"user-1"};
  api.state.selectedDate="2026-08-08";
  await api.saveSet();
  assert.equal(calls.adds[0].payload.weightKg,42.5);
  const html=fs.readFileSync("index.html","utf8");
  assert.doesNotMatch(html,/<option value="lb">/);
});

test("persistent alternative contract and edit isolation remain intact",()=>{
  const {api,storage}=loadApp();
  api.writePersistentAlt("Barbell Bench Press","Machine Chest Press");
  assert.equal(storage.get("persistent_alt_Barbell Bench Press"),JSON.stringify({version:1,name:"Machine Chest Press"}));
  assert.equal(api.readPersistentAlt("Barbell Bench Press"),"Machine Chest Press");
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedAlt={name:"Dumbbell Bench Press"};
  api.state.editingId="historical";
  api.restorePersistentAlt();
  assert.equal(api.state.selectedAlt.name,"Dumbbell Bench Press");
  storage.set("persistent_alt_Barbell Bench Press","{broken");
  assert.equal(api.readPersistentAlt("Barbell Bench Press"),null);
  assert.equal(storage.has("persistent_alt_Barbell Bench Press"),false);
});

test("visible and runtime versions are consistent",()=>{
  assert.match(fs.readFileSync("js/runtime.js","utf8"),/VERSION='v5\.5\.7'/);
  assert.match(fs.readFileSync("index.html","utf8"),/app\.module\.js\?v=557/);
});
