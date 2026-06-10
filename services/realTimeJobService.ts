/**
 * Real-time Job Service using Supabase Real-time Subscriptions
 * Mirrors property realtime service for job_postings
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { JobPosting } from '../types/job';
import { store } from '../redux/store';
import { syncJobAcrossLists, removeJobFromAllLists } from '../redux/slices/jobSlice';
import { jobService } from './jobService';
import { categoryCountService } from './categoryCountService';

export type JobRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface JobChangePayload {
  eventType: JobRealtimeEvent;
  job: JobPosting;
  old?: JobPosting;
}

export interface JobSubscriptionOptions {
  filters?: {
    category?: string;
    location?: { county?: string; town?: string };
    status?: string;
    job_type?: string;
  };
  onJobChange?: (payload: JobChangePayload) => void;
  onError?: (error: Error) => void;
}

class RealTimeJobService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, JobSubscriptionOptions> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  public async initialize(): Promise<void> {
    try {
      if (!supabase) {
        return;
      }
      this.isConnected = true;
    } catch (error) {
      throw error as Error;
    }
  }

  public subscribeToJobChanges(
    subscriptionId: string,
    options: JobSubscriptionOptions = {}
  ): () => void {
    this.subscriptions.set(subscriptionId, options);

    if (!supabase) {
      return () => {
        this.subscriptions.delete(subscriptionId);
      };
    }

    try {
      const channel = supabase
        .channel(`jobs-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_postings',
            ...(options.filters?.status && {
              filter: `status=eq.${options.filters.status}`,
            }),
          },
          (payload: RealtimePostgresChangesPayload<JobPosting>) => {
            this.handleJobChange(subscriptionId, payload);
          }
        )
        .subscribe((status) => {
          if (status === 'CLOSED') {
            this.handleConnectionError(subscriptionId);
          }
        });

      this.channels.set(subscriptionId, channel);
      return () => this.unsubscribe(subscriptionId);
    } catch (error) {
      options.onError?.(error as Error);
      return () => {};
    }
  }

  private async handleJobChange(
    subscriptionId: string,
    payload: RealtimePostgresChangesPayload<JobPosting>
  ): Promise<void> {
    try {
      const options = this.subscriptions.get(subscriptionId);
      if (!options) return;

      const changePayload: JobChangePayload = {
        eventType: payload.eventType as JobRealtimeEvent,
        job: (payload.new || payload.old) as JobPosting,
        old: payload.old as JobPosting | undefined,
      };

      options.onJobChange?.(changePayload);

      const { dispatch } = store;
      const id = (payload.new as any)?.id || (payload.old as any)?.id;
      if (id) {
        categoryCountService.clearCache();
        if (changePayload.eventType === 'DELETE') {
          dispatch(removeJobFromAllLists(id) as any);
        } else {
          const latest = await jobService.getJobById(id);
          if (latest) dispatch(syncJobAcrossLists(latest) as any);
        }
      }
    } catch (error) {
      const options = this.subscriptions.get(subscriptionId);
      options?.onError?.(error as Error);
    }
  }

  private handleConnectionError(subscriptionId: string) {
    this.isConnected = false;
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.maxReconnectAttempts) return;

    const options = this.subscriptions.get(subscriptionId);
    if (options) {
      this.subscribeToJobChanges(subscriptionId, options);
    }
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      activeSubscriptions: this.channels.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public unsubscribe(subscriptionId: string): void {
    const channel = this.channels.get(subscriptionId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(subscriptionId);
    }
    this.subscriptions.delete(subscriptionId);
  }
}

export const realTimeJobService = new RealTimeJobService();
export default realTimeJobService;
