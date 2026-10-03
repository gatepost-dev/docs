// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { SPEC_VERSION as CLIENT_SPEC_VERSION } from '@gatepost/client';
import { SPEC_VERSION as CORE_SPEC_VERSION } from '@gatepost/core';
import { describe, expect, it } from 'vitest';
import { specPages } from '../../scripts/spec-pages.ts';

const SPEC_VERSION = readFileSync('spec/VERSION', 'utf8').trim();
const PAGES = specPages('spec', 'abc123');

describe('specPages', () => {
  it('builds the grammar, the client contract and the glossary', () => {
    expect(PAGES.map(({ slug }) => slug)).toEqual(['grammar', 'client', 'glossary']);
  });

  it('gives each page a title and drops the first heading of its file', () => {
    const grammar = PAGES[0]?.text ?? '';
    expect(grammar).toMatch(/^---\ntitle: Postcode grammar\n/);
    expect(grammar).not.toContain('\n# Postcode grammar\n');
    expect(grammar).toContain('\n## Segments\n');
  });

  it('links each page to its file at the commit of the submodule, and names the version', () => {
    expect(PAGES[1]?.text).toContain(
      `[\`client.md\`](https://github.com/gatepost-dev/spec/blob/abc123/client.md) from spec ${SPEC_VERSION}.`,
    );
  });
});

describe('the spec that the site shows', () => {
  it('is the spec that each SDK of the site implements', () => {
    const php = readFileSync('php/src/Postcode.php', 'utf8');
    const phpVersion = /SPEC_VERSION = '([^']+)'/.exec(php)?.[1];
    expect([CORE_SPEC_VERSION, CLIENT_SPEC_VERSION, phpVersion]).toEqual([
      SPEC_VERSION,
      SPEC_VERSION,
      SPEC_VERSION,
    ]);
  });
});
