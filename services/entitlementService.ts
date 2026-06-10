import { supabase, isSupabaseConfigured } from './supabaseClient';
import { EffectiveTier, EntitlementState, UserEntitlement } from '../types/entitlement';

type EntitlementCacheEntry = {
  value: UserEntitlement;
  expiresAtMs: number;
};

const CACHE_TTL_MS = 30 * 1000;

const DEFAULT_ENTITLEMENT: UserEntitlement = {
  state: 'FREE',
  effectiveTier: 'free',
};

const toDateMs = (value?: string): number => {
  if (!value) return Number.NaN;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.NaN;
};

class EntitlementService {
  private cache = new Map<string, EntitlementCacheEntry>();

  private normalizeState(value: unknown): EntitlementState {
    const input = typeof value === 'string' ? value.toUpperCase() : '';
    if (input === 'BONUS_ACTIVE' || input === 'TRIAL_ACTIVE' || input === 'PRO' || input === 'PREMIUM') {
      return input;
    }
    return 'FREE';
  }

  private normalizeTier(value: unknown): EffectiveTier {
    const input = typeof value === 'string' ? value.toLowerCase() : '';
    if (input === 'pro' || input === 'premium') {
      return input;
    }
    return 'free';
  }

  private readValidCache(userId: string): UserEntitlement | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    if (cached.expiresAtMs <= Date.now()) {
      this.cache.delete(userId);
      return null;
    }
    return cached.value;
  }

  invalidateUser(userId?: string): void {
    if (!userId) return;
    this.cache.delete(userId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private setCache(userId: string, value: UserEntitlement): void {
    this.cache.set(userId, {
      value,
      expiresAtMs: Date.now() + CACHE_TTL_MS,
    });
  }

  private async fallbackEntitlementFromSubscriptions(userId: string): Promise<UserEntitlement> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, tier, status, end_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('end_date', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return DEFAULT_ENTITLEMENT;
    }

    const tier = this.normalizeTier(data.tier);
    const state: EntitlementState = tier === 'premium' ? 'PREMIUM' : tier === 'pro' ? 'PRO' : 'FREE';

    return {
      state,
      effectiveTier: tier,
      expiresAt: typeof data.end_date === 'string' ? data.end_date : undefined,
      subscriptionTier: tier === 'free' ? undefined : tier,
      subscriptionId: typeof data.id === 'string' ? data.id : undefined,
    };
  }

  async getUserEntitlement(userId: string, options?: { forceRefresh?: boolean }): Promise<UserEntitlement> {
    if (!userId || !isSupabaseConfigured()) {
      return DEFAULT_ENTITLEMENT;
    }

    if (!options?.forceRefresh) {
      const cached = this.readValidCache(userId);
      if (cached) return cached;
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_user_entitlement_state', {
        p_user_id: userId,
      });

      if (error || !data || typeof data !== 'object') {
        const fallback = await this.fallbackEntitlementFromSubscriptions(userId);
        this.setCache(userId, fallback);
        return fallback;
      }

      const payload = data as Record<string, unknown>;
      const trial = (payload.trial && typeof payload.trial === 'object'
        ? (payload.trial as Record<string, unknown>)
        : null);

      const entitlement: UserEntitlement = {
        state: this.normalizeState(payload.state),
        effectiveTier: this.normalizeTier(payload.effective_tier),
        expiresAt: typeof payload.expires_at === 'string' ? payload.expires_at : undefined,
        subscriptionTier:
          payload.subscription_tier === 'pro' || payload.subscription_tier === 'premium'
            ? (payload.subscription_tier as 'pro' | 'premium')
            : undefined,
        subscriptionId: typeof payload.subscription_id === 'string' ? payload.subscription_id : undefined,
        trial: trial
          ? {
              trialActive: Boolean(trial.trial_active),
              trialStartDate:
                typeof trial.trial_start_date === 'string' ? trial.trial_start_date : undefined,
              trialEndDate:
                typeof trial.trial_end_date === 'string' ? trial.trial_end_date : undefined,
              convertedToPaidAt:
                typeof trial.converted_to_paid_at === 'string' ? trial.converted_to_paid_at : undefined,
            }
          : undefined,
      };

      this.setCache(userId, entitlement);
      return entitlement;
    } catch {
      const fallback = await this.fallbackEntitlementFromSubscriptions(userId);
      this.setCache(userId, fallback);
      return fallback;
    }
  }

  async hasPremiumEquivalentAccess(userId: string, options?: { forceRefresh?: boolean }): Promise<boolean> {
    const entitlement = await this.getUserEntitlement(userId, options);
    return entitlement.state === 'TRIAL_ACTIVE' || entitlement.state === 'BONUS_ACTIVE' || entitlement.state === 'PREMIUM';
  }

  async hasProOrHigher(userId: string, options?: { forceRefresh?: boolean }): Promise<boolean> {
    const entitlement = await this.getUserEntitlement(userId, options);
    return (
      entitlement.state === 'PRO' ||
      entitlement.state === 'PREMIUM' ||
      entitlement.state === 'TRIAL_ACTIVE' ||
      entitlement.state === 'BONUS_ACTIVE'
    );
  }

  getDaysUntilExpiry(entitlement: UserEntitlement): number | null {
    const expiryMs = toDateMs(entitlement.expiresAt);
    if (!Number.isFinite(expiryMs)) return null;
    const days = Math.ceil((expiryMs - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : 0;
  }
}

let instance: EntitlementService | null = null;
function getInstance(): EntitlementService {
  if (!instance) instance = new EntitlementService();
  return instance;
}

export const entitlementService = new Proxy({} as EntitlementService, {
  get(_target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  },
});

export default entitlementService;
