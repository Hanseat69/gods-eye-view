import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDetail,
  gatherObjectDetails,
  humanizeKey,
  mergeFields,
  orderedFields,
  rowMatches,
} from './objectDetails.js';
import { aisShipTypeKey, vesselTypeText } from '../data/aisShipTypes.js';
import {
  pickOwner,
  registerPickOwner,
  unregisterPickOwner,
} from '../data/pickRegistry.js';

const t = (key, params = {}) =>
  params.default ??
  `${key}${params.count !== undefined ? `:${params.count}` : ''}`;

test('AIS ship type codes read as classes, other values pass through', () => {
  assert.equal(aisShipTypeKey(70), 'vesselType.cargo');
  assert.equal(aisShipTypeKey('84'), 'vesselType.tanker');
  assert.equal(aisShipTypeKey(52), 'vesselType.tug');
  assert.equal(aisShipTypeKey(31), 'vesselType.towing');
  assert.equal(aisShipTypeKey(0), null, '0 means not available');
  assert.equal(aisShipTypeKey('Cargo'), null);
  assert.equal(vesselTypeText('Cargo', t), 'Cargo');
  assert.equal(
    vesselTypeText(60, (key) => key),
    'vesselType.passenger',
  );
});

test('a pick resolves to the layer that owns it', () => {
  registerPickOwner('test-layer', (id) => id === 'abc123');
  try {
    assert.equal(pickOwner('abc123'), 'test-layer');
    assert.equal(pickOwner('other'), null);
    assert.equal(pickOwner(null), null);
  } finally {
    unregisterPickOwner('test-layer');
  }
});

test('details merge every source, the first value winning', () => {
  const fields = mergeFields(
    [
      { name: 'DLH4CX', type: 'Airbus A319-112', _secret: 'x', entity: {} },
      { callsign: 'DLH4CX', lat: 50.1, lon: 8.6, altitudeM: 10668, id: 'x' },
      { latitude: 1, typeName: 'ignored', airline: 'Lufthansa' },
    ],
    'flights',
  );
  assert.equal(fields.get('typeName'), 'Airbus A319-112');
  assert.equal(fields.get('latitude'), 50.1, 'first source wins');
  assert.equal(fields.get('operator'), 'Lufthansa');
  assert.ok(
    !fields.has('_secret') && !fields.has('entity') && !fields.has('id'),
  );
  const vessel = mergeFields(
    [
      {
        speed: 12.3,
        type: '70',
        course: 90,
        lastPositionUTC: '2026-10-18T11:57:06.000Z',
        receivedAtMs: 1,
        reference: '1',
      },
    ],
    'ais-live-vessels',
  );
  assert.equal(vessel.get('lastReport'), '2026-10-18T11:57:06.000Z');
  assert.ok(!vessel.has('receivedAtMs') && !vessel.has('reference'));
  assert.equal(vessel.get('speedKts'), 12.3);
  assert.equal(vessel.get('shipType'), '70');
  assert.equal(vessel.get('courseDeg'), 90);
});

test('rows match the pick by any identity field, case-insensitively', () => {
  assert.ok(rowMatches({ icao24: '3C6444' }, '3c6444'));
  assert.ok(rowMatches({ mmsi: 211331640 }, '211331640'));
  assert.ok(rowMatches({ noradId: '25544' }, '25544'));
  assert.ok(!rowMatches({ name: '3c6444' }, '3c6444'));
});

