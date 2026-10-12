# Stratagem Trainer – Anleitung

Der Trainer übt die Richtungsfolgen aus Helldivers 2. Eine Anmeldung ist nicht
erforderlich. Die mitgelieferten Pakete funktionieren offline; Einstellungen,
eigene Pakete und Fortschritt werden lokal auf diesem Gerät gespeichert.
Deutsch und Englisch lassen sich oben rechts umschalten. Die Spielnamen im
Katalog bleiben zur leichteren Suche auf Englisch.

## Schnell anfangen

1. Öffne **Sammlung** und aktiviere die gewünschten Pakete über das Kästchen
   neben ihrem Namen. **Alle** und **Keine** ändern die komplette Paketauswahl.
2. Öffne **Training** und wähle **Zufälliger Durchlauf**.
3. Drücke **Training starten** und gib die angezeigte Folge mit WASD, den
   Pfeiltasten oder dem Eingabefeld ein. Ein vollständiger Befehl führt direkt
   zum nächsten Stratagem.

Der Zufallsmodus mischt alle Einträge der aktiven Pakete. Jeder Eintrag kommt
einmal pro Durchlauf vor, bevor der nächste Durchlauf neu gemischt wird. Für
einen einzelnen Warbond aktiviere nur dieses Paket. Warbonds mit **Keine eigenen
Stratagems** besitzen keine eigenen Rufcodes und vergrößern den Übungspool nicht.

Die Sammlung enthält zum Stand **12. Oktober 2026** alle 25 veröffentlichten
Warbonds sowie Grundspiel-/Update- und Missionspakete: insgesamt 114 Einträge.
Verschiedene Missionsvarianten können unterschiedliche Folgen haben. Quellen
und bewusst ausgelassene historische Einträge stehen in [Katalogdaten](catalog.md).

## Eingabe und Übungsoptionen

| Aktion | Standard |
| --- | --- |
| Hoch / runter / links / rechts | W / S / A / D oder ↑ / ↓ / ← / → |
| Pausieren und fortsetzen | **Pause** / **Fortsetzen**, außerdem Esc im Training |
| Aktuelle Eingabe zurücksetzen | R im Training |
| Neue Sitzung mit neu gemischtem Pool | Schaltfläche ↻ **Neu mischen** |
| Richtungsfolge aus- oder einblenden | Schaltfläche ◉ / ◎ neben dem Startknopf |

Eine falsche Richtung setzt die begonnene Folge zurück und zählt als Fehler.
Bei **Fehler automatisch wiederholen** kommen fehlerhafte Befehle nach dem
normalen Durchlauf nochmals an die Reihe. Die ausgeblendete Folge bleibt auch
beim nächsten Befehl ausgeblendet; bereits eingegebene Richtungen sind sichtbar.
Das Verlassen des Trainings oder Wechseln in eine andere App pausiert die Übung.

Unter **Einstellungen** kannst du Ton, Vibration bei Fehlern, reduzierte
Animationen und die anfängliche Anzeige der Folge wählen. Das **Zeitlimit pro
Befehl** steht standardmäßig auf **Ohne Limit**. Bei 3, 5, 10, 15 oder 30 Sekunden
beginnt der Countdown mit der Eingabe. Ein Ablauf zählt als Fehler; der Befehl
kann erneut versucht werden.

Zur eigenen Tastenbelegung wähle eine Taste unter **Tastenbelegung** und drücke
die gewünschte neue Taste. Mit **+** ergänzt du weitere Belegungen, mit **×**
entfernst du eine. Pro Richtung sind 1–8 Tasten möglich; auch Pfeil- und
Funktionstasten lassen sich zuordnen. Esc bricht die Belegung ab und bleibt für
Pause reserviert. Eine Taste darf nur einer Richtung gehören. Zum Tauschen
bereits verwendeter Tasten entferne zuerst deren bisherige Belegung.
**WASD + ↑ ↓ ← →** stellt die Standardbelegung wieder her. Die App verwendet die
physische Tastenposition; die Anzeige des Eingabefelds wird getrennt eingestellt.

## Gruppen, Favoriten und Fehlertraining

