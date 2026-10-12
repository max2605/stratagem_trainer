# Stratagem Trainer

Ein mehrsprachiger, offline nutzbarer **Helldivers 2**-Trainer für Tastatur und Touch. WASD und Pfeiltasten funktionieren standardmäßig; eigene Tasten und Touch-Beschriftungen sind konfigurierbar.

- Zufälliger Durchlauf durch aktivierte Pakete, eigene Gruppen, Favoriten und Fehlertraining.
- JSON-Konfiguration pro Warbond, Grundspiel und Missionsbefehle; 114 Befehle in 27 Paketen.
- Eigener Editor, HTTPS-Downloader, Dateiimport, JSON-Export und Datensicherungen.
- Deutsche und englische Sprachdateien, Zeitlimit, Hinweise, Audio, Vibration, Fortschritt und Pause bei App-Wechsel.
- Windows EXE, Linux AppImage/tar.gz, macOS DMG/ZIP, Android APK und installierbare Offline-Web-App für iPhone.

**[Trainer öffnen](https://max2605.github.io/stratagem_trainer/) · [Downloads](https://github.com/max2605/stratagem_trainer/releases) · [Anleitung](docs/user-guide.md)**

Native iPhone-Builds werden als Simulator-App und unsignierte IPA bereitgestellt. Die IPA muss mit einer Apple-Entwickleridentität signiert werden, bevor sie auf einem normalen iPhone installiert werden kann. Der Workflow `ios-signed.yml` unterstützt die nötigen Signierungssecrets. Die Web-App lässt sich in Safari über **Teilen → Zum Home-Bildschirm** installieren und funktioniert nach dem ersten Laden offline. Desktop-Pakete sind zunächst unsigniert; Android wird als installierbare Test-APK geliefert.

## Projektstruktur

```text
windows/  linux/  macOS/  iphone/  android/
  application/        ausführbare Pakete und Offline-Web-Version
    configs/          Warbond-/Übungs-JSONs
    lang/             Sprach-JSONs
  sourcecode/         native Projekte und vollständiger Quellstand im Download
  codex/              Plattformhinweise und Arbeitsdokumentation
shared/
  application/configs/  maßgeblicher Katalog
  application/lang/     maßgebliche Sprachdateien
  sourcecode/core/       Validierung und Trainingslogik
  sourcecode/ui/         gemeinsame Oberfläche
  sourcecode/tests/      Kern- und Bedienungstests
```

Gemeinsame Quellen liegen im Repository zentral, damit Korrekturen für alle Systeme gelten. `stage:platforms` legt in jeder Plattform `application`, Konfigurationen, Sprachen, den vollständigen Quellstand und Hinweise an. Die vollständigen Plattform-ZIPs enthalten diese Struktur. Änderungen an externen JSONs werden über den Import geladen; ein Neuaufbau ersetzt gebündelte Standarddaten.

## Entwickeln

Node.js 22 oder neuer und pnpm 11.25.0:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm test:e2e # zuvor pnpm exec playwright install chromium webkit
pnpm build
pnpm stage:platforms
pnpm dist:desktop --win --x64 --publish never
```

Für Linux/macOS das Ziel `--linux`/`--mac` wählen. Native Builds benötigen die Werkzeuge des jeweiligen Systems. GitHub Actions baut Windows, Linux, Intel-/Apple-Silicon-Macs, Android und iOS auf geeigneten Runnern; Tags `v*` veröffentlichen native Downloads, vollständige ZIPs und SHA-256-Prüfsummen. Siehe [Plattformanleitung](docs/platforms.md).

## Konfiguration

```json
{
  "schemaVersion": 1,
  "id": "meine-uebung",
  "name": "Meine Übung",
  "kind": "custom",
  "stratagems": [
    { "id": "reinforce", "name": "Reinforce", "sequence": ["up", "down", "right", "left", "up"] }
  ]
}
```

Gültige Richtungen sind `up`, `down`, `left`, `right`. Pakete dürfen 0–500 Einträge enthalten, Befehle 1–16 Richtungen. IDs müssen innerhalb des Pakets eindeutig sein. Der Downloader akzeptiert höchstens 1 MiB und HTTPS; die Browser-Version benötigt CORS-Freigabe vom Quellserver. Das [JSON-Schema](shared/sourcecode/core/pack.schema.json) dokumentiert die optionalen Felder und Grenzen. Warbonds ohne eigene Stratagems bleiben ausdrücklich leer. Quellen und Faktenprüfung stehen im [Katalogbericht](docs/catalog.md).

## Lizenz und Beiträge

MIT. Unabhängiges Fanprojekt; keine Verbindung zu Arrowhead Game Studios oder Sony Interactive Entertainment. Spielnamen und Marken gehören ihren jeweiligen Inhabern. Die Befehlsdaten enthalten attribuierte MIT-Daten von Keebs; siehe [NOTICE](shared/application/configs/NOTICE.txt).

Jeder Arbeitsschritt erhält ein GitHub-Issue. Zugehörige Commits nutzen `Closes #N` erst nach abgeschlossener Umsetzung und Prüfung. Bekannte Einschränkungen bleiben in offenen Issues dokumentiert.
