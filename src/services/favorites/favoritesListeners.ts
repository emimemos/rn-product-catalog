import type {AppStartListening} from '@/app/listenerMiddleware';
import {unauthorized} from '@/services/api/sessionEvents';
import {signedOut} from '@/services/session';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {favoriteToggled} from './favoritesSlice';

/**
 * La persistencia vive en un listener y no dentro del reducer: los reducers
 * tienen que ser puros y síncronos, y escribir en AsyncStorage no es ninguna de
 * las dos cosas. Cada servicio se ocupa de su propia clave de storage: sesión
 * borra token y usuario, favoritos borra su lista.
 */
export function registerFavoritesListeners(
  startAppListening: AppStartListening,
): void {
  startAppListening({
    actionCreator: favoriteToggled,
    effect: async (_action, api) => {
      const {ids} = api.getState().favorites;
      await storage.setItem(STORAGE_KEYS.favorites, JSON.stringify(ids));
    },
  });

  startAppListening({
    matcher: action => signedOut.match(action) || unauthorized.match(action),
    effect: async () => {
      await storage.removeItem(STORAGE_KEYS.favorites);
    },
  });
}
