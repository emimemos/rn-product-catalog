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

/**
 * Este, en cambio, no se memoiza: devuelve un boolean, y `useSelector` compara
 * con `===`, así que un primitivo no puede cambiar de identidad sin cambiar de
 * valor. `createSelector` no evitaría ni un render — solo agregaría una capa de
 * cache y una comparación de argumentos a dos comparaciones de string. El
 * criterio es el mismo que en `services/favorites/selectors.ts`: lo que decide
 * si memoizar no es que el selector sea derivado, sino si devuelve una
 * referencia nueva.
 */
export const selectHasActiveFilters = (state: RootState): boolean => {
  const catalog = selectCatalog(state);
  return (
    catalog.query.trim() !== '' ||
    catalog.category !== 'all' ||
    catalog.sort !== 'name'
  );
};
