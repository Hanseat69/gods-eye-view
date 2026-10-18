import { t } from '../i18n/index.js';

/**
 * The photo block shared by the contact details card and the object details
 * dialog. Aircraft: Planespotters first (`/api/aircraft-photo`), then
 * Wikimedia Commons by registration and type. Vessels: Commons by IMO number,
 * noting an earlier name when the photo shows one. Every photo carries the
 * credit its source requires; an image the browser cannot load becomes a link
 * to its photo page.
 */

function element(documentRef, tag, className, textContent) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

/**
 * @param {object} options
 * @param {Document} options.documentRef
 * @param {typeof fetch} options.fetchImpl
 * @param {HTMLElement} options.figure Element the photo is drawn into.
 * @param {() => string} options.getTitle Name of the object, for alt text.
 * @returns {{load: (request: object|null) => void, reset: () => void,
 *   abort: () => void}}
 */
export function createContactPhoto({
  documentRef,
  fetchImpl,
  figure,
  getTitle,
}) {
  let photoKey = null;
  let photoController = null;

  const showPhotoMessage = (message) => {
    figure.replaceChildren(
      element(documentRef, 'figcaption', 'contact-details-note', message),
    );
  };

  const fetchJson = (url, signal) =>
    Promise.resolve()
      .then(() => fetchImpl(url, { signal }))
      .then((response) => (response?.ok ? response.json() : null));

  /** A link that opens in a new tab without handing over this window. */
  const outboundLink = (className, label, href) => {
    const anchor = element(documentRef, 'a', className, label);
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    return anchor;
  };

  /**
   * Show one photo with its credit. An image the browser cannot load
   * (blocked, offline, removed) becomes a plain link to the photo page.
   */
  const showPhoto = (key, result, { credit, note, openLabel }) => {
    const caption = element(
      documentRef,
      'figcaption',
      'contact-details-credit',
    );
    caption.append(...credit);
    const anchor = outboundLink('contact-details-photo-link', '', result.link);
    const image = element(documentRef, 'img');
    image.alt = t('contact.photoAlt', { title: getTitle() });
    if (result.width) image.width = result.width;
    if (result.height) image.height = result.height;
    const extra = note
      ? [element(documentRef, 'div', 'contact-details-note', note)]
      : [];
    image.addEventListener('error', () => {
      if (key !== photoKey) return;
      figure.replaceChildren(
        element(
          documentRef,
          'div',
          'contact-details-note',
          t('contact.photoLoadFailed'),
        ),
        outboundLink('contact-details-photo-fallback', openLabel, result.link),
        ...extra,
        caption,
      );
    });
    image.src = result.thumbnail;
    anchor.append(image);
    figure.replaceChildren(anchor, ...extra, caption);
  };

  /** Credit line for a Wikimedia Commons file: author, licence, source. */
  const commonsCredit = (result) => {
    const parts = [
      documentRef.createTextNode(
        t('contact.commonsAuthor', {
          name: result.author || t('contact.commonsUnknownAuthor'),
        }),
      ),
      documentRef.createTextNode(' · '),
    ];
    parts.push(
      result.licenseUrl
        ? outboundLink(
            'contact-details-license',
            result.license,
            result.licenseUrl,
          )
        : documentRef.createTextNode(result.license),
    );
    parts.push(documentRef.createTextNode(' · Wikimedia Commons'));
    return parts;
  };

  const showCommons = (key, result) =>
    showPhoto(key, result, {
      credit: commonsCredit(result),
      note: result.formerName
        ? t('contact.formerName', { name: result.formerName })
        : '',
      openLabel: t('contact.photoOpenCommons'),
    });

  const loadPhoto = (request) => {
    const key = request ? JSON.stringify(request) : null;
    if (key === photoKey) return;
    photoKey = key;
    photoController?.abort();
    photoController = null;
    if (!request) {
      showPhotoMessage('');
      figure.hidden = true;
      return;
    }
    figure.hidden = false;
    if (request.kind === 'vessel' && !request.imo) {
      showPhotoMessage(t('contact.vesselNoImo'));
      return;
    }
    showPhotoMessage(t('contact.photoLoading'));
    const controller = new AbortController();
    photoController = controller;
    const current = () => !controller.signal.aborted && key === photoKey;
    const commonsUrl =
      request.kind === 'vessel'
        ? `/api/commons-photo/vessel/${request.imo}?name=${encodeURIComponent(request.name || '')}`
        : request.registration
          ? `/api/commons-photo/aircraft/${encodeURIComponent(request.registration)}?type=${encodeURIComponent(request.type || '')}`
          : null;

    const tryCommons = (unavailableBefore) => {
      if (!commonsUrl) {
        showPhotoMessage(
          t(unavailableBefore ? 'contact.photoUnavailable' : 'contact.noPhoto'),
        );
        return null;
      }
      return fetchJson(commonsUrl, controller.signal).then((result) => {
        if (!current()) return;
        if (result?.found && result.thumbnail && result.link) {
          showCommons(key, result);
          return;
        }
        const unavailable = unavailableBefore || result?.unavailable;
        showPhotoMessage(
          t(
            unavailable
              ? 'contact.photoUnavailable'
              : request.kind === 'vessel'
                ? 'contact.noVesselPhoto'
                : 'contact.noPhotoAnywhere',
          ),
        );
      });
    };

    const lookup =
      request.kind === 'vessel'
        ? tryCommons(false)
        : fetchJson(
            `/api/aircraft-photo/${request.hex}`,
            controller.signal,
          ).then((result) => {
            if (!current()) return;
            if (result?.found && result.thumbnail && result.link) {
              showPhoto(key, result, {
                credit: [
                  documentRef.createTextNode(
                    result.photographer
                      ? t('contact.photoCredit', { name: result.photographer })
                      : t('contact.photoSource'),
                  ),
                ],
                note: '',
                openLabel: t('contact.photoOpen'),
              });
              return;
            }
            return tryCommons(Boolean(result?.unavailable || !result));
          });
    Promise.resolve(lookup).catch(() => {
      if (current()) showPhotoMessage(t('contact.photoUnavailable'));
    });
  };

  return {
    /** Look for the photo of `request`; repeated requests are ignored. */
    load: loadPhoto,
    /** Forget the shown request so the next load starts over. */
    reset() {
      photoKey = undefined;
    },
    /** Stop a pending lookup and forget the request. */
    abort() {
      photoController?.abort();
      photoController = null;
      photoKey = null;
    },
  };
}
