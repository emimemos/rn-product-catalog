import {server} from '@/mocks/server.node';

// La v3 del paquete expone el mock como el subpath `/jest` (antes era
// `/jest/async-storage-mock`); este `require` usa la ruta actual.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// Se habilita en la Task 6, cuando el árbol de la app empieza a depender de
// SafeAreaProvider/useSafeAreaInsets de verdad: el mock actual expone todo
// bajo `.default` y rompe la interoperabilidad de nombrados con el árbol
// mínimo de hoy.
// jest.mock('react-native-safe-area-context', () =>
//   require('react-native-safe-area-context/jest/mock'),
// );

// 'error' obliga a que todo request de un test esté explícitamente mockeado:
// un endpoint nuevo sin handler falla en vez de colgarse.
beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