In der **Sammlung** öffnest du ein Paket über seinen Namen. Die Suche findet
Paket- und Stratagemnamen. Das Kästchen am Paket aktiviert es für den Zufallsmodus;
die Kästchen an einzelnen Stratagems wählen Einträge für eine eigene Gruppe.

Wähle beliebige Einträge aus mehreren Paketen, gib einen **Gruppennamen** ein und
drücke **Gruppe speichern**. Danach startet ein Klick auf den Gruppennamen die
entsprechende Übung. Du kannst die Gruppe auch unter **Training → Eigene Gruppe**
auswählen. Das × am Gruppennamen löscht die Gruppe.

Der Stern ★ an einem Eintrag schaltet seinen Favoritenstatus um. **Training →
Favoriten** übt diese Einträge. **Fehler wiederholen** übt Einträge, für die der
gespeicherte Fortschritt mindestens einen Fehler enthält. Diese drei Modi nutzen
ihre eigene Einzelauswahl unabhängig von den aktivierten Zufallspaketen.

## Eigene Pakete erstellen und bearbeiten

Öffne **Editor → Neues Paket**, vergib einen Paketnamen und behalte die erzeugte
Paket-ID oder wähle eine eigene stabile ID. **Stratagem hinzufügen** erstellt
einen Eintrag. Vergib Name und ID und baue seine Folge mit den vier
Richtungsschaltflächen auf. **Letzte Richtung entfernen** korrigiert den letzten
Schritt; **Leeren** entfernt die gesamte Folge.

**Speichern** prüft das Paket, legt es lokal ab und aktiviert es für das Training.
Entwürfe im Editor werden erst mit **Speichern** dauerhaft übernommen.
**JSON exportieren** lädt die geprüfte Paketdatei herunter beziehungsweise öffnet
auf der nativen Handy-App den Teilen-Dialog. Speichern und Export sind getrennte
Aktionen.

Mit **Als eigene Kopie bearbeiten** in der Sammlung öffnest du vorhandene Pakete
im Editor. Bei einem mitgelieferten Paket erhält die Kopie eine eigene ID.
Die Originaldatei bleibt verfügbar. Bei einem eigenen Paket ersetzt das Speichern
dieselbe Paket-ID. **JSON bearbeiten → JSON übernehmen** lädt den bearbeiteten
JSON-Text in den Entwurf; danach ist zum dauerhaften Ablegen **Speichern** nötig.

## JSON-Dateien und Link-Downloader

**Sammlung → JSON importieren** liest eine lokale Paketdatei. Für einen Download
füge unter **Direkter HTTPS-Link zur JSON-Datei** die Adresse ein und drücke
**Link laden**. Ein GitHub-Dateilink mit `/blob/` wird automatisch in die
Rohdatei-Adresse umgewandelt. Der Link muss die Datei liefern und darf keine
Zugangsdaten enthalten. Neue Warbonds und beliebige eigene Übungen können so
ergänzt werden. Ein erneuter Import mit derselben eigenen Paket-ID ersetzt
das entsprechende Paket.

Eine Paketdatei ist UTF-8-JSON und darf höchstens 1 MiB groß sein. Beispiel für
eine eigene Übung:

```json
{
  "schemaVersion": 1,
  "id": "meine-uebung",
  "name": "Meine Übung",
  "kind": "custom",
  "description": "Eine selbst gewählte Richtungsfolge",
  "stratagems": [
    {
      "id": "beispiel",
      "name": "Beispielbefehl",
      "sequence": ["up", "down", "left", "right"]
    }
  ]
}
```

`schemaVersion`, `id`, `name`, `kind` und `stratagems` sind Pflichtfelder. `kind`
ist `base`, `warbond` oder `custom`. Jede Folge verwendet 1–16 Werte aus `up`,
`down`, `left`, `right`; Tastennamen gehören nicht in `sequence`. Ein Paket
enthält höchstens 500 Einträge. IDs bestehen aus 1–64 Buchstaben oder Ziffern,
getrennt durch Bindestriche oder Unterstriche. Eintrags-IDs müssen innerhalb
ihres Pakets eindeutig sein; behalte IDs bei Aktualisierungen bei, damit
Gruppen, Favoriten und Fortschritt zugeordnet bleiben.

