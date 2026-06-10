/**
 * Subscription Types
 * Defines subscription tiers, billing, and payment types
 */

export type SubscriptionTier = 'free' | 'pro' | 'premium';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'trialing' | 'past_due';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  nextBillingDate?: string;
  autoRenew: boolean;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionTierData {
  id: SubscriptionTier;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  gradientColors: string[];
  limits: {
    dailyLikes?: number;
    dailySuperLikes?: number;
    maxPhotos?: number;
    messagingLimit?: number;
    videoCallMinutes?: number;
  };
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'mpesa' | 'card' | 'paypal';
  details: {
    mpesaNumber?: string;
    cardLast4?: string;
    cardBrand?: string;
    paypalEmail?: string;
  };
  isDefault: boolean;
  createdAt: string;
}

export interface BillingHistory {
  id: string;
  userId?: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status?: PaymentStatus | string;
  paymentMethod: string;
  transactionId?: string;
  invoiceUrl?: string;
  description: string;
  date?: string;
  createdAt?: string;
}

export interface SubscriptionCheckoutData {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  paymentMethod: string;
  amount: number;
}

// Subscription Tier Definitions
export const SUBSCRIPTION_TIERS: SubscriptionTierData[] = [
  {
    id: 'free',
    name: 'Free',
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      'Basic browsing',
      'Limited messages (5/day)',
      'Standard filters',
      '5 daily likes',
      'Up to 5 photos',
    ],
    gradientColors: ['#6B7280', '#4B5563'],
    limits: {
      dailyLikes: 5,
      dailySuperLikes: 0,
      maxPhotos: 5,
      messagingLimit: 5,
      videoCallMinutes: 0,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: {
      monthly: 1,
      yearly: 10,
    },
    features: [
      'Unlimited messages',
      'Advanced filters',
      '25 daily likes',
      '5 super likes/day',
      'No ads',
      'Priority support',
    ],
    gradientColors: ['#3B82F6', '#2563EB'],
    limits: {
      dailyLikes: 25,
      dailySuperLikes: 5,
      maxPhotos: 10,
      messagingLimit: -1, // unlimited
      videoCallMinutes: 0,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: {
      monthly: 2,
      yearly: 20,
    },
    features: [
      'All Pro features',
      'Unlimited messages & chat',
      'Video & voice calls',
      'Unlimited likes',
      'Unlimited super likes',
      'Profile boost',
      'See who liked you',
      'Incognito mode',
      'Priority matching',
      'Advanced analytics',
      'VIP support',
    ],
    gradientColors: ['#8B5CF6', '#7C3AED'],
    limits: {
      dailyLikes: -1, // unlimited
      dailySuperLikes: -1, // unlimited
      maxPhotos: 50,
      messagingLimit: -1, // unlimited
      videoCallMinutes: -1, // unlimited
    },
  },
];
