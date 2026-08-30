module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {'^@/(.*)$': '<rootDir>/src/$1'},
  transformIgnorePatterns: [
    'node_modules/(?!(?:@?react-native|@react-navigation|msw|@mswjs|@bundled-es-modules|until-async|outvariant|strict-event-emitter|headers-polyfill)/)',
  ],
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
