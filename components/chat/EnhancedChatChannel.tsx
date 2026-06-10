/**
 * Enhanced ChatChannel Component
 * 
 * This component provides comprehensive chat functionality including:
 * - CRUD operations (send, read, update, delete)
 * - Real-time features (presence, read receipts, typing indicators)
 * - Optimistic UI with error handling
 * - Pagination and infinite scroll
 * - Performance optimizations
 * - Accessibility features
 * - Dark mode support
 * - File/image upload capabilities
 * - Double-tap to react (Instagram style)
 * - Swipe to reply
 * - Message status indicators
 * - Audio/Video call buttons for DateMi conversations
 */

import React, { useEffect, useState, useCallback, useRef, useMemo, useContext } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  BackHandler,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Channel as StreamChannel, MessageResponse } from 'stream-chat';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { startCall } from '../../redux/slices/callSlice';
import { getUserFacingError } from '../../utils/userFacingError';
import usePremiumAccess from '../../hooks/usePremiumAccess';
import useDateMiAccess from '../../hooks/useDateMiAccess';
import dateMiSubscriptionService from '../../services/dateMiSubscriptionService';
import { useStreamVideoClient as useAppStreamVideoClient } from '../call/StreamVideoWrapper';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';
import type { ChatWallpaperVariant } from './ChatWallpaper';
import { ChatWallpaper } from './ChatWallpaper';
import {
  Channel,
  MessageList,
  MessageInput,
  Thread,
  TypingIndicator,
  AttachmentPickerContext,
  useMessageInputContext,
} from 'stream-chat-expo';
import type { DeepPartial, Theme } from 'stream-chat-expo';
import {
  streamChatTheme,
  messageThemeVariants,
  ChatColors,
  myMessageThemeLight,
  myMessageThemeDark,
} from '../../theme/streamChatTheme';
import { useStreamChatClient } from './StreamChatWrapper';


export interface EnhancedChatChannelProps {
  channel: StreamChannel;
  onBackPress: () => void;
  onChannelInfoPress?: () => void;
  showThread?: boolean;
  onOpenThread?: (parentMessage: MessageResponse) => void;
  enableFileUploads?: boolean;
  enableImageUploads?: boolean;
  maxFileSize?: number; // in MB
  enableMessageEditing?: boolean;
  enableMessageDeleting?: boolean;
  /** Whether the user can send messages (controls MessageInput rendering) */
  enableMessageInput?: boolean;
  showTypingIndicator?: boolean;
  _showReadReceipts?: boolean;
  /** Enable audio/video call buttons in header (for DateMi conversations) */
  enableCallButtons?: boolean;
  /** Navigation callback for VideoCall screen */
  onNavigateToVideoCall?: () => void;
  /** Recipient info for calls */
  callRecipient?: {
    userId: string;
    name: string;
    image?: string;
  };
  /** Navigate to the main chat list ("My Chats") */
  onNavigateToChats?: () => void;
  /** Navigate to subscription/packages screen (DateMi-specific) */
  onNavigateToPackages?: (feature: 'messaging' | 'voice_call' | 'video_call') => void;
}

/**
 * Enhanced Message Component with full interaction support
 * Based on Stream Chat React Native customization guide:
 * https://getstream.io/chat/docs/sdk/react-native/guides/message-customization/
 * 
 * Features:
 * - Long press for action menu (Edit, Delete, Copy, Reply, React)
 * - Double tap for quick reaction
 * - Message status indicator (sent, delivered, read, failed)
 * - Resend failed messages
 */
// NOTE:
// We intentionally do NOT override the `Message` / `MessageSimple` rendering.
// Stream's default message components provide the best UX for text/attachments/markdown/etc.
// We hook into message gestures via `Channel` props instead (double-tap, long-press),
// which preserves Stream's layout and prevents missing/oddly-wrapped message text.


