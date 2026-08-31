import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Button, Screen} from '@/components/ui';
import type {ProfileScreenProps} from '@/navigation/types';
import {useSession} from '@/services/session';
import {colors, spacing, typography} from '@/theme/tokens';

export function ProfileScreen({navigation}: ProfileScreenProps) {
  const {user, signOut} = useSession();

  return (
    <Screen scroll>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
        <Text testID="profile-email" style={styles.email}>
          {user?.email ?? '—'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          testID="profile-open-lab"
          label="Performance Lab"
          variant="ghost"
          onPress={() => navigation.navigate('PerformanceLab')}
        />
        <Button testID="profile-logout" label="Sign out" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {gap: spacing.xs, paddingVertical: spacing.lg},
  name: {...typography.title, color: colors.text},
  email: {...typography.body, color: colors.textMuted},
  actions: {gap: spacing.md},
});
