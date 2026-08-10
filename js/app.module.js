// Workout PRO v5.6.0 PLANNED EXERCISE COMPLETION FIX
// Single state engine. No legacy render patches. No duplicate Day Lock / Dropdown renderers.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, setDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { PROGRAM, ALT, PLANNED_BY_ALTERNATIVE, ALTERNATIVE_REASONS, EXERCISE_LIBRARY, EX_DB, tieredAlternativesForExercise, alternativesForExercise, exInfo, canonicalExercise, getExerciseDbRows, uniqueBy } from "./exercise-library.js";
import { evaluateProgression } from "./progression-engine.js";
import { findAlternatives } from "./smart-alternative.js";

const VERSION = "v5.6.0";
const $ = (id) => document.getElementById(id);
const firebaseConfig = {"apiKey":"AIzaSyAcnErrLVmmBKJRLHm_ZOySkZKauGqcgfI","authDomain":"workout-program-9eea7.firebaseapp.com","projectId":"workout-program-9eea7","storageBucket":"workout-program-9eea7.firebasestorage.app","messagingSenderId":"315102427876","appId":"1:315102427876:web:d2d5d4c89eb78fae960af1","measurementId":"G-JHEKDYEY8B"};
const DAY_ORDER = ["Day 1","Day 2","Day 4","Day 5"];
const REST_SECONDS = { quick:45, standard:75, heavy:105 };

