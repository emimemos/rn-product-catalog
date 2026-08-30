import {createListenerMiddleware} from '@reduxjs/toolkit';

import type {AppDispatch, RootState} from './store';

export const listenerMiddleware = createListenerMiddleware();

/**
 * `withTypes` evita repetir los genéricos en cada listener. El import de
 * RootState/AppDispatch es solo de tipos, así que no crea un ciclo en runtime.
 */
export const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

export type AppStartListening = typeof startAppListening;
