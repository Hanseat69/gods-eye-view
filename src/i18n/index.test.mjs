import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  createTranslator,
  getActiveLocale,
  localizeTree,
  normalizeLocale,
  parseAttributeKeys,
  readLocalePreference,
  resolveLocale,
  setActiveLocale,
  t,
  writeLocalePreference,
} from './index.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test('language tags normalize to supported locales only', () => {
  assert.equal(normalizeLocale('de'), 'de');
  assert.equal(normalizeLocale('de-AT'), 'de');
  assert.equal(normalizeLocale('EN_us'), 'en');
  assert.equal(normalizeLocale('fr'), null);
  assert.equal(normalizeLocale(''), null);
  assert.equal(normalizeLocale(undefined), null);
});

test('a lang query outranks the stored choice, and English is the default', () => {
  assert.equal(resolveLocale(), DEFAULT_LOCALE);
  assert.equal(resolveLocale({ stored: 'de' }), 'de');
  assert.equal(resolveLocale({ query: '?lang=en', stored: 'de' }), 'en');
  assert.equal(resolveLocale({ query: '?lang=de' }), 'de');
  assert.equal(resolveLocale({ query: '?lang=xx', stored: 'de' }), 'de');
  assert.equal(resolveLocale({ stored: 'xx' }), DEFAULT_LOCALE);
});

test('the stored choice round-trips and English clears it', () => {
  const storage = memoryStorage();
  assert.equal(writeLocalePreference('de', storage), true);
  assert.equal(storage.values.get(LOCALE_STORAGE_KEY), 'de');
  assert.equal(readLocalePreference(storage), 'de');
  assert.equal(writeLocalePreference('en', storage), true);
  assert.equal(storage.values.has(LOCALE_STORAGE_KEY), false);
  assert.equal(writeLocalePreference('xx', storage), false);
});

test('blocked storage reads as no choice and refuses writes', () => {
  const throwing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
  };
  assert.equal(readLocalePreference(throwing), null);
  assert.equal(writeLocalePreference('de', throwing), false);
  assert.equal(readLocalePreference(null), null);
  assert.equal(writeLocalePreference('de', null), false);
});

test('a translator fills placeholders and falls back to English, then the default', () => {
  const de = createTranslator('de');
  assert.equal(de('keySetup.saving'), 'Wird gespeichert…');
  assert.equal(
    de('keySetup.chip.waitingMany', { count: 3 }),
    'POWER UP · 3 SCHLÜSSEL FEHLEN',
  );
  const en = createTranslator('en');
  assert.equal(
    en('keySetup.chip.waitingMany', { count: 3 }),
    'POWER UP · 3 KEYS WAITING',
  );
  assert.equal(en('keySetup.placeholder.empty'), 'paste {envVar}');
  assert.equal(de('no.such.key', { default: 'kept' }), 'kept');
  assert.equal(de('no.such.key'), 'no.such.key');
  assert.equal(createTranslator('xx')('keySetup.saving'), 'Saving…');
});

test('the page locale drives t() and starts in English', () => {
  assert.equal(getActiveLocale(), 'en');
  assert.equal(t('keySetup.chip.done'), 'POWERED UP');
  try {
    assert.equal(setActiveLocale('de-CH'), 'de');
    assert.equal(t('keySetup.chip.done'), 'ALLES AKTIV');
    assert.equal(setActiveLocale('xx'), 'en');
  } finally {
    setActiveLocale('en');
  }
});

test('attribute key lists parse leniently', () => {
  assert.deepEqual(parseAttributeKeys(' title:a.b ; aria-label : c '), [
    { attribute: 'title', key: 'a.b' },
    { attribute: 'aria-label', key: 'c' },
  ]);
  assert.deepEqual(parseAttributeKeys('broken;:x;y:'), []);
  assert.deepEqual(parseAttributeKeys(undefined), []);
});

function element({ i18n, i18nAttr, text = '', attributes = {} }) {
  const attrs = new Map(Object.entries(attributes));
  return {
    dataset: {
      ...(i18n ? { i18n } : {}),
      ...(i18nAttr ? { i18nAttr } : {}),
    },
    textContent: text,
    getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
    setAttribute: (name, value) => attrs.set(name, value),
    attrs,
  };
}

function tree(elements) {
  return {
    querySelectorAll(selector) {
      if (selector === '[data-i18n]')
        return elements.filter((node) => node.dataset.i18n);
      if (selector === '[data-i18n-attr]')
        return elements.filter((node) => node.dataset.i18nAttr);
      return [];
    },
  };
}

test('localizing markup replaces marked text and attributes, keeping unknown text', () => {
  const title = element({ i18n: 'keySetup.title', text: 'Power up the globe' });
  const unknown = element({ i18n: 'no.such.key', text: 'Original' });
  const close = element({
    i18nAttr: 'aria-label:keySetup.close',
    attributes: { 'aria-label': 'Close key setup' },
  });
  const root = tree([title, unknown, close]);
  assert.equal(localizeTree(root, 'de'), 3);
  assert.equal(title.textContent, 'Rüste den Globus auf');
  assert.equal(unknown.textContent, 'Original');
  assert.equal(
    close.attrs.get('aria-label'),
    'Schlüssel-Einstellungen schließen',
  );
});

test('English markup is the source and is left untouched', () => {
  const title = element({ i18n: 'keySetup.title', text: 'Edited markup' });
  assert.equal(localizeTree(tree([title]), 'en'), 0);
  assert.equal(title.textContent, 'Edited markup');
  assert.equal(localizeTree(null, 'de'), 0);
});
