import { Platform } from 'react-native';
import { sanitizeAnalyticsEvent } from '../utils/piiSanitization';

// Lazy load Firebase modules to prevent crash if not available.
// Use modular API to avoid deprecated namespaced warnings.
let firebaseAppModule: any = null;
let analyticsModule: any = null;

try {
  firebaseAppModule = require('@react-native-firebase/app');
} catch {
  // Firebase app module not available - analytics will be disabled
}

export interface UserProperties {
  user_id?: string;
  email?: string;
  source?: string;
  country?: string;
  subscription_tier?: 'free' | 'pro' | 'premium';
  subscription_status?: 'active' | 'expired' | 'cancelled';
}

export interface PurchaseParams {
  tier: 'pro' | 'premium';
  duration: 'monthly' | 'yearly';
  price: number;
  currency: string;
  transaction_id: string;
  payment_method?: string;
  country?: string;
}

export interface CampaignParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

class FirebaseAnalyticsService {
  private static instance: FirebaseAnalyticsService;
  private initialized = false;

  private constructor() {}

  static getInstance(): FirebaseAnalyticsService {
    if (!FirebaseAnalyticsService.instance) {
      FirebaseAnalyticsService.instance = new FirebaseAnalyticsService();
    }
    return FirebaseAnalyticsService.instance;
  }

  private getFirebaseAppSafe(): any | null {
    try {
      const getApps = firebaseAppModule?.getApps;
      const getApp = firebaseAppModule?.getApp;
      if (typeof getApps !== 'function' || typeof getApp !== 'function') {
        return null;
      }
      const apps = getApps();
      if (!Array.isArray(apps) || apps.length === 0) {
        return null;
      }
      return getApp();
    } catch {
      return null;
    }
  }

  private getAnalyticsSafe(): any | null {
    try {
      const app = this.getFirebaseAppSafe();
      if (!app) return null;

      if (!analyticsModule) {
        analyticsModule = require('@react-native-firebase/analytics');
      }
      const getAnalytics = analyticsModule?.getAnalytics;
      if (typeof getAnalytics !== 'function') {
        return null;
      }
      return getAnalytics(app);
    } catch {
      return null;
    }
  }

  /**
   * Initialize analytics
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) {
        // Firebase not available/configured, skip initialization
        return;
      }
      await analyticsInstance.setAnalyticsCollectionEnabled(true);
      
      this.initialized = true;
    } catch (error) {
      // Silently handle initialization errors
      if (__DEV__) {
        console.warn('[FirebaseAnalytics] Initialization failed:', error);
      }
    }
  }

  /**
   * Check if analytics is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ===================== USER ACQUISITION ANALYTICS =====================

  /**
   * Track app install/first launch
   */
  async trackAppInstall(source?: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      const params = sanitizeAnalyticsEvent('app_install', {
        platform: Platform.OS,
        source: source || 'organic',
        timestamp: Date.now(),
      });
      await analyticsInstance.logEvent('app_install', params);
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Track referral install
   */
  async trackReferralInstall(referralCode: string, referrerId: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      const params = sanitizeAnalyticsEvent('referral_install', {
        referral_code: referralCode,
        referrer_id: referrerId,
        platform: Platform.OS,
      });
      await analyticsInstance.logEvent('referral_install', params);
    } catch (error) {
      console.error('[FirebaseAnalytics] Failed to track referral install:', error);
    }
  }

