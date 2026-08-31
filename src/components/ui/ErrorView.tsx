import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, spacing, typography} from '@/theme/tokens';

import {Button} from './Button';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({message, onRetry}: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry != null && (
        <Button
          label="Retry"
          onPress={onRetry}
          variant="ghost"
          testID="retry"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: spacing.xl, alignItems: 'center', gap: spacing.md},
  message: {...typography.body, color: colors.danger, textAlign: 'center'},
});
