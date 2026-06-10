export type EntitlementState = 'FREE' | 'BONUS_ACTIVE' | 'TRIAL_ACTIVE' | 'PRO' | 'PREMIUM';

export type EffectiveTier = 'free' | 'pro' | 'premium';

export interface TrialEntitlementDetails {
  trialActive: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  convertedToPaidAt?: string;
}

export interface UserEntitlement {
  state: EntitlementState;
  effectiveTier: EffectiveTier;
  expiresAt?: string;
  subscriptionTier?: 'pro' | 'premium';
  subscriptionId?: string;
  trial?: TrialEntitlementDetails;
}
