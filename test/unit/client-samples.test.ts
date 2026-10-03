// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { recordClientSamples } from '../../scripts/client-samples.ts';

describe('recordClientSamples', () => {
  it('records the answers of the client to the mock gateway, errors included', async () => {
    const samples = await recordClientSamples();
    expect(samples.map(({ result }) => result)).toMatchObject([
      { valid: true, levelReceived: 1 },
      { valid: true, levelReceived: 2, administrativeAddress: { lgaName: 'SYNTHETIC LGA' } },
      { valid: false, status: 'not_found' },
      { found: true, unit: { postcode: { canonical: 'FC-01-Z99-ZZ-01' } } },
      { segment: 'district', suggestions: [{ code: 'Z99' }] },
      { name: 'PostcodeError', code: 'insufficient_credits', status: 402 },
    ]);
  });

  it('shows each call as the page prints it', async () => {
    const [first] = await recordClientSamples();
    expect(first?.call).toBe("await client.lookup('FC-01-Z99-ZZ-01')");
  });
});
