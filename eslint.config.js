const {FlatCompat} = require('@eslint/eslintrc');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');

const compat = new FlatCompat({baseDirectory: __dirname});

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
    // Una feature no puede importar de otra feature; lo compartido sube a
    // components/ui, services o utils. Enforceado acá, no por disciplina.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message:
                'Una feature no importa de otra feature. Subí lo compartido a components/ui, services o utils. Dentro de la propia feature usá imports relativos.',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
];
