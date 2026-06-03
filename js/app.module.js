// ===== script =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const VERSION="v4.3.0", $=id=>document.getElementById(id), firebaseConfig={"apiKey": "AIzaSyAcnErrLVmmBKJRLHm_ZOySkZKauGqcgfI", "authDomain": "workout-program-9eea7.firebaseapp.com", "projectId": "workout-program-9eea7", "storageBucket": "workout-program-9eea7.firebasestorage.app", "messagingSenderId": "315102427876", "appId": "1:315102427876:web:d2d5d4c89eb78fae960af1", "measurementId": "G-JHEKDYEY8B"};
const PROGRAM=[
["Day 1","Push","Barbell Bench Press",4,"5-8","Chest","heavy"],["Day 1","Push","Incline Dumbbell Press",3,"8-12","Chest","standard"],["Day 1","Push","Seated Shoulder Press",3,"8-12","Shoulder","standard"],["Day 1","Push","Dumbbell Lateral Raise",4,"12-15","Shoulder","quick"],["Day 1","Push","Cable Triceps Pushdown",3,"10-15","Triceps","quick"],
["Day 2","Pull","Lat Pulldown",4,"8-12","Back","standard"],["Day 2","Pull","Barbell Row",4,"6-10","Back","heavy"],["Day 2","Pull","Seated Cable Row",3,"10-12","Back","standard"],["Day 2","Pull","Face Pull",3,"12-15","Rear Delt","quick"],["Day 2","Pull","Dumbbell Curl",3,"10-15","Biceps","quick"],
["Day 4","Upper","Incline Machine Press",3,"10-12","Chest","standard"],["Day 4","Upper","Chest Supported Row",3,"10-12","Back","standard"],["Day 4","Upper","Machine Shoulder Press",3,"10-12","Shoulder","standard"],["Day 4","Upper","Cable Fly",3,"12-15","Chest","quick"],["Day 4","Upper","Hammer Curl",3,"10-15","Biceps","quick"],["Day 4","Upper","Overhead Triceps Extension",3,"10-15","Triceps","quick"],
["Day 5","Leg","Back Squat",4,"5-8","Legs","heavy"],["Day 5","Leg","Romanian Deadlift",4,"6-10","Hamstrings","heavy"],["Day 5","Leg","Leg Press",3,"10-15","Quads","standard"],["Day 5","Leg","Walking Lunge",3,"10/side","Legs","standard"],["Day 5","Leg","Lying Leg Curl",3,"12-15","Hamstrings","quick"],["Day 5","Leg","Standing Calf Raise",4,"12-20","Calves","quick"]];
const DAY_ORDER=["Day 1","Day 2","Day 4","Day 5"], REST={quick:45,standard:75,heavy:105};

