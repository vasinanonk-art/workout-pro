// Workout PRO v5.4.5 CLEAN REBUILD - DATE STATUS LABEL FIX
// Single state engine. No legacy render patches. No duplicate Day Lock / Dropdown renderers.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const VERSION = "v5.4.5";
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
  "Barbell Bench Press":["Machine Chest Press","Dumbbell Bench Press","Smith Machine Bench Press","Push-up"],
  "Incline Dumbbell Press":["Incline Machine Press","Smith Machine Incline Press","Incline Barbell Press","Low-to-High Cable Fly"],
  "Seated Shoulder Press":["Machine Shoulder Press","Dumbbell Shoulder Press","Smith Machine Shoulder Press","Landmine Press"],
  "Dumbbell Lateral Raise":["Cable Lateral Raise","Machine Lateral Raise","Seated Lateral Raise"],
  "Cable Triceps Pushdown":["Rope Triceps Pushdown","Straight Bar Pushdown","Machine Triceps Extension","Close-grip Push-up"],
  "Lat Pulldown":["Pull-up","Assisted Pull-up","Single-arm Cable Pulldown","Band Pulldown"],
  "Barbell Row":["Chest Supported Row","Seated Cable Row","Machine Row","Dumbbell Row","T-Bar Row"],
  "Seated Cable Row":["Machine Row","Chest Supported Dumbbell Row","Barbell Row","Resistance Band Row"],
  "Face Pull":["Reverse Pec Deck","Band Face Pull","Cable Rear Delt Fly","Bent-over Rear Delt Raise"],
  "Dumbbell Curl":["Cable Curl","EZ Bar Curl","Machine Preacher Curl","Incline Dumbbell Curl"],
  "Back Squat":["Hack Squat","V-Squat Machine","Leg Press","Goblet Squat","Smith Machine Squat"],
  "Romanian Deadlift":["Dumbbell Romanian Deadlift","Seated Leg Curl","Lying Leg Curl","Hip Thrust"],
  "Leg Press":["Hack Squat","V-Squat Machine","Goblet Squat","Leg Extension"],
  "Walking Lunge":["Bulgarian Split Squat","Reverse Lunge","Static Lunge","Smith Split Squat","Goblet Squat"],
  "Lying Leg Curl":["Seated Leg Curl","Standing Leg Curl","Prone Leg Curl","Swiss Ball Leg Curl"],
  "Standing Calf Raise":["Seated Calf Raise","Leg Press Calf Raise","Smith Machine Calf Raise","Single-leg Dumbbell Calf Raise"]
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let state = {
  user:null,
  teamId: localStorage.getItem("teamId") || "Beer-Team",
  logs:[],
  selectedDate: todayTH(),
  selectedExercise: PROGRAM[0][2],
  selectedAlt:null,
  selectedDayForOverride:null,
  overrideKeys: new Set(JSON.parse(localStorage.getItem("dayLockOverridesV540") || "[]")),
  editingId:null,
  saving:false,
  unsub:null,
  page:"setup",
  timerId:null,
  timerLeft:0,
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
function metaByExercise(ex=state.selectedExercise){ return PROGRAM.find(p=>p[2]===ex) || PROGRAM[0]; }
function targetSets(ex=state.selectedExercise){ return Number(metaByExercise(ex)[3]) || 1; }
function restSeconds(ex=state.selectedExercise){ const mode = metaByExercise(ex)[6] || "standard"; return REST_SECONDS[mode] || 75; }
function plannedOf(log){ return log.plannedExercise || log.exercise || ""; }
function actualOf(log){ return log.exercise || log.plannedExercise || ""; }
function samePlanned(log, ex){ return plannedOf(log) === ex; }
function byCreated(a,b){ return (a.createdMs||0) - (b.createdMs||0); }
function logsSorted(){ return [...state.logs].sort((a,b)=>(a.date||"").localeCompare(b.date||"") || byCreated(a,b)); }
function status(msg,type="ok",ms=1800){ const bar=$("appStatusBar"); if(!bar) return; bar.textContent=msg; bar.className=`statusbar show ${type}`; if(ms) setTimeout(()=>{ if(bar.textContent===msg) bar.className="statusbar"; }, ms); }
function setHtml(id,html){ const el=$(id); if(el) el.innerHTML=html; }
function setText(id,text){ const el=$(id); if(el) el.textContent=text; }
function setVal(id,val){ const el=$(id); if(el) el.value=val; }
function isValidDateKey(k){ return /^\d{4}-\d{2}-\d{2}$/.test(String(k||"")); }

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
  if(dayDiff(date,d5) < 2) return {allowedDays:[], code:"REST_LOCK", earliest:addDaysKey(d5,2), reason:`พักหลัง Day 5 ยังไม่ครบ เริ่มรอบใหม่ได้เร็วสุด ${addDaysKey(d5,2)}`};
  return {allowedDays:["Day 1"], code:"OPEN", earliest:addDaysKey(d5,2), reason:"พักครบแล้ว เริ่ม Day 1 รอบใหม่ได้"};
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
function grantOverride(day=dayForExercise(state.selectedExercise)){ const key=`${state.selectedDate}|${state.user?.uid||"guest"}|${state.teamId}|${day}`; state.overrideKeys.add(key); localStorage.setItem("dayLockOverridesV540", JSON.stringify([...state.overrideKeys])); status(`ปลดล็อก ${day} แล้ว`,"warn"); renderAll(); }

function normalizeLog(raw,id){
  let createdMs = Date.now();
  try{ if(raw.createdAt?.seconds) createdMs=raw.createdAt.seconds*1000; }catch(e){}
  const planned = raw.plannedExercise || raw.originalExercise || raw.exercise;
  return {...raw, id, plannedExercise:planned, exercise:raw.exercise||planned, date:isValidDateKey(raw.date)?raw.date:todayTH(), weightKg:Number(raw.weightKg ?? raw.weight ?? 0), reps:Number(raw.reps||0), rir:Number(raw.rir ?? 2), createdMs};
}
function subscribeLogs(){
  if(state.unsub) state.unsub();
  if(!state.user || !state.teamId){ renderAll(); return; }
  status("กำลังโหลด Log...","warn",0);
  const q=query(collection(db, collectionPath()), orderBy("date","asc"));
  state.unsub=onSnapshot(q,(snap)=>{
    state.logs=snap.docs.map(d=>normalizeLog(d.data(), d.id));
    status("โหลดข้อมูลสำเร็จ","ok");
    renderAll();
  },(err)=>{ console.error(err); status("โหลด Log ไม่สำเร็จ: "+err.message,"err",0); });
}

function renderAll(){
  renderSetup(); renderDayLock(); renderExerciseSelect(); renderLogSummary(); renderRecent(); renderDashboard(); renderCoach(); renderProgram(); renderGuide(); renderCalendar(); renderBackup(); renderMediaPanel(); updateFormDerived();
}
function renderSetup(){
  setVal("teamId", state.teamId);
  setText("authState", state.user ? `Login: ${state.user.displayName || state.user.email}` : "ยังไม่ได้ login");
  setHtml("debug", `Version: <b>${VERSION}</b><br>User: ${state.user?.email || "-"}<br>Team: ${state.teamId || "-"}<br>Logs: ${state.logs.length}<br>Date: ${state.selectedDate} (${dateLabelTH(state.selectedDate)})`);
  setHtml("teamSaveStatus", `Team ID: <b>${state.teamId || "-"}</b>`);
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
  // Source of truth: allowed day is calculated from the selected date.
  // Display progress for completed previous training days in the same cycle, not 0/target on the next date.
  const allowedDays = allowedTrainingDaysForDate(state.selectedDate);
  sel.innerHTML="";
  PROGRAM.forEach(p=>{
    const [day,,ex,tgt]=p;
    const progressDate = displayDateForExerciseProgress(day,state.selectedDate);
    const done=completedForExercise(ex,progressDate);
    const opt=document.createElement("option"); opt.value=ex;
    opt.dataset.day=day;
    opt.dataset.progressDate=progressDate;
    const isDone=done>=Number(tgt);
    const lockedDay = !allowedDays.includes(day);
    opt.disabled = isDone || lockedDay;
    const mark = isDone ? "✓ " : (allowedDays.includes(day) ? "▶ " : "");
    const dateNote = progressDate!==state.selectedDate && done>0 ? ` • ${dateLabelTH(progressDate)}` : "";
    opt.textContent = `${mark}${day} - ${ex} (${done}/${tgt})${dateNote}${isDone||lockedDay?" 🔒":""}`;
    sel.appendChild(opt);
  });
  const preferred = [...sel.options].find(o=>o.value===old && !o.disabled) || [...sel.options].find(o=>!o.disabled);
  if(preferred){ sel.value=preferred.value; state.selectedExercise=preferred.value; }
  else { sel.value = old; }
  sel.disabled = !preferred;
  renderExerciseProgressList();
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
function renderDayLock(){
  const lock=calcDayLock();
  const box=$("dayDateLockDebug"); if(!box) return;
  const current = dayForExercise(state.selectedExercise);
  const days = DAY_ORDER.map(d=>`<option value="${d}" ${d===current?"selected":""}>${d}</option>`).join("");
  box.className = `msg lock-panel ${lock.status==="OPEN"?"open":"locked"}`;
  box.innerHTML = `<h3>Day Lock Control</h3>
    <div>Status: <b>${lock.status}</b> <span class="pill">Runtime ${VERSION}</span></div>
    <div class="small">Today: ${dateLabelTH(todayTH())} (${todayTH()}) • Selected: ${dateLabelTH(state.selectedDate)} (${state.selectedDate})</div>
    <div class="small">Allowed: ${lock.allowedDays?.length ? lock.allowedDays.join(", ") : "-"}</div>
    <div class="small">${lock.reason}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><select id="overrideDaySelect">${days}</select><button id="overrideDayBtn" class="orange" type="button">ข้ามไปเล่น Day ที่เลือก</button></div>
    <div class="select-hint">ถ้าข้ามวัน ต้องกดปุ่มนี้ก่อน Save ถึงจะทำงาน</div>`;
  $("overrideDaySelect")?.addEventListener("change", e=>{ state.selectedDayForOverride=e.target.value; status("เลือก Day ที่จะข้าม: "+e.target.value,"warn",1200); });
  $("overrideDayBtn")?.addEventListener("click",()=>{
    const d=$("overrideDaySelect")?.value || current;
    grantOverride(d);
    const ex=nextIncompleteExercise(d,state.selectedDate);
    state.selectedExercise=ex;
    renderAll();
  });
  setHtml("lockStatus", lock.status==="OPEN" ? `<span class="ok-text">พร้อมเล่น: ${dayForExercise(state.selectedExercise)}</span>` : `<span class="warn-text">ล็อกอยู่: ${lock.reason}</span>`);
}
function updateFormDerived(){
  const m=metaByExercise();
  if($("date") && $("date").value!==state.selectedDate) $("date").value=state.selectedDate;
  const ds = selectedDateStatus();
  const dateStatusEl = $("dateStatus");
  if(dateStatusEl){ dateStatusEl.className = `msg ${ds.cls}`; dateStatusEl.innerHTML = `<b>${ds.text}</b><br><span class="small">${ds.detail}</span>`; }
  setVal("week", autoWeek());
  setVal("targetSets", targetSets());
  setText("setNo", Math.min(completedForExercise(state.selectedExercise)+1, targetSets(state.selectedExercise)));
  setText("targetShow", targetSets());
  setVal("restSec", restSeconds());
  const prog=currentExerciseProgress();
  const lock=calcDayLock();
  const saveBtn=$("saveBtn"); if(saveBtn) saveBtn.disabled = state.saving || lock.status!=="OPEN" || prog.done>=prog.target;
  setHtml("setStatus", prog.done>=prog.target ? `<span class="ok-text">ท่านี้ครบแล้ว ${prog.done}/${prog.target}</span>` : `พร้อมบันทึก: <b>${actualExerciseName()}</b> Set ${prog.done+1}/${prog.target}`);
  setHtml("calendarSyncStatus", `Calendar Sync: Today ${dateLabelTH(todayTH())} • Selected ${dateLabelTH(state.selectedDate)}`);
  setHtml("cycleDebug", `Cycle: Week ${autoWeek()} • Allowed ${calcDayLock().allowedDays?.join(", ") || "-"}`);
  renderPRAndSuggestion();
}
function actualExerciseName(){ return state.selectedAlt?.name || state.selectedExercise; }
function renderPRAndSuggestion(){
  const ex=state.selectedExercise;
  const rows=state.logs.filter(x=>plannedOf(x)===ex).sort(byCreated);
  const best=rows.reduce((b,x)=>((x.weightKg||0)*(x.reps||0)>(b.weightKg||0)*(b.reps||0)?x:b),{});
  setHtml("prStatus", rows.length ? `สถิติ ${ex}: สูงสุด ${best.weightKg||0} kg × ${best.reps||0}` : `ยังไม่มีสถิติของ ${ex}`);
  const last=rows[rows.length-1];
  setHtml("weekSuggest", last ? `ล่าสุด: ${last.weightKg} kg × ${last.reps} reps (RIR ${last.rir ?? "-"})` : `ยังไม่มีข้อมูลสัปดาห์ก่อนของท่านี้`);
  let next="-";
  if(last){ const reps=Number(last.reps||0), w=Number(last.weightKg||0); next = reps>=12 ? `${(w+2.5).toFixed(1)} kg` : `${w.toFixed(1)} kg / เพิ่ม reps`; }
  setHtml("nextWeekBox", `น้ำหนักแนะนำครั้งถัดไป: <b>${next}</b>`);
  setHtml("doubleProgressionBox", `Double Progression: ใช้เฉพาะข้อมูลของ <b>${ex}</b>`);
  setHtml("sfrBox", `SFR / Machine Bias: ${state.selectedAlt?"ใช้ท่าแทน "+state.selectedAlt.name:"Auto"}`);
}
function renderLogSummary(){
  const arr=logsOnDate(state.selectedDate), sets=arr.length, vol=volumeForLogs(arr);
  const exs=[...new Set(arr.map(plannedOf))];
  setHtml("v5LogSummary", `วันที่ ${dateLabelTH(state.selectedDate)}<br>Sets: <b>${sets}</b> • Volume: <b>${vol.toFixed(0)} kg</b><br>Exercises: ${exs.length?exs.join(", "):"-"}`);
}
function renderRecent(){
  const host=$("recent"); if(!host) return;
  const arr=[...state.logs].sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)).slice(0,12);
  if(!arr.length){ host.innerHTML="<div class='msg info'>ยังไม่มี Log</div>"; return; }
  host.innerHTML=arr.map(x=>`<div class="recent-card"><b>${dateLabelTH(x.date)} • ${x.exercise}</b><br><span class="small">Planned: ${plannedOf(x)} • ${x.weightKg} kg × ${x.reps} • RIR ${x.rir ?? "-"}</span><br><span class="small">${x.note||""}</span><div class="recent-actions"><button class="secondary edit-log" data-id="${x.id}" type="button">แก้ไข</button><button class="orange del-log" data-id="${x.id}" type="button">ลบ</button></div></div>`).join("");
  host.querySelectorAll(".edit-log").forEach(btn=>btn.addEventListener("click",()=>loadEdit(btn.dataset.id)));
  host.querySelectorAll(".del-log").forEach(btn=>btn.addEventListener("click",()=>deleteLog(btn.dataset.id)));
}
function renderDashboard(){
  setText("kVol", volumeForLogs(state.logs).toFixed(0)); setText("kSets", state.logs.length); setText("kUsers", state.user?1:0); setText("kWeek", autoWeek());
  drawSimpleChart("weekChart", groupByWeek()); drawSimpleChart("exChart", groupByExercise()); drawSimpleChart("v5MuscleChart", groupByMuscle()); drawSimpleChart("v5RecoveryChart", groupByDateSets());
  setHtml("v5MuscleInsight", state.logs.length?"Muscle Balance คำนวณจาก Log ปัจจุบัน":"รอข้อมูล Muscle Balance");
  const prs={}; state.logs.forEach(x=>{ const ex=plannedOf(x); const score=(x.weightKg||0)*(x.reps||0); if(!prs[ex] || score>prs[ex].score) prs[ex]={score,x}; });
  setHtml("v5PRBoard", Object.values(prs).slice(0,8).map(r=>`<span class="pill">${plannedOf(r.x)}: ${r.x.weightKg}×${r.x.reps}</span>`).join(" ")||"รอข้อมูล PR");
}
function groupByWeek(){ const g={}; state.logs.forEach(x=>{ const w=x.week||1; g["W"+w]=(g["W"+w]||0)+1; }); return g; }
function groupByExercise(){ const g={}; state.logs.forEach(x=>{ const k=plannedOf(x); g[k]=(g[k]||0)+(x.weightKg||0)*(x.reps||0); }); return g; }
function groupByMuscle(){ const g={}; state.logs.forEach(x=>{ const m=metaByExercise(plannedOf(x))[5]; g[m]=(g[m]||0)+1; }); return g; }
function groupByDateSets(){ const g={}; state.logs.forEach(x=>{ g[x.date]=(g[x.date]||0)+1; }); return g; }
function drawSimpleChart(id,data){ const c=$(id); if(!c?.getContext) return; const ctx=c.getContext("2d"), w=c.width, h=c.height; ctx.clearRect(0,0,w,h); const entries=Object.entries(data).slice(-10); if(!entries.length){ ctx.fillStyle="#fff"; ctx.fillText("No data",20,30); return; } const max=Math.max(...entries.map(e=>e[1]),1); entries.forEach(([k,v],i)=>{ const bw=(w-40)/entries.length; const bh=(h-50)*(v/max); ctx.fillRect(20+i*bw,h-25-bh,bw*.7,bh); ctx.fillText(String(k).slice(0,10),20+i*bw,h-8); }); }
function renderCoach(){
  const latest=state.logs[state.logs.length-1]; const sleep=Number($("sleepHours")?.value||7), soreness=Number($("soreness")?.value||2), stress=Number($("stress")?.value||2);
  const recovery=Math.max(0,Math.min(100,70+(sleep-7)*8-(soreness-2)*8-(stress-2)*8)); const fatigue=100-recovery;
  setText("coachRecovery", Math.round(recovery)); setText("coachFatigue", Math.round(fatigue)); setText("coachProgress", latest?"OK":"-"); setText("coachDeload", fatigue>55?"WATCH":"NO");
  setText("coachRecoveryText", recovery>=65?"พร้อมฝึก":"ลด volume หรือใช้ machine stable"); setText("coachFatigueText", fatigue>55?"เสี่ยงล้า":"ปกติ"); setText("coachProgressText", "ยึด RIR 1–2 และ double progression"); setText("coachDeloadText", fatigue>65?"พิจารณา deload":"ยังไม่จำเป็น");
  setHtml("coachAdvice", `วันนี้: Recovery ${Math.round(recovery)} / Fatigue ${Math.round(fatigue)}<br>ถ้าท่าหนักให้คุม RIR 2 และเลือก machine ถ้า form เริ่มตก`);
  setHtml("plateauBox", "Plateau check ใช้ข้อมูลท่าเดียวกันเท่านั้น"); setText("effectiveRepsScore", state.logs.length); setText("sfrScore", recovery>=65?"Good":"Moderate"); setText("volumeZone", state.logs.length<12?"Low":"OK");
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
function renderCalendar(){
  if(!state.calendarMonth) state.calendarMonth = state.selectedDate.slice(0,7);
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
    grid.querySelectorAll(".calDay[data-date]").forEach(el=>el.addEventListener("click",()=>{
      state.selectedDate=el.dataset.date;
      state.calendarMonth=state.selectedDate.slice(0,7);
      setVal("date",state.selectedDate);
      const allowed=allowedTrainingDaysForDate(state.selectedDate);
      const d=allowed[0] || dayForExercise(state.selectedExercise);
      const next=nextIncompleteExercise(d,state.selectedDate);
      if(next) state.selectedExercise=next;
      status("เลือกวันที่ "+dateLabelTH(state.selectedDate),"ok");
      renderAll();
    }));
  }
  const arr=logsOnDate(state.selectedDate);
  const completed=completedDaysByDate(state.selectedDate);
  setText("dayTitle", `Daily Summary - ${dateLabelTH(state.selectedDate)}`);
  setHtml("daySummary", `Sets: ${arr.length} • Completed: ${completed.join(", ")||"-"}`);
  const vol=volumeForLogs(arr);
  const exs=[...new Set(arr.map(plannedOf))];
  setHtml("v5DayInsight", arr.length ? `Volume: <b>${vol.toFixed(0)} kg</b><br>Exercises: ${exs.join(", ")}<br>Completed: ${completed.join(", ")||"-"}` : "ยังไม่มีข้อมูลของวันนี้");
  setHtml("calendarSelectedDayDetail", arr.length ? arr.slice(-8).reverse().map(x=>`<div class="small">${x.exercise}: ${x.weightKg} kg × ${x.reps} (${plannedOf(x)})</div>`).join("") : "");
  const btn=$("calendarGoLogBtn");
  if(btn){ btn.disabled=false; btn.classList.remove("disabled"); btn.onclick=()=>{ show("log"); }; }
}
function renderBackup(){ const first=logsSorted()[0]?.date||"-", last=logsSorted().at(-1)?.date||"-"; setText("backupKpiSets", state.logs.length); setText("backupKpiVolume", volumeForLogs(state.logs).toFixed(0)); setText("backupKpiFirst", first); setText("backupKpiLast", last); setHtml("backupSummaryBox", `Backup ready • ${state.logs.length} logs • ${VERSION}`); }
function renderMediaPanel(){ const ex=actualExerciseName(); setText("mediaTitle", `Media Reference: ${ex}`); setHtml("mediaCue", `Cue: คุมฟอร์ม ไม่ฝืนเจ็บ • Search: ${ex} proper form`); }

