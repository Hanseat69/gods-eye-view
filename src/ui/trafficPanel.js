import * as Cesium from 'cesium';
import { t, getActiveLocale } from '../i18n/index.js';

/**
 * Traffic quick switch and "Nearby" list, top centre.
 *
 * The switch turns the Live Flights and Live Vessels layers on or off in one
 * click (aircraft only, vessels only, both); it drives the same data-manager
 * layers as the Data Layers panel, so both stay in step. The list shows the
 * aircraft and vessels closest to the centre of the view; picking one tracks
 * the aircraft or selects the vessel, which opens its contact card.
 */

const FLIGHTS = 'flights';
const VESSELS = 'ais-live-vessels';
const LIST_SIZE = 20;
const REFRESH_MS = 3000;

/** Great-circle distance in km. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Which switch button reads as active for the two layer states.
 * @returns {'aircraft'|'vessels'|'both'|null}
 */
export function activeMode(flightsOn, vesselsOn) {
  if (flightsOn && vesselsOn) return 'both';
  if (flightsOn) return 'aircraft';
  if (vesselsOn) return 'vessels';
  return null;
}

/**
 * Target layer states for a button press. Pressing the active button turns
 * its layers off again.
 * @param {'aircraft'|'vessels'|'both'} mode
 * @param {'aircraft'|'vessels'|'both'|null} current
 * @returns {{flights: boolean, vessels: boolean}}
 */
export function nextLayerState(mode, current) {
  if (mode === current) return { flights: false, vessels: false };
  return {
    flights: mode === 'aircraft' || mode === 'both',
    vessels: mode === 'vessels' || mode === 'both',
  };
}

/**
 * Nearest contacts to a point, closest first. Pure.
 * @param {Array<{kind: string, rows: Array<object>}>} groups
 * @param {{latitude: number, longitude: number}} center
 * @param {number} [limit]
 */
export function nearestContacts(groups, center, limit = LIST_SIZE) {
  const items = [];
  for (const { kind, layerId, rows } of groups) {
    for (const row of rows || []) {
      if (!Number.isFinite(row?.latitude) || !Number.isFinite(row?.longitude))
        continue;
      items.push({
        kind,
        layerId,
        id: String(row.id),
        label: String(row.label || row.id),
        detail: String(row.typeName || row.typeCode || ''),
        latitude: row.latitude,
        longitude: row.longitude,
        distanceKm: distanceKm(
          center.latitude,
          center.longitude,
          row.latitude,
          row.longitude,
        ),
      });
    }
  }
  items.sort((a, b) => a.distanceKm - b.distanceKm);
  return items.slice(0, limit);
}

function element(documentRef, tag, className, textContent) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

/** Point on the globe at the centre of the view, else under the camera. */
function viewCenter(viewer) {
  const canvas = viewer.scene.canvas;
  const hit = viewer.camera.pickEllipsoid(
    new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
  );
  const carto = hit
    ? Cesium.Cartographic.fromCartesian(hit)
    : viewer.camera.positionCartographic;
  return {
    latitude: Cesium.Math.toDegrees(carto.latitude),
    longitude: Cesium.Math.toDegrees(carto.longitude),
  };
}

/**
 * Mount the quick switch and the list.
 * @param {object} [options]
 * @param {Document} [options.documentRef]
 * @param {Window} [options.windowRef]
 * @param {() => object|null} [options.getApp] `{viewer, dataManager}`.
 * @returns {() => void} Unmounts and removes every listener.
 */
