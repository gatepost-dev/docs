// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Checks the links of the built site. By default it follows only the links inside the site,
// with their fragments, so it needs no network. With --external, it also checks the links to
// other sites, as a weekly job does. It never calls the hosts that NIPOST's rules close to us.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { check, LinkState } from 'linkinator';

// linkinator serves a folder itself, on a free port of this address.
const LOCAL = 'http://127\\.0\\.0\\.1:\\d+';

// A crawl that finds fewer links than this has missed the site.
export const MINIMUM_LINKS = 100;

// Every host of postcode.gov.ng except the public docs host: the gateway, the platform, the
// dashboard and the API paths of the website. A new NIPOST host is skipped by default.
const NIPOST = '(?:[^/?#]*\\.)?postcode\\.gov\\.ng(?:[:/?#]|$)';
const DOCS_HOST = 'docs\\.postcode\\.gov\\.ng(?:[:/?#]|$)';
const NEVER = [`^https?://(?!${DOCS_HOST})${NIPOST}`];

// The published address of the site. Links to it, such as the canonical link of a page, go to the
// local server in its place, so that a wrong hand-written link of this kind fails the check.
const PUBLISHED = 'https://gatepost-dev.github.io';
const PUBLISHED_PATTERN = 'https://gatepost-dev\\.github\\.io';

// The 404 page answers at any address, and it has no page at /docs/404/. Its canonical link names
// that address, so this one link is skipped.
const NO_PAGE = `^(?:${LOCAL}|${PUBLISHED_PATTERN})/docs/404/$`;

/**
 * Lists the links that the check skips.
 *
 * @param external - Whether the check follows links to other sites.
 * @returns The patterns of the links to skip.
 */
export function linksToSkip(external: boolean): readonly string[] {
  return external ? [...NEVER, NO_PAGE] : [...NEVER, NO_PAGE, `^(?!${LOCAL}|${PUBLISHED_PATTERN})`];
}

// An address that nothing uses now. The check needs it before the server starts, because the
// rewrite of the published address names it.
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      server.close(() => {
        resolve(port);
      });
    });
  });
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
  const port = await freePort();
  const root = mkdtempSync(join(tmpdir(), 'gatepost-links-'));
  try {
    cpSync(dist, join(root, 'docs'), { recursive: true });
    const result = await check({
      path: 'docs/',
      serverRoot: root,
      port,
      urlRewriteExpressions: [
        { pattern: new RegExp(`^${PUBLISHED}`), replacement: `http://127.0.0.1:${String(port)}` },
      ],
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

/**
 * Decides whether the check passes.
 *
 * @param total - The number of links that the crawl followed.
 * @param broken - A line for each broken link.
 * @returns The lines to print, and the exit code. A crawl with too few links fails.
 */
export function verdict(
  total: number,
  broken: readonly string[],
): { lines: readonly string[]; code: 0 | 1 } {
  const lines = [...broken, `${String(total)} links, ${String(broken.length)} broken.`];
  if (total < MINIMUM_LINKS) {
    lines.push(`Only ${String(total)} links found. The crawl missed the site.`);
  }
  return { lines, code: broken.length === 0 && total >= MINIMUM_LINKS ? 0 : 1 };
}

if (import.meta.main) {
  const { total, broken } = await brokenLinks('dist', process.argv.includes('--external'));
  const { lines, code } = verdict(total, broken);
  for (const line of lines) process.stdout.write(`${line}\n`);
  process.exitCode = code;
}
