// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { findViolations } from '../../scripts/check-licences.ts';

describe('findViolations', () => {
  it('passes permissive licences and the recorded exceptions', () => {
    const report = {
      MIT: [{ name: 'astro' }],
      'MPL-2.0': [{ name: 'lightningcss-linux-x64-gnu' }],
      'LGPL-3.0-or-later': [{ name: '@img/sharp-libvips-linux-x64' }],
    };
    expect(findViolations(report)).toEqual([]);
  });

  it('reports a package whose licence has no exception', () => {
    const report = { 'GPL-3.0-only': [{ name: 'copyleft-tool' }], 'MPL-2.0': [{ name: 'other' }] };
    expect(findViolations(report)).toEqual([
      'copyleft-tool uses GPL-3.0-only, which DEP-4 does not allow.',
      'other uses MPL-2.0, which DEP-4 does not allow.',
    ]);
  });

  it('reports an exception whose licence changed', () => {
    expect(findViolations({ 'GPL-2.0-only': [{ name: '@fontsource/overpass' }] })).toEqual([
      '@fontsource/overpass uses GPL-2.0-only, which DEP-4 does not allow.',
    ]);
  });
});
