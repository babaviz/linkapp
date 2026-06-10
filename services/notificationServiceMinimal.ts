import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior - wrapped in try-catch for safety
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      } as Notifications.NotificationBehavior;
    },
  });
} catch (error) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('Notification handler setup skipped:', error);
}

class NotificationServiceMinimal {
  private static instance: NotificationServiceMinimal;
  private initialized = false;

  private constructor() {}

  static getInstance(): NotificationServiceMinimal {
    if (!NotificationServiceMinimal.instance) {
      NotificationServiceMinimal.instance = new NotificationServiceMinimal();
    }
    return NotificationServiceMinimal.instance;
  }

  /**
   * Initialize the notification service - minimal version
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if notifications are supported on this platform
      if (Platform.OS === 'web') {
        if (__DEV__) console.log('Notifications not supported on web platform');
        this.initialized = true;
        return;
      }

      // Only try permissions on physical device
      if (Device.isDevice) {
        try {
          await this.requestPermissions();
        } catch (permError) {
          if (__DEV__) console.log('Permission request failed:', permError);
          // Continue initialization even if permission fails
        }
      } else {
        if (__DEV__) console.log('Running in simulator - notifications may be limited');
      }

      this.initialized = true;
      if (__DEV__) console.log('Notification service initialized successfully');
    } catch (error) {
      if (__DEV__) console.error('Notification initialization error:', error);
      this.initialized = true; // Mark as initialized to prevent retries
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<any> {
    try {
      // Check if the Notifications API is available
      if (!Notifications.getPermissionsAsync) {
        if (__DEV__) console.log('Notification permissions API not available');
        return { status: 'unavailable' };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (__DEV__) console.log('Notification permission status:', finalStatus);
      return { status: finalStatus };
    } catch (error) {
      if (__DEV__) console.error('Error requesting notification permissions:', error);
      return { status: 'error', error };
    }
  }

  /**
   * Send a simple local notification
   */
  async sendLocalNotification(title: string, body: string): Promise<string> {
    try {
      // Check if platform supports notifications
      if (Platform.OS === 'web' || !Notifications.scheduleNotificationAsync) {
        if (__DEV__) console.log('Local notifications not available on this platform');
        return 'unavailable';
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: null, // Send immediately
      });

      return identifier;
    } catch (error) {
      if (__DEV__) console.error('Error sending local notification:', error);
      return 'error';
    }
  }
}

export default NotificationServiceMinimal.getInstance();
