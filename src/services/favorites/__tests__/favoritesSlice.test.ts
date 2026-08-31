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
  it('starts empty', () => {
    expect(favoritesReducer(undefined, {type: '@@INIT'})).toEqual(empty);
  });

  it('adds an id that was not there', () => {
    expect(favoritesReducer(empty, favoriteToggled('p-001')).ids).toEqual([
      'p-001',
    ]);
  });

  it('removes an id that was already there', () => {
    const state: FavoritesState = {ids: ['p-001', 'p-002']};
    expect(favoritesReducer(state, favoriteToggled('p-001')).ids).toEqual([
      'p-002',
    ]);
  });

  it('does not duplicate ids', () => {
    let state = favoritesReducer(empty, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-002'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    state = favoritesReducer(state, favoriteToggled('p-001'));
    expect(state.ids).toEqual(['p-002', 'p-001']);
  });

  it('replaces the list on restore', () => {
    const state: FavoritesState = {ids: ['p-009']};
    expect(
      favoritesReducer(state, favoritesRestored(['p-001', 'p-002'])).ids,
    ).toEqual(['p-001', 'p-002']);
  });

  // Favorites belong to the user, not the device: if they weren't cleared,
  // the next person to sign in on the same phone would see the previous
  // user's favorites.
  it('empties the list on sign out', () => {
    const state: FavoritesState = {ids: ['p-001', 'p-002']};
    expect(favoritesReducer(state, signedOut()).ids).toEqual([]);
  });

  it('empties the list when the session expires with a 401', () => {
    const state: FavoritesState = {ids: ['p-001']};
    expect(favoritesReducer(state, unauthorized()).ids).toEqual([]);
  });
});

describe('restoreFavorites', () => {
  // Dispatched against a real store (as in sessionSlice.test.ts) instead of
  // invoking the thunk by hand with a fake dispatch: `restoreFavorites` is
  // typed with `ThunkAction`, which requires the real `dispatch`,
  // `getState`, and `extraArgument`, and it's `store.dispatch` that provides
  // them.
  it('hydrates from storage', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-003']));

    const store = makeStore();
    await store.dispatch(restoreFavorites({storage}));

    expect(store.getState().favorites.ids).toEqual(['p-003']);
  });

  it('does not break if storage has invalid JSON', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.favorites, 'no-es-json');

    const store = makeStore();
    await store.dispatch(restoreFavorites({storage}));

    expect(store.getState().favorites.ids).toEqual([]);
  });

  it('starts empty when reading storage fails', async () => {
    // Same criterion as `restoreSession`: broken or unauthorized storage is
    // indistinguishable from having nothing saved. If the thunk rejected,
    // RootNavigator's bootstrap would log the error and the list would stay
    // uninitialized.
    const storage: Storage = {
      getItem: jest.fn().mockRejectedValue(new Error('storage unavailable')),
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
