// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { sitePaths } from './site-pages.ts';

// The tags of the WCAG 2.2 AA success criteria that axe can test (UI-1).
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const path of [...sitePaths(), '/docs/404.html']) {
  test(`${path} has no WCAG 2.2 AA violation that axe finds`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    expect(
      results.violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.target.join(' ') ?? ''}`),
    ).toEqual([]);
  });
}

test('the first Tab moves the focus to the skip link', async ({ page }) => {
  await page.goto('/docs/privacy/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Skip to content');
});

test('a page fits a screen 320 pixels wide with no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of sitePaths()) {
    await page.goto(path);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path).toBeLessThanOrEqual(320);
  }
});

// A wide table scrolls inside its own box on a narrow screen. The box needs a focus stop, or a
// keyboard user cannot scroll it (WCAG 2.1.1). The desktop run above never sees this.
for (const path of [...sitePaths(), '/docs/404.html']) {
  test(`${path} has no violation that axe finds at 320 pixels`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    expect(
      results.violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.target.join(' ') ?? ''}`),
    ).toEqual([]);
  });
}
