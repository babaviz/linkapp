/**
 * ChatChannelList Component
 * 
 * This component displays a list of the user's chat channels/conversations
 * using Stream Chat's React Native SDK. It follows LinkApp's design system
 * and includes custom styling, search functionality, and proper navigation.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel } from 'stream-chat';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonList } from '../common/SkeletonLoader';
import { useStreamChat } from '../../hooks/useStreamChat';
import { getUserFacingError } from '../../utils/userFacingError';
import { useStreamChatClient } from './StreamChatWrapper';
import { chatPrefetchService, type ChatChannelSnapshotItem, type ChatChannelListSnapshot } from '../../services/chatPrefetchService';
import { streamChatService } from '../../services/streamChatService';

export interface ChatChannelListProps {
  onChannelPress: (channel: Channel) => void;
  onChannelPressByCid?: (channelCid: string, channelName?: string) => void;
  onNewChatPress?: () => void;
  maxChannels?: number;
  showSearch?: boolean;
}

interface ChannelItemProps {
  channel: Channel;
  onPress: (channel: Channel) => void;
}

function formatTimeRelative(date: Date | string | undefined): string {
  if (!date) return '';

  const messageDate = new Date(date);
  const messageMs = messageDate.getTime();
  if (!Number.isFinite(messageMs)) return '';

  const now = Date.now();
  const diff = now - messageMs;

  if (diff < 60000) return 'now';
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h`;
  }

  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d`;

  return messageDate.toLocaleDateString();
}

const ChannelItem = React.memo<ChannelItemProps>(({ channel, onPress }) => {
  // Derive values from channel state + latest event override.
  // This ensures the list stays fresh without polling or forced refresh queries.
  const unreadCount = channel.countUnread();
  const latestMessage = channel.lastMessage() as { text?: string; created_at?: Date | string; attachments?: unknown[] } | undefined;
  const lastMessageText =
    (latestMessage?.text && latestMessage.text.trim().length > 0
      ? latestMessage.text
      : Array.isArray(latestMessage?.attachments) && latestMessage.attachments.length > 0
        ? 'Media message'
        : '');
  const lastMessageTime = formatTimeRelative(latestMessage?.created_at);

  const getChannelName = (): string => {
    const normalizeName = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const channelData = channel.data as any;
    const members = Object.values(channel.state.members);
    const currentUserId =
      (channel as any)?._client?.userID ||
      (channel as any)?._client?.userId ||
      '';
    const otherMembers = members.filter(member => member.user_id !== currentUserId);

    const isDateMiConversation =
      channelData?.datemi_conversation === true || !!channelData?.user1_id || !!channelData?.user2_id;

    // DateMi: channel.data.name can be the *current* user's name depending on who created the channel.
    if (isDateMiConversation && currentUserId) {
      const user1Id = normalizeName(channelData?.user1_id);
      const user2Id = normalizeName(channelData?.user2_id);
      const user1Name = normalizeName(channelData?.user1_name);
      const user2Name = normalizeName(channelData?.user2_name);

      let dateMiOtherName: string | undefined;
      if (user1Id && user2Id) {
        if (currentUserId === user1Id) dateMiOtherName = user2Name;
        else if (currentUserId === user2Id) dateMiOtherName = user1Name;
      }

      const normalizedDateMiOtherName = normalizeName(dateMiOtherName);
      if (normalizedDateMiOtherName) return normalizedDateMiOtherName;
    }

    // Non-DateMi channels: prefer channel data name if present.
    const normalizedChannelName = normalizeName(channelData?.name);
    if (normalizedChannelName && !isDateMiConversation) return normalizedChannelName;

    if (otherMembers.length > 0) {
      return otherMembers.map(member => member.user?.name || member.user_id || 'User').join(', ');
    }
    
    return 'Chat';
  };

  const getChannelIcon = (): string => {
    const channelType = channel.type;
    const channelData = channel.data as any;
    
    // Check for DateMi conversation flag (DateMi uses 'messaging' type internally)
    if (channelData?.datemi_conversation === true || channelData?.user1_id || channelData?.user2_id) {
      return 'heart';
    }
    
    switch (channelType) {
      case 'property': return 'home';
      case 'job': return 'briefcase';
      case 'service': return 'construct';
      case 'datemi': return 'heart';
      case 'support': return 'help-circle';
      case 'group': return 'people';
      default: return 'chatbubble';
    }
  };

  const getChannelDescription = (): string => {
    const channelData = channel.data;
    if ((channelData as any)?.property_title) return `Property: ${(channelData as any).property_location}`;
    if ((channelData as any)?.job_title) return `Job: ${(channelData as any).job_company}`;
    if ((channelData as any)?.service_name) return `Service: ${(channelData as any).service_category}`;
    return lastMessageText || 'No messages yet';
  };

  return (
    <TouchableOpacity
      style={styles.channelItem}
      onPress={() => onPress(channel)}
      activeOpacity={0.7}
    >
      <View style={styles.channelIcon}>
        <Ionicons
          name={getChannelIcon() as any}
          size={24}
          color={unreadCount > 0 ? '#3B82F6' : '#6B7280'}
        />
      </View>
      
      <View style={styles.channelContent}>
        <View style={styles.channelHeader}>
          <Text 
            style={[
              styles.channelName,
              unreadCount > 0 && styles.unreadChannelName
            ]}
            numberOfLines={1}
          >
            {getChannelName()}
          </Text>
          <Text style={styles.channelTime}>{lastMessageTime}</Text>
        </View>
        
        <View style={styles.channelFooter}>
          <Text 
            style={[
              styles.channelDescription,
              unreadCount > 0 && styles.unreadDescription
            ]}
            numberOfLines={1}
          >
            {getChannelDescription()}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});
ChannelItem.displayName = 'ChannelItem';

interface SnapshotChannelItemProps {
  item: ChatChannelSnapshotItem;
  onPress: (item: ChatChannelSnapshotItem) => void;
}

const SnapshotChannelItem = React.memo<SnapshotChannelItemProps>(({ item, onPress }) => {
  const unreadCount = item.unreadCount || 0;
  const lastMessageText = item.lastMessageText || '';
  const lastMessageTime = formatTimeRelative(item.lastMessageAt);

  const getChannelIcon = (): string => {
    const data = item.data || {};
    if ((data as any)?.datemi_conversation === true || (data as any)?.user1_id || (data as any)?.user2_id) {
      return 'heart';
    }

    switch (item.type) {
      case 'property':
        return 'home';
      case 'job':
        return 'briefcase';
      case 'service':
        return 'construct';
      case 'datemi':
        return 'heart';
      case 'support':
        return 'help-circle';
      case 'group':
        return 'people';
      default:
        return 'chatbubble';
    }
  };

  const getChannelDescription = (): string => {
    const data = item.data || {};
    if ((data as any)?.property_title) return `Property: ${(data as any).property_location || ''}`.trim();
    if ((data as any)?.job_title) return `Job: ${(data as any).job_company || ''}`.trim();
    if ((data as any)?.service_name) return `Service: ${(data as any).service_category || ''}`.trim();
    return lastMessageText || 'No messages yet';
  };

  return (
    <TouchableOpacity
      style={styles.channelItem}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.channelIcon}>
        <Ionicons
          name={getChannelIcon() as any}
          size={24}
          color={unreadCount > 0 ? '#3B82F6' : '#6B7280'}
        />
      </View>

      <View style={styles.channelContent}>
        <View style={styles.channelHeader}>
          <Text
            style={[styles.channelName, unreadCount > 0 && styles.unreadChannelName]}
            numberOfLines={1}
          >
            {item.name || 'Chat'}
          </Text>
          <Text style={styles.channelTime}>{lastMessageTime}</Text>
        </View>

        <View style={styles.channelFooter}>
          <Text
            style={[styles.channelDescription, unreadCount > 0 && styles.unreadDescription]}
            numberOfLines={1}
          >
            {getChannelDescription()}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});
SnapshotChannelItem.displayName = 'SnapshotChannelItem';

export const ChatChannelList: React.FC<ChatChannelListProps> = ({
  onChannelPress,
  onChannelPressByCid,
  onNewChatPress,
  maxChannels = 50,
  showSearch = true
}) => {
  const { isReady: isChatClientReady } = useStreamChatClient();
  const {
    isConnected,
    isConnecting,
    connectionError,
    searchChannels
  } = useStreamChat();

  type ListRow =
    | { key: string; kind: 'channel'; channel: Channel }
    | { key: string; kind: 'snapshot'; item: ChatChannelSnapshotItem };

  const [snapshot, setSnapshot] = useState<ChatChannelListSnapshot | null>(() => chatPrefetchService.getSnapshot());
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const searchRequestId = useRef(0);

  const snapshotItems = snapshot?.channels ?? [];
  const hasSnapshotChannels = snapshotItems.length > 0;

  /**
   * Refresh channels
   */
  const refreshChannels = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await chatPrefetchService.prefetchAfterConnect({ limit: maxChannels });
    } catch (_error: unknown) {
      const friendly = getUserFacingError(_error, {
        action: 'refresh conversations',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsRefreshing(false);
    }
  }, [maxChannels]);

  /**
   * Handle search
   */
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      searchRequestId.current += 1; // cancel any inflight request
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    if (!isChatClientReady) {
      searchRequestId.current += 1;
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    const requestId = (searchRequestId.current += 1);
    setIsSearching(true);
    try {
      const results = await searchChannels(query.trim());
      if (searchRequestId.current !== requestId) return;
      const uniqueByCid = Array.from(new Map(results.map((c) => [c.cid, c])).values());
      setSearchResults(uniqueByCid);
    } catch (_error) {
      if (searchRequestId.current !== requestId) return;
      // Fallback: local snapshot filter (computed in render).
      setSearchResults([]);
    } finally {
      if (searchRequestId.current === requestId) setIsSearching(false);
    }
  }, [isChatClientReady, searchChannels]);

  // Subscribe to prefetched snapshot updates (instant channel list rendering).
  useEffect(() => {
    return chatPrefetchService.subscribe((next) => {
      setSnapshot(next);
    });
  }, []);

  // Ensure we attempt an initial prefetch once connected, but never re-query on focus.
  useEffect(() => {
    if (!isConnected || !isChatClientReady) return;
    if (initialLoadComplete) return;

    let cancelled = false;
    chatPrefetchService
      .prefetchAfterConnect({ limit: maxChannels })
      .catch((_e) => {
        void _e;
      })
      .finally(() => {
        if (!cancelled) setInitialLoadComplete(true);
      });

    return () => {
      cancelled = true;
    };
  }, [initialLoadComplete, isChatClientReady, isConnected, maxChannels]);

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  if (!isChatClientReady && !isConnecting && !hasSnapshotChannels) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Not Connected</Text>
          <Text style={styles.errorMessage}>
            {connectionError || 'Unable to connect to chat service'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const localFilteredSnapshotItems = useMemo(() => {
    if (!trimmedQuery) return snapshotItems;
    return snapshotItems.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const last = (item.lastMessageText || '').toLowerCase();
      const data = item.data || {};
      const meta =
        String((data as any)?.property_title || '') +
        ' ' +
        String((data as any)?.property_location || '') +
        ' ' +
        String((data as any)?.job_title || '') +
        ' ' +
        String((data as any)?.job_company || '') +
        ' ' +
        String((data as any)?.service_name || '') +
        ' ' +
        String((data as any)?.service_category || '');
      return name.includes(trimmedQuery) || last.includes(trimmedQuery) || meta.toLowerCase().includes(trimmedQuery);
    });
  }, [snapshotItems, trimmedQuery]);

  const rows: ListRow[] = useMemo(() => {
    const limit = Math.max(1, maxChannels);
    const makeRow = (item: ChatChannelSnapshotItem): ListRow => {
      const ch = streamChatService.getCachedChannelByCid(item.cid);
      if (ch) return { key: ch.cid, kind: 'channel', channel: ch };
      return { key: item.cid, kind: 'snapshot', item };
    };

    if (trimmedQuery) {
      if (searchResults.length > 0) {
        return searchResults.slice(0, limit).map((ch) => ({ key: ch.cid, kind: 'channel', channel: ch }));
      }
      return localFilteredSnapshotItems.slice(0, limit).map(makeRow);
    }

    return snapshotItems.slice(0, limit).map(makeRow);
  }, [localFilteredSnapshotItems, maxChannels, searchResults, snapshotItems, trimmedQuery]);

  const shouldShowLoading =
    (isConnecting && !hasSnapshotChannels) ||
    (!initialLoadComplete && !hasSnapshotChannels && isChatClientReady && isConnected);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        {onNewChatPress && (
          <TouchableOpacity onPress={onNewChatPress} style={styles.newChatButton}>
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#6B7280" style={{ marginRight: 8 }} />
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {shouldShowLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {isConnecting ? 'Connecting…' : 'Loading conversations…'}
          </Text>
          <SkeletonList itemCount={7} showAvatar style={{ width: '100%', marginTop: 12 }} />
        </View>
      ) : (
        <FlatList
          style={styles.channelsList}
          data={rows}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) =>
            item.kind === 'channel' ? (
              <ChannelItem channel={item.channel} onPress={onChannelPress} />
            ) : (
              <SnapshotChannelItem
                item={item.item}
                onPress={(snapshotItem) => {
                  if (onChannelPressByCid) {
                    onChannelPressByCid(snapshotItem.cid, snapshotItem.name);
                  }
                }}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshChannels}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </Text>
              <Text style={styles.emptyMessage}>
                {searchQuery ? 'Try searching with different keywords' : 'Start chatting by browsing properties, jobs, or services'}
              </Text>
            </View>
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  newChatButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  channelsList: {
    flex: 1,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelContent: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  unreadChannelName: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  channelTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  channelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelDescription: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  unreadDescription: {
    fontWeight: '600',
    color: '#374151',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
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
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
