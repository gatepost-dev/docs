// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { installLine, pageExamples } from '../support/examples.ts';
import { trackedPages } from '../../scripts/check-prose.ts';

// The sentence that a guide holds while its package is not on a registry. One commit removes it
// from each guide and sets the state in src/release-state.json to "published".
const NOTICE = 'The first alpha is not published yet.';

// The sentence that the WooCommerce guide holds while the plugin has no release. The plugin has its
// own flag, because it ships on its own schedule. The guide gives no install line of a registry.
const PLUGIN_NOTICE = 'The plugin is not published yet.';
const PLUGIN_PAGE = 'src/content/docs/guides/woocommerce.md';

const { state, plugin } = JSON.parse(readFileSync('src/release-state.json', 'utf8')) as {
  state: string;
  plugin: string;
};

const INSTALL_PAGES = [
  ...new Set(
    pageExamples()
      .filter(
        ({ language, source }) =>
          language === 'sh' && source.split('\n').some((line) => installLine(line) !== undefined),
      )
      .map(({ page }) => page),
  ),
];

describe('the release state', () => {
  it('is one of the two known values', () => {
    expect(['published', 'not published']).toContain(state);
  });

  it('has guides with an install command, so the checks below cannot pass on no page', () => {
    expect(INSTALL_PAGES.length).toBeGreaterThanOrEqual(5);
  });

  it.each(INSTALL_PAGES)('matches the install notice of %s', (page) => {
    const text = readFileSync(page, 'utf8');
    expect(
      text.includes(NOTICE),
      state === 'not published'
        ? 'the guide gives an install command and must say that the package is not published'
        : 'the guide still says that the package is not published',
    ).toBe(state === 'not published');
  });

  it('keeps the notice off every page that gives no install command', () => {
    const others = trackedPages().filter((page) => !INSTALL_PAGES.includes(page));
    expect(others.filter((page) => readFileSync(page, 'utf8').includes(NOTICE))).toEqual([]);
  });
});

describe('the release state of the plugin', () => {
  it('is one of the two known values', () => {
    expect(['published', 'not published']).toContain(plugin);
  });

  it('matches the notice of the WooCommerce guide', () => {
    const text = readFileSync(PLUGIN_PAGE, 'utf8');
    expect(
      text.includes(PLUGIN_NOTICE),
      plugin === 'not published'
        ? 'the guide must say that the plugin is not published'
        : 'the guide still says that the plugin is not published',
    ).toBe(plugin === 'not published');
  });

  it('keeps the notice off every other page', () => {
    const others = trackedPages().filter((page) => page !== PLUGIN_PAGE);
    expect(others.filter((page) => readFileSync(page, 'utf8').includes(PLUGIN_NOTICE))).toEqual([]);
  });
});
