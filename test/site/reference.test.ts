// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportsOf, type ReportedExport } from './api-report.ts';
import { DIST } from './built-site.ts';

// The API report of a package lists each public symbol, so the reference must have a page for
// each line that starts with `export`.
function reported(name: string): readonly ReportedExport[] {
  return exportsOf(readFileSync(`js/packages/${name}/etc/${name}.api.md`, 'utf8'));
}

describe.each(['core', 'client', 'field', 'react'])('the API reference of @gatepost/%s', (name) => {
  it('has a page for each symbol of the API report', () => {
    const missing = reported(name)
      .map(
        ({ folder, symbol }) => `reference/js/${name}/${folder}/${symbol.toLowerCase()}/index.html`,
      )
      .filter((path) => !existsSync(join(DIST, path)));
    expect(missing).toEqual([]);
  });
});
