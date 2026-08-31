import {NavigationContainer} from '@react-navigation/native';
import {render} from '@testing-library/react-native';
import React from 'react';
import type {PropsWithChildren, ReactElement} from 'react';
import {Provider} from 'react-redux';

import {makeStore} from '@/app/store';
import type {AppStore, RootState} from '@/app/store';

interface ExtendedRenderOptions {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

/**
 * A fresh store per test: RTK Query's cache is global state, and sharing it
 * across tests makes them dependent on execution order.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = makeStore(preloadedState),
  }: ExtendedRenderOptions = {},
) {
  function Wrapper({children}: PropsWithChildren) {
    return (
      <Provider store={store}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
  }

  return {store, ...render(ui, {wrapper: Wrapper})};
}
