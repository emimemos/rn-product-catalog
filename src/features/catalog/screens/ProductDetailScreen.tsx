import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

import {ErrorView, FavoriteButton, Screen, Skeleton} from '@/components/ui';
import type {ProductDetailScreenProps} from '@/navigation/types';
import {useGetProductQuery} from '@/services/api/productsApi';
import {colors, radius, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

export function ProductDetailScreen({route}: ProductDetailScreenProps) {
  const {productId} = route.params;

  /**
   * If the product is already in the cache (it was seen in the list), `data`
   * comes populated on the first render and RTK Query revalidates in the
   * background. That's the behavior that makes navigation feel instant.
   */
  const {
    data: product,
    error,
    isLoading,
    refetch,
  } = useGetProductQuery(productId);

  if (isLoading) {
    return (
      <Screen scroll>
        <View testID="detail-skeleton" style={styles.skeleton}>
          <Skeleton height={240} />
          <Skeleton height={24} width="70%" />
          <Skeleton height={18} width="40%" />
        </View>
      </Screen>
    );
  }

  if (error != null || product == null) {
    return (
      <Screen>
        <ErrorView
          message="We couldn't load the product."
          onRetry={() => refetch().catch(() => {})}
        />
      </Screen>
    );
  }

  // Not memoized on purpose: it's a comparison and a concatenation over data
  // that's already in memory (`product`), not an expensive computation or
  // the result of traversing a collection. Wrapping it in useMemo would add
  // a dependency array and a hook call with no evidence that it's needed.
  // Memoization is justified by a measurement, not by reflex; there's
  // nothing here to suggest this computation matters.
  const availability =
    product.stock > 0 ? `${product.stock} in stock` : 'Out of stock';

  return (
    <Screen scroll>
      <Image source={{uri: product.imageUrl}} style={styles.image} />

      <View style={styles.header}>
        <Text testID="detail-name" style={styles.name}>
          {product.name}
        </Text>
        <FavoriteButton productId={product.id} />
      </View>

      <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
      <Text testID="detail-stock" style={styles.meta}>
        {product.category} · ★ {product.rating} · {availability}
      </Text>
      <Text style={styles.description}>{product.description}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeleton: {gap: spacing.md},
  image: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  name: {...typography.title, color: colors.text, flex: 1},
  price: {...typography.heading, color: colors.primary, marginTop: spacing.xs},
  meta: {...typography.caption, color: colors.textMuted, marginTop: spacing.xs},
  description: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
    lineHeight: 22,
  },
});
