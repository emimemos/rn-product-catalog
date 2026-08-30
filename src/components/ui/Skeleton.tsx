import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {DimensionValue, ViewStyle} from 'react-native';

import {colors, radius} from '@/theme/tokens';

interface SkeletonProps {
  height: number;
  width?: DimensionValue;
  style?: ViewStyle;
}

export function Skeleton({height, width = '100%', style}: SkeletonProps) {
  return (
    <View
      accessibilityRole="progressbar"
      style={[styles.base, {height, width}, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {backgroundColor: colors.surface, borderRadius: radius.sm},
});
