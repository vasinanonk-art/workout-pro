// Workout Pro Product Conventions v1 — these are product decisions, not scientific facts.
// - Prefer the latest completed set; fall back to the previous workout when no latest set exists.
// - Reaching the top of the target range increases load by the caller-supplied increment.
// - Repetitions inside the range repeat the current load.
// - Below-range performance repeats the load unless it is at least two repetitions below the minimum.
// - A substantial below-range result decreases load by the caller-supplied increment.
// - After a load change, suggested repetitions reset to the target-range minimum.
// - Exercise type is validated for contract completeness but does not alter v1 decisions.

const freezeResult=(action,suggestedWeight,suggestedReps,message)=>Object.freeze({action,suggestedWeight,suggestedReps,message});

function finiteNumber(value){ return typeof value==="number" && Number.isFinite(value); }
function completedSet(value){
  return value && typeof value==="object" && finiteNumber(value.weightKg) && value.weightKg>0 && Number.isInteger(value.reps) && value.reps>=0;
}

export function evaluateProgression(input){
  if(!input || typeof input!=="object") throw new TypeError("Progression input must be an object");
  const {previousWorkout,lastSet,targetRepRange,weightIncrement,exerciseType}=input;
  if(!targetRepRange || !Number.isInteger(targetRepRange.min) || !Number.isInteger(targetRepRange.max) || targetRepRange.min<=0 || targetRepRange.max<targetRepRange.min) throw new TypeError("Target repetition range is invalid");
  if(!finiteNumber(weightIncrement) || weightIncrement<=0) throw new TypeError("Weight increment must be finite and greater than zero");
  if(typeof exerciseType!=="string" || !exerciseType.trim()) throw new TypeError("Exercise type is required");
  const reference=completedSet(lastSet) ? lastSet : completedSet(previousWorkout) ? previousWorkout : null;
  if(!reference) throw new TypeError("A completed last set or previous workout is required");

  const weight=reference.weightKg;
  const reps=reference.reps;
  const {min,max}=targetRepRange;
  if(reps>=max) return freezeResult("increase_weight",weight+weightIncrement,min,"Increase weight using the configured increment and restart at the bottom of the target range.");
  if(reps>=min) return freezeResult("repeat",weight,reps,"Repeat the current weight and repetitions.");
  if(reps<=min-2) return freezeResult("decrease_weight",Math.max(weight-weightIncrement,weightIncrement),min,"Decrease weight using the configured increment and target the bottom of the repetition range.");
  return freezeResult("repeat",weight,min,"Repeat the current weight and target the bottom of the repetition range.");
}
