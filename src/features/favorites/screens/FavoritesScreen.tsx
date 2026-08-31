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
 *
 * El costo de resolver por id es que cada fila tiene su propio estado de error:
 * un producto que se dio de baja del catálogo devuelve 404 y su fila no puede
 * pintarse nunca. Sin una rama de error esa fila se queda en skeleton para
 * siempre, sin explicación y sin salida. El reintento por fila sería falsa
 * esperanza ante un 404, así que la acción que se ofrece es la útil: quitarlo
 * de favoritos.
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
            Producto no disponible
          </Text>
          <Text style={styles.price}>
            Ya no está en el catálogo ({productId}).
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
          title="Todavía no tenés favoritos"
          message="Tocá el corazón en el detalle de un producto para guardarlo acá."
        />
      </Screen>
    );
  }

  /**
   * A diferencia de `ProductListScreen`, acá `renderItem`, `keyExtractor` y
   * `getItemLayout` van inline y sin memoizar, a propósito. Esta lista no
   * pagina y no tiene ningún control que re-renderice la pantalla sin que la
   * lista misma haya cambiado: el único estado del que depende es `ids`, así
   * que cuando este componente re-renderiza es justamente porque los datos
   * cambiaron y la lista tiene que rehacerse igual. Memoizar ahí no ahorra
   * nada; solo agrega hooks y dependencias que hay que mantener en sincronía.
   * `getItemLayout` tampoco aplica: la fila de error y la fila normal no miden
   * lo mismo, así que no hay altura fija que declarar.
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
