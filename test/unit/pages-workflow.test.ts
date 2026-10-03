// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pagesProblems } from './pages-workflow.ts';

const REAL = readFileSync(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8');

describe('pages.yml', () => {
  it('follows the publishing rules', () => {
    expect(pagesProblems(REAL)).toEqual([]);
  });

  it('fails when a pull request can start it', () => {
    const text = REAL.replace('  workflow_dispatch:', '  workflow_dispatch:\n  pull_request:');
    expect(pagesProblems(text)).toEqual([
      'The triggers are pull_request, push, workflow_dispatch. ' +
        'Use push and workflow_dispatch only.',
    ]);
  });

  it('fails when the push trigger names another branch', () => {
    const text = REAL.replace('branches: [main]', 'branches: [main, next]');
    expect(pagesProblems(text)).toEqual([
      'The push trigger must name the branch main and no other.',
    ]);
  });

  it('fails when the deploy job loses its guard', () => {
    const text = REAL.replace(/ {4}if: .*\n/, '');
    expect(pagesProblems(text)).toEqual([
      "The deploy job needs the guard if: github.ref == 'refs/heads/main'.",
    ]);
  });

  it('fails when a checkout keeps its credentials', () => {
    const text = REAL.replace('persist-credentials: false', 'persist-credentials: true');
    expect(pagesProblems(text)).toEqual([
      'The checkout in build must set persist-credentials to false.',
    ]);
  });
});
