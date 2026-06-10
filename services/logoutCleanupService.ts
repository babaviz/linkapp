import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import type { UserIntent } from '../redux/slices/onboardingSlice';

export type LogoutCleanupReason =
  | 'logout'
  | 'password_reset'
  | 'session_invalid'
  | 'user_switch'
  | 'account_deleted';

export type LogoutCleanupMode = 'critical' | 'full';

type ClearUserDataOptions = {
  reason: LogoutCleanupReason;
  /**
   * When available, the current authenticated user's id.
   * Used to clear per-user namespaced keys.
   */
  userId?: string | null;
  /**
   * Optional: the previous authenticated user's id (for account switch cases).
   */
  previousUserId?: string | null;
  /**
   * critical: clear auth-adjacent + user-scoped keys fast
   * full: additionally clear heavier caches (network/image) best-effort
   */
  mode?: LogoutCleanupMode;
};

const STORAGE_KEYS = {
  // Referral
  pendingReferral: 'linkapp_pending_referral_code',

  // DateMi verification
  dateMiAgeVerified: '@datemi_age_verified',
  dateMiPrivacyAccepted: '@datemi_privacy_accepted',
  dateMiDobEncrypted: '@datemi_dob_encrypted',
  dateMiVerificationTimestamp: '@datemi_verification_timestamp',
  dateMiNearbyLocationPromptShown: 'datemi_nearby_location_prompt_shown_v1',

  // DateMi notification prefs/state
  dateMiMutedConversations: 'datemi_muted_conversations',
  dateMiNotificationPrefs: 'datemi_notification_prefs',
  dateMiNotifyUnmatch: 'datemi_notify_unmatch',

  // Location caches/history
  locationSearchHistory: 'location_search_history',
  recentLocations: 'recent_locations',

  // Location cache service
  userLocationCache: 'user_location_cache',

  // Properties local storage
  propertyFavorites: '@LinkApp:favoriteProperties',
  propertySearchHistory: '@LinkApp:searchHistory',
  propertyViewed: '@LinkApp:viewedProperties',

  // Privacy policy acceptance
  privacyPolicyVersion: '@privacy_policy_version',
  privacyPolicyAccepted: '@privacy_policy_accepted',
  privacyPolicyAcceptanceDate: '@privacy_policy_acceptance_date',
  privacyPolicyFirstView: '@privacy_policy_first_view',

  // Onboarding + tips
  onboardingCompleted: '@linkapp_onboarding_completed',
  onboardingUserIntent: '@linkapp_user_intent',
  onboardingShowTooltips: '@linkapp_show_tooltips',
  onboardingTooltipsShown: '@linkapp_tooltips_shown',

  // Network cache
  networkCache: '@network_cache',

  // Demo/local service data (some are per-user via prefix)
  localCreatedServices: 'local_created_service_listings',
  serviceBookings: 'service_bookings',
  serviceReviews: 'service_reviews',
  serviceInquiries: 'service_inquiries',

  // Payments/user prefs
  userCountry: 'user_country',
} as const;

const PREFIX_KEYS = {
  // DateMi NotificationManager (user-scoped)
  dateMiPendingStateUpdatePrefix: 'datemi_notifications_pending_state_update_v1:',
  dateMiCachedCountsPrefix: 'datemi_notifications_cached_counts_v1:',

  // Chat prefetch snapshot (user-scoped)
  chatChannelListSnapshotPrefix: 'chat_channel_list_snapshot_v1:',

  // ServiceManagementService (user-scoped)
  savedServicesPrefix: 'saved_services_',

  // OptimizedImage cache keys (app-level, may include user media)
  imageCachePrefix: '@image_cache_',
} as const;

const LEGACY_PASSCODE_KEYS = [
  '@datemi_passcode_secure',
  '@datemi_passcode_salt',
  '@datemi_passcode_attempts',
  '@datemi_passcode_lockout',
  '@datemi_secure_passcode_secure',
  '@datemi_secure_passcode_salt',
  '@datemi_secure_passcode_attempts',
  '@datemi_secure_passcode_lockout',
];

async function removeKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await AsyncStorage.multiRemove(keys).catch(() => {});
}

async function removeKeysByPrefix(prefixes: string[]): Promise<void> {
  if (prefixes.length === 0) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (!keys || keys.length === 0) return;
    const matches = keys.filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));
    if (matches.length === 0) return;
    await AsyncStorage.multiRemove(matches);
  } catch {
    // best-effort
  }
}

async function removeKeysByPredicate(predicate: (key: string) => boolean): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (!keys || keys.length === 0) return;
    const matches = keys.filter(predicate);
    if (matches.length === 0) return;
    await AsyncStorage.multiRemove(matches);
  } catch {
    // best-effort
  }
}

/**
 * Clear user-scoped local storage and caches so a new login/account cannot
 * inherit stale state from a previous authenticated user.
 */
