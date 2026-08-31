import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

import {PerformanceLabScreen} from '@/features/profile/screens/PerformanceLabScreen';
import {ProfileScreen} from '@/features/profile/screens/ProfileScreen';

import type {ProfileStackParamList} from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
      <Stack.Screen
        name="PerformanceLab"
        component={PerformanceLabScreen}
        options={{title: 'Performance Lab'}}
      />
    </Stack.Navigator>
  );
}
