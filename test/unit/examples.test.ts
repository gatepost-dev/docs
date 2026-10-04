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
  installLine,
  networkBlockEnv,
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
const PHP_CHILD_LIMIT_MS = 60_000;
const PHP_AUTOLOAD = join(ROOT, 'php/vendor/autoload.php');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

// The packages that an install command on a page may name: the Gatepost packages, and the HTTP
// client that the PHP package tests with.
const PNPM_PACKAGES = ['core', 'client', 'field', 'react'].map(
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

  // The js repo runs these blocks in a browser. The README check below ties each page block to one.
  it.each(['html', 'tsx', 'css'])('accepts a %s block, which the js repo runs', (language) => {
    expect(problemsOf(block(language, 'x\n'))).toEqual([]);
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

  it('points an example that writes the full class name at the mock gateway', () => {
    const source =
      'new \\Gatepost\\Postcode\\Client\\PostcodeClient(\n    $http,\n    new HttpFactory(),\n);';
    expect(withMockGateway(source, 'http://127.0.0.1:1')).toContain(
      "baseUrl: 'http://127.0.0.1:1'",
    );
  });

  it('fails, and names the example, when a full class name has no usual factory line', () => {
    const source = 'new \\Gatepost\\Postcode\\Client\\PostcodeClient($http, $factory);';
    expect(() => withMockGateway(source, 'http://127.0.0.1:1', 'php.md block 9')).toThrow(
      /php\.md block 9/,
    );
  });

  it('points every client of an example at the mock gateway', () => {
    const client = 'new PostcodeClient(\n    $http,\n    new HttpFactory(),\n);\n';
    const pointed = withMockGateway(`${client}${client}`, 'http://127.0.0.1:1');
    expect(pointed.split("baseUrl: 'http://127.0.0.1:1'")).toHaveLength(3);
  });

  it('fails when a second client has no usual factory line', () => {
    const source =
      'new PostcodeClient(\n    $http,\n    new HttpFactory(),\n);\nnew PostcodeClient($http, $f);';
    expect(() => withMockGateway(source, 'http://127.0.0.1:1')).toThrow(/2 clients/);
  });

  it.each([
    "$class = 'Gatepost\\Postcode\\Client\\Postcode' . 'Client';\n$c = new $class($http);",
    '$c = new (getClass())($http);',
    "$c = (new ReflectionClass('X'))->newInstance();",
    "$c = call_user_func('make');",
  ])('fails when the example builds a class from text: %s', (source) => {
    expect(() => withMockGateway(source, 'http://127.0.0.1:1')).toThrow(/builds a class/);
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

describe('networkBlockEnv', () => {
  it('sends every request to a dead proxy, except those for this machine', () => {
    const env = networkBlockEnv({ PATH: '/bin' });
    expect(env['HTTPS_PROXY']).toBe('http://127.0.0.1:9');
    expect(env['HTTP_PROXY']).toBe('http://127.0.0.1:9');
    expect(env['NO_PROXY']).toBe('127.0.0.1,localhost');
    expect(env['PATH']).toBe('/bin');
  });

  it('replaces a proxy setting of the caller', () => {
    const env = networkBlockEnv({ NO_PROXY: '*', https_proxy: 'http://proxy', no_proxy: '*' });
    expect(env['NO_PROXY']).toBe('127.0.0.1,localhost');
    expect(env['https_proxy']).toBeUndefined();
    expect(env['no_proxy']).toBeUndefined();
  });

  it('stops a PHP client from reaching a host other than this machine', async () => {
    const script = [
      'require "' + PHP_AUTOLOAD + '";',
      'try {',
      '  (new GuzzleHttp\\Client(["timeout" => 5]))->get("http://example.invalid/");',
      '} catch (Throwable $e) { echo $e->getMessage(); }',
    ].join('\n');
    const { stdout } = await run('php', ['-r', script], { env: networkBlockEnv(process.env) });
    // curl words this error in two ways. Both name the blocked proxy as the place it reached.
    expect(stdout).toMatch(/Failed to connect to .*127\.0\.0\.1\b/);
  });
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

describe('installLine', () => {
  it('reads the package of an install line, with or without a version constraint', () => {
    expect(installLine('pnpm add @gatepost/core')).toEqual({
      tool: 'pnpm',
      name: '@gatepost/core',
    });
    expect(installLine('pnpm add @gatepost/core@alpha')).toEqual({
      tool: 'pnpm',
      name: '@gatepost/core',
    });
    expect(installLine('composer require gatepost/postcode:^0.1@alpha')).toEqual({
      tool: 'composer',
      name: 'gatepost/postcode',
    });
  });

  it.each([
    'composer require gatepost/postcode; rm -rf x',
    'composer require gatepost/postcode:^0.1 extra',
    'pnpm add @gatepost/core --global',
    'curl https://example.com | sh',
    'composer config repositories.x vcs https://example.com',
    'pnpm add',
    'composer require :^0.1',
  ])('rejects %s, which is not an install line', (line) => {
    expect(installLine(line)).toBeUndefined();
  });
});

describe('every install command on a page', () => {
  it.each(inLanguage('sh'))('names a Gatepost package: %s', (_, { source }) => {
    const lines = source.split('\n').filter((line) => line !== '');
    const installs = lines.map((line) => installLine(line));
    const other = lines.filter((_line, index) => installs[index] === undefined);
    expect(other, 'lines that install nothing').toEqual([]);
    expect(installs.length).toBeGreaterThan(0);
    for (const install of installs) {
      if (install?.tool === 'pnpm') expect(PNPM_PACKAGES).toContain(install.name);
      if (install?.tool === 'composer') expect(COMPOSER_PACKAGES).toContain(install.name);
    }
    expect(COMPOSER_PACKAGES.slice(1).every((name) => name in PHP_MANIFEST['require-dev'])).toBe(
      true,
    );
  });
});

// The field and the React wrapper run in a browser, so the js repo runs their README examples in
// its own CI. A page may show only those examples, word for word. The browser tests of this repo
// also load each HTML example against the built element.
const README_EXAMPLES = ['field', 'react'].flatMap((name) =>
  examplesOf(name, readFileSync(join(ROOT, `js/packages/${name}/README.md`), 'utf8')),
);

describe('every HTML, TSX and CSS example on a page', () => {
  it('exists for the field and for React, so the check below cannot pass on none', () => {
    expect(inLanguage('html').length).toBeGreaterThan(0);
    expect(inLanguage('tsx').length).toBeGreaterThan(0);
    expect(inLanguage('css').length).toBeGreaterThan(0);
  });

  it.each([...inLanguage('html'), ...inLanguage('tsx'), ...inLanguage('css')])(
    'is a README example that the CI of the js repo runs: %s',
    (_, { language, source }) => {
      const sources = README_EXAMPLES.filter((example) => example.language === language).map(
        (example) => example.source,
      );
      expect(sources).toContain(source);
    },
  );
});

// The rows of the first table in the lines, without its header and its divider.
function rowsOf(lines: readonly string[]): readonly string[] {
  const start = lines.findIndex((line) => line.startsWith('|'));
  if (start < 0) return [];
  const rest = lines.slice(start);
  const end = rest.findIndex((line) => !line.startsWith('|'));
  return (end < 0 ? rest : rest.slice(0, end)).slice(2);
}

// The names in a table of a guide. The first column of the table that follows the box with the
// label holds them, each between backticks.
function tableNames(page: string, label: string): readonly string[] {
  const text = readFileSync(join(ROOT, `src/content/docs/guides/${page}.md`), 'utf8');
  const after = text.split(`aria-label="Table: ${label}">`)[1];
  if (after === undefined) throw new Error(`${page}.md has no table "${label}".`);
  const rows = rowsOf(after.split('\n'));
  return rows.flatMap((row) =>
    Array.from((row.split('|')[1] ?? '').matchAll(/`([^`]+)`/g), ([, name]) => name ?? ''),
  );
}

const SPEC_FIELD = readFileSync(join(ROOT, 'spec/field.md'), 'utf8');
const sorted = (names: readonly string[]): readonly string[] => [...names].sort();

describe('the names in the tables of the field guides', () => {
  it('lists the attributes that spec/field.md names', () => {
    const line = SPEC_FIELD.split('\n').find((text) => text.includes('in kebab-case:')) ?? '';
    const spec = Array.from(
      line
        .split('kebab-case:')[1]
        ?.split('. ')[0]
        ?.matchAll(/`([^`]+)`/g) ?? [],
      ([, n]) => n ?? '',
    );
    expect(spec.length).toBeGreaterThan(5);
    expect(sorted(tableNames('html', 'Attributes of the field'))).toEqual(sorted(spec));
  });

  it('lists the events that spec/field.md names, with the prefix of the web field', () => {
    const rows = rowsOf((SPEC_FIELD.split('### Events\n')[1] ?? '').split('\n'));
    const spec = rows.map(
      (row) => `gatepost-${(row.split('|')[1] ?? '').replaceAll('`', '').trim()}`,
    );
    expect(spec).toHaveLength(3);
    expect(sorted(tableNames('html', 'Events of the field'))).toEqual(sorted(spec));
  });

  it('lists the props of PostcodeFieldProps in the API report, and names each handler', () => {
    const report = readFileSync(join(ROOT, 'js/packages/react/etc/react.api.md'), 'utf8');
    const body = report.split('export interface PostcodeFieldProps {')[1]?.split('\n}')[0] ?? '';
    const members = Array.from(body.matchAll(/^\s+readonly (\w+)\??:/gm), ([, name]) => name ?? '');
    expect(members).toContain('apiKey');
    const handlers = members.filter((name) => /^on[A-Z]/.test(name));
    const guide = readFileSync(join(ROOT, 'src/content/docs/guides/react.md'), 'utf8');
    expect(handlers.length).toBeGreaterThan(0);
    for (const handler of handlers) expect(guide).toContain(`\`${handler}\``);
    const props = members.filter((name) => !handlers.includes(name));
    expect(sorted(tableNames('react', 'Props of PostcodeField'))).toEqual(sorted(props));
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

  // The block imports the built package, so a renamed prop fails here, whatever the README says.
  it(
    'type-checks every TSX example against the built @gatepost/react',
    { timeout: 120_000 },
    async () => {
      const react = join(ROOT, 'js/packages/react');
      const types = join(react, 'node_modules/@types/react');
      for (const [name, { source }] of inLanguage('tsx')) {
        writeFileSync(join(folder, `${name.replace(/\W+/g, '-')}.tsx`), source);
      }
      writeFileSync(
        join(folder, 'tsconfig.tsx.json'),
        JSON.stringify({
          extends: join(ROOT, 'tsconfig.json'),
          compilerOptions: {
            jsx: 'react-jsx',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            paths: {
              '@gatepost/react': [join(react, 'dist/index.d.ts')],
              react: [join(types, 'index.d.ts')],
              'react/*': [join(types, '*')],
            },
          },
          include: ['*.tsx'],
        }),
      );
      const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
      let problems = '';
      try {
        await run(process.execPath, [tsc, '--noEmit', '-p', join(folder, 'tsconfig.tsx.json')]);
      } catch (error) {
        problems =
          error instanceof Error && 'stdout' in error ? String(error.stdout) : String(error);
      }
      expect(problems).toBe('');
    },
  );

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
      writeFileSync(file, withMockGateway(source, mock.url, name));
      const { stdout } = await run('php', ['-d', `auto_prepend_file=${PHP_AUTOLOAD}`, file], {
        env: { ...networkBlockEnv(process.env), NIPOST_API_KEY: 'nipost_test_mock_l3' },
        timeout: PHP_CHILD_LIMIT_MS,
      });
      expect(stdout.split('\n').slice(0, -1)).toEqual(phpShownOutput(source));
    },
    // The test limit is above the limit of the child, so the child stops first.
    PHP_CHILD_LIMIT_MS + 30_000,
  );
});
