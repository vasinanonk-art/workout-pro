
/* ===== v5.2.6 LOCAL_DATE_FIX ===== */
function bangkokDateKey(d=new Date()){
  // Canonical date key for all workout/day-lock logic.
  // Do not use toISOString().split("T")[0] because it is UTC and can shift date.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d instanceof Date ? d : new Date(d));
}
function localDateKeyV521(d){
  return bangkokDateKey(d instanceof Date ? d : new Date());
}
function todayLocalV521(){
  return bangkokDateKey(new Date());
}
function displayDateTH(key){
  const m = String(key||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return String(key||"-");
  return `${Number(m[3])}/${Number(m[2])}/${String(Number(m[1])+543).slice(-2)}`;
}

// ===== script =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===== v5.2.6 Date Input Sanity Fix ===== */
function setTextSafe(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}
function setHtmlSafe(id, value){
  const el = document.getElementById(id);
  if(el) el.innerHTML = value;
}
function setClassSafe(id, value){
  const el = document.getElementById(id);
  if(el) el.className = value;
}
function setValueSafe(id, value){
  const el = document.getElementById(id);
  if(el) el.value = value;
}
function setDisabledSafe(id, value){
  const el = document.getElementById(id);
  if(el) el.disabled = value;
}
function getElSafe(id){
  return document.getElementById(id);
}
function valueSafe(id, fallback=""){
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}

const VERSION="v5.3.22", $=id=>document.getElementById(id), firebaseConfig={"apiKey": "AIzaSyAcnErrLVmmBKJRLHm_ZOySkZKauGqcgfI", "authDomain": "workout-program-9eea7.firebaseapp.com", "projectId": "workout-program-9eea7", "storageBucket": "workout-program-9eea7.firebasestorage.app", "messagingSenderId": "315102427876", "appId": "1:315102427876:web:d2d5d4c89eb78fae960af1", "measurementId": "G-JHEKDYEY8B"};

/* ===== v5.2.6 Date Input Sanity Fix ===== */
function safeKeyPart(v){
  return String(v || "default").trim().replace(/[^\w\-@.]/g, "_").slice(0,80) || "default";
}
function activeTeamLabel(){
  return safeKeyPart(teamId || "Default-Team");
}
function activeUserKey(){
  try{
    if(user && user.uid) return "user_" + safeKeyPart(user.uid);
  }catch(e){}
  return "guest_" + activeTeamLabel();
}
function scopedWorkoutsCollection(){
  // New isolated path: users with the same Team ID no longer share logs.
  return "teams/" + activeTeamLabel() + "/users/" + activeUserKey() + "/workouts";
}
function legacySharedWorkoutsCollection(){
  // Old shared path kept only as a reference. Do not write here.
  return "teams/" + activeTeamLabel() + "/workouts";
}

const PROGRAM=[
["Day 1","Push","Barbell Bench Press",4,"5-8","Chest","heavy"],["Day 1","Push","Incline Dumbbell Press",3,"8-12","Chest","standard"],["Day 1","Push","Seated Shoulder Press",3,"8-12","Shoulder","standard"],["Day 1","Push","Dumbbell Lateral Raise",4,"12-15","Shoulder","quick"],["Day 1","Push","Cable Triceps Pushdown",3,"10-15","Triceps","quick"],
["Day 2","Pull","Lat Pulldown",4,"8-12","Back","standard"],["Day 2","Pull","Barbell Row",4,"6-10","Back","heavy"],["Day 2","Pull","Seated Cable Row",3,"10-12","Back","standard"],["Day 2","Pull","Face Pull",3,"12-15","Rear Delt","quick"],["Day 2","Pull","Dumbbell Curl",3,"10-15","Biceps","quick"],
["Day 4","Upper","Incline Machine Press",3,"10-12","Chest","standard"],["Day 4","Upper","Chest Supported Row",3,"10-12","Back","standard"],["Day 4","Upper","Machine Shoulder Press",3,"10-12","Shoulder","standard"],["Day 4","Upper","Cable Fly",3,"12-15","Chest","quick"],["Day 4","Upper","Hammer Curl",3,"10-15","Biceps","quick"],["Day 4","Upper","Overhead Triceps Extension",3,"10-15","Triceps","quick"],
["Day 5","Leg","Back Squat",4,"5-8","Legs","heavy"],["Day 5","Leg","Romanian Deadlift",4,"6-10","Hamstrings","heavy"],["Day 5","Leg","Leg Press",3,"10-15","Quads","standard"],["Day 5","Leg","Walking Lunge",3,"10/side","Legs","standard"],["Day 5","Leg","Lying Leg Curl",3,"12-15","Hamstrings","quick"],["Day 5","Leg","Standing Calf Raise",4,"12-20","Calves","quick"]];
const DAY_ORDER=["Day 1","Day 2","Day 4","Day 5"], REST={quick:45,standard:75,heavy:105};

function localDateKey(d=new Date()){
  return bangkokDateKey(d instanceof Date ? d : new Date(d));
}

const ALT={
"Barbell Bench Press":[["Dumbbell Bench Press","Horizontal Push","dumbbell bench press proper form","Dumbbell","Chest"],["Machine Chest Press","Horizontal Push","machine chest press proper form","Machine","Stable"],["Smith Machine Bench Press","Horizontal Push","smith machine bench press proper form","Smith","Stable"],["Push-up","Horizontal Push","push up proper form chest","Bodyweight","No equipment"]],
"Incline Dumbbell Press":[["Incline Machine Press","Incline Push","incline machine chest press proper form","Machine","Upper chest"],["Smith Machine Incline Press","Incline Push","smith machine incline press proper form","Smith","Stable"],["Incline Barbell Press","Incline Push","incline barbell bench press proper form","Barbell","Upper chest"],["Low-to-High Cable Fly","Upper Chest Fly","low to high cable fly proper form","Cable","Isolation"]],
"Seated Shoulder Press":[["Machine Shoulder Press","Vertical Push","machine shoulder press proper form","Machine","Stable"],["Dumbbell Shoulder Press","Vertical Push","seated dumbbell shoulder press proper form","Dumbbell","Shoulder"],["Smith Machine Shoulder Press","Vertical Push","smith machine shoulder press proper form","Smith","Stable"],["Landmine Press","Angled Push","landmine press proper form","Barbell","Shoulder friendly"]],
"Dumbbell Lateral Raise":[["Cable Lateral Raise","Shoulder Abduction","cable lateral raise proper form","Cable","Constant tension"],["Machine Lateral Raise","Shoulder Abduction","machine lateral raise proper form","Machine","Stable"],["Seated Lateral Raise","Shoulder Abduction","seated dumbbell lateral raise proper form","Dumbbell","Less cheating"]],
"Cable Triceps Pushdown":[["Rope Triceps Pushdown","Elbow Extension","rope triceps pushdown proper form","Cable","Triceps"],["Straight Bar Pushdown","Elbow Extension","straight bar triceps pushdown proper form","Cable","Triceps"],["Skull Crusher","Elbow Extension","dumbbell skull crusher proper form","Dumbbell","Triceps"],["Close-grip Push-up","Elbow Extension","close grip push up proper form triceps","Bodyweight","No machine"],["Machine Triceps Extension","Elbow Extension","machine triceps extension proper form","Machine","Stable"]],
"Lat Pulldown":[["Pull-up","Vertical Pull","pull up proper form back","Bodyweight","Hard"],["Assisted Pull-up","Vertical Pull","assisted pull up machine proper form","Machine","Beginner"],["Band Pulldown","Vertical Pull","resistance band lat pulldown proper form","Band","No machine"],["Single-arm Cable Pulldown","Vertical Pull","single arm cable lat pulldown proper form","Cable","Lat focus"]],
"Barbell Row":[["Dumbbell Row","Horizontal Pull","one arm dumbbell row proper form","Dumbbell","Back"],["Chest Supported Row","Horizontal Pull","chest supported row proper form","Machine/Dumbbell","Back safe"],["Seated Cable Row","Horizontal Pull","seated cable row proper form","Cable","Stable"],["Machine Row","Horizontal Pull","machine row proper form","Machine","Stable"],["T-Bar Row","Horizontal Pull","t bar row proper form","Machine/Barbell","Heavy"]],
"Seated Cable Row":[["Machine Row","Horizontal Pull","machine row proper form","Machine","Stable"],["Chest Supported Dumbbell Row","Horizontal Pull","chest supported dumbbell row proper form","Dumbbell","Back safe"],["Barbell Row","Horizontal Pull","barbell row proper form","Barbell","Heavy"],["Resistance Band Row","Horizontal Pull","resistance band row proper form","Band","No machine"]],
"Face Pull":[["Reverse Pec Deck","Rear Delt","reverse pec deck proper form","Machine","Rear delt"],["Band Face Pull","Rear Delt","band face pull proper form","Band","No machine"],["Bent-over Rear Delt Raise","Rear Delt","bent over rear delt raise proper form","Dumbbell","Rear delt"],["Cable Rear Delt Fly","Rear Delt","cable rear delt fly proper form","Cable","Rear delt"]],
"Dumbbell Curl":[["Cable Curl","Elbow Flexion","cable biceps curl proper form","Cable","Biceps"],["EZ Bar Curl","Elbow Flexion","ez bar curl proper form","Bar","Biceps"],["Machine Preacher Curl","Elbow Flexion","machine preacher curl proper form","Machine","Stable"],["Incline Dumbbell Curl","Elbow Flexion","incline dumbbell curl proper form","Dumbbell","Biceps"]],
"Incline Machine Press":[["Incline Dumbbell Press","Incline Push","incline dumbbell press proper form","Dumbbell","Upper chest"],["Smith Machine Incline Press","Incline Push","smith machine incline press proper form","Smith","Stable"],["Feet Elevated Push-up","Incline Push","feet elevated push up proper form","Bodyweight","No machine"]],
"Chest Supported Row":[["Seated Cable Row","Horizontal Pull","seated cable row proper form","Cable","Stable"],["Machine Row","Horizontal Pull","machine row proper form","Machine","Stable"],["One-arm Dumbbell Row","Horizontal Pull","one arm dumbbell row proper form","Dumbbell","Back"]],
"Machine Shoulder Press":[["Seated Dumbbell Shoulder Press","Vertical Push","seated dumbbell shoulder press proper form","Dumbbell","Shoulder"],["Smith Machine Shoulder Press","Vertical Push","smith machine shoulder press proper form","Smith","Stable"],["Landmine Press","Angled Push","landmine press proper form","Barbell","Shoulder friendly"]],
"Cable Fly":[["Pec Deck","Chest Fly","pec deck machine proper form","Machine","Stable"],["Dumbbell Fly","Chest Fly","dumbbell fly proper form","Dumbbell","Chest"],["Machine Chest Fly","Chest Fly","machine chest fly proper form","Machine","Stable"],["Push-up Slow Tempo","Horizontal Push","slow tempo push up proper form","Bodyweight","No machine"]],
"Hammer Curl":[["Rope Hammer Curl","Neutral Curl","rope hammer curl cable proper form","Cable","Brachialis"],["Cross-body Hammer Curl","Neutral Curl","cross body hammer curl proper form","Dumbbell","Brachialis"],["EZ Bar Reverse Curl","Forearm/Brachialis","ez bar reverse curl proper form","Bar","Forearm"]],
"Overhead Triceps Extension":[["Cable Overhead Extension","Long Head Triceps","cable overhead triceps extension proper form","Cable","Triceps"],["Dumbbell Overhead Extension","Long Head Triceps","dumbbell overhead triceps extension proper form","Dumbbell","Triceps"],["Skull Crusher","Elbow Extension","skull crusher proper form","Bar/Dumbbell","Triceps"]],
"Back Squat":[["Leg Press","Knee Dominant","leg press proper form feet position","Machine","Foot safer"],["Hack Squat","Knee Dominant","hack squat machine proper form","Machine","Stable"],["V-Squat Machine","Knee Dominant","v squat machine proper form","Machine","Stable"],["Pendulum Squat","Knee Dominant","pendulum squat machine proper form","Machine","Quad focus"],["Smith Machine Squat","Knee Dominant","smith machine squat proper form","Smith","Stable"],["Goblet Squat","Knee Dominant","goblet squat proper form","Dumbbell","Beginner"],["Leg Extension","Quad Isolation","leg extension machine proper form","Machine","Foot safe / Quad"]],
"Romanian Deadlift":[["Dumbbell Romanian Deadlift","Hip Hinge","dumbbell romanian deadlift proper form","Dumbbell","Hamstrings"],["Smith Machine RDL","Hip Hinge","smith machine romanian deadlift proper form","Smith","Stable"],["Good Morning","Hip Hinge","good morning exercise proper form","Barbell","Light"],["Seated Leg Curl","Knee Flexion","seated leg curl proper form","Machine","Hamstrings"],["Lying Leg Curl","Knee Flexion","lying leg curl proper form","Machine","Hamstrings"],["Standing Leg Curl","Knee Flexion","standing leg curl machine proper form","Machine","Hamstrings"],["Glute Ham Raise","Knee Flexion / Hip Extension","glute ham raise proper form","Machine","Hamstrings"]],
"Leg Press":[["Hack Squat","Knee Dominant","hack squat machine proper form","Machine","Stable"],["V-Squat Machine","Knee Dominant","v squat machine proper form","Machine","Stable"],["Pendulum Squat","Knee Dominant","pendulum squat machine proper form","Machine","Quad focus"],["Back Squat","Knee Dominant","barbell back squat proper form","Barbell","Heavy"],["Goblet Squat","Knee Dominant","goblet squat proper form","Dumbbell","Beginner"],["Smith Machine Squat","Knee Dominant","smith machine squat proper form","Smith","Stable"],["Leg Extension","Quad Isolation","leg extension machine proper form","Machine","Foot safe / Quad"]],
"Walking Lunge":[["Leg Extension","Quad Isolation","leg extension machine proper form","Machine","Foot injury friendly"],["Seated Leg Curl","Knee Flexion","seated leg curl proper form","Machine","Hamstring add-on / stable"],["Lying Leg Curl","Knee Flexion","lying leg curl proper form","Machine","Hamstring add-on / stable"],["Leg Press","Knee Dominant","leg press proper form","Machine","Stable foot"],["Hack Squat","Knee Dominant","hack squat machine proper form","Machine","Stable"],["V-Squat Machine","Knee Dominant","v squat machine proper form","Machine","Stable"],["Bulgarian Split Squat","Single-leg","bulgarian split squat proper form","Dumbbell/Smith","No walking"],["Reverse Lunge","Single-leg","reverse lunge proper form","Dumbbell","Less impact"],["Static Lunge","Single-leg","static lunge proper form","Dumbbell","No walking"],["Smith Split Squat","Single-leg","smith machine split squat proper form","Smith","Stable"],["Step-up","Single-leg","step up exercise proper form","Box/Dumbbell","Use caution foot"],["Goblet Squat","Knee Dominant","goblet squat proper form","Dumbbell","Simple"],["Sissy Squat Machine","Quad Dominant","sissy squat machine proper form","Machine","Quad focus"]],
"Lying Leg Curl":[["Seated Leg Curl","Knee Flexion","seated leg curl proper form","Machine","Hamstrings"],["Standing Leg Curl","Knee Flexion","standing leg curl machine proper form","Machine","Hamstrings"],["Prone Leg Curl","Knee Flexion","prone leg curl machine proper form","Machine","Hamstrings"],["Swiss Ball Leg Curl","Knee Flexion","swiss ball leg curl proper form","Ball","No machine"],["Assisted Nordic Curl","Knee Flexion","assisted nordic hamstring curl proper form","Bodyweight","Hard"],["Glute Ham Raise","Knee Flexion / Hip Extension","glute ham raise proper form","Machine","Hamstrings"]],
"Standing Calf Raise":[["Seated Calf Raise","Calf","seated calf raise proper form","Machine","Calf"],["Leg Press Calf Raise","Calf","leg press calf raise proper form","Machine","Stable"],["Single-leg Dumbbell Calf Raise","Calf","single leg dumbbell calf raise proper form","Dumbbell","Calf"],["Smith Machine Calf Raise","Calf","smith machine calf raise proper form","Smith","Stable"]]
};

const MEDIA_DB={
"Barbell Bench Press":{query:"barbell bench press proper form",cue:"สะบักหุบ-กดลง เท้าดันพื้น บาร์ลงกลางอก คุมศอก ไม่ยกไหล่"},
"Incline Dumbbell Press":{query:"incline dumbbell press proper form",cue:"ม้านั่ง 20-35 องศา คุมดัมเบลลงช้า ไม่ยกไหล่ขึ้น"},
"Seated Shoulder Press":{query:"seated shoulder press proper form",cue:"หลังพิงแน่น ไม่แอ่นหลัง กดขึ้นแนวไหล่ที่ไม่เจ็บ"},
"Dumbbell Lateral Raise":{query:"dumbbell lateral raise proper form",cue:"ยกออกด้านข้าง คุมข้อมือ ไม่เหวี่ยง ไม่ยักไหล่"},
"Cable Triceps Pushdown":{query:"cable triceps pushdown proper form",cue:"ศอกชิดลำตัว กดลงจนศอกเหยียด คุมกลับช้า"},
"Lat Pulldown":{query:"lat pulldown proper form",cue:"ดึงศอกลงเข้าลำตัว อกเปิด ไม่เอนหลังเยอะ"},
"Barbell Row":{query:"barbell row proper form",cue:"หลังนิ่ง สะโพกพับ ดึงศอกไปด้านหลัง ไม่กระชาก"},
"Seated Cable Row":{query:"seated cable row proper form",cue:"อกเปิด ดึงศอกถอยหลัง หยุดสั้นตอนบีบหลัง"},
"Face Pull":{query:"face pull proper form rear delt",cue:"ดึงเชือกเข้าระดับหน้า ศอกสูง หมุนไหล่ออก"},
"Dumbbell Curl":{query:"dumbbell biceps curl proper form",cue:"ศอกนิ่ง ไม่เหวี่ยง คุมช่วงลง"},
"Cable Fly":{query:"cable chest fly proper form",cue:"ศอกงอเล็กน้อย กวาดแขนเข้าหากัน คุมอก ไม่เหวี่ยง"},
"Pec Deck":{query:"pec deck machine proper form",cue:"อกเปิด แขนกวาดเข้าหากัน คุมไหล่"},
"Back Squat":{query:"barbell back squat proper form",cue:"แกนกลางแน่น เข่าไปทิศเดียวกับปลายเท้า คุม depth เท่าที่ปลอดภัย"},
"Romanian Deadlift":{query:"romanian deadlift proper form",cue:"สะโพกพับ หลังตรง บาร์ใกล้ขา รู้สึก hamstring ยืด"},
"Leg Press":{query:"leg press proper form feet position",cue:"หลังติดเบาะ เท้าวางมั่นคง ไม่ล็อกเข่า คุมลงช้า"},
"Walking Lunge":{query:"walking lunge proper form",cue:"ก้าวพอดี เข่าตามปลายเท้า ลำตัวนิ่ง ถ้าเจ็บเท้าให้เปลี่ยนท่า"},
"Leg Extension":{query:"leg extension machine proper form",cue:"ตั้งแกนเข่าตรงเครื่อง เหยียดเข่า คุมลงช้า ไม่ดีด"},
"Lying Leg Curl":{query:"lying leg curl proper form",cue:"สะโพกติดเบาะ งอเข่าเต็มช่วง คุม eccentric"},
"Seated Leg Curl":{query:"seated leg curl proper form",cue:"ตั้งแกนเข่าตรงเครื่อง กดงอเข่า คุมกลับ"},
"Standing Leg Curl":{query:"standing leg curl machine proper form",cue:"สะโพกนิ่ง งอเข่าด้วย hamstring"},
"Hack Squat":{query:"hack squat machine proper form",cue:"หลังติดเบาะ เข่าไปตามปลายเท้า คุมลงช้า"},
"V-Squat Machine":{query:"v squat machine proper form",cue:"คุมเข่าและหลัง ใช้ ROM ที่ไม่เจ็บ"},
"Pendulum Squat":{query:"pendulum squat machine proper form",cue:"คุมลงลึกเท่าที่ปลอดภัย ดันผ่านกลางเท้า"},
"Bulgarian Split Squat":{query:"bulgarian split squat proper form",cue:"เท้าหน้านิ่ง ลำตัวคุม ไม่ก้าวเดิน เหมาะกว่า walking lunge ถ้าเท้าเจ็บ"},
"Reverse Lunge":{query:"reverse lunge proper form",cue:"ก้าวถอยหลัง คุมแรงกระแทกต่ำกว่า walking lunge"},
"Static Lunge":{query:"static lunge proper form",cue:"ยืนตำแหน่งเดิม ขึ้นลง ไม่ต้องเดิน"},
"Smith Split Squat":{query:"smith machine split squat proper form",cue:"ใช้ Smith ช่วย balance ลดความเสี่ยงเท้า"},
"Step-up":{query:"step up exercise proper form",cue:"ใช้กล่องเตี้ย คุมเข่า ระวังถ้าเท้าเจ็บ"},
"Standing Calf Raise":{query:"standing calf raise proper form",cue:"ขึ้นสุด-ลงสุด คุมจังหวะ ไม่เด้งเร็ว"},
"Seated Calf Raise":{query:"seated calf raise proper form",cue:"คุมเต็มช่วง บีบบนสุด"},
"Leg Press Calf Raise":{query:"leg press calf raise proper form",cue:"ใช้ปลายเท้าดัน ไม่ล็อกเข่า"},
"Machine Chest Press":{query:"machine chest press proper form",cue:"หลังติดเบาะ ดันด้วยอก ไม่ยกไหล่"},
"Machine Row":{query:"machine row proper form",cue:"ตั้งอกชิดเบาะ ดึงด้วยหลัง"},
"Machine Shoulder Press":{query:"machine shoulder press proper form",cue:"ปรับเบาะให้จับระดับคาง กดขึ้นโดยไม่ล็อกข้อศอกแรง"},
"Machine Lateral Raise":{query:"machine lateral raise proper form",cue:"ศอกนำมือ ยกโดยไม่ยักไหล่"}
};
function getMediaForExercise(ex){const fallback={query:(ex||"exercise")+" proper form",cue:"ตรวจ form ให้ตรงกับท่า คุม ROM และไม่ฝืนจุดเจ็บ"};return ex&&MEDIA_DB[ex]?MEDIA_DB[ex]:fallback;}
function currentMediaExercise(){
  const m=meta&&meta();
  const planned=m&&m[2];
  if(selectedAlt && selectedAlt.name && (!selectedAlt.original || selectedAlt.original===planned)) return selectedAlt.name;
  if(m){
    const auto = typeof autoApplyPersistentAlternative==="function" ? autoApplyPersistentAlternative() : null;
    if(auto && auto.name) return auto.name;
    if(typeof getPersistentAlt==="function"){
      const pref=getPersistentAlt(planned);
      if(pref&&pref.name) return pref.name;
    }
    const mem=(typeof altMemoryForPlanned==="function")?altMemoryForPlanned(planned):null;
    if(mem&&mem.name) return mem.name;
    return planned;
  }
  return $("exercise") ? $("exercise").value : "";
}
function mediaQueryForCurrent(){const ex=currentMediaExercise();const media=getMediaForExercise(ex);return media.query||(ex+" proper form");}
function renderMediaPanel(){if(!$("mediaPanel"))return;const ex=currentMediaExercise();const media=getMediaForExercise(ex);$("mediaTitle").textContent="Media Reference: "+ex;$("mediaCue").innerHTML=`Cue: ${media.cue}<br><span class="small">Search: ${media.query}</span>`;}
function openCurrentMedia(kind){openSearch(kind,mediaQueryForCurrent());}

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let user=null, teamId=localStorage.getItem("teamId")||"", unsub=null, logs=[], currentSet=1, calDate=new Date(), selectedDate=localDateKey(), timer=null, selectedAlt=null;
let isSaving = false;
$("teamId").value=teamId;selectedDate=localDateKey();$("date").value=selectedDate;PROGRAM.forEach(p=>{let o=document.createElement("option");o.value=p[2];o.textContent=`${p[0]} - ${p[2]}`;$("exercise").appendChild(o)});
const meta=()=>PROGRAM.find(p=>p[2]===$("exercise").value), target=ex=>{let p=PROGRAM.find(p=>p[2]===ex);return p?+p[3]:1}, planned=x=>x.plannedExercise||x.exercise;
function toKg(v,u){return u==="lb"?v/2.2046:v} function fromKg(v,u){return u==="lb"?(+v*2.2046||0).toFixed(1):(+v||0).toFixed(1)}
function today(){return localDateKey()} function parseD(s){let [y,m,d]=String(s).split("-").map(Number);return new Date(y,m-1,d)} function keyD(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")} function addDays(d,n){let x=new Date(d);x.setDate(x.getDate()+n);return x}
function diffDate(s){let a=parseD(today()),b=parseD(s);a.setHours(0,0,0,0);b.setHours(0,0,0,0);return Math.round((a-b)/86400000)}
function normalizedLogs(){return [...logs].sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(+a.createdAt?.seconds||0)-(+b.createdAt?.seconds||0))}
function countIn(c,ex){return c.filter(x=>planned(x)===ex).length} function dayComplete(c,d){if(!c||!c.length)return false;return PROGRAM.filter(p=>p[0]===d).every(p=>countIn(c,p[2])>=target(p[2]))} function cycleComplete(c){if(!c||!c.length)return false;return DAY_ORDER.every(d=>dayComplete(c,d))}
function cycles(){let cs=[[]];for(let x of normalizedLogs()){if(cycleComplete(cs[cs.length-1]))cs.push([]);cs[cs.length-1].push(x)}return cs} 
function completedCycleCount(){
  return cycles().filter(c=>cycleComplete(c)).length;
}
function lastCompletedCycle(){
  const done=cycles().filter(c=>cycleComplete(c));
  return done.length?done[done.length-1]:[];
}
function currentActiveCycle(){
  const cs=cycles();
  const last=cs[cs.length-1]||[];
  if(cycleComplete(last)) return [];
  return last;
}

function activeCycle(){return currentActiveCycle()}
function latestDay(c,d){let a=c.filter(x=>x.day===d&&x.date).map(x=>x.date).sort();return a[a.length-1]||null} function restCount(c,sel){let d4=latestDay(c,"Day 4");if(!d4)return 0;let w=new Set(c.map(x=>x.date)),d=addDays(parseD(d4),1),s=parseD(sel),n=0;while(d<s){if(!w.has(keyD(d)))n++;d=addDays(d,1)}return n}
function canNext(c,sel){let d5=latestDay(c,"Day 5");return cycleComplete(c)&&d5&&parseD(sel)>parseD(d5)&&restCount(c,sel)>=2} function earliestNext(c){let d5=latestDay(c,"Day 5");if(!d5)return "-";for(let i=1;i<14;i++){let k=keyD(addDays(parseD(d5),i));if(canNext(c,k))return k}return "-"}
function autoWeek(){
  const active=activeCycle();
  if(active.length>0) return completedCycleCount()+1;
  const lastDone=lastCompletedCycle();
  if(lastDone.length && !canNext(lastDone,$("date").value)) return Math.max(1,completedCycleCount());
  return completedCycleCount()+1;
} 
function addDaysKey(dateStr, days){
  return keyD(addDays(parseD(dateStr), days));
}
function latestLogDateForDayInActiveCycle(dayName){
  const arr=activeCycle().filter(x=>x.day===dayName && x.date).map(x=>x.date).sort();
  return arr.length?arr[arr.length-1]:null;
}
function selectedDateKey(){
  return $("date") ? $("date").value : today();
}
function calendarUnlockInfoForNextDay(nextDay){
  const sel=selectedDateKey();
  const c=activeCycle();

  if(nextDay==="Day 1"){
    const lastDone=lastCompletedCycle();
    if(!lastDone.length) return {allowed:true, message:"เริ่ม Day 1 ได้"};
    if(canNext(lastDone, sel)) return {allowed:true, message:"พักครบแล้ว เริ่ม Day 1 รอบใหม่ได้"};
    return {allowed:false, message:`ยังพักไม่ครบหลัง Day 5 / เริ่มได้เร็วสุด ${earliestNext(lastDone)}`};
  }

  if(nextDay==="Day 2"){
    const d1=latestLogDateForDayInActiveCycle("Day 1");
    if(!d1) return {allowed:true, message:"ยังไม่มี Day 1 ใน cycle นี้"};
    const earliest=addDaysKey(d1,1);
    return sel>=earliest
      ? {allowed:true, message:"ผ่านวันถัดไปแล้ว เล่น Day 2 ได้"}
      : {allowed:false, message:`Day 2 ต้องเริ่มวันถัดไปหลัง Day 1: เริ่มได้เร็วสุด ${earliest}`};
  }

  if(nextDay==="Day 4"){
    const d2=latestLogDateForDayInActiveCycle("Day 2");
    if(!d2) return {allowed:true, message:"ยังไม่มี Day 2 ใน cycle นี้"};
    const earliest=addDaysKey(d2,2);
    return sel>=earliest
      ? {allowed:true, message:"ผ่าน Day 3 Rest แล้ว เล่น Day 4 ได้"}
      : {allowed:false, message:`หลัง Day 2 ต้องพัก Day 3 จำนวน 1 วัน: เริ่ม Day 4 ได้เร็วสุด ${earliest}`};
  }

  if(nextDay==="Day 5"){
    const d4=latestLogDateForDayInActiveCycle("Day 4");
    if(!d4) return {allowed:true, message:"ยังไม่มี Day 4 ใน cycle นี้"};
    const earliest=addDaysKey(d4,1);
    return sel>=earliest
      ? {allowed:true, message:"ผ่านวันถัดไปแล้ว เล่น Day 5 ได้"}
      : {allowed:false, message:`Day 5 ต้องเริ่มหลัง Day 4 อย่างน้อย 1 วัน: เริ่มได้เร็วสุด ${earliest}`};
  }

  return {allowed:true, message:"OK"};
}
function nextIncompleteDayRaw(){
  const c=activeCycle();
  if(!c.length){
    const lastDone=lastCompletedCycle();
    if(lastDone.length && !canNext(lastDone, selectedDateKey())) return "REST_LOCK";
    return "Day 1";
  }
  for(const d of DAY_ORDER) if(!dayComplete(c,d)) return d;
  return "COMPLETE";
}

function activeDay(){
  const raw=nextIncompleteDayRaw();
  if(raw==="REST_LOCK"||raw==="COMPLETE") return raw;
  const info=calendarUnlockInfoForNextDay(raw);
  return info.allowed ? raw : "DAY_DATE_LOCK";
} function countActive(ex){return countIn(activeCycle(),ex)}
function nextState(){
  let d=activeDay();
  if(d==="REST_LOCK"){
    const rc=lastCompletedCycle();
    return {restLock:true,week:autoWeek(),rest:restCount(rc,$("date").value),earliest:earliestNext(rc)};
  }
  if(d==="DAY_DATE_LOCK"){
    const raw=nextIncompleteDayRaw();
    const info=calendarUnlockInfoForNextDay(raw);
    return {dateLock:true,day:raw,week:autoWeek(),message:info.message};
  }
  if(d==="COMPLETE") return {complete:true,day:d,week:autoWeek()};
  for(let p of PROGRAM.filter(p=>p[0]===d)){
    let done=countActive(p[2]),t=target(p[2]);
    if(done<t) return {day:d,exercise:p[2],done,target:t,next:done+1,remain:t-done,week:autoWeek()};
  }
  return {complete:true,day:d,week:autoWeek()};
}

function updateDateStatus(){let d=diffDate($("date").value),el=$("dateStatus");el.className="msg "+(d===0?"ok":(d>0&&d<=3?"warn":"err"));el.textContent=d===0?"🟢 วันนี้":(d>0&&d<=3?`🟡 ย้อนหลัง ${d} วัน`:(d<0?"🔴 ห้ามลงล่วงหน้า":"🔴 ย้อนหลังเกิน 3 วัน"))}
function validateDate(){let d=diffDate($("date").value);if(d<0){alert("ห้ามบันทึกล่วงหน้า");$("date").value=today();bindAiCoachButtons();
calSyncDateToToday(false);
calSyncBind();
calSyncUpdateStatus();
updateDateStatus();return false}if(d>3){alert("ย้อนหลังได้ไม่เกิน 3 วัน");$("date").value=today();updateDateStatus();return false}return d>0?confirm(`บันทึกย้อนหลัง ${d} วัน?`):true}

function altMemoryForPlanned(plannedEx){
  const cycle = activeCycle();
  const related = cycle
    .filter(x => planned(x) === plannedEx && x.isAlternative && x.exercise && x.exercise !== plannedEx)
    .sort((a,b)=>(a.date||"").localeCompare(b.date||"") || (+a.createdAt?.seconds||0)-(+b.createdAt?.seconds||0));
  if(!related.length) return null;
  const last = related[related.length - 1];
  return {name:last.exercise, pattern:last.alternativePattern||"Alternative", original:plannedEx, query:last.alternativeQuery||((last.exercise||plannedEx)+" proper form exercise")};
}
function activeDisplayExercise(plannedEx){
  return selectedAlt?.name || altMemoryForPlanned(plannedEx)?.name || plannedEx;
}
function updateAltMemoryUI(plannedEx){
  const mem = altMemoryForPlanned(plannedEx);
  if(selectedAlt){
    $("altStatus").innerHTML = `เลือกทดแทน: <b>${selectedAlt.name}</b> แทน ${selectedAlt.original || plannedEx}`;
    return;
  }
  if(mem){
    $("altStatus").innerHTML = `จำท่าทดแทนต่อเนื่อง: <b>${mem.name}</b> แทน ${plannedEx}<br><span class="small">ระบบจะใช้ท่านี้ต่อจนกว่าจะครบ Target Sets ของท่าหลัก</span>`;
  }else{
    $("altStatus").textContent = "ยังไม่ได้เลือกท่าทดแทน";
  }
}
function clearAltMemoryForCurrent(){
  selectedAlt = null;
  const m = meta();
  if(m) $("altStatus").textContent = "ยกเลิกท่าทดแทนแล้ว กลับไปใช้ท่าหลัก: " + m[2];
}


function plannedExercisesForActiveDay(){
  const d=activeDay();
  if(d==="REST_LOCK"||d==="COMPLETE") return [];
  return PROGRAM.filter(p=>p[0]===d).map(p=>p[2]);
}
function exercisePriority(ex){
  const idx = PROGRAM.findIndex(p=>p[2]===ex);
  return idx < 0 ? 999 : idx;
}
function isPriorityExercise(ex){
  return ["Barbell Bench Press","Barbell Row","Back Squat","Romanian Deadlift","Lat Pulldown","Incline Dumbbell Press"].includes(ex);
}
function remainingExercisesForActiveDay(){
  return plannedExercisesForActiveDay().map(ex=>({
    ex,
    done:countActive(ex),
    target:target(ex),
    priority:exercisePriority(ex)
  })).filter(x=>x.done<x.target).sort((a,b)=>a.priority-b.priority);
}
function firstRemainingExercise(){
  const r=remainingExercisesForActiveDay();
  return r.length?r[0]:null;
}
function canSaveCurrentExerciseAdaptive(){
  const m=meta();
  if(!m) return false;
  const ad=activeDay();
  if(ad==="REST_LOCK"||ad==="DAY_DATE_LOCK"||ad==="COMPLETE") return false;
  if(m[0]!==ad) return false;
  return countActive(m[2]) < target(m[2]);
}


function updateDayDateLockDebug(){
  if(!$("dayDateLockDebug")) return;
  const raw=nextIncompleteDayRaw();
  if(raw==="REST_LOCK"){
    const rc=lastCompletedCycle();
    $("dayDateLockDebug").innerHTML=`Day Lock: Rest หลัง Day 5<br>เริ่มรอบใหม่ได้เร็วสุด: <b>${earliestNext(rc)}</b>`;
    return;
  }
  if(raw==="COMPLETE"){
    $("dayDateLockDebug").innerHTML="Day Lock: Cycle นี้ครบแล้ว";
    return;
  }
  const info=calendarUnlockInfoForNextDay(raw);
  $("dayDateLockDebug").innerHTML=`Day Lock Target: <b>${raw}</b><br>${info.allowed?"✅ ปลดล็อกแล้ว":"🔒 "+info.message}`;
}

function updateCycleDebug(){
  if(!$("cycleDebug")) return;
  $("cycleDebug").innerHTML=`Active Cycle Sets: <b>${activeCycle().length}</b><br>Completed Cycles: <b>${completedCycleCount()}</b><br>Current Auto Week: <b>${autoWeek()}</b>`;
}

function updateOrderGuidance(){
  if(!$("orderStatus")) return;
  const m=meta();
  const first=firstRemainingExercise();
  if(!m || !first){
    $("orderStatus").className="msg ok";
    $("orderStatus").innerHTML="วันนี้ไม่มีท่าค้าง หรือครบแล้ว";
    return;
  }
  const cur=m[2];
  if(cur===first.ex){
    $("orderStatus").className="msg ok";
    $("orderStatus").innerHTML=`ลำดับแนะนำ: <b>${cur}</b> เหมาะสม`;
  }else{
    const warn = isPriorityExercise(first.ex) ? "ควรเล่นท่าหลักก่อน ถ้ายังมีแรงและไม่มีเครื่องติด" : "สลับได้ แต่ระบบจะบันทึกท่าค้างไว้";
    $("orderStatus").className="msg warn";
    $("orderStatus").innerHTML=`คุณเลือก <b>${cur}</b><br>ท่าที่แนะนำให้เล่นก่อนคือ <b>${first.ex}</b><br>${warn}<br><span class="small">ระบบไม่ล็อกแล้ว เล่นท่าไหนก่อนก็ได้ใน Day เดียวกัน แต่จะนับเซตค้างรายท่าไว้</span>`;
  }
}
function topSetForExerciseWeek(ex,w){
  const arr=logs.filter(x=>Number(x.week||x.autoWeek||1)===Number(w)&&historyMatchesExercise(x,ex)&&x.weight);
  if(!arr.length) return null;
  return arr.reduce((best,x)=>{
    const bScore=(+best.weight||0)*(+best.reps||0);
    const xScore=(+x.weight||0)*(+x.reps||0);
    if(+x.weight>+best.weight) return x;
    if(+x.weight===+best.weight && xScore>bScore) return x;
    return best;
  },arr[0]);
}
function latestSetForExercise(ex){
  return logs.find(x=>historyMatchesExercise(x,ex)&&x.weight) || null;
}
function progressionRecommendation(ex){
  const wk=autoWeek();
  const unit=$("unit")?.value||"kg";
  const thisW=topSetForExerciseWeek(ex,wk);
  const prevW=topSetForExerciseWeek(ex,wk-1);
  const latest=thisW||latestSetForExercise(ex);
  if(!latest) return {html:`ยังไม่มีประวัติของ ${ex}<br>แนะนำ: เริ่มน้ำหนักที่ทำได้ RIR 1–2`, next:null};
  let base=+latest.weight||0, reps=+latest.reps||0, rir=Number(latest.rir??2);
  let next=base, action="คงน้ำหนักเดิม แล้วเพิ่ม reps ก่อน";
  if(rir>=3 && reps>=8){next=base+2.5;action="เพิ่ม +2.5 kg เพราะยังเหลือแรงมาก";}
  else if(rir>=2 && reps>=10){next=base+2.5;action="เพิ่ม +2.5 kg เพราะ reps ถึงช่วงบนและ RIR ยังดี";}
  else if(rir<=0){next=Math.max(0,base-2.5);action="ลด -2.5 kg หรือคงเดิมแต่ลด reps เพราะ RIR 0";}
  else if(reps<6){next=base;action="คงน้ำหนักเดิม เน้นเพิ่ม reps ให้ถึงช่วงเป้าหมายก่อน";}
  const prevTxt=prevW?`<br>Week ก่อน: ${fromKg(prevW.weight,unit)} ${unit} × ${prevW.reps} reps (RIR ${prevW.rir??"-"})`:"<br>Week ก่อน: ยังไม่มีข้อมูล";
  const curTxt=thisW?`Week นี้: ${fromKg(thisW.weight,unit)} ${unit} × ${thisW.reps} reps (RIR ${thisW.rir??"-"})`:`ล่าสุด: ${fromKg(latest.weight,unit)} ${unit} × ${latest.reps} reps (RIR ${latest.rir??"-"})`;
  return {html:`${curTxt}${prevTxt}<br><b>น้ำหนักแนะนำครั้งถัดไป:</b> ${fromKg(next,unit)} ${unit}<br>${action}`, next};
}
function updateNextWeekRecommendation(){
  if(!$("nextWeekBox")) return;
  const m=meta();
  if(!m){$("nextWeekBox").textContent="ยังไม่ได้เลือกท่า";return;}
  const rec=progressionRecommendation(m[2]);
  $("nextWeekBox").innerHTML=rec.html;
}


function persistentAltKey(plannedEx){
  return "persistent_alt_"+plannedEx;
}
function getPersistentAlt(plannedEx){
  try{
    const raw=localStorage.getItem(persistentAltKey(plannedEx));
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}
function setPersistentAlt(plannedEx,data){
  if(!plannedEx||!data) return;
  localStorage.setItem(persistentAltKey(plannedEx),JSON.stringify(data));
}
function clearPersistentAlt(plannedEx){
  if(!plannedEx) return;
  localStorage.removeItem(persistentAltKey(plannedEx));
}
function updatePersistentAltUI(){
  const m=typeof meta==="function"?meta():null;
  if(!m||!$("persistentSubStatus")) return;
  const pref=getPersistentAlt(m[2]);
  if(pref){
    $("persistentSubStatus").className="msg ok";
    $("persistentSubStatus").innerHTML=`Persistent Alternative: <b>${pref.name}</b> แทน ${m[2]}<br><span class="small">Last Weight: ${pref.lastWeight||"-"} ${$("unit")?$("unit").value:"kg"} • Last Reps: ${pref.lastReps||"-"}</span>`;
  }else{
    $("persistentSubStatus").className="msg info";
    $("persistentSubStatus").textContent="Persistent Alternative: ไม่มี";
  }
}
function bindPersistentAltButtons(){
  if($("savePersistentAltBtn")){
    $("savePersistentAltBtn").onclick=()=>{
      const m=meta&&meta();
      if(!m) return alert("เลือกท่าก่อน");
      if(!(selectedAlt&&selectedAlt.name)) return alert("เลือกท่าทดแทนก่อน");
      const data={
        name:selectedAlt.name,
        pattern:selectedAlt.pattern||"",
        query:selectedAlt.query||"",
        lastWeight:$("weight")?$("weight").value:"",
        lastReps:$("reps")?$("reps").value:"",
        updatedAt:new Date().toISOString()
      };
      setPersistentAlt(m[2],data);
      updatePersistentAltUI();
      alert("จำท่าทดแทนถาวรแล้ว");
    };
  }
  if($("clearPersistentAltBtn")){
    $("clearPersistentAltBtn").onclick=()=>{
      const m=meta&&meta();
      if(!m) return;
      clearPersistentAlt(m[2]);
      updatePersistentAltUI();
      alert("ยกเลิกท่าแทนถาวรแล้ว");
    };
  }
}
function applyPersistentAltIfExists(){
  const m=typeof meta==="function"?meta():null;
  if(!m) return;
  const pref=getPersistentAlt(m[2]);
  if(pref){
    selectedAlt={
      name:pref.name,
      pattern:pref.pattern||"",
      query:pref.query||"",
      original:m[2]
    };
    if($("altStatus")){
      $("altStatus").innerHTML=`เลือกทดแทนถาวร: <b>${pref.name}</b> แทน ${m[2]}<br><span class="small">Last Weight: ${pref.lastWeight||"-"} • Last Reps: ${pref.lastReps||"-"}</span>`;
    }
  }
}


function activeExerciseSetState(ex){
  try{
    const done = countActive(ex);
    const t = target(ex);
    return {done, target:t, next:Math.min(done+1,t), remain:Math.max(0,t-done)};
  }catch(e){
    return {done:0,target:1,next:1,remain:1};
  }
}

function calSyncTodayKey(){return localDateKey()}
function calSyncLastWorkoutLog(){
  return (logs||[]).filter(x=>x.date).sort((a,b)=>(b.date||"").localeCompare(a.date||"") || (+b.createdAt?.seconds||0)-(+a.createdAt?.seconds||0))[0] || null;
}
function calSyncDaysBetween(a,b){
  try{
    const da=parseD(a), db=parseD(b);
    return Math.round((db-da)/86400000);
  }catch(e){return 0;}
}
function calSyncDateToToday(force=false){
  const today=calSyncTodayKey();
  if(!$("date")) return;
  if(force || !$("date").value){
    $("date").value=today;
    selectedDate=today;
  }
}
function calSyncAnalysis(){
  const today=calSyncTodayKey();
  const selected=$("date")?$("date").value:today;
  const last=calSyncLastWorkoutLog();
  const gap=last?calSyncDaysBetween(last.date,today):0;
  const active=typeof activeDay==="function"?activeDay():"-";
  let status="OK";
  let note="วันที่ตรงกับปัจจุบัน";
  if(selected!==today){
    status="DATE_NOT_TODAY";
    note=`วันที่เลือกคือ ${selected} แต่วันนี้คือ ${today}`;
  }else if(last && gap>=4){
    status="MISSED_GAP";
    note=`ห่างจาก workout ล่าสุด ${gap} วัน ควรเริ่มแบบ conservative 1 session`;
  }else if(active==="DAY_DATE_LOCK"){
    status="LOCKED_BY_CALENDAR";
    note="วันนี้ยังถูกล็อกตาม calendar/rest rule";
  }
  return {today,selected,last,gap,active,status,note};
}
function calSyncUpdateStatus(){
  if(!$("calendarSyncStatus")) return;
  const s=calSyncAnalysis();
  const cls=s.status==="OK"?"msg ok":(s.status==="DATE_NOT_TODAY"?"msg warn":"msg info");
  $("calendarSyncStatus").className=cls;
  $("calendarSyncStatus").innerHTML=`Calendar Sync<br>Today: <b>${displayDateTH(s.today)}</b> <span class="small">(${s.today})</span><br>Selected: <b>${displayDateTH(s.selected)}</b> <span class="small">(${s.selected})</span><br>Active Day: <b>${s.active}</b><br>${s.note}`;
}
function calSyncBind(){
  if($("date") && $("date").dataset.calendarSyncBound!=="1"){
    $("date").dataset.calendarSyncBound="1";
    $("date").addEventListener("change",()=>{
      selectedDate=$("date").value;
      if(typeof updateDateStatus==="function") updateDateStatus();
      if(typeof calSyncUpdateStatus==="function") calSyncUpdateStatus();
      if(typeof sync==="function") sync();
    });
  }
}


const EX_SESSION_KEY_PREFIX = "workout_session_state_";
function exSessionKey(ex){
  const team = (typeof teamId!=="undefined" && teamId) ? teamId : "default";
  const date = $("date") ? $("date").value : (typeof calSyncTodayKey==="function" ? calSyncTodayKey() : todayLocalV521());
  return `${EX_SESSION_KEY_PREFIX}${team}_${date}_${ex}`;
}
function exSessionRead(ex){
  try{return JSON.parse(localStorage.getItem(exSessionKey(ex))||"null");}catch(e){return null;}
}
function exSessionWrite(ex,state){
  try{if(ex)localStorage.setItem(exSessionKey(ex),JSON.stringify({exercise:ex,updatedAt:new Date().toISOString(),...state}));}catch(e){}
}

function exDirectCompletedCount(ex){
  try{
    return canonicalSetState(ex).done;
  }catch(e){
    try{return countActive(ex);}catch(_){return 0;}
  }
}
function exDirectLatestSetNo(ex){
  try{
    const s=canonicalSetState(ex);
    return s.done;
  }catch(e){return 0;}
}

function exBuildStateFromLogs(ex){
  const s = canonicalSetState(ex);
  return {done:s.done,target:s.target,next:s.next,complete:s.complete};
}
function exSessionRestore(ex){
  return applyCanonicalSetDisplay(ex);
}
function exSessionSaveCurrent(){
  if($("exercise")) exSessionWrite($("exercise").value, exBuildStateFromLogs($("exercise").value));
}

/* ===== v5.2.6 DEEP_EXERCISE_SWITCH_FIX ===== */
let v526ExerciseChangeTimer = null;
let v526ExerciseHeavyTimer = null;
let v526ExerciseChanging = false;

function v526SetFastExerciseUI(ex){
  try{
    const t = typeof target === "function" ? target(ex) : 3;
    currentSet = 1;
    if($("targetShow")) $("targetShow").textContent = t;
    if($("setNo")) $("setNo").textContent = "1";
    if($("setStatus")){
      $("setStatus").className = "msg info";
      $("setStatus").innerHTML = `เปลี่ยนท่าแล้ว: <b>${ex}</b><br>กำลังโหลดข้อมูลเบื้องหลังแบบเร็ว`;
    }
    if($("prStatus")) $("prStatus").textContent = "กำลังโหลดสถิติ...";
    if($("weekSuggest")) $("weekSuggest").textContent = "กำลังโหลดข้อมูลสัปดาห์ก่อน...";
    if($("nextWeekBox")) $("nextWeekBox").textContent = "กำลังคำนวณน้ำหนักครั้งถัดไป...";
  }catch(e){}
}

function v526ExerciseChangeHandler(){
  const ex = $("exercise") ? $("exercise").value : "";
  if(!ex) return;
  clearTimeout(v526ExerciseChangeTimer);
  clearTimeout(v526ExerciseHeavyTimer);

  v526ExerciseChanging = true;
  try{ document.body.classList.add("v526-exercise-changing"); }catch(_){}

  v526ExerciseChangeTimer = setTimeout(function(){
    try{
      const m = typeof meta === "function" ? meta() : null;
      if(selectedAlt && selectedAlt.original && m && selectedAlt.original !== m[2]) selectedAlt = null;

      v526SetFastExerciseUI(ex);

      // Lightweight updates only. Avoid history / PR / weekly / full panel during the tap.
      try{ if(typeof applyMeta === "function") applyMeta(); }catch(_){}
      try{ if(typeof renderMediaPanel === "function") renderMediaPanel(); }catch(_){}
      try{ if(typeof applyCanonicalSetDisplay === "function") applyCanonicalSetDisplay(ex); }catch(_){}

      // Heavy work is deferred and collapsed into one run.
      v526ExerciseHeavyTimer = setTimeout(function(){
        const runHeavy = function(){
          try{ if(typeof historySummaryForCurrent === "function") historySummaryForCurrent(); }catch(_){}
          try{ if(typeof updatePR === "function") updatePR(); }catch(_){}
          try{ if(typeof updateWeeklySuggestion === "function") updateWeeklySuggestion(); }catch(_){}
          try{ if(typeof updateWeekly === "function") updateWeekly(); }catch(_){}
          try{ if(typeof updateNextWeekRecommendation === "function") updateNextWeekRecommendation(); }catch(_){}
          try{ if(typeof updateAltMemoryUI === "function" && typeof meta === "function" && meta()) updateAltMemoryUI(meta()[2]); }catch(_){}
          try{ if(typeof updateOrderGuidance === "function") updateOrderGuidance(); }catch(_){}
          try{ if(typeof stableRenderDiagnostics === "function") stableRenderDiagnostics(); }catch(_){}
          v526ExerciseChanging = false;
          try{ document.body.classList.remove("v526-exercise-changing"); }catch(_){}
        };
        if(typeof requestIdleCallback === "function"){
          requestIdleCallback(runHeavy, {timeout:1200});
        }else{
          setTimeout(runHeavy, 250);
        }
      }, 450);
    }catch(e){
      console.warn("v526ExerciseChangeHandler", e);
      v526ExerciseChanging = false;
      try{ document.body.classList.remove("v526-exercise-changing"); }catch(_){}
    }
  }, 0);
}

function bindOptimizedExerciseSwitchV526(){
  const el = $("exercise");
  if(!el || el.dataset.v526OptimizedBound === "1") return;
  el.dataset.v526OptimizedBound = "1";
  el.addEventListener("change", v526ExerciseChangeHandler);
}


function exSessionBindDropdown(){
  bindOptimizedExerciseSwitchV526();
}

function exSessionMarkSavedLocal(ex){
  try{
    const prev = exSessionRead(ex)||{};
    const t = target(ex);
    const currentDone = Math.max(prev.done||0, canonicalSetState(ex).done);
    const done = Math.min(currentDone + 1, t);
    exSessionWrite(ex,{done,target:t,next:Math.min(done+1,t),complete:done>=t});
    exSessionRestore(ex);
  }catch(e){}
}

function exSessionAfterSave(ex){
  const s=exBuildStateFromLogs(ex);
  exSessionWrite(ex,s);
  exSessionRestore(ex);
}


function canonicalSetState(ex){
  const t = target(ex);
  let done = 0;
  let maxSetNo = 0;
  try{
    const programRow = PROGRAM.find(p=>p[2]===ex);
    const plannedDay = programRow ? programRow[0] : null;
    const wk = (typeof autoWeek==="function") ? Number(autoWeek()) : null;
    const selected = $("date") ? $("date").value : "";

    const rowsFor = (arr)=>arr.filter(x=>{
      const plannedName=x.plannedExercise||x.exercise;
      const logWeek=Number(x.week||x.autoWeek||1);
      const dayOk = !plannedDay || x.day===plannedDay;
      return plannedName===ex && dayOk && (!wk || logWeek===wk);
    });
    const setMax = (arr)=>Math.max(0,...arr.map(x=>Number(x.setNo||x.setNumber||x.set||0)));

    // 1) Current active cycle is the main source of truth.
    const activeRows = rowsFor((typeof activeCycle==="function") ? activeCycle() : []);
    done = Math.max(done, activeRows.length);
    maxSetNo = Math.max(maxSetNo, setMax(activeRows));

    // 2) Fallback to same current week + same planned day.
    const weekRows = rowsFor(logs||[]);
    done = Math.max(done, weekRows.length);
    maxSetNo = Math.max(maxSetNo, setMax(weekRows));

    // 3) If user selected a date with actual logs, use that date too.
    const dateRows = weekRows.filter(x=>!selected || x.date===selected);
    if(dateRows.length){
      done = Math.max(done, dateRows.length);
      maxSetNo = Math.max(maxSetNo, setMax(dateRows));
    }
  }catch(e){}
  done = Math.max(done, maxSetNo, 0);
  done = Math.min(done, t);
  const next = Math.min(done + 1, t);
  return {exercise:ex, done, target:t, next, complete:done>=t};
}
function applyCanonicalSetDisplay(ex){
  if(!ex) return;
  const s = canonicalSetState(ex);
  currentSet = s.next;

  // Update all possible set title fields, including old UI that did not use setTitle id.
  if($("setTitle")) $("setTitle").textContent = `Set ${s.next} / ${s.target}`;
  document.querySelectorAll("h2,h3,.set-title,.setTitle").forEach(el=>{
    if(/^Set\s+\d+\s*\/\s*\d+/.test((el.textContent||"").trim())){
      el.textContent = `Set ${s.next} / ${s.target}`;
    }
  });

  if($("setStatus")){
    $("setStatus").className = s.complete ? "msg ok" : "msg";
    $("setStatus").innerHTML = s.complete
      ? `ท่านี้ครบแล้ว: <b>${ex}</b> (${s.done}/${s.target})`
      : `พร้อมบันทึก<br><b>${ex}</b>: เล่นไปแล้ว ${s.done}/${s.target} เซต • เซตถัดไปคือ Set ${s.next}`;
  }
  try{
    exSessionWrite(ex,{done:s.done,target:s.target,next:s.next,complete:s.complete});
  }catch(e){}
  return s;
}
function bindCanonicalExerciseSwitch(){
  bindOptimizedExerciseSwitchV526();
}

function stableSetBox(id, cls, htmlText){
  const el=$(id);
  if(!el) return;
  el.className=cls||"msg info";
  el.innerHTML=htmlText;
}
function stableRenderDiagnostics(){
  try{
    const ex=$("exercise")?$("exercise").value:"";
    const s=(typeof canonicalSetState==="function" && ex)?canonicalSetState(ex):null;
    if($("cycleDebug")){
      const cc=typeof completedCycleCount==="function"?completedCycleCount():0;
      const aw=typeof autoWeek==="function"?autoWeek():"-";
      stableSetBox("cycleDebug","msg info",`Cycle Status<br>Completed Cycles: <b>${cc}</b><br>Auto Week: <b>${aw}</b>`);
    }
    if($("dayDateLockDebug")){
      const ad=typeof activeDay==="function"?activeDay():"-";
      stableSetBox("dayDateLockDebug","msg info",`Day Lock Status<br>Active Day: <b>${ad}</b>`);
    }
    if($("exerciseOrderDebug")){
      stableSetBox("exerciseOrderDebug","msg info",`ลำดับท่า<br>${ex?`ท่าปัจจุบัน: <b>${ex}</b>`:"ยังไม่ได้เลือกท่า"}`);
    }
    if($("weeklyStatsDebug")){
      const total=(logs||[]).length;
      stableSetBox("weeklyStatsDebug","msg info",`สถิติ<br>จำนวน log ทั้งหมด: <b>${total}</b>`);
    }
    if($("nextWeightDebug") && s){
      stableSetBox("nextWeightDebug","msg info",`Next Set<br>${ex}: เล่นไปแล้ว <b>${s.done}/${s.target}</b> • ถัดไป Set <b>${s.next}</b>`);
    }
  }catch(e){
    console.warn("stableRenderDiagnostics", e);
  }
}
function stableRenderAllPanels(){setTimeout(renderPlateauDetectionSafe,80);autoApplyPersistentAlternative();
  try{
    if(typeof bindCanonicalExerciseSwitch==="function") bindCanonicalExerciseSwitch();
    if($("exercise") && typeof applyCanonicalSetDisplay==="function") applyCanonicalSetDisplay($("exercise").value);
    if(typeof updateCalendarSyncStatus==="function") updateCalendarSyncStatus();
    if(typeof calSyncUpdateStatus==="function") calSyncUpdateStatus();
    if(typeof updatePR==="function") updatePR();
    if(typeof updateWeeklySuggestion==="function") updateWeeklySuggestion();
    if(typeof updateNextWeekRecommendation==="function") updateNextWeekRecommendation();
    if(typeof renderMediaPanel==="function") renderMediaPanel();
    if(typeof historySummaryForCurrent==="function") historySummaryForCurrent();
    stableRenderDiagnostics();
  }catch(e){
    console.warn("stableRenderAllPanels", e);
    stableRenderDiagnostics();
  }
}
function bindStableRenderTriggers(){
  // v5.2.6: disabled heavy stableRenderAllPanels on exercise/date change.
  bindOptimizedExerciseSwitchV526();
}

function bindAutoPersistentAlternative(){
  bindOptimizedExerciseSwitchV526();
}

function syncSelectedExerciseState(){
  try{
    const ex = $("exercise") ? $("exercise").value : "";
    if(!ex) return;
    const st = activeExerciseSetState(ex);
    currentSet = st.next;
    if($("setTitle")) $("setTitle").textContent = `Set ${st.next} / ${st.target}`;
    if($("setStatus")){
      if(st.done >= st.target){
        $("setStatus").className = "msg ok";
        $("setStatus").innerHTML = `ท่านี้ครบแล้ว: <b>${ex}</b> (${st.done}/${st.target})`;
      }else{
        $("setStatus").className = "msg";
        $("setStatus").innerHTML = `ค้างอยู่: <b>${ex}</b><br>เล่นไปแล้ว ${st.done}/${st.target} เซต • เซตถัดไปคือ Set ${st.next}`;
      }
    }
  }catch(e){ console.warn("syncSelectedExerciseState", e); }
}
function forceMediaToSelectedExercise(){
  try{
    if(selectedAlt && selectedAlt.original && meta&&meta() && selectedAlt.original!==meta()[2]) selectedAlt=null;
    if(typeof renderMediaPanel==="function") renderMediaPanel();
    if(typeof historySummaryForCurrent==="function") historySummaryForCurrent();
  }catch(e){}
}
function bindExerciseStateFix(){
  bindOptimizedExerciseSwitchV526();
}

function applyMeta(){
  try{
    const m = typeof meta === "function" ? meta() : null;
    if(!m) return;
    setTextSafe("dayFocus", (m[0] || "") + " • " + (m[1] || ""));
    setTextSafe("targetShow", (m[3] || "") + " sets × " + (m[4] || "") + " reps");
    setTextSafe("muscleShow", m[5] || "");
    setTextSafe("modeShow", m[6] || "");
    setTextSafe("exerciseTitle", m[2] || "");
    setTextSafe("currentExerciseTitle", m[2] || "");
    setTextSafe("logExerciseTitle", m[2] || "");
    setTextSafe("mediaTitle", "Media Reference: " + (m[2] || ""));
  }catch(e){
    console.warn("applyMeta null guard", e);
  }
}









function sync(){
  try{
    updateDateStatus();
    let wk = autoWeek();
    setValueSafe("week", wk);
    setTextSafe("kWeek", wk);

    let st = nextState(), ad = activeDay(), c = activeCycle();
    const exerciseEl = getElSafe("exercise");
    const saveBtn = getElSafe("saveBtn");

    if(st && st.dateLock){
      setHtmlSafe("lockStatus", `<b>${st.day}</b> ยังถูกล็อกตามวัน<br>${st.message}`);
      setTextSafe("setStatus", "ยังบันทึกไม่ได้ เพราะต้องรอวันตามโปรแกรม");
      if(saveBtn) saveBtn.disabled = true;
      if(exerciseEl){
        Array.from(exerciseEl.options).forEach(o=>{
          const p=PROGRAM.find(p=>p[2]===o.value);
          if(p){o.disabled=true; o.textContent=`${p[0]} - ${p[2]} 🔒 รอวัน`; }
        });
      }
      if(typeof updateCycleDebug==="function") updateCycleDebug();
      if(typeof updateDayDateLockDebug==="function") updateDayDateLockDebug();
      if(typeof renderMediaPanel==="function") renderMediaPanel();
      if(typeof syncSelectedExerciseState==="function") syncSelectedExerciseState();
      if(typeof calSyncUpdateStatus==="function") calSyncUpdateStatus();
      if(exerciseEl && typeof applyCanonicalSetDisplay==="function") applyCanonicalSetDisplay(exerciseEl.value);
      if(typeof stableRenderAllPanels==="function") stableRenderAllPanels();
      if(typeof autoApplyPersistentAlternative==="function") autoApplyPersistentAlternative();
      if(typeof renderSafe==="function") renderSafe();
      return;
    }

    if(st && st.restLock){
      setHtmlSafe("lockStatus", `พักยังไม่ครบ 2 วัน<br>Rest: <b>${st.rest}/2</b><br>เริ่ม Day 1 ได้เร็วสุด: <b>${st.earliest}</b>`);
      setTextSafe("setStatus", "ยังบันทึก Day 1 รอบใหม่ไม่ได้");
      if(saveBtn) saveBtn.disabled = true;
      if(exerciseEl){
        Array.from(exerciseEl.options).forEach(o=>{o.disabled=true;o.textContent=o.value+" 🔒 Rest";});
      }
      if(typeof renderSafe==="function") renderSafe();
      return;
    }

    setHtmlSafe("lockStatus", `Auto Week ${wk}: ปลดล็อก <b>${ad}</b><br>${DAY_ORDER.map(d=>d+(dayComplete(c,d)?" ✅":" 🔒")).join(" / ")}`);

    if(exerciseEl){
      Array.from(exerciseEl.options).forEach(o=>{
        let p=PROGRAM.find(p=>p[2]===o.value);
        if(!p) return;
        let done=countActive(o.value), t=target(o.value), locked=(ad==="REST_LOCK"||ad==="COMPLETE"||p[0]!==ad||done>=t);
        o.disabled=locked;
        o.textContent=`${p[0]} - ${p[2]}${p[0]!==ad?" 🔒":done>=t?" ✅ ครบ":` (${done}/${t})`}`;
      });
    }

    if(st && !st.complete){
      if(typeof canSaveCurrentExerciseAdaptive==="function" && !canSaveCurrentExerciseAdaptive() && exerciseEl){
        exerciseEl.value=st.exercise;
      }
      if(typeof applyMeta==="function") applyMeta();
      if(typeof updateAltMemoryUI==="function") updateAltMemoryUI(st.exercise);
      currentSet=st.next;
      setTextSafe("setNo", st.next);
      setTextSafe("targetShow", st.target);
      setHtmlSafe("setStatus", `ค้างอยู่: <b>${st.exercise}</b><br>เล่นแล้ว ${st.done}/${st.target} • เหลือ ${st.remain} เซต`);
      if(saveBtn) saveBtn.disabled=false;
    }else{
      setTextSafe("setStatus", "Cycle นี้ครบแล้ว");
      if(saveBtn) saveBtn.disabled=true;
    }

    if(typeof applyPersistentAltIfExists==="function") applyPersistentAltIfExists();
    if(typeof updatePersistentAltUI==="function") updatePersistentAltUI();
    if(typeof historySummaryForCurrent==="function") historySummaryForCurrent();
    if(typeof updatePR==="function") updatePR();
    if(typeof updateWeekly==="function") updateWeekly();
    if(typeof updateNextWeekRecommendation==="function") updateNextWeekRecommendation();
    if(typeof updateOrderGuidance==="function") updateOrderGuidance();
    if(typeof renderHypertrophyIntelligence==="function") renderHypertrophyIntelligence();
    if(typeof renderSafe==="function") renderSafe();
  }catch(e){
    console.warn("sync null guard", e);
    const box=document.getElementById("legacyMigrationBox");
    if(box && String(e.message||"").includes("null")){
      box.className="msg warn";
      box.innerHTML="Sync null guard จับ DOM error ได้แล้ว<br><span class='small'>ปุ่ม Migration ยังควรกดได้</span>";
    }
    try{ if(typeof renderSafe==="function") renderSafe(); }catch(_){}
  }
}


const MOVEMENT_GROUPS = {
  "Seated Shoulder Press":"shoulder_press",
  "Machine Shoulder Press":"shoulder_press",
  "Dumbbell Shoulder Press":"shoulder_press",
  "Smith Machine Shoulder Press":"shoulder_press",
  "Cable Triceps Pushdown":"triceps_extension",
  "Rope Triceps Pushdown":"triceps_extension",
  "Overhead Triceps Extension":"triceps_extension",
  "Lat Pulldown":"vertical_pull",
  "Seated Cable Row":"horizontal_pull",
  "Chest Supported Row":"horizontal_pull",
  "Barbell Row":"horizontal_pull",
  "Face Pull":"rear_delt",
  "Dumbbell Curl":"biceps_curl",
  "Machine Preacher Curl":"biceps_curl",
  "Cable Curl":"biceps_curl",
  "Romanian Deadlift":"hip_hinge",
  "Leg Press":"leg_press",
  "Leg Extension":"knee_extension",
  "Seated Leg Curl":"knee_flexion",
  "Standing Leg Curl":"knee_flexion",
  "Prone Leg Curl":"knee_flexion",
  "Back Squat":"squat",
  "Hack Squat":"squat"
};






function historyMatchesExercise(x, plannedEx){
  return safeHistoryRows(plannedEx).includes(x);
}




function updatePR(){let plannedEx=$("exercise").value,ex=activeDisplayExercise(plannedEx),u=$("unit").value,a=logs.filter(x=>historyMatchesExercise(x,plannedEx)&&x.weight);if(!a.length){$("prStatus").textContent="สถิติเดิม: ยังไม่มีข้อมูลของท่านี้";return}let max=a.reduce((m,x)=>+x.weight>+m.weight?x:m,a[0]),last=a[0],s=+last.weight,msg="คงน้ำหนัก เพิ่ม reps";if(+last.rir>=3){s+=2.5;msg="เบาไป เพิ่ม +2.5 kg"}else if(+last.rir<=0){s=Math.max(0,s-2.5);msg="หนักเกิน ลด -2.5 kg"}else if(+last.rir<=2&&+last.reps>=10){s+=2.5;msg="เพิ่ม +2.5 kg ได้"}$("prStatus").innerHTML=`สถิติสูงสุด: <b>${fromKg(max.weight,u)} ${u}</b> × ${max.reps} reps<br>แนะนำวันนี้: <b>${fromKg(s,u)} ${u}</b> — ${msg}`}
function updateWeekly(){let plannedEx=$("exercise").value,ex=activeDisplayExercise(plannedEx),w=autoWeek()-1,u=$("unit").value;if(w<1){$("weekSuggest").textContent="สัปดาห์ก่อน: ยังไม่มีข้อมูล";return}let a=logs.filter(x=>+(x.week||x.autoWeek||1)===w&&(x.exercise===ex||planned(x)===ex));if(!a.length){$("weekSuggest").textContent=`สัปดาห์ก่อน Week ${w}: ยังไม่มีข้อมูลของ ${ex}`;return}let top=a.reduce((m,x)=>+x.weight>+m.weight?x:m,a[0]);let sug=+top.weight,msg="คงน้ำหนัก";if(+top.rir>=3||+top.reps>=10){sug+=2.5;msg="เพิ่ม +2.5 kg ได้"}else if(+top.rir<=0){sug=Math.max(0,sug-2.5);msg="ลด -2.5 kg"}$("weekSuggest").innerHTML=`สัปดาห์ก่อน: ${fromKg(top.weight,u)} ${u} × ${top.reps} reps (RIR ${top.rir??"-"})<br>แนะนำ Week นี้: <b>${fromKg(sug,u)} ${u}</b> — ${msg}`}

function cleanForFirestore(obj){
  return Object.fromEntries(
    Object.entries(obj).filter(([k,v]) => v !== undefined)
  );
}


/* ===== v5.2.6 SAVE_AUTH_GUARD_FIX ===== */

function runAuthDebugGuardSafe(){
  try{
    if(typeof authDebugGuardRun === "function") return authDebugGuardRun();
    if(typeof window !== "undefined" && typeof window.authDebugGuardRun === "function") return window.authDebugGuardRun();
  }catch(_){}
  return true;
}

function authDebugGuardRun(){
  try{
    if(typeof user !== "undefined" && user) return true;
    return true;
  }catch(_){
    return true;
  }
}

let editingLogIdV533 = null;

function setSaveModeV533(editing){
  const btn = $("saveBtn");
  const dbg = $("saveDebug");
  if(btn) btn.textContent = editing ? "บันทึกการแก้ไข" : "+ บันทึกเซตนี้";
  if(dbg){
    dbg.className = editing ? "msg warn" : "msg";
    dbg.textContent = editing ? "โหมดแก้ไข: บันทึกแล้วจะอัปเดตรายการเดิม ไม่สร้างรายการใหม่" : "พร้อมบันทึก";
  }
}

function cancelEditLogV533(){
  editingLogIdV533 = null;
  setSaveModeV533(false);
  if($('resetBtn')) $('resetBtn').textContent = 'Reset';
}
window.cancelEditLogV533 = cancelEditLogV533;

function buildWorkoutPayloadV533({isEdit=false}={}){
  const m = meta();
  const wk = autoWeek();
  const raw = parseFloat($("weight").value);
  const reps = parseInt($("reps").value);
  const rir = parseInt($("rir").value || 2);
  if(!raw || !reps) throw new Error("กรอก Weight และ Reps");

  const rememberedAlt = altMemoryForPlanned(m[2]);
  const persistentAlt = (typeof autoApplyPersistentAlternative === "function" ? autoApplyPersistentAlternative() : null);
  const effectiveAlt = selectedAlt || persistentAlt || rememberedAlt;
  const w = toKg(raw, $("unit").value);
  const ex = effectiveAlt ? effectiveAlt.name : m[2];
  const targetSets = (typeof effectiveTargetSetsV522 === "function") ? effectiveTargetSetsV522(m[2]) : m[3];
  const setNo = isEdit
    ? (Number($("setNo")?.textContent) || Number(logs.find(x => x.id === editingLogIdV533)?.setNo) || 1)
    : canonicalSetState(m[2]).next;

  return cleanForFirestore({
    date: $("date").value,
    week: wk,
    autoWeek: wk,
    day: m[0],
    focus: m[1],
    exercise: ex,
    plannedExercise: m[2],
    isAlternative: !!effectiveAlt,
    alternativePattern: effectiveAlt ? effectiveAlt.pattern : "",
    alternativeQuery: (effectiveAlt && effectiveAlt.query) ? effectiveAlt.query : "",
    targetSets,
    setNo,
    muscle: m[5],
    weight: w,
    reps,
    rir,
    volume: w * reps,
    note: $("note").value || "",
    sleepHours: parseFloat($("sleepHours")?.value || 7),
    soreness: parseInt($("soreness")?.value || 2),
    stress: parseInt($("stress")?.value || 2),
    tempo: $("tempo")?.value || "",
    repQuality: $("repQuality")?.value || "",
    biasMode: $("biasMode")?.value || "auto",
    effectiveReps: effectiveRepsForSet({reps, rir}),
    userId: user.uid,
    userName: user.displayName || user.email,
    userEmail: user.email,
    teamLabel: activeTeamLabel(),
    userScope: activeUserKey(),
    ownerUid: user.uid,
    ownerEmail: user.email,
    appVersion: VERSION,
    updatedAt: serverTimestamp(),
    ...(isEdit ? {} : {createdAt: serverTimestamp()})
  });
}

async function saveSet(){
  try{
    $("saveDebug").className = "msg";
    $("saveDebug").textContent = editingLogIdV533 ? "กำลังอัปเดต..." : "กำลังบันทึก...";
    if(!user) return alert("Login ก่อน");
    if(!teamId) return alert("ใส่ Team ID ก่อน");
    if(!validateDate()) return;

    const m = meta();
    const st = nextState();
    const isEdit = !!editingLogIdV533;
    const adNow = (typeof activeDay === "function") ? activeDay() : "";
    if(!isEdit && (st.restLock || adNow === "REST_LOCK")){
      if($("saveBtn")) $("saveBtn").disabled = true;
      return alert("ยังพักไม่ครบ 2 วัน ต้องรอให้ครบ หรือใช้ Manual Override เท่านั้น");
    }
    if(!isEdit && (st.dateLock || adNow === "DAY_DATE_LOCK")){
      if($("saveBtn")) $("saveBtn").disabled = true;
      return alert(st.message || "วันนี้ยังถูกล็อกตาม Day Lock / Rest Rule");
    }
    if(!isEdit && (!String(adNow).startsWith("Day") || !canSaveCurrentExerciseAdaptive())) return alert("ท่านี้ยังไม่สามารถบันทึกได้: อาจเป็นคนละ Day, ยังพักไม่ครบ, หรือครบเซตแล้ว");

    const payload = buildWorkoutPayloadV533({isEdit});
    __w534IsSaving = true;
    w534SetBusy(true, isEdit ? "กำลังอัปเดตข้อมูล..." : "กำลังบันทึก...");
    if(isEdit){
      const editId = editingLogIdV533;
      await updateDoc(doc(db, scopedWorkoutsCollection(), editId), payload);
      const idx = logs.findIndex(x=>x.id===editId);
      if(idx>=0) logs[idx] = {...logs[idx], ...payload, id:editId};
    }else{
      const ref = await addDoc(collection(db, scopedWorkoutsCollection()), payload);
      logs = [{...payload, id:ref.id, createdAt:new Date()}, ...logs];
      if(typeof exSessionAfterSave === "function") exSessionAfterSave(m[2]);
      startRest();
    }

    applyCanonicalSetDisplay(m[2]);
    selectedAlt = null;
    $("weight").value = "";
    $("reps").value = "";
    $("rir").value = 2;
    $("note").value = "";
    cancelEditLogV533();
    $("saveDebug").className = "msg ok";
    $("saveDebug").textContent = isEdit ? "แก้ไขข้อมูลสำเร็จ ✅" : "บันทึกสำเร็จ ✅";
    try{ if(typeof __w5318RefreshLogState === "function") __w5318RefreshLogState(m[2]); }catch(_){}
    w534RenderCurrentPage("log");
    setTimeout(()=>{try{sync()}catch(_){}; __w534IsSaving=false; w534SetBusy(false);},120);
    [["v403Run",450],["plateauLiveRecompute",650],["stableRenderAllPanels",700]].forEach(([fn,ms])=>setTimeout(function(){try{
      if(typeof window !== "undefined" && typeof window[fn] === "function") window[fn]();
      else if(typeof globalThis[fn] === "function") globalThis[fn]();
    }catch(_){}},ms));
  }catch(e){
    __w534IsSaving=false; w534SetBusy(false);
    $("saveDebug").className = "msg err";
    $("saveDebug").textContent = "Save error: " + e.message;
    alert("Save error: " + e.message);
  }
}


/* ===== v5.2.6 LEGACY_MIGRATION_CODE ===== */
/* ===== v5.2.6 MIGRATION_RECOVERY_CODE ===== */







/* ===== v5.2.6 FULL_QA_MIGRATION_CHAIN ===== */
let legacyMigrationState = { checked:false, count:0, docs:[] };
window.__legacyMigrationReadyToMigrate = false;

async function checkLegacyLogsForMigration(){
  const box = document.getElementById("legacyMigrationBox");
  const btn = document.getElementById("legacyMigrationBtn");
  try{
    if(btn){
      btn.disabled = false;
      btn.type = "button";
    }
    if(!box) return;

    window.__legacyMigrationReadyToMigrate = false;
    legacyMigrationState = { checked:false, count:0, docs:[] };

    if(!user){
      box.className = "msg warn";
      box.innerHTML = "ยังไม่ได้ Login: กรุณา Login ก่อนตรวจ Log เก่า";
      if(btn) btn.textContent = "ตรวจสอบ Log เก่า";
      return;
    }

    if(!teamId){
      const inputVal = document.getElementById("teamId") ? String(document.getElementById("teamId").value || "").trim() : "";
      if(inputVal){
        teamId = inputVal;
        localStorage.setItem("teamId", teamId);
      }
    }

    if(!teamId){
      box.className = "msg warn";
      box.innerHTML = "ยังไม่มี Team ID: ใส่ Team ID แล้วกด Save Team ID ก่อน";
      if(btn) btn.textContent = "ตรวจสอบ Log เก่า";
      return;
    }

    box.className = "msg info";
    box.innerHTML = "กำลังตรวจ legacy path:<br><b>" + legacySharedWorkoutsCollection() + "</b>";
    if(btn) btn.textContent = "กำลังตรวจ...";

    let legacySnap;
    try{
      legacySnap = await getDocs(query(collection(db, legacySharedWorkoutsCollection()), orderBy("createdAt","desc")));
    }catch(readErr){
      box.className = "msg err";
      box.innerHTML = "อ่าน legacy path ไม่ได้: " + readErr.message + "<br><span class='small'>ตรวจ Firestore Rules หรือ Team ID</span>";
      if(btn) btn.textContent = "ตรวจสอบ Log เก่า";
      return;
    }

    const legacyDocs = legacySnap.docs.map(function(d){ return { id:d.id, data:d.data() }; });
    legacyMigrationState = { checked:true, count:legacyDocs.length, docs:legacyDocs };

    if(!legacyDocs.length){
      box.className = "msg warn";
      box.innerHTML = "ไม่พบ log เก่าที่ path:<br><b>" + legacySharedWorkoutsCollection() + "</b>";
      if(btn) btn.textContent = "ตรวจสอบ Log เก่า";
      return;
    }

    const first = legacyDocs[legacyDocs.length-1]?.data?.date || "-";
    const last = legacyDocs[0]?.data?.date || "-";
    window.__legacyMigrationReadyToMigrate = true;
    window.__legacyMigrationCount = legacyDocs.length;

    box.className = "msg warn";
    box.innerHTML = "พบ log เก่า <b>" + legacyDocs.length + "</b> records<br>ช่วงวันที่: " + first + " → " + last + "<br><span class='small'>กดปุ่มเดิมอีกครั้งเพื่อย้ายเข้า user account ปัจจุบัน</span>";
    if(btn){
      btn.disabled = false;
      btn.textContent = "ย้ายข้อมูลทั้งหมด (" + legacyDocs.length + " records)";
      btn.onclick = migrationButtonHandlerV5100;
    }
  }catch(e){
    if(box){
      box.className = "msg err";
      box.innerHTML = "Migration check error: " + e.message;
    }
    if(btn){
      btn.disabled = false;
      btn.textContent = "ตรวจสอบ Log เก่า";
    }
  }
}

async function migrateLegacyLogsToUser(){
  const box = document.getElementById("legacyMigrationBox");
  const btn = document.getElementById("legacyMigrationBtn");
  try{
    if(!user){
      alert("กรุณา Login ก่อน");
      return;
    }
    if(!teamId){
      alert("กรุณา Save Team ID ก่อน");
      return;
    }
    if(!legacyMigrationState.docs || !legacyMigrationState.docs.length){
      if(box){
        box.className = "msg warn";
        box.innerHTML = "ยังไม่มีข้อมูลสำหรับย้าย กรุณากดตรวจสอบ Log เก่าก่อน";
      }
      window.__legacyMigrationReadyToMigrate = false;
      if(btn) btn.textContent = "ตรวจสอบ Log เก่า";
      return;
    }

    const ok = confirm("ยืนยันย้าย log เก่า " + legacyMigrationState.docs.length + " records เข้าบัญชีนี้?\n\nระบบจะ copy ไป path ใหม่และไม่ลบข้อมูลเก่า");
    if(!ok) return;

    if(box){
      box.className = "msg info";
      box.innerHTML = "กำลัง migrate legacy logs...";
    }
    if(btn) btn.disabled = true;

    let migrated = 0;
    for(const oldDoc of legacyMigrationState.docs){
      const data = oldDoc.data || {};
      await addDoc(collection(db, scopedWorkoutsCollection()), cleanForFirestore({
        ...data,
        migratedFromLegacy:true,
        legacyId:oldDoc.id,
        migratedAt:new Date().toISOString(),
        teamLabel:activeTeamLabel(),
        userScope:activeUserKey(),
        ownerUid:user.uid,
        ownerEmail:user.email
      }));
      migrated++;
      if(box && migrated % 20 === 0){
        box.innerHTML = "Migrating... " + migrated + "/" + legacyMigrationState.docs.length;
      }
    }

    window.__legacyMigrationReadyToMigrate = false;
    if(box){
      box.className = "msg ok";
      box.innerHTML = "Migration สำเร็จ ✅<br>ย้ายแล้ว " + migrated + " records<br><span class='small'>ข้อมูลเก่ายังอยู่ ไม่ได้ลบ</span>";
    }
    if(btn){
      btn.disabled = true;
      btn.textContent = "Migration Completed";
    }
    setTimeout(sync,800);
  }catch(e){
    if(box){
      box.className = "msg err";
      box.innerHTML = "Migration error: " + e.message;
    }
    if(btn){
      btn.disabled = false;
      btn.textContent = "ย้ายข้อมูลทั้งหมด (" + (legacyMigrationState.docs ? legacyMigrationState.docs.length : 0) + " records)";
    }
    alert("Migration error: " + e.message);
  }
}

function migrationButtonHandlerV5100(ev){
  if(ev){
    ev.preventDefault();
    ev.stopPropagation();
  }
  if(window.__legacyMigrationReadyToMigrate && legacyMigrationState.docs && legacyMigrationState.docs.length){
    migrateLegacyLogsToUser();
  }else{
    checkLegacyLogsForMigration();
  }
  return false;
}

function bindLegacyMigration(){
  const btn = document.getElementById("legacyMigrationBtn");
  if(!btn) return;
  btn.disabled = false;
  btn.type = "button";
  btn.onclick = migrationButtonHandlerV5100;
  window.checkLegacyLogsForMigration = checkLegacyLogsForMigration;
  window.migrateLegacyLogsToUser = migrateLegacyLogsToUser;
  window.bindLegacyMigration = bindLegacyMigration;
  window.__migrationModuleReady = true;
}

/* ===== v5.3.22 PERFORMANCE / WHITE FLASH FIX ===== */
let __w534RenderTimer = null;
let __w534LastPage = "setup";
let __w534IsSaving = false;
function w534ActivePage(){
  try{return document.querySelector(".page.active")?.id || __w534LastPage || "setup";}catch(_){return __w534LastPage||"setup";}
}
function w534SetBusy(on, text="กำลังโหลด..."){
  try{
    let el=document.getElementById("w534Busy");
    if(!el){
      el=document.createElement("div"); el.id="w534Busy"; el.className="w534Busy";
      el.innerHTML='<div class="w534BusyBox"><div class="w534Spinner"></div><div id="w534BusyText">กำลังโหลด...</div></div>';
      document.body.appendChild(el);
    }
    const t=document.getElementById("w534BusyText"); if(t) t.textContent=text;
    el.classList.toggle("show", !!on);
  }catch(_){}
}
function w534SafeCall(fn){try{ if(typeof fn==="function") fn(); }catch(e){console.warn("v5.3.22 safe render", e);}}
function w534RenderCurrentPage(page=w534ActivePage()){
  __w534LastPage=page;
  w534SafeCall(renderRecent);
  if(page==="dash"){w534SafeCall(renderDashboard); w534SafeCall(()=>{ if(typeof v5RenderMuscleBalance==="function") v5RenderMuscleBalance(); }); w534SafeCall(()=>{ if(typeof v5RenderPRBoard==="function") v5RenderPRBoard(); }); w534SafeCall(()=>{ if(typeof v5RenderRecoveryTrend==="function") v5RenderRecoveryTrend(); });}
  else if(page==="coach"){w534SafeCall(renderCoach); w534SafeCall(()=>{ if(typeof renderHypertrophyIntelligence==="function") renderHypertrophyIntelligence(); });}
  else if(page==="calendar"){w534SafeCall(renderCalendar); w534SafeCall(()=>renderDaySummary(selectedDate));}
  else if(page==="log"){w534SafeCall(applyMeta); w534SafeCall(updatePR); w534SafeCall(updateWeekly); w534SafeCall(updateNextWeekRecommendation); w534SafeCall(updateOrderGuidance); w534SafeCall(()=>{ if(typeof historySummaryForCurrent==="function") historySummaryForCurrent(); }); w534SafeCall(()=>{ if(typeof renderMediaPanel==="function") renderMediaPanel(); }); w534SafeCall(()=>{ if(typeof v5RenderLogSummary==="function") v5RenderLogSummary(); });}
  else if(page==="program"){w534SafeCall(renderProgram);}
  else if(page==="guide"){w534SafeCall(renderGuide);}
  else if(page==="backup"){w534SafeCall(()=>{ if(typeof v5BindExport==="function") v5BindExport(); });}
}
function w534DebouncedRender(page=w534ActivePage(), delay=80){
  clearTimeout(__w534RenderTimer);
  __w534RenderTimer=setTimeout(()=>{w534RenderCurrentPage(page);}, delay);
}
function w534ShowPage(page){
  try{
    document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active", p.id===page));
    document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.page===page));
    __w534LastPage=page;
    w534DebouncedRender(page, 20);
  }catch(e){console.warn("show page", e);}
}
window.show = w534ShowPage;
window.showPage = w534ShowPage;

