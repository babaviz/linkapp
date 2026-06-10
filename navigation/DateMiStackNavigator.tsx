import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { screenTransitions } from './navigationConfig';

// Import Date Mi screens
import DateMiScreenLazy from '../screens/datemi/DateMiScreenLazy';
import ConversationsScreen from '../screens/common/ConversationsScreen';
import DateMiChatScreen from '../screens/datemi/DateMiChatScreen';
import MatchesScreen from '../screens/datemi/MatchesScreen';
import VideoCallScreen from '../screens/datemi/VideoCallScreen';
import ProfileViewScreen from '../screens/datemi/ProfileViewScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';

const Stack = createStackNavigator();

export default function DateMiStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...screenTransitions
      }}
    >
      <Stack.Screen 
        name="DateMiHome" 
        component={DateMiScreenLazy}
        options={{ 
          title: 'Date Mi',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="DateMiConversations" 
        component={ConversationsScreen}
        options={{ 
          title: 'Conversations',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="DateMiChat" 
        component={DateMiChatScreen}
        options={{ 
          title: 'Chat',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="MatchDetail" 
        component={MatchesScreen}
        options={{ 
          title: 'Matches',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="VideoCall" 
        component={VideoCallScreen}
        options={{ 
          title: 'Video Call',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="ProfileDetails" 
        component={ProfileViewScreen}
        options={{ 
          title: 'Profile',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="DateMiSubscription" 
        component={ManageSubscriptionScreen}
        options={{ 
          title: 'Subscription',
          headerShown: false 
        }} 
      />
    </Stack.Navigator>
  );
}
