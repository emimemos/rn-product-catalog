module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // @react-native/jest-preset's test environment resolves `exports` with
    // the 'react-native' condition, and msw declares that condition as
    // `null` in 'msw/node' (meant only for plain Node) so RN bundlers won't
    // pick it up. Under that condition Jest doesn't fall back to the rest of
    // `exports`, it just fails resolution, so this points straight at the
    // file.
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    // immer's (a dependency of @reduxjs/toolkit) `exports`' 'react-native'
    // condition always points to its ESM build, even when whoever requests
    // the package uses `require`. Same as with msw/node, this points
    // straight at the CJS file to keep Jest from trying to parse ESM.
    '^immer$': '<rootDir>/node_modules/immer/dist/cjs/index.js',
    // Same problem as with immer: react-redux's 'react-native' condition
    // also points to its ESM build.
    '^react-redux$': '<rootDir>/node_modules/react-redux/dist/cjs/index.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:@?react-native|@react-navigation|msw|@mswjs|@bundled-es-modules|until-async|outvariant|strict-event-emitter|headers-polyfill|rettime|@open-draft)/)',
  ],
  transform: {
    // `.mjs` is added to the preset's default extension: `rettime` (a
    // transitive dependency of msw) is published only as ESM (`.mjs`).
    '^.+\\.(js|mjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      '@react-native/jest-preset/jest/assetFileTransformer.js',
    ),
  },
  collectCoverageFrom: [
    'src/features/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  /**
   * The threshold is set just below what the suite measures today
   * (98.19 / 96.87 / 90.82 / 98.12): that way CI fails when a test is deleted
   * or code is added without coverage, which is the only thing a threshold
   * can detect. A threshold 25 points below the real number defends
   * nothing: a third of the suite could be deleted and it would still stay
   * green.
   *
   * The denominator is `collectCoverageFrom`'s: `features/`, `services/`,
   * and `utils/`. Left out are `src/app`, `src/navigation`,
   * `src/components/ui`, `src/theme`, `src/mocks`, and `src/test` —
   * composition, presentation primitives, and test infrastructure. Several
   * of those still get exercised end to end from the screen tests; what
   * they don't do is count toward the percentage.
   */
  coverageThreshold: {
    global: {statements: 97, branches: 95, functions: 89, lines: 97},
  },
};
