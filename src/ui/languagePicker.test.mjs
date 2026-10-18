import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindLanguagePicker,
  languageReloadUrl,
  loadPage,
} from './languagePicker.js';
import { LOCALE_STORAGE_KEY } from '../i18n/index.js';

function fakeSelect() {
  const listeners = new Map();
  return {
    value: '',
    options: [],
    replaceChildren(...options) {
      this.options = options;
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    fire(type) {
      listeners.get(type)?.();
    },
    listeners,
  };
}

const documentRef = { createElement: () => ({}) };

function withLocation(href, run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', {
    value: { href },
    configurable: true,
  });
  try {
    return run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'location', previous);
    else delete globalThis.location;
  }
}

test('the reload address drops only the lang override and keeps the view hash', () => {
  assert.equal(
    languageReloadUrl('http://localhost:4173/?lang=de&setup=1#cam=1,2'),
    'http://localhost:4173/?setup=1#cam=1,2',
  );
  assert.equal(
    languageReloadUrl('http://localhost:4173/#cam=1'),
    'http://localhost:4173/#cam=1',
  );
});

test('the picker lists each locale in its own language and selects the page locale', () => {
  const select = fakeSelect();
  bindLanguagePicker({ select, locale: 'de', documentRef, storage: null });
  assert.deepEqual(
    select.options.map((option) => [
      option.value,
      option.textContent,
      option.lang,
    ]),
    [
      ['en', 'English', 'en'],
      ['de', 'Deutsch', 'de'],
    ],
  );
  assert.equal(select.value, 'de');
});

test('a new choice is stored and the page reloads without the override', () => {
  const select = fakeSelect();
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const visits = [];
  bindLanguagePicker({
    select,
    locale: 'en',
    documentRef,
    storage,
    navigate: (href) => visits.push(href),
  });
  withLocation('http://localhost:4173/?lang=en#cam=1', () => {
    select.value = 'de';
    select.fire('change');
  });
  assert.equal(values.get(LOCALE_STORAGE_KEY), 'de');
  assert.deepEqual(visits, ['http://localhost:4173/#cam=1']);
});

test('blocked storage still switches this load through the query', () => {
  const select = fakeSelect();
  const visits = [];
  bindLanguagePicker({
    select,
    locale: 'en',
    documentRef,
    storage: null,
    navigate: (href) => visits.push(href),
  });
  withLocation('http://localhost:4173/#cam=1', () => {
    select.value = 'de';
    select.fire('change');
  });
  assert.deepEqual(visits, ['http://localhost:4173/?lang=de#cam=1']);
});

test('reselecting the page locale does nothing, and teardown removes the listener', () => {
  const select = fakeSelect();
  const visits = [];
  const dispose = bindLanguagePicker({
    select,
    locale: 'de',
    documentRef,
    storage: null,
    navigate: (href) => visits.push(href),
  });
  select.value = 'de';
  select.fire('change');
  assert.deepEqual(visits, []);
  dispose();
  assert.equal(select.listeners.size, 0);
  assert.doesNotThrow(() =>
    bindLanguagePicker({ select: null, locale: 'en' })(),
  );
});

test('loading the current address reloads instead of only moving the hash', () => {
  const calls = [];
  const location = (href) => ({
    href,
    reload: () => calls.push(['reload']),
    replace: (next) => calls.push(['replace', next]),
  });
  loadPage(
    'http://localhost:4173/?welcome=0#map=osm',
    location('http://localhost:4173/?welcome=0#map=osm'),
  );
  loadPage(
    'http://localhost:4173/#cam=2',
    location('http://localhost:4173/#cam=1'),
  );
  loadPage(
    'http://localhost:4173/#cam=1',
    location('http://localhost:4173/?lang=de#cam=1'),
  );
  assert.deepEqual(calls, [
    ['reload'],
    ['reload'],
    ['replace', 'http://localhost:4173/#cam=1'],
  ]);
});
