import type {AppStartListening} from '@/app/listenerMiddleware';
import {unauthorized} from '@/services/api/sessionEvents';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {sessionApi} from './sessionApi';
import {signedOut} from './sessionSlice';

/**
 * La persistencia vive en un listener y no dentro del reducer: los reducers
 * tienen que ser puros y síncronos, y escribir en AsyncStorage no es ninguna de
 * las dos cosas.
 */
export function registerSessionListeners(
  startAppListening: AppStartListening,
): void {
  startAppListening({
    matcher: sessionApi.endpoints.login.matchFulfilled,
    effect: async action => {
      await Promise.all([
        storage.setItem(STORAGE_KEYS.accessToken, action.payload.accessToken),
        storage.setItem(STORAGE_KEYS.user, JSON.stringify(action.payload.user)),
      ]);
    },
  });

  startAppListening({
    matcher: action => signedOut.match(action) || unauthorized.match(action),
    effect: async () => {
      await Promise.all([
        storage.removeItem(STORAGE_KEYS.accessToken),
        storage.removeItem(STORAGE_KEYS.user),
      ]);
    },
  });
}
