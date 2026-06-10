/**
 * ProfileStackNavigator - Profile section navigation
 * Includes Profile screen and User Dashboard
 * Material 3 compliant design
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { getScreenOptions } from './navigationConfig';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';
import MyPropertiesScreen from '../screens/profile/MyPropertiesScreen';
import UserDashboardScreen from '../screens/dashboard/UserDashboardScreen';
import RecommendationsScreen from '../screens/common/RecommendationsScreen';
import ReferralProgramScreen from '../screens/profile/ReferralProgramScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  HelpSupport: undefined;
  MyProperties: undefined;
  UserDashboard: undefined;
  Recommendations: undefined;
  ReferralProgram: undefined;
};

const Stack = createStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#F9FAFB' },
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
          overlayStyle: {
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        }),
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 150,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 120,
            },
          },
        },
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{
          title: 'Profile'
        }}
      />
      
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerShown: false,
        }}
      />
      
      <Stack.Screen 
        name="Notifications" 
        component={NotificationScreen}
        options={{
          title: 'Notifications',
          headerShown: false,
        }}
      />
      
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          title: 'Notification Settings',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
            color: '#1F2937',
          },
          headerTintColor: '#1F2937',
        }}
      />
      
      <Stack.Screen 
        name="HelpSupport" 
        component={HelpSupportScreen}
        options={{
          title: 'Help & Support',
          headerShown: false,
        }}
      />
      
      <Stack.Screen 
        name="MyProperties" 
        component={MyPropertiesScreen}
        options={{
          title: 'My Properties',
          headerShown: false,
        }}
      />
      
      <Stack.Screen 
        name="UserDashboard" 
        component={UserDashboardScreen}
        options={{
          title: 'My Dashboard',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
            color: '#1F2937',
          },
          headerTintColor: '#1F2937',
        }}
      />
      
      <Stack.Screen 
        name="Recommendations" 
        component={RecommendationsScreen}
        options={{
          title: 'For You',
        }}
      />
      
      <Stack.Screen 
        name="ReferralProgram" 
        component={ReferralProgramScreen}
        options={{
          title: 'Referral Program',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
            color: '#1F2937',
          },
          headerTintColor: '#1F2937',
        }}
      />
    </Stack.Navigator>
  );
}
