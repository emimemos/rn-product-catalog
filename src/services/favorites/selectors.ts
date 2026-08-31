import type {RootState} from '@/app/store';

export const selectFavoriteIds = (state: RootState): string[] =>
  state.favorites.ids;

/**
 * Selector con parámetro: devuelve un boolean (primitivo), así que no hace falta
 * createSelector — `useSelector` compara con `===` y un boolean nunca cambia de
 * identidad sin cambiar de valor. Memoizarlo sería puro costo.
 */
export const selectIsFavorite = (
  state: RootState,
  productId: string,
): boolean => state.favorites.ids.includes(productId);
