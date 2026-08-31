const {FlatCompat} = require('@eslint/eslintrc');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const fs = require('fs');
const path = require('path');

const compat = new FlatCompat({baseDirectory: __dirname});

const FEATURES_DIR = path.join(__dirname, 'src', 'features');

/**
 * Las features se leen del disco en vez de listarse a mano: una feature nueva
 * queda protegida por la regla el mismo día que se crea la carpeta, sin que
 * nadie se acuerde de tocar este archivo.
 */
const featureNames = fs
  .readdirSync(FEATURES_DIR, {withFileTypes: true})
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

const CROSS_FEATURE_MESSAGE =
  'Una feature no importa de otra feature. Subí lo compartido a components/ui, services o utils. Dentro de la propia feature usá imports relativos.';

const SERVICES_MESSAGE =
  'services/ no importa de features/: la dependencia va en un solo sentido. Si services necesita avisarle algo a una feature, invertí la dependencia con un action creator neutral (ver src/services/api/sessionEvents.ts).';

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
    // Regla de dependencias, enforceada acá y no por disciplina de code review.
    //
    // Se usa `import/no-restricted-paths` en vez de `no-restricted-imports`
    // porque este resuelve cada import a un archivo en disco antes de
    // compararlo con la zona: `@/features/otra/x`, `../otra/x` y
    // `../../features/otra/x` son el mismo archivo y las tres formas caen bajo
    // la misma prohibición. `no-restricted-imports` compara el string tal cual
    // se escribió, así que solo veía la variante con alias — y la convención de
    // este repo es usar imports relativos dentro de la propia feature, que es
    // justo la forma que se le escapaba.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: __dirname,
          zones: [
            // Una zona por feature: todo `src/features` es zona prohibida para
            // la feature X, excepto la propia carpeta de X.
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
