import { aircraftLinks, vesselLinks } from '../data/contactLinks.js';
import { aisShipTypeKey } from '../data/aisShipTypes.js';

/**
 * Pure part of the object details dialog: gather everything the app knows
 * about one picked object from the sources it already keeps, and format it.
 *
 * Sources, first non-empty value wins:
 * 1. the owning layer's analyst record (`getAnalystRecords`), the plain-JSON
 *    view voice queries use, with raw numbers;
 * 2. the owning layer's position row (`getAllPositions`);
 * 3. the picked object itself when a layer attaches a plain record to its
 *    primitive (live vessels do);
 * 4. the shared context record (`src/data/contextStore.js`) — every layer
 *    that registers entity context. Its values are often pre-formatted
 *    English text ("34,000 ft"), so they only fill gaps.
 */

const AIRCRAFT_LAYERS = new Set(['flights', 'military']);
const VESSEL_LAYER = 'ais-live-vessels';

/** Fields shown first, in this order; everything else follows by name. */
export const FIELD_ORDER = Object.freeze([
  'name',
  'callsign',
  'registration',
  'typeName',
  'typeCode',
  'shipType',
  'aircraftClass',
  'operator',
  'icao24',
  'mmsi',
  'imo',
  'routeOrigin',
  'routeDestination',
  'destination',
  'altitudeM',
  'speedMps',
  'speedKts',
  'heading',
  'courseDeg',
  'verticalRateMps',
  'onGround',
  'military',
  'originCountry',
  'status',
  'latitude',
  'longitude',
  'lastReport',
  'source',
]);

/** Same value under another name in some layer. */
const ALIASES = Object.freeze({
  lat: 'latitude',
  lon: 'longitude',
  rawLat: 'latitude',
  rawLon: 'longitude',
  airline: 'operator',
  type: 'typeName',
  origin: 'routeOrigin',
  last_position_UTC: 'lastReport',
  lastPositionUTC: 'lastReport',
  speedKt: 'speedKts',
  course: 'courseDeg',
  true_track: 'heading',
  track: 'heading',
  velocityMps: 'speedMps',
  altitude: 'altitudeM',
});

/** Never shown: internal, structural or duplicated by the title. */
const SKIP = new Set([
  'id',
  'label',
  'position',
  'entity',
  'layerId',
  'layerName',
  'last_position_epoch',
  'lastPositionEpoch',
  'updatedAt',
  'navStatus',
  // Bookkeeping of the vessel layer, not facts about the vessel.
  'missedRefreshes',
  'receivedAtMs',
  'reference',
]);

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

function displayable(value) {
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'boolean';
}

/**
 * Match a layer row to the picked id by any identity field.
 * @param {object} row
 * @param {string} pickedId
 */
export function rowMatches(row, pickedId) {
  if (!row || !pickedId) return false;
  const wanted = String(pickedId).toLowerCase();
  return ['id', 'icao24', 'mmsi', 'noradId', 'norad', 'satnum', 'key'].some(
    (key) =>
      row[key] !== undefined &&
      row[key] !== null &&
      String(row[key]).toLowerCase() === wanted,
  );
}

/**
 * Merge flat records into one field map.
 * @param {Array<object|null|undefined>} sources In priority order.
 * @param {string} layerId Vessel rows name their speed `speed` (knots).
 * @returns {Map<string, string|number|boolean>}
 */
export function mergeFields(sources, layerId = '') {
  const fields = new Map();
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const [rawKey, value] of Object.entries(source)) {
      if (rawKey.startsWith('_') || SKIP.has(rawKey)) continue;
      let key = ALIASES[rawKey] || rawKey;
      if (rawKey === 'speed')
        key = layerId === VESSEL_LAYER ? 'speedKts' : 'speedText';
      if (layerId === VESSEL_LAYER && rawKey === 'type') key = 'shipType';
      if (!displayable(value) || fields.has(key)) continue;
      fields.set(key, typeof value === 'string' ? value.trim() : value);
    }
  }
  return fields;
}

/**
 * Collect the details of one picked object.
 * @param {object} input
 * @param {string} input.pickedId Canonical pick id (`resolvePickId`).
 * @param {object|null} [input.picked] Raw `scene.pick()` result.
 * @param {string|null} [input.layerId] Owning layer, when known.
 * @param {string} [input.layerName] Display name of that layer.
 * @param {object|null} [input.layer] Owning layer module.
 * @param {object|null} [input.context] Shared context record.
 * @returns {{layerId: string|null, layerName: string, kind: string,
 *   title: string, fields: Map<string, *>, photo: object|null,
 *   links: Array<object>}}
 */