function localDateKey(d=new Date()){
  const x=new Date(d);
  x.setMinutes(x.getMinutes()-x.getTimezoneOffset());
  return x.toISOString().slice(0,10);
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
$("teamId").value=teamId;selectedDate=localDateKey();$("date").value=selectedDate;PROGRAM.forEach(p=>{let o=document.createElement("option");o.value=p[2];o.textContent=`${p[0]} - ${p[2]}`;$("exercise").appendChild(o)});
const meta=()=>PROGRAM.find(p=>p[2]===$("exercise").value), target=ex=>{let p=PROGRAM.find(p=>p[2]===ex);return p?+p[3]:1}, planned=x=>x.plannedExercise||x.exercise;
function toKg(v,u){return u==="lb"?v/2.2046:v} function fromKg(v,u){return u==="lb"?(+v*2.2046||0).toFixed(1):(+v||0).toFixed(1)}
function today(){return localDateKey()} function parseD(s){let [y,m,d]=String(s).split("-").map(Number);return new Date(y,m-1,d)} function keyD(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")} function addDays(d,n){let x=new Date(d);x.setDate(x.getDate()+n);return x}
function diffDate(s){let a=new Date(),b=parseD(s);a.setHours(0,0,0,0);b.setHours(0,0,0,0);return Math.round((a-b)/86400000)}
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
function applyMeta(){let m=meta();if(!m)return;$("targetSets").value=m[3];$("targetShow").textContent=m[3];let mode=$("restMode").value;$("restSec").value=mode==="auto"?REST[m[6]]:(mode==="custom"?$("restSec").value:mode)}
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
  $("calendarSyncStatus").innerHTML=`Calendar Sync<br>Today: <b>${s.today}</b><br>Selected: <b>${s.selected}</b><br>Active Day: <b>${s.active}</b><br>${s.note}`;
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
  const date = $("date") ? $("date").value : (typeof calSyncTodayKey==="function" ? calSyncTodayKey() : new Date().toISOString().slice(0,10));
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
function exSessionBindDropdown(){
  if(!$("exercise") || $("exercise").dataset.exSessionBound==="1") return;
  $("exercise").dataset.exSessionBound="1";
  $("exercise").addEventListener("change",()=>{
    exSessionSaveCurrent();
    if(selectedAlt && selectedAlt.original && meta&&meta() && selectedAlt.original!==meta()[2]) selectedAlt=null;
    if(typeof renderMediaPanel==="function") renderMediaPanel();
    if(typeof historySummaryForCurrent==="function") historySummaryForCurrent();
    exSessionRestore($("exercise").value);
    if(typeof updatePR==="function") updatePR();
    if(typeof updateWeeklySuggestion==="function") updateWeeklySuggestion();
    if(typeof updateNextWeekRecommendation==="function") updateNextWeekRecommendation();
  });
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
  if(!$("exercise") || $("exercise").dataset.canonicalSetBound==="1") return;
  $("exercise").dataset.canonicalSetBound="1";
  $("exercise").addEventListener("change",()=>{
    if(selectedAlt && selectedAlt.original && meta&&meta() && selectedAlt.original!==meta()[2]) selectedAlt=null;
    if(typeof renderMediaPanel==="function") renderMediaPanel();
    if(typeof historySummaryForCurrent==="function") historySummaryForCurrent();
    applyCanonicalSetDisplay($("exercise").value);
    if(typeof updatePR==="function") updatePR();
    if(typeof updateWeeklySuggestion==="function") updateWeeklySuggestion();
    if(typeof updateNextWeekRecommendation==="function") updateNextWeekRecommendation();
  });
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
  if($("exercise") && $("exercise").dataset.stableRenderBound!=="1"){
    $("exercise").dataset.stableRenderBound="1";
    $("exercise").addEventListener("change",()=>setTimeout(stableRenderAllPanels,50));
  }
  if($("date") && $("date").dataset.stableRenderBound!=="1"){
    $("date").dataset.stableRenderBound="1";
    $("date").addEventListener("change",()=>setTimeout(stableRenderAllPanels,50));
  }
}



function bindAutoPersistentAlternative(){
  if($("exercise") && $("exercise").dataset.autoPersistentAltBound!=="1"){
    $("exercise").dataset.autoPersistentAltBound="1";
    $("exercise").addEventListener("change",()=>{
      autoApplyPersistentAlternative();
      if(typeof renderMediaPanel==="function") renderMediaPanel();
      if(typeof historySummaryForCurrent==="function") historySummaryForCurrent();
      if(typeof updatePR==="function") updatePR();
      if(typeof updateWeeklySuggestion==="function") updateWeeklySuggestion();
      if(typeof updateNextWeekRecommendation==="function") updateNextWeekRecommendation();
    });
  }
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
  if(!$("exercise") || $("exercise").dataset.stateFixBound==="1") return;
  $("exercise").dataset.stateFixBound="1";
  $("exercise").addEventListener("change", ()=>{
    forceMediaToSelectedExercise();
    syncSelectedExerciseState();
    if(typeof updatePR==="function") updatePR();
    if(typeof updateWeeklySuggestion==="function") updateWeeklySuggestion();
    if(typeof updateNextWeekRecommendation==="function") updateNextWeekRecommendation();
  });
}

function sync(){updateDateStatus();let wk=autoWeek();$("week").value=wk;$("kWeek").textContent=wk;let st=nextState(),ad=activeDay(),c=activeCycle();
if(st && st.dateLock){
  $("lockStatus").innerHTML=`<b>${st.day}</b> ยังถูกล็อกตามวัน<br>${st.message}`;
  $("setStatus").textContent="ยังบันทึกไม่ได้ เพราะต้องรอวันตามโปรแกรม";
  if($("saveBtn")) $("saveBtn").disabled=true;
  Array.from($("exercise").options).forEach(o=>{
    const p=PROGRAM.find(p=>p[2]===o.value);
    if(p) {o.disabled=true; o.textContent=`${p[0]} - ${p[2]} 🔒 รอวัน`; }
  });
  if(typeof updateCycleDebug==="function") updateCycleDebug(); if(typeof updateDayDateLockDebug==="function") updateDayDateLockDebug();updateDayDateLockDebug();
  renderMediaPanel();syncSelectedExerciseState();calSyncUpdateStatus();if($('exercise')) applyCanonicalSetDisplay($('exercise').value);stableRenderAllPanels();autoApplyPersistentAlternative();renderSafe();
  return;
}if(st.restLock){$("lockStatus").innerHTML=`พักยังไม่ครบ 2 วัน<br>Rest: <b>${st.rest}/2</b><br>เริ่ม Day 1 ได้เร็วสุด: <b>${st.earliest}</b>`;$("setStatus").textContent="ยังบันทึก Day 1 รอบใหม่ไม่ได้";$("saveBtn").disabled=true;Array.from($("exercise").options).forEach(o=>{o.disabled=true;o.textContent=o.value+" 🔒 Rest"});renderSafe();return}$("lockStatus").innerHTML=`Auto Week ${wk}: ปลดล็อก <b>${ad}</b><br>${DAY_ORDER.map(d=>d+(dayComplete(c,d)?" ✅":" 🔒")).join(" / ")}`;Array.from($("exercise").options).forEach(o=>{let p=PROGRAM.find(p=>p[2]===o.value),done=countActive(o.value),t=target(o.value),locked=(ad==="REST_LOCK"||ad==="COMPLETE"||p[0]!==ad||done>=t);o.disabled=locked;o.textContent=`${p[0]} - ${p[2]}${p[0]!==ad?" 🔒":done>=t?" ✅ ครบ":` (${done}/${t})`}`});if(st&&!st.complete){if(!canSaveCurrentExerciseAdaptive()){$("exercise").value=st.exercise;}applyMeta();updateAltMemoryUI(st.exercise);currentSet=st.next;$("setNo").textContent=st.next;$("targetShow").textContent=st.target;$("setStatus").innerHTML=`ค้างอยู่: <b>${st.exercise}</b><br>เล่นแล้ว ${st.done}/${st.target} • เหลือ ${st.remain} เซต`;$("saveBtn").disabled=false}else{$("setStatus").textContent="Cycle นี้ครบแล้ว";$("saveBtn").disabled=true}applyPersistentAltIfExists();updatePersistentAltUI();historySummaryForCurrent();updatePR();updateWeekly();updateNextWeekRecommendation();updateOrderGuidance();renderHypertrophyIntelligence();renderSafe()}


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

async function saveSet(){try{$("saveDebug").className="msg";$("saveDebug").textContent="กำลังบันทึก...";if(!user)return alert("Login ก่อน");if(!teamId)return alert("ใส่ Team ID ก่อน");if(!validateDate())return;let m=meta(),ad=activeDay(),st=nextState(),wk=autoWeek();if(st.restLock)return alert("ยังพักไม่ครบ 2 วัน");if(!canSaveCurrentExerciseAdaptive())return alert("ท่านี้ยังไม่สามารถบันทึกได้: อาจเป็นคนละ Day หรือครบเซตแล้ว");let raw=parseFloat($("weight").value),reps=parseInt($("reps").value),rir=parseInt($("rir").value||2);if(!raw||!reps)return alert("กรอก Weight และ Reps");let rememberedAlt=altMemoryForPlanned(m[2]);let persistentAlt=(typeof autoApplyPersistentAlternative==="function"?autoApplyPersistentAlternative():null);let effectiveAlt=selectedAlt||persistentAlt||rememberedAlt;let computedSetNo=canonicalSetState(m[2]).next;let w=toKg(raw,$("unit").value),ex=effectiveAlt?effectiveAlt.name:m[2];await addDoc(collection(db,`teams/${teamId}/workouts`),cleanForFirestore({date:$("date").value,week:wk,autoWeek:wk,day:m[0],focus:m[1],exercise:ex,plannedExercise:m[2],isAlternative:!!effectiveAlt,alternativePattern:effectiveAlt?effectiveAlt.pattern:"",alternativeQuery:(effectiveAlt&&effectiveAlt.query)?effectiveAlt.query:"",targetSets:m[3],setNo:computedSetNo,muscle:m[5],weight:w,reps,rir,volume:w*reps,note:$("note").value||"",sleepHours:parseFloat($("sleepHours")?.value||7),soreness:parseInt($("soreness")?.value||2),stress:parseInt($("stress")?.value||2),tempo:$("tempo")?.value||"",repQuality:$("repQuality")?.value||"",biasMode:$("biasMode")?.value||"auto",effectiveReps:effectiveRepsForSet({reps,rir}),userId:user.uid,userName:user.displayName||user.email,userEmail:user.email,appVersion:VERSION,createdAt:serverTimestamp()})); if(typeof exSessionAfterSave==="function") exSessionMarkSavedLocal(m[2]); applyCanonicalSetDisplay(m[2]);selectedAlt=null;$("weight").value="";$("reps").value="";$("rir").value=2;$("note").value="";$("saveDebug").className="msg ok";$("saveDebug").textContent="บันทึกสำเร็จ ✅";startRest();setTimeout(sync,600);setTimeout(v403Run,250);setTimeout(fullStabilizationRun,950);setTimeout(coachCoreRun,950);setTimeout(authDebugGuardRun,950);setTimeout(permissionSafeRun,900);setTimeout(plateauLiveRecompute,900);setTimeout(stableRenderAllPanels,700)}catch(e){$("saveDebug").className="msg err";$("saveDebug").textContent="Save error: "+e.message;alert("Save error: "+e.message)}}
function subscribe(){if(unsub)unsub();if(!teamId)return;unsub=onSnapshot(query(collection(db,`teams/${teamId}/workouts`),orderBy("createdAt","desc")),s=>{logs=s.docs.map(d=>({id:d.id,...d.data()}));$("debug").className="msg ok";$("debug").textContent=`โหลดข้อมูลแล้ว ${logs.length} sets • ${VERSION}`;renderAll()},e=>{$("debug").className="msg err";$("debug").textContent=e.message})}
onAuthStateChanged(auth,u=>{user=u;$("authState").textContent=u?`Login: ${u.displayName||u.email}`:"ยังไม่ได้ login";$("userLine").textContent=u?`${u.displayName||u.email} / Team: ${teamId||"-"} / ${VERSION}`:`Clean QA • ${VERSION}`;if(u&&teamId)subscribe()});
$("loginBtn").onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>alert(e.message));$("logoutBtn").onclick=()=>signOut(auth);$("saveTeamBtn").onclick=()=>{teamId=$("teamId").value.trim();localStorage.setItem("teamId",teamId);subscribe()};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(b.dataset.page).classList.add("active");document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));b.classList.add("active");renderAll()});
$("exercise").onchange=()=>{selectedAlt=null;$("altStatus").textContent="ยังไม่ได้เลือกท่าทดแทน";applyMeta();sync()};$("date").onchange=()=>{selectedDate=$("date").value;sync()};$("unit").onchange=sync;$("saveBtn").onclick=saveSet;$("resetBtn").onclick=sync;
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
function renderRecent(){$("recent").innerHTML=logs.slice(0,20).map(x=>`<div class="item"><h3>Week ${x.week||x.autoWeek} • Set ${x.setNo}/${x.targetSets} • ${x.exercise}</h3><div class="meta">${x.date} • ${x.day}<br>${fromKg(x.weight,$("unit").value)} ${$("unit").value} × ${x.reps} • Vol ${(+x.volume||0).toFixed(0)} kg${x.isAlternative?`<br>แทน: ${x.plannedExercise}`:""}</div><button class="red" onclick="deleteLog('${x.id}')">ลบ</button></div>`).join("")||"<p class='small'>ยังไม่มีข้อมูล</p>"}window.deleteLog=async id=>{if(confirm("ลบเซตนี้?"))await deleteDoc(doc(db,`teams/${teamId}/workouts`,id))};
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

