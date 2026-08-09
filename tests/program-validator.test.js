const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source=fs.readFileSync("js/program-validator.js","utf8")
  .replace(/^import .*;\n/gm,"")
  .replace(/^export /gm,"")
  .replace(/\nconst currentProgramValidation[\s\S]*$/,"")
  + "\n;globalThis.validateProgram=validateProgram;";
const context={Map,globalThis:null};
context.globalThis=context;
vm.runInNewContext(source,context,{filename:"js/program-validator.js"});

function exercise(displayName,primaryMuscle,movementPattern,equipment,secondaryMuscles=[]){
  return {displayName,primaryMuscle,movementPattern,equipment,secondaryMuscles};
}
const library=[
  exercise("Bench","Chest","horizontal_push","barbell",["Triceps","Shoulder"]),
  exercise("Incline Press","Chest","horizontal_push","dumbbell",["Triceps","Shoulder"]),
  exercise("Push-up","Chest","horizontal_push","bodyweight",["Triceps"]),
  exercise("Cable Fly","Chest","horizontal_push","cable"),
  exercise("Row","Back","horizontal_pull","machine",["Biceps"]),
  exercise("Curl","Biceps","elbow_flexion","dumbbell")
];
const program=[
  ["Day 1","Push","Bench"], ["Day 1","Push","Bench"],
  ["Day 1","Push","Incline Press"], ["Day 1","Push","Push-up"], ["Day 1","Push","Cable Fly"],
  ["Day 2","Pull","Row"], ["Day 2","Pull","Curl"]
];
const alternatives={Bench:["Push-up"],"Incline Press":["Bench"],"Push-up":["Bench"],"Cable Fly":[],Row:["Bench"],Curl:[]};
const result=context.validateProgram({exerciseLibrary:library,program,alternativeMappings:alternatives});

test("validator detects duplicate exercises within a day",()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(result.duplicateExercises)),[{day:"Day 1",exercise:"Bench",count:2}]);
});

test("validator counts movements and detects excessive same-day patterns",()=>{
  assert.equal(result.movementVolume["Horizontal Push"],5);
  assert.equal(result.movementVolume["Horizontal Pull"],1);
  assert.equal(result.movementVolume.Isolation,1);
  assert.equal(result.duplicateMovementPatterns[0].count,5);
});

test("validator counts primary and secondary muscle volume",()=>{
  assert.equal(result.muscleVolume.Chest,5);
  assert.equal(result.muscleVolume.Triceps,2);
  assert.equal(result.muscleVolume.Shoulder,1.5);
  assert.equal(result.muscleVolume.Biceps,1.5);
});

test("validator counts supported equipment categories",()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(result.equipmentDistribution)),{Barbell:2,Dumbbell:2,Machine:1,Cable:1,Bodyweight:1});
});

test("validator reports alternative coverage and missing alternatives",()=>{
  assert.equal(result.alternativeCoverage.find(x=>x.exercise==="Bench").count,1);
  assert.deepEqual(Array.from(result.missingAlternatives),["Cable Fly","Curl"]);
});

test("validator generates deterministic plain-data warnings",()=>{
  const codes=result.warnings.map(warning=>warning.code);
  assert.equal(codes.includes("DUPLICATE_EXERCISE"),true);
  assert.equal(codes.includes("DUPLICATE_MOVEMENT_PATTERN"),true);
  assert.equal(codes.includes("MISSING_ALTERNATIVES"),true);
  assert.equal(codes.some(code=>code.startsWith("LOW_") || code.startsWith("HIGH_")),false);
  assert.equal(result.warnings.every(warning=>typeof warning.message==="string" && warning.severity==="warning"),true);
});

test("validator does not classify weak or overloaded muscles without a threshold contract",()=>{
  assert.deepEqual(Array.from(result.weakMuscles),[]);
  assert.deepEqual(Array.from(result.overloadedMuscles),[]);
});
