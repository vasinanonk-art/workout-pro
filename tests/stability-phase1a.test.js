const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const exerciseLibrarySource = fs.readFileSync("js/exercise-library.js","utf8");
const progressionEngineSource = fs.readFileSync("js/progression-engine.js","utf8");
const smartAlternativeSource = fs.readFileSync("js/smart-alternative.js","utf8");
const source = `${exerciseLibrarySource.replace(/^export /gm,"")}\n${progressionEngineSource.replace(/^export /gm,"")}\n${smartAlternativeSource.replace(/^import .*;\n/gm,"").replace(/^export /gm,"")}\n${fs.readFileSync("js/app.module.js","utf8").replace(/^import .*;\n/gm,"")}`;

test("exercise library module imports its public API",async()=>{
  const url=`data:text/javascript;base64,${Buffer.from(exerciseLibrarySource).toString("base64")}`;
  const library=await import(url);
  for(const name of ["PROGRAM","ALT","PLANNED_BY_ALTERNATIVE","ALTERNATIVE_REASONS","EXERCISE_LIBRARY","EX_DB","tieredAlternativesForExercise","alternativesForExercise","exInfo","canonicalExercise","getExerciseDbRows","uniqueBy"]){
    assert.notEqual(library[name],undefined,name);
  }
});

test("exercise library module preserves canonical lookup behavior",async()=>{
  const url=`data:text/javascript;base64,${Buffer.from(exerciseLibrarySource).toString("base64")}`;
  const {canonicalExercise}=await import(url);
  assert.equal(canonicalExercise("Machine Chest Press"),"Barbell Bench Press");
  assert.equal(canonicalExercise("Cable Fly"),"Cable Fly");
  assert.equal(canonicalExercise("Unknown Exercise"),"Unknown Exercise");
});

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
  const calls={adds:[],updates:[],snapshots:[],snapshotErrors:[],errors:[],warnings:[],opens:[],intervals:[],clearedIntervals:[],authCallback:null,addDeferred:null,updateDeferred:null};
  let nextId=1;
  const document={
    getElementById:id=>elements[id]||null,
    querySelectorAll:()=>[],
    createElement:tag=>tag==="option"?{value:"",textContent:"",dataset:{},disabled:false,selected:false}:element(),
    body:{classList:{add(){},remove(){}}},
    addEventListener(){}
  };
  const context={
    console:{...console,error:(...args)=>calls.errors.push(args),warn:(...args)=>calls.warnings.push(args)},
    Date,
    Intl,
    Math,
    Map,
    Set,
    Blob,
    URL,
    setTimeout:fn=>{ fn(); return 1; },
    clearTimeout(){},
    setInterval:fn=>{ const id=calls.intervals.length+1; calls.intervals.push({id,fn}); return id; },
    clearInterval:id=>{ calls.clearedIntervals.push(id); },
    document,
    navigator:{},
    Notification:{permission:"denied",requestPermission:()=>Promise.resolve("denied")},
    localStorage:{
      getItem:key=>{ if(storageUnavailable) throw new Error("blocked"); return storage.has(key)?storage.get(key):null; },
      setItem:(key,value)=>{ if(storageUnavailable) throw new Error("blocked"); storage.set(key,String(value)); },
      removeItem:key=>{ if(storageUnavailable) throw new Error("blocked"); storage.delete(key); }
    },
    window:{addEventListener(){},open:(...args)=>{ calls.opens.push(args); return {}; },AudioContext:null},
    initializeApp:()=>({}), getAuth:()=>({}), getFirestore:()=>({}), GoogleAuthProvider:function(){},
    signInWithPopup:()=>Promise.resolve(), signOut:()=>Promise.resolve(),
    onAuthStateChanged:(auth,fn)=>{ calls.authCallback=fn; },
    collection:(...args)=>args, query:(...args)=>args, orderBy:(...args)=>args,
    doc:(...args)=>args.length===1?{id:`auto-${nextId++}`}:{id:String(args.at(-1))}, serverTimestamp:()=>({server:true}),
    setDoc:async(ref,payload)=>{ calls.adds.push({ref,payload}); if(calls.addDeferred) return calls.addDeferred.promise; },
    updateDoc:async(ref,payload)=>{ calls.updates.push({ref,payload}); if(calls.updateDeferred) return calls.updateDeferred.promise; }, deleteDoc:async()=>{},
    onSnapshot:(q,next,error)=>{ calls.snapshots.push(next); calls.snapshotErrors.push(error); return ()=>{}; }
  };
  context.window.document=document;
  context.window.Notification=context.Notification;
  context.globalThis=context;
  const expose=`\n;const __realStartTimer=startTimer;globalThis.__app={state,bind,show,saveSet,subscribeLogs,renderExerciseSelect,resolveSelectedExercise,renderLogScheduleState,renderCalendar,renderRecent,renderSetup,renderPerformanceCard,renderPRAndSuggestion,usePreviousWorkout,useCurrentSessionLastSet,progressionSuggestion,applyProgressionSuggestion,smartAlternativesForCurrentExercise,selectAlternative,currentSessionLastSetForPlanned,lastSetForPlannedOnOrBefore,bestPerformanceForPlanned,currentCyclePlan,allowedTrainingDaysForDate,calcDayLock,updateFormDerived,updateTimerState,renderTimer,startRealTimer(){__realStartTimer()},useRealTimer(){startTimer=__realStartTimer},stopTimer,addRestTime,mediaSearchUrl,openExerciseMedia,restorePersistentAlt,readPersistentAlt,writePersistentAlt,clearPersistentAlt,rememberSessionExercise,clearSessionExercise,grantOverride,normalizeLog,isValidDateKey,clearScopedWorkoutState,plannedOf,samePlanned,inferPlannedExerciseFromActual,plannedCandidatesForAlternative,logsOnDate,logsForPlanned,completedForExercise,latestSetForPlanned,previousSetForPlanned,previousWorkoutForPlanned,replaceWorkoutLogs,getDerivedLogIndex:()=>derivedLogIndex,getIndexRebuildCount:()=>derivedLogIndexRebuildCount,alternativeInventory:()=>[...PLANNED_BY_ALTERNATIVE.entries()],exerciseLibrary:()=>EXERCISE_LIBRARY,program:()=>PROGRAM,alternatives:()=>ALT,canonicalExercise,alternativeReasons:()=>ALTERNATIVE_REASONS,setRender(fn){renderAll=fn},setTimer(fn){startTimer=fn}};`;
  vm.runInNewContext(source+expose,context,{filename:"js/app.module.js"});
  context.__app.setRender(()=>{});
  context.__app.setTimer(()=>{});
  return {api:context.__app,storage,elements,calls};
}

function form(elements,values={}){
  const defaults={weight:50,reps:8,rir:2,sleepHours:7,soreness:2,stress:2,tempo:"2-0-1",repQuality:"good",biasMode:"auto",restMode:"auto",restSec:75,unit:"kg",note:"",date:"2026-08-08"};
  for(const [id,value] of Object.entries({...defaults,...values})) elements[id]=element(value);
  elements.weight.step="0.5";
  for(const id of ["tempo","repQuality","biasMode","restMode","unit"]){ elements[id].options=[{value:elements[id].value}]; }
  elements.appStatusBar=element();
  elements.saveBtn=element();
}

