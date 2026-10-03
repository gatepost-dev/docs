// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vitest/config';

// The unit tests run before the build. The site tests read the built pages in dist/.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['test/unit/**/*.test.ts'] } },
      { test: { name: 'site', include: ['test/site/**/*.test.ts'] } },
    ],
    // The unit tests measure the logic of the playground. The browser tests cover its DOM module,
    // view.ts.
    coverage: {
      include: ['src/playground/describe.ts'],
      thresholds: { branches: 80 },
    },
  },
});
