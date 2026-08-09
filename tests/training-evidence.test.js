const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const source=fs.readFileSync("js/training-evidence.js","utf8");
const moduleUrl=`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const loadEvidence=()=>import(moduleUrl);

test("every evidence record has at least one reference",async()=>{
  const {TRAINING_EVIDENCE}=await loadEvidence();
  assert.equal(TRAINING_EVIDENCE.every(record=>Array.isArray(record.references) && record.references.length>0),true);
});

test("every numeric actionable rule has a supporting reference",async()=>{
  const {TRAINING_EVIDENCE}=await loadEvidence();
  for(const record of TRAINING_EVIDENCE.filter(record=>typeof record.actionableRule?.value==="number")) assert.equal(record.references.length>0,true,record.id);
});

test("evidence IDs are unique",async()=>{
  const {TRAINING_EVIDENCE}=await loadEvidence();
  assert.equal(new Set(TRAINING_EVIDENCE.map(record=>record.id)).size,TRAINING_EVIDENCE.length);
});

test("evidence levels and goals use allowed enums",async()=>{
  const {TRAINING_EVIDENCE}=await loadEvidence();
  const levels=new Set(["A","B","C","D"]), goals=new Set(["hypertrophy","strength"]);
  assert.equal(TRAINING_EVIDENCE.every(record=>levels.has(record.evidenceLevel)),true);
  assert.equal(TRAINING_EVIDENCE.every(record=>goals.has(record.goal)),true);
});

test("actionable rules may be null and insufficient evidence cannot prescribe",async()=>{
  const {TRAINING_EVIDENCE}=await loadEvidence();
  assert.equal(TRAINING_EVIDENCE.some(record=>record.actionableRule===null),true);
  assert.equal(TRAINING_EVIDENCE.filter(record=>record.status==="insufficient_evidence").every(record=>record.actionableRule===null),true);
});

test("reference DOI and PMID formats are valid when present",async()=>{
  const {TRAINING_EVIDENCE}=await loadEvidence();
  for(const reference of TRAINING_EVIDENCE.flatMap(record=>record.references)){
    if(reference.doi) assert.match(reference.doi,/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i);
    if(reference.PMID) assert.match(reference.PMID,/^\d{7,9}$/);
  }
});

test("public accessors return frozen source records without mutation functions",async()=>{
  const api=await loadEvidence();
  const record=api.getEvidenceRecord("hypertrophy-weekly-volume");
  assert.equal(Object.isFrozen(api.TRAINING_EVIDENCE),true);
  assert.equal(Object.isFrozen(record),true);
  assert.equal(api.getEvidenceByTopic("exercise_order").length,2);
  assert.equal(api.getEvidenceForGoal("strength").length,4);
  assert.equal(api.getEvidenceRecord("missing"),null);
  assert.equal(Object.keys(api).some(name=>/set|add|update|delete/i.test(name)),false);
  assert.equal(Reflect.set(record,"finding","changed"),false);
});
