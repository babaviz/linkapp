/**
 * Stream Chat Service for LinkApp
 * 
 * This service handles all Stream Chat operations including:
 * - Client initialization and connection
 * - Channel management
 * - Message sending and receiving
 * - User presence and status
 * - Integration with app modules
 */

import { StreamChat, Channel, ChannelData, Event, Attachment } from 'stream-chat';
import { streamTokenService, StreamUserData, StreamTokenService } from './streamTokenService';
import { ENV } from '../config/environment';
import { Platform } from 'react-native';

export type ChannelType = 
  | 'property'
  | 'job' 
  | 'service' 
  | 'datemi' 
  | 'messaging' 
  | 'support'
  | 'group';

export interface ChatChannelInfo {
  id: string;
  type: ChannelType;
  name?: string;
  image?: string;
  members?: string[];
  data?: Record<string, unknown>;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  user?: StreamUserData;
}

export interface MessageData {
  text?: string;
  attachments?: Attachment[];
  mentioned_users?: string[];
  parent_id?: string;
  show_in_channel?: boolean;
  custom?: Record<string, unknown>;
}

class StreamChatService {
  private client: StreamChat | null = null;
  private currentUser: StreamUserData | null = null;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isConnecting: false
  };
  private connectionListeners: ((status: ConnectionStatus) => void)[] = [];
  private channels: Map<string, Channel> = new Map();
  private channelsByCid: Map<string, Channel> = new Map();
  private initializePromise: Promise<ConnectionStatus> | null = null;
  private recoverPromise: Promise<ConnectionStatus> | null = null;

  // Stable handler refs to avoid duplicate listeners on re-init.
  private connectionChangedHandler: ((event: Event) => void) | null = null;
  private connectionRecoveredHandler: (() => void) | null = null;
  private connectionRecoveringHandler: (() => void) | null = null;
  private userPresenceChangedHandler: ((event: Event) => void) | null = null;

  private getNormalizedMemberIds(memberIds: Array<string | undefined | null>): string[] {
    return Array.from(
      new Set(
        memberIds
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );
  }

  private buildListingConversationChannelId(
    scope: 'property' | 'job' | 'service',
    listingId: string,
    userAId: string,
    userBId: string
  ): string {
    const maybeFactory = (StreamTokenService as any)?.createListingConversationChannelId;
    if (typeof maybeFactory === 'function') {
      return maybeFactory(scope, listingId, userAId, userBId);
    }

    // Backward-compatible fallback for tests/legacy mocks.
    const ids = this.getNormalizedMemberIds([userAId, userBId]).sort();
    return `${scope}_${listingId}_${ids.join('_')}`;
  }

  private getApiKey(): string {
    const fromEnv = ENV.STREAM_CHAT_API_KEY;
    if (fromEnv && fromEnv.trim() !== '') return fromEnv;

    // Dev fallback only: allow using the repo's `chatConfig.js` constant if env isn't wired.
    // Never do this in production builds.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cfg = require('../chatConfig.js') as { chatApiKey?: string };
        if (cfg?.chatApiKey && cfg.chatApiKey.trim() !== '') {
          return cfg.chatApiKey;
        }
      } catch (_e) {
        void _e;
      }
    }

    return '';
  }

  /**
   * Initialize Stream Chat client and connect user with retry logic
   */
  async initialize(options: { maxRetries?: number; skipRecovery?: boolean } = {}): Promise<ConnectionStatus> {
    if (this.connectionStatus.isConnected && this.client) {
      return this.connectionStatus;
    }

    // If we already have a client + user, prefer recovering the websocket
    // instead of disconnecting/re-initializing the SDK (keeps offline queue/state stable).
    if (!options.skipRecovery && this.client) {
      const userId =
        this.currentUser?.id ||
        (this.client as any)?.userID ||
        (this.client as any)?.userId;
      if (userId) {
        return await this.recoverConnection({ maxRetries: options.maxRetries ?? 1 });
      }
    }

    // De-dupe concurrent calls (common during auth/app-state transitions)
    if (this.initializePromise) {
      return this.initializePromise;
    }

    // Clear any previous errors when starting a fresh connection attempt
    this.setConnectionStatus({ isConnecting: true, isConnected: false, error: undefined });

    const maxRetries = options.maxRetries ?? 2;

    this.initializePromise = (async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await this.initializeInternal({ forceDisconnect: Boolean(options.skipRecovery) });
        } catch (e) {
          lastError = e instanceof Error ? e : new Error('Failed to initialize Stream Chat');
          
          // Check if this is a retryable error
          const isRetryable = lastError.message.includes('token used before issue') ||
                             lastError.message.includes('JWTAuth error') ||
                             lastError.message.includes('iat') ||
                             lastError.message.includes('network') ||
                             lastError.message.includes('timeout') ||
                             lastError.message.includes('timed out');
          
          if (isRetryable && attempt < maxRetries) {
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
            continue;
          }
          
          // Not retryable or max retries reached
          break;
        }
      }

      // All retries failed
      const message = lastError?.message || 'Failed to initialize Stream Chat';

      const isNetworkError =
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('timeout') ||
        message.toLowerCase().includes('timed out') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('websocket');

      // IMPORTANT (offline support):
      // Do NOT nuke the client/offline DB on network errors. Keep local state so users can
      // still browse cached messages and queue actions for retry after reconnect.
      if (isNetworkError) {
        this.setConnectionStatus({
          isConnected: false,
          isConnecting: false,
          error: message,
          user: this.connectionStatus.user || this.currentUser || undefined,
        });
        return this.connectionStatus;
      }

      // Fatal errors: best-effort cleanup so a retry can succeed.
      try {
        await this.client?.disconnectUser();
      } catch (_e) {
        void _e;
      }
      this.client = null;
      this.currentUser = null;
      this.channels.clear();

      this.setConnectionStatus({
        isConnected: false,
        isConnecting: false,
        error: message,
      });

      return this.connectionStatus;
    })();

    try {
      return await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }

  /**
   * Internal implementation of initialize (called by retry wrapper)
   */
  private async initializeInternal(options: { forceDisconnect?: boolean } = {}): Promise<ConnectionStatus> {
    // Get user token from our token service
    const tokenResponse = await streamTokenService.generateTokenForCurrentUser();

    if (!tokenResponse.success || !tokenResponse.token || !tokenResponse.user) {
      throw new Error(tokenResponse.error || 'Failed to generate token');
    }

    // Store user early so callers can render offline UI even if connectUser fails.
    this.currentUser = tokenResponse.user;
    this.setConnectionStatus({ user: tokenResponse.user });

    // Prefer server-provided apiKey to guarantee it matches the secret used to sign tokens.
    const apiKey = tokenResponse.apiKey || this.getApiKey();
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'Stream Chat API key not configured. Please set EXPO_PUBLIC_STREAM_CHAT_API_KEY in your .env file.'
      );
    }

    const existingUserId = (this.client as any)?.userID || (this.client as any)?.userId;
    const shouldDisconnect =
      options.forceDisconnect === true ||
      (existingUserId && existingUserId !== tokenResponse.user.id);

    // Ensure any previous client instance is disconnected before switching users / forcing reconnect.
    if (this.client && shouldDisconnect) {
      try {
        await this.client.disconnectUser();
      } catch (_e) {
        void _e;
      } finally {
        this.client = null;
      }
      this.channels.clear();
    }

    // Initialize Stream Chat client
    const { StreamChat: StreamChatClass } = await import('stream-chat');
    // IMPORTANT: Use singleton instance to avoid multiple websocket connections.
    // We only call getInstance at runtime (not module scope) to avoid early-init crashes.
    this.client = StreamChatClass.getInstance(apiKey, { timeout: 6000, warmUp: true } as any);

    // Connect user to Stream Chat
    const initialToken = tokenResponse.token;
    let usedInitial = false;
    const tokenProvider = async (): Promise<string> => {
      if (!usedInitial && initialToken) {
        usedInitial = true;
        return initialToken;
      }
      const refreshed = await streamTokenService.generateTokenForCurrentUser();
      if (!refreshed.success || !refreshed.token) {
        throw new Error(refreshed.error || 'Failed to refresh chat token');
      }
      return refreshed.token;
    };

    await this.client.connectUser(tokenResponse.user, tokenProvider);

    this.currentUser = tokenResponse.user;

    // Set up event listeners
    this.setupEventListeners();

    // Best-effort push registration (native APNs/FCM token).
    // This enables Stream to send push notifications for message events when configured
    // in the Stream dashboard. It is safe to fail silently (e.g. simulator / permissions).
    await this.tryRegisterDeviceForPushNotifications().catch((_e) => {
      void _e;
    });

    this.setConnectionStatus({
      isConnected: true,
      isConnecting: false,
      user: tokenResponse.user,
      error: undefined,
    });

    return this.connectionStatus;
  }

  /**
   * Register this device for Stream push notifications (FCM/APNs).
   *
   * IMPORTANT:
   * - This uses the *native device push token* (not the Expo push token).
   * - Requires Stream push credentials set up in Stream Dashboard.
   * - Safe no-op on simulators, missing permissions, or unsupported builds.
   */
  private async tryRegisterDeviceForPushNotifications(): Promise<void> {
    if (!this.client || !this.currentUser) return;

    // Respect the app's env-based notification toggles used elsewhere.
    const NOTIFS_DISABLED = process.env.EXPO_PUBLIC_NOTIFICATIONS_DISABLED === '1';
    const NOTIFS_MODE = process.env.EXPO_PUBLIC_NOTIFICATIONS_MODE; // 'disabled' | 'firebase' | 'expo' | 'minimal'
    const shouldBypassPush = NOTIFS_DISABLED || (NOTIFS_MODE && NOTIFS_MODE !== 'firebase');
    if (shouldBypassPush) return;

    // Dynamic imports keep this service safe in tests/build variants.
    const Device = await import('expo-device');
    if (!Device.isDevice) return;

    const Notifications = await import('expo-notifications');
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;

    // Expo device push token -> APNs (iOS) or FCM (Android).
    const native = await Notifications.getDevicePushTokenAsync();
    const token = native?.data;
    if (!token || typeof token !== 'string') return;

    const pushProvider = Platform.OS === 'ios' ? 'apn' : 'firebase';

    // Register with Stream; Stream uses this to deliver OS push notifications.
    await this.client.addDevice(token, pushProvider);
  }

  /**
   * Disconnect from Stream Chat
   */
  async disconnect(options: { resetOfflineDb?: boolean } = {}): Promise<void> {
    try {
      if (this.client) {
        // Offline support best practice: reset DB on sign-out to avoid cross-user leaks.
        // Docs: https://getstream.io/chat/docs/sdk/react-native/basics/offline-support/
        if (options.resetOfflineDb) {
          try {
            const offlineDb = (this.client as any)?.offlineDb;
            if (offlineDb && typeof offlineDb.resetDB === 'function') {
              await offlineDb.resetDB();
            }
          } catch (_e) {
            void _e;
          }
        }

        await this.client.disconnectUser();
        this.client = null;
      }
      
      this.currentUser = null;
      this.channels.clear();
      this.channelsByCid.clear();
      
      this.setConnectionStatus({
        isConnected: false,
        isConnecting: false,
        user: undefined,
        error: undefined,
      });

    } catch (error) {
      const _error = error as unknown;
      void _error;
    }
  }

  /**
   * Recover websocket connection without re-initializing the client.
   * Uses Stream Chat SDK's `openConnection()` (best for app foreground / transient network loss).
   */
  async recoverConnection(options: { maxRetries?: number } = {}): Promise<ConnectionStatus> {
    if (this.isConnected() && this.client) {
      return this.connectionStatus;
    }

    if (this.recoverPromise) {
      return this.recoverPromise;
    }

    const maxRetries = options.maxRetries ?? 1;

    this.setConnectionStatus({ isConnecting: true, isConnected: false, error: undefined });

    this.recoverPromise = (async () => {
      // If we don't have a usable client/user, fall back to full initialize.
      const userId =
        this.currentUser?.id ||
        (this.client as any)?.userID ||
        (this.client as any)?.userId;
      if (!this.client || !userId) {
        return await this.initialize({ maxRetries });
      }

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await this.client.openConnection();
          this.setConnectionStatus({
            isConnected: true,
            isConnecting: false,
            error: undefined,
          });
          return this.connectionStatus;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error('Failed to recover Stream Chat connection');

          const isRetryable =
            lastError.message.includes('network') ||
            lastError.message.includes('timeout') ||
            lastError.message.includes('timed out') ||
            lastError.message.includes('WebSocket');

          if (isRetryable && attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          break;
        }
      }

      // As a last resort, attempt a full initialize (token refresh / connectUser).
      const status = await this.initialize({ maxRetries: 0, skipRecovery: true });
      if (status.isConnected) return status;

      const message = status.error || lastError?.message || 'Failed to reconnect to chat';
      this.setConnectionStatus({ isConnected: false, isConnecting: false, error: message });
      return this.connectionStatus;
    })();

    try {
      return await this.recoverPromise;
    } finally {
      this.recoverPromise = null;
    }
  }

  /**
   * Get or create a channel with retry logic for transient errors
   */
  async getChannel(
    channelType: ChannelType,
    channelId: string,
    channelData?: Partial<ChannelData>,
    options: { maxRetries?: number } = {}
  ): Promise<Channel | null> {
    const maxRetries = options.maxRetries ?? 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.getChannelInternal(channelType, channelId, channelData);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('Failed to get channel');
        
        // Check if this is a retryable error (JWT clock skew, network issues)
        const isRetryable = lastError.message.includes('token used before issue') ||
                           lastError.message.includes('JWTAuth error') ||
                           lastError.message.includes('iat') ||
                           lastError.message.includes('network') ||
                           lastError.message.includes('timeout');
        
        if (isRetryable && attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          
          // Clear cache for this channel to force fresh creation
          const cacheKey = `${channelType}:${channelId}`;
          this.channels.delete(cacheKey);
          continue;
        }
        
        // Not retryable or max retries reached
        break;
      }
    }

    if (__DEV__) {
      console.error('[StreamChat] Failed to get/create channel after retries:', {
        channelType,
        channelId,
        error: lastError?.message || 'Unknown error'
      });
    }
    return null;
  }

  /**
   * Internal implementation of getChannel (called by retry wrapper)
   */
  private async getChannelInternal(
    channelType: ChannelType,
    channelId: string,
    channelData?: Partial<ChannelData>
  ): Promise<Channel | null> {
    if (!this.client) {
      if (__DEV__) {
        console.warn('[StreamChat] Cannot get channel: client not initialized');
      }
      throw new Error('Chat client not initialized');
    }

    const userId =
      this.currentUser?.id ||
      (this.client as any)?.userID ||
      (this.client as any)?.userId;
    if (!userId) {
      if (__DEV__) {
        console.warn('[StreamChat] Cannot get channel: chat user not set');
      }
      throw new Error('Chat user not set');
    }

    const cacheKey = `${channelType}:${channelId}`;
    
    // Check if channel is already cached
    if (this.channels.has(cacheKey)) {
      const cachedChannel = this.channels.get(cacheKey)!;
      if (cachedChannel?.cid) {
        this.channelsByCid.set(cachedChannel.cid, cachedChannel);
      }
      // Refresh the cached channel to ensure real-time subscriptions are active.
      // Do not block UI on history fetch; `watch()` is sufficient for most cases.
      try {
        await cachedChannel.watch({ state: true, presence: true });
      } catch (_e) {
        // Ignore refresh errors - the channel is still usable
        if (__DEV__) {
          console.warn('[StreamChat] Failed to refresh cached channel:', _e);
        }
      }
      return cachedChannel;
    }

    // Ensure Stream user objects exist for members before creating/watching the channel.
    // Stream rejects channel creation if any `members` user doesn't exist yet.
    const incomingMembers = (channelData as any)?.members;
    const members = Array.isArray(incomingMembers)
      ? this.getNormalizedMemberIds(incomingMembers as Array<string | undefined | null>)
      : undefined;

    // Use normalized members when creating channel to prevent duplicate-member errors.
    const normalizedChannelData =
      members && channelData
        ? ({
            ...(channelData as Record<string, unknown>),
            members,
          } as Partial<ChannelData>)
        : channelData;

    if (Array.isArray(members) && members.length > 0) {
      await streamTokenService.ensureUsersExist(members, { throwOnError: true, maxRetries: 2 });
    }

    // Create or get the channel
    const channel = this.client.channel(channelType, channelId, normalizedChannelData);
    
    // Watch the channel (this creates it if it doesn't exist)
    try {
      await channel.watch({ state: true, presence: true });
    } catch (watchError: unknown) {
      // Retry once if Stream says some users don't exist (common on first-time chats).
      const message = watchError instanceof Error ? watchError.message : '';
      const match = message.match(/don't exist:\s*\[([^\]]+)\]/i);
      if (match?.[1]) {
        const missing = match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.replace(/^["']|["']$/g, ''));
        if (missing.length > 0) {
          await streamTokenService.ensureUsersExist(missing, { throwOnError: true, maxRetries: 2 });
          await channel.watch({ state: true, presence: true });
        } else {
          throw watchError;
        }
      } else {
        throw watchError;
      }
    }
    
    // Cache the channel
    this.channels.set(cacheKey, channel);
    if (channel?.cid) {
      this.channelsByCid.set(channel.cid, channel);
    }
    
    return channel;
  }

  /**
   * Get or create a channel - fallback variant that tries messaging type on failure
   */
  async getChannelWithFallback(
    channelType: ChannelType,
    channelId: string,
    channelData?: Partial<ChannelData>
  ): Promise<Channel | null> {
    const channel = await this.getChannel(channelType, channelId, channelData);
    if (channel) return channel;

    if (channelType === 'messaging') {
      return null;
    }

    // Fallback to messaging channel if custom type isn't configured
    try {
      const cacheKey = `messaging:${channelId}`;
      if (this.channels.has(cacheKey)) {
        return this.channels.get(cacheKey)!;
      }

      if (!this.client) return null;

      const messagingChannel = this.client.channel('messaging', channelId, channelData);
      await messagingChannel.watch({ state: true, presence: true });
      this.channels.set(cacheKey, messagingChannel);
      if (messagingChannel?.cid) {
        this.channelsByCid.set(messagingChannel.cid, messagingChannel);
      }
      return messagingChannel;
    } catch (fallbackError: unknown) {
      if (__DEV__) {
        console.error('[StreamChat] Fallback to messaging failed:', {
          channelId,
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
      }
      return null;
    }
  }

  /**
   * Create a property listing channel
   */
  async createPropertyChannel(
    propertyId: string,
    ownerId: string,
    propertyData: {
      title: string;
      price: number;
      location: string;
      image?: string;
    }
  ): Promise<Channel | null> {
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) return null;
    if (currentUserId === ownerId) {
      throw new Error('Cannot create a property chat with yourself');
    }

    const channelId = this.buildListingConversationChannelId(
      'property',
      propertyId,
      ownerId,
      currentUserId
    );
    const members = this.getNormalizedMemberIds([ownerId, currentUserId]);
    
    return await this.getChannel('property', channelId, {
      image: propertyData.image,
      created_by_id: ownerId,
      members,
      property_id: propertyId,
      property_title: propertyData.title,
      property_price: propertyData.price,
      property_location: propertyData.location
    } as Partial<ChannelData>);
  }

  /**
   * Create a job posting channel
   */
  async createJobChannel(
    jobId: string,
    employerId: string,
    jobData: {
      title: string;
      company: string;
      location: string;
      salary?: number;
    }
  ): Promise<Channel | null> {
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) return null;
    if (currentUserId === employerId) {
      throw new Error('Cannot create a job chat with yourself');
    }

    const channelId = this.buildListingConversationChannelId(
      'job',
      jobId,
      employerId,
      currentUserId
    );
    const members = this.getNormalizedMemberIds([employerId, currentUserId]);
    
    return await this.getChannel('job', channelId, {
      created_by_id: employerId,
      members,
      job_id: jobId,
      job_title: jobData.title,
      job_company: jobData.company,
      job_location: jobData.location,
      job_salary: jobData.salary
    } as Partial<ChannelData>);
  }

  /**
   * Create a service listing channel
   */
  async createServiceChannel(
    serviceId: string,
    providerId: string,
    serviceData: {
      name: string;
      category: string;
      location: string;
      image?: string;
    }
  ): Promise<Channel | null> {
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) return null;
    if (currentUserId === providerId) {
      throw new Error('Cannot create a service chat with yourself');
    }

    const channelId = this.buildListingConversationChannelId(
      'service',
      serviceId,
      providerId,
      currentUserId
    );
    const members = this.getNormalizedMemberIds([providerId, currentUserId]);
    
    return await this.getChannel('service', channelId, {
      image: serviceData.image,
      created_by_id: providerId,
      members,
      service_id: serviceId,
      service_name: serviceData.name,
      service_category: serviceData.category,
      service_location: serviceData.location
    } as Partial<ChannelData>);
  }

  /**
   * Create a Date Mi conversation channel
   */
  async createDateMiChannel(
    otherUserId: string,
    otherUserData: {
      name: string;
      image?: string;
    }
  ): Promise<Channel | null> {
    if (!this.currentUser) {
      
      return null;
    }

    const channelId = StreamTokenService
      .createDateMiChannelId(this.currentUser.id, otherUserId);
    
    if (this.currentUser.id === otherUserId) {
      throw new Error('Cannot create a Date Mi chat with yourself');
    }

    const channelData = {
      members: this.getNormalizedMemberIds([this.currentUser.id, otherUserId]),
      // Avoid missing names which causes Stream UI to label it "Group chat (2 participants)"
      name: otherUserData.name || 'Chat', // Set channel name for display
      datemi_conversation: true,
      user1_id: this.currentUser.id,
      user1_name: this.currentUser.name,
      user2_id: otherUserId,
      user2_name: otherUserData.name || 'Match'
    } as Partial<ChannelData>;

    // Use standard messaging channel to avoid custom type permission issues
    return await this.getChannel('messaging', channelId, channelData);
  }

  /**
   * Create a direct message channel
   */
  async createDirectMessageChannel(
    otherUserId: string,
    _otherUserName: string
  ): Promise<Channel | null> {
    if (!this.currentUser) {
      
      return null;
    }

    const channelId = StreamTokenService
      .createDirectMessageChannelId(this.currentUser.id, otherUserId);
    
    if (this.currentUser.id === otherUserId) {
      throw new Error('Cannot create a direct message channel with yourself');
    }

    return await this.getChannel('messaging', channelId, {
      members: this.getNormalizedMemberIds([this.currentUser.id, otherUserId])
    });
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    channel: Channel,
    messageData: MessageData
  ): Promise<boolean> {
    try {
      // Ensure channel is watched before sending so:
      // - optimistic updates work reliably
      // - the sender sees the message immediately
      // - real-time subscriptions are active
      const isInitialized = (channel as any)?.initialized === true;
      if (!isInitialized) {
        await channel.watch({ state: true, presence: true } as any);
      }
      
      // Send the message - Stream Chat SDK handles optimistic updates automatically
      await channel.sendMessage(messageData);
      return true;
    } catch (error: unknown) {
      if (__DEV__) {
        console.error('[StreamChat] Failed to send message:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          channelId: channel.id,
          channelType: channel.type,
          hasState: !!channel.state,
        });
      }
      return false;
    }
  }

  /**
   * Update a message in a channel
   * Uses Stream Chat client API for message updates
   */
  async updateMessage(
    channel: Channel,
    messageId: string,
    updates: Partial<MessageData>
  ): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Use Stream Chat client's updateMessage method
      // The API expects a message object with id and updates
      await this.client.updateMessage({
        id: messageId,
        ...updates,
      } as Partial<{ id: string; text?: string; attachments?: Attachment[] }>);
      return true;
    } catch (error: unknown) {
      const _error = error as unknown;
      void _error;
      return false;
    }
  }

  /**
   * Delete a message from a channel
   * Uses Stream Chat client API for message deletion
   */
  async deleteMessage(
    channel: Channel,
    messageId: string
  ): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Use Stream Chat client's deleteMessage method
      // The API signature is: deleteMessage(messageId: string, hard?: boolean)
      await this.client.deleteMessage(messageId, false); // Soft delete by default
      return true;
    } catch (error: unknown) {
      const _error = error as unknown;
      void _error;
      return false;
    }
  }

  /**
   * Add user to a channel
   */
  async addUserToChannel(
    channel: Channel,
    userId: string
  ): Promise<boolean> {
    try {
      const existingMemberIds = Object.values(channel.state.members || {})
        .map((member: any) => member?.user_id)
        .filter((id: unknown): id is string => typeof id === 'string');
      if (existingMemberIds.includes(userId)) {
        return true;
      }
      await channel.addMembers([userId]);
      return true;
    } catch (error: unknown) {
      const _error = error as unknown;
      void _error;
      return false;
    }
  }

  /**
   * Remove user from a channel
   */
  async removeUserFromChannel(
    channel: Channel,
    userId: string
  ): Promise<boolean> {
    try {
      await channel.removeMembers([userId]);
      return true;
    } catch (error: unknown) {
      const _error = error as unknown;
      void _error;
      return false;
    }
  }

  /**
   * Get user's channels
   */
  async getUserChannels(
    limit: number = 20,
    channelType?: ChannelType
  ): Promise<Channel[]> {
    if (!this.client) {
      return [];
    }

    try {
      const userId = this.currentUser?.id || (this.client as any)?.userID || (this.client as any)?.userId;
      if (!userId) return [];

      const filter: Record<string, unknown> = { members: { $in: [userId] } };
      if (channelType) {
        filter.type = channelType;
      }

      // Performance: for conversation lists we don't need to `watch` every channel.
      // Watching many channels increases startup time and can inflate WS load.
      // We'll only watch when opening a specific channel.
      const channels = await this.client.queryChannels(
        filter,
        {
          last_message_at: -1
        },
        {
          limit,
          state: true,
          watch: false,
          presence: false,
          message_limit: 1,
        }
      );

      for (const channel of channels) {
        const type = typeof (channel as any)?.type === 'string' ? (channel as any).type : '';
        const id = typeof (channel as any)?.id === 'string' ? (channel as any).id : '';
        if (type && id) {
          this.channels.set(`${type}:${id}`, channel);
        }
        if (channel?.cid) {
          this.channelsByCid.set(channel.cid, channel);
        }
      }

      // Ensure uniqueness by cid to avoid duplicate lists
      const unique = Array.from(new Map(channels.map((c) => [c.cid, c])).values());
      return unique;
    } catch (error: unknown) {
      const _error = error as unknown;
      void _error;
      return [];
    }
  }

  /**
   * Search channels
   */
  async searchChannels(
    query: string,
    channelType?: ChannelType,
    limit: number = 10
  ): Promise<Channel[]> {
    if (!this.client) {
      return [];
    }

    try {
      const userId = this.currentUser?.id || (this.client as any)?.userID || (this.client as any)?.userId;
      if (!userId) return [];

      const filter: Record<string, unknown> = {
        members: { $in: [userId] },
        name: { $autocomplete: query }
      };
      
      if (channelType) {
        filter.type = channelType;
      }

      const channels = await this.client.queryChannels(filter, {
        last_message_at: -1
      }, {
        limit,
        watch: false
      });

      for (const channel of channels) {
        const type = typeof (channel as any)?.type === 'string' ? (channel as any).type : '';
        const id = typeof (channel as any)?.id === 'string' ? (channel as any).id : '';
        if (type && id) {
          this.channels.set(`${type}:${id}`, channel);
        }
        if (channel?.cid) {
          this.channelsByCid.set(channel.cid, channel);
        }
      }

      // Ensure uniqueness by cid to avoid duplicate lists
      const unique = Array.from(new Map(channels.map((c) => [c.cid, c])).values());
      return unique;
    } catch (error: unknown) {
      const _error = error as unknown;
      void _error;
      return [];
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // De-dupe listeners across re-initialization (StreamChat.getInstance returns a singleton).
    if (this.connectionChangedHandler) {
      this.client.off('connection.changed', this.connectionChangedHandler);
    }
    if (this.connectionRecoveredHandler) {
      this.client.off('connection.recovered', this.connectionRecoveredHandler as any);
    }
    if (this.connectionRecoveringHandler) {
      this.client.off('connection.recovering' as any, this.connectionRecoveringHandler as any);
    }
    if (this.userPresenceChangedHandler) {
      this.client.off('user.presence.changed', this.userPresenceChangedHandler);
    }

    this.connectionChangedHandler = (event: Event) => {
      const online = Boolean((event as any)?.online);
      this.setConnectionStatus({
        isConnected: online,
        // A connection.changed event means the attempt is done (either online or offline).
        isConnecting: false,
        // Only clear error when we're back online; don't spam errors on transient offline.
        error: online ? undefined : this.connectionStatus.error,
        user: this.connectionStatus.user || this.currentUser || undefined,
      });
    };

    this.connectionRecoveringHandler = () => {
      this.setConnectionStatus({
        isConnected: false,
        isConnecting: true,
        user: this.connectionStatus.user || this.currentUser || undefined,
      });
    };

    this.connectionRecoveredHandler = () => {
      this.setConnectionStatus({
        isConnected: true,
        isConnecting: false,
        error: undefined,
        user: this.connectionStatus.user || this.currentUser || undefined,
      });
    };

    this.userPresenceChangedHandler = (_event: Event) => {
      void _event;
    };

    this.client.on('connection.changed', this.connectionChangedHandler);
    this.client.on('connection.recovering' as any, this.connectionRecoveringHandler as any);
    this.client.on('connection.recovered', this.connectionRecoveredHandler as any);
    this.client.on('user.presence.changed', this.userPresenceChangedHandler);
  }

  /**
   * Update connection status and notify listeners
   */
  private setConnectionStatus(status: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.connectionListeners.forEach(listener => listener(this.connectionStatus));
  }

  /**
   * Add connection status listener
   */
  addConnectionListener(listener: (status: ConnectionStatus) => void): () => void {
    this.connectionListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connectionStatus.isConnected && !!this.client;
  }

  /**
   * Get current user
   */
  getCurrentUser(): StreamUserData | null {
    return this.currentUser;
  }

  /**
   * Get Stream Chat client instance
   */
  getClient(): StreamChat | null {
    return this.client;
  }

  /**
   * Get cached channel
   */
  getCachedChannel(channelType: ChannelType, channelId: string): Channel | null {
    const cacheKey = `${channelType}:${channelId}`;
    return this.channels.get(cacheKey) || null;
  }

  /**
   * Fast-path lookup by Stream CID (e.g. "messaging:dm_x_y").
   * This is used for notification/deeplink navigation so screens can render
   * immediately from in-memory state without awaiting `watch()`.
   */
  getCachedChannelByCid(cid: string): Channel | null {
    const normalized = typeof cid === 'string' ? cid.trim() : '';
    if (!normalized) return null;

    const direct = this.channelsByCid.get(normalized);
    if (direct) return direct;

    const parts = normalized.split(':');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return this.getCachedChannel(parts[0] as ChannelType, parts[1]);
    }

    return null;
  }

  /**
   * Clear channel cache
   */
  clearChannelCache(): void {
    this.channels.clear();
    this.channelsByCid.clear();
  }

  /**
   * Update user online status
   */
  async updateUserStatus(_status: 'online' | 'offline' | 'invisible'): Promise<void> {
    if (!this.client || !this.isConnected()) {
      return;
    }

    try {
      await this.client.updateAppSettings({
        enforce_unique_usernames: 'no'
      });
    } catch (error) {
      const _error = error as unknown;
      void _error;
    }
  }
}

let instance: StreamChatService | null = null;
function getInstance(): StreamChatService {
  if (!instance) instance = new StreamChatService();
  return instance;
}

export const streamChatService = new Proxy({} as StreamChatService, {
  get(target, prop) {
    try {
      const service = getInstance();
      const value = (service as any)[prop];
      return typeof value === 'function' ? value.bind(service) : value;
    } catch (error) {
      // APK crash prevention: If Stream Chat fails, return safe defaults
      if (typeof console !== 'undefined' && console.error) {
        console.error('[StreamChat] Failed to access property:', prop, error);
      }
      return typeof prop === 'string' && prop !== 'constructor'
        ? async () => Promise.resolve(null)
        : undefined;
    }
  }
});

export { StreamChatService };
