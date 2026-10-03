/**
 * Interface text by locale. English is the source catalog: every other
 * locale may omit a key and falls back to it, but must not add one.
 * Keys group by surface. Placeholders are written `{name}`.
 *
 * English values that also appear in src/ui/templates/ or in the provider
 * registry (src/keySetupCore.mjs) must stay identical to that text;
 * src/i18n/catalogs.test.mjs fails when they drift apart.
 */

const EN = Object.freeze({
  // Language picker (Display panel). Language names are written in their own
  // language and are not translated.
  'language.label': 'Language',
  'language.select': 'Interface language',

  // Panel headers.
  'panel.dataLayers': 'DATA LAYERS',
  'panel.scenes': 'SCENES',
  'panel.display': 'DISPLAY',

  // First-run launcher (src/ui/templates/welcome.html, src/firstRunExperience.js).
  'firstRun.kicker': 'MISSION CONTROL · FIRST LAUNCH',
  'firstRun.title': 'Choose your first view',
  'firstRun.description':
    'It feels like a forbidden cockpit—then you realize the sources are public and the data is real.',
  'firstRun.contacts.title': 'LIVE CONTACTS',
  'firstRun.contacts.detail': 'Aircraft, vessels and nearby intelligence',
  'firstRun.spaceMissions.title': 'SPACE MISSIONS',
  'firstRun.spaceMissions.detail': 'Launches, spacecraft and orbital context',
  'firstRun.environmental.detail':
    'Live earthquakes and active fires, from USGS and NASA',
  'firstRun.environmentalLabel.ENVIRONMENTAL': 'ENVIRONMENTAL',
  'firstRun.environmentalLabel.EARTH_WATCH': 'EARTH WATCH',
  'firstRun.environmentalLabel.ACTIVE_EVENTS': 'ACTIVE EVENTS',
  'firstRun.explore.title': 'EXPLORE MANUALLY',
  'firstRun.explore.detail': 'Begin with a clean globe',
  'firstRun.suppress': "Don't show this again",
  'firstRun.escape': 'ESC to dismiss',
  'firstRun.tip':
    'Tip: the GEV MIC button in the dock lets you talk to the map.',
  'firstRun.busy.contacts': 'Starting live contacts…',
  'firstRun.busy.space-missions': 'Opening space missions…',
  'firstRun.busy.environmental': 'Scanning active events…',
  'firstRun.busy.default': 'Working…',
  'firstRun.failed':
    'Could not open that mission{detail}. Retry or explore manually.',
  'firstRun.storageBlocked':
    'This browser is blocking storage, so that could not be saved.',

  // Provider Settings (src/ui/templates/provider-settings.html, src/keySetup.js).
  'keySetup.chip.waitingOne': 'POWER UP · {count} KEY WAITING',
  'keySetup.chip.waitingMany': 'POWER UP · {count} KEYS WAITING',
  'keySetup.chip.done': 'POWERED UP',
  'keySetup.chip.title': 'Project keys: {label}',
  'keySetup.kicker': 'GROUND STATION · PROVIDER SETTINGS',
  'keySetup.close': 'Close key setup',
  'keySetup.title': 'Power up the globe',
  'keySetup.description':
    "The globe already flies keyless. Every key below switches on another real feed — paste one and it's saved into this app's local configuration, then the server restarts itself. Server-side keys stay on this machine; Google Maps and Cesium ion run in the browser and must be provider-restricted. Keys you configured elsewhere are shown but never touched.",
  'keySetup.apply': 'SAVE KEYS',
  'keySetup.escape': 'ESC to close',
  'keySetup.note':
    'The Google Maps key buys the photorealistic planet — everything else stacks on top.',
  'keySetup.tier.metered': 'Metered — a billing-enabled account',
  'keySetup.tier.free': 'Free key — register, paste, done',
  'keySetup.browserSide': 'browser-side',
  'keySetup.browserSide.title':
    'This key runs in the browser by design — restrict it at the provider (see SECURITY.md)',
  'keySetup.external': 'configured externally',
  'keySetup.external.title':
    'Supplied by your environment, Keychain, or launcher — change it where it was set',
  'keySetup.manage': 'MANAGE ↗',
  'keySetup.get': 'GET KEY ↗',
  'keySetup.placeholder.saved': '{envVar} saved — paste to replace',
  'keySetup.placeholder.empty': 'paste {envVar}',
  'keySetup.remove': 'REMOVE',
  'keySetup.remove.title': "Remove {title} from this app's saved keys",
  'keySetup.store.pinokio': 'your app configuration',
  'keySetup.store.env': 'your local .env',
  'keySetup.saving': 'Saving…',
  'keySetup.saveFailedStatus': 'Save failed ({status}).',
  'keySetup.saveFailed': 'Save failed: {message}',
  'keySetup.saved': 'Saved to {store}. Restarting — this page reloads itself.',
  'keySetup.removed':
    'Removed from {store}. Restarting — this page reloads itself.',
  'keySetup.empty': 'Paste at least one key first.',
  'keySetup.confirmRemove': 'Remove this key from your saved configuration?',
  'keySetup.unlocks.google-maps': 'The photorealistic 3D planet + place search',
  'keySetup.unlocks.google-maps-server':
    'Places context + Street View fallback; optional separate key',
  'keySetup.unlocks.openai': 'Voice control — talk to the planet',
  'keySetup.unlocks.aisstream': 'Live ships, worldwide',
  'keySetup.unlocks.firms': 'Live active-fire detections',
  'keySetup.unlocks.tomtom': 'Real live traffic (keyless runs a simulation)',
  'keySetup.unlocks.cesium-ion': 'Bing imagery map stacks + world terrain',
  'keySetup.unlocks.opensky':
    'More flight-polling credits (anonymous works without)',
  'keySetup.unlocks.launch-library': 'Higher space-missions request allowance',
});

