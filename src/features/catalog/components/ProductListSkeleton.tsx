import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Skeleton} from '@/components/ui';
import {spacing} from '@/theme/tokens';

import {PRODUCT_CARD_HEIGHT} from './ProductCard';

const PLACEHOLDER_COUNT = 6;

export function ProductListSkeleton() {
  return (
    <View testID="list-skeleton" style={styles.container}>
      {Array.from({length: PLACEHOLDER_COUNT}, (_, index) => (
        <Skeleton key={index} height={PRODUCT_CARD_HEIGHT - spacing.md} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: spacing.md, gap: spacing.md},
});