function subscribe(){if(unsub)unsub();if(!teamId)return;unsub=onSnapshot(query(collection(db, scopedWorkoutsCollection()),orderBy("createdAt","desc")),s=>{logs=s.docs.map(d=>({id:d.id,...d.data()}));$("debug").className="msg ok";$("debug").textContent=`โหลดข้อมูลแล้ว ${logs.length} sets • ${VERSION} • Isolated User Data`;w534DebouncedRender(w534ActivePage(), __w534IsSaving?120:40);bindLegacyMigration();setTimeout(function(){try{bindTargetSetsDefaultV522();}catch(e){}},120);setTimeout(function(){try{bindBackupExportToolV520();}catch(e){}},160);setTimeout(function(){try{bindCalendarStayFixV512();bindCalendarGoLogV512();}catch(e){}},120);if(logs.length===0)setTimeout(checkLegacyLogsForMigration,500)},e=>{$("debug").className="msg err";$("debug").textContent=e.message})}
onAuthStateChanged(auth,u=>{user=u;$("authState").textContent=u?`Login: ${u.displayName||u.email}`:"ยังไม่ได้ login";$("userLine").textContent=u?`${u.displayName||u.email} / Team: ${teamId||"-"} / ${VERSION}`:`Clean QA • ${VERSION}`;if(u&&teamId)subscribe()});
$("loginBtn").onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>alert(e.message));$("logoutBtn").onclick=()=>signOut(auth);$("saveTeamBtn").onclick=()=>{teamId=$("teamId").value.trim();localStorage.setItem("teamId",teamId);subscribe()};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>w534ShowPage(b.dataset.page));
$("exercise").onchange=()=>{selectedAlt=null;$("altStatus").textContent="ยังไม่ได้เลือกท่าทดแทน";applyMeta();sync()};$("date").onchange=()=>{selectedDate=$("date").value;sync()};$("unit").onchange=sync;$("saveBtn").onclick=saveSet;$("resetBtn").onclick=function(){cancelEditLogV533();sync();};
$("clearAltBtn").onclick=clearAltMemoryForCurrent;
$("imageBtn").onclick=()=>openCurrentMedia("image");
$("videoBtn").onclick=()=>openCurrentMedia("video");

