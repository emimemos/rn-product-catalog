import {makeStore} from '@/app/store';

import {categoryChanged, queryChanged} from '../catalogSlice';
import {selectHasActiveFilters, selectProductsQueryArgs} from '../selectors';

describe('selectProductsQueryArgs', () => {
  it('returns the same reference if the relevant state did not change', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    const second = selectProductsQueryArgs(store.getState());
    expect(second).toBe(first);
  });

  it('keeps returning the same reference after a dispatch that does not touch the catalog', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch({type: 'ruido/irrelevante'});
    expect(selectProductsQueryArgs(store.getState())).toBe(first);
  });

  it('returns a new reference when a filter changes', () => {
    const store = makeStore();
    const first = selectProductsQueryArgs(store.getState());
    store.dispatch(categoryChanged('audio'));
    const second = selectProductsQueryArgs(store.getState());
    expect(second).not.toBe(first);
    expect(second.category).toBe('audio');
  });
});

describe('selectHasActiveFilters', () => {
  it('is false with the default filters', () => {
    expect(selectHasActiveFilters(makeStore().getState())).toBe(false);
  });

  it('is true when there is a search', () => {
    const store = makeStore();
    store.dispatch(queryChanged('nimbus'));
    expect(selectHasActiveFilters(store.getState())).toBe(true);
  });
});
