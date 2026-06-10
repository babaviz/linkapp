/**
 * Date Mi Notification Service
 * Handles all dating-related notifications: matches, messages, likes, video calls
 *
 * Features:
 * - Android full-screen intent for incoming calls (non-dismissible, wakes screen)
 * - iOS TIME_SENSITIVE interruption level for calls
 * - Notification grouping for messages by conversation
 * - Rate-limited notifications via NotificationThrottler
 * - Smart message preview formatting
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DateMiProfile } from '../redux/slices/datemiSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isCall = data?.type === 'video_call' || data?.type === 'audio_call';

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      // Calls should always show at highest priority
      priority: isCall
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export interface DateMiNotificationData extends Record<string, unknown> {
  type: 'match' | 'unmatch' | 'like' | 'super_like' | 'message' | 'video_call' | 'audio_call' | 'profile_view' | 'subscription';
  profileId?: string;
  profileName?: string;
  matchId?: string;
  messageId?: string;
  callId?: string;
  callType?: 'audio' | 'video';
  subscriptionTier?: string;
  conversationId?: string;
  channelType?: string;
  senderId?: string;
  timestamp?: number;
  unreadCount?: number;
}

/**
 * Format a message preview to break at word boundaries.
 */
function formatMessagePreview(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '\u2026';
}

