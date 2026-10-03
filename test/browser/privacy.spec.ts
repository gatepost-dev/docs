// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { sitePaths } from './site-pages.ts';

// The privacy page names each key that the site keeps in the browser, and no other.
const LOCAL_KEYS = ['starlight-theme'];
const SESSION_KEYS = ['sl-sidebar-state'];

test('no page asks another site for anything', async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  for (const path of sitePaths()) {
    await page.goto(path);
  }
  expect([...origins]).toEqual([baseURL]);
});

test('a search sends the text nowhere and keeps no cookie', async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('/docs/privacy/');
  await page.getByRole('button', { name: 'Search' }).click();
  const search = page.getByRole('dialog', { name: 'Search' });
  await search.getByRole('textbox', { name: 'Search' }).fill('postcode');
  await expect(search.getByRole('link').first()).toBeVisible();
  expect([...origins]).toEqual([baseURL]);
  expect(await page.context().cookies()).toEqual([]);
});

test('the browser keeps only the keys that the privacy page names', async ({ page }) => {
  await page.goto('/docs/privacy/');
  await page.getByRole('combobox', { name: 'Select theme' }).first().selectOption('light');
  await page.goto('/docs/');
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(stored.local).toContain('starlight-theme');
  expect(stored.local.every((key) => LOCAL_KEYS.includes(key))).toBe(true);
  expect(stored.session.every((key) => SESSION_KEYS.includes(key))).toBe(true);
  await page.goto('/docs/privacy/');
  for (const key of [...LOCAL_KEYS, ...SESSION_KEYS]) {
    await expect(page.getByRole('main')).toContainText(key);
  }
});
