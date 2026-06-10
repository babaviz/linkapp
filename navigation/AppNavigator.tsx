/**
 * AppNavigator - Root Stack Navigator
 * Handles top-level navigation structure with hierarchical navigation
 * Contains Main Tabs and all nested screens that should not show tab bar
 */

import React, { useMemo, Suspense } from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Easing } from 'react-native';
import { useAppSelector } from '../redux/hooks';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import Main Tab Navigator
import MainTabs from './MainTabs';

// Import nested screens that should not show tab bar
import PropertyDetailsScreen from '../screens/property/PropertyDetailsScreen';
import PropertySearchScreen from '../screens/property/PropertySearchScreen';
import PropertySearchResultsScreen from '../screens/property/PropertySearchResultsScreen';
import PropertyCategoriesScreen from '../screens/property/PropertyCategoriesScreen';
import PropertyContactScreen from '../screens/property/PropertyContactScreen';
import PropertyChatScreen from '../screens/property/PropertyChatScreen';
import PostPropertyScreen from '../screens/property/PostPropertyScreen';
import EditPropertyScreen from '../screens/property/EditPropertyScreen';
import MyPropertiesScreen from '../screens/property/MyPropertiesScreen';
import PropertyMapViewScreen from '../screens/property/PropertyMapViewScreen';
import PropertyMapScreen from '../screens/property/PropertyMapScreen';
import PropertyCompareScreen from '../screens/property/PropertyCompareScreen';
import SavedPropertiesScreen from '../screens/property/SavedPropertiesScreen';
import PropertyAnalyticsScreen from '../screens/property/PropertyAnalyticsScreen';
import PropertyInquiriesScreen from '../screens/property/PropertyInquiriesScreen';
import SelectLocationScreen from '../screens/location/SelectLocationScreen';

import JobDetailsScreen from '../screens/jobs/JobDetailsScreen';
import JobApplicationsScreen from '../screens/jobs/JobApplicationsScreen';
import MyApplicationsScreen from '../screens/jobs/MyApplicationsScreen';
import MyPostingsScreen from '../screens/jobs/MyPostingsScreen';
import PostJobScreen from '../screens/jobs/PostJobScreen';
import SkillsProfileScreen from '../screens/jobs/SkillsProfileScreen';
import CompanyProfileScreen from '../screens/jobs/CompanyProfileScreen';
import EditJobScreen from '../screens/jobs/EditJobScreen';
import CategoryJobsScreen from '../screens/jobs/CategoryJobsScreen';
import JobChatScreen from '../screens/jobs/JobChatScreen';

import ServiceDetailsScreen from '../screens/services/ServiceDetailsScreen';
import EnhancedServiceCategoriesScreen from '../screens/services/EnhancedServiceCategoriesScreen';
import PostServiceScreen from '../screens/services/PostServiceScreen';
import MyServicesScreen from '../screens/services/MyServicesScreen';
import ServiceInquiriesScreen from '../screens/services/ServiceInquiriesScreen';
import MyServiceRequestsScreen from '../screens/services/MyServiceRequestsScreen';
import SavedServicesScreen from '../screens/services/SavedServicesScreen';
import ServiceAnalyticsScreen from '../screens/services/ServiceAnalyticsScreen';
import ServiceChatScreen from '../screens/services/ServiceChatScreen';


// AgeVerificationScreen removed - using AgeVerificationCover component instead
import BrowseScreen from '../screens/datemi/BrowseScreen'; // Old screen - to be removed
// Lazy-load DateMi screens to avoid massive bundle on app start (40s+ load time)
const DateMiBrowseScreen = React.lazy(() => import('../screens/datemi/DateMiBrowseScreen'));
const MatchesScreen = React.lazy(() => import('../screens/datemi/MatchesScreen'));
const PersonalizedMatchingScreen = React.lazy(() => import('../screens/datemi/PersonalizedMatchingScreen'));
import CreateProfile from '../screens/datemi/CreateProfile';
// DateMiCategoriesScreen removed - categories integrated into DateMiBrowseScreen
import ProfileViewScreen from '../screens/datemi/ProfileViewScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import SubscriptionPlansScreen from '../screens/SubscriptionPlansScreen';
import ServiceManagementScreen from '../screens/datemi/ServiceManagementScreen';
import ContentLibraryScreen from '../screens/datemi/ContentLibraryScreen';
import EscrowTransactionsScreen from '../screens/datemi/EscrowTransactionsScreen';
import SafetySettingsScreen from '../screens/datemi/SafetySettingsScreen';
import BlockedUsersScreen from '../screens/datemi/BlockedUsersScreen';
import DateMiChatScreen from '../screens/datemi/DateMiChatScreen';
import VideoCallScreen from '../screens/datemi/VideoCallScreen';
import DateMiProfileSettingsScreen from '../screens/datemi/DateMiProfileSettingsScreen';
import SubscriptionSuccessScreen from '../screens/datemi/SubscriptionSuccessScreen';
import ChatThreadScreen from '../screens/ChatThreadScreen';
import ChatChannelScreen from '../screens/ChatChannelScreen';
import { CallErrorOverlay } from '../components/call/CallErrorOverlay';

