/**
 * DateMi Service - Production Ready
 * Handles all DateMi related operations with proper typing
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { DateMiProfile, DateMiPrivacySettings } from '../redux/slices/datemiSlice';
import type { Tables } from '../types/supabase';
import { DEMO_DATEMI_PROFILES } from '../data/demoDateMi';
import locationRecommendationService from './locationRecommendationService';
import locationService from './locationService';
import { LocationCoordinates } from '../types/property';
import { dateMiSubscriptionService } from './dateMiSubscriptionService';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../utils/playStoreReviewer';
import { formatPostgrestInList } from '../utils/supabaseFilters';

// Type for database row
type DateMiProfileRow = Tables<'date_mi_profiles'> | Tables<'date_mi_profiles_with_tier'>;

// Table and view constants for consistency
const DATE_MI_PROFILES_TABLE = 'date_mi_profiles';
const DATE_MI_PROFILES_VIEW = 'date_mi_profiles_with_tier';
const DEFAULT_PROFILE_TIMEOUT_MS = 20000; // Increased from 10s to 20s for slow networks
const DEFAULT_PROFILES_PAGE_SIZE = 50;
const BLOCKLIST_TIMEOUT_MS = 10000; // Increased from 6s to 10s for slow networks

type ProfileFetchOptions = {
  timeoutMs?: number;
  throwOnError?: boolean;
};

const applyAbortSignal = <T,>(query: T, signal?: AbortSignal): T => {
  if (!signal) return query;
  const maybeQuery = query as any;
  if (typeof maybeQuery?.abortSignal === 'function') {
    return maybeQuery.abortSignal(signal);
  }
  return query;
};

const withTimeout = async <T,>(
  promiseFactory: (signal?: AbortSignal) => PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // ignore abort errors
      }
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    const work = Promise.resolve(promiseFactory(controller?.signal) as any) as Promise<T>;
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// Helper function to transform database row to DateMiProfile
const transformDatabaseRowToProfile = (row: DateMiProfileRow): DateMiProfile => {
  // Safely convert privacy_settings from Json to DateMiPrivacySettings
  let privacySettings: DateMiPrivacySettings = createPrivacySettings();
  if (row.privacy_settings && typeof row.privacy_settings === 'object' && !Array.isArray(row.privacy_settings)) {
    try {
      privacySettings = {
        ...createPrivacySettings(),
        ...(row.privacy_settings as Partial<DateMiPrivacySettings>)
      };
    } catch {
      privacySettings = createPrivacySettings();
    }
  }

  // Safely convert subscription_tier (may not exist if querying base table)
  const subscriptionTier = (row.subscription_tier && ['free', 'pro', 'premium'].includes(row.subscription_tier) 
    ? row.subscription_tier 
    : 'free') as 'free' | 'pro' | 'premium';

  // Prefer DateMi-specific photos if they are valid http(s) URLs.
  // If they are missing or only contain local file:// URIs from older versions,
  // fall back to the main profile_image_url from the users table.
  const rawPictures = (row as any).profile_pictures as string[] | null | undefined;
  const hasValidRemotePictures =
    Array.isArray(rawPictures) &&
    rawPictures.some((p) => typeof p === 'string' && /^https?:\/\//.test(p));

  const profilePictures: string[] = hasValidRemotePictures
    ? (rawPictures as string[]).filter((p) => typeof p === 'string' && /^https?:\/\//.test(p))
    : ((row as any).profile_image_url
        ? [(row as any).profile_image_url as string]
        : []);

  const lastSeen: string =
    (row as any).last_seen || row.updated_at || row.created_at || new Date().toISOString();
  const lastSeenMs = new Date(lastSeen).getTime();
  const isOnlineRecently =
    Number.isFinite(lastSeenMs) ? Date.now() - lastSeenMs <= 5 * 60 * 1000 : false;

  return {
    id: (row as any).id as string,
    userId: (row as any).user_id as string,
    displayName: (row as any).display_name as string,
    ageVerified: row.age_verified || false,
    genderPreferences: row.gender_preferences || [],
    profilePictures,
    aboutMe: row.about_me,
    privacySettings,
    creatorStatus: row.creator_status || false,
    // Never trust a stale boolean flag; tie "online" to recency as well.
    isOnline: Boolean((row as any).is_online) && isOnlineRecently,
    lastSeen,
    subscriptionTier,
    subscriptionCountry: row.subscription_country || 'KE',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    age: (row as any).age,
    location: (row as any).location || undefined,
    interests: (row as any).interests || [],
    intention: (row as any).intention as 'short_term_fun' | 'long_term_partner' | undefined,
    verified: (row as any).verified || false,
  };
};

// Helper function to create complete privacy settings
export const createPrivacySettings = (overrides: Partial<DateMiPrivacySettings> = {}): DateMiPrivacySettings => ({
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
  ...overrides
});

// Profile service class
export class DateMiProfileService {
  /**
   * Create a new DateMi profile
   */
  static async createProfile(profileData: Omit<DateMiProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<DateMiProfile> {
    if (!isSupabaseConfigured()) {
      const newProfile: DateMiProfile = {
        ...profileData,
        id: `demo-profile-${Date.now()}`,
        privacySettings: profileData.privacySettings || createPrivacySettings(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as DateMiProfile;
      return newProfile;
    }
    
    try {
      const { data, error } = await (supabase
        .from('date_mi_profiles') as any)
        .insert({
          user_id: profileData.userId,
          display_name: profileData.displayName,
          age_verified: profileData.ageVerified,
          gender_preferences: profileData.genderPreferences,
          profile_pictures: profileData.profilePictures,
          about_me: profileData.aboutMe,
          privacy_settings: profileData.privacySettings || createPrivacySettings(),
          creator_status: profileData.creatorStatus,
          subscription_country: profileData.subscriptionCountry || 'KE',
          age: profileData.age,
          location: profileData.location,
          interests: profileData.interests,
          intention: profileData.intention,
          verified: profileData.verified || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        if (__DEV__) {
          console.warn('Failed to create profile in database:', error.message);
        }
        throw new Error(`Failed to create profile: ${error.message}`);
      }
      return data ? transformDatabaseRowToProfile(data) : profileData as DateMiProfile;
    } catch (error) {
      if (__DEV__) {
        console.error('Error creating profile:', error);
      }
      throw error;
    }
  }

  /**
   * Get profile by ID
   */
  static async getProfile(profileId: string): Promise<DateMiProfile | null> {
    if (!isSupabaseConfigured()) {
      if (__DEV__) {
        console.warn('Supabase not configured');
      }
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from(DATE_MI_PROFILES_VIEW)
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        if (__DEV__) {
          console.warn('Failed to fetch profile from database:', error.message);
        }
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      return transformDatabaseRowToProfile(data as any);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching profile:', error);
      }
      return null;
    }
  }

  /**
   * Get profile by user ID (for loading user's own profile)
   */
  static async getProfileByUserId(
    userId: string,
    options: ProfileFetchOptions = {}
  ): Promise<DateMiProfile | null> {
    if (!isSupabaseConfigured()) {
      if (__DEV__) {
        console.warn('Supabase not configured');
      }
      return null;
    }
    
    try {
      const { timeoutMs = DEFAULT_PROFILE_TIMEOUT_MS, throwOnError = false } = options;
      const { data, error } = await withTimeout(
        (signal) =>
          applyAbortSignal(
            supabase
              .from(DATE_MI_PROFILES_VIEW)
              .select(
                'id,user_id,display_name,age_verified,age,gender_preferences,profile_pictures,about_me,privacy_settings,creator_status,is_online,last_seen,location,interests,intention,verified,subscription_tier,subscription_country,created_at,updated_at'
              )
              .eq('user_id', userId)
              .maybeSingle(),
            signal
          ),
        timeoutMs,
        'Profile request timed out'
      );

      if (error) {
        if (__DEV__) {
          console.warn('Failed to fetch user profile from database:', error.message);
        }
        // Fallback for schema drift: if the DateMi view is missing columns (e.g. age),
        // retry against the base table so existing profiles still load and users
        // aren't incorrectly prompted to recreate a profile.
        const errorCode = (error as any)?.code;
        if (errorCode === '42703') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(DATE_MI_PROFILES_TABLE)
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!fallbackError && fallbackData) {
            return transformDatabaseRowToProfile(fallbackData as any);
          }
        }
        if (throwOnError) {
          throw new Error(error.message);
        }
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      return transformDatabaseRowToProfile(data as any);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching user profile:', error);
      }
      if (options.throwOnError) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(profileId: string, updates: Partial<DateMiProfile>): Promise<DateMiProfile | null> {
    if (!isSupabaseConfigured()) {
      if (__DEV__) {
        console.warn('Supabase not configured');
      }
      return null;
    }
    
    try {
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.aboutMe !== undefined) dbUpdates.about_me = updates.aboutMe;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
      if (updates.intention !== undefined) dbUpdates.intention = updates.intention;
      if (updates.genderPreferences !== undefined) dbUpdates.gender_preferences = updates.genderPreferences;
      if (updates.profilePictures !== undefined) dbUpdates.profile_pictures = updates.profilePictures;
      if (updates.privacySettings !== undefined) dbUpdates.privacy_settings = updates.privacySettings;
      if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
      
      const { data, error } = await (supabase
        .from('date_mi_profiles') as any)
        .update(dbUpdates)
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        if (__DEV__) {
          console.warn('Failed to update profile in database:', error.message);
        }
        return null;
      }
      return data ? transformDatabaseRowToProfile(data) : null;
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating profile:', error);
      }
      return null;
    }
  }

  /**
   * Get profiles based on filters
   */
  static async getProfiles(filters: {
    intention?: 'short_term_fun' | 'long_term_partner';
    ageRange?: { min: number; max: number };
    location?: string;
    isOnline?: boolean;
    verified?: boolean;
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}, options: ProfileFetchOptions = {}): Promise<DateMiProfile[]> {
    if (!isSupabaseConfigured()) {
      const pageSize = filters.limit ?? DEFAULT_PROFILES_PAGE_SIZE;
      const offset = filters.offset ?? 0;

      let results = [...DEMO_DATEMI_PROFILES];

      if (filters.userId) {
        results = results.filter((p) => p.userId !== filters.userId);
      }
      if (filters.intention) {
        results = results.filter((p) => p.intention === filters.intention);
      }
      if (filters.ageRange) {
        const { min, max } = filters.ageRange;
        results = results.filter(
          (p) =>
            typeof p.age === 'number' &&
            p.age >= min &&
            p.age <= max
        );
      }
      if (filters.location) {
        results = results.filter((p) => p.location === filters.location);
      }
      if (filters.isOnline === true) {
        results = results.filter((p) => p.isOnline === true);
      }
      if (filters.verified !== undefined) {
        results = results.filter((p) => Boolean(p.verified) === filters.verified);
      }

      return results.slice(offset, offset + pageSize);
    }
    
    try {
      let blockedIds: string[] = [];
      let usersWhoBlockedMe: string[] = [];
      
      if (filters.userId) {
        const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_PROFILE_TIMEOUT_MS, BLOCKLIST_TIMEOUT_MS);
        const [blockedIdsResult, usersWhoBlockedMeResult] = await Promise.all([
          withTimeout(
            () => this.getBlockedByUserIds(filters.userId as string),
            timeoutMs,
            'Blocked list request timed out'
          ).catch(() => [] as string[]),
          withTimeout(
            () => this.getUsersWhoBlockedMe(filters.userId as string),
            timeoutMs,
            'Blocked list request timed out'
          ).catch(() => [] as string[]),
        ]);
        blockedIds = blockedIdsResult;
        usersWhoBlockedMe = usersWhoBlockedMeResult;
      }

      const pageSize = filters.limit ?? DEFAULT_PROFILES_PAGE_SIZE;
      const offset = filters.offset ?? 0;

      let query: any = supabase
        .from(DATE_MI_PROFILES_VIEW)
        .select(
          'id,user_id,display_name,age_verified,age,gender_preferences,profile_pictures,about_me,privacy_settings,creator_status,is_online,last_seen,location,interests,intention,verified,subscription_tier,subscription_country,created_at,updated_at,profile_image_url'
        )
        .range(offset, offset + pageSize - 1);

      if (blockedIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(blockedIds));
      }
      
      if (usersWhoBlockedMe.length > 0) {
        query = query.not('user_id', 'in', formatPostgrestInList(usersWhoBlockedMe));
      }

      // Never show Play Store reviewer/test accounts in public browse/search lists
      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'user_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      if (filters.userId) {
        query = query.neq('user_id', filters.userId);
      }

      if (filters.intention) {
        query = query.eq('intention', filters.intention);
      }
      if (filters.ageRange) {
        query = query.gte('age', filters.ageRange.min).lte('age', filters.ageRange.max);
      }
      if (filters.location) {
        query = query.eq('location', filters.location);
      }
      // Option C: "Active recently" filter (derived from last_seen, not a realtime online flag)
      if (filters.isOnline === true) {
        const threshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        query = query.gte('last_seen', threshold);
      }
      if (filters.verified !== undefined) {
        query = query.eq('verified', filters.verified);
      }
      // Default ordering keeps results stable and surfaces active profiles first.
      // (Avoid complex ordering that might require extra indexes.)
      query = query.order('updated_at', { ascending: false });

      const { timeoutMs = DEFAULT_PROFILE_TIMEOUT_MS, throwOnError = false } = options;
      const { data, error } = await withTimeout<any>(
        (signal) => applyAbortSignal(query, signal),
        timeoutMs,
        'Profiles request timed out'
      );

      if (error) {
        const errorCode = (error as any)?.code;
        if (errorCode === '42703') {
          // View schema drift fallback: retry against base table.
          let fallbackQuery: any = supabase.from(DATE_MI_PROFILES_TABLE).select('*');

          if (blockedIds.length > 0) {
            fallbackQuery = fallbackQuery.not('id', 'in', formatPostgrestInList(blockedIds));
          }
          if (usersWhoBlockedMe.length > 0) {
            fallbackQuery = fallbackQuery.not('user_id', 'in', formatPostgrestInList(usersWhoBlockedMe));
          }
          if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
            fallbackQuery = fallbackQuery.not(
              'user_id',
              'in',
              formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
            );
          }
          if (filters.userId) {
            fallbackQuery = fallbackQuery.neq('user_id', filters.userId);
          }
          if (filters.intention) {
            fallbackQuery = fallbackQuery.eq('intention', filters.intention);
          }
          if (filters.ageRange) {
            fallbackQuery = fallbackQuery.gte('age', filters.ageRange.min).lte('age', filters.ageRange.max);
          }
          if (filters.location) {
            fallbackQuery = fallbackQuery.eq('location', filters.location);
          }
          if (filters.isOnline === true) {
            const threshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            fallbackQuery = fallbackQuery.gte('last_seen', threshold);
          }
          if (filters.verified !== undefined) {
            fallbackQuery = fallbackQuery.eq('verified', filters.verified);
          }

          fallbackQuery = fallbackQuery
            .range(offset, offset + pageSize - 1)
            .order('updated_at', { ascending: false });

          const { data: fallbackData, error: fallbackError } = await withTimeout<any>(
            (signal) => applyAbortSignal(fallbackQuery, signal),
            timeoutMs,
            'Profiles request timed out'
          );

          if (!fallbackError) {
            return (fallbackData || []).map(transformDatabaseRowToProfile);
          }
        }

        if (throwOnError) {
          throw new Error(error.message);
        }
        throw error;
      }
      return (data || []).map(transformDatabaseRowToProfile);
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching profiles:', error);
      }
      if (options.throwOnError) {
        throw error;
      }
      return [];
    }
  }

  /**
   * Search profiles with enhanced criteria
   */
  static async searchProfiles(
    searchTerm: string, 
    filters?: {
      intention?: 'short_term_fun' | 'long_term_partner';
      ageRange?: { min: number; max: number };
      location?: string;
      interests?: string[];
      verified?: boolean;
      isOnline?: boolean;
      limit?: number;
      offset?: number;
      userId?: string;
    }
  ): Promise<{ profiles: DateMiProfile[]; totalCount: number }> {
    if (!isSupabaseConfigured()) {
      const term = (searchTerm || '').trim().toLowerCase();
      let results = [...DEMO_DATEMI_PROFILES];

      if (filters?.userId) {
        results = results.filter((p) => p.userId !== filters.userId);
      }
      if (filters?.intention) {
        results = results.filter((p) => p.intention === filters.intention);
      }
      if (filters?.ageRange) {
        const { min, max } = filters.ageRange;
        results = results.filter((p) => typeof p.age === 'number' && p.age >= min && p.age <= max);
      }
      if (filters?.location) {
        const loc = filters.location.toLowerCase();
        results = results.filter((p) => (p.location || '').toLowerCase().includes(loc));
      }
      if (filters?.verified !== undefined) {
        results = results.filter((p) => Boolean(p.verified) === filters.verified);
      }
      if (filters?.isOnline === true) {
        results = results.filter((p) => p.isOnline === true);
      }
      if (filters?.interests && filters.interests.length > 0) {
        const requested = filters.interests.map((i) => i.toLowerCase());
        results = results.filter((p) => {
          const profileInterests = (p.interests || []).map((i) => i.toLowerCase());
          return requested.every((r) => profileInterests.includes(r));
        });
      }

      if (term) {
        results = results.filter((p) => {
          const name = (p.displayName || '').toLowerCase();
          const about = (p.aboutMe || '').toLowerCase();
          const loc = (p.location || '').toLowerCase();
          const interests = (p.interests || []).some((i) => i.toLowerCase().includes(term));
          return name.includes(term) || about.includes(term) || loc.includes(term) || interests;
        });
      }

      // Prefer online profiles first (helps UX and matches test expectations)
      results.sort((a, b) => Number(Boolean(b.isOnline)) - Number(Boolean(a.isOnline)));

      const totalCount = results.length;
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      return {
        profiles: results.slice(offset, offset + limit),
        totalCount,
      };
    }
    
    try {
      let blockedIds: string[] = [];
      let usersWhoBlockedMe: string[] = [];
      
      if (filters?.userId) {
        const timeoutMs = Math.min(DEFAULT_PROFILE_TIMEOUT_MS, BLOCKLIST_TIMEOUT_MS);
        const [blockedIdsResult, usersWhoBlockedMeResult] = await Promise.all([
          withTimeout(
            () => this.getBlockedByUserIds(filters.userId as string),
            timeoutMs,
            'Blocked list request timed out'
          ).catch(() => [] as string[]),
          withTimeout(
            () => this.getUsersWhoBlockedMe(filters.userId as string),
            timeoutMs,
            'Blocked list request timed out'
          ).catch(() => [] as string[]),
        ]);
        blockedIds = blockedIdsResult;
        usersWhoBlockedMe = usersWhoBlockedMeResult;
      }

      let query: any = supabase.from(DATE_MI_PROFILES_VIEW).select('*', { count: 'exact' });

      if (blockedIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(blockedIds));
      }
      
      if (usersWhoBlockedMe.length > 0) {
        query = query.not('user_id', 'in', formatPostgrestInList(usersWhoBlockedMe));
      }

      // Never show Play Store reviewer/test accounts in public browse/search lists
      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'user_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      if (filters?.userId) {
        query = query.neq('user_id', filters.userId);
      }

      if (searchTerm && searchTerm.trim()) {
        const searchPattern = `%${searchTerm}%`;
        query = query.or(
          `display_name.ilike.${searchPattern},` +
          `about_me.ilike.${searchPattern},` +
          `location.ilike.${searchPattern}`
        );
      }

      if (filters?.intention) {
        query = query.eq('intention', filters.intention);
      }
      if (filters?.ageRange) {
        query = query.gte('age', filters.ageRange.min).lte('age', filters.ageRange.max);
      }
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters?.verified !== undefined) {
        query = query.eq('verified', filters.verified);
      }
      // Option C: "Active recently" filter (derived from last_seen, not a realtime online flag)
      if (filters?.isOnline === true) {
        const threshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        query = query.gte('last_seen', threshold);
      }
      if (filters?.interests && filters.interests.length > 0) {
        query = query.contains('interests', filters.interests);
      }

      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      query = query.order('is_online', { ascending: false })
                   .order('verified', { ascending: false })
                   .order('updated_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;
      
      return {
        profiles: (data || []).map(transformDatabaseRowToProfile),
        totalCount: count || 0
      };
    } catch (error) {
      if (__DEV__) {
        console.error('Error searching profiles:', error);
      }
      return { profiles: [], totalCount: 0 };
    }
  }

  /**
   * Like a profile
   */
  static async likeProfile(userId: string, profileId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('datemi_likes')
        .insert({
          user_id: userId,
          profile_id: profileId,
          created_at: new Date().toISOString()
        } as any);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to like profile:', error.message);
        }
        return false;
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error liking profile:', error);
      }
      return false;
    }
  }

  /**
   * Check if profiles match
   */
  static async checkMatch(userId1: string, userId2: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('datemi_likes')
        .select('user_id, profile_id')
        .or(`and(user_id.eq.${userId1},profile_id.eq.${userId2}),and(user_id.eq.${userId2},profile_id.eq.${userId1})`);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to check match:', error.message);
        }
        return false;
      }
      
      if (!data || data.length < 2) {
        return false;
      }
      
      const user1LikedUser2 = data.some((like: any) => like.user_id === userId1 && like.profile_id === userId2);
      const user2LikedUser1 = data.some((like: any) => like.user_id === userId2 && like.profile_id === userId1);
      
      return !!(user1LikedUser2 && user2LikedUser1);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error checking match:', error);
      }
      return false;
    }
  }

  /**
   * Get matches for a user
   */
  static async getMatches(userId: string): Promise<DateMiProfile[]> {
    try {
      if (!isSupabaseConfigured()) {
        return [];
      }

      const blockedIds = await this.getBlockedByUserIds(userId);
      const usersWhoBlockedMe = await this.getUsersWhoBlockedMe(userId);

      const { data: userLikes, error: likesError } = await supabase
        .from('datemi_likes')
        .select('profile_id')
        .eq('user_id', userId);

      if (likesError) throw likesError;

      if (!userLikes || userLikes.length === 0) return [];

      const profileIds = (userLikes as any[]).map((like: any) => like.profile_id);
      const { data: mutualLikes, error: mutualError } = await supabase
        .from('datemi_likes')
        .select('user_id')
        .eq('profile_id', userId)
        .in('user_id', profileIds);

      if (mutualError) throw mutualError;

      if (!mutualLikes || mutualLikes.length === 0) return [];

      const matchedIds = (mutualLikes as any[]).map((like: any) => like.user_id);
      
      const filteredMatchedIds = matchedIds.filter((id: string) => 
        !usersWhoBlockedMe.includes(id)
      );

      if (filteredMatchedIds.length === 0) return [];

      let query: any = supabase
        .from(DATE_MI_PROFILES_VIEW)
        .select('*')
        .in('user_id', filteredMatchedIds);

      if (blockedIds.length > 0) {
        query = query.not('id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      return (profiles || []).map(transformDatabaseRowToProfile);
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching matches:', error);
      }
      return [];
    }
  }

  /**
   * Report a profile
   */
  static async reportProfile(reporterId: string, profileId: string, reason: string, details?: string): Promise<boolean> {
    if (!reporterId || !profileId) {
      throw new Error('Reporter ID and Profile ID are required');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('Report reason is required');
    }

    if (reporterId === profileId) {
      throw new Error('You cannot report your own profile');
    }

    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      const { data: existingReport, error: checkError } = await supabase
        .from('datemi_reports')
        .select('id')
        .eq('reporter_id', reporterId)
        .eq('profile_id', profileId)
        .eq('reason', reason)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        if (__DEV__) {
          console.warn('Error checking existing report:', checkError.message);
        }
      }

      if (existingReport) {
        throw new Error('You have already reported this profile for this reason within the last 24 hours');
      }

      const { error } = await (supabase
        .from('datemi_reports') as any)
        .insert({
          reporter_id: reporterId,
          profile_id: profileId,
          reason,
          details: details?.trim() || null,
          created_at: new Date().toISOString(),
          status: 'pending'
        });

      if (error) {
        if (__DEV__) {
          console.warn('Failed to submit report to backend:', error.message);
        }
        return true;
      }

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already reported')) {
        throw error;
      }
      if (__DEV__) {
        console.warn('Error submitting report:', error);
      }
      return true;
    }
  }

  /**
   * Get reports for a profile
   */
  static async getProfileReports(profileId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('datemi_reports')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        if (__DEV__) {
          console.warn('Failed to fetch reports from backend:', error.message);
        }
        return [];
      }

      return data || [];
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching reports:', error);
      }
      return [];
    }
  }

  /**
   * Get report count for a profile
   */
  static async getProfileReportCount(profileId: string): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('datemi_reports')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Block a profile
   */
  static async blockProfile(userId: string, profileId: string, reason?: string): Promise<boolean> {
    if (!userId || !profileId) {
      throw new Error('User ID and Profile ID are required');
    }

    if (userId === profileId) {
      throw new Error('You cannot block yourself');
    }

    if (!isSupabaseConfigured()) {
      return true;
    }
    
    try {
      const { data: existingBlock } = await supabase
        .from('datemi_blocks')
        .select('id')
        .eq('user_id', userId)
        .eq('blocked_profile_id', profileId)
        .maybeSingle();

      if (existingBlock) {
        if (__DEV__) {
          console.log('Profile already blocked');
        }
        return true;
      }

      const { error } = await (supabase
        .from('datemi_blocks') as any)
        .insert({
          user_id: userId,
          blocked_profile_id: profileId,
          reason: reason || null,
          is_permanent: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        if (__DEV__) {
          console.warn('Failed to block profile:', error.message);
        }
        return false;
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error blocking profile:', error);
      }
      return false;
    }
  }

  static async unblockProfile(userId: string, profileId: string): Promise<boolean> {
    if (!userId || !profileId) {
      throw new Error('User ID and Profile ID are required');
    }

    if (!isSupabaseConfigured()) {
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('datemi_blocks')
        .delete()
        .eq('user_id', userId)
        .eq('blocked_profile_id', profileId);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to unblock profile:', error.message);
        }
        return false;
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error unblocking profile:', error);
      }
      return false;
    }
  }

  static async getBlockedProfiles(userId: string): Promise<DateMiProfile[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!isSupabaseConfigured()) {
      return [];
    }
    
    try {
      const { data: blocks, error: blocksError } = await supabase
        .from('datemi_blocks')
        .select('blocked_profile_id')
        .eq('user_id', userId);

      if (blocksError) {
        if (__DEV__) {
          console.warn('Failed to fetch blocked profiles:', blocksError.message);
        }
        return [];
      }

      if (!blocks || blocks.length === 0) {
        return [];
      }

      const blockedIds = blocks.map((block: any) => block.blocked_profile_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from(DATE_MI_PROFILES_VIEW)
        .select('*')
        .in('id', blockedIds);

      if (profilesError) {
        if (__DEV__) {
          console.warn('Failed to fetch blocked profile details:', profilesError.message);
        }
        return [];
      }

      return (profiles || []).map(transformDatabaseRowToProfile);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching blocked profiles:', error);
      }
      return [];
    }
  }

  static async isProfileBlocked(userId: string, profileId: string): Promise<boolean> {
    if (!userId || !profileId) {
      return false;
    }

    if (!isSupabaseConfigured()) {
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('datemi_blocks')
        .select('id')
        .eq('user_id', userId)
        .eq('blocked_profile_id', profileId)
        .maybeSingle();

      if (error) {
        if (__DEV__) {
          console.warn('Failed to check if profile is blocked:', error.message);
        }
        return false;
      }

      return !!data;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error checking if profile is blocked:', error);
      }
      return false;
    }
  }

  static async getBlockedByUserIds(userId: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    if (!isSupabaseConfigured()) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('datemi_blocks')
        .select('blocked_profile_id')
        .eq('user_id', userId);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to fetch blocked user IDs:', error.message);
        }
        return [];
      }

      return (data || []).map((block: any) => block.blocked_profile_id);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching blocked user IDs:', error);
      }
      return [];
    }
  }

  static async getUsersWhoBlockedMe(userId: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    if (!isSupabaseConfigured()) {
      return [];
    }
    
    try {
      const { data: myProfile } = await supabase
        .from(DATE_MI_PROFILES_VIEW)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!myProfile) {
        return [];
      }

      const { data, error } = await supabase
        .from('datemi_blocks')
        .select('user_id')
        .eq('blocked_profile_id', myProfile.id);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to fetch users who blocked me:', error.message);
        }
        return [];
      }

      return (data || []).map((block: any) => block.user_id);
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching users who blocked me:', error);
      }
      return [];
    }
  }

  /**
   * Update online status
   */
  static async updateOnlineStatus(userId: string, isOnline: boolean): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    try {
      const { error } = await (supabase
        .from('date_mi_profiles') as any)
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to update online status:', error.message);
        }
        return false;
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error updating online status:', error);
      }
      return false;
    }
  }

  /**
   * Get daily likes info for a user
   */
  static async getDailyLikesInfo(userId: string): Promise<{ count: number; limit: number; resetAt: string } | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('date_mi_profiles')
        .select('daily_likes_count, daily_likes_limit, daily_likes_reset_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (__DEV__) {
          console.warn('Failed to fetch daily likes info:', error.message);
        }
        return null;
      }

      if (!data) return null;

      return {
        count: (data as any).daily_likes_count || 0,
        limit: (data as any).daily_likes_limit || 10,
        resetAt: (data as any).daily_likes_reset_at || new Date().toISOString()
      };
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching daily likes info:', error);
      }
      return null;
    }
  }

  /**
   * Increment daily likes count
   */
  static async incrementDailyLikes(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      // Get current count and increment
      const { data, error } = await supabase
        .from('date_mi_profiles')
        .select('daily_likes_count, daily_likes_limit')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        if (__DEV__) {
          console.warn('Failed to fetch current likes count:', error?.message);
        }
        return false;
      }

      // Update the count
      const { error: updateError } = await (supabase
        .from('date_mi_profiles') as any)
        .update({
          daily_likes_count: ((data as any).daily_likes_count || 0) + 1
        })
        .eq('user_id', userId);

      if (updateError) {
        if (__DEV__) {
          console.warn('Failed to increment daily likes:', updateError.message);
        }
        return false;
      }

      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error incrementing daily likes:', error);
      }
      return false;
    }
  }

  /**
   * Set daily likes limit (for subscription tier changes)
   */
  static async setDailyLikesLimit(userId: string, limit: number): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      const { error } = await (supabase
        .from('date_mi_profiles') as any)
        .update({
          daily_likes_limit: limit
        })
        .eq('user_id', userId);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to set daily likes limit:', error.message);
        }
        return false;
      }

      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error setting daily likes limit:', error);
      }
      return false;
    }
  }

  static async getProfilesNearLocation(
    centerCoordinates: LocationCoordinates,
    radiusKm: number = 50,
    limit: number = 20,
    filters?: {
      intention?: 'short_term_fun' | 'long_term_partner';
      ageRange?: { min: number; max: number };
      verified?: boolean;
      userId?: string;
    }
  ): Promise<{ profile: DateMiProfile; distance?: number; distanceFormatted?: string }[]> {
    try {
      if (!isSupabaseConfigured()) {
        if (__DEV__) {
          console.warn('Supabase not configured');
        }
        return [];
      }

      let blockedIds: string[] = [];
      let usersWhoBlockedMe: string[] = [];
      
      if (filters?.userId) {
        const timeoutMs = Math.min(DEFAULT_PROFILE_TIMEOUT_MS, BLOCKLIST_TIMEOUT_MS);
        const [blockedIdsResult, usersWhoBlockedMeResult] = await Promise.all([
          withTimeout(
            () => this.getBlockedByUserIds(filters.userId as string),
            timeoutMs,
            'Blocked list request timed out'
          ).catch(() => [] as string[]),
          withTimeout(
            () => this.getUsersWhoBlockedMe(filters.userId as string),
            timeoutMs,
            'Blocked list request timed out'
          ).catch(() => [] as string[]),
        ]);
        blockedIds = blockedIdsResult;
        usersWhoBlockedMe = usersWhoBlockedMeResult;
      }

      const { data, error } = await supabase.rpc('get_nearby_date_profiles', {
        lat: centerCoordinates.latitude,
        lng: centerCoordinates.longitude,
        radius_km: radiusKm,
      });

      if (error) {
        if (__DEV__) {
          console.warn('Failed to get nearby profiles:', error);
        }
        const profiles = await this.getProfiles({
          intention: filters?.intention,
          ageRange: filters?.ageRange,
          verified: filters?.verified,
          userId: filters?.userId,
          limit: limit * 2
        });
        // Fallback: without coordinates on the client profile model, return a best-effort
        // list without computed distances.
        return profiles.slice(0, limit).map((p) => ({
          profile: p,
          distance: undefined,
          distanceFormatted: undefined,
        }));
      }

      const rows = Array.isArray(data) ? (data as any[]) : [];

      let profiles = await Promise.all(
        rows.map(async (row: any) => {
          const profile = await this.getProfile(row.id);
          if (!profile) return null;
          if (filters?.userId && profile.userId === filters.userId) {
            return null;
          }
          if (profile.privacySettings?.hideFromNearbySearch) {
            return null;
          }
          // Never surface Play Store reviewer/test accounts in Nearby results
          if (
            LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(profile.userId) ||
            (profile.displayName || '').toLowerCase() === 'play store reviewer'
          ) {
            return null;
          }
          return {
            profile,
            distance: row.distance_km,
            distanceFormatted:
              typeof row.distance_km === 'number'
                ? locationService.formatDistance(row.distance_km)
                : undefined
          };
        })
      );

      profiles = profiles.filter(p => p !== null);

      if (blockedIds.length > 0) {
        profiles = profiles.filter(p => !blockedIds.includes(p!.profile.id));
      }
      
      if (usersWhoBlockedMe.length > 0) {
        profiles = profiles.filter(p => !usersWhoBlockedMe.includes(p!.profile.userId));
      }

      if (filters?.intention) {
        profiles = profiles.filter(p => p!.profile.intention === filters.intention);
      }
      if (filters?.ageRange) {
        profiles = profiles.filter(p => {
          const age = p!.profile.age;
          if (!age) return false;
          return age >= filters.ageRange!.min && age <= filters.ageRange!.max;
        });
      }
      if (filters?.verified !== undefined) {
        profiles = profiles.filter(p => p!.profile.verified === filters.verified);
      }

      return profiles.slice(0, limit) as { profile: DateMiProfile; distance?: number; distanceFormatted?: string }[];
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting nearby profiles:', error);
      }
      return [];
    }
  }

  static async getRecommendedProfilesNearby(
    useCurrentLocation: boolean = true,
    radiusKm: number = 50,
    limit: number = 20,
    filters?: {
      intention?: 'short_term_fun' | 'long_term_partner';
      ageRange?: { min: number; max: number };
      verified?: boolean;
      userId?: string;
    }
  ): Promise<{ profile: DateMiProfile; distance?: number; distanceFormatted?: string }[]> {
    try {
      let centerLocation: LocationCoordinates;

      if (useCurrentLocation) {
        const currentLocation = await locationRecommendationService.getUserCurrentLocation();
        centerLocation = currentLocation || locationRecommendationService.getDefaultLocation();
      } else {
        centerLocation = locationRecommendationService.getDefaultLocation();
      }

      return await this.getProfilesNearLocation(centerLocation, radiusKm, limit, filters);
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting recommended profiles:', error);
      }
      return [];
    }
  }

  /**
   * Get profiles near the user's saved location (set during signup or later).
   *
   * We prefer a stored coordinate in `users.location_preferences.coordinates`.
   * If only town/county exist, we geocode once and persist coordinates for future requests.
   * This avoids repeatedly prompting for GPS permissions just to show "Nearby connections".
   */
  static async getProfilesNearSavedUserLocation(
    userId: string,
    options?: {
      radiusKm?: number;
      limit?: number;
      filters?: {
        intention?: 'short_term_fun' | 'long_term_partner';
        ageRange?: { min: number; max: number };
        verified?: boolean;
      };
    }
  ): Promise<{ profile: DateMiProfile; distance?: number; distanceFormatted?: string }[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const radiusKm = options?.radiusKm ?? 20;
    const limit = options?.limit ?? 40;

    const { data: userRow } = await supabase
      .from('users')
      .select('location_preferences')
      .eq('id', userId)
      .single();

    const prefs = (userRow?.location_preferences || {}) as any;
    const coordsRaw = prefs?.coordinates || prefs?.location_coordinates || null;
    const town = typeof prefs?.town === 'string' ? prefs.town.trim() : '';
    const county = typeof prefs?.county === 'string' ? prefs.county.trim() : '';

    const normalizeCoords = (c: any): LocationCoordinates | null => {
      if (!c || typeof c !== 'object') return null;
      const latitude = typeof c.latitude === 'number' ? c.latitude : typeof c.lat === 'number' ? c.lat : null;
      const longitude =
        typeof c.longitude === 'number' ? c.longitude : typeof c.lng === 'number' ? c.lng : null;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
      // Basic sanity check
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
      if (latitude === 0 && longitude === 0) return null;
      return { latitude, longitude };
    };

    let center = normalizeCoords(coordsRaw);

    if (!center && (town || county)) {
      try {
        const geo = await locationService.geocodeAddress(town || county, county || undefined);
        const candidate = geo.success ? geo.results?.[0]?.coordinate : null;
        if (candidate) {
          center = candidate;
          const nextPrefs = {
            ...(prefs || {}),
            town: town || prefs?.town,
            county: county || prefs?.county,
            coordinates: { latitude: candidate.latitude, longitude: candidate.longitude },
          };
          await supabase.from('users').update({ location_preferences: nextPrefs }).eq('id', userId);
        }
      } catch {
        // ignore geocode/save failures; we'll fall back to missing location error below
      }
    }

    if (!center) {
      throw new Error('Location not set');
    }

    return await this.getProfilesNearLocation(center, radiusKm, limit, {
      ...options?.filters,
      userId,
    });
  }

  /**
   * Persist user's location coordinates for later "Nearby connections" use.
   */
  static async saveUserLocationCoordinates(userId: string, coordinates: LocationCoordinates): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('location_preferences')
        .eq('id', userId)
        .single();

      const prefs = (userRow?.location_preferences || {}) as any;
      const nextPrefs = {
        ...(prefs || {}),
        coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude },
      };

      const { error } = await supabase
        .from('users')
        .update({ location_preferences: nextPrefs })
        .eq('id', userId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Verify subscription before accessing premium features
   */
  static async verifySubscriptionAccess(
    userId: string,
    action: 'view_profile' | 'send_message' | 'video_call' | 'voice_call' | 'advanced_filters' | 'super_like'
  ): Promise<{ allowed: boolean; reason?: string; requiredTier?: 'pro' | 'premium' }> {
    return await dateMiSubscriptionService.validateAction(userId, action);
  }

  /**
   * Get user's subscription status
   */
  static async getSubscriptionStatus(userId: string) {
    return await dateMiSubscriptionService.getSubscriptionStatus(userId);
  }

  /**
   * Check if user can access a specific feature
   */
  static async canAccessFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const status = await dateMiSubscriptionService.getSubscriptionStatus(userId);
      const featureMap: Record<string, keyof typeof status.access> = {
        'view_profile': 'canViewFullProfile',
        'send_message': 'canSendMessages',
        'video_call': 'canMakeVideoCalls',
        'voice_call': 'canMakeVoiceCalls',
        'advanced_filters': 'canUseAdvancedFilters',
        'super_like': 'canSuperLike',
      };

      const featureKey = featureMap[feature];
      if (!featureKey) return false;

      return status.access[featureKey] as boolean;
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking feature access:', error);
      }
      return false;
    }
  }
}

