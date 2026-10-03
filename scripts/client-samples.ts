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

interface SampleCall {
  readonly key: string;
  readonly call: string;
  readonly run: (client: PostcodeClient) => Promise<unknown>;
}

// The keys come from spec/fixtures/keys.json. Each one makes the mock gateway act as a real
// key with that grant would.
const CALLS: readonly SampleCall[] = [
  {
    key: 'nipost_test_mock_l3',
    call: "await client.lookup('FC-01-Z99-ZZ-01')",
    run: (client) => client.lookup('FC-01-Z99-ZZ-01'),
  },
  {
    key: 'nipost_test_mock_l3',
    call: "await client.lookup('FC-01-Z99-ZZ-01', { level: 2 })",
    run: (client) => client.lookup('FC-01-Z99-ZZ-01', { level: 2 }),
  },
  {
    key: 'nipost_test_mock_l3',
    call: "await client.lookup('FC-01-Z99-ZZ-02')",
    run: (client) => client.lookup('FC-01-Z99-ZZ-02'),
  },
  {
    key: 'nipost_test_mock_l3',
    call: 'await client.reverse(9, 7)',
    run: (client) => client.reverse(9, 7),
  },
  {
    key: 'nipost_test_mock_l3',
    call: "await client.autocomplete('fc 01 z')",
    run: (client) => client.autocomplete('fc 01 z'),
  },
  {
    key: 'nipost_test_mock_no_credits',
    call: "await client.lookup('FC-01-Z99-ZZ-01', { level: 2 }) // a key with no credits",
    run: (client) => client.lookup('FC-01-Z99-ZZ-01', { level: 2 }),
  },
];

// An error shows the fields that a caller reads, as the client guide lists them.
function outcome(error: unknown): unknown {
  if (!(error instanceof PostcodeError)) throw error;
  const { name, code, status, apiCode, retryAfterMs } = error;
  return { name, code, status, apiCode, retryAfterMs };
}

/**
 * Makes each sample call against a mock gateway that runs for the length of the calls.
 *
 * @returns Each call with its result, in order.
 */
export async function recordClientSamples(): Promise<readonly ClientSample[]> {
  const mock = await startMockServer({ port: 0 });
  try {
    const samples: ClientSample[] = [];
    for (const { key, call, run } of CALLS) {
      const client = new PostcodeClient({ apiKey: key, baseUrl: mock.url });
      samples.push({ call, result: await run(client).catch(outcome) });
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
