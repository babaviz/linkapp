import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Channel } from 'stream-chat';
import type { StreamChat } from 'stream-chat';
import { InteractionManager } from 'react-native';
import { streamChatService } from './streamChatService';

export type ChatChannelSnapshotItem = {
  cid: string;
  type: string;
  id: string;
  name: string;
  image?: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount: number;
  /** Member user IDs (usually 2 for 1:1). */
  memberIds?: string[];
  /**
   * Minimal channel data used to render the correct label/icon for app modules.
   * Keep this small to avoid bloating AsyncStorage.
   */
  data?: Record<string, unknown>;
};

export type ChatChannelListSnapshot = {
  version: 1;
  userId: string;
  savedAtMs: number;
  channels: ChatChannelSnapshotItem[];
};

const SNAPSHOT_VERSION = 1 as const;
const STORAGE_KEY_PREFIX = 'chat_channel_list_snapshot_v1:';

// Keep persistence lightweight and bounded.
const MAX_SNAPSHOT_CHANNELS = 120;
const DEFAULT_PREFETCH_LIMIT = 80;
const DEFAULT_WARM_CHANNEL_COUNT = 5;
const PERSIST_DEBOUNCE_MS = 800;

function safeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function pickMinimalChannelData(data: unknown): Record<string, unknown> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  // Only the fields we use to derive per-module labels/icons and DateMi naming.
  const keys = [
    'name',
    'image',
    // DateMi naming flags/ids
    'datemi_conversation',
    'user1_id',
    'user1_name',
    'user2_id',
    'user2_name',
    // Property metadata
    'property_id',
    'property_title',
    'property_location',
    // Job metadata
    'job_id',
    'job_title',
    'job_company',
    // Service metadata
    'service_id',
    'service_name',
    'service_category',
  ] as const;

  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (d[key] !== undefined) out[key] = d[key];
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function getLastMessagePreview(channel: Channel): { text?: string; createdAt?: string } {
  const last = channel.lastMessage() as { text?: string; created_at?: Date | string; attachments?: unknown[] } | undefined;
  const text =
    safeString(last?.text) ||
    (Array.isArray(last?.attachments) && last.attachments.length > 0 ? 'Media message' : '');

  const createdAtRaw = last?.created_at;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : typeof createdAtRaw === 'string'
        ? createdAtRaw
        : undefined;

  return { text: text || undefined, createdAt };
}

function deriveDisplayName(channel: Channel, currentUserId?: string | null): string {
  const data = (channel.data || {}) as Record<string, unknown>;
  const isDateMi =
    data?.datemi_conversation === true || !!data?.user1_id || !!data?.user2_id || channel.type === 'datemi';

  const channelName = safeString(data?.name);

  if (isDateMi && currentUserId) {
    const user1Id = safeString(data?.user1_id);
    const user2Id = safeString(data?.user2_id);
    const user1Name = safeString(data?.user1_name);
    const user2Name = safeString(data?.user2_name);
    const otherName =
      user1Id && user2Id
        ? currentUserId === user1Id
          ? user2Name
          : currentUserId === user2Id
            ? user1Name
            : ''
        : '';
    if (otherName) return otherName;
  }

  if (channelName && !isDateMi) return channelName;

  try {
    const members = Object.values(channel.state.members || {});
    const me = currentUserId || (channel as any)?._client?.userID || (channel as any)?._client?.userId || '';
    const others = members.filter((m: any) => m?.user_id && m.user_id !== me);
    if (others.length > 0) {
      const names = others
        .map((m: any) => safeString(m?.user?.name) || safeString(m?.user_id) || 'User')
        .filter(Boolean);
      if (names.length > 0) return names.join(', ');
    }
  } catch {
    // ignore
  }

  return channelName || 'Chat';
}

function parseCid(cid: string): { type: string; id: string } | null {
  const trimmed = safeString(cid);
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const [type, id] = parts;
  if (!type || !id) return null;
  return { type, id };
}

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

class ChatPrefetchService {
  private activeUserId: string | null = null;
  private client: StreamChat | null = null;
  private snapshot: ChatChannelListSnapshot | null = null;
  private listeners: Set<(snapshot: ChatChannelListSnapshot | null) => void> = new Set();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private prefetchPromise: Promise<void> | null = null;
  private boundEventHandlers:
    | {
        onMessageNew: (event: any) => void;
        onMessageUpdated: (event: any) => void;
        onMarkRead: (event: any) => void;
      }
    | null = null;

