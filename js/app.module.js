// Workout PRO v5.5.7 PLANNED EXERCISE COMPLETION FIX
// Single state engine. No legacy render patches. No duplicate Day Lock / Dropdown renderers.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const VERSION = "v6.0.0-dev.001";
const $ = (id) => document.getElementById(id);
const firebaseConfig = {"apiKey":"AIzaSyAcnErrLVmmBKJRLHm_ZOySkZKauGqcgfI","authDomain":"workout-program-9eea7.firebaseapp.com","projectId":"workout-program-9eea7","storageBucket":"workout-program-9eea7.firebasestorage.app","messagingSenderId":"315102427876","appId":"1:315102427876:web:d2d5d4c89eb78fae960af1","measurementId":"G-JHEKDYEY8B"};

const PROGRAM = [
  ["Day 1","Push","Barbell Bench Press",4,"5-8","Chest","heavy"], ["Day 1","Push","Incline Dumbbell Press",3,"8-12","Chest","standard"], ["Day 1","Push","Seated Shoulder Press",3,"8-12","Shoulder","standard"], ["Day 1","Push","Dumbbell Lateral Raise",4,"12-15","Shoulder","quick"], ["Day 1","Push","Cable Triceps Pushdown",3,"10-15","Triceps","quick"],
  ["Day 2","Pull","Lat Pulldown",4,"8-12","Back","standard"], ["Day 2","Pull","Barbell Row",4,"6-10","Back","heavy"], ["Day 2","Pull","Seated Cable Row",3,"10-12","Back","standard"], ["Day 2","Pull","Face Pull",3,"12-15","Rear Delt","quick"], ["Day 2","Pull","Dumbbell Curl",3,"10-15","Biceps","quick"],
  ["Day 4","Upper","Incline Machine Press",3,"10-12","Chest","standard"], ["Day 4","Upper","Chest Supported Row",3,"10-12","Back","standard"], ["Day 4","Upper","Machine Shoulder Press",3,"10-12","Shoulder","standard"], ["Day 4","Upper","Cable Fly",3,"12-15","Chest","quick"], ["Day 4","Upper","Hammer Curl",3,"10-15","Biceps","quick"], ["Day 4","Upper","Overhead Triceps Extension",3,"10-15","Triceps","quick"],
  ["Day 5","Leg","Back Squat",4,"5-8","Legs","heavy"], ["Day 5","Leg","Romanian Deadlift",4,"6-10","Hamstrings","heavy"], ["Day 5","Leg","Leg Press",3,"10-15","Quads","standard"], ["Day 5","Leg","Walking Lunge",3,"10/side","Legs","standard"], ["Day 5","Leg","Lying Leg Curl",3,"12-15","Hamstrings","quick"], ["Day 5","Leg","Standing Calf Raise",4,"12-20","Calves","quick"]
];
const DAY_ORDER = ["Day 1","Day 2","Day 4","Day 5"];
const REST_SECONDS = { quick:45, standard:75, heavy:105 };
const ALT = {
  "Barbell Bench Press":["Machine Chest Press","Dumbbell Bench Press","Smith Machine Bench Press","Hammer Strength Chest Press","Push-up"],
  "Machine Chest Press":["Barbell Bench Press","Dumbbell Bench Press","Smith Machine Bench Press","Hammer Strength Chest Press","Push-up"],
  "Dumbbell Bench Press":["Barbell Bench Press","Machine Chest Press","Smith Machine Bench Press","Hammer Strength Chest Press","Push-up"],
  "Incline Dumbbell Press":["Incline Machine Press","Smith Machine Incline Press","Incline Barbell Press","Low-to-High Cable Fly"],
  "Incline Machine Press":["Incline Dumbbell Press","Smith Machine Incline Press","Incline Barbell Press","Low-to-High Cable Fly"],
  "Seated Shoulder Press":["Machine Shoulder Press","Dumbbell Shoulder Press","Smith Machine Shoulder Press","Landmine Press"],
  "Machine Shoulder Press":["Seated Shoulder Press","Dumbbell Shoulder Press","Smith Machine Shoulder Press","Landmine Press"],
  "Dumbbell Lateral Raise":["Cable Lateral Raise","Machine Lateral Raise","Seated Lateral Raise","Lean-away Lateral Raise"],
  "Cable Triceps Pushdown":["Rope Triceps Pushdown","Straight Bar Pushdown","Machine Triceps Extension","Close-grip Push-up"],
  "Overhead Triceps Extension":["Rope Overhead Extension","Machine Triceps Extension","Skull Crusher","Cable Triceps Pushdown"],
  "Lat Pulldown":["Pull-up","Assisted Pull-up","Machine Pulldown","Single-arm Cable Pulldown","Band Pulldown"],
  "Barbell Row":["Chest Supported Row","Seated Cable Row","Machine Row","Dumbbell Row","T-Bar Row"],
  "Chest Supported Row":["Machine Row","Seated Cable Row","T-Bar Row","Single-arm Dumbbell Row","Barbell Row"],
  "Seated Cable Row":["Machine Row","Chest Supported Row","T-Bar Row","Single-arm Dumbbell Row","Barbell Row"],
  "Face Pull":["Reverse Pec Deck","Band Face Pull","Cable Rear Delt Fly","Bent-over Rear Delt Raise"],
  "Dumbbell Curl":["Cable Curl","EZ Bar Curl","Machine Preacher Curl","Incline Dumbbell Curl","Hammer Curl"],
  "Hammer Curl":["Dumbbell Curl","Cable Rope Curl","EZ Bar Curl","Machine Curl","Preacher Curl"],
  "Cable Fly":["Pec Deck","Dumbbell Fly","Low-to-High Cable Fly","Machine Chest Fly"],
  "Back Squat":["Hack Squat","V-Squat Machine","Leg Press","Goblet Squat","Smith Machine Squat"],
  "Romanian Deadlift":["Dumbbell Romanian Deadlift","Smith Machine RDL","45 Degree Back Extension","Good Morning","Hip Hinge Machine"],
  "Leg Press":["Hack Squat","V-Squat Machine","Back Squat","Smith Machine Squat","Pendulum Squat"],
  "Walking Lunge":["Bulgarian Split Squat","Reverse Lunge","Static Lunge","Smith Split Squat","Step-up"],
  "Lying Leg Curl":["Seated Leg Curl","Standing Leg Curl","Prone Leg Curl","Swiss Ball Leg Curl"],
  "Standing Calf Raise":["Seated Calf Raise","Leg Press Calf Raise","Smith Machine Calf Raise","Single-leg Dumbbell Calf Raise"]
};