export async function clearUserScopedData(options: ClearUserDataOptions): Promise<void> {
  const mode: LogoutCleanupMode = options.mode ?? 'full';
  const userId = options.userId ?? null;
  const previousUserId = options.previousUserId ?? null;
  const shouldClearOnboardingState = options.reason !== 'user_switch';

  logger.debug('[LogoutCleanup] start', {
    reason: options.reason,
    mode,
    hasUserId: !!userId,
    hasPreviousUserId: !!previousUserId,
  });

  // 1) Remove known user-scoped keys (fast path)
  // Note: Date Mi age verification and passcode are now user-scoped; cleared only on user_switch below
  const keysToRemove: string[] = [
    STORAGE_KEYS.pendingReferral,

    STORAGE_KEYS.dateMiNearbyLocationPromptShown,

    STORAGE_KEYS.dateMiMutedConversations,
    STORAGE_KEYS.dateMiNotificationPrefs,
    STORAGE_KEYS.dateMiNotifyUnmatch,

    STORAGE_KEYS.locationSearchHistory,
    STORAGE_KEYS.recentLocations,
    STORAGE_KEYS.userLocationCache,

    STORAGE_KEYS.propertyFavorites,
    STORAGE_KEYS.propertySearchHistory,
    STORAGE_KEYS.propertyViewed,

    STORAGE_KEYS.privacyPolicyVersion,
    STORAGE_KEYS.privacyPolicyAccepted,
    STORAGE_KEYS.privacyPolicyAcceptanceDate,
    STORAGE_KEYS.privacyPolicyFirstView,

    STORAGE_KEYS.localCreatedServices,
    STORAGE_KEYS.serviceBookings,
    STORAGE_KEYS.serviceReviews,
    STORAGE_KEYS.serviceInquiries,

    STORAGE_KEYS.userCountry,
  ];

  if (shouldClearOnboardingState) {
    keysToRemove.push(
      STORAGE_KEYS.onboardingCompleted,
      STORAGE_KEYS.onboardingUserIntent,
      STORAGE_KEYS.onboardingShowTooltips,
      STORAGE_KEYS.onboardingTooltipsShown
    );
  }

  await removeKeys(keysToRemove);

  // 1b) On user switch: clear previous user's Date Mi verification and passcode only
  if (options.reason === 'user_switch' && previousUserId && previousUserId.trim()) {
    const prevUserKeys = [
      `@datemi_age_verified:${previousUserId}`,
      `@datemi_privacy_accepted:${previousUserId}`,
      `@datemi_dob_encrypted:${previousUserId}`,
      `@datemi_verification_timestamp:${previousUserId}`,
    ];
    await removeKeys(prevUserKeys);
    const { removePasscodeForUser } = await import('../utils/passcodeManager');
    await removePasscodeForUser(previousUserId).catch(() => {});
  }

  // 2) Clear legacy passcode keys (older builds - non-user-scoped format)
  await removeKeys(LEGACY_PASSCODE_KEYS);

  // 3) Clear per-user namespaced keys (all users on this device, for privacy)
  await removeKeysByPrefix([
    PREFIX_KEYS.dateMiPendingStateUpdatePrefix,
    PREFIX_KEYS.dateMiCachedCountsPrefix,
    PREFIX_KEYS.chatChannelListSnapshotPrefix,
    PREFIX_KEYS.savedServicesPrefix,
  ]);

  // 4) Clear service-level caches (best-effort)
  await Promise.allSettled([
    (async () => {
      const referralTrackingService = (await import('./referralTrackingService')).default;
      await referralTrackingService.clearPendingReferral();
    })(),
    (async () => {
      const { locationCacheService } = await import('./locationCacheService');
      await locationCacheService.clearCache();
    })(),
    (async () => {
      const { dateMiProfileCacheService } = await import('./dateMiProfileCacheService');
      await dateMiProfileCacheService.invalidateAllOnContextChange('logout');
    })(),
    (async () => {
      const { dateMiNotificationManager } = await import('./dateMiNotificationManager');
      dateMiNotificationManager.shutdown();
    })(),
    (async () => {
      const messageNotificationService = (await import('./messageNotificationService')).default;
      messageNotificationService.resetAll();
    })(),
    (async () => {
      // Clear chat list snapshot in-memory (persisted keys are removed by prefix above).
      const { chatPrefetchService } = await import('./chatPrefetchService');
      chatPrefetchService.shutdown();
    })(),
    (async () => {
      // Clear SecureStore Stream token cache to prevent cross-user leakage.
      const { streamTokenService } = await import('./streamTokenService');
      const ids = [userId, previousUserId].filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      await Promise.all(ids.map((id) => streamTokenService.clearTokenCache(id)));
    })(),
    (async () => {
      const { PropertyStorageService } = await import('../utils/propertyStorage');
      await PropertyStorageService.clearAllData();
    })(),
  ]);

  // 5) Clear additional caches that may contain user-scoped responses/media.
  if (mode === 'full') {
    await Promise.allSettled([
      (async () => {
        const { clearNetworkCache } = await import('../utils/networkOptimizer');
        await clearNetworkCache();
      })(),
      (async () => {
        // Remove stored network cache key defensively (if optimizer import fails).
        await AsyncStorage.removeItem(STORAGE_KEYS.networkCache).catch(() => {});
      })(),
      (async () => {
        // Clear image cache metadata and all cached entries.
        // This prevents user media from being visible on shared devices.
        const { clearImageCache } = await import('../components/common/OptimizedImage');
        await clearImageCache();
      })(),
      (async () => {
        // Defensive: if the ImageCacheManager import path changes, remove by prefix.
        await removeKeysByPredicate((key) => key === '@image_cache_metadata' || key.startsWith(PREFIX_KEYS.imageCachePrefix));
      })(),
    ]);
  }

  logger.debug('[LogoutCleanup] complete', {
    reason: options.reason,
    mode,
  });
}

/**
 * Helper to read the current user id from a profile (when available).
 * This avoids importing types in call-sites that don't already depend on them.
 */
export function getUserIdSafe(user: { id?: unknown } | null | undefined): string | null {
  const id = user?.id;
  return typeof id === 'string' && id.trim().length > 0 ? id : null;
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

export function normalizeUserIntent(value: unknown): UserIntent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string') as UserIntent[];
}

