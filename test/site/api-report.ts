// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0

/** One public symbol of an API report, with the folder that TypeDoc gives its page. */
export interface ReportedExport {
  readonly folder: string;
  readonly symbol: string;
}

// The folder of each kind of export, as the TypeDoc pages name it.
const FOLDERS: Readonly<Record<string, string>> = {
  function: 'functions',
  interface: 'interfaces',
  type: 'type-aliases',
  const: 'variables',
  class: 'classes',
  'abstract class': 'classes',
  enum: 'enums',
  'const enum': 'enums',
  namespace: 'namespaces',
};

const KINDS = Object.keys(FOLDERS)
  .sort((a, b) => b.length - a.length)
  .join('|');
const EXPORT_LINE = new RegExp(`^export (?:declare )?(${KINDS}) (\\w+)`);

/**
 * Lists the public symbols of an API report. Every line that starts with `export` must be one
 * of the known kinds, so a new kind of export fails here instead of passing without a page.
 *
 * @param report - The text of the `.api.md` file that API Extractor writes.
 * @returns The symbols, in the order of the report.
 * @throws When the report holds no export, or a line starts with `export` and is no known kind.
 */
export function exportsOf(report: string): readonly ReportedExport[] {
  const lines = report.split('\n').filter((line) => line.startsWith('export '));
  const found: ReportedExport[] = [];
  const unknown: string[] = [];
  for (const line of lines) {
    const [, kind, symbol] = EXPORT_LINE.exec(line) ?? [];
    if (kind === undefined || symbol === undefined) unknown.push(line);
    else found.push({ folder: FOLDERS[kind] ?? '', symbol });
  }
  if (unknown.length > 0) {
    throw new Error(`The test does not know these exports: ${unknown.join(' | ')}`);
  }
  if (found.length === 0) throw new Error('The API report holds no export.');
  return found;
}