// Main Enhanced Chat Channel Component
export const EnhancedChatChannel: React.FC<EnhancedChatChannelProps> = ({
  channel,
  onBackPress,
  onChannelInfoPress,
  showThread = true,
  onOpenThread,
  enableFileUploads = true,
  enableImageUploads = true,
  maxFileSize = 10,
  enableMessageEditing = true,
  enableMessageDeleting = true,
  enableMessageInput = true,
  showTypingIndicator = true,
  _showReadReceipts = true,
  enableCallButtons = false,
  callRecipient,
  onNavigateToChats,
  onNavigateToPackages,
}) => {
  // Chat screens are forced to dark mode for consistent UX (no system theme flips).
  const isDarkMode = true;
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const premiumAccess = usePremiumAccess();
  // DateMi feature add-on access (messaging / voice_call / video_call).
  // This drives the lock icon state: unlocked when the user has either Premium OR the $1 add-on.
  const dateMiAccess = useDateMiAccess({ enabled: enableCallButtons });
  const { client: streamVideoClient, error: streamVideoError } = useAppStreamVideoClient();
  const insets = useSafeAreaInsets();
  
  // Check if Stream Chat client is available
  const { client, isReady: isClientReady } = useStreamChatClient();

  const [headerHeight, setHeaderHeight] = useState<number>(0);

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setHeaderHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const keyboardVerticalOffset = useMemo<number | undefined>(() => {
    // Only override Stream's default on iOS. On Android, Stream's internal
    // KeyboardCompatibleView defaults work better across devices.
    if (Platform.OS !== 'ios') return undefined;
    // Fallback (before first onLayout): safe-area top + header minHeight
    const fallback = Math.round(insets.top + 56);
    return headerHeight > 0 ? headerHeight : fallback;
  }, [headerHeight, insets.top]);
  
  const [channelName, setChannelName] = useState<string>('');
  const [memberCount, setMemberCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [otherMemberImage, setOtherMemberImage] = useState<string | undefined>(undefined);
  const [thread, setThread] = useState<MessageResponse | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const lastInfoRef = useRef<{ name: string; count: number; online: boolean; image?: string }>({ name: '', count: 0, online: false });
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isChannelReady, setIsChannelReady] = useState<boolean>(false);
  
  const scrollViewRef = useRef<{ scrollToEnd?: (options?: { animated?: boolean }) => void } | null>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef<number | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isKeyboardVisibleRef = useRef(false);
  
  // Call state
  const [isStartingCall, setIsStartingCall] = useState(false);

  const wallpaperVariant = useMemo<ChatWallpaperVariant>(() => {
    const data = channel?.data as Record<string, unknown> | undefined;
    const isDateMi =
      (data && (data.datemi_conversation === true || data.user1_id || data.user2_id)) ||
      channel?.type === 'datemi';
    if (isDateMi) return 'datemi';

    if (channel?.type === 'property' || (data && (data.property_id || data.property_title))) return 'property';
    if (channel?.type === 'job' || (data && (data.job_id || data.job_title))) return 'job';
    if (channel?.type === 'service' || (data && (data.service_id || data.service_name))) return 'service';
    return 'default';
  }, [channel?.cid, channel?.type]);

  const isDateMiConversation = useMemo(() => {
    const data = channel?.data as Record<string, unknown> | undefined;
    return (
      enableCallButtons ||
      channel?.type === 'datemi' ||
      Boolean(data?.datemi_conversation) ||
      Boolean(data?.user1_id) ||
      Boolean(data?.user2_id)
    );
  }, [channel?.data, channel?.type, enableCallButtons]);

  const canShowAttachmentButton = enableFileUploads || enableImageUploads;
  const shouldDisableAttachmentPicker = isDateMiConversation || !canShowAttachmentButton;

  const attachmentPicker = useContext(AttachmentPickerContext as React.Context<
    | {
        closePicker?: () => void;
      }
    | undefined
  >);

  const closeAttachmentPicker = useCallback(() => {
    attachmentPicker?.closePicker?.();
  }, [attachmentPicker]);

  const [isAttachmentSheetVisible, setIsAttachmentSheetVisible] = useState(false);

  const closeAttachmentSheet = useCallback(() => {
    setIsAttachmentSheetVisible(false);
  }, []);

  const openAttachmentSheet = useCallback(() => {
    Keyboard.dismiss();
    setIsAttachmentSheetVisible(true);
  }, []);

  useEffect(() => {
    if (!isDateMiConversation) return;

    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      isKeyboardVisibleRef.current = true;
      closeAttachmentPicker();
      closeAttachmentSheet();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardVisibleRef.current = false;
      closeAttachmentPicker();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [closeAttachmentPicker, closeAttachmentSheet, isDateMiConversation]);

  useEffect(() => {
    if (!isDateMiConversation || Platform.OS !== 'android') return;

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAttachmentSheetVisible) {
        closeAttachmentSheet();
        return true;
      }
      if (isKeyboardVisibleRef.current) {
        closeAttachmentPicker();
        closeAttachmentSheet();
        Keyboard.dismiss();
        return true;
      }
      return false;
    });

    return () => backSub.remove();
  }, [closeAttachmentPicker, closeAttachmentSheet, isAttachmentSheetVisible, isDateMiConversation]);

  /**
   * Handle audio call button press
   */
  const handleAudioCall = useCallback(async () => {
    if (!enableCallButtons || !callRecipient?.userId || isStartingCall) return;
    
    if (!currentUserId) {
      Alert.alert('Not signed in', 'Please sign in and try again.', [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    // Check DateMi voice call access (supports Premium or $1 voice-call-only package).
    const status = await dateMiSubscriptionService.getSubscriptionStatus(currentUserId);
    if (!status.access.canMakeVoiceCalls) {
      if (onNavigateToPackages) {
        onNavigateToPackages('voice_call');
        return;
      }
      Alert.alert(
        'Voice Calls Locked',
        'Unlock voice calls with the Voice Calls package ($1/month) or Premium subscription.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    if (!streamVideoClient) {
      Alert.alert(
        'Call Service Not Ready',
        streamVideoError || 'Please wait a moment and try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }
    
    try {
      setIsStartingCall(true);
      // Start audio call
      await dispatch(startCall({
        type: 'audio',
        receiverId: callRecipient.userId,
        receiverName: callRecipient.name,
        receiverImage: callRecipient.image,
      })).unwrap();
      // Navigation is handled centrally by CallNavigationCoordinator
    } catch (err) {
      const friendly = getUserFacingError(err, {
        action: 'start a voice call',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsStartingCall(false);
    }
  }, [
    enableCallButtons,
    callRecipient,
    isStartingCall,
    currentUserId,
    onNavigateToPackages,
    dispatch,
    streamVideoClient,
    streamVideoError,
  ]);

  /**
   * Handle video call button press
   */
  const handleVideoCall = useCallback(async () => {
    if (!enableCallButtons || !callRecipient?.userId || isStartingCall) return;
    
    if (!currentUserId) {
      Alert.alert('Not signed in', 'Please sign in and try again.', [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    // Check DateMi video call access (supports Premium or $1 video-call-only package).
    const status = await dateMiSubscriptionService.getSubscriptionStatus(currentUserId);
    if (!status.access.canMakeVideoCalls) {
      if (onNavigateToPackages) {
        onNavigateToPackages('video_call');
        return;
      }
      Alert.alert(
        'Video Calls Locked',
        'Unlock video calls with the Video Calls package ($1/month) or Premium subscription.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    if (!streamVideoClient) {
      Alert.alert(
        'Call Service Not Ready',
        streamVideoError || 'Please wait a moment and try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }
    
    try {
      setIsStartingCall(true);
      // Start video call
      await dispatch(startCall({
        type: 'video',
        receiverId: callRecipient.userId,
        receiverName: callRecipient.name,
        receiverImage: callRecipient.image,
      })).unwrap();
      // Navigation is handled centrally by CallNavigationCoordinator
    } catch (err) {
      const friendly = getUserFacingError(err, {
        action: 'start a video call',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsStartingCall(false);
    }
  }, [
    enableCallButtons,
    callRecipient,
    isStartingCall,
    currentUserId,
    onNavigateToPackages,
    dispatch,
    streamVideoClient,
    streamVideoError,
  ]);

  /**
   * Ensure channel is watched and messages are loaded
   * This is critical for messages to appear and for sending to work
   */
  useEffect(() => {
    if (!channel) return;
    
    // If client isn't ready yet, we'll wait for it
    // But still set up channel watching for when it becomes available
    let isMounted = true;

    const ensureChannelWatched = async () => {
      try {
        // CRITICAL:
        // We must `watch()` the channel to:
        // - load message history
        // - subscribe to real-time updates (so sent messages appear instantly)
        // - ensure MessageInput + MessageList stay in sync
        //
        // Do NOT rely on `channel.state.messages !== undefined` as a proxy for "watched";
        // Stream initializes state containers even before a watch/query, and you can end up
        // with a channel that can send messages but doesn't live-update the UI.
        //
        // The SDK tolerates duplicate watch calls, so it's safe to call here.
        await channel.watch({ state: true, presence: true } as any);

        // IMPORTANT:
        // Do not block the UI on historical message hydration.
        // `watch()` is enough to render + subscribe; if we need more history,
        // we can fetch it opportunistically in the background.
        if (isMounted) setIsChannelReady(true);

        // Best-effort background hydration (do not await).
        channel
          .query({ messages: { limit: 50 } } as any)
          .catch((_e) => {
            void _e;
          });
      } catch (error) {
        // Log error but still allow rendering (channel might work anyway)
        void error;
        // Still set ready to allow rendering - MessageInput will handle errors
        if (isMounted) {
          setIsChannelReady(true);
        }
      }
    };

    ensureChannelWatched();
    
    return () => {
      isMounted = false;
    };
  }, [channel]);

  /**
   * Initialize channel data and listeners
   */
  useEffect(() => {
    if (!channel) return;

    const updateChannelInfo = () => {
      let nextName = 'Chat';
      let nextImage: string | undefined;
      const channelData = channel.data as Record<string, unknown> | undefined;
      const currentUserId = channel._client.userID;

      // Resolve the other member for avatar
      const allMembers = Object.values(channel.state.members);
      const otherMembers = allMembers.filter(
        member => member.user_id !== currentUserId
      );

      const normalizeText = (value: unknown): string | undefined => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };

      const normalizeId = (value: unknown): string | undefined => {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed.length > 0 ? trimmed : undefined;
        }
        if (typeof value === 'number') return String(value);
        return undefined;
      };

      const otherMembersName =
        otherMembers.length > 0
          ? otherMembers
              .map(member => normalizeText(member.user?.name) || member.user_id || 'User')
              .join(', ')
          : undefined;

      // DateMi channels store both participants in channel data.
      // `channel.data.name` is NOT safe to use for 1:1 display because it can equal the current user's name
      // depending on who created the channel first.
      const user1Id = normalizeId((channelData as any)?.user1_id);
      const user2Id = normalizeId((channelData as any)?.user2_id);
      const user1Name = normalizeText((channelData as any)?.user1_name);
      const user2Name = normalizeText((channelData as any)?.user2_name);

      const isDateMiConversation =
        channel?.type === 'datemi' ||
        Boolean((channelData as any)?.datemi_conversation) ||
        !!user1Id ||
        !!user2Id;

      const callRecipientName = normalizeText(callRecipient?.name);
      const callRecipientImage = normalizeText(callRecipient?.image);

      if (isDateMiConversation && currentUserId) {
        if (user1Id && user2Id) {
          if (currentUserId === user1Id) {
            nextName = user2Name || otherMembersName || nextName;
          } else if (currentUserId === user2Id) {
            nextName = user1Name || otherMembersName || nextName;
          } else {
            nextName = otherMembersName || user1Name || user2Name || nextName;
          }
        } else {
          nextName = otherMembersName || user1Name || user2Name || nextName;
        }
      } else {
        const channelDataName = normalizeText((channelData as any)?.name);
        const isOneToOne = allMembers.length > 0 && allMembers.length <= 2;

        // For 1:1 chats, prefer the *other member's* name (avoids showing your own name).
        if (isOneToOne && otherMembersName) {
          nextName = otherMembersName;
        } else {
          nextName = channelDataName || otherMembersName || nextName;
        }
      }

      // For DateMi, prefer the recipient info passed from the screen (fresh profile fetch),
      // then fall back to Stream's member image (which can be stale).
      if (isDateMiConversation && callRecipientName) {
        nextName = callRecipientName;
      }

      if (isDateMiConversation && callRecipientImage) {
        nextImage = callRecipientImage;
      } else if (otherMembers.length > 0 && otherMembers[0].user?.image) {
        nextImage = otherMembers[0].user.image as string;
      }

      const nextCount = Object.keys(channel.state.members).length;
      const hasOnlineMembers = allMembers.some(
        member => member.user?.online && member.user_id !== currentUserId
      );
      const nextOnline = hasOnlineMembers;

      const prev = lastInfoRef.current;
      if (prev.name !== nextName) setChannelName(nextName);
      if (prev.count !== nextCount) setMemberCount(nextCount);
      if (prev.online !== nextOnline) setIsOnline(nextOnline);
      if (prev.image !== nextImage) setOtherMemberImage(nextImage);
      lastInfoRef.current = { name: nextName, count: nextCount, online: nextOnline, image: nextImage };
    };

    const handleTypingStart = (event: { user?: { id: string } }) => {
      if (event.user?.id !== channel._client.userID && event.user?.id) {
        setTypingUsers(prev => [...prev.filter(id => id !== event.user?.id), event.user.id]);
      }
    };

    const handleTypingStop = (event: { user?: { id?: string } }) => {
      if (event.user?.id) {
        setTypingUsers(prev => prev.filter(id => id !== event.user?.id));
      }
    };

    updateChannelInfo();

    // Set up event listeners
    channel.on('message.new', updateChannelInfo);
    channel.on('member.added', updateChannelInfo);
    channel.on('member.removed', updateChannelInfo);
    channel.on('user.presence.changed', updateChannelInfo);
    channel.on('typing.start', handleTypingStart);
    channel.on('typing.stop', handleTypingStop);

    return () => {
      channel.off('message.new', updateChannelInfo);
      channel.off('member.added', updateChannelInfo);
      channel.off('member.removed', updateChannelInfo);
      channel.off('user.presence.changed', updateChannelInfo);
      channel.off('typing.start', handleTypingStart);
      channel.off('typing.stop', handleTypingStop);
    };
  }, [channel, callRecipient?.image, callRecipient?.name]);

  /**
   * Handle thread message selection
   */
  const handleThreadSelect = useCallback((message: unknown) => {
    if (!showThread || !message) return;
    const selected = message as MessageResponse;
    if (onOpenThread) {
      onOpenThread(selected);
      return;
    }
    setThread(selected);
  }, [showThread, onOpenThread]);

  /**
   * Close thread view
   */
  const closeThread = useCallback(() => {
    setThread(null);
  }, []);

  /**
   * Handle scroll to load more messages
   */
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      // Stream Chat handles infinite scroll automatically
      // This is just to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      void error;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore]);

  /**
   * Scroll to bottom
   */
  const scrollToBottom = useCallback(() => {
    if (scrollViewRef.current?.scrollToEnd) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  /**
   * Get channel type icon
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getChannelTypeIcon = useCallback((): string => {
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
  }, [channel?.type, channel?.data]);

  /**
   * Get channel subtitle
   */
  const getChannelSubtitle = useCallback((): string => {
    if (!channel?.data) return '';

    const channelData = channel.data as Record<string, unknown>;

    // For property channels
    if (channelData.property_title) {
      return `Property: ${(channelData.property_location as string) || 'Location'}`;
    }

    // For job channels  
    if (channelData.job_title) {
      return `Job at ${(channelData.job_company as string) || 'Company'}`;
    }

    // For service channels
    if (channelData.service_name) {
      return `Service: ${(channelData.service_category as string) || 'Category'}`;
    }

    // For direct messages, show online status
    if (channel.type === 'messaging' || channel.type === 'datemi') {
      if (memberCount === 2) {
        return isOnline ? 'Online' : '';
      }
      return `${memberCount} members`;
    }

    return `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
  }, [channel, memberCount, isOnline]);

  /**
   * Get custom theme based on channel type and dark mode
   * Properly typed as DeepPartial<Theme> for Stream Chat compatibility
   * Note: Theme is applied via OverlayProvider in StreamChatWrapper, not here
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getChannelTheme = useMemo((): DeepPartial<Theme> => {
    const channelType = channel?.type;
    let customTheme: DeepPartial<Theme> = { ...streamChatTheme };
    
    // Apply dark mode colors if enabled
    if (isDarkMode) {
      customTheme = {
        ...customTheme,
        colors: {
          ...customTheme.colors,
          white: '#1F2937',
          white_snow: '#111827',
          white_smoke: '#374151',
          black: '#F9FAFB',
          grey_dark: '#D1D5DB',
          light_gray: '#374151',
        },
        messageList: {
          ...customTheme.messageList,
          container: {
            ...customTheme.messageList?.container,
            backgroundColor: '#111827',
          },
        },
      } as DeepPartial<Theme>;
    }
    
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
  }, [channel?.type, isDarkMode]);

  // Note: Theme is applied via OverlayProvider in StreamChatWrapper, not here

  /** Extract the first letter(s) for the initial-based avatar fallback */
  const avatarInitial = useMemo(() => {
    if (!channelName) return '?';
    return channelName.charAt(0).toUpperCase();
  }, [channelName]);

  /** Toggle the three-dot menu */
  const toggleMenu = useCallback(() => {
    setIsMenuVisible(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuVisible(false);
  }, []);

  /**
   * Custom header component – flat, minimal, no grey box
   */
  const ChatHeader = useCallback(() => (
    <Animated.View
      onLayout={handleHeaderLayout}
      style={[
        styles.header,
        isDarkMode && styles.darkHeader,
        {
          opacity: headerOpacity,
          // Safe-area top padding (avoid SafeAreaView to prevent double-insets with Stream's OverlayProvider)
          paddingTop: insets.top + 10,
        },
      ]}
    >
      {/* Back button */}
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
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={26} color={isDarkMode ? '#F9FAFB' : '#111827'} />
      </TouchableOpacity>

      {/* Avatar + Name */}
      <TouchableOpacity
        style={styles.headerContent}
        onPress={onChannelInfoPress}
        activeOpacity={0.7}
        accessibilityLabel="Channel info"
        accessibilityRole="button"
      >
        <View style={styles.avatarContainer}>
          {otherMemberImage ? (
            <Image
              source={{ uri: otherMemberImage }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatarFallback, isDarkMode && styles.avatarFallbackDark]}>
              <Text style={styles.avatarInitialText}>{avatarInitial}</Text>
            </View>
          )}
          {isOnline && (
            <View style={[styles.onlineIndicator, isDarkMode && styles.darkOnlineIndicator]} />
          )}
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={[styles.channelTitle, isDarkMode && styles.darkText]} numberOfLines={1}>
            {channelName}
          </Text>
          {getChannelSubtitle() ? (
            <Text style={[styles.channelSubtitle, isDarkMode && styles.darkSubtext]} numberOfLines={1}>
              {getChannelSubtitle()}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Three-dot menu */}
      <TouchableOpacity
        onPress={toggleMenu}
        style={styles.menuButton}
        activeOpacity={0.7}
        accessibilityLabel="More options"
        accessibilityRole="button"
      >
        <Ionicons name="ellipsis-vertical" size={22} color={isDarkMode ? '#D1D5DB' : '#374151'} />
      </TouchableOpacity>

      {/* Dropdown menu (Modal) */}
      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable 
          style={[
            styles.menuOverlay,
            {
              paddingTop: insets.top + 8, // Safe area top + small margin
              paddingRight: 12,
            }
          ]} 
          onPress={closeMenu}
        >
          <View style={[styles.menuDropdown, isDarkMode && styles.menuDropdownDark]}>
            {/* Voice Call */}
            {enableCallButtons && callRecipient?.userId && (
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                accessibilityLabel="Voice Call"
                accessibilityRole="button"
                onPress={() => {
                  closeMenu();
                  handleAudioCall();
                }}
                disabled={isStartingCall}
              >
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={(dateMiAccess.canVoiceCall || premiumAccess.isPremium) ? '#10B981' : (isDarkMode ? '#6B7280' : '#9CA3AF')}
                />
                <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>
                  Voice Call
                </Text>
                {!(dateMiAccess.canVoiceCall || premiumAccess.isPremium) && (
                  <MaterialIcons name="lock" size={14} color="#9CA3AF" style={styles.menuLockIcon} />
                )}
              </TouchableOpacity>
            )}

            {/* Video Call */}
            {enableCallButtons && callRecipient?.userId && (
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                accessibilityLabel="Video Call"
                accessibilityRole="button"
                onPress={() => {
                  closeMenu();
                  handleVideoCall();
                }}
                disabled={isStartingCall}
              >
                <MaterialIcons
                  name="videocam"
                  size={20}
                  color={(dateMiAccess.canVideoCall || premiumAccess.isPremium) ? '#EC4899' : (isDarkMode ? '#6B7280' : '#9CA3AF')}
                />
                <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>
                  Video Call
                </Text>
                {!(dateMiAccess.canVideoCall || premiumAccess.isPremium) && (
                  <MaterialIcons name="lock" size={14} color="#9CA3AF" style={styles.menuLockIcon} />
                )}
              </TouchableOpacity>
            )}

            {/* Divider (only if call buttons are shown) */}
            {enableCallButtons && callRecipient?.userId && (
              <View style={[styles.menuDivider, isDarkMode && styles.menuDividerDark]} />
            )}

            {/* My Chats */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              accessibilityLabel="My Chats"
              accessibilityRole="button"
              onPress={() => {
                closeMenu();
                if (onNavigateToChats) {
                  onNavigateToChats();
                } else {
                  onBackPress();
                }
              }}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={isDarkMode ? '#D1D5DB' : '#374151'} />
              <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>
                My Chats
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  ), [
    headerOpacity,
    handleHeaderLayout,
    isDarkMode,
    thread,
    closeThread,
    onBackPress,
    onChannelInfoPress,
    otherMemberImage,
    avatarInitial,
    channelName,
    getChannelSubtitle,
    isOnline,
    toggleMenu,
    isMenuVisible,
    closeMenu,
    enableCallButtons,
    callRecipient,
    handleAudioCall,
    handleVideoCall,
    isStartingCall,
    premiumAccess,
    dateMiAccess.canVoiceCall,
    dateMiAccess.canVideoCall,
    onNavigateToChats,
    insets.top,
  ]);

  /**
   * Custom attach button for DateMi conversations.
   * Replaces Stream's default AttachButton (which opens the bottom-sheet picker)
   * with one that opens a lightweight in-app sheet. This guarantees an explicit
   * Cancel/back action (Android Alerts can drop extra buttons) and prevents the
   * keyboard-sized draggable panel that can linger after keyboard dismiss.
   *
   * Passed to `<Channel AttachButton={…}>` so Stream's own input layout, theme,
   * SendButton, and AutoCompleteInput remain untouched.
   */
  const DateMiAttachButton = useCallback((props: { disabled?: boolean }) => {
    if (!canShowAttachmentButton) return null;

    const isDisabled = Boolean(props?.disabled);

    const handlePress = () => {
      if (isDisabled) return;
      // Android's native Alert only supports up to 3 actions; extra buttons (like Cancel)
      // can be dropped. Use our own sheet so Cancel/back is always present.
      openAttachmentSheet();
    };

    return (
      <TouchableOpacity
        style={[
          styles.dateMiAttachButton,
          isDarkMode && styles.dateMiAttachButtonDark,
          isDisabled && styles.dateMiAttachButtonDisabled,
        ]}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel="Add attachment"
        accessibilityState={{ disabled: isDisabled }}
      >
        <Ionicons
          name="add"
          size={20}
          color={
            isDisabled
              ? (isDarkMode ? '#6B7280' : ChatColors.gray400)
              : (isDarkMode ? '#D1D5DB' : ChatColors.gray700)
          }
        />
      </TouchableOpacity>
    );
  }, [canShowAttachmentButton, isDarkMode, openAttachmentSheet]);

  const DateMiAttachmentSheet = useCallback(
    ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
      const { pickAndUploadImageFromNativePicker, takeAndUploadImage, pickFile } =
        useMessageInputContext();

      const runAction = (action: (() => void | Promise<void>) | undefined) => {
        onClose();
        if (typeof action !== 'function') return;
        // Give the modal a tick to close before launching native pickers.
        requestAnimationFrame(() => {
          action();
        });
      };

      type AttachmentOption = {
        key: string;
        label: string;
        icon: React.ComponentProps<typeof Ionicons>['name'];
        onPress: () => void;
        isVisible: boolean;
        testID: string;
      };

      const allOptions: AttachmentOption[] = [
        {
          key: 'choose-photo',
          label: 'Choose Photo',
          icon: 'image-outline',
          onPress: () => runAction(pickAndUploadImageFromNativePicker),
          isVisible: enableImageUploads && typeof pickAndUploadImageFromNativePicker === 'function',
          testID: 'datemi-attachment-choose-photo',
        },
        {
          key: 'take-photo',
          label: 'Take Photo',
          icon: 'camera-outline',
          onPress: () => runAction(takeAndUploadImage),
          isVisible: enableImageUploads && typeof takeAndUploadImage === 'function',
          testID: 'datemi-attachment-take-photo',
        },
        {
          key: 'choose-file',
          label: 'Choose File',
          icon: 'document-attach-outline',
          onPress: () => runAction(pickFile),
          isVisible: enableFileUploads && typeof pickFile === 'function',
          testID: 'datemi-attachment-choose-file',
        },
      ];

      const options = allOptions.filter((opt) => opt.isVisible);

      return (
        <Modal
          transparent
          visible={visible}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={onClose}
        >
          <Pressable style={styles.attachmentSheetOverlay} onPress={onClose}>
            <Pressable
              style={[
                styles.attachmentSheetContainer,
                isDarkMode && styles.attachmentSheetContainerDark,
                { paddingBottom: insets.bottom + 12 },
              ]}
              onPress={() => {
                // prevent closing when tapping inside
              }}
            >
              <View style={styles.attachmentSheetHeader}>
                <Text style={[styles.attachmentSheetTitle, isDarkMode && styles.darkText]}>
                  Add attachment
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.attachmentSheetCloseButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Close attachment picker"
                  testID="datemi-attachment-close"
                >
                  <Ionicons name="close" size={22} color={isDarkMode ? '#D1D5DB' : '#374151'} />
                </TouchableOpacity>
              </View>

              <View style={styles.attachmentSheetOptions}>
                {options.length > 0 ? (
                  options.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.attachmentSheetOption, isDarkMode && styles.attachmentSheetOptionDark]}
                      activeOpacity={0.75}
                      onPress={opt.onPress}
                      accessibilityRole="button"
                      accessibilityLabel={opt.label}
                      testID={opt.testID}
                    >
                      <View style={styles.attachmentSheetOptionLeft}>
                        <View
                          style={[
                            styles.attachmentSheetIconCircle,
                            isDarkMode && styles.attachmentSheetIconCircleDark,
                          ]}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={18}
                            color={isDarkMode ? '#D1D5DB' : ChatColors.gray700}
                          />
                        </View>
                        <Text style={[styles.attachmentSheetOptionText, isDarkMode && styles.darkText]}>
                          {opt.label}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={isDarkMode ? '#6B7280' : ChatColors.gray400}
                      />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View
                    style={[
                      styles.attachmentSheetEmptyState,
                      isDarkMode && styles.attachmentSheetEmptyStateDark,
                    ]}
                  >
                    <Text style={[styles.attachmentSheetEmptyTitle, isDarkMode && styles.darkText]}>
                      Attachments unavailable
                    </Text>
                    <Text
                      style={[
                        styles.attachmentSheetEmptySubtitle,
                        isDarkMode && styles.darkSubtext,
                      ]}
                    >
                      Please try again in a moment.
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.attachmentSheetCancelButton, isDarkMode && styles.attachmentSheetCancelButtonDark]}
                activeOpacity={0.8}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                testID="datemi-attachment-cancel"
              >
                <Text style={[styles.attachmentSheetCancelText, isDarkMode && styles.darkText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      );
    },
    [enableFileUploads, enableImageUploads, insets.bottom, isDarkMode]
  );

  // Show loading state while channel is being initialized
  // IMPORTANT: Do not render Stream UI components unless Chat context is mounted.
  // Rendering <Channel>/<MessageList> without <Chat> provider causes message context to be empty
  // (messages won't render and newly sent messages won't appear reliably).
  if (!isChannelReady || !client || !isClientReady) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <ChatHeader />
        <View style={styles.loadingMessagesContainer}>
          <ActivityIndicator size="large" color={ChatColors.primary} />
          <Text style={[styles.loadingMessagesText, isDarkMode && styles.darkSubtext]}>
            {!client || !isClientReady ? 'Connecting to chat...' : 'Loading messages...'}
          </Text>
        </View>
      </View>
    );
  }

  const channelBody = (
    <View style={styles.chatContainer}>
      <ChatWallpaper variant={wallpaperVariant} />
      <Channel
        channel={channel}
        threadList={!!thread}
        thread={thread as unknown as Parameters<typeof Channel>[0]['thread']}
        topInset={insets.top}
        bottomInset={insets.bottom}
        // Let Stream handle keyboard avoidance via its internal KeyboardCompatibleView.
        // (Do NOT set disableKeyboardCompatibleView — that hides the input behind the keyboard.)
        keyboardVerticalOffset={keyboardVerticalOffset}
        // White text on the blue sender bubble (light or dark)
        myMessageTheme={isDarkMode ? myMessageThemeDark : myMessageThemeLight}
        // Hide the "slash commands" lightning-bolt button – keeps the input bar cleaner
        hasCommands={false}
        // Disable Stream's attachment picker bottom sheet for DateMi to prevent the
        // keyboard-sized draggable panel that appears when dismissing the keyboard.
        disableAttachmentPicker={shouldDisableAttachmentPicker}
        hasFilePicker={enableFileUploads}
        hasImagePicker={enableImageUploads}
        // For DateMi: replace the default attach button with one that uses an in-app
        // sheet (explicit Cancel/back). For other channels: use Stream default.
        {...(isDateMiConversation ? { AttachButton: DateMiAttachButton } : {})}
        // Better UX + reliability:
        // Use Stream's built-in message renderer (prevents layout issues and missing text),
        // and wire custom gestures through Channel callbacks.
        onPressInMessage={({ defaultHandler, actionHandlers }: any) => {
          const now = Date.now();
          const DOUBLE_TAP_DELAY = 510;

          if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
            actionHandlers?.toggleReaction?.('love');
            return;
          }

          lastTapRef.current = now;
          tapTimeoutRef.current = setTimeout(() => {
            tapTimeoutRef.current = null;
            defaultHandler?.();
          }, DOUBLE_TAP_DELAY);
        }}
        onLongPressMessage={({ defaultHandler }: any) => {
          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
          }
          defaultHandler?.();
        }}
      >
        <View style={styles.messageListContainer}>
          {showThread && thread ? (
            <Thread
              onThreadDismount={closeThread}
              closeThreadOnDismount={true}
            />
          ) : (
            <MessageList
              onThreadSelect={handleThreadSelect as any}
              loadMore={handleLoadMore}
              setFlatListRef={(ref) => {
                scrollViewRef.current = ref as any;
              }}
              additionalFlatListProps={{
                contentInsetAdjustmentBehavior: 'automatic',
                showsVerticalScrollIndicator: false,
                testID: 'message-list',
              }}
            />
          )}
          
          {/* Loading more indicator */}
          {isLoadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={ChatColors.primary} />
            </View>
          )}
          
          {/* Typing indicator */}
          {showTypingIndicator && typingUsers.length > 0 && (
            <View style={styles.typingIndicatorContainer}>
              <TypingIndicator />
            </View>
          )}
        </View>

        {/* MessageInput — Stream handles send, typing events, and state sync.
            Layout, dark theme, buttons, and keyboard avoidance are all handled
            by Stream's built-in components + the theme from OverlayProvider. */}
        {!thread && isChannelReady && enableMessageInput && (
          <MessageInput />
        )}

        {/* DateMi-only attachment sheet (explicit Cancel/back) */}
        {isDateMiConversation && (
          <DateMiAttachmentSheet
            visible={isAttachmentSheetVisible}
            onClose={closeAttachmentSheet}
          />
        )}
      </Channel>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, isDarkMode && styles.darkContainer]}>
      <ChatHeader />

      {/* No outer KeyboardAvoidingView — Stream's Channel has a built-in
          KeyboardCompatibleView that pushes the input above the keyboard.
          Wrapping with our own KAV causes double-offset or hidden input. */}
      {Platform.OS === 'android' && isDateMiConversation ? (
        <KeyboardAvoidingView style={styles.androidKeyboardAvoiding} behavior="height">
          {channelBody}
        </KeyboardAvoidingView>
      ) : (
        channelBody
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ChatColors.gray50,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    minHeight: 56,
  },
  darkHeader: {
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 6,
    marginRight: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Avatar
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    position: 'relative',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ChatColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackDark: {
    backgroundColor: '#2563EB',
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: ChatColors.success,
    borderWidth: 2,
    borderColor: ChatColors.white,
  },
  darkOnlineIndicator: {
    borderColor: '#111827',
  },
  headerTextContainer: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  darkText: {
    color: '#F9FAFB',
  },
  channelSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
  // Three-dot menu trigger
  menuButton: {
    padding: 6,
    marginLeft: 4,
  },
  // Menu overlay + dropdown
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 180,
    ...getCrossPlatformShadow({
      width: 0,
      height: 4,
      radius: 12,
      opacity: 0.15,
      elevation: 8,
      color: '#000',
    }),
  },
  menuDropdownDark: {
    backgroundColor: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  menuLockIcon: {
    marginLeft: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginVertical: 2,
  },
  menuDividerDark: {
    backgroundColor: '#374151',
  },
  chatContainer: {
    flex: 1,
  },
  androidKeyboardAvoiding: {
    flex: 1,
  },
  messageListContainer: {
    flex: 1,
  },
  dateMiAttachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ChatColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  dateMiAttachButtonDark: {
    backgroundColor: '#111827',
  },
  dateMiAttachButtonDisabled: {
    opacity: 0.5,
  },
  attachmentSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  attachmentSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 16,
    ...getCrossPlatformShadow({
      width: 0,
      height: -2,
      radius: 10,
      opacity: 0.18,
      elevation: 12,
      color: '#000',
    }),
  },
  attachmentSheetContainerDark: {
    backgroundColor: '#111827',
  },
  attachmentSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  attachmentSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  attachmentSheetCloseButton: {
    padding: 6,
    borderRadius: 16,
  },
  attachmentSheetOptions: {
    gap: 10,
    paddingBottom: 14,
  },
  attachmentSheetEmptyState: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: ChatColors.gray50,
    borderWidth: 1,
    borderColor: ChatColors.gray200,
  },
  attachmentSheetEmptyStateDark: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
  },
  attachmentSheetEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  attachmentSheetEmptySubtitle: {
    fontSize: 13,
    color: ChatColors.gray600,
  },
  attachmentSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: ChatColors.gray50,
    borderWidth: 1,
    borderColor: ChatColors.gray200,
  },
  attachmentSheetOptionDark: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
  },
  attachmentSheetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  attachmentSheetIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ChatColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentSheetIconCircleDark: {
    backgroundColor: '#111827',
  },
  attachmentSheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  attachmentSheetCancelButton: {
    marginTop: 2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: ChatColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentSheetCancelButtonDark: {
    backgroundColor: '#0B1220',
  },
  attachmentSheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingMessagesText: {
    marginTop: 16,
    fontSize: 16,
    color: ChatColors.gray600,
    textAlign: 'center',
  },
  editingContainer: {
    backgroundColor: ChatColors.gray100,
    padding: 12,
    margin: 8,
    borderRadius: 12,
  },
  editInput: {
    backgroundColor: ChatColors.white,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: ChatColors.gray900,
    minHeight: 44,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: ChatColors.gray200,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: ChatColors.gray700,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: ChatColors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: ChatColors.gray300,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: ChatColors.white,
  },
  // Message status indicators
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  failedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  failedText: {
    fontSize: 12,
    color: ChatColors.error,
    fontWeight: '500',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ChatColors.white,
    borderBottomWidth: 1,
    borderBottomColor: ChatColors.gray200,
    ...getCrossPlatformShadow({
      width: 0,
      height: 1,
      radius: 2,
      opacity: 0.05,
      elevation: 2,
      color: '#000',
    }),
  },
  threadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 16,
  },
});
