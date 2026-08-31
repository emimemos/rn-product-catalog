import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React from 'react';

import {FavoritesScreen} from '@/features/favorites/screens/FavoritesScreen';
import {ProfileScreen} from '@/features/profile/screens/ProfileScreen';
import {colors} from '@/theme/tokens';

import {CatalogStack} from './CatalogStack';
import type {AppTabParamList} from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{tabBarActiveTintColor: colors.primary}}>
      {/*
        La etiqueta del tab es 'Productos' en vez de 'Catálogo' (el título que sí
        usa el header de CatalogStack) a propósito: si coincidieran literalmente,
        cualquier pantalla del stack que muestre el texto 'Catálogo' generaría dos
        nodos con el mismo texto visible y rompería las búsquedas por texto en los
        tests.
      */}
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{title: 'Productos', headerShown: false}}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{title: 'Favoritos'}}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{title: 'Perfil'}}
      />
    </Tab.Navigator>
  );
}
