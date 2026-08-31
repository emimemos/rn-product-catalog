import type {AppStartListening} from '@/app/listenerMiddleware';
import {unauthorized} from '@/services/api/sessionEvents';
import {signedOut} from '@/services/session';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {favoriteToggled} from './favoritesSlice';

/**
 * Persistence lives in a listener and not inside the reducer: reducers have
 * to be pure and synchronous, and writing to AsyncStorage is neither. Each
 * service handles its own storage key: session clears the token and user,
 * favorites clears its list.
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
