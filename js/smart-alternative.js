import { EXERCISE_LIBRARY } from "./exercise-library.js";

const BY_NAME=new Map(EXERCISE_LIBRARY.map(exercise=>[exercise.displayName,exercise]));
const BY_ID=new Map(EXERCISE_LIBRARY.map(exercise=>[exercise.id,exercise]));

// Product ranking convention v1: compare existing mapping priority first, then exact metadata matches.
// The score is a descriptive ranking tuple, not a weighted total. Existing mapping order breaks full ties.
export function findAlternatives(input){
  if(!input || typeof input!=="object") throw new TypeError("Alternative input must be an object");
  const {plannedExercise,availableEquipment}=input;
  if(!Array.isArray(availableEquipment) || availableEquipment.some(item=>typeof item!=="string")) throw new TypeError("Available equipment must be an array of strings");
  const planned=BY_NAME.get(plannedExercise);
  if(!planned) return Object.freeze([]);
  const available=new Set(availableEquipment);
  const ranked=planned.alternatives.map((mapping,index)=>({mapping,index,exercise:BY_ID.get(mapping.exerciseId)}))
    .filter(candidate=>candidate.exercise && available.has(candidate.exercise.equipment))
    .map(candidate=>{
      const score=Object.freeze({
        mappingPriority:candidate.mapping.priority,
        sameMovementPattern:candidate.exercise.movementPattern===planned.movementPattern,
        sameExerciseType:Boolean(candidate.exercise.exerciseType && planned.exerciseType && candidate.exercise.exerciseType===planned.exerciseType),
        samePrimaryMuscle:candidate.exercise.primaryMuscle===planned.primaryMuscle
      });
      const reasons=[];
      if(score.sameMovementPattern) reasons.push("Same movement pattern");
      if(score.samePrimaryMuscle) reasons.push("Same primary muscle");
      reasons.push("Available equipment");
      reasons.push("Preferred mapped alternative");
      return {index:candidate.index,result:Object.freeze({exercise:candidate.exercise.displayName,score,reasons:Object.freeze(reasons)})};
    })
    .sort((a,b)=>a.result.score.mappingPriority-b.result.score.mappingPriority
      || Number(b.result.score.sameMovementPattern)-Number(a.result.score.sameMovementPattern)
      || Number(b.result.score.sameExerciseType)-Number(a.result.score.sameExerciseType)
      || Number(b.result.score.samePrimaryMuscle)-Number(a.result.score.samePrimaryMuscle)
      || a.index-b.index)
    .map(candidate=>candidate.result);
  return Object.freeze(ranked);
}
