/**
 * DateMiTypes - Navigation types only
 * This file contains only type definitions to avoid importing the full navigator
 * and its screen dependencies that may cause global property mutations.
 */

export type DateMiStackParamList = {
  DateMiMain: undefined;
  AgeVerification: {
    onVerificationSuccess?: () => void;
    onVerificationFailed?: () => void;
  };
  Browse: {
    category?: string;
  };
  DateMiCategories: {
    category?: string;
  };
  PersonalizedMatching: undefined;
  Matches: undefined;
  ProfileView: {
    profileId: string;
  };
  ProfileDetails: {
    profileId: string;
  };
  Messages: {
    profileId?: string;
  };
  Chat: {
    profileId: string;
  };
  CreateProfile: undefined;
  SubscriptionPlans: undefined;
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
  VideoCall: undefined;
  DateMiProfileSettings: undefined;
};
