import test from 'node:test';
import assert from 'node:assert/strict';
import { aircraftLinks, vesselLinks } from './contactLinks.js';

const hrefs = (links) => links.map((link) => [link.id, link.href]);

test('aircraft links prefer the live flight, then the airframe', () => {
  assert.deepEqual(
    hrefs(
      aircraftLinks({
        hex: '3C6444',
        callsign: 'dlh4cx',
        registration: 'D-AIBD',
      }),
    ),
    [
      ['flightradar24', 'https://www.flightradar24.com/DLH4CX'],
      ['adsbexchange', 'https://globe.adsbexchange.com/?icao=3c6444'],
      ['planespotters', 'https://www.planespotters.net/hex/3C6444'],
    ],
  );
  assert.deepEqual(hrefs(aircraftLinks({ registration: 'd-aibd' })), [
    ['flightradar24', 'https://www.flightradar24.com/data/aircraft/d-aibd'],
  ]);
});

test('malformed aircraft identifiers produce no link', () => {
  assert.deepEqual(
    aircraftLinks({
      hex: 'zz6444',
      callsign: 'DLH/../x',
      registration: 'a b',
    }),
    [],
  );
  assert.deepEqual(aircraftLinks(), []);
});

test('vessel links use MMSI, and IMO for VesselFinder', () => {
  assert.deepEqual(
    hrefs(vesselLinks({ mmsi: 211331640, imo: 'IMO 9811000' })),
    [
      [
        'marinetraffic',
        'https://www.marinetraffic.com/en/ais/details/ships/mmsi:211331640',
      ],
      ['vesselfinder', 'https://www.vesselfinder.com/vessels/details/9811000'],
      ['myshiptracking', 'https://www.myshiptracking.com/?mmsi=211331640'],
    ],
  );
  assert.deepEqual(
    hrefs(vesselLinks({ mmsi: '211331640' })).map(([id]) => id),
    ['marinetraffic', 'myshiptracking'],
  );
  assert.deepEqual(vesselLinks({ mmsi: '12345', imo: '0' }), []);
});