function performanceElements(elements){
  for(const id of ["logPerformanceCard","performanceCurrent","performanceCurrentValue","performanceCurrentMeta","performancePrevious","performancePreviousValue","performancePreviousMeta","performanceSuggested","performanceSuggestedValue","performanceSuggestedMeta","applyProgressionBtn","performanceLast","performanceLastValue","performanceLastMeta","performanceBest","performanceBestValue","performanceBestMeta","usePreviousWorkoutBtn","useLastSetBtn"]){ elements[id]=element(); }
}

function completedProgramDay(api,day,date,start=1){
  let createdMs=start;
  return Array.from(api.program()).filter(row=>row[0]===day).flatMap(row=>Array.from({length:Number(row[3])},()=>({
    id:`${day}-${date}-${createdMs}`,date,day,plannedExercise:row[2],exercise:row[2],weightKg:50,reps:8,createdMs:createdMs++
  })));
}
function restDayLogs(api){
  return [...completedProgramDay(api,"Day 1","2026-02-01"),...completedProgramDay(api,"Day 2","2026-02-02",100)];
}
function exerciseSelectElement(){
  const select=element();
  select.appendChild=function(option){ this.options.push(option); };
  select.insertBefore=function(option){ this.options.unshift(option); };
  Object.defineProperty(select,"innerHTML",{set(){ this.options=[]; },get(){ return ""; }});
  return select;
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

test("shared alternative inventory includes same-day and cross-day owners",()=>{
  const {api}=loadApp();
  assert.deepEqual(
    Array.from(api.plannedCandidatesForAlternative("Machine Chest Press")),
    ["Barbell Bench Press","Incline Dumbbell Press","Incline Machine Press","Cable Fly"]
  );
  assert.deepEqual(
    Array.from(api.plannedCandidatesForAlternative("Dumbbell Shoulder Press")),
    ["Seated Shoulder Press","Machine Shoulder Press"]
  );
});

test("explicit plannedExercise wins over ambiguous alternative inference",()=>{
  const {api}=loadApp();
  assert.equal(api.plannedOf({plannedExercise:"Incline Machine Press",originalExercise:"Barbell Bench Press",exercise:"Machine Chest Press",day:"Day 1"}),"Incline Machine Press");
});

test("explicit originalExercise wins when plannedExercise is absent",()=>{
  const {api}=loadApp();
  assert.equal(api.plannedOf({originalExercise:"Cable Fly",exercise:"Machine Chest Press",day:"Day 1"}),"Cable Fly");
});

test("day-specific unique owner resolves a shared alternative",()=>{
  const {api}=loadApp();
  assert.deepEqual(Array.from(api.plannedCandidatesForAlternative("Cable Lateral Raise")),["Seated Shoulder Press","Dumbbell Lateral Raise","Machine Shoulder Press"]);
  assert.equal(api.inferPlannedExerciseFromActual("Cable Lateral Raise","Day 4"),"Machine Shoulder Press");
});

test("globally unique alternative resolves without day context",()=>{
  const {api}=loadApp();
  assert.deepEqual(Array.from(api.plannedCandidatesForAlternative("Machine Pulldown")),["Lat Pulldown"]);
  assert.equal(api.inferPlannedExerciseFromActual("Machine Pulldown",""),"Lat Pulldown");
});

test("every planned exercise exists in the exercise library",()=>{
  const {api}=loadApp();
  const names=new Set(Array.from(api.exerciseLibrary(),x=>x.displayName));
  for(const row of api.program()) assert.equal(names.has(row[2]),true,row[2]);
});

test("every alternative points to a valid exercise with supported metadata",()=>{
  const {api}=loadApp();
  const library=Array.from(api.exerciseLibrary());
  const ids=new Set(library.map(x=>x.id));
  const reasons=api.alternativeReasons();
  for(const exercise of library){
    for(const alternative of exercise.alternatives){
      assert.equal(ids.has(alternative.exerciseId),true,`${exercise.displayName} -> ${alternative.exerciseId}`);
      assert.equal(reasons.has(alternative.reason),true,alternative.reason);
      assert.equal(Number.isInteger(alternative.priority) && alternative.priority>0,true);
    }
  }
});

test("exercise library has no duplicate IDs",()=>{
  const {api}=loadApp();
  const ids=Array.from(api.exerciseLibrary(),x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
});

test("exercise library has no orphan alternatives",()=>{
  const {api}=loadApp();
  const library=Array.from(api.exerciseLibrary());
  const ids=new Set(library.map(x=>x.id));
  const orphans=library.flatMap(x=>x.alternatives.filter(a=>!ids.has(a.exerciseId)));
  assert.deepEqual(orphans,[]);
});

test("canonical mapping remains the first program owner for every known alternative",()=>{
  const {api}=loadApp();
  const expected=new Map();
  for(const row of api.program()){
    const planned=row[2];
    expected.set(planned,planned);
    for(const alternative of api.alternatives()[planned]||[]){
      if(!expected.has(alternative)) expected.set(alternative,planned);
    }
  }
  for(const [name,planned] of expected) assert.equal(api.canonicalExercise(name),planned,name);
});

test("legacy planned inference remains unchanged with the exercise library",()=>{
  const {api}=loadApp();
  assert.equal(api.inferPlannedExerciseFromActual("Machine Chest Press","Day 1"),"Machine Chest Press");
  assert.equal(api.inferPlannedExerciseFromActual("Cable Lateral Raise","Day 4"),"Machine Shoulder Press");
  assert.equal(api.inferPlannedExerciseFromActual("Machine Pulldown",""),"Lat Pulldown");
});

test("ambiguous legacy alternative remains unassigned and cannot complete a planned exercise",()=>{
  const {api}=loadApp();
  const legacy={exercise:"Machine Chest Press",day:"Day 1"};
  assert.equal(api.plannedOf(legacy),"Machine Chest Press");
  assert.equal(api.samePlanned(legacy,"Barbell Bench Press"),false);
  assert.equal(api.samePlanned(legacy,"Incline Dumbbell Press"),false);
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
  api.state.quarantinedLogs=[{id:"invalid-old"}];
  api.state.pendingWrites.set("pending",{id:"pending"});
  calls.authCallback(null);
  assert.equal(api.state.logs.length,0);
  assert.equal(api.state.quarantinedLogs.length,0);
  assert.equal(api.state.pendingWrites.size,0);
  assert.equal(api.state.subscriptionScope,null);
});

test("team switch clears old logs before subscribing to the new scope",()=>{
  const {api,elements,calls}=loadApp();
  api.state.user={uid:"user-1"};
  api.state.teamId="old-team";
  api.state.logs=[{id:"old"}];
  api.state.quarantinedLogs=[{id:"invalid-old"}];
  api.state.pendingWrites.set("pending",{type:"add",optimistic:{id:"pending"}});
  elements.teamId=element("new-team");
  elements.saveTeamBtn=element();
  api.bind();
  elements.saveTeamBtn.listeners.click();
  assert.equal(api.state.logs.length,0);
  assert.equal(api.state.quarantinedLogs.length,0);
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
  calls.snapshots[0](snapshot([]));
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
  calls.snapshots[0](snapshot([]));
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
  const runtime=fs.readFileSync("js/runtime.js","utf8"), app=fs.readFileSync("js/app.module.js","utf8"), html=fs.readFileSync("index.html","utf8");
  assert.match(runtime,/VERSION='v5\.6\.0'/);
  assert.match(app,/const VERSION = "v5\.6\.0"/);
  for(const asset of ["runtime.js","styles.css","app.module.js"]) assert.match(html,new RegExp(`${asset.replace(".","\\.")}\\?v=560`));
  assert.doesNotMatch(`${runtime}\n${app}\n${html}`,/\?v=557|v5\.5\.7/);
});

test("derived index groups logs by date, planned exercise, and composite key",()=>{
  const {api}=loadApp();
  const logs=[
    {id:"bench-1",date:"2026-01-01",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:50,reps:10,createdMs:1},
    {id:"bench-2",date:"2026-01-01",plannedExercise:"Barbell Bench Press",exercise:"Machine Chest Press",weightKg:60,reps:5,createdMs:2},
    {id:"pull-1",date:"2026-01-02",plannedExercise:"Lat Pulldown",exercise:"Machine Pulldown",weightKg:40,reps:10,createdMs:3}
  ];
  api.replaceWorkoutLogs(logs);
  const index=api.getDerivedLogIndex();
  assert.deepEqual(Array.from(index.byDate.get("2026-01-01"),x=>x.id),["bench-1","bench-2"]);
  assert.deepEqual(Array.from(index.byPlannedExercise.get("Barbell Bench Press"),x=>x.id),["bench-1","bench-2"]);
  assert.deepEqual(Array.from(index.byDateAndPlannedExercise.get("2026-01-02").get("Lat Pulldown"),x=>x.id),["pull-1"]);
  assert.equal(index.volumeByDate.get("2026-01-01"),800);
  assert.equal(index.volumeByPlannedExercise.get("Lat Pulldown"),400);
  const dateRows=api.logsOnDate("2026-01-01");
  dateRows.pop();
  assert.equal(index.byDate.get("2026-01-01").length,2);
});

test("unresolved legacy alternatives remain isolated in the derived index",()=>{
  const {api}=loadApp();
  const legacy={id:"legacy",date:"2026-01-01",day:"Day 1",exercise:"Machine Chest Press",weightKg:50,reps:8,createdMs:1};
  api.replaceWorkoutLogs([legacy]);
  const index=api.getDerivedLogIndex();
  assert.equal(index.byPlannedExercise.get("Machine Chest Press")[0],legacy);
  assert.equal(index.byPlannedExercise.has("Barbell Bench Press"),false);
  assert.equal(api.completedForExercise("Barbell Bench Press","2026-01-01"),0);
});

test("latest and previous set accessors follow existing created order",()=>{
  const {api}=loadApp();
  const logs=[
    {id:"first",date:"2026-01-01",plannedExercise:"Lat Pulldown",createdMs:10},
    {id:"latest",date:"2026-01-02",plannedExercise:"Lat Pulldown",createdMs:30},
    {id:"previous",date:"2026-01-02",plannedExercise:"Lat Pulldown",createdMs:20}
  ];
  api.replaceWorkoutLogs(logs);
  assert.equal(api.latestSetForPlanned("Lat Pulldown").id,"latest");
  assert.equal(api.previousSetForPlanned("Lat Pulldown").id,"previous");
  assert.equal(api.latestSetForPlanned("Cable Fly"),null);
});

test("previous workout accessor returns the latest prior session, not a same-day set",()=>{
  const {api}=loadApp();
  api.replaceWorkoutLogs([
    {id:"old",date:"2026-01-01",plannedExercise:"Barbell Bench Press",createdMs:1},
    {id:"prior-a",date:"2026-01-03",plannedExercise:"Barbell Bench Press",createdMs:2},
    {id:"prior-b",date:"2026-01-03",plannedExercise:"Barbell Bench Press",createdMs:3},
    {id:"current",date:"2026-01-05",plannedExercise:"Barbell Bench Press",createdMs:4}
  ]);
  assert.equal(api.previousWorkoutForPlanned("Barbell Bench Press","2026-01-05").id,"prior-b");
  assert.equal(api.previousWorkoutForPlanned("Barbell Bench Press","2026-01-01"),null);
});

test("indexed completion count matches filter-based behavior",()=>{
  const {api}=loadApp();
  const logs=[
    {id:"1",date:"2026-01-01",plannedExercise:"Barbell Bench Press"},
    {id:"2",date:"2026-01-01",plannedExercise:"Barbell Bench Press"},
    {id:"3",date:"2026-01-01",plannedExercise:"Lat Pulldown"},
    {id:"4",date:"2026-01-02",plannedExercise:"Barbell Bench Press"}
  ];
  api.replaceWorkoutLogs(logs);
  const expected=logs.filter(x=>x.date==="2026-01-01" && api.samePlanned(x,"Barbell Bench Press")).length;
  assert.equal(api.completedForExercise("Barbell Bench Press","2026-01-01"),expected);
});

test("derived index rebuilds only for log mutations",()=>{
  const {api,elements,calls}=loadApp();
  const initial=api.getIndexRebuildCount();
  api.replaceWorkoutLogs([]);
  assert.equal(api.getIndexRebuildCount(),initial+1);
  const baseline=api.getIndexRebuildCount();
  api.show("dash");
  api.updateTimerState();
  elements.exercise=element("Lat Pulldown");
  api.bind();
  elements.exercise.listeners.change({target:elements.exercise});
  assert.equal(api.getIndexRebuildCount(),baseline);
  api.state.user={uid:"user-1"};
  api.subscribeLogs();
  calls.snapshots[0](snapshot([{id:"remote",date:"2026-01-01",plannedExercise:"Lat Pulldown",exercise:"Lat Pulldown",weightKg:40,reps:10,createdMs:1}]));
  assert.equal(api.getIndexRebuildCount(),baseline+1);
});

test("Performance Previous Workout uses an earlier date, never a same-day set",()=>{
  const {api,elements}=loadApp();
  performanceElements(elements);
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([
    {id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:80,reps:10,rir:2,createdMs:1},
    {id:"same-day",date:"2026-02-10",plannedExercise:"Barbell Bench Press",weightKg:82.5,reps:8,rir:1,createdMs:2}
  ]);
  api.renderPerformanceCard();
  assert.equal(elements.performancePreviousValue.textContent,"80 kg × 10");
  assert.match(elements.performancePreviousMeta.textContent,/3\/2\/69/);
});

test("Set 1 keeps Previous Workout as the primary reference",()=>{
  const {api,elements}=loadApp();
  performanceElements(elements);
  form(elements);
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:50,reps:11,rir:2,createdMs:1}]);
  api.renderPerformanceCard();
  assert.equal(elements.performanceCurrent.hidden,true);
  assert.equal(elements.performancePrevious.hidden,false);
  assert.equal(elements.performancePrevious.className,"log-performance-primary");
  assert.equal(elements.performancePreviousValue.textContent,"50 kg × 11");
});

