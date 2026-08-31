import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {useAppDispatch, useAppSelector} from '@/app/hooks';
import {restoreFavorites} from '@/services/favorites';
import {restoreSession} from '@/services/session';
import {colors} from '@/theme/tokens';

import {AppTabs} from './AppTabs';
import {AuthNavigator} from './AuthNavigator';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(state => state.session.status);

  useEffect(() => {
    // `restoreSession` already internally resolves any expected case
    // (missing session, broken storage, corrupt JSON) by dispatching
    // `sessionMissing`, so in the normal flow this promise should never
    // reject. This `catch` is the last resort against the unexpected: it's
    // logged instead of swallowing the error, because silencing it would
    // leave the user staring at the splash forever with no clue what
    // happened.
    dispatch(restoreSession()).catch((error: unknown) => {
      console.error('Could not restore the session', error);
    });
    // Same as `restoreSession`, and with the same scope: `restoreFavorites`
    // internally resolves broken storage and corrupt JSON by dispatching
    // `favoritesRestored([])`, so this `catch` is only the safeguard against
    // the unexpected.
    dispatch(restoreFavorites()).catch((error: unknown) => {
      console.error('Could not restore favorites', error);
    });
  }, [dispatch]);

  // Splash while storage is read: mounting the navigator before knowing if
  // there's a session would cause a flash of the login screen on every launch.
  if (status === 'bootstrapping') {
    return (
      <View testID="splash" style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {status === 'signedIn' ? (
        <Stack.Screen name="App" component={AppTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
