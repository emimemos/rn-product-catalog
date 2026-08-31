import type {RootState} from '@/app/store';

export const selectFavoriteIds = (state: RootState): string[] =>
  state.favorites.ids;

/**
 * Selector con parámetro que devuelve un boolean: no se memoiza. `useSelector`
 * compara con `===` y un primitivo no cambia de identidad sin cambiar de valor,
 * así que `createSelector` no evitaría ningún render; encima, un selector
 * memoizado con parámetro necesitaría una instancia por componente para no
 * invalidarse el cache entre filas. Mismo criterio que `selectHasActiveFilters`
 * en `features/catalog/selectors.ts`, y el opuesto al de
 * `selectProductsQueryArgs`, que sí arma un objeto nuevo.
 */
export const selectIsFavorite = (
  state: RootState,
  productId: string,
): boolean => state.favorites.ids.includes(productId);
