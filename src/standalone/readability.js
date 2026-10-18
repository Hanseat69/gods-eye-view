import {
  applyReadable,
  bindReadableToggle,
  resolveReadable,
} from '../ui/readableMode.js';

/**
 * Apply the stored readable-mode choice before the application starts, so
 * the first frame already has its final text size, and bind its button.
 * @param {Document} [documentRef]
 * @returns {boolean} Whether readable mode is on.
 */
export function applyPageReadability(documentRef = globalThis.document) {
  const enabled = resolveReadable({ query: globalThis.location?.search || '' });
  applyReadable(documentRef, enabled);
  bindReadableToggle({
    button: documentRef.getElementById('readable-toggle'),
    enabled,
    documentRef,
  });
  return enabled;
}
