import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EDGE_SMOOTHING_STORAGE_KEY,
  applyEdgeSmoothing,
  bindEdgeSmoothingToggle,
  resolveEdgeSmoothing,
  writeEdgeSmoothingPreference,
} from './edgeSmoothing.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test('edge smoothing is on unless switched off', () => {
  assert.equal(resolveEdgeSmoothing({ storage: memoryStorage() }), true);
  const off = memoryStorage({ [EDGE_SMOOTHING_STORAGE_KEY]: 'off' });
  assert.equal(resolveEdgeSmoothing({ storage: off }), false);
  assert.equal(resolveEdgeSmoothing({ query: '?msaa=1', storage: off }), true);
  assert.equal(
    resolveEdgeSmoothing({ query: '?msaa=0', storage: memoryStorage() }),
    false,
  );
  assert.equal(resolveEdgeSmoothing({ storage: null }), true);
});

test('only the off choice is stored', () => {
  const storage = memoryStorage();
  assert.equal(writeEdgeSmoothingPreference(false, storage), true);
  assert.equal(storage.getItem(EDGE_SMOOTHING_STORAGE_KEY), 'off');
  writeEdgeSmoothingPreference(true, storage);
  assert.equal(storage.values.size, 0);
  assert.equal(writeEdgeSmoothingPreference(false, null), false);
});

test('the scene sample count follows the choice and renders once', () => {
  let renders = 0;
  const scene = { msaaSamples: 4, requestRender: () => (renders += 1) };
  assert.equal(applyEdgeSmoothing(scene, false), true);
  assert.equal(scene.msaaSamples, 1);
  applyEdgeSmoothing(scene, true);
  assert.equal(scene.msaaSamples, 4);
  assert.equal(renders, 2);
  assert.equal(applyEdgeSmoothing(null, false), false);
});

test('the button switches the scene and remembers the choice', () => {
  const listeners = {};
  const classes = new Set();
  const attributes = {};
  const button = {
    classList: {
      toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
    },
    setAttribute: (name, value) => (attributes[name] = value),
    addEventListener: (type, fn) => (listeners[type] = fn),
    removeEventListener: (type) => delete listeners[type],
  };
  const scene = { msaaSamples: 4 };
  const storage = memoryStorage();
  const unbind = bindEdgeSmoothingToggle({
    button,
    enabled: true,
    getScene: () => scene,
    storage,
  });
  assert.equal(attributes['aria-pressed'], 'true');
  listeners.click();
  assert.equal(scene.msaaSamples, 1);
  assert.equal(attributes['aria-pressed'], 'false');
  assert.equal(classes.has('active'), false);
  assert.equal(storage.getItem(EDGE_SMOOTHING_STORAGE_KEY), 'off');
  unbind();
  assert.equal(listeners.click, undefined);
});
