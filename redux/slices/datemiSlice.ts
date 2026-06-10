import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Subscription, BillingHistory, PaymentMethod, SUBSCRIPTION_TIERS } from '../../types/subscription';
import { subscriptionService } from '../../services/subscriptionService';
import { RecommendationItem } from '../../services/recommendationService';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../../utils/playStoreReviewer';
import type { Json } from '../../types/supabase';

export interface DateMiPrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  allowMessageFromMatches: boolean;
  allowVideoCallRequests: boolean;
  hideFromNearbySearch: boolean;
  verifiedProfilesOnly: boolean;
  blockScreenshots: boolean;
  autoDeleteMessages: boolean;
  requirePhotoVerification: boolean;
  showLocation?: boolean; // Legacy field for demo data
  showAge?: boolean; // Legacy field for demo data
}

export interface DateMiProfile {
  id: string;
  userId: string;
  displayName: string;
  ageVerified: boolean;
  age?: number;
  genderPreferences: string[];
  profilePictures: string[];
  aboutMe: string | null;
  privacySettings: DateMiPrivacySettings;
  creatorStatus: boolean;
  isOnline: boolean;
  lastSeen: string;
  location?: string;
  interests?: string[];
  intention?: 'short_term_fun' | 'long_term_partner';
  rating?: number;
  totalSessions?: number;
  verified?: boolean;
  subscriptionTier: 'free' | 'pro' | 'premium';
  subscriptionCountry?: string;
  createdAt?: string;
  updatedAt?: string;
  serviceRates?: {
    videoCallPerMinute: number;
    premiumPhotoAccess: number;
    privateMessage: number;
  };
}

const DEFAULT_PRIVACY_SETTINGS: DateMiPrivacySettings = {
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
  // Legacy/demo fields
  showLocation: true,
  showAge: true,
};

function normalizeSubscriptionTier(value: unknown): DateMiProfile['subscriptionTier'] {
  return value === 'free' || value === 'pro' || value === 'premium' ? value : 'free';
}

function serializePrivacySettings(settings: DateMiPrivacySettings): Json {
  const json: Record<string, Json> = {
    showOnlineStatus: settings.showOnlineStatus,
    showLastSeen: settings.showLastSeen,
    showReadReceipts: settings.showReadReceipts,
    allowMessageFromMatches: settings.allowMessageFromMatches,
    allowVideoCallRequests: settings.allowVideoCallRequests,
    hideFromNearbySearch: settings.hideFromNearbySearch,
    verifiedProfilesOnly: settings.verifiedProfilesOnly,
    blockScreenshots: settings.blockScreenshots,
    autoDeleteMessages: settings.autoDeleteMessages,
    requirePhotoVerification: settings.requirePhotoVerification,
  };

  if (typeof settings.showLocation === 'boolean') json.showLocation = settings.showLocation;
  if (typeof settings.showAge === 'boolean') json.showAge = settings.showAge;

  return json;
}

function deserializePrivacySettings(value: unknown): DateMiPrivacySettings {
  const raw =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

  return {
    showOnlineStatus: bool(raw.showOnlineStatus, DEFAULT_PRIVACY_SETTINGS.showOnlineStatus),
    showLastSeen: bool(raw.showLastSeen, DEFAULT_PRIVACY_SETTINGS.showLastSeen),
    showReadReceipts: bool(raw.showReadReceipts, DEFAULT_PRIVACY_SETTINGS.showReadReceipts),
    allowMessageFromMatches: bool(
      raw.allowMessageFromMatches,
      DEFAULT_PRIVACY_SETTINGS.allowMessageFromMatches
    ),
    allowVideoCallRequests: bool(
      raw.allowVideoCallRequests,
      DEFAULT_PRIVACY_SETTINGS.allowVideoCallRequests
    ),
    hideFromNearbySearch: bool(raw.hideFromNearbySearch, DEFAULT_PRIVACY_SETTINGS.hideFromNearbySearch),
    verifiedProfilesOnly: bool(raw.verifiedProfilesOnly, DEFAULT_PRIVACY_SETTINGS.verifiedProfilesOnly),
    blockScreenshots: bool(raw.blockScreenshots, DEFAULT_PRIVACY_SETTINGS.blockScreenshots),
    autoDeleteMessages: bool(raw.autoDeleteMessages, DEFAULT_PRIVACY_SETTINGS.autoDeleteMessages),
    requirePhotoVerification: bool(
      raw.requirePhotoVerification,
      DEFAULT_PRIVACY_SETTINGS.requirePhotoVerification
    ),
    showLocation: bool(raw.showLocation, DEFAULT_PRIVACY_SETTINGS.showLocation ?? true),
    showAge: bool(raw.showAge, DEFAULT_PRIVACY_SETTINGS.showAge ?? true),
  };
}

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

