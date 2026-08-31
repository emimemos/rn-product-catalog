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
   * Nivel 1 de la demo de memoización: aplanar las páginas es O(n) y corre en
   * cada render del padre —incluido cada tecla del buscador— si no se
   * memoiza. La dependencia es `currentData?.pages`, no `currentData`.
   *
   * Se usa `currentData` (datos para los argumentos actuales) en vez de
   * `data` (que RTK Query mantiene con el último resultado exitoso aunque
   * hayan cambiado los argumentos, para evitar parpadeos): con `data` la
   * lista seguiría mostrando resultados de la búsqueda anterior mientras se
   * resuelve la nueva.
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
   * Nivel 2: `renderItem` estable vía `useCallback`. Si se recreara en cada
   * render, `ProductCard` recibiría una prop `onPress` con identidad nueva y
   * el `React.memo` del nivel 3 no evitaría el re-render igual.
   */
  const renderItem = useCallback<ListRenderItem<Product>>(
    ({item}) => <ProductCard product={item} onPress={onPressProduct} />,
    [onPressProduct],
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // Altura fija conocida: evita que la FlatList mida cada fila y hace que el
  // scroll a un índice sea O(1).
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
          message="No pudimos cargar el catálogo."
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
              title="Sin resultados"
              message={
                hasFilters
                  ? 'Probá con otra búsqueda o quitá los filtros.'
                  : 'Todavía no hay productos.'
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
