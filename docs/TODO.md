# Todo-Liste

Geplante Verbesserungen für diesen Fork. Bekannte Fehler stehen in
[KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## Offen

### 1. Schnellwahl Flugzeuge / Schiffe
Drei gut sichtbare Knöpfe oben in der Mitte: „✈ Flugzeuge“, „⚓ Schiffe“,
„Beide“. Sie schalten die Ebenen Live-Flüge (optional Militärflüge) und
Live-Schiffe, ohne Umweg über das eingeklappte Panel „Datenebenen“. Der
Zustand muss mit den Schaltern im Datenebenen-Panel übereinstimmen (beide
Wege schalten dieselben Ebenen) und auf Deutsch und Englisch beschriftet sein.

### 2. Liste „In der Nähe“
Eine Liste der gerade sichtbaren Flugzeuge bzw. Schiffe mit Name, Typ und
Entfernung zur Bildmitte. Ein Klick fliegt zum Objekt und öffnet die
Kontaktkarte, damit niemand auf kleine Symbole zielen muss. Folgt der
Schnellwahl (nur Flugzeuge, nur Schiffe oder beide), aktualisiert sich
gedrosselt und ist per Tastatur bedienbar. Prüfen, ob sich das Kontext-Panel
(„Kontakte“) dafür erweitern lässt, statt ein zweites Panel zu bauen.

### 3. Detailfenster per Rechtsklick
Rechtsklick auf ein Objekt auf dem Globus (Flugzeug, Schiff, Satellit,
Kamera, Anlage, Erdbeben, Brand …) öffnet ein Fenster mit allen
Informationen, die die App dazu hat:

- alle Eigenschaften aus dem gemeinsamen Kontextspeicher
  (`src/data/contextStore.js`), lesbar beschriftet und übersetzt
- Datenquelle und Alter der letzten Meldung
- für Flugzeuge: großes Foto, Typ, Kennzeichen, Betreiber, Route, Höhe,
  Geschwindigkeit, Kurs, Links
- für Schiffe: großes Foto, MMSI/IMO, Schiffstyp im Klartext (AIS-Code),
  Ziel, Geschwindigkeit, Kurs, Quelle (AISStream oder Digitraffic), Links
- Schließen mit Esc, Klick daneben oder ×; per Tastatur erreichbar

Technik: Cesium unterdrückt das Browser-Kontextmenü auf dem Globus bereits,
und ein Rechtsklick ohne Ziehen ist frei (Ziehen mit rechts zoomt weiter).
Ein `RIGHT_CLICK`-Handler wählt mit `scene.pick()` das Objekt und liest dessen
Kontexteintrag; Ebenen, die ihre Objekte nicht über `registerEntityContext`
melden (z. B. Flüge), brauchen eine eigene Zuordnung. Auf Touch-Geräten
übernimmt langes Drücken die Rolle des Rechtsklicks.
