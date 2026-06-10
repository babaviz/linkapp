/**
 * Demo Date Mi Data for LinkApp
 * Social networking and digital services profiles (18+ verified)
 */

// Import the proper type from redux and helper from service
import type { DateMiProfile as DateMiProfileRedux, DateMiPrivacySettings } from '../redux/slices/datemiSlice';

// Local helper to avoid circular dependency with services/dateMiService
export const createPrivacySettings = (
  overrides: Partial<DateMiPrivacySettings> = {}
): DateMiPrivacySettings => ({
  showOnlineStatus: true,
  showLastSeen: true,
  showReadReceipts: true,
  allowMessageFromMatches: true,
  allowVideoCallRequests: true,
  hideFromNearbySearch: false,
  verifiedProfilesOnly: false,
  blockScreenshots: false,
  autoDeleteMessages: false,
  requirePhotoVerification: true,
  showLocation: true,
  showAge: true,
  ...overrides,
});

// Re-export the type for backward compatibility
export type DateMiProfile = DateMiProfileRedux;

export interface EscrowTransaction {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  escrowStatus: string;
  serviceType: string;
  sessionReference: string | null;
  createdAt: string;
  completionDate: string | null;
}

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Demo profile pictures with reliable fallbacks
const PROFILE_PICTURES = [
  'https://picsum.photos/400/400?random=1',
  'https://picsum.photos/400/400?random=2',
  'https://picsum.photos/400/400?random=3',
  'https://picsum.photos/400/400?random=4',
  'https://picsum.photos/400/400?random=5',
  'https://picsum.photos/400/400?random=6',
  'https://picsum.photos/400/400?random=7',
  'https://picsum.photos/400/400?random=8'
];

// Fallback for when images fail to load
const FALLBACK_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE2MCIgcj0iNjAiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEyMCAzMDBDMTIwIDI2MC44IDI2MC44IDI0MCAzMDAgMjQwQzMzOS4yIDI0MCAzNjAgMjYwLjggMzYwIDMwMEgxMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';