function renderDashboard(){try{$("kVol").textContent=logs.reduce((a,b)=>a+(+b.volume||0),0).toFixed(0);$("kSets").textContent=logs.length;$("kUsers").textContent=new Set(logs.map(x=>x.userId)).size;$("kWeek").textContent=autoWeek();drawLine("weekChart",group(logs,x=>+(x.week||x.autoWeek||1)),"Auto Weekly Volume");drawBars("exChart",group(logs,x=>x.exercise),"Exercise Volume");$("chartStatus").textContent="Dashboard OK"}catch(e){$("chartStatus").textContent="Dashboard error: "+e.message}}function group(arr,keyFn){let g={};arr.forEach(x=>{let k=keyFn(x)||"-";g[k]=(g[k]||0)+(+x.volume||0)});return g}function drawLine(id,obj,title){let c=$(id),ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#020617";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#94a3b8";ctx.fillText(title,20,25);let ks=Object.keys(obj).sort((a,b)=>+a-+b);if(!ks.length){ctx.fillText("No data yet",330,130);return}let vals=ks.map(k=>obj[k]),max=Math.max(...vals)*1.15||1,p=45,W=c.width-p*2,H=c.height-p*2;ctx.strokeStyle="#38bdf8";ctx.lineWidth=4;ctx.beginPath();ks.forEach((k,i)=>{let x=p+(ks.length===1?W/2:W*i/(ks.length-1)),y=p+H-(vals[i]/max)*H;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.stroke()}function drawBars(id,obj,title){let c=$(id),ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#020617";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#94a3b8";ctx.fillText(title,20,25);let ks=Object.keys(obj).sort((a,b)=>obj[b]-obj[a]).slice(0,8);if(!ks.length){ctx.fillText("No data yet",330,130);return}let max=Math.max(...ks.map(k=>obj[k]))||1,p=45,W=c.width-p*2,H=c.height-p*2,bw=W/ks.length*.55;ks.forEach((k,i)=>{let x=p+W*(i+.2)/ks.length,h=obj[k]/max*H;ctx.fillStyle="#2563eb";ctx.fillRect(x,p+H-h,bw,h);ctx.fillStyle="#fff";ctx.font="11px Arial";ctx.fillText(k.slice(0,9),x,p+H+18)})}
function fmt(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}function dayForDate(d){let a=logs.filter(x=>x.date===d);if(!a.length)return null;let c={};a.forEach(x=>c[x.day]=(c[x.day]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]}function renderCalendar(){let grid=$("calGrid");grid.innerHTML="";let names=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];$("monthTitle").textContent=names[calDate.getMonth()]+" "+calDate.getFullYear();["อา","จ","อ","พ","พฤ","ศ","ส"].forEach(h=>grid.innerHTML+=`<div class="calHead">${h}</div>`);let first=new Date(calDate.getFullYear(),calDate.getMonth(),1),last=new Date(calDate.getFullYear(),calDate.getMonth()+1,0).getDate();for(let i=0;i<first.getDay();i++)grid.innerHTML+=`<div class="calDay empty"></div>`;for(let d=1;d<=last;d++){let key=fmt(new Date(calDate.getFullYear(),calDate.getMonth(),d)),a=logs.filter(x=>x.date===key),day=dayForDate(key),sel=key===selectedDate?" sel":"",tod=key===today()?" today":"";grid.innerHTML+=`<div class="calDay${sel}${tod}" data-date="${key}"><b>${d}</b><br><span class="calTag ${a.length?'partial':'rest'}">${day||'Rest'}</span>${a.length?`<div class="small">${a.length} sets</div>`:""}</div>`}grid.querySelectorAll(".calDay[data-date]").forEach(el=>el.onclick=()=>{selectedDate=el.dataset.date;$("date").value=selectedDate;sync();document.querySelector('[data-page="log"]').click()})}function renderDaySummary(d){let a=logs.filter(x=>x.date===d);$("dayTitle").textContent="Daily Summary: "+d;if(!a.length){$("daySummary").innerHTML="ยังไม่มีข้อมูล";return}let by={};a.forEach(x=>{if(!by[x.exercise])by[x.exercise]=[];by[x.exercise].push(x)});$("daySummary").innerHTML=Object.entries(by).map(([ex,arr])=>{let max=arr.reduce((m,x)=>+x.weight>+m.weight?x:m,arr[0]);return `<div class="item"><h3>${ex}</h3><div class="meta">Sets: ${arr.length}<br>Max: ${fromKg(max.weight,$("unit").value)} ${$("unit").value} × ${max.reps}${max.isAlternative?`<br>แทน: ${max.plannedExercise}`:""}</div></div>`}).join("")}
$("prevM").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()-1,1);renderCalendar()};$("nextM").onclick=()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()+1,1);renderCalendar()};
function renderSafe(){try{renderDashboard();renderCoach();renderCalendar();renderDaySummary(selectedDate)}catch(e){$("chartStatus").textContent="Render fallback: "+e.message}}
/* v4.3.0 Full Feature Pack
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
  p.innerHTML='<h3>Coach Core Stabilization</h3><div class="msg ok">v4.3.0<br>Module-scoped logs access: FIXED<br>Plateau: productive trend + full exercise list<br>History Remap: movement guard<br>Alternative: auto apply guard</div>';
  setup.appendChild(p);
}
function coachCoreRun(){ if(window.__v404TooSoon&&window.__v404TooSoon('coachCoreRun',1200)) return; 
  try{autoApplyPersistentAlternative();}catch(e){}
  try{historySummaryForCurrent();}catch(e){}
  try{renderPlateauDetectionSafe();}catch(e){}
  try{coachCoreStatusPanel();}catch(e){}
}
window.addEventListener("load",function(){
  setTimeout(coachCoreRun,600);
  setTimeout(coachCoreRun,1500);
  setTimeout(coachCoreRun,3000);
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

window.addEventListener("load",function(){setTimeout(fullStabilizationRun,800);});


/* v4.3.0 Stable Recovery: scoped complete card and throttled stabilization */
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





