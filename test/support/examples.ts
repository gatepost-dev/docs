// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { trackedPages } from '../../scripts/check-prose.ts';

/** A code block of a page: the page, the place of the block on it, its language and its code. */
export interface Example {
  readonly page: string;
  readonly index: number;
  readonly language: string;
  readonly source: string;
}

const FENCE = /^```(\w*)\n([\s\S]*?)^```$/gm;

/**
 * Finds the code blocks of a Markdown or MDX page.
 *
 * @param page - The path of the page, for the test report.
 * @param text - The text of the page.
 * @returns Each block, in the order of the page.
 */
export function examplesOf(page: string, text: string): readonly Example[] {
  return Array.from(text.matchAll(FENCE), ([, language, source], index) => ({
    page,
    index,
    language: language ?? '',
    source: source ?? '',
  }));
}

/**
 * Reads the code blocks of each hand-written page that git tracks. The build writes the spec
 * pages and the API reference, and their own repos run the examples in them.
 *
 * @returns Each block of each page.
 */
export function pageExamples(): readonly Example[] {
  return trackedPages().flatMap((path) => examplesOf(path, readFileSync(path, 'utf8')));
}

// A line such as `result.valid; // true` shows a result. The module that runs the example turns
// it into a call of `shown`, which compares the value and counts the call. A guard such as
// `if (result.ok)` can skip a line, so the test compares the count with the number of lines.
const RESULT_LINE = /^(\s*)(.+);\s*\/\/ *('[^']*'|-?\d+(?:\.\d+)?|true|false|null|undefined)$/gm;

/**
 * Counts the lines of a TypeScript example that show a result.
 *
 * @param source - The code of the example.
 * @returns The number of lines.
 */
export function countShownResults(source: string): number {
  return Array.from(source.matchAll(RESULT_LINE)).length;
}

/**
 * Turns a TypeScript example into a module that checks each result that it shows.
 *
 * @param source - The code of the example.
 * @param modules - The file that stands in for each package that the example imports.
 * @returns The text of the module. It exports `checked`, the number of results that it compared.
 */
export function toCheckedModule(source: string, modules: Readonly<Record<string, string>>): string {
  const imported = Object.entries(modules).reduce(
    (code, [name, file]) => code.replaceAll(`'${name}'`, `'${file}'`),
    source,
  );
  return [
    "import { strictEqual } from 'node:assert/strict';",
    'export let checked = 0;',
    'function shown(actual: unknown, expected: unknown): void {',
    '  strictEqual(actual, expected);',
    '  checked += 1;',
    '}',
    imported.replace(RESULT_LINE, '$1shown($2, $3);'),
  ].join('\n');
}

// A PHP line such as `echo $code->canonical, "\n"; // EK-01-A03-FK-01` shows the line that it
// prints. The test compares the whole output of the example with these lines, in order.
const PHP_SHOWN_LINE = /^\s*echo .+; \/\/ (.+)$/gm;

/**
 * Lists the output lines that a PHP example shows in its comments.
 *
 * @param source - The code of the example.
 * @returns The lines, in order.
 */
export function phpShownOutput(source: string): readonly string[] {
  return Array.from(source.matchAll(PHP_SHOWN_LINE), ([, line]) => line ?? '');
}

const FACTORY_LINE = '    new HttpFactory(),\n';

/**
 * Points the client of a PHP example at the mock gateway. The page shows the client with
 * NIPOST's address, so the test adds one named argument after the request factory.
 *
 * @param source - The code of the example.
 * @param baseUrl - The address of the mock gateway.
 * @returns The code that the test runs.
 */
export function withMockGateway(source: string, baseUrl: string): string {
  return source.replace(FACTORY_LINE, `${FACTORY_LINE}    baseUrl: '${baseUrl}',\n`);
}