function autoWeek(){
  const dates=workoutDates(); if(!dates.length) return 1;
  const day5Dates=dates.filter(d=>dayCompleteOnDate("Day 5",d));
  return day5Dates.length + 1;
}
async function saveSet(){
  const lock=calcDayLock(); const prog=currentExerciseProgress();
  if(lock.status!=="OPEN"){ status("ยังถูก Day Lock: "+lock.reason,"err"); return; }
  if(prog.done>=prog.target){ status("ท่านี้ครบแล้ว เลือกท่าอื่น","warn"); return; }
  if(!state.user){ status("กรุณา Login ก่อน","err"); return; }
  const w=Number($("weight")?.value||0), reps=Number($("reps")?.value||0), rir=Number($("rir")?.value||2);
  if(!w || !reps){ status("กรอก Weight/Reps ก่อน","err"); return; }
  state.saving=true; updateFormDerived(); status("กำลังบันทึกเซต...","warn",0);
  const payload={date:state.selectedDate, week:autoWeek(), day:dayForExercise(state.selectedExercise), plannedExercise:state.selectedExercise, exercise:actualExerciseName(), weightKg:w, reps, rir, tempo:$("tempo")?.value||"", repQuality:$("repQuality")?.value||"", biasMode:$("biasMode")?.value||"", note:$("note")?.value||"", targetSets:targetSets(), sleepHours:Number($("sleepHours")?.value||7), soreness:Number($("soreness")?.value||2), stress:Number($("stress")?.value||2), version:VERSION, updatedAt:serverTimestamp()};
  try{
    if(state.editingId){ await updateDoc(doc(db, collectionPath(), state.editingId), payload); state.editingId=null; }
    else { await addDoc(collection(db, collectionPath()), {...payload, createdAt:serverTimestamp()}); }
    ["weight","reps","note"].forEach(id=>setVal(id,"")); status("บันทึกสำเร็จ","ok");
  }catch(e){ console.error(e); status("บันทึกไม่สำเร็จ: "+e.message,"err",0); }
  finally{ state.saving=false; renderAll(); }
}
function loadEdit(id){ const x=state.logs.find(l=>l.id===id); if(!x) return; state.editingId=id; state.selectedDate=x.date; state.selectedExercise=plannedOf(x); state.selectedAlt=x.exercise!==plannedOf(x)?{name:x.exercise, original:plannedOf(x)}:null; setVal("weight",x.weightKg); setVal("reps",x.reps); setVal("rir",x.rir); setVal("note",x.note||""); status("โหลด Log เพื่อแก้ไขแล้ว","warn"); show("log"); renderAll(); }
async function deleteLog(id){ if(!confirm("ลบ Log นี้?")) return; try{ await deleteDoc(doc(db, collectionPath(), id)); status("ลบแล้ว","ok"); }catch(e){ status("ลบไม่สำเร็จ: "+e.message,"err",0); } }
function resetForm(){ state.editingId=null; state.selectedAlt=null; ["weight","reps","note"].forEach(id=>setVal(id,"")); renderAll(); status("Reset แล้ว","ok"); }

