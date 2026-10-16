#!/usr/bin/env node
/**
 * One-step local start: check Node, install dependencies when they are
 * missing or older than the lockfile, pick a free local port, start the
 * server on loopback and open the browser.
 *
 *   node scripts/launch.mjs [--lang de] [--port 4173] [--no-open] [--fast]
 *
 * Without `--fast` the Vite dev server runs: about 760 unbundled module
 * requests on first load, but Provider Settings (POWER UP) is available.
 * With `--fast` the production build is served instead (about 50 requests,
 * roughly three times faster to first paint); it is rebuilt only when the
 * sources, the lockfile or the `.env` keys are newer than the last build.
 *
 * The double-click launchers in the repository root (Start-Windows.bat,
 * Start-Mac.command, start.sh) call this with `--lang de --fast`;
 * Start-Windows-Einrichtung.bat starts the dev server for setup. Messages are
 * German because those launchers are written for a German-speaking user.
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(MODULE_PATH), '..');
const HOST = '127.0.0.1';
export const DEFAULT_PORT = 4173;
const PORT_ATTEMPTS = 30;

/**
 * Read the launcher's arguments. Unknown arguments are reported, not ignored.
 * @param {string[]} argv
 * @returns {{lang: string|null, port: number, open: boolean, fast: boolean,
 *   unknown: string[]}}
 */
export function parseLaunchArgs(argv) {
  const options = {
    lang: null,
    port: DEFAULT_PORT,
    open: true,
    fast: false,
    unknown: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inline] = arg.split('=', 2);
    const value = () => inline ?? argv[(index += 1)];
    if (name === '--lang') options.lang = String(value() ?? '').trim() || null;
    else if (name === '--port') {
      const port = Number.parseInt(value(), 10);
      if (Number.isInteger(port) && port > 0 && port < 65536)
        options.port = port;
      else options.unknown.push(arg);
    } else if (name === '--no-open') options.open = false;
    else if (name === '--fast') options.fast = true;
    else if (name === '--dev') options.fast = false;
    else options.unknown.push(arg);
  }
  return options;
}

/**
 * Whether `npm ci` must run: dependencies are missing, or the lockfile is
 * newer than the install npm recorded (for example after `git pull`).
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {(root: string) => boolean} options.hasDependencies
 * @param {(file: string) => number|null} [options.modifiedAt]
 * @returns {boolean}
 */
export function needsInstall({
  root = ROOT,
  hasDependencies,
  modifiedAt = modifiedAtOrNull,
}) {
  if (!hasDependencies(root)) return true;
  const lock = modifiedAt(path.join(root, 'package-lock.json'));
  const installed = modifiedAt(
    path.join(root, 'node_modules', '.package-lock.json'),
  );
  return lock !== null && (installed === null || lock > installed);
}

/** Inputs of the production build, relative to the repository root. */
export const BUILD_INPUTS = [
  'src',
  'public',
  'build',
  'server/standalone/vite.config.js',
  'index.html',
  'style.css',
  'vite.config.js',
  'package-lock.json',
  // The browser keys from `.env` are written into the build.
  '.env',
  '.env.local',
];

function modifiedAtOrNull(file) {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return null;
  }
}

/** Newest modification time below a file or directory, or null. */
function newestModification(target) {
  let stats;
  try {
    stats = statSync(target);
  } catch {
    return null;
  }
  if (!stats.isDirectory()) return stats.mtimeMs;
  let newest = stats.mtimeMs;
  for (const entry of readdirSync(target)) {
    const time = newestModification(path.join(target, entry));
    if (time !== null && time > newest) newest = time;
  }
  return newest;
}

/**
 * Whether the production build in `dist/` is missing or older than any of
 * its inputs.
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {(file: string) => number|null} [options.builtAt] Time of the build.
 * @param {(target: string) => number|null} [options.newestInput]
 * @returns {boolean}
 */
export function needsBuild({
  root = ROOT,
  builtAt = modifiedAtOrNull,
  newestInput = newestModification,
} = {}) {
  const built = builtAt(path.join(root, 'dist', 'index.html'));
  if (built === null) return true;
  return BUILD_INPUTS.some((input) => {
    const time = newestInput(path.join(root, input));
    return time !== null && time > built;
  });
}

/**
 * @param {number} port
 * @param {string} [host]
 * @returns {Promise<boolean>} Whether the port can be bound right now.
 */
export function isPortFree(port, host = HOST) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, host);
  });
}

/**
 * @param {number} start
 * @param {(port: number) => Promise<boolean>} [isFree]
 * @returns {Promise<number|null>} The first free port from `start`, or null.
 */
