import * as Cesium from 'cesium';
import { t } from '../i18n/index.js';
import { vesselTypeText } from '../data/aisShipTypes.js';

/**
 * Vessel search with suggestions, in the traffic bar at the top centre.
 *
 * Typing two or more characters asks `/api/ais-live/search`, which searches
 * every vessel the server has cached (not only the rows this page holds) by
 * name, MMSI or IMO. Picking a suggestion switches the vessel layer on, flies
 * to the vessel and selects it once the layer has it, which opens its contact
 * card. The field follows the WAI-ARIA combobox pattern.
 */

const VESSELS = 'ais-live-vessels';
const DEBOUNCE_MS = 250;
const SELECT_RETRY_MS = 1000;
const SELECT_ATTEMPTS = 12;

function element(documentRef, tag, className, textContent) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

/**
 * Second line of a suggestion: type, MMSI and destination. Pure.
 * @param {object} result Row from `/api/ais-live/search`.
 * @param {(key: string, params?: object) => string} translate
 */
export function suggestionDetail(result, translate) {
  return [
    vesselTypeText(result?.type, translate),
    result?.mmsi ? `MMSI ${result.mmsi}` : '',
    result?.destination ? `→ ${result.destination}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Mount the search field into the traffic bar.
 * @param {object} [options]
 * @param {Document} [options.documentRef]
 * @param {Window} [options.windowRef]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => object|null} [options.getApp] `{viewer, dataManager}`.
 * @returns {() => void} Unmounts and removes every listener.
 */
export function startVesselSearch({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  fetchImpl = (...args) => globalThis.fetch(...args),
  getApp = () => globalThis.window?.__godsEyeView || null,
} = {}) {
  const host = documentRef?.querySelector?.('#traffic-panel .traffic-switch');
  if (!host || !getApp()?.dataManager) return () => {};

  const wrapper = element(documentRef, 'div', 'vessel-search');
  const input = element(documentRef, 'input', 'vessel-search-input');
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = t('search.placeholder');
  input.setAttribute('aria-label', t('search.label'));
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'vessel-search-list');
  const list = element(documentRef, 'ul', 'vessel-search-list');
  list.id = 'vessel-search-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', t('search.label'));
  list.hidden = true;
  const live = element(documentRef, 'span', 'vessel-search-live');
  live.setAttribute('aria-live', 'polite');
  wrapper.append(input, list, live);
  host.append(wrapper);

  let results = [];
  let active = -1;
  let timer = null;
  let controller = null;
  let selectTimer = null;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const showMessage = (message) => {
    results = [];
    active = -1;
    list.replaceChildren(
      element(documentRef, 'li', 'vessel-search-message', message),
    );
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    live.textContent = message;
  };

  const highlight = (index) => {
    active = index;
    for (const [i, option] of [...list.children].entries()) {
      const on = i === index;
      option.classList.toggle('active', on);
      option.setAttribute?.('aria-selected', String(on));
      if (on) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView?.({ block: 'nearest' });
      }
    }
  };

  const render = () => {
    if (!results.length) {
      const vesselsOn = getApp()?.dataManager?.isEnabled?.(VESSELS);
      showMessage(t(vesselsOn ? 'search.none' : 'search.layerOff'));
      return;
    }
    list.replaceChildren(
      ...results.map((result, index) => {
        const option = element(documentRef, 'li', 'vessel-search-option');
        option.id = `vessel-search-option-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.append(
          element(
            documentRef,
            'span',
            'vessel-search-name',
            result.name || `MMSI ${result.mmsi}`,
          ),
          element(
            documentRef,
            'span',
            'vessel-search-detail',
            suggestionDetail(result, t),
          ),
        );
        // mousedown keeps focus in the field until the choice is made.
        option.addEventListener('mousedown', (event) => {
          event.preventDefault();
          choose(index);
        });
        return option;
      }),
    );
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    live.textContent = t('search.count', { count: results.length });
    highlight(-1);
  };

  const search = (query) => {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    Promise.resolve()
      .then(() =>
        fetchImpl(
          `/api/ais-live/search?limit=8&q=${encodeURIComponent(query)}`,
          { signal },
        ),
      )
      .then((response) => (response?.ok ? response.json() : null))
      .then((body) => {
        if (signal.aborted || input.value.trim() !== query) return;
        if (!body || !Array.isArray(body.results)) {
          showMessage(t('search.unavailable'));
          return;
        }
        results = body.results.filter(
          (row) => Number.isFinite(row?.lat) && Number.isFinite(row?.lon),
        );
        render();
      })
      .catch(() => {
        if (!signal.aborted) showMessage(t('search.unavailable'));
      });
  };

  async function choose(index) {
    const result = results[index];
    if (!result) return;
    input.value = result.name || String(result.mmsi);
    close();
    const app = getApp();
    const dataManager = app?.dataManager;
    await dataManager
      ?.setEnabled?.(VESSELS, true, { origin: 'user' })
      ?.catch?.(() => false);
    app?.viewer?.camera?.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        result.lon,
        result.lat,
        12_000,
      ),
      duration: 2,
    });
    // The layer may not hold this vessel yet (it loads the most recent rows
    // first); keep trying briefly, the camera is on its way regardless.
    windowRef.clearTimeout(selectTimer);
    let attempts = 0;
    const trySelect = () => {
      const layer = getApp()?.dataManager?.layers?.get?.(VESSELS)?.module;
      if (layer?.selectById?.(result.mmsi)) return;
      attempts += 1;
      if (attempts < SELECT_ATTEMPTS)
        selectTimer = windowRef.setTimeout(trySelect, SELECT_RETRY_MS);
    };
    trySelect();
  }

  const onInput = () => {
    windowRef.clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) {
      controller?.abort();
      results = [];
      close();
      return;
    }
    timer = windowRef.setTimeout(() => search(query), DEBOUNCE_MS);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      if (list.hidden) render();
      highlight(Math.min(results.length - 1, active + 1));
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      highlight(Math.max(0, active - 1));
    } else if (event.key === 'Enter') {
      if (results.length) {
        event.preventDefault();
        void choose(active >= 0 ? active : 0);
      }
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      if (!list.hidden) close();
      else input.value = '';
    }
  };

  const onBlur = () => {
    // Let a click on a suggestion land first.
    windowRef.setTimeout(close, 150);
  };

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', onBlur);

  return () => {
    windowRef.clearTimeout(timer);
    windowRef.clearTimeout(selectTimer);
    controller?.abort();
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('blur', onBlur);
    wrapper.remove();
  };
}