test("Set 2 and Set 3 use the deterministic latest current-session set",()=>{
  const {api,elements}=loadApp();
  performanceElements(elements);
  form(elements);
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([
    {id:"today-2",date:"2026-02-10",plannedExercise:"Barbell Bench Press",weightKg:50,reps:12,rir:1,createdMs:30},
    {id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:50,reps:11,rir:2,createdMs:1},
    {id:"today-1",date:"2026-02-10",plannedExercise:"Barbell Bench Press",weightKg:50,reps:14,rir:2,createdMs:20}
  ]);
  assert.equal(api.currentSessionLastSetForPlanned("Barbell Bench Press").id,"today-2");
  api.renderPerformanceCard();
  assert.equal(elements.performanceCurrent.hidden,false);
  assert.equal(elements.performanceCurrentValue.textContent,"50 kg × 12");
  assert.equal(elements.performancePreviousValue.textContent,"50 kg × 11");
  assert.equal(elements.performancePrevious.className,"");
});

test("same-day alternative is grouped under its planned exercise",()=>{
  const {api}=loadApp();
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"alt",date:"2026-02-10",plannedExercise:"Barbell Bench Press",exercise:"Machine Chest Press",weightKg:55,reps:10,createdMs:1}]);
  assert.equal(api.currentSessionLastSetForPlanned("Barbell Bench Press").id,"alt");
  assert.equal(api.currentSessionLastSetForPlanned("Machine Chest Press").id,"alt");
});

