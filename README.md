<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gatepost-dev/.github/main/brand/gatepost-lockup-dark.svg">
    <img src="https://raw.githubusercontent.com/gatepost-dev/.github/main/brand/gatepost-lockup.svg" alt="Gatepost" width="280">
  </picture>
</p>

<p align="center">The docs site of Gatepost, the open-source tools for Nigeria's digital postcode.</p>

<p align="center">
  <a href="https://github.com/gatepost-dev/docs/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/gatepost-dev/docs/actions/workflows/ci.yml/badge.svg?branch=main&style=flat"></a>
  <a href="LICENSE"><img alt="Licence" src="https://img.shields.io/badge/licence-Apache--2.0-blue?style=flat"></a>
</p>

<p align="center">
  <a href="https://gatepost-dev.github.io/docs/">Docs</a> ·
  <a href="https://gatepost-dev.github.io/docs/playground/">Playground</a> ·
  <a href="https://gatepost-dev.github.io/docs/readiness/">Readiness tracker</a> ·
  <a href="https://github.com/gatepost-dev/.github/blob/main/CONTRIBUTING.md">Contributing</a> ·
  <a href="https://github.com/gatepost-dev/docs/discussions">Discussions</a>
</p>

> Unofficial. Not made or endorsed by NIPOST.

This repo holds the source of the site at <https://gatepost-dev.github.io/docs/>. Astro and Starlight build it as a static site for GitHub Pages.

## What the site holds

- A [playground](https://gatepost-dev.github.io/docs/playground/) where you check a postcode in your browser.
- Guides for the TypeScript core, the TypeScript client, the PHP package, the HTML field, the React field and the WooCommerce plugin.
- An API reference that the build writes from the TSDoc comments and the PHP doc comments.
- The spec pages: the grammar, the client contract, the field and the glossary.
- A [readiness tracker](https://gatepost-dev.github.io/docs/readiness/) of common tools that reject the new postcode.

## Run it on your computer

You need Node 24.15 or later, pnpm 12 through Corepack, and PHP 8.1 or later with Composer.

```sh
git clone --recurse-submodules https://github.com/gatepost-dev/docs
cd docs
pnpm install
pnpm sdk
pnpm dev
```

`pnpm sdk` builds the `js` and `php` submodules, because the site documents their source. The `woocommerce` submodule needs no build. The site copies one screenshot from it. `pnpm dev` serves the site at `http://localhost:4321/docs/`.

## Add a page

1. Add a Markdown file under `src/content/docs/`. Put it in `guides/` to add a guide. The sidebar lists that folder by itself.
2. Give the file a `title` and a `description` in its front matter.
3. For a page outside `guides/` and `spec/`, add its name to the `sidebar` list in `astro.config.mjs`.
4. Run `pnpm check`. It builds the site and runs every check that CI runs. The browser tests need Chromium. Run `pnpm exec playwright install chromium` one time.

The code examples on each hand-written page run against the SDKs, so a wrong example fails the check.

## Contribute

Read the [contributing guide](https://github.com/gatepost-dev/.github/blob/main/CONTRIBUTING.md) before you open a pull request. Ask questions in [Discussions](https://github.com/gatepost-dev/docs/discussions). Report a problem with a page in [Issues](https://github.com/gatepost-dev/docs/issues). Report a security problem through the [private form](https://github.com/gatepost-dev/docs/security/advisories/new).

## Licence

Apache-2.0. See `LICENSE` and `NOTICE`.