function storageText(key,fallback=""){
  try{ const value=localStorage.getItem(key); return typeof value==="string" ? value : fallback; }catch(e){ return fallback; }
}
function storageJson(key,fallback,validate){
  try{ const value=JSON.parse(storageText(key,"")); return validate(value) ? value : fallback; }catch(e){ return fallback; }
}
function storageSet(key,value){
  try{ localStorage.setItem(key,value); return true; }catch(e){ console.warn(`Unable to save local setting: ${key}`,e); return false; }
}
function escapeHtml(value){ return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function persistentAltKey(plannedExercise){ return `persistent_alt_${plannedExercise}`; }
function clearPersistentAlt(plannedExercise){
  if(!plannedExercise) return;
  try{ localStorage.removeItem(persistentAltKey(plannedExercise)); }catch(e){ console.warn("Unable to clear persistent alternative",e); }
}
function readPersistentAlt(plannedExercise){
  if(!plannedExercise) return null;
  try{
    const raw=localStorage.getItem(persistentAltKey(plannedExercise));
    if(!raw) return null;
    const saved=JSON.parse(raw);
    if(saved?.version!==1 || typeof saved.name!=="string" || !alternativesForExercise(plannedExercise).includes(saved.name)){
      clearPersistentAlt(plannedExercise);
      return null;
    }
    return saved.name;
  }catch(e){
    clearPersistentAlt(plannedExercise);
    return null;
  }
}
function writePersistentAlt(plannedExercise,alternative){
  if(!plannedExercise || !alternativesForExercise(plannedExercise).includes(alternative)) return;
  try{ localStorage.setItem(persistentAltKey(plannedExercise),JSON.stringify({version:1,name:alternative})); }catch(e){ console.warn("Unable to save persistent alternative",e); }
}
function restorePersistentAlt(){
  if(state.editingId) return;
  const name=readPersistentAlt(state.selectedExercise);
  state.selectedAlt=name?{name,original:state.selectedExercise}:null;
}
function qaExerciseCoverage(){
  const programExercises=PROGRAM.map(p=>p[2]);
  const missingAlt=programExercises.filter(ex=>!alternativesForExercise(ex).length);
  const missingDb=programExercises.filter(ex=>!EX_DB[ex]);
  const missingMedia=programExercises.filter(ex=>!exerciseMediaHtml(ex));
  const result={version:VERSION, programExercises:programExercises.length, dbRecords:Object.keys(EX_DB).length, missingAlt, missingDb, missingMedia};
  if(missingAlt.length || missingDb.length) console.warn("Workout PRO QA coverage", result);
  else console.info("Workout PRO QA coverage OK", result);
  return result;
}
window.workoutProQA=qaExerciseCoverage;
function mediaSearchUrl(name,type="image"){
  const q=encodeURIComponent(`${name} proper form exercise`);
  return type==="video" ? `https://www.youtube.com/results?search_query=${q}` : `https://www.google.com/search?tbm=isch&q=${q}`;
}
function exerciseMediaHtml(name){
  const info=exInfo(name);
  return `<div class="media-actions"><a class="miniBtn purple" href="${mediaSearchUrl(name,'image')}" target="_blank" rel="noopener">รูป</a><a class="miniBtn cyan" href="${mediaSearchUrl(name,'video')}" target="_blank" rel="noopener">วิดีโอ</a></div><div class="small">${info.isAlternative?`ท่าทดแทนของ ${escapeHtml(info.planned)}`:`ท่าหลัก`} • Muscle: ${escapeHtml(info.primaryMuscle)} • Target: ${Number(info.target) || '-'} sets</div>`;
}
function openExerciseMedia(type){
  const url=mediaSearchUrl(actualExerciseName(),type);
  const opened=window.open(url,"_blank","noopener");
  if(opened) opened.opener=null;
}
function localNowMs(){ return Date.now(); }
function tempId(){ return `local_${localNowMs()}_${Math.random().toString(36).slice(2,8)}`; }


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let state = {
  user:null,
  teamId: storageText("teamId","Beer-Team") || "Beer-Team",
  logs:[],
  quarantinedLogs:[],
  pendingWrites:new Map(),
  lastSnapshotAt:0,
  subscriptionScope:null,
  subscriptionGeneration:0,
  logHydration:{scope:null,status:"ready",error:""},
  selectedDate: todayTH(),
  selectedExercise: PROGRAM[0][2],
  selectedAlt:null,
  sessionExerciseByDate: storageJson("sessionExerciseByDateV556",{},v=>v && typeof v==="object" && !Array.isArray(v) && Object.entries(v).every(([date,ex])=>isValidDateKey(date) && typeof ex==="string")),
  selectedDayForOverride:null,
  overrideKeys: new Set(storageJson("dayLockOverridesV540",[],v=>Array.isArray(v) && v.every(x=>typeof x==="string"))),
  editingId:null,
  saving:false,
  unsub:null,
  page:"setup",
  timerId:null,
  timerLeft:0,
  timerEndAt:0,
  timerDuration:0,
  notified10:false,
  notifiedDone:false,
  notificationsEnabled: storageText("restNotifyEnabled","1") !== "0",
  notify10Enabled: storageText("restNotify10Enabled","1") !== "0",
  soundEnabled: storageText("restSoundEnabled","1") !== "0",
  vibrateEnabled: storageText("restVibrateEnabled","1") !== "0",
  lastRender:0,
  calendarMonth: todayTH().slice(0,7)
};

function todayTH(){ return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }
function dateLabelTH(key){ const m=String(key||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${+m[3]}/${+m[2]}/${String(+m[1]+543).slice(-2)}`:(key||"-"); }
function parseKey(key){ const [y,m,d]=String(key||todayTH()).split("-").map(Number); return new Date(y,m-1,d); }
function addDaysKey(key,n){ const d=parseKey(key); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function dayDiff(a,b){ return Math.round((parseKey(a)-parseKey(b))/86400000); }
function safe(v){ return String(v||"default").trim().replace(/[^\w\-@.]/g,"_").slice(0,80) || "default"; }
function collectionPath(){ const team=safe(state.teamId); const user=state.user?.uid ? "user_"+safe(state.user.uid) : "guest_"+team; return `teams/${team}/users/${user}/workouts`; }
function metaByExercise(ex=state.selectedExercise){ const planned=canonicalExercise(ex); return PROGRAM.find(p=>p[2]===planned) || PROGRAM[0]; }
function targetSets(ex=state.selectedExercise){ return Number(metaByExercise(ex)[3]) || 1; }
function restSeconds(ex=state.selectedExercise){ const mode = metaByExercise(ex)[6] || "standard"; return REST_SECONDS[mode] || 75; }
function plannedCandidatesForAlternative(actual){ return [...(PLANNED_BY_ALTERNATIVE.get(String(actual||"").trim())||[])]; }
function inferPlannedExerciseFromActual(actual,day){
  const name=String(actual||"").trim();
  if(!name) return "";
  if(PROGRAM.some(p=>p[2]===name)) return name;
  const candidates=plannedCandidatesForAlternative(name);
  const sameDay=day ? candidates.filter(planned=>dayForExercise(planned)===day) : [];
  if(sameDay.length===1) return sameDay[0];
  if(sameDay.length>1) return name;
  return candidates.length===1 ? candidates[0] : name;
}
function plannedOf(log){
  const explicitPlanned=String(log?.plannedExercise||"").trim();
  if(explicitPlanned) return explicitPlanned;
  const explicitOriginal=String(log?.originalExercise||"").trim();
  if(explicitOriginal) return explicitOriginal;
  return inferPlannedExerciseFromActual(log?.exercise || "", log?.day || "");
}
function actualOf(log){ return log.exercise || log.plannedExercise || ""; }
function samePlanned(log, ex){ return plannedOf(log) === canonicalExercise(ex); }
function byCreated(a,b){ return (a.createdMs||0) - (b.createdMs||0) || String(a.id||"").localeCompare(String(b.id||"")); }
function logsSorted(){ return [...state.logs].sort((a,b)=>(a.date||"").localeCompare(b.date||"") || byCreated(a,b)); }
function buildDerivedLogIndex(logs){
  const byDate=new Map(), byPlannedExercise=new Map(), byDateAndPlannedExercise=new Map();
  const latestByPlannedExercise=new Map(), previousByPlannedExercise=new Map();
  const volumeByDate=new Map(), volumeByPlannedExercise=new Map();
  for(const log of logs){
    const date=log.date;
    const planned=plannedOf(log);
    if(!byDate.has(date)) byDate.set(date,[]);
    byDate.get(date).push(log);
    if(!byPlannedExercise.has(planned)) byPlannedExercise.set(planned,[]);
    byPlannedExercise.get(planned).push(log);
    if(!byDateAndPlannedExercise.has(date)) byDateAndPlannedExercise.set(date,new Map());
    const byPlanned=byDateAndPlannedExercise.get(date);
    if(!byPlanned.has(planned)) byPlanned.set(planned,[]);
    byPlanned.get(planned).push(log);
    const volume=(Number(log.weightKg)||0)*(Number(log.reps)||0);
    volumeByDate.set(date,(volumeByDate.get(date)||0)+volume);
    volumeByPlannedExercise.set(planned,(volumeByPlannedExercise.get(planned)||0)+volume);
  }
  byDate.forEach(rows=>Object.freeze(rows));
  byDateAndPlannedExercise.forEach(byPlanned=>byPlanned.forEach(rows=>Object.freeze(rows)));
  byPlannedExercise.forEach((rows,planned)=>{
    rows.sort(byCreated);
    Object.freeze(rows);
    latestByPlannedExercise.set(planned,rows.at(-1)||null);
    previousByPlannedExercise.set(planned,rows.at(-2)||null);
  });
  return Object.freeze({byDate,byPlannedExercise,byDateAndPlannedExercise,latestByPlannedExercise,previousByPlannedExercise,volumeByDate,volumeByPlannedExercise});
}
let derivedLogIndex=buildDerivedLogIndex(state.logs);
let derivedLogIndexRebuildCount=0;
function rebuildDerivedLogIndex(){ derivedLogIndex=buildDerivedLogIndex(state.logs); derivedLogIndexRebuildCount++; }
function replaceWorkoutLogs(logs){ state.logs=logs; rebuildDerivedLogIndex(); }
function status(msg,type="ok",ms=1800){ const bar=$("appStatusBar"); if(!bar) return; bar.textContent=msg; bar.className=`statusbar show ${type}`; if(ms) setTimeout(()=>{ if(bar.textContent===msg) bar.className="statusbar"; }, ms); }
function setHtml(id,html){ const el=$(id); if(el) el.innerHTML=html; }
function setText(id,text){ const el=$(id); if(el) el.textContent=text; }
function setVal(id,val){ const el=$(id); if(el) el.value=val; }
function isValidDateKey(k){
  const m=String(k||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return false;
  const y=Number(m[1]), month=Number(m[2]), d=Number(m[3]);
  return y>=1000 && y<=9999 && month>=1 && month<=12 && d>=1 && d<=new Date(y,month,0).getDate();
}

function hasOption(el, value){ return !!el && Array.from(el.options||[]).some(o=>o.value===String(value)); }
function setDefaultIfEmpty(id, value){ const el=$(id); if(el && (el.value==="" || el.value==null)) el.value=String(value); }
function setSelectDefaultIfInvalid(id, value){ const el=$(id); if(!el) return; if(!el.value || !hasOption(el,value)) el.value=String(value); }
function ensureLogDefaults(){
  // v5.5.5 Stability: keep Log form defaults present after render/reset/edit/mobile restore.
  setDefaultIfEmpty("sleepHours", 7);
  setDefaultIfEmpty("soreness", 2);
  setDefaultIfEmpty("stress", 2);
  setDefaultIfEmpty("rir", 2);
  setSelectDefaultIfInvalid("tempo", "2-0-1");
  setSelectDefaultIfInvalid("repQuality", "good");
  setSelectDefaultIfInvalid("biasMode", "auto");
  setSelectDefaultIfInvalid("restMode", "auto");
  setSelectDefaultIfInvalid("unit", "kg");
  const restMode=$("restMode")?.value || "auto";
  if(restMode==="auto") setVal("restSec", restSeconds());
  else if(["45","75","105"].includes(restMode)) setVal("restSec", restMode);
  else setDefaultIfEmpty("restSec", restSeconds());
}


function rememberSessionExercise(ex=state.selectedExercise,date=state.selectedDate){
  if(!ex || !isValidDateKey(date)) return;
  state.sessionExerciseByDate[date]=ex;
  storageSet("sessionExerciseByDateV556",JSON.stringify(state.sessionExerciseByDate));
}
function clearSessionExercise(date=state.selectedDate){
  if(!isValidDateKey(date)) return;
  delete state.sessionExerciseByDate[date];
  storageSet("sessionExerciseByDateV556",JSON.stringify(state.sessionExerciseByDate));
}
function restoreSessionExercise(){
  if(state.editingId) return;
  const ex=state.sessionExerciseByDate?.[state.selectedDate];
  if(!ex) return;
  const day=dayForExercise(ex);
  const allowed=allowedTrainingDaysForDate(state.selectedDate);
  if(allowed.length && allowed.includes(day) && completedForExercise(ex,state.selectedDate) < targetSets(ex)){
    state.selectedExercise=ex;
  }
}
function resolveSelectedExercise(){
  if(state.editingId) return;
  if(state.user && state.logHydration.status!=="ready"){
    state.selectedExercise="";
    state.selectedAlt=null;
    return;
  }
  restoreSessionExercise();
  const old=state.selectedExercise;
  const allowedDays=allowedTrainingDaysForDate(state.selectedDate);
  const rows=uniqueBy(PROGRAM,p=>p[2]);
  const oldRow=rows.find(p=>p[2]===old);
  const oldAvailable=oldRow && allowedDays.includes(oldRow[0]) && completedForExercise(old,displayDateForExerciseProgress(oldRow[0],state.selectedDate))<Number(oldRow[3]);
  const firstOpen=rows.find(p=>allowedDays.includes(p[0]) && completedForExercise(p[2],displayDateForExerciseProgress(p[0],state.selectedDate))<Number(p[3]));
  const chosen=oldAvailable ? old : firstOpen?.[2];
  if(chosen && chosen!==state.selectedExercise){ state.selectedExercise=chosen; state.selectedAlt=null; }
  if(!chosen){ state.selectedExercise=""; state.selectedAlt=null; }
  if(chosen) restorePersistentAlt();
}

function logsOnDate(date=state.selectedDate){ return [...(derivedLogIndex.byDate.get(date)||[])]; }
function completedForExercise(ex,date=state.selectedDate){ return derivedLogIndex.byDateAndPlannedExercise.get(date)?.get(canonicalExercise(ex))?.length || 0; }
function volumeForLogs(arr){ return arr.reduce((s,x)=>s+(Number(x.weightKg)||0)*(Number(x.reps)||0),0); }
function latestSetForPlanned(exercise){ return derivedLogIndex.latestByPlannedExercise.get(canonicalExercise(exercise)) || null; }
function previousSetForPlanned(exercise){ return derivedLogIndex.previousByPlannedExercise.get(canonicalExercise(exercise)) || null; }
function previousWorkoutForPlanned(exercise,beforeDate=state.selectedDate){
  const rows=derivedLogIndex.byPlannedExercise.get(canonicalExercise(exercise)) || [];
  const dates=rows.map(x=>x.date).filter(date=>isValidDateKey(date) && date<beforeDate);
  if(!dates.length) return null;
  const previousDate=dates.sort().at(-1);
  return rows.filter(x=>x.date===previousDate).at(-1) || null;
}
function currentSessionLastSetForPlanned(exercise,date=state.selectedDate){
  const rows=derivedLogIndex.byDateAndPlannedExercise.get(date)?.get(canonicalExercise(exercise)) || [];
  return [...rows].sort(byCreated).at(-1) || null;
}
function currentExerciseProgress(ex=state.selectedExercise,date=state.selectedDate){ return {done:completedForExercise(ex,date), target:targetSets(ex)}; }
function nextIncompleteExercise(day,date=state.selectedDate){ return PROGRAM.filter(p=>p[0]===day).find(p=>completedForExercise(p[2],date)<Number(p[3]))?.[2] || PROGRAM.find(p=>p[0]===day)?.[2] || PROGRAM[0][2]; }
function dayForExercise(ex){ return metaByExercise(ex)[0]; }
function dayExercises(day){ return PROGRAM.filter(p=>p[0]===day); }
function dayCompleteOnDate(day,date){ return dayExercises(day).every(p=>completedForExercise(p[2],date) >= Number(p[3])); }
function workoutDayForDate(date=state.selectedDate){
  if(state.selectedExercise){
    const selectedDay=dayForExercise(state.selectedExercise);
    if(state.editingId || allowedTrainingDaysForDate(date).includes(selectedDay) || logsOnDate(date).some(log=>dayForExercise(plannedOf(log))===selectedDay)) return selectedDay;
  }
  const latestDayLog=logsOnDate(date).filter(log=>PROGRAM.some(row=>row[2]===plannedOf(log))).sort(byCreated).at(-1);
  if(latestDayLog) return dayForExercise(plannedOf(latestDayLog));
  return allowedTrainingDaysForDate(date)[0] || null;
}
function workoutProgressForDay(day,date=state.selectedDate){
  if(!day || !DAY_ORDER.includes(day)) return null;
  const exercises=dayExercises(day);
  const currentIndex=exercises.findIndex(row=>row[2]===state.selectedExercise);
  const complete=dayCompleteOnDate(day,date);
  const exerciseDone=exercises.filter(row=>completedForExercise(row[2],date)>=Number(row[3])).length;
  const setsTarget=exercises.reduce((sum,row)=>sum+Number(row[3]),0);
  const setsDone=exercises.reduce((sum,row)=>sum+Math.min(completedForExercise(row[2],date),Number(row[3])),0);
  const currentRow=currentIndex>=0 ? exercises[currentIndex] : exercises.at(-1);
  const currentDone=currentRow ? completedForExercise(currentRow[2],date) : 0;
  const currentTarget=currentRow ? Number(currentRow[3]) : 0;
  const dayNames=new Set(exercises.map(row=>row[2]));
  const logs=logsOnDate(date).filter(log=>dayNames.has(plannedOf(log)));
  return Object.freeze({day,date,exercisePosition:complete?exercises.length:Math.max(1,currentIndex+1),exerciseTotal:exercises.length,currentSet:complete?currentTarget:Math.min(currentDone+1,currentTarget),currentSetTarget:currentTarget,setsDone,setsTarget,exerciseDone,complete,volume:volumeForLogs(logs)});
}
function workoutDates(){ return [...new Set(state.logs.map(x=>x.date).filter(Boolean))].sort(); }
function logsByDate(date){ return state.logs.filter(x=>x.date===date); }
function completedDaysByDate(date){ return DAY_ORDER.filter(d=>dayCompleteOnDate(d,date)); }
function workoutCompletionForDate(date=state.selectedDate){
  const days=completedDaysByDate(date);
  if(!days.length) return null;
  const progress=days.map(day=>workoutProgressForDay(day,date));
  return Object.freeze({days:Object.freeze(days),exerciseDone:progress.reduce((sum,item)=>sum+item.exerciseDone,0),exerciseTotal:progress.reduce((sum,item)=>sum+item.exerciseTotal,0),setsDone:progress.reduce((sum,item)=>sum+item.setsDone,0),setsTarget:progress.reduce((sum,item)=>sum+item.setsTarget,0),volume:progress.reduce((sum,item)=>sum+item.volume,0)});
}
function lastDateWithCompletedDay(day){ return workoutDates().filter(date=>dayCompleteOnDate(day,date)).pop() || null; }
function latestCompletedDayDateBeforeOrOn(day,date=state.selectedDate){
  return workoutDates().filter(d=>dayDiff(d,date)<=0 && dayCompleteOnDate(day,d)).pop() || null;
}
function displayDateForExerciseProgress(day,date=state.selectedDate){
  const allowed=allowedTrainingDaysForDate(date);
  if(allowed.includes(day)) return date;
  return latestCompletedDayDateBeforeOrOn(day,date) || date;
}
function completedDateBetween(day, afterDate=null, upToDate=state.selectedDate){
  return workoutDates()
    .filter(d=>dayCompleteOnDate(day,d))
    .filter(d=>(!afterDate || dayDiff(d,afterDate)>0) && dayDiff(d,upToDate)<=0)
    .pop() || null;
}
function dayProgressDebug(day,date=state.selectedDate){
  return dayExercises(day).map(p=>({day, exercise:p[2], done:completedForExercise(p[2],date), target:Number(p[3]), date}));
}
function currentCyclePlan(date=state.selectedDate){
  // Single source of truth for program day by selected date.
  // Uses the latest completed Day 5 before the selected date as the previous cycle boundary.
  const previousD5 = completedDateBetween("Day 5", null, date);
  let boundary = null;
  if(previousD5 && dayDiff(date, previousD5) < 3){
    return {allowedDays:[], code:"REST_LOCK", earliest:addDaysKey(previousD5,3), reason:`พักหลัง Day 5 ยังไม่ครบ เริ่มรอบใหม่ได้เร็วสุด ${addDaysKey(previousD5,3)}`};
  }
  if(previousD5 && dayDiff(date, previousD5) >= 3) boundary = previousD5;

  const d1 = completedDateBetween("Day 1", boundary, date);
  if(!d1) return {allowedDays:["Day 1"], code:"OPEN", earliest:date, reason:"เริ่ม Day 1 ได้"};
  if(dayDiff(date,d1) < 1) return {allowedDays:[], code:"NEXT_DAY_LOCK", earliest:addDaysKey(d1,1), reason:`Day 1 วันนี้จบแล้ว แต่ Day 2 ต้องเริ่มได้เร็วสุด ${addDaysKey(d1,1)}`};

  const d2 = completedDateBetween("Day 2", d1, date);
  if(!d2) return {allowedDays:["Day 2"], code:"OPEN", earliest:addDaysKey(d1,1), reason:"Day 1 จบแล้ว เริ่ม Day 2 ได้"};
  if(dayDiff(date,d2) < 2) return {allowedDays:[], code:"REST_LOCK", earliest:addDaysKey(d2,2), reason:`หลัง Day 2 ต้องพักก่อน 1 วัน เริ่ม Day 4 ได้เร็วสุด ${addDaysKey(d2,2)}`};

  const d4 = completedDateBetween("Day 4", d2, date);
  if(!d4) return {allowedDays:["Day 4"], code:"OPEN", earliest:addDaysKey(d2,2), reason:"พักครบแล้ว เริ่ม Day 4 ได้"};
  if(dayDiff(date,d4) < 1) return {allowedDays:[], code:"NEXT_DAY_LOCK", earliest:addDaysKey(d4,1), reason:`Day 4 วันนี้จบแล้ว แต่ Day 5 ต้องเริ่มได้เร็วสุด ${addDaysKey(d4,1)}`};

  const d5 = completedDateBetween("Day 5", d4, date);
  if(!d5) return {allowedDays:["Day 5"], code:"OPEN", earliest:addDaysKey(d4,1), reason:"Day 4 จบแล้ว เริ่ม Day 5 ได้"};
  if(dayDiff(date,d5) < 3) return {allowedDays:[], code:"REST_LOCK", earliest:addDaysKey(d5,3), reason:`พักหลัง Day 5 ยังไม่ครบ เริ่มรอบใหม่ได้เร็วสุด ${addDaysKey(d5,3)}`};
  return {allowedDays:["Day 1"], code:"OPEN", earliest:addDaysKey(d5,3), reason:"พักครบแล้ว เริ่ม Day 1 รอบใหม่ได้"};
}
function nextWorkoutPreview(date=state.selectedDate){
  const plan=currentCyclePlan(date);
  const earliest=isValidDateKey(plan.earliest) ? plan.earliest : null;
  const nextPlan=plan.allowedDays?.length ? plan : earliest ? currentCyclePlan(earliest) : null;
  const day=nextPlan?.allowedDays?.[0] || null;
  return {day,earliest,reason:plan.reason||"",code:plan.code||"",exercises:day?dayExercises(day).map(row=>row[2]):[]};
}
function calcDayLock(date=state.selectedDate){
  const today = todayTH();
  const keyBase = `${date}|${state.user?.uid||"guest"}|${state.teamId}`;
  const currentDay = dayForExercise(state.selectedExercise);
  const overrideKey = `${keyBase}|${currentDay}`;
  if(state.overrideKeys.has(overrideKey)) return {status:"OPEN", reason:"Manual override active", allowedDays:DAY_ORDER, earliest:date, override:true};
  if(dayDiff(date,today) > 0) return {status:"LOCKED", code:"FUTURE_DATE", reason:"ยังไม่อนุญาตให้เล่นวันที่อนาคต", allowedDays:[], earliest:today};
  const plan = currentCyclePlan(date);
  const allowed = plan.allowedDays || [];
  if(!allowed.length) return {status:"LOCKED", code:plan.code||"REST_LOCK", reason:plan.reason||"วันนี้ยังไม่ใช่วันฝึกถัดไปตามโปรแกรม", allowedDays:[], earliest:plan.earliest||"-"};
  if(!allowed.includes(currentDay)) return {status:"LOCKED", code:"DAY_LOCK", reason:`วันนี้อนุญาตเฉพาะ ${allowed.join(", ")}`, allowedDays:allowed, earliest:plan.earliest||date};
  return {status:"OPEN", reason:plan.reason || `อนุญาต: ${allowed.join(", ")}`, allowedDays:allowed, earliest:plan.earliest||date};
}
function allowedTrainingDaysForDate(date=state.selectedDate){
  if(dayDiff(date,todayTH())>0) return [];
  const keyBase = `${date}|${state.user?.uid||"guest"}|${state.teamId}`;
  const overrides = DAY_ORDER.filter(d=>state.overrideKeys.has(`${keyBase}|${d}`));
  const plan = currentCyclePlan(date);
  return [...new Set([...(plan.allowedDays||[]), ...overrides])];
}
function grantOverride(day=dayForExercise(state.selectedExercise)){ const key=`${state.selectedDate}|${state.user?.uid||"guest"}|${state.teamId}|${day}`; state.overrideKeys.add(key); storageSet("dayLockOverridesV540",JSON.stringify([...state.overrideKeys])); status(`ปลดล็อก ${day} แล้ว`,"warn"); scheduleRender(); }

function normalizeLog(raw,id){
  let createdMs = Number(raw.createdMs || raw.updatedMs || 0);
  try{ if(raw.createdAt?.seconds) createdMs=raw.createdAt.seconds*1000; }catch(e){}
  if(!Number.isFinite(createdMs) || createdMs<=0){
    const dateMs=isValidDateKey(raw.date) ? Date.parse(`${raw.date}T00:00:00Z`) : 0;
    let hash=2166136261;
    for(const char of String(id||"")){ hash^=char.charCodeAt(0); hash=Math.imul(hash,16777619); }
    createdMs=dateMs+(hash>>>0)%86400000;
  }
  const actual = raw.exercise || raw.plannedExercise || raw.originalExercise || "";
  const planned = plannedOf({...raw,exercise:actual}) || actual;
  const validDate=isValidDateKey(raw.date);
  const normalized={...raw, id, plannedExercise:planned, exercise:actual||planned, date:validDate?raw.date:"", weightKg:Number(raw.weightKg ?? raw.weight ?? 0), reps:Number(raw.reps||0), rir:Number(raw.rir ?? 2), createdMs};
  if(!validDate) normalized.__invalidDate=true;
  return normalized;
}
function clearScopedWorkoutState(){
  if(state.unsub) state.unsub();
  state.unsub=null;
  state.subscriptionGeneration+=1;
  state.subscriptionScope=null;
  state.logHydration={scope:null,status:"loading",error:""};
  replaceWorkoutLogs([]);
  state.quarantinedLogs=[];
  state.pendingWrites.clear();
  state.lastSnapshotAt=0;
  state.editingId=null;
  state.selectedAlt=null;
  state.saving=false;
}
function workoutScope(){ return state.user?.uid && state.teamId ? `${state.user.uid}|${state.teamId}` : null; }
function subscribeLogs(){
  if(state.unsub) state.unsub();
  state.unsub=null;
  const generation=++state.subscriptionGeneration;
  const scope=workoutScope();
  state.subscriptionScope=scope;
  if(!scope){ state.logHydration={scope:null,status:"ready",error:""}; scheduleRender(); return; }
  state.logHydration={scope,status:"loading",error:""};
  status("กำลังโหลด Log...","warn",0);
  const q=query(collection(db, collectionPath()), orderBy("date","asc"));
  state.unsub=onSnapshot(q,(snap)=>{
    if(state.subscriptionGeneration!==generation || state.subscriptionScope!==scope || state.logHydration.scope!==scope) return;
    const normalized=snap.docs.map(d=>normalizeLog(d.data(), d.id));
    state.quarantinedLogs=normalized.filter(x=>x.__invalidDate);
    const remote=normalized.filter(x=>!x.__invalidDate);
    const remoteIds=new Set(remote.map(x=>x.id));
    const nextLogs=remote.map(x=>state.pendingWrites.get(x.id)?.optimistic || x);
    state.pendingWrites.forEach((pending,id)=>{ if(!remoteIds.has(id)) nextLogs.push(pending.optimistic); });
    replaceWorkoutLogs(nextLogs);
    state.logHydration={scope,status:"ready",error:""};
    state.lastSnapshotAt=Date.now();
    status("โหลดข้อมูลสำเร็จ","ok");
    scheduleRender();
  },(err)=>{
    if(state.subscriptionGeneration!==generation || state.subscriptionScope!==scope || state.logHydration.scope!==scope) return;
    console.error(err);
    state.logHydration={scope,status:"error",error:err?.message||"Unknown error"};
    if(!state.editingId){ state.selectedExercise=""; state.selectedAlt=null; }
    status("โหลด Log ไม่สำเร็จ: "+state.logHydration.error,"err",0);
    scheduleRender();
  });
}

const staticRenderValid={program:false,guide:false};
function invalidateRender(page){ if(page in staticRenderValid) staticRenderValid[page]=false; }
function renderStaticPage(page,renderer){ if(staticRenderValid[page]) return; renderer(); staticRenderValid[page]=true; }
function scheduleRender(){ resolveSelectedExercise(); renderAll(); }
function renderShared(){ renderTimer(); }
function renderAll(){
  renderShared();
  if(state.page==="setup") renderSetup();
  else if(state.page==="log") renderLog();
  else if(state.page==="dash") renderDashboard();
  else if(state.page==="coach") renderCoach();
  else if(state.page==="calendar") renderCalendar();
  else if(state.page==="program") renderStaticPage("program",renderProgram);
  else if(state.page==="guide") renderStaticPage("guide",renderGuide);
  else if(state.page==="backup") renderBackup();
}

function renderLog(){
  renderDayLock(); renderExerciseSelect(); renderExerciseDatabase(); renderLogSummary(); renderRecent(); renderMedia(); renderTimer(); updateFormDerived(); renderSmartAlternatives(); renderPerformanceCard(); renderWorkoutOverview(); renderLogScheduleState();
}

function notificationPermissionText(){
  if(!("Notification" in window)) return "Browser นี้ไม่รองรับ Notification";
  if(Notification.permission==="granted") return "Notification: อนุญาตแล้ว";
  if(Notification.permission==="denied") return "Notification: ถูกบล็อก ต้องเปิดใน Browser Settings";
  return "Notification: ยังไม่ได้อนุญาต";
}
async function enableNotifications(){
  const r=await requestNotifyPermission();
  state.notificationsEnabled = r === "granted";
  storageSet("restNotifyEnabled",state.notificationsEnabled ? "1" : "0");
  status(r==="granted" ? "เปิด Notification แล้ว" : "ยังเปิด Notification ไม่ได้: "+r, r==="granted"?"ok":"warn", 2500);
  renderNotificationControls();
}
function toggleNotifications(){
  state.notificationsEnabled=!state.notificationsEnabled;
  storageSet("restNotifyEnabled",state.notificationsEnabled ? "1" : "0");
  status(state.notificationsEnabled?"เปิด Notify แล้ว":"ปิด Notify แล้ว", "ok", 1200);
  renderNotificationControls();
}
function renderNotificationControls(){
  const setup=$("setup"); if(!setup) return;
  let card=$("notificationCard");
  if(!card){
    card=document.createElement("div");
    card.className="card";
    card.id="notificationCard";
    const debugCard=$("debug")?.closest(".card");
    setup.insertBefore(card, debugCard || setup.children[2] || null);
  }
  const perm = ("Notification" in window) ? Notification.permission : "unsupported";
  card.innerHTML = `<h3>Rest Notification</h3>
    <div class="msg info" id="notifyStatus">${notificationPermissionText()}<br><span class="small">ใช้สำหรับแจ้งเตือนเหลือ 10 วิ และหมดเวลาพัก</span></div>
    <div class="row3"><button id="enableNotifyBtn" class="cyan" type="button">🔔 Enable Notifications</button><button id="testNotifyBtn" class="secondary" type="button">Test</button><button id="toggleNotifyBtn" class="secondary" type="button">${state.notificationsEnabled?"ปิด Notify":"เปิด Notify"}</button></div>
    <div class="small">Permission: ${perm} • 10s: ${state.notify10Enabled?"ON":"OFF"} • Sound: ${state.soundEnabled?"ON":"OFF"} • Vibrate: ${state.vibrateEnabled?"ON":"OFF"}</div>`;
  $("enableNotifyBtn")?.addEventListener("click", enableNotifications);
  $("testNotifyBtn")?.addEventListener("click", ()=>notifyRest("🔔 Test Notification", "ถ้าเห็นอันนี้ การแจ้งเตือนพร้อมใช้งาน", "done"));
  $("toggleNotifyBtn")?.addEventListener("click", toggleNotifications);
}

function renderSetup(){
  renderNotificationControls();
  setVal("teamId", state.teamId);
  setText("authState", state.user ? `Signed In: ${state.user.displayName || state.user.email}` : "Signed In: No");
  setHtml("debug", `Version: <b>${VERSION}</b><br>User: ${escapeHtml(state.user?.email || "-")}<br>Team: ${escapeHtml(state.teamId || "-")}<br>Logs: ${state.logs.length}<br>Date: ${escapeHtml(state.selectedDate)} (${escapeHtml(dateLabelTH(state.selectedDate))})`);
  setHtml("teamSaveStatus", `Team ID: <b>${escapeHtml(state.teamId || "-")}</b>`);
}

function selectedDateStatus(){
  const today = todayTH();
  const selected = isValidDateKey(state.selectedDate) ? state.selectedDate : today;
  const diff = dayDiff(selected, today);
  if(diff === 0) return {cls:"ok", text:"🟢 วันนี้", detail:`วันที่ปัจจุบัน ${dateLabelTH(selected)} (${selected})`};
  if(diff > 0) return {cls:"warn", text:`🔵 ล่วงหน้า ${diff} วัน`, detail:`เลือกวันที่อนาคต ${dateLabelTH(selected)} (${selected}) • ระบบจะล็อกถ้ายังไม่ถึงรอบเล่น`};
  return {cls:"info", text:`🟡 ย้อนหลัง ${Math.abs(diff)} วัน`, detail:`เลือกวันที่ย้อนหลัง ${dateLabelTH(selected)} (${selected}) • ใช้สำหรับแก้/บันทึกย้อนหลังเท่านั้น`};
}

function renderExerciseSelect(){
  const sel=$("exercise"); if(!sel) return;
  const old=state.selectedExercise;
  const allowedDays = allowedTrainingDaysForDate(state.selectedDate);
  const lock = calcDayLock(state.selectedDate);
  sel.innerHTML="";

  // v5.5.4 Stability: keep locked days selectable for inspection; Save Guard enforces lock.
  // Only completed exercises are disabled. This prevents mobile select from appearing broken.
  const rows=uniqueBy(PROGRAM, p=>p[2]);
  let firstOpen=null, oldOption=null;
  rows.forEach(p=>{
    const [day,,ex,tgt]=p;
    const progressDate = displayDateForExerciseProgress(day,state.selectedDate);
    const done=completedForExercise(ex,progressDate);
    const opt=document.createElement("option"); opt.value=ex;
    opt.dataset.day=day;
    opt.dataset.progressDate=progressDate;
    const isDone=done>=Number(tgt);
    const lockedDay = allowedDays.length ? !allowedDays.includes(day) : true;
    const isOpen = !isDone && !lockedDay;
    opt.disabled = isDone;
    const mark = isDone ? "✓ " : (isOpen ? "▶ " : "🔒 ");
    const dateNote = progressDate!==state.selectedDate && done>0 ? ` • ${dateLabelTH(progressDate)}` : "";
    const lockNote = lockedDay ? " • locked" : "";
    opt.textContent = `${mark}${day} - ${ex} (${done}/${tgt})${dateNote}${lockNote}`;
    sel.appendChild(opt);
    if(ex===old) oldOption=opt;
    if(isOpen && !firstOpen) firstOpen=opt;
  });

  const keepOld = oldOption && (state.editingId || (allowedDays.includes(oldOption.dataset.day) && !oldOption.disabled));
  const chosen = keepOld ? oldOption : firstOpen;
  if(chosen){
    sel.value=chosen.value;
  }else{
    const placeholder=document.createElement("option");
    placeholder.value="";
    placeholder.textContent = !state.editingId && !allowedDays.length ? "No scheduled workout" : lock.status==="OPEN" ? "วันนี้ท่าที่อนุญาตเล่นครบแล้ว" : `ยังล็อกอยู่: ${lock.reason}`;
    placeholder.selected=true;
    placeholder.disabled=false;
    sel.insertBefore(placeholder, sel.firstChild);
    sel.value="";
  }
  sel.disabled = !state.editingId && !allowedDays.length;
  renderExerciseProgressList();
}

function renderLogScheduleState(){
  const hydrationBlocked=Boolean(state.user) && state.logHydration.status!=="ready" && !state.editingId;
  const completed=completedDaysByDate(state.selectedDate).length>0;
  const restDay=!state.editingId && !completed && allowedTrainingDaysForDate(state.selectedDate).length===0;
  const hydrationState=$("logHydrationState");
  if(hydrationState){
    hydrationState.hidden=!hydrationBlocked;
    if(hydrationBlocked) hydrationState.textContent=state.logHydration.status==="error" ? `Unable to load workout data: ${state.logHydration.error}` : "Loading workout data...";
  }
  const restState=$("logRestDayState"); if(restState) restState.hidden=!restDay;
  if(restState && hydrationBlocked) restState.hidden=true;
  const entryUnavailable=restDay || (completed && !state.editingId);
  const context=$("logWorkoutContext"); if(context) context.hidden=restDay || hydrationBlocked;
  for(const id of ["exercise","logMediaQuickActions","logSetProgress"]){ const element=$(id); if(element) element.hidden=entryUnavailable || hydrationBlocked; }
  for(const id of ["logAlternativeCard","logPerformanceCard","logInputCard"]){ const element=$(id); if(element) element.hidden=entryUnavailable || hydrationBlocked || (id==="logPerformanceCard" && element.hidden); }
  if(entryUnavailable || hydrationBlocked){
    for(const id of ["smartAlternativeSection","performanceSuggested","applyProgressionBtn"]){ const element=$(id); if(element) element.hidden=true; }
    if(restDay && !hydrationBlocked) setText("logDayLabel","Rest Day");
    const warning=$("logDayLockWarning"); if(warning) warning.hidden=true;
  }
}

function renderWorkoutOverview(){
  const hydrationBlocked=Boolean(state.user) && state.logHydration.status!=="ready" && !state.editingId;
  const completion=$("logCompletionState"), rest=$("logRestDayState");
  if(hydrationBlocked){ if(completion) completion.hidden=true; if(rest) rest.hidden=true; return; }
  const day=workoutDayForDate(state.selectedDate);
  const progress=workoutProgressForDay(day,state.selectedDate);
  const completed=workoutCompletionForDate(state.selectedDate);
  if(progress){
    setText("logDayLabel",progress.day);
    setText("logExercisePosition",progress.exercisePosition); setText("logExerciseTotal",progress.exerciseTotal);
    setText("setNo",progress.currentSet); setText("targetShow",progress.currentSetTarget);
    setText("logDaySetsDone",progress.setsDone); setText("logDaySetsTarget",progress.setsTarget);
    const bar=$("logWorkoutProgress"); if(bar){ bar.max=progress.setsTarget; bar.value=progress.setsDone; }
  }
  if(completion){
    completion.hidden=!completed;
    if(completed){
      setText("logCompletionTitle",`${completed.days.map(day=>day.toUpperCase()).join(" + ")} COMPLETED ✓`);
      setHtml("logCompletionMetrics",`${completed.exerciseDone} / ${completed.exerciseTotal} exercises<br>${completed.setsDone} / ${completed.setsTarget} sets<br>Total Volume: <b>${completed.volume.toFixed(0)} kg</b>`);
      let nextText="Next: unavailable for multiple completed workout days on this date";
      if(completed.days.length===1){
        const next=nextWorkoutPreview(state.selectedDate);
        nextText=next.code==="REST_LOCK" ? `Next: REST DAY${next.day?` • ${escapeHtml(next.day)} earliest ${escapeHtml(dateLabelTH(next.earliest))}`:""}` : next.day ? `Next: ${escapeHtml(next.day)}${next.earliest?` • earliest ${escapeHtml(dateLabelTH(next.earliest))}`:""}` : `Next: ${escapeHtml(next.reason)||"—"}`;
      }
      setHtml("logCompletionNext",nextText);
    }
  }
  if(rest){
    const lock=calcDayLock(state.selectedDate);
    const showRest=!state.editingId && !completed && allowedTrainingDaysForDate(state.selectedDate).length===0;
    rest.hidden=!showRest;
    if(showRest){
      const next=nextWorkoutPreview(state.selectedDate);
      const future=lock.code==="FUTURE_DATE";
      setText("logRestDayTitle",future?"Future Date Locked":"REST DAY");
      setText("logRestDayReason",lock.reason || next.reason);
      const preview=$("logNextWorkoutPreview"); if(preview) preview.hidden=future || !next.day;
      if(!future && next.day){
        setText("logNextWorkoutDay",next.day);
        const tomorrow=state.selectedDate===todayTH() && next.earliest===addDaysKey(state.selectedDate,1);
        setText("logNextWorkoutEarliest",`Earliest: ${tomorrow?"Tomorrow • ":""}${dateLabelTH(next.earliest)} (${next.earliest})`);
        setHtml("logNextWorkoutExercises",next.exercises.map(escapeHtml).join(" • "));
      }
    }
  }
}

function renderAfterExerciseChange(){
  renderExerciseProgressList();
  renderExerciseDatabase();
  renderMedia();
  updateFormDerived();
  renderSmartAlternatives();
  renderPerformanceCard();
}
function renderExerciseProgressList(){
  const host=$("orderStatus"); if(!host) return;
  const day=dayForExercise(state.selectedExercise);
  const progressDate = displayDateForExerciseProgress(day,state.selectedDate);
  host.className="msg info";
  host.innerHTML = `<b>Exercise Progress - ${day}</b><div class="small">วันที่นับเซต: ${dateLabelTH(progressDate)} (${progressDate})</div><div class="exercise-progress-list">` + dayExercises(day).map(p=>{
    const done=completedForExercise(p[2],progressDate), tgt=Number(p[3]);
    const cls=done>=tgt?"done":(p[2]===state.selectedExercise?"active":"");
    return `<div class="exercise-progress-item ${cls}">${done>=tgt?"✓":"▶"} ${p[2]} <span class="pill ${done>=tgt?"done":(p[2]===state.selectedExercise?"active":"")}">${done}/${tgt}</span></div>`;
  }).join("") + `</div>`;
}
function selectOverrideDay(e){ state.selectedDayForOverride=e.target.value; status("เลือก Day ที่จะข้าม: "+e.target.value,"warn",1200); }
function applyDayOverride(){
  const d=$("overrideDaySelect")?.value || dayForExercise(state.selectedExercise);
  grantOverride(d);
  if(!state.editingId) state.selectedExercise=nextIncompleteExercise(d,state.selectedDate);
  scheduleRender();
}
function renderDayLock(){
  const lock=calcDayLock();
  const box=$("dayDateLockDebug"); if(!box) return;
  const current = dayForExercise(state.selectedExercise);
  setText("logDayLabel",current);
  const lockWarning=$("logDayLockWarning");
  if(lockWarning){ lockWarning.hidden=lock.status==="OPEN" || Boolean(state.editingId); if(!lockWarning.hidden) lockWarning.textContent=`Day Lock: ${lock.reason}`; }
  const days = DAY_ORDER.map(d=>`<option value="${d}" ${d===current?"selected":""}>${d}</option>`).join("");
  box.className = `msg lock-panel ${lock.status==="OPEN"?"open":"locked"}`;
  box.innerHTML = `<h3>Day Lock Control</h3>
    <div>Status: <b>${lock.status}</b> <span class="pill">Runtime ${VERSION}</span></div>
    <div class="small">Today: ${dateLabelTH(todayTH())} (${todayTH()}) • Selected: ${dateLabelTH(state.selectedDate)} (${state.selectedDate})</div>
    <div class="small">Allowed: ${lock.allowedDays?.length ? lock.allowedDays.join(", ") : "-"}</div>
    <div class="small">${lock.reason}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><select id="overrideDaySelect">${days}</select><button id="overrideDayBtn" class="orange" type="button">ข้ามไปเล่น Day ที่เลือก</button></div>
    <div class="select-hint">ถ้าข้ามวัน ต้องกดปุ่มนี้ก่อน Save ถึงจะทำงาน</div>`;
  $("overrideDaySelect")?.addEventListener("change", selectOverrideDay);
  $("overrideDayBtn")?.addEventListener("click",applyDayOverride);
  setHtml("lockStatus", lock.status==="OPEN" ? `<span class="ok-text">พร้อมเล่น: ${dayForExercise(state.selectedExercise)}</span>` : `<span class="warn-text">ล็อกอยู่: ${lock.reason}</span>`);
}
function updateFormDerived(){
  ensureLogDefaults();
  const m=metaByExercise();
  if($("date") && $("date").value!==state.selectedDate) $("date").value=state.selectedDate;
  const ds = selectedDateStatus();
  const dateStatusEl = $("dateStatus");
  if(dateStatusEl){ dateStatusEl.className = `msg ${ds.cls}`; dateStatusEl.innerHTML = `<b>${ds.text}</b><br><span class="small">${ds.detail}</span>`; }
  setHtml("altStatus", state.selectedAlt ? `ใช้ท่าทดแทน: <b>${escapeHtml(state.selectedAlt.name)}</b><br><span class="small">นับ progress เข้า ${escapeHtml(state.selectedExercise)}</span>` : "ยังไม่ได้เลือกท่าทดแทน");
  const clearAltBtn=$("clearAltBtn"); if(clearAltBtn) clearAltBtn.hidden=!state.selectedAlt;
  const editBanner=$("logEditBanner");
  if(editBanner){ editBanner.hidden=!state.editingId; if(state.editingId) editBanner.textContent=`Editing historical set • ${dateLabelTH(state.selectedDate)} • ${actualExerciseName()}`; }
  setHtml("persistentSubStatus", state.selectedAlt ? `Current substitute: ${escapeHtml(state.selectedAlt.name)} → ${escapeHtml(state.selectedExercise)}` : "Persistent Alternative: ไม่มี");
  setHtml("historyRemapBox", `History Remap: ใช้ plannedExercise เป็นตัวนับหลัก • Actual: ${escapeHtml(actualExerciseName())}`);
  setVal("week", autoWeek());
  setVal("targetSets", targetSets());
  setText("setNo", Math.min(completedForExercise(state.selectedExercise)+1, targetSets(state.selectedExercise)));
  setText("targetShow", targetSets());
  ensureLogDefaults();
  const prog=currentExerciseProgress();
  const progress=$("logSetProgress");
  if(progress){ progress.max=prog.target; progress.value=Math.min(prog.done,prog.target); }
  const lock=calcDayLock();
  const saveBtn=$("saveBtn"); if(saveBtn) saveBtn.disabled = state.saving || (!state.editingId && (state.logHydration.status!=="ready" || lock.status!=="OPEN" || prog.done>=prog.target));
  setHtml("setStatus", prog.done>=prog.target ? `<span class="ok-text">ท่านี้ครบแล้ว ${prog.done}/${prog.target}</span>` : `พร้อมบันทึก: <b>${escapeHtml(actualExerciseName())}</b> Set ${prog.done+1}/${prog.target}`);
  setHtml("calendarSyncStatus", `Calendar Sync: Today ${dateLabelTH(todayTH())} • Selected ${dateLabelTH(state.selectedDate)}`);
  setHtml("cycleDebug", `Program Cycle: ${autoWeek()} • Allowed ${calcDayLock().allowedDays?.join(", ") || "-"}`);
  renderPRAndSuggestion();
}
function actualExerciseName(){ return state.selectedAlt?.name || state.selectedExercise; }
function renderPRAndSuggestion(){
  const ex=state.selectedExercise;
  const rows=logsForPlanned(ex);
  const best=bestPerformanceForPlanned(ex) || {};
  setHtml("prStatus", rows.length ? `สถิติ ${escapeHtml(ex)}: สูงสุด ${best.weightKg||0} kg × ${best.reps||0}` : `ยังไม่มีสถิติของ ${escapeHtml(ex)}`);
  const last=rows[rows.length-1];
  setHtml("weekSuggest", last ? `ล่าสุด: ${last.weightKg} kg × ${last.reps} reps (RIR ${last.rir ?? "-"})` : `ยังไม่มีข้อมูลสัปดาห์ก่อนของท่านี้`);
  const suggestion=progressionSuggestion();
  const next=suggestion ? `${suggestion.suggestedWeight} kg × ${suggestion.suggestedReps}` : "-";
  setHtml("nextWeekBox", `Progression Engine: <b>${next}</b>`);
  setHtml("doubleProgressionBox", `Progression Engine: ใช้เฉพาะข้อมูลของ <b>${escapeHtml(ex)}</b>`);
  setHtml("sfrBox", `SFR / Machine Bias: ${state.selectedAlt?"ใช้ท่าแทน "+escapeHtml(state.selectedAlt.name):"Auto"}`);
}
function setPerformanceItem(id,valueId,metaId,log,includeDate=true){
  const item=$(id); if(!item) return;
  item.hidden=!log;
  if(!log) return;
  setText(valueId,`${log.weightKg} kg × ${log.reps}`);
  setText(metaId,`${includeDate?dateLabelTH(log.date)+" • ":""}RIR ${log.rir ?? "-"}`);
}
function targetRepRange(exercise=state.selectedExercise){
  const values=String(metaByExercise(exercise)[4]||"").match(/\d+/g)?.map(Number) || [];
  if(!values.length) return null;
  const min=values[0], max=values[1] ?? values[0];
  return Number.isInteger(min) && Number.isInteger(max) && min>0 && max>=min ? {min,max} : null;
}
function progressionSuggestion(){
  if(state.editingId) return null;
  const previousWorkout=previousWorkoutForPlanned(state.selectedExercise,state.selectedDate);
  const lastSet=lastSetForPlannedOnOrBefore(state.selectedExercise,state.selectedDate);
  const range=targetRepRange();
  const weightIncrement=Number($("weight")?.step);
  const exerciseType=EXERCISE_LIBRARY.find(exercise=>exercise.displayName===state.selectedExercise)?.exerciseType;
  if((!previousWorkout && !lastSet) || !range || !Number.isFinite(weightIncrement) || weightIncrement<=0 || !exerciseType) return null;
  try{ return evaluateProgression({previousWorkout,lastSet,targetRepRange:range,weightIncrement,exerciseType}); }
  catch(e){ return null; }
}
function renderPerformanceCard(){
  const previous=previousWorkoutForPlanned(state.selectedExercise,state.selectedDate);
  const suggestion=progressionSuggestion();
  const current=currentSessionLastSetForPlanned(state.selectedExercise,state.selectedDate);
  const best=bestPerformanceForPlanned(state.selectedExercise);
  setPerformanceItem("performanceCurrent","performanceCurrentValue","performanceCurrentMeta",current,false);
  setPerformanceItem("performancePrevious","performancePreviousValue","performancePreviousMeta",previous);
  const suggested=$("performanceSuggested");
  if(suggested) suggested.hidden=!suggestion;
  if(suggestion){
    setText("performanceSuggestedValue",`${suggestion.suggestedWeight} kg × ${suggestion.suggestedReps}`);
    setText("performanceSuggestedMeta",suggestion.message);
  }
  setPerformanceItem("performanceLast","performanceLastValue","performanceLastMeta",null);
  setPerformanceItem("performanceBest","performanceBestValue","performanceBestMeta",best);
  const usePreviousBtn=$("usePreviousWorkoutBtn");
  if(usePreviousBtn) usePreviousBtn.hidden=!previous || Boolean(state.editingId);
  const useLastBtn=$("useLastSetBtn");
  if(useLastBtn) useLastBtn.hidden=!current || Boolean(state.editingId);
  const previousItem=$("performancePrevious");
  if(previousItem) previousItem.className=current ? "" : "log-performance-primary";
  const applyBtn=$("applyProgressionBtn");
  if(applyBtn) applyBtn.hidden=!suggestion || Boolean(state.editingId);
  const card=$("logPerformanceCard");
  if(card) card.hidden=!current && !previous && !suggestion && !best;
}
function reuseSetValues(log,label){
  if(state.editingId || !log) return;
  setVal("weight",log.weightKg);
  setVal("reps",log.reps);
  setVal("rir",log.rir ?? "");
  status(`คัดลอก ${label}: ${log.weightKg} kg × ${log.reps}, RIR ${log.rir ?? "-"}`,"ok",2200);
}
function usePreviousWorkout(){
  reuseSetValues(previousWorkoutForPlanned(state.selectedExercise,state.selectedDate),"Previous Workout");
}
function useCurrentSessionLastSet(){
  reuseSetValues(currentSessionLastSetForPlanned(state.selectedExercise,state.selectedDate),"Current Session");
}
function applyProgressionSuggestion(){
  const suggestion=progressionSuggestion();
  if(!suggestion || state.editingId) return;
  setVal("weight",suggestion.suggestedWeight);
  setVal("reps",suggestion.suggestedReps);
  status(`ใช้ Suggested: ${suggestion.suggestedWeight} kg × ${suggestion.suggestedReps}`,"ok",2200);
}

const AVAILABLE_LIBRARY_EQUIPMENT=Object.freeze(uniqueBy(EXERCISE_LIBRARY.map(exercise=>exercise.equipment).filter(Boolean),value=>value));
function smartAlternativesForCurrentExercise(){
  if(state.editingId || !state.selectedExercise) return [];
  try{ return findAlternatives({plannedExercise:state.selectedExercise,availableEquipment:AVAILABLE_LIBRARY_EQUIPMENT}).slice(0,3).map(alternative=>({...alternative,reasons:alternative.reasons.filter(reason=>reason!=="Available equipment")})); }
  catch(e){ return []; }
}
function alternativeTier(plannedExercise,alternative){
  const tiers=tieredAlternativesForExercise(plannedExercise);
  return ["A","B","C"].find(tier=>(tiers[tier]||[]).includes(alternative)) || "";
}
function selectAlternative(alternative,tier=alternativeTier(state.selectedExercise,alternative)){
  if(state.editingId || !alternativesForExercise(state.selectedExercise).includes(alternative)) return false;
  const base=state.selectedExercise;
  state.selectedAlt={name:alternative,original:base,tier};
  writePersistentAlt(base,alternative);
  $("altModal")?.classList.remove("show");
  document.body.classList.remove("modal-open");
  scheduleRender();
  status(`ใช้ท่าแทน${tier?` Tier ${tier}`:""}: ${alternative}`,"ok");
  return true;
}
function renderSmartAlternatives(){
  const section=$("smartAlternativeSection"), host=$("smartAlternativeList");
  if(!section || !host) return;
  const alternatives=smartAlternativesForCurrentExercise();
  section.hidden=!alternatives.length;
  if(!alternatives.length){ host.innerHTML=""; return; }
  host.innerHTML=alternatives.map((alternative,index)=>`<div class="smart-alt-item"><div><b>${escapeHtml(alternative.exercise)}</b><span class="small">${alternative.reasons.map(escapeHtml).join(" • ")}</span></div><button class="secondary smart-alt-replace" data-index="${index}" type="button" aria-label="Replace with ${escapeHtml(alternative.exercise)}">Replace</button></div>`).join("");
  host.querySelectorAll(".smart-alt-replace").forEach(button=>button.addEventListener("click",()=>{
    const alternative=alternatives[Number(button.dataset.index)];
    if(alternative) selectAlternative(alternative.exercise);
  }));
}
function renderLogSummary(){
  const arr=logsOnDate(state.selectedDate), sets=arr.length, vol=volumeForLogs(arr);
  const exs=[...new Set(arr.map(plannedOf))];
  setHtml("v5LogSummary", `วันที่ ${escapeHtml(dateLabelTH(state.selectedDate))}<br>Sets: <b>${sets}</b> • Volume: <b>${vol.toFixed(0)} kg</b><br>Exercises: ${exs.length?exs.map(escapeHtml).join(", "):"-"}`);
}
function renderRecent(){
  const host=$("recent"); if(!host) return;
  const arr=[...state.logs].sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)).slice(0,12);
  const card=$("logRecentCard"); if(card) card.hidden=!arr.length;
  if(!arr.length){ host.innerHTML=""; return; }
  host.innerHTML=arr.map(x=>`<div class="recent-card"><b>${escapeHtml(dateLabelTH(x.date))} • ${escapeHtml(x.exercise)}</b><br><span class="small">Planned: ${escapeHtml(plannedOf(x))} • ${x.weightKg} kg × ${x.reps} • RIR ${x.rir ?? "-"}</span><br><span class="small">${escapeHtml(x.note||"")}</span><div class="recent-actions"><button class="secondary edit-log" data-id="${escapeHtml(x.id)}" type="button">แก้ไข</button><button class="orange del-log" data-id="${escapeHtml(x.id)}" type="button">ลบ</button></div></div>`).join("");
  host.querySelectorAll(".edit-log").forEach(btn=>btn.addEventListener("click",()=>loadEdit(btn.dataset.id)));
  host.querySelectorAll(".del-log").forEach(btn=>btn.addEventListener("click",()=>deleteLog(btn.dataset.id)));
}

function logsForPlanned(ex){ return [...(derivedLogIndex.byPlannedExercise.get(canonicalExercise(ex))||[])]; }
function lastSetForPlannedOnOrBefore(exercise,date=state.selectedDate){ return logsForPlanned(exercise).filter(x=>isValidDateKey(x.date) && x.date<=date).at(-1) || null; }
function bestPerformanceForPlanned(exercise){
  const rows=logsForPlanned(exercise);
  const best=rows.reduce((current,x)=>((x.weightKg||0)*(x.reps||0)>(current.weightKg||0)*(current.reps||0)?x:current),{});
  return rows.length ? best : null;
}
function todayLogs(){ return logsOnDate(state.selectedDate); }
function muscleBalanceHtml(){
  const g=groupByMuscle(); const entries=Object.entries(g).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return "ยังไม่มีข้อมูล logged volume by primary muscle";
  const total=entries.reduce((s,e)=>s+e[1],0)||1;
  return entries.map(([m,v])=>`<span class="pill">${m}: ${v.toFixed(0)} kg (${Math.round(v/total*100)}%)</span>`).join(" ");
}
function plateauForExercise(ex=state.selectedExercise){
  const rows=logsForPlanned(ex);
  if(rows.length < 3) return {status:"รอข้อมูล", detail:`ต้องมีอย่างน้อย 3 sets ของ ${canonicalExercise(ex)}`, trend:"-"};
  const last=rows.slice(-3).map(x=>(Number(x.weightKg)||0)*(Number(x.reps)||0));
  const diff=last.at(-1)-last[0];
  if(diff > 0) return {status:"Progress", detail:`แนวโน้มดีขึ้น +${diff.toFixed(0)} kg-volume จาก 3 set ล่าสุด`, trend:"up"};
  if(diff === 0) return {status:"Stable", detail:`ผลงานคงที่ใน 3 set ล่าสุด`, trend:"flat"};
  return {status:"Watch", detail:`ผลงานลดลง ${diff.toFixed(0)} kg-volume ใน 3 set ล่าสุด`, trend:"down"};
}
function aiDailySummary(){
  const arr=todayLogs();
  if(!arr.length) return "ยังไม่มีข้อมูลวันนี้";
  const vol=volumeForLogs(arr).toFixed(0);
  const exs=[...new Set(arr.map(plannedOf))];
  const completed=completedDaysByDate(state.selectedDate);
  return `วันที่ ${escapeHtml(dateLabelTH(state.selectedDate))} • ${arr.length} sets • Volume ${vol} kg<br>ท่าที่เล่น: ${exs.map(escapeHtml).join(", ")}<br>Completed: ${completed.map(escapeHtml).join(", ")||"-"}`;
}
function renderExerciseDatabase(){
  const host=$("v430ExerciseDb"); if(!host) return;
  const selected=state.selectedExercise || PROGRAM[0][2];
  const info=exInfo(selected);
  const rows=getExerciseDbRows();
  const selectedCard = `<div><b>${escapeHtml(info.name)}</b> ${info.isAlternative?`<span class="pill">Alternative</span>`:`<span class="pill">Main</span>`}<br>Day: ${escapeHtml(info.day)} • Muscle: ${escapeHtml(info.primaryMuscle)} • Target: ${Number(info.target)||0} sets • Reps: ${escapeHtml(info.reps)}<br>${exerciseMediaHtml(info.name)}</div>`;
  const mainRows = rows.filter(r=>!r.isAlternative).map(r=>`<div class="exercise-progress-item"><b>${escapeHtml(r.day)}</b> - ${escapeHtml(r.name)}<span class="pill">${escapeHtml(r.primaryMuscle)}</span><span class="small">${Number(r.target)||0} sets • ${escapeHtml(r.reps)}</span></div>`).join("");
  const altRows = rows.filter(r=>r.isAlternative).slice(0,60).map(r=>`<div class="exercise-progress-item"><b>${escapeHtml(r.name)}</b><span class="pill">แทน ${escapeHtml(r.planned)}</span><span class="small">${escapeHtml(r.primaryMuscle)}</span></div>`).join("");
  host.innerHTML = `${selectedCard}<hr><div class="small">Exercise DB loaded: <b>${rows.length}</b> records • Main ${rows.filter(r=>!r.isAlternative).length} • Alternative ${rows.filter(r=>r.isAlternative).length}</div><h4>Program Exercises</h4>${mainRows || "ไม่มีข้อมูล"}<h4>Alternative Library</h4>${altRows || "ไม่มีข้อมูลท่าทดแทน"}`;
}

function renderDashboard(){
  const hasLogs=state.logs.length>0;
  for(const id of ["dashboardWeeklyCard","dashboardExerciseCard","dashboardMuscleCard","dashboardPrCard"]){ const card=$(id); if(card) card.hidden=!hasLogs; }
  const cycle=autoWeek(), setsByCycle=groupByWeek();
  setText("kVol", `${volumeForLogs(state.logs).toFixed(0)} kg`); setText("kSets", state.logs.length); setText("kWeek", `Cycle ${cycle}`); setText("progressCurrentCycleSets", `${setsByCycle[`Cycle ${cycle}`]||0} logged sets`);
  drawSimpleChart("weekChart", setsByCycle); drawSimpleChart("v5RecoveryChart", groupByDateSets());
  const valueList=data=>Object.entries(data).map(([label,value])=>`<div><span>${escapeHtml(label)}</span><b>${Number(value).toFixed(0)} kg</b></div>`).join("") || "No logged sets";
  setHtml("progressExerciseVolumeList",valueList(groupByExercise())); setHtml("progressMuscleVolumeList",valueList(groupByMuscle()));
  const prs={}; state.logs.forEach(x=>{ const ex=plannedOf(x); const score=(x.weightKg||0)*(x.reps||0); if(!prs[ex] || score>prs[ex].score) prs[ex]={score,x}; });
  setHtml("v5PRBoard", Object.values(prs).slice(0,8).map(r=>`<span class="pill">${escapeHtml(plannedOf(r.x))}: ${r.x.weightKg}×${r.x.reps}</span>`).join(" ")||"No logged sets");
  renderDailyWorkoutSummary();
}
function groupByWeek(){ const g={}; state.logs.forEach(x=>{ const w=x.week||1; g["Cycle "+w]=(g["Cycle "+w]||0)+1; }); return g; }
function groupByExercise(){ const g={}; state.logs.forEach(x=>{ const k=plannedOf(x); g[k]=(g[k]||0)+(x.weightKg||0)*(x.reps||0); }); return g; }
function groupByMuscle(){ const g={}; state.logs.forEach(x=>{ const m=exInfo(plannedOf(x)).primaryMuscle || "Other"; g[m]=(g[m]||0)+(Number(x.weightKg)||0)*(Number(x.reps)||0); }); return g; }
function groupByDateSets(){ const g={}; state.logs.forEach(x=>{ g[x.date]=(g[x.date]||0)+1; }); return g; }
function drawSimpleChart(id,data){ const c=$(id); if(!c?.getContext) return; const ctx=c.getContext("2d"), w=c.width, h=c.height; ctx.clearRect(0,0,w,h); const entries=Object.entries(data).slice(-10); if(!entries.length){ ctx.fillStyle="#fff"; ctx.fillText("No data",20,30); return; } const max=Math.max(...entries.map(e=>e[1]),1); entries.forEach(([k,v],i)=>{ const bw=(w-40)/entries.length; const bh=(h-50)*(v/max); ctx.fillRect(20+i*bw,h-25-bh,bw*.7,bh); ctx.fillText(String(k).slice(0,10),20+i*bw,h-8); }); }
function renderCoach(){
  const latest=state.logs[state.logs.length-1]; const sleep=Number($("sleepHours")?.value||7), soreness=Number($("soreness")?.value||2), stress=Number($("stress")?.value||2);
  const recovery=Math.max(0,Math.min(100,70+(sleep-7)*8-(soreness-2)*8-(stress-2)*8)); const fatigue=100-recovery;
  const today=todayLogs(); const p=plateauForExercise(state.selectedExercise);
  const muscleCard=$("coachMuscleCard"); if(muscleCard) muscleCard.hidden=true;
  const plateauCard=$("coachPlateauCard"); if(plateauCard) plateauCard.hidden=true;
  renderDailyWorkoutSummary();
  setText("coachRecovery", Math.round(recovery)); setText("coachFatigue", Math.round(fatigue)); setText("coachProgress", p.status==='Progress'?"UP":(latest?"OK":"-")); setText("coachDeload", fatigue>55?"WATCH":"NO");
  setText("coachRecoveryText", recovery>=65?"พร้อมฝึก":"ลด volume หรือใช้ machine stable"); setText("coachFatigueText", fatigue>55?"เสี่ยงล้า":"ปกติ"); setText("coachProgressText", p.detail); setText("coachDeloadText", fatigue>65?"พิจารณา deload":"ยังไม่จำเป็น");
  const muscleHtml = muscleBalanceHtml();
  setHtml("coachAdvice", `Readiness heuristic ${Math.round(recovery)} / inverse ${Math.round(fatigue)}<br>${today.length?`วันนี้มี ${today.length} sets • Volume ${volumeForLogs(today).toFixed(0)} kg`:"ยังไม่มี log วันนี้"}<br>Recent set-volume heuristic: ${escapeHtml(p.status)} — ${escapeHtml(p.detail)}<br><span class="small">Logged volume by primary muscle (not a balance score): ${muscleHtml}</span>`);
  setHtml("plateauBox", `<b>${escapeHtml(p.status)}</b><br>${escapeHtml(p.detail)}<br><span class="small">Exercise: ${escapeHtml(canonicalExercise(state.selectedExercise))}</span>`);
  const effective=today.filter(x=>Number(x.rir)<=2).length;
  setText("effectiveRepsScore", effective); setText("sfrScore", recovery>=65?"Good":"Moderate"); setText("volumeZone", today.length<8?"Low":(today.length>22?"High":"OK"));
  setHtml("v430DeloadBox", fatigue>65 ? "Fatigue สูง แนะนำลด volume 20–30%" : "ยังไม่จำเป็นต้อง deload");
}
function renderDailyWorkoutSummary(){
  const today=todayLogs(), card=$("coachDailySummaryCard");
  if(card) card.hidden=!today.length;
  if(today.length){
    const prefix=state.selectedDate===todayTH()?"Today • ":"";
    setText("progressSelectedDate",`${prefix}${dateLabelTH(state.selectedDate)} (${state.selectedDate})`);
    setHtml("v430AiSummary",aiDailySummary());
  }
}
function renderProgram(){ const host=$("programList"); if(host) host.innerHTML=DAY_ORDER.map(d=>`<h3>${d}</h3>`+dayExercises(d).map(p=>`<div class="exercise-progress-item">${p[2]} • ${p[3]} sets • ${p[4]}</div>`).join("")).join(""); }
function renderGuide(){ const host=$("guideList"); if(host) host.innerHTML=PROGRAM.map(p=>`<div class="exercise-progress-item"><b>${p[2]}</b><br><span class="small">${p[0]} • ${p[4]} reps • RIR 1–2</span></div>`).join(""); }
function calendarDateClass(date){
  const arr=logsOnDate(date);
  if(!arr.length) return "";
  const completed=completedDaysByDate(date);
  if(completed.length) return "completed";
  return "partial";
}
function selectCalendarDate(date){
  state.selectedDate=date;
  state.calendarMonth=state.selectedDate.slice(0,7);
  setVal("date",state.selectedDate);
  const allowed=allowedTrainingDaysForDate(state.selectedDate);
  const d=allowed[0] || dayForExercise(state.selectedExercise);
  const next=nextIncompleteExercise(d,state.selectedDate);
  if(next && !state.editingId) state.selectedExercise=next;
  status("เลือกวันที่ "+dateLabelTH(state.selectedDate),"ok");
  scheduleRender();
}
function renderCalendar(){
  const [yy,mm]=state.calendarMonth.split("-").map(Number);
  const first=new Date(yy,mm-1,1);
  const last=new Date(yy,mm,0);
  setText("monthTitle", new Intl.DateTimeFormat("th-TH",{month:"long",year:"numeric",timeZone:"Asia/Bangkok"}).format(first));
  const grid=$("calGrid");
  if(grid){
    const heads=["อา","จ","อ","พ","พฤ","ศ","ส"].map(h=>`<div class="calHead">${h}</div>`).join("");
    let cells="";
    for(let i=0;i<first.getDay();i++) cells += `<div class="calDay empty"></div>`;
    for(let d=1; d<=last.getDate(); d++){
      const key=`${yy}-${String(mm).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const arr=logsOnDate(key);
      const completed=completedDaysByDate(key);
      const cls=["calDay", key===state.selectedDate?"sel":"", key===todayTH()?"today":"", calendarDateClass(key)].join(" ");
      const tag=arr.length?`<span class="calTag ${completed.length?"completed":"partial"}">${completed.length?completed.join(", "):arr.length+" sets"}</span>`:"";
      cells += `<div class="${cls}" data-date="${key}"><b>${d}</b><br>${tag}</div>`;
    }
    grid.innerHTML=heads+cells;
    grid.querySelectorAll(".calDay[data-date]").forEach(el=>el.addEventListener("click",()=>selectCalendarDate(el.dataset.date)));
  }
  const arr=logsOnDate(state.selectedDate);
  const completed=completedDaysByDate(state.selectedDate);
  setText("dayTitle", `Daily Summary - ${dateLabelTH(state.selectedDate)}`);
  setHtml("daySummary", `Sets: ${arr.length} • Completed: ${completed.join(", ")||"-"}`);
  const vol=volumeForLogs(arr);
  const exs=[...new Set(arr.map(plannedOf))];
  setHtml("v5DayInsight", arr.length ? `Volume: <b>${vol.toFixed(0)} kg</b><br>Exercises: ${exs.map(escapeHtml).join(", ")}<br>Completed: ${completed.map(escapeHtml).join(", ")||"-"}` : "ยังไม่มีข้อมูลของวันนี้");
  setHtml("calendarSelectedDayDetail", arr.length ? arr.slice(-8).reverse().map(x=>`<div class="small">${escapeHtml(x.exercise)}: ${x.weightKg} kg × ${x.reps} (${escapeHtml(plannedOf(x))})</div>`).join("") : "");
  const btn=$("calendarGoLogBtn");
  if(btn){ btn.disabled=false; btn.classList.remove("disabled"); btn.onclick=()=>{ show("log"); }; }
}
function renderBackup(){ const first=logsSorted()[0]?.date||"-", last=logsSorted().at(-1)?.date||"-"; const summaryCard=$("backupSummaryCard"); if(summaryCard) summaryCard.hidden=!state.logs.length; setText("backupKpiSets", state.logs.length); setText("backupKpiVolume", volumeForLogs(state.logs).toFixed(0)); setText("backupKpiFirst", first); setText("backupKpiLast", last); setHtml("backupSummaryBox", `Backup ready • ${state.logs.length} logs • ${VERSION}`); }
function renderMedia(){
  const ex=actualExerciseName();
  setText("mediaTitle", `Media Reference: ${ex}`);
  setHtml("mediaCue", `Cue: คุมฟอร์ม ไม่ฝืนเจ็บ • Search: ${escapeHtml(ex)} proper form<br>${exerciseMediaHtml(ex)}`);
}

function autoWeek(){
  const dates=workoutDates(); if(!dates.length) return 1;
  const day5Dates=dates.filter(d=>dayCompleteOnDate("Day 5",d));
  return day5Dates.length + 1;
}
async function saveSet(){
  ensureLogDefaults();
  const wasEditing=Boolean(state.editingId);
  if(!wasEditing && state.user && state.logHydration.status!=="ready"){
    status(state.logHydration.status==="error" ? "โหลดข้อมูล Workout ไม่สำเร็จ" : "กำลังโหลดข้อมูล Workout","err",0);
    return;
  }
  const original=wasEditing ? state.logs.find(x=>x.id===state.editingId) : null;
  if(wasEditing && !original){ status("ไม่พบ Log เดิมที่กำลังแก้ไข","err",0); return; }
  const lock=calcDayLock(); const prog=currentExerciseProgress();
  if(!wasEditing && lock.status!=="OPEN"){ status("ยังถูก Day Lock: "+lock.reason,"err"); return; }
  if(!wasEditing && prog.done>=prog.target){ status("ท่านี้ครบแล้ว เลือกท่าอื่น","warn"); return; }
  if(!state.user){ status("กรุณา Login ก่อน","err"); return; }
  const w=Number($("weight")?.value), reps=Number($("reps")?.value), rir=Number($("rir")?.value);
  const sleepHours=Number($("sleepHours")?.value), soreness=Number($("soreness")?.value), stress=Number($("stress")?.value);
  const saveDate=wasEditing ? original.date : state.selectedDate;
  if(!isValidDateKey(saveDate)){ status("วันที่ไม่ถูกต้อง","err"); return; }
  if(!Number.isFinite(w) || w<=0){ status("Weight ต้องเป็นตัวเลขมากกว่า 0","err"); return; }
  if(!Number.isFinite(reps) || !Number.isInteger(reps) || reps<=0){ status("Reps ต้องเป็นจำนวนเต็มมากกว่า 0","err"); return; }
  if(!Number.isFinite(rir) || rir<0 || rir>5){ status("RIR ต้องอยู่ระหว่าง 0–5","err"); return; }
  if(!Number.isFinite(sleepHours) || sleepHours<0 || sleepHours>12){ status("Sleep ต้องอยู่ระหว่าง 0–12 ชั่วโมง","err"); return; }
  if(!Number.isFinite(soreness) || soreness<1 || soreness>5){ status("Soreness ต้องอยู่ระหว่าง 1–5","err"); return; }
  if(!Number.isFinite(stress) || stress<1 || stress>5){ status("Stress ต้องอยู่ระหว่าง 1–5","err"); return; }
  const shouldAutoRest=!wasEditing;
  if(shouldAutoRest) requestNotifyPermission();
  state.saving=true; updateFormDerived(); status("กำลังบันทึกเซต...","warn",0);
  const nowMs=localNowMs();
  const payload={date:wasEditing?original.date:state.selectedDate, week:wasEditing?(original.week??autoWeek()):autoWeek(), day:wasEditing?(original.day||dayForExercise(original.plannedExercise)):dayForExercise(state.selectedExercise), plannedExercise:wasEditing?original.plannedExercise:state.selectedExercise, exercise:wasEditing?original.exercise:actualExerciseName(), weightKg:w, reps, rir, tempo:$("tempo")?.value||"", repQuality:$("repQuality")?.value||"", biasMode:$("biasMode")?.value||"", note:$("note")?.value||"", targetSets:wasEditing?(original.targetSets??targetSets(original.plannedExercise)):targetSets(), sleepHours, soreness, stress, version:VERSION, updatedAt:serverTimestamp()};
  const writeRef=wasEditing ? doc(db,collectionPath(),state.editingId) : doc(collection(db,collectionPath()));
  const writeScope=workoutScope();
  const localPayload=normalizeLog({...payload, createdMs:wasEditing?original.createdMs:nowMs, updatedMs:nowMs}, writeRef.id);
  localPayload.__pending=true;
  const pending={type:wasEditing?"update":"add",optimistic:localPayload,previous:wasEditing?original:null};
  let applied=false;
  try{
    if(wasEditing){
      const idx=state.logs.findIndex(x=>x.id===state.editingId);
      if(idx>=0) state.logs[idx]={...state.logs[idx], ...localPayload};
      rebuildDerivedLogIndex();
      state.pendingWrites.set(writeRef.id,pending);
      scheduleRender();
      await updateDoc(writeRef,payload);
      if(state.pendingWrites.get(writeRef.id)===pending){ state.pendingWrites.delete(writeRef.id); state.editingId=null; applied=true; }
    } else {
      state.logs.push(localPayload);
      rebuildDerivedLogIndex();
      state.pendingWrites.set(writeRef.id,pending);
      ["weight","reps","note"].forEach(id=>setVal(id,""));
      scheduleRender();
      await setDoc(writeRef,{...payload,createdAt:serverTimestamp()});
      if(state.pendingWrites.get(writeRef.id)===pending){
        state.pendingWrites.delete(writeRef.id);
        if(completedForExercise(state.selectedExercise,state.selectedDate) < targetSets(state.selectedExercise)) rememberSessionExercise(state.selectedExercise,state.selectedDate);
        else clearSessionExercise(state.selectedDate);
        applied=true;
      }
    }
    if(applied){ const saved=state.logs.find(x=>x.id===writeRef.id); if(saved) delete saved.__pending; }
    if(applied && shouldAutoRest && typeof startTimer === "function"){
      startTimer();
      status("บันทึกสำเร็จ • เริ่มจับเวลาพักแล้ว","ok");
    }else if(applied){
      status("บันทึกสำเร็จ","ok");
    }
  }catch(e){
    console.error(e);
    if(state.pendingWrites.get(writeRef.id)===pending){
      state.pendingWrites.delete(writeRef.id);
      if(wasEditing){ const idx=state.logs.findIndex(x=>x.id===writeRef.id); if(idx>=0) state.logs[idx]=original; rebuildDerivedLogIndex(); }
      else replaceWorkoutLogs(state.logs.filter(x=>x.id!==writeRef.id));
      status("บันทึกไม่สำเร็จ: "+e.message,"err",0);
    }
  }
  finally{ if(workoutScope()===writeScope){ state.saving=false; scheduleRender(); } }
}
function loadEdit(id){ const x=state.logs.find(l=>l.id===id); if(!x) return; state.editingId=id; state.selectedDate=x.date; state.selectedExercise=plannedOf(x); state.selectedAlt=x.exercise!==plannedOf(x)?{name:x.exercise, original:plannedOf(x)}:null; setVal("weight",x.weightKg); setVal("reps",x.reps); setVal("rir",x.rir ?? 2); setVal("tempo",x.tempo || "2-0-1"); setVal("repQuality",x.repQuality || "good"); setVal("biasMode",x.biasMode || "auto"); setVal("sleepHours",x.sleepHours ?? 7); setVal("soreness",x.soreness ?? 2); setVal("stress",x.stress ?? 2); setVal("note",x.note||""); ensureLogDefaults(); status("โหลด Log เพื่อแก้ไขแล้ว","warn"); show("log"); scheduleRender(); }
async function deleteLog(id){ if(!confirm("ลบ Log นี้?")) return; try{ await deleteDoc(doc(db, collectionPath(), id)); status("ลบแล้ว","ok"); }catch(e){ status("ลบไม่สำเร็จ: "+e.message,"err",0); } }
function resetForm(){ state.editingId=null; state.selectedAlt=null; ["weight","reps","note"].forEach(id=>setVal(id,"")); setVal("rir",2); setVal("tempo","2-0-1"); setVal("repQuality","good"); setVal("biasMode","auto"); setVal("restMode","auto"); setVal("sleepHours",7); setVal("soreness",2); setVal("stress",2); ensureLogDefaults(); scheduleRender(); status("Reset แล้ว","ok"); }

function show(page){ document.querySelectorAll(".page").forEach(p=>p.classList.remove("active")); $(page)?.classList.add("active"); document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.page===page)); state.page=page; status("เปิดหน้า "+page,"ok",900); scheduleRender(); }
window.show=show;
function bind(){
  document.querySelectorAll(".tab[data-page]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.page)));
  $("loginBtn")?.addEventListener("click",()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>status(e.message,"err",0)));
  $("logoutBtn")?.addEventListener("click",()=>signOut(auth));
  $("saveTeamBtn")?.addEventListener("click",()=>{ const teamId=$("teamId")?.value.trim()||"Beer-Team"; if(teamId!==state.teamId){ clearScopedWorkoutState(); state.teamId=teamId; scheduleRender(); } else state.teamId=teamId; try{ localStorage.setItem("teamId",state.teamId); }catch(e){} subscribeLogs(); status("บันทึก Team ID แล้ว","ok"); });
  $("date")?.addEventListener("change",e=>{
    state.selectedDate=isValidDateKey(e.target.value)?e.target.value:todayTH();
    state.calendarMonth=state.selectedDate.slice(0,7);
    if(!state.editingId){
      const allowed=allowedTrainingDaysForDate(state.selectedDate);
      const d=allowed[0] || dayForExercise(state.selectedExercise);
      state.selectedExercise=nextIncompleteExercise(d,state.selectedDate);
    }
    scheduleRender();
  });
  $("prevM")?.addEventListener("click",()=>{ const [y,m]=state.calendarMonth.split("-").map(Number); const dt=new Date(y,m-2,1); state.calendarMonth=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; renderCalendar(); });
  $("nextM")?.addEventListener("click",()=>{ const [y,m]=state.calendarMonth.split("-").map(Number); const dt=new Date(y,m,1); state.calendarMonth=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; renderCalendar(); });
  $("exercise")?.addEventListener("change",e=>{
    if(!e.target.value) return;
    if(state.editingId){ e.target.value=state.selectedExercise; return; }
    state.selectedExercise=e.target.value;
    state.selectedAlt=null;
    restorePersistentAlt();
    rememberSessionExercise(state.selectedExercise,state.selectedDate);
    status("เลือกท่า: "+state.selectedExercise,"ok",900);
    // v5.5.4: do not call renderAll() here. Rebuilding the select during a mobile change event
    // caused the dropdown to close, bounce, or look unclickable. Update only dependent panels.
    renderAfterExerciseChange();
  });
  $("restMode")?.addEventListener("change",()=>{ ensureLogDefaults(); status("อัปเดตค่า Rest แล้ว","ok",900); });
  $("saveBtn")?.addEventListener("click",saveSet); $("resetBtn")?.addEventListener("click",resetForm);
  $("usePreviousWorkoutBtn")?.addEventListener("click",usePreviousWorkout);
  $("useLastSetBtn")?.addEventListener("click",useCurrentSessionLastSet);
  $("applyProgressionBtn")?.addEventListener("click",applyProgressionSuggestion);
  $("altBtn")?.addEventListener("click",openAltModal); $("closeAlt")?.addEventListener("click",()=>{$("altModal")?.classList.remove("show"); document.body.classList.remove("modal-open");});
  $("clearAltBtn")?.addEventListener("click",()=>{ if(!state.editingId) clearPersistentAlt(state.selectedExercise); state.selectedAlt=null; scheduleRender(); });
  $("imageBtn")?.addEventListener("click",()=>openExerciseMedia("image"));
  $("videoBtn")?.addEventListener("click",()=>openExerciseMedia("video"));
  $("quickImageBtn")?.addEventListener("click",()=>openExerciseMedia("image"));
  $("quickVideoBtn")?.addEventListener("click",()=>openExerciseMedia("video"));
  $("startRest")?.addEventListener("click",startTimer); $("stopRest")?.addEventListener("click",stopTimer); $("add30")?.addEventListener("click",()=>{addRestTime(30);});
  $("floatingStopRest")?.addEventListener("click",stopTimer); $("floatingAdd30")?.addEventListener("click",()=>{addRestTime(30);});
  document.addEventListener("visibilitychange", updateTimerState);
  window.addEventListener("focus", updateTimerState);
  $("v430CopySummaryBtn")?.addEventListener("click",()=>{ navigator.clipboard?.writeText($("v430AiSummary")?.innerText||""); status("Copy Summary แล้ว","ok"); });
  $("exportJsonBtn")?.addEventListener("click",exportJson); $("v5ExportJsonBtn")?.addEventListener("click",exportJson); $("exportCsvBtn")?.addEventListener("click",exportCsv); $("v5ExportCsvBtn")?.addEventListener("click",exportCsv);
}
function openAltModal(){
  const host=$("altList"), modal=$("altModal"); if(!host || !modal) return;
  const base=state.selectedExercise;
  const tiered=tieredAlternativesForExercise(base);
  const render=(q="")=>{
    const query=String(q||"").toLowerCase();
    const sections=[
      ["A","ใกล้เคียงมาก", tiered.A||[], "ok"],
      ["B","ใกล้เคียง / เครื่องทดแทน", tiered.B||[], "warn"],
      ["C","แก้ขัด / กล้ามเนื้อหลักใกล้เคียง", tiered.C||[], "info"]
    ].map(([tier,label,list,cls])=>{
      const filtered=uniqueBy(list.filter(name=>name && name.toLowerCase().includes(query)), x=>x);
      if(!filtered.length) return "";
      return `<div class="alt-tier"><div class="small"><b>Tier ${tier}</b> • ${label}</div>` + filtered.map(name=>{
        const info=exInfo(name);
        return `<button class="secondary alt-choice" data-name="${name}" data-tier="${tier}" type="button"><b>${name}</b> <span class="pill ${cls}">Tier ${tier}</span><br><span class="small">แทน ${base} • Muscle ${info.primaryMuscle}</span><br>${exerciseMediaHtml(name)}</button>`;
      }).join("") + `</div>`;
    }).join("");
    host.innerHTML=sections || "ไม่มีท่าแทน";
    host.querySelectorAll(".alt-choice").forEach(b=>b.addEventListener("click",()=>selectAlternative(b.dataset.name,b.dataset.tier)));
  };
  render("");
  const search=$("altSearch"); if(search){ search.value=""; search.oninput=()=>render(search.value); }
  modal.classList.add("show"); document.body.classList.add("modal-open");
}

