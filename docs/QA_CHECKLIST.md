# Workout PRO QA Checklist

## P0 Stability
- [ ] App loads on mobile and desktop
- [ ] Login works
- [ ] No red console error
- [ ] Version label matches build

## Workout Log
- [ ] Default values load: rest, RIR, tempo, quality, sleep, soreness, stress
- [ ] Exercise selector can select allowed exercises
- [ ] Completed exercises are not selectable for saving
- [ ] Alternative exercise can be selected
- [ ] Alternative progress counts toward planned exercise
- [ ] Save creates one log entry only
- [ ] Edit updates existing log entry only
- [ ] Recent log refreshes after save

## Day/Cycle Lock
- [ ] Day 1 complete unlocks Day 2 on next day only
- [ ] Day 2 complete enforces rest before Day 4
- [ ] Day 4 complete unlocks Day 5 on next day
- [ ] Day 5 complete enforces two rest days
- [ ] Alternative exercise does not block day completion

## Calendar
- [ ] Today label is correct
- [ ] Past date label is correct
- [ ] Future date label is correct
- [ ] Selected date changes allowed day correctly
- [ ] Calendar insight displays selected day summary

## Timer / Notification
- [ ] Save set starts rest timer
- [ ] Timer continues after tab/app switch
- [ ] 10 second remaining notification works when permission is granted
- [ ] Rest complete notification works when permission is granted
- [ ] In-app fallback status displays when notification is blocked

## Exercise Intelligence
- [ ] Every PROGRAM exercise exists in EX_DB
- [ ] Every PROGRAM exercise has at least one alternative
- [ ] Alternative tiers A/B/C render
- [ ] Media fallback does not break UI
- [ ] Muscle volume uses planned exercise mapping
- [ ] Plateau detection uses planned exercise mapping
- [ ] Coach summary renders without empty state when logs exist

## Release Decision
- [ ] No P0 bug
- [ ] No data loss risk
- [ ] No schema migration
- [ ] Regression checked on mobile and desktop
