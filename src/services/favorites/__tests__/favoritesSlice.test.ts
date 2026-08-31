import {makeStore} from '@/app/store';
import {unauthorized} from '@/services/api/sessionEvents';
import {signedOut} from '@/services/session';
import {STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';
import {createMemoryStorage} from '@/services/storage/memoryStorage';

import favoritesReducer, {
  favoriteToggled,
  favoritesRestored,
  restoreFavorites,
} from '../favoritesSlice';
import type {FavoritesState} from '../favoritesSlice';

const empty: FavoritesState = {ids: []};

describe('favoritesSlice', () => {
  it('arranca vacío', () => {
    expect(favoritesReducer(undefined, {type: '@@INIT'})).toEqual(empty);
  });

  it('agrega un id que no estaba', () => {
    expect(favoritesReducer(empty, favoriteToggled('p-001')).ids).toEqual([
      'p-001',
    ]);
  });

  it('quita un id que ya estaba', () => {
    const state: FavoritesState = {ids: ['p-001', 'p-002']};
    expect(favoritesReducer(state, favoriteToggled('p-001')).ids).toEqual([
      'p-002',
    ]);
  });

  it('no duplica ids', () => {
    let state = favoritesReducer(empty, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-002'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    expect(state.ids).toEqual(['p-002', 'p-001']);
  });

  it('reemplaza la lista al restaurar', () => {
    const state: FavoritesState = {ids: ['p-009']};
    expect(
      favoritesReducer(state, favoritesRestored(['p-001', 'p-002'])).ids,
    ).toEqual(['p-001', 'p-002']);
  });

  // Los favoritos son del usuario, no del dispositivo: si no se vaciaran, el
  // próximo que entre en el mismo teléfono vería los del anterior.
  it('vacía la lista al cerrar sesión', () => {
    const state: FavoritesState = {ids: ['p-001', 'p-002']};
    expect(favoritesReducer(state, signedOut()).ids).toEqual([]);
  });

  it('vacía la lista cuando la sesión caduca con un 401', () => {
    const state: FavoritesState = {ids: ['p-001']};
    expect(favoritesReducer(state, unauthorized()).ids).toEqual([]);
  });
});

describe('restoreFavorites', () => {
  // Se despacha contra una store real (como en sessionSlice.test.ts) en vez de
  // invocar el thunk a mano con un dispatch de mentira: `restoreFavorites` está
  // tipado con `ThunkAction`, que exige `dispatch`, `getState` y el
  // `extraArgument` reales, y es `store.dispatch` quien los provee.
  it('hidrata desde el storage', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-003']));

    const store = makeStore();
    await store.dispatch(restoreFavorites({storage}));

    expect(store.getState().favorites.ids).toEqual(['p-003']);
  });

  it('no rompe si el storage tiene JSON inválido', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, 'no-es-json');

    const store = makeStore();
    await store.dispatch(restoreFavorites({storage}));

    expect(store.getState().favorites.ids).toEqual([]);
  });

  it('arranca vacío cuando falla la lectura del storage', async () => {
    // Mismo criterio que `restoreSession`: un storage roto o sin permisos no
    // se distingue de no tener nada guardado. Si el thunk rechazara, el
    // bootstrap de `RootNavigator` loguearía el error y la lista quedaría sin
    // inicializar.
    const storage: Storage = {
      getItem: jest.fn().mockRejectedValue(new Error('storage no disponible')),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const store = makeStore();
    await expect(
      store.dispatch(restoreFavorites({storage})),
    ).resolves.toBeUndefined();

    expect(store.getState().favorites.ids).toEqual([]);
  });
});
