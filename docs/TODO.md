# Todo-Liste

Geplante Verbesserungen für diesen Fork. Bekannte Fehler stehen in
[KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## Offen

- Nähe-Liste: Schiffstyp statt nur „Schiff“ anzeigen (die Positionszeilen
  der Schiffsebene enthalten den Typ nicht; er müsste aus den Datensätzen
  nachgeschlagen werden).
- Detailfenster: Klassen wie „airliner“ aus den Flugdaten übersetzen.

## Erledigt

- **Schiffssuche mit Vorschlägen** (`src/ui/vesselSearch.js`,
  `/api/ais-live/search`): Suchfeld in der Leiste oben; findet alle Schiffe im
  Server-Zwischenspeicher nach Name, MMSI oder IMO, fliegt zum gewählten
  Schiff und öffnet die Kontaktkarte.
- **MarineTraffic-Link** öffnet die Karte zentriert auf die Schiffsposition
  (die Detailseiten-Links von MarineTraffic funktionieren nicht mehr).

- **Schnellwahl Flugzeuge / Schiffe** (`src/ui/trafficPanel.js`): Knöpfe
  „Flugzeuge“, „Schiffe“, „Beide“ oben in der Mitte; erneutes Klicken blendet
  wieder aus. Sie schalten dieselben Ebenen wie das Panel „Datenebenen“.
- **Liste „In der Nähe“** (`src/ui/trafficPanel.js`): die 20 nächsten
  Flugzeuge und Schiffe zur Bildmitte, alle 3 Sekunden aktualisiert; ein
  Klick verfolgt das Flugzeug bzw. fliegt zum Schiff und öffnet die
  Kontaktkarte.
- **Detailfenster per Rechtsklick** (`src/ui/objectDetailsDialog.js`,
  `src/ui/objectDetails.js`): Rechtsklick ohne Ziehen oder langes Drücken
  auf Touch-Geräten öffnet alle Daten zum Objekt, mit Foto und Links für
  Flugzeuge und Schiffe; Schiffstypen im Klartext.