export interface ProfileReport {
  id: string;
  profileId: string;
  reporterId: string;
  reason: string;
  details: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

interface DateMiState {
  profiles: DateMiProfile[];
  currentProfile: DateMiProfile | null;
  myProfile: DateMiProfile | null;
  matches: {
    list: DateMiProfile[];
    pending: string[]; // IDs of profiles user liked but haven't responded
    rejected: string[]; // IDs of profiles user passed on
  };
  profilesLoading: boolean;
  profilesError: string | null;
  profilesRequestId: string | null;
  isLoading: boolean;
  error: string | null;
  isAgeVerified: boolean;
  ageVerificationDate: string | null;
  isPasscodeSet: boolean;
  isPasscodeVerified: boolean;
  passcodeSetDate: string | null;
  currentIntention: 'short_term_fun' | 'long_term_partner';
  videoCallSession: {
    isActive: boolean;
    sessionId: string | null;
    partnerId: string | null;
    startTime: string | null;
    currentAmount: number;
  };
  transactions: EscrowTransaction[];
  filters: {
    ageRange?: { min: number; max: number };
    location?: string;
    interests?: string[];
    intention?: string;
  };
  subscription: {
    current: Subscription | null;
    availableTiers: typeof SUBSCRIPTION_TIERS;
    paymentMethods: PaymentMethod[];
    billingHistory: BillingHistory[];
    isProcessingPayment: boolean;
  };
  recommendations: {
    trending: RecommendationItem[];
    personalized: RecommendationItem[];
    recent: RecommendationItem[];
    isLoading: boolean;
  };
  dailyLikes: {
    count: number;
    lastReset: string;
    limit: number;
  };
  notifications: {
    unreadMessages: number;
    newLikes: number;
    missedCalls: number;
    totalBadgeCount: number;
    lastSyncedAt: string | null;
  };
  reports: Record<string, ProfileReport[]>; // profileId -> reports
  reportCounts: Record<string, number>; // profileId -> count
}

const initialState: DateMiState = {
  profiles: [],
  currentProfile: null,
  myProfile: null,
  matches: {
    list: [],
    pending: [],
    rejected: [],
  },
  profilesLoading: false,
  profilesError: null,
  profilesRequestId: null,
  isLoading: false,
  error: null,
  isAgeVerified: false,
  ageVerificationDate: null,
  isPasscodeSet: false,
  isPasscodeVerified: false,
  passcodeSetDate: null,
  currentIntention: 'short_term_fun',
  videoCallSession: {
    isActive: false,
    sessionId: null,
    partnerId: null,
    startTime: null,
    currentAmount: 0,
  },
  transactions: [],
  filters: {},
  subscription: {
    current: null,
    availableTiers: SUBSCRIPTION_TIERS,
    paymentMethods: [],
    billingHistory: [],
    isProcessingPayment: false,
  },
  recommendations: {
    trending: [],
    personalized: [],
    recent: [],
    isLoading: false,
  },
  dailyLikes: {
    count: 0,
    lastReset: new Date().toISOString(),
    limit: 5,
  },
  notifications: {
    unreadMessages: 0,
    newLikes: 0,
    missedCalls: 0,
    totalBadgeCount: 0,
    lastSyncedAt: null,
  },
  reports: {},
  reportCounts: {},
};

const recomputeDateMiNotificationTotal = (state: DateMiState) => {
  state.notifications.totalBadgeCount =
    state.notifications.unreadMessages + state.notifications.newLikes + state.notifications.missedCalls;
};

// Async thunks
export const fetchProfiles = createAsyncThunk(
  'datemi/fetchProfiles',
  async (filters: any = {}, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState() as any;
      const userId = state.auth?.user?.id;
      const myProfile = state.datemi?.myProfile;
      const intention = filters.intention as 'short_term_fun' | 'long_term_partner' | undefined;
      
      const { DateMiProfileService } = await import('../../services/dateMiService');
      const { dateMiProfileCacheService } = await import('../../services/dateMiProfileCacheService');
      
      // Build cache invalidation context
      const cacheContext = {
        userId,
        preferences: filters,
        location: filters.location,
        subscriptionTier: myProfile?.subscriptionTier,
      };
      
      // Check if cache should be invalidated due to context changes
      const shouldInvalidate = await dateMiProfileCacheService.shouldInvalidateCache(intention, cacheContext);
      
      if (shouldInvalidate) {
        await dateMiProfileCacheService.invalidateCacheForIntention(intention);
      }
      
      // Try to get cached profiles first for immediate display
      const cached = !shouldInvalidate ? await dateMiProfileCacheService.getCachedProfiles(intention) : null;
      
      const excludeReviewerProfiles = (profiles: DateMiProfile[]): DateMiProfile[] => {
        if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length === 0) return profiles;
        return (profiles || []).filter(
          (p) =>
            !LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(p.userId) &&
            (p.displayName || '').toLowerCase() !== 'play store reviewer'
        );
      };

      if (cached && cached.profiles.length > 0) {
        // If cache is fresh, return cached data and skip network request
        if (!cached.isStale) {
          return excludeReviewerProfiles(cached.profiles);
        }
        
        // If cache is stale, dispatch cached data immediately, then refresh in background
        // This shows profiles instantly while fetching fresh data
        dispatch(setProfilesFromCache(excludeReviewerProfiles(cached.profiles)));
      }
      
      // Fetch fresh profiles from the server with parallel execution
      const profiles = await DateMiProfileService.getProfiles({
        ...filters,
        userId
      }, {
        timeoutMs: 15000, // Reduced timeout for faster failure detection
        throwOnError: false, // Don't throw, fall back to cache
      });

      const safeProfiles = excludeReviewerProfiles(profiles || []);
      
      // Cache the fresh profiles for next time with context
      if (safeProfiles.length > 0) {
        dateMiProfileCacheService.cacheProfiles(safeProfiles, intention, cacheContext);
        return safeProfiles;
      }
      
      // If no profiles fetched but we have cache, return cache
      if (cached && cached.profiles.length > 0) {
        return excludeReviewerProfiles(cached.profiles);
      }
      
      return safeProfiles;
    } catch (error: any) {
      // If network fails but we have cached data, use it gracefully
      try {
        const { dateMiProfileCacheService } = await import('../../services/dateMiProfileCacheService');
        const intention = filters.intention as 'short_term_fun' | 'long_term_partner' | undefined;
        const cached = await dateMiProfileCacheService.getCachedProfiles(intention);
        
        if (cached && cached.profiles.length > 0) {
          if (__DEV__) {
            console.log('[DateMi] Using cached profiles due to network error:', error?.message);
          }
          return (cached.profiles || []).filter(
            (p: DateMiProfile) =>
              !LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(p.userId) &&
              (p.displayName || '').toLowerCase() !== 'play store reviewer'
          );
        }
      } catch {
        // Ignore cache errors
      }
      
      return rejectWithValue(error?.message || 'Failed to load profiles');
    }
  }
);

