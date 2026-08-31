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
  it('shows a format error when the email is invalid', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('no-es-un-email', 'password123');
    expect(await screen.findByText('Enter a valid email')).toBeVisible();
  });

  it('shows an error when the password is too short', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', '123');
    expect(
      await screen.findByText('Password must be at least 8 characters'),
    ).toBeVisible();
  });

  it('leaves the state as signedIn after a successful login', async () => {
    const {store} = renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    await waitFor(() =>
      expect(store.getState().session.status).toBe('signedIn'),
    );
    expect(store.getState().session.accessToken).toBe('demo-access-token');
  });

  it('shows an invalid credentials message on a 401', async () => {
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'wrongpass1');
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Incorrect email or password',
    );
  });

  it('tells the network error apart from the credentials error', async () => {
    server.use(
      http.post(`${API_BASE_URL}/auth/login`, () => HttpResponse.error()),
    );
    renderWithProviders(<LoginScreen />);
    fillAndSubmit('demo@catalog.dev', 'password123');
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      "We couldn't connect. Check your connection and try again",
    );
  });
});
