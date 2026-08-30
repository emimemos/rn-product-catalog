import React from 'react';
import type {ReactNode} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors, spacing} from '@/theme/tokens';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
}

export function Screen({children, scroll = false}: ScreenProps) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Container
        style={styles.content}
        contentContainerStyle={scroll ? styles.scroll : undefined}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {flex: 1},
  scroll: {padding: spacing.md},
});