function requestNotifyPermission(){
  if(!("Notification" in window)) return Promise.resolve("unsupported");
  if(Notification.permission === "granted") return Promise.resolve("granted");
  if(Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}
function beep(kind="done"){
  if(!state.soundEnabled) return;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return;
    const ctx=new Ctx(); const osc=ctx.createOscillator(); const gain=ctx.createGain();
    osc.type="sine"; osc.frequency.value=kind==="warn"?880:1175; gain.gain.value=.08;
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); setTimeout(()=>{osc.stop(); ctx.close();}, kind==="warn"?140:260);
  }catch(e){}
}
function notifyRest(title, body, kind="done"){
  if(state.vibrateEnabled && navigator.vibrate) navigator.vibrate(kind==="warn"?[120]:[120,80,120,80,120]);
  beep(kind);
  status(title+" • "+body, kind==="warn"?"warn":"ok", 3500);
  if(state.notificationsEnabled && "Notification" in window && Notification.permission === "granted"){
    try{ new Notification(title,{body, tag:"workout-rest-timer", renotify:true}); }catch(e){}
  } else if(state.notificationsEnabled && "Notification" in window && Notification.permission === "default"){
    status(title+" • กด Enable Notifications ในหน้า Setup เพื่อให้เด้งนอกเว็บ", "warn", 4000);
  }
}
function startTimer(){
  stopTimer(false);
  const sec=Math.max(1, Number($("restSec")?.value||75));
  state.timerDuration=sec;
  state.timerEndAt=Date.now() + sec*1000;
  state.notified10=false; state.notifiedDone=false;
  requestNotifyPermission();
  updateTimerState();
  state.timerId=setInterval(updateTimerState,1000);
}
function stopTimer(clearEnd=true){
  if(state.timerId) clearInterval(state.timerId);
  state.timerId=null;
  if(clearEnd){ state.timerEndAt=0; state.timerLeft=0; }
  renderTimer();
}
function addRestTime(sec=30){
  const now=Date.now();
  if(state.timerEndAt && state.timerEndAt>now){ state.timerEndAt += sec*1000; }
  else { state.timerEndAt = now + sec*1000; }
  updateTimerState();
  if(!state.timerId) state.timerId=setInterval(updateTimerState,1000);
}
function updateTimerState(){
  if(state.timerEndAt){
    state.timerLeft=Math.max(0, Math.ceil((state.timerEndAt-Date.now())/1000));
    if(state.notify10Enabled && !state.notified10 && state.timerLeft>0 && state.timerLeft<=10){
      state.notified10=true;
      notifyRest("⏳ เหลือ 10 วินาที", "เตรียมเล่นเซตถัดไป", "warn");
    }
    if(state.timerLeft<=0){
      if(state.timerId) clearInterval(state.timerId);
      state.timerId=null;
      state.timerEndAt=0;
      renderTimer();
      if(!state.notifiedDone){ state.notifiedDone=true; notifyRest("🔔 Rest Complete", "พร้อมเล่นเซตถัดไปแล้ว", "done"); }
      return;
    }
  }
  renderTimer();
}
function renderTimer(){
  const m=String(Math.floor((state.timerLeft||0)/60)).padStart(2,"0"), ss=String((state.timerLeft||0)%60).padStart(2,"0");
  setText("timer",`${m}:${ss}`);
  setText("floatingTimer",`${m}:${ss}`);
  const floating=$("floatingRestTimer");
  const visible=state.page==="log" && Boolean(state.timerEndAt && state.timerLeft>0);
  if(floating) floating.hidden=!visible;
  document.body.classList[visible?"add":"remove"]("rest-timer-active");
}
function exportJson(){ const data=JSON.stringify({version:VERSION, exportedAt:new Date().toISOString(), logs:state.logs},null,2); download("workout-pro-backup.json",data,"application/json"); status("Export JSON แล้ว","ok"); }
function exportCsv(){ const cols=["date","week","day","plannedExercise","exercise","weightKg","reps","rir","note"]; const csv=[cols.join(","),...state.logs.map(x=>cols.map(c=>`"${String(x[c]??"").replaceAll('"','""')}"`).join(","))].join("\n"); download("workout-pro-log.csv",csv,"text/csv"); status("Export CSV แล้ว","ok"); }
function download(name,text,type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }

onAuthStateChanged(auth,u=>{ if((state.user?.uid||null)!==(u?.uid||null)) clearScopedWorkoutState(); state.user=u; if(u && !state.teamId) state.teamId="Beer-Team"; subscribeLogs(); scheduleRender(); });

window.addEventListener("DOMContentLoaded",()=>{
  bind(); setVal("teamId",state.teamId); setVal("date",state.selectedDate); ensureLogDefaults(); scheduleRender(); qaExerciseCoverage(); status("Workout PRO v5.6.0 พร้อมใช้งาน","ok",2500);
});
