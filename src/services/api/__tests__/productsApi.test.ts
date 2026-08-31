import {makeStore} from '@/app/store';

import {productsApi} from '../productsApi';

describe('productsApi', () => {
  it('fetches a product by id', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      productsApi.endpoints.getProduct.initiate('p-001'),
    );
    expect(result.data?.id).toBe('p-001');
    expect(result.data?.name).toBe('Headphones Nimbus');
  });

  it('exposes the error when the product does not exist', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      productsApi.endpoints.getProduct.initiate('no-existe'),
    );
    expect(result.error).toBeDefined();
  });
});