export function gatherObjectDetails({
  pickedId,
  picked = null,
  layerId = null,
  layerName = '',
  layer = null,
  context = null,
}) {
  const safeCall = (fn) => {
    try {
      return fn() || [];
    } catch {
      return [];
    }
  };
  const analyst =
    typeof layer?.getAnalystRecords === 'function'
      ? safeCall(() => layer.getAnalystRecords(5000)).find((row) =>
          rowMatches(row, pickedId),
        )
      : null;
  const position =
    typeof layer?.getAllPositions === 'function'
      ? safeCall(() => layer.getAllPositions(5000)).find((row) =>
          rowMatches(row, pickedId),
        )
      : null;
  const rawObject = isPlainObject(picked?.id) ? picked.id : null;
  const resolvedLayer = layerId || context?.layerId || null;
  const fields = mergeFields(
    [analyst, position, rawObject, context?.properties],
    resolvedLayer || '',
  );
  // A formatted speed only helps when no measured one is known.
  if (fields.has('speedMps') || fields.has('speedKts'))
    fields.delete('speedText');
  const kind = AIRCRAFT_LAYERS.has(resolvedLayer)
    ? 'aircraft'
    : resolvedLayer === VESSEL_LAYER
      ? 'vessel'
      : 'other';
  const text = (key) => {
    const value = fields.get(key);
    return value === undefined ? '' : String(value).trim();
  };
  const title =
    String(
      context?.label ||
        position?.label ||
        text('name') ||
        text('callsign') ||
        text('registration') ||
        pickedId ||
        '',
    ).trim() || '—';

  let photo = null;
  let links = [];
  if (kind === 'aircraft') {
    const hex = (text('icao24') || String(pickedId)).toLowerCase();
    if (/^[0-9a-f]{6}$/.test(hex) && !fields.has('icao24'))
      fields.set('icao24', hex);
    photo = /^[0-9a-f]{6}$/.test(hex)
      ? {
          kind: 'aircraft',
          hex,
          registration: text('registration'),
          type: text('typeName') || text('typeCode'),
        }
      : null;
    links = aircraftLinks({
      hex,
      callsign: text('callsign'),
      registration: text('registration'),
    });
  } else if (kind === 'vessel') {
    const mmsi = text('mmsi') || String(pickedId);
    const imo = text('imo').replace(/^IMO\s*/i, '');
    photo = {
      kind: 'vessel',
      imo: /^\d{7}$/.test(imo) ? imo : null,
      name: title,
    };
    links = vesselLinks({ mmsi, imo });
  }
  return {
    layerId: resolvedLayer,
    layerName,
    kind,
    title,
    fields,
    photo,
    links,
  };
}

/** "routeDestination" → "Route destination". */
export function humanizeKey(key) {
  const words = String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const compass = (value, positive, negative, locale) =>
  `${Math.abs(value).toLocaleString(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })}° ${value >= 0 ? positive : negative}`;

/**
 * Format one field for display.
 * @param {string} key
 * @param {*} value
 * @param {object} options
 * @param {(key: string, params?: object) => string} options.t
 * @param {string} [options.locale]
 * @returns {string}
 */
export function formatDetail(key, value, { t, locale = 'en' }) {
  const number = (n, digits = 0) =>
    Number(n).toLocaleString(locale, {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
  if (typeof value === 'boolean')
    return t(value ? 'details.yes' : 'details.no');
  const numeric = typeof value === 'number' ? value : Number(value);
  const isNumber =
    typeof value === 'number' ||
    (typeof value === 'string' &&
      value.trim() !== '' &&
      Number.isFinite(numeric));
  switch (key) {
    case 'latitude':
      return isNumber ? compass(numeric, 'N', 'S', locale) : String(value);
    case 'longitude':
      return isNumber ? compass(numeric, 'E', 'W', locale) : String(value);
    case 'altitudeM':
      return isNumber
        ? `${number(numeric)} m · ${number(numeric * 3.28084)} ft`
        : String(value);
    case 'speedMps':
      return isNumber
        ? `${number(numeric * 1.94384)} kn · ${number(numeric * 3.6)} km/h`
        : String(value);
    case 'speedKts':
      return isNumber
        ? `${number(numeric, 1)} kn · ${number(numeric * 1.852)} km/h`
        : String(value);
    case 'heading':
    case 'courseDeg':
      return isNumber ? `${number(numeric)}°` : String(value);
    case 'verticalRateMps':
      return isNumber
        ? `${number(numeric, 1)} m/s · ${number(numeric * 196.85)} ft/min`
        : String(value);
    case 'shipType': {
      const typeKey = aisShipTypeKey(value);
      return typeKey ? `${t(typeKey)} (${value})` : String(value);
    }
    case 'lastReport': {
      const when = Date.parse(String(value));
      return Number.isFinite(when)
        ? new Date(when).toLocaleString(locale)
        : String(value);
    }
    default:
      return isNumber && typeof value === 'number'
        ? number(numeric, 4)
        : String(value);
  }
}

/**
 * Fields in display order: the known ones first, the rest by name.
 * @param {Map<string, *>} fields
 * @returns {Array<[string, *]>}
 */
export function orderedFields(fields) {
  const known = FIELD_ORDER.filter((key) => fields.has(key)).map((key) => [
    key,
    fields.get(key),
  ]);
  const rest = [...fields.entries()]
    .filter(([key]) => !FIELD_ORDER.includes(key))
    .sort(([a], [b]) => a.localeCompare(b));
  return [...known, ...rest];
}