function renderAltList(ex, filterText=""){
  const list=(ALT[ex]||[]).filter(a=>{
    const s=(a[0]+" "+a[1]+" "+a[2]+" "+(a[3]||"")+" "+(a[4]||"")).toLowerCase();
    return s.includes(String(filterText||"").toLowerCase());
  });
  $("altList").innerHTML=list.length?list.map(a=>`
    <button class="altPick" data-name="${a[0]}" data-pattern="${a[1]}" data-query="${a[2]}">
      ${a[0]}<br><span class="altMeta">${a[1]} • ${a[3]||""} • ${a[4]||""}<br>Search: ${a[2]}</span>
    </button>
    <div class="altActionRow"><button class="cyan altImg" data-name="${a[0]}" data-query="${a[2]}">ดูภาพท่าที่ถูก</button><button class="purple altVid" data-name="${a[0]}" data-query="${a[2]}">ดูวิดีโอ</button></div>
  `).join(""):"<div class='msg warn'>ไม่พบท่าที่ค้นหา</div>";
  document.querySelectorAll(".altPick[data-name]").forEach(btn=>btn.onclick=()=>{
    selectedAlt={name:btn.dataset.name,pattern:btn.dataset.pattern,original:ex,query:btn.dataset.query};
    $("altStatus").innerHTML=`เลือกทดแทน: <b>${selectedAlt.name}</b> แทน ${ex}<br><span class="small">Search: ${selectedAlt.query}</span>`;
    $("altModal").style.display="none";if(typeof renderMediaPanel==="function")renderMediaPanel();
    document.body.classList.remove("modal-open");
  });
  document.querySelectorAll(".altImg").forEach(btn=>btn.onclick=()=>openSearch("image",(getMediaForExercise(btn.dataset.name).query||btn.dataset.query)));
  document.querySelectorAll(".altVid").forEach(btn=>btn.onclick=()=>openSearch("video",(getMediaForExercise(btn.dataset.name).query||btn.dataset.query)));
}
$("altBtn").onclick=()=>{
  const ex=$("exercise").value;
  $("altModal").style.display="flex";
  document.body.classList.add("modal-open");
  $("altSearch").value="";
  renderAltList(ex,"");
  setTimeout(()=>$("altSearch").focus(),150);
};
$("altSearch").oninput=()=>renderAltList($("exercise").value,$("altSearch").value);
$("closeAlt").onclick=()=>{$("altModal").style.display="none";document.body.classList.remove("modal-open")};document.body.classList.remove("modal-open");

function openSearch(kind, query){
  const q=encodeURIComponent(query);
  const url=kind==="image" ? "https://www.google.com/search?tbm=isch&q="+q : "https://www.youtube.com/results?search_query="+q;
  window.open(url,"_blank","noopener,noreferrer");
}

$("altModal").addEventListener("click",(e)=>{
  if(e.target===$("altModal")){
    $("altModal").style.display="none";
    document.body.classList.remove("modal-open");
  }
});
document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape" && $("altModal").style.display==="flex"){
    $("altModal").style.display="none";
    document.body.classList.remove("modal-open");
  }
});

