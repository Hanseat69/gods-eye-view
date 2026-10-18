import {
  applyEdgeSmoothing,
  bindEdgeSmoothingToggle,
  resolveEdgeSmoothing,
} from '../ui/edgeSmoothing.js';

const currentScene = () => globalThis.window?.__godsEyeView?.viewer?.scene;

/**
 * Bind the edge-smoothing button before the application starts.
 * @param {Document} [documentRef]
 * @returns {() => void} Applies the stored choice once the globe exists.
 */
export function bindPageEdgeSmoothing(documentRef = globalThis.document) {
  const enabled = resolveEdgeSmoothing({
    query: globalThis.location?.search || '',
  });
  bindEdgeSmoothingToggle({
    button: documentRef.getElementById('msaa-toggle'),
    enabled,
    getScene: currentScene,
  });
  return () => {
    // The viewer is created with the standard four samples.
    if (!enabled) applyEdgeSmoothing(currentScene(), false);
  };
}
