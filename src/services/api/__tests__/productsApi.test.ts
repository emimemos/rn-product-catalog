import {makeStore} from '@/app/store';

import {productsApi} from '../productsApi';

describe('productsApi', () => {
  it('trae un producto por id', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      productsApi.endpoints.getProduct.initiate('p-001'),
    );
    expect(result.data?.id).toBe('p-001');
    expect(result.data?.name).toBe('Auriculares Nimbus');
  });

  it('expone el error cuando el producto no existe', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      productsApi.endpoints.getProduct.initiate('no-existe'),
    );
    expect(result.error).toBeDefined();
  });
});
