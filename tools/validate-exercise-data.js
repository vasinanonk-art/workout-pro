#!/usr/bin/env node
// Workout PRO v6-dev exercise data validator.
// Safe QA tool only. Does not touch app runtime, Firestore, or schema.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), "utf8"));
}

function fail(message, details = []) {
  console.error(`❌ ${message}`);
  details.forEach((item) => console.error(` - ${item}`));
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

const master = readJson("data/exercise_master.seed.json");
const alias = readJson("data/exercise_alias.json");
const metadata = readJson("data/workout_metadata.seed.json");

const exercises = Array.isArray(master.exercises) ? master.exercises : [];
const ids = new Set();
const names = new Set();
const duplicateIds = [];
const duplicateNames = [];
const missingRequired = [];

for (const ex of exercises) {
  if (!ex.exerciseId || !ex.name || !ex.movementPattern || !Array.isArray(ex.primaryMuscles)) {
    missingRequired.push(ex.name || ex.exerciseId || JSON.stringify(ex));
  }
  if (ids.has(ex.exerciseId)) duplicateIds.push(ex.exerciseId);
  ids.add(ex.exerciseId);

  const key = String(ex.name || "").trim().toLowerCase();
  if (names.has(key)) duplicateNames.push(ex.name);
  names.add(key);
}

const aliasMap = alias.aliases || {};
const brokenAliases = Object.entries(aliasMap)
  .filter(([, exerciseId]) => !ids.has(exerciseId))
  .map(([name, exerciseId]) => `${name} -> ${exerciseId}`);

const metadataMap = metadata.metadata || {};
const missingMetadata = exercises
  .filter((ex) => !metadataMap[ex.exerciseId])
  .map((ex) => `${ex.name} (${ex.exerciseId})`);

if (exercises.length) pass(`Exercise master loaded: ${exercises.length} records`);
else fail("Exercise master is empty");

if (!duplicateIds.length) pass("No duplicate exerciseId");
else fail("Duplicate exerciseId", duplicateIds);

if (!duplicateNames.length) pass("No duplicate exercise names");
else fail("Duplicate exercise names", duplicateNames);

if (!missingRequired.length) pass("Required fields present");
else fail("Missing required exercise fields", missingRequired);

if (!brokenAliases.length) pass("Alias mapping valid");
else fail("Broken alias mapping", brokenAliases);

if (!missingMetadata.length) pass("Workout metadata coverage valid");
else fail("Missing workout metadata", missingMetadata);

if (!process.exitCode) {
  console.log("\nWorkout PRO exercise data validation PASS");
}
