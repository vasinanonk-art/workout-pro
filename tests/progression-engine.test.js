const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const source=fs.readFileSync("js/progression-engine.js","utf8");
const moduleUrl=`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const load=()=>import(moduleUrl);
const base=overrides=>({previousWorkout:{weightKg:80,reps:8},lastSet:{weightKg:80,reps:8},targetRepRange:{min:8,max:12},weightIncrement:2.5,exerciseType:"compound",...overrides});

test("progression uses the last set and increases weight at the range maximum",async()=>{
  const {evaluateProgression}=await load();
  assert.deepEqual(evaluateProgression(base({previousWorkout:{weightKg:70,reps:12},lastSet:{weightKg:80,reps:12}})),{
    action:"increase_weight",suggestedWeight:82.5,suggestedReps:8,message:"Increase weight using the configured increment and restart at the bottom of the target range."
  });
});

test("progression falls back to the previous workout",async()=>{
  const {evaluateProgression}=await load();
  const result=evaluateProgression(base({lastSet:null,previousWorkout:{weightKg:40,reps:12},weightIncrement:5}));
  assert.equal(result.action,"increase_weight");
  assert.equal(result.suggestedWeight,45);
  assert.equal(result.suggestedReps,8);
});

test("progression repeats weight when repetitions are inside the range",async()=>{
  const {evaluateProgression}=await load();
  const result=evaluateProgression(base({lastSet:{weightKg:80,reps:10}}));
  assert.equal(result.action,"repeat");
  assert.equal(result.suggestedWeight,80);
  assert.equal(result.suggestedReps,10);
});

test("progression repeats a one-repetition miss",async()=>{
  const {evaluateProgression}=await load();
  const result=evaluateProgression(base({lastSet:{weightKg:80,reps:7}}));
  assert.equal(result.action,"repeat");
  assert.equal(result.suggestedWeight,80);
  assert.equal(result.suggestedReps,8);
});

test("progression decreases weight after substantial below-range performance",async()=>{
  const {evaluateProgression}=await load();
  const result=evaluateProgression(base({lastSet:{weightKg:80,reps:6}}));
  assert.equal(result.action,"decrease_weight");
  assert.equal(result.suggestedWeight,77.5);
  assert.equal(result.suggestedReps,8);
});

test("progression rejects invalid input",async()=>{
  const {evaluateProgression}=await load();
  assert.throws(()=>evaluateProgression(null),TypeError);
  assert.throws(()=>evaluateProgression(base({targetRepRange:{min:12,max:8}})),TypeError);
  assert.throws(()=>evaluateProgression(base({weightIncrement:0})),TypeError);
  assert.throws(()=>evaluateProgression(base({lastSet:null,previousWorkout:null})),TypeError);
  assert.throws(()=>evaluateProgression(base({exerciseType:""})),TypeError);
});

test("progression is deterministic and does not mutate input",async()=>{
  const {evaluateProgression}=await load();
  const input=base({lastSet:{weightKg:80,reps:12}});
  const before=JSON.stringify(input);
  const first=evaluateProgression(input), second=evaluateProgression(input);
  assert.deepEqual(first,second);
  assert.equal(JSON.stringify(input),before);
  assert.equal(Object.isFrozen(first),true);
  assert.equal(Reflect.set(first,"action","repeat"),false);
});
