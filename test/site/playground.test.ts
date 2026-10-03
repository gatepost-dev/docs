// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { builtFiles } from './built-site.ts';

const PLAYGROUND = builtFiles('.html').find(({ path }) => path === 'playground/index.html');

describe('the playground page', () => {
  it('shows the answers that the client gave to the mock gateway at build time', () => {
    expect(PLAYGROUND?.text).toContain('SYNTHETIC LGA');
    expect(PLAYGROUND?.text).toContain('insufficient_credits');
  });
});
