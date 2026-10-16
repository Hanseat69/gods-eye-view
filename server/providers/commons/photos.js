import path from 'node:path';
import { promises as fsp } from 'node:fs';

/**
 * Wikimedia Commons photo lookup for the contact details card.
 *
 * - Vessels by IMO number: Commons files ships under `Category:IMO <imo>`,
 *   usually split into one subcategory per name the hull has carried
 *   (`Finnstar (ship, 2006)`). The subcategory matching the current AIS name
 *   wins; otherwise the photo is labelled with the earlier name it shows.
 * - Aircraft by registration, as a fallback when Planespotters has no photo:
 *   `Category:<REG> (aircraft)`, split by type when the registration has been
 *   reused (`D-AIBD (Airbus A319)`). A photo is only returned when its
 *   category or file name matches the aircraft's current type, so an earlier
 *   airframe with the same registration is never shown.
 *
 * Only freely licensed files are passed on, with author, licence and file
 * page, as the licences require. Image files are never fetched or stored
 * here: the browser loads the Commons thumbnail itself. Answers are cached for
 * seven days and persisted; Commons asks API clients for a descriptive
 * User-Agent and modest request rates, so upstream calls are limited.
 */

export const COMMONS_PHOTO_ROUTE = '/api/commons-photo';
export const COMMONS_USER_AGENT =
  'gods-eye-view/1.0 (+https://github.com/bilawalsidhu/gods-eye-view)';
const API = 'https://commons.wikimedia.org/w/api.php';
const TTL_MS = 7 * 24 * 3600_000;
const MAX_UPSTREAM_PER_MINUTE = 20;
const MAX_BODY_BYTES = 256 * 1024;
const THUMB_WIDTH = 480;
const UNAVAILABLE = Symbol('unavailable');
const IMAGE_HOST = /^(upload|thumb)\.wikimedia\.org$/;
const PAGE_HOST = /^commons\.wikimedia\.org$/;

/**
 * Lower-case letters and digits only, accents folded: AIS names carry no
 * diacritics, so "VANO" must meet Commons' "Vånö".
 */
