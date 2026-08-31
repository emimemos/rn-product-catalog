import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

import {ProductDetailScreen} from '@/features/catalog/screens/ProductDetailScreen';
import {ProductListScreen} from '@/features/catalog/screens/ProductListScreen';

import type {CatalogStackParamList} from './types';

const Stack = createNativeStackNavigator<CatalogStackParamList>();

export function CatalogStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{title: 'Catalog'}}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{title: 'Details'}}
      />
    </Stack.Navigator>
  );
}