/* v4.3.0 Full Feature Pack */
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
  const payload={type:"DAY_SKIP_OVERRIDE",date:($("date")&&$("date").value)||new Date().toISOString().slice(0,10),fromDay:(typeof activeDay==="function"?activeDay():""),toDay:targetDay,reason:reason||"manual override",createdAt:new Date().toISOString()};
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
    if(saveBtn){ if(c.allComplete){saveBtn.disabled=true;saveBtn.style.opacity=".45";} else {saveBtn.disabled=false;saveBtn.style.opacity="1";} }
  }catch(e){console.warn("v403RenderUnlockPanel",e);}
}
function v403Run(){ if(window.__v404TooSoon&&window.__v404TooSoon('v403Run',900)) return; 
  try{v403RenderUnlockPanel();}catch(e){}
}

function renderAll(){setTimeout(v430RenderAllFeaturePanels,120); if(window.__v404TabSwitching){return;} setTimeout(v403Run,80);setTimeout(plateauLiveRecompute,120);setTimeout(renderPlateauDetectionSafe,120);bindAutoPersistentAlternative();autoApplyPersistentAlternative();bindStableRenderTriggers();setTimeout(stableRenderAllPanels,80);bindCanonicalExerciseSwitch(); if($('exercise')) applyCanonicalSetDisplay($('exercise').value);exSessionBindDropdown(); if($('exercise')) exSessionRestore($('exercise').value);calSyncBind();calSyncUpdateStatus();exSessionBindDropdown(); if($('exercise')) exSessionRestore($('exercise').value);historySummaryForCurrent();bindPersistentAltButtons();if(typeof renderMediaPanel==="function")renderMediaPanel();bindAiCoachButtons();renderRecent();renderProgram();renderGuide();renderDashboard();renderCoach();renderCalendar();renderDaySummary(selectedDate);sync()}
updateDateStatus();renderAll();

