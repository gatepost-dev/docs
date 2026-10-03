// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIST } from './built-site.ts';

// The folder of each kind of export, as the TypeDoc pages name it.
const FOLDERS: Readonly<Record<string, string>> = {
  function: 'functions',
  interface: 'interfaces',
  type: 'type-aliases',
  const: 'variables',
  class: 'classes',
};

// The API report of a package lists each public symbol, so the reference must have a page for
// each line that starts with `export`.
function exportsOf(name: string): readonly (readonly [string, string])[] {
  const report = readFileSync(`js/packages/${name}/etc/${name}.api.md`, 'utf8');
  return Array.from(
    report.matchAll(/^export (function|interface|type|const|class) (\w+)/gm),
    ([, kind, symbol]) => [FOLDERS[kind ?? ''] ?? '', symbol ?? ''],
  );
}

describe.each(['core', 'client'])('the API reference of @gatepost/%s', (name) => {
  it('has a page for each symbol of the API report', () => {
    const missing = exportsOf(name)
      .map(
        ([folder, symbol]) => `reference/js/${name}/${folder}/${symbol.toLowerCase()}/index.html`,
      )
      .filter((path) => !existsSync(join(DIST, path)));
    expect(missing).toEqual([]);
  });
});
