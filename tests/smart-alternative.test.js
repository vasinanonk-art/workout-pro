const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const librarySource=fs.readFileSync("js/exercise-library.js","utf8");
const libraryUrl=`data:text/javascript;base64,${Buffer.from(librarySource).toString("base64")}`;
const alternativeSource=fs.readFileSync("js/smart-alternative.js","utf8").replace("./exercise-library.js",libraryUrl);
const alternativeUrl=`data:text/javascript;base64,${Buffer.from(alternativeSource).toString("base64")}`;
const load=()=>import(alternativeUrl);

test("smart alternative returns the best metadata match",async()=>{
  const {findAlternatives}=await load();
  const result=findAlternatives({plannedExercise:"Lat Pulldown",availableEquipment:["cable"]});
  assert.equal(result[0].exercise,"Machine Pulldown");
  assert.deepEqual(JSON.parse(JSON.stringify(result[0].score)),{mappingPriority:1,sameMovementPattern:true,sameExerciseType:true,samePrimaryMuscle:true});
  assert.deepEqual(Array.from(result[0].reasons),["Same movement pattern","Same primary muscle","Available equipment","Preferred mapped alternative"]);
});

test("smart alternative filters mapped exercises by available equipment",async()=>{
  const {findAlternatives}=await load();
  const result=findAlternatives({plannedExercise:"Barbell Bench Press",availableEquipment:["dumbbell"]});
  assert.deepEqual(result.map(item=>item.exercise),["Dumbbell Bench Press"]);
});

test("existing mapping priority ranks compound replacement above fly isolation",async()=>{
  const {findAlternatives}=await load();
  const input={plannedExercise:"Barbell Bench Press",availableEquipment:["machine"]};
  const first=findAlternatives(input), second=findAlternatives(input);
  assert.deepEqual(first,second);
  assert.deepEqual(first.map(item=>item.exercise),["Machine Chest Press","Pec Deck"]);
  assert.equal(first[0].score.mappingPriority,1);
  assert.equal(first[0].score.sameMovementPattern,true);
  assert.equal(first[1].score.mappingPriority,3);
  assert.equal(first[1].score.sameMovementPattern,false);
});

test("fly-style exercise metadata uses the isolation movement pattern",async()=>{
  const library=await import(libraryUrl);
  for(const name of ["Pec Deck","Cable Fly","Dumbbell Fly","Low-to-High Cable Fly","Machine Chest Fly","Reverse Pec Deck","Cable Rear Delt Fly"]){
    assert.equal(library.EXERCISE_LIBRARY.find(exercise=>exercise.displayName===name)?.movementPattern,"isolation",name);
  }
});

test("smart alternative preserves mapping order for a full ranking tie",async()=>{
  const {findAlternatives}=await load();
  const result=findAlternatives({plannedExercise:"Walking Lunge",availableEquipment:["machine"]});
  const tied=result.filter(item=>item.score.mappingPriority===2 && item.score.sameMovementPattern && item.score.sameExerciseType && item.score.samePrimaryMuscle);
  assert.deepEqual(tied.map(item=>item.exercise),["Hack Squat","Pendulum Squat"]);
});

test("smart alternative does not mutate input and returns frozen output",async()=>{
  const {findAlternatives}=await load();
  const input={plannedExercise:"Barbell Bench Press",availableEquipment:["dumbbell"]};
  const before=JSON.stringify(input);
  const result=findAlternatives(input);
  assert.equal(JSON.stringify(input),before);
  assert.equal(Object.isFrozen(result),true);
  assert.equal(Object.isFrozen(result[0]),true);
  assert.equal(Object.isFrozen(result[0].reasons),true);
  assert.equal(Reflect.set(result[0],"score",99),false);
});

test("smart alternative returns an empty frozen list for an unknown exercise",async()=>{
  const {findAlternatives}=await load();
  const result=findAlternatives({plannedExercise:"Unknown Exercise",availableEquipment:["machine"]});
  assert.deepEqual(Array.from(result),[]);
  assert.equal(Object.isFrozen(result),true);
});
