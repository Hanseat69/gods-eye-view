import { t } from '../i18n/index.js';
import { localReceiverFeedName } from '../layers/localAdsb/feedNames.js';

/**
 * Pure presentation of the Local RTL-SDR card in the Radio panel. Receives the
 * receiver session snapshot and returns what each control should show.
 */

// src/sdr/controller.js reports its status in English; it is put into the
// interface language here, where it is shown.
const SDR_MESSAGE_KEYS = Object.freeze({
  'Connect an RTL-SDR to begin.': 'sdr.msg.begin',
  'WebUSB is unavailable in this browser': 'sdr.msg.noWebUsb',
  'No RTL-SDR device selected': 'sdr.msg.noDevice',
  'WebUSB requires desktop Chrome or Edge on localhost/HTTPS':
    'sdr.msg.needsChromeHttps',
  'RTL-SDR access failed; close other SDR apps and check USB permissions':
    'sdr.msg.accessFailed',
  'RTL-SDR connection failed': 'sdr.msg.connectFailed',
  'Receiving 1090 MHz ADS-B': 'sdr.msg.receivingAdsb',
  'Receiving broadcast FM': 'sdr.msg.receivingFm',
  'SDR decoder worker failed': 'sdr.msg.workerFailed',
  'WebUSB requires desktop Chrome or Edge': 'sdr.msg.needsChrome',
  'Waiting for an RTL-SDR device…': 'sdr.msg.waiting',
  'RTL-SDR sample stream stopped': 'sdr.msg.streamStopped',
  'Switching to ADS-B…': 'sdr.msg.switchAdsb',
  'Switching to FM…': 'sdr.msg.switchFm',
  'RTL-SDR gain change failed': 'sdr.msg.gainFailed',
  'Seeking up…': 'sdr.msg.seekUp',
  'Seeking down…': 'sdr.msg.seekDown',
  'No FM signal found': 'sdr.msg.noSignal',
  'Seek stopped': 'sdr.msg.seekStopped',
  'Browser location is unavailable': 'sdr.msg.noLocation',
  'Receiver location was not granted': 'sdr.msg.locationDenied',
  'RTL-SDR disconnected': 'sdr.msg.disconnected',
});
const SDR_STATE_KEYS = Object.freeze({
  idle: 'sdr.state.idle',
  unsupported: 'sdr.state.unsupported',
  connecting: 'sdr.state.connecting',
  tuning: 'sdr.state.tuning',
  error: 'sdr.state.error',
  disconnected: 'sdr.state.disconnected',
});

/** @param {string} message @returns {string} */
export function localizeSdrMessage(message) {
  const key = SDR_MESSAGE_KEYS[message];
  return key ? t(key) : message || '';
}

function stateLabel(status) {
  const key = SDR_STATE_KEYS[status];
  return key ? t(key) : String(status || 'idle').toUpperCase();
}

function formatGain(gain) {
  return gain === 'auto' || !Number.isFinite(gain) ? 'auto' : gain.toFixed(1);
}

function formatIq(state) {
  return Number.isFinite(state.iqLevelDbfs)
    ? `${state.iqLevelDbfs.toFixed(1)} dBFS`
    : '--';
}

function statusText(state) {
  const fmActive = state.mode === 'fm';
  const iqStatus =
    state.samplesPerSecond > 0
      ? `${(state.samplesPerSecond / 1_000_000).toFixed(2)} MS/s IQ`
      : t('sdr.detail.waitingIq');
  const device = state.deviceLabel ? ` · ${state.deviceLabel}` : '';
  if (state.connected && !fmActive) {
    return `${localizeSdrMessage(state.message)}${device} · ${iqStatus} · ${t('sdr.detail.messages', { count: state.decodedMessages })}`;
  }
  const detail = localizeSdrMessage(
    state.seeking ? state.seekMessage : state.seekMessage || state.message,
  );
  if (state.connected && fmActive) {
    const workerStatus =
      state.workerBlocks > 0
        ? t('sdr.detail.dspBlocks', { count: state.workerBlocks })
        : t('sdr.detail.dspWaiting');
    const rfStatus = `RF ${formatIq(state)}`;
    const audioSignal = Number.isFinite(state.audioLevelDbfs)
      ? t('sdr.detail.audioLevel', { level: state.audioLevelDbfs.toFixed(1) })
      : t('sdr.detail.audioSignal');
    return `${detail}${device} · ${iqStatus} · ${workerStatus} · ${rfStatus} · ${audioSignal} · ${t('sdr.detail.audioState', { state: state.audioState })}`;
  }
  return detail;
}

