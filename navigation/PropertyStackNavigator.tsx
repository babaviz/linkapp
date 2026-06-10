import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { getScreenOptions } from './navigationConfig';
import PropertyScreen from '../screens/property/PropertyScreen';
import PropertyDetailsScreen from '../screens/property/PropertyDetailsScreen';
import PostPropertyScreen from '../screens/property/PostPropertyScreen';
import EditPropertyScreen from '../screens/property/EditPropertyScreen';
import MyPropertiesScreen from '../screens/property/MyPropertiesScreen';
import PropertyMapViewScreen from '../screens/property/PropertyMapViewScreen';
import PropertyMapScreen from '../screens/property/PropertyMapScreen';
import PropertyCompareScreen from '../screens/property/PropertyCompareScreen';
import SavedPropertiesScreen from '../screens/property/SavedPropertiesScreen';
import PropertyAnalyticsScreen from '../screens/property/PropertyAnalyticsScreen';
import PropertySearchScreen from '../screens/property/PropertySearchScreen';
import PropertySearchResultsScreen from '../screens/property/PropertySearchResultsScreen';
import PropertyCategoriesScreen from '../screens/property/PropertyCategoriesScreen';
import PropertyContactScreen from '../screens/property/PropertyContactScreen';
import PropertyChatScreen from '../screens/property/PropertyChatScreen';
import PropertyInquiriesScreen from '../screens/property/PropertyInquiriesScreen';
import InquiriesScreen from '../screens/messages/InquiriesScreen';
import { Property } from '../types/property';

export type PropertyStackParamList = {
  PropertyHub: undefined;
  PropertySearch: {
    category?: string;
  };
  PropertySearchResults: {
    searchQuery: any;
  };
  PropertyCategories: {
    category?: string;
  };
  PropertyDetails: {
    propertyId: string;
    property?: Property;
  };
  PropertyContact: {
    property: Property;
  };
  PropertyChat: {
    property: Property;
    conversationId?: string;
  };
  PostProperty: undefined;
  EditProperty: {
    property: Property;
  };
  MyProperties: undefined;
  PropertyMapView: undefined;
  PropertyMap: undefined;
  PropertyCompare: {
    properties?: Property[];
  };
  SavedProperties: undefined;
  PropertyAnalytics: {
    propertyId: string;
    property?: Property;
  };
  PropertyInquiries: undefined;
  Inquiries: undefined;
};

const Stack = createStackNavigator<PropertyStackParamList>();

export default function PropertyStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="PropertyHub"
      screenOptions={{
        ...getScreenOptions('default'),
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="PropertyHub" 
        component={PropertyScreen} 
        options={{
          title: 'Property Hub'
        }}
      />
      <Stack.Screen 
        name="PropertySearch" 
        component={PropertySearchScreen}
      />
      <Stack.Screen 
        name="PropertySearchResults" 
        component={PropertySearchResultsScreen}
      />
      <Stack.Screen 
        name="PropertyCategories" 
        component={PropertyCategoriesScreen}
      />
      <Stack.Screen 
        name="PropertyDetails" 
        component={PropertyDetailsScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="PropertyContact" 
        component={PropertyContactScreen}
      />
      <Stack.Screen 
        name="PropertyChat" 
        component={PropertyChatScreen}
        options={{
          ...getScreenOptions('chat'),
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="PostProperty" 
        component={PostPropertyScreen}
      />
      <Stack.Screen 
        name="EditProperty" 
        component={EditPropertyScreen}
      />
      <Stack.Screen 
        name="MyProperties" 
        component={MyPropertiesScreen}
      />
      <Stack.Screen 
        name="PropertyMapView" 
        component={PropertyMapViewScreen}
      />
      <Stack.Screen 
        name="PropertyMap" 
        component={PropertyMapScreen}
      />
      <Stack.Screen 
        name="PropertyCompare"
        component={PropertyCompareScreen}
      />
      <Stack.Screen 
        name="SavedProperties" 
        component={SavedPropertiesScreen}
      />
      <Stack.Screen 
        name="PropertyAnalytics" 
        component={PropertyAnalyticsScreen}
      />
      <Stack.Screen 
        name="PropertyInquiries" 
        component={PropertyInquiriesScreen}
      />
      <Stack.Screen 
        name="Inquiries" 
        component={InquiriesScreen}
      />
    </Stack.Navigator>
  );
}