const squash = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Plain text from Commons' HTML metadata values. */
export function plainText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function safeUrl(value, hostPattern) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hostPattern.test(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/**
 * Whether a 7-digit IMO ship number carries a valid check digit: the first
 * six digits weighted 7 down to 2, summed, end in the seventh digit.
 */
export function isValidImo(imo) {
  if (!/^\d{7}$/.test(String(imo))) return false;
  const digits = String(imo).split('').map(Number);
  const sum = digits
    .slice(0, 6)
    .reduce((total, d, i) => total + d * (7 - i), 0);
  return sum % 10 === digits[6];
}

/** @returns {string|null} A valid 7-digit IMO number, or null. */
export function normalizeImo(value) {
  const imo = String(value || '')
    .replace(/^IMO\s*/i, '')
    .trim();
  return isValidImo(imo) ? imo : null;
}

/** @returns {string|null} An upper-case registration such as D-AIBD, or null. */
export function normalizeRegistration(value) {
  const reg = String(value || '')
    .trim()
    .toUpperCase();
  return /^[A-Z0-9]{1,3}-?[A-Z0-9]{1,6}$/.test(reg) && reg.length <= 10
    ? reg
    : null;
}

/**
 * Model tokens of an aircraft type, for matching category names, taken from
 * the first word that carries a digit: the word, the word without trailing
 * letters, and its bare model number when that has three digits or more
 * ("Airbus A319-112" → a319, 319; "C172" → c172, 172; "Cessna 172S" → 172s,
 * 172; "A20N" → a20n, a20). Later words are series numbers: "112" would also
 * match an A321-112.
 * @param {string} type
 * @returns {string[]}
 */
export function typeTokens(type) {
  const model = String(type || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .find((word) => word.length >= 2 && /\d/.test(word));
  if (!model) return [];
  const tokens = new Set([model]);
  const trimmed = model.replace(/[a-z]+$/, '');
  if (trimmed.length >= 2 && /\d/.test(trimmed)) tokens.add(trimmed);
  const number = trimmed.replace(/^[a-z]+/, '');
  if (/^\d{3,}$/.test(number)) tokens.add(number);
  return [...tokens];
}

/**
 * Whether a category or file name names the given aircraft type. The
 * registration is removed first, so the digits of "N319AB" cannot pass for an
 * A319.
 */
export function matchesType(name, tokens, registration = '') {
  if (!tokens.length) return false;
  const reg = squash(registration);
  let text = squash(name);
  if (reg) text = text.split(reg).join(' ');
  return tokens.some((token) => text.includes(token));
}

/** Ship name from a subcategory title: "Category:Finnstar (ship, 2006)" → "Finnstar". */
export function shipNameFromCategory(title) {
  return String(title || '')
    .replace(/^Category:/, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
}

/**
 * Choose the vessel category to take a photo from. Pure.
 * @param {{subcats: string[], files: string[]}} members of Category:IMO n
 * @param {string} currentName
 * @returns {{category: string|null, formerName: string|null}}
 */
export function chooseVesselCategory(members, currentName, imoCategory) {
  const current = squash(currentName);
  const match = members.subcats.find(
    (title) => current && squash(shipNameFromCategory(title)) === current,
  );
  if (match) return { category: match, formerName: null };
  if (members.files.length) return { category: imoCategory, formerName: null };
  const first = members.subcats[0];
  if (!first) return { category: null, formerName: null };
  const name = shipNameFromCategory(first);
  return {
    category: first,
    formerName: current && squash(name) !== current ? name : null,
  };
}

/**
 * Choose the aircraft category to take a photo from. Pure.
 * @returns {{category: string|null, requireFileMatch: boolean}}
 */
export function chooseAircraftCategory(
  members,
  tokens,
  regCategory,
  registration = '',
) {
  const typed = members.subcats.find((title) =>
    matchesType(title, tokens, registration),
  );
  if (typed) return { category: typed, requireFileMatch: false };
  // Without type subcategories the registration has one airframe on Commons,
  // but file names are still checked against the type when one is known.
  if (!members.subcats.length && members.files.length)
    return { category: regCategory, requireFileMatch: tokens.length > 0 };
  // Direct files next to type subcategories may show any of the airframes.
  if (members.files.length && tokens.length)
    return { category: regCategory, requireFileMatch: true };
  return { category: null, requireFileMatch: false };
}

/**
 * Reduce an imageinfo response to the first freely licensed photo. Pure.
 * @param {unknown} json `generator=categorymembers&prop=imageinfo` response
 * @param {{requireMatch?: (title: string) => boolean}} [options]
 */
export function parseCommonsPhoto(json, { requireMatch } = {}) {
  const pages = Array.isArray(json?.query?.pages) ? json.query.pages : [];
  pages.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime || '')) continue;
    if (requireMatch && !requireMatch(page.title)) continue;
    const meta = info.extmetadata || {};
    if (String(meta.NonFree?.value || '').toLowerCase() === 'true') continue;
    const license = plainText(meta.LicenseShortName?.value);
    if (!license) continue;
    const thumbnail = safeUrl(info.thumburl, IMAGE_HOST);
    const link = safeUrl(info.descriptionurl, PAGE_HOST);
    if (!thumbnail || !link) continue;
    const width = Number(info.thumbwidth);
    const height = Number(info.thumbheight);
    return {
      thumbnail,
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
      link,
      author: plainText(meta.Artist?.value) || plainText(meta.Credit?.value),
      license,
      licenseUrl: safeUrl(meta.LicenseUrl?.value, /^[a-z0-9.-]+$/) || null,
    };
  }
  return null;
}

