/**
 * Deep Linking Configuration
 * Handles URL-based navigation and external links
 */

import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [
    prefix,
    'linkapp://',
    'https://link-app.co',
    'https://linkapp.com',
  ],
  config: {
    screens: {
      // Auth screens - handle deep links for authentication flows
      Login: 'auth/login',
      SignUp: 'auth/signup',
      ForgotPassword: 'auth/forgot-password',
      EmailVerification: 'auth/callback',
      ResetPassword: 'auth/reset-password',
      
      // Main app screens
      MainTabs: {
        screens: {
          PropertyHub: 'properties',
          JobsMain: 'jobs',
          ServicesMain: 'services',
          DateMiMain: 'datemi',
          ProfileMain: 'profile',
        },
      },
      PropertyDetails: {
        path: 'property/:propertyId',
        parse: {
          propertyId: (propertyId: string) => propertyId,
        },
      },
      JobDetails: {
        path: 'job/:jobId',
        parse: {
          jobId: (jobId: string) => jobId,
        },
      },
      ServiceDetails: {
        path: 'service/:serviceId',
        parse: {
          serviceId: (serviceId: string) => serviceId,
        },
      },
      ProfileView: {
        path: 'profile/:profileId',
        parse: {
          profileId: (profileId: string) => profileId,
        },
      },
      Chat: {
        path: 'chat/:chatId?',
        parse: {
          chatId: (chatId: string) => chatId || undefined,
        },
      },
      Search: {
        path: 'search/:type?',
        parse: {
          type: (type: string) => type || undefined,
        },
      },
      Filter: {
        path: 'filter/:category?',
        parse: {
          category: (category: string) => category || undefined,
        },
      },
      Settings: 'settings',
      Notifications: 'notifications',
      EditProfile: 'profile/edit',
      PaymentScreen: 'payment',
      BookService: 'book/:serviceId',
      MapView: 'map',
      // Stack navigators
      PropertyStack: 'property-stack',
      JobsStack: 'jobs-stack',
      ServicesStack: 'services-stack',
      ProfileStack: 'profile-stack',
      MessageStack: 'messages',
    },
  },
};

export default linking;
