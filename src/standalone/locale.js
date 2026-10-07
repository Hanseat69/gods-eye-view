import {
  localizeTree,
  readLocalePreference,
  resolveLocale,
  setActiveLocale,
} from '../i18n/index.js';
import { bindLanguagePicker } from '../ui/languagePicker.js';

/**
 * Choose the page language and apply it to the static markup. Runs before the
 * application starts, so controllers that read their initial text from the
 * markup already read it in the chosen language.
 * @param {Document} [documentRef]
 * @returns {string} The page locale.
 */
export function applyPageLocale(documentRef = globalThis.document) {
  const locale = setActiveLocale(
    resolveLocale({
      query: globalThis.location?.search || '',
      stored: readLocalePreference(),
    }),
  );
  documentRef.documentElement.lang = locale;
  localizeTree(documentRef, locale);
  bindLanguagePicker({
    select: documentRef.getElementById('ui-language-select'),
    locale,
    documentRef,
  });
  return locale;
}
