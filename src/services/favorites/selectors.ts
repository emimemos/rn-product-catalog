import type {RootState} from '@/app/store';

export const selectFavoriteIds = (state: RootState): string[] =>
  state.favorites.ids;

/**
 * A parameterized selector that returns a boolean: it isn't memoized.
 * `useSelector` compares with `===` and a primitive can't change identity
 * without changing value, so `createSelector` wouldn't avoid any render; on
 * top of that, a memoized selector with a parameter would need one instance
 * per component so the cache doesn't invalidate itself between rows. Same
 * criterion as `selectHasActiveFilters` in `features/catalog/selectors.ts`,
 * and the opposite of `selectProductsQueryArgs`, which does build a new
 * object.
 */
export const selectIsFavorite = (
  state: RootState,
  productId: string,
): boolean => state.favorites.ids.includes(productId);
