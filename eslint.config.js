const {FlatCompat} = require('@eslint/eslintrc');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const fs = require('fs');
const path = require('path');

const compat = new FlatCompat({baseDirectory: __dirname});

const FEATURES_DIR = path.join(__dirname, 'src', 'features');

/**
 * Features are read from disk instead of being listed by hand: a new
 * feature is protected by the rule the same day its folder is created,
 * without anyone having to remember to touch this file.
 */
const featureNames = fs
  .readdirSync(FEATURES_DIR, {withFileTypes: true})
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

const CROSS_FEATURE_MESSAGE =
  "A feature doesn't import from another feature. Move shared code up to components/ui, services, or utils. Within your own feature, use relative imports.";

const SERVICES_MESSAGE =
  "services/ doesn't import from features/: the dependency goes one way. If services needs to notify a feature of something, invert the dependency with a neutral action creator (see src/services/api/sessionEvents.ts).";

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'vendor/**',
    ],
  },
  ...compat.extends('@react-native'),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {import: importPlugin},
    settings: {
      'import/resolver': {
        typescript: {project: './tsconfig.json'},
      },
    },
    rules: {
      'no-console': ['warn', {allow: ['error', 'warn']}],
      'import/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [{pattern: '@/**', group: 'internal'}],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {order: 'asc', caseInsensitive: true},
        },
      ],
    },
  },
  {
    // Dependency rule, enforced here instead of by code review discipline.
    //
    // `import/no-restricted-paths` is used instead of `no-restricted-imports`
    // because this one resolves each import to a file on disk before
    // comparing it against the zone: `@/features/other/x`, `../other/x`, and
    // `../../features/other/x` are the same file, and all three forms fall
    // under the same prohibition. `no-restricted-imports` compares the string
    // as written, so it only saw the aliased variant — and this repo's
    // convention is to use relative imports within a feature itself, which is
    // exactly the form that slipped past it.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: __dirname,
          zones: [
            // One zone per feature: all of `src/features` is a forbidden
            // zone for feature X, except X's own folder.
            ...featureNames.map(name => ({
              target: `./src/features/${name}`,
              from: './src/features',
              except: [`./${name}`],
              message: CROSS_FEATURE_MESSAGE,
            })),
            {
              target: './src/services',
              from: './src/features',
              message: SERVICES_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
];