test("Use Last Set copies inputs only and preserves workout identity",()=>{
  const {api,elements,calls,storage}=loadApp();
  form(elements,{weight:10,reps:3,rir:5,note:"keep",tempo:"3-1-1",repQuality:"strict",biasMode:"machine"});
  const selectedAlt={name:"Machine Chest Press",original:"Barbell Bench Press"};
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedAlt=selectedAlt;
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"today",date:"2026-02-10",plannedExercise:"Barbell Bench Press",exercise:"Machine Chest Press",weightKg:55,reps:10,rir:1,createdMs:1}]);
  api.useCurrentSessionLastSet();
  assert.deepEqual([elements.weight.value,elements.reps.value,elements.rir.value],[55,10,1]);
  assert.deepEqual([elements.note.value,elements.tempo.value,elements.repQuality.value,elements.biasMode.value],["keep","3-1-1","strict","machine"]);
  assert.equal(api.state.selectedExercise,"Barbell Bench Press");
  assert.equal(api.state.selectedAlt,selectedAlt);
  assert.equal(api.state.selectedDate,"2026-02-10");
  assert.equal(calls.adds.length,0);
  assert.equal(calls.updates.length,0);
  assert.equal(calls.intervals.length,0);
  assert.equal(storage.size,0);
});

test("historical edit cannot use Current Session Last Set",()=>{
  const {api,elements}=loadApp();
  form(elements,{weight:70,reps:6,rir:3});
  performanceElements(elements);
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.state.editingId="historical";
  api.replaceWorkoutLogs([{id:"today",date:"2026-02-10",plannedExercise:"Barbell Bench Press",weightKg:55,reps:10,rir:1,createdMs:1}]);
  api.renderPerformanceCard();
  assert.equal(elements.useLastSetBtn.hidden,true);
  api.useCurrentSessionLastSet();
  assert.deepEqual([elements.weight.value,elements.reps.value,elements.rir.value],["70","6","3"]);
});

test("Performance Last Set excludes future-date sets",()=>{
  const {api}=loadApp();
  api.replaceWorkoutLogs([
    {id:"past",date:"2026-02-03",plannedExercise:"Lat Pulldown",createdMs:1},
    {id:"current",date:"2026-02-10",plannedExercise:"Lat Pulldown",createdMs:2},
    {id:"future",date:"2026-02-20",plannedExercise:"Lat Pulldown",createdMs:3}
  ]);
  assert.equal(api.lastSetForPlannedOnOrBefore("Lat Pulldown","2026-02-10").id,"current");
});

test("missing Previous Workout hides its section and action",()=>{
  const {api,elements}=loadApp();
  performanceElements(elements);
  api.state.selectedExercise="Cable Fly";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"same-day",date:"2026-02-10",plannedExercise:"Cable Fly",weightKg:20,reps:12,rir:2,createdMs:1}]);
  api.renderPerformanceCard();
  assert.equal(elements.performancePrevious.hidden,true);
  assert.equal(elements.usePreviousWorkoutBtn.hidden,true);
  assert.equal(elements.logPerformanceCard.hidden,false);
});

test("missing all performance metrics hides the entire card",()=>{
  const {api,elements}=loadApp();
  performanceElements(elements);
  api.state.selectedExercise="Cable Fly";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([]);
  api.renderPerformanceCard();
  assert.equal(elements.performancePrevious.hidden,true);
  assert.equal(elements.performanceLast.hidden,true);
  assert.equal(elements.performanceBest.hidden,true);
  assert.equal(elements.logPerformanceCard.hidden,true);
});

test("Use Previous Workout copies only weight, reps, and RIR",()=>{
  const {api,elements}=loadApp();
  form(elements,{weight:10,reps:3,rir:5,note:"keep",tempo:"3-1-1",repQuality:"strict",biasMode:"machine",sleepHours:8,soreness:3,stress:4});
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:80,reps:10,rir:2,createdMs:1}]);
  api.usePreviousWorkout();
  assert.deepEqual([elements.weight.value,elements.reps.value,elements.rir.value],[80,10,2]);
  assert.deepEqual([elements.note.value,elements.tempo.value,elements.repQuality.value,elements.biasMode.value,elements.sleepHours.value,elements.soreness.value,elements.stress.value],["keep","3-1-1","strict","machine","8","3","4"]);
});

test("Use Previous Workout does not mutate workout identity or persist data",()=>{
  const {api,elements,calls,storage}=loadApp();
  form(elements);
  const selectedAlt={name:"Machine Chest Press",original:"Barbell Bench Press"};
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedAlt=selectedAlt;
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",exercise:"Machine Chest Press",weightKg:80,reps:10,rir:2,createdMs:1}]);
  const setCount=api.completedForExercise("Barbell Bench Press","2026-02-10");
  api.usePreviousWorkout();
  assert.equal(api.state.selectedDate,"2026-02-10");
  assert.equal(api.state.selectedExercise,"Barbell Bench Press");
  assert.equal(api.state.selectedAlt,selectedAlt);
  assert.equal(api.completedForExercise("Barbell Bench Press","2026-02-10"),setCount);
  assert.equal(calls.adds.length,0);
  assert.equal(calls.updates.length,0);
  assert.equal(storage.size,0);
});

