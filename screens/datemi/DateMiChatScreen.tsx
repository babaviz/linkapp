/**
 * DateMiChatScreen - Real-time chat for dating/social connections using Stream Chat
 * Migrated to use EnhancedChatChannel for consistency and full Stream Chat features
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  InteractionManager,
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../redux/hooks';
import { useStreamChat } from '../../hooks/useStreamChat';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { EnhancedChatChannel } from '../../components/chat/EnhancedChatChannel';
import { useStreamChatClient } from '../../components/chat/StreamChatWrapper';
import { Channel } from 'stream-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';
import { DateMiProfileService } from '../../services/dateMiService';
import { PremiumPaywall } from '../../components/datemi/PremiumPaywall';
import usePremiumAccess from '../../hooks/usePremiumAccess';
import { getUserFacingError } from '../../utils/userFacingError';
import { ChatLoadingScreen } from '../../components/common';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useDateMiAccess from '../../hooks/useDateMiAccess';
import { streamChatService } from '../../services/streamChatService';
import { StreamTokenService } from '../../services/streamTokenService';
import type { MessageResponse } from 'stream-chat';
import { Ionicons } from '@expo/vector-icons';
import dateMiNotificationManager from '../../services/dateMiNotificationManager';

// Define DateMi chat params
interface RouteParams {
  match: {
    id: string;
    name: string;
    age?: number;
    location?: string;
    profileImage?: string;
  };
  recipientId: string;
  conversationId?: string;
}

export default function DateMiChatScreen() {
  const navigation = useNavigation();
  const { handleBack } = useBackNavigation({ fallbackScreen: 'DateMiMain' });
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector(state => state.auth);
  const dateMiUnreadMessages = useAppSelector(
    (state) => state.datemi?.notifications?.unreadMessages ?? 0
  );
  const { isConnecting, connectionError, createDateMiChannel, getChannel } = useStreamChat();
  const { isReady: isChatClientReady } = useStreamChatClient();
  const premiumAccess = usePremiumAccess();
  const dateMiAccess = useDateMiAccess({ enabled: Boolean(user?.id) });
  
  const { match, recipientId, conversationId: existingConversationId } = route.params as RouteParams;
  
  useScreenshotPrevention(true);

  // Auto-clear Date Mi message badge when user opens a Date Mi chat screen.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      if (dateMiUnreadMessages <= 0) return;
      dateMiNotificationManager.clearMessages().catch(() => {
        // ignore
      });
    }, [dateMiUnreadMessages, user?.id])
  );
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [matchName, setMatchName] = useState<string>(match?.name || '');
  const [matchImage, setMatchImage] = useState<string | undefined>(match?.profileImage);
  // Start in a hydrating state to avoid a first-render "unable to load" flash while
  // `useEffect` kicks off connect + channel hydration.
  const [isHydratingChannel, setIsHydratingChannel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedMessagingAccess, setHasCheckedMessagingAccess] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const isInitializingChatRef = useRef(false);
  const lastHydrationKeyRef = useRef<string | null>(null);
  const greetingSentRef = useRef(false);
  
  // Keep matchName in sync when navigating between chats
  useEffect(() => {
    setMatchName(match?.name || '');
  }, [match?.id, match?.name]);

  // Keep matchImage in sync when navigating between chats
  useEffect(() => {
    setMatchImage(match?.profileImage);
  }, [match?.id, match?.profileImage]);

  // Avoid paywall flicker: wait for at least one access check attempt to complete.
  useEffect(() => {
    let cancelled = false;

    setHasCheckedMessagingAccess(false);
    if (!user?.id) return;

    (async () => {
      try {
        await dateMiAccess.refresh();
      } finally {
        if (!cancelled) {
          setHasCheckedMessagingAccess(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateMiAccess.refresh, user?.id]);

  const canMessage =
    hasCheckedMessagingAccess && !dateMiAccess.isLoading && Boolean(dateMiAccess.canMessage);
  const shouldShowPaywall =
    hasCheckedMessagingAccess && !dateMiAccess.isLoading && !dateMiAccess.canMessage;

  const requestedConversationCid = useMemo(() => {
    if (existingConversationId) return existingConversationId;
    if (!user?.id || !recipientId) return null;
    const channelId = StreamTokenService.createDateMiChannelId(user.id, recipientId);
    return `messaging:${channelId}`;
  }, [existingConversationId, recipientId, user?.id]);

  // Reset state when switching between DateMi conversations.
  useEffect(() => {
    setChannel(null);
    setError(null);
    setIsHydratingChannel(true);
    isInitializingChatRef.current = false;
    lastHydrationKeyRef.current = null;
    greetingSentRef.current = false;
  }, [requestedConversationCid]);

  // Non-blocking: after the channel is loaded, fetch the latest DateMi profile for the recipient
  // so avatars/names reflect recent DateMi-only updates.
  useEffect(() => {
    if (!channel?.cid || !recipientId) return;

    let cancelled = false;

    (async () => {
      try {
        const profile = await DateMiProfileService.getProfileByUserId(recipientId);
        if (cancelled || !profile) return;

        const nextName = typeof profile.displayName === 'string' ? profile.displayName.trim() : '';
        if (nextName) {
          setMatchName(nextName);
        }

        const nextImage =
          Array.isArray(profile.profilePictures) && typeof profile.profilePictures[0] === 'string'
            ? profile.profilePictures[0]
            : undefined;
        if (nextImage) {
          setMatchImage(nextImage);
        }
      } catch (_e) {
        void _e;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channel?.cid, recipientId]);

  const handleRetry = useCallback(() => {
    setError(null);
    setChannel(null);
    setIsHydratingChannel(true);
    setRetryToken((prev) => prev + 1);
    isInitializingChatRef.current = false;
    lastHydrationKeyRef.current = null;
    greetingSentRef.current = false;
  }, []);

  // Fast path: if the channel is already cached, show it immediately (no await).
  useEffect(() => {
    if (!requestedConversationCid) return;
    if (channel) return;

    const parts = requestedConversationCid.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return;

    const cached = streamChatService.getCachedChannel(parts[0] as any, parts[1]);
    if (cached) {
      setChannel(cached);
      setIsHydratingChannel(false);
    }
  }, [channel, requestedConversationCid]);

  // Hydrate the channel in the background (after navigation transitions/animations).
  useEffect(() => {
    if (!user || !match || !recipientId) return;

    if (!isChatClientReady) {
      if (!isConnecting && connectionError && !error) {
        setError(
          getUserFacingError(new Error(connectionError || 'Chat unavailable'), {
            action: 'open this chat',
            displayStyle: 'inline',
          }).message
        );
        setIsHydratingChannel(false);
      }
      return;
    }

    if (!requestedConversationCid) return;

    const hydrationKey = `${requestedConversationCid}:${retryToken}`;
    if (lastHydrationKeyRef.current === hydrationKey) return;
    if (isInitializingChatRef.current) return;

    lastHydrationKeyRef.current = hydrationKey;
    isInitializingChatRef.current = true;

    let cancelled = false;

    const handle = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          setError(null);

          // Blocked-user guard (Date Mi only): do not initialize chat if either side is blocked.
          const [youBlockedThem, theyBlockedYou] = await Promise.all([
            DateMiProfileService.isProfileBlocked(user.id, recipientId),
            DateMiProfileService.isProfileBlocked(recipientId, user.id),
          ]);
          if (youBlockedThem || theyBlockedYou) {
            throw new Error('This conversation is unavailable because one profile is blocked.');
          }

          // Prefer loading the exact channel from `conversationId` when provided.
          // This prevents opening a "new/empty" channel when recipientId is missing or mismatched.
          let dateMiChannel: Channel | null = null;
          if (existingConversationId) {
            const parts = existingConversationId.split(':');
            if (parts.length === 2 && parts[0] && parts[1]) {
              dateMiChannel = await getChannel(parts[0] as any, parts[1]);
            }
          }

          // Fallback to deterministic DateMi channel creation.
          if (!dateMiChannel) {
            dateMiChannel = await createDateMiChannel(recipientId, {
              name: match.name,
              image: match.profileImage,
            });
          }

          if (!dateMiChannel) {
            throw new Error('Failed to create or load chat channel');
          }

          if (cancelled) return;

          // Derive a stable "other person" display name from channel data when possible.
          const channelData = dateMiChannel.data as any;
          if (user?.id) {
            const user1Id = channelData?.user1_id as string | undefined;
            const user2Id = channelData?.user2_id as string | undefined;
            const user1Name = channelData?.user1_name as string | undefined;
            const user2Name = channelData?.user2_name as string | undefined;
            const otherName =
              user1Id && user2Id
                ? user.id === user1Id
                  ? user2Name
                  : user.id === user2Id
                    ? user1Name
                    : undefined
                : undefined;
            if (otherName && otherName.trim().length > 0) {
              setMatchName(otherName);
            }
          }

          setChannel(dateMiChannel);
          setIsHydratingChannel(false);
        } catch (err) {
          if (cancelled) return;
          setError(
            getUserFacingError(err, {
              action: 'open this chat',
              displayStyle: 'inline',
            }).message
          );
          setIsHydratingChannel(false);
        } finally {
          isInitializingChatRef.current = false;
        }
      })().catch((_e) => {
        void _e;
        isInitializingChatRef.current = false;
      });
    });

    return () => {
      cancelled = true;
      try {
        handle.cancel();
      } catch (_e) {
        void _e;
      }
    };
  }, [
    channel,
    connectionError,
    createDateMiChannel,
    error,
    existingConversationId,
    getChannel,
    isChatClientReady,
    isConnecting,
    match,
    recipientId,
    requestedConversationCid,
    retryToken,
    user,
  ]);

  // Defer greeting send (do not block navigation/first paint).
  // Only send when messaging is confirmed allowed.
  useEffect(() => {
    if (!channel) return;
    if (existingConversationId) return;
    if (!canMessage) return;
    if (greetingSentRef.current) return;

    // If the channel has any messages, it is not a "brand-new" conversation.
    if (channel.state.messages.length > 0) return;

    greetingSentRef.current = true;
    const greetingName = matchName || match?.name || 'there';

    const handle = InteractionManager.runAfterInteractions(() => {
      channel
        .sendMessage({
          text: `Hi ${greetingName}! Nice to meet you 👋`,
        })
        .catch((_e) => {
          void _e;
        });
    });

    return () => {
      try {
        handle.cancel();
      } catch (_e) {
        void _e;
      }
    };
  }, [canMessage, channel, existingConversationId, match?.name, matchName]);

  const handleBackPress = useCallback(() => {
    handleBack();
  }, [handleBack]);

  const handleChannelInfoPress = useCallback(() => {
    if (!channel) return;
    Alert.alert(
      'Date Mi Chat',
      `Chatting with: ${matchName || match.name}${match.age ? ` (${match.age})` : ''}${match.location ? `\nLocation: ${match.location}` : ''}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  }, [channel, match, matchName]);

  const handleNavigateToChats = useCallback(() => {
    (navigation as any).navigate('DateMiConversations');
  }, [navigation]);
  
  const handleNavigateToPackages = useCallback(
    (feature: 'messaging' | 'voice_call' | 'video_call') => {
      (navigation as any).navigate('SubscriptionPlans', { entryFeature: feature });
    },
    [navigation]
  );

  if (!user) {
    return null;
  }

  const resolvedTitle = matchName || match?.name || 'Chat';
  const subtitle = isConnecting
    ? 'Connecting to chat…'
    : !isChatClientReady
      ? 'Preparing chat…'
      : error
        ? 'Chat unavailable'
        : isHydratingChannel || !channel
          ? 'Loading conversation…'
          : canMessage
            ? ''
            : 'Messaging locked';

  const LoadingShell = (
    <View style={styles.loadingShell}>
      <View style={[styles.shellHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.shellBackButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>

        <View style={styles.shellHeaderContent}>
          <View style={styles.shellAvatarContainer}>
            {matchImage ? (
              <Image source={{ uri: matchImage }} style={styles.shellAvatarImage} />
            ) : (
              <View style={styles.shellAvatarFallback}>
                <Text style={styles.shellAvatarFallbackText}>
                  {resolvedTitle.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.shellHeaderTextContainer}>
            <Text style={styles.shellTitle} numberOfLines={1}>
              {resolvedTitle}
            </Text>
            <View style={styles.shellSubtitleRow}>
              {(isConnecting || isHydratingChannel || !isChatClientReady) && !error ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : null}
              {subtitle ? (
                <Text style={styles.shellSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* Message skeleton (no blocking awaits) */}
      <View style={styles.shellMessagesContainer}>
        <ScrollView
          style={styles.shellMessages}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: 6 }).map((_, index) => {
            const isIncoming = index % 2 === 0;
            return (
              <View
                key={`skeleton-${index}`}
                style={[
                  styles.shellMessageRow,
                  isIncoming ? styles.shellIncomingRow : styles.shellOutgoingRow,
                ]}
              >
                {isIncoming ? (
                  <SkeletonLoader
                    width={32}
                    height={32}
                    borderRadius={16}
                    style={styles.shellMessageAvatar}
                  />
                ) : null}
                <View
                  style={[
                    styles.shellMessageBubble,
                    isIncoming ? styles.shellIncomingBubble : styles.shellOutgoingBubble,
                  ]}
                >
                  <SkeletonLoader width={isIncoming ? '70%' : '80%'} height={14} style={{ marginBottom: 6 }} />
                  <SkeletonLoader width={isIncoming ? '45%' : '55%'} height={14} />
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.shellInputSkeleton}>
          <SkeletonLoader width={32} height={32} borderRadius={16} />
          <SkeletonLoader
            width="70%"
            height={40}
            borderRadius={20}
            style={{ marginHorizontal: 12 }}
          />
          <SkeletonLoader width={32} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );

  const ErrorState = error && !channel ? (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Chat Unavailable</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <View style={styles.errorActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  const ChatContent = channel ? (
    <EnhancedChatChannel
      channel={channel}
      onBackPress={handleBackPress}
      onChannelInfoPress={handleChannelInfoPress}
      onNavigateToChats={handleNavigateToChats}
      onNavigateToPackages={handleNavigateToPackages}
      showThread={true}
      onOpenThread={(parent) => {
        const msg = parent as unknown as MessageResponse | null;
        if (!msg?.id) return;
        (navigation as any).navigate('ChatThread', {
          channelCid: channel.cid,
          parentMessageId: msg.id,
        });
      }}
      enableFileUploads={premiumAccess.isPro || premiumAccess.isPremium}
      enableImageUploads={premiumAccess.isPro || premiumAccess.isPremium}
      enableMessageEditing={true}
      enableMessageDeleting={true}
      showTypingIndicator={true}
      enableMessageInput={canMessage}
      // Enable call buttons for DateMi conversations
      enableCallButtons={true}
      callRecipient={{
        userId: recipientId,
        name: resolvedTitle || 'User',
        image: matchImage,
      }}
    />
  ) : null;

  const main =
    ErrorState ||
    ChatContent ||
    (isHydratingChannel || isConnecting || !isChatClientReady ? LoadingShell : (
      <View style={styles.loadingContainer}>
        <View style={[styles.loadingHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.loadingText}>Loading conversation…</Text>
        </View>
        <ChatLoadingScreen style={{ flex: 1 }} />
      </View>
    ));

  return (
    <View style={styles.container}>
      {shouldShowPaywall ? (
        <PremiumPaywall
          variant="overlay"
          feature="messaging"
          requiredTier="pro"
          onUpgrade={() => {
            (navigation as any).navigate('SubscriptionPlans', { entryFeature: 'messaging' });
          }}
        >
          {main}
        </PremiumPaywall>
      ) : (
        main
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingShell: {
    flex: 1,
  },
  shellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  shellBackButton: {
    padding: 6,
    marginRight: 6,
  },
  shellHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shellAvatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginRight: 10,
  },
  shellAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  shellAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shellAvatarFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shellHeaderTextContainer: {
    flex: 1,
  },
  shellTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  shellSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  shellSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  shellMessagesContainer: {
    flex: 1,
  },
  shellMessages: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shellMessageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  shellIncomingRow: {
    justifyContent: 'flex-start',
  },
  shellOutgoingRow: {
    justifyContent: 'flex-end',
  },
  shellMessageAvatar: {
    marginRight: 8,
  },
  shellMessageBubble: {
    maxWidth: '72%',
    padding: 12,
    borderRadius: 18,
  },
  shellIncomingBubble: {
    backgroundColor: '#F3F4F6',
  },
  shellOutgoingBubble: {
    backgroundColor: '#DBEAFE',
  },
  shellInputSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorActions: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
});
