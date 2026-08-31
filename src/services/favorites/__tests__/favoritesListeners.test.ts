import {makeStore} from '@/app/store';
import {unauthorized} from '@/services/api/sessionEvents';
import {signedOut} from '@/services/session';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {favoriteToggled} from '../favoritesSlice';

/**
 * Igual que en `sessionListeners.test.ts`: lo que se prueba acá es el efecto
 * sobre el storage, que ningún reducer toca y ningún otro test mira. Los tests
 * de borrado siembran el storage a mano para no depender del listener de
 * escritura y poder fallar por su cuenta.
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

  it('persiste la lista de ids al marcar un favorito', async () => {
    const store = makeStore();
    store.dispatch(favoriteToggled('p-001'));
    store.dispatch(favoriteToggled('p-007'));
    await settle();

    expect(await readFavorites()).toBe(JSON.stringify(['p-001', 'p-007']));
  });

  it('persiste la lista sin el id al desmarcar', async () => {
    const store = makeStore({favorites: {ids: ['p-001', 'p-007']}});
    store.dispatch(favoriteToggled('p-001'));
    await settle();

    expect(await readFavorites()).toBe(JSON.stringify(['p-007']));
  });

  it('borra la lista guardada al cerrar sesión', async () => {
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-001']));

    const store = makeStore({favorites: {ids: ['p-001']}});
    store.dispatch(signedOut());
    await settle();

    expect(await readFavorites()).toBeNull();
  });

  it('borra la lista guardada cuando la sesión caduca con un 401', async () => {
    await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['p-001']));

    const store = makeStore({favorites: {ids: ['p-001']}});
    store.dispatch(unauthorized());
    await settle();

    expect(await readFavorites()).toBeNull();
  });
});
