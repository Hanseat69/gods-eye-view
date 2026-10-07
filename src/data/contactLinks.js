/**
 * Links from a selected aircraft or vessel to public tracking and photo
 * sites. The app only links out; it does not read data from these sites.
 * Every identifier is validated before it is placed in a URL, so a malformed
 * record produces fewer links rather than a wrong one.
 */

const HEX = /^[0-9a-f]{6}$/i;
const CALLSIGN = /^[A-Z0-9]{2,8}$/;
const REGISTRATION = /^[A-Z0-9][A-Z0-9-]{1,9}$/;
const MMSI = /^\d{9}$/;
const IMO = /^\d{7}$/;

const clean = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase();

/**
 * @param {{hex?: string, callsign?: string, registration?: string}} aircraft
 * @returns {Array<{id: string, label: string, href: string}>}
 */
export function aircraftLinks({ hex, callsign, registration } = {}) {
  const links = [];
  const icao = String(hex ?? '')
    .trim()
    .toLowerCase();
  const flight = clean(callsign);
  const reg = clean(registration);
  if (CALLSIGN.test(flight))
    links.push({
      id: 'flightradar24',
      label: 'Flightradar24',
      href: `https://www.flightradar24.com/${flight}`,
    });
  else if (REGISTRATION.test(reg))
    links.push({
      id: 'flightradar24',
      label: 'Flightradar24',
      href: `https://www.flightradar24.com/data/aircraft/${reg.toLowerCase()}`,
    });
  if (HEX.test(icao)) {
    links.push({
      id: 'adsbexchange',
      label: 'ADS-B Exchange',
      href: `https://globe.adsbexchange.com/?icao=${icao}`,
    });
    links.push({
      id: 'planespotters',
      label: 'Planespotters',
      href: `https://www.planespotters.net/hex/${icao.toUpperCase()}`,
    });
  }
  return links;
}

/**
 * @param {{mmsi?: string|number, imo?: string|number}} vessel
 * @returns {Array<{id: string, label: string, href: string}>}
 */
export function vesselLinks({ mmsi, imo } = {}) {
  const links = [];
  const id = String(mmsi ?? '').trim();
  const imoNumber = String(imo ?? '')
    .trim()
    .replace(/^IMO\s*/i, '');
  if (MMSI.test(id))
    links.push({
      id: 'marinetraffic',
      label: 'MarineTraffic',
      href: `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${id}`,
    });
  // VesselFinder's detail pages are keyed by IMO number.
  if (IMO.test(imoNumber))
    links.push({
      id: 'vesselfinder',
      label: 'VesselFinder',
      href: `https://www.vesselfinder.com/vessels/details/${imoNumber}`,
    });
  if (MMSI.test(id))
    links.push({
      id: 'myshiptracking',
      label: 'MyShipTracking',
      href: `https://www.myshiptracking.com/?mmsi=${id}`,
    });
  return links;
}
