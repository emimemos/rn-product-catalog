import {createSelector} from '@reduxjs/toolkit';

import type {RootState} from '@/app/store';
import type {ProductsQueryArgs} from '@/services/api/types';

const selectCatalog = (state: RootState) => state.catalog;

/**
 * Este selector arma un objeto nuevo; sin `createSelector` la identidad
 * cambiaría en cada llamada y `useGetProductsInfiniteQuery(args)` re-suscribiría
 * el hook en cada render de la app, aunque nada del catálogo hubiera cambiado.
 */
export const selectProductsQueryArgs = createSelector(
  [selectCatalog],
  (catalog): ProductsQueryArgs => ({
    q: catalog.query,
    category: catalog.category,
    sort: catalog.sort,
  }),
);

export const selectHasActiveFilters = createSelector(
  [selectCatalog],
  catalog =>
    catalog.query.trim() !== '' ||
    catalog.category !== 'all' ||
    catalog.sort !== 'name',
);
