import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  Subscription, 
  SubscriptionTier, 
  BillingCycle,
  SubscriptionStatus as SubscriptionStatusType,
  BillingHistory 
} from '../types/subscription';
import { paystackService } from './paystackService';
import transactionalNotificationService from './transactionalNotificationService';
import entitlementService from './entitlementService';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CreateSubscriptionParams {
  userId: string;
  tier: 'pro' | 'premium';
  billingCycle: 'monthly' | 'yearly';
  paymentReference: string;
  amount: number;
  currency: string;
  countryCode: string;
}

export interface UserSubscriptionStatus {
  isActive: boolean;
  tier: SubscriptionTier;
  expiresAt?: string;
  autoRenew: boolean;
}

class SubscriptionService {
  /**
   * Check if user ID is a valid UUID
   */
  private isValidUuid(userId: string): boolean {
    return UUID_REGEX.test(userId);
  }

  /**
   * Check if user is a demo/test user
   */
  private isDemoUser(userId: string): boolean {
    return userId === 'demo-user-123' || userId.startsWith('demo-') || !this.isValidUuid(userId);
  }

  /**
   * Get user's current subscription
   */
  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    try {
      if (!isSupabaseConfigured()) {
        return null;
      }

      // Skip database queries for demo/test users
      if (this.isDemoUser(userId)) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('end_date', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No subscription found
        }
        throw error;
      }