export function startTrafficPanel({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  getApp = () => globalThis.window?.__godsEyeView || null,
} = {}) {
  const app = getApp();
  const dataManager = app?.dataManager;
  if (!documentRef?.body || !dataManager?.setEnabled || !app?.viewer)
    return () => {};

  const root = element(documentRef, 'div', 'traffic-panel');
  root.id = 'traffic-panel';
  const bar = element(documentRef, 'div', 'traffic-switch');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', t('traffic.label'));
  const buttons = new Map();
  for (const [mode, icon] of [
    ['aircraft', '✈'],
    ['vessels', '⚓'],
    ['both', '✈⚓'],
  ]) {
    const button = element(documentRef, 'button', 'traffic-switch-btn');
    button.type = 'button';
    button.dataset.mode = mode;
    button.title = t(`traffic.${mode}.title`);
    button.append(
      element(documentRef, 'span', 'traffic-switch-icon', icon),
      element(
        documentRef,
        'span',
        'traffic-switch-label',
        t(`traffic.${mode}`),
      ),
    );
    buttons.set(mode, button);
    bar.append(button);
  }
  const listToggle = element(documentRef, 'button', 'traffic-switch-btn');
  listToggle.type = 'button';
  listToggle.setAttribute('aria-expanded', 'false');
  listToggle.setAttribute('aria-controls', 'traffic-nearby');
  listToggle.title = t('traffic.nearby.title');
  listToggle.append(
    element(documentRef, 'span', 'traffic-switch-icon', '☰'),
    element(documentRef, 'span', 'traffic-switch-label', t('traffic.nearby')),
  );
  bar.append(listToggle);

  const panel = element(documentRef, 'section', 'traffic-nearby');
  panel.id = 'traffic-nearby';
  panel.hidden = true;
  panel.setAttribute('aria-label', t('traffic.nearby.title'));
  const status = element(documentRef, 'p', 'traffic-nearby-status');
  const list = element(documentRef, 'ol', 'traffic-nearby-list');
  panel.append(status, list);
  root.append(bar, panel);
  documentRef.body.append(root);

  const layerOn = (id) => Boolean(dataManager.isEnabled(id));
  const module = (id) => dataManager.layers?.get?.(id)?.module || null;

  const syncButtons = () => {
    const current = activeMode(layerOn(FLIGHTS), layerOn(VESSELS));
    for (const [mode, button] of buttons) {
      const active = mode === current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    return current;
  };

  const onSwitch = async (mode) => {
    const next = nextLayerState(mode, syncButtons());
    await Promise.allSettled([
      dataManager.setEnabled(FLIGHTS, next.flights, { origin: 'user' }),
      dataManager.setEnabled(VESSELS, next.vessels, { origin: 'user' }),
    ]);
    syncButtons();
    if (!panel.hidden) renderList();
  };

  const collect = () => {
    const groups = [];
    const read = (layerId, kind) => {
      if (!layerOn(layerId)) return;
      try {
        groups.push({
          kind,
          layerId,
          rows: module(layerId)?.getAllPositions?.(5000) || [],
        });
      } catch {
        /* a layer mid-teardown has nothing to list */
      }
    };
    read(FLIGHTS, 'aircraft');
    read('military', 'aircraft');
    read(VESSELS, 'vessel');
    return groups;
  };

  const select = (item) => {
    const layer = module(item.layerId);
    if (!layer) return;
    if (item.kind === 'aircraft') {
      layer.trackById?.(item.id, { origin: 'user' });
    } else {
      layer.selectById?.(item.id);
      getApp()?.viewer?.camera?.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          item.longitude,
          item.latitude,
          12_000,
        ),
        duration: 1.5,
      });
    }
    closeList();
  };

  function renderList() {
    const viewer = getApp()?.viewer;
    if (!viewer) return;
    const groups = collect();
    if (!groups.length) {
      status.textContent = t('traffic.nearby.off');
      list.replaceChildren();
      return;
    }
    const items = nearestContacts(groups, viewCenter(viewer));
    status.textContent = items.length
      ? t('traffic.nearby.count', { count: items.length })
      : t('traffic.nearby.none');
    const locale = getActiveLocale();
    list.replaceChildren(
      ...items.map((item) => {
        const entry = element(documentRef, 'li');
        const button = element(documentRef, 'button', 'traffic-nearby-item');
        button.type = 'button';
        button.append(
          element(
            documentRef,
            'span',
            'traffic-nearby-icon',
            item.kind === 'aircraft' ? '✈' : '⚓',
          ),
          element(documentRef, 'span', 'traffic-nearby-name', item.label),
          element(
            documentRef,
            'span',
            'traffic-nearby-detail',
            item.detail ||
              t(
                item.kind === 'aircraft'
                  ? 'traffic.aircraftOne'
                  : 'traffic.vesselOne',
              ),
          ),
          element(
            documentRef,
            'span',
            'traffic-nearby-distance',
            `${item.distanceKm.toLocaleString(locale, {
              maximumFractionDigits: item.distanceKm < 10 ? 1 : 0,
            })} km`,
          ),
        );
        button.addEventListener('click', () => select(item));
        entry.append(button);
        return entry;
      }),
    );
  }

  let refreshTimer = null;
  function openList() {
    panel.hidden = false;
    listToggle.classList.add('active');
    listToggle.setAttribute('aria-expanded', 'true');
    renderList();
    refreshTimer = windowRef.setInterval(() => {
      if (!documentRef.hidden) renderList();
    }, REFRESH_MS);
  }
  function closeList() {
    panel.hidden = true;
    listToggle.classList.remove('active');
    listToggle.setAttribute('aria-expanded', 'false');
    windowRef.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && !panel.hidden) closeList();
  };
  for (const [mode, button] of buttons)
    button.addEventListener('click', () => void onSwitch(mode));
  listToggle.addEventListener('click', () =>
    panel.hidden ? openList() : closeList(),
  );
  documentRef.addEventListener('keydown', onKeyDown);
  const unsubscribe = dataManager.subscribe?.(() => syncButtons()) || null;
  syncButtons();

  return () => {
    closeList();
    unsubscribe?.();
    documentRef.removeEventListener('keydown', onKeyDown);
    root.remove();
  };
}
