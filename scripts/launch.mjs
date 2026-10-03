#!/usr/bin/env node
/**
 * One-step local start: check Node, install dependencies when they are
 * missing or older than the lockfile, pick a free local port, start the dev
 * server on loopback and open the browser.
 *
 *   node scripts/launch.mjs [--lang de] [--port 4173] [--no-open]
 *
 * The double-click launchers in the repository root (Start-Windows.bat,
 * Start-Mac.command, start.sh) call this with `--lang de`. Messages are
 * German because those launchers are written for a German-speaking user.
 */
import { spawn, spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
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
 * @returns {{lang: string|null, port: number, open: boolean, unknown: string[]}}
 */
export function parseLaunchArgs(argv) {
  const options = { lang: null, port: DEFAULT_PORT, open: true, unknown: [] };
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
  modifiedAt = (file) => {
    try {
      return statSync(file).mtimeMs;
    } catch {
      return null;
    }
  },
}) {
  if (!hasDependencies(root)) return true;
  const lock = modifiedAt(path.join(root, 'package-lock.json'));
  const installed = modifiedAt(
    path.join(root, 'node_modules', '.package-lock.json'),
  );
  return lock !== null && (installed === null || lock > installed);
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

  console.log('▶ God’s Eye View wird gestartet …');
  process.chdir(ROOT);
  const { createServer } = await import('vite');
  const server = await createServer({
    root: ROOT,
    server: { host: HOST, port, strictPort: true, open: false },
  });
  await server.listen();
  const url = launchUrl(port, options.lang);
  console.log(`\n✔ Läuft unter ${url}`);
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
