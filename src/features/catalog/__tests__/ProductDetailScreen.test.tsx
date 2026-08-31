import {act, fireEvent, screen} from '@testing-library/react-native';
import {http, HttpResponse} from 'msw';
import React from 'react';

import {server} from '@/mocks/server.node';
import {API_BASE_URL} from '@/services/api/config';
import {productsApi} from '@/services/api/productsApi';
import {renderWithProviders} from '@/test/renderWithProviders';

import {ProductDetailScreen} from '../screens/ProductDetailScreen';

function renderDetail(
  productId: string,
  store?: ReturnType<typeof renderWithProviders>['store'],
) {
  return renderWithProviders(
    <ProductDetailScreen
      route={{key: 'k', name: 'ProductDetail', params: {productId}} as never}
      navigation={{setOptions: jest.fn()} as never}
    />,
    store ? {store} : undefined,
  );
}

describe('ProductDetailScreen', () => {
  /**
   * El primer caso solo afirma el skeleton y no espera a que la query
   * resuelva. `useGetProductQuery` sigue en vuelo cuando el test termina, y
   * su resolución (fetch de msw -> acción `fulfilled` -> notificación del
   * `autoBatchEnhancer` sobre un microtask, ver `src/test/setup.ts`) cae
   * fuera del `act()` implícito del test si nadie la espera, y React avisa
   * con "not wrapped in act". Vaciar la cola de microtasks acá, después de
   * cada test, hace que esa resolución pendiente quede envuelta en un `act`
   * antes de que arranque el siguiente test, sin tocar los casos en sí.
   */
  afterEach(async () => {
    await act(async () => {});
  });

  it('muestra el skeleton mientras carga', () => {
    renderDetail('p-001');
    expect(screen.getByTestId('detail-skeleton')).toBeVisible();
  });

  it('muestra los datos del producto', async () => {
    renderDetail('p-001');
    expect(await screen.findByTestId('detail-name')).toHaveTextContent(
      'Auriculares Nimbus',
    );
    expect(screen.getByText('$19.99')).toBeVisible();
  });

  it('pinta al instante si el producto ya está en el cache', async () => {
    const {store} = renderWithProviders(<></>);
    await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));

    renderDetail('p-001', store);
    // Sin pasar por el skeleton: el dato ya estaba.
    expect(screen.queryByTestId('detail-skeleton')).toBeNull();
    expect(screen.getByTestId('detail-name')).toHaveTextContent(
      'Auriculares Nimbus',
    );
  });

  it('alterna el favorito', async () => {
    const {store} = renderDetail('p-001');
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual(['p-001']);
    fireEvent.press(screen.getByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });

  it('muestra un error con reintento si el producto no existe', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/:id`, () =>
        HttpResponse.json({message: 'No encontrado'}, {status: 404}),
      ),
    );
    renderDetail('p-999');
    expect(await screen.findByTestId('retry')).toBeVisible();
  });
});
