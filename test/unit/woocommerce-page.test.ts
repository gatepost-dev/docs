// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PLUGIN_IMAGE, copyPluginImage } from '../../scripts/plugin-assets.ts';
import { examplesOf } from '../support/examples.ts';

const PAGE_PATH = 'src/content/docs/guides/woocommerce.md';
const PAGE = readFileSync(PAGE_PATH, 'utf8');
const plugin = (path: string): string => readFileSync(join('woocommerce', path), 'utf8');

// The files of the plugin that run in a shop. The tests of the plugin are not part of its source.
const PHP_FILES = execFileSync('git', ['-C', 'woocommerce', 'ls-files', 'src', '*.php'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter((path) => path.endsWith('.php') && !path.startsWith('tests/'));
const SOURCE = PHP_FILES.map(plugin).join('\n');
const README_TXT = plugin('readme.txt');
const README_MD = plugin('README.md');

const NAMES = Array.from(PAGE.matchAll(/`(_?gatepost_[a-z_]+)`/g), ([, name]) => name ?? '');
const SETTINGS = [
  'gatepost_postcode',
  'gatepost_wc_secret_key',
  'gatepost_wc_required',
  'gatepost_wc_legacy',
  'gatepost_wc_confirm',
  'gatepost_wc_remove_key',
];

describe('the WooCommerce page', () => {
  it('names the section, each setting and the order meta', () => {
    expect(new Set(NAMES)).toEqual(new Set([...SETTINGS, '_gatepost_postcode_check']));
  });

  it.each([...new Set(NAMES)])('names %s, which the plugin uses', (name) => {
    expect(SOURCE).toContain(`'${name}'`);
  });

  it.each(['accept', 'reject', 'level1', 'none'])(
    'names the value %s, which a setting takes',
    (v) => {
      expect(PAGE).toContain(`\`${v}\``);
      expect(SOURCE).toContain(`'${v}'`);
    },
  );

  it.each(['valid', 'invalid', 'unchecked', 'error'])(
    'names the check status %s, which the plugin has',
    (status) => {
      expect(PAGE).toContain(`\`${status}\``);
      expect(plugin('src/CheckStatus.php')).toContain(`= '${status}';`);
    },
  );

  it('names the menu path that the plugin gives', () => {
    expect(PAGE).toContain('WooCommerce > Settings > Advanced > Nigerian postcodes');
    expect(README_TXT).toContain('WooCommerce > Settings > Advanced > Nigerian postcodes');
    expect(plugin('src/SettingsPage.php')).toContain("'Nigerian postcodes'");
  });

  it('names the label of each setting as the settings page shows it', () => {
    const page = plugin('src/SettingsPage.php');
    for (const label of ['Live secret key', 'Required', 'Old 6-digit postcodes', 'Lookup']) {
      expect(page).toContain(`'${label}'`);
      expect(PAGE).toContain(label);
    }
    expect(page).toContain("'Remove the key'");
    expect(PAGE).toContain('Remove the key');
  });

  it('gives the floors of the plugin', () => {
    const header = plugin('gatepost-postcode-for-woocommerce.php');
    expect(header).toContain('Requires PHP: 8.1');
    expect(header).toContain('Requires at least: 6.7');
    expect(header).toContain('WC requires at least: 10.0');
    expect(README_TXT).toContain('Requires PHP: 8.1');
    expect(PAGE).toMatch(/PHP 8\.1/);
    expect(PAGE).toMatch(/WordPress 6\.7/);
    expect(PAGE).toMatch(/WooCommerce 10\.0/);
  });

  it('gives the lookup limit that the plugin sets', () => {
    expect(plugin('src/Plugin.php')).toContain('LOOKUP_TIMEOUT_MS = 3000;');
    expect(PAGE).toContain('3 seconds');
  });

  it('says that the plugin accepts only a live secret key', () => {
    expect(plugin('src/SettingsPage.php')).toContain('nipost_live_');
    expect(PAGE).toContain('`nipost_live_`');
  });

  it('says that the plugin has no release, in step with the readme of the plugin', () => {
    expect(README_MD).toContain('The plugin has no release yet');
    expect(README_TXT).toContain('This plugin is not on WordPress.org yet.');
    expect(PAGE).toContain('not on WordPress.org');
  });

  it('shows the build commands that the readme of the plugin shows', () => {
    const blocks = examplesOf(PAGE_PATH, PAGE).filter(({ language }) => language === 'sh');
    expect(blocks).toHaveLength(1);
    const [block] = blocks;
    expect(block?.attributes, 'a build that needs Composer and network cannot run in a test').toBe(
      'notrun',
    );
    const lines = (block?.source ?? '').split('\n').filter((line) => line !== '');
    expect(lines).toEqual([
      'git clone https://github.com/gatepost-dev/woocommerce',
      'cd woocommerce',
      'composer install',
      'scripts/build-zip',
    ]);
    expect(README_MD).toContain('`composer install` and `scripts/build-zip`');
    expect(plugin('scripts/build-zip')).toContain('dist/$slug.zip');
    expect(plugin('scripts/build-zip')).toContain("slug='gatepost-postcode-for-woocommerce'");
    expect(PAGE).toContain('dist/gatepost-postcode-for-woocommerce.zip');
  });

  it('wraps each table in the scroll region', () => {
    const tables = PAGE.split('\n').filter((line, index, lines) => {
      return line.startsWith('|') && !(lines[index - 1] ?? '').startsWith('|');
    });
    const regions = PAGE.match(
      /<div class="table-scroll" role="region" tabindex="0" aria-label="Table: [^"]+">/g,
    );
    expect(tables.length).toBeGreaterThan(0);
    expect(regions).toHaveLength(tables.length);
  });

  it('shows the checkout image of the plugin with alt text and a local address', () => {
    const image = /!\[([^\]]+)\]\(([^)]+)\)/.exec(PAGE);
    expect(image?.[1]?.length).toBeGreaterThan(40);
    expect(image?.[2]).not.toMatch(/^[a-z]+:/);
    expect(image?.[2]).toMatch(/^\/docs\/woocommerce-checkout-postcode-field\.png$/);
  });
});

describe('copyPluginImage', () => {
  const folder = mkdtempSync(join(tmpdir(), 'gatepost-plugin-'));
  afterAll(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('copies the screenshot of the plugin to the assets of the site', () => {
    copyPluginImage('.', folder);
    const copy = join(folder, 'public/woocommerce-checkout-postcode-field.png');
    expect(existsSync(copy)).toBe(true);
    expect(readFileSync(copy).equals(readFileSync(join('woocommerce', PLUGIN_IMAGE)))).toBe(true);
  });
});