document.addEventListener("DOMContentLoaded",()=>bindAiCoachButtons());

window.addEventListener('load',()=>{setTimeout(()=>{try{v430RestoreDraft();v430RenderAllFeaturePanels();}catch(e){}},900);});



/* ===== v4.3.0 Feature Functions ===== */
function v430SafeLogs(){try{return Array.isArray(logs)?logs:[]}catch(e){return []}}
function v430CurrentExercise(){return $("exercise")?$("exercise").value:""}
function v430Today(){return (typeof today==="function"?today():(new Date()).toISOString().slice(0,10))}
function v430SessionKey(){return "workoutDraftSessionV430"}
function v430SaveResumeState(){try{const st={date:$("date")?.value||v430Today(),week:$("week")?.value||"",day:typeof activeDay==="function"?activeDay():"",exercise:v430CurrentExercise(),set:$("setNo")?.textContent||"",target:$("targetShow")?.textContent||"",updatedAt:new Date().toISOString()};localStorage.setItem("workoutResumeState",JSON.stringify(st));}catch(e){}}
function v430RenderResume(){try{const el=$("v430ResumeBox");if(!el)return;const st=JSON.parse(localStorage.getItem("workoutResumeState")||"null");if(!st){el.className="msg info";el.innerHTML="ยังไม่มี session ล่าสุด";return;}el.className="msg ok";el.innerHTML=`ล่าสุด<br><b>${st.week?`Week ${st.week}`:""}</b> ${st.day||""}<br>${st.exercise||"-"}<br>Set ${st.set||"-"} / ${st.target||"-"}<br><span class="small">${st.date||""}</span>`;const btn=$("v430ResumeBtn");if(btn&&!btn.dataset.v430Bound){btn.dataset.v430Bound="1";btn.onclick=()=>{try{if(st.date&&$("date"))$("date").value=st.date;if(st.exercise&&$("exercise"))$("exercise").value=st.exercise;if(window.v430ActivatePage)window.v430ActivatePage("log");renderAll();}catch(e){}}}}catch(e){console.warn("v430RenderResume",e)}}
function v430BindDraftSave(){["weight","reps","rir","note","tempo","repQuality","biasMode","exercise","date"].forEach(id=>{const el=$(id);if(!el||el.dataset.v430DraftBound==="1")return;el.dataset.v430DraftBound="1";el.addEventListener("input",v430SaveDraft);el.addEventListener("change",v430SaveDraft);});}
function v430SaveDraft(){try{const d={date:$("date")?.value||"",exercise:$("exercise")?.value||"",weight:$("weight")?.value||"",reps:$("reps")?.value||"",rir:$("rir")?.value||"",note:$("note")?.value||"",tempo:$("tempo")?.value||"",repQuality:$("repQuality")?.value||"",biasMode:$("biasMode")?.value||"",updatedAt:new Date().toISOString()};localStorage.setItem(v430SessionKey(),JSON.stringify(d));const s=$("v430DraftStatus");if(s){s.className="msg ok";s.innerHTML="Draft Save: บันทึกอัตโนมัติแล้ว";}v430SaveResumeState();}catch(e){}}
function v430RestoreDraft(){try{const d=JSON.parse(localStorage.getItem(v430SessionKey())||"null");if(!d)return;[["date","date"],["exercise","exercise"],["weight","weight"],["reps","reps"],["rir","rir"],["note","note"],["tempo","tempo"],["repQuality","repQuality"],["biasMode","biasMode"]].forEach(([id,k])=>{if($(id)&&d[k]!==undefined&&d[k]!==null&&d[k]!=="")$(id).value=d[k]});const s=$("v430DraftStatus");if(s){s.className="msg info";s.innerHTML="Draft Save: กู้ข้อมูลล่าสุดแล้ว";}}catch(e){}}
function v430BestByExercise(){const map={};v430SafeLogs().forEach(x=>{const ex=x.exercise||x.plannedExercise;if(!ex)return;const score=Number(x.weight||0)*Number(x.reps||0);if(!map[ex]||score>map[ex].score)map[ex]={...x,score};});return map;}
function v430RenderPRDashboard(){try{const el=$("v430PrDashboard");if(!el)return;const rows=Object.entries(v430BestByExercise()).sort((a,b)=>b[1].score-a[1].score).slice(0,10);if(!rows.length){el.className="msg info";el.innerHTML="ยังไม่มี PR";return;}el.className="msg ok";el.innerHTML=rows.map(([ex,x],i)=>`${i+1}. <b>${ex}</b><br>${Number(x.weight||0).toFixed(1)} kg × ${x.reps||0}`).join("<hr>");}catch(e){console.warn("v430RenderPRDashboard",e)}}
function v430MuscleVolume(days=14){const since=new Date();since.setDate(since.getDate()-days);const m={};v430SafeLogs().forEach(x=>{try{if(x.date&&typeof parseD==="function"&&parseD(x.date)<since)return;}catch(e){}const ex=x.plannedExercise||x.exercise||"";const p=(PROGRAM||[]).find(r=>r[2]===ex)||[];const muscle=p[5]||"Other";m[muscle]=(m[muscle]||0)+(Number(x.weight||0)*Number(x.reps||0));});return m;}
function v430RenderVolumeDashboard(){try{const box=$("v430VolumeSummary");if(!box)return;const rows=Object.entries(v430MuscleVolume(14)).sort((a,b)=>b[1]-a[1]);box.innerHTML=rows.length?rows.map(([k,v])=>`${k}: <b>${Math.round(v)}</b> kg`).join(" • "):"ยังไม่มีข้อมูล Volume";const cv=$("v430VolumeChart");if(cv&&cv.getContext){const ctx=cv.getContext("2d"),w=cv.width,h=cv.height;ctx.clearRect(0,0,w,h);const max=Math.max(1,...rows.map(r=>r[1]));ctx.font="18px sans-serif";rows.slice(0,8).forEach(([k,v],i)=>{const bh=(h-40)*(v/max),x=25+i*((w-50)/8),y=h-25-bh;ctx.fillRect(x,y,35,bh);ctx.fillText(k.slice(0,8),x,h-5);});}}catch(e){console.warn("v430RenderVolumeDashboard",e)}}
function v430RecoveryScoreFrom(x){const sleep=Number(x.sleepHours||$("sleepHours")?.value||7);const soreness=Number(x.soreness||$("soreness")?.value||2);const stress=Number(x.stress||$("stress")?.value||2);const rec=Math.max(0,Math.min(100,Math.round((sleep/8)*55+(6-soreness)*5+(6-stress)*5)));const fatigue=Math.max(0,Math.min(100,100-rec+Math.round((soreness+stress)*4)));return{rec,fatigue,sleep,soreness,stress};}
function v430RenderRecoveryDashboard(){try{const el=$("v430RecoveryDash");if(!el)return;const latest=[...v430SafeLogs()].reverse().find(x=>x.sleepHours||x.soreness||x.stress)||{};const s=v430RecoveryScoreFrom(latest);el.className=s.rec>=65?"msg ok":s.rec>=45?"msg warn":"msg bad";el.innerHTML=`Recovery Score: <b>${s.rec}</b><br>Fatigue Risk: <b>${s.fatigue}</b><br>Sleep ${s.sleep}h • Soreness ${s.soreness} • Stress ${s.stress}`;}catch(e){console.warn("v430RenderRecoveryDashboard",e)}}
function v430RenderDeload(){try{const el=$("v430DeloadBox");if(!el)return;const s=v430RecoveryScoreFrom({});const recent=v430SafeLogs().slice(-30);const lowPerf=recent.filter(x=>Number(x.rir||2)<=0||String(x.note||"").includes("เจ็บ")).length;const suggest=s.fatigue>=65||lowPerf>=3;el.className=suggest?"msg warn":"msg ok";el.innerHTML=suggest?`⚠ Deload Recommended<br>ลด volume 30–40% / ใช้ machine stable / คุม RIR 2–3`:`ยังไม่จำเป็นต้อง deload<br>Recovery ${s.rec} / Fatigue ${s.fatigue}`;const btn=$("v430ApplyDeloadBtn");if(btn&&!btn.dataset.v430Bound){btn.dataset.v430Bound="1";btn.onclick=()=>{localStorage.setItem("workoutDeloadMode","ON");alert("เปิด Deload Suggestion แล้ว");v430RenderDeload();}}}catch(e){console.warn("v430RenderDeload",e)}}
function v430ExerciseDb(){try{const ex=v430CurrentExercise();const el=$("v430ExerciseDb");if(!el)return;const media=(typeof MEDIA_DB!=="undefined"&&MEDIA_DB[ex])?MEDIA_DB[ex]:{query:`${ex} proper form`,cue:"ตรวจ form ให้ตรงกับท่า คุม ROM และไม่มีจุดเจ็บ"};const alts=(ALT&&ALT[ex])?ALT[ex].map(a=>a[0]).join(", "):"ไม่มี alternative";el.innerHTML=`<b>${ex||"-"}</b><br>Cue: ${media.cue}<br>Search: ${media.query}<br>Alternative: ${alts}<br><span class="small">Mistake: อย่าเหวี่ยงน้ำหนัก / อย่าฝืนจุดเจ็บ / คุมช่วงลง</span>`;}catch(e){console.warn("v430ExerciseDb",e)}}
function v430AiSummary(){try{const el=$("v430AiSummary");if(!el)return;const d=$("date")?.value||v430Today();const rows=v430SafeLogs().filter(x=>x.date===d);if(!rows.length){el.className="msg info";el.innerHTML="ยังไม่มี log วันนี้";return;}const vol=rows.reduce((a,x)=>a+Number(x.weight||0)*Number(x.reps||0),0);const exs=[...new Set(rows.map(x=>x.exercise))].filter(Boolean);const s=v430RecoveryScoreFrom(rows[rows.length-1]||{});el.className="msg ok";el.innerHTML=`วันนี้บันทึก ${rows.length} sets<br>Volume รวม ${Math.round(vol)} kg<br>ท่าที่เล่น: ${exs.join(", ")}<br>Recovery ${s.rec} / Fatigue ${s.fatigue}<br>คำแนะนำ: ${s.fatigue>60?"คุม RIR 2–3 และอย่าเพิ่มน้ำหนัก":"เพิ่ม reps ก่อน แล้วค่อยเพิ่มน้ำหนักเมื่อถึง ceiling"}`;const btn=$("v430CopySummaryBtn");if(btn&&!btn.dataset.v430Bound){btn.dataset.v430Bound="1";btn.onclick=()=>navigator.clipboard&&navigator.clipboard.writeText(el.innerText);}}catch(e){console.warn("v430AiSummary",e)}}
function v430RenderAllFeaturePanels(){v430RenderResume();v430BindDraftSave();v430RenderPRDashboard();v430RenderVolumeDashboard();v430RenderRecoveryDashboard();v430RenderDeload();v430ExerciseDb();v430AiSummary();}
