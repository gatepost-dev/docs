// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const SCRIPT = 'scripts/php-reference.php';
let folder: string;

function page(name: string): string {
  return readFileSync(join(folder, `${name}.md`), 'utf8');
}

beforeAll(async () => {
  folder = mkdtempSync(join(tmpdir(), 'php-reference-'));
  await run('php', [SCRIPT, 'php', folder]);
});

afterAll(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('the PHP reference', () => {
  it('has one page for each class and enum of the API dump, and an index', () => {
    const dump = readFileSync('php/docs/api-dump.md', 'utf8');
    const names = Array.from(dump.matchAll(/^(?:final class|enum) (\w+)/gm), ([, name]) => name);
    const pages = readdirSync(folder).map((file) => file.replace(/\.md$/, ''));
    expect(pages.map((slug) => slug.replace(/^client-/, '')).sort()).toEqual(
      ['index', ...names.map((name) => name?.toLowerCase())].sort(),
    );
  });

  it('shows each method with its signature, its doc comment and its parameters', () => {
    const postcode = page('postcode');
    expect(postcode).toContain('### parse()\n\n```php\n');
    expect(postcode).toContain(
      'public static function parse(string $input, bool $allowPartial = false): ParseResult',
    );
    expect(postcode).toContain("echo Postcode::normalize(' ek-01 a03.fk-01 '); // EK01A03FK01");
    expect(postcode).toMatch(/\| `\$allowPartial` \| Also accept a code that stops after/);
  });

  it('leaves out the test seam of the client, which has an internal type', () => {
    const client = page('client-postcodeclient');
    expect(client).toContain('?Psr\\SimpleCache\\CacheInterface $cache = null,\n)');
    expect(client).not.toContain('Timer');
  });

  it('lists the cases of an enum with their values', () => {
    expect(page('client-errorcode')).toContain("- `RateLimited = 'rate_limited'`");
  });

  it('fails with a message when the package folder is missing', async () => {
    await expect(run('php', [SCRIPT, join(folder, 'absent'), folder])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('has no src folder') as unknown,
    });
  });

  it('fails with a message when the package holds no public class', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'php-empty-'));
    mkdirSync(join(empty, 'src'));
    try {
      await expect(run('php', [SCRIPT, empty, folder])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('holds no public class') as unknown,
      });
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('refuses a call without two folders', async () => {
    await expect(run('php', [SCRIPT])).rejects.toMatchObject({ code: 2 });
  });
});
