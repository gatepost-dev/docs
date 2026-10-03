// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { foreignCssUrls, foreignPageUrls, foreignScriptUrls } from '../site/external-urls.ts';

const page = (body: string): string => `<html><head></head><body>${body}</body></html>`;

describe('foreignPageUrls', () => {
  it('accepts a page that loads only its own files', () => {
    const html = page(
      [
        '<link rel="stylesheet" href="/docs/a.css"><img src="/docs/a.png">',
        '<a href="https://example.com/">out</a>',
        '<style>.a{background:url(/docs/a.png)}</style><div style="color:red"></div>',
        '<script>const ns = "http://www.w3.org/2000/svg";</script>',
      ].join(''),
    );
    expect(foreignPageUrls(html)).toEqual([]);
  });

  it('reports an @import in an inline style element', () => {
    const html = page('<style>@import url("https://fonts.googleapis.com/css");</style>');
    expect(foreignPageUrls(html)).toEqual(['https://fonts.googleapis.com/css']);
  });

  it('reports a url() in a style attribute, also when the quotes are escaped', () => {
    const plain = page('<div style="background:url(https://example.com/x.png)"></div>');
    const escaped = page('<div style="background:url(&quot;//example.com/y.png&quot;)"></div>');
    expect(foreignPageUrls(plain)).toEqual(['https://example.com/x.png']);
    expect(foreignPageUrls(escaped)).toEqual(['//example.com/y.png']);
  });

  it('reports a host in an inline script', () => {
    const html = page('<script is:inline>fetch("https://api.postcode.gov.ng/x")</script>');
    expect(foreignPageUrls(html)).toEqual(['https://api.postcode.gov.ng/x']);
  });

  it('still reports a script file, an image and a srcset on another site', () => {
    const html = page(
      '<script src="//cdn.example.com/a.js"></script><img srcset="/a.png 1x, https://x.example/b.png 2x">',
    );
    expect(foreignPageUrls(html)).toEqual(['//cdn.example.com/a.js', 'https://x.example/b.png']);
  });
});

describe('foreignScriptUrls', () => {
  it('reports an absolute and a protocol-relative URL in a script file', () => {
    expect(foreignScriptUrls('fetch(`https://a.example/x`);import("//b.example/y.js")')).toEqual([
      'https://a.example/x',
      '//b.example/y.js',
    ]);
  });

  it('ignores a comment slash pair and a regular expression', () => {
    expect(foreignScriptUrls('const a = 1; // note\nconst b = /a\\/\\/b/;')).toEqual([]);
  });
});

describe('foreignCssUrls', () => {
  it('reports url() and @import to another site, and accepts own and inline data', () => {
    const css = "@import 'https://a.example/a.css';a{background:url(data:image/png;base64,AA)}";
    expect(foreignCssUrls(css)).toEqual(['https://a.example/a.css']);
    expect(foreignCssUrls('a{background:url(/docs/a.png)}')).toEqual([]);
  });
});
