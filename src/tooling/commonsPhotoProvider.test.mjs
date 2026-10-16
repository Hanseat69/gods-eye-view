import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import {
  COMMONS_PHOTO_ROUTE,
  COMMONS_USER_AGENT,
  chooseAircraftCategory,
  chooseVesselCategory,
  commonsPhotoProxy,
  matchesType,
  normalizeImo,
  normalizeRegistration,
  parseCommonsPhoto,
  plainText,
  typeTokens,
} from '../../server/providers/commons/photos.js';

const FILE = {
  title: 'File:Finnstar Helsinki 02.jpg',
  imageinfo: [
    {
      mime: 'image/jpeg',
      thumburl:
        'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Finnstar.jpg/480px-Finnstar.jpg',
      thumbwidth: 480,
      thumbheight: 320,
      descriptionurl:
        'https://commons.wikimedia.org/wiki/File:Finnstar_Helsinki_02.jpg',
      extmetadata: {
        Artist: {
          value: '<a href="//commons.wikimedia.org/wiki/User:X">Eduard47</a>',
        },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
        NonFree: { value: 'false' },
      },
    },
  ],
};

test('identifiers are validated before any lookup', () => {
  assert.equal(normalizeImo('IMO 9319442'), '9319442');
  assert.equal(normalizeImo('931944'), null);
  assert.equal(normalizeImo('9319443'), null, 'wrong check digit');
  assert.equal(normalizeImo('../x'), null);
  assert.equal(normalizeRegistration(' d-aibd '), 'D-AIBD');
  assert.equal(normalizeRegistration('N7387N'), 'N7387N');
  assert.equal(normalizeRegistration('D-AIBD/../x'), null);
});

test('aircraft types match by model, never by series or registration digits', () => {
  assert.deepEqual(typeTokens('Airbus A319-112'), ['a319', '319']);
  assert.deepEqual(typeTokens('C172'), ['c172', '172']);
  assert.deepEqual(typeTokens(''), []);
  const a319 = typeTokens('A319');
  assert.ok(matchesType('Category:D-AIBD (Airbus A319)', a319, 'D-AIBD'));
  assert.ok(!matchesType('Category:D-AIBD (Airbus A340-200)', a319, 'D-AIBD'));
  assert.ok(
    !matchesType(
      'Category:D-X (Airbus A321-112)',
      typeTokens('A319-112'),
      'D-X',
    ),
  );
  assert.ok(!matchesType('Category:N319AB (Boeing 737)', a319, 'N319AB'));
  assert.ok(
    matchesType('File:Cessna 172S D-EZTC.jpg', typeTokens('C172'), 'D-EZTC'),
  );
});

test('a reused registration only yields the current airframe', () => {
  const members = {
    subcats: [
      'Category:D-AIBD (Airbus A300)',
      'Category:D-AIBD (Airbus A319)',
      'Category:D-AIBD (Airbus A340-200)',
    ],
    files: ['File:D-AIBD AIRCRAFT Airbus A319-112 (A).jpg'],
  };
  const regCategory = 'Category:D-AIBD (aircraft)';
  assert.deepEqual(
    chooseAircraftCategory(members, typeTokens('A319'), regCategory, 'D-AIBD'),
    { category: 'Category:D-AIBD (Airbus A319)', requireFileMatch: false },
  );
  // No type subcategory matches: only direct files naming the type may show.
  assert.deepEqual(
    chooseAircraftCategory(
      members,
      typeTokens('Boeing 737'),
      regCategory,
      'D-AIBD',
    ),
    { category: regCategory, requireFileMatch: true },
  );
  // Unknown type next to type subcategories: nothing is safe to show.
  assert.deepEqual(chooseAircraftCategory(members, [], regCategory, 'D-AIBD'), {
    category: null,
    requireFileMatch: false,
  });
});

