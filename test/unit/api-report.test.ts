// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { exportsOf } from '../site/api-report.ts';

describe('exportsOf', () => {
  it('reads each kind of export that TypeDoc gives a page', () => {
    const report = [
      'export function parse(input: string): Postcode;',
      'export interface Segments {}',
      'export type Precision = 1 | 2;',
      'export const SPEC_VERSION = "0.2.0";',
      'export class PostcodeError extends Error {}',
      'export abstract class Base {}',
      'export enum Level {}',
      'export namespace Tools {}',
    ].join('\n');
    expect(exportsOf(report)).toEqual([
      { folder: 'functions', symbol: 'parse' },
      { folder: 'interfaces', symbol: 'Segments' },
      { folder: 'type-aliases', symbol: 'Precision' },
      { folder: 'variables', symbol: 'SPEC_VERSION' },
      { folder: 'classes', symbol: 'PostcodeError' },
      { folder: 'classes', symbol: 'Base' },
      { folder: 'enums', symbol: 'Level' },
      { folder: 'namespaces', symbol: 'Tools' },
    ]);
  });

  it('fails on an empty report', () => {
    expect(() => exportsOf('# API report\n')).toThrow('The API report holds no export.');
  });

  it('fails on a line that starts with export and is no known kind', () => {
    expect(() => exportsOf('export function a(): void;\nexport { b } from "./b";')).toThrow(
      'The test does not know these exports: export { b } from "./b";',
    );
  });
});
