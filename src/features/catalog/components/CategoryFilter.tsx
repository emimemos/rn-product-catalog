import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import {CATEGORIES} from '@/services/api/types';
import type {Category} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {categoryChanged} from '../catalogSlice';

const OPTIONS: Array<Category | 'all'> = ['all', ...CATEGORIES];

const LABELS: Record<Category | 'all', string> = {
  all: 'All',
  audio: 'Audio',
  wearables: 'Wearables',
  computers: 'Computers',
  gaming: 'Gaming',
  home: 'Home',
};

export function CategoryFilter() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.catalog.category);

  /**
   * The handler is inline and without `useCallback` on purpose. Each chip
   * needs its own category, so `onPress` would be a new closure per render
   * either way (`() => onSelect(option)`) even if `onSelect` were stable: the
   * memoization would end up wrapped in something unmemoized and wouldn't
   * save a single render. And `Pressable` isn't memoized, so it re-renders
   * with the parent regardless. It's six chips over a dispatch; the criterion
   * is the same as in `ProductDetailScreen`: memoize when there's a reason,
   * not by reflex.
   */
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {OPTIONS.map(option => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            testID={`category-${option}`}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={() => dispatch(categoryChanged(option))}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  chipActive: {backgroundColor: colors.primary},
  label: {...typography.caption, color: colors.textMuted},
  labelActive: {color: colors.primaryText, fontWeight: '600'},
});
