// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Checks the prose of the hand-written pages against the parts of DOC-4 that a script can see:
// sentence length, semicolons, dashes and marketing words. A reviewer checks the rest of DOC-4,
// such as the active voice and phrasal verbs. The pages that the build writes from the spec and
// the doc comments are not checked here, because their own repos own that text.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

/** One break of a prose rule, with the line of the page where it starts. */
export interface ProseProblem {
  readonly line: number;
  readonly message: string;
}

const MAX_WORDS = 25;
const EM_DASH = String.fromCodePoint(0x2014);
const EN_DASH = String.fromCodePoint(0x2013);
// DOC-4 names "powerful" and "seamless". The others are the words that make docs read like
// an advert or like a machine wrote them.
const MARKETING_WORDS = [
  'powerful',
  'seamless',
  'seamlessly',
  'simply',
  'just',
  'easy',
  'easily',
  'effortless',
  'robust',
  'leverage',
  'utilise',
  'utilize',
  'cutting-edge',
  'blazing',
  'delve',
];
const MARKETING = new RegExp(`\\b(${MARKETING_WORDS.join('|')})\\b`, 'i');

// The text of a line that a reader sees as prose: no code, no link targets, no HTML or MDX tags.
function proseOf(line: string): string {
  return line
    .replace(/`[^`]*`/g, 'code')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*(?:[-*+]|\d+\.|#+|>)\s+/, '')
    .replace(/^\s*\|/, '')
    .replace(/\|/g, '.');
}

// Front matter and code fences hold no prose, except the title and the description.
function proseLines(text: string): readonly (readonly [number, string])[] {
  const lines = text.split('\n');
  const prose: (readonly [number, string])[] = [];
  let inFence = false;
  let inFrontMatter = lines[0] === '---';
  lines.forEach((line, index) => {
    if (inFrontMatter) {
      inFrontMatter = index === 0 || line !== '---';
      const field = /^(?:title|description|\s+tagline):\s*(.*)$/.exec(line);
      if (field?.[1] !== undefined) prose.push([index + 1, field[1]]);
      return;
    }
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence && !/^\s*(?:import |export |\|\s*-)/.test(line)) prose.push([index + 1, line]);
  });
  return prose;
}

/**
 * Finds the breaks of the prose rules in one page.
 *
 * @param text - The Markdown or MDX source of the page.
 * @returns Each problem, in the order of the lines.
 */
export function checkProse(text: string): readonly ProseProblem[] {
  const problems: ProseProblem[] = [];
  for (const [line, raw] of proseLines(text)) {
    const prose = proseOf(raw);
    if (prose.includes(';')) problems.push({ line, message: 'Use a full stop, not a semicolon.' });
    if (prose.includes(EM_DASH) || prose.includes(` ${EN_DASH} `)) {
      problems.push({ line, message: 'Use a full stop or a comma, not a dash.' });
    }
    const word = MARKETING.exec(prose)?.[1];
    if (word !== undefined) problems.push({ line, message: `Use a plain word, not "${word}".` });
    for (const sentence of prose.split(/[.?!:](?:\s|$)/)) {
      const words = sentence.split(/\s+/).filter((part) => /\w/.test(part)).length;
      if (words > MAX_WORDS) {
        problems.push({ line, message: `A sentence has ${String(words)} words. Use 25 or fewer.` });
      }
    }
  }
  return problems;
}

/**
 * Lists the hand-written pages: the Markdown and MDX files under src/content/docs that git
 * tracks, or would track. The build writes the other pages there, and git ignores them.
 *
 * @returns The paths of the pages, relative to the root of the repo.
 */
export function trackedPages(): readonly string[] {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .filter((path) => /^src\/content\/docs\/.+\.mdx?$/.test(path) && existsSync(path));
}

if (import.meta.main) {
  let count = 0;
  for (const path of trackedPages()) {
    for (const { line, message } of checkProse(readFileSync(path, 'utf8'))) {
      process.stdout.write(`${path}:${String(line)}: ${message}\n`);
      count += 1;
    }
  }
  process.exitCode = count === 0 ? 0 : 1;
}