function startRest(){let sec=+$("restSec").value||75;localStorage.setItem("restEnd",Date.now()+sec*1000);tick();clearInterval(timer);timer=setInterval(tick,1000)}function stopRest(){clearInterval(timer);timer=null;localStorage.removeItem("restEnd");$("timer").textContent="00:00"}function tick(){let end=+localStorage.getItem("restEnd")||0;if(!end)return;let r=Math.max(0,Math.ceil((end-Date.now())/1000));$("timer").textContent=String(Math.floor(r/60)).padStart(2,"0")+":"+String(r%60).padStart(2,"0");if(r<=0)stopRest()}$("startRest").onclick=startRest;$("stopRest").onclick=stopRest;$("add30").onclick=()=>{let e=+localStorage.getItem("restEnd")||Date.now();localStorage.setItem("restEnd",e+30000);tick()};if(localStorage.getItem("restEnd")){tick();timer=setInterval(tick,1000)}
function renderRecent(){
  const unit = $("unit").value;
  $("recent").innerHTML = logs.slice(0,20).map(x=>`<div class="item"><h3>Week ${x.week||x.autoWeek} • Set ${x.setNo||"-"}/${x.targetSets||"-"} • ${x.exercise}</h3><div class="meta">${x.date||"-"} • ${x.day||"-"}<br>${fromKg(x.weight,unit)} ${unit} × ${x.reps||"-"} • Vol ${(+x.volume||0).toFixed(0)} kg${x.isAlternative?`<br>แทน: ${x.plannedExercise}`:""}${x.note?`<br>Note: ${String(x.note).replace(/[<>]/g,"")}`:""}</div><div class="row3"><button class="cyan" onclick="editLogV533('${x.id}')">แก้ไข</button><button class="red" onclick="deleteLog('${x.id}')">ลบ</button></div></div>`).join("") || "<p class='small'>ยังไม่มีข้อมูล</p>";
}

window.editLogV533 = function(id){
  const x = logs.find(v => v.id === id);
  if(!x) return alert("ไม่พบรายการที่จะแก้ไข");
  editingLogIdV533 = id;
  if($("date")) $("date").value = x.date || localDateKey();
  if($("exercise")){
    const planned = x.plannedExercise || x.exercise;
    const opt = Array.from($("exercise").options).find(o => o.value === planned);
    if(opt) $("exercise").value = planned;
  }
  if($("weight")) $("weight").value = fromKg(Number(x.weight || 0), $("unit").value);
  if($("reps")) $("reps").value = x.reps || "";
  if($("rir")) $("rir").value = x.rir ?? 2;
  if($("note")) $("note").value = x.note || "";
  if($("sleepHours")) $("sleepHours").value = x.sleepHours || 7;
  if($("soreness")) $("soreness").value = x.soreness || 2;
  if($("stress")) $("stress").value = x.stress || 2;
  if($("tempo") && x.tempo) $("tempo").value = x.tempo;
  if($("repQuality") && x.repQuality) $("repQuality").value = x.repQuality;
  if($("biasMode") && x.biasMode) $("biasMode").value = x.biasMode;
  if($("targetSets")) $("targetSets").value = x.targetSets || programTargetSetsV522(x.plannedExercise || x.exercise);
  if($("setNo")) $("setNo").textContent = x.setNo || 1;
  setSaveModeV533(true);
  try{showPage("log");}catch(_){}
  window.scrollTo({top:0, behavior:"smooth"});
};

window.deleteLog = async id => {
  if(confirm("ลบเซตนี้?")){
    if(editingLogIdV533 === id) cancelEditLogV533();
    await deleteDoc(doc(db, scopedWorkoutsCollection(), id));
  }
};
function renderProgram(){$("programList").innerHTML=PROGRAM.map(p=>`<div class="item"><h3>${p[0]} • ${p[2]}</h3><div class="meta">${p[3]} sets × ${p[4]} • ${p[5]}</div></div>`).join("")}function renderGuide(){$("guideList").innerHTML=PROGRAM.map(p=>`<div class="item"><h3>${p[2]}</h3><div class="meta">Day: ${p[0]} • Muscle: ${p[5]} • Reps: ${p[4]}</div></div>`).join("")}

function recentLogs(days){
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate()-days);
  return logs.filter(x=>x.date && parseD(x.date)>=cutoff);
}
function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
function recoveryScore(){
  const r=recentLogs(7);
  const last=r[0]||{};
  const sleep=Number(last.sleepHours||7);
  const sore=Number(last.soreness||2);
  const stress=Number(last.stress||2);
  let score=70;
  score += Math.min(10,Math.max(-15,(sleep-7)*5));
  score -= (sore-2)*8;
  score -= (stress-2)*6;
  const vol7=r.reduce((a,b)=>a+(+b.volume||0),0);
  const volPrev=logs.filter(x=>x.date&&parseD(x.date)<new Date(Date.now()-7*86400000)&&parseD(x.date)>=new Date(Date.now()-14*86400000)).reduce((a,b)=>a+(+b.volume||0),0);
  if(volPrev>0 && vol7>volPrev*1.35) score-=12;
  return Math.max(0,Math.min(100,Math.round(score)));
}
function fatigueRisk(){
  const score=recoveryScore();
  const r=recentLogs(7);
  const failSets=r.filter(x=>Number(x.rir)<=0).length;
  let risk=100-score+failSets*4;
  return Math.max(0,Math.min(100,Math.round(risk)));
}
function progressionStatus(){
  const ex=$("exercise")?.value||"";
  const arr=logs.filter(x=>historyMatchesExercise(x,ex)&&x.weight).slice(0,8);
  if(arr.length<3)return {label:"DATA",text:"ยังมีข้อมูลไม่พอสำหรับวิเคราะห์ progression"};
  const latest=arr[0], older=arr[arr.length-1];
  const latestVol=Number(latest.weight||0)*Number(latest.reps||0);
  const olderVol=Number(older.weight||0)*Number(older.reps||0);
  if(latestVol>olderVol*1.05)return {label:"UP",text:"แนวโน้มดี เพิ่มน้ำหนักหรือ reps ได้ตาม RIR"};
  if(latestVol<olderVol*.92)return {label:"DOWN",text:"Performance ตก ควรลด volume หรือใช้ machine stable"};
  return {label:"HOLD",text:"คงที่ ให้เพิ่ม reps ก่อนเพิ่มน้ำหนัก"};
}
function deloadSignal(){
  const risk=fatigueRisk();
  const r=recentLogs(14);
  const lowRir=r.filter(x=>Number(x.rir)<=0).length;
  if(risk>=75 || lowRir>=5)return {label:"YES",text:"ควร deload: ลด volume 30-40% หรือใช้น้ำหนักเบาลง 10%"};
  if(risk>=55)return {label:"WATCH",text:"เริ่มล้า ระวังอย่าเพิ่มทั้ง volume และ load พร้อมกัน"};
  return {label:"NO",text:"ยังไม่จำเป็นต้อง deload"};
}
function muscleVolumes(){
  const g={};
  recentLogs(14).forEach(x=>{let k=x.muscle||"Other";g[k]=(g[k]||0)+(+x.volume||0)});
  return g;
}

function safeRowsForAnalysis(ex){
  try{
    const allowed = new Set(typeof allowedHistoryExercises==="function" ? allowedHistoryExercises(ex) : [ex]);
    const row = PROGRAM.find(p=>p[2]===ex);
    const plannedDay = row ? row[0] : null;
    return (logs||[]).filter(x=>{
      const actual=x.exercise;
      const planned=x.plannedExercise||x.exercise;
      if(plannedDay && x.day && x.day!==plannedDay) return false;
      return allowed.has(actual) || allowed.has(planned);
    });
  }catch(e){
    return (logs||[]).filter(x=>(x.exercise===ex || (x.plannedExercise||x.exercise)===ex));
  }
}








function parseRepRange(ex){
  const p=PROGRAM.find(p=>p[2]===ex);
  const raw=String((p&&p[4])||"8-12");
  const nums=(raw.match(/\d+/g)||["8","12"]).map(Number);
  return {min:nums[0]||8,max:nums[1]||nums[0]||12};
}
function effectiveRepsForSet(x){
  const reps=Number(x.reps||0), rir=Number(x.rir??3);
  return Math.max(0, Math.min(5, reps - Math.max(0, rir)));
}
function effectiveReps7d(){
  return recentLogs(7).reduce((a,x)=>a+effectiveRepsForSet(x),0);
}
function stimulusFatigueScore(ex){
  const name=(ex||"").toLowerCase();
  let stimulus=70, fatigue=40;
  if(name.includes("squat")||name.includes("deadlift")||name.includes("barbell")) fatigue+=25;
  if(name.includes("lunge")||name.includes("step-up")) fatigue+=20;
  if(name.includes("machine")||name.includes("leg extension")||name.includes("leg curl")||name.includes("pec deck")) fatigue-=15;
  if(name.includes("leg extension")||name.includes("leg curl")||name.includes("cable")||name.includes("machine")) stimulus+=8;
  if(name.includes("walking lunge")) stimulus-=5;
  stimulus=Math.max(30,Math.min(100,stimulus));
  fatigue=Math.max(10,Math.min(100,fatigue));
  return Math.round(stimulus/fatigue*50);
}
function machineBiasRecommendation(){
  const risk=typeof fatigueRisk==="function"?fatigueRisk():50;
  const mode=$("biasMode")?.value||"auto";
  if(mode==="machine") return "Machine Bias เปิดอยู่: เลือก machine/cable ก่อน";
  if(mode==="free") return "Free Weight Mode: ใช้ barbell/dumbbell ได้ แต่คุม RIR";
  if(risk>=70) return "Fatigue สูง: แนะนำใช้ machine/cable เพื่อลดความเสี่ยง";
  if(risk>=50) return "Fatigue ปานกลาง: compound ทำเท่าที่จำเป็น แล้ว accessory ใช้ machine";
  return "Recovery ดี: ใช้ free weight หรือ machine ได้ตามเป้าหมาย";
}
function doubleProgressionRecommendation(ex){
  const range=parseRepRange(ex);
  const wk=autoWeek();
  const unit=$("unit")?.value||"kg";
  const top=topSetForExerciseWeek(ex,wk)||latestSetForExercise(ex);
  if(!top) return `Double Progression: ยังไม่มีข้อมูลของ ${ex}<br>เริ่มที่น้ำหนักทำได้ ${range.min}-${range.max} reps และ RIR 1-2`;
  const reps=Number(top.reps||0), rir=Number(top.rir??2), w=Number(top.weight||0);
  let next=w, action="";
  if(reps>=range.max && rir>=1){next=w+2.5;action=`ถึง rep ceiling (${range.max}) และ RIR ยังดี → เพิ่มน้ำหนัก`;}
  else if(reps<range.min){next=w;action=`reps ยังต่ำกว่า ${range.min} → คงน้ำหนักและเพิ่ม reps ก่อน`;}
  else if(rir<=0){next=Math.max(0,w-2.5);action="RIR 0 / หนักเกิน → ลดน้ำหนักหรือคงเดิมแต่ลด reps";}
  else{next=w;action=`อยู่ในช่วง ${range.min}-${range.max} → คงน้ำหนัก เพิ่ม reps`;}
  return `Double Progression<br>ช่วงเป้าหมาย: ${range.min}-${range.max} reps<br>Top ล่าสุด: ${fromKg(w,unit)} ${unit} × ${reps} (RIR ${rir})<br><b>ครั้งถัดไป:</b> ${fromKg(next,unit)} ${unit}<br>${action}`;
}
function volumeZoneForMuscle(muscle){
  const sets=recentLogs(7).filter(x=>(x.muscle||"Other")===muscle).length;
  if(sets<8) return {zone:"LOW",text:"volume ต่ำ เพิ่ม set ได้ถ้า recovery ดี"};
  if(sets<=16) return {zone:"MAV",text:"volume อยู่ในช่วงเหมาะสม"};
  return {zone:"HIGH",text:"volume สูง ระวัง recovery ไม่ทัน"};
}
function renderHypertrophyIntelligence(){
  const m=meta();
  if(!m) return;
  if($("doubleProgressionBox")) $("doubleProgressionBox").innerHTML=doubleProgressionRecommendation(m[2]);
  if($("sfrBox")){
    const sfr=stimulusFatigueScore((typeof activeDisplayExercise==="function"?activeDisplayExercise(m[2]):m[2]));
    $("sfrBox").innerHTML=`SFR Score: <b>${sfr}</b>/100<br>${machineBiasRecommendation()}`;
  }
  if($("effectiveRepsScore")) $("effectiveRepsScore").textContent=effectiveReps7d();
  if($("sfrScore")) $("sfrScore").textContent=stimulusFatigueScore(m[2]);
  if($("volumeZone")){
    const vz=volumeZoneForMuscle(m[5]);
    $("volumeZone").textContent=vz.zone;
  }
}






function safeVal(v,fallback="-"){
  return (v===undefined||v===null||v==="")?fallback:v;
}
function getRecentLogsSafe(days=7){
  try{
    if(typeof recentLogs==="function") return recentLogs(days);
  }catch(e){}
  try{
    const cutoff=new Date();
    cutoff.setDate(cutoff.getDate()-days);
    return (logs||[]).filter(x=>x.date && parseD(x.date)>=cutoff);
  }catch(e){
    return (typeof logs!=="undefined"?logs:[]).slice(0,20);
  }
}
function aiCoachPromptText(){
  const unit = $("unit") ? $("unit").value : "kg";
  const wk = (typeof autoWeek==="function") ? autoWeek() : "-";
  const day = (typeof activeDay==="function") ? activeDay() : "-";
  const sleep = $("sleepHours") ? $("sleepHours").value : "-";
  const soreness = $("soreness") ? $("soreness").value : "-";
  const stress = $("stress") ? $("stress").value : "-";
  const recovery = $("coachRecovery") ? $("coachRecovery").textContent : "-";
  const fatigue = $("coachFatigue") ? $("coachFatigue").textContent : "-";
  const progression = $("coachProgressText") ? $("coachProgressText").textContent : "-";
  const deload = $("coachDeloadText") ? $("coachDeloadText").textContent : "-";
  const currentExercise = $("exercise") ? $("exercise").value : "-";
  const remaining = (typeof remainingExercisesForActiveDay==="function")
    ? remainingExercisesForActiveDay().map(x=>`${x.ex} (${x.done}/${x.target} sets)`).join(", ")
    : "-";
  const recent = getRecentLogsSafe(14).slice(0,20);
  const recentText = recent.length ? recent.map(x=>{
    const w = (typeof fromKg==="function") ? fromKg(x.weight||0,unit) : safeVal(x.weight,0);
    return `- ${safeVal(x.date)} | ${safeVal(x.day)} | ${safeVal(x.exercise||x.plannedExercise)} | ${w} ${unit} x ${safeVal(x.reps)} reps | RIR ${safeVal(x.rir)} | Note: ${safeVal(x.note,"")}`;
  }).join("\n") : "- No recent workout logs";
  const injury = (typeof logs!=="undefined"?logs:[])
    .filter(x=>(x.note||"").match(/เจ็บ|ปวด|pain|injury|เจ็บเท้า|เข่า|หลัง|ไหล่/i))
    .slice(0,8)
    .map(x=>`- ${safeVal(x.date)} | ${safeVal(x.exercise||x.plannedExercise)} | ${safeVal(x.note)}`)
    .join("\n") || "- No injury/pain notes";
  const nextRec = $("nextWeekBox") ? $("nextWeekBox").innerText : "-";
  const doubleProg = $("doubleProgressionBox") ? $("doubleProgressionBox").innerText : "-";
  const sfr = $("sfrBox") ? $("sfrBox").innerText : "-";

  return `You are an elite hypertrophy, strength, and recovery coach.

Analyze the workout data below and give practical recommendations.

User goal:
- Hypertrophy / muscle growth
- Progressive overload
- Manage fatigue and injury risk
- Use machine alternatives if safer or equipment is unavailable

Current status:
- Current Week: ${wk}
- Current Day: ${day}
- Current Exercise Selected: ${currentExercise}
- Sleep Hours: ${sleep}
- Soreness: ${soreness}
- Stress: ${stress}
- Recovery Score: ${recovery}
- Fatigue Risk: ${fatigue}
- Progression Status: ${progression}
- Deload Signal: ${deload}

Remaining exercises today:
${remaining}

Current app recommendations:
Next Weight:
${nextRec}

Double Progression:
${doubleProg}

SFR / Machine Bias:
${sfr}

Recent workout logs:
${recentText}

Pain / injury notes:
${injury}

Please answer in Thai and provide:
1. วันนี้ควรฝึกหนัก ปานกลาง หรือเบา
2. ควรเพิ่ม/ลดน้ำหนักท่าไหน
3. ท่าไหนควรเปลี่ยนเป็น machine หรือ alternative
4. กล้ามเนื้อไหนล้า/ควรระวัง
5. ต้อง deload หรือไม่
6. แผน session วันนี้แบบสั้นและทำตามได้จริง
7. คำเตือนเรื่องเท้า/ขา ถ้ามีความเสี่ยง`;
}
function generateAiCoachPrompt(){
  const t = aiCoachPromptText();
  if($("aiCoachPrompt")){
    $("aiCoachPrompt").value = t;
    $("aiCoachPrompt").focus();
  }
  return t;
}
function bindAiCoachButtons(){
  const gen=$("aiCoachBtn"), copy=$("copyAiPromptBtn");
  if(gen) gen.onclick=()=>generateAiCoachPrompt();
  if(copy) copy.onclick=async()=>{
    const t=generateAiCoachPrompt();
    try{
      await navigator.clipboard.writeText(t);
      alert("คัดลอก AI Coach Prompt แล้ว");
    }catch(e){
      if($("aiCoachPrompt")){
        $("aiCoachPrompt").select();
        document.execCommand("copy");
      }
      alert("คัดลอก AI Coach Prompt แล้ว");
    }
  };
}


function plateauSafeRows(ex){
  try{
    if(typeof safeRowsForAnalysis==="function") return safeRowsForAnalysis(ex);
    if(typeof safeHistoryRows==="function") return safeHistoryRows(ex);
  }catch(e){}
  return (logs||[]).filter(x=>x.exercise===ex || (x.plannedExercise||x.exercise)===ex);
}







function plateauLiveRecompute(){try{renderPlateauDetectionSafe()}catch(e){}}

function renderCoach(){
  try{
    const rec=recoveryScore(), risk=fatigueRisk(), prog=progressionStatus(), delo=deloadSignal();
    $("coachRecovery").textContent=rec;
    $("coachRecovery").className="score "+(rec>=70?"riskLow":rec>=50?"riskMid":"riskHigh");
    $("coachRecoveryText").textContent=rec>=70?"พร้อมฝึกปกติ":rec>=50?"ฝึกได้ แต่ไม่ควรเพิ่มหนักมาก":"ควรลด volume หรือพักเพิ่ม";
    $("coachFatigue").textContent=risk;
    $("coachFatigue").className="score "+(risk<45?"riskLow":risk<70?"riskMid":"riskHigh");
    $("coachFatigueText").textContent=risk<45?"ล้าต่ำ":risk<70?"เริ่มล้า":"ล้าสูง";
    $("coachProgress").textContent=prog.label;
    $("coachProgressText").textContent=prog.text;
    $("coachDeload").textContent=delo.label;
    $("coachDeloadText").textContent=delo.text;
    let advice=[];
    if(rec<50)advice.push("วันนี้ควรลด target sets ลง 1 set ต่อท่าหลัก");
    if(risk>=70)advice.push("ใช้ machine หรือ cable แทน free weight เพื่อลด risk");
    if($("exercise")?.value==="Walking Lunge")advice.push("ถ้าเจ็บเท้า ใช้ Leg Extension / Leg Press / Hack Squat แทน"); advice.push("ระบบ v3.1 ใช้ Soft Order: สลับท่าใน Day เดียวกันได้ แต่ยังเตือน priority");
    advice.push(prog.text);
    advice.push(delo.text); advice.push(machineBiasRecommendation());
    $("coachAdvice").innerHTML=advice.map(x=>"• "+x).join("<br>");
    drawBars("muscleChart",muscleVolumes(),"14-day Muscle Volume");
    $("muscleStatus").textContent="Coach chart OK";
    $("plateauBox").innerHTML=plateauDetection();renderHypertrophyIntelligence();
  }catch(e){
    if($("coachAdvice"))$("coachAdvice").textContent="Coach render error: "+e.message;
  }
}

function renderDashboard(){try{$("kVol").textContent=logs.reduce((a,b)=>a+(+b.volume||0),0).toFixed(0);setTextSafe("kSets", logs.length);setTextSafe("kUsers", new Set(logs.map(x=>x.userId)).size);setTextSafe("kWeek", autoWeek());drawLine("weekChart",group(logs,x=>+(x.week||x.autoWeek||1)),"Auto Weekly Volume");drawBars("exChart",group(logs,x=>x.exercise),"Exercise Volume");$("chartStatus").textContent="Dashboard OK"}catch(e){$("chartStatus").textContent="Dashboard error: "+e.message}}function group(arr,keyFn){let g={};arr.forEach(x=>{let k=keyFn(x)||"-";g[k]=(g[k]||0)+(+x.volume||0)});return g}function drawLine(id,obj,title){let c=$(id),ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#020617";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#94a3b8";ctx.fillText(title,20,25);let ks=Object.keys(obj).sort((a,b)=>+a-+b);if(!ks.length){ctx.fillText("No data yet",330,130);return}let vals=ks.map(k=>obj[k]),max=Math.max(...vals)*1.15||1,p=45,W=c.width-p*2,H=c.height-p*2;ctx.strokeStyle="#38bdf8";ctx.lineWidth=4;ctx.beginPath();ks.forEach((k,i)=>{let x=p+(ks.length===1?W/2:W*i/(ks.length-1)),y=p+H-(vals[i]/max)*H;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.stroke()}function drawBars(id,obj,title){let c=$(id),ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#020617";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#94a3b8";ctx.fillText(title,20,25);let ks=Object.keys(obj).sort((a,b)=>obj[b]-obj[a]).slice(0,8);if(!ks.length){ctx.fillText("No data yet",330,130);return}let max=Math.max(...ks.map(k=>obj[k]))||1,p=45,W=c.width-p*2,H=c.height-p*2,bw=W/ks.length*.55;ks.forEach((k,i)=>{let x=p+W*(i+.2)/ks.length,h=obj[k]/max*H;ctx.fillStyle="#2563eb";ctx.fillRect(x,p+H-h,bw,h);ctx.fillStyle="#fff";ctx.font="11px Arial";ctx.fillText(k.slice(0,9),x,p+H+18)})}
function fmt(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}function dayForDate(d){let a=logs.filter(x=>x.date===d);if(!a.length)return null;let c={};a.forEach(x=>c[x.day]=(c[x.day]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]}function renderCalendar(){let grid=$("calGrid");grid.innerHTML="";let names=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];$("monthTitle").textContent=names[calDate.getMonth()]+" "+calDate.getFullYear();["อา","จ","อ","พ","พฤ","ศ","ส"].forEach(h=>grid.innerHTML+=`<div class="calHead">${h}</div>`);let first=new Date(calDate.getFullYear(),calDate.getMonth(),1),last=new Date(calDate.getFullYear(),calDate.getMonth()+1,0).getDate();for(let i=0;i<first.getDay();i++)grid.innerHTML+=`<div class="calDay empty"></div>`;for(let d=1;d<=last;d++){let key=fmt(new Date(calDate.getFullYear(),calDate.getMonth(),d)),a=logs.filter(x=>x.date===key),day=dayForDate(key),sel=key===selectedDate?" sel":"",tod=key===today()?" today":"";grid.innerHTML+=`<div class="calDay${sel}${tod}" data-date="${key}"><b>${d}</b><br><span class="calTag ${a.length?'partial':'rest'}">${day||'Rest'}</span>${a.length?`<div class="small">${a.length} sets</div>`:""}</div>`}grid.querySelectorAll(".calDay[data-date]").forEach(el=>el.onclick=()=>{selectedDate=el.dataset.date;$("date").value=selectedDate;sync();document.querySelector('[data-page="log"]').click()})}function renderDaySummary(d){let a=logs.filter(x=>x.date===d);$("dayTitle").textContent="Daily Summary: "+d;if(!a.length){$("daySummary").innerHTML="ยังไม่มีข้อมูล";return}let by={};a.forEach(x=>{if(!by[x.exercise])by[x.exercise]=[];by[x.exercise].push(x)});$("daySummary").innerHTML=Object.entries(by).map(([ex,arr])=>{let max=arr.reduce((m,x)=>+x.weight>+m.weight?x:m,arr[0]);return `<div class="item"><h3>${ex}</h3><div class="meta">Sets: ${arr.length}<br>Max: ${fromKg(max.weight,$("unit").value)} ${$("unit").value} × ${max.reps}${max.isAlternative?`<br>แทน: ${max.plannedExercise}`:""}</div></div>`}).join("")}
$("prevM").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()-1,1);renderCalendar()};$("nextM").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()+1,1);renderCalendar()};
function renderSafe(){try{renderDashboard();renderCoach();renderCalendar();renderDaySummary(selectedDate)}catch(e){$("chartStatus").textContent="Render fallback: "+e.message}}
/* v5.2.6 Date Input Sanity Fix
   This code is intentionally inside the Firebase module script so it can access logs / PROGRAM / $ safely.
*/
const COACH_MOVEMENT_GROUPS = {
  "Barbell Bench Press":"horizontal_press","Dumbbell Bench Press":"horizontal_press","Machine Chest Press":"horizontal_press","Smith Bench Press":"horizontal_press",
  "Incline Dumbbell Press":"incline_press","Incline Machine Press":"incline_press","Incline Barbell Press":"incline_press",
  "Cable Fly":"chest_fly","Pec Deck":"chest_fly",
  "Seated Shoulder Press":"shoulder_press","Machine Shoulder Press":"shoulder_press","Dumbbell Shoulder Press":"shoulder_press","Smith Machine Shoulder Press":"shoulder_press",
  "Dumbbell Lateral Raise":"lateral_raise","Cable Lateral Raise":"lateral_raise","Machine Lateral Raise":"lateral_raise",
  "Cable Triceps Pushdown":"triceps_extension","Rope Triceps Pushdown":"triceps_extension","Overhead Triceps Extension":"triceps_extension","Single Arm Cable Pushdown":"triceps_extension","Machine Dip":"triceps_press",
  "Lat Pulldown":"vertical_pull","Pull Up":"vertical_pull","Assisted Pull Up":"vertical_pull",
  "Seated Cable Row":"horizontal_pull","Chest Supported Row":"horizontal_pull","Barbell Row":"horizontal_pull","Machine Row":"horizontal_pull",
  "Face Pull":"rear_delt","Reverse Pec Deck":"rear_delt",
  "Dumbbell Curl":"biceps_curl","Cable Curl":"biceps_curl","Machine Preacher Curl":"biceps_curl","Hammer Curl":"biceps_curl",
  "Back Squat":"squat","Hack Squat":"squat","Smith Squat":"squat","Leg Press":"leg_press","Leg Extension":"knee_extension",
  "Romanian Deadlift":"hip_hinge","Seated Leg Curl":"knee_flexion","Prone Leg Curl":"knee_flexion","Standing Leg Curl":"knee_flexion","Lying Leg Curl":"knee_flexion",
  "Standing Calf Raise":"calf_raise","Seated Calf Raise":"calf_raise","Single-leg Dumbbell Calf Raise":"calf_raise"
};
function movementGroup(ex){return COACH_MOVEMENT_GROUPS[String(ex||"").trim()] || String(ex||"").trim() || "unknown";}
function plannedProgramRow(ex){return (PROGRAM||[]).find(p=>p[2]===ex)||null;}







