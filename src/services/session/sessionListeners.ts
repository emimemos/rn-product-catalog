import type {AppStartListening} from '@/app/listenerMiddleware';
import {unauthorized} from '@/services/api/sessionEvents';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {sessionApi} from './sessionApi';
import {signedOut} from './sessionSlice';

/**
 * Persistence lives in a listener and not inside the reducer: reducers have
 * to be pure and synchronous, and writing to AsyncStorage is neither.
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
