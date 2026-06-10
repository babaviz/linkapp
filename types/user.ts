/**
 * User Types for LinkApp
 * Comprehensive user profile and authentication types
 */

// Base user profile
export interface BaseUserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  phone?: string; // Alias for phoneNumber for compatibility
  profileImageUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location?: {
    county: string;
    town: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  kycStatus: 'pending' | 'verified' | 'rejected';
  creatorVerificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verified?: boolean;
}

// Enhanced user profile with module-specific data
export interface EnhancedUserProfile extends BaseUserProfile {
  // Settings
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      categories: {
        properties: boolean;
        jobs: boolean;
        services: boolean;
        datemi: boolean;
        messages?: boolean;
        matches?: boolean;
        updates?: boolean;
        security?: boolean;
        marketing?: boolean;
      };
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends_only';
      showLocation: boolean;
      showOnlineStatus: boolean;
      allowDirectMessages: boolean;
    };
    language: string;
    theme: 'light' | 'dark' | 'system';
  };

  // Active modules
  activeModules: string[];

  // Module-specific profiles
  propertyProfile?: PropertyUserProfile;
  jobsProfile?: JobsUserProfile;
  servicesProfile?: ServicesUserProfile;
  datemiProfile?: DateMiUserProfile;
}

// Property module user profile
export interface PropertyUserProfile {
  userId: string;
  role: 'tenant' | 'property_owner';
  preferences: {
    propertyTypes: string[];
    priceRange: { min: number; max: number };
    locationPreferences: string[];
    amenityPreferences: string[];
  };
  savedProperties: string[];
  viewHistory: string[];
  lastActive: string;
}

// Jobs module user profile
export interface JobsUserProfile {
  userId: string;
  role: 'job_seeker' | 'employer';
  preferences: {
    skillCategories: string[];
    salaryRange: { min: number; max: number };
    locationPreferences: string[];
    workType: 'remote' | 'onsite' | 'hybrid' | 'any';
  };
  savedJobs: string[];
  applications: string[];
  viewHistory: string[];
  lastActive: string;
}

// Services module user profile
export interface ServicesUserProfile {
  userId: string;
  role: 'service_seeker' | 'service_provider';
  preferences: {
    serviceCategories: string[];
    locationPreferences: string[];
    budgetRange: { min: number; max: number };
  };
  savedServices: string[];
  bookingHistory: string[];
  reviewsGiven: string[];
  lastActive: string;
}


// DateMi module user profile
export interface DateMiUserProfile {
  userId: string;
  displayName: string;
  birthDate: string;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  lookingFor: 'male' | 'female' | 'any';
  bio: string;
  interests: string[];
  location: {
    city: string;
    country: string;
  };
  preferences: {
    ageRange: { min: number; max: number };
    maxDistance: number;
    genderPreference: 'male' | 'female' | 'any';
    lookingForTypes: ('casual' | 'serious' | 'friendship')[];
  };
  subscriptionTier: 'free' | 'pro' | 'premium';
  verified: boolean;
  ageVerificationStatus: 'pending' | 'verified' | 'rejected';
  profileImages: string[];
  lastActive: string;
}

// Profile switching context
export interface ProfileSwitchContext {
  currentModule: 'property' | 'jobs' | 'services' | 'datemi';
  currentRole?: string;
  availableRoles: {
    property: ('tenant' | 'property_owner')[];
    jobs: ('job_seeker' | 'employer')[];
    services: ('service_seeker' | 'service_provider')[];
    datemi: ('dating_profile')[];
  };
}

// Role-specific profile update
export interface RoleSpecificProfileUpdate {
  module: 'property' | 'jobs' | 'services' | 'datemi';
  role: string;
  preferences?: any;
}

// Module preferences
export interface ModulePreferences {
  property?: {
    defaultSearchRadius: number;
    autoNotifications: boolean;
    preferredContactMethod: 'phone' | 'email' | 'in_app';
  };
  jobs?: {
    jobAlerts: boolean;
    salaryVisibility: boolean;
    profileVisibility: 'public' | 'employers_only' | 'private';
  };
  services?: {
    autoBookingConfirmation: boolean;
    reviewReminders: boolean;
    locationSharing: boolean;
  };
  datemi?: {
    discoverySettings: {
      showAge: boolean;
      showDistance: boolean;
      showOnlineStatus: boolean;
    };
    matchNotifications: boolean;
    messageNotifications: boolean;
  };
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  createdAt: string;
  lastSignInAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  acceptedTerms: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
}

// User activity and engagement
export interface UserActivity {
  id: string;
  userId: string;
  action: 'view' | 'like' | 'share' | 'comment' | 'save' | 'contact';
  contentType: 'property' | 'job' | 'service' | 'story' | 'profile';
  contentId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserEngagementMetrics {
  userId: string;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalSaves: number;
  totalContacts: number;
  lastActiveDate: string;
  engagementScore: number;
}
