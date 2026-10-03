// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';
import { writeSpecPages } from './scripts/spec-pages.ts';

// GitHub Pages serves the org's project site under the repo name. A custom domain changes the
// site and sets the base to '/'.
const site = 'https://gatepost-dev.github.io';
const base = '/docs';

const [coreTypeDoc, coreTypeDocGroup] = createStarlightTypeDocPlugin();
const [clientTypeDoc, clientTypeDocGroup] = createStarlightTypeDocPlugin();

// The API pages of a package, generated from the TSDoc comments of its source.
function typeDocOf(name) {
  return {
    entryPoints: [`js/packages/${name}/src/index.ts`],
    tsconfig: `js/packages/${name}/tsconfig.json`,
    output: `reference/js/${name}`,
    sidebar: { label: `@gatepost/${name}`, collapsed: true },
    typeDoc: {
      excludeInternal: true,
      readme: 'none',
      disableSources: true,
      entryFileName: 'index',
    },
  };
}

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [
    {
      name: 'gatepost-generated-pages',
      hooks: {
        'astro:config:setup': () => {
          writeSpecPages(import.meta.dirname);
        },
      },
    },
    starlight({
      title: 'Gatepost',
      description: "Unofficial developer tools for Nigeria's digital postcode.",
      // The title stays in the page for screen readers, so the logo needs no alt text of its own.
      logo: {
        light: './src/assets/gatepost-lockup.svg',
        dark: './src/assets/gatepost-lockup-dark.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      head: [
        { tag: 'link', attrs: { rel: 'icon', href: `${base}/favicon-32.png`, sizes: '32x32' } },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: `${base}/apple-touch-icon-180.png` },
        },
      ],
      locales: { root: { label: 'English', lang: 'en-GB' } },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/gatepost-dev' }],
      editLink: { baseUrl: 'https://github.com/gatepost-dev/docs/edit/main/' },
      customCss: [
        '@fontsource/overpass/400.css',
        '@fontsource/overpass/600.css',
        './src/styles/theme.css',
      ],
      components: { Footer: './src/components/Footer.astro' },
      credits: false,
      // A code block that scrolls sideways needs a focus stop for keyboard users. Wrapped lines
      // need none, and they fit a phone screen.
      expressiveCode: { defaultProps: { wrap: true } },
      plugins: [coreTypeDoc(typeDocOf('core')), clientTypeDoc(typeDocOf('client'))],
      sidebar: [
        { label: 'Start', items: ['playground'] },
        { label: 'Spec', items: [{ autogenerate: { directory: 'spec' } }] },
        { label: 'API reference', items: [coreTypeDocGroup, clientTypeDocGroup] },
        { label: 'Project', items: ['privacy'] },
      ],
    }),
  ],
});
