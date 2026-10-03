// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';

/**
 * Lists the path of each page in the sitemap of the built site, such as `/docs/start/`.
 *
 * @returns The paths, in the order of the sitemap.
 */
export function sitePaths(): readonly string[] {
  const sitemap = readFileSync(new URL('../../dist/sitemap-0.xml', import.meta.url), 'utf8');
  return Array.from(
    sitemap.matchAll(/<loc>([^<]+)<\/loc>/g),
    ([, url]) => new URL(url ?? '').pathname,
  );
}
