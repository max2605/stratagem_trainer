#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="iphone/sourcecode/native/App/App.xcodeproj"
mkdir -p build/mobile

xcodebuild -project "$PROJECT" -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/ios-simulator \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
ditto -c -k --sequesterRsrc --keepParent \
  build/ios-simulator/Build/Products/Debug-iphonesimulator/App.app \
  build/mobile/Stratagem-Trainer-iphone-simulator.zip

xcodebuild -project "$PROJECT" -scheme App -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -archivePath build/mobile/Stratagem-Trainer-iphone-unsigned.xcarchive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO archive

# A portable archive for developers; it needs signing before device installation.
mkdir -p build/ios-payload/Payload
ditto build/mobile/Stratagem-Trainer-iphone-unsigned.xcarchive/Products/Applications/App.app \
  build/ios-payload/Payload/App.app
(cd build/ios-payload && zip -qry ../mobile/Stratagem-Trainer-iphone-unsigned.ipa Payload)
ditto -c -k --sequesterRsrc --keepParent \
  build/mobile/Stratagem-Trainer-iphone-unsigned.xcarchive \
  build/mobile/Stratagem-Trainer-iphone-unsigned-xcarchive.zip

node scripts/stage-platforms.mjs --platform iphone --artifact build/mobile/Stratagem-Trainer-iphone-simulator.zip
node scripts/stage-platforms.mjs --platform iphone --artifact build/mobile/Stratagem-Trainer-iphone-unsigned.ipa
node scripts/stage-platforms.mjs --platform iphone --artifact build/mobile/Stratagem-Trainer-iphone-unsigned-xcarchive.zip