const getRandomProfilePictures = (count: number = 3) => {
  const shuffled = [...PROFILE_PICTURES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Helper function to get profile pictures with fallback for failed images
export const getProfilePictureWithFallback = (originalUrl: string): string => {
  // For now, return the original URL - fallback handling will be done in components
  return originalUrl;
};

// Export fallback avatar for use in components
export const FALLBACK_PROFILE_AVATAR = FALLBACK_AVATAR;

// Common interests for Kenyan users
const COMMON_INTERESTS = [
  'Music', 'Dancing', 'Movies', 'Travel', 'Cooking', 'Fitness', 'Reading', 
  'Photography', 'Art', 'Business', 'Fashion', 'Sports', 'Technology',
  'Nature', 'Adventure', 'Comedy', 'Learning', 'Culture', 'Family', 'Friends'
];

const getRandomInterests = (count: number = 5) => {
  const shuffled = [...COMMON_INTERESTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Demo Date Mi Profiles
export const DEMO_DATEMI_PROFILES: DateMiProfile[] = [
  {
    id: generateId(),
    userId: 'datemi_user_001',
    displayName: 'Grace_K',
    ageVerified: true,
    age: 25,
    genderPreferences: ['Male'],
    profilePictures: getRandomProfilePictures(4),
    aboutMe: 'Creative soul with a passion for photography and travel. Love deep conversations about life, dreams, and everything in between. Looking for genuine connections and meaningful interactions. 📸✈️',
    privacySettings: createPrivacySettings({
      showAge: true,
      showLocation: true,
      allowVideoCallRequests: true
    }),
    creatorStatus: true,
    subscriptionTier: 'premium' as const,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    serviceRates: {
      videoCallPerMinute: 50,
      premiumPhotoAccess: 200,
      privateMessage: 20
    },
    location: 'Nairobi',
    interests: ['Photography', 'Travel', 'Art', 'Music', 'Nature'],
    intention: 'short_term_fun',
    rating: 4.8,
    totalSessions: 156,
    verified: true
  },

  {
    id: generateId(),
    userId: 'datemi_user_002',
    displayName: 'Alex_Nairobi',
    ageVerified: true,
    age: 28,
    genderPreferences: ['Female'],
    profilePictures: getRandomProfilePictures(3),
    aboutMe: 'Entrepreneur and fitness enthusiast. Believer in living life to the fullest while building meaningful relationships. Always up for interesting conversations and new experiences. 💪🚀',
    privacySettings: createPrivacySettings({
      showAge: true,
      showLocation: true,
      allowVideoCallRequests: false
    }),
    creatorStatus: false,
    subscriptionTier: 'free' as const,
    isOnline: false,
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    location: 'Nairobi',
    interests: ['Business', 'Fitness', 'Technology', 'Adventure', 'Music'],
    intention: 'long_term_partner',
    verified: true
  },

  {
    id: generateId(),
    userId: 'datemi_user_003',
    displayName: 'Bella_Creative',
    ageVerified: true,
    age: 23,
    genderPreferences: ['Male', 'Female'],
    profilePictures: getRandomProfilePictures(5),
    aboutMe: 'Fashion designer and creative consultant. Love expressing myself through art, fashion, and meaningful conversations. Open-minded and looking for authentic connections. 🎨👗',
    privacySettings: createPrivacySettings({
      showAge: true,
      showLocation: false,
      allowVideoCallRequests: true
    }),
    creatorStatus: true,
    subscriptionTier: 'premium' as const,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    serviceRates: {
      videoCallPerMinute: 75,
      premiumPhotoAccess: 300,
      privateMessage: 30
    },
    location: 'Mombasa',
    interests: ['Fashion', 'Art', 'Dancing', 'Culture', 'Photography'],
    intention: 'short_term_fun',
    rating: 4.9,
    totalSessions: 89,
    verified: true
  },

  {
    id: generateId(),
    userId: 'datemi_user_004',
    displayName: 'Sam_Adventures',
    ageVerified: true,
    age: 30,
    genderPreferences: ['Female'],
    profilePictures: getRandomProfilePictures(3),
    aboutMe: 'Adventure seeker and travel enthusiast. Love exploring new places, trying new cuisines, and meeting interesting people. Looking for someone to share adventures with. 🏔️🌍',
    privacySettings: createPrivacySettings({
      showAge: true,
      showLocation: true,
      allowVideoCallRequests: false
    }),
    creatorStatus: false,
    subscriptionTier: 'pro' as const,
    isOnline: true,
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    location: 'Kisumu',
    interests: ['Travel', 'Adventure', 'Nature', 'Cooking', 'Sports'],
    intention: 'short_term_fun',
    verified: false
  },

  {
    id: generateId(),
    userId: 'datemi_user_005',
    displayName: 'Maya_Wellness',
    ageVerified: true,
    age: 26,
    genderPreferences: ['Male'],
    profilePictures: getRandomProfilePictures(4),
    aboutMe: 'Wellness coach and yoga instructor. Passionate about mindful living, personal growth, and helping others find their inner peace. Looking for deep, meaningful connections. 🧘‍♀️💕',
    privacySettings: createPrivacySettings({
      showAge: true,
      showLocation: true,
      allowVideoCallRequests: true
    }),
    creatorStatus: true,
    subscriptionTier: 'pro' as const,
    isOnline: false,
    lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    serviceRates: {
      videoCallPerMinute: 60,
      premiumPhotoAccess: 250,
      privateMessage: 25
    },
    location: 'Nakuru',
    interests: ['Fitness', 'Nature', 'Reading', 'Learning', 'Family'],
    intention: 'long_term_partner',
    rating: 4.7,
    totalSessions: 234,
    verified: true
  },

  {
    id: generateId(),
    userId: 'datemi_user_006',
    displayName: 'Kevin_Tech',
    ageVerified: true,
    age: 27,
    genderPreferences: ['Female'],
    profilePictures: getRandomProfilePictures(2),
    aboutMe: 'Software developer with a love for innovation and problem-solving. Enjoy good music, great conversations, and exploring new tech trends. Looking for someone who appreciates both tech and life. 💻🎵',
    privacySettings: createPrivacySettings({
      showAge: true,
      showLocation: true,
      allowVideoCallRequests: false
    }),
    creatorStatus: false,
    subscriptionTier: 'free' as const,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    location: 'Nairobi',
    interests: ['Technology', 'Music', 'Learning', 'Business', 'Comedy'],
    intention: 'long_term_partner',
    verified: true
  },

  {
    id: generateId(),
    userId: 'datemi_user_007',
    displayName: 'Luna_Artist',
    ageVerified: true,
    age: 24,
    genderPreferences: ['Male', 'Female'],
    profilePictures: getRandomProfilePictures(4),
    aboutMe: 'Visual artist and creative soul. Love painting, poetry, and deep philosophical conversations. Believe in living authentically and connecting with like-minded individuals. 🎨📚',
    privacySettings: createPrivacySettings({
      showAge: false,
      showLocation: false,
      allowVideoCallRequests: true
    }),
    creatorStatus: true,
    subscriptionTier: 'premium' as const,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    serviceRates: {
      videoCallPerMinute: 40,
      premiumPhotoAccess: 180,
      privateMessage: 15
    },
    location: 'Eldoret',
    interests: ['Art', 'Reading', 'Culture', 'Photography', 'Movies'],
    intention: 'short_term_fun',
    rating: 4.6,
    totalSessions: 67,
    verified: false
  },

  {
    id: generateId(),
    userId: 'datemi_user_008',
    displayName: 'David_Music',
    ageVerified: true,
    age: 29,
    genderPreferences: ['Female'],
    profilePictures: getRandomProfilePictures(3),
    aboutMe: 'Professional musician and music producer. Love creating beats, discovering new sounds, and sharing musical experiences. Looking for someone who appreciates the arts and good vibes. 🎵🎹',
    privacySettings: createPrivacySettings({
      showAge: true,
      showLocation: true,
      allowVideoCallRequests: true
    }),
    creatorStatus: true,
    subscriptionTier: 'premium' as const,
    isOnline: false,
    lastSeen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    serviceRates: {
      videoCallPerMinute: 65,
      premiumPhotoAccess: 220,
      privateMessage: 20
    },
    location: 'Mombasa',
    interests: ['Music', 'Art', 'Technology', 'Culture', 'Dancing'],
    intention: 'short_term_fun',
    rating: 4.5,
    totalSessions: 143,
    verified: true
  }
];

// Demo transactions for testing
export const DEMO_TRANSACTIONS: EscrowTransaction[] = [
  {
    id: generateId(),
    payerId: 'current_user',
    payeeId: 'datemi_user_001',
    amount: 150,
    currency: 'KSH',
    escrowStatus: 'completed',
    serviceType: 'video_calling',
    sessionReference: 'session_001',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString()
  },
  {
    id: generateId(),
    payerId: 'current_user',
    payeeId: 'datemi_user_003',
    amount: 300,
    currency: 'KSH',
    escrowStatus: 'completed',
    serviceType: 'premium_photos',
    sessionReference: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: generateId(),
    payerId: 'current_user',
    payeeId: 'datemi_user_005',
    amount: 75,
    currency: 'KSH',
    escrowStatus: 'pending',
    serviceType: 'private_messages',
    sessionReference: null,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    completionDate: null
  }
];

// Helper functions
export const getCreatorProfiles = (): DateMiProfile[] => {
  return DEMO_DATEMI_PROFILES.filter(profile => profile.creatorStatus);
};

export const getOnlineProfiles = (): DateMiProfile[] => {
  return DEMO_DATEMI_PROFILES.filter(profile => profile.isOnline);
};

export const getVerifiedProfiles = (): DateMiProfile[] => {
  return DEMO_DATEMI_PROFILES.filter(profile => profile.verified);
};

export const getProfilesByLocation = (location: string): DateMiProfile[] => {
  return DEMO_DATEMI_PROFILES.filter(profile => 
    profile.location?.toLowerCase().includes(location.toLowerCase())
  );
};

export const getProfilesByInterest = (interest: string): DateMiProfile[] => {
  return DEMO_DATEMI_PROFILES.filter(profile =>
    profile.interests?.some(i => i.toLowerCase().includes(interest.toLowerCase()))
  );
};

export const getProfilesByIntention = (intention: 'short_term_fun' | 'long_term_partner'): DateMiProfile[] => {
  return DEMO_DATEMI_PROFILES.filter(profile => profile.intention === intention);
};

export const getProfilesByAgeRange = (minAge: number, maxAge: number): DateMiProfile[] => {
  return DEMO_DATEMI_PROFILES.filter(profile => 
    profile.age && profile.age >= minAge && profile.age <= maxAge
  );
};

export const searchProfiles = (query: string): DateMiProfile[] => {
  const searchTerm = query.toLowerCase();
  return DEMO_DATEMI_PROFILES.filter(profile =>
    profile.displayName.toLowerCase().includes(searchTerm) ||
    profile.aboutMe?.toLowerCase().includes(searchTerm) ||
    profile.location?.toLowerCase().includes(searchTerm) ||
    profile.interests?.some(interest => interest.toLowerCase().includes(searchTerm))
  );
};

export const getRandomProfiles = (count: number = 10): DateMiProfile[] => {
  const shuffled = [...DEMO_DATEMI_PROFILES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Statistics for Date Mi
export const getDemoDateMiStats = () => {
  const stats = {
    total_profiles: DEMO_DATEMI_PROFILES.length,
    verified_profiles: DEMO_DATEMI_PROFILES.filter(p => p.verified).length,
    creator_profiles: DEMO_DATEMI_PROFILES.filter(p => p.creatorStatus).length,
    online_profiles: DEMO_DATEMI_PROFILES.filter(p => p.isOnline).length,
    average_age: Math.round(
      DEMO_DATEMI_PROFILES.filter(p => p.age)
        .reduce((sum, p) => sum + (p.age || 0), 0) / 
      DEMO_DATEMI_PROFILES.filter(p => p.age).length
    ),
    profiles_by_location: {} as Record<string, number>,
    profiles_by_intention: {} as Record<string, number>,
    total_transactions: DEMO_TRANSACTIONS.length,
    total_revenue: DEMO_TRANSACTIONS
      .filter(t => t.escrowStatus === 'completed')
      .reduce((sum, t) => sum + t.amount, 0)
  };

  // Count by location
  DEMO_DATEMI_PROFILES.forEach(profile => {
    if (profile.location) {
      stats.profiles_by_location[profile.location] = 
        (stats.profiles_by_location[profile.location] || 0) + 1;
    }
  });

  // Count by intention
  DEMO_DATEMI_PROFILES.forEach(profile => {
    if (profile.intention) {
      stats.profiles_by_intention[profile.intention] = 
        (stats.profiles_by_intention[profile.intention] || 0) + 1;
    }
  });

  return stats;
};