test('an aircraft pick gathers layer rows, a photo request and links', () => {
  const layer = {
    getAnalystRecords: () => [
      { id: 'DLH4CX', icao24: '3c6444', callsign: 'DLH4CX', altitudeM: 10000 },
    ],
    getAllPositions: () => [
      {
        id: '3c6444',
        label: 'DLH4CX',
        latitude: 50,
        longitude: 8,
        registration: 'D-AIBD',
        typeName: 'A319 112',
      },
    ],
  };
  const details = gatherObjectDetails({
    pickedId: '3c6444',
    layerId: 'flights',
    layerName: 'Live-Flüge',
    layer,
  });
  assert.equal(details.kind, 'aircraft');
  assert.equal(details.title, 'DLH4CX');
  assert.deepEqual(details.photo, {
    kind: 'aircraft',
    hex: '3c6444',
    registration: 'D-AIBD',
    type: 'A319 112',
  });
  assert.deepEqual(
    details.links.map((link) => link.id),
    ['flightradar24', 'adsbexchange', 'planespotters'],
  );
  assert.equal(details.fields.get('altitudeM'), 10000);
});

test('measured numbers beat pre-formatted context text', () => {
  const details = gatherObjectDetails({
    pickedId: '3c6444',
    layerId: 'flights',
    layer: {
      getAnalystRecords: () => [
        { icao24: '3c6444', altitudeM: 10363, speedMps: 214, heading: 280 },
      ],
    },
    context: {
      properties: {
        altitude: '34,000 ft',
        speed: '416 kt',
        heading: '280°',
        operator: 'Delta Air Lines',
      },
    },
  });
  assert.equal(details.fields.get('altitudeM'), 10363);
  assert.equal(details.fields.get('heading'), 280);
  assert.equal(details.fields.get('operator'), 'Delta Air Lines');
  assert.ok(!details.fields.has('speedText'));
});

test('a vessel pick reads the record attached to its primitive', () => {
  const details = gatherObjectDetails({
    pickedId: '636092799',
    picked: {
      id: {
        mmsi: '636092799',
        name: 'MSC KAYLA',
        imo: '9242637',
        type: '71',
        speed: 14.2,
        lat: 54.3,
        lon: 10.1,
      },
    },
    layerId: 'ais-live-vessels',
    layer: {
      getAnalystRecords: () => {
        throw new Error('mid-teardown');
      },
    },
  });
  assert.equal(details.kind, 'vessel');
  assert.equal(details.title, 'MSC KAYLA');
  assert.deepEqual(details.photo, {
    kind: 'vessel',
    imo: '9242637',
    name: 'MSC KAYLA',
  });
  assert.equal(details.fields.get('speedKts'), 14.2);
});

test('any other object shows its context record', () => {
  const details = gatherObjectDetails({
    pickedId: 'quake-1',
    context: {
      label: 'M 5.1 near Tonga',
      layerId: 'earthquakes',
      properties: { magnitude: 5.1, depthKm: 10, place: 'Tonga' },
    },
  });
  assert.equal(details.kind, 'other');
  assert.equal(details.title, 'M 5.1 near Tonga');
  assert.equal(details.photo, null);
  assert.deepEqual(details.links, []);
  assert.equal(details.fields.get('magnitude'), 5.1);
});

test('values format with units, known fields first', () => {
  const opts = { t, locale: 'en' };
  assert.equal(formatDetail('latitude', -33.5, opts), '33.5000° S');
  assert.equal(
    formatDetail('longitude', 10.25, { t, locale: 'de' }),
    '10,2500° E',
  );
  assert.equal(formatDetail('altitudeM', 10000, opts), '10,000 m · 32,808 ft');
  assert.equal(formatDetail('speedMps', 100, opts), '194 kn · 360 km/h');
  assert.equal(formatDetail('speedKts', 10, opts), '10 kn · 19 km/h');
  assert.equal(
    formatDetail('shipType', '70', { t: (key) => key }),
    'vesselType.cargo (70)',
  );
  assert.equal(
    formatDetail('onGround', true, { t: (key) => key }),
    'details.yes',
  );
  assert.equal(humanizeKey('routeDestination'), 'Route destination');
  const order = orderedFields(
    new Map([
      ['zeta', 1],
      ['latitude', 2],
      ['name', 3],
      ['alpha', 4],
    ]),
  );
  assert.deepEqual(
    order.map(([key]) => key),
    ['name', 'latitude', 'alpha', 'zeta'],
  );
});