export const searchProfiles = createAsyncThunk(
  'datemi/searchProfiles',
  async ({ searchTerm, filters }: { searchTerm: string; filters?: any }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const userId = state.auth?.user?.id;
      
      const { DateMiProfileService } = await import('../../services/dateMiService');
      const result = await DateMiProfileService.searchProfiles(searchTerm, {
        ...filters,
        userId
      });
      const safeProfiles =
        LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0
          ? (result.profiles || []).filter(
              (p) =>
                !LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(p.userId) &&
                (p.displayName || '').toLowerCase() !== 'play store reviewer'
            )
          : result.profiles || [];
      return {
        ...result,
        profiles: safeProfiles,
        totalCount:
          typeof result.totalCount === 'number'
            ? Math.max(0, result.totalCount - ((result.profiles || []).length - safeProfiles.length))
            : safeProfiles.length,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createProfile = createAsyncThunk(
  'datemi/createProfile',
  async (profileData: Omit<DateMiProfile, 'id'>, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const userId = profileData.userId || state.auth?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Import Supabase client
      const { supabase, isSupabaseConfigured } = await import('../../services/supabaseClient');
      
      if (!isSupabaseConfigured()) {
        // Fallback for development/testing - return mock data
        const mockProfile: DateMiProfile = {
          ...profileData,
          id: `profile-${Date.now()}`,
          userId,
          createdAt: new Date().toISOString(),
        } as DateMiProfile;
        
        return mockProfile;
      }
      
      // Prepare data for Supabase
      const supabaseData = {
        user_id: userId,
        display_name: profileData.displayName,
        age_verified: profileData.ageVerified,
        age: profileData.age,
        gender_preferences: profileData.genderPreferences,
        profile_pictures: profileData.profilePictures,
        about_me: profileData.aboutMe,
        privacy_settings: serializePrivacySettings(profileData.privacySettings),
        creator_status: profileData.creatorStatus || false,
        location: profileData.location,
        interests: profileData.interests,
        intention: profileData.intention,
        is_online: false,
        last_seen: new Date().toISOString(),
      };
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('date_mi_profiles_with_tier')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      let result;
      
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('date_mi_profiles')
          .update(supabaseData)
          .eq('user_id', userId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('date_mi_profiles')
          .insert(supabaseData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      // Transform back to app format
      const profile: DateMiProfile = {
        id: result.id,
        userId: result.user_id,
        displayName: result.display_name,
        ageVerified: result.age_verified,
        age: result.age,
        genderPreferences: result.gender_preferences,
        profilePictures: result.profile_pictures,
        aboutMe: result.about_me,
        privacySettings: deserializePrivacySettings(result.privacy_settings),
        creatorStatus: result.creator_status,
        isOnline: result.is_online,
        lastSeen: result.last_seen,
        subscriptionTier: normalizeSubscriptionTier(result.subscription_tier),
        location: result.location,
        interests: result.interests,
        intention: result.intention,
        verified: result.verified || false,
      };
      
      return profile;
    } catch (error: any) {
      
      return rejectWithValue(error.message || 'Failed to save profile');
    }
  }
);

export const startVideoCall = createAsyncThunk(
  'datemi/startVideoCall',
  async ({ partnerId, serviceType }: { partnerId: string; serviceType: string }, { rejectWithValue }) => {
    try {
      // Implementation will connect to video service and create escrow transaction
      return {
        sessionId: 'session-' + Date.now(),
        partnerId,
        startTime: new Date().toISOString(),
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'datemi/sendMessage',
  async ({ recipientId, message }: { recipientId: string; message: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const senderId = state.auth?.user?.id;
      
      if (!senderId) throw new Error('User not authenticated');
      
      // Implementation will connect to messaging service
      return {
        id: `msg-${Date.now()}`,
        senderId,
        recipientId,
        message,
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const endVideoCall = createAsyncThunk(
  'datemi/endVideoCall',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const session = state.datemi.videoCallSession;
      
      if (!session.isActive) return null;
      
      // Calculate final amount and process payment
      const endTime = new Date();
      const startTime = new Date(session.startTime);
      const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      return {
        sessionId: session.sessionId,
        duration: durationMinutes,
        finalAmount: session.currentAmount,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Subscription-related async thunks
export const purchaseSubscription = createAsyncThunk<Subscription, { userId: string; tierId: string; paymentMethodType: 'card' }>(
  'datemi/purchaseSubscription',
  async ({ 
    userId, 
    tierId, 
    paymentMethodType 
  }, { rejectWithValue }) => {
    try {
      // TODO: Implement subscriptionService
      // const result = await subscriptionService.purchaseSubscription({
      //   userId,
      //   tierId,
      //   paymentMethodType,
      // });
      // return result.subscription;
      
      // Temporary mock response - return minimal subscription object
      throw new Error('Subscription service not yet implemented');
    } catch (error: any) {
      return rejectWithValue(error.message) as any;
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'datemi/cancelSubscription',
  async ({ subscriptionId, userId }: { subscriptionId: string; userId: string }, { rejectWithValue }) => {
    try {
      const { subscriptionService } = await import('../../services/subscriptionService');
      await subscriptionService.cancelSubscription(subscriptionId, userId);
      return { subscriptionId, cancelledAt: new Date().toISOString() };
    } catch (error: any) {
      console.error('[DatemiSlice] Cancel subscription error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchBillingHistory = createAsyncThunk(
  'datemi/fetchBillingHistory',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { subscriptionService } = await import('../../services/subscriptionService');
      const history = await subscriptionService.getSubscriptionHistory(userId);
      return history;
    } catch (error: any) {
      console.error('[DatemiSlice] Fetch billing history error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const addPaymentMethod = createAsyncThunk(
  'datemi/addPaymentMethod',
  async (paymentData: Omit<PaymentMethod, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      // Implementation will connect to payment service
      const paymentMethod: PaymentMethod = {
        ...paymentData,
        id: 'pm-' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      return paymentMethod;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update profile async thunk
export const updateProfile = createAsyncThunk(
  'datemi/updateProfile',
  async (profileData: Partial<DateMiProfile> & { id: string }, { rejectWithValue }) => {
    try {
      const { supabase, isSupabaseConfigured } = await import('../../services/supabaseClient');
      
      if (!isSupabaseConfigured()) {
        // Fallback for development - return updated data
        return profileData as DateMiProfile;
      }
      
      // Prepare update data
      const updateData: any = {};
      
      if (profileData.displayName !== undefined) updateData.display_name = profileData.displayName;
      if (profileData.age !== undefined) updateData.age = profileData.age;
      if (profileData.aboutMe !== undefined) updateData.about_me = profileData.aboutMe;
      if (profileData.interests !== undefined) updateData.interests = profileData.interests;
      if (profileData.intention !== undefined) updateData.intention = profileData.intention;
      if (profileData.location !== undefined) updateData.location = profileData.location;
      if (profileData.genderPreferences !== undefined) updateData.gender_preferences = profileData.genderPreferences;
      if (profileData.profilePictures !== undefined) updateData.profile_pictures = profileData.profilePictures;
      if (profileData.privacySettings !== undefined) {
        updateData.privacy_settings = serializePrivacySettings(profileData.privacySettings);
      }
      
      updateData.last_seen = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('date_mi_profiles')
        .update(updateData)
        .eq('id', profileData.id)
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('No data returned from update');
      
      // Transform back to app format
      const profile: DateMiProfile = {
        id: data.id,
        userId: data.user_id,
        displayName: data.display_name,
        ageVerified: data.age_verified,
        age: data.age,
        genderPreferences: data.gender_preferences,
        profilePictures: data.profile_pictures,
        aboutMe: data.about_me,
        privacySettings: deserializePrivacySettings(data.privacy_settings),
        creatorStatus: data.creator_status,
        isOnline: data.is_online,
        lastSeen: data.last_seen,
        location: data.location,
        interests: data.interests,
        intention: data.intention,
        subscriptionTier: normalizeSubscriptionTier(data.subscription_tier),
        verified: data.verified || false,
      };
      
      return profile;
    } catch (error: any) {
      
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

export const fetchRecommendations = createAsyncThunk(
  'datemi/fetchRecommendations',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { recommendationService } = await import('../../services/recommendationService');
      const result = await recommendationService.getHomeScreenRecommendations(userId);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const datemiSlice = createSlice({
  name: 'datemi',
  initialState,
  reducers: {
    setCurrentProfile: (state, action: PayloadAction<DateMiProfile | null>) => {
      state.currentProfile = action.payload;
    },
    setMyProfile: (state, action: PayloadAction<DateMiProfile | null>) => {
      state.myProfile = action.payload;
    },
    // -----------------------------
    // Date Mi Notification Badges
    // -----------------------------
    setUnreadMessages: (state, action: PayloadAction<number>) => {
      state.notifications.unreadMessages = Math.max(0, action.payload || 0);
      state.notifications.lastSyncedAt = new Date().toISOString();
      recomputeDateMiNotificationTotal(state);
    },
    setNewLikes: (state, action: PayloadAction<number>) => {
      state.notifications.newLikes = Math.max(0, action.payload || 0);
      state.notifications.lastSyncedAt = new Date().toISOString();
      recomputeDateMiNotificationTotal(state);
    },
    setMissedCalls: (state, action: PayloadAction<number>) => {
      state.notifications.missedCalls = Math.max(0, action.payload || 0);
      state.notifications.lastSyncedAt = new Date().toISOString();
      recomputeDateMiNotificationTotal(state);
    },
    syncNotificationCounts: (
      state,
      action: PayloadAction<{
        unreadMessages?: number;
        newLikes?: number;
        missedCalls?: number;
        lastSyncedAt?: string | null;
      }>
    ) => {
      const payload = action.payload || {};
      if (typeof payload.unreadMessages === 'number') {
        state.notifications.unreadMessages = Math.max(0, payload.unreadMessages);
      }
      if (typeof payload.newLikes === 'number') {
        state.notifications.newLikes = Math.max(0, payload.newLikes);
      }
      if (typeof payload.missedCalls === 'number') {
        state.notifications.missedCalls = Math.max(0, payload.missedCalls);
      }
      if (typeof payload.lastSyncedAt === 'string' || payload.lastSyncedAt === null) {
        state.notifications.lastSyncedAt = payload.lastSyncedAt;
      } else {
        state.notifications.lastSyncedAt = new Date().toISOString();
      }
      recomputeDateMiNotificationTotal(state);
    },
    incrementNewLikes: (state, action: PayloadAction<number | undefined>) => {
      const inc = typeof action.payload === 'number' ? action.payload : 1;
      state.notifications.newLikes = Math.max(0, state.notifications.newLikes + inc);
      recomputeDateMiNotificationTotal(state);
    },
    incrementMissedCalls: (state, action: PayloadAction<number | undefined>) => {
      const inc = typeof action.payload === 'number' ? action.payload : 1;
      state.notifications.missedCalls = Math.max(0, state.notifications.missedCalls + inc);
      recomputeDateMiNotificationTotal(state);
    },
    clearMessageBadge: (state) => {
      state.notifications.unreadMessages = 0;
      recomputeDateMiNotificationTotal(state);
    },
    clearLikeBadge: (state) => {
      state.notifications.newLikes = 0;
      recomputeDateMiNotificationTotal(state);
    },
    clearMissedCallBadge: (state) => {
      state.notifications.missedCalls = 0;
      recomputeDateMiNotificationTotal(state);
    },
    setAgeVerified: (state, action: PayloadAction<{ verified: boolean; timestamp?: string }>) => {
      state.isAgeVerified = action.payload.verified;
      state.ageVerificationDate = action.payload.verified 
        ? (action.payload.timestamp || new Date().toISOString()) 
        : null;
    },
    setPasscodeStatus: (state, action: PayloadAction<{ isSet: boolean; isVerified?: boolean; timestamp?: string }>) => {
      state.isPasscodeSet = action.payload.isSet;
      if (action.payload.isVerified !== undefined) {
        state.isPasscodeVerified = action.payload.isVerified;
      }
      if (action.payload.timestamp) {
        state.passcodeSetDate = action.payload.timestamp;
      }
    },
    verifyPasscode: (state) => {
      state.isPasscodeVerified = true;
    },
    resetPasscodeVerification: (state) => {
      state.isPasscodeVerified = false;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Invalidate cache when filters change (handled async in middleware/thunk)
      // The fetchProfiles thunk will detect context changes and invalidate automatically
    },
    switchIntention: (state, action: PayloadAction<'short_term_fun' | 'long_term_partner'>) => {
      state.currentIntention = action.payload;
      if (state.myProfile) {
        state.myProfile.intention = action.payload;
      }
      // Cache invalidation happens automatically in fetchProfiles when intention changes
    },
    likeProfile: (state, action: PayloadAction<{ profileId: string; isSuper?: boolean }>) => {
      const { profileId, isSuper } = action.payload;
      
      // Check daily limit for free users only (Pro/Premium and reviewer accounts are unlimited)
      const profileTier = state.myProfile?.subscriptionTier;
      const subscriptionTier = state.subscription.current?.tier;
      const isReviewerUser =
        !!state.myProfile?.userId &&
        LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(state.myProfile.userId);

      const effectiveTier =
        (profileTier || subscriptionTier || 'free') as 'free' | 'pro' | 'premium';

      const hasUnlimitedLikes =
        isReviewerUser || effectiveTier === 'pro' || effectiveTier === 'premium';

      if (!hasUnlimitedLikes) {
        const today = new Date().toDateString();
        const lastReset = new Date(state.dailyLikes.lastReset).toDateString();
        
        if (today !== lastReset) {
          // Reset daily counter
          state.dailyLikes.count = 0;
          state.dailyLikes.lastReset = new Date().toISOString();
        }
        
        if (state.dailyLikes.count >= state.dailyLikes.limit && !isSuper) {
          state.error = 'Daily like limit reached. Upgrade to Pro for unlimited likes!';
          return;
        }
        
        state.dailyLikes.count++;
      }
      
      // Add to pending if not already there
      if (!state.matches.pending.includes(profileId)) {
        state.matches.pending.push(profileId);
      }
      
      // Remove from rejected if it was there
      state.matches.rejected = state.matches.rejected.filter(id => id !== profileId);
    },
    skipProfile: (state, action: PayloadAction<{ profileId: string }>) => {
      const { profileId } = action.payload;
      
      // Add to rejected list
      if (!state.matches.rejected.includes(profileId)) {
        state.matches.rejected.push(profileId);
      }
      
      // Remove from pending if it was there
      state.matches.pending = state.matches.pending.filter(id => id !== profileId);
    },
    createMatch: (state, action: PayloadAction<{ profile: DateMiProfile }>) => {
      const { profile } = action.payload;
      
      // Add to matches list
      if (!state.matches.list.find(p => p.id === profile.id)) {
        state.matches.list.push(profile);
      }
      
      // Remove from pending
      state.matches.pending = state.matches.pending.filter(id => id !== profile.id);
    },
    unmatch: (state, action: PayloadAction<{ profileId: string }>) => {
      const { profileId } = action.payload;
      
      // Remove from matches
      state.matches.list = state.matches.list.filter(p => p.id !== profileId);
      
      // Add to rejected
      if (!state.matches.rejected.includes(profileId)) {
        state.matches.rejected.push(profileId);
      }
    },
    updateSessionAmount: (state, action: PayloadAction<number>) => {
      if (state.videoCallSession.isActive) {
        state.videoCallSession.currentAmount = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setSubscription: (state, action: PayloadAction<Subscription | null>) => {
      state.subscription.current = action.payload;
    },
    toggleAutoRenew: (state) => {
      if (state.subscription.current) {
        state.subscription.current.autoRenew = !state.subscription.current.autoRenew;
      }
    },
    setPaymentMethods: (state, action: PayloadAction<PaymentMethod[]>) => {
      state.subscription.paymentMethods = action.payload;
    },
    setRecommendations: (state, action: PayloadAction<{
      trending: RecommendationItem[];
      personalized: RecommendationItem[];
      recent: RecommendationItem[];
    }>) => {
      state.recommendations = {
        ...action.payload,
        isLoading: false,
      };
    },
    // Report actions
    reportProfile: (state, action: PayloadAction<{ 
      profileId: string; 
      reporterId: string; 
      reason: string; 
      details: string; 
    }>) => {
      const { profileId, reporterId, reason, details } = action.payload;
      const report: ProfileReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        profileId,
        reporterId,
        reason,
        details,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      if (!state.reports[profileId]) {
        state.reports[profileId] = [];
      }
      state.reports[profileId].push(report);
      
      // Update report count
      state.reportCounts[profileId] = (state.reportCounts[profileId] || 0) + 1;
    },
    
    setReportCount: (state, action: PayloadAction<{ profileId: string; count: number }>) => {
      state.reportCounts[action.payload.profileId] = action.payload.count;
    },
    
    clearReports: (state, action: PayloadAction<string>) => {
      const profileId = action.payload;
      delete state.reports[profileId];
      delete state.reportCounts[profileId];
    },
    
    updatePrivacySettings: (state, action: PayloadAction<Partial<DateMiPrivacySettings>>) => {
      if (state.myProfile) {
        state.myProfile.privacySettings = {
          ...state.myProfile.privacySettings,
          ...action.payload
        };
      }
    },
    
    updateMyProfile: (state, action: PayloadAction<Partial<DateMiProfile>>) => {
      if (state.myProfile) {
        state.myProfile = {
          ...state.myProfile,
          ...action.payload
        };
      }
    },
    
    // Set profiles from cache for instant display
    setProfilesFromCache: (state, action: PayloadAction<DateMiProfile[]>) => {
      // Only update if we don't already have profiles (to avoid flicker)
      if (state.profiles.length === 0) {
        state.profiles = action.payload;
      }
    },

    // Upsert individual profiles without replacing the whole array.
    // Used to pre-load profiles before navigating to ProfileViewScreen.
    mergeProfiles: (state, action: PayloadAction<DateMiProfile[]>) => {
      for (const profile of action.payload) {
        const idx = state.profiles.findIndex((p) => p.id === profile.id);
        if (idx >= 0) {
          state.profiles[idx] = profile;
        } else {
          state.profiles.push(profile);
        }
      }
    },
    
    signOutDateMi: (state) => {
      state.myProfile = null;
      state.currentProfile = null;
      state.profiles = [];
      state.matches = {
        list: [],
        pending: [],
        rejected: [],
      };
      state.isAgeVerified = false;
      state.ageVerificationDate = null;
      state.isPasscodeSet = false;
      state.isPasscodeVerified = false;
      state.passcodeSetDate = null;
      state.videoCallSession = {
        isActive: false,
        sessionId: null,
        partnerId: null,
        startTime: null,
        currentAmount: 0,
      };
      state.recommendations = {
        trending: [],
        personalized: [],
        recent: [],
        isLoading: false,
      };
      state.dailyLikes = {
        count: 0,
        lastReset: new Date().toISOString(),
        limit: 5,
      };
      state.notifications = {
        unreadMessages: 0,
        newLikes: 0,
        missedCalls: 0,
        totalBadgeCount: 0,
        lastSyncedAt: null,
      };
      state.filters = {};
      state.error = null;
      
      // Clear profile cache on sign out (async, non-blocking)
      import('../../services/dateMiProfileCacheService').then(({ dateMiProfileCacheService }) => {
        dateMiProfileCacheService.clearAllCaches();
      }).catch(() => {
        // Ignore cache clear errors
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfiles.pending, (state, action) => {
        state.profilesLoading = true;
        state.profilesError = null;
        state.profilesRequestId = action.meta.requestId;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfiles.fulfilled, (state, action) => {
        if (state.profilesRequestId && state.profilesRequestId !== action.meta.requestId) {
          return;
        }
        state.profilesLoading = false;
        state.profilesError = null;
        state.profiles = action.payload;
        state.profilesRequestId = null;
        state.isLoading = false;
      })
      .addCase(fetchProfiles.rejected, (state, action) => {
        if (state.profilesRequestId && state.profilesRequestId !== action.meta.requestId) {
          return;
        }
        state.profilesLoading = false;
        state.profilesError = action.payload as string;
        state.profilesRequestId = null;
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createProfile cases
      .addCase(createProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myProfile = action.payload;
        state.error = null;
        // Upsert into public profiles list for immediate visibility to others
        const idx = state.profiles.findIndex(p => p.id === action.payload.id);
        if (idx >= 0) {
          state.profiles[idx] = action.payload;
        } else {
          state.profiles.unshift(action.payload);
        }
      })
      .addCase(createProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateProfile cases
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        const oldProfile = state.myProfile;
        state.myProfile = action.payload;
        state.error = null;
        
        // Check if location or preferences changed - invalidate cache if so
        const locationChanged = oldProfile?.location !== action.payload.location;
        const preferencesChanged = 
          JSON.stringify(oldProfile?.genderPreferences) !== JSON.stringify(action.payload.genderPreferences) ||
          oldProfile?.intention !== action.payload.intention;
        
        if (locationChanged || preferencesChanged) {
          // Cache will be invalidated on next fetchProfiles call due to context change
          // The fetchProfiles thunk detects these changes automatically
        }
        
        // Keep public profiles list in sync
        const idx = state.profiles.findIndex(p => p.id === action.payload.id);
        if (idx >= 0) {
          state.profiles[idx] = action.payload;
        } else {
          state.profiles.unshift(action.payload);
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(startVideoCall.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(startVideoCall.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.videoCallSession = {
            isActive: true,
            sessionId: action.payload.sessionId,
            partnerId: action.payload.partnerId,
            startTime: action.payload.startTime,
            currentAmount: 0,
          };
        }
      })
      .addCase(startVideoCall.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(endVideoCall.fulfilled, (state, action) => {
        state.videoCallSession = {
          isActive: false,
          sessionId: null,
          partnerId: null,
          startTime: null,
          currentAmount: 0,
        };
        
        if (action.payload) {
          // Add to transaction history
          const transaction: EscrowTransaction = {
            id: 'txn-' + Date.now(),
            payerId: 'current-user', // Will be replaced with actual user ID
            payeeId: state.videoCallSession.partnerId || '',
            amount: action.payload.finalAmount,
            currency: 'KES',
            escrowStatus: 'completed',
            serviceType: 'video_calling',
            sessionReference: action.payload.sessionId,
            createdAt: new Date().toISOString(),
            completionDate: new Date().toISOString(),
          };
          state.transactions.unshift(transaction);
        }
      })
      // Subscription reducers
      .addCase(purchaseSubscription.pending, (state) => {
        state.subscription.isProcessingPayment = true;
        state.error = null;
      })
      .addCase(purchaseSubscription.fulfilled, (state, action) => {
        state.subscription.isProcessingPayment = false;
        state.subscription.current = action.payload;
        // Note: subscriptionTier is now computed from subscriptions table via view
        // No manual sync needed - it will update automatically on next profile fetch
        // Cache will be invalidated on next fetchProfiles call due to tier change
      })
      .addCase(purchaseSubscription.rejected, (state, action) => {
        state.subscription.isProcessingPayment = false;
        state.error = action.payload as string;
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        if (state.subscription.current) {
          state.subscription.current.status = 'cancelled';
          state.subscription.current.autoRenew = false;
        }
        // Note: subscriptionTier is now computed from subscriptions table via view
        // No manual sync needed - it will update automatically on next profile fetch
        // Cache will be invalidated on next fetchProfiles call due to tier change
      })
      .addCase(fetchBillingHistory.fulfilled, (state, action) => {
        state.subscription.billingHistory = action.payload;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.subscription.paymentMethods.push(action.payload);
      })
      .addCase(fetchRecommendations.pending, (state) => {
        state.recommendations.isLoading = true;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.recommendations = {
          ...action.payload,
          isLoading: false,
        };
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.recommendations.isLoading = false;
        state.error = action.payload as string;
      })
      // Search profiles cases
      .addCase(searchProfiles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProfiles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profiles = action.payload.profiles;
        // Optionally store search metadata
      })
      .addCase(searchProfiles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.profiles = [];
      });
  },
});

export const setCurrentProfile = datemiSlice.actions.setCurrentProfile;
export const setMyProfile = datemiSlice.actions.setMyProfile;
export const setUnreadMessages = datemiSlice.actions.setUnreadMessages;
export const setNewLikes = datemiSlice.actions.setNewLikes;
export const setMissedCalls = datemiSlice.actions.setMissedCalls;
export const syncNotificationCounts = datemiSlice.actions.syncNotificationCounts;
export const incrementNewLikes = datemiSlice.actions.incrementNewLikes;
export const incrementMissedCalls = datemiSlice.actions.incrementMissedCalls;
export const clearMessageBadge = datemiSlice.actions.clearMessageBadge;
export const clearLikeBadge = datemiSlice.actions.clearLikeBadge;
export const clearMissedCallBadge = datemiSlice.actions.clearMissedCallBadge;
export const setAgeVerified = datemiSlice.actions.setAgeVerified;
export const setPasscodeStatus = datemiSlice.actions.setPasscodeStatus;
export const verifyPasscode = datemiSlice.actions.verifyPasscode;
export const resetPasscodeVerification = datemiSlice.actions.resetPasscodeVerification;
export const setFilters = datemiSlice.actions.setFilters;
export const switchIntention = datemiSlice.actions.switchIntention;
export const likeProfile = datemiSlice.actions.likeProfile;
export const skipProfile = datemiSlice.actions.skipProfile;
export const createMatch = datemiSlice.actions.createMatch;
export const unmatch = datemiSlice.actions.unmatch;
export const updateSessionAmount = datemiSlice.actions.updateSessionAmount;
export const clearError = datemiSlice.actions.clearError;
export const setSubscription = datemiSlice.actions.setSubscription;
export const toggleAutoRenew = datemiSlice.actions.toggleAutoRenew;
export const setPaymentMethods = datemiSlice.actions.setPaymentMethods;
export const setRecommendations = datemiSlice.actions.setRecommendations;
export const reportProfile = datemiSlice.actions.reportProfile;
export const setReportCount = datemiSlice.actions.setReportCount;
export const clearReports = datemiSlice.actions.clearReports;
export const updatePrivacySettings = datemiSlice.actions.updatePrivacySettings;
export const updateMyProfile = datemiSlice.actions.updateMyProfile;
export const setProfilesFromCache = datemiSlice.actions.setProfilesFromCache;
export const mergeProfiles = datemiSlice.actions.mergeProfiles;
export const signOutDateMi = datemiSlice.actions.signOutDateMi;

// Selectors (Date Mi only)
export const selectDateMiTotalBadgeCount = (state: { datemi: DateMiState }) =>
  state.datemi.notifications.totalBadgeCount;
export const selectDateMiNotificationCounts = (state: { datemi: DateMiState }) => state.datemi.notifications;
export default datemiSlice.reducer;
