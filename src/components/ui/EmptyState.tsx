import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, spacing, typography} from '@/theme/tokens';

interface EmptyStateProps {
  title: string;
  message?: string;
}

export function EmptyState({title, message}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message != null && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: spacing.xl, alignItems: 'center', gap: spacing.sm},
  title: {...typography.heading, color: colors.text},
  message: {...typography.body, color: colors.textMuted, textAlign: 'center'},
});
