// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

describe('the fetch of the unit tests', () => {
  it.each([
    // The .invalid names never resolve, so a request that escapes the guard still reaches no host.
    'https://gateway.example.invalid/v1/lookup',
    'http://example.invalid/',
    new URL('https://platform.example.invalid/'),
  ])('refuses a request to a host other than this machine: %s', async (target) => {
    await expect(fetch(target)).rejects.toThrow(/other than this machine/);
  });

  it('refuses a request that a Request object holds', async () => {
    await expect(fetch(new Request('https://gateway.example.invalid/'))).rejects.toThrow(
      /other than this machine/,
    );
  });
});
