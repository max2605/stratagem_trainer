# Stratagem Trainer 1.0.0

Erste lauffähige Version des mehrsprachigen Helldivers-2-Trainers.

- **[Trainer direkt öffnen](https://max2605.github.io/stratagem_trainer/)**. Auf dem iPhone in Safari über **Teilen → Zum Home-Bildschirm** installieren; nach dem ersten Laden offline nutzbar.
- 25 Warbond-Konfigurationen plus Grundspiel und Missionsbefehle: 114 Einträge mit nachvollziehbaren Quellen.
- Zufallsdurchläufe, eigene Gruppen, Favoriten und Wiederholung von Fehlern.
- WASD, Pfeiltasten und eigene Belegung; mobiles Eingabefeld mit halber Bildschirmhöhe und eigener Anzeige.
- JSON-Editor, HTTPS-Downloader, Dateiimport, Export, Sicherungen und lokale Statistik.
- Deutsche und englische Sprachdateien, Hinweise, Zeitlimits, Audio und native Haptik.

Downloads enthalten Windows Portable/Installer, Linux AppImage/tar.gz, macOS Intel/Apple-Silicon DMG/ZIP und eine installierbare Android-Test-APK. Die vollständigen Plattform-ZIPs enthalten `application/configs`, `application/lang`, `sourcecode`, `codex` und den Offline-Web-Build. `SHA256SUMS.txt` enthält die Prüfsummen.

Wie vom Nutzer gewählt wird die iPhone-Version als Offline-PWA ausgeliefert. Die optionalen iOS-Simulator-/IPA-Dateien sind Entwicklerartefakte; die unsignierte IPA lässt sich ohne weitere Signierung nicht auf einem normalen iPhone installieren. Desktop-Pakete sind unsigniert, die Android-APK nutzt einen Testschlüssel.

Geprüft: 51 Kern-/Daten-/Profil-/Fehlermeldungs-/Downloader-Tests und 42 Bedienungstests mit Desktop-Chromium, Mobile-Chromium und Safari/WebKit, Produktions-Offline-Nutzung, die gehostete mobile PWA und die gebauten Desktop-Runtimes. Die nativen Pakete wurden auf den passenden GitHub-Runnern erzeugt. Ein Test auf jedem physischen Gerät ist damit nicht behauptet.

Quellstand der nativen Builds: `6d54a5c`. [Build-Nachweis](https://github.com/max2605/stratagem_trainer/actions/runs/38313798176). [Anleitung](https://github.com/max2605/stratagem_trainer/blob/main/docs/user-guide.md).