function coachSetScore(x){const w=Number(x.weight||0), reps=Number(x.reps||0), rir=Number(x.rir??2); return w*reps*(1+(Math.max(0,3-rir)*0.03));}
function coachProductiveSet(x){
  const w=Number(x.weight||0), reps=Number(x.reps||0), rir=Number(x.rir??2);
  if(!w||!reps)return false;
  if(reps<5)return false;
  if(reps>30)return false;
  if(rir===0&&reps<=5)return false;
  return true;
}
function coachMedian(arr){
  if(!arr.length)return 0;
  const a=[...arr].sort((x,y)=>x-y), m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function plateauSessionGroups(ex){
  const rows=coachSafeRows(ex,{allWeeks:true}).filter(coachProductiveSet);
  const map={};
  rows.forEach(x=>{
    const k=String(x.date||"unknown")+"_"+String(x.week||x.autoWeek||"");
    if(!map[k])map[k]=[];
    map[k].push(x);
  });
  return Object.values(map).map(items=>{
    const date=items.map(x=>String(x.date||"")).sort().pop()||"";
    const scores=items.map(coachSetScore);
    const top=Math.max(...scores), med=coachMedian(scores);
    const avgRir=items.reduce((a,x)=>a+Number(x.rir??2),0)/items.length;
    return {date,items,score:top*0.6+med*0.4,avgRir,count:items.length};
  }).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
}
function plateauDetection(ex){
  const sessions=plateauSessionGroups(ex);
  if(sessions.length<2)return {status:"Insufficient Data",score:0,confidence:20,note:"ข้อมูล productive set ยังไม่พอ หรือถูกกรอง warmup/outlier ออก"};
  const recent=sessions.slice(-5);
  const last=recent[recent.length-1];
  const base=recent.length>=3?coachMedian(recent.slice(0,-1).map(s=>s.score)):recent[recent.length-2].score;
  const delta=base?((last.score-base)/base)*100:0;
  const confidence=Math.min(95,Math.max(35,sessions.length*18+last.count*5));
  if(delta<-7)return {status:"Recovery Drop",score:Math.round(delta*10)/10,confidence,note:"performance ลดลงชัด หลังตัด warmup/outlier แล้ว"};
  if(Math.abs(delta)<=2&&last.avgRir<=1.2&&sessions.length>=3)return {status:"Possible Plateau",score:Math.round(delta*10)/10,confidence,note:"แนวโน้มเริ่มนิ่งและใกล้ failure"};
  if(delta>2)return {status:"Improving",score:Math.round(delta*10)/10,confidence,note:"แนวโน้มยังดีจาก rolling productive sets"};
  return {status:"Stable",score:Math.round(delta*10)/10,confidence,note:"ทรงตัว ยังไม่ต้องรีบเพิ่มน้ำหนัก"};
}
function formatPlateauResult(ex,r){
  let dot="🟢";
  if(r.status==="Recovery Drop")dot="🟠";
  if(r.status==="Possible Plateau")dot="🔴";
  if(r.status==="Insufficient Data")dot="⚪";
  return '<div style="margin:14px 0">'+dot+' <b>'+ex+'</b>: '+r.status+'<br><span class="small">'+r.note+'<br>Trend: '+r.score+'% • Confidence: '+r.confidence+'%</span></div>';
}
function safeExercisesForPlateau(){
  const ad=typeof activeDay==="function"?activeDay():null;
  const active=ad&&String(ad).startsWith("Day")?(PROGRAM||[]).filter(p=>p[0]===ad).map(p=>p[2]):[];
  const logged=[...new Set((logs||[]).map(x=>x.plannedExercise||x.exercise).filter(Boolean))];
  const program=[...new Set((PROGRAM||[]).map(p=>p[2]))];
  return [...new Set([...active,...logged,...program])];
}
function renderPlateauDetectionSafe(){
  try{
    const box=$("plateauBox")||$("plateauDetection")||$("plateauDebug");
    if(!box)return;
    const exs=safeExercisesForPlateau();
    box.innerHTML=exs.map(ex=>formatPlateauResult(ex,plateauDetection(ex))).join("") || '<div class="msg warn">ยังไม่มีข้อมูล Plateau</div>';
  }catch(e){
    const box=$("plateauBox")||$("plateauDetection")||$("plateauDebug");
    if(box)box.innerHTML='<div class="msg err">Plateau render error: '+e.message+'</div>';
  }
}

function autoApplyPersistentAlternative(){
  try{
    const m=typeof meta==="function"?meta():null;
    if(!m)return null;
    const plannedEx=m[2];
    const pref=typeof getPersistentAlt==="function"?getPersistentAlt(plannedEx):null;
    if(pref&&pref.name&&movementGroup(pref.name)===movementGroup(plannedEx)){
      selectedAlt={name:pref.name,pattern:pref.pattern||"",query:pref.query||pref.name+" proper form",original:plannedEx,persistent:true};
      if($("persistentSubStatus")){
        $("persistentSubStatus").className="msg ok";
        $("persistentSubStatus").innerHTML='Persistent Alternative: <b>'+pref.name+'</b> แทน '+plannedEx+'<br><span class="small">auto-applied</span>';
      }
      return selectedAlt;
    }
    return null;
  }catch(e){return null;}
}
function coachCoreStatusPanel(){
  const setup=document.getElementById("setup");
  if(!setup||document.getElementById("coachCoreStatusPanel"))return;
  const p=document.createElement("div");
  p.id="coachCoreStatusPanel";
  p.className="card";
  p.innerHTML='<h3>Coach Core Stabilization</h3><div class="msg ok">v5.2.6<br>Module-scoped logs access: FIXED<br>Plateau: productive trend + full exercise list<br>History Remap: movement guard<br>Alternative: auto apply guard</div>';
  setup.appendChild(p);
}
function coachCoreRun(){ if(window.__v404TooSoon&&window.__v404TooSoon('coachCoreRun',1200)) return; 
  try{autoApplyPersistentAlternative();}catch(e){}
  try{historySummaryForCurrent();}catch(e){}
  try{renderPlateauDetectionSafe();}catch(e){}
  try{coachCoreStatusPanel();}catch(e){}
}
window.addEventListener("load",function(){
  setTimeout(function(){try{ if(typeof coachCoreRun==="function"){ coachCoreRun(); } else if(typeof window!=="undefined" && typeof window.coachCoreRun==="function"){ window.coachCoreRun(); } }catch(_){} },600);
  setTimeout(function(){try{ if(typeof coachCoreRun==="function"){ coachCoreRun(); } else if(typeof window!=="undefined" && typeof window.coachCoreRun==="function"){ window.coachCoreRun(); } }catch(_){} },1500);
  setTimeout(function(){try{ if(typeof coachCoreRun==="function"){ coachCoreRun(); } else if(typeof window!=="undefined" && typeof window.coachCoreRun==="function"){ window.coachCoreRun(); } }catch(_){} },3000);
});


function historyRowsByExactExercise(ex){
  ex=String(ex||"").trim();
  return (logs||[]).filter(x=>String(x.exercise||"").trim()===ex || String(x.plannedExercise||"").trim()===ex);
}
function resolveHistorySource(plannedEx){
  const planned=String(plannedEx||"").trim();
  const group=movementGroup(planned);
  const candidates=[];
  try{if(selectedAlt&&selectedAlt.name&&(!selectedAlt.original||selectedAlt.original===planned))candidates.push({source:selectedAlt.name,reason:"selected alternative"});}catch(e){}
  try{if(typeof getPersistentAlt==="function"){const p=getPersistentAlt(planned);if(p&&p.name)candidates.push({source:p.name,reason:"persistent alternative"});}}catch(e){}
  candidates.push({source:planned,reason:"planned/original exercise"});
  try{if(typeof altMemoryForPlanned==="function"){const mm=altMemoryForPlanned(planned);if(mm&&mm.name)candidates.push({source:mm.name,reason:"alternative memory"});}}catch(e){}
  const seen=new Set();
  const safe=candidates.filter(c=>{const n=String(c.source||"").trim();if(!n||seen.has(n))return false;seen.add(n);return movementGroup(n)===group;});
  for(const c of safe){
    const rows=historyRowsByExactExercise(c.source).filter(x=>Number(x.weight)>0&&Number(x.reps)>0);
    if(rows.length)return {source:c.source,reason:c.reason,rows,fallback:false};
  }
  const groupRows=(logs||[]).filter(x=>(movementGroup(x.exercise)===group||movementGroup(x.plannedExercise||x.exercise)===group)&&Number(x.weight)>0&&Number(x.reps)>0);
  if(groupRows.length){
    const sorted=[...groupRows].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0));
    return {source:sorted[0].exercise||sorted[0].plannedExercise,reason:"same movement fallback",rows:sorted,fallback:true};
  }
  return {source:safe[0]?.source||planned,reason:"no safe history",rows:[],fallback:false};
}
function allowedHistoryExercises(plannedEx){
  const r=resolveHistorySource(plannedEx);
  const planned=String(plannedEx||"").trim();
  const out=new Set([planned,r.source].filter(Boolean));
  return [...out];
}
function safeEffectiveExerciseForHistory(plannedEx){return resolveHistorySource(plannedEx).source||plannedEx;}
function effectiveExerciseForHistory(plannedEx){return safeEffectiveExerciseForHistory(plannedEx);}
function coachSafeRows(plannedEx,opts={}){
  const r=resolveHistorySource(plannedEx);
  const row=plannedProgramRow(plannedEx);
  const plannedDay=row?row[0]:null;
  const currentWeek=typeof autoWeek==="function"?Number(autoWeek()):null;
  return (r.rows||[]).filter(x=>{
    const dayOk=!plannedDay||!x.day||x.day===plannedDay||r.fallback;
    const wk=Number(x.week||x.autoWeek||0);
    const weekOk=opts.allWeeks||!currentWeek||!wk||wk<=currentWeek;
    return dayOk&&weekOk;
  });
}
function safeHistoryRows(plannedEx){return coachSafeRows(plannedEx,{allWeeks:true});}
function latestHistoricalSet(plannedEx){
  return coachSafeRows(plannedEx,{allWeeks:true}).filter(x=>Number(x.weight)>0&&Number(x.reps)>0).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0))[0]||null;
}
function topHistoricalSet(plannedEx){
  const arr=coachSafeRows(plannedEx,{allWeeks:true}).filter(x=>Number(x.weight)>0&&Number(x.reps)>0);
  if(!arr.length)return null;
  return arr.reduce((best,x)=>{
    const bw=Number(best.weight||0),xw=Number(x.weight||0),bs=bw*Number(best.reps||0),xs=xw*Number(x.reps||0);
    return (xw>bw||(xw===bw&&xs>bs))?x:best;
  },arr[0]);
}
function historySummaryForCurrent(){
  try{
    const m=typeof meta==="function"?meta():null;
    if(!m||!$("historyRemapBox"))return;
    const planned=m[2], unit=$("unit")?$("unit").value:"kg";
    const r=resolveHistorySource(planned), latest=latestHistoricalSet(planned), best=topHistoricalSet(planned);
    if(!latest){
      $("historyRemapBox").className="msg warn";
      $("historyRemapBox").innerHTML='History Source: ยังไม่มีประวัติของ <b>'+r.source+'</b><br><span class="small">Priority: Alternative → Original → Same movement fallback</span>';
      return;
    }
    $("historyRemapBox").className=r.fallback?"msg warn":"msg info";
    $("historyRemapBox").innerHTML='History Source: <b>'+r.source+'</b> <span class="small">('+r.reason+(r.fallback?' / fallback':'')+')</span><br>'+
    'ล่าสุด: '+fromKg(latest.weight,unit)+' '+unit+' × '+(latest.reps||"-")+' reps (RIR '+(latest.rir??"-")+')<br>'+
    'Best: '+fromKg(best.weight,unit)+' '+unit+' × '+(best.reps||"-")+' reps';
  }catch(e){}
}
function currentEffectiveDisplayExercise(){
  try{
    const m=typeof meta==="function"?meta():null;if(!m)return "";
    const planned=m[2];
    if(selectedAlt&&selectedAlt.name&&(!selectedAlt.original||selectedAlt.original===planned))return selectedAlt.name;
    if(typeof getPersistentAlt==="function"){const p=getPersistentAlt(planned);if(p&&p.name&&movementGroup(p.name)===movementGroup(planned))return p.name;}
    return planned;
  }catch(e){return "";}
}

function syncAlternativeNameDisplay(){
  try{
    const m=typeof meta==="function"?meta():null;if(!m)return;
    const planned=m[2], effective=currentEffectiveDisplayExercise();
    const box=$("persistentSubStatus");
    if(box&&effective&&effective!==planned){
      box.className="msg ok";
      box.innerHTML="Persistent Alternative: <b>"+effective+"</b> แทน "+planned+"<br><span class='small'>auto-applied</span>";
    }
  }catch(e){}
}

window.addEventListener("load",function(){setTimeout(function(){try{ if(typeof fullStabilizationRun==="function"){ fullStabilizationRun(); } else if(typeof window!=="undefined" && typeof window.fullStabilizationRun==="function"){ window.fullStabilizationRun(); } }catch(_){} },800);});


/* v5.2.6 Stable Recovery: scoped complete card and throttled stabilization */
function renderExerciseCompleteState(){
  try{
    const m=typeof meta==="function"?meta():null;
    if(!m) return;

    const logPage=document.getElementById("log");
    if(!logPage) return;

    const active=document.querySelector(".page.active");
    const logIsActive=!active || active.id==="log";

    let box=document.getElementById("exerciseCompleteBox");
    if(!box){
      box=document.createElement("div");
      box.id="exerciseCompleteBox";
      box.className="msg ok";
      logPage.appendChild(box);
    }else if(box.parentElement!==logPage){
      logPage.appendChild(box);
    }

    const planned=m[2];
    const sets=Number(m[3]||0);
    const effective=(typeof currentEffectiveDisplayExercise==="function" ? currentEffectiveDisplayExercise() : planned) || planned;
    const completed=Math.max(Number(countActive(effective)||0),Number(countActive(planned)||0));

    if(completed>=sets && sets>0){
      const today=($("date")&&$("date").value)||"";
      const rows=(logs||[]).filter(x=>{
        const sameEx=x.exercise===effective || x.exercise===planned || x.plannedExercise===planned;
        const sameDate=!today || String(x.date||"")===String(today);
        return sameEx && sameDate;
      });
      const vol=rows.reduce((a,x)=>a+Number(x.weight||0)*Number(x.reps||0),0);
      const best=rows.filter(x=>Number(x.weight)>0&&Number(x.reps)>0).sort((a,b)=>(Number(b.weight)*Number(b.reps))-(Number(a.weight)*Number(a.reps)))[0];

      box.style.display=logIsActive?"":"none";
      box.innerHTML='✅ Exercise Complete<br><b>'+effective+'</b><br>Completed '+completed+' / '+sets+' sets<br>Volume: '+Math.round(vol)+' kg'+(best?'<br>Best Set: '+best.weight+' kg × '+best.reps:'')+'<br><span class="small">ถ้าต้องการแก้ไขให้ลบเซตล่าสุดหรือกด Reset</span>';

      const btn=document.querySelector("#saveBtn")||[...document.querySelectorAll("button")].find(b=>b.textContent.includes("บันทึกเซตนี้"));
      if(btn && logIsActive){btn.disabled=true;btn.style.opacity=".45";}
    }else{
      box.style.display="none";
      const btn=document.querySelector("#saveBtn")||[...document.querySelectorAll("button")].find(b=>b.textContent.includes("บันทึกเซตนี้"));
      if(btn){btn.disabled=false;btn.style.opacity="1";}
    }
  }catch(e){console.warn("renderExerciseCompleteState",e);}
}
function fullStabilizationRun(){ if(window.__v404TooSoon&&window.__v404TooSoon('fullStabilizationRun',1200)) return; 
  try{
    const now=Date.now();
    if(window.__v400LastStableRun && now-window.__v400LastStableRun<900) return;
    window.__v400LastStableRun=now;
  }catch(e){}
  try{autoApplyPersistentAlternative();}catch(e){}
  try{syncAlternativeNameDisplay();}catch(e){}
  try{historySummaryForCurrent();}catch(e){}
  try{renderExerciseCompleteState();}catch(e){}
  try{renderPlateauDetectionSafe();}catch(e){}
}





/* v5.2.6 Date Input Sanity Fix */
function v403DayExercises(dayName){
  try{return (PROGRAM||[]).filter(p=>p[0]===dayName);}catch(e){return [];}
}
function v403DayCompletion(dayName){
  const items=v403DayExercises(dayName);
  const rows=items.map(p=>{
    const ex=p[2], sets=Number(p[3]||0);
    let effective=ex;
    try{
      const pref=typeof getPersistentAlt==="function"?getPersistentAlt(ex):null;
      if(pref&&pref.name&&movementGroup(pref.name)===movementGroup(ex)) effective=pref.name;
    }catch(e){}
    const done=Math.max(Number(countActive(ex)||0),Number(countActive(effective)||0));
    return {planned:ex,effective,sets,done,complete:sets>0&&done>=sets};
  });
  return {items:rows,total:rows.length,complete:rows.filter(x=>x.complete).length,allComplete:rows.length>0&&rows.every(x=>x.complete)};
}
function v403SkipTargetDay(){
  try{
    const ad=typeof activeDay==="function"?activeDay():"";
    const order=["Day 1","Day 2","Day 4","Day 5"];
    const i=order.indexOf(ad);
    return i>=0 ? order[(i+1)%order.length] : "Next Day";
  }catch(e){return "Next Day";}
}
function v403SaveSkipEvent(targetDay,reason){
  const payload={type:"DAY_SKIP_OVERRIDE",date:($("date")&&$("date").value)||todayLocalV521(),fromDay:(typeof activeDay==="function"?activeDay():""),toDay:targetDay,reason:reason||"manual override",createdAt:new Date().toISOString()};
  try{
    const arr=JSON.parse(localStorage.getItem("workoutSkipEvents")||"[]");
    arr.push(payload);
    localStorage.setItem("workoutSkipEvents",JSON.stringify(arr.slice(-200)));
    localStorage.setItem("workoutSkipOverrideTarget",targetDay);
    localStorage.setItem("workoutSkipOverrideAt",payload.createdAt);
  }catch(e){}
  return payload;
}
function v403RequestSkipDay(){
  const target=v403SkipTargetDay();
  if(!confirm("ต้องการปลดล็อก/ข้ามไปเล่น "+target+" ใช่ไหม?\n\nระบบจะบันทึกว่าเป็น Manual Skip Override")) return;
  const ev=v403SaveSkipEvent(target,"user confirmed skip override");
  alert("บันทึกการข้ามวันแล้ว: "+ev.fromDay+" → "+ev.toDay);
  v403RenderUnlockPanel();
}
function v403RenderUnlockPanel(){
  try{
    const logPage=document.getElementById("log");
    if(!logPage) return;
    let panel=document.getElementById("unlockOverridePanel");
    if(!panel){
      panel=document.createElement("div");
      panel.id="unlockOverridePanel";
      panel.className="card";
      logPage.insertBefore(panel, logPage.firstChild);
    }
    const day=typeof activeDay==="function"?activeDay():"";
    const c=v403DayCompletion(day);
    const target=v403SkipTargetDay();
    const last=localStorage.getItem("workoutSkipOverrideTarget")||"";
    panel.innerHTML='<h3>'+(c.allComplete?'✅ Day Complete':'🔓 Day Override')+'</h3>'+
      '<div class="msg '+(c.allComplete?'ok':'warn')+'"><b>'+day+'</b><br>Progress: '+c.complete+' / '+c.total+' ท่า'+
      (c.allComplete?'<br>เล่นครบวันนี้แล้ว ระบบจะกันการบันทึกซ้ำ':'<br>ถ้าต้องการข้ามวัน ให้กดยืนยันด้านล่าง ระบบจะบันทึกเหตุการณ์ไว้')+
      (last?'<br><span class="small">ล่าสุดข้ามไป: '+last+'</span>':'')+'</div>'+
      '<button id="unlockOverrideBtn" class="btn" type="button">ปลดล็อก / ข้ามไปเล่น '+target+'</button>'+
      '<details style="margin-top:10px"><summary>รายละเอียดวันนี้</summary><div class="small">'+c.items.map(x=>x.effective+' — '+x.done+'/'+x.sets).join("<br>")+'</div></details>';
    const btn=document.getElementById("unlockOverrideBtn");
    if(btn&&!btn.dataset.bound){btn.dataset.bound="1";btn.onclick=v403RequestSkipDay;}
    const saveBtn=document.querySelector("#saveBtn")||[...document.querySelectorAll("button")].find(b=>b.textContent.includes("บันทึกเซตนี้"));
    if(saveBtn){
      const adLock=(typeof activeDay==="function") ? activeDay() : "";
      const stLock=(typeof nextState==="function") ? nextState() : {};
      const lockedByDay = !!(c.allComplete || stLock.restLock || stLock.dateLock || adLock==="REST_LOCK" || adLock==="DAY_DATE_LOCK" || adLock==="COMPLETE");
      saveBtn.disabled=lockedByDay;
      saveBtn.style.opacity=lockedByDay?".45":"1";
    }
  }catch(e){console.warn("v403RenderUnlockPanel",e);}
}
function v403Run(){ if(window.__v404TooSoon&&window.__v404TooSoon('v403Run',900)) return; 
  try{v403RenderUnlockPanel();}catch(e){}
}


/* ===== v5.2.6 Complete Analytics / Export / Coach ===== */
function v5SafeLogs(){try{return Array.isArray(logs)?logs:[]}catch(e){return []}}
function v5Date(){return $("date")?.value || (typeof today==="function"?today():todayLocalV521())}
function v5Volume(x){return Number(x.weight||0)*Number(x.reps||0)}
function v5PlannedExercise(x){return x.plannedExercise||x.exercise||""}
function v5MuscleFor(ex){
  try{const p=(PROGRAM||[]).find(r=>r[2]===ex);return p?p[5]:"Other"}catch(e){return "Other"}
}
function v5DailyLogs(date=v5Date()){return v5SafeLogs().filter(x=>x.date===date)}
function v5DrawBars(canvasId, rows, opts={}){
  const cv=$(canvasId); if(!cv||!cv.getContext) return;
  const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#020617"; ctx.fillRect(0,0,w,h);
  const shown=rows.slice(0,opts.limit||8), max=Math.max(1,...shown.map(r=>Number(r[1]||0)));
  const gap=(w-80)/Math.max(1,shown.length), barW=Math.max(24,Math.min(54,gap*.42));
  ctx.textAlign="center";
  shown.forEach(([label,value],i)=>{
    const x=40+i*gap, bh=(h-78)*(Number(value||0)/max), y=h-46-bh;
    const grad=ctx.createLinearGradient(0,y,0,h-46);
    grad.addColorStop(0, opts.c1||"#60a5fa");
    grad.addColorStop(1, opts.c2||"#8b5cf6");
    ctx.fillStyle=grad; ctx.fillRect(x,y,barW,bh);
    ctx.font="14px sans-serif"; ctx.fillStyle="#93c5fd"; ctx.fillText(Math.round(value),x+barW/2,Math.max(18,y-8));
    ctx.font="16px sans-serif"; ctx.fillStyle="#e5e7eb"; ctx.fillText(String(label).slice(0,9),x+barW/2,h-16);
  });
}
function v5RenderMuscleBalance(){
  try{
    const map={};
    v5SafeLogs().forEach(x=>{const m=v5MuscleFor(v5PlannedExercise(x)); map[m]=(map[m]||0)+v5Volume(x);});
    const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]);
    v5DrawBars("v5MuscleChart", rows, {limit:8,c1:"#22c55e",c2:"#60a5fa"});
    const el=$("v5MuscleInsight");
    if(el){
      if(!rows.length){el.className="msg info";el.innerHTML="ยังไม่มีข้อมูล Muscle Balance";return;}
      const top=rows[0], low=rows[rows.length-1];
      el.className="msg ok";
      el.innerHTML=`มากสุด: <b>${top[0]}</b> ${Math.round(top[1])} kg • น้อยสุด: <b>${low[0]}</b> ${Math.round(low[1])} kg`;
    }
  }catch(e){console.warn("v5RenderMuscleBalance",e)}
}
function v5RenderPRBoard(){
  try{
    const el=$("v5PRBoard"); if(!el) return;
    const best={};
    v5SafeLogs().forEach(x=>{
      const ex=v5PlannedExercise(x); if(!ex) return;
      const score=v5Volume(x);
      if(!best[ex]||score>best[ex].score) best[ex]={...x,score};
    });
    const rows=Object.entries(best).sort((a,b)=>b[1].score-a[1].score).slice(0,10);
    if(!rows.length){el.innerHTML="ยังไม่มีข้อมูล PR";return;}
    el.innerHTML=rows.map(([ex,x])=>`<div class="v5-pr-card"><b>${ex}</b><span>${Number(x.weight||0).toFixed(1)} kg × ${x.reps||0} reps</span><small>${x.date||""}</small></div>`).join("");
  }catch(e){console.warn("v5RenderPRBoard",e)}
}
function v5RecoveryFrom(x={}){
  const sleep=Number(x.sleepHours||$("sleepHours")?.value||7);
  const soreness=Number(x.soreness||$("soreness")?.value||2);
  const stress=Number(x.stress||$("stress")?.value||2);
  const recovery=Math.max(0,Math.min(100,Math.round((sleep/8)*55+(6-soreness)*5+(6-stress)*5)));
  const fatigue=Math.max(0,Math.min(100,100-recovery+Math.round((soreness+stress)*4)));
  return {sleep,soreness,stress,recovery,fatigue};
}
function v5RenderRecoveryTrend(){
  try{
    const byDate={};
    v5SafeLogs().forEach(x=>{if(x.date)byDate[x.date]=x;});
    const rows=Object.entries(byDate).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14).map(([d,x])=>[d.slice(5),v5RecoveryFrom(x).recovery]);
    v5DrawBars("v5RecoveryChart",rows,{limit:14,c1:"#38bdf8",c2:"#22c55e"});
    v5DrawBars("v5CoachTrend",rows,{limit:14,c1:"#a78bfa",c2:"#60a5fa"});
    const last=rows[rows.length-1];
    if($("v5RecoveryInsight")) $("v5RecoveryInsight").innerHTML=last?`Recovery ล่าสุด: <b>${last[1]}</b>`:"ยังไม่มีข้อมูล Recovery";
    if($("v5CoachTrendText")) $("v5CoachTrendText").innerHTML=last?`Trend ล่าสุด: <b>${last[1]}</b> / 100`:"ยังไม่มีข้อมูล trend";
  }catch(e){console.warn("v5RenderRecoveryTrend",e)}
}
function v5RenderLogSummary(){
  try{
    const el=$("v5LogSummary"); if(!el) return;
    const rows=v5DailyLogs();
    if(!rows.length){el.className="msg info";el.innerHTML="ยังไม่มีข้อมูลวันนี้";return;}
    const vol=rows.reduce((a,x)=>a+v5Volume(x),0);
    const exs=[...new Set(rows.map(v5PlannedExercise))].filter(Boolean);
    el.className="msg ok";
    el.innerHTML=`วันนี้: <b>${rows.length}</b> sets • Volume <b>${Math.round(vol)}</b> kg<br>Exercises: ${exs.join(", ")}`;
  }catch(e){console.warn("v5RenderLogSummary",e)}
}
function v5EnhanceCalendar(){
  try{
    const doneDates=new Set(v5SafeLogs().map(x=>x.date).filter(Boolean));
    document.querySelectorAll("#calGrid > *").forEach(cell=>{
      const text=(cell.textContent||"").trim();
      const n=parseInt(text,10);
      if(!n||!calMonth) return;
      const d=new Date(calMonth.getFullYear(),calMonth.getMonth(),n);
      const key=keyD?keyD(d):d.toISOString().slice(0,10);
      cell.classList.toggle("completed",doneDates.has(key));
    });
  }catch(e){}
}
function v5ExportJson(){
  const payload={version:"v5.2.6",exportedAt:new Date().toISOString(),logs:v5SafeLogs()};
  const text=JSON.stringify(payload,null,2);
  if($("v5BackupText")) $("v5BackupText").value=text;
  try{navigator.clipboard&&navigator.clipboard.writeText(text)}catch(e){}
}
function v5ExportCsv(){
  const cols=["date","week","day","exercise","plannedExercise","weight","unit","reps","rir","volume","note"];
  const rows=[cols.join(",")].concat(v5SafeLogs().map(x=>cols.map(c=>JSON.stringify(c==="volume"?v5Volume(x):(x[c]??""))).join(",")));
  const text=rows.join("\n");
  if($("v5BackupText")) $("v5BackupText").value=text;
  try{navigator.clipboard&&navigator.clipboard.writeText(text)}catch(e){}
}
function v5BackupLocal(){
  const text=JSON.stringify({logs:v5SafeLogs(),backupAt:new Date().toISOString()},null,2);
  localStorage.setItem("workoutV5LocalBackup",text);
  if($("v5BackupText")) $("v5BackupText").value=text;
}
function v5RestoreLocal(){
  const text=$("v5BackupText")?.value || localStorage.getItem("workoutV5LocalBackup") || "";
  if(!text){alert("ไม่มี backup payload");return;}
  localStorage.setItem("workoutV5RestorePayload",text);
  alert("เก็บ payload สำหรับ restore แล้ว: ขั้นต่อไปต้องทำ import เข้า Firestore แบบปลอดภัย");
}
function v5BindExport(){
  [["v5ExportJsonBtn",v5ExportJson],["v5ExportCsvBtn",v5ExportCsv],["v5BackupLocalBtn",v5BackupLocal],["v5RestoreLocalBtn",v5RestoreLocal]].forEach(([id,fn])=>{const b=$(id);if(b&&!b.dataset.v5Bound){b.dataset.v5Bound="1";b.onclick=fn;}});
}
function v5RenderAll(){
  v5RenderMuscleBalance();
  v5RenderPRBoard();
  v5RenderRecoveryTrend();
  v5RenderLogSummary();
  v5EnhanceCalendar();
  v5BindExport();
}

function renderAll(){
  clearTimeout(__w534RenderTimer);
  setTimeout(()=>{try{v5RenderAll()}catch(e){}},120);
  setTimeout(()=>{try{v430RenderAllFeaturePanels()}catch(e){}},160);
  setTimeout(()=>{try{renderPlateauDetectionSafe()}catch(e){}},220);
  try{bindAutoPersistentAlternative();autoApplyPersistentAlternative();bindStableRenderTriggers();bindCanonicalExerciseSwitch();}catch(e){}
  try{ if($('exercise')) applyCanonicalSetDisplay($('exercise').value); }catch(e){}
  try{exSessionBindDropdown(); if($('exercise')) exSessionRestore($('exercise').value);}catch(e){}
  try{calSyncBind();calSyncUpdateStatus();bindPersistentAltButtons();bindAiCoachButtons();}catch(e){}
  w534DebouncedRender(w534ActivePage(), 30);
}
updateDateStatus();renderAll();

document.addEventListener("DOMContentLoaded",()=>bindAiCoachButtons());

window.addEventListener('load',()=>{setTimeout(()=>{try{v430RestoreDraft();v430RenderAllFeaturePanels();}catch(e){}},900);});



/* ===== v5.2.6 Feature Functions ===== */
function v430SafeLogs(){try{return Array.isArray(logs)?logs:[]}catch(e){return []}}
function v430CurrentExercise(){return $("exercise")?$("exercise").value:""}
function v430Today(){return (typeof today==='function'?today():todayLocalV521())}
function v430SessionKey(){return "workoutDraftSessionV430"}
function v430SaveResumeState(){try{const st={date:$("date")?.value||v430Today(),week:$("week")?.value||"",day:typeof activeDay==="function"?activeDay():"",exercise:v430CurrentExercise(),set:$("setNo")?.textContent||"",target:$("targetShow")?.textContent||"",updatedAt:new Date().toISOString()};localStorage.setItem("workoutResumeState",JSON.stringify(st));}catch(e){}}


function v430RenderResume(){
  try{
    const el=$("v430ResumeBox"); if(!el) return;
    const btn=$("v430ResumeBtn");
    const st=JSON.parse(localStorage.getItem("workoutResumeState")||"null");
    if(!st || !st.exercise){
      el.className="msg info";
      el.innerHTML="ยังไม่มี session ล่าสุด<br><span class='small'>ปุ่มนี้จะใช้ได้หลังจากเริ่มกรอกหรือเล่น workout แล้ว</span>";
      if(btn){btn.disabled=true;btn.textContent="ยังไม่มี Session ให้เล่นต่อ";}
      return;
    }
    el.className="msg ok";
    el.innerHTML=`ล่าสุด<br><b>${st.week?`Week ${st.week}`:""}</b> ${st.day||""}<br>${st.exercise||"-"}<br>Set ${st.set||"-"} / ${st.target||"-"}<br><span class="small">${st.date||""}</span>`;
    if(btn){
      btn.disabled=false;
      btn.textContent="กลับไปเล่นต่อ";
      if(!btn.dataset.bound){
        btn.dataset.bound="1";
        btn.onclick=()=>{try{if(st.date&&$("date"))$("date").value=st.date;if(st.exercise&&$("exercise"))$("exercise").value=st.exercise;if(window.v430ActivatePage)window.v430ActivatePage("log");renderAll();}catch(e){}};
      }
    }
  }catch(e){console.warn("v430RenderResume",e)}
}

function v430BindDraftSave(){["weight","reps","rir","note","tempo","repQuality","biasMode","exercise","date"].forEach(id=>{const el=$(id);if(!el||el.dataset.v430DraftBound==="1")return;el.dataset.v430DraftBound="1";el.addEventListener("input",v430SaveDraft);el.addEventListener("change",v430SaveDraft);});}
function v430SaveDraft(){try{const d={date:$("date")?.value||"",exercise:$("exercise")?.value||"",weight:$("weight")?.value||"",reps:$("reps")?.value||"",rir:$("rir")?.value||"",note:$("note")?.value||"",tempo:$("tempo")?.value||"",repQuality:$("repQuality")?.value||"",biasMode:$("biasMode")?.value||"",updatedAt:new Date().toISOString()};localStorage.setItem(v430SessionKey(),JSON.stringify(d));const s=$("v430DraftStatus");if(s){s.className="msg ok";s.innerHTML="Draft Save: บันทึกอัตโนมัติแล้ว";}v430SaveResumeState();}catch(e){}}
function v430RestoreDraft(){try{const d=JSON.parse(localStorage.getItem(v430SessionKey())||"null");if(!d)return;[["date","date"],["exercise","exercise"],["weight","weight"],["reps","reps"],["rir","rir"],["note","note"],["tempo","tempo"],["repQuality","repQuality"],["biasMode","biasMode"]].forEach(([id,k])=>{if($(id)&&d[k]!==undefined&&d[k]!==null&&d[k]!=="")$(id).value=d[k]});const s=$("v430DraftStatus");if(s){s.className="msg info";s.innerHTML="Draft Save: กู้ข้อมูลล่าสุดแล้ว";}}catch(e){}}
function v430BestByExercise(){const map={};v430SafeLogs().forEach(x=>{const ex=x.exercise||x.plannedExercise;if(!ex)return;const score=Number(x.weight||0)*Number(x.reps||0);if(!map[ex]||score>map[ex].score)map[ex]={...x,score};});return map;}
function v430RenderPRDashboard(){try{const el=$("v430PrDashboard");if(!el)return;const rows=Object.entries(v430BestByExercise()).sort((a,b)=>b[1].score-a[1].score).slice(0,10);if(!rows.length){el.className="msg info";el.innerHTML="ยังไม่มี PR";return;}el.className="msg ok";el.innerHTML=rows.map(([ex,x],i)=>`${i+1}. <b>${ex}</b><br>${Number(x.weight||0).toFixed(1)} kg × ${x.reps||0}`).join("<hr>");}catch(e){console.warn("v430RenderPRDashboard",e)}}
function v430MuscleVolume(days=14){const since=new Date();since.setDate(since.getDate()-days);const m={};v430SafeLogs().forEach(x=>{try{if(x.date&&typeof parseD==="function"&&parseD(x.date)<since)return;}catch(e){}const ex=x.plannedExercise||x.exercise||"";const p=(PROGRAM||[]).find(r=>r[2]===ex)||[];const muscle=p[5]||"Other";m[muscle]=(m[muscle]||0)+(Number(x.weight||0)*Number(x.reps||0));});return m;}


