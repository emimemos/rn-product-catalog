import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';

import {useAppSelector} from '@/app/hooks';
import {EmptyState, FavoriteButton, Screen, Skeleton} from '@/components/ui';
import {useGetProductQuery} from '@/services/api/productsApi';
import {selectFavoriteIds} from '@/services/favorites';
import {colors, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

/**
 * Cada fila resuelve su producto por id. Si ya está en el cache de RTK Query
 * (porque se vio en el catálogo) se pinta al instante y no hay request; si no,
 * se pide. Guardar solo ids evita que favoritos y catálogo se desincronicen.
 */
function FavoriteRow({productId}: {productId: string}) {
  const {data: product, isLoading} = useGetProductQuery(productId);

  if (isLoading || product == null) {
    return <Skeleton height={64} />;
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
          title="Todavía no tenés favoritos"
          message="Tocá el corazón en el detalle de un producto para guardarlo acá."
        />
      </Screen>
    );
  }

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
