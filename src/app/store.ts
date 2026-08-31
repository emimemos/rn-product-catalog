import {combineReducers, configureStore} from '@reduxjs/toolkit';

import catalogReducer from '@/features/catalog/catalogSlice';
import {baseApi} from '@/services/api/baseApi';
import {
  favoritesReducer,
  registerFavoritesListeners,
} from '@/services/favorites';
import {registerSessionListeners, sessionReducer} from '@/services/session';

import {listenerMiddleware, startAppListening} from './listenerMiddleware';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  session: sessionReducer,
  catalog: catalogReducer,
  favorites: favoritesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware()
        .prepend(listenerMiddleware.middleware)
        .concat(baseApi.middleware),
  });
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

// El registro se hace una sola vez a nivel de módulo, no por store: queda
// atado al middleware, que es compartido por todas las instancias de la app.
registerSessionListeners(startAppListening);
registerFavoritesListeners(startAppListening);