      return this.mapToSubscription(data);
    } catch (error: unknown) {
      // Only log if it's not a UUID validation error (which we handle gracefully)
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code !== '22P02') {
        // eslint-disable-next-line no-console
        console.error('[SubscriptionService] Get current subscription error:', error);
      }
      return null;
    }
  }

  /**
   * Create new subscription after successful payment
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
      }

      // Calculate end date based on billing cycle
      const startDate = new Date();
      const endDate = new Date(startDate);
      
      if (params.billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscriptionData = {
        user_id: params.userId,
        tier: params.tier,
        billing_cycle: params.billingCycle,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        amount_paid: params.amount,
        currency: params.currency,
        country_code: params.countryCode,
        payment_reference: params.paymentReference,
        auto_renew: true,
        payment_channel: 'paystack',
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;

      await (supabase as any).rpc('convert_trial_to_paid', {
        p_user_id: params.userId,
        p_subscription_id: data.id,
      });

      entitlementService.invalidateUser(params.userId);

      // eslint-disable-next-line no-console
      console.log('[SubscriptionService] Subscription created:', data.id);
      return this.mapToSubscription(data);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      // eslint-disable-next-line no-console
      console.error('[SubscriptionService] Create subscription error:', error);
      throw new Error(errorObj.message || 'Failed to create subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
      }

      // Skip database operations for demo/test users
      if (this.isDemoUser(userId)) {
        return;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          auto_renew: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId); // Ensure user owns the subscription

      if (error) throw error;

      // eslint-disable-next-line no-console
      console.log('[SubscriptionService] Subscription cancelled:', subscriptionId);

      // Get subscription details for notification
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, end_date')
        .eq('id', subscriptionId)
        .single();

      // Send cancellation notification (non-blocking)
      if (subscription) {
        const expiryDate = new Date(subscription.end_date as string).toLocaleDateString();
        transactionalNotificationService.sendSubscriptionCancelled(
          userId,
          subscription.tier as string,
          expiryDate
        ).catch(() => {});
      }
    } catch (error: unknown) {
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code !== '22P02') {
        // eslint-disable-next-line no-console
        console.error('[SubscriptionService] Cancel subscription error:', error);
      }
      throw new Error(errorObj.message || 'Failed to cancel subscription');
    }
  }

  /**
   * Get subscription status for user
   */
  async getSubscriptionStatus(userId: string): Promise<UserSubscriptionStatus> {
    try {
      const entitlement = await entitlementService.getUserEntitlement(userId, { forceRefresh: true });
      const isActive = entitlement.state !== 'FREE';
      const tier = entitlement.effectiveTier;

      return {
        isActive,
        tier,
        expiresAt: entitlement.expiresAt,
        autoRenew: entitlement.state === 'PRO' || entitlement.state === 'PREMIUM',
      };
    } catch {
      // Silent fallback
      return {
        isActive: false,
        tier: 'free',
        autoRenew: false,
      };
    }
  }

  /**
   * Check if subscription has expired and update status
   */
  async checkAndUpdateExpiredSubscriptions(userId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        return;
      }

      // Skip database queries for demo/test users
      if (this.isDemoUser(userId)) {
        return;
      }

      const now = new Date().toISOString();

      // Get expired subscriptions before updating
      const { data: expiredSubs } = await supabase
        .from('subscriptions')
        .select('id, tier')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lt('end_date', now);

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          updated_at: now,
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .lt('end_date', now);

      // Send expiry notifications (non-blocking)
      if (expiredSubs && expiredSubs.length > 0) {
        expiredSubs.forEach((sub) => {
          transactionalNotificationService.sendSubscriptionExpired(
            userId,
            sub.tier as string
          ).catch(() => {});
        });
      }

      if (error) {
        // Only log if it's not a UUID validation error (which we handle gracefully)
        const errorObj = error as { code?: string };
        if (errorObj.code !== '22P02') {
          // eslint-disable-next-line no-console
          console.error('[SubscriptionService] Update expired subscriptions error:', error);
        }
      }
    } catch (error: unknown) {
      // Silent fallback for demo users
      const errorObj = error as { code?: string };
      if (errorObj.code !== '22P02') {
        // eslint-disable-next-line no-console
        console.error('[SubscriptionService] Check expired subscriptions error:', error);
      }
    }
  }

  /**
   * Get subscription history for user
   */
  async getSubscriptionHistory(userId: string): Promise<BillingHistory[]> {
    try {
      if (!isSupabaseConfigured()) {
        return [];
      }

      // Skip database queries for demo/test users
      if (this.isDemoUser(userId)) {
        return [];
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to BillingHistory format
      return (data || []).map((item: Record<string, unknown>) => ({
        id: (item.id as string) || '',
        subscriptionId: (item.id as string) || '',
        amount: (item.amount_paid as number) || 0,
        currency: (item.currency as string) || 'KES',
        paymentMethod: (item.payment_channel as string) || 'unknown',
        description: `Subscription ${item.tier as string || 'unknown'}`,
        date: (item.created_at as string) || new Date().toISOString(),
        status: (item.status as string) || 'completed'
      }));
    } catch (error: unknown) {
      // Silent fallback for demo users
      const errorObj = error as { code?: string };
      if (errorObj.code !== '22P02') {
        // eslint-disable-next-line no-console
        console.error('[SubscriptionService] Get subscription history error:', error);
      }
      return [];
    }
  }

  /**
   * Update subscription auto-renew setting
   */
  async updateAutoRenew(subscriptionId: string, userId: string, autoRenew: boolean): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
      }

      // Skip database operations for demo/test users
      if (this.isDemoUser(userId)) {
        return;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          auto_renew: autoRenew,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId);

      if (error) throw error;

      // eslint-disable-next-line no-console
      console.log('[SubscriptionService] Auto-renew updated:', subscriptionId, autoRenew);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      // eslint-disable-next-line no-console
      console.error('[SubscriptionService] Update auto-renew error:', error);
      throw new Error(errorObj.message || 'Failed to update auto-renew');
    }
  }

  /**
   * Handle subscription renewal
   */
  async renewSubscription(
    userId: string,
    email: string,
    countryCode: string
  ): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
    try {
      // Get last subscription to determine tier and billing cycle
      const lastSub = await this.getCurrentSubscription(userId);

      if (!lastSub) {
        return {
          success: false,
          error: 'No subscription found to renew',
        };
      }

      // Use Paystack service for renewal
      return await paystackService.renewSubscription(userId, email, countryCode);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      // eslint-disable-next-line no-console
      console.error('[SubscriptionService] Renew subscription error:', error);
      return {
        success: false,
        error: errorObj.message || 'Renewal failed',
      };
    }
  }

  /**
   * Upgrade subscription to a higher tier
   */
  async upgradeSubscription(
    userId: string,
    email: string,
    newTier: 'premium',
    countryCode: string
  ): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
    try {
      // Use Paystack service for upgrade
      return await paystackService.upgradeSubscription(
        userId,
        email,
        newTier,
        countryCode
      );
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      // eslint-disable-next-line no-console
      console.error('[SubscriptionService] Upgrade subscription error:', error);
      return {
        success: false,
        error: errorObj.message || 'Upgrade failed',
      };
    }
  }

  /**
   * Validate subscription is active
   */
  async validateActiveSubscription(
    userId: string,
    requiredTier?: 'pro' | 'premium'
  ): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus(userId);

      if (!status.isActive) {
        return false;
      }

      if (requiredTier) {
        // Check if user has required tier or higher
        const tierHierarchy = { free: 0, pro: 1, premium: 2 };
        return tierHierarchy[status.tier] >= tierHierarchy[requiredTier];
      }

      return true;
    } catch {
      // Silent fallback
      return false;
    }
  }

  /**
   * Map database record to Subscription type
   */
  private mapToSubscription(data: Record<string, unknown>): Subscription {
    return {
      id: (data.id as string) || '',
      userId: (data.user_id as string) || '',
      tier: (data.tier as SubscriptionTier) || 'free',
      status: (data.status as SubscriptionStatusType) || 'active',
      startDate: (data.start_date as string) || new Date().toISOString(),
      endDate: (data.end_date as string) || new Date().toISOString(),
      billingCycle: (data.billing_cycle as BillingCycle) || 'monthly',
      autoRenew: (data.auto_renew as boolean) || false,
      paymentMethod: (data.payment_channel as string) || 'paystack',
      amount: (data.amount_paid as number) || 0,
      currency: (data.currency as string) || 'KES',
      createdAt: (data.created_at as string) || new Date().toISOString(),
      updatedAt: (data.updated_at as string) || new Date().toISOString(),
      cancelledAt: (data.cancelled_at as string) || undefined,
    };
  }

  /**
   * Get billing history for a user
   * Delegates to PaystackService which has the implementation
   */
  async getBillingHistory(userId: string): Promise<BillingHistory[]> {
    try {
      if (!isSupabaseConfigured()) {
        return [];
      }

      // Skip database queries for demo/test users
      if (this.isDemoUser(userId)) {
        return [];
      }

      // Delegate to paystackService which has the implementation
      const history = await paystackService.getBillingHistory(userId);
      return history.map(item => ({
        id: item.id,
        userId,
        // Some transaction records may not have a subscription id; keep a stable identifier.
        subscriptionId: item.id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        paymentMethod: 'paystack',
        description: item.description || `Payment for subscription`,
        date: item.date,
      }));
    } catch (error) {
      console.error('[SubscriptionService] Get billing history error:', error);
      return [];
    }
  }
}

let instance: SubscriptionService | null = null;
function getInstance(): SubscriptionService {
  if (!instance) instance = new SubscriptionService();
  return instance;
}

export const subscriptionService = new Proxy({} as SubscriptionService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});
export default subscriptionService;
