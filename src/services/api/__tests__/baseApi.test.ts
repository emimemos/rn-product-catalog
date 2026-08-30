import {makeStore} from '@/app/store';

import {baseApi} from '../baseApi';

describe('store', () => {
  it('monta el reducer de la API bajo la clave `api`', () => {
    const store = makeStore();
    expect(store.getState()).toHaveProperty(baseApi.reducerPath);
  });

  it('crea stores independientes', () => {
    expect(makeStore()).not.toBe(makeStore());
  });
});
