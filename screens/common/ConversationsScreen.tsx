/**
 * ConversationsScreen - Inbox notifications feed
 * Shows chat conversations plus DateMi missed calls + likes, sorted by latest activity.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  StyleSheet,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { type ChatConversation, chatService } from '../../services/chatService';
import { getDynamicDimensions, spacing } from '../../utils/responsive';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';
import { navigateToMainTab } from '../../navigation/mainTabNavigation';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common';
import { getUserFacingError } from '../../utils/userFacingError';
import { PremiumPaywall } from '../../components/datemi/PremiumPaywall';
import { useStreamChat } from '../../hooks/useStreamChat';
import { chatPrefetchService, type ChatChannelListSnapshot, type ChatChannelSnapshotItem } from '../../services/chatPrefetchService';
import type { ChatMessage } from '../../components/common/ChatInterface';
import useDateMiAccess from '../../hooks/useDateMiAccess';
import dateMiNotificationManager from '../../services/dateMiNotificationManager';
import { startCall } from '../../redux/slices/callSlice';
import { mergeProfiles } from '../../redux/slices/datemiSlice';

type InboxFilter = 'all' | 'property' | 'job' | 'service' | 'datemi';

type InboxEventBadge = {
  text: string;
  icon?: string;
  count?: number;
  backgroundColor: string;
  textColor?: string;
};

type InboxRowAction = {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
};

type InboxRowModel = {
  id: string;
  category: ChatConversation['type'];
  title: string;
  preview?: string;
  timeIso: string;
  metadataTitle?: string;
  unreadCount?: number;
  badge?: InboxEventBadge;
  action?: InboxRowAction;
  isBlurred?: boolean;
  onPress: () => void;
};

type DateMiInboxSignals = {
  missedCallsByUserId: Record<
    string,
    { userId: string; latestAt: string; type: 'audio' | 'video'; count: number }
  >;
  likesByUserId: Record<
    string,
    { userId: string; latestAt: string; isSuperLike: boolean; count: number }
  >;
  profilesByUserId: Record<
    string,
    { userId: string; profileId: string; displayName: string; profileImage?: string }
  >;
};

type DateMiLatestEventKind = 'message' | 'missed_call' | 'like';

const getChatTypeIcon = (type: string) => {
  switch (type) {
    case 'property':
      return '🏠';
    case 'job':
      return '💼';
    case 'service':
      return '🔧';
    case 'datemi':
      return '💕';
    default:
      return '💬';
  }
};

const getChatTypeColor = (type: string) => {
  switch (type) {
    case 'property':
      return '#10B981';
    case 'job':
      return '#3B82F6';
    case 'service':
      return '#F59E0B';
    case 'datemi':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const formatRelativeTime = (timestampIso: string) => {
  const nowMs = Date.now();
  const tsMs = new Date(timestampIso).getTime();
  if (!Number.isFinite(tsMs)) return '';

  const diffMs = nowMs - tsMs;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return new Date(tsMs).toLocaleDateString();
};

const InboxRow: React.FC<{ row: InboxRowModel }> = ({ row }) => {
  if (!row) return null;

  const { isTablet } = getDynamicDimensions();
  const typeColor = getChatTypeColor(row.category);
  const badgeTextColor = row.badge?.textColor ?? '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={row.onPress}
      style={{
        backgroundColor: '#FFFFFF',
        marginHorizontal: spacing.lg,
        marginVertical: spacing.xs,
        borderRadius: 16,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        ...getCrossPlatformShadow({
          width: 0,
          height: 2,
          radius: 8,
          opacity: 0.1,
          color: '#000',
          elevation: 3,
        }),
        borderWidth: 1,
        borderColor: '#F3F4F6',
      }}
      activeOpacity={0.85}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: `${typeColor}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
          borderWidth: 2,
          borderColor: typeColor,
        }}
      >
        <Text style={{ fontSize: 20 }}>{getChatTypeIcon(row.category)}</Text>
      </View>

      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text
          style={{
            fontSize: isTablet ? 16 : 15,
            fontWeight: '600',
            color: '#111827',
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {row.title}
        </Text>

        {row.preview ? (
          <Text
            style={{
              fontSize: 14,
              color: '#6B7280',
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {row.preview}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: typeColor,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              marginRight: spacing.sm,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: '#FFFFFF',
                fontWeight: '700',
                textTransform: 'capitalize',
              }}
            >
              {row.category}
            </Text>
          </View>

          {row.metadataTitle ? (
            <Text
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {row.metadataTitle}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        {row.badge ? (
          <View
            style={{
              backgroundColor: row.badge.backgroundColor,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {row.badge.icon ? (
              <Text style={{ fontSize: 12, marginRight: 6, color: badgeTextColor }}>{row.badge.icon}</Text>
            ) : null}
            <Text style={{ fontSize: 11, fontWeight: '800', color: badgeTextColor }}>
              {row.badge.text}
              {typeof row.badge.count === 'number' && row.badge.count > 1 ? ` ${row.badge.count}` : ''}
            </Text>
          </View>
        ) : null}

        <Text
          style={{
            fontSize: 12,
            color: '#6B7280',
            marginTop: row.badge ? 6 : 0,
          }}
        >
          {formatRelativeTime(row.timeIso)}
        </Text>

        {row.action ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              row.action?.onPress();
            }}
            style={{
              marginTop: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: row.action.backgroundColor,
              borderWidth: row.action.borderColor ? 1 : 0,
              borderColor: row.action.borderColor,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 92,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: row.action.textColor, fontSize: 12, fontWeight: '800' }}>
              {row.action.label}
            </Text>
          </TouchableOpacity>
        ) : typeof row.unreadCount === 'number' && row.unreadCount > 0 ? (
          <View
            style={{
              marginTop: 10,
              backgroundColor: typeColor,
              borderRadius: 12,
              minWidth: 24,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 6,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: '800',
              }}
            >
              {row.unreadCount > 99 ? '99+' : row.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>

      {row.isBlurred ? (
        <View style={styles.blurOverlay} pointerEvents="none">
          <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.blurContent}>
            <Text style={styles.blurIcon}>🔒</Text>
            <Text style={styles.blurText}>Upgrade to message</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

function resolveOtherUserIdForConversation(conversation: ChatConversation, currentUserId: string): string | null {
  const fromParticipants = (conversation.participants || []).find((p) => p !== currentUserId);
  if (fromParticipants) return fromParticipants;

  if (
    conversation.type === 'datemi' &&
    conversation.metadata?.datemiUser1Id &&
    conversation.metadata?.datemiUser2Id
  ) {
    if (currentUserId === conversation.metadata.datemiUser1Id) return conversation.metadata.datemiUser2Id;
    if (currentUserId === conversation.metadata.datemiUser2Id) return conversation.metadata.datemiUser1Id;
  }

  return null;
}

function safeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function snapshotToConversations(snapshot: ChatChannelListSnapshot | null): ChatConversation[] {
  if (!snapshot || !Array.isArray(snapshot.channels)) return [];
  const fallbackIso = (() => {
    const ms = typeof snapshot.savedAtMs === 'number' ? snapshot.savedAtMs : Date.now();
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
  })();

  const toConversationType = (item: ChatChannelSnapshotItem): ChatConversation['type'] => {
    const data = item.data || {};
    const isDateMi =
      (data as any)?.datemi_conversation === true || !!(data as any)?.user1_id || !!(data as any)?.user2_id;
    if (isDateMi) return 'datemi';

    if ((data as any)?.property_id || (data as any)?.property_title || item.type === 'property') return 'property';
    if ((data as any)?.job_id || (data as any)?.job_title || item.type === 'job') return 'job';
    if ((data as any)?.service_id || (data as any)?.service_name || item.type === 'service') return 'service';
    return 'general';
  };

  const toMetadata = (item: ChatChannelSnapshotItem): ChatConversation['metadata'] => {
    const data = item.data || {};
    const meta: ChatConversation['metadata'] = {};

    const type = toConversationType(item);
    if (type === 'property') {
      const propertyId = safeString((data as any)?.property_id);
      const title = safeString((data as any)?.property_title) || safeString(item.name);
      if (propertyId) meta.propertyId = propertyId;
      if (title) meta.title = title;
      const imageUrl = safeString((data as any)?.property_image) || safeString(item.image);
      if (imageUrl) meta.imageUrl = imageUrl;
      return meta;
    }

    if (type === 'job') {
      const jobId = safeString((data as any)?.job_id);
      const title = safeString((data as any)?.job_title) || safeString(item.name);
      if (jobId) meta.jobId = jobId;
      if (title) meta.title = title;
      return meta;
    }

    if (type === 'service') {
      const serviceId = safeString((data as any)?.service_id);
      const title = safeString((data as any)?.service_name) || safeString(item.name);
      if (serviceId) meta.serviceId = serviceId;
      if (title) meta.title = title;
      const imageUrl = safeString((data as any)?.service_image) || safeString(item.image);
      if (imageUrl) meta.imageUrl = imageUrl;
      return meta;
    }

    if (type === 'datemi') {
      const user1Id = safeString((data as any)?.user1_id);
      const user1Name = safeString((data as any)?.user1_name);
      const user2Id = safeString((data as any)?.user2_id);
      const user2Name = safeString((data as any)?.user2_name);
      if (user1Id) meta.datemiUser1Id = user1Id;
      if (user1Name) meta.datemiUser1Name = user1Name;
      if (user2Id) meta.datemiUser2Id = user2Id;
      if (user2Name) meta.datemiUser2Name = user2Name;
      const title = safeString(item.name);
      if (title) meta.title = title;
      return meta;
    }

    const title = safeString(item.name);
    if (title) meta.title = title;
    return meta;
  };

  const toLastMessage = (item: ChatChannelSnapshotItem): ChatMessage | undefined => {
    const text = safeString(item.lastMessageText);
    if (!text) return undefined;
    const ts = safeString(item.lastMessageAt) || fallbackIso;

    return {
      id: `snapshot_${item.cid}_${ts}`,
      senderId: '',
      senderName: '',
      message: text,
      timestamp: ts,
      type: 'text',
      status: 'delivered',
    };
  };

  return snapshot.channels.map((item) => ({
    id: item.cid,
    type: toConversationType(item),
    participants: Array.isArray(item.memberIds) ? item.memberIds : [],
    lastMessage: toLastMessage(item),
    lastActivity: safeString(item.lastMessageAt) || fallbackIso,
    unreadCount: typeof item.unreadCount === 'number' ? item.unreadCount : 0,
    metadata: toMetadata(item),
  }));
}

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { isConnected, isConnecting, connectionError, reconnect } = useStreamChat();
  const [snapshot, setSnapshot] = useState<ChatChannelListSnapshot | null>(() => chatPrefetchService.getSnapshot());
  const conversations = useMemo(() => snapshotToConversations(snapshot), [snapshot]);
  const { isTablet } = getDynamicDimensions();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTitle, setPaywallTitle] = useState('This conversation');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const requestedInitialPrefetchRef = useRef(false);
  const dateMiAccess = useDateMiAccess({ enabled: Boolean(user?.id) });
  const dateMiMessagingAllowed = Boolean(dateMiAccess.canMessage);
  const dateMiNewLikes = useAppSelector((state) => state.datemi.notifications.newLikes);
  const dateMiMissedCalls = useAppSelector((state) => state.datemi.notifications.missedCalls);
  const dateMiProfilesInStore = useAppSelector((state) => state.datemi.profiles);

  // Tracks when the first DateMi access check has completed so the blur overlay and
  // paywall are never shown prematurely to entitled users on initial render.
  const [dateMiAccessChecked, setDateMiAccessChecked] = useState(false);

  const [dateMiSignals, setDateMiSignals] = useState<DateMiInboxSignals>(() => ({
    missedCallsByUserId: {},
    likesByUserId: {},
    profilesByUserId: {},
  }));
  const lastSignalsFetchAtMsRef = useRef(0);

  // Subscribe to prefetched channel list snapshots for instant rendering.
  useEffect(() => {
    return chatPrefetchService.subscribe((next) => {
      setSnapshot(next);
    });
  }, []);

  // Reset one-time bootstrap when the authenticated user changes.
  useEffect(() => {
    requestedInitialPrefetchRef.current = false;
    setInitialLoadComplete(false);
  }, [user?.id]);

  // Clear stale signals immediately when the user changes so no previous user's
  // missed calls or likes are ever shown to a newly signed-in account.
  useEffect(() => {
    setDateMiSignals({ missedCallsByUserId: {}, likesByUserId: {}, profilesByUserId: {} });
    lastSignalsFetchAtMsRef.current = 0;
  }, [user?.id]);

  // Perform an explicit access refresh so `dateMiAccessChecked` is only true once
  // the real tier has been resolved. This prevents the blur/paywall from flashing
  // for entitled users on initial render while status=null (canMessage=false).
  useEffect(() => {
    let cancelled = false;
    setDateMiAccessChecked(false);
    if (!user?.id) {
      setDateMiAccessChecked(true);
      return;
    }
    dateMiAccess.refresh().finally(() => {
      if (!cancelled) setDateMiAccessChecked(true);
    });
    return () => {
      cancelled = true;
    };
    // Only re-run when the user changes, not on every refresh reference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const refreshDateMiSignals = useCallback(
    async (_reason: string, force = false) => {
      if (!user?.id) {
        setDateMiSignals({ missedCallsByUserId: {}, likesByUserId: {}, profilesByUserId: {} });
        return;
      }

      const now = Date.now();
      const minIntervalMs = 1500;
      if (!force && now - lastSignalsFetchAtMsRef.current < minIntervalMs) {
        return;
      }
      lastSignalsFetchAtMsRef.current = now;

      try {
        const next = await dateMiNotificationManager.getInboxSignals({ maxRowsPerTable: 200 });
        setDateMiSignals(next);
      } catch {
        // Keep the last-known-good signals on transient network errors instead of
        // clearing them, which would cause visible rows to disappear.
      }
    },
    [user?.id]
  );

  useEffect(() => {
    void refreshDateMiSignals('userOrBadgeChange');
  }, [dateMiMissedCalls, dateMiNewLikes, refreshDateMiSignals]);

  useFocusEffect(
    useCallback(() => {
      void refreshDateMiSignals('focus');
    }, [refreshDateMiSignals])
  );

  // Ensure we attempt an initial prefetch once connected, but never block the UI.
  useEffect(() => {
    if (!user?.id) return;
    if (!isConnected) return;
    if (requestedInitialPrefetchRef.current) return;

    requestedInitialPrefetchRef.current = true;
    let cancelled = false;

    chatPrefetchService
      .prefetchAfterConnect({ limit: 80 })
      .catch((_e) => {
        void _e;
      })
      .finally(() => {
        if (!cancelled) setInitialLoadComplete(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, user?.id]);

  const handleRefresh = async () => {
    if (!user?.id) return;

    setRefreshing(true);
    try {
      if (!isConnected) {
        await reconnect();
      }
      await chatPrefetchService.prefetchAfterConnect({ limit: 80 });
      await refreshDateMiSignals('pullToRefresh', true);
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'refresh conversations',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConversationPress = useCallback(
    (conversation: ChatConversation) => {
      if (!user?.id) return; // Guard against null user

      const currentUserId = user.id;
      const otherUserId = resolveOtherUserIdForConversation(conversation, currentUserId);
      if (!otherUserId) {
        Alert.alert('Chat unavailable', 'We could not determine the other participant for this chat.');
        return;
      }

      // Navigate to appropriate chat screen based on type
      switch (conversation.type) {
        case 'property':
          navigation.navigate('PropertyChat', {
            // Provide safe defaults; PropertyChatScreen must tolerate partial objects.
            property: {
              id: conversation.metadata?.propertyId,
              title: conversation.metadata?.title,
              owner_id: otherUserId,
              images: [],
              location: '',
            } as any,
            conversationId: conversation.id,
          });
          break;
        case 'job':
          navigation.navigate('JobChat', {
            job: {
              id: conversation.metadata?.jobId,
              title: conversation.metadata?.title,
              company: '',
              employer_id: otherUserId,
            },
            recipientId: otherUserId,
            recipientName: '',
            conversationId: conversation.id,
          });
          break;
        case 'service':
          navigation.navigate('ServiceChat', {
            service: {
              id: conversation.metadata?.serviceId,
              title: conversation.metadata?.title,
              category: '',
              provider_id: otherUserId,
            },
            recipientId: otherUserId,
            recipientName: '',
            conversationId: conversation.id,
          });
          break;
        case 'datemi': {
          if (dateMiAccessChecked && !dateMiMessagingAllowed) {
            setPaywallTitle(chatService.getConversationTitle(conversation, currentUserId));
            setShowPaywall(true);
            return;
          }
          const matchName = chatService.getConversationTitle(conversation, currentUserId);
          navigation.navigate('DateMiChat', {
            match: {
              id: otherUserId,
              name: matchName,
            },
            recipientId: otherUserId,
            conversationId: conversation.id,
          });
          break;
        }
      }
    },
    [dateMiAccessChecked, dateMiMessagingAllowed, navigation, user?.id]
  );

  // Pre-loads a DateMi profile into Redux before navigating to ProfileViewScreen.
  // ProfileViewScreen looks up profiles exclusively from Redux state, so if the
  // liker's profile was never browsed it would show "Profile not found" without this.
  const handleViewProfile = useCallback(
    async (profileId: string | undefined) => {
      if (!profileId) {
        Alert.alert('Profile unavailable', "We couldn't load this profile right now.");
        return;
      }

      const isInStore = dateMiProfilesInStore.some((p) => p.id === profileId);

      if (!isInStore) {
        try {
          const { DateMiProfileService } = await import('../../services/dateMiService');
          const fetched = await DateMiProfileService.getProfile(profileId);
          if (fetched) {
            dispatch(mergeProfiles([fetched]));
          }
        } catch {
          // Proceed anyway; ProfileViewScreen will show "Profile not found" if it fails.
        }
      }

      dateMiNotificationManager.clearLikes().catch(() => {});
      navigation.navigate('ProfileView', { profileId });
    },
    [dateMiProfilesInStore, dispatch, navigation]
  );

  const inboxRows = useMemo<InboxRowModel[]>(() => {
    if (!user?.id) return [];

    const currentUserId = user.id;
    const nonDateMiConversations = conversations.filter((c) => c.type !== 'datemi');
    const dateMiConversations = conversations.filter((c) => c.type === 'datemi');

    const dateMiConversationByUserId: Record<string, ChatConversation> = {};
    for (const convo of dateMiConversations) {
      const otherUserId = resolveOtherUserIdForConversation(convo, currentUserId);
      if (!otherUserId) continue;

      const existing = dateMiConversationByUserId[otherUserId];
      if (!existing) {
        dateMiConversationByUserId[otherUserId] = convo;
        continue;
      }

      const existingMs = new Date(existing.lastActivity).getTime();
      const nextMs = new Date(convo.lastActivity).getTime();
      if (!Number.isFinite(existingMs) || nextMs > existingMs) {
        dateMiConversationByUserId[otherUserId] = convo;
      }
    }

    const dateMiUserIds = new Set<string>(Object.keys(dateMiConversationByUserId));
    for (const id of Object.keys(dateMiSignals.missedCallsByUserId || {})) {
      if (id) dateMiUserIds.add(id);
    }
    for (const id of Object.keys(dateMiSignals.likesByUserId || {})) {
      if (id) dateMiUserIds.add(id);
    }

    const rows: InboxRowModel[] = [];

    for (const convo of nonDateMiConversations) {
      const title = chatService.getConversationTitle(convo, currentUserId);
      const preview = convo.lastMessage?.message
        ? chatService.formatLastMessagePreview(convo.lastMessage.message, 60)
        : undefined;

      rows.push({
        id: `chat:${convo.id}`,
        category: convo.type,
        title,
        preview,
        timeIso: convo.lastActivity,
        metadataTitle: convo.metadata?.title,
        unreadCount: convo.unreadCount,
        onPress: () => handleConversationPress(convo),
      });
    }

    const toSortMs = (iso?: string | null) => {
      if (!iso) return Number.NEGATIVE_INFINITY;
      const ms = new Date(iso).getTime();
      return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
    };

    const eventPriority: Record<DateMiLatestEventKind, number> = {
      missed_call: 3,
      like: 2,
      message: 1,
    };

    for (const otherUserId of dateMiUserIds) {
      const convo = dateMiConversationByUserId[otherUserId];
      const missed = dateMiSignals.missedCallsByUserId?.[otherUserId];
      const like = dateMiSignals.likesByUserId?.[otherUserId];
      const profile = dateMiSignals.profilesByUserId?.[otherUserId];

      const candidates: Array<{ kind: DateMiLatestEventKind; iso: string; ms: number }> = [];
      if (convo?.lastActivity) candidates.push({ kind: 'message', iso: convo.lastActivity, ms: toSortMs(convo.lastActivity) });
      if (missed?.latestAt) candidates.push({ kind: 'missed_call', iso: missed.latestAt, ms: toSortMs(missed.latestAt) });
      if (like?.latestAt) candidates.push({ kind: 'like', iso: like.latestAt, ms: toSortMs(like.latestAt) });

      if (candidates.length === 0) continue;

      let latest = candidates[0];
      for (const candidate of candidates.slice(1)) {
        if (candidate.ms > latest.ms) {
          latest = candidate;
          continue;
        }
        if (candidate.ms === latest.ms && eventPriority[candidate.kind] > eventPriority[latest.kind]) {
          latest = candidate;
        }
      }

      const title =
        convo ? chatService.getConversationTitle(convo, currentUserId) : profile?.displayName || 'DateMi';

      let preview: string | undefined;
      let badge: InboxEventBadge | undefined;
      let action: InboxRowAction | undefined;
      let unreadCount: number | undefined;
      let isBlurred = false;

      const viewProfile = () => handleViewProfile(profile?.profileId);

      const callBack = () => {
        const receiverName = title || 'User';
        const receiverImage = profile?.profileImage;
        const type = missed?.type === 'video' ? 'video' : 'audio';
        dispatch(
          startCall({
            type,
            receiverId: otherUserId,
            receiverName,
            receiverImage,
          })
        );
      };

      if (latest.kind === 'missed_call' && missed) {
        preview = `Missed ${missed.type === 'video' ? 'video' : 'voice'} call`;
        badge = {
          text: 'MISSED',
          icon: missed.type === 'video' ? '🎥' : '📞',
          count: missed.count,
          backgroundColor: '#EF4444',
        };
        action = {
          label: 'Call Back',
          onPress: callBack,
          backgroundColor: '#EF4444',
          textColor: '#FFFFFF',
        };
      } else if (latest.kind === 'like' && like) {
        preview = like.isSuperLike ? 'Super liked you' : 'Liked your profile';
        badge = {
          text: like.isSuperLike ? 'SUPER LIKE' : 'LIKED YOU',
          icon: '💕',
          count: like.count,
          backgroundColor: '#EC4899',
        };
        action = {
          label: 'View',
          onPress: viewProfile,
          backgroundColor: '#FFFFFF',
          textColor: '#EF4444',
          borderColor: '#EF4444',
        };
      } else {
        preview = convo?.lastMessage?.message
          ? chatService.formatLastMessagePreview(convo.lastMessage.message, 60)
          : 'Open chat';
        unreadCount = convo?.unreadCount ?? 0;
        isBlurred = dateMiAccessChecked && !dateMiMessagingAllowed;
      }

      const onPress =
        latest.kind === 'missed_call'
          ? action?.onPress ?? (() => {})
          : latest.kind === 'like'
            ? action?.onPress ?? (() => {})
            : convo
              ? () => handleConversationPress(convo)
              : () => {};

      rows.push({
        id: `datemi:${otherUserId}`,
        category: 'datemi',
        title,
        preview,
        timeIso: latest.iso,
        metadataTitle: convo?.metadata?.title,
        unreadCount,
        badge,
        action,
        isBlurred,
        onPress,
      });
    }

    rows.sort((a, b) => toSortMs(b.timeIso) - toSortMs(a.timeIso));
    return rows;
  }, [conversations, dateMiAccessChecked, dateMiMessagingAllowed, dateMiSignals, dispatch, handleConversationPress, handleViewProfile, navigation, user?.id]);

  const filteredRows =
    activeFilter === 'all' ? inboxRows : inboxRows.filter((row) => row.category === activeFilter);

  const hasAnyItems = inboxRows.length > 0;
  const shouldShowLoading =
    (isConnecting && !hasAnyItems) || (!initialLoadComplete && !hasAnyItems && isConnected);
  const shouldShowConnectionError = !!connectionError && !hasAnyItems && !shouldShowLoading;

  const filterButtons: Array<{ key: InboxFilter; label: string; icon: string }> = [
    { key: 'all', label: 'All', icon: '💬' },
    { key: 'property', label: 'Properties', icon: '🏠' },
    { key: 'job', label: 'Jobs', icon: '💼' },
    { key: 'service', label: 'Services', icon: '🔧' },
    { key: 'datemi', label: 'DateMi', icon: '💕' },
  ];

  if (!user) {
    return (
      <SafeAreaView style={styles.style1}>
        <View style={styles.style2}>
          <Text style={styles.style3}>
            Please log in to view your inbox notifications
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient
      colors={['#047857', '#047857']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Modal
          animationType="fade"
          transparent={true}
          visible={showPaywall}
          onRequestClose={() => setShowPaywall(false)}
        >
          <View style={styles.paywallModalBackdrop}>
            <PremiumPaywall
              variant="overlay"
              title="💬 Unlock Messaging"
              message="Upgrade to Pro to send and receive unlimited messages with your matches."
              requiredTier="pro"
              onUpgrade={() => {
                setShowPaywall(false);
                navigation.navigate('SubscriptionPlans', { entryFeature: 'messaging' });
              }}
              onClose={() => setShowPaywall(false)}
              showClose
              style={styles.paywallModalContent}
            >
              <View style={styles.paywallPlaceholder}>
                <Text style={styles.paywallPlaceholderText}>{paywallTitle}</Text>
              </View>
            </PremiumPaywall>
          </View>
        </Modal>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.2)'
          }}
        >
          <Text
            style={{
              fontSize: isTablet ? 28 : 24,
              fontWeight: '800',
              color: '#FFFFFF',
              textAlign: 'center'
            }}
          >
            🔔 Inbox Notifications
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
              marginTop: 4
            }}
          >
            Messages, missed calls & likes
          </Text>
        </View>

        {/* Filter Tabs */}
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.md,
            backgroundColor: 'rgba(255,255,255,0.1)'
          }}
        >
          <FlatList
            data={filterButtons}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.key)}
                style={{
                  backgroundColor: activeFilter === item.key ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 20,
                  marginHorizontal: spacing.xs,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, marginRight: 4 }}>{item.icon}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: activeFilter === item.key ? '#047857' : '#FFFFFF'
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingHorizontal: spacing.sm }}
          />
        </View>

        {/* Conversations List */}
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {shouldShowLoading ? (
            <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
              <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>
                  {isConnecting ? 'Connecting…' : 'Loading inbox…'}
                </Text>
              </View>
              <SkeletonList itemCount={7} showAvatar />
            </View>
          ) : shouldShowConnectionError ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
              <Text style={{ fontSize: 48, marginBottom: spacing.md }}>⚠️</Text>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: '#DC2626',
                textAlign: 'center',
                marginBottom: spacing.sm 
              }}>
                Connection Error
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: spacing.lg
              }}>
                {connectionError}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  reconnect()
                    .then(() => chatPrefetchService.prefetchAfterConnect({ limit: 80 }))
                    .catch((err) => {
                      const friendly = getUserFacingError(err, {
                        action: 'reconnect to chat',
                        displayStyle: 'alert',
                      });
                      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
                    });
                }}
                style={{
                  backgroundColor: '#047857',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              tone="light"
              accentColor="#047857"
              icon={<Text style={{ fontSize: 56 }}>💬</Text>}
              title={activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} updates yet`}
              description={
                activeFilter === 'all'
                  ? 'When you get a new message, missed call, or like, it will appear here.'
                  : `When something new happens in ${activeFilter}, it will appear here.`
              }
              primaryAction={{
                label:
                  activeFilter === 'job'
                    ? 'Browse Jobs'
                    : activeFilter === 'service'
                      ? 'Browse Services'
                      : activeFilter === 'datemi'
                        ? 'Find Matches'
                        : 'Browse Properties',
                onPress: () => {
                  if (activeFilter === 'job') navigateToMainTab(navigation as any, 'JobsMain');
                  else if (activeFilter === 'service') navigateToMainTab(navigation as any, 'ServicesMain');
                  else if (activeFilter === 'datemi') navigateToMainTab(navigation as any, 'DateMiMain');
                  else navigateToMainTab(navigation as any, 'PropertyHub');
                },
              }}
              secondaryAction={
                activeFilter === 'all'
                  ? {
                      label: 'Explore Jobs',
                      onPress: () => navigateToMainTab(navigation as any, 'JobsMain'),
                    }
                  : undefined
              }
            />
          ) : (
            <FlatList
              data={filteredRows}
              renderItem={({ item }) => {
                if (!item) return null;
                return <InboxRow row={item} />;
              }}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#047857']}
                  tintColor="#047857"
                />
              }
              contentContainerStyle={{ 
                paddingVertical: spacing.md,
                paddingBottom: 100 // Extra bottom padding for tab navigation
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  style1: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style2: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center',
  'paddingHorizontal': 24
},
  style3: {
  'fontSize': 18,
  'color': '#4B5563',
  'marginBottom': 16,
  'textAlign': 'center'
},
  blurOverlay: {
  'position': 'absolute',
  'top': 0,
  'right': 0,
  'bottom': 0,
  'left': 0,
  'borderRadius': 16,
  'overflow': 'hidden',
  'backgroundColor': 'rgba(255, 255, 255, 0.35)',
  'alignItems': 'center',
  'justifyContent': 'center'
},
  blurContent: {
  'alignItems': 'center',
  'justifyContent': 'center',
  'paddingHorizontal': 16
},
  blurIcon: {
  'fontSize': 20,
  'marginBottom': 4
},
  blurText: {
  'fontSize': 12,
  'fontWeight': '700',
  'color': '#111827',
  'textAlign': 'center'
},
  paywallModalBackdrop: {
  'flex': 1,
  'backgroundColor': 'rgba(0, 0, 0, 0.6)'
},
  paywallModalContent: {
  'flex': 1
},
  paywallPlaceholder: {
  'flex': 1,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  paywallPlaceholderText: {
  'fontSize': 16,
  'fontWeight': '600',
  'color': '#FFFFFF'
},
});
