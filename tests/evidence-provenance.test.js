const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const evidenceSource=fs.readFileSync("js/training-evidence.js","utf8");
const evidenceUrl=`data:text/javascript;base64,${Buffer.from(evidenceSource).toString("base64")}`;
const provenanceSource=fs.readFileSync("js/evidence-provenance.js","utf8").replace("./training-evidence.js",evidenceUrl);
const provenanceUrl=`data:text/javascript;base64,${Buffer.from(provenanceSource).toString("base64")}`;
const load=async()=>({evidence:await import(evidenceUrl),provenance:await import(provenanceUrl)});

test("every evidence record has exactly one provenance profile",async()=>{
  const {evidence,provenance}=await load();
  const evidenceIds=evidence.TRAINING_EVIDENCE.map(record=>record.id).sort();
  const provenanceIds=provenance.PROVENANCE_DATABASE.map(profile=>profile.evidenceId).sort();
  assert.deepEqual(provenanceIds,evidenceIds);
});

test("provenance IDs are unique",async()=>{
  const {provenance}=await load();
  const ids=provenance.PROVENANCE_DATABASE.map(profile=>profile.evidenceId);
  assert.equal(new Set(ids).size,ids.length);
});

test("provenance enum values are valid",async()=>{
  const {provenance}=await load();
  const trainingStatus=new Set(["trained","untrained","mixed","unknown"]);
  const studyDesign=new Set(["meta_analysis","systematic_review","position_stand","RCT","review"]);
  const triState=new Set(["yes","no","mixed","unknown"]);
  const outcomeType=new Set(["hypertrophy","strength","power","endurance","multiple"]);
  const conflictLevel=new Set(["none","low","moderate","high","unknown"]);
  const externalValidity=new Set(["high","moderate","low","unknown"]);
  for(const profile of provenance.PROVENANCE_DATABASE){
    assert.equal(trainingStatus.has(profile.population.trainingStatus),true);
    assert.equal(studyDesign.has(profile.studyDesign),true);
    assert.equal(triState.has(profile.volumeEquated),true);
    assert.equal(triState.has(profile.supervisedTraining),true);
    assert.equal(outcomeType.has(profile.outcomeType),true);
    assert.equal(conflictLevel.has(profile.conflictLevel),true);
    assert.equal(externalValidity.has(profile.externalValidity),true);
  }
});

test("provenance database and accessor results cannot mutate source data",async()=>{
  const {provenance}=await load();
  const profile=provenance.getProvenance("hypertrophy-rest");
  const applicable=provenance.getEvidenceApplicability("hypertrophy");
  const metaAnalyses=provenance.getEvidenceByStudyType("meta_analysis");
  assert.equal(Object.isFrozen(provenance.PROVENANCE_DATABASE),true);
  assert.equal(Object.isFrozen(profile),true);
  assert.equal(Object.isFrozen(profile.population),true);
  assert.equal(Object.isFrozen(applicable),true);
  assert.equal(Object.isFrozen(metaAnalyses),true);
  assert.equal(Reflect.set(profile,"studyDesign","review"),false);
  assert.equal(provenance.getProvenance("missing"),null);
});
