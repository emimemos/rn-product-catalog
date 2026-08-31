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
 * Store fresco por test: el cache de RTK Query es estado global, y compartirlo
 * entre tests los vuelve dependientes del orden de ejecución.
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
