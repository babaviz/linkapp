import { supabase, isSupabaseConfigured } from './supabaseClient';

export type DateMiFeatureEntitlementFeature = 'messaging' | 'voice_call' | 'video_call';

export interface DateMiFeatureEntitlementRow {
  id: string;
  user_id: string;
  feature: DateMiFeatureEntitlementFeature;
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  source?: string | null;
  transaction_reference?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

class DateMiFeatureEntitlementService {
  async getActiveEntitlements(userId: string): Promise<Set<DateMiFeatureEntitlementFeature>> {
    if (!isSupabaseConfigured()) return new Set();
    if (!isValidUuid(userId)) return new Set();

    try {
      const nowIso = new Date().toISOString();
      // NOTE: Supabase generated types may not include this table yet (migration-driven).
      // Use an untyped query to avoid blocking builds while keeping runtime behavior correct.
      const sb = supabase as any;
      const { data, error } = await sb
        .from('datemi_feature_entitlements')
        .select('feature,status,end_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('end_date', nowIso);

      if (error) {
        return new Set();
      }

      const features = new Set<DateMiFeatureEntitlementFeature>();
      (data || []).forEach((row: any) => {
        const feature = row?.feature as DateMiFeatureEntitlementFeature | undefined;
        if (feature === 'messaging' || feature === 'voice_call' || feature === 'video_call') {
          features.add(feature);
        }
      });
      return features;
    } catch {
      return new Set();
    }
  }

  async hasActiveEntitlement(userId: string, feature: DateMiFeatureEntitlementFeature): Promise<boolean> {
    const entitlements = await this.getActiveEntitlements(userId);
    return entitlements.has(feature);
  }

  /**
   * Upsert a 1-month entitlement for a feature.
   * - If an active entitlement exists, extends from the current end_date.\n
   * - Otherwise, starts from now.\n
   */
  async upsertMonthlyEntitlement(params: {
    userId: string;
    feature: DateMiFeatureEntitlementFeature;
    transactionReference?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; endDate?: string; error?: string }> {
    const { userId, feature, transactionReference, source, metadata } = params;

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    if (!isValidUuid(userId)) {
      return { success: false, error: 'Invalid user id' };
    }

    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const sb = supabase as any;

      // Fetch existing row (if any) to decide whether to extend.
      const { data: existing } = await sb
        .from('datemi_feature_entitlements')
        .select('end_date,status,transaction_reference')
        .eq('user_id', userId)
        .eq('feature', feature)
        .maybeSingle();

      const existingTransactionRef =
        existing?.transaction_reference && typeof existing.transaction_reference === 'string'
          ? existing.transaction_reference
          : null;
      const existingEndDate =
        existing?.end_date && typeof existing.end_date === 'string' ? existing.end_date : null;

      // Idempotency: if we already applied this Paystack reference to this feature,
      // do not extend/shift dates again.
      if (transactionReference && existingTransactionRef === transactionReference) {
        return { success: true, endDate: existingEndDate ?? undefined };
      }

      const existingEndMs =
        existing?.end_date && typeof existing.end_date === 'string' ? new Date(existing.end_date).getTime() : Number.NaN;
      const baseDate = Number.isFinite(existingEndMs) && existingEndMs > now.getTime() ? new Date(existingEndMs) : now;
      const nextEnd = addMonths(baseDate, 1);

      const upsertPayload = {
        user_id: userId,
        feature,
        status: 'active',
        start_date: nowIso,
        end_date: nextEnd.toISOString(),
        source: source || 'paystack',
        transaction_reference: transactionReference || null,
        metadata: metadata ?? {},
      };

      const { error: upsertError } = await sb
        .from('datemi_feature_entitlements')
        .upsert(upsertPayload, { onConflict: 'user_id,feature' });

      if (upsertError) {
        return { success: false, error: upsertError.message };
      }

      return { success: true, endDate: nextEnd.toISOString() };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update entitlement' };
    }
  }
}

let instance: DateMiFeatureEntitlementService | null = null;
function getInstance(): DateMiFeatureEntitlementService {
  if (!instance) instance = new DateMiFeatureEntitlementService();
  return instance;
}

export const dateMiFeatureEntitlementService = new Proxy({} as DateMiFeatureEntitlementService, {
  get(_target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  },
});

export default dateMiFeatureEntitlementService;

