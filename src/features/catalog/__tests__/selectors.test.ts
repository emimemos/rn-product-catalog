import {makeStore} from '@/app/store';

import {categoryChanged, queryChanged} from '../catalogSlice';
import {selectHasActiveFilters, selectProductsQueryArgs} from '../selectors';

describe('selectProductsQueryArgs', () => {
  it('devuelve la misma referencia si el estado relevante no cambió', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    const second = selectProductsQueryArgs(store.getState());
    expect(second).toBe(first);
  });

  it('sigue devolviendo la misma referencia tras un dispatch que no toca el catálogo', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch({type: 'ruido/irrelevante'});
    expect(selectProductsQueryArgs(store.getState())).toBe(first);
  });

  it('devuelve una referencia nueva cuando cambia un filtro', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch(categoryChanged('audio'));
    const second = selectProductsQueryArgs(store.getState());
    expect(second).not.toBe(first);
    expect(second.category).toBe('audio');
  });
});

describe('selectHasActiveFilters', () => {
  it('es falso con los filtros por defecto', () => {
    expect(selectHasActiveFilters(makeStore().getState())).toBe(false);
  });

  it('es verdadero cuando hay una búsqueda', () => {
    const store = makeStore();
    store.dispatch(queryChanged('nimbus'));
    expect(selectHasActiveFilters(store.getState())).toBe(true);
  });
});