const DE = Object.freeze({
  'language.label': 'Sprache',
  'language.select': 'Sprache der Oberfläche',

  'panel.dataLayers': 'DATENEBENEN',
  'panel.scenes': 'SZENEN',
  'panel.display': 'ANZEIGE',

  'firstRun.kicker': 'MISSIONSKONTROLLE · ERSTER START',
  'firstRun.title': 'Wähle deine erste Ansicht',
  'firstRun.description':
    'Es wirkt wie ein verbotenes Cockpit – bis du merkst: Die Quellen sind öffentlich und die Daten echt.',
  'firstRun.contacts.title': 'LIVE-KONTAKTE',
  'firstRun.contacts.detail': 'Flugzeuge, Schiffe und Lagebild der Umgebung',
  'firstRun.spaceMissions.title': 'RAUMFAHRT',
  'firstRun.spaceMissions.detail': 'Starts, Raumfahrzeuge und Orbit-Kontext',
  'firstRun.environmental.detail':
    'Aktuelle Erdbeben und Brände, von USGS und NASA',
  'firstRun.environmentalLabel.ENVIRONMENTAL': 'UMWELT',
  'firstRun.environmentalLabel.EARTH_WATCH': 'ERDBEOBACHTUNG',
  'firstRun.environmentalLabel.ACTIVE_EVENTS': 'AKTUELLE EREIGNISSE',
  'firstRun.explore.title': 'FREI ERKUNDEN',
  'firstRun.explore.detail': 'Mit einem leeren Globus beginnen',
  'firstRun.suppress': 'Nicht mehr anzeigen',
  'firstRun.escape': 'ESC zum Schließen',
  'firstRun.tip':
    'Tipp: Mit der Taste GEV MIC im Dock sprichst du mit der Karte.',
  'firstRun.busy.contacts': 'Live-Kontakte werden gestartet…',
  'firstRun.busy.space-missions': 'Raumfahrt wird geöffnet…',
  'firstRun.busy.environmental': 'Aktuelle Ereignisse werden gesucht…',
  'firstRun.busy.default': 'Wird ausgeführt…',
  'firstRun.failed':
    'Diese Mission konnte nicht geöffnet werden{detail}. Versuche es erneut oder erkunde frei.',
  'firstRun.storageBlocked':
    'Dieser Browser blockiert den Speicher, daher konnte das nicht gespeichert werden.',

  'keySetup.chip.waitingOne': 'POWER UP · {count} SCHLÜSSEL FEHLT',
  'keySetup.chip.waitingMany': 'POWER UP · {count} SCHLÜSSEL FEHLEN',
  'keySetup.chip.done': 'ALLES AKTIV',
  'keySetup.chip.title': 'Projektschlüssel: {label}',
  'keySetup.kicker': 'BODENSTATION · ANBIETER-EINSTELLUNGEN',
  'keySetup.close': 'Schlüssel-Einstellungen schließen',
  'keySetup.title': 'Rüste den Globus auf',
  'keySetup.description':
    'Der Globus läuft schon ohne Schlüssel. Jeder Schlüssel unten schaltet eine weitere echte Datenquelle frei – füge ihn ein, er wird in der lokalen Konfiguration dieser App gespeichert, und der Server startet sich neu. Serverseitige Schlüssel bleiben auf diesem Rechner; Google Maps und Cesium ion laufen im Browser und müssen beim Anbieter beschränkt werden. Anderswo konfigurierte Schlüssel werden angezeigt, aber nie verändert.',
  'keySetup.apply': 'SCHLÜSSEL SPEICHERN',
  'keySetup.escape': 'ESC zum Schließen',
  'keySetup.note':
    'Der Google-Maps-Schlüssel bringt den fotorealistischen Planeten – alles andere baut darauf auf.',
  'keySetup.tier.metered': 'Kostenpflichtig – Konto mit aktivierter Abrechnung',
  'keySetup.tier.free':
    'Kostenloser Schlüssel – registrieren, einfügen, fertig',
  'keySetup.browserSide': 'im Browser',
  'keySetup.browserSide.title':
    'Dieser Schlüssel läuft absichtlich im Browser – beschränke ihn beim Anbieter (siehe SECURITY.md)',
  'keySetup.external': 'extern konfiguriert',
  'keySetup.external.title':
    'Stammt aus deiner Umgebung, dem Schlüsselbund oder dem Launcher – ändere ihn dort, wo er gesetzt wurde',
  'keySetup.manage': 'VERWALTEN ↗',
  'keySetup.get': 'SCHLÜSSEL HOLEN ↗',
  'keySetup.placeholder.saved': '{envVar} gespeichert – zum Ersetzen einfügen',
  'keySetup.placeholder.empty': '{envVar} einfügen',
  'keySetup.remove': 'ENTFERNEN',
  'keySetup.remove.title':
    '{title} aus den gespeicherten Schlüsseln dieser App entfernen',
  'keySetup.store.pinokio': 'deiner App-Konfiguration',
  'keySetup.store.env': 'deiner lokalen .env',
  'keySetup.saving': 'Wird gespeichert…',
  'keySetup.saveFailedStatus': 'Speichern fehlgeschlagen ({status}).',
  'keySetup.saveFailed': 'Speichern fehlgeschlagen: {message}',
  'keySetup.saved':
    'In {store} gespeichert. Neustart – diese Seite lädt sich selbst neu.',
  'keySetup.removed':
    'Aus {store} entfernt. Neustart – diese Seite lädt sich selbst neu.',
  'keySetup.empty': 'Füge zuerst mindestens einen Schlüssel ein.',
  'keySetup.confirmRemove':
    'Diesen Schlüssel aus deiner gespeicherten Konfiguration entfernen?',
  'keySetup.unlocks.google-maps': 'Der fotorealistische 3D-Planet + Ortssuche',
  'keySetup.unlocks.google-maps-server':
    'Orts-Kontext + Street-View-Ersatz; optional eigener Schlüssel',
  'keySetup.unlocks.openai': 'Sprachsteuerung – sprich mit dem Planeten',
  'keySetup.unlocks.aisstream': 'Live-Schiffe, weltweit',
  'keySetup.unlocks.firms': 'Live-Erkennung aktiver Brände',
  'keySetup.unlocks.tomtom':
    'Echter Live-Verkehr (ohne Schlüssel läuft eine Simulation)',
  'keySetup.unlocks.cesium-ion': 'Bing-Kartenebenen + weltweites Gelände',
  'keySetup.unlocks.opensky':
    'Mehr Abfrage-Kontingent für Flüge (anonym geht es auch ohne)',
  'keySetup.unlocks.launch-library':
    'Höheres Abfrage-Kontingent für Raumfahrtmissionen',
});

/** Catalogs by locale, in the order the language picker lists them. */
export const CATALOGS = Object.freeze({ en: EN, de: DE });

/** Each locale's name in its own language, for the language picker. */
export const LOCALE_NAMES = Object.freeze({ en: 'English', de: 'Deutsch' });
