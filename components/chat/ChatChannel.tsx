/**
 * ChatChannel Component
 * 
 * This component renders an individual chat channel/conversation using
 * Stream Chat's React Native UI components with custom theming and styling
 * to match LinkApp's design system.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MessageResponse } from 'stream-chat';
import { Channel as StreamChannel } from 'stream-chat';
import {
  Channel,
  MessageList,
  MessageInput,
  Thread,
} from 'stream-chat-expo';
import type { DeepPartial, Theme } from 'stream-chat-expo';
import { streamChatTheme, messageThemeVariants } from '../../theme/streamChatTheme';
import { useStreamChatClient } from './StreamChatWrapper';

export interface ChatChannelProps {
  channel: StreamChannel;
  onBackPress: () => void;
  onChannelInfoPress?: () => void;
  showThread?: boolean;
}

export const ChatChannel: React.FC<ChatChannelProps> = ({
  channel,
  onBackPress,
  onChannelInfoPress,
  showThread = true,
}) => {
  // Check if Stream Chat client is available
  const { client, isReady: isClientReady } = useStreamChatClient();
  
  const [channelName, setChannelName] = useState<string>('');
  const [memberCount, setMemberCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [thread, setThread] = useState<MessageResponse | null>(null);
  const [isChannelReady, setIsChannelReady] = useState<boolean>(false);

  /**
   * Ensure channel is watched and messages are loaded
   * This is critical for messages to appear
   */
  useEffect(() => {
    if (!channel) return;

    const ensureChannelWatched = async () => {
      try {
        // Always watch the channel to ensure real-time updates work
        // The SDK handles duplicate watch calls gracefully
        await channel.watch({ state: true, presence: true } as any);

        // Do not block UI on historical hydration; watch() is enough to render + subscribe.
        setIsChannelReady(true);

        // Best-effort background hydration (do not await).
        channel
          .query({ messages: { limit: 50 } } as any)
          .catch((_e) => {
            void _e;
          });
      } catch (error) {
        // Channel might already be watched or there's an error
        // Still set ready to allow rendering
        setIsChannelReady(true);
      }
    };

    ensureChannelWatched();
  }, [channel]);

  /**
   * Initialize channel data
   */
  useEffect(() => {
    if (!channel) return;

    const updateChannelInfo = () => {
      // Set channel name
      if ((channel.data as any)?.name) {
        setChannelName((channel.data as any).name);
      } else {
        const members = Object.values(channel.state.members);
        const otherMembers = members.filter(
          member => member.user_id !== channel._client.userID
        );
        
        if (otherMembers.length > 0) {
          const names = otherMembers.map(member => member.user?.name || 'User');
          setChannelName(names.join(', '));
        } else {
          setChannelName('Chat');
        }
      }

      // Set member count
      setMemberCount(Object.keys(channel.state.members).length);

      // Check if anyone is online (for direct messages)
      const members = Object.values(channel.state.members);
      const hasOnlineMembers = members.some(
        member => member.user?.online && member.user_id !== channel._client.userID
      );
      setIsOnline(hasOnlineMembers);
    };

    updateChannelInfo();

    // Listen for channel updates
    channel.on('message.new', updateChannelInfo);
    channel.on('member.added', updateChannelInfo);
    channel.on('member.removed', updateChannelInfo);
    channel.on('user.presence.changed', updateChannelInfo);

    return () => {
      channel.off('message.new', updateChannelInfo);
      channel.off('member.added', updateChannelInfo);
      channel.off('member.removed', updateChannelInfo);
      channel.off('user.presence.changed', updateChannelInfo);
    };
  }, [channel]);

  /**
   * Get channel type icon
   */
  const getChannelTypeIcon = (): string => {
    if (!channel?.type) return 'chatbubble';
    
    const channelData = channel.data as any;
    
    // Check for DateMi conversation flag (DateMi uses 'messaging' type internally)
    if (channelData?.datemi_conversation === true || channelData?.user1_id || channelData?.user2_id) {
      return 'heart';
    }
    
    switch (channel.type) {
      case 'property': return 'home';
      case 'job': return 'briefcase';
      case 'service': return 'construct';
      case 'datemi': return 'heart';
      case 'support': return 'help-circle';
      case 'group': return 'people';
      default: return 'chatbubble';
    }
  };

  /**
   * Get channel subtitle
   */
  const getChannelSubtitle = (): string => {
    if (!channel?.data) return '';

    // For property channels
    if ((channel.data as any).property_title) {
      return `Property: ${(channel.data as any).property_location || 'Location'}`;
    }

    // For job channels  
    if ((channel.data as any).job_title) {
      return `Job at ${(channel.data as any).job_company || 'Company'}`;
    }

    // For service channels
    if ((channel.data as any).service_name) {
      return `Service: ${(channel.data as any).service_category || 'Category'}`;
    }

    // For direct messages, show online status
    if (channel.type === 'messaging' || channel.type === 'datemi') {
      if (memberCount === 2) {
        return isOnline ? 'Online' : 'Last seen recently';
      }
      return `${memberCount} members`;
    }

    return `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
  };

  const closeThread = useCallback(() => {
    setThread(null);
  }, []);

  /**
   * Custom header component
   */
  const ChatHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => {
          if (thread) {
            closeThread();
          } else {
            onBackPress();
          }
        }}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.headerContent}
        onPress={onChannelInfoPress}
        activeOpacity={0.7}
      >
        <View style={styles.channelIconContainer}>
          <Ionicons
            name={getChannelTypeIcon() as any}
            size={20}
            color="#3B82F6"
          />
        </View>
        
        <View style={styles.headerTextContainer}>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {channelName}
          </Text>
          <Text style={styles.channelSubtitle} numberOfLines={1}>
            {getChannelSubtitle()}
          </Text>
        </View>
      </TouchableOpacity>

      {onChannelInfoPress && (
        <TouchableOpacity
          onPress={onChannelInfoPress}
          style={styles.infoButton}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle" size={24} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  );

  /**
   * Get custom theme based on channel type
   * Properly typed as DeepPartial<Theme> for Stream Chat compatibility
   */
  const getChannelTheme = (): DeepPartial<Theme> => {
    const channelType = channel?.type;
    let customTheme: DeepPartial<Theme> = { ...streamChatTheme };
    
    // Apply message variant theme based on channel type
    if (channelType && messageThemeVariants[channelType as keyof typeof messageThemeVariants]) {
      const variant = messageThemeVariants[channelType as keyof typeof messageThemeVariants];
      customTheme = {
        ...customTheme,
        messageSimple: {
          ...customTheme.messageSimple,
          content: {
            ...customTheme.messageSimple?.content,
            containerInner: {
              ...customTheme.messageSimple?.content?.containerInner,
              ...variant.containerInner,
            },
          },
        },
      } as DeepPartial<Theme>;
    }
    
    return customTheme;
  };

  // Avoid unused warning (theme is applied via StreamChatWrapper OverlayProvider)
  void getChannelTheme;

  // Show loading state while channel is being initialized or client is not ready
  if (!isChannelReady || !isClientReady || !client) {
    return (
      <SafeAreaView style={styles.container}>
        <ChatHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>
            {!client ? 'Connecting to chat...' : 'Loading messages...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader />
      
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <Channel
          channel={channel}
          threadList={!!thread}
          thread={thread as unknown as Parameters<typeof Channel>[0]['thread']}
        >
          {showThread && thread ? (
            <Thread
              onThreadDismount={closeThread}
              closeThreadOnDismount={true}
            />
          ) : (
            <>
              <MessageList
                onThreadSelect={(selected) => {
                  if (showThread && selected) {
                    setThread(selected as unknown as MessageResponse);
                  }
                }}
              />
              <MessageInput />
            </>
          )}
        </Channel>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  channelSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
  chatContainer: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  threadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
