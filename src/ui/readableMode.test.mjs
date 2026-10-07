import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  READABLE_STORAGE_KEY,
  applyReadable,
  bindReadableToggle,
  resolveReadable,
  writeReadablePreference,
} from './readableMode.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function fakeDocument() {
  const attributes = new Map();
  const events = [];
  class FakeEvent {
    constructor(type) {
      this.type = type;
    }
  }
  return {
    documentElement: {
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
    },
    defaultView: {
      Event: FakeEvent,
      dispatchEvent: (event) => events.push(event.type),
    },
    attributes,
    events,
  };
}

function fakeButton() {
  const listeners = new Map();
  const classes = new Set();
  const attrs = new Map();
  return {
    classList: {
      toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
    },
    setAttribute: (name, value) => attrs.set(name, value),
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type, fn) => {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    click: () => listeners.get('click')?.(),
    classes,
    attrs,
    listeners,
  };
}

test('readable mode is off by default, stored per browser and overridable per load', () => {
  assert.equal(resolveReadable({ storage: memoryStorage() }), false);
  const on = memoryStorage({ [READABLE_STORAGE_KEY]: '1' });
  assert.equal(resolveReadable({ storage: on }), true);
  assert.equal(resolveReadable({ query: '?readable=0', storage: on }), false);
  assert.equal(
    resolveReadable({ query: '?readable=1', storage: memoryStorage() }),
    true,
  );
  assert.equal(resolveReadable({ query: '?readable=x', storage: on }), true);
});

test('blocked storage reads as off and refuses writes', () => {
  const throwing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
  };
  assert.equal(resolveReadable({ storage: throwing }), false);
  assert.equal(writeReadablePreference(true, throwing), false);
  assert.equal(writeReadablePreference(true, null), false);
});

test('the choice round-trips and off removes it', () => {
  const storage = memoryStorage();
  assert.equal(writeReadablePreference(true, storage), true);
  assert.equal(storage.values.get(READABLE_STORAGE_KEY), '1');
  assert.equal(writeReadablePreference(false, storage), true);
  assert.equal(storage.values.has(READABLE_STORAGE_KEY), false);
});

test('the root attribute follows the mode', () => {
  const documentRef = fakeDocument();
  applyReadable(documentRef, true);
  assert.equal(documentRef.attributes.has('data-readable'), true);
  applyReadable(documentRef, false);
  assert.equal(documentRef.attributes.has('data-readable'), false);
  assert.doesNotThrow(() => applyReadable(null, true));
});

test('the Display button toggles, stores, re-measures and tears down', () => {
  const documentRef = fakeDocument();
  const storage = memoryStorage();
  const button = fakeButton();
  const dispose = bindReadableToggle({
    button,
    enabled: false,
    documentRef,
    storage,
  });
  assert.equal(button.attrs.get('aria-pressed'), 'false');
  button.click();
  assert.equal(documentRef.attributes.has('data-readable'), true);
  assert.equal(storage.values.get(READABLE_STORAGE_KEY), '1');
  assert.equal(button.attrs.get('aria-pressed'), 'true');
  assert.ok(button.classes.has('active'));
  assert.deepEqual(documentRef.events, ['resize']);
  button.click();
  assert.equal(documentRef.attributes.has('data-readable'), false);
  assert.equal(storage.values.has(READABLE_STORAGE_KEY), false);
  dispose();
  assert.equal(button.listeners.size, 0);
  assert.doesNotThrow(() => bindReadableToggle({ button: null })());
});

test('small panel text scales with one token and the measured exceptions stay fixed', () => {
  const dir = new URL('./styles/', import.meta.url);
  const small = /font-size:\s*(?:([0-9.]+)px|([0-9.]+)rem)\s*;/g;
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.css'))) {
    if (['cockpit.css', 'voice-cost.css'].includes(name)) continue;
    const css = readFileSync(new URL(name, dir), 'utf8');
    for (const [declaration, px, rem] of css.matchAll(small)) {
      const tooSmall =
        (px !== undefined && Number(px) <= 12) ||
        (rem !== undefined && Number(rem) <= 0.75);
      // The attribution line's 10px drives its measured height.
      if (tooSmall && !(name === 'foundation.css' && px === '10'))
        assert.fail(`${name}: ${declaration} does not scale in readable mode`);
    }
  }
  const readable = readFileSync(new URL('readable.css', dir), 'utf8');
  assert.match(
    readable,
    /:root\[data-readable\]\s*\{[^}]*--ui-small-text-scale:/,
  );
});
