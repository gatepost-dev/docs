// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// The unit tests may call only this machine. Their fetch refuses any other host, so a test or an
// example that escapes its text checks still cannot reach NIPOST.
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];
const realFetch = globalThis.fetch;

function hostOf(input: Parameters<typeof fetch>[0]): string {
  const address = input instanceof Request ? input.url : String(input);
  return new URL(address).hostname;
}

globalThis.fetch = (input, init) => {
  let host: string;
  try {
    host = hostOf(input);
  } catch {
    return Promise.reject(
      new Error('The test fetch needs an address of a host other than this machine.'),
    );
  }
  if (!LOOPBACK_HOSTS.includes(host) && !LOOPBACK_HOSTS.includes(`[${host}]`)) {
    return Promise.reject(
      new Error(`The test fetch refuses ${host}, a host other than this machine.`),
    );
  }
  return realFetch(input, init);
};
