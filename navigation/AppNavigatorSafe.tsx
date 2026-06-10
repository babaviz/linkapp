/**
 * AppNavigatorSafe - Main App Navigator with all screens
 * Fixed version without inline component warnings
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import MainTabs
import MainTabs from './MainTabs';

// Import actual detail screens
import PropertyDetailsScreen from '../screens/property/PropertyDetailsScreen';
import JobDetailsScreen from '../screens/jobs/JobDetailsScreen';

// Import stack navigators for nested navigation
import PropertyStackNavigator from './PropertyStackNavigator';
import JobsStackNavigator from './JobsStackNavigator';
import ServicesStackNavigator from './ServicesStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import MessageStackNavigator from './MessageStackNavigator';

const Stack = createStackNavigator();

export type RootStackParamList = {
  MainTabs: undefined;
  PropertyDetails: { propertyId: string; property?: any };
  JobDetails: { jobId: string; job?: any };
  PropertyStack: undefined;
  JobsStack: undefined;
  ServicesStack: undefined;
  ProfileStack: undefined;
  MessageStack: undefined;
  // Add more screens as needed
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  Search: { type?: string };
  Filter: { category?: string };
  Chat: { chatId?: string; userId?: string };
  ServiceDetails: { serviceId: string; service?: any };
  BookService: { serviceId: string };
  PaymentScreen: { amount: number; type: string };
  MapView: { properties?: any[] };
};

export default function AppNavigatorSafe() {
  return (
    <Stack.Navigator
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        cardStyle: { backgroundColor: '#FFFFFF' },
        animationTypeForReplace: 'push',
        detachPreviousScreen: false,
      }}
    >
      {/* Main Tab Navigator */}
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ 
          headerShown: false,
          animationEnabled: true,
          detachPreviousScreen: false,
        }}
      />
      
      {/* Property Related Screens */}
      <Stack.Screen 
        name="PropertyDetails" 
        component={PropertyDetailsScreen}
        options={{ 
          headerShown: true, 
          title: 'Property Details',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      
      {/* Job Related Screens */}
      <Stack.Screen 
        name="JobDetails" 
        component={JobDetailsScreen}
        options={{ 
          headerShown: true, 
          title: 'Job Details',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      
      {/* Stack Navigators for complex flows */}
      <Stack.Screen 
        name="PropertyStack" 
        component={PropertyStackNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="JobsStack" 
        component={JobsStackNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ServicesStack" 
        component={ServicesStackNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProfileStack" 
        component={ProfileStackNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MessageStack" 
        component={MessageStackNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