function v430RenderVolumeDashboard(){
  try{
    const box=$("v430VolumeSummary"); if(!box) return;
    const rows=Object.entries(v430MuscleVolume(14)).sort((a,b)=>b[1]-a[1]);
    box.innerHTML=rows.length?rows.map(([k,v])=>`${k}: <b>${Math.round(v)}</b> kg`).join(" • "):"ยังไม่มีข้อมูล Volume";
    const cv=$("v430VolumeChart");
    if(cv&&cv.getContext){
      const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;
      ctx.clearRect(0,0,w,h); ctx.fillStyle="#020617"; ctx.fillRect(0,0,w,h);
      const shown=rows.slice(0,8), max=Math.max(1,...shown.map(r=>r[1]));
      const gap=(w-80)/Math.max(1,shown.length), barW=Math.max(28,Math.min(54,gap*.42));
      ctx.textAlign="center";
      shown.forEach(([k,v],i)=>{
        const x=40+i*gap, bh=(h-78)*(v/max), y=h-46-bh;
        const grad=ctx.createLinearGradient(0,y,0,h-46);
        grad.addColorStop(0,"#60a5fa"); grad.addColorStop(1,"#7c3aed");
        ctx.fillStyle=grad; ctx.fillRect(x,y,barW,bh);
        ctx.font="14px sans-serif"; ctx.fillStyle="#93c5fd"; ctx.fillText(Math.round(v),x+barW/2,Math.max(18,y-8));
        ctx.font="18px sans-serif"; ctx.fillStyle="#e5e7eb"; ctx.fillText(k.slice(0,9),x+barW/2,h-16);
      });
    }
  }catch(e){console.warn("v430RenderVolumeDashboard",e)}
}

function v430RecoveryScoreFrom(x){const sleep=Number(x.sleepHours||$("sleepHours")?.value||7);const soreness=Number(x.soreness||$("soreness")?.value||2);const stress=Number(x.stress||$("stress")?.value||2);const rec=Math.max(0,Math.min(100,Math.round((sleep/8)*55+(6-soreness)*5+(6-stress)*5)));const fatigue=Math.max(0,Math.min(100,100-rec+Math.round((soreness+stress)*4)));return{rec,fatigue,sleep,soreness,stress};}
function v430RenderRecoveryDashboard(){try{const el=$("v430RecoveryDash");if(!el)return;const latest=[...v430SafeLogs()].reverse().find(x=>x.sleepHours||x.soreness||x.stress)||{};const s=v430RecoveryScoreFrom(latest);el.className=s.rec>=65?"msg ok":s.rec>=45?"msg warn":"msg bad";el.innerHTML=`Recovery Score: <b>${s.rec}</b><br>Fatigue Risk: <b>${s.fatigue}</b><br>Sleep ${s.sleep}h • Soreness ${s.soreness} • Stress ${s.stress}`;}catch(e){console.warn("v430RenderRecoveryDashboard",e)}}
function v430RenderDeload(){try{const el=$("v430DeloadBox");if(!el)return;const s=v430RecoveryScoreFrom({});const recent=v430SafeLogs().slice(-30);const lowPerf=recent.filter(x=>Number(x.rir||2)<=0||String(x.note||"").includes("เจ็บ")).length;const suggest=s.fatigue>=65||lowPerf>=3;el.className=suggest?"msg warn":"msg ok";el.innerHTML=suggest?`⚠ Deload Recommended<br>ลด volume 30–40% / ใช้ machine stable / คุม RIR 2–3`:`ยังไม่จำเป็นต้อง deload<br>Recovery ${s.rec} / Fatigue ${s.fatigue}`;const btn=$("v430ApplyDeloadBtn");if(btn&&!btn.dataset.v430Bound){btn.dataset.v430Bound="1";btn.onclick=()=>{localStorage.setItem("workoutDeloadMode","ON");alert("เปิด Deload Suggestion แล้ว");v430RenderDeload();}}}catch(e){console.warn("v430RenderDeload",e)}}
function v430ExerciseDb(){try{const ex=v430CurrentExercise();const el=$("v430ExerciseDb");if(!el)return;const media=(typeof MEDIA_DB!=="undefined"&&MEDIA_DB[ex])?MEDIA_DB[ex]:{query:`${ex} proper form`,cue:"ตรวจ form ให้ตรงกับท่า คุม ROM และไม่มีจุดเจ็บ"};const alts=(ALT&&ALT[ex])?ALT[ex].map(a=>a[0]).join(", "):"ไม่มี alternative";el.innerHTML=`<b>${ex||"-"}</b><br>Cue: ${media.cue}<br>Search: ${media.query}<br>Alternative: ${alts}<br><span class="small">Mistake: อย่าเหวี่ยงน้ำหนัก / อย่าฝืนจุดเจ็บ / คุมช่วงลง</span>`;}catch(e){console.warn("v430ExerciseDb",e)}}
function v430AiSummary(){try{const el=$("v430AiSummary");if(!el)return;const d=$("date")?.value||v430Today();const rows=v430SafeLogs().filter(x=>x.date===d);if(!rows.length){el.className="msg info";el.innerHTML="ยังไม่มี log วันนี้";return;}const vol=rows.reduce((a,x)=>a+Number(x.weight||0)*Number(x.reps||0),0);const exs=[...new Set(rows.map(x=>x.exercise))].filter(Boolean);const s=v430RecoveryScoreFrom(rows[rows.length-1]||{});el.className="msg ok";el.innerHTML=`วันนี้บันทึก ${rows.length} sets<br>Volume รวม ${Math.round(vol)} kg<br>ท่าที่เล่น: ${exs.join(", ")}<br>Recovery ${s.rec} / Fatigue ${s.fatigue}<br>คำแนะนำ: ${s.fatigue>60?"คุม RIR 2–3 และอย่าเพิ่มน้ำหนัก":"เพิ่ม reps ก่อน แล้วค่อยเพิ่มน้ำหนักเมื่อถึง ceiling"}`;const btn=$("v430CopySummaryBtn");if(btn&&!btn.dataset.v430Bound){btn.dataset.v430Bound="1";btn.onclick=()=>navigator.clipboard&&navigator.clipboard.writeText(el.innerText);}}catch(e){console.warn("v430AiSummary",e)}}
function v430RenderAllFeaturePanels(){v430RenderResume();v430BindDraftSave();v430RenderPRDashboard();v430RenderVolumeDashboard();v430RenderRecoveryDashboard();v430RenderDeload();v430ExerciseDb();v430AiSummary();}


window.addEventListener('load',()=>{setTimeout(v5RenderAll,1200);});


window.addEventListener('load',function(){setTimeout(function(){try{bindLegacyMigration();checkLegacyLogsForMigration();}catch(e){}},1200);});



/* ===== v5.2.6 MIGRATION_BUTTON_FIX_CODE ===== */
function v503UpdateTeamStatus(){
  try{
    const st=$("teamSaveStatus");
    if(!st) return;
    st.className=teamId?"msg ok":"msg info";
    st.innerHTML=teamId
      ? "Team ID saved: <b>"+teamId+"</b><br><span class='small'>ข้อมูลจะแยกตาม Google Account</span>"
      : "Team ID ยังไม่บันทึก";
  }catch(e){}
}

function v503SaveTeamId(){
  try{
    const input=$("teamId");
    if(!input) return alert("ไม่พบช่อง Team ID");
    const val=String(input.value||"").trim();
    if(!val){
      const st=$("teamSaveStatus");
      if(st){st.className="msg warn";st.innerHTML="กรุณาใส่ Team ID ก่อน";}
      return alert("กรุณาใส่ Team ID ก่อน");
    }
    teamId=val;
    localStorage.setItem("teamId",teamId);
    v503UpdateTeamStatus();
    if($("userLine")) $("userLine").textContent=(user?(user.displayName||user.email):"Not login")+" / Team: "+teamId+" / "+VERSION;
    try{subscribe();}catch(e){console.warn("subscribe after save team",e);}
    setTimeout(function(){try{bindLegacyMigration();checkLegacyLogsForMigration();}catch(e){}},500);
  }catch(e){
    alert("Save Team ID error: "+e.message);
  }
}

function v503MigrationClick(){
  try{
    bindLegacyMigration();
    if(!user){
      const box=$("legacyMigrationBox");
      if(box){box.className="msg warn";box.innerHTML="กรุณา Login ก่อนตรวจ Log เก่า";}
      return alert("กรุณา Login ก่อน");
    }
    if(!teamId){
      const input=$("teamId");
      if(input && input.value.trim()){
        v503SaveTeamId();
      }else{
        const box=$("legacyMigrationBox");
        if(box){box.className="msg warn";box.innerHTML="กรุณาใส่และ Save Team ID ก่อน";}
        return alert("กรุณาใส่และ Save Team ID ก่อน");
      }
    }
    checkLegacyLogsForMigration();
  }catch(e){
    alert("Migration check error: "+e.message);
  }
}

function v503BindCriticalButtons(){
  try{
    const saveBtn=$("saveTeamBtn");
    if(saveBtn && saveBtn.dataset.v503Bound!=="1"){
      saveBtn.dataset.v503Bound="1";
      saveBtn.disabled=false;
      saveBtn.onclick=v503SaveTeamId;
    }
    const migBtn=$("legacyMigrationBtn");
    if(migBtn && migBtn.dataset.v503Bound!=="1"){
      migBtn.dataset.v503Bound="1";
      migBtn.disabled=false;
      migBtn.onclick=v503MigrationClick;
    }
    v503UpdateTeamStatus();
  }catch(e){console.warn("v503BindCriticalButtons",e)}
}


window.addEventListener('load',function(){setTimeout(v503BindCriticalButtons,300);setTimeout(v503BindCriticalButtons,1200);});


/* ===== v5.2.6 MANUAL_IMPORT_CODE ===== */








/* ===== v5.2.6 MIGRATION_BINDING_HARD_FIX_CODE ===== */





/* ===== v5.2.6 MIGRATION_CONFIRM_FLOW_FIX_CODE ===== */





/* ===== v5.2.6 MIGRATION_SINGLE_HANDLER_FIX_CODE ===== */





window.addEventListener('load',function(){setTimeout(bindLegacyMigration,120);setTimeout(bindLegacyMigration,800);setTimeout(bindLegacyMigration,2000);});



/* ===== v5.2.6 CALENDAR_MONTH_SAFE_FIX_CODE ===== */
var calendarSelectedDateV512 = window.calendarSelectedDateV512 || null;

