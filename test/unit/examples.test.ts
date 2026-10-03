// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startMockServer, type MockServer } from '@gatepost/mock-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  countShownResults,
  examplesOf,
  pageExamples,
  toCheckedModule,
  type Example,
} from '../support/examples.ts';

const EXAMPLES = pageExamples();
const MODULES = {
  '@gatepost/client': fileURLToPath(new URL('../support/example-client.ts', import.meta.url)),
};

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// The packages that an install command on a page may name.
const PNPM_PACKAGES = ['core', 'client'].map(
  (name) => (readJson(`js/packages/${name}/package.json`) as { name: string }).name,
);

// Each example with the name that the test report shows, such as `src/.../php.md block 2`.
function named(examples: readonly Example[]): readonly (readonly [string, Example])[] {
  return examples.map((example) => [`${example.page} block ${String(example.index)}`, example]);
}

function inLanguage(language: string): readonly (readonly [string, Example])[] {
  return named(EXAMPLES.filter((example) => example.language === language));
}

describe('examplesOf', () => {
  it('finds each fenced block with its language', () => {
    const text = 'Intro.\n\n```ts\nconst a = 1;\n```\n\nMore.\n\n```sh\npnpm add x\n```\n';
    expect(examplesOf('page.md', text)).toEqual([
      { page: 'page.md', index: 0, language: 'ts', source: 'const a = 1;\n' },
      { page: 'page.md', index: 1, language: 'sh', source: 'pnpm add x\n' },
    ]);
  });
});

describe('toCheckedModule', () => {
  it('compares each shown result and points each package at its stand-in', () => {
    const source = "import { a } from '@gatepost/client';\nconst b = 2;\nb; // 2\n";
    expect(countShownResults(source)).toBe(1);
    expect(toCheckedModule(source, { '@gatepost/client': '/x.ts' })).toContain(
      "import { a } from '/x.ts';\nconst b = 2;\nshown(b, 2);",
    );
  });
});

describe('every code block on a page', () => {
  it.each(named(EXAMPLES))('uses a language that a check runs: %s', (_, { language }) => {
    expect(['ts', 'sh']).toContain(language);
  });
});

describe('every install command on a page', () => {
  it.each(inLanguage('sh'))('names a Gatepost package: %s', (_, { source }) => {
    const pnpm = Array.from(source.matchAll(/^pnpm add (\S+)$/gm), ([, name]) => name);
    expect(pnpm.length).toBeGreaterThan(0);
    for (const name of pnpm) expect(PNPM_PACKAGES).toContain(name);
  });
});

describe('every example on a page', () => {
  let mock: MockServer;
  let folder: string;

  beforeAll(async () => {
    mock = await startMockServer({ port: 0 });
    process.env['GATEPOST_MOCK_URL'] = mock.url;
    mkdirSync('temp', { recursive: true });
    folder = mkdtempSync(join(process.cwd(), 'temp', 'examples-'));
  });

  afterAll(async () => {
    await mock.close();
    rmSync(folder, { recursive: true, force: true });
  });

  it.each(inLanguage('ts'))('runs and shows only true results: %s', async (name, { source }) => {
    const file = join(folder, `${name.replace(/\W+/g, '-')}.ts`);
    writeFileSync(file, toCheckedModule(source, MODULES));
    const { checked } = (await import(pathToFileURL(file).href)) as { checked: number };
    expect(checked, 'the number of results that the example compared').toBe(
      countShownResults(source),
    );
  });
});
