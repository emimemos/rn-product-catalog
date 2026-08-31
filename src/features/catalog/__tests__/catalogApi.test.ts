import {makeStore} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

import {catalogApi} from '../catalogApi';

const ARGS: ProductsQueryArgs = {q: '', category: 'all', sort: 'name'};

describe('catalogApi', () => {
  it('fetches the first page', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(ARGS),
    );
    expect(result.data?.pages).toHaveLength(1);
    expect(result.data?.pages[0]?.items).toHaveLength(10);
  });

  it('accumulates pages when requesting the next one', async () => {
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

  it('caches pages per filter combination', async () => {
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
