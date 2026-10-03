// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { trackedPages } from '../../scripts/check-prose.ts';

/** A code block of a page: the page, the place of the block on it, its language and its code. */
export interface Example {
  readonly page: string;
  readonly index: number;
  readonly language: string;
  /** What follows the language on the opening fence, such as `title="a.ts"` or `notrun`. */
  readonly attributes: string;
  readonly source: string;
  /** False when the page ends before the closing fence. */
  readonly closed: boolean;
}

/** The mark for a block that cannot run, written after the language: a fence of `ts notrun`. */
export const NOT_RUN = 'notrun';

const OPENING_FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;

// A closing fence repeats the character of the opening fence, at least as many times.
function closes(line: string, fence: string): boolean {
  const text = line.trim();
  return text.length >= fence.length && text === fence.charAt(0).repeat(text.length);
}

/**
 * Finds the code blocks of a Markdown or MDX page. A fence of three backticks or three tildes
 * opens a block, with any indent and any text after the language.
 *
 * @param page - The path of the page, for the test report.
 * @param text - The text of the page.
 * @returns Each block, in the order of the page. The code has the indent of its fence removed.
 */
export function examplesOf(page: string, text: string): readonly Example[] {
  const examples: Example[] = [];
  let open: { indent: string; fence: string; info: string; lines: string[] } | undefined;
  const finish = (closed: boolean): void => {
    if (open === undefined) return;
    const [language = '', ...rest] = open.info.trim().split(/\s+/);
    const source = open.lines.map((line) => `${line}\n`).join('');
    examples.push({
      page,
      index: examples.length,
      language,
      attributes: rest.join(' '),
      source,
      closed,
    });
    open = undefined;
  };
  for (const line of text.split('\n')) {
    if (open === undefined) {
      const [, indent = '', fence = '', info = ''] = OPENING_FENCE.exec(line) ?? [];
      if (fence !== '') open = { indent, fence, info, lines: [] };
    } else if (closes(line, open.fence)) {
      finish(true);
    } else {
      open.lines.push(
        line.startsWith(open.indent) ? line.slice(open.indent.length) : line.trimStart(),
      );
    }
  }
  finish(false);
  return examples;
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

const SHOWN_VALUE = /;\s*\/\/ *('[^']*'|-?\d+(?:\.\d+)?|true|false|null|undefined)$/;
const TRAILING_COMMENT = /\S[ \t]+\/\/[ \t]*\S/;

/**
 * Lists the lines of a TypeScript example that end in a comment which the check cannot read as a
 * result. Such a line would show a result that nothing compares.
 *
 * @param source - The code of the example.
 * @returns The lines, in order.
 */
export function unreadableResults(source: string): readonly string[] {
  return source
    .split('\n')
    .filter((line) => TRAILING_COMMENT.test(line) && !SHOWN_VALUE.test(line));
}

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

/**
 * Lists the lines of a PHP example that end in a comment which the check cannot compare. Only an
 * `echo` line with a comment shows a result, because the test compares the output with it.
 *
 * @param source - The code of the example.
 * @returns The lines, in order.
 */
export function unreadablePhpResults(source: string): readonly string[] {
  return source
    .split('\n')
    .filter((line) => TRAILING_COMMENT.test(line) && !/^\s*echo .+; \/\/ .+$/.test(line));
}

// A package name, then an optional version constraint such as `:^0.1@alpha` or `@alpha`.
const INSTALL_LINE = new RegExp(
  '^(?<tool>pnpm add|composer require) ' +
    '(?<name>@?[\\w.-]+(?:/[\\w.-]+)?)' +
    '(?:[:@](?<constraint>[\\w.^~*<>=|@-]+))?$',
);

/**
 * Reads a line of an install block. Only a line that installs one package counts, with or
 * without a version constraint. Any other text, such as a second argument or a pipe, does not.
 *
 * @param line - The line.
 * @returns The tool and the name of the package, or undefined when the line is not an install.
 */
export function installLine(
  line: string,
): { readonly tool: 'pnpm' | 'composer'; readonly name: string } | undefined {
  const groups = INSTALL_LINE.exec(line)?.groups;
  if (groups === undefined) return undefined;
  return { tool: groups['tool'] === 'pnpm add' ? 'pnpm' : 'composer', name: groups['name'] ?? '' };
}

// The ways that PHP makes an object of a class that its text does not name.
const DYNAMIC_CLASS =
  /\bnew\s+(?:\$|\(|static\b)|\bReflectionClass\b|\bcall_user_func|\bclass_alias\b/;
const CLIENT_CONSTRUCTION = /\bnew\s+\\?(?:\w+\\)*PostcodeClient\b/g;

const FACTORY_LINE = '    new HttpFactory(),\n';
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

function isLoopback(address: string): boolean {
  try {
    return LOOPBACK_HOSTS.includes(new URL(address).hostname);
  } catch {
    return false;
  }
}

const PROXY_NAMES = ['http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'];

/**
 * Builds the environment of a child process that must not reach the network. Every proxy-aware
 * client sends its requests to a dead local proxy, except those for this machine. This works
 * below the text checks, so an example that escapes them still reaches no other host.
 *
 * @param env - The environment to start from.
 * @returns A copy with the proxy settings replaced.
 */
export function networkBlockEnv(
  env: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  const kept = Object.fromEntries(
    Object.entries(env).filter(([key]) => !PROXY_NAMES.includes(key.toLowerCase())),
  );
  return {
    ...kept,
    HTTP_PROXY: 'http://127.0.0.1:9',
    HTTPS_PROXY: 'http://127.0.0.1:9',
    NO_PROXY: '127.0.0.1,localhost',
  };
}

// Adds the base URL after the request factory of each client. It fails unless every client has
// such a line, because a client that the edit misses would call the real gateway.
function pointClients(source: string, baseUrl: string, name: string): string {
  // Any mention of the client class counts, also its full name, so that no form skips the edit.
  if (!source.includes('PostcodeClient')) return source;
  if (/\bbaseUrl\s*:/.test(source)) {
    throw new Error(`${name} names a base URL of its own. The test sets the base URL.`);
  }
  const clients = Array.from(source.matchAll(CLIENT_CONSTRUCTION)).length;
  const factories = source.split(FACTORY_LINE).length - 1;
  if (factories === 0 || factories !== clients) {
    throw new Error(
      `The test cannot point ${name} at the mock gateway: ${String(clients)} clients and ` +
        `${String(factories)} lines "${FACTORY_LINE.trim()}".`,
    );
  }
  return source.replaceAll(FACTORY_LINE, `${FACTORY_LINE}    baseUrl: '${baseUrl}',\n`);
}

/**
 * Points the client of a PHP example at the mock gateway. The page shows the client with
 * NIPOST's address, so the test adds one named argument after the request factory. A call that
 * reaches NIPOST would be a breach of the rules, so this function throws unless the example is
 * sure to call only a loopback address.
 *
 * @param source - The code of the example.
 * @param baseUrl - The address of the mock gateway. It must be on this machine.
 * @param name - The name of the example, for the message of a failure.
 * @returns The code that the test runs.
 */
export function withMockGateway(source: string, baseUrl: string, name = 'the example'): string {
  if (!isLoopback(baseUrl)) {
    throw new Error(`The mock gateway address ${baseUrl} is not a loopback address.`);
  }
  // A class built from text hides the client from every check below, so no such example runs.
  if (DYNAMIC_CLASS.test(source)) {
    throw new Error(`${name} builds a class from text, so the test cannot see its clients.`);
  }
  const pointed = pointClients(source, baseUrl, name);
  for (const [address] of pointed.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
    if (!isLoopback(address)) {
      throw new Error(`${name} holds the address ${address}, which is not a loopback address.`);
    }
  }
  // Fail closed: a client that the edit did not reach would call the real gateway.
  if (
    /PostcodeClient|Gatepost\\Postcode\\Client/.test(pointed) &&
    !pointed.includes(`baseUrl: '${baseUrl}'`)
  ) {
    throw new Error(`${name} does not point at the mock gateway.`);
  }
  return pointed;
}

/**
 * Lists what stops the check from running a block. A block with the `notrun` mark has none.
 *
 * @param example - The block.
 * @returns A sentence for each problem, or an empty list.
 */
export function problemsOf(example: Example): readonly string[] {
  const { language, attributes, source, closed } = example;
  // A PHP line that prints with no result comment needs no check here. The test compares the whole
  // output of the example with the comments, so that line changes the output and fails it.
  if (attributes === NOT_RUN) return [];
  const problems: string[] = [];
  if (!closed) problems.push('The fence has no closing fence.');
  if (attributes !== '')
    problems.push(`The fence has the text "${attributes}" after the language.`);
  if (!['ts', 'php', 'sh'].includes(language)) {
    problems.push(`No check runs a block in the language "${language}".`);
  }
  if (language === 'ts') {
    for (const line of unreadableResults(source)) {
      problems.push(`The check cannot read the result in "${line.trim()}".`);
    }
  }
  if (language === 'php') {
    for (const line of unreadablePhpResults(source)) {
      problems.push(`The check cannot compare the result in "${line.trim()}" with the output.`);
    }
  }
  return problems;
}
