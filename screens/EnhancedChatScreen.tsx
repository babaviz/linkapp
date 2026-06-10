/**
 * Enhanced ChatScreen
 * 
 * This screen provides comprehensive chat functionality including:
 * - Optimistic UI updates
 * - Error handling with retry mechanisms
 * - Pull-to-refresh and infinite scroll
 * - Connection status monitoring
 * - Performance optimizations with React.memo and virtualization
 * - Dark mode support
 * - Accessibility features
 * - Loading states and skeleton screens
 */

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  useColorScheme,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel } from 'stream-chat';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { MessageResponse } from 'stream-chat';
import { ChannelList, useChannelPreviewDisplayName, useLatestMessagePreview } from 'stream-chat-expo';
import { Ionicons } from '@expo/vector-icons';
import { useStreamChat } from '../hooks/useStreamChat';
import { ChatColors } from '../theme/streamChatTheme';
import { MessageThreadModal } from '../components/chat/MessageThreadModal';
import { getUserFacingError } from '../utils/userFacingError';

// Navigation types (avoid any)
type RootParamList = Record<string, object | undefined>;
type ChatNavigationProp = StackNavigationProp<RootParamList, 'Chat'>;
type ChatRouteProp = RouteProp<RootParamList, 'Chat'>;

interface Props {
  navigation: ChatNavigationProp;
  route: ChatRouteProp;
}

