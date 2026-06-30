# Workout PRO v6 Baseline

Branch: `v6-dev`

## Goal
Move Workout PRO from name-based exercise mapping to a stable exercise intelligence layer without changing user data or Firestore schema.

## Scope for v6-dev
- Keep `main` production-safe.
- Do not reset database.
- Do not change Firestore schema.
- Do not rewrite UI unless required.
- Add exercise master/alias/metadata gradually.
- Add QA validation before release.

## Current Source of Truth
- `PROGRAM`: workout plan
- `ALT` / `ALT_TIER`: alternative exercise mapping
- `EX_DB`: derived exercise database
- Logs remain backward-compatible using existing fields.

## Target Direction
- Add stable `exerciseId` mapping.
- Add aliases for name mismatch.
- Keep `plannedExercise` as progress source.
- Keep actual performed exercise for stats/media.
- Use QA to detect missing alternatives, media, and mapping.

## Release Rule
No merge to `main` unless:
- Syntax check passes
- Alternative coverage passes
- Program exercise coverage passes
- Day completion with alternatives passes
- Log/default/session flows pass manual QA
