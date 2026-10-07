import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import {
  AIRCRAFT_PHOTO_ROUTE,
  PLANESPOTTERS_USER_AGENT,
  aircraftPhotoProxy,
  normalizeAircraftHex,
  parsePlanespottersPhoto,
} from '../../server/providers/aircraft/photos.js';

const PHOTO = {
  id: '1981050',
  thumbnail: {
    src: 'https://t.plnspttrs.net/09561/1981050_t.jpg',
    size: { width: 200, height: 133 },
  },
  thumbnail_large: {
    src: 'https://t.plnspttrs.net/09561/1981050_280.jpg',
    size: { width: 422, height: 280 },
  },
  link: 'https://www.planespotters.net/photo/1981050/d-aibd?utm_source=api',
  photographer: 'Steffen Müller',
};

test('the first usable Planespotters photo is kept with its credit', () => {
  assert.deepEqual(parsePlanespottersPhoto({ photos: [PHOTO] }), {
    thumbnail: 'https://t.plnspttrs.net/09561/1981050_280.jpg',
    width: 422,
    height: 280,
    link: 'https://www.planespotters.net/photo/1981050/d-aibd?utm_source=api',
    photographer: 'Steffen Müller',
  });
  assert.equal(parsePlanespottersPhoto({ photos: [] }), null);
  assert.equal(parsePlanespottersPhoto(null), null);
});

test('photos pointing anywhere but Planespotters are dropped', () => {
  const foreign = [
    { ...PHOTO, thumbnail_large: { src: 'https://evil.example/x.jpg' } },
    { ...PHOTO, link: 'javascript:alert(1)' },
    { ...PHOTO, thumbnail_large: { src: 'http://t.plnspttrs.net/x.jpg' } },
    { ...PHOTO, link: 'https://planespotters.net.evil.example/x' },
  ];
  for (const photo of foreign)
    assert.equal(parsePlanespottersPhoto({ photos: [photo] }), null);
});

test('only ICAO 24-bit hex identifiers are accepted', () => {
  assert.equal(normalizeAircraftHex(' 3C6444 '), '3c6444');
  for (const bad of ['', '3c644', '3c64444', '../etc', 'zzzzzz'])
    assert.equal(normalizeAircraftHex(bad), null);
});

function serve(plugin) {
  let handler;
  plugin.configureServer({
    middlewares: {
      use(route, fn) {
        assert.equal(route, AIRCRAFT_PHOTO_ROUTE);
        handler = fn;
      },
    },
  });
  return (url, method = 'GET') =>
    new Promise((resolve) => {
      const res = {
        writeHead(status) {
          this.status = status;
        },
        end(body) {
          resolve({ status: this.status, body: JSON.parse(body) });
        },
      };
      handler({ url, method }, res);
    });
}

test('the proxy identifies itself, caches results and rejects bad input', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () =>
        JSON.stringify(url.endsWith('3c6444') ? { photos: [PHOTO] } : {}),
    };
  };
  const request = serve(
    aircraftPhotoProxy({
      fetchImpl,
      cachePath: path.join(
        mkdtempSync(path.join(os.tmpdir(), 'gev-photo-')),
        'cache.json',
      ),
    }),
  );
  const first = await request('/3C6444');
  assert.equal(first.status, 200);
  assert.equal(first.body.found, true);
  assert.equal(first.body.photographer, 'Steffen Müller');
  const again = await request('/3c6444');
  assert.deepEqual(again.body, first.body);
  assert.equal(calls.length, 1, 'a cached hex is not fetched again');
  assert.equal(
    calls[0].url,
    'https://api.planespotters.net/pub/photos/hex/3c6444',
  );
  assert.equal(
    calls[0].options.headers['User-Agent'],
    PLANESPOTTERS_USER_AGENT,
  );
  assert.match(PLANESPOTTERS_USER_AGENT, /\+https:\/\//);
  assert.equal(calls[0].options.redirect, 'error');

  assert.deepEqual((await request('/abcdef')).body, { found: false });
  assert.equal((await request('/not-a-hex')).status, 400);
  assert.equal((await request('/3c6444', 'POST')).status, 405);
});

test('upstream failures answer "no photo" without throwing', async () => {
  const request = serve(
    aircraftPhotoProxy({
      fetchImpl: async () => {
        throw new Error('offline');
      },
      cachePath: path.join(
        mkdtempSync(path.join(os.tmpdir(), 'gev-photo-')),
        'cache.json',
      ),
    }),
  );
  assert.deepEqual((await request('/3c6444')).body, {
    found: false,
    unavailable: true,
  });
});

test('answers are reused for 24 hours at most', async () => {
  let clock = 1_000_000;
  let calls = 0;
  const request = serve(
    aircraftPhotoProxy({
      now: () => clock,
      fetchImpl: async () => {
        calls += 1;
        return { ok: true, text: async () => JSON.stringify({ photos: [] }) };
      },
      cachePath: path.join(
        mkdtempSync(path.join(os.tmpdir(), 'gev-photo-')),
        'cache.json',
      ),
    }),
  );
  await request('/3c6444');
  clock += 24 * 3600_000 - 1;
  await request('/3c6444');
  assert.equal(calls, 1, 'still fresh just under 24 hours');
  clock += 2;
  await request('/3c6444');
  assert.equal(calls, 2, 'asked again after 24 hours');
});

test('Planespotters URLs are passed on unchanged', () => {
  const link =
    'https://www.planespotters.net/photo/1981050/d-aibd-lufthansa-airbus-a319-112?utm_source=api';
  const src = 'https://t.plnspttrs.net/09561/1981050_77e29380db_280.jpg';
  const parsed = parsePlanespottersPhoto({
    photos: [{ ...PHOTO, link, thumbnail_large: { src } }],
  });
  assert.equal(parsed.link, link);
  assert.equal(parsed.thumbnail, src);
});
