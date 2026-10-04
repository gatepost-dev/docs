// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { SPEC_VERSION as CLIENT_SPEC_VERSION } from '@gatepost/client';
import { SPEC_VERSION as CORE_SPEC_VERSION } from '@gatepost/core';
import { describe, expect, it } from 'vitest';
import { specPages, wrapTables } from '../../scripts/spec-pages.ts';

const SPEC_VERSION = readFileSync('spec/VERSION', 'utf8').trim();
const PAGES = specPages('spec', 'abc123');

describe('specPages', () => {
  it('builds the grammar, the client contract, the field and the glossary', () => {
    expect(PAGES.map(({ slug }) => slug)).toEqual(['grammar', 'client', 'field', 'glossary']);
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

describe('wrapTables', () => {
  it('puts each table in a labelled box with a focus stop, named after the heading above', () => {
    const text = '## Errors\n\nIntro.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\nAfter.\n';
    expect(wrapTables(text)).toBe(
      [
        '## Errors',
        '',
        'Intro.',
        '',
        '<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Errors">',
        '',
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '</div>',
        '',
        'After.',
        '',
      ].join('\n'),
    );
  });

  it('labels a table that has no heading above it, and keeps text without a table', () => {
    expect(wrapTables('| a |\n| - |\n')).toContain('aria-label="Table"');
    expect(wrapTables('Plain text.\n')).toBe('Plain text.\n');
  });

  it('wraps every table of the spec pages that the site builds', () => {
    for (const { text } of PAGES) {
      expect(text.match(/^\|/gm)?.length ?? 0).toBe(
        text.split('\n').filter((line) => line.startsWith('|')).length,
      );
      expect(text.split('<div class="table-scroll"').length).toBe(
        text
          .split('\n')
          .filter((line, i, all) => line.startsWith('|') && !all[i - 1]?.startsWith('|')).length +
          1,
      );
    }
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
