import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import React from 'react';

import {server} from '@/mocks/server.node';
import {API_BASE_URL} from '@/services/api/config';
import {renderWithProviders} from '@/test/renderWithProviders';

import {SEARCH_DEBOUNCE_MS} from '../components/SearchBar';
import {ProductListScreen} from '../screens/ProductListScreen';

/**
 * Destraba el debounce del buscador sin abandonar los temporizadores fake a
 * mitad de vuelo.
 *
 * `jest.advanceTimersByTime` (sincrónico) más un `jest.useRealTimers()`
 * inmediatamente después dispara un bug real de `@reduxjs/toolkit`: su
 * `autoBatchEnhancer` encola la notificación a los suscriptores con
 * `requestAnimationFrame` (con un `setTimeout` de respaldo), y si esa cola
 * queda armada bajo timers fake y el test pasa a reales antes de que se
 * dispare, la notificación pendiente queda huérfana. Redux sigue procesando
 * las acciones (el estado final del store es correcto), pero React nunca se
 * entera: el componente deja de re-renderizar para siempre, incluso ante
 * cambios posteriores, aunque el store ya tenga el resultado. Se reprodujo de
 * forma aislada con un componente mínimo suscripto a esta misma infinite
 * query — no es específico de esta pantalla, y no hay forma de evitarlo
 * cambiando cómo se consume el hook.
 * `jest.advanceTimersByTimeAsync` evita el problema: intercala el avance del
 * reloj fake con el drenado de promesas (el fetch contra msw), así que el
 * pedido a la nueva query se resuelve sin nunca soltar los timers fake a
 * mitad de camino.
 */
async function waitOutDebounce() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 50);
  });
}

const navigation = {navigate: jest.fn()};

function renderScreen() {
  return renderWithProviders(
    <ProductListScreen
      navigation={navigation as never}
      route={{key: 'k', name: 'ProductList'} as never}
    />,
  );
}

describe('ProductListScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('muestra el skeleton mientras carga', async () => {
    renderScreen();
    expect(screen.getByTestId('list-skeleton')).toBeVisible();
    // Se espera a que la carga inicial asiente para que el dispatch async del
    // fetch caiga dentro del test, no después: si el test termina apenas se
    // afirma el skeleton, esa resolución llega fuera del `act` de este test.
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
  });

  it('muestra la primera página de productos', async () => {
    renderScreen();
    expect(await screen.findByText('Auriculares Atlas')).toBeVisible();
    expect(screen.queryByTestId('list-skeleton')).toBeNull();
  });

  it('filtra la lista al buscar', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-list')).toBeVisible(),
    );

    fireEvent.changeText(screen.getByTestId('search-input'), 'Gamepad');
    await waitOutDebounce();

    expect(await screen.findByText('Gamepad Atlas')).toBeVisible();
    expect(screen.queryByText('Auriculares Atlas')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay coincidencias', async () => {
    jest.useFakeTimers();
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-list')).toBeVisible(),
    );

    fireEvent.changeText(screen.getByTestId('search-input'), 'zzzznoexiste');
    await waitOutDebounce();

    expect(await screen.findByText('Sin resultados')).toBeVisible();
  });

  it('muestra el error con reintento cuando la API falla', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products`, () =>
        HttpResponse.json({message: 'Boom'}, {status: 500}),
      ),
    );
    renderScreen();
    expect(await screen.findByTestId('retry')).toBeVisible();
  });

  it('navega al detalle al tocar un producto', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('product-card-p-005'));
    expect(navigation.navigate).toHaveBeenCalledWith('ProductDetail', {
      productId: 'p-005',
    });
  });
});
