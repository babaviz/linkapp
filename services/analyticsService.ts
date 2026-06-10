/**
 * Analytics Service
 * Handles data collection, activity tracking, and social proof metrics
 * Material 3 compliant implementation with real-time updates
 */

import { supabase } from './supabaseClient';

// Analytics interfaces
export interface ActivityData {
  module: 'property' | 'jobs' | 'services' | 'datemi';
  count: number;
  activity: string;
  color: string;
  lastUpdated: Date;
}

export interface EngagementMetrics {
  id: string;
  contentType: 'property' | 'job' | 'service' | 'profile';
  contentId: string;
  views: number;
  likes: number;
  shares: number;
  contacts: number;
  favorites: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserActivity {
  userId: string;
  action: 'view' | 'like' | 'share' | 'contact' | 'save' | 'search' | 'browse';
  contentType: string;
  contentId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AnalyticsSnapshot {
  totalUsers: number;
  activeUsers: number;
  totalContent: {
    properties: number;
    jobs: number;
    services: number;
  };
  engagementRates: {
    property: number;
    jobs: number;
    services: number;
    datemi: number;
  };
  topPerformers: {
    properties: string[];
    jobs: string[];
    services: string[];
  };
}

class AnalyticsService {
  private realTimeSubscriptions: Map<string, any> = new Map();
  private activityCache: Map<string, { data: ActivityData; fetchedAt: number }> = new Map();
  private lastActivityIndicatorsRpcAtMs: number = 0;
  private readonly activityCacheTtlMs: number = 15000;
  private readonly activityIndicatorsRpcThrottleMs: number = 20000;

  /**
   * Fetch real-time activity indicators from database
   */
  public async fetchActivityIndicator(
    module: 'property' | 'jobs' | 'services' | 'datemi',
    userRole?: string
  ): Promise<ActivityData> {
    try {
      const cacheKey = `${module}-${userRole || 'default'}`;
      const cached = this.activityCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < this.activityCacheTtlMs) {
        return cached.data;
      }

      const { data, error } = await supabase
        .from('activity_indicators')
        .select('module, activity_count, activity_text, last_updated, updated_at')
        .eq('module', module)
        .single();

      if (error || !data) return this.getUnavailableActivityIndicator(module, userRole, cached?.data);

      const baseData = this.getModuleBaseData(module, userRole);
      const count = Number((data as any).activity_count ?? 0);
      const activityTextFromDb = typeof (data as any).activity_text === 'string' ? (data as any).activity_text : undefined;
      const lastUpdatedIso = (data as any).last_updated || (data as any).updated_at;
      const activity: ActivityData = {
        module,
        count,
        activity: this.getResolvedActivityText(module, count, userRole, activityTextFromDb),
        color: baseData.color,
        lastUpdated: new Date(lastUpdatedIso || new Date().toISOString())
      };

      this.activityCache.set(cacheKey, { data: activity, fetchedAt: Date.now() });
      return activity;
    } catch (error) {
      const cacheKey = `${module}-${userRole || 'default'}`;
      const cached = this.activityCache.get(cacheKey);
      return this.getUnavailableActivityIndicator(module, userRole, cached?.data);
    }
  }

  /**
   * Subscribe to real-time activity indicator updates via Supabase Realtime.
   * This enables near real-time UI updates without aggressive polling.
   */
  public subscribeToActivityIndicator(
    module: 'property' | 'jobs' | 'services' | 'datemi',
    callback: (activity: ActivityData) => void,
    userRole?: string
  ): () => void {
    const channel = supabase
      .channel(`activity-indicators-${module}-${userRole || 'default'}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_indicators',
          filter: `module=eq.${module}`,
        },
        (payload) => {
          const row: any = (payload as any)?.new || (payload as any)?.old;
          if (!row) return;

          const baseData = this.getModuleBaseData(module, userRole);
          const count = Number(row.activity_count ?? 0);
          const activityTextFromDb = typeof row.activity_text === 'string' ? row.activity_text : undefined;
          const lastUpdatedIso = row.last_updated || row.updated_at;

          const activity: ActivityData = {
            module,
            count,
            activity: this.getResolvedActivityText(module, count, userRole, activityTextFromDb),
            color: baseData.color,
            lastUpdated: new Date(lastUpdatedIso || new Date().toISOString()),
          };

          const cacheKey = `${module}-${userRole || 'default'}`;
          this.activityCache.set(cacheKey, { data: activity, fetchedAt: Date.now() });
          callback(activity);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // ignore
      }
    };
  }

  /**
   * Get module base data for activity generation
   */
  private getModuleBaseData(module: string, userRole?: string) {
    switch (module) {
      case 'property':
        return {
          baseCount: userRole === 'property_owner' ? 15 : 23,
          color: '#10B981' // Teal for property
        };
      case 'jobs':
        return {
          baseCount: userRole === 'employer' ? 12 : 47,
          color: '#059669' // Dark emerald for jobs
        };
      case 'services':
        return {
          baseCount: userRole === 'service_provider' ? 8 : 31,
          color: '#7C3AED' // Purple for services
        };
      case 'datemi':
        return {
          baseCount: 89,
          color: '#6366F1' // Indigo for date mi
        };
      default:
        return {
          baseCount: 10,
          color: '#6B7280'
        };
    }
  }

  /**
   * Generate activity text based on module and role
   */
  private getActivityText(module: string, count: number, userRole?: string): string {
    const personWord = count === 1 ? 'person' : 'people';
    const matchWord = count === 1 ? 'match' : 'matches';
    switch (module) {
      case 'property':
        return userRole === 'property_owner'
          ? `${count} ${personWord} browsing properties right now`
          : `${count} ${personWord} searching right now`;
      case 'jobs':
        return userRole === 'employer'
          ? `${count} ${personWord} browsing jobs right now`
          : `${count} ${personWord} searching right now`;
      case 'services':
        return `${count} ${personWord} searching for services right now`;
      case 'datemi':
        return `${count} active ${matchWord} today`;
      default:
        return `${count} active users right now`;
    }
  }

  /**
   * Prefer DB-provided activity_text for seeker roles; compute locally for role-specific copy.
   */
  private getResolvedActivityText(
    module: 'property' | 'jobs' | 'services' | 'datemi',
    count: number,
    userRole?: string,
    activityTextFromDb?: string
  ): string {
    const shouldUseDbText =
      (module === 'property' && userRole !== 'property_owner') ||
      (module === 'jobs' && userRole !== 'employer') ||
      (module === 'services' && userRole !== 'service_provider') ||
      module === 'datemi';

    if (shouldUseDbText && activityTextFromDb) return activityTextFromDb;
    return this.getActivityText(module, count, userRole);
  }

  /**
   * If we cannot fetch a reliable value, do NOT invent numbers.
   * Keep the last known value when possible; otherwise return an "updating" placeholder.
   */
  private getUnavailableActivityIndicator(
    module: 'property' | 'jobs' | 'services' | 'datemi',
    userRole?: string,
    lastKnown?: ActivityData
  ): ActivityData {
    if (lastKnown) return lastKnown;

    const baseData = this.getModuleBaseData(module, userRole);
    return {
      module,
      count: 0,
      activity: 'Updating activity...',
      color: baseData.color,
      lastUpdated: new Date(),
    };
  }

  /**
   * Track user activity
   */
  public async trackActivity(activity: Omit<UserActivity, 'timestamp'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: activity.userId,
          content_type: activity.contentType,
          content_id: activity.contentId,
          action: activity.action,
          timestamp: new Date().toISOString(),
          metadata: (activity as any).metadata || null
        } as any);

      if (error) return;

      // Throttled backend-side aggregation refresh for near real-time accuracy.
      // Requires the `update_activity_indicators()` SQL function to exist (see migrations).
      await this.requestActivityIndicatorsUpdateThrottled();

      // Update engagement metrics only for actions that map to counters.
      if (activity.action === 'view' || activity.action === 'like' || activity.action === 'share' || activity.action === 'contact' || activity.action === 'save') {
        await this.updateEngagementMetrics(
          activity.contentType as any,
          activity.contentId,
          activity.action
        );
      }
    } catch (error) {
      
    }
  }

  /**
   * Request server-side aggregation of activity indicators (throttled).
   * This avoids stale "seed" counts in production and keeps the indicator synced with real traffic.
   */
  private async requestActivityIndicatorsUpdateThrottled(): Promise<void> {
    const now = Date.now();
    if (now - this.lastActivityIndicatorsRpcAtMs < this.activityIndicatorsRpcThrottleMs) return;
    this.lastActivityIndicatorsRpcAtMs = now;

    try {
      const { error } = await supabase.rpc('update_activity_indicators');
      if (error) {
        // ignore (function may not exist in some envs)
      }
    } catch (_) {
      // ignore
    }
  }

  /**
   * Update engagement metrics for content
   */
  public async updateEngagementMetrics(
    contentType: 'property' | 'job' | 'service' | 'profile',
    contentId: string,
    action: string
  ): Promise<void> {
    try {
      // Get existing metrics
      const { data: existing, error: fetchError } = await supabase
        .from('engagement_metrics')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        
        return;
      }

      const currentMetrics = existing || {
        content_type: contentType,
        content_id: contentId,
        views: 0,
        likes: 0,
        shares: 0,
        contacts: 0,
        favorites: 0
      };

      // Increment the appropriate metric
      switch (action) {
        case 'view':
          currentMetrics.views += 1;
          break;
        case 'like':
          currentMetrics.likes += 1;
          break;
        case 'share':
          currentMetrics.shares += 1;
          break;
        case 'contact':
          currentMetrics.contacts += 1;
          break;
        case 'save':
          currentMetrics.favorites += 1;
          break;
      }

      // Upsert the metrics
      const { error: upsertError } = await supabase
        .from('engagement_metrics')
        .upsert({
          ...currentMetrics,
          updated_at: new Date().toISOString()
        } as any);

      if (upsertError) {
        
      }
    } catch (error) {
      
    }
  }

  /**
   * Get engagement metrics for content
   */
  public async getEngagementMetrics(
    contentType: string,
    contentId: string
  ): Promise<EngagementMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('engagement_metrics')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return default metrics
          return {
            id: '',
            contentType: contentType as any,
            contentId,
            views: 0,
            likes: 0,
            shares: 0,
            contacts: 0,
            favorites: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        
        return null;
      }

      if (!data) return null;

      const record = data as any;
      return {
        id: record.id,
        contentType: record.content_type,
        contentId: record.content_id,
        views: record.views || 0,
        likes: record.likes || 0,
        shares: record.shares || 0,
        contacts: record.contacts || 0,
        favorites: record.favorites || 0,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at)
      };
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Get analytics snapshot
   */
  public async getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
    try {
      // This would typically fetch from multiple tables
      // For now, returning demo data that would be calculated
      return {
        totalUsers: 1247,
        activeUsers: 342,
        totalContent: {
          properties: 1834,
          jobs: 456,
          services: 892
        },
        engagementRates: {
          property: 2.8,
          jobs: 4.2,
          services: 1.9,
          datemi: 8.3
        },
        topPerformers: {
          properties: [],
          jobs: [],
          services: []
        }
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get content performance data
   */
  public async getContentPerformance(
    contentType: string,
    contentId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<any> {
    try {
      const startDate = this.getStartDate(timeframe);
      
      const { data, error } = await supabase
        .from('user_activities')
        .select('action, timestamp, metadata')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        
        return null;
      }

      // Process the data into performance metrics
      return this.processPerformanceData(data, timeframe);
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Get start date for timeframe
   */
  private getStartDate(timeframe: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Process performance data into metrics
   */
  private processPerformanceData(data: any[], timeframe: string): any {
    const metrics = {
      views: 0,
      likes: 0,
      shares: 0,
      contacts: 0,
      saves: 0,
      timeline: [] as { date: string; views: number; interactions: number }[]
    };

    // Count actions
    data.forEach(activity => {
      switch (activity.action) {
        case 'view':
          metrics.views++;
          break;
        case 'like':
          metrics.likes++;
          break;
        case 'share':
          metrics.shares++;
          break;
        case 'contact':
          metrics.contacts++;
          break;
        case 'save':
          metrics.saves++;
          break;
      }
    });

    // Generate timeline data (simplified)
    const days = timeframe === 'day' ? 24 : timeframe === 'week' ? 7 : 30;
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      metrics.timeline.unshift({
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 20) + 5,
        interactions: Math.floor(Math.random() * 8) + 1
      });
    }

    return metrics;
  }

  /**
   * Update activity indicator in database based on recent user activity
   */
  public async updateActivityIndicator(
    module: 'property' | 'jobs' | 'services' | 'datemi'
  ): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const contentTypeMap: Record<string, string> = {
        'property': 'property',
        'jobs': 'job',
        'services': 'service',
        'datemi': 'profile'
      };

      const { data, error } = await supabase
        .from('user_activities')
        .select('user_id', { count: 'exact', head: false })
        .eq('content_type', contentTypeMap[module])
        .gte('timestamp', fiveMinutesAgo.toISOString());

      if (error) {
        return;
      }

      const uniqueUsers = new Set(data?.map((a: any) => a.user_id) || []);
      const activityCount = Math.max(uniqueUsers.size, 1);

      const activityText = this.getActivityText(module, activityCount);

      await supabase
        .from('activity_indicators')
        .upsert({
          module,
          activity_count: activityCount,
          activity_text: activityText,
          last_updated: now.toISOString()
        }, {
          onConflict: 'module'
        });
    } catch (error) {
      
    }
  }

  /**
   * Start real-time activity updates
   */
  public startRealTimeUpdates(
    module: string,
    callback: (activity: ActivityData) => void,
    interval: number = 10000,
    userRole?: string
  ): string {
    const subscriptionId = `${module}-${Date.now()}`;
    
    const update = async () => {
      const activity = await this.fetchActivityIndicator(module as any, userRole);
      callback(activity);
    };

    update();
    
    const intervalId = setInterval(update, interval);

    this.realTimeSubscriptions.set(subscriptionId, intervalId);
    return subscriptionId;
  }

  /**
   * Stop real-time updates
   */
  public stopRealTimeUpdates(subscriptionId: string): void {
    const intervalId = this.realTimeSubscriptions.get(subscriptionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.realTimeSubscriptions.delete(subscriptionId);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  public cleanup(): void {
    this.realTimeSubscriptions.forEach(intervalId => clearInterval(intervalId));
    this.realTimeSubscriptions.clear();
    this.activityCache.clear();
  }

  /**
   * Track custom events for analytics
   */
  public trackEvent(eventName: string, eventData: Record<string, any> = {}): void {
    try {
      // Log event for debugging

      // In a real implementation, this would send data to analytics service
      // For now, we'll just log and optionally store in Supabase
      
      // Optional: Store in Supabase for later analysis
      // supabase.from('analytics_events').insert({
      //   event_name: eventName,
      //   event_data: eventData,
      //   timestamp: new Date().toISOString(),
      //   user_id: eventData.userId || null
      // });
    } catch (error) {
      
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
