import test from 'node:test';
import assert from 'node:assert/strict';
import { describeContact } from './contactDetails.js';

test('an aircraft shows its type, identifiers, route and photo key', () => {
  const described = describeContact(
    { kind: 'aircraft', id: '3c6444', label: 'DLH4CX' },
    {
      label: 'DLH4CX',
      properties: {
        icao24: '3c6444',
        callsign: 'DLH4CX',
        registration: 'D-AIBD',
        type: 'Airbus A319',
        operator: 'Lufthansa',
        route: 'FRA → MUC',
      },
    },
  );
  assert.equal(described.title, 'DLH4CX');
  assert.deepEqual(described.lines, [
    'Airbus A319',
    'Reg. D-AIBD · Callsign DLH4CX',
    'Lufthansa',
    'Route FRA → MUC',
    'ICAO 3C6444',
  ]);
  assert.equal(described.photoHex, '3c6444');
  assert.deepEqual(
    described.links.map((link) => link.id),
    ['flightradar24', 'adsbexchange', 'planespotters'],
  );
});

test('an aircraft without context still links by hex', () => {
  const described = describeContact(
    { kind: 'aircraft', id: '3c6444', label: '' },
    null,
  );
  assert.equal(described.title, '3c6444');
  assert.equal(described.photoHex, '3c6444');
  assert.deepEqual(
    described.links.map((link) => link.id),
    ['adsbexchange', 'planespotters'],
  );
});

test('a vessel shows its identifiers and links but never asks for a photo', () => {
  const described = describeContact(
    { kind: 'vessel', id: 'ais-211331640' },
    {
      label: 'NORDIC STAR',
      properties: {
        mmsi: '211331640',
        imo: '9811000',
        type: 'Cargo',
        destination: 'HAMBURG',
      },
    },
  );
  assert.equal(described.title, 'NORDIC STAR');
  assert.deepEqual(described.lines, [
    'Cargo',
    'MMSI 211331640 · IMO 9811000',
    'Destination HAMBURG',
  ]);
  assert.equal(described.photoHex, null);
  assert.deepEqual(
    described.links.map((link) => link.id),
    ['marinetraffic', 'vesselfinder', 'myshiptracking'],
  );
});

test('owner data is never shown even when a record carries it', () => {
  const described = describeContact(
    { kind: 'aircraft', id: '3c6444' },
    { properties: { icao24: '3c6444', registered_owner: 'Someone' } },
  );
  assert.ok(!described.lines.join(' ').includes('Someone'));
});