function calendarSafeKeyV512(d){
  if(typeof keyD === "function"){
    try{return keyD(d);}catch(_){}
  }
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function calendarBaseMonthV512(){
  try{
    if(typeof calMonth !== "undefined" && calMonth instanceof Date && !isNaN(calMonth)){
      return new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    }
  }catch(_){}
  const dateInput = document.getElementById("date");
  if(dateInput && dateInput.value && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)){
    const d = new Date(dateInput.value + "T00:00:00");
    if(!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function extractCalendarDateV512(cell){
  if(!cell) return null;
  const ds = cell.dataset ? cell.dataset.date : null;
  if(ds && /^\d{4}-\d{2}-\d{2}$/.test(ds)) return ds;
  const attr = cell.getAttribute ? cell.getAttribute("data-date") : null;
  if(attr && /^\d{4}-\d{2}-\d{2}$/.test(attr)) return attr;

  const text = (cell.textContent || "").trim();
  const day = parseInt(text, 10);
  if(!day || day < 1 || day > 31) return null;
  const base = calendarBaseMonthV512();
  const d = new Date(base.getFullYear(), base.getMonth(), day);
  if(isNaN(d)) return null;
  return calendarSafeKeyV512(d);
}

function renderCalendarSelectedDayV512(dateStr){
  try{
    if(!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    calendarSelectedDateV512 = dateStr;
    window.calendarSelectedDateV512 = dateStr;

    const title = document.getElementById("dayTitle");
    const summary = document.getElementById("daySummary");
    const insight = document.getElementById("v5DayInsight");
    const detail = document.getElementById("calendarSelectedDayDetail");

    const rows = (Array.isArray(logs)?logs:[]).filter(x => x.date === dateStr);
    const volume = rows.reduce((a,x)=>a + (Number(x.weight||0) * Number(x.reps||0)), 0);
    const exercises = [...new Set(rows.map(x => x.plannedExercise || x.exercise).filter(Boolean))];

    if(title) title.textContent = "Daily Summary: " + dateStr;
    if(summary){
      summary.innerHTML = rows.length
        ? `พบ <b>${rows.length}</b> sets • Volume <b>${Math.round(volume)}</b> kg`
        : "ยังไม่มี log ในวันนี้";
    }
    if(insight){
      insight.className = rows.length ? "msg ok" : "msg info";
      insight.innerHTML = rows.length
        ? "Exercises: " + exercises.join(", ")
        : "เลือกวันอื่น หรือไปหน้า Log เพื่อบันทึกวันนี้";
    }
    if(detail){
      detail.innerHTML = rows.length
        ? rows.slice(0,20).map(x => `<div class="cal-log-row"><b>${x.plannedExercise || x.exercise || "-"}</b><span>${Number(x.weight||0)} kg × ${x.reps||0} reps ${x.rir ? "(RIR "+x.rir+")" : ""}</span></div>`).join("")
        : "";
    }

    const dateInput = document.getElementById("date");
    if(dateInput) dateInput.value = dateStr;

    setTimeout(function(){
      try{
        if(typeof show === "function") show("calendar");
      }catch(_){}
    },0);
    return true;
  }catch(e){
    console.warn("renderCalendarSelectedDayV512", e);
    return false;
  }
}

function bindCalendarStayFixV512(){
  try{
    const grid = document.getElementById("calGrid");
    if(!grid || grid.dataset.v512Bound === "1") return;
    grid.dataset.v512Bound = "1";

    grid.addEventListener("click", function(ev){
      try{
        const cell = ev.target.closest("[data-date], .calCell, .calendar-day, button, div");
        if(!cell || !grid.contains(cell)) return;

        const dateStr = extractCalendarDateV512(cell);
        if(!dateStr) return;

        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

        renderCalendarSelectedDayV512(dateStr);
        return false;
      }catch(e){
        console.warn("calendar click safe guard", e);
        ev.preventDefault();
        ev.stopPropagation();
        return false;
      }
    }, true);
  }catch(e){
    console.warn("bindCalendarStayFixV512", e);
  }
}

function bindCalendarGoLogV512(){
  const btn = document.getElementById("calendarGoLogBtn");
  if(!btn || btn.dataset.v512Bound === "1") return;
  btn.dataset.v512Bound = "1";
  btn.onclick = function(){
    if(calendarSelectedDateV512){
      const dateInput = document.getElementById("date");
      if(dateInput) dateInput.value = calendarSelectedDateV512;
    }
    if(typeof show === "function") show("log");
  };
}


window.addEventListener('load',function(){setTimeout(function(){try{bindCalendarStayFixV512();bindCalendarGoLogV512();}catch(e){}},200);setTimeout(function(){try{bindCalendarStayFixV512();bindCalendarGoLogV512();}catch(e){}},1200);});


try{ window.authDebugGuardRun = authDebugGuardRun; }catch(_){}


/* ===== v5.2.6 POST_SAVE_SAFE_CALLBACK_FIX: post-save callbacks wrapped safely ===== */



/* ===== v5.2.6 BACKUP_EXPORT_TOOL ===== */
function backupSafeLogsV520(){
  try{
    if(Array.isArray(logs)) return logs.slice();
  }catch(_){}
  return [];
}

function backupActiveUserV520(){
  try{
    return {
      uid: user && user.uid ? user.uid : null,
      email: user && user.email ? user.email : null,
      displayName: user && user.displayName ? user.displayName : null
    };
  }catch(_){
    return {uid:null,email:null,displayName:null};
  }
}

function backupTeamV520(){
  try{
    return {
      teamId: typeof teamId !== "undefined" ? teamId : localStorage.getItem("teamId"),
      teamLabel: typeof activeTeamLabel === "function" ? activeTeamLabel() : null,
      userScope: typeof activeUserKey === "function" ? activeUserKey() : null
    };
  }catch(_){
    return {teamId:localStorage.getItem("teamId"),teamLabel:null,userScope:null};
  }
}

function backupSummaryV520(){
  const rows = backupSafeLogsV520();
  const sorted = rows.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
  const totalVolume = rows.reduce((a,x)=>a + (Number(x.weight||0) * Number(x.reps||0)), 0);
  const exercises = [...new Set(rows.map(x=>x.plannedExercise || x.exercise).filter(Boolean))];
  const dates = [...new Set(rows.map(x=>x.date).filter(Boolean))].sort();
  return {
    version: typeof VERSION !== "undefined" ? VERSION : "v5.2.6",
    exportedAt: new Date().toISOString(),
    totalSets: rows.length,
    totalVolume: Math.round(totalVolume),
    firstLogDate: dates[0] || null,
    lastLogDate: dates[dates.length-1] || null,
    uniqueTrainingDays: dates.length,
    uniqueExercises: exercises.length,
    team: backupTeamV520(),
    user: backupActiveUserV520()
  };
}

function backupPayloadV520(){
  return {
    app: "Workout PRO",
    backupType: "workout-pro-json-backup",
    schemaVersion: "1.0",
    summary: backupSummaryV520(),
    logs: backupSafeLogsV520(),
    localSettings: {
      teamId: localStorage.getItem("teamId"),
      workoutTeamIdSavedAt: localStorage.getItem("workoutTeamIdSavedAt")
    }
  };
}

function backupDownloadV520(filename, content, mime){
  const blob = new Blob([content], {type:mime || "application/octet-stream"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{try{URL.revokeObjectURL(url);a.remove();}catch(_){}},300);
}

function backupCsvEscapeV520(v){
  const s = String(v ?? "");
  if(/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}

function backupCsvV520(){
  const rows = backupSafeLogsV520();
  const fields = ["date","week","autoWeek","day","exercise","plannedExercise","set","weight","reps","rir","volume","createdAt","ownerEmail","ownerUid","teamLabel","userScope"];
  const lines = [fields.join(",")];
  rows.forEach(r=>{
    lines.push(fields.map(f=>backupCsvEscapeV520(r[f])).join(","));
  });
  return lines.join("\n");
}

function backupFilenameV520(ext){
  const s = backupSummaryV520();
  const team = (s.team.teamLabel || s.team.teamId || "team").replace(/[^a-zA-Z0-9_-]+/g,"_");
  const date = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  return `workout-pro-${team}-${date}.${ext}`;
}

function renderBackupSummaryV520(){
  const s = backupSummaryV520();
  const box = document.getElementById("backupSummaryBox");
  const qa = document.getElementById("backupQaBox");
  const status = document.getElementById("backupStatus");
  const setText = (id,val)=>{const el=document.getElementById(id); if(el) el.textContent=val;};

  setText("backupKpiSets", s.totalSets);
  setText("backupKpiVolume", s.totalVolume);
  setText("backupKpiFirst", s.firstLogDate || "-");
  setText("backupKpiLast", s.lastLogDate || "-");

  if(box){
    box.className = s.totalSets ? "msg ok" : "msg warn";
    box.innerHTML = `Logs: <b>${s.totalSets}</b> sets<br>Volume: <b>${s.totalVolume}</b><br>Days: <b>${s.uniqueTrainingDays}</b><br>Exercises: <b>${s.uniqueExercises}</b>`;
  }
  if(qa){
    const checks = [
      ["User login", !!s.user.uid],
      ["Team ID", !!(s.team.teamId || s.team.teamLabel)],
      ["Logs loaded", s.totalSets > 0],
      ["Date range", !!s.firstLogDate && !!s.lastLogDate],
      ["Export safe mode", true]
    ];
    qa.className = checks.every(x=>x[1]) ? "msg ok" : "msg warn";
    qa.innerHTML = checks.map(([k,v])=>`${v?"✅":"⚠️"} ${k}`).join("<br>");
  }
  if(status){
    status.className = "msg info";
    status.innerHTML = `พร้อม Export • ${s.totalSets} sets • ${s.exportedAt}`;
  }
  return s;
}

function exportJsonBackupV520(){
  try{
    const payload = backupPayloadV520();
    renderBackupSummaryV520();
    backupDownloadV520(backupFilenameV520("json"), JSON.stringify(payload,null,2), "application/json;charset=utf-8");
    const status = document.getElementById("backupStatus");
    if(status){status.className="msg ok";status.innerHTML="Export JSON สำเร็จ ✅";}
  }catch(e){
    alert("Export JSON error: " + e.message);
  }
}

function exportCsvBackupV520(){
  try{
    renderBackupSummaryV520();
    backupDownloadV520(backupFilenameV520("csv"), backupCsvV520(), "text/csv;charset=utf-8");
    const status = document.getElementById("backupStatus");
    if(status){status.className="msg ok";status.innerHTML="Export CSV สำเร็จ ✅";}
  }catch(e){
    alert("Export CSV error: " + e.message);
  }
}

async function copyBackupSummaryV520(){
  try{
    const s = renderBackupSummaryV520();
    const text = [
      "Workout PRO Backup Summary",
      `Version: ${s.version}`,
      `ExportedAt: ${s.exportedAt}`,
      `Sets: ${s.totalSets}`,
      `Volume: ${s.totalVolume}`,
      `FirstLog: ${s.firstLogDate || "-"}`,
      `LastLog: ${s.lastLogDate || "-"}`,
      `Team: ${s.team.teamLabel || s.team.teamId || "-"}`,
      `User: ${s.user.email || "-"}`
    ].join("\n");
    await navigator.clipboard.writeText(text);
    const status = document.getElementById("backupStatus");
    if(status){status.className="msg ok";status.innerHTML="Copy Summary สำเร็จ ✅";}
  }catch(e){
    alert("Copy summary error: " + e.message);
  }
}

function bindBackupExportToolV520(){
  const j = document.getElementById("exportJsonBtn");
  const c = document.getElementById("exportCsvBtn");
  const s = document.getElementById("copyBackupSummaryBtn");
  if(j && j.dataset.v520Bound !== "1"){j.dataset.v520Bound="1";j.onclick=exportJsonBackupV520;}
  if(c && c.dataset.v520Bound !== "1"){c.dataset.v520Bound="1";c.onclick=exportCsvBackupV520;}
  if(s && s.dataset.v520Bound !== "1"){s.dataset.v520Bound="1";s.onclick=copyBackupSummaryV520;}
  renderBackupSummaryV520();
}


window.addEventListener('load',function(){setTimeout(function(){try{bindBackupExportToolV520();}catch(e){}},500);setTimeout(function(){try{bindBackupExportToolV520();}catch(e){}},1500);});



/* ===== v5.2.6 TARGET_SETS_DEFAULT_FIX ===== */
function targetSetsInputV522(){
  return document.getElementById("targetSets") ||
         document.getElementById("targetSet") ||
         document.getElementById("target") ||
         null;
}

function currentExerciseNameV522(){
  const ex = document.getElementById("exercise");
  if(ex && ex.value) return ex.value;
  try{
    if(typeof meta === "function"){
      const m = meta();
      if(m && m[2]) return m[2];
    }
  }catch(_){}
  return "";
}

function programTargetSetsV522(exerciseName){
  try{
    if(typeof target === "function" && exerciseName){
      const t = Number(target(exerciseName));
      if(Number.isFinite(t) && t > 0) return t;
    }
  }catch(_){}

  try{
    const ex = exerciseName || currentExerciseNameV522();
    if(Array.isArray(PROGRAM) && ex){
      const p = PROGRAM.find(x => x && x[2] === ex);
      if(p){
        const candidates = [p[3], p.sets, p.targetSets, p.target, p[4]];
        for(const c of candidates){
          const n = Number(c);
          if(Number.isFinite(n) && n > 0 && n <= 20) return n;
        }
      }
    }
  }catch(_){}

  try{
    if(typeof meta === "function"){
      const m = meta();
      if(m){
        const candidates = [m[3], m.targetSets, m.target];
        for(const c of candidates){
          const n = Number(c);
          if(Number.isFinite(n) && n > 0 && n <= 20) return n;
        }
      }
    }
  }catch(_){}

  return 3;
}

function effectiveTargetSetsV522(exerciseName){
  const input = targetSetsInputV522();
  if(input){
    const n = Number(input.value);
    if(Number.isFinite(n) && n > 0 && n <= 20) return Math.round(n);
  }
  return programTargetSetsV522(exerciseName);
}

function fillTargetSetsDefaultV522(force){
  const input = targetSetsInputV522();
  const ex = currentExerciseNameV522();
  const def = programTargetSetsV522(ex);
  if(input){
    if(force || input.value === "" || input.value == null || Number(input.value) <= 0){
      input.value = def;
    }
    input.dataset.defaultSets = String(def);
    input.title = "Default from program: " + def + " sets. You can override if needed.";
  }
  const show = document.getElementById("targetShow");
  if(show && show.tagName !== "INPUT"){
    const current = effectiveTargetSetsV522(ex);
    if(!show.textContent || show.textContent === "-" || /sets/i.test(show.textContent)){
      show.textContent = current + " sets";
    }
  }
  return def;
}

function bindTargetSetsDefaultV522(){
  const input = targetSetsInputV522();
  const ex = document.getElementById("exercise");

  if(input && input.dataset.v522Bound !== "1"){
    input.dataset.v522Bound = "1";
    input.addEventListener("blur", function(){
      if(this.value === "" || Number(this.value) <= 0){
        fillTargetSetsDefaultV522(true);
      }
    });
    input.addEventListener("input", function(){
      const n = Number(this.value);
      if(this.value !== "" && (!Number.isFinite(n) || n < 0 || n > 20)){
        this.classList.add("input-warn");
      }else{
        this.classList.remove("input-warn");
      }
    });
  }

  if(ex && ex.dataset.v522Bound !== "1"){
    ex.dataset.v522Bound = "1";
    ex.addEventListener("change", function(){
      fillTargetSetsDefaultV522(true);
    });
  }

  fillTargetSetsDefaultV522(false);
}

// Patch target() only if it exists: empty override falls back to original program target.
try{
  if(typeof target === "function" && !window.__v522TargetPatched){
    window.__v522TargetPatched = true;
    const originalTargetV522 = target;
    target = function(exerciseName){
      const input = targetSetsInputV522();
      if(input){
        const n = Number(input.value);
        if(Number.isFinite(n) && n > 0 && n <= 20) return Math.round(n);
      }
      try{
        const t = Number(originalTargetV522(exerciseName));
        if(Number.isFinite(t) && t > 0) return t;
      }catch(_){}
      return programTargetSetsV522(exerciseName);
    };
  }
}catch(_){}

window.addEventListener("load", function(){
  setTimeout(function(){try{bindTargetSetsDefaultV522();}catch(e){}},300);
  setTimeout(function(){try{bindTargetSetsDefaultV522();}catch(e){}},1200);
});



/* ===== v5.2.6 DATE_INPUT_SANITY_FIX ===== */
function strictLocalDateKeyV523(d){
  const x = d instanceof Date && !isNaN(d) ? d : new Date();
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
}

function isValidDateKeyV523(v){
  if(typeof v !== "string") return false;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y,m,d] = v.split("-").map(Number);
  if(y < 2000 || y > 2100) return false;
  const dt = new Date(y, m-1, d);
  return dt.getFullYear() === y && dt.getMonth() === m-1 && dt.getDate() === d;
}

function normalizeDateKeyV523(v){
  if(isValidDateKeyV523(v)) return v;

  // Accept common dd/mm/yyyy only as recovery, not normal flow.
  if(typeof v === "string"){
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m){
      const dd = Number(m[1]), mm = Number(m[2]), yy = Number(m[3]);
      const key = `${yy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
      if(isValidDateKeyV523(key)) return key;
    }
  }
  return strictLocalDateKeyV523(new Date());
}

function sanitizeDateInputV523(forceToday){
  const el = document.getElementById("date");
  if(!el) return strictLocalDateKeyV523(new Date());
  const before = el.value;
  const next = forceToday ? strictLocalDateKeyV523(new Date()) : normalizeDateKeyV523(before);
  if(before !== next){
    el.value = next;
    try{ selectedDate = next; }catch(_){}
  }
  return next;
}

function bindDateInputSanityV523(){
  const el = document.getElementById("date");
  if(!el) return;
  sanitizeDateInputV523(false);
  if(el.dataset.v523Bound === "1") return;
  el.dataset.v523Bound = "1";
  el.addEventListener("change", function(){
    sanitizeDateInputV523(false);
    try{ if(typeof updateDateStatus === "function") updateDateStatus(); }catch(_){}
  });
  el.addEventListener("blur", function(){
    sanitizeDateInputV523(false);
    try{ if(typeof updateDateStatus === "function") updateDateStatus(); }catch(_){}
  });
}

// Patch today/local date helpers to always return strict local key.
try{
  todayLocalV521 = function(){ return strictLocalDateKeyV523(new Date()); };
}catch(_){}
try{
  localDateKeyV521 = function(d){ return strictLocalDateKeyV523(d instanceof Date ? d : new Date()); };
}catch(_){}
try{
  today = function(){ return strictLocalDateKeyV523(new Date()); };
}catch(_){}
try{
  localDateKey = function(d){ return strictLocalDateKeyV523(d instanceof Date ? d : new Date()); };
}catch(_){}

// Extra protection before save: date must be sane.
try{
  if(typeof validateDate === "function" && !window.__v523ValidateDatePatched){
    window.__v523ValidateDatePatched = true;
    const originalValidateDateV523 = validateDate;
    validateDate = function(){
      sanitizeDateInputV523(false);
      return originalValidateDateV523();
    };
  }
}catch(_){}

window.addEventListener("load", function(){
  setTimeout(function(){try{bindDateInputSanityV523();}catch(e){}},100);
  setTimeout(function(){try{bindDateInputSanityV523();}catch(e){}},800);
  setTimeout(function(){try{bindDateInputSanityV523();}catch(e){}},1800);
});


/* ===== v5.3.22 DAY_LOCK_HARD_FIX =====
   Critical: legacy override panel must never re-enable Save while REST_LOCK / DAY_DATE_LOCK is active. */
function w535HardDayLockEnforce(){
  try{
    const btn = document.getElementById("saveBtn");
    const st = (typeof nextState === "function") ? nextState() : {};
    const ad = (typeof activeDay === "function") ? activeDay() : "";
    const locked = !!(st.restLock || st.dateLock || ad === "REST_LOCK" || ad === "DAY_DATE_LOCK" || ad === "COMPLETE");
    if(btn && locked){
      btn.disabled = true;
      btn.style.opacity = ".45";
      btn.dataset.dayLockHard = "1";
    }else if(btn){
      btn.dataset.dayLockHard = "0";
    }
    const ex = document.getElementById("exercise");
    if(ex && locked){
      Array.from(ex.options).forEach(o=>{ o.disabled = true; });
    }
    return !locked;
  }catch(e){ console.warn("w535HardDayLockEnforce", e); return false; }
}
window.w535HardDayLockEnforce = w535HardDayLockEnforce;

try{
  const _w535OldSync = sync;
  sync = function(){
    const r = _w535OldSync.apply(this, arguments);
    setTimeout(w535HardDayLockEnforce, 0);
    setTimeout(w535HardDayLockEnforce, 120);
    return r;
  };
}catch(e){ console.warn("w535 sync wrap", e); }

try{
  const _w535OldV403 = v403RenderUnlockPanel;
  v403RenderUnlockPanel = function(){
    const r = _w535OldV403.apply(this, arguments);
    setTimeout(w535HardDayLockEnforce, 0);
    setTimeout(w535HardDayLockEnforce, 120);
    return r;
  };
}catch(e){ console.warn("w535 v403 wrap", e); }

window.addEventListener("load", function(){
  setTimeout(w535HardDayLockEnforce, 300);
  setTimeout(w535HardDayLockEnforce, 1200);
});


/* ===== v5.3.22 NO_WHITE_SCREEN_CORE_FIX =====
   Hard rule: never blank the current page while the next page is rendering.
   Day Lock v5.3.22 remains active and is re-enforced after every navigation/save. */
let __w536NavToken = 0;
let __w536DashTimer = null;
let __w536SyncTimer = null;
let __w536LastSyncAt = 0;

function w536Mini(on, text="กำลังเตรียมหน้า..."){
  try{
    let el=document.getElementById("w536MiniStatus");
    if(!el){ el=document.createElement("div"); el.id="w536MiniStatus"; el.className="w536MiniStatus"; document.body.appendChild(el); }
    el.textContent=text;
    el.classList.toggle("show", !!on);
  }catch(_){ }
}
function w536LightRender(page){
  try{
    // Fast, page-local rendering only. Heavy charts are deferred.
    if(page==="log"){
      w534SafeCall(applyMeta); w534SafeCall(updatePR); w534SafeCall(updateWeekly);
      w534SafeCall(updateNextWeekRecommendation); w534SafeCall(updateOrderGuidance);
      w534SafeCall(()=>{ if(typeof renderMediaPanel==="function") renderMediaPanel(); });
      w534SafeCall(()=>{ if(typeof syncSelectedExerciseState==="function") syncSelectedExerciseState(); });
    }else if(page==="calendar"){
      w534SafeCall(renderCalendar); w534SafeCall(()=>renderDaySummary(selectedDate));
    }else if(page==="program"){
      w534SafeCall(renderProgram);
    }else if(page==="guide"){
      w534SafeCall(renderGuide);
    }else if(page==="coach"){
      // Avoid drawing charts before the page is visible.
      w534SafeCall(()=>{ if($('coachAdvice')) $('coachAdvice').innerHTML = $('coachAdvice').innerHTML || 'กำลังเตรียม Coach...'; });
    }else if(page==="dash"){
      // KPI first; charts later.
      try{ setTextSafe("kVol", logs.reduce((a,b)=>a+(+b.volume||0),0).toFixed(0)); }catch(_){ }
      try{ setTextSafe("kSets", logs.length); }catch(_){ }
      try{ setTextSafe("kUsers", new Set(logs.map(x=>x.userId)).size); }catch(_){ }
      try{ setTextSafe("kWeek", autoWeek()); }catch(_){ }
      try{ setTextSafe("chartStatus", "Dashboard ready"); }catch(_){ }
    }
  }catch(e){ console.warn("w536LightRender", e); }
}
function w536HeavyRender(page, token){
  try{
    if(token!==__w536NavToken) return;
    if(page==="dash"){
      clearTimeout(__w536DashTimer);
      __w536DashTimer=setTimeout(()=>{
        try{ if(token!==__w536NavToken) return; renderDashboard(); }catch(e){console.warn("dash",e)}
        setTimeout(()=>{try{ if(token===__w536NavToken && typeof v5RenderMuscleBalance==="function") v5RenderMuscleBalance(); }catch(e){}},80);
        setTimeout(()=>{try{ if(token===__w536NavToken && typeof v5RenderPRBoard==="function") v5RenderPRBoard(); }catch(e){}},140);
        setTimeout(()=>{try{ if(token===__w536NavToken && typeof v5RenderRecoveryTrend==="function") v5RenderRecoveryTrend(); }catch(e){}},200);
      },120);
    }else if(page==="coach"){
      setTimeout(()=>{try{ if(token===__w536NavToken) renderCoach(); }catch(e){console.warn("coach",e)}},80);
      setTimeout(()=>{try{ if(token===__w536NavToken && typeof renderHypertrophyIntelligence==="function") renderHypertrophyIntelligence(); }catch(e){}},180);
    }else if(page==="log"){
      setTimeout(()=>{try{ if(token===__w536NavToken && typeof historySummaryForCurrent==="function") historySummaryForCurrent(); }catch(e){}},120);
      setTimeout(()=>{try{ if(token===__w536NavToken && typeof v5RenderLogSummary==="function") v5RenderLogSummary(); }catch(e){}},180);
    }else if(page==="backup"){
      setTimeout(()=>{try{ if(token===__w536NavToken && typeof v5BindExport==="function") v5BindExport(); }catch(e){}},80);
    }
  }catch(e){ console.warn("w536HeavyRender", e); }
}
function w536ShowPage(page){
  const token=++__w536NavToken;
  try{
    const target=document.getElementById(page);
    if(!target) return;
    const current=document.querySelector(".page.active");
    if(current && current.id===page){ w536LightRender(page); w536HeavyRender(page, token); return; }
    w536Mini(true, "กำลังเปิดหน้า...");
    target.classList.add("preparing");
    w536LightRender(page);
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        try{
          if(token!==__w536NavToken) return;
          document.querySelectorAll(".page").forEach(p=>{
            p.classList.toggle("active", p.id===page);
            p.classList.remove("preparing");
          });
          document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.page===page));
          __w534LastPage=page;
          if(typeof w535HardDayLockEnforce==="function") setTimeout(w535HardDayLockEnforce,0);
          w536HeavyRender(page, token);
          setTimeout(()=>w536Mini(false),180);
        }catch(e){ console.warn("w536ShowPage swap", e); w536Mini(false); }
      });
    });
  }catch(e){ console.warn("w536ShowPage", e); w536Mini(false); }
}
window.show=w536ShowPage;
window.showPage=w536ShowPage;
w534ShowPage=w536ShowPage;

// Replace broad all-page render fallback with current-page rendering only.
try{
  renderSafe=function(){
    try{ w536LightRender(w534ActivePage()); w536HeavyRender(w534ActivePage(), __w536NavToken); }
    catch(e){ try{ setTextSafe("chartStatus", "Render fallback: "+e.message); }catch(_){} }
  };
}catch(e){ console.warn("w536 renderSafe override", e); }

// Debounce Firestore snapshots so navigation/save does not trigger repeated full renders.
try{
  const _w536OldRenderCurrent = w534RenderCurrentPage;
  w534RenderCurrentPage = function(page=w534ActivePage()){
    const now=Date.now();
    if(now-__w536LastSyncAt<120){
      clearTimeout(__w536SyncTimer);
      __w536SyncTimer=setTimeout(()=>{w536LightRender(page); w536HeavyRender(page, __w536NavToken);},160);
      return;
    }
    __w536LastSyncAt=now;
    w536LightRender(page);
    w536HeavyRender(page, __w536NavToken);
  };
}catch(e){ console.warn("w536 w534RenderCurrentPage override", e); }

// Save path: keep current UI visible, update recent list lightly, delay expensive sync.
try{
  const _w536OldW534SetBusy = w534SetBusy;
  w534SetBusy=function(on, text){
    // Use mini status instead of full overlay to avoid perceived blank screen.
    w536Mini(!!on, text||"กำลังทำงาน...");
    if(!on) setTimeout(()=>w536Mini(false),120);
  };
}catch(e){ console.warn("w536 busy override", e); }

window.addEventListener("load", function(){
  try{
    document.querySelectorAll(".tab").forEach(b=>{ b.onclick=()=>w536ShowPage(b.dataset.page); });
    const backupBtn=[...document.querySelectorAll("nav button")].find(b=>String(b.textContent||"").trim()==="Backup");
    if(backupBtn) backupBtn.onclick=()=>w536ShowPage("backup");
    setTimeout(()=>{try{ if(typeof w535HardDayLockEnforce==="function") w535HardDayLockEnforce(); }catch(_){}},250);
  }catch(e){ console.warn("w536 load bind", e); }
});


/* ===== v5.3.22 DATE FIELD DISPLAY-ONLY FIX =====
   Base: v5.3.22 + v5.3.22 Day Lock runtime.
   Purpose: fix desktop native date input visual clipping without touching Day Lock, sync, saveSet, REST_LOCK, or override logic.
*/
(function(){
  const KEY_RE=/^\d{4}-\d{2}-\d{2}$/;
  function todayBangkokKey(){
    try{return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
    catch(_){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  }
  function currentCanonical(){
    try{ if(typeof selectedDate!=="undefined" && KEY_RE.test(String(selectedDate))) return selectedDate; }catch(_){ }
    const el=document.getElementById("date");
    if(el && KEY_RE.test(String(el.value))) return el.value;
    try{ if(typeof today==="function") return today(); }catch(_){ }
    return todayBangkokKey();
  }
  function applyDateDisplayOnly(){
    const el=document.getElementById("date");
    if(!el) return;
    const canonical=currentCanonical();
    try{
      // Text display avoids Chrome/Safari desktop native date clipping such as 15/06/2026 showing as 05/06/2026.
      if(el.type!=="text") el.type="text";
      el.inputMode="numeric";
      el.placeholder="YYYY-MM-DD";
      el.autocomplete="off";
      el.style.minWidth="220px";
    }catch(_){ }
    if(canonical && el.value!==canonical) el.value=canonical;
    el.dataset.dateCanonical=canonical;
  }
  window.__W5310DateDisplayOnly=applyDateDisplayOnly;
  window.addEventListener("load",()=>{
    setTimeout(applyDateDisplayOnly,50);
    setTimeout(applyDateDisplayOnly,350);
    setTimeout(applyDateDisplayOnly,1200);
  });
  document.addEventListener("click",()=>setTimeout(applyDateDisplayOnly,0),true);
})();




/* ===== v5.3.22 DAY_LOCK_SINGLE_RENDERER_CLEAN_FIX =====
   Clean fix: removes legacy renderer race by keeping one Day Lock controller.
   Rules: Day 1 -> Day 2 -> Rest -> Day 4 -> Day 5 -> Rest -> Rest -> next Week Day 1.
   Manual override is explicit and scoped by team/user/date.
*/
(function(){
  const VERSION_5315 = "v5.3.22";
  const DAYS = ["Day 1","Day 2","Day 4","Day 5"];
  const PANEL_ID = "dayLockSingleSourcePanel";
  const LOG_ID = "log";
  let rendering = false;
  let renderTimer = null;
  let pendingSkipDay = "";
  function userIsInteractingWithSelect(){
    const a = document.activeElement;
    return !!(a && (a.id === "exercise" || a.id === "w5315SkipSelect"));
  }

  function byId(id){ return document.getElementById(id); }
  function safeCall(fn){ try{ if(typeof fn === "function") return fn(); }catch(e){ console.warn("v5315 safeCall", e); } }
  function bangkokTodayKey(){
    try{
      return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    }catch(_){
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  }
  function dateKey(){
    const el = byId("date");
    const v = el && String(el.value||"").trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    try{ if(typeof selectedDate !== "undefined" && /^\d{4}-\d{2}-\d{2}$/.test(String(selectedDate))) return String(selectedDate); }catch(_){ }
    return bangkokTodayKey();
  }
  function teamKey(){ try{ return (typeof activeTeamLabel === "function" ? activeTeamLabel() : (localStorage.getItem("teamId") || "local")); }catch(_){ return "local"; } }
  function userKey(){ try{ return (typeof activeUserKey === "function" ? activeUserKey() : ((window.user && user.uid) || "local")); }catch(_){ return "local"; } }
  function overrideKey(d){ return "W5315_DAY_LOCK_OVERRIDE::" + teamKey() + "::" + userKey() + "::" + (d || dateKey()); }
  function getOverride(d){
    try{
      const v = localStorage.getItem(overrideKey(d));
      return DAYS.includes(v) ? v : "";
    }catch(_){ return ""; }
  }
  function setOverride(day,d){
    if(!DAYS.includes(day)) return;
    try{
      localStorage.setItem(overrideKey(d), day);
      localStorage.setItem("W5315_DAY_LOCK_OVERRIDE_LAST", JSON.stringify({day,date:d||dateKey(),at:new Date().toISOString(),team:teamKey(),user:userKey()}));
    }catch(_){ }
  }
  function clearOverride(d){ try{ localStorage.removeItem(overrideKey(d)); }catch(_){ } }
  function exDay(ex){ try{ const p = (PROGRAM||[]).find(r => r && r[2] === ex); return p ? p[0] : ""; }catch(_){ return ""; } }
  function firstExerciseFor(day){ try{ const p = (PROGRAM||[]).find(r => r && r[0] === day); return p ? p[2] : ""; }catch(_){ return ""; } }
  function baseRawDay(){
    try{ return typeof nextIncompleteDayRaw === "function" ? nextIncompleteDayRaw() : "Day 1"; }
    catch(_){ return "Day 1"; }
  }
  function baseUnlockInfo(raw){
    try{ return typeof calendarUnlockInfoForNextDay === "function" ? calendarUnlockInfoForNextDay(raw) : {allowed:true,message:"พร้อมใช้งาน"}; }
    catch(_){ return {allowed:true,message:"พร้อมใช้งาน"}; }
  }
  function currentAllowedDay(){
    const manual = getOverride(dateKey());
    if(manual) return manual;
    const raw = baseRawDay();
    if(DAYS.includes(raw)){
      const info = baseUnlockInfo(raw);
      return info.allowed ? raw : "";
    }
    return "";
  }
  function lockInfo(){
    const d = dateKey();
    const manual = getOverride(d);
    if(manual) return {locked:false,type:"OVERRIDE",target:manual,message:"Manual Override เปิดอยู่: เล่น " + manual,manual:true};

    const raw = baseRawDay();
    if(raw === "REST_LOCK"){
      let earliest = "-";
      try{ earliest = earliestNext(lastCompletedCycle()); }catch(_){ }
      return {locked:true,type:"REST_LOCK",target:"Day 1",message:"ยังพักไม่ครบ 2 วันหลัง Day 5 / เริ่มได้เร็วสุด: " + earliest,manual:false};
    }
    if(raw === "COMPLETE"){
      return {locked:true,type:"COMPLETE",target:"COMPLETE",message:"Cycle นี้ครบแล้ว",manual:false};
    }
    if(DAYS.includes(raw)){
      const info = baseUnlockInfo(raw);
      if(info.allowed) return {locked:false,type:"OPEN",target:raw,message:info.message || "พร้อมใช้งาน",manual:false};
      return {locked:true,type:"DAY_DATE_LOCK",target:raw,message:info.message || "ยังไม่ถึงวันที่ปลดล็อก",manual:false};
    }
    return {locked:false,type:"OPEN",target:"Day 1",message:"พร้อมใช้งาน",manual:false};
  }

  // Patch activeDay / nextState once, based on one override source.
  try{
    activeDay = function(){
      const manual = getOverride(dateKey());
      if(manual) return manual;
      const raw = baseRawDay();
      if(raw === "REST_LOCK" || raw === "COMPLETE") return raw;
      if(DAYS.includes(raw)){
        const info = baseUnlockInfo(raw);
        return info.allowed ? raw : "DAY_DATE_LOCK";
      }
      return raw || "Day 1";
    };
  }catch(e){ console.warn("v5315 activeDay patch", e); }

  try{
    nextState = function(){
      const manual = getOverride(dateKey());
      const d = manual || activeDay();
      if(d === "REST_LOCK"){
        const rc = (typeof lastCompletedCycle === "function") ? lastCompletedCycle() : [];
        return {restLock:true,week:(typeof autoWeek === "function" ? autoWeek() : 1),rest:(typeof restCount === "function" ? restCount(rc,dateKey()) : 0),earliest:(typeof earliestNext === "function" ? earliestNext(rc) : "-")};
      }
      if(d === "DAY_DATE_LOCK"){
        const raw = baseRawDay();
        const info = baseUnlockInfo(raw);
        return {dateLock:true,day:raw,week:(typeof autoWeek === "function" ? autoWeek() : 1),message:info.message || "ยังไม่ถึงวันที่ปลดล็อก"};
      }
      if(d === "COMPLETE") return {complete:true,day:d,week:(typeof autoWeek === "function" ? autoWeek() : 1)};
      for(const p of (PROGRAM||[]).filter(p=>p[0]===d)){
        const done = (typeof countActive === "function") ? countActive(p[2]) : 0;
        const t = (typeof target === "function") ? target(p[2]) : (+p[3]||1);
        if(done < t) return {day:d,exercise:p[2],done,target:t,next:done+1,remain:t-done,week:(typeof autoWeek === "function" ? autoWeek() : 1),override:!!manual};
      }
      return {complete:true,day:d,week:(typeof autoWeek === "function" ? autoWeek() : 1),override:!!manual};
    };
  }catch(e){ console.warn("v5315 nextState patch", e); }

  function cleanupPanels(){
    const log = byId(LOG_ID);
    if(!log) return null;
    const panels = Array.from(log.querySelectorAll(".card")).filter(card=>{
      const h = card.querySelector("h3");
      return h && String(h.textContent||"").trim() === "Day Lock Control";
    });
    let keep = byId(PANEL_ID) || panels[0] || null;
    if(!keep){ keep = document.createElement("div"); keep.className = "card"; keep.id = PANEL_ID; }
    keep.id = PANEL_ID;
    keep.className = "card";
    panels.forEach(card=>{ if(card !== keep) card.remove(); });
    if(!keep.parentNode){
      const first = log.querySelector(".card");
      log.insertBefore(keep, first || log.firstChild);
    }
    return keep;
  }

  function applyDropdown(info){
    const ex = byId("exercise");
    const save = byId("saveBtn");
    const manual = getOverride(dateKey());
    const allowed = manual || (!info.locked && DAYS.includes(info.target) ? info.target : "");

    if(!ex) return;
    if(info.locked && !manual){
      ex.disabled = true;
      Array.from(ex.options).forEach(o=>{
        const d = exDay(o.value);
        const show = info.target && d === info.target;
        o.disabled = true;
        o.hidden = !show;
        const p = (PROGRAM||[]).find(r=>r[2]===o.value);
        if(p) o.textContent = `${p[0]} - ${p[2]} 🔒`;
      });
      if(save){ save.disabled = true; save.style.opacity = ".45"; save.dataset.dayLock = "1"; }
      return;
    }

    ex.disabled = false;
    Array.from(ex.options).forEach(o=>{
      const d = exDay(o.value);
      const ok = !!allowed && d === allowed;
      o.disabled = !ok;
      o.hidden = !ok;
      const p = (PROGRAM||[]).find(r=>r[2]===o.value);
      if(p) o.textContent = `${p[0]} - ${p[2]}${ok ? "" : " 🔒"}`;
    });
    if(allowed && exDay(ex.value) !== allowed){
      const f = firstExerciseFor(allowed);
      if(f) ex.value = f;
    }
    if(save){ save.disabled = false; save.style.opacity = "1"; save.dataset.dayLock = "0"; }
  }

  function syncVersionLabels(){
    try{
      document.title = "Workout PRO " + VERSION_5315;
      const userLine = byId("userLine");
      if(userLine) userLine.innerHTML = String(userLine.innerHTML||"").replace(/v5\.3\.\d+/g, VERSION_5315);
      document.querySelectorAll(".version,.status-pill,.badge").forEach(el=>{
        el.innerHTML = String(el.innerHTML||"").replace(/v5\.3\.\d+/g, VERSION_5315);
      });
    }catch(_){ }
  }

  function renderNow(){
    if(rendering) return;
    rendering = true;
    try{
      const panel = cleanupPanels();
      if(!panel) return;
      const info = lockInfo();
      const manual = getOverride(dateKey());
      const status = info.locked && !manual ? "LOCKED" : (manual ? "OVERRIDE" : "OPEN");
      const cls = info.locked && !manual ? "warn" : (manual ? "warn" : "ok");
      const selectedSkip = pendingSkipDay || manual || (DAYS.includes(info.target) ? info.target : "Day 1");
      const opts = DAYS.map(d=>`<option value="${d}" ${selectedSkip===d?"selected":""}>${d}</option>`).join("");
      const unlockBtn = (info.locked && info.target && DAYS.includes(info.target) && !manual) ? `<button id="w5315UnlockBtn" class="orange" type="button">ขอปลด Day Lock / เล่น ${info.target}</button>` : "";
      panel.innerHTML = `<h3>Day Lock Control</h3>
        <div class="msg ${cls}">Status: <b>${status}</b><br>
        Target: <b>${manual || info.target || "-"}</b><br>
        ${info.message || "พร้อมใช้งาน"}<br>
        <span class="small">Runtime: ${VERSION_5315} • Save Guard: ${info.locked&&!manual ? "LOCK" : "READY"}</span></div>
        <div class="row3" style="margin-top:12px">
          <select id="w5315SkipSelect">${opts}</select>
          <button id="w5315SkipBtn" class="orange" type="button">ข้ามไปเล่นวันที่เลือก</button>
          <button id="w5315ClearBtn" class="blue" type="button">ยกเลิก Override</button>
        </div>
        <div class="small">ถ้าจะเล่นคนละวัน ต้องเลือกจากตรงนี้เท่านั้น ไม่ใช่จาก dropdown โดยตรง</div>
        ${unlockBtn}`;
      const sel = byId("w5315SkipSelect");
      if(sel){
        sel.onchange = function(){ pendingSkipDay = sel.value; };
        sel.onclick = function(e){ if(e) e.stopPropagation(); };
      }
      const skip = byId("w5315SkipBtn");
      if(skip) skip.onclick = function(){ const day = pendingSkipDay || (sel ? sel.value : (info.target || "Day 1")); setOverride(day,dateKey()); pendingSkipDay = day; scheduleRender(0); safeCall(sync); };
      const clear = byId("w5315ClearBtn");
      if(clear) clear.onclick = function(){ pendingSkipDay = ""; clearOverride(dateKey()); scheduleRender(0); safeCall(sync); };
      const unlock = byId("w5315UnlockBtn");
      if(unlock) unlock.onclick = function(){ pendingSkipDay = info.target; setOverride(info.target,dateKey()); scheduleRender(0); safeCall(sync); };
      applyDropdown(info);
      syncVersionLabels();
    }catch(e){ console.warn("v5315 render", e); }
    finally{ rendering = false; }
  }
  function scheduleRender(ms=50){
    clearTimeout(renderTimer);
    renderTimer = setTimeout(()=>{ if(userIsInteractingWithSelect()) return; renderNow(); }, ms);
  }

  // Prevent legacy global hooks from repainting other Day Lock panels.
  try{ window.__W5311ApplyAll = renderNow; window.__W5311RenderDayLockPanel = renderNow; }catch(_){ }
  try{ window.w5314DayLockDebug = undefined; }catch(_){ }
  try{ window.w5315DayLockRender = renderNow; }catch(_){ }
  try{ window.w5315DayLockDebug = function(){ return {version:VERSION_5315, info:lockInfo(), manual:getOverride(dateKey()), allowed:currentAllowedDay(), panels:Array.from(document.querySelectorAll(`#${LOG_ID} .card h3`)).filter(h=>String(h.textContent||"").trim()==="Day Lock Control").length}; }; }catch(_){ }

  try{
    const oldSave = saveSet;
    saveSet = async function(){
      renderNow();
      const isEdit = !!(typeof editingLogIdV533 !== "undefined" && editingLogIdV533);
      if(!isEdit){
        const info = lockInfo();
        const manual = getOverride(dateKey());
        const ex = byId("exercise");
        const chosen = exDay(ex ? ex.value : "");
        const allowed = manual || currentAllowedDay();
        if(info.locked && !manual){ alert("Day Lock ยังล็อกอยู่ ต้องใช้ปุ่มขอปลด/ข้ามวันก่อน"); renderNow(); return; }
        if(allowed && chosen && chosen !== allowed){ alert(`ท่านี้เป็น ${chosen} แต่วันนี้อนุญาต ${allowed} เท่านั้น`); renderNow(); return; }
      }
      return await oldSave.apply(this, arguments);
    };
    const sb = byId("saveBtn");
    if(sb) sb.onclick = saveSet;
  }catch(e){ console.warn("v5315 save wrapper", e); }

  window.addEventListener("load", function(){
    [50,250,800,1600].forEach(t=>setTimeout(renderNow,t));
    const ex = byId("exercise");
    if(ex){ ["change","blur"].forEach(ev=>ex.addEventListener(ev,()=>scheduleRender(120),true)); }
    const date = byId("date");
    if(date){ ["change","blur","input"].forEach(ev=>date.addEventListener(ev,()=>scheduleRender(0),true)); }
  });
  document.addEventListener("click", function(e){
    const t = e && e.target;
    if(t && (t.closest && (t.closest("#dayLockSingleSourcePanel") || t.closest("#altModal")))) return;
    if(t && (t.id === "exercise" || t.id === "w5315SkipSelect")) return;
    scheduleRender(160);
  }, true);
  setInterval(function(){ try{ if(document.querySelector("#log.page.active") && !userIsInteractingWithSelect()) renderNow(); }catch(_){ } }, 4000);
})();


/* ===== v5.3.22 WORKOUT STATE SYNC FIX =====
   Fixes: set counter double increment after save, recent log not refreshing,
   Daily Performance/summary using stale state, and debug panels stuck on checking.
*/
(function(){
  const VERSION_5318 = "v5.3.22";
  const byId = (id)=>document.getElementById(id);
  const safe = (fn)=>{ try{ if(typeof fn === "function") return fn(); }catch(e){ console.warn("v5318", e); } };
  function keyDate(){
    const el=byId("date");
    if(el && /^\d{4}-\d{2}-\d{2}$/.test(String(el.value||""))) return el.value;
    try{ if(typeof today === "function") return today(); }catch(_){ }
    try{return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}catch(_){return new Date().toISOString().slice(0,10);}
  }
  function plannedOf(x){ return (x && (x.plannedExercise || x.exercise)) || ""; }
  function sortLogs(arr){
    return (arr||[]).slice().sort((a,b)=>{
      const ac = a && a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
      const bc = b && b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
      if(bc!==ac) return bc-ac;
      return String(b.date||"").localeCompare(String(a.date||"")) || Number(b.setNo||0)-Number(a.setNo||0);
    });
  }
  function currentExercise(){ const el=byId("exercise"); return el ? el.value : ""; }
  function rowsForToday(ex){
    const d=keyDate();
    return (Array.isArray(logs)?logs:[]).filter(x=>x && x.date===d && (!ex || plannedOf(x)===ex));
  }
  function recalcCurrentSet(ex){
    ex = ex || currentExercise();
    if(!ex) return null;
    let targetSets=3;
    try{ if(typeof target === "function") targetSets=Number(target(ex))||3; }catch(_){ }
    const rows=rowsForToday(ex);
    const maxSet=Math.max(0,...rows.map(x=>Number(x.setNo||x.setNumber||x.set||0)));
    const done=Math.min(targetSets, Math.max(rows.length, maxSet));
    const next=Math.min(done+1,targetSets);
    try{ currentSet=next; }catch(_){ }
    if(byId("setNo")) byId("setNo").textContent=String(next);
    if(byId("setTitle")) byId("setTitle").textContent=`Set ${next} / ${targetSets}`;
    document.querySelectorAll("h2,h3,.set-title,.setTitle").forEach(el=>{
      if(/^Set\s+\d+\s*\/\s*\d+/.test(String(el.textContent||"").trim())) el.textContent=`Set ${next} / ${targetSets}`;
    });
    const st=byId("setStatus");
    if(st){
      st.className=done>=targetSets?"msg ok":"msg";
      st.innerHTML=done>=targetSets
        ? `ท่านี้ครบแล้ว: <b>${ex}</b> (${done}/${targetSets})`
        : `พร้อมบันทึก<br><b>${ex}</b>: เล่นไปแล้ว ${done}/${targetSets} เซต • เซตถัดไปคือ Set ${next}`;
    }
    try{ if(typeof exSessionWrite === "function") exSessionWrite(ex,{done,target:targetSets,next,complete:done>=targetSets}); }catch(_){ }
    return {ex,done,target:targetSets,next,complete:done>=targetSets};
  }
  function renderRecentFixed(){
    const box=byId("recent"); if(!box) return;
    const unit=byId("unit")?byId("unit").value:"kg";
    const rows=sortLogs(Array.isArray(logs)?logs:[]).slice(0,20);
    box.innerHTML = rows.length ? rows.map(x=>`<div class="item"><h3>Week ${x.week||x.autoWeek||"-"} • Set ${x.setNo||"-"}/${x.targetSets||"-"} • ${x.exercise||"-"}</h3><div class="meta">${x.date||"-"} • ${x.day||"-"}<br>${typeof fromKg==="function"?fromKg(Number(x.weight||0),unit):Number(x.weight||0)} ${unit} × ${x.reps||"-"} • Vol ${(Number(x.volume||0)).toFixed(0)} kg${x.isAlternative?`<br>แทน: ${x.plannedExercise||"-"}`:""}${x.note?`<br>Note: ${String(x.note).replace(/[<>]/g,"")}`:""}</div><div class="row3"><button class="cyan" onclick="editLogV533('${x.id}')">แก้ไข</button><button class="red" onclick="deleteLog('${x.id}')">ลบ</button></div></div>`).join("") : "<p class='small'>ยังไม่มีข้อมูล</p>";
  }
  function renderDailyFixed(){
    const box=byId("v5LogSummary");
    if(!box) return;
    const rows=rowsForToday();
    if(!rows.length){ box.className="msg info"; box.innerHTML="ยังไม่มีข้อมูลวันนี้"; return; }
    const vol=rows.reduce((a,x)=>a+Number(x.weight||0)*Number(x.reps||0),0);
    const exs=[...new Set(rows.map(plannedOf).filter(Boolean))];
    box.className="msg ok";
    box.innerHTML=`วันนี้: <b>${rows.length}</b> sets • Volume <b>${Math.round(vol)}</b> kg<br>Exercises: ${exs.join(", ")}`;
  }
  function clearCheckingBoxes(){
    ["cycleDebug","dayDateLockDebug","calendarSyncStatus"].forEach(id=>{
      const el=byId(id); if(!el) return;
      const txt=String(el.textContent||"");
      if(txt.includes("กำลังตรวจสอบ")){
        try{ if(id==="cycleDebug" && typeof updateCycleDebug==="function") updateCycleDebug(); }catch(_){ }
        try{ if(id==="dayDateLockDebug" && typeof updateDayDateLockDebug==="function") updateDayDateLockDebug(); }catch(_){ }
        try{ if(id==="calendarSyncStatus" && typeof calSyncUpdateStatus==="function") calSyncUpdateStatus(); }catch(_){ }
      }
    });
  }
  function syncLabels(){
    try{ document.title="Workout PRO "+VERSION_5318; }catch(_){ }
    try{ const ul=byId("userLine"); if(ul) ul.innerHTML=String(ul.innerHTML||"").replace(/v5\.3\.\d+/g,VERSION_5318); }catch(_){ }
    try{ document.querySelectorAll(".version,.badge,.status-pill").forEach(el=>{el.innerHTML=String(el.innerHTML||"").replace(/v5\.3\.\d+/g,VERSION_5318);}); }catch(_){ }
  }
  window.__w5318RefreshLogState=function(ex){
    syncLabels();
    recalcCurrentSet(ex||currentExercise());
    renderRecentFixed();
    renderDailyFixed();
    clearCheckingBoxes();
    try{ if(typeof v5RenderLogSummary === "function") v5RenderLogSummary(); }catch(_){ }
    try{ if(typeof updatePR === "function") updatePR(); }catch(_){ }
    try{ if(typeof updateWeekly === "function") updateWeekly(); }catch(_){ }
  };
  // Override legacy canonical display with date-scoped calculation to avoid cross-date/cross-week ghost sets.
  try{ applyCanonicalSetDisplay = function(ex){ return window.__w5318RefreshLogState(ex), recalcCurrentSet(ex); }; }catch(e){ console.warn("v5318 override applyCanonicalSetDisplay", e); }
  // Keep recent/daily panels fresh after Firestore snapshot and page taps.
  window.addEventListener("load",()=>{ [80,400,1200].forEach(t=>setTimeout(()=>window.__w5318RefreshLogState(),t)); });
  document.addEventListener("click",()=>setTimeout(()=>window.__w5318RefreshLogState(),180),true);
})();

/* ===== v5.3.22 EXERCISE_RECOMMENDATION_ISOLATION_FIX =====
   Fix: recommendation/PR/weekly/double progression must use the currently selected exercise only.
   Do not fall back to same movement group (e.g. Barbell Bench Press -> Incline Dumbbell Press).
   Day Lock / Save Guard / Date logic are intentionally untouched.
*/
(function(){
  const V519 = "v5.3.22";
  function $safe(id){ try{return document.getElementById(id);}catch(e){return null;} }
  function cleanName(v){ return String(v||"").trim(); }
  function currentSelectedExercise(){
    const el=$safe("exercise");
    return cleanName(el && el.value);
  }
  function rowActualExercise(x){ return cleanName(x && x.exercise); }
  function rowPlannedExercise(x){ return cleanName(x && (x.plannedExercise || x.exercise)); }
  function rowDateSeconds(x){ return Number((x && x.createdAt && x.createdAt.seconds) || 0); }
  function rowWeek(x){ return Number((x && (x.week || x.autoWeek)) || 1); }
  function hasWeightReps(x){ return Number(x && x.weight) > 0 && Number(x && x.reps) > 0; }
  function exactRowsFor(ex, opts={}){
    ex=cleanName(ex);
    if(!ex) return [];
    const rows=(Array.isArray(logs)?logs:[]).filter(x=>{
      if(!hasWeightReps(x)) return false;
      const actual=rowActualExercise(x);
      const planned=rowPlannedExercise(x);
      // Exact isolation: actual exercise wins. plannedExercise is accepted only for old rows where actual is empty or same.
      const exactActual = actual === ex;
      const legacyPlanned = (!actual || actual === planned) && planned === ex;
      if(!(exactActual || legacyPlanned)) return false;
      if(opts.week != null && rowWeek(x)!==Number(opts.week)) return false;
      return true;
    });
    return rows.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")) || rowDateSeconds(b)-rowDateSeconds(a));
  }
  function topRow(rows){
    if(!rows || !rows.length) return null;
    return rows.reduce((best,x)=>{
      const bw=Number(best.weight||0), xw=Number(x.weight||0);
      const bs=bw*Number(best.reps||0), xs=xw*Number(x.reps||0);
      if(xw>bw) return x;
      if(xw===bw && xs>bs) return x;
      return best;
    }, rows[0]);
  }
  function nextFromRow(row){
    const base=Number(row && row.weight || 0), reps=Number(row && row.reps || 0), rir=Number((row && row.rir) ?? 2);
    let next=base, msg="คงน้ำหนักเดิม แล้วเพิ่ม reps ก่อน";
    if(rir>=3 && reps>=8){ next=base+2.5; msg="เพิ่ม +2.5 kg เพราะยังเหลือแรงมาก"; }
    else if(rir>=1 && reps>=12){ next=base+2.5; msg="เพิ่ม +2.5 kg เพราะถึงช่วงบนและ RIR ยังดี"; }
    else if(rir>=2 && reps>=10){ next=base+2.5; msg="เพิ่ม +2.5 kg ได้"; }
    else if(rir<=0){ next=Math.max(0,base-2.5); msg="ลด -2.5 kg หรือคงเดิมแต่ลด reps"; }
    return {next,msg};
  }
  function unitNow(){ return ($safe("unit") && $safe("unit").value) || "kg"; }
  function fmtKg(v,u){ try{return typeof fromKg==="function" ? fromKg(v,u) : v;}catch(e){return v;} }

  // Override old mixed/fallback helpers with exact exercise matching.
  window.__v5319ExactRowsFor = exactRowsFor;
  try{ historyMatchesExercise = function(x, ex){ return exactRowsFor(ex).includes(x); }; }catch(e){}
  try{ safeHistoryRows = function(ex){ return exactRowsFor(ex); }; }catch(e){}
  try{ latestSetForExercise = function(ex){ return exactRowsFor(ex)[0] || null; }; }catch(e){}
  try{ topSetForExerciseWeek = function(ex,w){ return topRow(exactRowsFor(ex,{week:w})); }; }catch(e){}
  try{ topHistoricalSet = function(ex){ return topRow(exactRowsFor(ex)); }; }catch(e){}
  try{ latestHistoricalSet = function(ex){ return exactRowsFor(ex)[0] || null; }; }catch(e){}

  try{ updatePR = function(){
    const ex=currentSelectedExercise(), u=unitNow(), box=$safe("prStatus");
    if(!box) return;
    const rows=exactRowsFor(ex);
    if(!ex){ box.textContent="ยังไม่ได้เลือกท่า"; return; }
    if(!rows.length){ box.textContent="สถิติเดิม: ยังไม่มีข้อมูลของ "+ex; return; }
    const best=topRow(rows), latest=rows[0], rec=nextFromRow(latest);
    box.innerHTML=`สถิติสูงสุด: <b>${fmtKg(best.weight,u)} ${u}</b> × ${best.reps} reps<br>แนะนำวันนี้: <b>${fmtKg(rec.next,u)} ${u}</b> — ${rec.msg}`;
  }; }catch(e){}

  try{ updateWeekly = function(){
    const ex=currentSelectedExercise(), u=unitNow(), box=$safe("weekSuggest"), w=(typeof autoWeek==="function"?Number(autoWeek()):1)-1;
    if(!box) return;
    if(!ex){ box.textContent="ยังไม่ได้เลือกท่า"; return; }
    if(w<1){ box.textContent="สัปดาห์ก่อน: ยังไม่มีข้อมูล"; return; }
    const rows=exactRowsFor(ex,{week:w});
    if(!rows.length){ box.textContent=`สัปดาห์ก่อน Week ${w}: ยังไม่มีข้อมูลของ ${ex}`; return; }
    const top=topRow(rows), rec=nextFromRow(top);
    box.innerHTML=`สัปดาห์ก่อน: ${fmtKg(top.weight,u)} ${u} × ${top.reps} reps (RIR ${top.rir??"-"})<br>แนะนำ Week นี้: <b>${fmtKg(rec.next,u)} ${u}</b> — ${rec.msg}`;
  }; }catch(e){}

  try{ progressionRecommendation = function(ex){
    ex=cleanName(ex); const wk=typeof autoWeek==="function"?Number(autoWeek()):1, u=unitNow();
    const thisW=topRow(exactRowsFor(ex,{week:wk}));
    const prevW=topRow(exactRowsFor(ex,{week:wk-1}));
    const latest=thisW || exactRowsFor(ex)[0];
    if(!latest) return {html:`ยังไม่มีประวัติของ ${ex}<br>แนะนำ: เริ่มน้ำหนักที่ทำได้ RIR 1–2`, next:null};
    const rec=nextFromRow(latest);
    const prevTxt=prevW?`<br>Week ก่อน: ${fmtKg(prevW.weight,u)} ${u} × ${prevW.reps} reps (RIR ${prevW.rir??"-"})`:`<br>Week ก่อน: ยังไม่มีข้อมูล`;
    const curTxt=thisW?`Week นี้: ${fmtKg(thisW.weight,u)} ${u} × ${thisW.reps} reps (RIR ${thisW.rir??"-"})`:`ล่าสุด: ${fmtKg(latest.weight,u)} ${u} × ${latest.reps} reps (RIR ${latest.rir??"-"})`;
    return {html:`${curTxt}${prevTxt}<br><b>น้ำหนักแนะนำครั้งถัดไป:</b> ${fmtKg(rec.next,u)} ${u}<br>${rec.msg}`, next:rec.next};
  }; }catch(e){}

  try{ updateNextWeekRecommendation = function(){
    const box=$safe("nextWeekBox"); if(!box) return;
    const ex=currentSelectedExercise();
    if(!ex){ box.textContent="ยังไม่ได้เลือกท่า"; return; }
    const rec=progressionRecommendation(ex);
    box.innerHTML=rec.html;
  }; }catch(e){}

  try{ doubleProgressionRecommendation = function(ex){
    ex=cleanName(ex); const u=unitNow();
    const range=(typeof parseRepRange==="function" ? parseRepRange(ex) : {min:8,max:12});
    const wk=typeof autoWeek==="function"?Number(autoWeek()):1;
    const top=topRow(exactRowsFor(ex,{week:wk})) || exactRowsFor(ex)[0];
    if(!top) return `Double Progression: ยังไม่มีข้อมูลของ ${ex}<br>เริ่มที่น้ำหนักทำได้ ${range.min}-${range.max} reps และ RIR 1-2`;
    const reps=Number(top.reps||0), rir=Number(top.rir??2), w=Number(top.weight||0);
    let next=w, action="";
    if(reps>=range.max && rir>=1){ next=w+2.5; action=`ถึง rep ceiling (${range.max}) และ RIR ยังดี → เพิ่มน้ำหนัก`; }
    else if(reps<range.min){ next=w; action=`reps ยังต่ำกว่า ${range.min} → คงน้ำหนักและเพิ่ม reps ก่อน`; }
    else if(rir<=0){ next=Math.max(0,w-2.5); action="RIR 0 / หนักเกิน → ลดน้ำหนักหรือคงเดิมแต่ลด reps"; }
    else{ next=w; action=`อยู่ในช่วง ${range.min}-${range.max} → คงน้ำหนัก เพิ่ม reps`; }
    return `Double Progression<br>ช่วงเป้าหมาย: ${range.min}-${range.max} reps<br>Top ล่าสุด: ${fmtKg(w,u)} ${u} × ${reps} (RIR ${rir})<br><b>ครั้งถัดไป:</b> ${fmtKg(next,u)} ${u}<br>${action}`;
  }; }catch(e){}

  function refreshRecommendationOnly(){
    try{ if(typeof updatePR==="function") updatePR(); }catch(e){}
    try{ if(typeof updateWeekly==="function") updateWeekly(); }catch(e){}
    try{ if(typeof updateNextWeekRecommendation==="function") updateNextWeekRecommendation(); }catch(e){}
    try{ if(typeof updateOrderGuidance==="function") updateOrderGuidance(); }catch(e){}
    try{ if(typeof historySummaryForCurrent==="function") historySummaryForCurrent(); }catch(e){}
    try{ if(typeof window.__v5317Status==="function") window.__v5317Status("พร้อมใช้งาน", "ok"); }catch(e){}
  }
  function bindExerciseRefresh(){
    const ex=$safe("exercise"); if(!ex || ex.dataset.v5319Bound==="1") return;
    ex.dataset.v5319Bound="1";
    ex.addEventListener("change", function(){
      try{ if(typeof window.__v5317Status==="function") window.__v5317Status("กำลังอัปเดตข้อมูลท่า...", "info"); }catch(e){}
      setTimeout(refreshRecommendationOnly, 0);
      setTimeout(refreshRecommendationOnly, 120);
    });
  }
  window.__v5319RefreshRecommendationOnly = refreshRecommendationOnly;
  window.addEventListener("load", function(){
    setTimeout(function(){ bindExerciseRefresh(); refreshRecommendationOnly(); }, 350);
    setTimeout(function(){ bindExerciseRefresh(); refreshRecommendationOnly(); }, 1500);
  });
  try{
    const oldSync=sync;
    sync=function(){ const r=oldSync.apply(this,arguments); setTimeout(function(){ bindExerciseRefresh(); refreshRecommendationOnly(); },120); return r; };
  }catch(e){}
  try{
    const oldApply=window.__v5311ApplyAll;
    if(typeof oldApply==="function") window.__v5311ApplyAll=function(){ const r=oldApply.apply(this,arguments); setTimeout(refreshRecommendationOnly,80); return r; };
  }catch(e){}
  try{
    const userLine=$safe("userLine"); if(userLine) userLine.innerHTML=String(userLine.innerHTML).replace(/v5\.3\.\d+/g,V519);
    document.querySelectorAll(".badge,.version,.status-pill").forEach(el=>{ el.innerHTML=String(el.innerHTML).replace(/v5\.3\.\d+/g,V519); });
    document.title="Workout PRO "+V519;
  }catch(e){}
})();


/* ===== v5.3.22 EXERCISE DROPDOWN PROGRESS / DONE LOCK FIX =====
   Purpose:
   - Show per-exercise progress in the exercise dropdown: (done/target)
   - Disable completed exercises so users cannot select a finished movement
   - Keep the current Set counter, ready box, PR/weekly recommendation aligned with the selected planned exercise
   - Count alternative rows correctly via plannedExercise without changing Day Lock / Save Guard logic
*/
(function(){
  const V5322 = "v5.3.22";
  const DAYS5321 = ["Day 1","Day 2","Day 4","Day 5"];
  let applying = false;
  let lastSig = "";
  function byId(id){ try{return document.getElementById(id);}catch(e){return null;} }
  function safeText(v){ return String(v == null ? "" : v).trim(); }
  function programRows(){ try{return Array.isArray(PROGRAM) ? PROGRAM : [];}catch(e){return [];} }
  function programRow(ex){ ex=safeText(ex); return programRows().find(p=>p && p[2]===ex) || null; }
  function programDay(ex){ const p=programRow(ex); return p ? p[0] : ""; }
  function targetFor(ex){
    try{ if(typeof effectiveTargetSetsV522 === "function") return Number(effectiveTargetSetsV522(ex)) || 1; }catch(e){}
    try{ if(typeof target === "function") return Number(target(ex)) || 1; }catch(e){}
    const p=programRow(ex); return p ? Number(p[3]||1) : 1;
  }
  function dateKey(){
    const d=byId("date");
    if(d && /^\d{4}-\d{2}-\d{2}$/.test(String(d.value||""))) return d.value;
    try{ if(typeof selectedDate !== "undefined" && /^\d{4}-\d{2}-\d{2}$/.test(String(selectedDate))) return String(selectedDate); }catch(e){}
    try{ if(typeof today === "function") return today(); }catch(e){}
    const z=new Date(); return z.getFullYear()+"-"+String(z.getMonth()+1).padStart(2,"0")+"-"+String(z.getDate()).padStart(2,"0");
  }
  function activeAllowedDay(){
    try{
      if(typeof activeDay === "function"){
        const d=activeDay();
        if(DAYS5321.includes(d)) return d;
        return "";
      }
    }catch(e){}
    const ex=byId("exercise");
    return ex ? programDay(ex.value) : "";
  }
  function samePlanned(row, planned){
    planned=safeText(planned);
    const actual=safeText(row && row.exercise);
    const p=safeText(row && row.plannedExercise);
    if(!planned) return false;
    if(p) return p===planned;
    return actual===planned;
  }
  function rowsForPlanned(planned, onlyDate=true){
    const d=dateKey();
    try{
      return (Array.isArray(logs)?logs:[]).filter(x=>{
        if(onlyDate && String(x.date||"")!==String(d)) return false;
        return samePlanned(x, planned);
      }).sort((a,b)=>Number(a.setNo||0)-Number(b.setNo||0));
    }catch(e){ return []; }
  }
  function doneFor(planned){
    const rows=rowsForPlanned(planned,true);
    const maxSet=Math.max(0,...rows.map(x=>Number(x.setNo||x.setNumber||x.set||0)));
    return Math.max(rows.length, maxSet);
  }
  function firstIncomplete(day){
    for(const p of programRows().filter(p=>p && p[0]===day)){
      const done=doneFor(p[2]);
      const target=targetFor(p[2]);
      if(done < target) return p[2];
    }
    return "";
  }
  function decorateOption(opt, allowedDay){
    const planned=safeText(opt.value);
    const p=programRow(planned);
    if(!p) return {allowed:false,done:0,target:1,complete:false};
    const day=p[0];
    const target=targetFor(planned);
    const done=Math.min(target, doneFor(planned));
    const complete=target>0 && done>=target;
    const dayAllowed=!allowedDay || day===allowedDay;
    const lockTxt=dayAllowed ? "" : " 🔒";
    const status=complete ? " ✓ DONE" : (done>0 ? " ▶" : "");
    opt.textContent=`${status} ${day} - ${planned} (${done}/${target})${lockTxt}`.trim();
    opt.disabled=(!dayAllowed) || complete;
    opt.hidden=!dayAllowed;
    return {allowed:dayAllowed,done,target,complete};
  }
  function setReadyBox(planned, done, target, complete){
    const box=byId("readyStatus") || byId("exerciseStatus") || byId("sessionStatus");
    if(!box) return;
    box.className=complete ? "msg ok" : "msg";
    box.innerHTML=complete
      ? `ท่านี้ครบแล้ว: <b>${planned}</b> (${done}/${target})<br><span class="small">เลือกท่าถัดไปที่ยังไม่ครบ</span>`
      : `พร้อมบันทึก<br><b>${planned}</b>: เล่นไปแล้ว ${done}/${target} เซต • เซตถัดไปคือ Set ${Math.min(done+1,target)}`;
  }
  function applySetCounter(planned){
    const target=targetFor(planned);
    const done=Math.min(target, doneFor(planned));
    const next=Math.min(done+1,target);
    const complete=target>0 && done>=target;
    const setNo=byId("setNo"); if(setNo) setNo.textContent=String(next);
    const setTitle=byId("setTitle"); if(setTitle) setTitle.textContent=`Set ${next} / ${target}`;
    document.querySelectorAll("h2,h3,.section-title").forEach(el=>{
      const t=String(el.textContent||"").trim();
      if(/^Set\s+\d+\s*\/\s*\d+/.test(t)) el.textContent=`Set ${next} / ${target}`;
    });
    setReadyBox(planned, done, target, complete);
    const save=byId("saveBtn");
    if(save){
      if(complete){ save.disabled=true; save.style.opacity=".45"; save.dataset.exerciseComplete="1"; }
      else if(save.dataset.dayLock!=="1"){ save.disabled=false; save.style.opacity="1"; save.dataset.exerciseComplete="0"; }
    }
    return {done,target,next,complete};
  }
  function renderExerciseDropdownProgress(force=false){
    if(applying) return;
    const ex=byId("exercise"); if(!ex) return;
    const allowedDay=activeAllowedDay() || programDay(ex.value) || "Day 1";
    const sig=[dateKey(), allowedDay, (Array.isArray(logs)?logs.length:0), ex.value, force?"f":""].join("|");
    if(!force && sig===lastSig) return;
    lastSig=sig;
    applying=true;
    try{
      const before=ex.value;
      Array.from(ex.options).forEach(o=>decorateOption(o, allowedDay));
      const selectedInfo=(ex.selectedOptions && ex.selectedOptions[0]) ? decorateOption(ex.selectedOptions[0], allowedDay) : null;
      if(!before || !selectedInfo || selectedInfo.complete || !selectedInfo.allowed || (ex.selectedOptions[0] && ex.selectedOptions[0].disabled)){
        const next=firstIncomplete(allowedDay);
        if(next) ex.value=next;
      }
      const planned=safeText(ex.value) || firstIncomplete(allowedDay);
      if(planned){
        if(ex.value!==planned) ex.value=planned;
        applySetCounter(planned);
      }
    }catch(e){ console.warn("v5322 dropdown progress",e); }
    finally{ applying=false; }
  }
  function refreshAll(){
    renderExerciseDropdownProgress(true);
    try{ if(typeof updatePR === "function") updatePR(); }catch(e){}
    try{ if(typeof updateWeekly === "function") updateWeekly(); }catch(e){}
    try{ if(typeof updateNextWeekRecommendation === "function") updateNextWeekRecommendation(); }catch(e){}
    try{ if(typeof updateOrderGuidance === "function") updateOrderGuidance(); }catch(e){}
    try{ if(typeof window.__v5317Status === "function") window.__v5317Status("พร้อมใช้งาน", "ok"); }catch(e){}
  }
  function bind(){
    const ex=byId("exercise"); if(ex && ex.dataset.v5322Bound!=="1"){
      ex.dataset.v5322Bound="1";
      ex.addEventListener("change",()=>{
        try{ if(typeof window.__v5317Status === "function") window.__v5317Status("กำลังอัปเดตสถานะท่า...", "info"); }catch(e){}
        setTimeout(refreshAll,30);
        setTimeout(refreshAll,180);
      });
    }
  }
  try{
    const oldSync=sync;
    sync=function(){
      const r=oldSync.apply(this,arguments);
      setTimeout(()=>{ bind(); refreshAll(); },80);
      setTimeout(()=>{ bind(); refreshAll(); },320);
      return r;
    };
  }catch(e){}
  try{
    const oldSave=saveSet;
    saveSet=async function(){
      const r=await oldSave.apply(this,arguments);
      setTimeout(()=>{ bind(); refreshAll(); },80);
      setTimeout(()=>{ bind(); refreshAll(); },650);
      return r;
    };
  }catch(e){}
  function syncLabels(){
    try{ document.title="Workout PRO "+V5322; }catch(e){}
    try{ const u=byId("userLine"); if(u) u.innerHTML=String(u.innerHTML||"").replace(/v5\.3\.\d+/g,V5322); }catch(e){}
    try{ document.querySelectorAll(".badge,.version,.status-pill").forEach(el=>{ el.innerHTML=String(el.innerHTML||"").replace(/v5\.3\.\d+/g,V5322); }); }catch(e){}
  }
  window.__v5322RenderExerciseDropdownProgress=renderExerciseDropdownProgress;
  window.__v5322RefreshExerciseProgress=refreshAll;
  window.addEventListener("load",()=>{
    setTimeout(()=>{ syncLabels(); bind(); refreshAll(); },400);
    setTimeout(()=>{ syncLabels(); bind(); refreshAll(); },1500);
    setTimeout(()=>{ syncLabels(); bind(); refreshAll(); },3500);
  });
})();


/* ===== v5.3.22 EXERCISE DROPDOWN STICKY PROGRESS FIX =====
   Purpose:
   - Keep exercise dropdown labels decorated after any legacy sync/render rewrites options.
   - Preserve selected exercise while user opens the picker.
   - Show (done/target) consistently and disable completed / locked-day exercises.
*/
(function(){
  const VERSION_5322="v5.3.22";
  const DAYS=["Day 1","Day 2","Day 4","Day 5"];
  let applying=false;
  let observer=null;
  let lastUserPickAt=0;
  let lastSelected="";
  const $id=(id)=>{try{return document.getElementById(id)}catch(e){return null}};
  const val=(v)=>String(v==null?"":v).trim();
  function rows(){try{return Array.isArray(PROGRAM)?PROGRAM:[]}catch(e){return[]}}
  function rowFor(ex){ex=val(ex);return rows().find(p=>p&&p[2]===ex)||null}
  function dayFor(ex){const p=rowFor(ex);return p?p[0]:""}
  function targetFor(ex){
    try{if(typeof effectiveTargetSetsV522==="function")return Number(effectiveTargetSetsV522(ex))||1}catch(e){}
    try{if(typeof target==="function")return Number(target(ex))||1}catch(e){}
    const p=rowFor(ex);return p?Number(p[3]||1):1;
  }
  function dateKey(){
    const d=$id("date");
    if(d&&/^\d{4}-\d{2}-\d{2}$/.test(val(d.value)))return val(d.value);
    try{if(typeof selectedDate!=="undefined"&&/^\d{4}-\d{2}-\d{2}$/.test(val(selectedDate)))return val(selectedDate)}catch(e){}
    try{if(typeof today==="function")return today()}catch(e){}
    const z=new Date();return z.getFullYear()+"-"+String(z.getMonth()+1).padStart(2,"0")+"-"+String(z.getDate()).padStart(2,"0");
  }
  function allowedDay(){
    try{if(typeof activeDay==="function"){const d=activeDay();if(DAYS.includes(d))return d}}catch(e){}
    const ex=$id("exercise");return ex?dayFor(ex.value):"Day 1";
  }
  function isSamePlanned(log, planned){
    planned=val(planned); if(!planned) return false;
    const p=val(log&&log.plannedExercise), ex=val(log&&log.exercise);
    if(p) return p===planned;
    return ex===planned;
  }
  function doneFor(planned){
    const d=dateKey();
    let r=[];
    try{r=(Array.isArray(logs)?logs:[]).filter(x=>String(x.date||"")===String(d)&&isSamePlanned(x,planned))}catch(e){}
    const maxSet=Math.max(0,...r.map(x=>Number(x.setNo||x.setNumber||x.set||0)||0));
    return Math.max(r.length,maxSet);
  }
  function firstIncomplete(day){
    for(const p of rows().filter(p=>p&&p[0]===day)){
      if(doneFor(p[2]) < targetFor(p[2])) return p[2];
    }
    return "";
  }
  function labelFor(ex,day,done,target,complete,locked){
    const mark=complete?"✓":(done>0?"▶":"○");
    return `${mark} ${day} - ${ex} (${Math.min(done,target)}/${target})${locked?" 🔒":""}`;
  }
  function decorate(keepSelection=true){
    if(applying) return;
    const ex=$id("exercise"); if(!ex) return;
    applying=true;
    try{
      const allowed=allowedDay()||dayFor(ex.value)||"Day 1";
      const before=keepSelection?(lastSelected||ex.value):ex.value;
      let beforeAllowed=false;
      Array.from(ex.options).forEach(o=>{
        const planned=val(o.value); const p=rowFor(planned);
        if(!p) return;
        const day=p[0], target=targetFor(planned), done=Math.min(doneFor(planned),target), complete=target>0&&done>=target;
        const locked=day!==allowed;
        o.textContent=labelFor(planned,day,done,target,complete,locked);
        o.disabled=locked||complete;
        o.hidden=locked;
        if(planned===before && !o.disabled) beforeAllowed=true;
      });
      if(before && beforeAllowed) ex.value=before;
      else {
        const next=firstIncomplete(allowed);
        if(next) ex.value=next;
      }
      lastSelected=ex.value;
      updateSetInfo(ex.value);
    }catch(e){console.warn("v5322 dropdown sticky",e)}
    finally{applying=false;}
  }
  function updateSetInfo(planned){
    planned=val(planned); if(!planned) return;
    const t=targetFor(planned), d=Math.min(doneFor(planned),t), next=Math.min(d+1,t), complete=t>0&&d>=t;
    const setNo=$id("setNo"); if(setNo) setNo.textContent=String(next);
    const setTitle=$id("setTitle"); if(setTitle) setTitle.textContent=`Set ${next} / ${t}`;
    const ready=$id("readyStatus")||$id("exerciseStatus")||$id("sessionStatus");
    if(ready){
      ready.className=complete?"msg ok":"msg";
      ready.innerHTML=complete?`ท่านี้ครบแล้ว: <b>${planned}</b> (${d}/${t})<br><span class="small">เลือกท่าถัดไปที่ยังไม่ครบ</span>`:`พร้อมบันทึก<br><b>${planned}</b>: เล่นไปแล้ว ${d}/${t} เซต • เซตถัดไปคือ Set ${next}`;
    }
    const save=$id("saveBtn");
    if(save){
      if(complete){save.disabled=true;save.style.opacity=".45";save.dataset.exerciseComplete="1";}
      else if(save.dataset.dayLock!=="1"){save.disabled=false;save.style.opacity="1";save.dataset.exerciseComplete="0";}
    }
  }
  function schedule(ms=0){setTimeout(()=>decorate(true),ms)}
  function bind(){
    const ex=$id("exercise"); if(!ex) return;
    if(ex.dataset.v5322Bound!=="1"){
      ex.dataset.v5322Bound="1";
      ["pointerdown","touchstart","mousedown","focus"].forEach(ev=>ex.addEventListener(ev,()=>{lastUserPickAt=Date.now(); lastSelected=ex.value; decorate(true); schedule(60);},{passive:true}));
      ex.addEventListener("input",()=>{lastUserPickAt=Date.now(); lastSelected=ex.value; updateSetInfo(ex.value); schedule(80);});
      ex.addEventListener("change",()=>{lastUserPickAt=Date.now(); lastSelected=ex.value; updateSetInfo(ex.value); schedule(80); schedule(250);});
    }
    if(!observer){
      observer=new MutationObserver(()=>{ if(applying) return; schedule(30); });
      observer.observe(ex,{childList:true,subtree:true,characterData:true});
    }
  }
  function refresh(){bind(); decorate(true);}
  try{const oldSync=sync; sync=function(){const r=oldSync.apply(this,arguments); [50,180,500,1200].forEach(schedule); return r;};}catch(e){}
  try{const oldSave=saveSet; saveSet=async function(){const r=await oldSave.apply(this,arguments); [80,250,700,1400].forEach(schedule); return r;};}catch(e){}
  function labels(){
    try{document.title="Workout PRO "+VERSION_5322}catch(e){}
    try{const u=$id("userLine"); if(u) u.innerHTML=String(u.innerHTML||"").replace(/v5\.3\.\d+/g,VERSION_5322)}catch(e){}
    try{document.querySelectorAll(".badge,.version,.status-pill").forEach(el=>el.innerHTML=String(el.innerHTML||"").replace(/v5\.3\.\d+/g,VERSION_5322))}catch(e){}
  }
  window.__v5322ExerciseDropdownStickyRefresh=refresh;
  window.addEventListener("load",()=>{
    labels(); [100,400,900,1600,3000,6000].forEach(ms=>setTimeout(()=>{labels();refresh();},ms));
  });
})();
