/**
 * StreamChatWrapper Component
 * 
 * This component provides a wrapper around Stream Chat's Chat component,
 * integrating it with our custom hook and providing proper context
 * for the entire chat functionality in the app.
 * 
 * IMPORTANT: The Chat context from stream-chat-react-native MUST wrap
 * any components that use MessageList, MessageInput, or Channel components.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, createContext, useContext } from 'react';
import { AppState, AppStateStatus, View, Text, StyleSheet } from 'react-native';
import { Chat } from 'stream-chat-expo';
import { StreamChat } from 'stream-chat';
import { StandardLoadingIndicator } from '../common/StandardLoadingIndicator';
import type { UseStreamChatReturn } from '../../hooks/useStreamChat';
import { authService } from '../../services/authService';
import { streamChatService } from '../../services/streamChatService';
import badgeService from '../../services/badgeService';
import { ENV } from '../../config/environment';
import dateMiNotificationManager from '../../services/dateMiNotificationManager';
import { chatPrefetchService } from '../../services/chatPrefetchService';

/**
 * Function to determine if a message is AI-generated.
 * Required by Stream Chat SDK v8+ - returns false by default (no AI messages in LinkApp).
 * Defined outside component to ensure stable reference.
 */
const defaultIsMessageAIGenerated = (message: unknown): boolean => {
  if (message && typeof message === 'object' && 'ai_generated' in message) {
    return Boolean((message as { ai_generated?: boolean }).ai_generated);
  }
  return false;
};

function getStreamChatApiKey(): string {
  const fromEnv = ENV.STREAM_CHAT_API_KEY;
  if (fromEnv && fromEnv.trim() !== '') return fromEnv;

  // Dev fallback only: allow using the repo's `chatConfig.js` constant if env isn't wired.
  // Never do this in production builds.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cfg = require('../../chatConfig.js') as { chatApiKey?: string };
      if (cfg?.chatApiKey && cfg.chatApiKey.trim() !== '') {
        return cfg.chatApiKey;
      }
    } catch (_e) {
      void _e;
    }
  }

  return '';
}

interface StreamChatWrapperProps {
  children: React.ReactNode;
  showLoadingIndicator?: boolean;
}

// Context to track if we have a valid Stream Chat client.
// IMPORTANT: `isReady` must mean "connectUser completed + websocket ready".
const StreamChatClientContext = createContext<{ client: StreamChat | null; isReady: boolean }>({
  client: null,
  isReady: false,
});

export const useStreamChatClient = () => useContext(StreamChatClientContext);

/**
 * Full Stream Chat context for the app.
 * This centralizes connection + channel APIs so we don't register duplicate listeners per-screen.
 */
export const StreamChatContext = createContext<UseStreamChatReturn | null>(null);