test("historical edit cannot apply Use Previous Workout",()=>{
  const {api,elements}=loadApp();
  form(elements,{weight:55,reps:6,rir:3});
  performanceElements(elements);
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.state.editingId="historical";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:80,reps:10,rir:2,createdMs:1}]);
  api.renderPerformanceCard();
  assert.equal(elements.usePreviousWorkoutBtn.hidden,true);
  api.usePreviousWorkout();
  assert.deepEqual([elements.weight.value,elements.reps.value,elements.rir.value],["55","6","3"]);
});

test("Apply Suggestion fills weight and reps only",()=>{
  const {api,elements,calls,storage}=loadApp();
  form(elements,{weight:20,reps:3,rir:4,note:"keep",tempo:"3-1-1",repQuality:"strict",biasMode:"machine"});
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:80,reps:8,rir:2,createdMs:1}]);
  const identity=[api.state.selectedDate,api.state.selectedExercise,api.state.selectedAlt,api.state.editingId];
  api.applyProgressionSuggestion();
  assert.deepEqual([elements.weight.value,elements.reps.value],[80.5,5]);
  assert.deepEqual([elements.rir.value,elements.note.value,elements.tempo.value,elements.repQuality.value,elements.biasMode.value],["4","keep","3-1-1","strict","machine"]);
  assert.deepEqual([api.state.selectedDate,api.state.selectedExercise,api.state.selectedAlt,api.state.editingId],identity);
  assert.equal(calls.adds.length,0);
  assert.equal(calls.updates.length,0);
  assert.equal(storage.size,0);
});

test("Apply Suggestion does not save or start the rest timer",()=>{
  const {api,elements,calls}=loadApp();
  form(elements);
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:80,reps:8,rir:2,createdMs:1}]);
  const timer=[api.state.timerId,api.state.timerEndAt,api.state.timerLeft];
  api.applyProgressionSuggestion();
  assert.equal(calls.adds.length,0);
  assert.equal(calls.updates.length,0);
  assert.deepEqual([api.state.timerId,api.state.timerEndAt,api.state.timerLeft],timer);
});

test("one timer engine keeps settings and floating displays synchronized",()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{restSec:75});
  elements.timer=element();
  elements.floatingTimer=element();
  elements.floatingRestTimer=element();
  api.state.page="log";
  api.startRealTimer();
  assert.equal(calls.intervals.length,1);
  assert.equal(api.state.timerId,1);
  assert.equal(elements.timer.textContent,elements.floatingTimer.textContent);
  assert.equal(elements.floatingRestTimer.hidden,false);
  const deadline=api.state.timerEndAt;
  api.addRestTime(30);
  assert.equal(api.state.timerEndAt,deadline+30000);
  assert.equal(calls.intervals.length,1);
  api.stopTimer();
  assert.equal(api.state.timerId,null);
  assert.equal(api.state.timerEndAt,0);
  assert.equal(api.state.timerLeft,0);
  assert.equal(elements.floatingRestTimer.hidden,true);
});

test("floating timer is scoped to Log while its single timer continues across pages",()=>{
  const {api,elements,calls}=loadApp();
  form(elements,{restSec:75});
  elements.timer=element(); elements.floatingTimer=element(); elements.floatingRestTimer=element();
  api.state.page="log";
  api.startRealTimer();
  const deadline=api.state.timerEndAt, intervalId=api.state.timerId;
  assert.equal(elements.floatingRestTimer.hidden,false);
  assert.equal(calls.intervals.length,1);

  api.setRender(()=>api.renderTimer());
  api.show("dash");
  assert.equal(elements.floatingRestTimer.hidden,true);
  assert.equal(api.state.timerEndAt,deadline);
  assert.equal(api.state.timerId,intervalId);
  calls.intervals[0].fn();
  assert.equal(api.state.timerId,intervalId);
  assert.equal(calls.intervals.length,1);

  api.show("log");
  assert.equal(elements.floatingRestTimer.hidden,false);
  assert.equal(elements.floatingTimer.textContent,elements.timer.textContent);
  assert.equal(api.state.timerEndAt,deadline);
  assert.equal(calls.intervals.length,1);
});

test("timer completion on another page clears normally without showing floating UI",()=>{
  const {api,elements,calls}=loadApp();
  elements.timer=element(); elements.floatingTimer=element(); elements.floatingRestTimer=element();
  api.state.page="dash";
  api.state.timerId=7;
  api.state.timerEndAt=Date.now()-1;
  api.state.notifiedDone=false;
  api.updateTimerState();
  assert.equal(api.state.timerId,null);
  assert.equal(api.state.timerEndAt,0);
  assert.equal(api.state.notifiedDone,true);
  assert.equal(elements.floatingRestTimer.hidden,true);
  assert.deepEqual(calls.clearedIntervals,[7]);
});

test("timer completion hides floating display and notifies only once",()=>{
  const {api,elements}=loadApp();
  elements.timer=element();
  elements.floatingTimer=element();
  elements.floatingRestTimer=element();
  api.state.timerId=7;
  api.state.timerEndAt=Date.now()-1;
  api.state.notifiedDone=false;
  api.updateTimerState();
  assert.equal(elements.floatingRestTimer.hidden,true);
  assert.equal(api.state.notifiedDone,true);
  api.updateTimerState();
  assert.equal(api.state.notifiedDone,true);
});

test("successful new set starts one real timer and historical edit starts none",async()=>{
  const fresh=loadApp();
  form(fresh.elements,{restSec:75});
  fresh.elements.timer=element(); fresh.elements.floatingTimer=element(); fresh.elements.floatingRestTimer=element();
  fresh.api.state.user={uid:"user-1"};
  fresh.api.state.selectedDate="2026-08-08";
  fresh.api.useRealTimer();
  await fresh.api.saveSet();
  assert.equal(fresh.calls.intervals.length,1);

  const edit=loadApp();
  form(edit.elements,{restSec:75});
  edit.elements.timer=element(); edit.elements.floatingTimer=element(); edit.elements.floatingRestTimer=element();
  const original={id:"old",date:"2026-01-01",week:1,day:"Day 1",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:50,reps:8,rir:2,targetSets:4,createdMs:1};
  edit.api.state.user={uid:"user-1"}; edit.api.state.editingId="old"; edit.api.state.selectedDate=original.date; edit.api.state.selectedExercise=original.plannedExercise; edit.api.replaceWorkoutLogs([original]);
  edit.api.useRealTimer();
  await edit.api.saveSet();
  assert.equal(edit.calls.intervals.length,0);
});

test("planned and alternative media actions share safe encoded URL generation",()=>{
  const {api,elements,calls}=loadApp();
  for(const id of ["imageBtn","videoBtn","quickImageBtn","quickVideoBtn"]){ elements[id]=element(); }
  api.state.selectedExercise="Barbell Bench Press";
  api.bind();
  elements.quickImageBtn.listeners.click();
  elements.videoBtn.listeners.click();
  assert.equal(calls.opens[0][0],api.mediaSearchUrl("Barbell Bench Press","image"));
  assert.equal(calls.opens[1][0],api.mediaSearchUrl("Barbell Bench Press","video"));
  assert.deepEqual(calls.opens.map(call=>call.slice(1)),[["_blank","noopener"],["_blank","noopener"]]);
  assert.match(calls.opens[0][0],/Barbell%20Bench%20Press%20proper%20form%20exercise/);
  api.state.selectedAlt={name:"Machine Chest Press",original:"Barbell Bench Press"};
  elements.quickVideoBtn.listeners.click();
  assert.equal(calls.opens[2][0],api.mediaSearchUrl("Machine Chest Press","video"));
});

