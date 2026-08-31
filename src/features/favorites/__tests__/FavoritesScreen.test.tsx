import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '@/test/renderWithProviders';

import {FavoritesScreen} from '../screens/FavoritesScreen';

describe('FavoritesScreen', () => {
  it('shows the empty state with no favorites', () => {
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getByText('No favorites yet')).toBeVisible();
  });

  it('shows the favorite products resolved from the API', async () => {
    renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    expect(await screen.findByText('Headphones Nimbus')).toBeVisible();
  });

  it('removes a product from the list when unmarked', async () => {
    const {store} = renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-001']}},
    });
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });

  // A saved id whose product no longer exists returns a 404. That row used to
  // stay on the skeleton forever: `isLoading` turned false but `product`
  // stayed undefined, and the only branch that existed treated them the same.
  it('shows an error row when the favorite product no longer exists', async () => {
    renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-inexistente']}},
    });

    expect(
      await screen.findByTestId('favorite-error-p-inexistente'),
    ).toBeVisible();
    expect(screen.getByText('Product not available')).toBeVisible();
  });

  it('allows removing a product that no longer exists from favorites', async () => {
    const {store} = renderWithProviders(<FavoritesScreen />, {
      preloadedState: {favorites: {ids: ['p-inexistente']}},
    });

    fireEvent.press(await screen.findByTestId('favorite-p-inexistente'));
    expect(store.getState().favorites.ids).toEqual([]);
  });
});
