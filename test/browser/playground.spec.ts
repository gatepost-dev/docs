// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/docs/playground/');
});

test('shows the forms of a typed postcode', async ({ page }) => {
  await page.getByLabel('Postcode', { exact: true }).fill('ek 01 a03 fk 01');
  const forms = page.getByRole('definition');
  await expect(forms).toHaveText([
    'EK-01-A03-FK-01',
    'EK 01 A03 FK 01',
    'EK01A03FK01',
    'Ekiti',
    'EK-01-A03-FK',
    'EK-01-A03-FK-**',
  ]);
  await expect(page.getByRole('status').first()).toHaveText(
    "The text has the form of a postcode. Only NIPOST's gateway can say whether a building has it.",
  );
});

test('works with the keyboard alone, from the field to the suggestion', async ({ page }) => {
  const field = page.getByLabel('Postcode', { exact: true });
  await field.focus();
  await page.keyboard.type('EK-O1-A03-FK-01');
  await expect(page.getByRole('listitem').filter({ hasText: 'Problem' })).toHaveText(/LGA/);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Accept a partial postcode' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Use the suggestion' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('EK-01-A03-FK-01');
  await expect(field).toBeFocused();
});

// The site may load its own scripts later, such as the search code, but no request may leave the
// site or carry a query.
test('sends nothing and keeps the typed text out of the address bar', async ({ page, baseURL }) => {
  const requests: URL[] = [];
  page.on('request', (request) => requests.push(new URL(request.url())));
  const field = page.getByLabel('Postcode', { exact: true });
  await field.fill('EK-01-A03-FK-01');
  await field.press('Enter');
  await page.getByLabel('GPS accuracy in metres').fill('6');
  await expect(page.getByRole('status').last()).toHaveText(
    'A fix of this accuracy can show the whole postcode, with the unit.',
  );
  expect(requests.filter((url) => url.origin !== baseURL || url.search !== '')).toEqual([]);
  expect(new URL(page.url()).search).toBe('');
  const stored = await page.evaluate(() => [
    ...Object.keys(localStorage),
    ...Object.keys(sessionStorage),
    document.cookie,
  ]);
  // Only the settings of the site itself, which the privacy page names, may be there.
  expect(
    stored.filter((key) => !['starlight-theme', 'sl-sidebar-state', ''].includes(key)),
  ).toEqual([]);
});

test('has no WCAG 2.2 AA violation while it shows a suggestion', async ({ page }) => {
  await page.getByLabel('Postcode', { exact: true }).fill('EK-O1-A03-FK-01');
  await expect(page.getByRole('button', { name: 'Use the suggestion' })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map(({ id }) => id)).toEqual([]);
});