// v5.5.4 Proper Fix: rank substitutes by biomechanics and hypertrophy similarity.
// Tier A = closest pattern/stimulus, Tier B = similar muscle + acceptable machine/free-weight swap, Tier C = fallback for same primary muscle.
const ALT_TIER = {
  "Barbell Bench Press":{A:["Machine Chest Press","Smith Machine Bench Press","Dumbbell Bench Press"],B:["Hammer Strength Chest Press","Push-up"],C:["Pec Deck","Cable Fly"]},
  "Machine Chest Press":{A:["Barbell Bench Press","Dumbbell Bench Press","Smith Machine Bench Press"],B:["Hammer Strength Chest Press","Push-up"],C:["Pec Deck","Cable Fly"]},
  "Dumbbell Bench Press":{A:["Barbell Bench Press","Machine Chest Press","Smith Machine Bench Press"],B:["Hammer Strength Chest Press","Push-up"],C:["Pec Deck","Cable Fly"]},
  "Incline Dumbbell Press":{A:["Incline Machine Press","Smith Machine Incline Press","Incline Barbell Press"],B:["Low-to-High Cable Fly","Machine Chest Press"],C:["Push-up"]},
  "Incline Machine Press":{A:["Incline Dumbbell Press","Smith Machine Incline Press","Incline Barbell Press"],B:["Low-to-High Cable Fly","Machine Chest Press"],C:["Push-up"]},
  "Seated Shoulder Press":{A:["Machine Shoulder Press","Dumbbell Shoulder Press","Smith Machine Shoulder Press"],B:["Arnold Press","Landmine Press"],C:["Cable Lateral Raise"]},
  "Machine Shoulder Press":{A:["Seated Shoulder Press","Dumbbell Shoulder Press","Smith Machine Shoulder Press"],B:["Arnold Press","Landmine Press"],C:["Cable Lateral Raise"]},
  "Dumbbell Lateral Raise":{A:["Cable Lateral Raise","Machine Lateral Raise","Seated Lateral Raise"],B:["Lean-away Lateral Raise","Single-arm Cable Lateral Raise"],C:["Upright Row"]},
  "Cable Triceps Pushdown":{A:["Rope Triceps Pushdown","Straight Bar Pushdown","Machine Triceps Extension"],B:["Close-grip Push-up","Bench Dip"],C:["Overhead Triceps Extension","Skull Crusher"]},
  "Overhead Triceps Extension":{A:["Rope Overhead Extension","Machine Triceps Extension","Skull Crusher"],B:["Cable Triceps Pushdown","Rope Triceps Pushdown"],C:["Close-grip Push-up","Bench Dip"]},
  "Lat Pulldown":{A:["Machine Pulldown","Assisted Pull-up","Pull-up"],B:["Single-arm Cable Pulldown","Band Pulldown"],C:["Straight-arm Pulldown"]},
  "Barbell Row":{A:["Chest Supported Row","T-Bar Row","Dumbbell Row"],B:["Seated Cable Row","Machine Row"],C:["Lat Pulldown"]},
  "Chest Supported Row":{A:["Machine Row","Seated Cable Row","T-Bar Row"],B:["Single-arm Dumbbell Row","Barbell Row"],C:["Lat Pulldown"]},
  "Seated Cable Row":{A:["Machine Row","Chest Supported Row","T-Bar Row"],B:["Single-arm Dumbbell Row","Barbell Row"],C:["Lat Pulldown"]},
  "Face Pull":{A:["Reverse Pec Deck","Band Face Pull","Cable Rear Delt Fly"],B:["Bent-over Rear Delt Raise"],C:["Machine Row"]},
  "Dumbbell Curl":{A:["Cable Curl","EZ Bar Curl","Machine Preacher Curl"],B:["Incline Dumbbell Curl","Hammer Curl"],C:["Chin-up"]},
  "Hammer Curl":{A:["Cable Rope Curl","Cross-body Hammer Curl","Dumbbell Curl"],B:["EZ Bar Curl","Machine Curl","Preacher Curl"],C:["Cable Curl"]},
  "Cable Fly":{A:["Pec Deck","Machine Chest Fly","Dumbbell Fly"],B:["Low-to-High Cable Fly"],C:["Push-up","Machine Chest Press"]},
  "Back Squat":{A:["Hack Squat","Safety Bar Squat","Front Squat"],B:["Leg Press","Pendulum Squat","Smith Machine Squat"],C:["Leg Extension"]},
  "Romanian Deadlift":{A:["Dumbbell Romanian Deadlift","Smith Machine RDL","Stiff-leg Deadlift"],B:["45 Degree Back Extension","Good Morning","Hip Hinge Machine"],C:["Seated Leg Curl","Lying Leg Curl"]},
  "Leg Press":{A:["Hack Squat","Pendulum Squat","V-Squat Machine"],B:["Back Squat","Smith Machine Squat"],C:["Leg Extension"]},
  "Walking Lunge":{A:["Bulgarian Split Squat","Reverse Lunge","Static Lunge","Step-up","Smith Split Squat"],B:["Leg Press","Hack Squat","Pendulum Squat","Goblet Squat"],C:["Leg Extension"]},
  "Lying Leg Curl":{A:["Seated Leg Curl","Standing Leg Curl","Prone Leg Curl"],B:["Nordic Curl","Swiss Ball Leg Curl"],C:["Romanian Deadlift","45 Degree Back Extension"]},
  "Standing Calf Raise":{A:["Smith Machine Calf Raise","Single-leg Dumbbell Calf Raise","Leg Press Calf Raise"],B:["Seated Calf Raise"],C:["Donkey Calf Raise"]}
};
Object.entries(ALT_TIER).forEach(([exercise,tiers])=>{
  ALT[exercise] = uniqueBy([...(tiers.A||[]), ...(tiers.B||[]), ...(tiers.C||[]), ...(ALT[exercise]||[])].filter(Boolean), x=>x);
});

