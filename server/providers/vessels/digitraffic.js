/**
 * Digitraffic (Fintraffic, Finland) open AIS feed: keyless vessel positions
 * and static data for the Baltic Sea, merged into the shared vessel cache
 * next to AISStream. Licence: CC BY 4.0, "Source: Fintraffic / digitraffic.fi".
 *
 * Digitraffic asks callers to identify themselves with a `Digitraffic-User`
 * header and to use compressed responses. Positions are polled incrementally
 * (`from=`) once a minute, static data every 15 minutes, and only while the
 * vessel layer keeps asking: the poller stops after five minutes without
 * demand. Fishing vessels are filtered out upstream.
 */

export const DIGITRAFFIC_LOCATIONS_URL =
  'https://meri.digitraffic.fi/api/ais/v1/locations';
export const DIGITRAFFIC_VESSELS_URL =
  'https://meri.digitraffic.fi/api/ais/v1/vessels';
export const DIGITRAFFIC_USER = 'gods-eye-view';
export const DIGITRAFFIC_SOURCE = 'Digitraffic';

const LOCATIONS_EVERY_MS = 60_000;
const VESSELS_EVERY_MS = 15 * 60_000;
const IDLE_STOP_MS = 5 * 60_000;
/** First request window; later requests overlap the previous one slightly. */
const FIRST_WINDOW_MS = 30 * 60_000;
const OVERLAP_MS = 60_000;
const MAX_BODY_BYTES = 8 * 1024 * 1024;

/**
 * Turn one Digitraffic location feature into a vessel report. Pure.
 * @param {object} feature GeoJSON feature from `/api/ais/v1/locations`.
 * @returns {object|null}
 */
export function digitrafficReport(feature) {
  const [lon, lat] = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [];
  const props = feature?.properties || {};
  const mmsi = String(props.mmsi ?? feature?.mmsi ?? '').trim();
  const epochMs = Number(props.timestampExternal);
  if (!/^\d{5,10}$/.test(mmsi) || !Number.isFinite(epochMs)) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    mmsi,
    lat,
    lon,
    epochMs,
    speed: props.sog,
    course: props.cog,
    // AIS uses 511 for "no heading"; the cache treats >360 as unknown.
    heading: props.heading,
    source: DIGITRAFFIC_SOURCE,
  };
}

/**
 * Turn one Digitraffic vessel metadata row into static data. Pure.
 * @param {object} row Entry from `/api/ais/v1/vessels`.
 * @returns {object|null}
 */
export function digitrafficStatic(row) {
  const mmsi = String(row?.mmsi ?? '').trim();
  if (!/^\d{5,10}$/.test(mmsi)) return null;
  const imo = Number(row.imo);
  return {
    mmsi,
    name: String(row.name || '').trim(),
    type: Number.isFinite(Number(row.shipType)) ? String(row.shipType) : '',
    imo:
      Number.isInteger(imo) && imo >= 1_000_000 && imo <= 9_999_999 ? imo : '',
    destination: String(row.destination || '').trim(),
  };
}

/**
 * @param {object} options
 * @param {(report: object) => boolean} options.ingestReport
 * @param {(data: object) => boolean} options.ingestStatic
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => number} [options.now]
 * @param {(message: string) => void} [options.warn]
 */
export function createDigitrafficPoller({
  ingestReport,
  ingestStatic,
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
  warn = () => {},
}) {
  let timer = null;
  let lastDemandAt = 0;
  let lastLocationsAt = 0;
  let lastVesselsAt = 0;
  let lastOkAt = 0;
  let lastError = null;
  let polling = false;
  let positionsSeen = 0;

  async function getJson(url) {
    const response = await fetchImpl(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
      headers: {
        'Digitraffic-User': DIGITRAFFIC_USER,
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
      },
    });
    if (!response.ok) throw new Error(`Digitraffic HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > MAX_BODY_BYTES)
      throw new Error('Digitraffic body too large');
    return JSON.parse(text);
  }

  async function poll() {
    if (polling) return;
    polling = true;
    const t = now();
    try {
      if (t - lastVesselsAt >= VESSELS_EVERY_MS) {
        const rows = await getJson(DIGITRAFFIC_VESSELS_URL);
        for (const row of Array.isArray(rows) ? rows : []) {
          const data = digitrafficStatic(row);
          if (data) ingestStatic(data);
        }
        lastVesselsAt = t;
      }
      const from = lastLocationsAt
        ? lastLocationsAt - OVERLAP_MS
        : t - FIRST_WINDOW_MS;
      const collection = await getJson(
        `${DIGITRAFFIC_LOCATIONS_URL}?from=${Math.floor(from)}`,
      );
      for (const feature of collection?.features || []) {
        const report = digitrafficReport(feature);
        if (report && ingestReport(report)) positionsSeen += 1;
      }
      lastLocationsAt = t;
      lastOkAt = now();
      lastError = null;
    } catch (error) {
      lastError = error?.message || String(error);
      warn(`[Digitraffic] ${lastError}`);
    } finally {
      polling = false;
    }
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    /** Note demand from the vessel layer; starts polling when idle. */
    touch() {
      lastDemandAt = now();
      if (timer) return;
      void poll();
      timer = setInterval(() => {
        if (now() - lastDemandAt > IDLE_STOP_MS) {
          stop();
          return;
        }
        void poll();
      }, LOCATIONS_EVERY_MS);
      timer.unref?.();
    },
    dispose: stop,
    /** @returns {{status: string, lastOkAt: number|null, error: string|null, positionsSeen: number}} */
    snapshot() {
      const fresh = lastOkAt && now() - lastOkAt < 3 * LOCATIONS_EVERY_MS;
      return {
        status: fresh ? 'live' : lastError ? 'down' : 'connecting',
        lastOkAt: lastOkAt || null,
        error: lastError,
        positionsSeen,
      };
    },
    /** Test seam: run one poll now. */
    poll,
  };
}
