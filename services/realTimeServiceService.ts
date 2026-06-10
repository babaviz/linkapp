/**
 * Real-time Service Listings using Supabase Realtime
 * Keeps UI in sync with backend changes for service_listings
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Database } from '../types/supabaseExtended';
import type { ServiceListing } from '../types/service';
import { mapDbRowToService } from './serviceService';

export type ServiceRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface ServiceChangePayload {
  eventType: ServiceRealtimeEvent;
  service: ServiceListing;
  old?: ServiceListing;
}

export interface ServiceSubscriptionOptions {
  filters?: {
    category?: string;
    subcategory?: string;
    status?: string;
    ownerId?: string;
  };
  onServiceChange?: (payload: ServiceChangePayload) => void;
  onError?: (error: Error) => void;
}

class RealTimeServiceService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, ServiceSubscriptionOptions> = new Map();

  public subscribeToServiceChanges(
    subscriptionId: string,
    options: ServiceSubscriptionOptions = {}
  ): () => void {
    this.subscriptions.set(subscriptionId, options);

    if (!isSupabaseConfigured()) {
      return () => {
        this.subscriptions.delete(subscriptionId);
      };
    }

    try {
      const realtimeFilter = options.filters?.ownerId
        ? `owner_id=eq.${options.filters.ownerId}`
        : options.filters?.status
          ? `status=eq.${options.filters.status}`
          : undefined;

      const channel = supabase
        .channel(`services-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'service_listings',
            ...(realtimeFilter && { filter: realtimeFilter }),
          },
          (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['service_listings']['Row']>) => {
            this.handleChange(subscriptionId, payload);
          }
        )
        .subscribe();

      this.channels.set(subscriptionId, channel);
      return () => this.unsubscribe(subscriptionId);
    } catch (error) {
      options.onError?.(error as Error);
      return () => {};
    }
  }

  private handleChange(
    subscriptionId: string,
    payload: RealtimePostgresChangesPayload<Database['public']['Tables']['service_listings']['Row']>
  ): void {
    const opts = this.subscriptions.get(subscriptionId);
    if (!opts) return;

    const rowNew = payload.new as Database['public']['Tables']['service_listings']['Row'] | null;
    const rowOld = payload.old as Database['public']['Tables']['service_listings']['Row'] | null;

    const mappedNew = rowNew ? mapDbRowToService(rowNew) : undefined;
    const mappedOld = rowOld ? mapDbRowToService(rowOld) : undefined;

    if (!mappedNew && !mappedOld) return;

    const changePayload: ServiceChangePayload = {
      eventType: payload.eventType as ServiceRealtimeEvent,
      service: (mappedNew || mappedOld) as ServiceListing,
      old: mappedOld,
    };

    // Apply client-side filters
    const { category, subcategory } = opts.filters || {};
    if (category && mappedNew && mappedNew.category !== category) {
      // If update or insert does not match, still forward; consumer can decide to remove
    }
    if (subcategory && mappedNew && (mappedNew.subcategory || '') !== subcategory) {
      // Same as above
    }

    opts.onServiceChange?.(changePayload);
  }

  public unsubscribe(subscriptionId: string): void {
    const channel = this.channels.get(subscriptionId);
    if (channel) {
      supabase?.removeChannel(channel);
      this.channels.delete(subscriptionId);
    }
    this.subscriptions.delete(subscriptionId);
  }
}

export const realTimeServiceService = new RealTimeServiceService();
export default realTimeServiceService;
