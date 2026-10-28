// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { examplesOf } from '../support/examples.ts';

// Readers copy the regex of the format page into their own code, so it must agree with the spec.
const PAGE = 'src/content/docs/postcode-format.md';
const BLOCK = examplesOf(PAGE, readFileSync(PAGE, 'utf8')).find(({ source }) =>
  source.includes('const POSTCODE'),
);
const PATTERN = /^\s*\/(\^.+\$)\/;$/m.exec(BLOCK?.source ?? '')?.[1] ?? '';

interface ParseCase {
  readonly id: string;
  readonly input: string;
  readonly options: { readonly allowPartial?: boolean };
  readonly expect: { readonly ok: boolean };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const STATE_CODES = (
  readJson('spec/data/states.json') as { states: { code: string }[] }
).states.map(({ code }) => code);

// The regex does not normalise, so the page asks the reader to trim the text and to change it to
// upper case first. The regex can judge only such text: upper-case ASCII with at most one space or
// hyphen between two characters. parse judges every other input.
const CASES = ['parse', 'parse-segments', 'parse-states']
  .flatMap((name) => (readJson(`spec/vectors/${name}.json`) as { cases: ParseCase[] }).cases)
  .filter(
    ({ input, options }) =>
      options.allowPartial !== true && /^(?:[A-Z0-9]+(?:[ -][A-Z0-9]+)*)?$/.test(input),
  );

describe('the regex on the format page', () => {
  it('exists on the page', () => {
    expect(PATTERN).not.toBe('');
  });

  it('lists each state code in spec/data/states.json, and no other', () => {
    const listed = /^\^\(\?:([A-Z|]+)\)/.exec(PATTERN)?.[1]?.split('|') ?? [];
    expect([...listed].sort()).toEqual([...STATE_CODES].sort());
  });

  it('has enough vectors to compare, so the check below cannot pass on none', () => {
    expect(CASES.length).toBeGreaterThan(50);
  });

  it.each(CASES.map((vector) => [vector.id, vector] as const))(
    'agrees with parse on %s',
    (_, { input, expect: expected }) => {
      expect(new RegExp(PATTERN).test(input)).toBe(expected.ok);
    },
  );
});
