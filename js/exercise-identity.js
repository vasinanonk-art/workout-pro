// Workout PRO v6-dev Exercise Identity Helper
// Safe foundation only: no Firestore, no schema change, no UI change.

export function normalizeExerciseName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function buildExerciseIndex(master = {}, aliases = {}) {
  const exercises = Array.isArray(master.exercises) ? master.exercises : [];
  const byId = new Map();
  const byName = new Map();

  exercises.forEach((exercise) => {
    if (!exercise || !exercise.exerciseId || !exercise.name) return;
    byId.set(exercise.exerciseId, exercise);
    byName.set(normalizeExerciseName(exercise.name), exercise.exerciseId);
    (exercise.aliases || []).forEach((alias) => {
      byName.set(normalizeExerciseName(alias), exercise.exerciseId);
    });
  });

  Object.entries(aliases.aliases || {}).forEach(([alias, exerciseId]) => {
    if (!exerciseId) return;
    byName.set(normalizeExerciseName(alias), exerciseId);
  });

  return { byId, byName };
}

export function resolveExerciseId(name, index) {
  if (!name || !index || !index.byName) return null;
  return index.byName.get(normalizeExerciseName(name)) || null;
}

export function getExerciseByName(name, index) {
  const exerciseId = resolveExerciseId(name, index);
  if (!exerciseId || !index || !index.byId) return null;
  return index.byId.get(exerciseId) || null;
}

export function getExerciseById(exerciseId, index) {
  if (!exerciseId || !index || !index.byId) return null;
  return index.byId.get(exerciseId) || null;
}

export function plannedExerciseKey(log) {
  if (!log) return "";
  return log.plannedExercise || log.originalExercise || log.exercise || "";
}
