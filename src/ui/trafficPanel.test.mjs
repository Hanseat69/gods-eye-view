import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeMode,
  distanceKm,
  nearestContacts,
  nextLayerState,
} from './trafficPanel.js';

test('the switch shows which layers are on', () => {
  assert.equal(activeMode(true, false), 'aircraft');
  assert.equal(activeMode(false, true), 'vessels');
  assert.equal(activeMode(true, true), 'both');
  assert.equal(activeMode(false, false), null);
});

test('a press selects its layers; pressing the active button hides them', () => {
  assert.deepEqual(nextLayerState('aircraft', null), {
    flights: true,
    vessels: false,
  });
  assert.deepEqual(nextLayerState('vessels', 'aircraft'), {
    flights: false,
    vessels: true,
  });
  assert.deepEqual(nextLayerState('both', 'vessels'), {
    flights: true,
    vessels: true,
  });
  assert.deepEqual(nextLayerState('both', 'both'), {
    flights: false,
    vessels: false,
  });
});

test('the nearby list is sorted by distance and capped', () => {
  assert.ok(
    Math.abs(distanceKm(53.55, 9.99, 52.52, 13.405) - 255) < 3,
    'Hamburg–Berlin',
  );
  const rows = (prefix, lats) =>
    lats.map((lat, i) => ({
      id: `${prefix}${i}`,
      label: `${prefix}${i}`,
      latitude: lat,
      longitude: 10,
    }));
  const items = nearestContacts(
    [
      { kind: 'aircraft', layerId: 'flights', rows: rows('a', [54, 50, 53.6]) },
      {
        kind: 'vessel',
        layerId: 'ais-live-vessels',
        rows: [...rows('v', [53.56]), { id: 'bad' }],
      },
    ],
    { latitude: 53.55, longitude: 10 },
    3,
  );
  assert.deepEqual(
    items.map((item) => item.id),
    ['v0', 'a2', 'a0'],
  );
  assert.equal(items[0].kind, 'vessel');
});
