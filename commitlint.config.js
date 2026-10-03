// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// The site is not a package, so its commits use no scope, as in the spec repo (GIT-1).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'scope-empty': [2, 'always'],
    'signed-off-by': [2, 'always', 'Signed-off-by:'],
  },
};
