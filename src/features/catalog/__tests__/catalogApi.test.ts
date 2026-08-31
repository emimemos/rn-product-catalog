import {makeStore} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

import {catalogApi} from '../catalogApi';

const ARGS: ProductsQueryArgs = {q: '', category: 'all', sort: 'name'};

describe('catalogApi', () => {
  it('trae la primera página', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(ARGS),
    );
    expect(result.data?.pages).toHaveLength(1);
    expect(result.data?.pages[0]?.items).toHaveLength(10);
  });

  it('acumula páginas al pedir la siguiente', async () => {
    const store = makeStore();
    await store.dispatch(catalogApi.endpoints.getProducts.initiate(ARGS));
    const result = await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(ARGS, {direction: 'forward'}),
    );
    expect(result.data?.pages).toHaveLength(2);
    const ids =
      result.data?.pages.flatMap(page => page.items.map(item => item.id)) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cachea las páginas por combinación de filtros', async () => {
    const store = makeStore();
    await store.dispatch(catalogApi.endpoints.getProducts.initiate(ARGS));
    await store.dispatch(
      catalogApi.endpoints.getProducts.initiate({...ARGS, category: 'audio'}),
    );
    const entries = Object.keys(store.getState().api.queries).filter(key =>
      key.startsWith('getProducts'),
    );
    expect(entries).toHaveLength(2);
  });
});
