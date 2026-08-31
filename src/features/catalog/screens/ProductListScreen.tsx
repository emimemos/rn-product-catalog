import React, {useCallback, useMemo} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, View} from 'react-native';
import type {ListRenderItem} from 'react-native';

import {useAppSelector} from '@/app/hooks';
import {EmptyState, ErrorView, Screen} from '@/components/ui';
import type {ProductListScreenProps} from '@/navigation/types';
import type {Product} from '@/services/api/types';
import {colors, spacing} from '@/theme/tokens';

import {useGetProductsInfiniteQuery} from '../catalogApi';
import {CategoryFilter} from '../components/CategoryFilter';
import {ProductCard, PRODUCT_CARD_HEIGHT} from '../components/ProductCard';
import {ProductListSkeleton} from '../components/ProductListSkeleton';
import {SearchBar} from '../components/SearchBar';
import {SortControl} from '../components/SortControl';
import {selectHasActiveFilters, selectProductsQueryArgs} from '../selectors';

export function ProductListScreen({navigation}: ProductListScreenProps) {
  const queryArgs = useAppSelector(selectProductsQueryArgs);
  const hasFilters = useAppSelector(selectHasActiveFilters);

  const {
    currentData,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = useGetProductsInfiniteQuery(queryArgs);

  /**
   * Flattening the pages is O(n) over `currentData.pages`. `useMemo` with
   * `currentData?.pages` as the dependency (not `currentData`) avoids
   * repeating that work on renders where the data didn't change — for
   * example, every keystroke in the search box before the new query
   * resolves. The cost of not memoizing this wasn't measured; the
   * justification is avoiding an unnecessary recomputation, not a framerate
   * measurement.
   *
   * `currentData` (data for the current arguments) is used instead of
   * `data` (which RTK Query keeps holding the last successful result even
   * after the arguments changed, to avoid flicker): with `data` the list
   * would keep showing results from the previous search while the new one
   * resolves.
   */
  const products = useMemo<Product[]>(
    () => currentData?.pages.flatMap(page => page.items) ?? [],
    [currentData?.pages],
  );

  const onPressProduct = useCallback(
    (productId: string) => navigation.navigate('ProductDetail', {productId}),
    [navigation],
  );

  /**
   * Measured by instrumenting `ProductCard`'s render: typing in the search
   * box triggers 10 renders of `renderItem` with this `useCallback` in place
   * and 10 without it; forcing 5 re-renders of the parent without changing
   * the data gives 0 renders of `ProductCard` in both cases. `renderItem`'s
   * identity is not what keeps `ProductCard` from re-rendering: `FlatList`
   * wraps each row in a `CellRenderer` (`PureComponent`) that re-runs
   * `renderItem` either way, but since `product` and `onPress` arrive with
   * the same identity, `ProductCard`'s `React.memo` still blocks the
   * re-render. What holds that identity steady is `onPressProduct` memoized
   * above.
   *
   * Memoizing `renderItem` is still worthwhile, but for a different reason:
   * without `useCallback` it changes identity on every parent render and
   * forces the list's internal `CellRenderer`s to re-render — even if the
   * cards don't — which is still extra work.
   */
  const renderItem = useCallback<ListRenderItem<Product>>(
    ({item}) => <ProductCard product={item} onPress={onPressProduct} />,
    [onPressProduct],
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // Known fixed height: keeps the FlatList from measuring each row and makes
  // scrolling to an index O(1).
  const getItemLayout = useCallback(
    (_data: ArrayLike<Product> | null | undefined, index: number) => ({
      length: PRODUCT_CARD_HEIGHT,
      offset: PRODUCT_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {});
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const header = (
    <>
      <SearchBar />
      <CategoryFilter />
      <SortControl />
    </>
  );

  if (error != null) {
    return (
      <Screen>
        {header}
        <ErrorView
          message="We couldn't load the catalog."
          onRetry={() => refetch().catch(() => {})}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      {isLoading ? (
        <ProductListSkeleton />
      ) : (
        <FlatList
          testID="product-list"
          data={products}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshing={isFetching && !isFetchingNextPage}
          onRefresh={() => refetch().catch(() => {})}
          contentContainerStyle={
            products.length === 0 ? styles.emptyContainer : styles.list
          }
          ListEmptyComponent={
            <EmptyState
              title="No results"
              message={
                hasFilters
                  ? 'Try another search or clear the filters.'
                  : 'There are no products yet.'
              }
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {paddingHorizontal: spacing.md},
  emptyContainer: {flexGrow: 1, justifyContent: 'center'},
  footer: {paddingVertical: spacing.md},
});
