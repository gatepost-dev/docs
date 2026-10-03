// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { parse } from '@gatepost/core';
import { describe, expect, it } from 'vitest';
import {
  describeAccuracy,
  describePostcode,
  errorMessageKey,
} from '../../src/playground/describe.ts';

interface ParseVector {
  readonly input: string;
  readonly options: { readonly allowPartial?: boolean };
}

// Each parse vector of the spec, so that each error that parse can give has its message.
const VECTORS = ['parse', 'parse-segments', 'parse-states'].flatMap(
  (name) =>
    (JSON.parse(readFileSync(`spec/vectors/${name}.json`, 'utf8')) as { cases: ParseVector[] })
      .cases,
);

describe('describePostcode', () => {
  it('shows each form, the state name, the parent and the form for logs of a postcode', () => {
    const view = describePostcode('ek 01 a03 fk 01', false);
    expect(view.status).toBe('valid');
    expect(view.forms).toEqual([
      { label: 'Canonical', value: 'EK-01-A03-FK-01' },
      { label: 'Display', value: 'EK 01 A03 FK 01' },
      { label: 'Compact', value: 'EK01A03FK01' },
      { label: 'State name', value: 'Ekiti' },
      { label: 'One segment up', value: 'EK-01-A03-FK' },
      { label: 'For logs', value: 'EK-01-A03-FK-**' },
    ]);
    expect(view.segments.map(({ text }) => text)).toEqual(['EK', '01', 'A03', 'FK', '01']);
  });

  it('shows a partial postcode with its empty segments, and no form for logs', () => {
    const view = describePostcode('EK 01 A03', true);
    expect(view.message).toBe('The text has the form of a partial postcode.');
    expect(view.segments.map(({ text }) => text)).toEqual(['EK', '01', 'A03', '', '']);
    expect(view.forms.map(({ label }) => label)).not.toContain('For logs');
  });

  it('marks the failing segment and offers the suggestion of parse', () => {
    const view = describePostcode('EK-O1-A03-FK-01', false);
    expect(view.status).toBe('invalid');
    expect(view.message).toBe('The LGA is two digits from 01 to 99.');
    expect(view.segments.filter(({ problem }) => problem).map(({ name }) => name)).toEqual(['lga']);
    expect(view.suggestion).toBe('EK-01-A03-FK-01');
  });

  it('asks for the new postcode when the text is an old one', () => {
    expect(describePostcode('900108', false).message).toBe(
      'This is an old 6-digit postcode. Ask for the new postcode of 11 letters and digits.',
    );
  });

  it('names the lengths of a partial postcode when it accepts one', () => {
    expect(describePostcode('EK0', true).message).toBe(
      'A partial postcode has 2, 4, 7 or 9 letters and digits.',
    );
    expect(describePostcode('EK0', false).message).toBe('A postcode has 11 letters and digits.');
  });

  it('stays idle with no text', () => {
    expect(describePostcode('  ', false)).toMatchObject({ status: 'idle', forms: [] });
  });

  it.each(VECTORS)('has a message for the parse vector $input', ({ input, options }) => {
    const result = parse(input, options);
    if (!result.ok) {
      expect(() => errorMessageKey(result.error, options.allowPartial ?? false)).not.toThrow();
    }
  });
});

describe('describeAccuracy', () => {
  it('names the segments that a fix of each accuracy can show', () => {
    expect(['6', '15', '35', '80', ''].map(describeAccuracy)).toEqual([
      'A fix of this accuracy can show the whole postcode, with the unit.',
      'A fix of this accuracy can show the postcode up to the area.',
      'A fix of this accuracy can show the postcode up to the district.',
      'A fix this rough can show the postcode up to the LGA.',
      null,
    ]);
  });
});
