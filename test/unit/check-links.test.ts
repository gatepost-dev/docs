// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { linksToSkip } from '../../scripts/check-links.ts';

function skipped(url: string, external: boolean): boolean {
  return linksToSkip(external).some((pattern) => new RegExp(pattern).test(url));
}

describe('linksToSkip', () => {
  it('follows only the links inside the site by default', () => {
    expect(skipped('http://127.0.0.1:50123/guides/typescript/', false)).toBe(false);
    expect(skipped('https://docs.postcode.gov.ng/', false)).toBe(true);
  });

  it('follows the links to other sites with --external', () => {
    expect(skipped('https://docs.postcode.gov.ng/', true)).toBe(false);
  });

  it("never calls NIPOST's gateway, its platform or the API paths of its website", () => {
    for (const url of [
      'https://api.postcode.gov.ng/v1/lookup',
      'https://platform.postcode.gov.ng/',
      'https://postcode.gov.ng/api/anything',
    ]) {
      expect(skipped(url, true), url).toBe(true);
    }
  });
});
