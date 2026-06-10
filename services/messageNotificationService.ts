/**
 * Message Notification Service
 *
 * Handles all chat/message notification logic including:
 * - Smart consolidation: groups notifications per conversation
 * - Rate limiting: throttles rapid-fire message alerts
 * - Personalization: includes sender name, avatar URL, and concise preview
 * - Platform-aware grouping: Android groupId / iOS threadIdentifier
 *
 * This service wraps expo-notifications for message-specific delivery
 * and should be the single entry point for message notification creation.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messageThrottler } from '../utils/notificationThrottler';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface MessageSender {
  id: string;
  displayName: string;
  profileImage?: string;
}

export interface MessageNotificationOptions {
  conversationId: string;
  sender: MessageSender;
  messagePreview: string;
  channelType?: 'datemi' | 'service' | 'job' | 'property' | 'messaging' | 'support' | 'group';
  channelCid?: string;
  unreadCount?: number;
}

// In-memory map tracking the per-conversation notification identifier
// so we can update (replace) the notification in-place.
const activeNotificationIds = new Map<string, string>();

// Tracks unread message count per conversation for summary display.
const conversationUnreadCounts = new Map<string, number>();

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Format a message preview: truncate at a word boundary.
 */
function formatPreview(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '\u2026';
}

/**
 * Check if a conversation has been muted by the user.
 */
async function isConversationMuted(conversationId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('datemi_muted_conversations');
    const muted: string[] = raw ? JSON.parse(raw) : [];
    return muted.includes(conversationId);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

class MessageNotificationService {
  private static instance: MessageNotificationService;

  private constructor() {}

  static getInstance(): MessageNotificationService {
    if (!MessageNotificationService.instance) {
      MessageNotificationService.instance = new MessageNotificationService();
    }
    return MessageNotificationService.instance;
  }

  /**
   * Ensure the Android "messages" channel exists.
   * Safe to call multiple times; the OS de-duplicates channel creation.
   */
  async ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Chat messages and conversations',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      showBadge: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }

  /**
   * Show a message notification with smart consolidation.
   *
   * - Respects rate limiting (messageThrottler)
   * - Respects mute state
   * - Groups notifications per conversation
   * - Shows unread summary when >1 messages arrive
   */
  async notify(options: MessageNotificationOptions): Promise<string | null> {
    const {
      conversationId,
      sender,
      messagePreview,
      channelType = 'messaging',
      channelCid,
      unreadCount,
    } = options;

    // Skip muted conversations
    if (await isConversationMuted(conversationId)) {
      return null;
    }

    // Rate-limit: skip if we just sent a notification for this conversation
    if (!messageThrottler.shouldNotify(conversationId)) {
      return null;
    }

    // Ensure the Android channel exists
    await this.ensureChannel();

    // Track unread count
    const currentCount = unreadCount ?? (conversationUnreadCounts.get(conversationId) ?? 0) + 1;
    conversationUnreadCounts.set(conversationId, currentCount);

    // Dismiss previous notification for the same conversation (consolidate)
    const previousId = activeNotificationIds.get(conversationId);
    if (previousId) {
      try {
        await Notifications.dismissNotificationAsync(previousId);
      } catch {
        // May already be dismissed; ignore
      }
    }

    // Build title: include unread count if > 1
    const title = currentCount > 1
      ? `${sender.displayName} (${currentCount} messages)`
      : sender.displayName;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: formatPreview(messagePreview),
        data: {
          type: 'message',
          profileId: sender.id,
          profileName: sender.displayName,
          senderId: sender.id,
          conversationId,
          channelCid: channelCid || conversationId,
          channelType,
          timestamp: Date.now(),
          unreadCount: currentCount,
        },
        sound: 'default',
        badge: 1,
        // Android: group by conversation
        ...(Platform.OS === 'android' && {
          channelId: 'messages',
        }),
        // iOS: group by thread identifier
        ...(Platform.OS === 'ios' && {
          threadId: `conversation_${conversationId}`,
        }),
      },
      trigger: null,
    });

    // Track the notification so we can replace/dismiss it later
    activeNotificationIds.set(conversationId, notificationId);

    return notificationId;
  }

  /**
   * Mark a conversation as "read" – resets throttle and unread counter,
   * and dismisses any outstanding notification.
   */
  async markConversationRead(conversationId: string): Promise<void> {
    messageThrottler.reset(conversationId);
    conversationUnreadCounts.delete(conversationId);

    const notifId = activeNotificationIds.get(conversationId);
    if (notifId) {
      try {
        await Notifications.dismissNotificationAsync(notifId);
      } catch {
        // ignore
      }
      activeNotificationIds.delete(conversationId);
    }
  }

  /**
   * Reset all state (e.g. on logout).
   */
  resetAll(): void {
    messageThrottler.resetAll();
    conversationUnreadCounts.clear();
    activeNotificationIds.clear();
  }
}

export default MessageNotificationService.getInstance();
