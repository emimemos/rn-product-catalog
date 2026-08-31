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

  it('shows the user data', () => {
    renderProfile();
    expect(screen.getByTestId('profile-email')).toHaveTextContent(
      'demo@catalog.dev',
    );
    expect(screen.getByText('Demo User')).toBeVisible();
  });

  it('signs out and clears the API cache', async () => {
    const {store} = renderProfile();
    // Actually populate the cache: otherwise the final assert would pass trivially.
    await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));
    expect(Object.keys(store.getState().api.queries).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('profile-logout'));

    await waitFor(() =>
      expect(store.getState().session.status).toBe('signedOut'),
    );
    expect(store.getState().session.accessToken).toBeNull();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });

  it('navigates to the Performance Lab', () => {
    renderProfile();
    fireEvent.press(screen.getByTestId('profile-open-lab'));
    expect(navigation.navigate).toHaveBeenCalledWith('PerformanceLab');
  });
});
