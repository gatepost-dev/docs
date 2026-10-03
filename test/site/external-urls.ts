// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0

// Each attribute that makes the browser fetch something when the page loads. An <a href> only
// fetches when the reader follows it, so it may point at another site. So may a <link> that
// names the page itself or the sitemap, because the browser does not fetch those.
const FETCHING_TAG = /<(script|link|img|source|iframe|video|audio|embed|object|track)\b[^>]*>/gi;
const NAMING_LINK = /^<link\b[^>]*\srel="(?:canonical|alternate|sitemap)"/i;
const FETCHING_ATTRIBUTE = /\s(?:src|href|srcset|poster|data)="([^"]*)"/gi;
const STYLE_BODY = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const STYLE_ATTRIBUTE = /\sstyle="([^"]*)"/gi;
const SCRIPT_BODY = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;

// An XML namespace names a kind of document. The browser never fetches it.
const NAMESPACE = /^https?:\/\/www\.w3\.org\//;

// Pagefind builds a URL against a dummy host to parse a path, and it never fetches the host. Its
// translation files also credit each translator as `Name <https://host>`, which is text.
const DUMMY_BASE = /^https:\/\/(?:p|example\.com(?:\$\{.*)?)$/;
const CREDIT_LINK = />$/;

// A URL that the site serves itself: a path, a relative URL, a fragment or inline data.
export function isOwnUrl(url: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url) || url.startsWith('data:');
}

function matches(text: string, pattern: RegExp): readonly string[] {
  return Array.from(text.matchAll(pattern), ([, group]) => group ?? '');
}

/**
 * Lists the URLs in a style sheet that point at another site.
 *
 * @param css - The text of a style sheet, a `<style>` body or a `style` attribute.
 * @returns The URLs of each `url()` and `@import`.
 */
export function foreignCssUrls(css: string): readonly string[] {
  const urls = matches(css, /url\(\s*(?:&quot;|['"])?([^'")&\s]+)/gi);
  const imports = matches(css, /@import\s+(?:&quot;|['"])([^'"&]+)/gi);
  return [...urls, ...imports].filter((url) => !isOwnUrl(url));
}

/**
 * Lists the absolute and protocol-relative URLs in a script. A script can fetch any of them.
 *
 * @param script - The text of a `.js` file or of an inline `<script>`.
 * @returns The URLs, without the XML namespaces.
 */
export function foreignScriptUrls(script: string): readonly string[] {
  const code = script.replace(/\/\*[\s\S]*?\*\//g, '');
  const absolute = code.match(/https?:\/\/[^\s"'`)\\]+/gi) ?? [];
  const relative = matches(code, /["'`](\/\/[a-z0-9-]+\.[^\s"'`)\\]+)/gi);
  return [...absolute, ...relative].filter(
    (url) => ![NAMESPACE, DUMMY_BASE, CREDIT_LINK].some((ignored) => ignored.test(url)),
  );
}

/**
 * Lists everything in a built page that makes the browser load another site: the fetching
 * attributes, the inline styles and the inline scripts.
 *
 * @param html - The text of a built page.
 * @returns The URLs that point at another site.
 */
export function foreignPageUrls(html: string): readonly string[] {
  const fetched = Array.from(html.matchAll(FETCHING_TAG), ([tag]) => tag)
    .filter((tag) => !NAMING_LINK.test(tag))
    .map((tag) => matches(tag, FETCHING_ATTRIBUTE))
    .flat()
    .flatMap((value) => value.split(',').map((part) => part.trim().split(/\s+/)[0] ?? ''))
    .filter((url) => !isOwnUrl(url));
  const styles = [...matches(html, STYLE_BODY), ...matches(html, STYLE_ATTRIBUTE)];
  const scripts = matches(html, SCRIPT_BODY).filter((body) => !body.startsWith('{'));
  return [...fetched, ...styles.flatMap(foreignCssUrls), ...scripts.flatMap(foreignScriptUrls)];
}
