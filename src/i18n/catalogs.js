/**
 * Interface text by locale. English is the source catalog: every other
 * locale may omit a key and falls back to it, but must not add one —
 * except under OWNED_PREFIXES, whose English stays with the module that
 * owns it (layer names and state tables) and arrives as `params.default`.
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
  'readable.label': 'Readable',
  'readable.title': 'Larger, higher-contrast text',

  // Panel headers.
  'panel.dataLayers': 'DATA LAYERS',
  'panel.scenes': 'SCENES',
  'panel.display': 'DISPLAY',

  // Panel chrome (src/ui/panelChrome.js).
  'panel.expand': 'Expand {name}',
  'panel.collapse': 'Collapse {name}',
  'panel.expandSection': 'Expand {name} section',
  'panel.collapseSection': 'Collapse {name} section',
  'panel.fallbackName': 'panel',

  // Display panel (src/ui/templates/display-controls.html, src/ui/visualSettings.js).
  'display.layout': 'Layout',
  'display.layout.tactical': 'Tactical',
  'display.layout.operator': 'Operator',
  'display.on': 'ON',
  'display.off': 'OFF',
  'display.sonar.rings': 'Rings',
  'display.sonar.range': 'Range',
  'display.sonar.power': 'Power',
  'display.sonar.opacity': 'Opacity',
  'display.sonar.sector': 'Sector',
  'display.detect.DETECT': 'DETECT',
  'display.detect.SPARSE': 'SPARSE',
  'display.detect.BALANCED': 'BALANCED',
  'display.detect.DENSE': 'DENSE',
  'display.density': 'Density',
  'display.allocation': 'Allocation',
  'display.allocation.elastic': 'Elastic',
  'display.allocation.weighted': 'Weighted',
  'display.fade': 'Fade',
  'display.outside': 'Outside',
  'display.parameters': 'PARAMETERS',
  'display.models': 'Models',
  'display.models.proximity': 'Proximity',
  'display.models.all': 'All',
  'display.scope': 'Scope',
  'display.feather': 'Feather',
  'display.draw': 'Draw',
  'display.draw.shape': 'Shape',
  'display.draw.area': 'Area',
  'display.draw.line': 'Line',
  'display.draw.pin': 'Pin',
  'display.draw.primary': 'Primary',
  'display.draw.amber': 'Amber',
  'display.draw.green': 'Green',
  'display.draw.red': 'Red',
  'display.draw.clear': 'Clear',
  'display.celestial': 'Celestial',
  'display.cleanUi': 'Clean UI',
  'display.bloom': 'Bloom',
  'display.sharpen': 'Sharpen',
  'display.exitCleanView': 'EXIT CLEAN VIEW',

  // Command dock and scene chrome (src/ui/templates/command-dock.html,
  // src/ui/templates/scene-chrome.html).
  'dock.presets': 'VISUAL PRESETS',
  'dock.presets.pin': 'Pin visual presets',
  'dock.presets.keepOpen': 'Keep visual presets open',
  'dock.location': 'LOCATION',
  'dock.location.pin': 'Pin location tray',
  'dock.location.keepOpen': 'Keep location tray open',
  'dock.search': 'Search any location',
  'dock.search.placeholder': 'Search any location...',
  'dock.search.label': 'Search location by name or coordinates',
  'dock.mapSource': 'MAP SOURCE',
  'dock.style': 'Style',
  'dock.style.snow': 'Snow',
  'dock.style.normal.title': 'Show the globe without a visual filter.',
  'dock.style.crt.title':
    'Emulate a green phosphor CRT with scanlines and screen curvature.',
  'dock.style.nvg.title':
    'Simulate night-vision goggles with green intensification and a tube vignette.',
  'dock.style.flir.title':
    'Simulate FLIR-style thermal contrast. Turn up Ironbow for color.',
  'dock.style.anime.title':
    'Apply bright cel-shaded color and illustrated outlines.',
  'dock.style.noir.title': 'Apply high-contrast monochrome film-noir grading.',
  'dock.style.snow.title': 'Add a cold, snowy whiteout treatment to the scene.',
  'scene.activeStyle': 'ACTIVE STYLE',
  'scene.clearLayers': 'Turn off all selected data layers',
  'scene.clearLayers.label': 'Clear selected data layers',
  'scene.share': 'Copy share link',
  'scene.tilt': 'Toggle straight-down and tilted map views',
  'scene.tilt.label': 'Tilt map to oblique view',
  'scene.north': 'Reset map bearing to north',
  'scene.north.label': 'Reset map to north up',
  'scene.globe': 'Reset camera and return to full globe view',
  'scene.globe.label': 'Reset to full globe view',

  // Voice control (src/voice/control.js, src/voice/realtimeController.js).
  'voice.kicker': 'AI AGENT',
  'voice.button': 'ON/OFF',
  'voice.button.label':
    'Voice control — activate to toggle voice; hold Space to speak',
  'voice.tier.title': 'Voice model tier — applies next session',
  'voice.cost.title': 'Estimated session cost',
  'voice.standby': 'VOICE STANDBY',
  'voice.active': 'VOICE ACTIVE',
  'voice.unavailable': 'VOICE UNAVAILABLE',
  'voice.holdToTalk': 'Hold Space to talk',
  'voice.releaseToSend': 'Release Space to send',
  'voice.help.kicker': 'VOICE CONTROL',
  'voice.help.detail':
    'Hold Space to speak · tap Space to activate focused controls',
  'voice.error.title': 'VOICE SYSTEM ERROR',
  'voice.error.dismiss': 'DISMISS',
  'voice.error.hint':
    'Check microphone permission and network access, then try again.',

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
  'readable.label': 'Gut lesbar',
  'readable.title': 'Größere Schrift mit stärkerem Kontrast',

  'panel.dataLayers': 'DATENEBENEN',
  'panel.scenes': 'SZENEN',
  'panel.display': 'ANZEIGE',

  'panel.expand': '{name} aufklappen',
  'panel.collapse': '{name} einklappen',
  'panel.expandSection': 'Bereich {name} aufklappen',
  'panel.collapseSection': 'Bereich {name} einklappen',
  'panel.fallbackName': 'Panel',

  'display.layout': 'Layout',
  'display.layout.tactical': 'Taktisch',
  'display.layout.operator': 'Bediener',
  'display.on': 'AN',
  'display.off': 'AUS',
  'display.sonar.rings': 'Ringe',
  'display.sonar.range': 'Reichweite',
  'display.sonar.power': 'Stärke',
  'display.sonar.opacity': 'Deckkraft',
  'display.sonar.sector': 'Sektor',
  'display.detect.DETECT': 'ERKENNUNG',
  'display.detect.SPARSE': 'WENIG',
  'display.detect.BALANCED': 'MITTEL',
  'display.detect.DENSE': 'DICHT',
  'display.density': 'Dichte',
  'display.allocation': 'Verteilung',
  'display.allocation.elastic': 'Flexibel',
  'display.allocation.weighted': 'Gewichtet',
  'display.fade': 'Übergang',
  'display.outside': 'Außen',
  'display.parameters': 'PARAMETER',
  'display.models': 'Modelle',
  'display.models.proximity': 'Nähe',
  'display.models.all': 'Alle',
  'display.scope': 'Fokus',
  'display.feather': 'Rand',
  'display.draw': 'Zeichnen',
  'display.draw.shape': 'Form',
  'display.draw.area': 'Fläche',
  'display.draw.line': 'Linie',
  'display.draw.pin': 'Punkt',
  'display.draw.primary': 'Standard',
  'display.draw.amber': 'Bernstein',
  'display.draw.green': 'Grün',
  'display.draw.red': 'Rot',
  'display.draw.clear': 'Löschen',
  'display.celestial': 'Himmelsring',
  'display.cleanUi': 'Ohne Bedienung',
  'display.bloom': 'Leuchten',
  'display.sharpen': 'Schärfen',
  'display.exitCleanView': 'BEDIENUNG EINBLENDEN',

  'dock.presets': 'DARSTELLUNG',
  'dock.presets.pin': 'Darstellung anheften',
  'dock.presets.keepOpen': 'Darstellung geöffnet lassen',
  'dock.location': 'STANDORT',
  'dock.location.pin': 'Standortleiste anheften',
  'dock.location.keepOpen': 'Standortleiste geöffnet lassen',
  'dock.search': 'Beliebigen Ort suchen',
  'dock.search.placeholder': 'Ort suchen …',
  'dock.search.label': 'Ort nach Name oder Koordinaten suchen',
  'dock.mapSource': 'KARTENQUELLE',
  'dock.style': 'Stil',
  'dock.style.snow': 'Schnee',
  'dock.style.normal.title': 'Den Globus ohne Filter zeigen.',
  'dock.style.crt.title':
    'Einen grünen Röhrenmonitor mit Zeilen und Wölbung nachbilden.',
  'dock.style.nvg.title':
    'Ein Nachtsichtgerät mit grüner Verstärkung und Röhren-Vignette nachbilden.',
  'dock.style.flir.title':
    'Wärmebild-Kontrast wie FLIR nachbilden. Ironbow erhöhen für Farbe.',
  'dock.style.anime.title':
    'Kräftige Cel-Shading-Farben und Konturen anwenden.',
  'dock.style.noir.title':
    'Kontrastreiche Schwarzweiß-Filmnoir-Optik anwenden.',
  'dock.style.snow.title': 'Der Szene einen kalten, verschneiten Look geben.',
  'scene.activeStyle': 'AKTIVER STIL',
  'scene.clearLayers': 'Alle gewählten Datenebenen ausschalten',
  'scene.clearLayers.label': 'Gewählte Datenebenen ausschalten',
  'scene.share': 'Freigabelink kopieren',
  'scene.tilt': 'Zwischen Draufsicht und geneigter Ansicht wechseln',
  'scene.tilt.label': 'Karte neigen',
  'scene.north': 'Karte nach Norden ausrichten',
  'scene.north.label': 'Karte nach Norden ausrichten',
  'scene.globe': 'Kamera zurücksetzen und den ganzen Globus zeigen',
  'scene.globe.label': 'Ganzen Globus zeigen',

  'voice.kicker': 'KI-AGENT',
  'voice.button': 'AN/AUS',
  'voice.button.label':
    'Sprachsteuerung – aktivieren zum Ein- und Ausschalten; Leertaste halten zum Sprechen',
  'voice.tier.title': 'Sprachmodell-Stufe – gilt ab der nächsten Sitzung',
  'voice.cost.title': 'Geschätzte Kosten der Sitzung',
  'voice.standby': 'BEREIT',
  'voice.active': 'AKTIV',
  'voice.unavailable': 'SPRACHE NICHT VERFÜGBAR',
  'voice.holdToTalk': 'Leertaste halten zum Sprechen',
  'voice.releaseToSend': 'Leertaste loslassen zum Senden',
  'voice.help.kicker': 'SPRACHSTEUERUNG',
  'voice.help.detail':
    'Leertaste halten zum Sprechen · kurz tippen aktiviert das gewählte Element',
  'voice.error.title': 'FEHLER DER SPRACHSTEUERUNG',
  'voice.error.dismiss': 'SCHLIESSEN',
  'voice.error.hint':
    'Prüfe die Mikrofonfreigabe und die Netzwerkverbindung und versuche es erneut.',

  // Data layers panel (src/ui/layerPanel.js). English stays with the layer
  // catalog and the panel's state tables; see OWNED_PREFIXES.
  'layers.group.movement': 'Bewegung',
  'layers.group.cameras': 'Kameras',
  'layers.group.infrastructure': 'Infrastruktur',
  'layers.group.events': 'Ereignisse',
  'layers.group.weather': 'Wetter',
  'layers.group.utilities': 'Werkzeuge',
  'layers.group.other layers': 'Weitere Ebenen',
  'layers.state.nominal': 'AN',
  'layers.state.off': 'AUS',
  'layers.state.loading': 'LÄDT',
  'layers.state.degraded': 'GESTÖRT',
  'layers.state.stale': 'VERALTET',
  'layers.state.partial': 'TEILWEISE',
  'layers.state.fallback': 'ERSATZ',
  'layers.state.unavailable': 'AUSGEFALLEN',
  'layers.state.uncertain': 'UNKLAR',
  'layers.state.enabling': 'STARTET',
  'layers.state.disabling': 'STOPPT',
  'layers.time.never': 'nie',
  'layers.time.now': 'gerade eben',
  'layers.time.seconds': 'vor {count} s',
  'layers.time.minutes': 'vor {count} min',
  'layers.time.hours': 'vor {count} h',
  'layers.loading': 'lädt …',
  'layers.name.satellites': 'Satelliten',
  'layers.name.flights': 'Live-Flüge',
  'layers.name.military': 'Militärflüge',
  'layers.name.local-adsb': 'ADS‑B lokal',
  'layers.name.ais-live-vessels': 'Live-Schiffe',
  'layers.name.traffic': 'Straßenverkehr',
  'layers.name.transit': 'Nahverkehr',
  'layers.name.bikeshare': 'Leihräder',
  'layers.name.cctv': 'Kameras',
  'layers.name.recent-imagery': 'Aktuelle Satellitenbilder',
  'layers.name.alpr-cameras': 'Kennzeichen-Kameras',
  'layers.name.military-installations': 'Militäranlagen',
  'layers.name.local-datacenters': 'Rechenzentren',
  'layers.name.telegeography-submarine-cables': 'Seekabel',
  'layers.name.local-dams': 'Staudämme',
  'layers.name.rocket-launches': 'Raumfahrt (30 Tage)',
  'layers.name.earthquakes': 'Erdbeben (24 h)',
  'layers.name.local-firms': 'Aktive Brände',
  'layers.name.fire-perimeters': 'Brandflächen',
  'layers.name.wind': 'Wind',
  'layers.name.weather-radar': 'Regenradar',
  'layers.name.weather-satellite': 'Wolken (Satellit)',
  'layers.name.weather-lightning': 'Blitzdichte',
  'layers.name.weather-cyclones': 'Wirbelsturm-Warnungen',
  'layers.name.directions': 'Routen',
  'layers.name.radio': 'Radio',

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

/**
 * Key prefixes whose English is owned by the module that renders them and is
 * passed as `params.default`; other locales may define these keys alone.
 */
export const OWNED_PREFIXES = Object.freeze(['layers.']);

/** Catalogs by locale, in the order the language picker lists them. */
export const CATALOGS = Object.freeze({ en: EN, de: DE });

/** Each locale's name in its own language, for the language picker. */
export const LOCALE_NAMES = Object.freeze({ en: 'English', de: 'Deutsch' });