// Message service
export class DateMiMessageService {
  /**
   * Send a message
   */
  static async sendMessage(senderId: string, recipientId: string, message: string): Promise<any> {
    if (!isSupabaseConfigured()) {
      return {
        id: `demo-message-${Date.now()}`,
        sender_id: senderId,
        recipient_id: recipientId,
        message,
        created_at: new Date().toISOString(),
        is_read: false
      };
    }
    
    try {
      const { data, error } = await (supabase
        .from('datemi_messages') as any)
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          message,
          created_at: new Date().toISOString(),
          is_read: false
        })
        .select()
        .single();

      if (error) {
        if (__DEV__) {
          console.warn('Failed to send message:', error.message);
        }
        throw new Error(`Failed to send message: ${error.message}`);
      }
      return data;
    } catch (error) {
      if (__DEV__) {
        console.error('Error sending message:', error);
      }
      throw error;
    }
  }

  /**
   * Get conversation
   */
  static async getConversation(userId1: string, userId2: string, limit = 50): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    try {
      const isBlocked = await DateMiProfileService.isProfileBlocked(userId1, userId2);
      const isBlockedBy = await DateMiProfileService.isProfileBlocked(userId2, userId1);

      if (isBlocked || isBlockedBy) {
        return [];
      }

      const { data, error } = await supabase
        .from('datemi_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to fetch conversation:', error.message);
        }
        return [];
      }
      return data || [];
    } catch (error) {
      if (__DEV__) {
        console.warn('Error fetching conversation:', error);
      }
      return [];
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(userId: string, senderId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }
    
    try {
      const { error } = await (supabase
        .from('datemi_messages') as any)
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('sender_id', senderId)
        .eq('is_read', false);

      if (error) {
        if (__DEV__) {
          console.warn('Failed to mark messages as read:', error.message);
        }
        return false;
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('Error marking messages as read:', error);
      }
      return false;
    }
  }
}

// Export default service instance
export const dateMiService = {
  profile: DateMiProfileService,
  message: DateMiMessageService
};
