import type {AppStartListening} from '@/app/listenerMiddleware';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {favoriteToggled} from './favoritesSlice';

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
}
