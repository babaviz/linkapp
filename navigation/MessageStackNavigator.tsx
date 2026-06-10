/**
 * Message Stack Navigator
 * Navigation structure for message/inquiry management screens
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import InquiriesScreen from '../screens/messages/InquiriesScreen';
import { PropertyInquiry } from '../types/property';

export type MessageStackParamList = {
  InquiriesHome: undefined;
  InquiryDetails: {
    inquiry: PropertyInquiry;
  };
  InquiryResponse: {
    inquiry: PropertyInquiry;
  };
};

const Stack = createStackNavigator<MessageStackParamList>();

export default function MessageStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="InquiriesHome" 
        component={InquiriesScreen} 
      />
      {/* 
        Note: InquiryDetailsScreen and InquiryResponseScreen are planned for future implementation.
        Currently, inquiry details are shown via Alert dialog in InquiriesScreen.
        Route definitions exist in MessageStackParamList for when these screens are created.
      */}
    </Stack.Navigator>
  );
}