test("Phase 1A DOM IDs are unique and mobile timer stacks below navigation z-index",()=>{
  const html=fs.readFileSync("index.html","utf8"), css=fs.readFileSync("css/styles.css","utf8");
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ["saveBtn","startRest","stopRest","add30","imageBtn","videoBtn","quickImageBtn","quickVideoBtn","floatingRestTimer","floatingAdd30","floatingStopRest"]){
    assert.match(html,new RegExp(`id="${id}"`),id);
  }
  assert.match(css,/\.tabs,\.tabbar,nav\{[^}]*z-index:9999!important/);
  assert.match(css,/\.floating-rest-timer\{[^}]*z-index:9998/);
  assert.match(css,/:root\{--mobile-nav-clearance:70px\}/);
  assert.match(css,/\.tabs\{min-height:var\(--mobile-nav-clearance\)\}/);
  assert.match(css,/bottom:calc\(var\(--mobile-nav-clearance\) \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/body\.rest-timer-active main\{padding-bottom:176px!important\}/);
  assert.match(css,/body\.rest-timer-active \.statusbar\.show\{bottom:calc\(var\(--mobile-nav-clearance\) \+ 70px \+ env\(safe-area-inset-bottom\)\)\}/);
});

test("Smart Replace reuses persistent alternative selection",()=>{
  const {api,storage}=loadApp();
  api.state.selectedExercise="Barbell Bench Press";
  assert.equal(api.selectAlternative("Machine Chest Press"),true);
  assert.equal(api.state.selectedAlt.name,"Machine Chest Press");
  assert.equal(api.state.selectedAlt.original,"Barbell Bench Press");
  assert.equal(storage.get("persistent_alt_Barbell Bench Press"),JSON.stringify({version:1,name:"Machine Chest Press"}));
});

test("Smart Alternative integration preserves engine top-three order",()=>{
  const {api}=loadApp();
  api.state.selectedExercise="Barbell Bench Press";
  assert.deepEqual(Array.from(api.smartAlternativesForCurrentExercise(),item=>item.exercise),[
    "Machine Chest Press","Smith Machine Bench Press","Dumbbell Bench Press"
  ]);
});

test("Suggested section is hidden when progression is unavailable",()=>{
  const {api,elements}=loadApp();
  form(elements);
  performanceElements(elements);
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.replaceWorkoutLogs([]);
  api.renderPerformanceCard();
  assert.equal(elements.performanceSuggested.hidden,true);
  assert.equal(elements.applyProgressionBtn.hidden,true);
  assert.equal(elements.logPerformanceCard.hidden,true);
});

test("Smart Alternative is unavailable for an unknown planned exercise",()=>{
  const {api}=loadApp();
  api.state.selectedExercise="Unknown Exercise";
  assert.equal(api.smartAlternativesForCurrentExercise().length,0);
});

test("historical edit cannot apply Suggestion or Smart Replace",()=>{
  const {api,elements,storage}=loadApp();
  form(elements,{weight:55,reps:6});
  api.state.selectedExercise="Barbell Bench Press";
  api.state.selectedDate="2026-02-10";
  api.state.editingId="historical";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:80,reps:8,rir:2,createdMs:1}]);
  api.applyProgressionSuggestion();
  assert.deepEqual([elements.weight.value,elements.reps.value],["55","6"]);
  assert.equal(api.selectAlternative("Machine Chest Press"),false);
  assert.equal(api.state.selectedAlt,null);
  assert.equal(storage.size,0);
});

test("Rest Day clears a stale selected exercise and renders no scheduled option",()=>{
  const {api,elements}=loadApp();
  api.state.selectedDate="2026-02-02";
  api.state.selectedExercise="Barbell Bench Press";
  api.replaceWorkoutLogs(restDayLogs(api));
  api.resolveSelectedExercise();
  assert.equal(api.state.selectedExercise,"");
  elements.exercise=exerciseSelectElement();
  api.renderExerciseSelect();
  assert.equal(elements.exercise.value,"");
  assert.equal(elements.exercise.disabled,true);
  assert.equal(elements.exercise.options[0].textContent,"No scheduled workout");
});

test("authenticated startup hides workout entry while the first snapshot is pending",()=>{
  const {api,elements,calls}=loadApp();
  form(elements);
  for(const id of ["logHydrationState","logRestDayState","logWorkoutContext","exercise","logMediaQuickActions","logSetProgress","logAlternativeCard","logPerformanceCard","logInputCard","smartAlternativeSection","performanceSuggested","applyProgressionBtn","logDayLockWarning"]){
    elements[id]=element(); elements[id].hidden=false;
  }
  calls.authCallback({uid:"user-1"});
  api.renderLogScheduleState();
  api.updateFormDerived();
  assert.equal(api.state.logHydration.status,"loading");
  assert.equal(api.state.selectedExercise,"");
  assert.equal(elements.logHydrationState.hidden,false);
  assert.equal(elements.logHydrationState.textContent,"Loading workout data...");
  for(const id of ["logWorkoutContext","exercise","logMediaQuickActions","logSetProgress","logAlternativeCard","logPerformanceCard","logInputCard"]){ assert.equal(elements[id].hidden,true,id); }
  assert.equal(elements.saveBtn.disabled,true);
});

test("first successful empty snapshot readies a genuine new account for Day 1",()=>{
  const {api,calls}=loadApp();
  calls.authCallback({uid:"user-1"});
  assert.equal(api.state.logHydration.status,"loading");
  calls.snapshots[0](snapshot([]));
  assert.equal(api.state.logHydration.status,"ready");
  assert.equal(api.state.selectedExercise,"Barbell Bench Press");
  assert.deepEqual(Array.from(api.state.logs),[]);
});

test("successful history snapshot resolves Rest Day after hydration",()=>{
  const {api,elements,calls}=loadApp();
  api.state.selectedDate="2026-02-02";
  calls.authCallback({uid:"user-1"});
  calls.snapshots[0](snapshot(restDayLogs(api)));
  for(const id of ["logHydrationState","logRestDayState","logWorkoutContext","exercise","logMediaQuickActions","logSetProgress","logAlternativeCard","logPerformanceCard","logInputCard","smartAlternativeSection","performanceSuggested","applyProgressionBtn","logDayLockWarning","logDayLabel"]){
    elements[id]=element(); elements[id].hidden=false;
  }
  api.renderLogScheduleState();
  assert.equal(api.state.logHydration.status,"ready");
  assert.equal(api.state.selectedExercise,"");
  assert.equal(elements.logRestDayState.hidden,false);
  assert.equal(elements.logInputCard.hidden,true);
});

