// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { builtFiles } from './built-site.ts';

const PLAYGROUND = builtFiles('.html').find(({ path }) => path === 'playground/index.html');

describe('the playground page', () => {
  it('shows the answers that the client gave to the mock gateway at build time', () => {
    for (const text of ['FC-01-Z99-ZZ-02', 'not_found', 'Z99', 'SYNTHETIC LGA']) {
      expect(PLAYGROUND?.text).toContain(text);
    }
    expect(PLAYGROUND?.text).toContain('insufficient_credits');
  });
});
