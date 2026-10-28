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

describe('the preview of a shared link', () => {
  it.each(PAGES)('names an image of the site in $path', ({ text }) => {
    expect(text).toContain(
      '<meta property="og:image" content="https://gatepost-dev.github.io/docs/og-image.png"',
    );
    expect(text).toContain(
      '<meta name="twitter:image" content="https://gatepost-dev.github.io/docs/og-image.png"',
    );
  });

  it('keeps the 404 page out of search results', () => {
    const page = PAGES.find(({ path }) => path === '404.html');
    expect(page?.text).toContain('<meta name="robots" content="noindex"');
  });

  it('gives the home page a title that does not repeat the site name', () => {
    const page = PAGES.find(({ path }) => path === 'index.html');
    expect(page?.text).toMatch(/<title>[^<|]*\| Gatepost<\/title>/);
    expect(page?.text).not.toContain('<title>Gatepost | Gatepost</title>');
  });

  it('calls the home page a website and every other page an article', () => {
    for (const { path, text } of PAGES) {
      const type = path === 'index.html' ? 'website' : 'article';
      expect(text, path).toContain(`<meta property="og:type" content="${type}"`);
    }
  });
});

// The words that people type into a search engine, in the title of the page that answers them.
describe('the title of each page that answers a common search', () => {
  it.each([
    ['index.html', "Nigeria's NIPOST digital postcode"],
    ['postcode-format/index.html', "Nigeria's digital postcode format"],
    ['validate-postcode/index.html', 'Validate a Nigerian postcode'],
    ['spec/state-codes/index.html', 'Nigerian state codes'],
    ['playground/index.html', 'Nigerian postcode checker'],
    ['guides/typescript-client/index.html', 'NIPOST postcode API'],
    ['guides/php/index.html', 'Nigerian postcodes in PHP'],
    ['guides/woocommerce/index.html', 'Nigerian postcode to a WooCommerce checkout'],
  ])('%s names "%s"', (path, words) => {
    const title = /<title>([^<]*)<\/title>/.exec(
      PAGES.find((page) => page.path === path)?.text ?? '',
    )?.[1];
    expect(title?.replaceAll('&#39;', "'")).toContain(words);
  });
});

// Search engines read the structured data of the home page to name the site and its software.
describe('the structured data of the home page', () => {
  const home = PAGES.find(({ path }) => path === 'index.html')?.text ?? '';
  const blocks = Array.from(
    home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ([, json]) => JSON.parse(json ?? '') as { '@context': string; '@graph': { '@type': string }[] },
  );
  const items = blocks.flatMap((block) => block['@graph']);
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(home)?.[1];

  it('describes one website and one piece of source code, in the vocabulary of schema.org', () => {
    expect(blocks.map((block) => block['@context'])).toEqual(['https://schema.org']);
    expect(items.map((item) => item['@type']).sort()).toEqual(['SoftwareSourceCode', 'WebSite']);
  });

  it('gives the website the address of the home page', () => {
    const site = items.find((item) => item['@type'] === 'WebSite') as { url?: string } | undefined;
    expect(canonical).toBe('https://gatepost-dev.github.io/docs/');
    expect(site?.url).toBe(canonical);
  });

  it('says that the software is unofficial', () => {
    const code = items.find((item) => item['@type'] === 'SoftwareSourceCode') as
      { description?: string } | undefined;
    expect(code?.description).toContain('Unofficial. Not made or endorsed by NIPOST.');
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
