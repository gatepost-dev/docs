// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startMockServer, type MockServer } from '@gatepost/mock-server';
import { expect, test } from '@playwright/test';
import { pageExamples } from '../support/examples.ts';

// The field runs in a browser, so each HTML example of a guide loads here against the built
// element. The CDN address of the example gets the file of the package, and the gateway gets the
// mock gateway. Any other request stops the test, so nothing reaches NIPOST or another host.
const CDN = 'https://cdn.jsdelivr.net/npm/@gatepost/field/dist/element.js';
const GATEWAY = 'https://api.postcode.gov.ng/**';
const ELEMENT = fileURLToPath(new URL('../../js/packages/field/dist/element.js', import.meta.url));
const ORIGIN = 'http://localhost:3000';
const MOCK_KEY = 'nipost_pk_test_mock';

const EXAMPLES = pageExamples().filter(
  ({ language, attributes, source }) =>
    language === 'html' && attributes === '' && source.includes('<gatepost-postcode-field'),
);

let mock: MockServer;

test.beforeAll(async () => {
  mock = await startMockServer({ port: 0 });
});

test.afterAll(async () => {
  await mock.close();
});

test('the guides hold HTML examples of the field, and the built element exists', () => {
  expect(EXAMPLES.length).toBeGreaterThan(0);
  expect(existsSync(ELEMENT), 'run pnpm sdk to build the field').toBe(true);
});

for (const { page: path, index, source } of EXAMPLES) {
  test(`${path} block ${String(index)} defines the field and gives it a form value`, async ({
    page,
    context,
  }) => {
    const stray: string[] = [];
    // The first route is the last to run: it stops every request that no other route handles.
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith(`${ORIGIN}/`) || url.startsWith(`${mock.url}/`)) {
        await route.fallback();
        return;
      }
      stray.push(url);
      await route.abort();
    });
    await context.route(CDN, (route) =>
      route.fulfill({ path: ELEMENT, contentType: 'text/javascript' }),
    );
    await context.route(GATEWAY, async (route) => {
      const url = new URL(route.request().url());
      const headers = { ...route.request().headers(), 'x-api-key': MOCK_KEY };
      const response = await route.fetch({
        url: `${mock.url}${url.pathname}${url.search}`,
        headers,
      });
      await route.fulfill({ response });
    });
    await context.route(`${ORIGIN}/example`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="en-GB"><title>Example</title><main>${source}</main>`,
      }),
    );
    await page.goto(`${ORIGIN}/example`);
    await page.waitForFunction(() => customElements.get('gatepost-postcode-field') !== undefined);
    await page.locator('gatepost-postcode-field input').fill('fc 01 z99 zz 01');
    const field = page.locator('gatepost-postcode-field');
    expect(await field.evaluate((element) => (element as HTMLInputElement).value)).toBe(
      'FC-01-Z99-ZZ-01',
    );
    const sent = await field.evaluate((element) => {
      const form = (element as HTMLInputElement).form;
      return form === null ? null : new FormData(form).get('postcode');
    });
    if (source.includes('<form')) expect(sent).toBe('FC-01-Z99-ZZ-01');
    expect(stray, 'requests to other hosts').toEqual([]);
  });
}
