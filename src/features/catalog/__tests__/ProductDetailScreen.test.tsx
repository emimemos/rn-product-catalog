import {fireEvent, screen} from '@testing-library/react-native';
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
  it('muestra el skeleton mientras carga', async () => {
    renderDetail('p-001');
    expect(screen.getByTestId('detail-skeleton')).toBeVisible();
    // Se espera a que la query asiente para que su resolución (fetch de msw
    // -> acción `fulfilled`) caiga dentro de este test: sin este await llega
    // después de que el test ya terminó, fuera del `act` de React.
    expect(await screen.findByTestId('detail-name')).toBeVisible();
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
