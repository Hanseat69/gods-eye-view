import path from 'node:path';
import { promises as fsp } from 'node:fs';

/**
 * Planespotters.net photo proxy: ICAO 24-bit hex → one aircraft photo
 * thumbnail with its photographer and photo page, for the contact details
 * card. Planespotters' public API asks callers to identify themselves with a
 * contact URL, to credit the photographer and to link the photo page; the
 * card does both. Results (including "no photo") are cached for a week and
 * persisted so restarts do not repeat lookups.
 *
 * Only Planespotters image and page URLs are passed on, so a changed or
 * hostile response cannot point the browser anywhere else.
 */

export const AIRCRAFT_PHOTO_ROUTE = '/api/aircraft-photo';
export const PLANESPOTTERS_USER_AGENT =
  'gods-eye-view (+https://github.com/bilawalsidhu/gods-eye-view)';
const TTL_MS = 7 * 24 * 3600_000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_UPSTREAM_PER_MINUTE = 30;
const IMAGE_HOST = /^([a-z0-9-]+\.)*plnspttrs\.net$/;
const PAGE_HOST = /^(www\.)?planespotters\.net$/;

/** Accept only an https URL on the given host pattern; anything else is null. */
function safeUrl(value, hostPattern) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' &&
      hostPattern.test(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/**
 * Reduce a Planespotters `/pub/photos/hex` response to the first usable
 * photo. Pure, exported for tests.
 * @param {unknown} json
 * @returns {{thumbnail: string, width: number|null, height: number|null,
 *   link: string, photographer: string}|null}
 */
export function parsePlanespottersPhoto(json) {
  const photos = Array.isArray(json?.photos) ? json.photos : [];
  for (const photo of photos) {
    const thumb = photo?.thumbnail_large || photo?.thumbnail;
    const thumbnail = safeUrl(thumb?.src, IMAGE_HOST);
    const link = safeUrl(photo?.link, PAGE_HOST);
    if (!thumbnail || !link) continue;
    const width = Number(thumb?.size?.width);
    const height = Number(thumb?.size?.height);
    return {
      thumbnail,
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
      link,
      photographer: String(photo?.photographer || '')
        .replace(/[\u0000-\u001f]/g, '')
        .trim()
        .slice(0, 80),
    };
  }
  return null;
}

/**
 * @param {string} value
 * @returns {string|null} A lower-case ICAO 24-bit hex, or null.
 */
export function normalizeAircraftHex(value) {
  const hex = String(value || '')
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{6}$/.test(hex) ? hex : null;
}

export function aircraftPhotoProxy({
  fetchImpl = (...args) => fetch(...args),
  cachePath = path.join(process.cwd(), '.gev-cache', 'aircraft-photos.json'),
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

  const fresh = (entry) => entry && now() - entry.at < TTL_MS;

  function allowUpstream() {
    const t = now();
    if (t - windowStart >= 60_000) {
      windowStart = t;
      windowCount = 0;
    }
    windowCount += 1;
    return windowCount <= MAX_UPSTREAM_PER_MINUTE;
  }

  async function lookup(hex) {
    if (fresh(cache[hex])) return cache[hex].photo;
    if (inflight.has(hex)) return inflight.get(hex);
    if (!allowUpstream()) return null;
    const pending = (async () => {
      try {
        const response = await fetchImpl(
          `https://api.planespotters.net/pub/photos/hex/${hex}`,
          {
            redirect: 'error',
            signal: AbortSignal.timeout(8000),
            headers: {
              'User-Agent': PLANESPOTTERS_USER_AGENT,
              Accept: 'application/json',
            },
          },
        );
        if (!response.ok) return null;
        const text = await response.text();
        if (text.length > MAX_BODY_BYTES) return null;
        const photo = parsePlanespottersPhoto(JSON.parse(text));
        cache[hex] = { at: now(), photo };
        dirty = true;
        return photo;
      } catch {
        return fresh(cache[hex]) ? cache[hex].photo : null;
      } finally {
        inflight.delete(hex);
      }
    })();
    inflight.set(hex, pending);
    return pending;
  }

  const installMiddleware = (server) => {
    server.middlewares.use(AIRCRAFT_PHOTO_ROUTE, async (req, res) => {
      const send = (status, body) => {
        res.writeHead(status, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify(body));
      };
      if (req.method !== 'GET') return send(405, { error: 'method' });
      const hex = normalizeAircraftHex(
        String(req.url || '')
          .split('?')[0]
          .replace(/^\//, ''),
      );
      if (!hex) return send(400, { error: 'invalid hex' });
      try {
        await loadOnce();
        const photo = await lookup(hex);
        return send(200, photo ? { found: true, ...photo } : { found: false });
      } catch {
        return send(500, { error: 'aircraft photo proxy error' });
      }
    });
  };
  return {
    name: 'aircraft-photo-proxy',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  };
}
