import {createSelector} from '@reduxjs/toolkit';

import type {RootState} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

const selectCatalog = (state: RootState) => state.catalog;

/**
 * This selector builds a new object; without `createSelector` its identity
 * would change on every call and `useGetProductsInfiniteQuery(args)` would
 * re-subscribe the hook on every app render, even if nothing in the catalog
 * had changed.
 */
export const selectProductsQueryArgs = createSelector(
  [selectCatalog],
  (catalog): ProductsQueryArgs => ({
    q: catalog.query,
    category: catalog.category,
    sort: catalog.sort,
  }),
);

/**
 * This one, on the other hand, isn't memoized: it returns a boolean, and
 * `useSelector` compares with `===`, so a primitive can't change identity
 * without changing value. `createSelector` wouldn't avoid a single render —
 * it would only add a cache layer and an argument comparison on top of two
 * string comparisons. The criterion is the same as in
 * `services/favorites/selectors.ts`: what decides whether to memoize isn't
 * whether the selector is derived, but whether it returns a new reference.
 */
export const selectHasActiveFilters = (state: RootState): boolean => {
  const catalog = selectCatalog(state);
  return (
    catalog.query.trim() !== '' ||
    catalog.category !== 'all' ||
    catalog.sort !== 'name'
  );
};
