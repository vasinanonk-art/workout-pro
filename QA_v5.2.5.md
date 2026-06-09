# Workout PRO v5.2.5 EXERCISE SPEED + WHITE SCREEN FIX

Build Date: 2026-06-09
Base: v5.2.3 DATE INPUT SANITY FIX
Output: Workout_PRO_v5.2.5_EXERCISE_SPEED_WHITE_FIX.zip

## Changelog
- Added `js/v525-speed-white-fix.js`
- Updated `index.html` to load v5.2.5 patch before `js/app.module.js`
- Updated visible title/header version references to v5.2.5
- Added exercise dropdown fast path
- Added deferred heavy render after exercise selection
- Added scroll/repaint guard for mobile white-screen issue after changing exercise
- Added save debounce guard
- Added date guard
- Added blank-page recovery guard
- Firestore schema unchanged
- Progression logic unchanged
- Calendar/rest rule logic unchanged

## QA Checklist
- ZIP build completed
- index.html contains v525 script tag before app.module.js
- v525 patch file exists under js/
- Header/date version patched in index.html
- No core app.module.js rewrite performed, reducing regression risk

## Test after deploy
1. Hard refresh mobile browser.
2. Confirm header or QA panel shows v5.2.5.
3. Go to Log.
4. Tap exercise dropdown and change exercise.
5. Scroll down immediately.
6. Confirm no white screen.
7. Save a set.
8. Confirm button locks during save and returns after success.
