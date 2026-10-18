/**
 * Edge smoothing: Cesium's multisample anti-aliasing (MSAA). Four samples are
 * the standard look; switching it off renders one sample per pixel, which
 * costs noticeably less on integrated and older GPUs at the price of jagged
 * building edges.
 *
 * The choice is stored per browser; `?msaa=1` or `?msaa=0` sets it for one
 * load without changing the stored choice.
 */

export const EDGE_SMOOTHING_STORAGE_KEY = 'gev:msaa:v1';
export const SMOOTH_SAMPLES = 4;

function localStore(storage) {
  try {
    return storage === undefined ? globalThis.localStorage : storage;
  } catch {
    return null;
  }
}

/**
 * @param {{query?: string, storage?: Storage|null}} [sources]
 * @returns {boolean} Whether edge smoothing applies to this load.
 */
export function resolveEdgeSmoothing({ query = '', storage } = {}) {
  let requested = null;
  try {
    requested = new URLSearchParams(query).get('msaa');
  } catch {
    requested = null;
  }
  if (requested === '1') return true;
  if (requested === '0') return false;
  try {
    return localStore(storage)?.getItem(EDGE_SMOOTHING_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Store the choice. On, the default, removes the entry.
 * @param {boolean} enabled
 * @param {Storage|null} [storage]
 * @returns {boolean} Whether the choice was stored.
 */
export function writeEdgeSmoothingPreference(enabled, storage) {
  try {
    const store = localStore(storage);
    if (!store) return false;
    if (enabled) store.removeItem(EDGE_SMOOTHING_STORAGE_KEY);
    else store.setItem(EDGE_SMOOTHING_STORAGE_KEY, 'off');
    return true;
  } catch {
    return false;
  }
}

/**
 * Set the scene's sample count and draw one frame with it, so a scene that
 * is idle in request-render mode shows the change at once.
 * @param {object|null|undefined} scene A Cesium scene.
 * @param {boolean} enabled
 * @returns {boolean} Whether a scene was changed.
 */
export function applyEdgeSmoothing(scene, enabled) {
  if (!scene || !('msaaSamples' in scene)) return false;
  const samples = enabled ? SMOOTH_SAMPLES : 1;
  if (scene.msaaSamples !== samples) scene.msaaSamples = samples;
  scene.requestRender?.();
  return true;
}

/**
 * Bind the Display panel button.
 * @param {object} options
 * @param {HTMLElement|null} options.button
 * @param {boolean} options.enabled The state applied to this load.
 * @param {() => object|null} options.getScene Returns the scene once it exists.
 * @param {Storage|null} [options.storage]
 * @returns {() => void} Removes the listener.
 */
export function bindEdgeSmoothingToggle({
  button,
  enabled,
  getScene,
  storage,
}) {
  if (!button) return () => {};
  let current = Boolean(enabled);
  const sync = () => {
    button.classList.toggle('active', current);
    button.setAttribute('aria-pressed', String(current));
  };
  const onClick = () => {
    current = !current;
    applyEdgeSmoothing(getScene(), current);
    writeEdgeSmoothingPreference(current, storage);
    sync();
  };
  sync();
  button.addEventListener('click', onClick);
  return () => button.removeEventListener('click', onClick);
}
