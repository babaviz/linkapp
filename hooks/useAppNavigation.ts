/**
 * Custom navigation hooks with proper TypeScript support
 * Provides type-safe navigation for the hierarchical navigation structure
 */

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// Navigation hook for Root Stack Navigator
export type AppNavigationProp = StackNavigationProp<RootStackParamList>;

export const useAppNavigation = () => {
  return useNavigation<AppNavigationProp>();
};

// Helper functions for common navigation patterns
export const useNavigationHelpers = () => {
  const navigation = useAppNavigation();

  const navigateToPropertyDetails = (propertyId: string, property?: any) => {
    navigation.navigate('PropertyDetails', { propertyId, property });
  };

  const navigateToJobDetails = (jobId: string) => {
    navigation.navigate('JobDetails', { jobId });
  };

  const navigateToServiceDetails = (serviceId: string) => {
    navigation.navigate('ServiceDetails', { serviceId });
  };

  const navigateToProfileView = (profileId: string) => {
    navigation.navigate('ProfileView', { profileId });
  };

  const navigateToChat = (type: 'property' | 'job' | 'service' | 'datemi', data: any) => {
    switch (type) {
      case 'property':
        navigation.navigate('PropertyChat', data);
        break;
      case 'job':
        navigation.navigate('JobChat', data);
        break;
      case 'service':
        navigation.navigate('ServiceChat', data);
        break;
      case 'datemi':
        navigation.navigate('DateMiChat', data);
        break;
    }
  };

  const navigateToMyProperties = () => {
    navigation.navigate('MyProperties');
  };

  const navigateToMyServices = () => {
    navigation.navigate('MyServices');
  };

  const navigateToMyApplications = () => {
    navigation.navigate('MyApplications');
  };

  const navigateToMyPostings = () => {
    navigation.navigate('MyPostings');
  };

  const navigateToPostProperty = () => {
    navigation.navigate('PostProperty');
  };

  const navigateToPostJob = () => {
    navigation.navigate('PostJob');
  };

  const navigateToPostService = () => {
    navigation.navigate('PostService');
  };

  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const navigateToNotifications = () => {
    navigation.navigate('Notifications');
  };

  const navigateToUserDashboard = () => {
    navigation.navigate('UserDashboard');
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return {
    navigation,
    navigateToPropertyDetails,
    navigateToJobDetails,
    navigateToServiceDetails,
    navigateToProfileView,
    navigateToChat,
    navigateToMyProperties,
    navigateToMyServices,
    navigateToMyApplications,
    navigateToMyPostings,
    navigateToPostProperty,
    navigateToPostJob,
    navigateToPostService,
    navigateToEditProfile,
    navigateToNotifications,
    navigateToUserDashboard,
    goBack,
  };
};
