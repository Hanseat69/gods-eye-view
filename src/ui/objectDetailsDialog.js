import { t, getActiveLocale } from '../i18n/index.js';
import { getContextStore } from '../data/contextStore.js';
import { pickOwner, resolvePickId } from '../data/pickRegistry.js';
import { createContactPhoto } from './contactPhoto.js';
import {
  formatDetail,
  gatherObjectDetails,
  humanizeKey,
  orderedFields,
} from './objectDetails.js';

/**
 * Object details dialog: a right click (or a long press on touch screens) on
 * any object on the globe opens a dialog with everything the app knows about
 * it — aircraft, vessels, satellites, cameras, sites, earthquakes, fires.
 *
 * A right DRAG still zooms the camera: the dialog only opens when the pointer
 * moved less than a few pixels between press and release. Cesium already
 * suppresses the browser's own context menu on the globe.
 */

const CLICK_TOLERANCE_PX = 6;
const LONG_PRESS_MS = 600;

function element(documentRef, tag, className, textContent) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

/**
 * Read the object under a canvas position. Pure apart from the scene pick.
 * @returns {object|null} Details, or null when nothing is there.
 */
export function detailsAt({ scene, x, y, dataManager, readContext }) {
  let picked = null;
  try {
    picked = scene?.pick?.({ x, y }) || null;
  } catch {
    picked = null;
  }
  if (!picked) return null;
  const pickedId = resolvePickId(picked);
  const contextId =
    picked.id?.__gevContextId || picked.primitive?.id?.__gevContextId || null;
  const context =
    (contextId && readContext(contextId)) ||
    (pickedId && readContext(pickedId)) ||
    null;
  if (!pickedId && !context) return null;
  const layerId = pickOwner(pickedId) || context?.layerId || null;
  const module = layerId ? dataManager?.layers?.get?.(layerId)?.module : null;
  const layerName = layerId
    ? t(`layers.name.${layerId}`, {
        default: module?.name || context?.layerName || layerId,
      })
    : context?.layerName || '';
  return gatherObjectDetails({
    pickedId: pickedId || contextId,
    picked,
    layerId,
    layerName,
    layer: module,
    context,
  });
}

/**
 * Install the dialog. Call once the globe exists.
 * @param {object} [options]
 * @param {Document} [options.documentRef]
 * @param {Window} [options.windowRef]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => object|null} [options.getApp] `{viewer, dataManager}`.
 * @param {(id: string) => object|null} [options.readContext]
 * @returns {() => void} Removes the dialog and every listener.
 */
