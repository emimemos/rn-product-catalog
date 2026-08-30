import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import React from 'react';

import {server} from '@/mocks/server.node';
import {API_BASE_URL} from '@/services/api/config';
import {renderWithProviders} from '@/test/renderWithProviders';

import {LoginScreen} from '../screens/LoginScreen';

function fillAndSubmit(email: string, password: string) {
  fireEvent.changeText(screen.getByTestId('login-email'), email);
  fireEvent.changeText(screen.getByTestId('login-password'), password);
  fireEvent.press(screen.getByTestId('login-submit'));
}

describe('LoginScreen', () => {
  it('muestra un error de formato cuando el email es inválido', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('no-es-un-email', 'password123');
    expect(await screen.findByText('Ingresá un email válido')).toBeVisible();
  });

  it('muestra un error cuando la contraseña es muy corta', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', '123');
    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeVisible();
  });

  it('deja el estado en signedIn tras un login exitoso', async () => {
    const {store} = renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    await waitFor(() =>
      expect(store.getState().session.status).toBe('signedIn'),
    );
    expect(store.getState().session.accessToken).toBe('demo-access-token');
  });

  it('muestra un mensaje de credenciales inválidas ante un 401', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'incorrecta1');
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Email o contraseña incorrectos',
    );
  });

  it('diferencia el error de red del error de credenciales', async () => {
    server.use(
      http.post(`${API_BASE_URL}/auth/login`, () => HttpResponse.error()),
    );
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo',
    );
  });
});
