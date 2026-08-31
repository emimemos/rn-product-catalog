import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React from 'react';

import {FavoritesScreen} from '@/features/favorites/screens/FavoritesScreen';
import {colors} from '@/theme/tokens';

import {CatalogStack} from './CatalogStack';
import {ProfileStack} from './ProfileStack';
import type {AppTabParamList} from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{tabBarActiveTintColor: colors.primary}}>
      {/*
        `tabBarButtonTestID` identifica el botón del tab sin depender de texto
        visible: los tests de navegación lo usan para confirmar que se llegó
        a la app logueada sin acoplarse a ningún copy de producto.
      */}
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{
          title: 'Catálogo',
          headerShown: false,
          tabBarButtonTestID: 'catalog-tab',
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{title: 'Favoritos'}}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{title: 'Perfil', headerShown: false}}
      />
    </Tab.Navigator>
  );
}
