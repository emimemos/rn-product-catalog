import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import type {SortOption} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {sortChanged} from '../catalogSlice';

const OPTIONS: Array<{value: SortOption; label: string}> = [
  {value: 'name', label: 'Name'},
  {value: 'price_asc', label: 'Price ↑'},
  {value: 'price_desc', label: 'Price ↓'},
];

export function SortControl() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.catalog.sort);

  // Inline handler without `useCallback`, for the same reason as in
  // `CategoryFilter`: each chip closes over its own value, so the closure is
  // recreated either way and memoizing the handler above wouldn't avoid anything.
  return (
    <View style={styles.row}>
      {OPTIONS.map(option => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            testID={`sort-${option.value}`}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={() => dispatch(sortChanged(option.value))}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {borderColor: colors.primary, backgroundColor: colors.surface},
  label: {...typography.caption, color: colors.textMuted},
  labelActive: {color: colors.primary, fontWeight: '600'},
});
