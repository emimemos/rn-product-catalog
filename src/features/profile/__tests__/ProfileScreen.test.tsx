import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {productsApi} from '@/services/api/productsApi';
import {renderWithProviders} from '@/test/renderWithProviders';

import {ProfileScreen} from '../screens/ProfileScreen';

const navigation = {navigate: jest.fn()};

const signedIn = {
  session: {
    status: 'signedIn' as const,
    accessToken: 'demo-access-token',
    user: {id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'},
  },
};

function renderProfile() {
  return renderWithProviders(
    <ProfileScreen
      navigation={navigation as never}
      route={{key: 'k', name: 'Profile'} as never}
    />,
    {preloadedState: signedIn},
  );
}

describe('ProfileScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('muestra los datos del usuario', () => {
    renderProfile();
    expect(screen.getByTestId('profile-email')).toHaveTextContent(
      'demo@catalog.dev',
    );
    expect(screen.getByText('Demo User')).toBeVisible();
  });

  it('cierra la sesión y limpia el cache de la API', async () => {
    const {store} = renderProfile();
    // Poblar el cache de verdad: si no, el assert final pasaría trivialmente.
    await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));
    expect(Object.keys(store.getState().api.queries).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('profile-logout'));

    await waitFor(() =>
      expect(store.getState().session.status).toBe('signedOut'),
    );
    expect(store.getState().session.accessToken).toBeNull();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });

  it('navega al Performance Lab', () => {
    renderProfile();
    fireEvent.press(screen.getByTestId('profile-open-lab'));
    expect(navigation.navigate).toHaveBeenCalledWith('PerformanceLab');
  });
});
