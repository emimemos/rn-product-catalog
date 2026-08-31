import {makeStore} from '@/app/store';
import {DEMO_PASSWORD, DEMO_USER} from '@/mocks/db';
import {ACCESS_TOKEN} from '@/mocks/handlers';
import {unauthorized} from '@/services/api/sessionEvents';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {sessionApi} from '../sessionApi';
import {signOut} from '../sessionSlice';

/**
 * Estos tests miran el storage, no el store. Los de `sessionSlice` prueban que
 * el estado en memoria queda bien; acá se prueba lo único que hace el listener
 * middleware —escribir y borrar— y que ningún reducer toca. Sin esto, vaciar
 * el cuerpo de los listeners deja la suite entera en verde aunque la sesión ya
 * no sobreviva a un reinicio de la app.
 *
 * Cada test siembra el storage por su cuenta en vez de apoyarse en el listener
 * del test anterior: así el que prueba el borrado falla si se rompe el
 * borrado, no solo si se rompe la escritura.
 */

/**
 * Los efectos de los listeners son `async`: el dispatch vuelve antes de que
 * terminen de escribir. Un turno de macrotask alcanza para que el storage en
 * memoria del mock de AsyncStorage haya resuelto.
 */
function settle(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function readSession(): Promise<{
  token: string | null;
  user: string | null;
}> {
  return {
    token: await storage.getItem(STORAGE_KEYS.accessToken),
    user: await storage.getItem(STORAGE_KEYS.user),
  };
}

async function seedStoredSession(): Promise<void> {
  await storage.setItem(STORAGE_KEYS.accessToken, ACCESS_TOKEN);
  await storage.setItem(STORAGE_KEYS.user, JSON.stringify(DEMO_USER));
}

describe('sessionListeners', () => {
  afterEach(async () => {
    await storage.removeItem(STORAGE_KEYS.accessToken);
    await storage.removeItem(STORAGE_KEYS.user);
  });

  it('persiste token y usuario cuando el login se resuelve', async () => {
    const store = makeStore();
    await store.dispatch(
      sessionApi.endpoints.login.initiate({
        email: DEMO_USER.email,
        password: DEMO_PASSWORD,
      }),
    );
    await settle();

    expect(await readSession()).toEqual({
      token: ACCESS_TOKEN,
      user: JSON.stringify(DEMO_USER),
    });
  });

  it('borra token y usuario del storage al cerrar sesión', async () => {
    await seedStoredSession();

    const store = makeStore();
    await store.dispatch(signOut());
    await settle();

    expect(await readSession()).toEqual({token: null, user: null});
  });

  it('borra token y usuario del storage cuando la sesión caduca con un 401', async () => {
    await seedStoredSession();

    // El 401 no pasa por el thunk de logout: lo despacha el wrapper del
    // baseQuery. Si la limpieza del storage viviera en ese thunk, este caso
    // dejaría la sesión anterior escrita en disco.
    const store = makeStore();
    store.dispatch(unauthorized());
    await settle();

    expect(await readSession()).toEqual({token: null, user: null});
  });
});
