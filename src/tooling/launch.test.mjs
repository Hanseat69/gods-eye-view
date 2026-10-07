import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_PORT,
  browserCommand,
  findFreePort,
  isPortFree,
  launchUrl,
  needsInstall,
  parseLaunchArgs,
} from '../../scripts/launch.mjs';

const root = new URL('../../', import.meta.url);

test('launcher arguments parse in both forms and report the rest', () => {
  assert.deepEqual(parseLaunchArgs([]), {
    lang: null,
    port: DEFAULT_PORT,
    open: true,
    unknown: [],
  });
  assert.deepEqual(
    parseLaunchArgs(['--lang', 'de', '--port=4200', '--no-open']),
    {
      lang: 'de',
      port: 4200,
      open: false,
      unknown: [],
    },
  );
  assert.deepEqual(parseLaunchArgs(['--port', '0', '--verbose']).unknown, [
    '--port',
    '--verbose',
  ]);
});

test('dependencies install when missing or older than the lockfile', () => {
  const times = (lock, installed) => (file) =>
    file.endsWith(path.join('node_modules', '.package-lock.json'))
      ? installed
      : lock;
  const present = () => true;
  assert.equal(
    needsInstall({ root: '/r', hasDependencies: () => false }),
    true,
  );
  assert.equal(
    needsInstall({
      root: '/r',
      hasDependencies: present,
      modifiedAt: times(1, 2),
    }),
    false,
  );
  assert.equal(
    needsInstall({
      root: '/r',
      hasDependencies: present,
      modifiedAt: times(3, 2),
    }),
    true,
  );
  assert.equal(
    needsInstall({
      root: '/r',
      hasDependencies: present,
      modifiedAt: times(3, null),
    }),
    true,
  );
  assert.equal(
    needsInstall({
      root: '/r',
      hasDependencies: present,
      modifiedAt: times(null, null),
    }),
    false,
  );
});

test('the first free port is chosen and the search is bounded', async () => {
  const busy = new Set([4173, 4174]);
  assert.equal(await findFreePort(4173, async (port) => !busy.has(port)), 4175);
  assert.equal(await findFreePort(4173, async () => false), null);
});

test('a bound port is reported busy', async () => {
  const net = await import('node:net');
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    assert.equal(await isPortFree(server.address().port), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('the opened address is loopback and carries the language only when asked', () => {
  assert.equal(launchUrl(4173, null), 'http://127.0.0.1:4173/');
  assert.equal(launchUrl(4180, 'de'), 'http://127.0.0.1:4180/?lang=de');
});

test('each platform opens the browser with its own command', () => {
  const url = 'http://127.0.0.1:4173/?lang=de';
  assert.deepEqual(browserCommand(url, 'win32'), {
    command: 'cmd',
    args: ['/c', 'start', '""', url],
  });
  assert.deepEqual(browserCommand(url, 'darwin'), {
    command: 'open',
    args: [url],
  });
  assert.deepEqual(browserCommand(url, 'linux'), {
    command: 'xdg-open',
    args: [url],
  });
});

test('the double-click launchers run the launcher and are checked out correctly', () => {
  const read = (name) => readFileSync(new URL(name, root), 'utf8');
  assert.match(read('start.sh'), /node scripts\/launch\.mjs --lang de "\$@"/);
  assert.match(
    read('Start-Mac.command'),
    /exec "\$\(dirname "\$0"\)\/start\.sh"/,
  );
  assert.match(
    read('Start-Windows.bat'),
    /node scripts\\launch\.mjs --lang de %\*/,
  );
  assert.match(read('.gitattributes'), /^\*\.bat text eol=crlf$/m);
  assert.equal(
    JSON.parse(read('package.json')).scripts.start,
    'node scripts/launch.mjs',
  );
  if (process.platform !== 'win32')
    for (const name of ['start.sh', 'Start-Mac.command', 'scripts/launch.mjs'])
      assert.ok(
        statSync(new URL(name, root)).mode & 0o111,
        `${name} must be executable`,
      );
});
