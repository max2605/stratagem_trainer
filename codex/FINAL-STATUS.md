# Auslieferung 1.0.0

Die ausführbaren Pakete stammen aus Commit `6d54a5c81761a92d958f7fe1edf146f2f6721590`.
Der [vollständige Build-Lauf](https://github.com/max2605/stratagem_trainer/actions/runs/38313798176)
hat die gemeinsame Prüfung und alle fünf Plattformjobs erfolgreich abgeschlossen.
Die nachfolgende Abschlussdokumentation ändert die Anwendung nicht.

- [Web-App](https://max2605.github.io/stratagem_trainer/)
- [Release und Downloads](https://github.com/max2605/stratagem_trainer/releases/tag/v1.0.0)
- [Bedienungsanleitung](../docs/user-guide.md)
- [Plattform-/Buildanleitung](../docs/platforms.md)
- [Katalogquellen und Umfang](../docs/catalog.md)

## Prüfung

| Prüfung | Ergebnis |
| --- | --- |
| Kern, Profile, Katalog, Sprachen und Fehlermeldungen | 45 Tests bestanden |
| Desktop-HTTPS-Downloader | 6 Tests bestanden |
| Bedienung: Desktop-Chromium, Mobile-Chromium, Safari/WebKit | 42 Tests bestanden |
| Produktionsbuild, Service Worker, Offline-Neuladen und Konfigurationsdateien | Bestanden |
| Gehostete mobile PWA: Scope, Offline-Neuladen, Touch und Bildschirmhöhe | Bestanden |
| Gebaute Desktop-Runtimes: Windows, Linux mit virtuellem Display, macOS Apple Silicon | Bestanden |
| Native Android-/iOS-Builds | Erfolgreich auf passenden GitHub-Runnern |
| Downloadarchive | CRC, Struktur, aktuelle JSON-Dateien und eingebettete Binär-Prüfsummen geprüft |
| Veröffentlichte GitHub-Assets | Größe und SHA-256 aller 18 Dateien stimmen mit den lokalen Dateien überein |

Die 93 Tests decken unter anderem Zufallsdurchläufe, Fehlerwiederholung, Zeitlimit,
Pause, ausgeblendete Hinweise, eigene Gruppen, Editor, Import/Export, Sicherungen,
frei belegbare Pfeil-/Funktionstasten und deutsche/englische Fehler ab.
Ein Wettlauf beim Einspielen von Testprofilen wurde durch Einspielen vor dem
Mounten der Anwendung behoben; der finale CI-Lauf ist grün.

## Dateien und Plattformen

Die Release enthält 17 Binär-/Vollarchive und `SHA256SUMS.txt` (18 Assets).
Die fünf vollständigen ZIPs enthalten die verlangte Struktur mit `application`,
`application/configs`, `application/lang`, `sourcecode` und `codex`.
Die lokalen Plattformverzeichnisse wurden aus denselben finalen Archiven ergänzt.
Die Dateinamen, Größen und Prüfsummen sind in [RELEASE-ASSETS.json](RELEASE-ASSETS.json) festgehalten.

Windows erhält Portable-EXE und Benutzer-Installer, Linux AppImage und tar.gz,
macOS DMG/ZIP für Intel und Apple Silicon und Android eine installierbare Test-APK.
Der Intel-Mac-Build wurde gebaut und als Archiv geprüft; der macOS-Laufzeittest
lief auf Apple Silicon. Physische Android-/iPhone-Geräte wurden nicht getestet.

Der Nutzer hat für iPhone ausdrücklich die installierbare Safari-PWA gewählt:
**Teilen → Zum Home-Bildschirm**. Dafür ist kein kostenpflichtiger Apple-
Entwicklerzugang erforderlich. Simulator-App, unsignierte IPA und Gerätearchiv
liegen zusätzlich für die native Entwicklung bei. Die unsignierte IPA ist ohne
weitere Signierung nicht direkt auf einem normalen iPhone installierbar.
Desktop-Pakete sind unsigniert; die Android-APK verwendet einen Testschlüssel.

## Daten und Fortsetzung

Der mitgelieferte Katalog hat Stand 2026-10-12: 25 Warbonds plus Grundspiel und
Missionsbefehle, 27 Pakete und 114 Einträge. Elf Warbonds ohne eigene Rufcodes
bleiben ausdrücklich leer. Die beiden Sprachdateien besitzen jeweils 161 Schlüssel.

Die Issues #1–#10 dokumentieren die Arbeitsschritte. Commits schließen die
zugehörigen Issues; der Abschlusscommit schließt #5 und #6 nach der fertigen
Veröffentlichung. Zukünftige Änderungen bekommen neue Issues.
Die Paketquellen liegen im verlinkten Build-Commit; ein neuer `v*`-Tag baut und
veröffentlicht über GitHub Actions erneut.
