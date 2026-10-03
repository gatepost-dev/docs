// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

// The browser tests read the built site through `astro preview`, which serves it under the base
// path, as GitHub Pages does. Each test runs once in the light theme and once in the dark one.
export default defineConfig({
  testDir: 'test/browser',
  fullyParallel: true,
  forbidOnly: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${String(PORT)}` },
  projects: [
    { name: 'light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
  webServer: {
    command: `pnpm exec astro preview --port ${String(PORT)} --ignore-lock`,
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
    url: `http://localhost:${String(PORT)}/docs/`,
    reuseExistingServer: false,
  },
});
