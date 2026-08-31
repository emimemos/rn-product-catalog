import {createListenerMiddleware} from '@reduxjs/toolkit';

import type {AppDispatch, RootState} from './store';

export const listenerMiddleware = createListenerMiddleware();

/**
 * `withTypes` avoids repeating the generics in every listener. The
 * RootState/AppDispatch import is type-only, so it doesn't create a cycle
 * at runtime.
 */
export const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

export type AppStartListening = typeof startAppListening;
