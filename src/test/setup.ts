import {server} from '@/mocks/server.node';

// La v3 del paquete solo publica su mock oficial (subpath `/jest`) como ESM,
// y `transformIgnorePatterns` no lo transforma, así que un `require` directo
// rompe con `SyntaxError: Unexpected token 'export'`. Se reimplementa acá el
// mismo storage en memoria que expone ese mock, con la misma interfaz
// (`getItem`/`setItem`/`removeItem`) que usa `src/services/storage`.
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

// El mock de esta versión expone todo bajo `.default` en vez de nombrados
// (queda como default export en vez de exports nombrados), así que hay que
// desenvolverlo acá para que `import {SafeAreaView, ...}` siga funcionando
// con la interop normal de Babel.
jest.mock('react-native-safe-area-context', () => {
  const mock: {
    default: object;
  } = require('react-native-safe-area-context/jest/mock');
  return mock.default;
});

// 'error' obliga a que todo request de un test esté explícitamente mockeado:
// un endpoint nuevo sin handler falla en vez de colgarse.
beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// El `autoBatchEnhancer` de Redux Toolkit (activado por defecto en
// `configureStore`) agenda su notificación a los listeners con
// `requestAnimationFrame`, y el preset de RN lo implementa como un
// `setTimeout(fn, 0)` real. Si ese timer no llega a dispararse antes de que
// termine el archivo de test que lo agendó, Jest ya destruyó el entorno de
// ese archivo, y el callback revienta con "You are trying to access a
// property or method of the Jest environment after it has been torn down" al
// ejecutarse mientras corre el archivo siguiente. Reimplementarlo sobre un
// microtask en vez de un macrotask hace que siempre se resuelva antes de que
// el test que lo disparó termine, sin cambiar el comportamiento en runtime
// (ahí sigue usándose el `requestAnimationFrame` nativo).
Object.defineProperty(global, 'requestAnimationFrame', {
  configurable: true,
  writable: true,
  value: (callback: (time: number) => void) => {
    queueMicrotask(() => callback(Date.now()));
    return 0;
  },
});
