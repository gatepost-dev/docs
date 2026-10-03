// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import eslint from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'temp/**',
      'coverage/**',
      '.astro/**',
      'spec/**',
      'js/**',
      'php/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  comments.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@eslint-community/eslint-comments/require-description': 'error',
      'max-depth': ['error', 3],
      complexity: ['error', 10],
      'max-params': ['error', 4],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-nested-ternary': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-restricted-syntax': ['error', 'TSEnumDeclaration', 'TSModuleDeclaration'],
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
  {
    // Code that runs in the reader's browser writes nothing to the console (TS-12).
    files: ['src/**/*.ts'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['**/*.config.ts', '**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { 'no-restricted-exports': 'off' },
  },
);