test("snapshot failure shows a persistent error without Day 1 fallback",()=>{
  const {api,elements,calls}=loadApp();
  form(elements);
  for(const id of ["logHydrationState","logRestDayState","logWorkoutContext","exercise","logMediaQuickActions","logSetProgress","logAlternativeCard","logPerformanceCard","logInputCard","smartAlternativeSection","performanceSuggested","applyProgressionBtn","logDayLockWarning"]){
    elements[id]=element(); elements[id].hidden=false;
  }
  calls.authCallback({uid:"user-1"});
  calls.snapshotErrors[0](new Error("permission denied"));
  api.renderLogScheduleState();
  api.updateFormDerived();
  assert.equal(api.state.logHydration.status,"error");
  assert.equal(api.state.selectedExercise,"");
  assert.equal(elements.logHydrationState.hidden,false);
  assert.match(elements.logHydrationState.textContent,/permission denied/);
  assert.equal(elements.logInputCard.hidden,true);
  assert.equal(elements.saveBtn.disabled,true);
});

test("scope switch returns to loading and ignores the stale old snapshot",()=>{
  const {api,calls}=loadApp();
  calls.authCallback({uid:"user-a"});
  const oldSnapshot=calls.snapshots[0];
  api.clearScopedWorkoutState();
  api.state.user={uid:"user-b"};
  api.state.teamId="team-b";
  api.subscribeLogs();
  assert.equal(api.state.logHydration.status,"loading");
  assert.equal(api.state.logHydration.scope,"user-b|team-b");
  oldSnapshot(snapshot([]));
  assert.equal(api.state.logHydration.status,"loading");
  calls.snapshots[1](snapshot([]));
  assert.equal(api.state.logHydration.status,"ready");
});

test("Rest Day hides workout assistance and entry sections",()=>{
  const {api,elements}=loadApp();
  api.state.selectedDate="2026-02-02";
  api.state.selectedExercise="";
  api.replaceWorkoutLogs(restDayLogs(api));
  for(const id of ["logRestDayState","logWorkoutContext","exercise","logMediaQuickActions","logSetProgress","logAlternativeCard","logPerformanceCard","logInputCard","smartAlternativeSection","performanceSuggested","applyProgressionBtn","logDayLockWarning","logDayLabel"]){
    elements[id]=element(); elements[id].hidden=false;
  }
  api.renderLogScheduleState();
  assert.equal(elements.logRestDayState.hidden,false);
  for(const id of ["logWorkoutContext","exercise","logMediaQuickActions","logSetProgress","logAlternativeCard","logPerformanceCard","logInputCard","smartAlternativeSection","performanceSuggested","applyProgressionBtn"]){
    assert.equal(elements[id].hidden,true,id);
  }
  assert.equal(elements.logDayLockWarning.hidden,true);
  assert.equal(elements.logDayLabel.textContent,"Rest Day");
});

test("Rest Day never falls back to the first Day 1 exercise",()=>{
  const {api}=loadApp();
  api.state.selectedDate="2026-02-02";
  api.state.selectedExercise="";
  api.replaceWorkoutLogs(restDayLogs(api));
  api.resolveSelectedExercise();
  assert.notEqual(api.state.selectedExercise,"Barbell Bench Press");
  assert.equal(api.state.selectedExercise,"");
});

test("a valid training day resolves the first allowed incomplete exercise",()=>{
  const {api}=loadApp();
  api.state.selectedDate="2026-01-31";
  api.state.selectedExercise="Lat Pulldown";
  api.replaceWorkoutLogs([]);
  api.resolveSelectedExercise();
  assert.equal(api.state.selectedExercise,"Barbell Bench Press");
});

test("manual override resolves its allowed workout on an otherwise Rest Day",()=>{
  const {api}=loadApp();
  api.state.logHydration.status="ready";
  api.state.selectedDate="2026-02-02";
  api.state.selectedExercise="Barbell Bench Press";
  api.replaceWorkoutLogs(restDayLogs(api));
  api.state.overrideKeys.add("2026-02-02|guest|Beer-Team|Day 1");
  api.resolveSelectedExercise();
  assert.equal(api.state.selectedExercise,"Barbell Bench Press");
  assert.equal(api.state.logHydration.status,"ready");
});

test("Friday Day 5 requires Saturday and Sunday Rest before Monday Day 1",()=>{
  const {api}=loadApp();
  api.replaceWorkoutLogs(completedProgramDay(api,"Day 5","2026-08-07"));
  for(const date of ["2026-08-08","2026-08-09"]){
    const plan=api.currentCyclePlan(date);
    assert.deepEqual(Array.from(plan.allowedDays),[],date);
    assert.equal(plan.code,"REST_LOCK",date);
    assert.equal(plan.earliest,"2026-08-10",date);
  }
  const reopened=api.currentCyclePlan("2026-08-10");
  assert.deepEqual(Array.from(reopened.allowedDays),["Day 1"]);
  assert.equal(reopened.code,"OPEN");
  assert.equal(reopened.earliest,"2026-08-10");
});

test("Saturday Day 5 requires Sunday and Monday Rest before Tuesday Day 1",()=>{
  const {api}=loadApp();
  api.replaceWorkoutLogs(completedProgramDay(api,"Day 5","2026-08-08"));
  for(const date of ["2026-08-09","2026-08-10"]){
    const plan=api.currentCyclePlan(date);
    assert.deepEqual(Array.from(plan.allowedDays),[],date);
    assert.equal(plan.code,"REST_LOCK",date);
    assert.equal(plan.earliest,"2026-08-11",date);
  }
  const reopened=api.currentCyclePlan("2026-08-11");
  assert.deepEqual(Array.from(reopened.allowedDays),["Day 1"]);
  assert.equal(reopened.code,"OPEN");
  assert.equal(reopened.earliest,"2026-08-11");
});

test("manual override can intentionally open Day 1 on the second post-Day-5 Rest Day",()=>{
  const {api}=loadApp();
  api.state.selectedDate="2026-08-09";
  api.state.selectedExercise="Barbell Bench Press";
  api.replaceWorkoutLogs(completedProgramDay(api,"Day 5","2026-08-07"));
  assert.deepEqual(Array.from(api.allowedTrainingDaysForDate("2026-08-09")),[]);
  api.state.overrideKeys.add("2026-08-09|guest|Beer-Team|Day 1");
  assert.deepEqual(Array.from(api.allowedTrainingDaysForDate("2026-08-09")),["Day 1"]);
  api.resolveSelectedExercise();
  assert.equal(api.state.selectedExercise,"Barbell Bench Press");
  assert.equal(api.calcDayLock("2026-08-09").override,true);
});

test("historical edit on a Rest Day preserves its historical exercise",()=>{
  const {api,elements}=loadApp();
  api.state.selectedDate="2026-02-02";
  api.state.selectedExercise="Lat Pulldown";
  api.state.editingId="historical-day-2";
  api.replaceWorkoutLogs(restDayLogs(api));
  api.resolveSelectedExercise();
  assert.equal(api.state.selectedExercise,"Lat Pulldown");
  elements.exercise=exerciseSelectElement();
  api.renderExerciseSelect();
  assert.equal(elements.exercise.value,"Lat Pulldown");
  assert.equal(elements.exercise.disabled,false);
});

