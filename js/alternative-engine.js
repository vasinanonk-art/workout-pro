// Workout PRO v6-dev Alternative Engine
// Standalone, deterministic, no Firestore/schema dependency.

import { normalizeExerciseName, resolveExerciseId } from "./exercise-identity.js";

export function buildAlternativeIndex(altTier = {}, exerciseIndex = null) {
  const byId = new Map();
  const byName = new Map();

  Object.entries(altTier || {}).forEach(([exerciseName, tiers]) => {
    const exerciseId = exerciseIndex ? resolveExerciseId(exerciseName, exerciseIndex) : null;
    const normalizedName = normalizeExerciseName(exerciseName);
    const normalizedTiers = normalizeAlternativeTiers(tiers);

    byName.set(normalizedName, normalizedTiers);
    if (exerciseId) byId.set(exerciseId, normalizedTiers);
  });

  return { byId, byName };
}

export function normalizeAlternativeTiers(tiers = {}) {
  return {
    A: unique((tiers.A || []).filter(Boolean)),
    B: unique((tiers.B || []).filter(Boolean)),
    C: unique((tiers.C || []).filter(Boolean)),
  };
}

export function alternativesForExerciseName(exerciseName, altIndex, exerciseIndex = null) {
  if (!exerciseName || !altIndex) return { A: [], B: [], C: [] };

  const exerciseId = exerciseIndex ? resolveExerciseId(exerciseName, exerciseIndex) : null;
  if (exerciseId && altIndex.byId?.has(exerciseId)) return altIndex.byId.get(exerciseId);

  const normalizedName = normalizeExerciseName(exerciseName);
  if (altIndex.byName?.has(normalizedName)) return altIndex.byName.get(normalizedName);

  return { A: [], B: [], C: [] };
}

export function flattenAlternativeTiers(tiers = {}) {
  return unique([...(tiers.A || []), ...(tiers.B || []), ...(tiers.C || [])]);
}

export function unique(items) {
  return [...new Set((items || []).filter(Boolean))];
}
