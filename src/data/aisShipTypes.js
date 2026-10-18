/**
 * AIS ship type codes (ITU-R M.1371, message 5 / 24B) as catalog keys, so the
 * interface can say "Cargo ship" instead of "70". The second digit of the
 * 40/60/70/80 ranges only adds a hazardous-cargo category and is folded into
 * the class.
 */

const EXACT = Object.freeze({
  30: 'fishing',
  31: 'towing',
  32: 'towing',
  33: 'dredging',
  34: 'diving',
  35: 'military',
  36: 'sailing',
  37: 'pleasure',
  50: 'pilot',
  51: 'sar',
  52: 'tug',
  53: 'portTender',
  54: 'antiPollution',
  55: 'lawEnforcement',
  58: 'medical',
  59: 'noncombatant',
});

const RANGES = Object.freeze([
  [20, 29, 'wig'],
  [40, 49, 'highSpeed'],
  [60, 69, 'passenger'],
  [70, 79, 'cargo'],
  [80, 89, 'tanker'],
  [90, 99, 'other'],
]);

/**
 * @param {unknown} value AIS ship type code, as a number or numeric string.
 * @returns {string|null} Catalog key such as `vesselType.cargo`, or null when
 *   the value is not a known code (including 0, "not available").
 */
export function aisShipTypeKey(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const code = Number(text);
  const exact = EXACT[code];
  if (exact) return `vesselType.${exact}`;
  const range = RANGES.find(([from, to]) => code >= from && code <= to);
  return range ? `vesselType.${range[2]}` : null;
}

/**
 * A ship type for display: the translated class for an AIS code, otherwise
 * the value as given (some feeds already send text).
 * @param {unknown} value
 * @param {(key: string) => string} translate
 * @returns {string}
 */
export function vesselTypeText(value, translate) {
  const key = aisShipTypeKey(value);
  return key ? translate(key) : String(value ?? '').trim();
}
