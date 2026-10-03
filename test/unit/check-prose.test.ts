// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { checkProse } from '../../scripts/check-prose.ts';

const EM_DASH = String.fromCodePoint(0x2014);

function messages(text: string): readonly string[] {
  return checkProse(text).map(({ line, message }) => `${String(line)}: ${message}`);
}

describe('checkProse', () => {
  it('accepts short plain sentences', () => {
    expect(messages('A postcode has five segments. The unit is one building.\n')).toEqual([]);
  });

  it('reports a sentence of 26 words', () => {
    const sentence = `${Array.from({ length: 26 }, () => 'word').join(' ')}.`;
    expect(messages(`Intro.\n${sentence}\n`)).toEqual([
      '2: A sentence has 26 words. Use 25 or fewer.',
    ]);
  });

  it('reports a semicolon, a dash and a marketing word, each on its own line', () => {
    const text = `It parses; it checks.\nIt parses ${EM_DASH} it checks.\nIt is seamless.\n`;
    expect(messages(text)).toEqual([
      '1: Use a full stop, not a semicolon.',
      '2: Use a full stop or a comma, not a dash.',
      '3: Use a plain word, not "seamless".',
    ]);
  });

  it('skips code fences, inline code and link targets', () => {
    const text = [
      'Call `a; b` with [the guide](https://example.com/a;b).',
      '```ts',
      'const simply = 1;',
      '```',
    ].join('\n');
    expect(messages(text)).toEqual([]);
  });

  it('checks the title and the description of the front matter, and nothing else there', () => {
    const text = ['---', 'title: Easy postcodes', 'sidebar:', '  label: a; b', '---', ''].join(
      '\n',
    );
    expect(messages(text)).toEqual(['2: Use a plain word, not "Easy".']);
  });
});