test("successful add is finalized when session localStorage is unavailable",async()=>{
  const {api,elements,calls}=loadApp({},true);
  form(elements,{date:"2026-01-31",weight:80,reps:6,rir:2});
  api.state.user={uid:"user-1"};
  api.state.selectedDate="2026-01-31";
  api.state.selectedExercise="Barbell Bench Press";
  await api.saveSet();
  assert.equal(calls.adds.length,1);
  assert.equal(api.state.pendingWrites.size,0);
  assert.equal(api.state.saving,false);
  assert.equal(api.state.logs.length,1);
  assert.equal(api.state.logs[0].__pending,undefined);
});

test("session and override storage writes never escape storage failures",()=>{
  const {api}=loadApp({},true);
  api.state.selectedDate="2026-01-31";
  api.state.selectedExercise="Barbell Bench Press";
  assert.doesNotThrow(()=>api.rememberSessionExercise());
  assert.doesNotThrow(()=>api.clearSessionExercise());
  assert.doesNotThrow(()=>api.grantOverride("Day 1"));
  assert.equal(api.state.overrideKeys.has("2026-01-31|guest|Beer-Team|Day 1"),true);
});

test("Developer recommendation is sourced from Progression Engine",()=>{
  const {api,elements}=loadApp();
  form(elements);
  for(const id of ["prStatus","weekSuggest","nextWeekBox","doubleProgressionBox","sfrBox"]){ elements[id]=element(); }
  api.state.selectedDate="2026-02-10";
  api.state.selectedExercise="Barbell Bench Press";
  api.replaceWorkoutLogs([{id:"prior",date:"2026-02-03",plannedExercise:"Barbell Bench Press",weightKg:80,reps:8,rir:2,createdMs:1}]);
  api.renderPRAndSuggestion();
  assert.match(elements.nextWeekBox.innerHTML,/Progression Engine/);
  assert.match(elements.nextWeekBox.innerHTML,/80\.5 kg × 5/);
  assert.equal(/reps\s*>=\s*12|w\s*\+\s*2\.5/.test(fs.readFileSync("js/app.module.js","utf8")),false);
});

test("unknown equipment availability is not claimed in integrated alternatives",()=>{
  const {api}=loadApp();
  api.state.selectedExercise="Barbell Bench Press";
  const alternatives=api.smartAlternativesForCurrentExercise();
  assert.equal(alternatives.length,3);
  assert.equal(alternatives.every(item=>!Array.from(item.reasons).includes("Available equipment")),true);
});

test("malformed remote dates are quarantined outside live workout logs",()=>{
  const {api,calls}=loadApp();
  calls.authCallback({uid:"user-1"});
  calls.snapshots[0](snapshot([
    {id:"valid",date:"2026-01-31",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:80,reps:6,createdMs:1},
    {id:"invalid",date:"2026-02-31",plannedExercise:"Barbell Bench Press",exercise:"Barbell Bench Press",weightKg:200,reps:20}
  ]));
  assert.deepEqual(Array.from(api.state.logs,log=>log.id),["valid"]);
  assert.deepEqual(Array.from(api.state.quarantinedLogs,log=>log.id),["invalid"]);
  assert.equal(api.state.quarantinedLogs[0].date,"");
  assert.equal(api.completedForExercise("Barbell Bench Press","2026-02-28"),0);
});

test("legacy missing timestamps normalize and order deterministically",()=>{
  const {api}=loadApp();
  const raw={date:"2026-01-31",plannedExercise:"Lat Pulldown",exercise:"Lat Pulldown",weightKg:50,reps:8};
  const first=api.normalizeLog(raw,"legacy-a"), second=api.normalizeLog(raw,"legacy-b");
  assert.equal(api.normalizeLog(raw,"legacy-a").createdMs,first.createdMs);
  api.replaceWorkoutLogs([first,second]);
  const latestForward=api.latestSetForPlanned("Lat Pulldown").id;
  api.replaceWorkoutLogs([second,first]);
  assert.equal(api.latestSetForPlanned("Lat Pulldown").id,latestForward);
});

test("unavailable controls stay in the DOM but are hidden and Developer remains reachable",()=>{
  const html=fs.readFileSync("index.html","utf8");
  for(const id of ["migrationCard","v5BackupLocalBtn","v5RestoreLocalBtn","aiCoachBtn","copyAiPromptBtn","v430ApplyDeloadBtn","savePersistentAltBtn","clearPersistentAltBtn","copyBackupSummaryBtn"]){
    assert.match(html,new RegExp(`id="${id}"`),id);
  }
  assert.match(html,/id="migrationCard"[^>]*class="[^"]*hidden|class="[^"]*hidden[^"]*"[^>]*id="migrationCard"/);
  assert.match(html,/id="v5BackupLocalBtn" class="[^"]*hidden/);
  assert.match(html,/id="v5RestoreLocalBtn" class="[^"]*hidden/);
  assert.match(html,/<div class="card hidden"><h3>Status \/ Debug<\/h3>/);
  for(const id of ["aiCoachBtn","copyAiPromptBtn","v430ApplyDeloadBtn","savePersistentAltBtn","clearPersistentAltBtn","copyBackupSummaryBtn"]){
    assert.match(html,new RegExp(`id="${id}" class="[^"]*hidden`),id);
  }
  assert.match(html,/<details class="card log-disclosure log-developer-panel">/);
  for(const id of ["dayDateLockDebug","orderStatus","nextWeekBox","v430ExerciseDb"]){ assert.match(html,new RegExp(`id="${id}"`),id); }
});

test("release UI hides placeholders while keeping Developer utilities reachable",()=>{
  const html=fs.readFileSync("index.html","utf8");
  for(const id of ["migrationCard","aiCoachBtn","copyAiPromptBtn","v430ApplyDeloadBtn","v5BackupLocalBtn","v5RestoreLocalBtn","backupQaCard","chartStatus","v5RecoveryInsight"]){
    assert.match(html,new RegExp(`(?:id="${id}"[^>]*class="[^"]*hidden|class="[^"]*hidden[^"]*"[^>]*id="${id}")`),id);
  }
  for(const id of ["dashboardWeeklyCard","dashboardExerciseCard","dashboardMuscleCard","dashboardPrCard","dashboardRecoveryCard","coachMuscleCard","coachPlateauCard","coachDailySummaryCard","logRecentCard","backupSummaryCard"]){
    assert.match(html,new RegExp(`id="${id}"[^>]*\\shidden(?:\\s|>)`),id);
  }
  assert.match(html,/<details class="card log-disclosure log-developer-panel">\s*<summary>Developer<\/summary>/);
  for(const id of ["persistentSubStatus","historyRemapBox","calendarSyncStatus","cycleDebug","dayDateLockDebug","v430ExerciseDbCard"]){
    assert.match(html,new RegExp(`id="${id}"`),id);
  }
});
