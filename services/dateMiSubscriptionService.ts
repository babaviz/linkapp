/**
 * Date Mi Subscription Service
 * Manages subscription access control for Date Mi features at moderate restriction level (4/10)
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { dateMiFeatureEntitlementService } from './dateMiFeatureEntitlementService';
import { paystackService } from './paystackService';
import entitlementService from './entitlementService';
import {
  LEGACY_PLAY_STORE_REVIEWER_USER_IDS,
  PLAY_STORE_REVIEWER_EMAIL,
} from '../utils/playStoreReviewer';

export interface DateMiSubscriptionAccess {
  canCreateProfile: boolean;
  canBrowseProfiles: boolean;
  canReceiveNotifications: boolean;
  canLikeProfiles: boolean;
  canViewFullProfile: boolean;
  canSendMessages: boolean;
  canInitiateChats: boolean;
  canMakeVideoCalls: boolean;
  canMakeVoiceCalls: boolean;
  canUseAdvancedFilters: boolean;
  canSuperLike: boolean;
  dailyLikesLimit: number;
  dailyLikesRemaining: number;
}

export interface DateMiSubscriptionStatus {
  tier: 'free' | 'pro' | 'premium';
  isActive: boolean;
  expiresAt?: string;
  autoRenew: boolean;
  access: DateMiSubscriptionAccess;
}

// Google Play Store reviewer account override
// This user should always have full Date Mi Premium access without requiring payment.
// Detection is based on the well-known reviewer email with a fallback to legacy IDs.
const isReviewerUser = async (userId: string): Promise<boolean> => {
  if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(userId)) {
    return true;
  }

  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return false;
    }

    // Ensure we only ever treat the currently authenticated user as the reviewer
    if (data.user.id !== userId) {
      return false;
    }

    const email = data.user.email?.toLowerCase();
    return email === PLAY_STORE_REVIEWER_EMAIL;
  } catch {
    return false;
  }
};

class DateMiSubscriptionService {
  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<DateMiSubscriptionStatus> {
    try {
      // Reviewer account: always treat as active Premium with full access
      if (await isReviewerUser(userId)) {
        return {
          tier: 'premium',
          isActive: true,
          autoRenew: false,
          access: this.getAccessForTier('premium', userId),
        };
      }

      // Fulfill any pending DateMi feature package payments (e.g. payment succeeded but verification failed)
      await paystackService.reverifyPendingFeaturePackages(userId);

      const entitlement = await entitlementService.getUserEntitlement(userId);
      const resolvedTier: 'free' | 'pro' | 'premium' = entitlement.effectiveTier;
      const isSubscriptionActive = entitlement.state !== 'FREE';
      
      const baseAccess = this.getAccessForTier(resolvedTier, userId);
      const access: DateMiSubscriptionAccess = { ...baseAccess };
      
      // Overlay DateMi feature add-ons (messaging / voice_call / video_call)
      const entitlements = await dateMiFeatureEntitlementService.getActiveEntitlements(userId);
      if (entitlements.has('messaging')) {
        access.canSendMessages = true;
        access.canInitiateChats = true;
      }
      if (entitlements.has('voice_call')) {
        access.canMakeVoiceCalls = true;
      }
      if (entitlements.has('video_call')) {
        access.canMakeVideoCalls = true;
      }

      return {
        tier: resolvedTier,
        isActive: isSubscriptionActive,
        expiresAt: isSubscriptionActive ? entitlement.expiresAt : undefined,
        autoRenew: entitlement.state === 'PRO' || entitlement.state === 'PREMIUM',
        access,
      };
    } catch (error) {
      if (__DEV__) {
        console.error('[DateMiSubscriptionService] Error getting subscription status:', error);
      }
      return this.getFreeUserStatus();
    }
  }

  /**
   * Get default status for free users (4/10 restriction level)
   */
  private getFreeUserStatus(): DateMiSubscriptionStatus {
    return {
      tier: 'free',
      isActive: false,
      autoRenew: false,
      access: {
        canCreateProfile: true,
        canBrowseProfiles: true,
        canReceiveNotifications: true,
        canLikeProfiles: true,
        canViewFullProfile: false,
        canSendMessages: false,
        canInitiateChats: false,
        canMakeVideoCalls: false,
        canMakeVoiceCalls: false,
        canUseAdvancedFilters: false,
        canSuperLike: false,
        dailyLikesLimit: 10,
        dailyLikesRemaining: 10,
      },
    };
  }

  /**
   * Get access permissions based on tier
   */
  private getAccessForTier(tier: 'free' | 'pro' | 'premium', userId: string): DateMiSubscriptionAccess {
    const baseAccess = {
      canCreateProfile: true,
      canBrowseProfiles: true,
      canReceiveNotifications: true,
      canLikeProfiles: true,
    };

    if (tier === 'free') {
      return {
        ...baseAccess,
        canViewFullProfile: false,
        canSendMessages: false,
        canInitiateChats: false,
        canMakeVideoCalls: false,
        canMakeVoiceCalls: false,
        canUseAdvancedFilters: false,
        canSuperLike: false,
        dailyLikesLimit: 10,
        dailyLikesRemaining: 10,
      };
    }

    if (tier === 'pro') {
      return {
        ...baseAccess,
        canViewFullProfile: true,
        canSendMessages: true,
        canInitiateChats: true,
        canMakeVideoCalls: false,
        canMakeVoiceCalls: false,
        canUseAdvancedFilters: true,
        canSuperLike: true,
        dailyLikesLimit: 999,
        dailyLikesRemaining: 999,
      };
    }

    return {
      ...baseAccess,
      canViewFullProfile: true,
      canSendMessages: true,
      canInitiateChats: true,
      canMakeVideoCalls: true,
      canMakeVoiceCalls: true,
      canUseAdvancedFilters: true,
      canSuperLike: true,
      dailyLikesLimit: 999,
      dailyLikesRemaining: 999,
    };
  }

  /**
   * Check if user can access a specific feature
   */
  async canAccessFeature(
    userId: string,
    feature: keyof DateMiSubscriptionAccess
  ): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);
    return status.access[feature] as boolean;
  }

  /**
   * Validate subscription before performing an action
   */
  async validateAction(
    userId: string,
    action: 'view_profile' | 'send_message' | 'video_call' | 'voice_call' | 'advanced_filters' | 'super_like'
  ): Promise<{ allowed: boolean; reason?: string; requiredTier?: 'pro' | 'premium' }> {
    try {
      const status = await this.getSubscriptionStatus(userId);

      switch (action) {
        case 'view_profile':
          if (!status.access.canViewFullProfile) {
            return {
              allowed: false,
              reason: 'Full profile viewing requires a Pro subscription',
              requiredTier: 'pro',
            };
          }
          break;

        case 'send_message':
          if (!status.access.canSendMessages) {
            return {
              allowed: false,
              reason: 'Messaging requires a Pro subscription',
              requiredTier: 'pro',
            };
          }
          break;

        case 'video_call':
          if (!status.access.canMakeVideoCalls) {
            return {
              allowed: false,
              reason: 'Video calls require a Premium subscription',
              requiredTier: 'premium',
            };
          }
          break;

        case 'voice_call':
          if (!status.access.canMakeVoiceCalls) {
            return {
              allowed: false,
              reason: 'Voice calls require a Premium subscription',
              requiredTier: 'premium',
            };
          }
          break;

        case 'advanced_filters':
          if (!status.access.canUseAdvancedFilters) {
            return {
              allowed: false,
              reason: 'Advanced filters require a Pro subscription',
              requiredTier: 'pro',
            };
          }
          break;

        case 'super_like':
          if (!status.access.canSuperLike) {
            return {
              allowed: false,
              reason: 'Super Likes require a Pro subscription',
              requiredTier: 'pro',
            };
          }
          break;
      }

      return { allowed: true };
    } catch (error) {
      if (__DEV__) {
        console.error('[DateMiSubscriptionService] Error validating action:', error);
      }
      return {
        allowed: false,
        reason: 'Unable to verify subscription status',
      };
    }
  }

  /**
   * Get daily likes remaining for user
   */
  async getDailyLikesRemaining(userId: string): Promise<number> {
    try {
      if (!isSupabaseConfigured()) {
        return 10;
      }

      const status = await this.getSubscriptionStatus(userId);
      
      if (status.tier === 'pro' || status.tier === 'premium') {
        return 999;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('datemi_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      if (error) {
        if (__DEV__) {
          console.warn('Error fetching daily likes:', error);
        }
        return 10;
      }

      const used = count || 0;
      return Math.max(0, 10 - used);
    } catch (error) {
      if (__DEV__) {
        console.error('[DateMiSubscriptionService] Error getting daily likes:', error);
      }
      return 10;
    }
  }

  /**
   * Track feature usage for analytics and limits
   */
  async trackFeatureUsage(
    userId: string,
    feature: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        return;
      }

      await supabase.from('datemi_feature_usage').insert({
        user_id: userId,
        feature,
        metadata: metadata ?? null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[DateMiSubscriptionService] Error tracking feature usage:', error);
      }
    }
  }

  /**
   * Get friendly upgrade messages
   */
  getUpgradeMessage(action: string, requiredTier: 'pro' | 'premium'): {
    title: string;
    message: string;
    buttonText: string;
  } {
    const messages: Record<string, { title: string; message: string; buttonText: string }> = {
      view_profile: {
        title: 'Unlock Full Profiles',
        message: 'Upgrade to Pro to view complete profile details and find your perfect match!',
        buttonText: 'Upgrade to Pro',
      },
      send_message: {
        title: 'Start Chatting',
        message: 'Upgrade to Pro to send unlimited messages and connect with matches!',
        buttonText: 'Upgrade to Pro',
      },
      video_call: {
        title: 'Video Calls Available',
        message: 'Upgrade to Premium for unlimited video calls and deeper connections!',
        buttonText: 'Upgrade to Premium',
      },
      voice_call: {
        title: 'Voice Calls Available',
        message: 'Upgrade to Premium for unlimited voice calls and meaningful conversations!',
        buttonText: 'Upgrade to Premium',
      },
      advanced_filters: {
        title: 'Advanced Filters',
        message: 'Upgrade to Pro to use advanced filters and find exactly who you\'re looking for!',
        buttonText: 'Upgrade to Pro',
      },
      super_like: {
        title: 'Super Like Available',
        message: 'Upgrade to Pro to send Super Likes and stand out from the crowd!',
        buttonText: 'Upgrade to Pro',
      },
    };

    return messages[action] || {
      title: 'Premium Feature',
      message: `This feature requires ${requiredTier === 'premium' ? 'Premium' : 'Pro'} subscription`,
      buttonText: `Upgrade to ${requiredTier === 'premium' ? 'Premium' : 'Pro'}`,
    };
  }
}

let instance: DateMiSubscriptionService | null = null;
function getInstance(): DateMiSubscriptionService {
  if (!instance) instance = new DateMiSubscriptionService();
  return instance;
}

export const dateMiSubscriptionService = new Proxy({} as DateMiSubscriptionService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

export default dateMiSubscriptionService;