export function startObjectDetails({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  fetchImpl = (...args) => globalThis.fetch(...args),
  getApp = () => globalThis.window?.__godsEyeView || null,
  readContext = (id) => getContextStore().entities.get(id) || null,
} = {}) {
  const app = getApp();
  const canvas = app?.viewer?.scene?.canvas;
  if (!documentRef?.body || !canvas) return () => {};

  const backdrop = element(documentRef, 'div', 'object-details-backdrop');
  backdrop.hidden = true;
  const dialog = element(documentRef, 'section', 'object-details');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.id = 'object-details';
  const header = element(documentRef, 'header', 'object-details-header');
  const heading = element(documentRef, 'div', 'object-details-heading');
  const kicker = element(documentRef, 'span', 'object-details-kicker');
  const title = element(documentRef, 'h2', 'object-details-title');
  title.id = 'object-details-title';
  dialog.setAttribute('aria-labelledby', title.id);
  heading.append(kicker, title);
  const close = element(documentRef, 'button', 'object-details-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', t('details.close'));
  header.append(heading, close);
  const body = element(documentRef, 'div', 'object-details-body');
  const figure = element(documentRef, 'figure', 'object-details-photo');
  const list = element(documentRef, 'dl', 'object-details-fields');
  const links = element(documentRef, 'nav', 'object-details-links');
  links.setAttribute('aria-label', t('contact.links'));
  const hint = element(
    documentRef,
    'p',
    'object-details-hint',
    t('details.hint'),
  );
  body.append(figure, list, links, hint);
  dialog.append(header, body);
  backdrop.append(dialog);
  documentRef.body.append(backdrop);

  const photoView = createContactPhoto({
    documentRef,
    fetchImpl,
    figure,
    getTitle: () => title.textContent,
  });
  let returnFocus = null;

  const hide = () => {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    photoView.abort();
    if (returnFocus?.isConnected) returnFocus.focus?.({ preventScroll: true });
    returnFocus = null;
  };

  const show = (details) => {
    returnFocus = documentRef.activeElement;
    kicker.textContent = details.layerName || t('details.object');
    title.textContent = details.title;
    const locale = getActiveLocale();
    list.replaceChildren(
      ...orderedFields(details.fields).flatMap(([key, value]) => [
        element(
          documentRef,
          'dt',
          '',
          t(`details.field.${key}`, { default: humanizeKey(key) }),
        ),
        element(documentRef, 'dd', '', formatDetail(key, value, { t, locale })),
      ]),
    );
    if (!details.fields.size)
      list.replaceChildren(
        element(documentRef, 'p', 'object-details-empty', t('details.empty')),
      );
    links.replaceChildren(
      ...details.links.map((link) => {
        const anchor = element(
          documentRef,
          'a',
          'contact-details-link',
          `${link.label} ↗`,
        );
        anchor.href = link.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.title = t('contact.openIn', { site: link.label });
        return anchor;
      }),
    );
    links.hidden = details.links.length === 0;
    photoView.reset();
    photoView.load(details.photo);
    backdrop.hidden = false;
    close.focus({ preventScroll: true });
  };

  const openAt = (clientX, clientY) => {
    const current = getApp();
    const scene = current?.viewer?.scene;
    const rect = canvas.getBoundingClientRect();
    const details = detailsAt({
      scene,
      x: clientX - rect.left,
      y: clientY - rect.top,
      dataManager: current?.dataManager,
      readContext,
    });
    if (details) show(details);
    return Boolean(details);
  };

  // Right click: press and release without dragging.
  let rightDown = null;
  const onPointerDown = (event) => {
    if (event.button === 2) rightDown = { x: event.clientX, y: event.clientY };
    if (event.pointerType === 'touch') startLongPress(event);
  };
  const onContextMenu = (event) => {
    event.preventDefault();
    const down = rightDown;
    rightDown = null;
    if (
      down &&
      Math.hypot(event.clientX - down.x, event.clientY - down.y) >
        CLICK_TOLERANCE_PX
    )
      return;
    openAt(event.clientX, event.clientY);
  };

  // Long press on touch screens.
  let pressTimer = null;
  let pressStart = null;
  const cancelLongPress = () => {
    windowRef.clearTimeout(pressTimer);
    pressTimer = null;
    pressStart = null;
  };
  function startLongPress(event) {
    cancelLongPress();
    pressStart = { x: event.clientX, y: event.clientY };
    pressTimer = windowRef.setTimeout(() => {
      const start = pressStart;
      cancelLongPress();
      if (start) openAt(start.x, start.y);
    }, LONG_PRESS_MS);
  }
  const onPointerMove = (event) => {
    if (
      pressStart &&
      Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) >
        CLICK_TOLERANCE_PX * 2
    )
      cancelLongPress();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && !backdrop.hidden) {
      event.stopPropagation();
      hide();
    }
  };
  const onBackdropClick = (event) => {
    if (event.target === backdrop) hide();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', cancelLongPress);
  canvas.addEventListener('pointercancel', cancelLongPress);
  canvas.addEventListener('contextmenu', onContextMenu);
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', onBackdropClick);
  documentRef.addEventListener('keydown', onKeyDown, true);

  return () => {
    hide();
    cancelLongPress();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', cancelLongPress);
    canvas.removeEventListener('pointercancel', cancelLongPress);
    canvas.removeEventListener('contextmenu', onContextMenu);
    close.removeEventListener('click', hide);
    backdrop.removeEventListener('click', onBackdropClick);
    documentRef.removeEventListener('keydown', onKeyDown, true);
    backdrop.remove();
  };
}
