import { LOCALE_NAMES } from '../i18n/catalogs.js';
import { SUPPORTED_LOCALES, writeLocalePreference } from '../i18n/index.js';

/**
 * The address to load after a language change: the current one without a
 * `?lang=` override, which would otherwise win over the stored choice. The
 * hash, which carries the shared view, is kept. Pure, exported for tests.
 * @param {string} href
 * @returns {string}
 */
export function languageReloadUrl(href) {
  const url = new URL(href);
  url.searchParams.delete('lang');
  return url.href;
}

/**
 * Load an address as a new document. Replacing the location with the current
 * address, or one that differs only in its hash, would not reload the page.
 * Exported for tests.
 * @param {string} href
 * @param {Location} [location]
 */
export function loadPage(href, location = globalThis.location) {
  const target = new URL(href);
  const current = new URL(location.href);
  target.hash = '';
  current.hash = '';
  if (target.href === current.href) location.reload();
  else location.replace(href);
}

/**
 * Fill the Display panel's language select and apply a choice by storing it
 * and reloading, so every surface starts again in one language.
 * @param {object} options
 * @param {HTMLSelectElement|null} options.select
 * @param {string} options.locale The page locale.
 * @param {Document} [options.documentRef]
 * @param {Storage|null} [options.storage]
 * @param {(href: string) => void} [options.navigate]
 * @returns {() => void} Removes the listener.
 */
export function bindLanguagePicker({
  select,
  locale,
  documentRef = globalThis.document,
  storage,
  navigate = loadPage,
}) {
  if (!select) return () => {};
  select.replaceChildren(
    ...SUPPORTED_LOCALES.map((code) => {
      const option = documentRef.createElement('option');
      option.value = code;
      option.lang = code;
      option.textContent = LOCALE_NAMES[code] || code;
      return option;
    }),
  );
  select.value = locale;
  const onChange = () => {
    const next = select.value;
    if (next === locale) return;
    // A refused write still changes the language for this load through the
    // query, so a visitor whose browser blocks storage is not stuck.
    if (writeLocalePreference(next, storage)) {
      navigate(languageReloadUrl(globalThis.location.href));
      return;
    }
    const url = new URL(globalThis.location.href);
    url.searchParams.set('lang', next);
    navigate(url.href);
  };
  select.addEventListener('change', onChange);
  return () => select.removeEventListener('change', onChange);
}
