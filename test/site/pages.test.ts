// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { builtFiles } from './built-site.ts';
import { foreignCssUrls, foreignPageUrls, foreignScriptUrls } from './external-urls.ts';

const PAGES = builtFiles('.html');
const STYLES = builtFiles('.css');
const SCRIPTS = builtFiles('.js');

describe('every built page', () => {
  it('includes the home page and the 404 page, so the checks below cannot pass on no page', () => {
    expect(PAGES.map(({ path }) => path)).toEqual(
      expect.arrayContaining(['index.html', '404.html']),
    );
  });

  it.each(PAGES)('says that NIPOST did not make $path', ({ text }) => {
    expect(text).toMatch(
      /<p class="unofficial[^"]*">Unofficial\. Not made or endorsed by NIPOST\.<\/p>/,
    );
  });

  it.each(PAGES)('declares British English in $path', ({ text }) => {
    expect(text).toMatch(/<html lang="en-GB"/);
  });

  it.each(PAGES)('loads nothing from another site in $path', ({ text }) => {
    expect(foreignPageUrls(text)).toEqual([]);
  });
});

describe('every built style sheet', () => {
  it.each(STYLES)('loads nothing from another site in $path', ({ text }) => {
    expect(foreignCssUrls(text)).toEqual([]);
  });
});

describe('every built script', () => {
  it.each(SCRIPTS)('names no other site in $path', ({ text }) => {
    expect(foreignScriptUrls(text)).toEqual([]);
  });
});