  subscribe(listener: (snapshot: ChatChannelListSnapshot | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  shutdown(): void {
    this.reset();
    this.emit();
  }

  async clearPersistedSnapshot(userId: string): Promise<void> {
    const normalized = safeString(userId);
    if (!normalized) return;
    try {
      await AsyncStorage.removeItem(getStorageKey(normalized));
    } catch {
      // ignore
    }

    if (this.activeUserId === normalized) {
      this.snapshot = null;
      this.emit();
    }
  }

  getSnapshot(): ChatChannelListSnapshot | null {
    return this.snapshot;
  }

  getPrefetchedChannels(): Channel[] {
    // When connected, StreamChatService already holds the canonical channel objects.
    // Prefetch consumers should prefer those for navigation.
    const snap = this.snapshot;
    if (!snap) return [];
    const out: Channel[] = [];
    for (const item of snap.channels) {
      const ch = streamChatService.getCachedChannelByCid(item.cid);
      if (ch) out.push(ch);
    }
    return out;
  }

  async hydrateCachedSnapshot(userId: string): Promise<void> {
    const normalizedUserId = safeString(userId);
    if (!normalizedUserId) return;
    this.activeUserId = normalizedUserId;

    try {
      const raw = await AsyncStorage.getItem(getStorageKey(normalizedUserId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatChannelListSnapshot | null;
      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.version !== SNAPSHOT_VERSION) return;
      if (parsed.userId !== normalizedUserId) return;
      if (!Array.isArray(parsed.channels)) return;

      this.snapshot = parsed;
      this.emit();
    } catch {
      // ignore
    }
  }

  bindClient(params: { userId: string; client: StreamChat | null }): void {
    const nextUserId = safeString(params.userId);
    const nextClient = params.client;

    // User switched -> reset state and unbind old handlers.
    if (this.activeUserId && nextUserId && this.activeUserId !== nextUserId) {
      this.reset();
    }

    this.activeUserId = nextUserId || this.activeUserId;
    this.client = nextClient;

    if (!this.client) {
      this.unbindClientListeners();
      return;
    }

    this.bindClientListeners();
  }

  async prefetchAfterConnect(options?: { limit?: number; warmChannelCount?: number }): Promise<void> {
    if (this.prefetchPromise) return this.prefetchPromise;

    const userId = this.activeUserId;
    if (!userId) return;
    if (!this.client) return;

    const limit = Math.max(1, Math.min(options?.limit ?? DEFAULT_PREFETCH_LIMIT, MAX_SNAPSHOT_CHANNELS));
    const warmChannelCount = Math.max(0, Math.min(options?.warmChannelCount ?? DEFAULT_WARM_CHANNEL_COUNT, 10));

    this.prefetchPromise = (async () => {
      // 1) Query channel list (lightweight: no watch) so list screens render instantly.
      const channels = await streamChatService.getUserChannels(limit);
      const snapshot = this.buildSnapshotFromChannels(userId, channels);
      this.snapshot = snapshot;
      this.emit();
      this.schedulePersist();

      // 2) Warm top channels in the background (subscribe + hydrate recent messages).
      if (warmChannelCount > 0) {
        const top = channels.slice(0, warmChannelCount);
        InteractionManager.runAfterInteractions(() => {
          for (const ch of top) {
            try {
              // Watch in background; do not await to keep this non-blocking.
              ch.watch({ state: true, presence: true, message_limit: 25 } as any).catch(() => {});
            } catch {
              // ignore
            }
          }
        });
      }
    })().finally(() => {
      this.prefetchPromise = null;
    });

    return this.prefetchPromise;
  }

  private buildSnapshotFromChannels(userId: string, channels: Channel[]): ChatChannelListSnapshot {
    const items: ChatChannelSnapshotItem[] = [];

    for (const channel of channels.slice(0, MAX_SNAPSHOT_CHANNELS)) {
      const cid = safeString(channel?.cid);
      const parsedCid = cid ? parseCid(cid) : null;
      if (!cid || !parsedCid) continue;

      const memberIds = (() => {
        try {
          const members = channel.state?.members || {};
          const ids = Object.keys(members).filter(Boolean);
          return ids.length > 0 ? ids : undefined;
        } catch {
          return undefined;
        }
      })();

      const unreadCount = (() => {
        try {
          return channel.countUnread();
        } catch {
          return 0;
        }
      })();

      const last = getLastMessagePreview(channel);
      const name = deriveDisplayName(channel, userId);
      const data = pickMinimalChannelData(channel.data);
      const image = safeString((channel.data as any)?.image) || safeString((data as any)?.image) || undefined;

      items.push({
        cid,
        type: parsedCid.type,
        id: parsedCid.id,
        name,
        image,
        lastMessageText: last.text,
        lastMessageAt: last.createdAt,
        unreadCount,
        memberIds,
        data,
      });
    }

    // Sort by last activity (lastMessageAt fallback to channel.updated_at).
    items.sort((a, b) => {
      const aTimeRaw = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bTimeRaw = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      const aTime = Number.isFinite(aTimeRaw) ? aTimeRaw : 0;
      const bTime = Number.isFinite(bTimeRaw) ? bTimeRaw : 0;
      return bTime - aTime;
    });

    return {
      version: SNAPSHOT_VERSION,
      userId,
      savedAtMs: Date.now(),
      channels: items,
    };
  }

  private bindClientListeners(): void {
    if (!this.client) return;
    if (this.boundEventHandlers) return;

    const updateFromEvent = (event: any) => {
      const cid = safeString(event?.cid) || (event?.channel_type && event?.channel_id ? `${event.channel_type}:${event.channel_id}` : '');
      if (!cid) return;

      const snap = this.snapshot;
      if (!snap || snap.userId !== this.activeUserId) return;

      const index = snap.channels.findIndex((c) => c.cid === cid);
      if (index === -1) return;

      const channel = streamChatService.getCachedChannelByCid(cid);
      const unreadCount = channel ? (() => { try { return channel.countUnread(); } catch { return snap.channels[index].unreadCount; } })() : snap.channels[index].unreadCount;

      const message = event?.message;
      const previewText =
        safeString(message?.text) ||
        (Array.isArray(message?.attachments) && message.attachments.length > 0 ? 'Media message' : '');
      const createdAtRaw = message?.created_at;
      const createdAt =
        createdAtRaw instanceof Date
          ? createdAtRaw.toISOString()
          : typeof createdAtRaw === 'string'
            ? createdAtRaw
            : undefined;

      const updated: ChatChannelSnapshotItem = {
        ...snap.channels[index],
        lastMessageText: previewText || snap.channels[index].lastMessageText,
        lastMessageAt: createdAt || snap.channels[index].lastMessageAt,
        unreadCount,
      };

      const nextChannels = snap.channels.slice();
      nextChannels.splice(index, 1);
      nextChannels.unshift(updated);
      this.snapshot = { ...snap, channels: nextChannels, savedAtMs: Date.now() };
      this.emit();
      this.schedulePersist();
    };

    const onMarkRead = (event: any) => {
      const cid = safeString(event?.cid) || (event?.channel_type && event?.channel_id ? `${event.channel_type}:${event.channel_id}` : '');
      if (!cid) return;

      const snap = this.snapshot;
      if (!snap || snap.userId !== this.activeUserId) return;

      const index = snap.channels.findIndex((c) => c.cid === cid);
      if (index === -1) return;

      const nextChannels = snap.channels.slice();
      nextChannels[index] = { ...nextChannels[index], unreadCount: 0 };
      this.snapshot = { ...snap, channels: nextChannels, savedAtMs: Date.now() };
      this.emit();
      this.schedulePersist();
    };

    const handlers = {
      onMessageNew: updateFromEvent,
      onMessageUpdated: updateFromEvent,
      onMarkRead,
    };
    this.boundEventHandlers = handlers;

    this.client.on('message.new', handlers.onMessageNew);
    this.client.on('message.updated', handlers.onMessageUpdated);
    this.client.on('notification.message_new', handlers.onMessageNew);
    this.client.on('notification.mark_read', handlers.onMarkRead);
  }

  private unbindClientListeners(): void {
    if (!this.client || !this.boundEventHandlers) return;
    const h = this.boundEventHandlers;
    this.boundEventHandlers = null;
    try {
      this.client.off('message.new', h.onMessageNew);
      this.client.off('message.updated', h.onMessageUpdated);
      this.client.off('notification.message_new', h.onMessageNew);
      this.client.off('notification.mark_read', h.onMarkRead);
    } catch {
      // ignore
    }
  }

  private schedulePersist(): void {
    if (!this.activeUserId || !this.snapshot) return;
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persistSnapshot().catch(() => {});
    }, PERSIST_DEBOUNCE_MS);
  }

  private async persistSnapshot(): Promise<void> {
    const userId = this.activeUserId;
    const snapshot = this.snapshot;
    if (!userId || !snapshot) return;
    if (snapshot.userId !== userId) return;

    try {
      await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(snapshot));
    } catch {
      // ignore
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot);
      } catch {
        // ignore
      }
    }
  }

  private reset(): void {
    this.unbindClientListeners();
    this.activeUserId = null;
    this.client = null;
    this.snapshot = null;
    this.prefetchPromise = null;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }
}

export const chatPrefetchService = new ChatPrefetchService();

