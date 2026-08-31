import React, {memo, useCallback} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import type {Product} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

/** Fixed height: that's what enables `getItemLayout` on the FlatList. */
export const PRODUCT_CARD_HEIGHT = 96;

interface ProductCardProps {
  product: Product;
  onPress: (id: string) => void;
}

function ProductCardComponent({product, onPress}: ProductCardProps) {
  const handlePress = useCallback(
    () => onPress(product.id),
    [onPress, product.id],
  );

  return (
    <Pressable
      testID={`product-card-${product.id}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.container}>
      <Image source={{uri: product.imageUrl}} style={styles.image} />
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.meta}>
          {product.category} · ★ {product.rating}
        </Text>
        <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
      </View>
    </Pressable>
  );
}

/**
 * `React.memo` avoids the re-render as long as `product` and `onPress`
 * arrive with the same identity. `onPress`'s identity depends on whoever
 * builds `renderItem` (see `ProductListScreen`) memoizing the handler it
 * passes here; measured there, the identity of `renderItem` itself has no
 * bearing on this — `FlatList` invokes it again from its own `CellRenderer`
 * regardless, and this shallow comparison still blocks the re-render given
 * the same props.
 */
export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  container: {
    height: PRODUCT_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  image: {
    width: PRODUCT_CARD_HEIGHT - spacing.md * 2,
    height: PRODUCT_CARD_HEIGHT - spacing.md * 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  body: {flex: 1, gap: spacing.xs},
  name: {...typography.body, color: colors.text, fontWeight: '600'},
  meta: {...typography.caption, color: colors.textMuted},
  price: {...typography.body, color: colors.primary, fontWeight: '600'},
});
