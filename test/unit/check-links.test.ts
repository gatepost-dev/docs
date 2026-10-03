// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { brokenLinks, linksToSkip } from '../../scripts/check-links.ts';

function skipped(url: string, external: boolean): boolean {
  return linksToSkip(external).some((pattern) => new RegExp(pattern).test(url));
}

describe('linksToSkip', () => {
  it('follows only the links inside the site by default', () => {
    expect(skipped('http://127.0.0.1:50123/guides/typescript/', false)).toBe(false);
    expect(skipped('https://docs.postcode.gov.ng/', false)).toBe(true);
  });

  it('follows the links to other sites with --external', () => {
    expect(skipped('https://docs.postcode.gov.ng/', true)).toBe(false);
  });

  it("never calls NIPOST's gateway, its platform or the API paths of its website", () => {
    for (const url of [
      'https://api.postcode.gov.ng/v1/lookup',
      'https://platform.postcode.gov.ng/',
      'https://postcode.gov.ng/api/anything',
      'https://postcode.gov.ng/api',
      'https://postcode.gov.ng/api?x=1',
      'https://postcode.gov.ng/api#top',
    ]) {
      expect(skipped(url, true), url).toBe(true);
    }
  });

  it('checks only the docs host of NIPOST and skips every other host of postcode.gov.ng', () => {
    expect(skipped('https://docs.postcode.gov.ng/', true)).toBe(false);
    expect(skipped('https://docs.postcode.gov.ng/guides/keys/#top', true)).toBe(false);
    for (const url of [
      'https://dashboard.postcode.gov.ng/register',
      'https://postcode.gov.ng/',
      'https://www.postcode.gov.ng/about',
      'https://new-host.postcode.gov.ng:8443/x',
      'http://status.postcode.gov.ng',
    ]) {
      expect(skipped(url, true), url).toBe(true);
    }
    expect(skipped('https://notpostcode.gov.ng.example.com/', true)).toBe(false);
  });
});

describe('brokenLinks', () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  });

  // A built site in miniature, as the build writes it: pages in folders, with no /docs folder.
  function site(pages: Record<string, string>): string {
    const dist = mkdtempSync(join(tmpdir(), 'check-links-'));
    folders.push(dist);
    for (const [path, body] of Object.entries(pages)) {
      mkdirSync(join(dist, path), { recursive: true });
      writeFileSync(join(dist, path, 'index.html'), `<html><body>${body}</body></html>`);
    }
    return dist;
  }

  it('passes links that carry the /docs base, fragments included', async () => {
    const dist = site({
      '.': '<a href="/docs/start/">a</a> <a href="/docs/start/#top">b</a>',
      start: '<h1 id="top">Start</h1>',
    });
    expect((await brokenLinks(dist, false)).broken).toEqual([]);
  });

  it('fails a link that lacks the /docs base, which GitHub Pages cannot serve', async () => {
    const dist = site({
      '.': '<a href="/docs/start/">a</a> <a href="/start/">b</a>',
      start: '<h1>Start</h1>',
    });
    const { broken } = await brokenLinks(dist, false);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toBe('docs: start/ (404)');
  });

  it('fails a link to a missing fragment and a link to a missing page', async () => {
    const dist = site({
      '.': '<a href="/docs/start/#nope">a</a> <a href="/docs/gone/">b</a>',
      start: '<h1 id="top">Start</h1>',
    });
    expect((await brokenLinks(dist, false)).broken).toHaveLength(2);
  });

  it('counts the links it followed', async () => {
    const dist = site({ '.': '<a href="/docs/start/">a</a>', start: '<p>x</p>' });
    expect((await brokenLinks(dist, false)).total).toBeGreaterThanOrEqual(2);
  });
});
