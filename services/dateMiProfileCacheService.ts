/**
 * DateMi Profile Cache Service
 * 
 * Implements a cache-first strategy for DateMi profiles to improve initial load times.
 * Shows cached profiles immediately while fetching fresh data in the background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateMiProfile } from '../redux/slices/datemiSlice';

interface CachedProfiles {
  profiles: DateMiProfile[];
  timestamp: number;
  intention?: 'short_term_fun' | 'long_term_partner';
  // Context for cache invalidation
  userId?: string;
  preferences?: string; // JSON hash of user preferences
  location?: string;
  subscriptionTier?: string;
}

interface ProfileCacheState {
  shortTermFun: CachedProfiles | null;
  longTermPartner: CachedProfiles | null;
  myProfile: DateMiProfile | null;
  myProfileTimestamp: number | null;
}

interface CacheInvalidationContext {
  userId?: string;
  preferences?: any;
  location?: string;
  subscriptionTier?: 'free' | 'pro' | 'premium';
}

// Cache configuration
const CACHE_CONFIG = {
  PROFILES_CACHE_KEY: 'datemi_profiles_cache',
  MY_PROFILE_CACHE_KEY: 'datemi_my_profile_cache',
  // Profiles are considered fresh for 5 minutes (show immediately, refresh in background)
  PROFILES_FRESH_MS: 5 * 60 * 1000,
  // Profiles are considered stale but usable for 1 hour
  PROFILES_STALE_MS: 60 * 60 * 1000,
  // My profile is fresh for 10 minutes
  MY_PROFILE_FRESH_MS: 10 * 60 * 1000,
  // My profile is usable for 24 hours
  MY_PROFILE_STALE_MS: 24 * 60 * 60 * 1000,
  // Maximum profiles to cache per intention
  MAX_CACHED_PROFILES: 100,
};

class DateMiProfileCacheService {
  private memoryCache: ProfileCacheState = {
    shortTermFun: null,
    longTermPartner: null,
    myProfile: null,
    myProfileTimestamp: null,
  };

  private getCacheKey(intention?: 'short_term_fun' | 'long_term_partner'): string {
    const suffix = intention === 'long_term_partner' ? '_long_term' : '_short_term';
    return CACHE_CONFIG.PROFILES_CACHE_KEY + suffix;
  }

  /**
   * Get cached profiles for a specific intention
   * Returns null if cache is expired or doesn't exist
   */
  async getCachedProfiles(
    intention?: 'short_term_fun' | 'long_term_partner'
  ): Promise<{ profiles: DateMiProfile[]; isStale: boolean } | null> {
    try {
      // Check memory cache first
      const memoryCached = intention === 'long_term_partner' 
        ? this.memoryCache.longTermPartner 
        : this.memoryCache.shortTermFun;

      if (memoryCached) {
        const age = Date.now() - memoryCached.timestamp;
        if (age < CACHE_CONFIG.PROFILES_STALE_MS) {
          return {
            profiles: memoryCached.profiles,
            isStale: age >= CACHE_CONFIG.PROFILES_FRESH_MS,
          };
        }
      }

      // Fall back to AsyncStorage
      const cacheKey = this.getCacheKey(intention);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const cachedData: CachedProfiles = JSON.parse(cached);
      const age = Date.now() - cachedData.timestamp;

      // If cache is too old, return null
      if (age >= CACHE_CONFIG.PROFILES_STALE_MS) {
        return null;
      }

      // Update memory cache
      if (intention === 'long_term_partner') {
        this.memoryCache.longTermPartner = cachedData;
      } else {
        this.memoryCache.shortTermFun = cachedData;
      }

      return {
        profiles: cachedData.profiles,
        isStale: age >= CACHE_CONFIG.PROFILES_FRESH_MS,
      };
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to get cached profiles:', error);
      }
      return null;
    }
  }

  /**
   * Cache profiles for a specific intention with context for invalidation
   */
  async cacheProfiles(
    profiles: DateMiProfile[],
    intention?: 'short_term_fun' | 'long_term_partner',
    context?: CacheInvalidationContext
  ): Promise<void> {
    try {
      // Limit the number of cached profiles
      const profilesToCache = profiles.slice(0, CACHE_CONFIG.MAX_CACHED_PROFILES);
      
      const cacheData: CachedProfiles = {
        profiles: profilesToCache,
        timestamp: Date.now(),
        intention,
        userId: context?.userId,
        preferences: context?.preferences ? JSON.stringify(context.preferences) : undefined,
        location: context?.location,
        subscriptionTier: context?.subscriptionTier,
      };

      // Update memory cache
      if (intention === 'long_term_partner') {
        this.memoryCache.longTermPartner = cacheData;
      } else {
        this.memoryCache.shortTermFun = cacheData;
      }

      // Persist to AsyncStorage
      const cacheKey = this.getCacheKey(intention);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to cache profiles:', error);
      }
    }
  }

  /**
   * Get cached user's own profile
   */
  async getCachedMyProfile(): Promise<{ profile: DateMiProfile; isStale: boolean } | null> {
    try {
      // Check memory cache first
      if (this.memoryCache.myProfile && this.memoryCache.myProfileTimestamp) {
        const age = Date.now() - this.memoryCache.myProfileTimestamp;
        if (age < CACHE_CONFIG.MY_PROFILE_STALE_MS) {
          return {
            profile: this.memoryCache.myProfile,
            isStale: age >= CACHE_CONFIG.MY_PROFILE_FRESH_MS,
          };
        }
      }

      // Fall back to AsyncStorage
      const cached = await AsyncStorage.getItem(CACHE_CONFIG.MY_PROFILE_CACHE_KEY);
      if (!cached) return null;

      const cachedData: { profile: DateMiProfile; timestamp: number } = JSON.parse(cached);
      const age = Date.now() - cachedData.timestamp;

      // If cache is too old, return null
      if (age >= CACHE_CONFIG.MY_PROFILE_STALE_MS) {
        return null;
      }

      // Update memory cache
      this.memoryCache.myProfile = cachedData.profile;
      this.memoryCache.myProfileTimestamp = cachedData.timestamp;

      return {
        profile: cachedData.profile,
        isStale: age >= CACHE_CONFIG.MY_PROFILE_FRESH_MS,
      };
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to get cached my profile:', error);
      }
      return null;
    }
  }

  /**
   * Cache user's own profile
   */
  async cacheMyProfile(profile: DateMiProfile): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // Update memory cache
      this.memoryCache.myProfile = profile;
      this.memoryCache.myProfileTimestamp = timestamp;

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        CACHE_CONFIG.MY_PROFILE_CACHE_KEY,
        JSON.stringify({ profile, timestamp })
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to cache my profile:', error);
      }
    }
  }

  /**
   * Clear all profile caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      this.memoryCache = {
        shortTermFun: null,
        longTermPartner: null,
        myProfile: null,
        myProfileTimestamp: null,
      };

      await AsyncStorage.multiRemove([
        CACHE_CONFIG.PROFILES_CACHE_KEY + '_short_term',
        CACHE_CONFIG.PROFILES_CACHE_KEY + '_long_term',
        CACHE_CONFIG.MY_PROFILE_CACHE_KEY,
      ]);
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to clear caches:', error);
      }
    }
  }

  /**
   * Clear my profile cache (e.g., on sign out)
   */
  async clearMyProfileCache(): Promise<void> {
    try {
      this.memoryCache.myProfile = null;
      this.memoryCache.myProfileTimestamp = null;
      await AsyncStorage.removeItem(CACHE_CONFIG.MY_PROFILE_CACHE_KEY);
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to clear my profile cache:', error);
      }
    }
  }

  /**
   * Check if profiles cache is fresh (no background refresh needed)
   */
  async isProfilesCacheFresh(intention?: 'short_term_fun' | 'long_term_partner'): Promise<boolean> {
    const cached = await this.getCachedProfiles(intention);
    return cached !== null && !cached.isStale;
  }

  /**
   * Check if my profile cache is fresh
   */
  async isMyProfileCacheFresh(): Promise<boolean> {
    const cached = await this.getCachedMyProfile();
    return cached !== null && !cached.isStale;
  }

  /**
   * Preload profiles into memory cache from AsyncStorage
   * Call this early in app initialization for faster access
   */
  async preloadCache(): Promise<void> {
    try {
      const [shortTermData, longTermData, myProfileData] = await Promise.all([
        AsyncStorage.getItem(CACHE_CONFIG.PROFILES_CACHE_KEY + '_short_term'),
        AsyncStorage.getItem(CACHE_CONFIG.PROFILES_CACHE_KEY + '_long_term'),
        AsyncStorage.getItem(CACHE_CONFIG.MY_PROFILE_CACHE_KEY),
      ]);

      if (shortTermData) {
        const parsed: CachedProfiles = JSON.parse(shortTermData);
        if (Date.now() - parsed.timestamp < CACHE_CONFIG.PROFILES_STALE_MS) {
          this.memoryCache.shortTermFun = parsed;
        }
      }

      if (longTermData) {
        const parsed: CachedProfiles = JSON.parse(longTermData);
        if (Date.now() - parsed.timestamp < CACHE_CONFIG.PROFILES_STALE_MS) {
          this.memoryCache.longTermPartner = parsed;
        }
      }

      if (myProfileData) {
        const parsed: { profile: DateMiProfile; timestamp: number } = JSON.parse(myProfileData);
        if (Date.now() - parsed.timestamp < CACHE_CONFIG.MY_PROFILE_STALE_MS) {
          this.memoryCache.myProfile = parsed.profile;
          this.memoryCache.myProfileTimestamp = parsed.timestamp;
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to preload cache:', error);
      }
    }
  }

  /**
   * Invalidate cache if context has changed (preferences, location, subscription, etc.)
   */
  async shouldInvalidateCache(
    intention: 'short_term_fun' | 'long_term_partner' | undefined,
    newContext: CacheInvalidationContext
  ): Promise<boolean> {
    try {
      const cached = await this.getCachedProfiles(intention);
      if (!cached) return false;

      const memoryCached = intention === 'long_term_partner'
        ? this.memoryCache.longTermPartner
        : this.memoryCache.shortTermFun;

      if (!memoryCached) return false;

      // Check if userId changed (different user logged in)
      if (newContext.userId && memoryCached.userId !== newContext.userId) {
        return true;
      }

      // Check if preferences changed
      if (newContext.preferences) {
        const newPrefsHash = JSON.stringify(newContext.preferences);
        if (memoryCached.preferences !== newPrefsHash) {
          return true;
        }
      }

      // Check if location changed
      if (newContext.location && memoryCached.location !== newContext.location) {
        return true;
      }

      // Check if subscription tier changed
      if (newContext.subscriptionTier && memoryCached.subscriptionTier !== newContext.subscriptionTier) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Invalidate cache for a specific intention
   */
  async invalidateCacheForIntention(intention?: 'short_term_fun' | 'long_term_partner'): Promise<void> {
    try {
      if (intention === 'long_term_partner') {
        this.memoryCache.longTermPartner = null;
      } else {
        this.memoryCache.shortTermFun = null;
      }

      const cacheKey = this.getCacheKey(intention);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      if (__DEV__) {
        console.warn('[DateMiProfileCache] Failed to invalidate cache:', error);
      }
    }
  }

  /**
   * Invalidate all caches when user context changes (logout, profile deletion, etc.)
   */
  async invalidateAllOnContextChange(reason: 'logout' | 'profile_deleted' | 'preferences_changed' | 'location_changed' | 'subscription_changed'): Promise<void> {
    if (__DEV__) {
      console.warn(`[DateMiProfileCache] Invalidating all caches due to: ${reason}`);
    }
    await this.clearAllCaches();
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats(): {
    shortTermCount: number;
    longTermCount: number;
    hasMyProfile: boolean;
    shortTermAge: number | null;
    longTermAge: number | null;
    myProfileAge: number | null;
  } {
    const now = Date.now();
    return {
      shortTermCount: this.memoryCache.shortTermFun?.profiles.length ?? 0,
      longTermCount: this.memoryCache.longTermPartner?.profiles.length ?? 0,
      hasMyProfile: !!this.memoryCache.myProfile,
      shortTermAge: this.memoryCache.shortTermFun 
        ? now - this.memoryCache.shortTermFun.timestamp 
        : null,
      longTermAge: this.memoryCache.longTermPartner 
        ? now - this.memoryCache.longTermPartner.timestamp 
        : null,
      myProfileAge: this.memoryCache.myProfileTimestamp 
        ? now - this.memoryCache.myProfileTimestamp 
        : null,
    };
  }
}

// Lazy initialization singleton
let instance: DateMiProfileCacheService | null = null;
function getInstance(): DateMiProfileCacheService {
  if (!instance) {
    instance = new DateMiProfileCacheService();
  }
  return instance;
}

export const dateMiProfileCacheService = new Proxy({} as DateMiProfileCacheService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  },
});

export default dateMiProfileCacheService;
