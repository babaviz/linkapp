import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import navigationService from './NavigationService';
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
} from '../types/notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }) as Notifications.NotificationBehavior,
});

class NotificationServiceExpo {
  private static instance: NotificationServiceExpo;
  private initialized = false;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationServiceExpo {
    if (!NotificationServiceExpo.instance) {
      NotificationServiceExpo.instance = new NotificationServiceExpo();
    }
    return NotificationServiceExpo.instance;
  }

  /**
   * Initialize the notification service using Expo Push Service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupNotificationChannels();
      }

      // Set up notification categories
      await this.setupNotificationCategories();

      // Only try to register for push notifications if we're on a physical device
      if (Device.isDevice) {
        try {
          await this.requestPermissions();
          await this.registerForPushNotifications();
        } catch (pushError) {
          // Push error handled
          
        }
      } else {
        
      }

      this.initialized = true;
      // Push notifications not supported
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
   * Register for push notifications and get Expo push token
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

      // Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;

      // Store token in Supabase for the current user
      await this.storeTokenInDatabase(token);

      return token;
    } catch (error) {

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

      const platform = Platform.OS as 'ios' | 'android';
      
      const notificationToken: Omit<NotificationToken, 'createdAt' | 'updatedAt'> = {
        token,
        userId: user.id,
        platform,
      };

      const { error } = await (supabase
        .from('notification_tokens')
        .upsert({
          ...notificationToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'user_id,platform',
        }) as any);

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
        importance: Notifications.AndroidImportance[channel.importance.toUpperCase() as keyof typeof Notifications.AndroidImportance],
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

      return identifier;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send push notification via Expo Push Service
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<void> {
    try {
      const message = {
        to: payload.to,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound || 'default',
        badge: payload.badge,
        priority: payload.priority || 'default',
        channelId: payload.channelId || 'default',
        categoryId: payload.categoryId,
        ttl: payload.ttl,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Expo push notification failed: ${result.error}`);
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
        .from('notification_settings')
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
        } as any, {
          onConflict: 'user_id',
        }) as any);

      if (error) {
        
        throw error;
      }

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Handle notification response (when user taps notification or action)
   */
  handleNotificationResponse(response: NotificationResponse): void {
    const { notification, actionIdentifier, userText } = response;
    const { data, categoryIdentifier } = notification.request.content;

    // Handle different action types
    switch (actionIdentifier) {
      case 'VIEW_JOB':
        // Navigate to job details
        this.handleJobView(data);
        break;
      case 'APPLY_JOB':
        // Navigate to job application
        this.handleJobApply(data);
        break;
      case 'REPLY':
        // Handle chat reply
        this.handleChatReply(data, userText);
        break;
      case 'VIEW_CHAT':
        // Navigate to chat
        this.handleChatView(data);
        break;
      case 'VIEW_PAYMENT':
        // Navigate to payment details
        this.handlePaymentView(data);
        break;
      default:
        // Default action (tap notification)
        this.handleDefaultAction(categoryIdentifier, data);
        break;
    }
  }

  private handleJobView(data: any): void {
    if (data?.jobId) {
      navigationService.navigateToJobDetails(data.jobId, data.job);
    }
  }

  private handleJobApply(data: any): void {
    if (data?.jobId) {
      navigationService.navigateToJobDetails(data.jobId, data.job);
    }
  }

  private handleChatReply(data: any, userText?: string): void {
    if (data?.chatId || data?.userId) {
      navigationService.navigateToChat(data.chatId, data.userId);
    }
  }

  private handleChatView(data: any): void {
    if (data?.chatId || data?.userId) {
      navigationService.navigateToChat(data.chatId, data.userId);
    }
  }

  private handlePaymentView(data: any): void {
    if (data?.amount && data?.type) {
      navigationService.navigateToPayment(data.amount, data.type);
    } else {
      navigationService.navigate('SubscriptionPlans' as any);
    }
  }

  private handleDefaultAction(categoryIdentifier?: string, data?: any): void {
    if (!categoryIdentifier || !data) {
      navigationService.navigateToHome();
      return;
    }

    switch (categoryIdentifier) {
      case 'PROPERTY':
        if (data.propertyId) {
          navigationService.navigateToPropertyDetails(data.propertyId, data.property);
        }
        break;
      case 'JOB':
        if (data.jobId) {
          navigationService.navigateToJobDetails(data.jobId, data.job);
        }
        break;
      case 'SERVICE':
        if (data.serviceId) {
          navigationService.navigateToServiceDetails(data.serviceId, data.service);
        }
        break;
      case 'CHAT':
        if (data.chatId || data.userId) {
          navigationService.navigateToChat(data.chatId, data.userId);
        }
        break;
      default:
        navigationService.navigateToNotifications();
        break;
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
}

let instance: NotificationServiceExpo | null = null;
const handler: ProxyHandler<NotificationServiceExpo> = {
  get(target, prop) {
    if (!instance) instance = NotificationServiceExpo.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
};
export default new Proxy({} as NotificationServiceExpo, handler);
