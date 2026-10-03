<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gatepost-dev/.github/main/brand/gatepost-lockup-dark.svg">
  <img src="https://raw.githubusercontent.com/gatepost-dev/.github/main/brand/gatepost-lockup.svg" alt="gatepost" height="48">
</picture>

# Gatepost docs

The docs site of Gatepost: guides for each SDK, the API reference, the spec and a playground.

> Unofficial. Not made or endorsed by NIPOST.

[![CI](https://github.com/gatepost-dev/docs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gatepost-dev/docs/actions/workflows/ci.yml)
[![Licence](https://img.shields.io/badge/licence-Apache--2.0-blue)](LICENSE)

## Install

```sh
git clone --recurse-submodules https://github.com/gatepost-dev/docs
cd docs
pnpm install
pnpm sdk
```

`pnpm sdk` installs and builds the SDKs in the `js` and `php` submodules, because the site documents their source and runs its examples against them.

## Quickstart

```sh
pnpm dev
```

Astro serves the site at `http://localhost:4321/docs/`. The scripts turn off Astro's usage data, so the build sends nothing.

## What it does

- Builds a static site with Astro and Starlight, for GitHub Pages.
- Writes the API reference from the TSDoc comments and the PHP doc comments of the submodules.
- Shows the grammar, the client contract and the glossary of the `spec` submodule.
- Runs each code example of each page against the SDKs and Gatepost's mock gateway.
- Checks each page with axe for WCAG 2.2 AA, in the light and the dark theme.
- Fails when a page loads anything from another website, or when a link inside the site breaks.

## Requirements

| Requirement                         | Version                             |
| ----------------------------------- | ----------------------------------- |
| Node                                | 24.15 or later                      |
| pnpm                                | 12, through Corepack                |
| PHP, for the PHP pages              | 8.1 or later, with Composer         |
| Python, for `check-tells` and REUSE | 3.11 or later, with uv              |
| Gatepost spec                       | the version in the `spec` submodule |

`pnpm check` runs every check that CI runs. The browser tests need Chromium: run `pnpm exec playwright install chromium` once.

## Docs

The site itself is the docs. CI uploads the built site of each pull request as an artifact.

## Support

Ask questions and report problems with a page in GitHub Issues. Report security problems privately, as [`SECURITY.md`](https://github.com/gatepost-dev/.github/blob/main/SECURITY.md) describes.

## Contributing

Read [`CONTRIBUTING.md`](https://github.com/gatepost-dev/.github/blob/main/CONTRIBUTING.md) before you open a pull request.

## Licence

Apache-2.0. See `LICENSE` and `NOTICE`.
