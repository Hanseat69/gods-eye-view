/**
 * Interface language for the standalone application.
 *
 * English is the source language: every key resolves to the English catalog
 * when the active locale has no entry, and English markup in
 * src/ui/templates/ is the same text as that catalog (pinned by
 * src/i18n/catalogs.test.mjs). A locale is chosen explicitly — a `?lang=`
 * query or a stored choice from the Display panel — and applies for the
 * whole page: changing it reloads, so no controller has to re-render.
 */
import { CATALOGS } from './catalogs.js';

export const DEFAULT_LOCALE = 'en';
export const LOCALE_STORAGE_KEY = 'gev:ui-locale:v1';

/** Locales with a catalog, in the order the language picker lists them. */
export const SUPPORTED_LOCALES = Object.freeze(Object.keys(CATALOGS));

/**
 * Normalize a language tag to a supported locale.
 * @param {unknown} value A tag such as `de`, `de-AT` or `EN`.
 * @returns {string|null} The supported locale, or null.
 */
export function normalizeLocale(value) {
  const primary = String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(primary) ? primary : null;
}

/**
 * Choose the page locale. A `?lang=` query wins over the stored choice so a
 * link can show one language without changing the visitor's preference.
 * @param {{query?: string, stored?: string|null}} [sources]
 * @returns {string}
 */
export function resolveLocale({ query = '', stored = null } = {}) {
  let requested = null;
  try {
    requested = new URLSearchParams(query).get('lang');
  } catch {
    requested = null;
  }
  return (
    normalizeLocale(requested) || normalizeLocale(stored) || DEFAULT_LOCALE
  );
}

// Storage is resolved inside the guard: reading `localStorage` throws in some
// private-browsing and policy-restricted contexts.
function localStore(storage) {
  try {
    return storage === undefined ? globalThis.localStorage : storage;
  } catch {
    return null;
  }
}

/**
 * @param {Storage|null} [storage]
 * @returns {string|null} The stored locale, or null when none can be read.
 */
export function readLocalePreference(storage) {
  try {
    return normalizeLocale(localStore(storage)?.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Store the visitor's locale. The default locale removes the entry.
 * @param {string} locale
 * @param {Storage|null} [storage]
 * @returns {boolean} Whether the choice was stored.
 */
export function writeLocalePreference(locale, storage) {
  const normalized = normalizeLocale(locale);
  if (!normalized) return false;
  try {
    const store = localStore(storage);
    if (!store) return false;
    if (normalized === DEFAULT_LOCALE) store.removeItem(LOCALE_STORAGE_KEY);
    else store.setItem(LOCALE_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Create a lookup for one locale. `params` fill `{name}` placeholders;
 * `params.default` is returned when no catalog has the key, for text owned
 * elsewhere (such as the provider registry) that a locale may translate.
 * @param {string} locale
 * @returns {(key: string, params?: Record<string, unknown>) => string}
 */
export function createTranslator(locale) {
  const catalog = CATALOGS[normalizeLocale(locale) || DEFAULT_LOCALE];
  const fallback = CATALOGS[DEFAULT_LOCALE];
  return (key, params = {}) => {
    const template = catalog[key] ?? fallback[key];
    if (template === undefined) return String(params.default ?? key);
    return template.replace(PLACEHOLDER, (match, name) =>
      Object.hasOwn(params, name) ? String(params[name]) : match,
    );
  };
}

let activeLocale = DEFAULT_LOCALE;
let activeTranslator = createTranslator(DEFAULT_LOCALE);

/**
 * Set the page locale. Called once, before the application starts.
 * @param {string} locale
 * @returns {string} The locale now active.
 */
export function setActiveLocale(locale) {
  activeLocale = normalizeLocale(locale) || DEFAULT_LOCALE;
  activeTranslator = createTranslator(activeLocale);
  return activeLocale;
}

/** @returns {string} The page locale. */
export function getActiveLocale() {
  return activeLocale;
}

/**
 * Translate a key in the page locale.
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 * @returns {string}
 */
export function t(key, params) {
  return activeTranslator(key, params);
}

/**
 * Apply a locale to static markup. `data-i18n="key"` replaces an element's
 * text; `data-i18n-attr="title:key; aria-label:key"` replaces attributes.
 * English markup is already the source text, so the default locale is left
 * untouched.
 * @param {ParentNode} root
 * @param {string} locale
 * @returns {number} The number of texts and attributes replaced.
 */
export function localizeTree(root, locale) {
  const normalized = normalizeLocale(locale) || DEFAULT_LOCALE;
  if (normalized === DEFAULT_LOCALE || !root?.querySelectorAll) return 0;
  const translate = createTranslator(normalized);
  let replaced = 0;
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = translate(element.dataset.i18n, {
      default: element.textContent,
    });
    replaced += 1;
  }
  for (const element of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of parseAttributeKeys(element.dataset.i18nAttr)) {
      element.setAttribute(
        pair.attribute,
        translate(pair.key, {
          default: element.getAttribute(pair.attribute) ?? '',
        }),
      );
      replaced += 1;
    }
  }
  return replaced;
}

/**
 * @param {string|undefined} value `attribute:key` pairs separated by `;`.
 * @returns {Array<{attribute: string, key: string}>}
 */
export function parseAttributeKeys(value) {
  return String(value ?? '')
    .split(';')
    .map((pair) => pair.split(':').map((part) => part.trim()))
    .filter(([attribute, key]) => attribute && key)
    .map(([attribute, key]) => ({ attribute, key }));
}