Namen haben höchstens 120 Zeichen, Beschreibungen höchstens 1.000. Optionale
Eintragsfelder sind `category`, `tags` und `source`. Pakete können zusätzlich
`source`, `verifiedAt`, `releaseDate` und `notes` enthalten. Die vollständigen
Grenzen stehen im [JSON-Schema](../shared/sourcecode/core/pack.schema.json).
Unbekannte Felder, HTML, Kommentare und ungültiges JSON werden abgewiesen.
`configs/index.json` ist ein Dateiverzeichnis und keine importierbare Übung.

Im Browser muss der Downloadserver die Abfrage der Web-App erlauben (CORS).
Falls ein Link dort scheitert, speichere die JSON-Datei und importiere sie lokal.
Downloads benötigen eine Internetverbindung; bereits importierte Pakete
funktionieren anschließend offline.

## Fortschritt und Sicherung

**Fortschritt** zeigt abgeschlossene Befehle, Fehler, den Anteil fehlerfrei
abgeschlossener Befehle und die beste Serie. Die Tabelle zeigt die schnellste
gemessene Zeit je Stratagem. Die **Trefferquote** im Training zählt dagegen
korrekte einzelne Richtungen im Verhältnis zu allen eingegebenen Richtungen.
**Neu mischen** beginnt eine neue Sitzung; der gespeicherte Gesamtfortschritt
bleibt erhalten.

Unter **Einstellungen → Sicherung exportieren** erhältst du
`stratagem-backup.json` mit eigenen Paketen, Paketauswahl, Gruppen, Favoriten,
Einstellungen und Fortschritt. Kopiere diese Datei auf ein anderes Gerät und
öffne dort **Sicherung importieren**. Dabei ersetzen die importierten
Einstellungen, Auswahl, Gruppen, Favoriten und Fortschrittsdaten die lokalen
Werte. Eigene Pakete werden ergänzt; bei gleicher ID gewinnt die Sicherung.
Eine Sicherung wird an dieser Stelle importiert, eine einzelne Übungsdatei
über die Sammlung.

Das lokale Profil wird automatisch gespeichert, aber nicht zwischen Geräten
synchronisiert. Exportiere eine Sicherung vor dem Löschen der App, dem Leeren
von Browserdaten oder einem Gerätewechsel. **Fortschritt zurücksetzen** löscht
nur die Statistik nach einem zweiten Klick innerhalb von fünf Sekunden. Auch
das Löschen eigener Pakete benötigt diesen zweiten Klick.

## Handy und Installation

Das große Eingabefeld kann mit **Pfeile**, **WASD** oder **Eigene Beschriftung**
angezeigt werden. Für eigene Beschriftungen stehen vier Felder mit jeweils bis
zu zwölf Zeichen bereit. Die Felder ändern die sichtbaren Tastenlabels; alle
drei Ansichten geben dieselben vier Richtungen ein. Im Querformat eignet sich
**Eingabefeld links (Querformat)** für die linke Hand. Vibration hängt von der
Unterstützung des Geräts ab.

Die Desktop-App startet über das jeweilige Windows-, Linux- oder macOS-Paket;
Android verwendet die APK. Auf dem iPhone kannst du die gehostete Web-App in
Safari öffnen und über **Teilen → Zum Home-Bildschirm** installieren. Lade sie
einmal vollständig mit Internetverbindung; anschließend steht das Training
offline bereit. Eine unsignierte IPA benötigt vor einer Geräteinstallation
eine Apple-Signatur. Downloadformate, native Installation und Buildhinweise
stehen unter [Plattformen](platforms.md).

## Wenn etwas nicht klappt

- **Leerer Pool:** Aktiviere ein Paket mit Einträgen oder wähle eine gefüllte
  Gruppe. Favoriten und Fehlertraining benötigen zuvor markierte bzw.
  aufgezeichnete Einträge.
- **Eingabe reagiert nicht:** Starte bzw. setze das Training fort. Während der
  Texteingabe in einem Formular werden keine Trainingsbefehle verarbeitet.
- **Import abgewiesen:** Prüfe das JSON-Format, die Dateigröße, IDs und die
  vier erlaubten Richtungswerte. Der gemeldete Feldpfad zeigt die Fehlerstelle.
- **Speichern fehlgeschlagen:** Exportiere sofort eine Sicherung und prüfe,
  ob Browser oder Gerät lokalen Speicher bereitstellen.
