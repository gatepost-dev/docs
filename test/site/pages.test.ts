// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { builtFiles } from './built-site.ts';

const PAGES = builtFiles('.html');
const STYLES = builtFiles('.css');

// Each attribute that makes the browser fetch something when the page loads. An <a href> only
// fetches when the reader follows it, so it may point at another site. So may a <link> that
// names the page itself or the sitemap, because the browser does not fetch those.
const FETCHING_TAG = /<(script|link|img|source|iframe|video|audio|embed|object|track)\b[^>]*>/gi;
const NAMING_LINK = /^<link\b[^>]*\srel="(?:canonical|alternate|sitemap)"/i;
const FETCHING_ATTRIBUTE = /\s(?:src|href|srcset|poster|data)="([^"]*)"/gi;

// A URL that the site serves itself: a path, a relative URL, a fragment or inline data.
function isOwnUrl(url: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url) || url.startsWith('data:');
}

function fetchedUrls(html: string): readonly string[] {
  return Array.from(html.matchAll(FETCHING_TAG), ([tag]) => tag)
    .filter((tag) => !NAMING_LINK.test(tag))
    .map((tag) => Array.from(tag.matchAll(FETCHING_ATTRIBUTE), ([, url]) => url ?? ''))
    .flat()
    .flatMap((value) => value.split(',').map((part) => part.trim().split(/\s+/)[0] ?? ''));
}

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
    expect(fetchedUrls(text).filter((url) => !isOwnUrl(url))).toEqual([]);
  });
});

describe('every built style sheet', () => {
  it.each(STYLES)('loads nothing from another site in $path', ({ text }) => {
    const urls = Array.from(text.matchAll(/url\(\s*['"]?([^'")]+)/g), ([, url]) => url ?? '');
    const imports = Array.from(text.matchAll(/@import\s+['"]([^'"]+)/g), ([, url]) => url ?? '');
    expect([...urls, ...imports].filter((url) => !isOwnUrl(url))).toEqual([]);
  });
});
