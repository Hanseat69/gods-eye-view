import { t } from '../i18n/index.js';
import { aircraftLinks, vesselLinks } from '../data/contactLinks.js';
import { getContextStore } from '../data/contextStore.js';

/**
 * Contact details card: a photo and outbound links for the selected aircraft
 * or vessel. It listens to the selection events the layers already publish
 * and reads their shared context record, so no layer depends on it.
 *
 * Aircraft photos come from Planespotters.net through the local
 * `/api/aircraft-photo` proxy and always show their photographer and photo
 * page, as Planespotters requires. There is no openly licensed vessel photo
 * source, so vessels get links only. Owner and operator-of-record data is
 * deliberately not shown.
 */

const AIRCRAFT_LAYERS = new Set(['flights', 'military']);
const VESSEL_LAYER = 'ais-live-vessels';
const REFRESH_MS = 4000;

/** Plain text of a context property, or ''. */
const text = (value) =>
  value === null || value === undefined ? '' : String(value).trim();

/**
 * Describe the selection for the card. Pure, exported for tests.
 * @param {{kind: 'aircraft'|'vessel', id: string, label?: string}} subject
 * @param {object|null} context The shared context record, when present.
 * @returns {{title: string, lines: string[], links: Array<object>,
 *   photoHex: string|null}}
 */
export function describeContact(subject, context) {
  const props = context?.properties || {};
  if (subject.kind === 'aircraft') {
    const hex = text(props.icao24 || subject.id).toLowerCase();
    const callsign = text(props.callsign);
    const registration = text(props.registration);
    const lines = [
      text(props.type),
      [
        registration && t('contact.registration', { value: registration }),
        callsign && t('contact.callsign', { value: callsign }),
      ]
        .filter(Boolean)
        .join(' · '),
      text(props.operator),
      text(props.route) && t('contact.route', { value: text(props.route) }),
      hex && t('contact.hex', { value: hex.toUpperCase() }),
    ].filter(Boolean);
    return {
      title: text(context?.label || subject.label || callsign || hex),
      lines,
      links: aircraftLinks({ hex, callsign, registration }),
      photoHex: /^[0-9a-f]{6}$/.test(hex) ? hex : null,
    };
  }
  const mmsi = text(props.mmsi);
  const imo = text(props.imo);
  const lines = [
    text(props.type),
    [
      mmsi && t('contact.mmsi', { value: mmsi }),
      imo && t('contact.imo', { value: imo }),
    ]
      .filter(Boolean)
      .join(' · '),
    text(props.destination) &&
      t('contact.destination', { value: text(props.destination) }),
  ].filter(Boolean);
  return {
    title: text(context?.label || subject.label || mmsi),
    lines,
    links: vesselLinks({ mmsi, imo }),
    photoHex: null,
  };
}

function element(documentRef, tag, className, textContent) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

/**
 * Mount the card and subscribe to selection events.
 * @param {object} [options]
 * @param {Document} [options.documentRef]
 * @param {Window} [options.windowRef]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(id: string) => object|null} [options.readContext]
 * @returns {() => void} Unmounts the card and removes every listener.
 */
