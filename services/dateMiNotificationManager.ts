/**
 * DateMiNotificationManager
 *
 * Centralized notification state manager for the Date Mi module ONLY.
 *
 * Aggregates:
 * - Unread DateMi messages (Stream Chat channels with `datemi_conversation === true`)
 * - New likes (Supabase `datemi_likes` where `profile_id` == current user's DateMi profile id)
 * - Missed calls (Supabase `calls` where receiver_id == user and status == 'missed')
 *
 * Goals:
 * - Real-time updates (Stream Chat events + Supabase realtime)
 * - Backend-truth consistency (reconcile counts from backend, avoid double increments)
 * - No interference with app-level badge / other modules
 */

import { AppState, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { StreamChat } from 'stream-chat';

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { store } from '../redux/store';
import {
  clearLikeBadge,
  clearMessageBadge,
  clearMissedCallBadge,
  setMissedCalls,
  setNewLikes,
  setUnreadMessages,
  syncNotificationCounts,
} from '../redux/slices/datemiSlice';

type DateMiNotificationStateRow = {
  user_id: string;
  likes_last_seen_at: string | null;
  missed_calls_last_seen_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InitializeParams = {
  userId: string;
  /**
   * The current user's DateMi profile id (`date_mi_profiles.id`).
   * Required for likes realtime + counts.
   */
  dateMiProfileId?: string | null;
  /**
   * Optional Stream Chat client instance (when available).
   * If not provided, chat counts will be refreshed once `bindChatClient()` is called.
   */
  chatClient?: StreamChat | null;
};

type PendingStateUpdate = {
  likes_last_seen_at?: string | null;
  missed_calls_last_seen_at?: string | null;
};

type CachedCounts = {
  userId: string;
  unreadMessages: number;
  newLikes: number;
  missedCalls: number;
  savedAt: string;
};

const STORAGE_KEYS = {
  pendingStateUpdatePrefix: 'datemi_notifications_pending_state_update_v1:',
  cachedCountsPrefix: 'datemi_notifications_cached_counts_v1:',
} as const;

const CHAT_REFRESH_DEBOUNCE_MS = 700;
const LIKES_REFRESH_DEBOUNCE_MS = 500;
const CALLS_REFRESH_DEBOUNCE_MS = 800;

class DateMiNotificationManager {
  private initializedUserId: string | null = null;
  private dateMiProfileId: string | null = null;
  private chatClient: StreamChat | null = null;

  private likesChannel: RealtimeChannel | null = null;
  private callsChannel: RealtimeChannel | null = null;

  private appStateSub: { remove: () => void } | null = null;
  private netInfoUnsub: (() => void) | null = null;
  private appStateRef: AppStateStatus = AppState.currentState;

  private processedLikeIds = new Set<string>();
  private processedMissedCallRowIds = new Set<string>();
  private processedMissedCallStreamCids = new Set<string>();

  private pendingChatRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingLikesRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCallsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCachePersistTimer: ReturnType<typeof setTimeout> | null = null;

  private cachedNotificationStateUserId: string | null = null;
  private cachedNotificationState: DateMiNotificationStateRow | null = null;

  private syncingLikes = false;
  private syncingCalls = false;
  private syncingChat = false;

  async initialize(params: InitializeParams): Promise<void> {
    const { userId, dateMiProfileId, chatClient } = params;

    const previousProfileId = this.dateMiProfileId;

    // Switching users: fully reset.
    if (this.initializedUserId && this.initializedUserId !== userId) {
      this.shutdown();
    }

    this.initializedUserId = userId;
    this.dateMiProfileId = dateMiProfileId ?? null;
    if (chatClient) this.chatClient = chatClient;

    // If the DateMi profile id changed (or became null), reset likes subscription.
    if (previousProfileId !== this.dateMiProfileId && this.likesChannel) {
      try {
        supabase.removeChannel(this.likesChannel);
      } catch {
        // ignore
      }
      this.likesChannel = null;
      this.processedLikeIds.clear();
    }

    this.ensureAppStateHandlers();
    this.ensureNetInfoHandlers();

    // Hydrate last known counts immediately (helps offline / cold start UX).
    await this.hydrateCachedCounts(userId).catch(() => {
      // ignore
    });

    // Initial sync is best-effort and should not crash the app.
    await Promise.all([
      this.refreshChatUnreadCount('init'),
      this.refreshLikesUnreadCount('init'),
      this.refreshMissedCallsCount('init'),
    ]).catch(() => {
      // ignore
    });

    // Real-time subscriptions (Supabase) are optional based on configuration.
    this.resubscribeRealtimeChannels();

    // Flush any pending state updates (offline clears, etc.)
    await this.flushPendingStateUpdates().catch(() => {
      // ignore
    });
  }

  /**
   * Provide/replace Stream Chat client after it becomes available.
   */
  bindChatClient(client: StreamChat | null): void {
    this.chatClient = client;
    this.scheduleChatUnreadRefresh('bindChatClient');
  }

  /**
   * Called from Stream Chat event handlers (message new, mark read, etc.).
   * Debounced to avoid excessive work.
   */
  onChatEvent(): void {
    this.scheduleChatUnreadRefresh('chatEvent');
  }

  /**
   * Clear DateMi message badge.
   *
   * We align backend truth by marking all DateMi channels read.
   */
  async clearMessages(): Promise<void> {
    store.dispatch(clearMessageBadge());
    this.schedulePersistCachedCounts();
    await this.markAllDateMiChannelsRead().catch(() => {
      // ignore
    });
    this.scheduleChatUnreadRefresh('clearMessages');
  }

  /**
   * Clear like alerts (DateMi only).
   */
  async clearLikes(): Promise<void> {
    store.dispatch(clearLikeBadge());
    this.schedulePersistCachedCounts();
    await this.persistStateUpdate({ likes_last_seen_at: new Date().toISOString() });
    this.scheduleLikesUnreadRefresh('clearLikes');
  }

  /**
   * Clear missed call alerts (DateMi only).
   */
  async clearMissedCalls(): Promise<void> {
    store.dispatch(clearMissedCallBadge());
    this.schedulePersistCachedCounts();
    await this.persistStateUpdate({ missed_calls_last_seen_at: new Date().toISOString() });
    this.scheduleMissedCallsRefresh('clearMissedCalls');
  }

  /**
   * Record a missed call immediately from the Stream Video client (when available).
   * This is deduped against Supabase realtime updates using `stream_call_cid`.
   */
  recordLocalMissedCall(streamCallCid: string | null | undefined): void {
    if (!streamCallCid) return;
    this.processedMissedCallStreamCids.add(streamCallCid);

    const current = (store.getState() as any)?.datemi?.notifications?.missedCalls ?? 0;
    store.dispatch(setMissedCalls(current + 1));
    this.scheduleMissedCallsRefresh('localCallMissed');
    this.schedulePersistCachedCounts();
  }

  shutdown(): void {
    this.initializedUserId = null;
    this.dateMiProfileId = null;
    this.chatClient = null;
    this.cachedNotificationStateUserId = null;
    this.cachedNotificationState = null;

    this.processedLikeIds.clear();
    this.processedMissedCallRowIds.clear();
    this.processedMissedCallStreamCids.clear();

    this.clearTimers();

    if (this.likesChannel) {
      try {
        supabase.removeChannel(this.likesChannel);
      } catch {
        // ignore
      }
      this.likesChannel = null;
    }

    if (this.callsChannel) {
      try {
        supabase.removeChannel(this.callsChannel);
      } catch {
        // ignore
      }
      this.callsChannel = null;
    }

    if (this.appStateSub) {
      this.appStateSub.remove();
      this.appStateSub = null;
    }
    if (this.netInfoUnsub) {
      this.netInfoUnsub();
      this.netInfoUnsub = null;
    }
  }

  // -------------------------
  // Realtime subscriptions
  // -------------------------

  private resubscribeRealtimeChannels(): void {
    if (!isSupabaseConfigured()) return;
    if (!this.initializedUserId) return;

    this.subscribeToLikesRealtime();
    this.subscribeToMissedCallsRealtime();
  }

  private subscribeToLikesRealtime(): void {
    if (!this.initializedUserId) return;
    if (!this.dateMiProfileId) return;
    if (!isSupabaseConfigured()) return;

    // Avoid duplicate subscriptions.
    if (this.likesChannel) return;

    const profileId = this.dateMiProfileId;

    this.likesChannel = supabase
      .channel(`datemi-likes-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'datemi_likes',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ id: string; created_at?: string | null }>) => {
          const id = (payload.new as any)?.id as string | undefined;
          if (!id) {
            this.scheduleLikesUnreadRefresh('likesInsertMissingId');
            return;
          }
          if (this.processedLikeIds.has(id)) return;
          this.processedLikeIds.add(id);

          // Fast path: increment locally, then reconcile from backend truth.
          const current = (store.getState() as any)?.datemi?.notifications?.newLikes ?? 0;
          store.dispatch(setNewLikes(current + 1));
          this.scheduleLikesUnreadRefresh('likesInsert');
          this.schedulePersistCachedCounts();
        }
      )
      .subscribe((status) => {
        // If the channel closes (network, app state), we re-create on next foreground.
        if (status === 'CLOSED') {
          this.likesChannel = null;
        }
      });
  }

  private subscribeToMissedCallsRealtime(): void {
    if (!this.initializedUserId) return;
    if (!isSupabaseConfigured()) return;

    if (this.callsChannel) return;

    const userId = this.initializedUserId;

    this.callsChannel = supabase
      .channel(`datemi-calls-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ id: string; status?: string | null }>) => {
          const nextStatus = (payload.new as any)?.status as string | undefined;
          if (nextStatus !== 'missed') return;

          const streamCallCid = (payload.new as any)?.stream_call_cid as string | undefined;
          if (streamCallCid && this.processedMissedCallStreamCids.has(streamCallCid)) return;

          const rowId = (payload.new as any)?.id as string | undefined;
          if (rowId && this.processedMissedCallRowIds.has(rowId)) return;
          if (rowId) this.processedMissedCallRowIds.add(rowId);
          if (streamCallCid) this.processedMissedCallStreamCids.add(streamCallCid);

          const current = (store.getState() as any)?.datemi?.notifications?.missedCalls ?? 0;
          store.dispatch(setMissedCalls(current + 1));
          this.scheduleMissedCallsRefresh('callMissedUpdate');
          this.schedulePersistCachedCounts();
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED') {
          this.callsChannel = null;
        }
      });
  }

  // -------------------------
  // Sync / refresh
  // -------------------------

  private scheduleChatUnreadRefresh(_reason: string): void {
    if (this.pendingChatRefreshTimer) clearTimeout(this.pendingChatRefreshTimer);
    this.pendingChatRefreshTimer = setTimeout(() => {
      this.refreshChatUnreadCount('debounced').catch(() => {
        // ignore
      });
    }, CHAT_REFRESH_DEBOUNCE_MS);
  }

  private scheduleLikesUnreadRefresh(_reason: string): void {
    if (this.pendingLikesRefreshTimer) clearTimeout(this.pendingLikesRefreshTimer);
    this.pendingLikesRefreshTimer = setTimeout(() => {
      this.refreshLikesUnreadCount('debounced').catch(() => {
        // ignore
      });
    }, LIKES_REFRESH_DEBOUNCE_MS);
  }

  private scheduleMissedCallsRefresh(_reason: string): void {
    if (this.pendingCallsRefreshTimer) clearTimeout(this.pendingCallsRefreshTimer);
    this.pendingCallsRefreshTimer = setTimeout(() => {
      this.refreshMissedCallsCount('debounced').catch(() => {
        // ignore
      });
    }, CALLS_REFRESH_DEBOUNCE_MS);
  }

  async refreshChatUnreadCount(_reason: string): Promise<void> {
    if (this.syncingChat) return;
    if (!this.initializedUserId) return;
    const client = this.chatClient;
    if (!client) return;
    const clientAny = client as any;

    this.syncingChat = true;
    try {
      const userId = this.initializedUserId;

      // DateMi channels are standard `messaging` channels with `datemi_conversation === true`.
      // For backwards compatibility, also match older DateMi channels that may only have
      // `user1_id` / `user2_id` custom fields, and any custom `datemi` channel type.
      const filter: Record<string, unknown> = {
        members: { $in: [userId] },
        $or: [
          { datemi_conversation: true },
          { user1_id: userId },
          { user2_id: userId },
          { type: 'datemi' },
        ],
      };

      let offset = 0;
      const limit = 50;
      let totalUnread = 0;

      for (let page = 0; page < 5; page++) {
        const channels: any[] = await clientAny.queryChannels(filter as any, { last_message_at: -1 } as any, {
          limit,
          offset,
          watch: false,
          presence: false,
          state: true,
          message_limit: 0,
        } as any);

        if (!channels || channels.length === 0) break;

        for (const channel of channels) {
          try {
            const data = channel.data as any;
            const isDateMi =
              data?.datemi_conversation === true ||
              data?.user1_id ||
              data?.user2_id ||
              channel.type === 'datemi';
            if (!isDateMi) continue;
            totalUnread += channel.countUnread();
          } catch {
            // ignore per-channel errors
          }
        }

        if (channels.length < limit) break;
        offset += limit;
      }

      store.dispatch(setUnreadMessages(totalUnread));
      this.schedulePersistCachedCounts();
    } finally {
      this.syncingChat = false;
    }
  }

  async refreshLikesUnreadCount(_reason: string): Promise<void> {
    if (this.syncingLikes) return;
    if (!this.initializedUserId) return;
    if (!this.dateMiProfileId) {
      store.dispatch(setNewLikes(0));
      this.schedulePersistCachedCounts();
      return;
    }
    if (!isSupabaseConfigured()) return;

    this.syncingLikes = true;
    try {
      const profileId = this.dateMiProfileId;
      const { likes_last_seen_at } = await this.getNotificationState(this.initializedUserId);

      // NOTE: Cast supabase to any to avoid TS "excessively deep" instantiation
      // with complex generated Database types.
      let query: any = (supabase as any)
        .from('datemi_likes')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      if (likes_last_seen_at) {
        query = query.gt('created_at', likes_last_seen_at);
      }

      const { count, error } = await query;
      if (error) return;

      store.dispatch(setNewLikes(count || 0));
      this.schedulePersistCachedCounts();
    } finally {
      this.syncingLikes = false;
    }
  }

  async refreshMissedCallsCount(_reason: string): Promise<void> {
    if (this.syncingCalls) return;
    if (!this.initializedUserId) return;
    if (!isSupabaseConfigured()) return;

    this.syncingCalls = true;
    try {
      const userId = this.initializedUserId;
      const { missed_calls_last_seen_at } = await this.getNotificationState(userId);

      // NOTE: Cast supabase to any to avoid TS "excessively deep" instantiation
      // with complex generated Database types.
      let query: any = (supabase as any)
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'missed');

      if (missed_calls_last_seen_at) {
        query = query.gt('updated_at', missed_calls_last_seen_at);
      }

      const { count, error } = await query;
      if (error) return;

      store.dispatch(setMissedCalls(count || 0));
      this.schedulePersistCachedCounts();
    } finally {
      this.syncingCalls = false;
    }
  }

  // -------------------------
  // Inbox signals (ConversationsScreen)
  // -------------------------

  /**
   * Fetch the raw DateMi notification items needed to render the combined
   * Conversations inbox (missed calls + likes) alongside chat messages.
   *
   * NOTE: This returns only *unseen* items based on the stored `*_last_seen_at`
   * cursors, matching how badge counts are computed.
   */
  async getInboxSignals(options?: {
    /** Safety cap for rows fetched from each table. */
    maxRowsPerTable?: number;
  }): Promise<{
    missedCallsByUserId: Record<
      string,
      { userId: string; latestAt: string; type: 'audio' | 'video'; count: number }
    >;
    likesByUserId: Record<
      string,
      { userId: string; latestAt: string; isSuperLike: boolean; count: number }
    >;
    profilesByUserId: Record<string, { userId: string; profileId: string; displayName: string; profileImage?: string }>;
  }> {
    const empty: {
      missedCallsByUserId: Record<string, { userId: string; latestAt: string; type: 'audio' | 'video'; count: number }>;
      likesByUserId: Record<string, { userId: string; latestAt: string; isSuperLike: boolean; count: number }>;
      profilesByUserId: Record<string, { userId: string; profileId: string; displayName: string; profileImage?: string }>;
    } = { missedCallsByUserId: {}, likesByUserId: {}, profilesByUserId: {} };

    if (!this.initializedUserId) return empty;
    if (!isSupabaseConfigured()) return empty;

    const userId = this.initializedUserId;
    const dateMiProfileId = this.dateMiProfileId;
    const maxRows = Math.max(25, Math.min(400, options?.maxRowsPerTable ?? 200));

    const missedCallsByUserId: Record<
      string,
      { userId: string; latestAt: string; type: 'audio' | 'video'; count: number }
    > = {};
    const likesByUserId: Record<
      string,
      { userId: string; latestAt: string; isSuperLike: boolean; count: number }
    > = {};
    const profilesByUserId: Record<
      string,
      { userId: string; profileId: string; displayName: string; profileImage?: string }
    > = {};

    const { likes_last_seen_at, missed_calls_last_seen_at } = await this.getNotificationState(userId);

    // Missed calls (receiver only)
    try {
      let query: any = (supabase as any)
        .from('calls')
        .select('caller_id,type,updated_at,created_at')
        .eq('receiver_id', userId)
        .eq('status', 'missed')
        .order('updated_at', { ascending: false })
        .limit(maxRows);

      if (missed_calls_last_seen_at) {
        query = query.gt('updated_at', missed_calls_last_seen_at);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const callerId = typeof row?.caller_id === 'string' ? row.caller_id : '';
          if (!callerId) continue;
          const rawType = typeof row?.type === 'string' ? row.type : '';
          const callType = rawType === 'video' ? 'video' : 'audio';
          const latestAt =
            (typeof row?.updated_at === 'string' && row.updated_at) ||
            (typeof row?.created_at === 'string' && row.created_at) ||
            new Date().toISOString();

          const existing = missedCallsByUserId[callerId];
          if (!existing) {
            missedCallsByUserId[callerId] = { userId: callerId, latestAt, type: callType, count: 1 };
            continue;
          }
          existing.count += 1;
          if (new Date(latestAt).getTime() > new Date(existing.latestAt).getTime()) {
            existing.latestAt = latestAt;
            existing.type = callType;
          }
        }
      }
    } catch {
      // ignore inbox missed-call failures
    }

    // Likes received (profile_id = my DateMi profile)
    if (dateMiProfileId) {
      try {
        let query: any = (supabase as any)
          .from('datemi_likes')
          .select('user_id,is_super_like,created_at')
          .eq('profile_id', dateMiProfileId)
          .order('created_at', { ascending: false })
          .limit(maxRows);

        if (likes_last_seen_at) {
          query = query.gt('created_at', likes_last_seen_at);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          for (const row of data) {
            const likerUserId = typeof row?.user_id === 'string' ? row.user_id : '';
            if (!likerUserId) continue;
            const createdAt =
              (typeof row?.created_at === 'string' && row.created_at) || new Date().toISOString();
            const isSuperLike = row?.is_super_like === true;

            const existing = likesByUserId[likerUserId];
            if (!existing) {
              likesByUserId[likerUserId] = {
                userId: likerUserId,
                latestAt: createdAt,
                isSuperLike,
                count: 1,
              };
              continue;
            }
            existing.count += 1;
            if (new Date(createdAt).getTime() > new Date(existing.latestAt).getTime()) {
              existing.latestAt = createdAt;
              existing.isSuperLike = isSuperLike;
            }
          }
        }
      } catch {
        // ignore inbox likes failures
      }
    }

    const userIds = Array.from(
      new Set([...Object.keys(missedCallsByUserId), ...Object.keys(likesByUserId)].filter(Boolean))
    );

    // Minimal profiles for rendering rows / CTAs
    if (userIds.length > 0) {
      const pickProfileImage = (row: any): string | undefined => {
        const pics = Array.isArray(row?.profile_pictures) ? row.profile_pictures : null;
        if (pics) {
          const found = pics.find((p: any) => typeof p === 'string' && /^https?:\/\//i.test(p));
          if (typeof found === 'string') return found;
        }
        const fallback = typeof row?.profile_image_url === 'string' ? row.profile_image_url : '';
        return /^https?:\/\//i.test(fallback) ? fallback : undefined;
      };

      const chunkSize = 50;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        try {
          const { data, error } = await (supabase as any)
            .from('date_mi_profiles_with_tier')
            .select('id,user_id,display_name,profile_pictures,profile_image_url')
            .in('user_id', chunk);

          if (error || !Array.isArray(data)) continue;

          for (const row of data) {
            const rowUserId = typeof row?.user_id === 'string' ? row.user_id : '';
            const profileId = typeof row?.id === 'string' ? row.id : '';
            const displayName = typeof row?.display_name === 'string' ? row.display_name : '';
            if (!rowUserId || !profileId) continue;
            profilesByUserId[rowUserId] = {
              userId: rowUserId,
              profileId,
              displayName: displayName || 'User',
              profileImage: pickProfileImage(row),
            };
          }
        } catch {
          // ignore profile fetch errors
        }
      }
    }

    return { missedCallsByUserId, likesByUserId, profilesByUserId };
  }

  private async markAllDateMiChannelsRead(): Promise<void> {
    if (!this.initializedUserId) return;
    const client = this.chatClient;
    if (!client) return;
    const clientAny = client as any;

    const userId = this.initializedUserId;
    const filter: Record<string, unknown> = {
      members: { $in: [userId] },
      $or: [
        { datemi_conversation: true },
        { user1_id: userId },
        { user2_id: userId },
        { type: 'datemi' },
      ],
    };

    const channels: any[] = await clientAny.queryChannels(filter as any, { last_message_at: -1 } as any, {
      limit: 100,
      offset: 0,
      watch: false,
      presence: false,
      state: true,
      message_limit: 0,
    } as any);

    await Promise.all(
      (channels || []).map(async (channel) => {
        const data = channel.data as any;
        const isDateMi =
          data?.datemi_conversation === true || data?.user1_id || data?.user2_id || channel.type === 'datemi';
        if (!isDateMi) return;
        const unread = typeof channel.countUnread === 'function' ? channel.countUnread() : 0;
        if (!unread || unread <= 0) return;
        try {
          await channel.markRead();
        } catch {
          // ignore
        }
      })
    );
  }

  // -------------------------
  // Backend state persistence
  // -------------------------

  private getPendingStateUpdateKey(userId: string): string {
    return `${STORAGE_KEYS.pendingStateUpdatePrefix}${userId}`;
  }

  private async getNotificationState(
    userId: string,
    options?: { force?: boolean }
  ): Promise<DateMiNotificationStateRow> {
    if (
      !options?.force &&
      this.cachedNotificationStateUserId === userId &&
      this.cachedNotificationState
    ) {
      return this.cachedNotificationState;
    }

    if (!isSupabaseConfigured()) {
      const fallback: DateMiNotificationStateRow = {
        user_id: userId,
        likes_last_seen_at: null,
        missed_calls_last_seen_at: null,
      };
      this.cachedNotificationStateUserId = userId;
      this.cachedNotificationState = fallback;
      return fallback;
    }

    try {
      const { data, error } = await ((supabase as any)
        .from('datemi_notification_states')
        .select('user_id,likes_last_seen_at,missed_calls_last_seen_at')
        .eq('user_id', userId)
        .maybeSingle() as any);

      if (error || !data) {
        const fallback: DateMiNotificationStateRow = {
          user_id: userId,
          likes_last_seen_at: null,
          missed_calls_last_seen_at: null,
        };
        this.cachedNotificationStateUserId = userId;
        this.cachedNotificationState = fallback;
        return fallback;
      }

      const row: DateMiNotificationStateRow = {
        user_id: data.user_id,
        likes_last_seen_at: data.likes_last_seen_at ?? null,
        missed_calls_last_seen_at: data.missed_calls_last_seen_at ?? null,
      };
      this.cachedNotificationStateUserId = userId;
      this.cachedNotificationState = row;
      return row;
    } catch {
      const fallback: DateMiNotificationStateRow = {
        user_id: userId,
        likes_last_seen_at: null,
        missed_calls_last_seen_at: null,
      };
      this.cachedNotificationStateUserId = userId;
      this.cachedNotificationState = fallback;
      return fallback;
    }
  }

  private async persistStateUpdate(update: PendingStateUpdate): Promise<void> {
    if (!this.initializedUserId) return;
    const userId = this.initializedUserId;

    // Update in-memory cache immediately so UI doesn't "bounce back" while offline.
    const existing =
      this.cachedNotificationStateUserId === userId && this.cachedNotificationState
        ? this.cachedNotificationState
        : { user_id: userId, likes_last_seen_at: null, missed_calls_last_seen_at: null };
    const nextCached: DateMiNotificationStateRow = {
      user_id: userId,
      likes_last_seen_at:
        typeof update.likes_last_seen_at === 'string' ? update.likes_last_seen_at : existing.likes_last_seen_at,
      missed_calls_last_seen_at:
        typeof update.missed_calls_last_seen_at === 'string'
          ? update.missed_calls_last_seen_at
          : existing.missed_calls_last_seen_at,
    };
    this.cachedNotificationStateUserId = userId;
    this.cachedNotificationState = nextCached;

    if (!isSupabaseConfigured()) return;

    try {
      const payload: Record<string, unknown> = {
        user_id: userId,
        ...update,
        // Optional cached counts (kept consistent when we explicitly clear)
        ...(update.likes_last_seen_at ? { unread_likes_count: 0 } : {}),
        ...(update.missed_calls_last_seen_at ? { missed_calls_count: 0 } : {}),
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await ((supabase as any)
        .from('datemi_notification_states')
        .upsert(payload, { onConflict: 'user_id' }) as any);

      if (error) {
        await this.enqueuePendingStateUpdate(userId, update);
        return;
      }

      // If we successfully persisted, clear any pending local update.
      await AsyncStorage.removeItem(this.getPendingStateUpdateKey(userId)).catch(() => {
        // ignore
      });
    } catch {
      await this.enqueuePendingStateUpdate(userId, update);
    }
  }

  private async enqueuePendingStateUpdate(userId: string, update: PendingStateUpdate): Promise<void> {
    try {
      const key = this.getPendingStateUpdateKey(userId);
      const raw = await AsyncStorage.getItem(key);
      const existing: PendingStateUpdate = raw ? JSON.parse(raw) : {};
      const merged: PendingStateUpdate = { ...existing, ...update };
      await AsyncStorage.setItem(key, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }

  private async flushPendingStateUpdates(): Promise<void> {
    if (!this.initializedUserId) return;
    const userId = this.initializedUserId;
    if (!isSupabaseConfigured()) return;

    const key = this.getPendingStateUpdateKey(userId);
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;
      const pending: PendingStateUpdate = JSON.parse(raw);
      if (!pending || typeof pending !== 'object') return;

      const payload: Record<string, unknown> = {
        user_id: userId,
        ...pending,
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await ((supabase as any)
        .from('datemi_notification_states')
        .upsert(payload, { onConflict: 'user_id' }) as any);

      if (error) return;

      // Update cache
      const existing = await this.getNotificationState(userId);
      this.cachedNotificationStateUserId = userId;
      this.cachedNotificationState = {
        user_id: userId,
        likes_last_seen_at:
          typeof pending.likes_last_seen_at === 'string' ? pending.likes_last_seen_at : existing.likes_last_seen_at,
        missed_calls_last_seen_at:
          typeof pending.missed_calls_last_seen_at === 'string'
            ? pending.missed_calls_last_seen_at
            : existing.missed_calls_last_seen_at,
      };

      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  // -------------------------
  // App lifecycle handlers
  // -------------------------

  private ensureAppStateHandlers(): void {
    if (this.appStateSub) return;

    this.appStateSub = AppState.addEventListener('change', (nextState) => {
      const wasBackground = this.appStateRef.match(/inactive|background/);
      const isNowActive = nextState === 'active';
      this.appStateRef = nextState;

      if (wasBackground && isNowActive) {
        // Reconcile counts (no polling; just a single refresh on foreground).
        this.refreshChatUnreadCount('foreground').catch(() => {});
        this.refreshLikesUnreadCount('foreground').catch(() => {});
        this.refreshMissedCallsCount('foreground').catch(() => {});
        // Re-establish realtime channels if they were closed.
        this.resubscribeRealtimeChannels();
        // Flush pending state updates if any.
        this.flushPendingStateUpdates().catch(() => {});
      }
    });
  }

  private ensureNetInfoHandlers(): void {
    if (this.netInfoUnsub) return;

    this.netInfoUnsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.flushPendingStateUpdates().catch(() => {
          // ignore
        });
      }
    });
  }

  // -------------------------
  // Offline-friendly caching
  // -------------------------

  private getCachedCountsKey(userId: string): string {
    return `${STORAGE_KEYS.cachedCountsPrefix}${userId}`;
  }

  private async hydrateCachedCounts(userId: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.getCachedCountsKey(userId));
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<CachedCounts> | null;
      if (!parsed || parsed.userId !== userId) return;

      const unreadMessages = typeof parsed.unreadMessages === 'number' ? parsed.unreadMessages : 0;
      const newLikes = typeof parsed.newLikes === 'number' ? parsed.newLikes : 0;
      const missedCalls = typeof parsed.missedCalls === 'number' ? parsed.missedCalls : 0;
      const lastSyncedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;

      store.dispatch(
        syncNotificationCounts({
          unreadMessages,
          newLikes,
          missedCalls,
          lastSyncedAt,
        })
      );
    } catch {
      // ignore
    }
  }

  private schedulePersistCachedCounts(): void {
    if (!this.initializedUserId) return;
    if (this.pendingCachePersistTimer) clearTimeout(this.pendingCachePersistTimer);
    this.pendingCachePersistTimer = setTimeout(() => {
      this.persistCachedCountsNow().catch(() => {
        // ignore
      });
    }, 650);
  }

  private async persistCachedCountsNow(): Promise<void> {
    if (!this.initializedUserId) return;
    const userId = this.initializedUserId;
    const n = (store.getState() as any)?.datemi?.notifications as
      | { unreadMessages: number; newLikes: number; missedCalls: number }
      | undefined;
    if (!n) return;

    const payload: CachedCounts = {
      userId,
      unreadMessages: typeof n.unreadMessages === 'number' ? n.unreadMessages : 0,
      newLikes: typeof n.newLikes === 'number' ? n.newLikes : 0,
      missedCalls: typeof n.missedCalls === 'number' ? n.missedCalls : 0,
      savedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(this.getCachedCountsKey(userId), JSON.stringify(payload));
  }

  private clearTimers(): void {
    if (this.pendingChatRefreshTimer) clearTimeout(this.pendingChatRefreshTimer);
    if (this.pendingLikesRefreshTimer) clearTimeout(this.pendingLikesRefreshTimer);
    if (this.pendingCallsRefreshTimer) clearTimeout(this.pendingCallsRefreshTimer);
    this.pendingChatRefreshTimer = null;
    this.pendingLikesRefreshTimer = null;
    this.pendingCallsRefreshTimer = null;
    if (this.pendingCachePersistTimer) clearTimeout(this.pendingCachePersistTimer);
    this.pendingCachePersistTimer = null;

    // Defensive: Android can keep timers alive longer in background; avoid leaks.
    if (Platform.OS === 'android') {
      // no-op: placeholder for any platform-specific timer cleanup if needed
    }
  }
}

export const dateMiNotificationManager = new DateMiNotificationManager();
export default dateMiNotificationManager;

