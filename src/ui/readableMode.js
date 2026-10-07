/**
 * Readable mode: larger small text, stronger secondary text and denser panel
 * backgrounds (src/ui/styles/readable.css) for reading the interface over a
 * dark globe. It is off by default so the standard look is unchanged.
 *
 * The choice is stored per browser; `?readable=1` or `?readable=0` sets it for
 * one load without changing the stored choice.
 */

export const READABLE_STORAGE_KEY = 'gev:readable-ui:v1';
const ATTRIBUTE = 'data-readable';

function localStore(storage) {
  try {
    return storage === undefined ? globalThis.localStorage : storage;
  } catch {
    return null;
  }
}

/**
 * @param {{query?: string, storage?: Storage|null}} [sources]
 * @returns {boolean} Whether readable mode applies to this load.
 */
export function resolveReadable({ query = '', storage } = {}) {
  let requested = null;
  try {
    requested = new URLSearchParams(query).get('readable');
  } catch {
    requested = null;
  }
  if (requested === '1') return true;
  if (requested === '0') return false;
  try {
    return localStore(storage)?.getItem(READABLE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Store the choice. Off removes the entry.
 * @param {boolean} enabled
 * @param {Storage|null} [storage]
 * @returns {boolean} Whether the choice was stored.
 */
export function writeReadablePreference(enabled, storage) {
  try {
    const store = localStore(storage);
    if (!store) return false;
    if (enabled) store.setItem(READABLE_STORAGE_KEY, '1');
    else store.removeItem(READABLE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {Document} documentRef
 * @param {boolean} enabled
 */
export function applyReadable(documentRef, enabled) {
  const root = documentRef?.documentElement;
  if (!root) return;
  if (enabled) root.setAttribute(ATTRIBUTE, '');
  else root.removeAttribute(ATTRIBUTE);
}

/**
 * Bind the Display panel button. Switching applies at once; panels that
 * measure their text re-measure through the window resize they already watch.
 * @param {object} options
 * @param {HTMLElement|null} options.button
 * @param {boolean} options.enabled The state applied to this load.
 * @param {Document} [options.documentRef]
 * @param {Storage|null} [options.storage]
 * @returns {() => void} Removes the listener.
 */
export function bindReadableToggle({
  button,
  enabled,
  documentRef = globalThis.document,
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
    applyReadable(documentRef, current);
    writeReadablePreference(current, storage);
    sync();
    const view = documentRef?.defaultView;
    if (typeof view?.dispatchEvent === 'function' && view.Event)
      view.dispatchEvent(new view.Event('resize'));
  };
  sync();
  button.addEventListener('click', onClick);
  return () => button.removeEventListener('click', onClick);
}
