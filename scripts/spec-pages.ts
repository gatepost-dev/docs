// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Writes the spec pages of the site from the spec submodule, so that the site shows the grammar,
// the client contract, the field and the glossary that the SDKs implement, word for word. The page
// of state codes comes from the data file that the SDKs read, so it cannot drift from them.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** A page that the site builds from one file of the spec. */
export interface SpecPage {
  readonly slug: string;
  readonly text: string;
}

const SOURCES = [
  {
    file: 'grammar.md',
    slug: 'grammar',
    title: 'Postcode grammar',
    description: 'How every Gatepost SDK reads and writes postcodes, and the core interface.',
  },
  {
    file: 'client.md',
    slug: 'client',
    title: 'Client contract',
    description: "How every Gatepost client calls NIPOST's gateway: results, errors and retries.",
  },
  {
    file: 'field.md',
    slug: 'field',
    title: 'Field',
    description: 'How every Gatepost postcode field behaves: settings, events, states and privacy.',
  },
  {
    file: 'CONTEXT.md',
    slug: 'glossary',
    title: 'Glossary',
    description: 'One name for each concept, in every language and every repo.',
  },
] as const;

/**
 * Puts each Markdown table in a box that scrolls and takes the keyboard focus. A wide table
 * scrolls sideways on a narrow screen, and a keyboard user cannot reach it without a focus stop
 * (WCAG 2.1.1). The label of the box names the heading above the table.
 *
 * @param markdown - The Markdown of a page. It must hold no code fence with a table in it.
 * @returns The Markdown with each table inside an HTML box.
 */
export function wrapTables(markdown: string): string {
  const out: string[] = [];
  let heading = '';
  let inTable = false;
  for (const line of markdown.split('\n')) {
    const isRow = line.startsWith('|');
    if (isRow && !inTable) {
      const label = heading === '' ? 'Table' : `Table: ${heading}`;
      const box = `<div class="table-scroll" role="region" tabindex="0" aria-label="${label}">`;
      out.push(box, '');
    } else if (!isRow && inTable) {
      out.push('', '</div>');
    }
    inTable = isRow;
    heading = /^#{1,6} /.test(line) ? line.replace(/^#+ /, '').trim() : heading;
    out.push(line);
  }
  return out.join('\n');
}

/**
 * Builds the spec pages from the files of a spec folder.
 *
 * @param specDir - The spec folder, such as the `spec` submodule.
 * @param commit - The commit of the spec folder, for the link to the source.
 * @returns One page for each spec file, with its front matter.
 */
export function specPages(specDir: string, commit: string): readonly SpecPage[] {
  const version = readFileSync(join(specDir, 'VERSION'), 'utf8').trim();
  return SOURCES.map(({ file, slug, title, description }, index) => {
    const source = readFileSync(join(specDir, file), 'utf8');
    // The site shows the title above the page, so the first heading of the file goes.
    const body = source.replace(/^# .*\n+/, '');
    const url = `https://github.com/gatepost-dev/spec/blob/${commit}/${file}`;
    const frontMatter = [
      '---',
      `title: ${title}`,
      `description: "${description}"`,
      'editUrl: false',
      `sidebar: { order: ${String(index + 1)} }`,
      '---',
    ].join('\n');
    const note = `:::note\nThis page shows [\`${file}\`](${url}) from spec ${version}.\n:::`;
    return { slug, text: `${frontMatter}\n\n${note}\n\n${wrapTables(body)}` };
  });
}

interface StateData {
  readonly source: string;
  readonly states: readonly {
    readonly code: string;
    readonly name: string;
    readonly iso: string;
  }[];
}

/**
 * Builds the page that lists the state codes, from `data/states.json` of a spec folder. People
 * search for these codes, so the page has a title and a description of its own.
 *
 * @param specDir - The spec folder, such as the `spec` submodule.
 * @param commit - The commit of the spec folder, for the link to the data file.
 * @returns The page, with its front matter.
 */
export function stateCodesPage(specDir: string, commit: string): SpecPage {
  const version = readFileSync(join(specDir, 'VERSION'), 'utf8').trim();
  const file = 'data/states.json';
  const { source, states } = JSON.parse(readFileSync(join(specDir, file), 'utf8')) as StateData;
  const url = `https://github.com/gatepost-dev/spec/blob/${commit}/${file}`;
  const description =
    `The ${String(states.length)} two-letter state codes that start a Nigerian postcode, ` +
    'with the name and the ISO 3166-2:NG code of each state.';
  const lines = [
    '---',
    'title: Nigerian state codes for postcodes',
    `description: "${description}"`,
    'editUrl: false',
    `sidebar: { label: State codes, order: ${String(SOURCES.length + 1)} }`,
    '---',
    '',
    `:::note\nThis page shows [\`${file}\`](${url}) from spec ${version}.\n:::`,
    '',
    'The first segment of a postcode is the state. It is a code of two letters.',
    'The table lists the code of each state and of the Federal Capital Territory.',
    '`parse` gives `unknown_state` for any other two letters.',
    '',
    '## Codes and names',
    '',
    '| Code | State | ISO 3166-2 |',
    '|---|---|---|',
    ...states.map(({ code, name, iso }) => `| \`${code}\` | ${name} | \`${iso}\` |`),
    '',
    '## Source',
    '',
    source,
    '',
  ];
  return { slug: 'state-codes', text: wrapTables(lines.join('\n')) };
}

/**
 * Writes the spec pages into the docs collection. The build calls it before it reads the pages.
 *
 * @param root - The root folder of the docs repo.
 */
export function writeSpecPages(root: string): void {
  const specDir = join(root, 'spec');
  const commit = execFileSync('git', ['-C', specDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const folder = join(root, 'src/content/docs/spec');
  mkdirSync(folder, { recursive: true });
  const pages = [...specPages(specDir, commit.trim()), stateCodesPage(specDir, commit.trim())];
  for (const { slug, text } of pages) {
    writeFileSync(join(folder, `${slug}.md`), text);
  }
}
