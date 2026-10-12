# Plattformen und ausführbare Dateien

Der Trainer verwendet eine gemeinsame TypeScript-Anwendung. Electron verpackt sie für Windows, Linux und macOS; Capacitor 8 verpackt sie für Android und iPhone. Der Web-Build funktioniert zusätzlich als installierbare PWA. Die Trainingsdaten und Sprachdateien werden lokal mitgeliefert. Zum Üben ist keine Anmeldung und keine Internetverbindung erforderlich.

| Plattform | Download | Verwendung |
| --- | --- | --- |
| Windows x64 | `*-windows-x64-portable.exe`, `*-windows-x64-setup.exe` | Portable starten oder per Benutzer installieren |
| Linux x64 | `*-linux-x86_64.AppImage`, `*-linux-x64.tar.gz` | AppImage ausführbar machen; alternativ Archiv entpacken und `stratagem-trainer` starten |
| macOS Intel / Apple Silicon | `*-mac-x64.dmg`, `*-mac-arm64.dmg`, passende ZIPs | DMG öffnen und App nach „Programme“ ziehen |
| Android | `*-android-debug.apk` | Test-APK auf dem Gerät installieren; Installation aus dieser Downloadquelle erlauben |
| iPhone / iPad | [Offline-Web-App](https://max2605.github.io/stratagem_trainer/) | Safari → Teilen → Zum Home-Bildschirm; vom Nutzer gewählte iPhone-Auslieferung ohne Apple-Entwicklerzugang |
| iOS-Entwicklung (optional) | `*-iphone-simulator.zip`, `*-iphone-unsigned.ipa`, `*-iphone-unsigned-xcarchive.zip` | Simulator-App für Xcode; Gerätearchiv muss vor einer Geräteinstallation signiert werden |
| Alle Plattformen | `*-complete.zip` | Anwendung, JSON-Konfigurationen, Sprachdateien, Quellcode und Codex-Hinweise in einem Archiv |

Desktop-Builds sind zunächst unsigniert. Windows und macOS können daher eine Betriebssystembestätigung verlangen. Die macOS-Ausnahme erfolgt in Systemeinstellungen → Datenschutz & Sicherheit. Es werden keine Systemschutzfunktionen automatisch abgeschaltet.

Die Android-Testversion benutzt den Debug-Schlüssel der Build-Umgebung. Ein APK aus einem anderen Build kann einen anderen Schlüssel besitzen; dann muss vor der Installation die alte Testversion deinstalliert werden. Eigene Packs und Gruppen vorher exportieren. Für eine stabile öffentliche Veröffentlichung sollte ein dauerhafter Release-Schlüssel konfiguriert werden.

Eine **unsignierte IPA lässt sich nicht direkt auf einem normalen iPhone installieren**. Ohne Apple-Zertifikat kann die PWA verwendet werden: gehostete HTTPS-Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Ein normaler lokaler `file://`-Aufruf ersetzt weder einen Webserver noch die PWA-Installation. Zum nativen Start benötigt man einen Mac mit Xcode und ein passendes Apple-Entwicklerteam. Der Simulator-Build benötigt keine Geräte-Signatur.

## Verzeichnisstruktur

```text
windows/  linux/  macOS/  iphone/  android/
  application/
    <ausführbare Datei oder natives Archiv>
    configs/*.json
    lang/*.json
    web/                         # generierter Web-Build
    SHA256SUMS.txt
  sourcecode/
    <Momentaufnahme der gemeinsamen Quellen>
    native/                      # nur Android/iPhone
  codex/
    PLATFORM.md
```

Die maßgeblichen JSON-Dateien liegen in `shared/application/configs` und `shared/application/lang`. `pnpm build` kopiert sie in `dist`; `pnpm stage:platforms` verteilt sie in die Plattformverzeichnisse. Änderungen in den äußeren `application/configs`-Dateien ändern bereits gebaute Programmdateien nicht automatisch. Geänderte Packs im Trainer importieren oder die Anwendung erneut bauen. Benutzerdefinierte Packs, Gruppen und Einstellungen werden im lokalen Profil gespeichert. Ein Export lässt sich auf eine andere Plattform übertragen.

## Lokal bauen

Node.js 22 oder neuer und pnpm 11.25.0 sind erforderlich. Die genaue Abhängigkeitsauflösung steht in `pnpm-lock.yaml`. In vollständigen Plattform-ZIPs bleibt `sourcecode/README.md` der Plattformhinweis; `sourcecode/BUILD-README.md` enthält die gemeinsame Projektanleitung.

```sh
pnpm install --frozen-lockfile
pnpm test
node --test desktop/https-download.test.cjs
pnpm build
node desktop/smoke-test.mjs
```

Auf dem jeweiligen Desktop-Betriebssystem:

```sh
pnpm dist:desktop --win --x64 --publish never
pnpm dist:desktop --linux --x64 --publish never
pnpm dist:desktop --mac --x64 --arm64 --publish never
node scripts/stage-platforms.mjs --platform windows
```

Das letzte Kommando für Linux mit `linux`, für macOS mit `macOS` aufrufen. Die nativen Build-Ergebnisse liegen zunächst in `build/desktop`; der Staging-Schritt kopiert sie nach `<Plattform>/application`.

Android benötigt JDK 21, Android SDK API 36 und Build Tools 36.0.0. Alternativ Android Studio ab 2025.2.1 verwenden. Nach dem Web-Build:

Auf Windows kann `./scripts/platform-android-local.ps1` alternativ eine per Prüfsumme geprüfte JDK-/SDK-Build-Umgebung in `build/toolchain` herunterladen und das APK bauen. Sie verändert keine systemweiten Einstellungen; die Android-SDK-Build-Lizenzen werden für diesen Build akzeptiert.

```sh
node scripts/platform-prepare.mjs android
cd android/sourcecode/native
./gradlew assembleDebug             # Windows: gradlew.bat assembleDebug
cd ../../..
node scripts/stage-platforms.mjs --platform android --artifact android/sourcecode/native/app/build/outputs/apk/debug/app-debug.apk
```

iOS benötigt macOS und Xcode 26 oder neuer:

```sh
node scripts/platform-prepare.mjs ios
bash scripts/platform-ios.sh
```

Das iOS-Projekt verwendet Swift Package Manager. Die Dateisystem-Nutzung ist im Privacy Manifest mit Apples empfohlenem Grund `C617.1` erklärt. Die App fragt keine Kamera-, Mikrofon- oder Standortberechtigungen an.

## GitHub Actions und Releases

`.github/workflows/build.yml` testet bei Push, Pull Request und manuellem Start den gemeinsamen Code und baut danach alle fünf Plattformen auf geeigneten GitHub-Rechnern. Die Download-Artefakte werden 30 Tage gespeichert. Ein Tag mit Präfix `v` veröffentlicht nach erfolgreichen Builds eine GitHub Release mit allen Plattformpaketen und SHA-256-Prüfsummen.

Für eine signierte iPhone-IPA kann `.github/workflows/ios-signed.yml` manuell gestartet werden. Die folgenden Repository-Secrets müssen zum App-Identifier `io.github.max2605.stratagemtrainer` und zur gewählten Apple-Exportmethode passen:

- `IOS_CERTIFICATE_BASE64`: base64-kodierte Apple-Distribution-P12-Datei
- `IOS_CERTIFICATE_PASSWORD`: Passwort dieser P12-Datei
- `IOS_PROVISION_PROFILE_BASE64`: base64-kodiertes Provisioning Profile
- `IOS_TEAM_ID`: Apple-Team-ID
- `IOS_KEYCHAIN_PASSWORD`: temporäres Keychain-Passwort

Die Signatur wird nur innerhalb des Build-Jobs importiert und anschließend entfernt. Ein signierter Export ist zusätzlich zu den standardmäßigen unsignierten Entwicklungsartefakten möglich. App Store / TestFlight / Geräteverteilung hängen von Apples Profil und Entwicklerkonto ab.

## Technische Referenzen

- [Capacitor 8: Systemvoraussetzungen](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Capacitor: Konfigurationsoptionen und native Projektpfade](https://github.com/ionic-team/capacitor/blob/main/cli/src/declarations.ts)
- [Capacitor Filesystem: Privacy Manifest](https://capacitorjs.com/docs/apis/filesystem)
- [Electron: Sicherheitsrichtlinien](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron: eigener App-Protocol-Handler](https://www.electronjs.org/docs/latest/api/protocol)
- [electron-builder: Ausgabepakete](https://www.electron.build/docs/targets/)
- [GitHub: verfügbare Build-Rechner](https://github.com/actions/runner-images)