function show(page){ document.querySelectorAll(".page").forEach(p=>p.classList.remove("active")); $(page)?.classList.add("active"); document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.page===page)); state.page=page; status("เปิดหน้า "+page,"ok",900); renderAll(); }
window.show=show;
function bind(){
  document.querySelectorAll(".tab[data-page]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.page)));
  $("loginBtn")?.addEventListener("click",()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>status(e.message,"err",0)));
  $("logoutBtn")?.addEventListener("click",()=>signOut(auth));
  $("saveTeamBtn")?.addEventListener("click",()=>{ state.teamId=$("teamId")?.value.trim()||"Beer-Team"; localStorage.setItem("teamId",state.teamId); subscribeLogs(); status("บันทึก Team ID แล้ว","ok"); });
  $("date")?.addEventListener("change",e=>{
    state.selectedDate=isValidDateKey(e.target.value)?e.target.value:todayTH();
    state.calendarMonth=state.selectedDate.slice(0,7);
    const allowed=allowedTrainingDaysForDate(state.selectedDate);
    const d=allowed[0] || dayForExercise(state.selectedExercise);
    state.selectedExercise=nextIncompleteExercise(d,state.selectedDate);
    renderAll();
  });
  $("prevM")?.addEventListener("click",()=>{ const [y,m]=state.calendarMonth.split("-").map(Number); const dt=new Date(y,m-2,1); state.calendarMonth=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; renderCalendar(); });
  $("nextM")?.addEventListener("click",()=>{ const [y,m]=state.calendarMonth.split("-").map(Number); const dt=new Date(y,m,1); state.calendarMonth=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; renderCalendar(); });
  $("exercise")?.addEventListener("change",e=>{ state.selectedExercise=e.target.value; state.selectedAlt=null; status("เลือกท่า: "+state.selectedExercise,"ok",900); renderAll(); });
  $("saveBtn")?.addEventListener("click",saveSet); $("resetBtn")?.addEventListener("click",resetForm);
  $("altBtn")?.addEventListener("click",openAltModal); $("closeAlt")?.addEventListener("click",()=>$("altModal")?.classList.remove("show"));
  $("clearAltBtn")?.addEventListener("click",()=>{ state.selectedAlt=null; renderAll(); });
  $("imageBtn")?.addEventListener("click",()=>window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(actualExerciseName()+" proper form")}`,"_blank"));
  $("videoBtn")?.addEventListener("click",()=>window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(actualExerciseName()+" proper form")}`,"_blank"));
  $("startRest")?.addEventListener("click",startTimer); $("stopRest")?.addEventListener("click",stopTimer); $("add30")?.addEventListener("click",()=>{state.timerLeft+=30; renderTimer();});
  $("exportJsonBtn")?.addEventListener("click",exportJson); $("v5ExportJsonBtn")?.addEventListener("click",exportJson); $("exportCsvBtn")?.addEventListener("click",exportCsv); $("v5ExportCsvBtn")?.addEventListener("click",exportCsv);
}
function openAltModal(){ const host=$("altList"); if(!host) return; const list=ALT[state.selectedExercise]||[]; host.innerHTML=list.map(name=>`<button class="secondary alt-choice" data-name="${name}" type="button">${name}</button>`).join(" ") || "ไม่มีท่าแทน"; host.querySelectorAll(".alt-choice").forEach(b=>b.addEventListener("click",()=>{ state.selectedAlt={name:b.dataset.name, original:state.selectedExercise}; $("altModal")?.classList.remove("show"); renderAll(); status("ใช้ท่าแทน: "+b.dataset.name,"ok"); })); $("altModal")?.classList.add("show"); }
function startTimer(){ stopTimer(); state.timerLeft=Number($("restSec")?.value||75); renderTimer(); state.timerId=setInterval(()=>{ state.timerLeft=Math.max(0,state.timerLeft-1); renderTimer(); if(state.timerLeft<=0) stopTimer(); },1000); }
function stopTimer(){ if(state.timerId) clearInterval(state.timerId); state.timerId=null; }
function renderTimer(){ const m=String(Math.floor(state.timerLeft/60)).padStart(2,"0"), s=String(state.timerLeft%60).padStart(2,"0"); setText("timer",`${m}:${s}`); }
function exportJson(){ const data=JSON.stringify({version:VERSION, exportedAt:new Date().toISOString(), logs:state.logs},null,2); download("workout-pro-backup.json",data,"application/json"); status("Export JSON แล้ว","ok"); }
function exportCsv(){ const cols=["date","week","day","plannedExercise","exercise","weightKg","reps","rir","note"]; const csv=[cols.join(","),...state.logs.map(x=>cols.map(c=>`"${String(x[c]??"").replaceAll('"','""')}"`).join(","))].join("\n"); download("workout-pro-log.csv",csv,"text/csv"); status("Export CSV แล้ว","ok"); }
function download(name,text,type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }

onAuthStateChanged(auth,u=>{ state.user=u; if(u && !state.teamId) state.teamId="Beer-Team"; subscribeLogs(); renderAll(); });

window.addEventListener("DOMContentLoaded",()=>{
  bind(); setVal("teamId",state.teamId); setVal("date",state.selectedDate); renderAll(); status("Workout PRO v5.4.5 พร้อมใช้งาน","ok",2500);
});
