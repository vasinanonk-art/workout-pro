import { EXERCISE_LIBRARY, PROGRAM, ALT } from "./exercise-library.js";

const MOVEMENT_CATEGORIES = ["Horizontal Push","Vertical Push","Horizontal Pull","Vertical Pull","Squat","Hinge","Isolation","Core","Carry"];
const EQUIPMENT_CATEGORIES = ["Barbell","Dumbbell","Machine","Cable","Bodyweight"];

function movementCategory(pattern){
  return ({
    horizontal_push:"Horizontal Push", vertical_push:"Vertical Push",
    horizontal_pull:"Horizontal Pull", vertical_pull:"Vertical Pull",
    knee_dominant:"Squat", hip_hinge:"Hinge",
    elbow_flexion:"Isolation", elbow_extension:"Isolation", shoulder_abduction:"Isolation",
    knee_flexion:"Isolation", plantar_flexion:"Isolation",
    core:"Core", carry:"Carry"
  })[pattern] || "Isolation";
}

function equipmentCategory(equipment){
  return ({barbell:"Barbell",dumbbell:"Dumbbell",machine:"Machine",smith_machine:"Machine",cable:"Cable",bodyweight:"Bodyweight"})[equipment] || null;
}

function increment(target,key,amount=1){ target[key]=(target[key]||0)+amount; }

export function validateProgram({exerciseLibrary,program,alternativeMappings}){
  const byName=new Map(exerciseLibrary.map(exercise=>[exercise.displayName,exercise]));
  const duplicateExercises=[];
  const duplicateMovementPatterns=[];
  const muscleVolume={};
  const movementVolume=Object.fromEntries(MOVEMENT_CATEGORIES.map(name=>[name,0]));
  const equipmentDistribution=Object.fromEntries(EQUIPMENT_CATEGORIES.map(name=>[name,0]));
  const alternativeCoverage=[];
  const missingAlternatives=[];
  const byDay=new Map();

  for(const row of program){
    const [day,,name]=row;
    if(!byDay.has(day)) byDay.set(day,[]);
    byDay.get(day).push(name);
    const exercise=byName.get(name);
    if(!exercise) continue;
    increment(muscleVolume,exercise.primaryMuscle,1);
    for(const muscle of exercise.secondaryMuscles||[]) increment(muscleVolume,muscle,0.5);
    increment(movementVolume,movementCategory(exercise.movementPattern),1);
    const equipment=equipmentCategory(exercise.equipment);
    if(equipment) increment(equipmentDistribution,equipment,1);
    const alternatives=alternativeMappings[name] || [];
    alternativeCoverage.push({exercise:name,day,count:alternatives.length});
    if(!alternatives.length) missingAlternatives.push(name);
  }

  for(const [day,names] of byDay){
    const exerciseCounts={};
    const movementGroups={};
    for(const name of names){
      increment(exerciseCounts,name);
      const exercise=byName.get(name);
      if(!exercise) continue;
      const movement=movementCategory(exercise.movementPattern);
      if(!movementGroups[movement]) movementGroups[movement]=[];
      movementGroups[movement].push(name);
    }
    for(const [exercise,count] of Object.entries(exerciseCounts)){
      if(count>1) duplicateExercises.push({day,exercise,count});
    }
    for(const [movement,exercises] of Object.entries(movementGroups)){
      if(exercises.length>3) duplicateMovementPatterns.push({day,movement,count:exercises.length,exercises});
    }
  }

  const weakMuscles=[];
  const overloadedMuscles=[];
  const warnings=[];
  duplicateExercises.forEach(item=>warnings.push({code:"DUPLICATE_EXERCISE",severity:"warning",message:`${item.exercise} appears ${item.count} times on ${item.day}.`}));
  duplicateMovementPatterns.forEach(item=>warnings.push({code:"DUPLICATE_MOVEMENT_PATTERN",severity:"warning",message:`${item.day} contains ${item.count} ${item.movement} exercises.`}));
  if(missingAlternatives.length) warnings.push({code:"MISSING_ALTERNATIVES",severity:"warning",message:`${missingAlternatives.length} programmed exercises have no alternatives.`});

  return {duplicateExercises,duplicateMovementPatterns,muscleVolume,movementVolume,equipmentDistribution,alternativeCoverage,missingAlternatives,weakMuscles,overloadedMuscles,warnings};
}

export const currentProgramValidation = validateProgram({exerciseLibrary:EXERCISE_LIBRARY,program:PROGRAM,alternativeMappings:ALT});
