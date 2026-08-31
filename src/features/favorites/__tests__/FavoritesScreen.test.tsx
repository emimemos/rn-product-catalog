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

  // Un id guardado cuyo producto ya no existe devuelve 404. Antes esa fila se
  // quedaba en skeleton para siempre: `isLoading` pasaba a false pero `product`
  // seguía indefinido, y la única rama que había las trataba igual.
  it('muestra una fila de error cuando el producto favorito ya no existe', async () => {
    renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-inexistente']}},
    });

    expect(
      await screen.findByTestId('favorite-error-p-inexistente'),
    ).toBeVisible();
    expect(screen.getByText('Producto no disponible')).toBeVisible();
  });

  it('permite quitar de favoritos un producto que ya no existe', async () => {
    const {store} = renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-inexistente']}},
    });

    fireEvent.press(await screen.findByTestId('favorite-p-inexistente'));
    expect(store.getState().favorites.ids).toEqual([]);
  });
});
