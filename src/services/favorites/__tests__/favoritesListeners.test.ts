import {makeStore} from '@/app/store';
import {unauthorized} from '@/services/api/sessionEvents';
import {signedOut} from '@/services/session';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {favoriteToggled} from '../favoritesSlice';

/**
 * Same as in `sessionListeners.test.ts`: what's being tested here is the
 * effect on storage, which no reducer touches and no other test looks at.
 * The clearing tests seed storage by hand so they don't depend on the write
 * listener and can fail on their own.
 */
function settle(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function readFavorites(): Promise<string | null> {
  return storage.getItem(STORAGE_KEYS.favorites);
}

describe('favoritesListeners', () => {
  afterEach(async () => {
    await storage.removeItem(STORAGE_KEYS.favorites);
  });

  it('persists the id list when marking a favorite', async () => {
    const store = makeStore();
    store.dispatch(favoriteToggled('p-001'));
    store.dispatch(favoriteToggled('p-007'));
    await settle();

    expect(await readFavorites()).toBe(JSON.stringify(['p-001', 'p-007']));
  });

  it('persists the list without the id when unmarking', async () => {
    const store = makeStore({favorites: {ids: ['p-001', 'p-007']}});
    store.dispatch(favoriteToggled('p-001'));
    await settle();

    expect(await readFavorites()).toBe(JSON.stringify(['p-007']));
  });

  it('clears the saved list on sign out', async () => {
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-001']));

    const store = makeStore({favorites: {ids: ['p-001']}});
    store.dispatch(signedOut());
    await settle();

    expect(await readFavorites()).toBeNull();
  });

  it('clears the saved list when the session expires with a 401', async () => {
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-001']));

    const store = makeStore({favorites: {ids: ['p-001']}});
    store.dispatch(unauthorized());
    await settle();

    expect(await readFavorites()).toBeNull();
  });
});