export function startContactDetails({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  fetchImpl = (...args) => globalThis.fetch(...args),
  readContext = (id) => getContextStore().entities.get(id) || null,
} = {}) {
  if (!documentRef?.body || !windowRef?.addEventListener) return () => {};

  const root = element(documentRef, 'aside', 'contact-details');
  root.id = 'contact-details';
  root.hidden = true;
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-label', t('contact.label'));
  const header = element(documentRef, 'div', 'contact-details-header');
  const title = element(documentRef, 'strong', 'contact-details-title');
  const close = element(documentRef, 'button', 'contact-details-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', t('contact.close'));
  header.append(title, close);
  const photo = element(documentRef, 'figure', 'contact-details-photo');
  const facts = element(documentRef, 'div', 'contact-details-facts');
  const links = element(documentRef, 'nav', 'contact-details-links');
  links.setAttribute('aria-label', t('contact.links'));
  root.append(header, photo, facts, links);
  documentRef.body.append(root);

  let subject = null;
  let photoHex = null;
  let photoController = null;
  let refreshTimer = null;
  let signature = '';

  const showPhotoMessage = (message) => {
    photo.replaceChildren(
      element(documentRef, 'figcaption', 'contact-details-note', message),
    );
  };

  const loadPhoto = (hex) => {
    if (hex === photoHex) return;
    photoHex = hex;
    photoController?.abort();
    photoController = null;
    if (!hex) {
      showPhotoMessage(
        subject?.kind === 'vessel' ? t('contact.vesselPhoto') : '',
      );
      photo.hidden = subject?.kind !== 'vessel';
      return;
    }
    photo.hidden = false;
    showPhotoMessage(t('contact.photoLoading'));
    const controller = new AbortController();
    photoController = controller;
    Promise.resolve()
      .then(() =>
        fetchImpl(`/api/aircraft-photo/${hex}`, { signal: controller.signal }),
      )
      .then((response) => (response?.ok ? response.json() : null))
      .then((result) => {
        if (controller.signal.aborted || hex !== photoHex) return;
        if (!result?.found || !result.thumbnail || !result.link) {
          showPhotoMessage(t('contact.noPhoto'));
          return;
        }
        const anchor = element(documentRef, 'a', 'contact-details-photo-link');
        anchor.href = result.link;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        const image = element(documentRef, 'img');
        image.src = result.thumbnail;
        image.alt = t('contact.photoAlt', { title: title.textContent });
        image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer';
        if (result.width) image.width = result.width;
        if (result.height) image.height = result.height;
        anchor.append(image);
        const caption = element(
          documentRef,
          'figcaption',
          'contact-details-credit',
          result.photographer
            ? t('contact.photoCredit', { name: result.photographer })
            : t('contact.photoSource'),
        );
        photo.replaceChildren(anchor, caption);
      })
      .catch(() => {
        if (!controller.signal.aborted && hex === photoHex)
          showPhotoMessage(t('contact.noPhoto'));
      });
  };

  const render = () => {
    if (!subject) return;
    const described = describeContact(subject, readContext(subject.contextId));
    const next = JSON.stringify(described);
    if (next !== signature) {
      signature = next;
      title.textContent = described.title;
      facts.replaceChildren(
        ...described.lines.map((line) =>
          element(documentRef, 'div', 'contact-details-line', line),
        ),
      );
      links.replaceChildren(
        ...described.links.map((link) => {
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
    }
    loadPhoto(described.photoHex);
    root.hidden = false;
  };

  const show = (next) => {
    subject = next;
    signature = '';
    photoHex = undefined;
    // The tracking layers publish their context record right after the
    // selection event, so read it on the next microtask.
    queueMicrotask(render);
    windowRef.clearInterval(refreshTimer);
    refreshTimer = windowRef.setInterval(render, REFRESH_MS);
  };

  const hide = () => {
    subject = null;
    photoController?.abort();
    photoController = null;
    photoHex = null;
    windowRef.clearInterval(refreshTimer);
    refreshTimer = null;
    root.hidden = true;
  };

  const onAwarenessSelected = (event) => {
    const detail = event?.detail;
    if (!AIRCRAFT_LAYERS.has(detail?.layerId) || !detail?.id) return;
    show({
      kind: 'aircraft',
      layerId: detail.layerId,
      id: String(detail.id),
      contextId: String(detail.id),
      label: text(detail.label),
    });
  };
  const onAwarenessCleared = (event) => {
    const detail = event?.detail;
    if (subject?.layerId !== detail?.layerId) return;
    if (detail?.id && String(detail.id) !== subject.id) return;
    hide();
  };
  const onEntitySelected = (event) => {
    const record = event?.detail;
    if (record?.layerId !== VESSEL_LAYER || !record?.id) return;
    show({
      kind: 'vessel',
      layerId: VESSEL_LAYER,
      id: String(record.id),
      contextId: String(record.id),
      label: text(record.label),
    });
  };
  const onEntityCleared = (event) => {
    if (subject?.kind === 'vessel' && event?.detail?.layerId === VESSEL_LAYER)
      hide();
  };

  close.addEventListener('click', hide);
  windowRef.addEventListener(
    'gev:awareness-subject-selected',
    onAwarenessSelected,
  );
  windowRef.addEventListener(
    'gev:awareness-subject-cleared',
    onAwarenessCleared,
  );
  windowRef.addEventListener('gev:entity-selected', onEntitySelected);
  windowRef.addEventListener('gev:entity-selection-cleared', onEntityCleared);

  return () => {
    hide();
    close.removeEventListener('click', hide);
    windowRef.removeEventListener(
      'gev:awareness-subject-selected',
      onAwarenessSelected,
    );
    windowRef.removeEventListener(
      'gev:awareness-subject-cleared',
      onAwarenessCleared,
    );
    windowRef.removeEventListener('gev:entity-selected', onEntitySelected);
    windowRef.removeEventListener(
      'gev:entity-selection-cleared',
      onEntityCleared,
    );
    root.remove();
  };
}
