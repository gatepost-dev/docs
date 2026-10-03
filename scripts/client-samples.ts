// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Records what @gatepost/client returns for a few calls, so that the playground can show real
// results with no network. The build runs the client against Gatepost's mock gateway, which
// answers with the synthetic fixtures of the spec.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostcodeClient, PostcodeError } from '@gatepost/client';
import { startMockServer } from '@gatepost/mock-server';

/** One call of the client, as the page shows it, and what the client returned. */
export interface ClientSample {
  readonly call: string;
  readonly result: unknown;
}

/** The outcome that a sample expects: a result, or the exact code of one error. */
type Expected = 'success' | PostcodeError['code'];

/** One call to make, with the outcome that the build requires of it. */
export interface SampleCall {
  readonly key: string;
  readonly call: string;
  readonly expected: Expected;
  readonly run: (client: PostcodeClient) => Promise<unknown>;
}

// The keys come from spec/fixtures/keys.json. Each one makes the mock gateway act as a real
// key with that grant would.
const CALLS: readonly SampleCall[] = [
  {
    key: 'nipost_test_mock_l3',
    call: "await client.lookup('FC-01-Z99-ZZ-01')",
    expected: 'success',
    run: (client) => client.lookup('FC-01-Z99-ZZ-01'),
  },
  {
    key: 'nipost_test_mock_l3',
    call: "await client.lookup('FC-01-Z99-ZZ-01', { level: 2 })",
    expected: 'success',
    run: (client) => client.lookup('FC-01-Z99-ZZ-01', { level: 2 }),
  },
  {
    key: 'nipost_test_mock_l3',
    call: "await client.lookup('FC-01-Z99-ZZ-02')",
    expected: 'success',
    run: (client) => client.lookup('FC-01-Z99-ZZ-02'),
  },
  {
    key: 'nipost_test_mock_l3',
    call: 'await client.reverse(9, 7)',
    expected: 'success',
    run: (client) => client.reverse(9, 7),
  },
  {
    key: 'nipost_test_mock_l3',
    call: "await client.autocomplete('fc 01 z')",
    expected: 'success',
    run: (client) => client.autocomplete('fc 01 z'),
  },
  {
    key: 'nipost_test_mock_no_credits',
    call: "await client.lookup('FC-01-Z99-ZZ-01', { level: 2 }) // a key with no credits",
    expected: 'insufficient_credits',
    run: (client) => client.lookup('FC-01-Z99-ZZ-01', { level: 2 }),
  },
];

// An error shows the fields that a caller reads, as the client guide lists them.
function describeError(error: PostcodeError): unknown {
  const { name, code, status, apiCode, retryAfterMs } = error;
  return { name, code, status, apiCode, retryAfterMs };
}

function mismatch(call: string, expected: Expected, got: string): Error {
  return new Error(`Sample "${call}" expected ${expected} but got ${got}.`);
}

// The no-NIPOST rule rests on every client calling the mock gateway on this machine.
function assertLoopback(url: string): void {
  const { hostname } = new URL(url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
    throw new Error(`The mock gateway listens on ${hostname}, which is not a loopback host.`);
  }
}

async function record(client: PostcodeClient, sample: SampleCall): Promise<ClientSample> {
  const { call, expected, run } = sample;
  try {
    const result = await run(client);
    if (expected !== 'success') throw mismatch(call, expected, 'success');
    return { call, result };
  } catch (error) {
    if (!(error instanceof PostcodeError)) throw error;
    if (error.code !== expected) throw mismatch(call, expected, error.code);
    return { call, result: describeError(error) };
  }
}

/**
 * Makes each sample call against a mock gateway that runs for the length of the calls. The build
 * fails when a call ends in any outcome other than the one that the sample expects.
 *
 * @param calls - The calls to make, in order.
 * @returns Each call with its result, in order.
 */
export async function recordClientSamples(
  calls: readonly SampleCall[] = CALLS,
): Promise<readonly ClientSample[]> {
  const mock = await startMockServer({ port: 0 });
  try {
    assertLoopback(mock.url);
    const samples: ClientSample[] = [];
    for (const sample of calls) {
      const client = new PostcodeClient({ apiKey: sample.key, baseUrl: mock.url });
      samples.push(await record(client, sample));
    }
    return samples;
  } finally {
    await mock.close();
  }
}

/**
 * Writes the samples to `src/generated/client-samples.json`, which the playground page reads.
 *
 * @param root - The root folder of the docs repo.
 */
export async function writeClientSamples(root: string): Promise<void> {
  const folder = join(root, 'src/generated');
  mkdirSync(folder, { recursive: true });
  const samples = await recordClientSamples();
  writeFileSync(join(folder, 'client-samples.json'), `${JSON.stringify(samples, null, 2)}\n`);
}
