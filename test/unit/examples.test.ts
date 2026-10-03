// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { startMockServer, type MockServer } from '@gatepost/mock-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  countShownResults,
  examplesOf,
  pageExamples,
  NOT_RUN,
  phpShownOutput,
  problemsOf,
  toCheckedModule,
  unreadableResults,
  withMockGateway,
  type Example,
} from '../support/examples.ts';

const EXAMPLES = pageExamples();
const MODULES = {
  '@gatepost/client': fileURLToPath(new URL('../support/example-client.ts', import.meta.url)),
};
// The mock gateway runs in this process, so PHP must run without blocking it.
const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PHP_AUTOLOAD = join(ROOT, 'php/vendor/autoload.php');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

// The packages that an install command on a page may name: the Gatepost packages, and the HTTP
// client that the PHP package tests with.
const PNPM_PACKAGES = ['core', 'client'].map(
  (name) => (readJson(`js/packages/${name}/package.json`) as { name: string }).name,
);
const PHP_MANIFEST = readJson('php/composer.json') as {
  name: string;
  'require-dev': Record<string, string>;
};
const COMPOSER_PACKAGES = [PHP_MANIFEST.name, 'guzzlehttp/guzzle'];

// Each example with the name that the test report shows, such as `src/.../php.md block 2`.
function named(examples: readonly Example[]): readonly (readonly [string, Example])[] {
  return examples.map((example) => [`${example.page} block ${String(example.index)}`, example]);
}

function inLanguage(language: string): readonly (readonly [string, Example])[] {
  return named(
    EXAMPLES.filter((example) => example.language === language && example.attributes !== NOT_RUN),
  );
}

describe('examplesOf', () => {
  it('finds each fenced block with its language', () => {
    const text = 'Intro.\n\n```ts\nconst a = 1;\n```\n\nMore.\n\n```sh\npnpm add x\n```\n';
    expect(examplesOf('page.md', text)).toEqual([
      {
        page: 'page.md',
        index: 0,
        language: 'ts',
        attributes: '',
        source: 'const a = 1;\n',
        closed: true,
      },
      {
        page: 'page.md',
        index: 1,
        language: 'sh',
        attributes: '',
        source: 'pnpm add x\n',
        closed: true,
      },
    ]);
  });

  it('finds a fence with attributes, a tilde fence and a fence in a list', () => {
    const text = [
      '```ts title="a.ts"',
      'a;',
      '```',
      '~~~php',
      'b;',
      '~~~',
      '- item',
      '',
      '  ```ts',
      '  c;',
      '  ```',
    ].join('\n');
    const found = examplesOf('page.md', text);
    expect(found.map(({ language, attributes, source }) => [language, attributes, source])).toEqual(
      [
        ['ts', 'title="a.ts"', 'a;\n'],
        ['php', '', 'b;\n'],
        ['ts', '', 'c;\n'],
      ],
    );
  });

  it('keeps a shorter fence of the other kind inside a block', () => {
    const found = examplesOf('page.md', '````md\n```ts\nx;\n```\n````\n');
    expect(found).toHaveLength(1);
    expect(found[0]?.source).toBe('```ts\nx;\n```\n');
  });
});

