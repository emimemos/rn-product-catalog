import React, {useCallback} from 'react';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import {CATEGORIES} from '@/services/api/types';
import type {Category} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {categoryChanged} from '../catalogSlice';

const OPTIONS: Array<Category | 'all'> = ['all', ...CATEGORIES];

const LABELS: Record<Category | 'all', string> = {
  all: 'Todas',
  audio: 'Audio',
  wearables: 'Wearables',
  computers: 'Computación',
  gaming: 'Gaming',
  home: 'Hogar',
};

export function CategoryFilter() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.catalog.category);

  const onSelect = useCallback(
    (category: Category | 'all') => dispatch(categoryChanged(category)),
    [dispatch],
  );

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
            onPress={() => onSelect(option)}
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
