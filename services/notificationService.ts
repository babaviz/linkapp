import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import firebaseService from './firebase';
import { supabase } from './supabaseClient';
import badgeService from './badgeService';
import {
  NotificationData,
  NotificationToken,
  NotificationPermission,
  NotificationSettings,
  NotificationCategory,
  NotificationCategoryConfig,
  NotificationChannel,
  PushNotificationPayload,
  NotificationResponse,
  NotificationHistoryItem,
  NotificationListOptions,
  NotificationFilter,
} from '../types/notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    } as Notifications.NotificationBehavior;
  },
});

// Environment-based notification configuration via Expo Constants
const manifest = Constants?.manifest as any;
const extra = (Constants?.expoConfig?.extra || (manifest && 'extra' in manifest ? manifest.extra : {}) || {}) as Record<string, any>;
const NOTIFS_DISABLED = String(extra.EXPO_PUBLIC_NOTIFICATIONS_DISABLED || '') === '1';
const NOTIFS_MODE = (extra.EXPO_PUBLIC_NOTIFICATIONS_MODE as 'disabled' | 'firebase' | 'expo' | 'minimal' | undefined) || undefined;
const BYPASS_PUSH = NOTIFS_DISABLED || (!!NOTIFS_MODE && NOTIFS_MODE !== 'firebase');

class NotificationService {
  private static instance: NotificationService;
  private initialized = false;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {

      // Initialize Firebase first
      try {
        await firebaseService.initialize();
        
      } catch (firebaseError) {
        // Firebase error handled
        
      }
      
      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupNotificationChannels();
      }

      // Set up notification categories
      await this.setupNotificationCategories();

      // Only try to register for push notifications if we're on a physical device and not bypassing
      if (Device.isDevice && !BYPASS_PUSH) {
        try {
          await this.requestPermissions();
          await this.registerForPushNotifications();
        } catch (pushError) {
          // Push error handled
          
        }
      } else if (BYPASS_PUSH) {
        // Permission denied
      } else {
        
      }