test('a vessel photo prefers its current name and labels an earlier one', () => {
  const imoCategory = 'Category:IMO 9242637';
  const members = {
    subcats: [
      'Category:Bomar Valour (ship, 2002)',
      'Category:Maersk Valletta (ship, 2002)',
    ],
    files: [],
  };
  assert.deepEqual(chooseVesselCategory(members, 'MSC KAYLA', imoCategory), {
    category: 'Category:Bomar Valour (ship, 2002)',
    formerName: 'Bomar Valour',
  });
  assert.deepEqual(
    chooseVesselCategory(members, 'MAERSK VALLETTA', imoCategory),
    { category: 'Category:Maersk Valletta (ship, 2002)', formerName: null },
  );
  // AIS names carry no diacritics.
  assert.deepEqual(
    chooseVesselCategory(
      { subcats: ['Category:Vånö (ship, 1991)'], files: [] },
      'VANO',
      'Category:IMO 9002025',
    ),
    { category: 'Category:Vånö (ship, 1991)', formerName: null },
  );
});

test('only freely licensed Commons images on Wikimedia hosts are passed on', () => {
  const photo = parseCommonsPhoto({ query: { pages: [FILE] } });
  assert.equal(photo.author, 'Eduard47');
  assert.equal(photo.license, 'CC BY-SA 4.0');
  assert.equal(photo.link, FILE.imageinfo[0].descriptionurl);
  assert.match(photo.thumbnail, /^https:\/\/thumb\.wikimedia\.org\//);
  const variant = (change) => ({
    query: {
      pages: [
        {
          ...FILE,
          imageinfo: [{ ...FILE.imageinfo[0], ...change(FILE.imageinfo[0]) }],
        },
      ],
    },
  });
  for (const change of [
    () => ({ thumburl: 'https://evil.example/x.jpg' }),
    () => ({ descriptionurl: 'javascript:alert(1)' }),
    () => ({ mime: 'image/svg+xml' }),
    (info) => ({
      extmetadata: { ...info.extmetadata, NonFree: { value: 'true' } },
    }),
    (info) => ({
      extmetadata: { ...info.extmetadata, LicenseShortName: { value: '' } },
    }),
  ])
    assert.equal(parseCommonsPhoto(variant(change)), null);
  assert.equal(
    plainText('<b>A&amp;B</b>  <i>Photo</i>'),
    'A&B Photo',
    'HTML metadata becomes plain text',
  );
});

function serve(plugin) {
  let handler;
  plugin.configureServer({
    middlewares: {
      use(route, fn) {
        assert.equal(route, COMMONS_PHOTO_ROUTE);
        handler = fn;
      },
    },
  });
  return (url) =>
    new Promise((resolve) => {
      handler(
        { url, method: 'GET' },
        {
          writeHead(status) {
            this.status = status;
          },
          end(body) {
            resolve({ status: this.status, body: JSON.parse(body) });
          },
        },
      );
    });
}

test('the proxy identifies itself, caches answers and reports outages', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: new URL(url), options });
    const params = new URL(url).searchParams;
    const body =
      params.get('list') === 'categorymembers'
        ? {
            query: {
              categorymembers: [
                { ns: 14, title: 'Category:Finnstar (ship, 2006)' },
              ],
            },
          }
        : { query: { pages: [FILE] } };
    return { ok: true, text: async () => JSON.stringify(body) };
  };
  const request = serve(
    commonsPhotoProxy({
      fetchImpl,
      cachePath: path.join(
        mkdtempSync(path.join(os.tmpdir(), 'gev-commons-')),
        'cache.json',
      ),
    }),
  );
  const first = await request('/vessel/9319442?name=FINNSTAR');
  assert.equal(first.body.found, true);
  assert.equal(first.body.formerName, null);
  await request('/vessel/9319442?name=FINNSTAR');
  assert.equal(calls.length, 2, 'two API calls, then the cache answers');
  assert.equal(calls[0].options.headers['User-Agent'], COMMONS_USER_AGENT);
  assert.equal(
    calls[1].url.searchParams.get('gcmtitle'),
    'Category:Finnstar (ship, 2006)',
  );
  assert.equal((await request('/vessel/12')).status, 400);
  assert.equal((await request('/aircraft/..%2Fx')).status, 400);

  const offline = serve(
    commonsPhotoProxy({
      fetchImpl: async () => ({ ok: false, status: 429, text: async () => '' }),
      cachePath: path.join(
        mkdtempSync(path.join(os.tmpdir(), 'gev-commons-')),
        'cache.json',
      ),
    }),
  );
  assert.deepEqual((await offline('/vessel/9319442?name=X')).body, {
    found: false,
    unavailable: true,
  });
});
