// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import { recordClientSamples, type SampleCall } from '../../scripts/client-samples.ts';

const CODE = 'FC-01-Z99-ZZ-01';
const NO_CREDITS_KEY = 'nipost_test_mock_no_credits';

function sample(over: Partial<SampleCall>): SampleCall {
  return {
    key: 'nipost_test_mock_l3',
    call: `await client.lookup('${CODE}')`,
    expected: 'success',
    run: (client) => client.lookup(CODE),
    ...over,
  };
}

describe('recordClientSamples', () => {
  it('records the answers of the client to the mock gateway, errors included', async () => {
    const samples = await recordClientSamples();
    expect(samples.map(({ result }) => result)).toMatchObject([
      { valid: true, levelReceived: 1 },
      { valid: true, levelReceived: 2, administrativeAddress: { lgaName: 'SYNTHETIC LGA' } },
      { valid: false, status: 'not_found' },
      { found: true, unit: { postcode: { canonical: CODE } } },
      { segment: 'district', suggestions: [{ code: 'Z99' }] },
      { name: 'PostcodeError', code: 'insufficient_credits', status: 402 },
    ]);
    expect(samples[0]?.call).toBe("await client.lookup('FC-01-Z99-ZZ-01')");
  });

  it('fails when a sample expects an error code and the client returns another code', async () => {
    const wrong = sample({
      key: NO_CREDITS_KEY,
      call: 'a call that needs another code',
      expected: 'rate_limited',
      run: (client) => client.lookup(CODE, { level: 2 }),
    });
    await expect(recordClientSamples([wrong])).rejects.toThrow(
      'Sample "a call that needs another code" expected rate_limited but got insufficient_credits.',
    );
  });

  it('fails when a sample expects success and the client throws', async () => {
    const broken = sample({
      key: NO_CREDITS_KEY,
      call: 'a call that must work',
      run: (client) => client.lookup(CODE, { level: 2 }),
    });
    await expect(recordClientSamples([broken])).rejects.toThrow(
      'Sample "a call that must work" expected success but got insufficient_credits.',
    );
  });

  it('fails when a sample expects an error and the client succeeds', async () => {
    const quiet = sample({ call: 'a call that must fail', expected: 'insufficient_credits' });
    await expect(recordClientSamples([quiet])).rejects.toThrow(
      'Sample "a call that must fail" expected insufficient_credits but got success.',
    );
  });

  it('stops the mock gateway when a sample fails', async () => {
    const urls: string[] = [];
    const real = globalThis.fetch;
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      urls.push(input instanceof Request ? input.url : String(input));
      return real(input, init);
    });
    const failing = sample({ expected: 'rate_limited' });
    try {
      await expect(recordClientSamples([failing])).rejects.toThrow('but got success');
      const [url] = urls;
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:/);
      await expect(real(url ?? '')).rejects.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});
