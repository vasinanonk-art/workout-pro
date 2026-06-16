# Workout PRO v5.5.0 Clean Rebuild

This build rewrites the app runtime instead of stacking legacy patches.

Core fixes:
- Single state engine for Log / Dashboard / Coach / Calendar
- Single Day Lock renderer
- Exercise dropdown progress from the same log source
- Done exercises are disabled
- Recent Log refreshes from live Firestore snapshot
- Alternative exercises are saved as actual exercise while counting under planned exercise
- Recommendation is isolated per planned exercise
- Bangkok date key used globally
