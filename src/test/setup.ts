import {server} from '@/mocks/server.node';

// La v3 del paquete expone el mock como el subpath `/jest` (antes era
// `/jest/async-storage-mock`); este `require` usa la ruta actual.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// El mock de esta versión expone todo bajo `.default` en vez de nombrados,
// así que rompería la interoperabilidad con cómo este árbol mínimo importa
// SafeAreaProvider/useSafeAreaInsets. Se habilita cuando algún componente
// real dependa de esos hooks y valga la pena adaptar el import o el mock.
// jest.mock('react-native-safe-area-context', () =>
//   require('react-native-safe-area-context/jest/mock'),
// );

// 'error' obliga a que todo request de un test esté explícitamente mockeado:
// un endpoint nuevo sin handler falla en vez de colgarse.
beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
