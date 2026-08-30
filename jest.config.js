module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // El entorno de test de @react-native/jest-preset resuelve `exports` con
    // la condición 'react-native', y msw declara esa condición como `null`
    // en 'msw/node' (solo pensado para Node puro) para que los bundlers de RN
    // no lo tomen. Bajo esa condición Jest no cae al resto de `exports`, sino
    // que falla la resolución, así que se apunta directo al archivo.
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:@?react-native|@react-navigation|msw|@mswjs|@bundled-es-modules|until-async|outvariant|strict-event-emitter|headers-polyfill|rettime|@open-draft)/)',
  ],
  transform: {
    // Se agrega `.mjs` a la extensión por defecto del preset: `rettime`
    // (dependencia transitiva de msw) se publica solo como ESM (`.mjs`).
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
  coverageThreshold: {
    global: {statements: 70, branches: 60, functions: 65, lines: 70},
  },
};
