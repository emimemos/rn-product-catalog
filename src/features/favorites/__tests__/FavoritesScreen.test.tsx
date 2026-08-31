import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {FavoritesScreen} from '../screens/FavoritesScreen';

describe('FavoritesScreen', () => {
  it('muestra el estado vacío sin favoritos', () => {
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getByText('Todavía no tenés favoritos')).toBeVisible();
  });

  it('muestra los productos favoritos resueltos desde la API', async () => {
    renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    expect(await screen.findByText('Auriculares Nimbus')).toBeVisible();
  });

  it('quita un producto de la lista al desmarcarlo', async () => {
    const {store} = renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });
});
