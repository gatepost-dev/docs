// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The folder that `astro build` writes. */
export const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));

/** A file of the built site, by its path inside dist/. */
export interface BuiltFile {
  readonly path: string;
  readonly text: string;
}

function filesUnder(folder: string): readonly string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

/**
 * Reads each built file whose name ends with the suffix.
 *
 * @param suffix - The end of the file name, such as `.html` or `.css`.
 * @returns The files, in the order of their paths.
 */
export function builtFiles(suffix: string): readonly BuiltFile[] {
  if (!existsSync(DIST)) {
    throw new Error('dist/ is missing. Run pnpm build before the site tests.');
  }
  return filesUnder(DIST)
    .filter((path) => path.endsWith(suffix))
    .sort()
    .map((path) => ({ path: relative(DIST, path), text: readFileSync(path, 'utf8') }));
}
