import {server} from '@/mocks/server.node';

// The package's v3 only publishes its official mock (subpath `/jest`) as
// ESM, and `transformIgnorePatterns` doesn't transform it, so a direct
// `require` breaks with `SyntaxError: Unexpected token 'export'`. The same
// in-memory storage that mock exposes is reimplemented here, with the same
// interface (`getItem`/`setItem`/`removeItem`) `src/services/storage` uses.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: async (key: string) => {
        store.delete(key);
      },
    },
  };
});

// This version's mock exposes everything under `.default` instead of named
// exports (it ends up as a default export instead of named ones), so it has
// to be unwrapped here for `import {SafeAreaView, ...}` to keep working
// with Babel's normal interop.
jest.mock('react-native-safe-area-context', () => {
  const mock: {
    default: object;
  } = require('react-native-safe-area-context/jest/mock');
  return mock.default;
});

// 'error' requires every request from a test to be explicitly mocked: a
// new endpoint with no handler fails instead of hanging.
beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Redux Toolkit's `autoBatchEnhancer` (enabled by default in
// `configureStore`) schedules its notification to listeners with
// `requestAnimationFrame`, and the RN preset implements it as a real
// `setTimeout(fn, 0)`. If that timer doesn't get to fire before the test
// file that scheduled it finishes, Jest has already torn down that file's
// environment, and the callback blows up with "You are trying to access a
// property or method of the Jest environment after it has been torn down"
// when it runs while the next file is executing. Reimplementing it on top
// of a microtask instead of a macrotask makes it always resolve before the
// test that triggered it finishes, without changing runtime behavior (there
// the native `requestAnimationFrame` is still used).
Object.defineProperty(global, 'requestAnimationFrame', {
  configurable: true,
  writable: true,
  value: (callback: (time: number) => void) => {
    queueMicrotask(() => callback(Date.now()));
    return 0;
  },
});
