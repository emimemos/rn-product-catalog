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
        `tabBarButtonTestID` identifies the tab button without depending on
        visible text: navigation tests use it to confirm that the logged-in
        app was reached without coupling to any product copy.
      */}
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{
          title: 'Catalog',
          headerShown: false,
          tabBarButtonTestID: 'catalog-tab',
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{title: 'Favorites'}}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{title: 'Profile', headerShown: false}}
      />
    </Tab.Navigator>
  );
}
