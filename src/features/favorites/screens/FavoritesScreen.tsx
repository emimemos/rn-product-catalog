import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';

import {useAppSelector} from '@/app/hooks';
import {EmptyState, FavoriteButton, Screen, Skeleton} from '@/components/ui';
import {useGetProductQuery} from '@/services/api/productsApi';
import {selectFavoriteIds} from '@/services/favorites';
import {colors, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

/**
 * Each row resolves its product by id. If it's already in RTK Query's cache
 * (because it was seen in the catalog) it renders instantly and there's no
 * request; if not, it's fetched. Storing only ids keeps favorites and the
 * catalog from going out of sync.
 *
 * The cost of resolving by id is that each row has its own error state: a
 * product that was delisted from the catalog returns a 404 and its row can
 * never render. Without an error branch that row stays on the skeleton
 * forever, with no explanation and no way out. A per-row retry would be false
 * hope against a 404, so the action offered is the useful one: remove it from
 * favorites.
 */
function FavoriteRow({productId}: {productId: string}) {
  const {data: product, error, isLoading} = useGetProductQuery(productId);

  if (isLoading) {
    return <Skeleton height={64} />;
  }

  if (error != null || product == null) {
    return (
      <View testID={`favorite-error-${productId}`} style={styles.row}>
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>
            Product not available
          </Text>
          <Text style={styles.price}>
            No longer in the catalog ({productId}).
          </Text>
        </View>
        <FavoriteButton productId={productId} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
      </View>
      <FavoriteButton productId={product.id} />
    </View>
  );
}

export function FavoritesScreen() {
  const ids = useAppSelector(selectFavoriteIds);

  if (ids.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No favorites yet"
          message="Tap the heart on a product to save it here."
        />
      </Screen>
    );
  }

  /**
   * Unlike `ProductListScreen`, here `renderItem`, `keyExtractor`, and
   * `getItemLayout` are inline and unmemoized, on purpose. This list doesn't
   * paginate and has no control that re-renders the screen without the list
   * itself having changed: the only state it depends on is `ids`, so when
   * this component re-renders it's precisely because the data changed and the
   * list has to be rebuilt anyway. Memoizing here saves nothing; it only adds
   * hooks and dependencies that have to be kept in sync. `getItemLayout`
   * doesn't apply either: the error row and the normal row don't measure the
   * same, so there's no fixed height to declare.
   */
  return (
    <Screen>
      <FlatList
        testID="favorites-list"
        data={ids}
        keyExtractor={id => id}
        renderItem={({item}) => <FavoriteRow productId={item} />}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {padding: spacing.md, gap: spacing.sm},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  info: {flex: 1, gap: spacing.xs},
  name: {...typography.body, color: colors.text, fontWeight: '600'},
  price: {...typography.caption, color: colors.textMuted},
});