// Simple loading fallback for lazy-loaded screens
const LazyScreenFallback = () => (
  <View style={lazyStyles.container}>
    <ActivityIndicator size="large" color="#2E3A8C" />
  </View>
);

const lazyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

import EditProfileScreen from '../screens/profile/EditProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';
import UserDashboardScreen from '../screens/dashboard/UserDashboardScreen';
import RecommendationsScreen from '../screens/common/RecommendationsScreen';
import ReferralProgramScreen from '../screens/profile/ReferralProgramScreen';
import ReferralLinkScreen from '../screens/referrals/ReferralLinkScreen';

import InquiriesScreen from '../screens/messages/InquiriesScreen';
import ConversationsScreen from '../screens/common/ConversationsScreen';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

// Import types
import { Property } from '../types/property';

// Root Stack Parameter List - includes all screens in the app
export type RootStackParamList = {
  // Onboarding
  Onboarding: undefined;

  // Referral deep link entry point
  ReferralLink: { code?: string } | undefined;
  
  // Main Tabs (entry point)
  MainTabs: undefined;
  
  // Property nested screens
  PropertyDetails: {
    propertyId: string;
    property?: Property;
  };
  PropertySearch: {
    category?: string;
  };
  PropertySearchResults: {
    searchQuery: any;
  };
  PropertyCategories: {
    category?: string;
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
  
  // Location screens
  SelectLocation: {
    onLocationSelect?: (location: {
      latitude: number;
      longitude: number;
      address: string;
    }) => void;
    initialLocation?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    autoDetectOnLoad?: boolean;
    enable3D?: boolean;
  };
  
  // Jobs nested screens
  JobDetails: { jobId: string };
  JobApplications: { jobId: string };
  MyApplications: undefined;
  MyPostings: undefined;
  SkillsProfile: undefined;
  CompanyProfile: undefined;
  EditJob: { jobId: string };
  CategoryJobs: { skill: string; role?: 'job_seeker' | 'employer' };
  PostJob: undefined;
  JobChat: {
    job: {
      id: string;
      title: string;
      company: string;
      employer_id: string;
      employer_name?: string;
    };
    recipientId: string;
    recipientName: string;
    conversationId?: string;
  };
  
  // Services nested screens
  ServiceDetails: {
    serviceId: string;
  };
  ServiceCategories: {
    category?: string;
    subcategory?: string;
    role?: 'seeker' | 'owner';
  };
  PostService: undefined;
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
  
  
  // DateMi nested screens
  AgeVerification: {
    onVerificationSuccess?: () => void;
    onVerificationFailed?: () => void;
  };
  Browse: {
    category?: string;
  };
  DateMiBrowse: undefined; // Main DateMi browse screen with casual/long-term toggle
  DateMiCategories: {
    category?: string;
  };
  PersonalizedMatching: undefined;
  Matches: undefined;
  ProfileView: {
    profileId: string;
  };
  CreateProfile: undefined;
  SubscriptionPlans:
    | {
        entryFeature?: 'messaging' | 'voice_call' | 'video_call';
      }
    | undefined;
  SubscriptionSettings: undefined;
  SubscriptionManagement: undefined;
  SubscriptionPurchase: {
    selectedTier?: any;
    isUpgrade?: boolean;
  };
  PaymentStatus: {
    transactionId: string;
    subscriptionTier: string;
  };
  BillingHistory: undefined;
  PaymentScreen: {
    tierId: string;
  };
  ServiceManagement: undefined;
  ContentLibrary: undefined;
  EscrowTransactions: undefined;
  SafetySettings: undefined;
  BlockedUsers: undefined;
  DateMiChat: {
    match: {
      id: string;
      name: string;
      age?: number;
      location?: string;
      profileImage?: string;
    };
    recipientId: string;
    conversationId?: string;
  };
  VideoCall: {
    callId: string;
    userId: string;
    userName: string;
    partnerName: string;
    partnerId: string;
    callType?: 'video' | 'audio';
  };
  DateMiProfileSettings: undefined;
  DateMiConversations: undefined;
  SubscriptionSuccess: {
    tier: 'pro' | 'premium';
    billingCycle: 'monthly' | 'yearly';
  };
  
  // Profile nested screens
  EditProfile: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  HelpSupport: undefined;
  UserDashboard: undefined;
  Recommendations: undefined;
  ReferralProgram: undefined;
  
  // Shared screens
  Inquiries: undefined;

  // Chat
  Chats: undefined;
  ChatChannel: {
    channelCid?: string;
    channelName?: string;
    channelType?: string;
    channelId?: string;
    channelData?: any;
    // Stream push payload compatibility
    cid?: string;
    channel_type?: string;
    channel_id?: string;
    // Legacy deep-link payloads
    chatId?: string;
  };
  ChatThread: {
    channelCid: string;
    parentMessageId: string;
  };
};

const RootStack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isOnboardingCompleted } = useAppSelector((state) => state.onboarding);
  
  // Default screen options tuned to avoid "white flash" during navigation by keeping transitions enabled
  // (so the previous screen stays visible while the next screen mounts).
  const defaultScreenOptions = useMemo(
    () => ({
      headerShown: false,
      gestureEnabled: true,
      animationEnabled: true,
      // Performance optimizations
      detachPreviousScreen: false, // Keep previous screen attached to avoid blank/white flashes
      freezeOnBlur: true, // Freeze screens when not visible
      // Reduce overdraw while matching app background
      cardStyle: {
        backgroundColor: '#F9FAFB',
      },
      // Fast, snappy push for all root-stack screens
      transitionSpec: {
        open:  { animation: 'timing' as const, config: { duration: 150, easing: Easing.out(Easing.ease) } },
        close: { animation: 'timing' as const, config: { duration: 120, easing: Easing.in(Easing.ease)  } },
      },
      cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    }),
    []
  );

  return (
    <React.Fragment>
      <RootStack.Navigator 
        key={isOnboardingCompleted ? 'main-flow' : 'onboarding-flow'}
        screenOptions={defaultScreenOptions}
        initialRouteName={isOnboardingCompleted ? 'MainTabs' : 'Onboarding'}
      >
      {/* Referral deep link entry point */}
      <RootStack.Screen name="ReferralLink" component={ReferralLinkScreen} />
      {/* Onboarding Screen */}
      <RootStack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{
          gestureEnabled: false,
          animationEnabled: false,
        }}
      />
      
      {/* Main Tabs - Entry point with tab bar visible */}
      <RootStack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          animationEnabled: false,
          // Allow MainTabs to update while covered by stack screens so tab jumps
          // (e.g. from Chats empty-state "Browse …" buttons) don't briefly show
          // the previously-selected tab before switching.
          freezeOnBlur: false,
        }}
      />
      
      {/* Property nested screens - no tab bar */}
      <RootStack.Screen 
        name="PropertyDetails" 
        component={PropertyDetailsScreen}
      />
      <RootStack.Screen name="PropertySearch" component={PropertySearchScreen} />
      <RootStack.Screen name="PropertySearchResults" component={PropertySearchResultsScreen} />
      <RootStack.Screen name="PropertyCategories" component={PropertyCategoriesScreen} />
      <RootStack.Screen name="PropertyContact" component={PropertyContactScreen} />
      <RootStack.Screen 
        name="PropertyChat" 
        component={PropertyChatScreen}
      />
      <RootStack.Screen name="PostProperty" component={PostPropertyScreen} />
      <RootStack.Screen name="EditProperty" component={EditPropertyScreen} />
      <RootStack.Screen name="MyProperties" component={MyPropertiesScreen} />
      <RootStack.Screen name="PropertyMapView" component={PropertyMapViewScreen} />
      <RootStack.Screen name="PropertyMap" component={PropertyMapScreen} />
      <RootStack.Screen name="PropertyCompare" component={PropertyCompareScreen} />
      <RootStack.Screen name="SavedProperties" component={SavedPropertiesScreen} />
      <RootStack.Screen name="PropertyAnalytics" component={PropertyAnalyticsScreen} />
      <RootStack.Screen name="PropertyInquiries" component={PropertyInquiriesScreen} />
      
      {/* Location screens */}
      <RootStack.Screen 
        name="SelectLocation" 
        component={SelectLocationScreen}
        options={{
          presentation: 'modal',
        }}
      />
      
      {/* Jobs nested screens - no tab bar */}
      <RootStack.Screen 
        name="JobDetails" 
        component={JobDetailsScreen}
      />
      <RootStack.Screen name="JobApplications" component={JobApplicationsScreen} />
      <RootStack.Screen name="MyApplications" component={MyApplicationsScreen} />
      <RootStack.Screen name="MyPostings" component={MyPostingsScreen} />
      <RootStack.Screen name="PostJob" component={PostJobScreen} />
      <RootStack.Screen name="SkillsProfile" component={SkillsProfileScreen} />
      <RootStack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
      <RootStack.Screen name="EditJob" component={EditJobScreen} />
      <RootStack.Screen name="CategoryJobs" component={CategoryJobsScreen} />
      <RootStack.Screen 
        name="JobChat" 
        component={JobChatScreen}
      />
      
      {/* Services nested screens - no tab bar */}
      <RootStack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
      <RootStack.Screen 
        name="ServiceCategories" 
        component={EnhancedServiceCategoriesScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="PostService" component={PostServiceScreen} />
      <RootStack.Screen name="MyServices" component={MyServicesScreen} />
      <RootStack.Screen name="ServiceInquiries" component={ServiceInquiriesScreen} />
      <RootStack.Screen name="MyServiceRequests" component={MyServiceRequestsScreen} />
      <RootStack.Screen name="SavedServices" component={SavedServicesScreen} />
      <RootStack.Screen name="ServiceAnalytics" component={ServiceAnalyticsScreen} />
      <RootStack.Screen 
        name="ServiceChat" 
        component={ServiceChatScreen}
      />
      
      
      {/* DateMi nested screens - no tab bar */}
      {/* AgeVerification handled in DateMiScreenLazy with AgeVerificationCover component */}
      <RootStack.Screen name="Browse" component={BrowseScreen} />
      <RootStack.Screen 
        name="DateMiBrowse"
      >
        {() => (
          <Suspense fallback={<LazyScreenFallback />}>
            <DateMiBrowseScreen />
          </Suspense>
        )}
      </RootStack.Screen>
      <RootStack.Screen name="PersonalizedMatching">
        {(props) => (
          <Suspense fallback={<LazyScreenFallback />}>
            <PersonalizedMatchingScreen {...props} />
          </Suspense>
        )}
      </RootStack.Screen>
      <RootStack.Screen name="Matches">
        {() => (
          <Suspense fallback={<LazyScreenFallback />}>
            <MatchesScreen />
          </Suspense>
        )}
      </RootStack.Screen>
      <RootStack.Screen name="ProfileView" component={ProfileViewScreen} />
      <RootStack.Screen name="CreateProfile" component={CreateProfile} />
      <RootStack.Screen 
        name="SubscriptionPlans" 
        component={SubscriptionPlansScreen}
        options={{
          headerShown: false,
        }}
      />
      <RootStack.Screen name="SubscriptionSettings" component={ManageSubscriptionScreen} />
      <RootStack.Screen name="SubscriptionManagement" component={ManageSubscriptionScreen} />
      <RootStack.Screen name="SubscriptionPurchase" component={ManageSubscriptionScreen} />
      <RootStack.Screen 
        name="PaymentStatus" 
        component={ManageSubscriptionScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <RootStack.Screen name="BillingHistory" component={ManageSubscriptionScreen} />
      <RootStack.Screen name="PaymentScreen" component={ManageSubscriptionScreen} />
      <RootStack.Screen name="ServiceManagement" component={ServiceManagementScreen} />
      <RootStack.Screen name="ContentLibrary" component={ContentLibraryScreen} />
      <RootStack.Screen name="EscrowTransactions" component={EscrowTransactionsScreen} />
      <RootStack.Screen name="SafetySettings" component={SafetySettingsScreen} />
      <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <RootStack.Screen 
        name="DateMiChat" 
        component={DateMiChatScreen}
      />
      <RootStack.Screen 
        name="VideoCall" 
        component={VideoCallScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: false,
        }}
      />
      <RootStack.Screen 
        name="DateMiProfileSettings" 
        component={DateMiProfileSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <RootStack.Screen 
        name="DateMiConversations" 
        component={ConversationsScreen}
        options={{
          headerShown: false,
          transitionSpec: {
            open:  { animation: 'timing', config: { duration: 150, easing: Easing.out(Easing.ease) } },
            close: { animation: 'timing', config: { duration: 120, easing: Easing.in(Easing.ease)  } },
          },
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <RootStack.Screen 
        name="SubscriptionSuccess" 
        component={SubscriptionSuccessScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      
      {/* Profile nested screens - no tab bar */}
      <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
      <RootStack.Screen name="Notifications" component={NotificationScreen} />
      <RootStack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          title: '🔔 Notification Settings',
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
            color: '#000000',
          },
          headerTintColor: '#000000',
        }}
      />
      <RootStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <RootStack.Screen 
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
      <RootStack.Screen name="Recommendations" component={RecommendationsScreen} />
      
      {/* Profile - Referral Program */}
      <RootStack.Screen 
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
      
      {/* Shared screens */}
      <RootStack.Screen name="Inquiries" component={InquiriesScreen} />

      {/* Universal chat channel screen */}
      <RootStack.Screen name="ChatChannel" component={ChatChannelScreen} />

      {/* Chat list screen (all conversations) - uses ConversationsScreen */}
      <RootStack.Screen 
        name="Chats" 
        component={ConversationsScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* Chat Thread screen */}
      <RootStack.Screen name="ChatThread" component={ChatThreadScreen} />
      </RootStack.Navigator>
      <CallErrorOverlay />
    </React.Fragment>
  );
}
