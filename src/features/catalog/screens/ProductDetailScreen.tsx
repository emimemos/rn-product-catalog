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
   * Si el producto ya está en el cache (se vio en la lista), `data` viene
   * poblado en el primer render y RTK Query revalida en background. Es el
   * comportamiento que hace que la navegación se sienta instantánea.
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
          message="No pudimos cargar el producto."
          onRetry={() => refetch().catch(() => {})}
        />
      </Screen>
    );
  }

  // No memoizado a propósito: es una comparación y una concatenación sobre
  // datos que ya están en memoria (`product`), no un cálculo costoso ni el
  // resultado de recorrer una colección. Envolverlo en useMemo agregaría un
  // array de dependencias y una llamada a hook sin que haya evidencia de que
  // hace falta. La memoización se justifica con una medición, no por reflejo;
  // acá no hay nada que sugiera que este cálculo importe.
  const availability =
    product.stock > 0 ? `${product.stock} en stock` : 'Sin stock';

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
