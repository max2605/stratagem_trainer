# iPhone sources

`native/` contains the Capacitor iOS project. Shared React/core sources are maintained at repository root; the full platform ZIP includes a complete source snapshot here. On macOS with Xcode 26+: `pnpm build`, `node scripts/platform-prepare.mjs ios`, `bash scripts/platform-ios.sh`. Unsigned device builds need your Apple signing identity before installation. The Safari PWA works without signing.
