import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { getScreenOptions } from './navigationConfig';
import ServicesScreen from '../screens/services/ServicesScreen';
import ServiceDetailsScreen from '../screens/services/ServiceDetailsScreen';
import EnhancedServiceCategoriesScreen from '../screens/services/EnhancedServiceCategoriesScreen';
import PostServiceScreen from '../screens/services/PostServiceScreen';
import MyServicesScreen from '../screens/services/MyServicesScreen';
import EditServiceScreen from '../screens/services/EditServiceScreen';
import ServiceInquiriesScreen from '../screens/services/ServiceInquiriesScreen';
import MyServiceRequestsScreen from '../screens/services/MyServiceRequestsScreen';
import SavedServicesScreen from '../screens/services/SavedServicesScreen';
import ServiceAnalyticsScreen from '../screens/services/ServiceAnalyticsScreen';
import ServiceChatScreen from '../screens/services/ServiceChatScreen';
import type { ServiceListing } from '../types/service';

export type ServicesStackParamList = {
  ServicesHome: undefined;
  ServiceDetails: {
    serviceId: string;
  };
  EditService: {
    serviceId: string;
  };
  ServiceCategories: {
    category?: string;
    subcategory?: string;
    role?: 'seeker' | 'owner';
    createdServiceId?: string;
    createdService?: ServiceListing;
  };
  PostService: {
    category?: string;
    subcategory?: string;
  } | undefined;
  MyServices: undefined;
  ServiceInquiries: undefined;
  MyServiceRequests: undefined;
  SavedServices: undefined;
  ServiceAnalytics: {
    serviceId: string;
  };
  ServiceChat: {
    service: {
      id: string;
      title: string;
      category: string;
      provider_id: string;
      provider_name?: string;
    };
    recipientId: string;
    recipientName: string;
    conversationId?: string;
  };
};

const Stack = createStackNavigator<ServicesStackParamList>();

export default function ServicesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...getScreenOptions('default'),
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ServicesHome" 
        component={ServicesScreen}
        options={{
          title: 'Services & Tools'
        }}
      />
      
      <Stack.Screen 
        name="ServiceDetails" 
        component={ServiceDetailsScreen}
        options={{
          title: 'Service Details',
        }}
      />

      <Stack.Screen
        name="EditService"
        component={EditServiceScreen}
        options={{
          title: 'Edit Service',
        }}
      />
      
      <Stack.Screen 
        name="ServiceCategories" 
        component={EnhancedServiceCategoriesScreen}
        options={({ route }) => ({
          // Enhanced screen renders its own header
          headerShown: false,
          // Force new instance on navigation to ensure fresh data
          animationEnabled: true,
        })}
      />
      
      <Stack.Screen 
        name="PostService" 
        component={PostServiceScreen}
        options={{
          title: 'Post a Service',
        }}
      />
      
      <Stack.Screen 
        name="MyServices" 
        component={MyServicesScreen}
        options={{
          title: 'My Services',
        }}
      />
      
      <Stack.Screen 
        name="ServiceInquiries" 
        component={ServiceInquiriesScreen}
        options={{
          title: 'Service Inquiries',
        }}
      />
      
      <Stack.Screen 
        name="MyServiceRequests" 
        component={MyServiceRequestsScreen}
        options={{
          title: 'My Service Requests',
        }}
      />
      
      <Stack.Screen 
        name="SavedServices" 
        component={SavedServicesScreen}
        options={{
          title: 'Saved Services',
        }}
      />
      
      <Stack.Screen 
        name="ServiceAnalytics" 
        component={ServiceAnalyticsScreen}
        options={{
          title: 'Service Analytics',
        }}
      />
      
      <Stack.Screen 
        name="ServiceChat" 
        component={ServiceChatScreen}
        options={{
          title: 'Service Chat',
        }}
      />
    </Stack.Navigator>
  );
}
