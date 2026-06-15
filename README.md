# Workout PRO v5.3.7 Final Patch

This build fixes incomplete workout record editing.

## Main fixes
- Recent logs now have an Edit button.
- Edit mode updates the original Firestore document instead of adding a duplicate log.
- Save payload includes full workout fields: date, week, day, focus, exercise, plannedExercise, targetSets, setNo, weight, reps, RIR, volume, note, recovery fields, tempo, rep quality, bias mode, user/team scope, appVersion, and updatedAt.
- Version sync is updated to v5.3.7.
- Migration card cleanup and cache-proof runtime patch are retained.

## QA
See `docs/QA_REPORT.txt`.


v5.3.7 - No White Screen Core Fix
- Keeps current page visible while next page renders.
- Defers heavy dashboard/coach charts.
- Replaces broad renderSafe with current-page render only.
- Debounces snapshot/page renders.
- Keeps v5.3.5 Day Lock hard guard active.
