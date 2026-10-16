import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIGITRAFFIC_USER,
  createDigitrafficPoller,
  digitrafficReport,
  digitrafficStatic,
} from '../../server/providers/vessels/digitraffic.js';
import {
  aisStreamRows,
  ingestVesselReport,
  ingestVesselStatic,
} from '../../server/providers/vessels/ais-store.js';

const FEATURE = {
  mmsi: 230093590,
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [26.253673, 60.40699] },
  properties: {
    mmsi: 230093590,
    sog: 0,
    cog: 245.4,
    heading: 247,
    timestampExternal: 1792173402000,
  },
};

test('Digitraffic features become vessel reports, malformed ones are dropped', () => {
  assert.deepEqual(digitrafficReport(FEATURE), {
    mmsi: '230093590',
    lat: 60.40699,
    lon: 26.253673,
    epochMs: 1792173402000,
    speed: 0,
    course: 245.4,
    heading: 247,
    source: 'Digitraffic',
  });
  assert.equal(
    digitrafficReport({ ...FEATURE, geometry: { coordinates: [] } }),
    null,
  );
  assert.equal(
    digitrafficReport({ ...FEATURE, properties: { mmsi: 'x' } }),
    null,
  );
  assert.deepEqual(
    digitrafficStatic({
      mmsi: 230093590,
      name: 'EIJA ',
      shipType: 90,
      imo: 9147605,
      destination: 'FILOV',
    }),
    {
      mmsi: '230093590',
      name: 'EIJA',
      type: '90',
      imo: 9147605,
      destination: 'FILOV',
    },
  );
  assert.equal(digitrafficStatic({ mmsi: 230093590, imo: 0 }).imo, '');
});

test('the newest fix wins across sources and static data fills gaps', () => {
  const mmsi = '230000001';
  const base = { mmsi, lat: 60, lon: 25, source: 'Digitraffic' };
  assert.equal(ingestVesselReport({ ...base, epochMs: 2_000_000 }), true);
  assert.equal(
    ingestVesselReport({ ...base, lat: 61, epochMs: 1_000_000 }),
    false,
    'an older report never replaces a newer position',
  );
  ingestVesselStatic({ mmsi, name: 'TEST SHIP', imo: 9147605, type: '70' });
  const row = aisStreamRows(50000).find((candidate) => candidate.mmsi === mmsi);
  assert.equal(row.lat, 60);
  assert.equal(row.name, 'TEST SHIP');
  assert.equal(row.imo, '9147605');
  assert.equal(row.source, 'Digitraffic');
  assert.equal(ingestVesselReport({ ...base, mmsi: '12', epochMs: 1 }), false);
});

test('the poller identifies itself and asks incrementally', async () => {
  const urls = [];
  let clock = 10_000_000;
  const poller = createDigitrafficPoller({
    now: () => clock,
    ingestReport: () => true,
    ingestStatic: () => true,
    fetchImpl: async (url, options) => {
      urls.push(url);
      assert.equal(options.headers['Digitraffic-User'], DIGITRAFFIC_USER);
      return {
        ok: true,
        text: async () =>
          JSON.stringify(
            url.includes('/vessels') ? [] : { features: [FEATURE] },
          ),
      };
    },
  });
  await poller.poll();
  assert.equal(urls.length, 2, 'static data and positions on the first poll');
  assert.match(urls[1], /locations\?from=8200000$/);
  assert.equal(poller.snapshot().status, 'live');
  clock += 60_000;
  await poller.poll();
  assert.equal(urls.length, 3, 'static data is not fetched again yet');
  assert.match(urls[2], /locations\?from=9940000$/);
});

test('a failing poll reports the feed down without throwing', async () => {
  const poller = createDigitrafficPoller({
    ingestReport: () => true,
    ingestStatic: () => true,
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }),
  });
  await poller.poll();
  assert.equal(poller.snapshot().status, 'down');
  assert.match(poller.snapshot().error, /503/);
});