/**
 * Derive the card's control states from one receiver snapshot.
 * @param {object} state SdrController.getState() snapshot.
 * @returns {object} Control presentation.
 */
export function localSdrCardView(state) {
  const transitional =
    state.status === 'connecting' || state.status === 'tuning';
  const fmActive = state.mode === 'fm';
  const adsbActive = state.mode === 'adsb';
  const fmInteractive =
    state.connected && fmActive && state.status === 'streaming';
  return {
    connectionLabel: state.connected
      ? adsbActive
        ? t('sdr.heard', { count: state.aircraftHeard || 0 })
        : t('sdr.streaming')
      : stateLabel(state.status),
    connectionActive: Boolean(state.connected),
    connectLabel: transitional
      ? stateLabel(state.status)
      : state.connected
        ? t('sdr.disconnect')
        : t('sdr.connect'),
    connectDisabled: transitional || !state.webUsbSupported,
    connectPressed: Boolean(state.connected),
    fmActive,
    adsbActive,
    modeDisabled: transitional,
    locateLabel:
      state.locationStatus === 'requesting'
        ? t('sdr.locating')
        : state.locationStatus === 'ready'
          ? t('sdr.located')
          : t('sdr.locate'),
    locateDisabled: state.locationStatus === 'requesting',
    locateActive: state.locationStatus === 'ready',
    changeDeviceDisabled: transitional || !state.webUsbSupported,
    gainValue: formatGain(state.gain),
    gainDisabled: transitional,
    statsHidden: !(adsbActive && state.connected),
    stats: {
      rate: Number.isFinite(state.messagesPerSecond)
        ? state.messagesPerSecond.toFixed(1)
        : '--',
      heard: String(state.aircraftHeard || 0),
      positioned: String(state.aircraftPositioned || 0),
      iq: formatIq(state),
    },
    frequencyDisabled: !fmActive || transitional,
    frequencyValue: fmActive
      ? (state.frequencyHz / 1_000_000).toFixed(1)
      : null,
    tuneDisabled: !state.connected || !fmActive || transitional,
    seekDisabled: !fmInteractive || Boolean(state.seeking),
    volumePercent: Math.round((Number(state.volume) || 0) * 100),
    volumeDisabled: !fmActive,
    statusText: statusText(state),
    statusError: state.status === 'error' || state.status === 'unsupported',
  };
}

/**
 * Whether the receiver is producing FM audio (the state that must not overlap
 * internet-radio playback).
 * @param {object} state SdrController.getState() snapshot.
 * @returns {boolean}
 */
export function localSdrFmAudioActive(state) {
  return Boolean(
    state?.connected && state.mode === 'fm' && state.status === 'streaming',
  );
}

/**
 * Whether internet radio is loading or playing a station.
 * @param {object} state Radio UI state.
 * @returns {boolean}
 */
export function internetRadioAudioActive(state) {
  return ['loading', 'buffering', 'playing'].includes(state?.audioState);
}

/**
 * One-line decoder-feed summary for the card, or null when the server has no
 * feed configured. Statuses show while Local ADS-B polls the feeds; otherwise
 * the line names the configured bands.
 * @param {object|null} feedState Local receiver feed session snapshot.
 * @returns {string|null}
 */
export function localSdrFeedLine(feedState) {
  const feeds = feedState?.configured === true ? feedState.feeds : null;
  if (!Array.isArray(feeds) || !feeds.length) return null;
  const names = feeds.map((feed) => {
    const name = localReceiverFeedName(feed, feeds);
    return feedState.polling || feed?.status === 'invalid'
      ? `${name} ${feed?.status || 'unreachable'}`
      : name;
  });
  const suffix = feedState.polling ? '' : ' · read while Local ADS-B is on';
  return `Decoder feeds: ${names.join(' · ')}${suffix}`;
}
