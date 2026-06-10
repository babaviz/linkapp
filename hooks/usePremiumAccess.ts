import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { isPlayStoreReviewer } from '../utils/playStoreReviewer';
import useEntitlement from './useEntitlement';

export interface PremiumFeatures {
  unlimitedLikes: boolean;
  noAds: boolean;
  advancedFilters: boolean;
  unlimitedMessaging: boolean;
  seeWhoLikedYou: boolean;
  readReceipts: boolean;
  videoCalls: boolean;
  prioritySupport: boolean;
  contentCreation: boolean;
  monetizationTools: boolean;
  escrowPayments: boolean;
  creatorAnalytics: boolean;
  premiumBadge: boolean;
  featuredProfile: boolean;
}

interface UsePremiumAccessReturn {
  currentTier: 'free' | 'pro' | 'premium';
  isPro: boolean;
  isPremium: boolean;
  features: PremiumFeatures;
  canAccess: (feature: keyof PremiumFeatures) => boolean;
  getRemainingDailyLikes: () => number;
  shouldShowUpgradePrompt: (feature: keyof PremiumFeatures) => boolean;
  getUpgradeMessage: (feature: keyof PremiumFeatures) => string;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
}

export default function usePremiumAccess(): UsePremiumAccessReturn {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const myProfile = useSelector((state: RootState) => state.datemi.myProfile);
  const { entitlement } = useEntitlement();

  // Google Play Store reviewer account override
  const isReviewerUser = isPlayStoreReviewer(authUser);

  // Priority: Reviewer override > backend entitlement > profile fallback > free.
  // Profile fallback helps with temporary network failures without granting extra privileges.
  const resolvedTier: 'free' | 'pro' | 'premium' = isReviewerUser
    ? 'premium'
    : (entitlement.effectiveTier !== 'free' ? entitlement.effectiveTier : undefined) ||
      myProfile?.subscriptionTier ||
      'free';

  const isPro = resolvedTier === 'pro';
  const isPremium = resolvedTier === 'premium';

  // Reviewer account is treated as non-expiring.
  const entitlementExpiryMs = entitlement.expiresAt ? new Date(entitlement.expiresAt).getTime() : Number.NaN;
  const daysUntilExpiry =
    isReviewerUser || !Number.isFinite(entitlementExpiryMs)
      ? null
      : Math.max(
          0,
          Math.ceil((entitlementExpiryMs - new Date().getTime()) / (1000 * 60 * 60 * 24))
        );

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  
  // Define features based on subscription tier
  // Pro ($1): Basic premium features (messaging, filters, no ads)
  // Premium ($2): All features including video calls, creator tools, monetization
  const features: PremiumFeatures = {
    unlimitedLikes: isPro || isPremium,
    noAds: isPro || isPremium,
    advancedFilters: isPro || isPremium,
    unlimitedMessaging: isPro || isPremium,
    seeWhoLikedYou: isPro || isPremium,
    readReceipts: isPro || isPremium,
    videoCalls: isPremium, // Premium tier only ($2)
    prioritySupport: isPro || isPremium,
    contentCreation: isPremium, // Premium tier only ($2)
    monetizationTools: isPremium, // Premium tier only ($2)
    escrowPayments: isPremium, // Premium tier only ($2)
    creatorAnalytics: isPremium, // Premium tier only ($2)
    premiumBadge: isPremium, // Premium tier only ($2)
    featuredProfile: isPremium, // Premium tier only ($2)
  };
  
  const canAccess = (feature: keyof PremiumFeatures): boolean => {
    return features[feature];
  };
  
  const getRemainingDailyLikes = (): number => {
    if (canAccess('unlimitedLikes')) return 999; // Unlimited
    
    // In a real app, this would track daily usage
    // For now, return a mock value
    return Math.max(0, 5 - 2); // 5 total, 2 used today
  };
  
  const shouldShowUpgradePrompt = (feature: keyof PremiumFeatures): boolean => {
    return !canAccess(feature);
  };
  
  const getUpgradeMessage = (feature: keyof PremiumFeatures): string => {
    const featureMessages = {
      unlimitedLikes: 'Upgrade to Pro for unlimited daily likes',
      noAds: 'Upgrade to Pro to remove all advertisements',
      advancedFilters: 'Upgrade to Pro for advanced search filters',
      unlimitedMessaging: 'Upgrade to Pro for unlimited messaging',
      seeWhoLikedYou: 'Upgrade to Pro to see who liked your profile',
      readReceipts: 'Upgrade to Pro for message read receipts',
      videoCalls: 'Upgrade to Premium for unlimited video calls',
      prioritySupport: 'Upgrade to Pro for priority customer support',
      contentCreation: 'Upgrade to Premium to access creator tools',
      monetizationTools: 'Upgrade to Premium to monetize your content',
      escrowPayments: 'Upgrade to Premium for secure escrow payments',
      creatorAnalytics: 'Upgrade to Premium for detailed analytics',
      premiumBadge: 'Upgrade to Premium for verification badge',
      featuredProfile: 'Upgrade to Premium for featured profile placement',
    };
    
    return featureMessages[feature] || 'Upgrade your plan for access to this feature';
  };
  
  return {
    currentTier: resolvedTier,
    isPro,
    isPremium,
    features,
    canAccess,
    getRemainingDailyLikes,
    shouldShowUpgradePrompt,
    getUpgradeMessage,
    daysUntilExpiry,
    isExpiringSoon,
  };
}
