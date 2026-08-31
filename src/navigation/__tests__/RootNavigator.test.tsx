import {screen} from '@testing-library/react-native';
import React from 'react';

import {STORAGE_KEYS, storage} from '@/services/storage';
import {renderWithProviders} from '@/test/renderWithProviders';

import {RootNavigator} from '../RootNavigator';

describe('RootNavigator', () => {
  afterEach(async () => {
    await storage.removeItem(STORAGE_KEYS.accessToken);
    await storage.removeItem(STORAGE_KEYS.user);
  });

  it('shows the splash before the bootstrap settles', async () => {
    renderWithProviders(<RootNavigator />);
    expect(screen.getByTestId('splash')).toBeVisible();
    // We wait for the bootstrap to settle so its async dispatch lands
    // inside this test: `storage.getItem` resolves async even against the
    // mock, so without this await the `sessionMissing()` arrives after the
    // test has already finished, outside React's `act`.
    expect(await screen.findByTestId('login-submit')).toBeVisible();
  });

  it('takes you to login when there is no saved session', async () => {
    renderWithProviders(<RootNavigator />);
    expect(await screen.findByTestId('login-submit')).toBeVisible();
  });

  it('goes straight into the app when there is a saved session', async () => {
    await storage.setItem(STORAGE_KEYS.accessToken, 'demo-access-token');
    await storage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'}),
    );

    renderWithProviders(<RootNavigator />);
    // We search by the tab's `testID`, not by the text 'Catalog': that same
    // text is also rendered by LoginScreen as branding, so searching by copy
    // wouldn't distinguish having entered the app from having stayed on the
    // login screen.
    expect(await screen.findByTestId('catalog-tab')).toBeVisible();
  });
});
