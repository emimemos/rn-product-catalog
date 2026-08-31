import React, {memo, useCallback} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import type {Product} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';
import {formatPrice} from '@/utils/formatPrice';

/** Altura fija: es lo que habilita `getItemLayout` en la FlatList. */
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
 * `React.memo` evita el re-render mientras `product` y `onPress` lleguen con
 * la misma identidad. La identidad de `onPress` depende de que quien arma
 * `renderItem` (ver `ProductListScreen`) memoice el handler que le pasa acá;
 * medido ahí, la identidad de `renderItem` en sí no influye en esto —
 * `FlatList` la vuelve a invocar en su propio `CellRenderer` de cualquier
 * forma, y esta comparación superficial sigue bloqueando el re-render con las
 * mismas props.
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