  /**
   * Track campaign click/attribution
   */
  async trackCampaignClick(campaign: CampaignParams): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('campaign_click', {
        source: campaign.source,
        medium: campaign.medium,
        campaign_name: campaign.campaign,
        term: campaign.term,
        content: campaign.content,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Set user acquisition source property
   */
  async setUserSource(source: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.setUserProperty('source', source);
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  // ===================== MONETIZATION ANALYTICS =====================

  /**
   * Track subscription purchase (with PII sanitization)
   */
  async trackSubscriptionPurchase(params: PurchaseParams): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      const sanitizedParams = sanitizeAnalyticsEvent('subscription_purchase', {
        subscription_tier: params.tier,
        billing_cycle: params.duration,
        price: params.price,
        currency: params.currency,
        transaction_id: params.transaction_id,
        payment_method: params.payment_method || 'unknown',
        country: params.country || 'unknown',
        value: params.price,
      });
      
      await analyticsInstance.logEvent('subscription_purchase', sanitizedParams);

      // Also log as purchase event for Firebase ecommerce
      await analyticsInstance.logPurchase({
        value: params.price,
        currency: params.currency,
        items: [
          {
            item_id: `${params.tier}_${params.duration}`,
            item_name: `${params.tier} ${params.duration} subscription`,
            item_category: 'subscription',
            price: params.price,
            quantity: 1,
          },
        ],
        transaction_id: params.transaction_id,
      });
    } catch (error) {
      console.error('[FirebaseAnalytics] Failed to track subscription purchase:', error);
    }
  }

  /**
   * Track subscription renewal
   */
  async trackSubscriptionRenewal(tier: string, duration: string, price: number, currency: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('subscription_renewal', {
        subscription_tier: tier,
        billing_cycle: duration,
        price: price,
        currency: currency,
        value: price,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Track subscription cancellation
   */
  async trackSubscriptionCancellation(tier: string, reason?: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('subscription_cancellation', {
        subscription_tier: tier,
        cancellation_reason: reason || 'not_specified',
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Track payment initiated
   */
  async trackPaymentInitiated(tier: string, duration: string, price: number, currency: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('payment_initiated', {
        subscription_tier: tier,
        billing_cycle: duration,
        price: price,
        currency: currency,
        value: price,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Track payment failed
   */
  async trackPaymentFailed(tier: string, duration: string, reason: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('payment_failed', {
        subscription_tier: tier,
        billing_cycle: duration,
        failure_reason: reason,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Track in-app purchase (for other purchases beyond subscriptions)
   */
  async trackInAppPurchase(productId: string, price: number, currency: string, transactionId: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('in_app_purchase', {
        product_id: productId,
        price: price,
        currency: currency,
        transaction_id: transactionId,
        value: price,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Track revenue (aggregate)
   */
  async trackRevenue(amount: number, currency: string, source: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('revenue_generated', {
        amount: amount,
        currency: currency,
        source: source,
        value: amount,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  // ===================== USER PROPERTIES =====================

  /**
   * Set user properties for segmentation
   */
  async setUserProperties(properties: UserProperties): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      if (properties.user_id) {
        await analyticsInstance.setUserId(properties.user_id);
      }
      if (properties.source) {
        await analyticsInstance.setUserProperty('source', properties.source);
      }
      if (properties.country) {
        await analyticsInstance.setUserProperty('country', properties.country);
      }
      if (properties.subscription_tier) {
        await analyticsInstance.setUserProperty('subscription_tier', properties.subscription_tier);
      }
      if (properties.subscription_status) {
        await analyticsInstance.setUserProperty('subscription_status', properties.subscription_status);
      }
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Update subscription tier property
   */
  async updateSubscriptionTier(tier: 'free' | 'pro' | 'premium'): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.setUserProperty('subscription_tier', tier);
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  // ===================== SCREEN TRACKING =====================

  /**
   * Log screen view
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  // ===================== CUSTOM EVENTS =====================

  /**
   * Log custom event with parameters (with automatic PII sanitization)
   */
  async logCustomEvent(eventName: string, params?: { [key: string]: any }): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      const sanitizedParams = params ? sanitizeAnalyticsEvent(eventName, params) : undefined;
      await analyticsInstance.logEvent(eventName, sanitizedParams);
    } catch (error) {
      console.error(`[FirebaseAnalytics] Failed to log custom event '${eventName}':`, error);
    }
  }

  /**
   * Track user engagement
   */
  async trackEngagement(action: string, category: string, value?: number): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('user_engagement', {
        action: action,
        category: category,
        value: value,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(featureName: string, metadata?: { [key: string]: any }): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.logEvent('feature_used', {
        feature_name: featureName,
        ...metadata,
      });
    } catch (error) {
      // Silently handle tracking errors
    }
  }

  /**
   * Reset analytics data (on logout)
   */
  async resetAnalyticsData(): Promise<void> {
    try {
      const analyticsInstance = this.getAnalyticsSafe();
      if (!analyticsInstance) return;
      await analyticsInstance.resetAnalyticsData();
    } catch (error) {
      // Silently handle tracking errors
    }
  }
}

let instance: FirebaseAnalyticsService | null = null;
const handler: ProxyHandler<FirebaseAnalyticsService> = {
  get(target, prop) {
    if (!instance) instance = FirebaseAnalyticsService.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
};
export default new Proxy({} as FirebaseAnalyticsService, handler);
