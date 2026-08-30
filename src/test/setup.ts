import {server} from '@/mocks/server.node';

// La v3 del paquete expone el mock como el subpath `/jest` (antes era
// `/jest/async-storage-mock`); este `require` usa la ruta actual.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

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
