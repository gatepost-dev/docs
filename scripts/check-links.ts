// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Checks the links of the built site. By default it follows only the links inside the site,
// with their fragments, so it needs no network. With --external, it also checks the links to
// other sites, as a weekly job does. It never calls the hosts that NIPOST's rules close to us.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { check, LinkState } from 'linkinator';

// linkinator serves a folder itself, on a free port of this address.
const LOCAL = 'http://127\\.0\\.0\\.1:\\d+';

// A crawl that finds fewer links than this has missed the site.
const MINIMUM_LINKS = 100;

// Every host of postcode.gov.ng except the public docs host: the gateway, the platform, the
// dashboard and the API paths of the website. A new NIPOST host is skipped by default.
const NIPOST = '(?:[^/?#]*\\.)?postcode\\.gov\\.ng(?:[:/?#]|$)';
const DOCS_HOST = 'docs\\.postcode\\.gov\\.ng(?:[:/?#]|$)';
const NEVER = [`^https?://(?!${DOCS_HOST})${NIPOST}`];

// The absolute links of the site to itself, such as the canonical link of a page. They name the
// published site, which lags the build, so the relative links stand for them.
const OWN_SITE = '^https://gatepost-dev\\.github\\.io/docs(?:[/?#]|$)';

/**
 * Lists the links that the check skips.
 *
 * @param external - Whether the check follows links to other sites.
 * @returns The patterns of the links to skip.
 */
export function linksToSkip(external: boolean): readonly string[] {
  return external ? [...NEVER, OWN_SITE] : [...NEVER, OWN_SITE, `^(?!${LOCAL})`];
}

/**
 * Checks the links of a built site, as GitHub Pages serves it: under /docs/. A link that lacks
 * the /docs base finds no page, as it does on GitHub Pages.
 *
 * @param dist - The folder of the built site.
 * @param external - Whether the check follows links to other sites.
 * @returns The number of links that the check followed, and a line for each broken link.
 */
export async function brokenLinks(
  dist: string,
  external: boolean,
): Promise<{ total: number; broken: readonly string[] }> {
  const root = mkdtempSync(join(tmpdir(), 'gatepost-links-'));
  try {
    cpSync(dist, join(root, 'docs'), { recursive: true });
    const result = await check({
      path: 'docs/',
      serverRoot: root,
      recurse: true,
      checkFragments: true,
      // Many requests to one host bring 429 answers, so the job asks fewer and tries again.
      concurrency: 10,
      retry: true,
      linksToSkip: [...linksToSkip(external)],
    });
    const broken = result.links
      .filter((link) => link.state === LinkState.BROKEN)
      .map((link) => `${link.parent ?? ''}: ${link.url} (${String(link.status)})`);
    return { total: result.links.length, broken };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const { total, broken } = await brokenLinks('dist', process.argv.includes('--external'));
  for (const line of broken) process.stdout.write(`${line}\n`);
  process.stdout.write(`${String(total)} links, ${String(broken.length)} broken.\n`);
  if (total < MINIMUM_LINKS) {
    process.stdout.write(`Only ${String(total)} links found. The crawl missed the site.\n`);
  }
  process.exitCode = broken.length === 0 && total >= MINIMUM_LINKS ? 0 : 1;
}
