import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { CATALOGS, LOCALE_NAMES, OWNED_PREFIXES } from './catalogs.js';
import { KEY_SETUP_KEYS } from '../keySetupCore.mjs';
import {
  ENVIRONMENTAL_LABEL_CHOICE,
  FIRST_RUN_MISSIONS,
  environmentalLabel,
} from '../firstRunExperience.js';
import { parseAttributeKeys } from './index.js';

const EN = CATALOGS.en;
const templatesDir = new URL('../ui/templates/', import.meta.url);
const templates = readdirSync(templatesDir)
  .filter((name) => name.endsWith('.html'))
  .map((name) => ({
    name,
    html: readFileSync(new URL(name, templatesDir), 'utf8'),
  }));

const placeholders = (text) =>
  [...String(text).matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();

test('every locale has a name and only keys the English catalog defines', () => {
  for (const [locale, catalog] of Object.entries(CATALOGS)) {
    assert.ok(LOCALE_NAMES[locale], `${locale} needs a picker name`);
    for (const [key, value] of Object.entries(catalog)) {
      const owned = OWNED_PREFIXES.some((prefix) => key.startsWith(prefix));
      assert.ok(
        Object.hasOwn(EN, key) || owned,
        `${locale} adds unknown key ${key}`,
      );
      if (owned) {
        assert.ok(!Object.hasOwn(EN, key), `${key}: owned text is not copied`);
        continue;
      }
      assert.equal(typeof value, 'string', `${locale}:${key}`);
      assert.ok(value.trim(), `${locale}:${key} is empty`);
      assert.deepEqual(
        placeholders(value),
        placeholders(EN[key]),
        `${locale}:${key} must keep the English placeholders`,
      );
    }
  }
});

test('marked template text is the English catalog text', () => {
  let marked = 0;
  for (const { name, html } of templates) {
    const all = html.match(/\sdata-i18n="/g)?.length || 0;
    // Only leaf elements are translated: a marked element's text is replaced
    // whole, so it must not contain markup that would be lost.
    const leaves = [
      ...html.matchAll(
        /<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>([^<]*)<\/\1>/g,
      ),
    ];
    assert.equal(leaves.length, all, `${name}: data-i18n on a non-leaf`);
    for (const [, , key, text] of leaves) {
      assert.ok(Object.hasOwn(EN, key), `${name}: unknown key ${key}`);
      assert.equal(text, EN[key], `${name}: ${key} drifted from the catalog`);
      marked += 1;
    }
    for (const [tag] of html.matchAll(
      /<[a-z0-9]+\b[^>]*data-i18n-attr="[^"]*"[^>]*>/g,
    )) {
      const [, spec] = tag.match(/data-i18n-attr="([^"]*)"/);
      const pairs = parseAttributeKeys(spec);
      assert.ok(pairs.length, `${name}: empty data-i18n-attr`);
      for (const { attribute, key } of pairs) {
        assert.ok(Object.hasOwn(EN, key), `${name}: unknown key ${key}`);
        const [, value] =
          tag.match(new RegExp(`\\s${attribute}="([^"]*)"`)) || [];
        assert.equal(
          value,
          EN[key],
          `${name}: ${attribute} drifted from ${key}`,
        );
        marked += 1;
      }
    }
  }
  assert.ok(marked > 0, 'templates carry translatable text');
});

test('text owned by modules matches its English catalog entry', () => {
  for (const key of KEY_SETUP_KEYS) {
    assert.equal(
      EN[`keySetup.unlocks.${key.id}`],
      key.unlocks,
      `registry text for ${key.id} drifted from the catalog`,
    );
  }
  for (const [choice, mission] of Object.entries(FIRST_RUN_MISSIONS)) {
    if (!mission.busyText) continue;
    assert.equal(EN[`firstRun.busy.${choice}`], mission.busyText, choice);
  }
  assert.equal(
    EN[`firstRun.environmentalLabel.${ENVIRONMENTAL_LABEL_CHOICE}`],
    environmentalLabel().title,
  );
});

test('every literal key the adopting modules ask for exists', () => {
  for (const file of [
    '../keySetup.js',
    '../firstRunExperience.js',
    '../ui/panelChrome.js',
    '../ui/visualSettings.js',
    '../ui/layerPanel.js',
    '../voice/control.js',
    '../voice/realtimeController.js',
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const [, key] of source.matchAll(/\bt\(\s*'([^']+)'/g))
      assert.ok(
        Object.hasOwn(EN, key) ||
          OWNED_PREFIXES.some((prefix) => key.startsWith(prefix)),
        `${file} asks for unknown key ${key}`,
      );
    for (const [, key] of source.matchAll(
      /'((?:keySetup|firstRun|panel|display|voice)\.[\w.-]+)'/g,
    ))
      assert.ok(Object.hasOwn(EN, key), `${file} names unknown key ${key}`);
  }
});
