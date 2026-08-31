import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import type {SortOption} from '@/services/api/types';
import {colors, radius, spacing, typography} from '@/theme/tokens';

import {sortChanged} from '../catalogSlice';

const OPTIONS: Array<{value: SortOption; label: string}> = [
  {value: 'name', label: 'Nombre'},
  {value: 'price_asc', label: 'Precio ↑'},
  {value: 'price_desc', label: 'Precio ↓'},
];

export function SortControl() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.catalog.sort);

  const onSelect = useCallback(
    (value: SortOption) => dispatch(sortChanged(value)),
    [dispatch],
  );

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
            onPress={() => onSelect(option.value)}
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
