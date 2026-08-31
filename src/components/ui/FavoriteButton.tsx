import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import {favoriteToggled, selectIsFavorite} from '@/services/favorites';
import {colors, radius, spacing} from '@/theme/tokens';

interface FavoriteButtonProps {
  productId: string;
}

export function FavoriteButton({productId}: FavoriteButtonProps) {
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector(state =>
    selectIsFavorite(state, productId),
  );

  const onPress = useCallback(() => {
    dispatch(favoriteToggled(productId));
  }, [dispatch, productId]);

  return (
    <Pressable
      testID={`favorite-${productId}`}
      accessibilityRole="button"
      accessibilityLabel={
        isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
      }
      accessibilityState={{selected: isFavorite}}
      onPress={onPress}
      style={styles.button}>
      <Text style={[styles.icon, isFavorite && styles.iconActive]}>
        {isFavorite ? '♥' : '♡'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {padding: spacing.sm, borderRadius: radius.full},
  icon: {fontSize: 24, color: colors.textMuted},
  iconActive: {color: colors.favorite},
});