export function commonsPhotoProxy({
  fetchImpl = (...args) => fetch(...args),
  cachePath = path.join(process.cwd(), '.gev-cache', 'commons-photos.json'),
  now = () => Date.now(),
} = {}) {
  let cache = {};
  let loaded = false;
  let dirty = false;
  const inflight = new Map();
  let windowStart = 0;
  let windowCount = 0;

  async function loadOnce() {
    if (loaded) return;
    loaded = true;
    try {
      cache = JSON.parse(await fsp.readFile(cachePath, 'utf8')) || {};
    } catch {
      /* first run */
    }
    setInterval(async () => {
      if (!dirty) return;
      dirty = false;
      try {
        await fsp.mkdir(path.dirname(cachePath), { recursive: true });
        await fsp.writeFile(cachePath, JSON.stringify(cache), 'utf8');
      } catch {
        dirty = true;
      }
    }, 15_000).unref?.();
  }

  function allowUpstream(calls) {
    const t = now();
    if (t - windowStart >= 60_000) {
      windowStart = t;
      windowCount = 0;
    }
    if (windowCount + calls > MAX_UPSTREAM_PER_MINUTE) return false;
    windowCount += calls;
    return true;
  }

  async function api(params) {
    const url = new URL(API);
    for (const [key, value] of Object.entries({
      format: 'json',
      formatversion: '2',
      maxlag: '5',
      ...params,
    }))
      url.searchParams.set(key, value);
    const response = await fetchImpl(url.href, {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': COMMONS_USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > MAX_BODY_BYTES) throw new Error('Commons body too large');
    return JSON.parse(text);
  }

  async function members(category) {
    const json = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: category,
      cmtype: 'subcat|file',
      cmlimit: '50',
    });
    const rows = Array.isArray(json?.query?.categorymembers)
      ? json.query.categorymembers
      : [];
    return {
      subcats: rows.filter((row) => row.ns === 14).map((row) => row.title),
      files: rows.filter((row) => row.ns === 6).map((row) => row.title),
    };
  }

  async function photoIn(category, requireMatch) {
    const json = await api({
      action: 'query',
      generator: 'categorymembers',
      gcmtitle: category,
      gcmtype: 'file',
      gcmlimit: '20',
      prop: 'imageinfo',
      iiprop: 'url|mime|extmetadata',
      iiurlwidth: String(THUMB_WIDTH),
      iiextmetadatafilter: 'Artist|Credit|LicenseShortName|LicenseUrl|NonFree',
    });
    return parseCommonsPhoto(json, { requireMatch });
  }

  async function lookupVessel(imo, name) {
    const imoCategory = `Category:IMO ${imo}`;
    const choice = chooseVesselCategory(
      await members(imoCategory),
      name,
      imoCategory,
    );
    if (!choice.category) return null;
    const photo = await photoIn(choice.category);
    return photo ? { ...photo, formerName: choice.formerName } : null;
  }

  async function lookupAircraft(reg, type) {
    const tokens = typeTokens(type);
    const regCategory = `Category:${reg} (aircraft)`;
    const choice = chooseAircraftCategory(
      await members(regCategory),
      tokens,
      regCategory,
      reg,
    );
    if (!choice.category) return null;
    return photoIn(
      choice.category,
      choice.requireFileMatch
        ? (title) => matchesType(title, tokens, reg)
        : null,
    );
  }

  async function lookup(key, run) {
    if (cache[key] && now() - cache[key].at < TTL_MS) return cache[key].photo;
    if (inflight.has(key)) return inflight.get(key);
    // A lookup costs at most two API calls.
    if (!allowUpstream(2)) return UNAVAILABLE;
    const pending = (async () => {
      try {
        const photo = await run();
        cache[key] = { at: now(), photo };
        dirty = true;
        return photo;
      } catch {
        return UNAVAILABLE;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
    return pending;
  }

  const installMiddleware = (server) => {
    server.middlewares.use(COMMONS_PHOTO_ROUTE, async (req, res) => {
      const send = (status, body) => {
        res.writeHead(status, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify(body));
      };
      if (req.method !== 'GET') return send(405, { error: 'method' });
      const url = new URL(req.url || '/', 'http://localhost');
      const [, kind, rawId] = url.pathname.split('/');
      let key = null;
      let run = null;
      if (kind === 'vessel') {
        const imo = normalizeImo(decodeURIComponent(rawId || ''));
        const name = String(url.searchParams.get('name') || '').slice(0, 80);
        if (imo) {
          key = `vessel:${imo}:${squash(name)}`;
          run = () => lookupVessel(imo, name);
        }
      } else if (kind === 'aircraft') {
        const reg = normalizeRegistration(decodeURIComponent(rawId || ''));
        const type = String(url.searchParams.get('type') || '').slice(0, 80);
        if (reg) {
          key = `aircraft:${reg}:${typeTokens(type).join(',')}`;
          run = () => lookupAircraft(reg, type);
        }
      }
      if (!key) return send(400, { error: 'invalid identifier' });
      try {
        await loadOnce();
        const photo = await lookup(key, run);
        if (photo === UNAVAILABLE)
          return send(200, { found: false, unavailable: true });
        return send(200, photo ? { found: true, ...photo } : { found: false });
      } catch {
        return send(500, { error: 'commons photo proxy error' });
      }
    });
  };
  return {
    name: 'commons-photo-proxy',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  };
}
