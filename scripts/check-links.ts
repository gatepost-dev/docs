// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Checks the links of the built site. By default it follows only the links inside the site,
// with their fragments, so it needs no network. With --external, it also checks the links to
// other sites, as a weekly job does. It never calls the hosts that NIPOST's rules close to us.
import process from 'node:process';
import { check, LinkState } from 'linkinator';

// linkinator serves dist/ itself, on a free port of this address.
const LOCAL = 'http://127\\.0\\.0\\.1:\\d+';

// The gateway and NIPOST's platform: Gatepost calls neither from a link checker.
const NEVER = [
  '^https?://api\\.postcode\\.gov\\.ng',
  '^https?://platform\\.postcode\\.gov\\.ng',
  '^https?://(?:www\\.)?postcode\\.gov\\.ng/api/',
];

/**
 * Lists the links that the check skips.
 *
 * @param external - Whether the check follows links to other sites.
 * @returns The patterns of the links to skip.
 */
export function linksToSkip(external: boolean): readonly string[] {
  return external ? NEVER : [...NEVER, `^(?!${LOCAL})`];
}

if (import.meta.main) {
  const result = await check({
    path: 'dist',
    recurse: true,
    checkFragments: true,
    linksToSkip: [...linksToSkip(process.argv.includes('--external'))],
    // The site lives under /docs on GitHub Pages, and the check serves dist/ at the root.
    urlRewriteExpressions: [{ pattern: new RegExp(`^(${LOCAL})/docs/`), replacement: '$1/' }],
  });
  const broken = result.links.filter((link) => link.state === LinkState.BROKEN);
  for (const link of broken) {
    process.stdout.write(`${link.parent ?? ''}: ${link.url} (${String(link.status)})\n`);
  }
  process.stdout.write(`${String(result.links.length)} links, ${String(broken.length)} broken.\n`);
  process.exitCode = broken.length === 0 ? 0 : 1;
}
