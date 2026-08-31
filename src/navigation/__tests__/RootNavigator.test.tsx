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

  it('muestra el splash antes de resolver el bootstrap', () => {
    renderWithProviders(<RootNavigator />);
    expect(screen.getByTestId('splash')).toBeVisible();
  });

  it('lleva al login cuando no hay sesión guardada', async () => {
    renderWithProviders(<RootNavigator />);
    expect(await screen.findByTestId('login-submit')).toBeVisible();
  });

  it('entra directo a la app cuando hay sesión guardada', async () => {
    await storage.setItem(STORAGE_KEYS.accessToken, 'demo-access-token');
    await storage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'}),
    );

    renderWithProviders(<RootNavigator />);
    // Se busca por `testID` del tab, no por el texto 'Catálogo': ese mismo
    // texto también lo renderiza LoginScreen como branding, así que
    // buscarlo por copy no distinguiría haber entrado a la app de haberse
    // quedado en el login.
    expect(await screen.findByTestId('catalog-tab')).toBeVisible();
  });
});