export async function findFreePort(start, isFree = isPortFree) {
  for (let port = start; port < start + PORT_ATTEMPTS && port < 65536; port++)
    if (await isFree(port)) return port;
  return null;
}

/**
 * @param {number} port
 * @param {string|null} lang
 * @returns {string} The address to open.
 */
export function launchUrl(port, lang) {
  const url = new URL(`http://${HOST}:${port}/`);
  if (lang) url.searchParams.set('lang', lang);
  return url.href;
}

/**
 * The command that opens an address in the default browser.
 * @param {string} url
 * @param {string} [platform]
 * @returns {{command: string, args: string[]}}
 */
export function browserCommand(url, platform = process.platform) {
  if (platform === 'win32')
    // `start` is a cmd built-in; the empty string is its window title.
    return { command: 'cmd', args: ['/c', 'start', '""', url] };
  if (platform === 'darwin') return { command: 'open', args: [url] };
  return { command: 'xdg-open', args: [url] };
}

function openBrowser(url) {
  const { command, args } = browserCommand(url);
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: process.platform === 'win32',
    });
    child.once('error', () =>
      console.log(`Browser bitte selbst öffnen: ${url}`),
    );
    child.unref();
  } catch {
    console.log(`Browser bitte selbst öffnen: ${url}`);
  }
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function launch() {
  const options = parseLaunchArgs(process.argv.slice(2));
  if (options.unknown.length)
    fail(`Unbekannte Angabe: ${options.unknown.join(' ')}`);

  // Checked before importing the doctor, which needs a current Node itself.
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 24)
    fail(
      `Node.js ${process.versions.node} ist zu alt. Bitte Node.js 24 LTS von https://nodejs.org installieren.`,
    );
  const { classifyNodeVersion, hasRequiredDependencies, npmProcessSpec } =
    await import('./setup-doctor.mjs');
  const node = classifyNodeVersion();
  if (node.level === 'error')
    fail(
      `Node.js ${process.versions.node} wird nicht unterstützt (${node.summary}).`,
    );
  if (node.level === 'warn')
    console.log(`⚠ Node.js ${process.versions.node}: ${node.summary}`);

  if (needsInstall({ hasDependencies: hasRequiredDependencies })) {
    console.log('▶ Abhängigkeiten werden installiert (npm ci) …');
    const npm = npmProcessSpec();
    const result = spawnSync(npm.command, ['ci', '--no-audit', '--no-fund'], {
      cwd: ROOT,
      // The browser download is only needed by the QA scripts.
      env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1' },
      shell: npm.shell,
      stdio: 'inherit',
    });
    if (result.error || result.status !== 0)
      fail('Die Installation ist fehlgeschlagen. Siehe Meldungen oben.');
  }

  const port = await findFreePort(options.port);
  if (port === null) fail(`Kein freier Port ab ${options.port} gefunden.`);
  if (port !== options.port)
    console.log(`ℹ Port ${options.port} ist belegt, nutze ${port}.`);

  process.chdir(ROOT);
  const vite = await import('vite');
  let server;
  if (options.fast && needsBuild()) {
    console.log('▶ Optimierte Fassung wird gebaut (einmalig, ca. 1 Minute) …');
    try {
      await vite.build({ root: ROOT, logLevel: 'warn' });
    } catch (error) {
      console.log(
        `⚠ Bauen fehlgeschlagen (${error?.message || error}).\n` +
          '  Starte stattdessen im Einrichtungsmodus.',
      );
      options.fast = false;
    }
  }
  if (options.fast) {
    console.log('▶ God’s Eye View wird gestartet (Schnellstart) …');
    server = await vite.preview({
      root: ROOT,
      preview: { host: HOST, port, strictPort: true, open: false },
    });
  } else {
    console.log('▶ God’s Eye View wird gestartet (Einrichtungsmodus) …');
    server = await vite.createServer({
      root: ROOT,
      server: { host: HOST, port, strictPort: true, open: false },
    });
    await server.listen();
  }
  const url = launchUrl(port, options.lang);
  console.log(`\n✔ Läuft unter ${url}`);
  if (options.fast)
    console.log(
      '  Schlüssel eintragen (POWER UP) geht nur im Einrichtungsmodus:\n' +
        '  Start-Windows-Einrichtung.bat bzw. ./start.sh --dev',
    );
  console.log('  Zum Beenden dieses Fenster schließen oder Strg+C drücken.\n');
  if (options.open) openBrowser(url);

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      await server.close();
      process.exit(0);
    });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_PATH) {
  launch().catch((error) => fail(error?.message || String(error)));
}