      this.initialized = true;
      // Notifications not supported
    } catch (error) {
      
      // Don't throw error to prevent app crash
      this.initialized = true; // Mark as initialized to prevent retries
      
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<NotificationPermission> {
    try {
      if (!Device.isDevice) {
        throw new Error('Must use physical device for push notifications');
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return {
          status: 'denied',
          canAskAgain: finalStatus === 'undetermined',
          expires: 'never',
        };
      }

      return {
        status: 'granted',
        canAskAgain: false,
        expires: 'never',
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Register for push notifications and get FCM token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        
        return null;
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        
        return null;
      }

      // Check if Firebase is properly configured before attempting to use it
      let fcmToken: string | null = null;
      try {
        if (firebaseService.isInitialized()) {
          // Get FCM token using Firebase service
          fcmToken = await firebaseService.getMessagingToken();
          this.expoPushToken = fcmToken;
          // FCM token received
        } else {
          
          throw new Error('Firebase not initialized');
        }
      } catch (firebaseError) {
      const msg = firebaseError instanceof Error ? firebaseError.message : String(firebaseError);
        
        throw new Error('Firebase not properly configured: ' + msg);
      }

      // Store token in Supabase for the current user if present
      if (fcmToken) {
        await this.storeTokenInDatabase(fcmToken);
      }

      return fcmToken;
    } catch (error) {

      // Provide helpful error information
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('FirebaseApp')) {

        // Firebase messaging not configured
         // Firebase not properly set up

      }
      
      // Don't throw error to prevent app crash - continue without push notifications
      
      return null;
    }
  }

  /**
   * Store push token in Supabase
   */
  private async storeTokenInDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        
        return;
      }

      const platform = Platform.OS as 'ios' | 'android' | 'web';

      // Map to DB column names (snake_case). created_at/updated_at are handled by defaults/triggers.
      const payload = {
        user_id: user.id,
        token,
        platform,
      } as const;

      const { error } = await supabase
        .from('notification_tokens')
        .upsert(payload, {
          onConflict: 'user_id,platform',
        });

      if (error) {
        
        throw error;
      }

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Set up notification channels for Android
   */
  private async setupNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    const channels: NotificationChannel[] = [
      {
        id: 'default',
        name: 'Default',
        description: 'Default notification channel',
        importance: 'default',
        sound: true,
        vibrate: true,
        badge: true,
      },
      {
        id: 'job-alerts',
        name: 'Job Alerts',
        description: 'Notifications about new job opportunities',
        importance: 'high',
        sound: true,
        vibrate: true,
        badge: true,
      },
      {
        id: 'messages',
        name: 'Messages',
        description: 'Chat messages and communications',
        importance: 'high',
        sound: true,
        vibrate: true,
        badge: true,
      },
      {
        id: 'payments',
        name: 'Payment Alerts',
        description: 'Payment confirmations and alerts',
        importance: 'max',
        sound: true,
        vibrate: true,
        badge: true,
      },
      {
        id: 'system',
        name: 'System Updates',
        description: 'App updates and system messages',
        importance: 'default',
        sound: false,
        vibrate: false,
        badge: true,
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: ((): Notifications.AndroidImportance => {
          const map: Record<string, Notifications.AndroidImportance> = {
            DEFAULT: Notifications.AndroidImportance.DEFAULT,
            HIGH: Notifications.AndroidImportance.HIGH,
            LOW: Notifications.AndroidImportance.LOW,
            MAX: Notifications.AndroidImportance.MAX,
            MIN: Notifications.AndroidImportance.MIN,
          };
          return map[channel.importance.toUpperCase()] ?? Notifications.AndroidImportance.DEFAULT;
        })(),
        sound: channel.sound ? 'default' : undefined,
        vibrationPattern: channel.vibrate ? [0, 250, 250, 250] : undefined,
        showBadge: channel.badge,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

  }

  /**
   * Set up notification categories with actions
   */
  private async setupNotificationCategories(): Promise<void> {
    const categories: NotificationCategoryConfig[] = [
      {
        identifier: NotificationCategory.JOB_ALERT,
        displayName: 'Job Alert',
        description: 'New job opportunity notification',
        actions: [
          {
            identifier: 'VIEW_JOB',
            buttonTitle: 'View Job',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'APPLY_JOB',
            buttonTitle: 'Apply Now',
            options: { opensAppToForeground: true },
          },
        ],
      },
      {
        identifier: NotificationCategory.MESSAGE,
        displayName: 'Message',
        description: 'Chat message notification',
        actions: [
          {
            identifier: 'REPLY',
            buttonTitle: 'Reply',
            textInput: {
              submitButtonTitle: 'Send',
              placeholder: 'Type your reply...',
            },
            options: { opensAppToForeground: false },
          },
          {
            identifier: 'VIEW_CHAT',
            buttonTitle: 'Open Chat',
            options: { opensAppToForeground: true },
          },
        ],
      },
      {
        identifier: NotificationCategory.PAYMENT,
        displayName: 'Payment',
        description: 'Payment alert notification',
        actions: [
          {
            identifier: 'VIEW_PAYMENT',
            buttonTitle: 'View Details',
            options: { opensAppToForeground: true },
          },
        ],
      },
    ];

    await Notifications.setNotificationCategoryAsync(
      NotificationCategory.JOB_ALERT,
      categories[0].actions,
      {
        allowInCarPlay: false,
        allowAnnouncement: true,
      }
    );

    await Notifications.setNotificationCategoryAsync(
      NotificationCategory.MESSAGE,
      categories[1].actions,
      {
        allowInCarPlay: true,
        allowAnnouncement: true,
      }
    );

    await Notifications.setNotificationCategoryAsync(
      NotificationCategory.PAYMENT,
      categories[2].actions,
      {
        allowInCarPlay: false,
        allowAnnouncement: false,
      }
    );

  }

  /**
   * Send a local notification
   */
  async sendLocalNotification(notification: NotificationData): Promise<string> {
    try {
      // Normalize sound: boolean `true` → 'default' so the OS always plays a tone.
      const normalizedSound = notification.sound === true ? 'default' : notification.sound;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: normalizedSound,
          badge: notification.badge,
          categoryIdentifier: notification.categoryId,
          // Route through a specific Android notification channel when provided
          ...(Platform.OS === 'android' && notification.channelId
            ? { channelId: notification.channelId }
            : {}),
        },
        trigger: null, // Send immediately
      });

      await this.updateBadgeCount();

      return identifier;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<void> {
    try {
      const message = {
        to: payload.to,
        notification: {
          title: payload.title,
          body: payload.body,
          sound: payload.sound || 'default',
        },
        data: payload.data || {},
        android: {
          channel_id: payload.channelId || 'default',
          priority: payload.priority === 'high' ? 'high' : 'normal',
          ttl: payload.ttl,
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge,
              category: payload.categoryId,
              sound: payload.sound || 'default',
            },
          },
        },
      };

      const fcmServerKey = (extra.FCM_SERVER_KEY as string) || process.env.FCM_SERVER_KEY;
      if (!fcmServerKey) {
        throw new Error('FCM_SERVER_KEY not configured in expo.extra or environment variables');
      }

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`FCM push notification failed: ${result.error}`);
      }
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get notification settings for user
   */
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        
        throw error;
      }

      const typedData = data as any;
      return typedData ? {
        userId: typedData.user_id,
        jobAlerts: typedData.job_alerts,
        messageNotifications: typedData.message_notifications,
        paymentAlerts: typedData.payment_alerts,
        systemUpdates: typedData.system_updates,
        marketingMessages: typedData.marketing_messages,
        quietHours: {
          enabled: typedData.quiet_hours_enabled,
          startTime: typedData.quiet_hours_start,
          endTime: typedData.quiet_hours_end,
        },
      } : null;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Update notification settings for user
   */
  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      const { error } = await (supabase
        .from('notification_settings') as any)
        .upsert({
          user_id: settings.userId,
          job_alerts: settings.jobAlerts,
          message_notifications: settings.messageNotifications,
          payment_alerts: settings.paymentAlerts,
          system_updates: settings.systemUpdates,
          marketing_messages: settings.marketingMessages,
          quiet_hours_enabled: settings.quietHours.enabled,
          quiet_hours_start: settings.quietHours.startTime,
          quiet_hours_end: settings.quietHours.endTime,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        
        throw error;
      }

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Handle notification response (when user taps notification or action).
   * Delegates to the centralized NotificationNavigationService for consistent
   * routing across all notification types.
   */
  handleNotificationResponse(response: NotificationResponse): void {
    try {
      const { notification, actionIdentifier } = response;
      const { data } = notification.request.content;
      if (!data) return;

      const notificationNavigationService = require('./notificationNavigationService').default;
      notificationNavigationService.navigateFromNotification(
        data as Record<string, unknown>,
        actionIdentifier || undefined
      );
    } catch {
      // Navigation error handled - never crash from notification routing
    }
  }

  /**
   * Get current push token
   */
  getCurrentToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Clear notification by identifier
   */
  async clearNotification(identifier: string): Promise<void> {
    await Notifications.dismissNotificationAsync(identifier);
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string,
    options: NotificationListOptions = {}
  ): Promise<{ notifications: NotificationHistoryItem[]; total: number }> {
    try {
      const {
        limit = 20,
        offset = 0,
        filter,
        sortBy = 'sentAt',
        sortOrder = 'desc',
      } = options;

      let query = supabase
        .from('notification_history')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filter) {
        if (filter.category && filter.category.length > 0) {
          query = query.in('category', filter.category);
        }
        if (filter.isRead !== undefined) {
          if (filter.isRead) {
            query = query.not('read_at', 'is', null);
          } else {
            query = query.is('read_at', null);
          }
        }
        if (filter.dateRange) {
          query = query
            .gte('sent_at', filter.dateRange.start.toISOString())
            .lte('sent_at', filter.dateRange.end.toISOString());
        }
      }

      // Apply sorting
      const sortColumn = sortBy === 'sentAt' ? 'sent_at' : 'read_at';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        
        throw error;
      }

      const notifications: NotificationHistoryItem[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        body: item.body,
        category: item.category as NotificationCategory,
        data: item.data || {},
        status: item.status,
        sentAt: new Date(item.sent_at),
        deliveredAt: item.delivered_at ? new Date(item.delivered_at) : undefined,
        clickedAt: item.clicked_at ? new Date(item.clicked_at) : undefined,
        readAt: item.read_at ? new Date(item.read_at) : undefined,
        isRead: Boolean(item.read_at),
      }));

      return {
        notifications,
        total: count || 0,
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('notification_history') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        
        throw error;
      }

      // Update badge count immediately after marking as read
      await this.updateBadgeCount();

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleNotificationsAsRead(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await (supabase
        .from('notification_history') as any)
        .update({ read_at: new Date().toISOString() })
        .in('id', notificationIds);

      if (error) {
        
        throw error;
      }

      await this.updateBadgeCount();

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('notification_history') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        
        throw error;
      }

      await badgeService.reset();

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Delete notification from history
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('id', notificationId);

      if (error) {
        
        throw error;
      }

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        
        throw error;
      }

      return count || 0;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(
    userId: string,
    onUpdate: (payload: any) => void
  ): () => void {
    const subscription = supabase
      .channel(`notification_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_history',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Record notification interaction (clicked)
   */
  async recordNotificationClick(notificationId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('notification_history') as any)
        .update({
          clicked_at: new Date().toISOString(),
          read_at: new Date().toISOString(), // Mark as read when clicked
        })
        .eq('id', notificationId);

      if (error) {
        
        throw error;
      }

      // Update badge count after clicking notification
      await this.updateBadgeCount();

    } catch (error) {
      
      throw error;
    }
  }

  // Referral notifications
  async notifyReferralCaptured() {
    try {
      await this.sendLocalNotification({
        title: 'Referral detected',
        body: 'Your referral code will be applied on signup.',
        data: { type: 'referral_captured' },
        categoryId: 'system',
      } as any);
    } catch {}
  }

  async notifyReferralReward(days: number = 7) {
    try {
      await this.sendLocalNotification({
        title: 'Reward unlocked',
        body: `You earned ${days} days of Premium via referrals. Enjoy!`,
        data: { type: 'referral_reward' },
        categoryId: 'system',
      } as any);
    } catch {}
  }

  private async updateBadgeCount(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const unreadCount = await this.getUnreadNotificationsCount(user.id);
      await badgeService.setCount(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }
}

let instance: NotificationService | null = null;
const handler: ProxyHandler<NotificationService> = {
  get(target, prop) {
    if (!instance) instance = NotificationService.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
};
export default new Proxy({} as NotificationService, handler);
