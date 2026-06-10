/**
 * JobChatScreen - Real-time chat with job employers/applicants using Stream Chat
 * Migrated to use EnhancedChatChannel for consistency and full Stream Chat features
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Text, View, StyleSheet, TouchableOpacity, InteractionManager } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../redux/hooks';
import { useStreamChat } from '../../hooks/useStreamChat';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { EnhancedChatChannel } from '../../components/chat/EnhancedChatChannel';
import { useStreamChatClient } from '../../components/chat/StreamChatWrapper';
import { Channel } from 'stream-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserFacingError } from '../../utils/userFacingError';
import { ChatLoadingScreen } from '../../components/common';
import type { MessageResponse } from 'stream-chat';
import { streamChatService } from '../../services/streamChatService';

// Define job chat params
interface RouteParams {
  job: {
    id: string;
    title: string;
    company: string;
    employer_id: string;
    employer_name?: string;
    location?: string;
    salary?: number;
  };
  recipientId: string;
  recipientName: string;
  conversationId?: string;
}

export default function JobChatScreen() {
  const navigation = useNavigation();
  const { handleBack } = useBackNavigation({ fallbackScreen: 'JobsMain' });
  const route = useRoute();
  const { user } = useAppSelector((state) => state.auth);
  const { isConnecting, connectionError, getChannel, createJobChannel } = useStreamChat();
  const { isReady: isChatClientReady } = useStreamChatClient();
  
  const { job, recipientId, conversationId: existingConversationId } = (route.params as RouteParams);
  
  const cachedChannel = existingConversationId
    ? streamChatService.getCachedChannelByCid(existingConversationId)
    : null;
  const [channel, setChannel] = useState<Channel | null>(cachedChannel);
  const [contactName, setContactName] = useState<string>(job?.employer_name || job?.company || '');
  const [isLoading, setIsLoading] = useState(!cachedChannel);
  const [error, setError] = useState<string | null>(null);
  const isInitializingChatRef = useRef(false);
  const sentInitialMessageCidsRef = useRef<Set<string>>(new Set());

  // Memoize route params to prevent unnecessary re-renders
  const routeParams = useMemo(() => ({ job, recipientId, existingConversationId }), [job?.id, recipientId, existingConversationId]);
  
  // Keep contactName in sync when navigating between chats
  useEffect(() => {
    setContactName(job?.employer_name || job?.company || '');
  }, [job?.id, job?.employer_name, job?.company]);

  // Reset local state when navigating between different job chats.
  useEffect(() => {
    setChannel(cachedChannel);
    setError(null);
    setIsLoading(!cachedChannel);
    isInitializingChatRef.current = false;
  }, [cachedChannel, job?.id, existingConversationId, recipientId]);

  const initializeChat = useCallback(async () => {
    if (!user || !job) {
      const friendly = getUserFacingError(new Error('Not authenticated'), {
        action: 'open this chat',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'Go Back', onPress: handleBack }]);
      return;
    }

    if (!isChatClientReady) {
      setError(
        getUserFacingError(new Error(connectionError || 'Chat not ready'), {
          action: 'open this chat',
          displayStyle: 'inline',
        }).message
      );
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let jobChannel: Channel | null = null;
      if (existingConversationId) {
        jobChannel = streamChatService.getCachedChannelByCid(existingConversationId);
      }

      if (!jobChannel && existingConversationId) {
        const parts = existingConversationId.split(':');
        if (parts.length === 2 && parts[0] && parts[1]) {
          jobChannel = await getChannel(parts[0] as any, parts[1]);
        }
      }

      if (!jobChannel) {
        jobChannel = await createJobChannel(job.id, job.employer_id, {
          title: job.title,
          company: job.company,
          location: job.location || '',
          salary: job.salary,
        });
      }

      if (!jobChannel) {
        throw new Error('Failed to create or load chat channel');
      }

      // Render immediately once we have a channel; hydrate and send any greeting in background.
      setChannel(jobChannel);

      // Derive proper display name from channel data or members
      const channelData = jobChannel.data as Record<string, unknown> | undefined;
      const members = Object.values(jobChannel.state.members);
      const otherMember = members.find(m => m.user_id !== user.id);
      const derivedName = otherMember?.user?.name || 
                          job.employer_name ||
                          channelData?.job_company as string || 
                          job.company;
      if (derivedName) {
        setContactName(derivedName);
      }

      // Send initial message if this is a new conversation
      if (!existingConversationId) {
        const cid = jobChannel.cid;
        if (cid && !sentInitialMessageCidsRef.current.has(cid)) {
          sentInitialMessageCidsRef.current.add(cid);
          InteractionManager.runAfterInteractions(() => {
            if (jobChannel.state.messages.length === 0) {
              jobChannel
                .sendMessage({
                  text: `Hi! I'm interested in the ${job.title} position at ${job.company}. Could we discuss this opportunity?`,
                })
                .catch(() => {});
            }
          });
        }
      }
    } catch (err) {
      setError(
        getUserFacingError(err, {
          action: 'open this chat',
          displayStyle: 'inline',
        }).message
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    user,
    routeParams.job,
    routeParams.recipientId,
    routeParams.existingConversationId,
    isChatClientReady,
    connectionError,
    getChannel,
    createJobChannel,
    handleBack,
    existingConversationId,
    job?.company,
    job?.title,
  ]);

  const handleRetry = useCallback(() => {
    setError(null);
    setChannel(null);
    setIsLoading(true);
    isInitializingChatRef.current = false;
  }, []);

  useEffect(() => {
    if (channel) return;

    if (isChatClientReady && !isInitializingChatRef.current) {
      isInitializingChatRef.current = true;
      void initializeChat().finally(() => {
        isInitializingChatRef.current = false;
      });
      return;
    }

    if (!isChatClientReady && !isConnecting && connectionError && !error) {
      setError(
        getUserFacingError(new Error(connectionError || 'Chat unavailable'), {
          action: 'open this chat',
          displayStyle: 'inline',
        }).message
      );
      setIsLoading(false);
    }
  }, [channel, connectionError, error, initializeChat, isChatClientReady, isConnecting]);

  const handleBackPress = useCallback(() => {
    handleBack();
  }, [handleBack]);

  const handleChannelInfoPress = useCallback(() => {
    if (!channel) return;
    const channelData = channel.data as Record<string, unknown> | undefined;
    Alert.alert(
      'Job Chat',
      `Position: ${channelData?.job_title || 'Unknown'}\nCompany: ${channelData?.job_company || 'Unknown'}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  }, [channel]);

  const handleNavigateToChats = useCallback(() => {
    (navigation as any).navigate('DateMiConversations');
  }, [navigation]);

  if (!user) {
    return null;
  }

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
        (navigation as any).navigate('ChatThread', {
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