// Connection Status Banner
const ConnectionBanner = React.memo(({ 
  isConnected, 
  isConnecting, 
  error,
  onRetry,
}: {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  onRetry: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (!isConnected || error) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: -50,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
    }
  }, [isConnected, error, slideAnim]);

  const getBannerColor = () => {
    if (error) return ChatColors.error;
    if (isConnecting) return ChatColors.warning;
    return ChatColors.success;
  };

  const getBannerText = () => {
    if (error) return 'Connection failed';
    if (isConnecting) return 'Connecting...';
    return 'Connected';
  };

  return (
    <Animated.View
      style={[
        styles.connectionBanner,
        { 
          backgroundColor: getBannerColor(),
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.bannerContent}>
        {isConnecting ? (
          <ActivityIndicator size="small" color={ChatColors.white} />
        ) : (
          <Ionicons 
            name={error ? 'alert-circle' : 'checkmark-circle'} 
            size={16} 
            color={ChatColors.white} 
          />
        )}
        <Text style={styles.bannerText}>{getBannerText()}</Text>
        {error && (
          <Text style={styles.retryText} onPress={onRetry}>
            Retry
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

// Enhanced Channel List with optimistic updates and error handling
const OptimisticChannelList = React.memo(({
  onChannelPress,
  isDarkMode,
}: {
  onChannelPress: (channel: Channel) => void;
  isDarkMode: boolean;
}) => {
  const {
    isConnected,
    isConnecting,
    connectionError,
    reconnect,
    user,
  } = useStreamChat();

  const CustomChannelPreview = useCallback(
    ({ channel, onSelect }: { channel: Channel; onSelect: (c: Channel) => void }) => {
      const displayName = useChannelPreviewDisplayName(channel);
      const latestMessagePreview = useLatestMessagePreview(
        channel,
        channel.state.messages.length,
      );
      const unreadCount = channel.countUnread();
      const previewText = latestMessagePreview?.previews?.map((p) => p.text).join('') || '';
      const currentUserId =
        (channel as any)?._client?.userID ||
        (channel as any)?._client?.userId ||
        '';
      const members = Object.values(channel.state.members || {});
      const otherMember = members.find((member) => member.user_id !== currentUserId);
      const avatarUrl = otherMember?.user?.image as string | undefined;
      const avatarInitial = displayName?.trim()?.charAt(0)?.toUpperCase() || '?';

      return (
        <TouchableOpacity
          style={[
            styles.previewRow,
            isDarkMode && styles.previewRowDark,
            unreadCount > 0 && (isDarkMode ? styles.previewRowUnreadDark : styles.previewRowUnread),
          ]}
          onPress={() => onSelect(channel)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Open conversation ${displayName}${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <View style={styles.previewAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.previewAvatarImage} />
            ) : (
              <View style={styles.previewAvatarFallback}>
                <Text style={styles.previewAvatarInitial}>{avatarInitial}</Text>
              </View>
            )}
          </View>

          <View style={styles.previewContent}>
            <View style={styles.previewTopRow}>
              <Text style={[styles.previewTitle, isDarkMode && styles.previewTitleDark]} numberOfLines={1}>
                {displayName}
              </Text>
              {unreadCount > 0 ? (
                <View style={styles.previewUnreadBadge}>
                  <Text style={styles.previewUnreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </View>

            <Text
              style={[styles.previewSubtitle, isDarkMode && styles.previewSubtitleDark]}
              numberOfLines={1}
            >
              {previewText || 'No messages yet'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [isDarkMode]
  );

  const filters = useMemo(
    () => ({
      members: { $in: user?.id ? [user.id] : [] },
    }),
    [user?.id],
  );

  if (!isConnected && !isConnecting && !connectionError) {
    return (
      <View style={[styles.emptyState, isDarkMode && styles.darkEmptyState]}>
        <Ionicons name="chatbubbles-outline" size={64} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
        <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
          Chat Unavailable
        </Text>
        <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtext]}>
          Unable to connect to chat service
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.channelListContainer, isDarkMode && styles.darkContainer]}>
      <ChannelList
        filters={filters}
        sort={{ last_message_at: -1 as const }}
        options={{
          // Performance: don't watch/presence for the full list; watch on open.
          state: true,
          watch: false,
          presence: false,
          limit: 30,
          message_limit: 1,
        }}
        onSelect={onChannelPress}
        Preview={CustomChannelPreview as any}
        additionalFlatListProps={{
          keyExtractor: (item: { cid?: string; type?: string; id?: string }) =>
            item?.cid || `${item?.type ?? 'channel'}:${item?.id ?? ''}`,
        }}
      />
    </View>
  );
});

// Main Enhanced Chat Screen
export default function EnhancedChatScreen({ navigation }: Props) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const {
    isConnected,
    isConnecting,
    connectionError,
    reconnect,
  } = useStreamChat();

  const [showThreadModal, setShowThreadModal] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageResponse | null>(null);

  // Handle channel press with error boundary
  const handleChannelPress = useCallback((channel: Channel) => {
    try {
      const channelData = channel.data as { name?: string } | undefined;
      navigation.navigate('ChatChannel', {
        channelCid: channel.cid,
        channel: channel,
        channelName: channelData?.name ?? 'Chat'
      });
    } catch (_error) {
      void _error;
      const friendly = getUserFacingError(_error, {
        action: 'open this conversation',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  }, [navigation]);


  // Handle connection retry
  const handleConnectionRetry = useCallback(async () => {
    try {
      await reconnect();
    } catch (_error) {
      void _error;
      const friendly = getUserFacingError(_error, {
        action: 'reconnect to chat',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  }, [reconnect]);

  // Set status bar style based on dark mode
  useEffect(() => {
    StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
  }, [isDarkMode]);

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <StatusBar
        backgroundColor={isDarkMode ? '#111827' : ChatColors.gray50}
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />

      <ConnectionBanner
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={connectionError || undefined}
        onRetry={handleConnectionRetry}
      />

      <OptimisticChannelList
        onChannelPress={handleChannelPress}
        isDarkMode={isDarkMode}
      />

      <MessageThreadModal
        visible={showThreadModal}
        onClose={() => {
          setShowThreadModal(false);
          setSelectedThread(null);
        }}
        parentMessage={selectedThread}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ChatColors.gray50,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  connectionBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerText: {
    color: ChatColors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  retryText: {
    color: ChatColors.white,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  channelListContainer: {
    flex: 1,
    backgroundColor: ChatColors.gray50,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  darkEmptyState: {
    backgroundColor: '#111827',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ChatColors.gray900,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: ChatColors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  darkText: {
    color: '#F9FAFB',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  darkErrorState: {
    backgroundColor: '#111827',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ChatColors.gray900,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: ChatColors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: ChatColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: ChatColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: ChatColors.gray600,
  },

  // Channel preview row (used by ChannelList Preview)
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  previewRowDark: {
    borderBottomColor: '#374151',
  },
  previewRowUnread: {
    backgroundColor: '#EBF4FF',
  },
  previewRowUnreadDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  previewAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContent: {
    flex: 1,
    marginLeft: 12,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  previewTitleDark: {
    color: '#F9FAFB',
  },
  previewSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  previewSubtitleDark: {
    color: '#9CA3AF',
  },
  previewUnreadBadge: {
    backgroundColor: ChatColors.primary,
    borderRadius: 9999,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewUnreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