// v5.5.4: single exercise database / mapping source used by Alternative, Muscle Balance, Plateau, Coach and Recommendation.
const EX_DB = (()=>{
  const db = {};
  PROGRAM.forEach(([day,type,exercise,target,reps,muscle,restMode])=>{
    db[exercise] = {name:exercise, planned:exercise, day, type, target:Number(target)||0, reps, primaryMuscle:muscle, restMode, isAlternative:false, alternatives:[...(ALT[exercise]||[])]};
    (ALT[exercise]||[]).forEach(alt=>{
      if(!db[alt]) db[alt] = {name:alt, planned:exercise, day, type, target:Number(target)||0, reps, primaryMuscle:muscle, restMode, isAlternative:true, alternatives:[]};
    });
  });
  return db;
})();

function tieredAlternativesForExercise(name){
  const base=canonicalExercise(name) || name;
  const info=EX_DB[base] || EX_DB[name];
  const tiers = ALT_TIER[base] || ALT_TIER[name];
  if(tiers){
    return {
      A: uniqueBy((tiers.A||[]).filter(x=>x && x!==base), x=>x),
      B: uniqueBy((tiers.B||[]).filter(x=>x && x!==base), x=>x),
      C: uniqueBy((tiers.C||[]).filter(x=>x && x!==base), x=>x)
    };
  }
  const direct=ALT[base] || ALT[name] || [];
  if(direct.length) return {A:uniqueBy(direct.filter(x=>x && x!==base), x=>x), B:[], C:[]};
  if(!info) return {A:[], B:[], C:[]};
  // Fallback: same muscle + same program type. Keep it visible but mark as fallback Tier C.
  return {A:[], B:[], C:uniqueBy(Object.values(EX_DB)
    .filter(x=>x.name!==base && x.planned!==base && x.primaryMuscle===info.primaryMuscle && x.type===info.type)
    .map(x=>x.name)
    .slice(0,8), x=>x)};
}
function alternativesForExercise(name){
  const t=tieredAlternativesForExercise(name);
  return uniqueBy([...(t.A||[]), ...(t.B||[]), ...(t.C||[])], x=>x);
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
function exInfo(name){ return EX_DB[name] || EX_DB[canonicalExercise(name)] || {name, planned:name, day:"-", type:"Custom", target:0, reps:"-", primaryMuscle:"Other", restMode:"standard", isAlternative:false, alternatives:[]}; }
function canonicalExercise(name){ return EX_DB[name]?.planned || (PROGRAM.find(p=>p[2]===name)?.[2]) || name || ""; }

// v6-dev foundation: stable exercise identity without changing existing Firestore schema.
// Logs may still store names, but comparisons should resolve to a stable key first.
const EXERCISE_ID_ALIAS = {
  "bench press":"EX-PUSH-HORIZONTAL-BARBELL-BENCH-PRESS",
  "flat bench press":"EX-PUSH-HORIZONTAL-BARBELL-BENCH-PRESS",
  "bb bench press":"EX-PUSH-HORIZONTAL-BARBELL-BENCH-PRESS",
  "barbell bench press":"EX-PUSH-HORIZONTAL-BARBELL-BENCH-PRESS",
  "chest supported row":"EX-PULL-HORIZONTAL-CHEST-SUPPORTED-ROW",
  "chest supported machine row":"EX-PULL-HORIZONTAL-CHEST-SUPPORTED-ROW",
  "chest supported t-bar row":"EX-PULL-HORIZONTAL-CHEST-SUPPORTED-ROW",
  "walking lunge":"EX-LEGS-UNILATERAL-WALKING-LUNGE",
  "db walking lunge":"EX-LEGS-UNILATERAL-WALKING-LUNGE",
  "dumbbell walking lunge":"EX-LEGS-UNILATERAL-WALKING-LUNGE"
};
function normalizeExerciseName(name){ return String(name||"").trim().replace(/\s+/g," ").toLowerCase(); }
function fallbackExerciseId(name){ return `legacy:${normalizeExerciseName(canonicalExercise(name)||name)}`; }
function exerciseIdForName(name){ const canonical=canonicalExercise(name||""); return EXERCISE_ID_ALIAS[normalizeExerciseName(canonical)] || EXERCISE_ID_ALIAS[normalizeExerciseName(name)] || fallbackExerciseId(canonical||name); }
function sameExerciseIdentity(a,b){ return exerciseIdForName(a) === exerciseIdForName(b); }
window.workoutProExerciseIdForName = exerciseIdForName;

function getExerciseDbRows(){ return Object.values(EX_DB).sort((a,b)=>(a.day||"").localeCompare(b.day||"") || Number(a.isAlternative)-Number(b.isAlternative) || a.name.localeCompare(b.name)); }
function uniqueBy(arr, fn){ const seen=new Set(); return arr.filter(x=>{ const k=fn(x); if(seen.has(k)) return false; seen.add(k); return true; }); }
function mediaSearchUrl(name,type="image"){
  const q=encodeURIComponent(`${name} proper form exercise`);
  return type==="video" ? `https://www.youtube.com/results?search_query=${q}` : `https://www.google.com/search?tbm=isch&q=${q}`;
}
function exerciseMediaHtml(name){
  const info=exInfo(name);
  return `<div class="media-actions"><a class="miniBtn purple" href="${mediaSearchUrl(name,'image')}" target="_blank" rel="noopener">รูป</a><a class="miniBtn cyan" href="${mediaSearchUrl(name,'video')}" target="_blank" rel="noopener">วิดีโอ</a></div><div class="small">${info.isAlternative?`ท่าทดแทนของ ${info.planned}`:`ท่าหลัก`} • Muscle: ${info.primaryMuscle} • Target: ${info.target || '-'} sets</div>`;
}
function localNowMs(){ return Date.now(); }
function tempId(){ return `local_${localNowMs()}_${Math.random().toString(36).slice(2,8)}`; }


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let state = {
  user:null,
  teamId:localStorage.getItem("teamId")||"Beer-Team",
  logs:[],
  loading:false,
  selectedDate: todayTH(),
  selectedExercise:"Barbell Bench Press",
  selectedAlternative:"",
  route:"dashboard",
  timerEndAt: Number(localStorage.getItem("timerEndAt")||0),
  timerRunning:false,
  timerLastCompleteNotifiedAt:0,
  timerWarned10:false,
  reminderIntervalMin: Number(localStorage.getItem("reminderIntervalMin")||0),
  editId:null,
  notifierEnabled:localStorage.getItem("notifierEnabled")==="1",
  autoRest:localStorage.getItem("autoRest")!=="0",
  soundEnabled:localStorage.getItem("soundEnabled")!=="0",
  vibrateEnabled:localStorage.getItem("vibrateEnabled")!=="0",
  rememberExerciseByDate: JSON.parse(localStorage.getItem("rememberExerciseByDate")||"{}"),
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
function inferPlannedExerciseFromActual(actual, day){
  const a = canonicalExercise(actual || "");
  if(!a) return "";
  if(PROGRAM.some(p=>p[2]===a && (!day || p[0]===day))) return a;
  const sameDay = PROGRAM.find(p=>p[0]===day && (ALT[p[2]]||[]).map(canonicalExercise).includes(a));
  if(sameDay) return sameDay[2];
  const any = PROGRAM.find(p=>(ALT[p[2]]||[]).map(canonicalExercise).includes(a));
  return any ? any[2] : a;
}
function plannedOf(log){
  const explicit = canonicalExercise(log?.plannedExercise || log?.originalExercise || "");
  if(explicit) return explicit;
  return inferPlannedExerciseFromActual(log?.exercise || "", log?.day || "");
}
function actualOf(log){ return log.exercise || log.plannedExercise || ""; }
function samePlanned(log, ex){ return sameExerciseIdentity(plannedOf(log), ex); }
function byCreated(a,b){ return (a.createdMs||0) - (b.createdMs||0); }
function logsSorted(){ return [...state.logs].sort((a,b)=>(a.date||"").localeCompare(b.date||"") || byCreated(a,b)); }
function status(msg,type="ok",ms=1800){ const bar=$("appStatusBar"); if(!bar) return; bar.textContent=msg; bar.className=`statusbar show ${type}`; if(ms) setTimeout(()=>{ if(bar.textContent===msg) bar.className="statusbar"; }, ms); }
function setHtml(id,html){ const el=$(id); if(el) el.innerHTML=html; }
function setText(id,text){ const el=$(id); if(el) el.textContent=text; }
function setVal(id,val){ const el=$(id); if(el) el.value=val; }
function isValidDateKey(k){ return /^\d{4}-\d{2}-\d{2}$/.test(String(k||"")); }

function hasOption(el, value){ return !!el && Array.from(el.options||[]).some(o=>o.value===String(value)); }
function setDefaultIfEmpty(id, value){ const el=$(id); if(el && (el.value==="" || el.value==null)) el.value=String(value); }
function setSelectDefaultIfInvalid(id, value){ const el=$(id); if(!el) return; if(!el.value || !hasOption(el,value)) el.value=String(value); }
function ensureLogDefaults({force=false}={}){
  const rest=restSeconds(state.selectedExercise);
  if(force){
    setVal("restPreset", rest); setVal("rir",2); setVal("tempo","2-1-2"); setVal("repQuality","Good"); setVal("biasMode","Standard"); setVal("sleepHours",7); setVal("soreness",2); setVal("stress",2); return;
  }
  setDefaultIfEmpty("restPreset", rest);
  setDefaultIfEmpty("rir",2);
  setDefaultIfEmpty("tempo","2-1-2");
  setSelectDefaultIfInvalid("repQuality","Good");
  setSelectDefaultIfInvalid("biasMode","Standard");
  setDefaultIfEmpty("sleepHours",7);
  setDefaultIfEmpty("soreness",2);
  setDefaultIfEmpty("stress",2);
}
function lockByDateAndExercise(ex=state.selectedExercise,date=state.selectedDate){
  const day = dayForExercise(ex);
  const plan = currentCyclePlan(date);
  const displayDate=displayDateForExerciseProgress(day,date);
  const done = completedForExercise(ex,displayDate);
  const target = targetSets(ex);
  const completed = done >= target;
  const dayAllowed = plan.allowedDays.includes(day);
  const saveAllowed = dayAllowed && !completed && date===todayTH();
  return {day, plan, displayDate, done, target, completed, dayAllowed, saveAllowed, reason: completed ? "ท่านี้ครบแล้ว" : (!dayAllowed ? plan.reason : (date!==todayTH()?"เลือกดูย้อนหลัง/ล่วงหน้าได้ แต่บันทึกได้เฉพาะวันนี้":"พร้อมบันทึก"))};
}
function isFutureDate(date=state.selectedDate){ return dayDiff(date,todayTH())>0; }
function dateStatus(date=state.selectedDate){ const diff=dayDiff(date,todayTH()); if(diff===0) return {label:"🟢 วันนี้", cls:"ok"}; if(diff<0) return {label:`🟡 ย้อนหลัง ${Math.abs(diff)} วัน`, cls:"warn"}; return {label:`🔵 ล่วงหน้า ${diff} วัน`, cls:"info"}; }

function saveRememberedExercise(){ state.rememberExerciseByDate[state.selectedDate]=state.selectedExercise; localStorage.setItem("rememberExerciseByDate",JSON.stringify(state.rememberExerciseByDate)); }
function restoreRememberedExercise(date=state.selectedDate){
  const saved=state.rememberExerciseByDate?.[date];
  if(saved && PROGRAM.some(p=>p[2]===saved)) return saved;
  const plan=currentCyclePlan(date);
  if(plan.allowedDays?.length) return nextIncompleteExercise(plan.allowedDays[0],date);
  return state.selectedExercise || PROGRAM[0][2];
}
function logsOnDate(date=state.selectedDate){ return state.logs.filter(x=>x.date===date); }
function completedForExercise(ex,date=state.selectedDate){ return logsOnDate(date).filter(x=>samePlanned(x,ex)).length; }
function volumeForLogs(arr){ return arr.reduce((s,x)=>s+(Number(x.weightKg)||0)*(Number(x.reps)||0),0); }
function currentExerciseProgress(ex=state.selectedExercise,date=state.selectedDate){ return {done:completedForExercise(ex,date), target:targetSets(ex)}; }
function nextIncompleteExercise(day,date=state.selectedDate){ return PROGRAM.filter(p=>p[0]===day).find(p=>completedForExercise(p[2],date)<Number(p[3]))?.[2] || PROGRAM.find(p=>p[0]===day)?.[2] || PROGRAM[0][2]; }
function dayForExercise(ex){ return metaByExercise(ex)[0]; }
function dayExercises(day){ return PROGRAM.filter(p=>p[0]===day); }
function dayCompleteOnDate(day,date){ return dayExercises(day).every(p=>completedForExercise(p[2],date) >= Number(p[3])); }
function workoutDates(){ return [...new Set(state.logs.map(x=>x.date).filter(Boolean))].sort(); }
function logsByDate(date){ return state.logs.filter(x=>x.date===date); }
function completedDaysByDate(date){ return DAY_ORDER.filter(d=>dayCompleteOnDate(d,date)); }
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
  if(previousD5 && dayDiff(date, previousD5) < 2){
    return {allowedDays:[], code:"REST_LOCK", earliest:addDaysKey(previousD5,2), reason:`พักหลัง Day 5 ยังไม่ครบ เริ่มรอบใหม่ได้เร็วสุด ${addDaysKey(previousD5,2)}`};
  }
  if(previousD5 && dayDiff(date, previousD5) >= 2) boundary = previousD5;

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
  if(dayDiff(date,d5) < 2) return {allowedDays:[], code:"REST_LOCK", earliest:addDaysKey(d5,2), reason:`หลัง Day 5 ต้องพัก 2 วัน เริ่มรอบใหม่ได้เร็วสุด ${addDaysKey(d5,2)}`};
  return {allowedDays:["Day 1"], code:"OPEN", earliest:addDaysKey(d5,2), reason:"เริ่มรอบใหม่ Day 1 ได้"};
}
function allowedTrainingDaysForDate(date=state.selectedDate){ return currentCyclePlan(date).allowedDays || []; }
function exerciseOptionState(ex,date=state.selectedDate){
  const day=dayForExercise(ex); const displayDate=displayDateForExerciseProgress(day,date); const done=completedForExercise(ex,displayDate); const target=targetSets(ex); const completed=done>=target;
  const plan=currentCyclePlan(date); const allowed=plan.allowedDays.includes(day);
  return {day, displayDate, done, target, completed, allowed, reason: completed?"ครบแล้ว":(!allowed?plan.reason:"พร้อม")};
}
function dateSummary(date=state.selectedDate){
  const arr=logsByDate(date); const vol=volumeForLogs(arr); const completed=completedDaysByDate(date);
  return {date, sets:arr.length, volume:vol, completed, exercises:[...new Set(arr.map(plannedOf))]};
}
function normalizeLog(raw){
  const id = raw.id || raw._id || tempId();
  const createdMs = Number(raw.createdMs || raw.createdAtMs || (raw.createdAt?.toMillis?.()||0) || localNowMs());
  const actual = raw.exercise || raw.plannedExercise || raw.originalExercise || "";
  const planned = raw.plannedExercise || raw.originalExercise || inferPlannedExerciseFromActual(actual, raw.day || "") || actual;
  return {...raw, id, plannedExercise:planned, exercise:actual||planned, date:isValidDateKey(raw.date)?raw.date:todayTH(), weightKg:Number(raw.weightKg ?? raw.weight ?? 0), reps:Number(raw.reps||0), rir:Number(raw.rir ?? 2), createdMs};
}

function notify(title, body){
  if(!state.notifierEnabled) return;
  if("Notification" in window && Notification.permission==="granted"){
    try{ new Notification(title,{body,tag:"workout-pro-rest",renotify:true}); }catch(e){}
  }
  if(state.vibrateEnabled && navigator.vibrate) navigator.vibrate(title.includes("Complete")?[120,60,120,60,120]:[100]);
  if(state.soundEnabled) beep(title.includes("Complete")?880:660);
}
function beep(freq=740){ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=freq; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.0001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.08,ctx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.35); o.start(); o.stop(ctx.currentTime+0.36); }catch(e){} }
async function enableNotifications(){
  if(!("Notification" in window)){ status("Browser นี้ไม่รองรับ Notification","bad"); return; }
  const perm = await Notification.requestPermission();
  if(perm==="granted"){ state.notifierEnabled=true; localStorage.setItem("notifierEnabled","1"); status("เปิด Notification แล้ว","ok"); }
  else { state.notifierEnabled=false; localStorage.setItem("notifierEnabled","0"); status("Notification ถูกปิด/ไม่อนุญาต","bad",3000); }
  renderAll();
}
function startRestTimer(seconds=restSeconds()){
  state.timerEndAt=Date.now()+seconds*1000; state.timerRunning=true; state.timerWarned10=false; localStorage.setItem("timerEndAt",String(state.timerEndAt));
  status(`เริ่มพัก ${seconds}s`,"ok"); renderTimer();
}
function stopTimer(){ state.timerEndAt=0; state.timerRunning=false; state.timerWarned10=false; localStorage.removeItem("timerEndAt"); renderTimer(); }
function timerRemaining(){ return Math.max(0, Math.ceil((Number(state.timerEndAt||0)-Date.now())/1000)); }
function renderTimer(){
  const remain=timerRemaining();
  state.timerRunning=remain>0;
  setText("timerText", state.timerRunning ? `${Math.floor(remain/60)}:${String(remain%60).padStart(2,"0")}` : "พร้อม");
  if(state.timerRunning && remain<=10 && !state.timerWarned10){ state.timerWarned10=true; notify("⏳ เหลือ 10 วินาที","เตรียมเล่นเซตถัดไป"); status("เหลือ 10 วินาที","warn",1200); }
  if(!state.timerRunning && state.timerEndAt){
    const completedAt=Number(state.timerEndAt);
    if(state.timerLastCompleteNotifiedAt!==completedAt){ state.timerLastCompleteNotifiedAt=completedAt; notify("Rest Complete","พร้อมเล่นเซตถัดไปแล้ว"); status("หมดเวลาพัก • พร้อมเล่นเซตถัดไป","ok",3000); }
    localStorage.removeItem("timerEndAt"); state.timerEndAt=0;
  }
}
setInterval(renderTimer,500);
document.addEventListener("visibilitychange",()=>renderTimer());

