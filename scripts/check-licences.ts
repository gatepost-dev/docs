// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Checks each dependency against DEP-4: a permissive licence, or an exception with its reason.
// It reads `pnpm licenses list --json`, so run `pnpm install` first.
import { execFileSync } from 'node:child_process';
import process from 'node:process';

/** The packages of one licence, as `pnpm licenses list --json` lists them. */
export type LicenceReport = Readonly<Record<string, readonly { readonly name: string }[]>>;

// The licences that DEP-4 names, and three more permissive ones that tools in the tree use.
const ALLOWED = [
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Python-2.0',
];

// A name and a licence that may pass, and the reason. A change of licence fails the check.
const EXCEPTIONS: readonly { name: RegExp; licence: string; reason: string }[] = [
  {
    name: /^@fontsource\/overpass$/,
    licence: 'OFL-1.1',
    reason: 'The brand font. Each font file holds its copyright and a link to the licence.',
  },
  {
    name: /^@img\/sharp-libvips-/,
    licence: 'LGPL-3.0-or-later',
    reason: 'Astro runs it at build time. The site does not ship it, and we do not change it.',
  },
  {
    name: /^lightningcss(?:-.+)?$/,
    licence: 'MPL-2.0',
    reason: 'A build tool that Vite runs, unchanged. The site does not ship it.',
  },
];

/**
 * Lists the packages that DEP-4 does not allow.
 *
 * @param report - The packages by licence.
 * @returns One line for each package that breaks the rule.
 */
export function findViolations(report: LicenceReport): readonly string[] {
  return Object.entries(report).flatMap(([licence, packages]) =>
    ALLOWED.includes(licence)
      ? []
      : packages
          .filter(({ name }) => !EXCEPTIONS.some((e) => e.licence === licence && e.name.test(name)))
          .map(({ name }) => `${name} uses ${licence}, which DEP-4 does not allow.`),
  );
}

if (import.meta.main) {
  const json = execFileSync('pnpm', ['licenses', 'list', '--json'], { encoding: 'utf8' });
  const violations = findViolations(JSON.parse(json) as LicenceReport);
  process.stdout.write(violations.map((line) => `${line}\n`).join(''));
  process.exitCode = violations.length === 0 ? 0 : 1;
}
