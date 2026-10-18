# Todo-Liste

Geplante Verbesserungen für diesen Fork. Bekannte Fehler stehen in
[KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## Offen

- Nähe-Liste: Schiffstyp statt nur „Schiff“ anzeigen (die Positionszeilen
  der Schiffsebene enthalten den Typ nicht; er müsste aus den Datensätzen
  nachgeschlagen werden).
- Detailfenster: Klassen wie „airliner“ aus den Flugdaten übersetzen.

## Erledigt

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