describe('problemsOf', () => {
  const block = (language: string, source: string, attributes = '', closed = true) => ({
    page: 'p.md',
    index: 0,
    language,
    attributes,
    source,
    closed,
  });

  it('accepts a block that a check runs', () => {
    expect(problemsOf(block('ts', 'a; // 1\n'))).toEqual([]);
    expect(problemsOf(block('php', 'echo 1; // 1\n'))).toEqual([]);
    expect(problemsOf(block('sh', 'pnpm add x\n'))).toEqual([]);
  });

  it('fails a PHP line that shows a result with no output to compare', () => {
    expect(problemsOf(block('php', '$r->valid; // true\n'))).toHaveLength(1);
    expect(problemsOf(block('php', 'var_dump($r->valid); // bool(true)\n'))).toHaveLength(1);
    expect(problemsOf(block('php', 'echo $r->valid; // 1\n$a = 1; // note\n'))).toHaveLength(1);
  });

  it('fails a block with text after the language', () => {
    expect(problemsOf(block('ts', 'a; // 1\n', 'title="a.ts"'))).toHaveLength(1);
  });

  it('fails a block that the page never closes', () => {
    expect(problemsOf(block('ts', 'a; // 1\n', '', false))).toHaveLength(1);
  });

  it('fails a block in a language that no check runs', () => {
    expect(problemsOf(block('python', 'x\n'))).toHaveLength(1);
    expect(problemsOf(block('', 'x\n'))).toHaveLength(1);
  });

  it.each(['a; // "x"', 'a; // [1, 2]', 'a; // {}', 'a // 1', 'a; // done'])(
    'fails the shown result that the check cannot read: %s',
    (line) => {
      expect(unreadableResults(`${line}\n`)).toEqual([line]);
      expect(problemsOf(block('ts', `${line}\n`))).toHaveLength(1);
    },
  );

  it('does not fail a comment on its own line or a URL', () => {
    expect(unreadableResults("// note\nconst u = 'http://x';\n")).toEqual([]);
  });

  it('lets the not-run mark skip every check', () => {
    expect(problemsOf(block('python', 'x // "y"\n', NOT_RUN, false))).toEqual([]);
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

describe('phpShownOutput', () => {
  it('lists the lines that echo statements show, in order', () => {
    const source = 'echo $a, "\\n"; // one\n  echo 1; // two\n$b = 2; // not shown\n';
    expect(phpShownOutput(source)).toEqual(['one', 'two']);
  });
});

describe('withMockGateway', () => {
  it('adds the address of the mock gateway after the request factory', () => {
    const source = 'new PostcodeClient(\n    $http,\n    new HttpFactory(),\n    timeoutMs: 1,\n);';
    expect(withMockGateway(source, 'http://127.0.0.1:1')).toContain(
      "    new HttpFactory(),\n    baseUrl: 'http://127.0.0.1:1',\n    timeoutMs: 1,",
    );
  });

  it('leaves a source with no client as it is', () => {
    expect(withMockGateway('echo 1;', 'http://127.0.0.1:1')).toBe('echo 1;');
  });

  it('fails when the request factory is not on its usual line', () => {
    const source = 'new PostcodeClient(\n  $http,\n  new HttpFactory(),\n);';
    expect(() => withMockGateway(source, 'http://127.0.0.1:1')).toThrow(/cannot point/);
  });

  it('fails when the example names a base URL of its own', () => {
    const source =
      "new PostcodeClient(\n    $http,\n    new HttpFactory(),\n    baseUrl: 'https://api.postcode.gov.ng',\n);";
    expect(() => withMockGateway(source, 'http://127.0.0.1:1')).toThrow(/base URL/);
  });

  it('fails when the example holds an address of another host', () => {
    const source = "$x = 'https://api.postcode.gov.ng/v1/lookup';\n";
    expect(() => withMockGateway(source, 'http://127.0.0.1:1')).toThrow(/not a loopback/);
  });

  it.each(['https://api.postcode.gov.ng', 'http://example.com:80', 'not a url'])(
    'refuses the mock address %s, which is not on this machine',
    (address) => {
      expect(() => withMockGateway('echo 1;', address)).toThrow(/loopback/);
    },
  );
});

describe('every code block on a page', () => {
  it('exists, so the checks below cannot pass on no block', () => {
    expect(EXAMPLES.length).toBeGreaterThan(0);
    expect(EXAMPLES.some(({ language }) => language === 'ts')).toBe(true);
    expect(EXAMPLES.some(({ language }) => language === 'php')).toBe(true);
    expect(EXAMPLES.some(({ language }) => language === 'sh')).toBe(true);
  });

  it.each(named(EXAMPLES))('is one that a check runs, or carries the not-run mark: %s', (_, e) => {
    expect(problemsOf(e)).toEqual([]);
  });

  it.each(inLanguage('ts'))('shows at least one result: %s', (_, { source }) => {
    expect(countShownResults(source)).toBeGreaterThan(0);
  });

  it.each(inLanguage('php'))('shows at least one result: %s', (_, { source }) => {
    expect(phpShownOutput(source).length).toBeGreaterThan(0);
  });
});

describe('every install command on a page', () => {
  it.each(inLanguage('sh'))('names a Gatepost package: %s', (_, { source }) => {
    const lines = source.split('\n').filter((line) => line !== '');
    const other = lines.filter((line) => !/^(?:pnpm add|composer require) \S+$/.test(line));
    expect(other, 'lines that install nothing').toEqual([]);
    const pnpm = Array.from(source.matchAll(/^pnpm add (\S+)$/gm), ([, name]) => name);
    const composer = Array.from(source.matchAll(/^composer require (\S+)$/gm), ([, name]) => name);
    expect(pnpm.length + composer.length).toBeGreaterThan(0);
    for (const name of pnpm) expect(PNPM_PACKAGES).toContain(name);
    for (const name of composer) expect(COMPOSER_PACKAGES).toContain(name);
    expect(COMPOSER_PACKAGES.slice(1).every((name) => name in PHP_MANIFEST['require-dev'])).toBe(
      true,
    );
  });
});

describe('every example on a page', () => {
  let mock: MockServer;
  let folder: string;

  beforeAll(async () => {
    mock = await startMockServer({ port: 0 });
    process.env['GATEPOST_MOCK_URL'] = mock.url;
    mkdirSync(join(ROOT, 'temp'), { recursive: true });
    folder = mkdtempSync(join(ROOT, 'temp', 'examples-'));
  });

  const moduleOf = (name: string): string => join(folder, `${name.replace(/\W+/g, '-')}.ts`);

  afterAll(async () => {
    await mock.close();
    rmSync(folder, { recursive: true, force: true });
  });

  // Vite removes types without checking them, so a wrong type in an example needs its own run.
  it('type-checks every TypeScript example', { timeout: 120_000 }, async () => {
    for (const [name, { source }] of inLanguage('ts')) {
      writeFileSync(moduleOf(name), toCheckedModule(source, MODULES));
    }
    writeFileSync(
      join(folder, 'tsconfig.json'),
      JSON.stringify({ extends: join(ROOT, 'tsconfig.json'), include: ['*.ts'] }),
    );
    const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
    let problems = '';
    try {
      await run(process.execPath, [tsc, '--noEmit', '-p', folder]);
    } catch (error) {
      problems = error instanceof Error && 'stdout' in error ? String(error.stdout) : String(error);
    }
    expect(problems).toBe('');
  });

  it.each(inLanguage('ts'))('runs and shows only true results: %s', async (name, { source }) => {
    const file = moduleOf(name);
    writeFileSync(file, toCheckedModule(source, MODULES));
    const { checked } = (await import(pathToFileURL(file).href)) as { checked: number };
    expect(checked, 'the number of results that the example compared').toBe(
      countShownResults(source),
    );
  });

  it.each(inLanguage('php'))(
    'runs and prints only the lines it shows: %s',
    async (name, { source }) => {
      const file = join(folder, `${name.replace(/\W+/g, '-')}.php`);
      writeFileSync(file, withMockGateway(source, mock.url));
      const { stdout } = await run('php', ['-d', `auto_prepend_file=${PHP_AUTOLOAD}`, file], {
        env: { ...process.env, NIPOST_API_KEY: 'nipost_test_mock_l3' },
        timeout: 60_000,
      });
      expect(stdout.split('\n').slice(0, -1)).toEqual(phpShownOutput(source));
    },
  );
});
