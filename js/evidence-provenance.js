import { TRAINING_EVIDENCE } from "./training-evidence.js";

const deepFreeze=value=>{
  if(value && typeof value==="object" && !Object.isFrozen(value)){
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const profile=(evidenceId,{studyDesign="meta_analysis",volumeEquated="unknown",outcomeType,conflictLevel="unknown",applicableGoals,limitations,notes})=>({
  evidenceId,
  population:{trainingStatus:"unknown",sex:"unknown",ageGroup:"unknown"},
  studyDesign,
  volumeEquated,
  supervisedTraining:"unknown",
  durationWeeks:"unknown",
  outcomeType,
  conflictLevel,
  externalValidity:"unknown",
  applicableGoals,
  limitations,
  notes
});

export const PROVENANCE_DATABASE=deepFreeze([
  profile("hypertrophy-weekly-volume",{outcomeType:"hypertrophy",applicableGoals:["hypertrophy"],limitations:["Included studies and treatment groups varied in program design and participant characteristics."],notes:"Meta-regression of longitudinal resistance-training evidence."}),
  profile("hypertrophy-frequency",{volumeEquated:"mixed",outcomeType:"hypertrophy",applicableGoals:["hypertrophy"],limitations:["Volume-equated evidence and direct frequency comparisons were limited."],notes:"Systematic review with meta-analysis of resistance-training frequency."}),
  profile("hypertrophy-load",{outcomeType:"hypertrophy",applicableGoals:["hypertrophy"],limitations:["Included load-comparison studies commonly used volitional-failure set end points."],notes:"Network meta-analysis and conventional meta-analysis of load conditions."}),
  profile("hypertrophy-failure",{volumeEquated:"mixed",outcomeType:"multiple",applicableGoals:["hypertrophy"],limitations:["Findings differed according to whether training volume was equated."],notes:"Meta-analysis comparing failure and non-failure resistance training."}),
  profile("hypertrophy-rest",{studyDesign:"systematic_review",outcomeType:"hypertrophy",conflictLevel:"moderate",applicableGoals:["hypertrophy"],limitations:["Few studies with heterogeneous designs prevented reliable pooled estimates."],notes:"Systematic review described the available findings as equivocal."}),
  profile("hypertrophy-exercise-order",{outcomeType:"multiple",applicableGoals:["hypertrophy"],limitations:["The evidence base included site-specific and indirect hypertrophy measures."],notes:"Meta-analysis of longitudinal exercise-order studies."}),
  profile("strength-load",{outcomeType:"strength",applicableGoals:["strength"],limitations:["Strength findings are influenced by specificity of the trained and tested task."],notes:"Network meta-analysis and conventional meta-analysis of load conditions."}),
  profile("strength-frequency",{volumeEquated:"mixed",outcomeType:"strength",applicableGoals:["strength"],limitations:["Overall and volume-equated analyses produced different interpretations."],notes:"Systematic review with meta-analysis of weekly training frequency."}),
  profile("strength-failure",{volumeEquated:"mixed",outcomeType:"multiple",applicableGoals:["strength"],limitations:["Findings differed according to whether training volume was equated."],notes:"Meta-analysis comparing failure and non-failure resistance training."}),
  profile("strength-exercise-order",{outcomeType:"strength",applicableGoals:["strength"],limitations:["Outcomes were exercise-specific and limited to studied order comparisons."],notes:"Meta-analysis of longitudinal exercise-order studies."})
]);

const evidenceIds=new Set(TRAINING_EVIDENCE.map(record=>record.id));
if(PROVENANCE_DATABASE.some(profile=>!evidenceIds.has(profile.evidenceId))) throw new Error("Provenance record references unknown evidence");

export function getProvenance(id){ return PROVENANCE_DATABASE.find(profile=>profile.evidenceId===id) || null; }
export function getEvidenceApplicability(goal){ return Object.freeze(PROVENANCE_DATABASE.filter(profile=>profile.applicableGoals.includes(goal))); }
export function getEvidenceByStudyType(type){ return Object.freeze(PROVENANCE_DATABASE.filter(profile=>profile.studyDesign===type)); }
