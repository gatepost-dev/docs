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
```

## Quickstart

```sh
pnpm dev
```

Astro serves the site at `http://localhost:4321/docs/`. The scripts turn off Astro's usage data, so the build sends nothing.

## What it does

- Builds a static site with Astro and Starlight, for GitHub Pages.
- Fails when a page loads anything from another website, or when a page lacks the line that says that NIPOST did not make the site.

## Requirements

| Requirement                         | Version                             |
| ----------------------------------- | ----------------------------------- |
| Node                                | 24.15 or later                      |
| pnpm                                | 12, through Corepack                |
| Python, for `check-tells` and REUSE | 3.11 or later, with uv              |
| Gatepost spec                       | the version in the `spec` submodule |

`pnpm check` runs every check that CI runs.

## Docs

The site itself is the docs. CI uploads the built site of each pull request as an artifact.

## Support

Ask questions and report problems with a page in GitHub Issues. Report security problems privately, as [`SECURITY.md`](https://github.com/gatepost-dev/.github/blob/main/SECURITY.md) describes.

## Contributing

Read [`CONTRIBUTING.md`](https://github.com/gatepost-dev/.github/blob/main/CONTRIBUTING.md) before you open a pull request.

## Licence

Apache-2.0. See `LICENSE` and `NOTICE`.
