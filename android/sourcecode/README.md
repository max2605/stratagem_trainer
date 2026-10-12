# Android sources

`native/` contains the Capacitor Android project. Shared React/core sources are maintained at repository root; the full platform ZIP includes a complete source snapshot here. From root: `pnpm build`, `node scripts/platform-prepare.mjs android`, then `./gradlew assembleDebug` inside `android/sourcecode/native` (Java 21, Android SDK 36). Windows uses `gradlew.bat`.
