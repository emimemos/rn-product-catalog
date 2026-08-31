import {makeStore} from '@/app/store';
import {createMemoryStorage, STORAGE_KEYS} from '@/services/storage';

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
});
