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
    // `restoreSession` ya resuelve internamente cualquier caso esperado
    // (sesión ausente, storage roto, JSON corrupto) despachando
    // `sessionMissing`, así que en el flujo normal esta promesa no debería
    // rechazar nunca. Este `catch` es el último recurso ante lo inesperado:
    // se loguea en vez de tragarse el error, porque silenciarlo dejaría al
    // usuario mirando el splash para siempre sin ninguna pista de qué pasó.
    dispatch(restoreSession()).catch((error: unknown) => {
      console.error('No se pudo restaurar la sesión', error);
    });
    // Igual que `restoreSession`: `restoreFavorites` ya resuelve internamente
    // cualquier caso esperado despachando `favoritesRestored([])`, así que
    // este `catch` es solo el resguardo ante lo inesperado.
    dispatch(restoreFavorites()).catch((error: unknown) => {
      console.error('No se pudieron restaurar los favoritos', error);
    });
  }, [dispatch]);

  // Splash mientras se lee el storage: montar el navegador antes de saber si hay
  // sesión provocaría un flash de la pantalla de login en cada arranque.
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
