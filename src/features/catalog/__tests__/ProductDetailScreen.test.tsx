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
  it('shows the skeleton while loading', async () => {
    renderDetail('p-001');
    expect(screen.getByTestId('detail-skeleton')).toBeVisible();
    // We wait for the query to settle so its resolution (msw fetch ->
    // `fulfilled` action) lands inside this test: without this await it
    // arrives after the test has already finished, outside React's `act`.
    expect(await screen.findByTestId('detail-name')).toBeVisible();
  });

  it('shows the product data', async () => {
    renderDetail('p-001');
    expect(await screen.findByTestId('detail-name')).toHaveTextContent(
      'Headphones Nimbus',
    );
    expect(screen.getByText('$19.99')).toBeVisible();
  });

  it('renders instantly if the product is already in the cache', async () => {
    const {store} = renderWithProviders(<></>);
    await store.dispatch(productsApi.endpoints.getProduct.initiate('p-001'));

    renderDetail('p-001', store);
    // No skeleton pass: the data was already there.
    expect(screen.queryByTestId('detail-skeleton')).toBeNull();
    expect(screen.getByTestId('detail-name')).toHaveTextContent(
      'Headphones Nimbus',
    );
  });

  it('toggles the favorite', async () => {
    const {store} = renderDetail('p-001');
    fireEvent.press(await screen.findByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual(['p-001']);
    fireEvent.press(screen.getByTestId('favorite-p-001'));
    expect(store.getState().favorites.ids).toEqual([]);
  });

  it('shows an error with retry if the product does not exist', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/:id`, () =>
        HttpResponse.json({message: 'Not found'}, {status: 404}),
      ),
    );
    renderDetail('p-999');
    expect(await screen.findByTestId('retry')).toBeVisible();
  });
});