function initTabs(){ document.querySelectorAll(".tabBtn").forEach(btn=>btn.addEventListener("click",()=>{ state.route=btn.dataset.route; renderAll(); })); }
function updateActiveTab(){ document.querySelectorAll(".tabBtn").forEach(b=>b.classList.toggle("active",b.dataset.route===state.route)); document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${state.route}`)); }
function renderAll(){
  updateActiveTab();
  setText("version",VERSION);
  setText("userName", state.user?.displayName || "Guest");
  renderDateControls(); renderDayLock(); renderExerciseSelect(); renderWorkoutForm(); renderRecentLog(); renderDashboard(); renderCalendar(); renderExerciseDatabase(); renderCoach(); renderPlateau(); renderTimer(); renderSettings(); qaExerciseCoverage();
}
function renderDateControls(){
  const d=$("selectedDate"); if(d && d.value!==state.selectedDate) d.value=state.selectedDate;
  const st=dateStatus(state.selectedDate);
  setText("dateStatus",`${st.label} • ${state.selectedDate}`);
}
function renderDayLock(){
  const plan=currentCyclePlan();
  const allowed=plan.allowedDays.length?plan.allowedDays.join(", "):"Rest / Locked";
  const completedToday=completedDaysByDate(state.selectedDate);
  setHtml("dayLockBox", `<b>Day Lock Control</b><br><span class="pill ${plan.code==='OPEN'?'ok':'warn'}">${allowed}</span><div class="small">${plan.reason}</div><div class="small">Completed: ${completedToday.join(", ")||"-"}</div>`);
}
function renderExerciseSelect(){
  const sel=$("exerciseSelect"); if(!sel) return;
  const current=state.selectedExercise || restoreRememberedExercise();
  const rows=PROGRAM.map(p=>{
    const st=exerciseOptionState(p[2]);
    const disabled = st.completed ? "disabled" : "";
    const tag = st.allowed ? "" : " 🔒";
    return `<option value="${p[2]}" ${disabled} title="${st.reason}">${p[0]} - ${p[2]} (${st.done}/${st.target})${tag}</option>`;
  }).join("");
  sel.innerHTML=rows;
  if(hasOption(sel,current)) sel.value=current;
  else sel.value=nextIncompleteExercise(currentCyclePlan().allowedDays[0]||"Day 1");
  state.selectedExercise=sel.value;
}
function renderWorkoutForm(){
  const lock=lockByDateAndExercise();
  const info=exInfo(state.selectedExercise);
  setHtml("exerciseInfo", `<b>${state.selectedExercise}</b><br>${exerciseMediaHtml(actualExerciseName())}<div class="small">Planned: ${info.planned} • Progress: ${lock.done}/${lock.target} • ${lock.reason}</div>`);
  setText("saveGuard", lock.saveAllowed ? "พร้อมบันทึก" : lock.reason);
  const btn=$("saveSetBtn"); if(btn) btn.disabled=!lock.saveAllowed;
  renderAlternativePicker();
  ensureLogDefaults();
}
function actualExerciseName(){ return state.selectedAlternative || state.selectedExercise; }
function renderAlternativePicker(){
  const box=$("alternativeBox"); if(!box) return;
  const tiers=tieredAlternativesForExercise(state.selectedExercise);
  const section=(label,items,cls)=>items?.length?`<div class="altTier"><b>${label}</b>${items.map(a=>`<button class="altBtn ${state.selectedAlternative===a?'active':''} ${cls}" data-alt="${a}">${a}<br><span>${exerciseMediaHtml(a)}</span></button>`).join("")}</div>`:"";
  box.innerHTML=`<div class="small">เลือกท่าทดแทน</div>${section("Tier A • ใกล้เคียงมาก",tiers.A,"tierA")}${section("Tier B • ใกล้เคียง",tiers.B,"tierB")}${section("Tier C • แก้ขัด",tiers.C,"tierC")}${(!tiers.A.length&&!tiers.B.length&&!tiers.C.length)?'<div class="small">ไม่มีท่าแทน</div>':''}`;
  box.querySelectorAll(".altBtn").forEach(b=>b.addEventListener("click",()=>{ state.selectedAlternative = state.selectedAlternative===b.dataset.alt ? "" : b.dataset.alt; renderWorkoutForm(); }));
}
function renderRecentLog(){
  const arr=logsSorted().filter(x=>x.date===state.selectedDate).slice(-8).reverse();
  setHtml("recentLog", arr.length?arr.map(x=>`<div class="logItem"><b>${plannedOf(x)}</b> ${actualOf(x)!==plannedOf(x)?`<span class="small">→ ${actualOf(x)}</span>`:""}<br>${x.weightKg}kg × ${x.reps} • RIR ${x.rir}<div class="row"><button class="miniBtn" data-edit="${x.id}">แก้</button><button class="miniBtn danger" data-del="${x.id}">ลบ</button></div></div>`).join(""):"<div class='small'>ยังไม่มี Log วันนี้</div>");
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editLog(b.dataset.edit)));
  document.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>deleteLog(b.dataset.del)));
}
function renderDashboard(){
  const today=dateSummary(state.selectedDate); const weekLogs=state.logs.filter(x=>Number(x.week)===autoWeek());
  const vol=volumeForLogs(weekLogs); const sets=weekLogs.length;
  setHtml("dashboardBox", `<div class="grid2"><div class="card"><b>Daily Summary</b><h2>${today.sets}</h2><div>Sets วันนี้</div><div class="small">Completed: ${today.completed.join(", ")||"-"}</div></div><div class="card"><b>Weekly Volume</b><h2>${Math.round(vol).toLocaleString()}</h2><div>kg×reps</div><div class="small">Sets: ${sets}</div></div></div>`);
  renderMuscleBalance(weekLogs);
}
function renderMuscleBalance(arr){
  const by={}; arr.forEach(x=>{ const m=exInfo(plannedOf(x)).primaryMuscle; by[m]=(by[m]||0)+1; });
  const html=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`<div class="bar"><span>${m}</span><b>${v} sets</b></div>`).join("") || "<div class='small'>ยังไม่มีข้อมูล</div>";
  setHtml("muscleBalance",html);
}
function renderCalendar(){
  const month=state.calendarMonth || state.selectedDate.slice(0,7);
  const [y,m]=month.split("-").map(Number); const first=new Date(y,m-1,1); const last=new Date(y,m,0); const start=first.getDay();
  let cells=""; for(let i=0;i<start;i++) cells+="<div></div>";
  for(let d=1;d<=last.getDate();d++){ const key=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; const sum=dateSummary(key); const cls=sum.completed.length?"done":(dayDiff(key,todayTH())<0 && !sum.sets?"miss":(key===state.selectedDate?"selected":"")); cells+=`<button class="calDay ${cls}" data-date="${key}">${d}<small>${sum.sets?sum.sets+" sets":""}</small></button>`; }
  setHtml("calendarGrid",cells);
  document.querySelectorAll(".calDay").forEach(b=>b.addEventListener("click",()=>{ state.selectedDate=b.dataset.date; state.selectedExercise=restoreRememberedExercise(state.selectedDate); renderAll(); }));
  const sum=dateSummary(state.selectedDate);
  setHtml("calendarInsight", `<b>${dateLabelTH(state.selectedDate)}</b><br>Sets: ${sum.sets} • Volume: ${Math.round(sum.volume).toLocaleString()}<br>Completed: ${sum.completed.join(", ")||"-"}<br>Exercises: ${sum.exercises.join(", ")||"-"}`);
}
function renderExerciseDatabase(){
  const q=String($("exerciseSearch")?.value||"").toLowerCase();
  const rows=getExerciseDbRows().filter(x=>!q || x.name.toLowerCase().includes(q) || x.primaryMuscle.toLowerCase().includes(q) || x.planned.toLowerCase().includes(q));
  setHtml("exerciseDb", rows.slice(0,80).map(x=>`<div class="dbRow"><b>${x.name}</b> ${x.isAlternative?`<span class="pill warn">Alternative</span>`:`<span class="pill ok">Program</span>`}<br>${exerciseMediaHtml(x.name)}<div class="small">Day: ${x.day} • Planned: ${x.planned}</div></div>`).join("") || "<div class='small'>ไม่พบข้อมูล</div>");
}
function renderCoach(){
  const arr=logsByDate(state.selectedDate); const last=arr[arr.length-1]; const week=state.logs.filter(x=>Number(x.week)===autoWeek());
  const score=Math.max(30, Math.min(100, 80 - (Number(last?.soreness||2)*5) - (Number(last?.stress||2)*3) + (Number(last?.sleepHours||7)-7)*5));
  const plateau=detectPlateau();
  const muscles={}; week.forEach(x=>{ const m=exInfo(plannedOf(x)).primaryMuscle; muscles[m]=(muscles[m]||0)+1; });
  setHtml("coachBox", `<div class="card"><b>AI Daily Coach Summary</b><h2>${Math.round(score)}</h2><div>Recovery Score</div><div class="small">${arr.length?"วันนี้มีข้อมูล log แล้ว":"ยังไม่มี log วันนี้"}</div><hr><b>Muscle Volume Balance</b>${Object.entries(muscles).map(([m,v])=>`<div>${m}: ${v} sets</div>`).join("")||"<div class='small'>ยังไม่มีข้อมูล</div>"}<hr><b>Plateau Detection v2</b><div>${plateau}</div></div>`);
}
function renderPlateau(){ setHtml("plateauBox", `<b>Plateau Detection v2</b><br>${detectPlateau()}`); }
function detectPlateau(){
  const groups={}; state.logs.forEach(x=>{ const k=plannedOf(x); (groups[k] ||= []).push(x); });
  const notes=[]; Object.entries(groups).forEach(([ex,arr])=>{ if(arr.length<4) return; const sorted=arr.sort((a,b)=>(a.date||"").localeCompare(b.date||"")); const recent=sorted.slice(-4); const maxes=recent.map(x=>Number(x.weightKg)||0); if(Math.max(...maxes)-Math.min(...maxes)<=0) notes.push(`${ex}: น้ำหนักนิ่ง ${maxes[0]}kg`); });
  return notes.length?notes.join("<br>"):"ยังไม่พบ plateau ชัดเจน";
}
function renderSettings(){
  setHtml("settingsBox", `<div class="card"><button id="enableNoti" class="primary">🔔 Enable Notifications</button><label><input id="autoRest" type="checkbox" ${state.autoRest?"checked":""}/> Auto Start Rest Timer</label><label><input id="soundEnabled" type="checkbox" ${state.soundEnabled?"checked":""}/> Sound</label><label><input id="vibrateEnabled" type="checkbox" ${state.vibrateEnabled?"checked":""}/> Vibrate</label><hr><button id="runQaBtn">Run QA</button><pre id="qaOutput"></pre></div>`);
  $("enableNoti")?.addEventListener("click",enableNotifications);
  ["autoRest","soundEnabled","vibrateEnabled"].forEach(id=>$(id)?.addEventListener("change",e=>{ state[id]=e.target.checked; localStorage.setItem(id,e.target.checked?"1":"0"); }));
  $("runQaBtn")?.addEventListener("click",()=>setText("qaOutput",JSON.stringify(qaExerciseCoverage(),null,2)));
}
function autoWeek(){ const start=new Date(new Date().getFullYear(),0,1); return Math.ceil((((parseKey(state.selectedDate)-start)/86400000)+start.getDay()+1)/7); }
function hydrateInputsFromState(){ ensureLogDefaults(); }
async function saveSet(){
  const lock=lockByDateAndExercise(); if(!lock.saveAllowed){ status(lock.reason,"bad",2600); return; }
  const w=Number($("weightKg")?.value||0), reps=Number($("reps")?.value||0); if(!reps){ status("กรอก reps ก่อน","bad"); return; }
  const payload={date:state.selectedDate, week:autoWeek(), day:dayForExercise(state.selectedExercise), plannedExercise:state.selectedExercise, exercise:actualExerciseName(), weightKg:w, reps, rir:Number($("rir")?.value||2), tempo:$("tempo")?.value||"", repQuality:$("repQuality")?.value||"", biasMode:$("biasMode")?.value||"", note:$("note")?.value||"", targetSets:targetSets(), sleepHours:Number($("sleepHours")?.value||7), soreness:Number($("soreness")?.value||2), stress:Number($("stress")?.value||2), version:VERSION, updatedAt:serverTimestamp()};
  const local=normalizeLog({...payload, id:state.editId||tempId(), createdMs:localNowMs()});
  if(state.editId){ state.logs=state.logs.map(x=>x.id===state.editId?local:x); }
  else state.logs=[...state.logs,local];
  renderAll(); status("บันทึกแล้ว • sync กำลังตามหลัง","ok");
  try{
    if(state.user){ if(state.editId){ await updateDoc(doc(db,collectionPath(),state.editId),payload); } else { await addDoc(collection(db,collectionPath()), {...payload, createdAt:serverTimestamp(), createdMs:local.createdMs}); } }
    status("Sync สำเร็จ","ok");
  }catch(e){ console.error(e); status("Sync ไม่สำเร็จ แต่ข้อมูลแสดงในเครื่องแล้ว","bad",3000); }
  state.editId=null; state.selectedAlternative=""; saveRememberedExercise(); if(state.autoRest && completedForExercise(state.selectedExercise)<targetSets(state.selectedExercise)) startRestTimer(restSeconds());
  ensureLogDefaults({force:false}); renderAll();
}
function editLog(id){ const x=state.logs.find(l=>l.id===id); if(!x) return; state.editId=id; state.selectedDate=x.date; state.selectedExercise=plannedOf(x); state.selectedAlternative=actualOf(x)!==plannedOf(x)?actualOf(x):""; setVal("weightKg",x.weightKg); setVal("reps",x.reps); setVal("rir",x.rir); setVal("note",x.note||""); renderAll(); status("แก้ไข log เดิม","warn"); }
async function deleteLog(id){ state.logs=state.logs.filter(x=>x.id!==id); renderAll(); try{ if(state.user) await deleteDoc(doc(db,collectionPath(),id)); status("ลบแล้ว","ok"); }catch(e){ status("ลบในเครื่องแล้ว แต่ sync fail","bad"); } }
function bindEvents(){
  $("loginBtn")?.addEventListener("click",()=>signInWithPopup(auth,new GoogleAuthProvider()));
  $("logoutBtn")?.addEventListener("click",()=>signOut(auth));
  $("selectedDate")?.addEventListener("change",e=>{ state.selectedDate=e.target.value||todayTH(); state.selectedExercise=restoreRememberedExercise(state.selectedDate); renderAll(); });
  $("exerciseSelect")?.addEventListener("change",e=>{ state.selectedExercise=e.target.value; state.selectedAlternative=""; saveRememberedExercise(); renderAll(); });
  $("saveSetBtn")?.addEventListener("click",saveSet);
  $("startTimerBtn")?.addEventListener("click",()=>startRestTimer(restSeconds()));
  $("stopTimerBtn")?.addEventListener("click",stopTimer);
  $("add30Btn")?.addEventListener("click",()=>{ state.timerEndAt=(state.timerEndAt||Date.now())+30000; localStorage.setItem("timerEndAt",String(state.timerEndAt)); renderTimer(); });
  $("exerciseSearch")?.addEventListener("input",renderExerciseDatabase);
  initTabs();
}
function subscribe(){
  if(!state.user){ state.logs=(JSON.parse(localStorage.getItem("guestLogs")||"[]")||[]).map(normalizeLog); renderAll(); return; }
  const q=query(collection(db,collectionPath()),orderBy("date","asc"));
  onSnapshot(q,snap=>{ state.logs=snap.docs.map(d=>normalizeLog({id:d.id,...d.data()})); renderAll(); },err=>{ console.error(err); status("โหลด Firestore ไม่สำเร็จ","bad"); });
}
function persistGuest(){ if(!state.user) localStorage.setItem("guestLogs",JSON.stringify(state.logs)); }
setInterval(persistGuest,2000);
onAuthStateChanged(auth,user=>{ state.user=user; subscribe(); renderAll(); });

document.addEventListener("DOMContentLoaded",()=>{ bindEvents(); hydrateInputsFromState(); subscribe(); renderAll(); });

function download(name,text,type="text/plain"){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function exportCsv(){ const cols=["date","week","day","plannedExercise","exercise","weightKg","reps","rir","note"]; const csv=[cols.join(","),...state.logs.map(x=>cols.map(c=>`"${String(x[c]??"").replaceAll('"','""')}"`).join(","))].join("\n"); download("workout-pro-log.csv",csv,"text/csv"); status("Export CSV แล้ว","ok"); }
window.exportWorkoutCsv=exportCsv;
window.workoutProDebug=()=>({state, qa:qaExerciseCoverage(), plan:currentCyclePlan(), progress:dayProgressDebug(dayForExercise(state.selectedExercise)), exerciseId:exerciseIdForName(state.selectedExercise)});
