// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// The examples on the pages call NIPOST's gateway. Their test imports this module in place of the
// package, so that each call goes to Gatepost's mock gateway with a mock key.
import process from 'node:process';
import { PostcodeClient as GatewayClient, type ClientOptions } from '@gatepost/client';

export { PostcodeError } from '@gatepost/client';

/** A client of the mock gateway that `GATEPOST_MOCK_URL` names. */
export class PostcodeClient extends GatewayClient {
  constructor(options: ClientOptions = {}) {
    const baseUrl = process.env['GATEPOST_MOCK_URL'];
    // With no mock gateway, a call would go to NIPOST. A test must never call it.
    if (baseUrl === undefined) {
      throw new Error('Start the mock gateway before the examples run.');
    }
    super({ ...options, baseUrl, apiKey: 'nipost_test_mock_l3' });
  }
}