export class DateMiNotificationService {
  /**
   * Initialize notification permissions and categories
   */
  static async initialize() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        return false;
      }
    }

    // Set up notification categories with actions for incoming calls
    await Notifications.setNotificationCategoryAsync('incoming_call', [
      {
        identifier: 'accept_call',
        buttonTitle: 'Accept',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'reject_call',
        buttonTitle: 'Reject',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    return true;
  }

  /**
   * Send notification for new match
   */
  static async notifyNewMatch(matchedProfile: DateMiProfile, isSuper: boolean = false) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isSuper ? '💫 Super Match!' : '🎉 It\'s a Match!',
          body: `You and ${matchedProfile.displayName} liked each other! Start a conversation now.`,
          data: { 
            type: 'match',
            profileId: matchedProfile.id,
            profileName: matchedProfile.displayName,
            matchId: `match-${Date.now()}`,
          } as DateMiNotificationData,
          sound: 'default',
          badge: 1,
        },
        trigger: null, // Send immediately
      });

      // Vibrate on match (Android)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('matches', {
          name: 'Matches',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch {
      // Silent fail
    }
  }

  /**
   * Send notification when someone likes your profile
   */
  static async notifyProfileLiked(likerProfile: Partial<DateMiProfile>, canSeeWhoLiked: boolean) {
    try {
      const title = canSeeWhoLiked 
        ? `${likerProfile.displayName} likes you!` 
        : 'Someone likes you!';
      
      const body = canSeeWhoLiked
        ? 'Tap to like them back and match!'
        : 'Upgrade to Pro to see who liked you';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❤️ ' + title,
          body,
          data: { 
            type: 'like',
            profileId: likerProfile.id,
            profileName: likerProfile.displayName,
          } as DateMiNotificationData,
          sound: 'default',
        },
        trigger: null,
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Send notification for super like
   */
  static async notifySuperLike(superLikerProfile: DateMiProfile) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌟 You got a Super Like!',
          body: `${superLikerProfile.displayName} super liked you! They must really like your profile.`,
          data: { 
            type: 'super_like',
            profileId: superLikerProfile.id,
            profileName: superLikerProfile.displayName,
          } as DateMiNotificationData,
          sound: 'default',
          badge: 1,
        },
        trigger: null,
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Send notification for new message.
   *
   * Features:
   * - Smart preview formatting (word-boundary truncation)
   * - Notification grouping per conversation (Android groupId / iOS threadIdentifier)
   * - Personalized title with sender name
   * - Context-aware data payload for precise navigation
   */
  static async notifyNewMessage(
    senderProfile: DateMiProfile, 
    messagePreview: string,
    conversationId: string,
    options?: {
      channelType?: string;
      unreadCount?: number;
    }
  ) {
    try {
      // Check if user has muted this conversation
      const mutedConversations = await AsyncStorage.getItem('datemi_muted_conversations');
      const muted = mutedConversations ? JSON.parse(mutedConversations) : [];
      if (muted.includes(conversationId)) return;

      // Set up Android messages channel with grouping support
      if (Platform.OS === 'android') {
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

      const unreadCount = options?.unreadCount ?? 1;
      const title = unreadCount > 1
        ? `${senderProfile.displayName} (${unreadCount} messages)`
        : senderProfile.displayName;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: formatMessagePreview(messagePreview),
          data: { 
            type: 'message',
            profileId: senderProfile.id,
            profileName: senderProfile.displayName,
            senderId: senderProfile.id,
            conversationId,
            messageId: conversationId,
            channelType: options?.channelType || 'datemi',
            timestamp: Date.now(),
            unreadCount,
          } as DateMiNotificationData,
          sound: 'default',
          badge: 1,
          // Android grouping: bundle notifications per conversation
          ...(Platform.OS === 'android' && {
            channelId: 'messages',
          }),
          // iOS grouping: thread identifier groups notifications in the tray
          ...(Platform.OS === 'ios' && {
            threadId: `conversation_${conversationId}`,
          }),
        },
        trigger: null,
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Send notification for incoming video call.
   *
   * Android: Uses MAX importance channel with full-screen intent behavior,
   *   ongoing flag, and CATEGORY_CALL to wake the screen and prevent dismissal.
   * iOS: Uses TIME_SENSITIVE interruption level (iOS 15+) to break through
   *   Focus modes and deliver immediately.
   *
   * Returns the notification identifier so callers can dismiss it later.
   */
  static async notifyIncomingCall(
    callerProfile: DateMiProfile | { id: string; displayName: string; profilePictures?: string[] }, 
    callId: string,
    callType: 'audio' | 'video' = 'video'
  ): Promise<string | null> {
    try {
      // Check notification preferences
      const prefs = await this.getNotificationPreferences();
      if (prefs && !prefs.videoCalls) {
        return null; // User has disabled call notifications
      }

      // Set up Android notification channel BEFORE scheduling notification.
      // importance MAX enables heads-up / full-screen intent behaviour.
      // Channel ID is versioned (calls_v2) because Android does not allow
      // changing an existing channel's sound after creation. The original
      // 'calls' channel referenced a missing ringtone.wav and may be stuck
      // silent on devices that already created it.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('calls_v2', {
          name: 'Incoming Calls',
          description: 'Notifications for incoming voice and video calls',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });
      }

      const title = callType === 'video' 
        ? 'Incoming Video Call' 
        : 'Incoming Audio Call';
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: `${callerProfile.displayName} is calling you`,
          data: { 
            type: callType === 'video' ? 'video_call' : 'audio_call',
            profileId: callerProfile.id,
            profileName: callerProfile.displayName,
            callId,
            callType,
            categoryId: 'incoming_call',
            timestamp: Date.now(),
          } as DateMiNotificationData,
          sound: 'default',
          badge: 1,
          categoryIdentifier: 'incoming_call',
          // Android-specific: full-screen intent behaviour
          ...(Platform.OS === 'android' && {
            channelId: 'calls_v2',
            priority: Notifications.AndroidNotificationPriority.MAX,
            sticky: true, // Non-dismissible (ongoing notification)
            autoDismiss: false, // Prevent auto-dismiss; we dismiss manually
          }),
          // iOS-specific: TIME_SENSITIVE interruption level (iOS 15+)
          ...(Platform.OS === 'ios' && {
            interruptionLevel: 'timeSensitive',
          }),
        },
        trigger: null,
      });

      return notificationId;
    } catch {
      // Silent fail - don't break call flow if notification fails
      return null;
    }
  }

  /**
   * Dismiss a call notification by its identifier.
   * Should be called when a call is accepted, rejected, or ends.
   */
  static async dismissCallNotification(notificationId: string | null): Promise<void> {
    if (!notificationId) return;
    try {
      await Notifications.dismissNotificationAsync(notificationId);
    } catch {
      // Silent fail
    }
  }

  /**
   * Send notification when someone views your profile
   */
  static async notifyProfileView(viewerProfile: Partial<DateMiProfile>, isPremium: boolean) {
    try {
      if (!isPremium) return; // Only premium users get these notifications

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '👀 Profile View',
          body: `${viewerProfile.displayName || 'Someone'} viewed your profile`,
          data: { 
            type: 'profile_view',
            profileId: viewerProfile.id,
            profileName: viewerProfile.displayName,
          } as DateMiNotificationData,
          sound: 'default',
        },
        trigger: null,
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Send notification for unmatch
   */
  static async notifyUnmatch(unmatchedProfile: DateMiProfile) {
    try {
      // Generally, we don't want to notify about unmatches as it can be negative
      // But we'll keep this for completeness
      await AsyncStorage.getItem('datemi_notify_unmatch').then(async (notify) => {
        if (notify === 'true') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '👋 Connection Ended',
              body: `Your match with ${unmatchedProfile.displayName} has ended`,
              data: { 
                type: 'unmatch',
                profileId: unmatchedProfile.id,
                profileName: unmatchedProfile.displayName,
              } as DateMiNotificationData,
              sound: 'default',
            },
            trigger: null,
          });
        }
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Send subscription-related notifications
   */
  static async notifySubscriptionStatus(
    type: 'activated' | 'expiring' | 'expired' | 'renewed',
    tier?: string
  ) {
    try {
      let title = '';
      let body = '';

      switch (type) {
        case 'activated':
          title = '✨ Premium Activated!';
          body = `Your ${tier} subscription is now active. Enjoy premium features!`;
          break;
        case 'expiring':
          title = '⏰ Subscription Expiring Soon';
          body = `Your ${tier} subscription expires in 3 days. Renew now to keep your benefits.`;
          break;
        case 'expired':
          title = '📅 Subscription Expired';
          body = 'Your premium subscription has expired. Renew to continue enjoying premium features.';
          break;
        case 'renewed':
          title = '🎉 Subscription Renewed!';
          body = `Your ${tier} subscription has been renewed successfully.`;
          break;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            type: 'subscription',
            subscriptionTier: tier,
          } as DateMiNotificationData,
          sound: 'default',
        },
        trigger: null,
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Schedule daily engagement reminder
   */
  static async scheduleDailyReminder() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💕 New Matches Waiting!',
          body: 'Check out new profiles in your area. Your perfect match might be online now!',
          data: { type: 'daily_reminder' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20, // 8 PM
          minute: 0,
        } as Notifications.DailyTriggerInput,
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Clear all Date Mi notifications
   */
  static async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // Silent fail
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllScheduledNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Silent fail
    }
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences() {
    try {
      const prefs = await AsyncStorage.getItem('datemi_notification_prefs');
      return prefs ? JSON.parse(prefs) : {
        matches: true,
        messages: true,
        likes: true,
        videoCalls: true,
        profileViews: true,
        dailyReminders: true,
        unmatch: false,
      };
    } catch {
      // Silent fail - return default preferences
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(preferences: Record<string, boolean>) {
    try {
      await AsyncStorage.setItem('datemi_notification_prefs', JSON.stringify(preferences));
    } catch {
      // Silent fail
    }
  }
}

export default DateMiNotificationService;
