import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestVesselReport,
  ingestVesselStatic,
  normalizeVesselQuery,
  searchAisVessels,
  vesselMatchRank,
} from '../../server/providers/vessels/ais-store.js';
import { suggestionDetail } from '../ui/vesselSearch.js';

const add = (mmsi, name, extra = {}) => {
  ingestVesselStatic({ mmsi, name, ...extra });
  ingestVesselReport({
    mmsi,
    lat: 54.5,
    lon: 10.8,
    epochMs: Date.now(),
    source: 'test',
  });
};

test('queries fold accents, case and punctuation', () => {
  assert.equal(normalizeVesselQuery('  Vånö-Express '), 'VANO EXPRESS');
  assert.equal(vesselMatchRank({ name: 'JSP SAMSOE' }, 'JSP SAMSOE'), 0);
  assert.equal(vesselMatchRank({ name: 'JSP SAMSOE' }, 'JSP'), 1);
  assert.equal(vesselMatchRank({ name: 'JSP SAMSOE' }, 'SAMS'), 2);
  assert.equal(vesselMatchRank({ name: 'JSP SAMSOE' }, 'AMSO'), 3);
  assert.equal(vesselMatchRank({ name: 'X', mmsi: '255809000' }, '2558'), 4);
  assert.equal(vesselMatchRank({ name: 'JSP SAMSOE' }, 'MAERSK'), null);
});

test('search ranks exact and prefix matches first and needs two characters', () => {
  add('255800001', 'NORDIC STAR');
  add('255800002', 'STAR OF NORDIC');
  add('255800003', 'NORDIC', { imo: '9319442', type: '70' });
  const names = searchAisVessels('nordic').map((row) => row.name);
  assert.deepEqual(names.slice(0, 3), [
    'NORDIC',
    'NORDIC STAR',
    'STAR OF NORDIC',
  ]);
  assert.deepEqual(searchAisVessels('n'), []);
  const [best] = searchAisVessels('NORDIC', 1);
  assert.equal(best.imo, '9319442');
  assert.equal(best.lat, 54.5);
  assert.ok(!('_updatedAt' in best), 'internal bookkeeping stays inside');
});

test('a suggestion reads type, MMSI and destination', () => {
  const translate = (key) =>
    key === 'vesselType.cargo' ? 'Frachtschiff' : key;
  assert.equal(
    suggestionDetail(
      { type: '70', mmsi: '255809000', destination: 'KIEL' },
      translate,
    ),
    'Frachtschiff · MMSI 255809000 · → KIEL',
  );
  assert.equal(suggestionDetail({ mmsi: '1' }, translate), 'MMSI 1');
});
