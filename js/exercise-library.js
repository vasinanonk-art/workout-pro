export const PROGRAM = [
  ["Day 1","Push","Barbell Bench Press",4,"5-8","Chest","heavy"], ["Day 1","Push","Incline Dumbbell Press",3,"8-12","Chest","standard"], ["Day 1","Push","Seated Shoulder Press",3,"8-12","Shoulder","standard"], ["Day 1","Push","Dumbbell Lateral Raise",4,"12-15","Shoulder","quick"], ["Day 1","Push","Cable Triceps Pushdown",3,"10-15","Triceps","quick"],
  ["Day 2","Pull","Lat Pulldown",4,"8-12","Back","standard"], ["Day 2","Pull","Barbell Row",4,"6-10","Back","heavy"], ["Day 2","Pull","Seated Cable Row",3,"10-12","Back","standard"], ["Day 2","Pull","Face Pull",3,"12-15","Rear Delt","quick"], ["Day 2","Pull","Dumbbell Curl",3,"10-15","Biceps","quick"],
  ["Day 4","Upper","Incline Machine Press",3,"10-12","Chest","standard"], ["Day 4","Upper","Chest Supported Row",3,"10-12","Back","standard"], ["Day 4","Upper","Machine Shoulder Press",3,"10-12","Shoulder","standard"], ["Day 4","Upper","Cable Fly",3,"12-15","Chest","quick"], ["Day 4","Upper","Hammer Curl",3,"10-15","Biceps","quick"], ["Day 4","Upper","Overhead Triceps Extension",3,"10-15","Triceps","quick"],
  ["Day 5","Leg","Back Squat",4,"5-8","Legs","heavy"], ["Day 5","Leg","Romanian Deadlift",4,"6-10","Hamstrings","heavy"], ["Day 5","Leg","Leg Press",3,"10-15","Quads","standard"], ["Day 5","Leg","Walking Lunge",3,"10/side","Legs","standard"], ["Day 5","Leg","Lying Leg Curl",3,"12-15","Hamstrings","quick"], ["Day 5","Leg","Standing Calf Raise",4,"12-20","Calves","quick"]
];
export const ALT = {
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
export const ALT_TIER = {
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
export const PLANNED_BY_ALTERNATIVE=(()=>{
  const candidates=new Map();
  PROGRAM.forEach(([, ,planned])=>{
    (ALT[planned]||[]).forEach(alternative=>{
      if(!candidates.has(alternative)) candidates.set(alternative,[]);
      const list=candidates.get(alternative);
      if(!list.includes(planned)) list.push(planned);
    });
  });
  return candidates;
})();

export const ALTERNATIVE_REASONS = new Set(["equipment_unavailable","machine_unavailable","joint_friendly","dumbbell_only","barbell_only","bodyweight","limited_space"]);
function exerciseId(name){ return String(name||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function equipmentForExercise(name){
  const value=String(name||"").toLowerCase();
  if(/push-up|pull-up|chin-up|dip|nordic/.test(value)) return "bodyweight";
  if(/dumbbell/.test(value)) return "dumbbell";
  if(/barbell|ez bar|good morning|stiff-leg/.test(value)) return "barbell";
  if(/smith/.test(value)) return "smith_machine";
  if(/cable|rope|pulldown|face pull/.test(value)) return "cable";
  if(/machine|pec deck|leg press|hack squat|v-squat|pendulum/.test(value)) return "machine";
  if(/band/.test(value)) return "resistance_band";
  if(/swiss ball/.test(value)) return "stability_ball";
  return "free_weight_or_machine";
}
function movementPatternForExercise(name,muscle){
  const value=String(name||"").toLowerCase();
  if(/press|push-up|dip|fly|pec deck/.test(value)) return muscle==="Shoulder" ? "vertical_push" : "horizontal_push";
  if(/pulldown|pull-up|chin-up|straight-arm/.test(value)) return "vertical_pull";
  if(/row|face pull|rear delt/.test(value)) return "horizontal_pull";
  if(/squat|leg press|lunge|split squat|step-up|leg extension/.test(value)) return "knee_dominant";
  if(/deadlift|back extension|good morning|hinge/.test(value)) return "hip_hinge";
  if(/leg curl|nordic/.test(value)) return "knee_flexion";
  if(/calf/.test(value)) return "plantar_flexion";
  if(/curl/.test(value)) return "elbow_flexion";
  if(/triceps|skull crusher/.test(value)) return "elbow_extension";
  if(/lateral raise|upright row/.test(value)) return "shoulder_abduction";
  return "other";
}
function secondaryMusclesFor(primaryMuscle){
  return ({Chest:["Triceps","Shoulder"],Shoulder:["Triceps"],Back:["Biceps","Rear Delt"],"Rear Delt":["Back"],Triceps:["Shoulder"],Biceps:["Forearms"],Legs:["Quads","Glutes"],Quads:["Glutes"],Hamstrings:["Glutes"],Calves:[]})[primaryMuscle] || [];
}
function alternativeReason(name){
  const equipment=equipmentForExercise(name);
  if(equipment==="bodyweight") return "bodyweight";
  if(equipment==="dumbbell") return "dumbbell_only";
  if(equipment==="barbell") return "barbell_only";
  if(equipment==="machine" || equipment==="smith_machine") return "machine_unavailable";
  return "equipment_unavailable";
}
function alternativePriority(planned,name){
  const tiers=ALT_TIER[planned] || {};
  if((tiers.A||[]).includes(name)) return 1;
  if((tiers.B||[]).includes(name)) return 2;
  if((tiers.C||[]).includes(name)) return 3;
  return 4;
}

// Central internal exercise metadata. Compatibility maps remain inputs so workout behavior and ordering stay unchanged.
export const EXERCISE_LIBRARY = (()=>{
  const records=new Map();
  PROGRAM.forEach(([day,type,planned,target,reps,muscle,restMode])=>{
    const names=[planned,...(ALT[planned]||[])];
    names.forEach((name,index)=>{
      if(index!==0 && records.has(name)) return;
      records.set(name,{
        id:exerciseId(name), displayName:name, plannedDay:day,
        primaryMuscle:muscle, secondaryMuscles:secondaryMusclesFor(muscle),
        movementPattern:movementPatternForExercise(name,muscle), equipment:equipmentForExercise(name),
        exerciseType:type, difficulty:restMode==="heavy" ? "advanced" : restMode==="standard" ? "intermediate" : "beginner",
        alternatives:index===0 ? (ALT[planned]||[]).map(alternative=>({exerciseId:exerciseId(alternative),priority:alternativePriority(planned,alternative),reason:alternativeReason(alternative)})) : [],
        canonicalPlannedName:planned, target:Number(target)||0, reps, restMode, isAlternative:index!==0
      });
    });
  });
  return [...records.values()];
})();
const EXERCISE_LIBRARY_BY_ID = new Map(EXERCISE_LIBRARY.map(exercise=>[exercise.id,exercise]));
const EXERCISE_LIBRARY_BY_NAME = new Map(EXERCISE_LIBRARY.map(exercise=>[exercise.displayName,exercise]));

// Compatibility view used by existing workout logic.
export const EX_DB = Object.fromEntries(EXERCISE_LIBRARY.map(exercise=>[exercise.displayName,{
  name:exercise.displayName, planned:exercise.canonicalPlannedName, day:exercise.plannedDay,
  type:exercise.exerciseType, target:exercise.target, reps:exercise.reps,
  primaryMuscle:exercise.primaryMuscle, restMode:exercise.restMode,
  isAlternative:exercise.isAlternative,
  alternatives:exercise.alternatives.map(alternative=>EXERCISE_LIBRARY_BY_ID.get(alternative.exerciseId)?.displayName).filter(Boolean)
}]));

export function tieredAlternativesForExercise(name){
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
export function alternativesForExercise(name){
  const t=tieredAlternativesForExercise(name);
  return uniqueBy([...(t.A||[]), ...(t.B||[]), ...(t.C||[])], x=>x);
}
export function exInfo(name){ return EX_DB[name] || EX_DB[canonicalExercise(name)] || {name, planned:name, day:"-", type:"Custom", target:0, reps:"-", primaryMuscle:"Other", restMode:"standard", isAlternative:false, alternatives:[]}; }
export function canonicalExercise(name){ return EX_DB[name]?.planned || (PROGRAM.find(p=>p[2]===name)?.[2]) || name || ""; }
export function getExerciseDbRows(){ return Object.values(EX_DB).sort((a,b)=>(a.day||"").localeCompare(b.day||"") || Number(a.isAlternative)-Number(b.isAlternative) || a.name.localeCompare(b.name)); }
export function uniqueBy(arr, fn){ const seen=new Set(); return arr.filter(x=>{ const k=fn(x); if(seen.has(k)) return false; seen.add(k); return true; }); }
