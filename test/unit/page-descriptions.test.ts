// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { trackedPages } from '../../scripts/check-prose.ts';

// A search result cuts a longer description, so the reader never sees its end.
const MAX_DESCRIPTION = 150;

function frontMatterOf(page: string): { title?: unknown; description?: unknown } {
  const yaml = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(page, 'utf8'))?.[1] ?? '';
  return parse(yaml) as { title?: unknown; description?: unknown };
}

describe('every hand-written page', () => {
  it.each(trackedPages())(
    'has a title and a description that a search result shows: %s',
    (page) => {
      const { title, description } = frontMatterOf(page);
      expect(title).toEqual(expect.stringMatching(/\w/));
      expect(description).toEqual(expect.stringMatching(/\w/));
      expect(String(description).length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    },
  );
});