export const StreamChatWrapper: React.FC<StreamChatWrapperProps> = React.memo(({
  children,
  showLoadingIndicator = false,
}) => {
  const apiKey = useMemo(() => getStreamChatApiKey(), []);
  const chatClient = useMemo<StreamChat | null>(() => {
    if (!apiKey || apiKey.trim() === '') return null;
    // IMPORTANT:
    // Keep the <Chat> provider mounted with a stable client instance so the app's
    // navigation tree is not re-mounted when connectUser completes after login.
    return StreamChat.getInstance(apiKey, { timeout: 6000, warmUp: true } as any);
  }, [apiKey]);
  const [connectionStatus, setConnectionStatus] = useState(() => streamChatService.getConnectionStatus());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const isConnected = connectionStatus.isConnected;
  const isConnecting = connectionStatus.isConnecting;
  const connectionError = connectionStatus.error;

  const connect = useCallback(async (): Promise<void> => {
    // Use lightweight session check instead of full getCurrentUser (saves ~2-7s network call)
    const sessionUser = await authService.getSessionUserBasic();
    if (!sessionUser) {
      throw new Error('No authenticated user found');
    }

    const status = await streamChatService.initialize();
    setConnectionStatus(status);

    if (!status.isConnected) {
      throw new Error(status.error || 'Failed to connect to chat');
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    await streamChatService.disconnect({ resetOfflineDb: true });
    setConnectionStatus(streamChatService.getConnectionStatus());
  }, []);

  const reconnect = useCallback(async (): Promise<void> => {
    const status = await streamChatService.recoverConnection({ maxRetries: 1 });
    setConnectionStatus(status);

    if (!status.isConnected) {
      throw new Error(status.error || 'Failed to reconnect to chat');
    }
  }, []);

  // Subscribe to Stream Chat service connection state once (global)
  useEffect(() => {
    const unsubscribe = streamChatService.addConnectionListener((status) => {
      setConnectionStatus(status);
    });
    return unsubscribe;
  }, []);

  // Connect at app start when a session exists; disconnect on sign-out.
  useEffect(() => {
    let isMounted = true;
    type SupabaseSubscriptionV1 = { unsubscribe: () => void };
    type SupabaseSubscriptionV2 = { data: { subscription: { unsubscribe: () => void } } };
    type SupabaseAuthSubscription = SupabaseSubscriptionV1 | SupabaseSubscriptionV2 | null;
    let authStateSubscription: SupabaseAuthSubscription = null;

    const primeChatPrefetchForSession = async () => {
      const sessionUser = await authService.getSessionUserBasic();
      if (!isMounted) return sessionUser;

      if (sessionUser) {
        // Hydrate cached channel list immediately (even before Stream connects).
        chatPrefetchService.hydrateCachedSnapshot(sessionUser.id).catch((_e) => {
          void _e;
        });
        chatPrefetchService.bindClient({ userId: sessionUser.id, client: chatClient });
      } else {
        chatPrefetchService.shutdown();
      }

      return sessionUser;
    };

    const boot = async () => {
      const sessionUser = await primeChatPrefetchForSession();
      if (!isMounted) return;
      if (sessionUser) {
        connect().catch((_e) => {
          void _e;
        });
      }
    };

    boot().catch((_e) => {
      void _e;
    });

    authStateSubscription = authService.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        primeChatPrefetchForSession().catch((_e) => {
          void _e;
        });
        connect().catch((_e) => {
          void _e;
        });
        return;
      }
      if (event === 'SIGNED_OUT') {
        disconnect().catch((_e) => {
          void _e;
        });
      }
    });

    return () => {
      isMounted = false;
      if (authStateSubscription) {
        try {
          let maybeUnsub: (() => void) | undefined;
          if ('data' in authStateSubscription && authStateSubscription.data?.subscription?.unsubscribe) {
            maybeUnsub = authStateSubscription.data.subscription.unsubscribe as unknown as () => void;
          } else if ('unsubscribe' in authStateSubscription && typeof authStateSubscription.unsubscribe === 'function') {
            maybeUnsub = authStateSubscription.unsubscribe as unknown as () => void;
          }
          if (maybeUnsub) {
            maybeUnsub();
          }
        } catch (_e) {
          void _e;
        }
      }
    };
  }, [connect, disconnect]);

  // Keep the websocket healthy on foreground (without re-initializing client).
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // If we have a client/user but are offline, ask the SDK to reopen the websocket.
        if (!streamChatService.isConnected() && streamChatService.getClient()) {
          streamChatService
            .recoverConnection({ maxRetries: 0 })
            .catch((_e) => {
              void _e;
            });
        }
      }
      appStateRef.current = nextAppState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, []);

  // Handle badge updates
  useEffect(() => {
    if (!chatClient || !isConnected) return;

    const updateBadgeFromUnread = async () => {
      try {
        const unreadMessages = (chatClient.user as any)?.total_unread_count || 0;
        await badgeService.updateFromUnreadCounts(unreadMessages, 0);
      } catch (error) {
        if (__DEV__) {
          console.error('[StreamChatWrapper] Error updating badge from chat:', error);
        }
      }
    };

    updateBadgeFromUnread();

    const handleEvent = (event: any) => {
      if (event.total_unread_count !== undefined) {
        badgeService.updateFromUnreadCounts(event.total_unread_count, 0).catch((error) => {
          if (__DEV__) {
            console.error('[StreamChatWrapper] Error handling chat event:', error);
          }
        });
      }

      // DateMi badge manager: recompute DateMi-only unread counts.
      // Debounced internally to avoid excess work.
      dateMiNotificationManager.onChatEvent();
    };

    chatClient.on('notification.message_new', handleEvent);
    chatClient.on('notification.mark_read', handleEvent);

    return () => {
      chatClient.off('notification.message_new', handleEvent);
      chatClient.off('notification.mark_read', handleEvent);
    };
  }, [chatClient, isConnected]);

  // Chat prefetch: hydrate cached snapshot early, then warm channels after connect.
  useEffect(() => {
    const userId = connectionStatus.user?.id;
    if (!userId) {
      chatPrefetchService.shutdown();
      return;
    }

    // Load last-known channel list for instant list rendering (cold start).
    chatPrefetchService.hydrateCachedSnapshot(userId).catch((_e) => {
      void _e;
    });

    // Bind client listeners even before connect completes.
    chatPrefetchService.bindClient({ userId, client: chatClient });

    if (chatClient && isConnected) {
      chatPrefetchService.prefetchAfterConnect().catch((_e) => {
        void _e;
      });
    }
  }, [chatClient, connectionStatus.user?.id, isConnected]);

  // Context value for child components to check client availability
  const clientContextValue = useMemo(
    () => {
      const hasUser =
        !!connectionStatus.user?.id ||
        !!(chatClient as any)?.userID ||
        !!(chatClient as any)?.userId;

      // `hasUser` can become true before connectUser finishes (we set user metadata early).
      // Gate readiness on the actual connection flag so consumers don't issue API calls too early.
      const isReady = !!chatClient && isConnected && hasUser;

      return { client: chatClient, isReady };
    },
    [chatClient, connectionStatus.user?.id, isConnected]
  );

  const streamChatContextValue = useMemo<UseStreamChatReturn>(() => {
    return {
      isConnected,
      isConnecting,
      connectionError: connectionError || null,
      user: connectionStatus.user,
      connect,
      disconnect,
      reconnect,
      getChannel: async (type, id, data) => streamChatService.getChannel(type, id, data),
      getUserChannels: async (limit, type) => streamChatService.getUserChannels(limit, type),
      searchChannels: async (query, type) => streamChatService.searchChannels(query, type),
      sendMessage: async (channel, message) => streamChatService.sendMessage(channel, message),
      createPropertyChannel: async (propertyId, ownerId, data) =>
        streamChatService.createPropertyChannel(propertyId, ownerId, data),
      createJobChannel: async (jobId, employerId, data) => streamChatService.createJobChannel(jobId, employerId, data),
      createServiceChannel: async (serviceId, providerId, data) =>
        streamChatService.createServiceChannel(serviceId, providerId, data),
      createDateMiChannel: async (otherUserId, userData) => streamChatService.createDateMiChannel(otherUserId, userData),
      createDirectMessageChannel: async (otherUserId, otherUserName) =>
        streamChatService.createDirectMessageChannel(otherUserId, otherUserName),
    };
  }, [
    connect,
    disconnect,
    reconnect,
    isConnected,
    isConnecting,
    connectionError,
    connectionStatus.user,
  ]);

  // OverlayProvider is handled at app root (App.tsx) so Stream Video/Chat UIs
  // always have ThemeContext available.
  // Offline support disabled: requires @op-engineering/op-sqlite native module; enable when using a dev client that includes it.
  const enableOfflineSupport = false;

  // Memoize children so the ChatProviderBridge receives a stable reference.
  // This prevents unnecessary re-renders of the <Chat> subtree.
  const stableChildren = useMemo(() => children, [children]);

  const overlay =
    showLoadingIndicator && isConnecting ? (
      <View style={styles.loadingContainer}>
        <StandardLoadingIndicator variant="primary" size="large" />
        <Text style={styles.loadingText}>Connecting to chat...</Text>
      </View>
    ) : showLoadingIndicator && !isConnected && connectionError ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Chat Unavailable</Text>
        <Text style={styles.errorMessage}>{connectionError}</Text>
      </View>
    ) : null;

  return (
    <StreamChatClientContext.Provider value={clientContextValue}>
      <StreamChatContext.Provider value={streamChatContextValue}>
        {chatClient ? (
          <Chat
            client={chatClient}
            isMessageAIGenerated={defaultIsMessageAIGenerated}
            enableOfflineSupport={enableOfflineSupport}
          >
            {stableChildren}
          </Chat>
        ) : (
          stableChildren
        )}
        {overlay}
      </StreamChatContext.Provider>
    </StreamChatClientContext.Provider>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
