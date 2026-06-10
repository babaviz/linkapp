/**
 * ChatChannelScreen
 * 
 * Screen for individual chat channel/conversation.
 * This screen uses the EnhancedChatChannel component and provides a full messaging experience.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Channel } from 'stream-chat';
import type { MessageResponse } from 'stream-chat';
import { EnhancedChatChannel } from '../components/chat';
import { useStreamChat } from '../hooks/useStreamChat';
import { useStreamChatClient } from '../components/chat/StreamChatWrapper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatLoadingScreen } from '../components/common';
import { getUserFacingError } from '../utils/userFacingError';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { streamChatService } from '../services/streamChatService';

// Navigation types
type ChatChannelNavigationProp = StackNavigationProp<any, 'ChatChannel'>;
type ChatChannelRouteProp = RouteProp<any, 'ChatChannel'>;

interface Props {
  navigation: ChatChannelNavigationProp;
  route: ChatChannelRouteProp;
}

interface RouteParams {
  channelCid?: string;
  channel?: Channel;
  channelName?: string;
  // For creating new channels
  channelType?: string;
  channelId?: string;
  channelData?: any;
  // Stream push payload compatibility
  cid?: string;
  channel_type?: string;
  channel_id?: string;
  // Legacy deep-link payloads
  chatId?: string;
}

export default function ChatChannelScreen({ navigation, route }: Props) {
  const params = (route.params || {}) as RouteParams;
  const {
    isConnecting,
    connectionError,
    getChannel,
    user
  } = useStreamChat();
  const { isReady: isChatClientReady } = useStreamChatClient();

  const rawCid =
    params.channelCid ||
    params.cid ||
    params.chatId ||
    (params.channel_type && params.channel_id ? `${params.channel_type}:${params.channel_id}` : undefined);
  const cachedChannel = !params.channel && rawCid ? streamChatService.getCachedChannelByCid(rawCid) : null;
  const initialChannel = params.channel || cachedChannel || null;

  const [channel, setChannel] = useState<Channel | null>(initialChannel);
  const [channelName, setChannelName] = useState<string>(params.channelName || '');
  const [isLoading, setIsLoading] = useState(!initialChannel);
  const [error, setError] = useState<string | null>(null);
  const isInitializingChatRef = useRef(false);
  const warmedCidsRef = useRef<Set<string>>(new Set());

  const fallbackScreen = React.useMemo(() => {
    const data = channel?.data as Record<string, unknown> | undefined;

    const isDateMi =
      (data && (data.datemi_conversation === true || data.user1_id || data.user2_id)) ||
      channel?.type === 'datemi';
    if (isDateMi) return 'DateMiMain';

    if (channel?.type === 'property' || (data && (data.property_id || data.property_title))) return 'PropertyHub';
    if (channel?.type === 'job' || (data && (data.job_id || data.job_title))) return 'JobsMain';
    if (channel?.type === 'service' || (data && (data.service_id || data.service_name))) return 'ServicesMain';
    return 'ProfileMain';
  }, [channel?.cid, channel?.type]);

  const { handleBack } = useBackNavigation({ fallbackScreen });

  // Fast path: if we navigated here via CID (e.g. notifications) and the channel
  // is already in memory, render immediately and hydrate silently.
  useEffect(() => {
    if (!rawCid) return;
    if (channel) return;
    const cached = streamChatService.getCachedChannelByCid(rawCid);
    if (!cached) return;

    setChannel(cached);
    setIsLoading(false);
  }, [channel, rawCid]);

  // Ensure channel is watched/hydrated, but never block the initial render.
  useEffect(() => {
    if (!channel || !isChatClientReady) return;
    const cid = channel.cid;
    if (!cid) return;
    if (warmedCidsRef.current.has(cid)) return;
    warmedCidsRef.current.add(cid);
    channel
      .watch({ state: true, presence: true, message_limit: 25 } as any)
      .catch(() => {});
  }, [channel, isChatClientReady]);

  // Derive/refresh the navigation title from channel state.
  useEffect(() => {
    if (!channel) return;

    const normalizeName = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const channelData = channel.data as any;
    const members = Object.values(channel.state.members);
    const otherMember = members.find((m) => m.user_id !== user?.id);

    const isDateMiConversation =
      channelData?.datemi_conversation === true || !!channelData?.user1_id || !!channelData?.user2_id;
    if (isDateMiConversation && user?.id) {
      const user1Id = normalizeName(channelData?.user1_id);
      const user2Id = normalizeName(channelData?.user2_id);
      const user1Name = normalizeName(channelData?.user1_name);
      const user2Name = normalizeName(channelData?.user2_name);

      let dateMiOtherName: string | undefined;
      if (user1Id && user2Id) {
        if (user.id === user1Id) dateMiOtherName = user2Name;
        else if (user.id === user2Id) dateMiOtherName = user1Name;
      }

      const normalizedDateMiOtherName = normalizeName(dateMiOtherName);
      if (normalizedDateMiOtherName) {
        setChannelName(normalizedDateMiOtherName);
        return;
      }
    }

    const derivedName =
      normalizeName(channelData?.name) ||
      normalizeName(otherMember?.user?.name) ||
      normalizeName(params.channelName) ||
      'Chat';

    setChannelName(derivedName);
  }, [channel, params.channelName, user?.id]);

  /**
   * Load or create channel
   */
  const loadChannel = useCallback(async () => {
    if (channel || !isChatClientReady) return;

    setIsLoading(true);
    setError(null);

    try {
      let loadedChannel: Channel | null = null;

      // If we have a channel CID, try to get the existing channel
      if (rawCid) {
        // Parse CID to get type and id
        const parts = rawCid.split(':');
        if (parts.length === 2 && parts[0] && parts[1]) {
          const [type, id] = parts;
          loadedChannel = await getChannel(type as any, id);
        } else {
          // Best-effort fallback for legacy IDs (assume direct messaging).
          loadedChannel = await getChannel('messaging' as any, rawCid);
        }
      }
      // Stream push payloads may arrive with separate fields.
      else if (params.channel_type && params.channel_id) {
        loadedChannel = await getChannel(params.channel_type as any, params.channel_id);
      }
      // If we have channel creation parameters
      else if (params.channelType && params.channelId) {
        loadedChannel = await getChannel(
          params.channelType as any,
          params.channelId,
          params.channelData
        );
      }

      if (loadedChannel) {
        setChannel(loadedChannel);
      } else {
        throw new Error('Failed to load or create channel');
      }
    } catch (err) {
      setError(
        getUserFacingError(err, {
          action: 'load this chat',
          displayStyle: 'inline',
        }).message
      );
    } finally {
      setIsLoading(false);
    }
  }, [channel, getChannel, isChatClientReady, params.channelData, params.channelId, params.channelType, params.channel_id, params.channel_type, rawCid]);

  /**
   * Handle retry
   */
  const handleRetry = useCallback(() => {
    setError(null);
    setChannel(null);
    setIsLoading(true);
    isInitializingChatRef.current = false;
  }, []);

  useEffect(() => {
    // Once the chat client is ready, load the channel (only once per entry).
    if (isChatClientReady && !channel && !error && !isInitializingChatRef.current) {
      isInitializingChatRef.current = true;
      void loadChannel().finally(() => {
        isInitializingChatRef.current = false;
      });
    } else if (!isChatClientReady && !isConnecting && connectionError && !error) {
      // Chat client failed to initialize
      setError(
        getUserFacingError(new Error(connectionError || 'Chat unavailable'), {
          action: 'open this chat',
          displayStyle: 'inline',
        }).message
      );
      setIsLoading(false);
    }
  }, [isChatClientReady, isConnecting, connectionError, channel, loadChannel, error]);

  /**
   * Handle back press
   */
  const handleBackPress = useCallback(() => {
    handleBack();
  }, [handleBack]);

  /**
   * Handle channel info press
   */
  const handleChannelInfoPress = useCallback(() => {
    if (!channel) return;

    const channelData = channel.data as Record<string, unknown> | undefined;
    Alert.alert(
      'Channel Info',
      `Channel: ${channelData?.name || channelName || 'Chat'}\nType: ${channel.type}\nMembers: ${Object.keys(channel.state.members).length}`,
      [
        {
          text: 'Close',
          style: 'cancel'
        }
      ]
    );
  }, [channel, channelName]);

  const handleNavigateToChats = useCallback(() => {
    navigation.navigate('DateMiConversations' as never);
  }, [navigation]);

  // Set navigation title
  useEffect(() => {
    if (channelName) {
      navigation.setOptions({
        title: channelName
      });
    }
  }, [channelName, navigation]);

  // Loading state
  if (!channel && (isLoading || isConnecting)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingHeader}>
            <Text style={styles.loadingText}>
              {isConnecting ? 'Connecting to chat…' : 'Loading conversation…'}
            </Text>
          </View>
          <ChatLoadingScreen style={{ flex: 1 }} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !channel) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  // No channel state
  if (!channel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load chat</Text>
          <Text style={styles.errorMessage}>
            {getUserFacingError(new Error('Chat unavailable'), {
              action: 'open this chat',
              displayStyle: 'inline',
            }).message}
          </Text>
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
      </SafeAreaView>
    );
  }

  return (
    <EnhancedChatChannel
      channel={channel}
      onBackPress={handleBackPress}
      onChannelInfoPress={handleChannelInfoPress}
      onNavigateToChats={handleNavigateToChats}
      showThread={true}
      onOpenThread={(parent) => {
        const msg = parent as unknown as MessageResponse | null;
        if (!msg?.id) return;
        navigation.navigate('ChatThread', {
          channelCid: channel.cid,
          parentMessageId: msg.id,
        });
      }}
      enableFileUploads={true}
      enableImageUploads={true}
      enableMessageEditing={true}
      enableMessageDeleting={true}
      showTypingIndicator={true}
    />
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
