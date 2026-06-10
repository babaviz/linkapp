import { Platform } from 'react-native';

// Safely import Firebase modules to prevent crashes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseAppModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let messagingModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseAnalyticsService: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebasePerformanceService: any = null;

try {
  firebaseAppModule = require('@react-native-firebase/app');
  messagingModule = require('@react-native-firebase/messaging');
  firebaseAnalyticsService = require('./firebaseAnalyticsService').default;
  firebasePerformanceService = require('./firebasePerformanceService').default;
} catch {
  // Firebase modules not available
}

// Lazy import to break circular dependency
// notificationService will be imported when needed
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

class FirebaseService {
  private static instance: FirebaseService;
  private initialized = false;
  private tokenRefreshUnsubscribe: (() => void) | null = null;

  private constructor() {}

  private getFirebaseAppSafe(): any | null {
    try {
      if (!firebaseAppModule?.getApps || !firebaseAppModule?.getApp) {
        return null;
      }
      const apps = firebaseAppModule.getApps();
      if (!Array.isArray(apps) || apps.length === 0) {
        return null;
      }
      return firebaseAppModule.getApp();
    } catch {
      return null;
    }
  }

  private getMessagingSafe(): FirebaseMessagingTypes.Module | null {
    try {
      if (!messagingModule?.getMessaging) {
        return null;
      }
      const app = this.getFirebaseAppSafe();
      if (!app) {
        return null;
      }
      return messagingModule.getMessaging(app) as FirebaseMessagingTypes.Module;
    } catch {
      return null;
    }
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Initialize Firebase app and services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if Firebase modules are available
      if (!firebaseAppModule || !messagingModule) {
        return;
      }

      // Check if Firebase app is properly configured
      const app = this.getFirebaseAppSafe();
      if (!app?.options) {
        return;
      }

      // Initialize messaging service
      await this.initializeMessaging();
      
      // Initialize analytics
      if (firebaseAnalyticsService) {
        try {
          await firebaseAnalyticsService.initialize();
        } catch {
          // Silently handle analytics initialization errors
        }
      }
      
      // Initialize performance monitoring and crashlytics
      if (firebasePerformanceService) {
        try {
          await firebasePerformanceService.initialize();
        } catch {
          // Silently handle performance initialization errors
        }
      }
      
      this.initialized = true;

    } catch {
      // Don't throw - allow app to continue without Firebase
    }
  }

  /**
   * Create notification channel (Android only)
   */
  private async createNotificationChannel(): Promise<void> {
    try {
      if (!messagingModule || Platform.OS !== 'android') {
        return;
      }

      const msg = this.getMessagingSafe();
      if (!msg) {
        return;
      }

      // Type assertion for Android-specific API
      const messagingInstance = msg as FirebaseMessagingTypes.Module & {
        android?: {
          createChannel?: (channel: {
            channelId: string;
            name: string;
            importance: number;
            description: string;
          }) => Promise<void>;
        };
      };
      if (messagingInstance.android?.createChannel) {
        await messagingInstance.android.createChannel({
          channelId: 'default',
          name: 'Default Channel',
          importance: 4, // High importance
          description: 'Default notification channel for the app',
        });
      }
    } catch {
      // Silently handle channel creation errors
    }
  }

  /**
   * Initialize Firebase Cloud Messaging
   */
  private async initializeMessaging(): Promise<void> {
    try {
      if (!messagingModule) {
        return;
      }

      const msg = this.getMessagingSafe();
      if (!msg) {
        return;
      }

      // Create notification channel first (Android)
      await this.createNotificationChannel();

      // Request messaging permission
      const authStatus = await messagingModule.requestPermission(msg);
      const enabled =
        authStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
        authStatus === messagingModule.AuthorizationStatus.PROVISIONAL;

      if (!enabled && Platform.OS === 'ios') {
        return;
      }

      // Set up message handlers
      this.setupMessageHandlers();

      // Set up token refresh handler
      this.setupTokenRefreshHandler();
    } catch {
      // Silently handle messaging initialization errors
    }
  }

  /**
   * Set up Firebase message handlers
   * Note: Background handler should NOT be set here - it's set in firebaseBackgroundHandler.ts
   * This is to avoid duplicate registrations
   */
  private setupMessageHandlers(): void {
    try {
      if (!messagingModule) {
        return;
      }

      const msg = this.getMessagingSafe();
      if (!msg) {
        return;
      }

      // Handle foreground messages - show local notification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messagingModule.onMessage(msg, async (remoteMessage: any) => {
        try {
          // Extract notification data
          const notification = remoteMessage.notification;
          const data = remoteMessage.data || {};

          if (notification) {
            // Generate unique ID for notification
            const notificationId = `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Lazy import to avoid circular dependency
            const { default: notificationService } = await import('./notificationService');
            
            // Route message/chat payloads through the 'messages' Android channel
            // so the OS uses the correct sound & importance settings.
            const isMessageType = data.type === 'message' || data.type === 'chat' ||
              data.category === 'message' || data.category === 'chat';
            const channelId = isMessageType ? 'messages' : undefined;

            // Show local notification for foreground messages
            await notificationService.sendLocalNotification({
              id: notificationId,
              title: notification.title || 'New Notification',
              body: notification.body || '',
              data: data,
              sound: 'default',
              badge: data.badge ? parseInt(String(data.badge), 10) : undefined,
              categoryId: data.category as string | undefined,
              channelId,
            });
          }
        } catch {
          // Error handling foreground message - silently continue
        }
      });

      // Handle notification opened app (when app is in background)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messagingModule.onNotificationOpenedApp(msg, (remoteMessage: any) => {
        try {
          this.handleNotificationNavigation(remoteMessage);
        } catch {
          // Error handling notification opened app - silently continue
        }
      });

      // Check whether an initial notification is available (when app is opened from killed state)
      messagingModule
        .getInitialNotification(msg)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((remoteMessage: any) => {
          if (remoteMessage) {
            try {
              // Wait a bit for navigation to be ready
              setTimeout(() => {
                this.handleNotificationNavigation(remoteMessage);
              }, 1000);
            } catch {
              // Error handling initial notification - silently continue
            }
          }
        })
        .catch(() => {
          // Error getting initial notification - silently continue
        });
    } catch {
      // Silently handle message handler setup errors
    }
  }

  /**
   * Set up FCM token refresh handler
   */
  private setupTokenRefreshHandler(): void {
    try {
      if (!messagingModule) {
        return;
      }

      const msg = this.getMessagingSafe();
      if (!msg) {
        return;
      }

      // Unsubscribe from previous handler if exists
      if (this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe();
      }

      // Listen for token refresh - returns unsubscribe function
      this.tokenRefreshUnsubscribe = messagingModule.onTokenRefresh(msg, async (newToken: string) => {
        try {
          // Lazy import to avoid circular dependency
          const { default: notificationService } = await import('./notificationService');
          
          // Update token in database via notification service
          // Access private method via type casting to unknown first
          const service = notificationService as unknown as {
            storeTokenInDatabase: (token: string) => Promise<void>;
          };
          await service.storeTokenInDatabase(newToken);
        } catch {
          // Error updating token in database - token will be updated on next app launch
        }
      });
    } catch {
      // Silently handle token refresh handler setup errors
    }
  }

  /**
   * Handle notification navigation based on notification data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleNotificationNavigation(remoteMessage: any): void {
    try {
      const data = remoteMessage.data || {};
      const notificationType = (data.type || data.category || 'default') as string;

      // Import navigation service dynamically to avoid circular dependency
      const navigationService = require('./NavigationService').default as {
        navigateToJobDetails: (jobId: string) => void;
        navigateToPropertyDetails: (propertyId: string) => void;
        navigateToServiceDetails: (serviceId: string) => void;
        navigateToChat: (chatId?: string, userId?: string) => void;
        navigateToPayment: (amount: number, type: string) => void;
        navigateToNotifications: () => void;
      };

      // Handle different notification types
      switch (notificationType) {
        case 'job':
        case 'job_alert':
          if (data.jobId) {
            navigationService.navigateToJobDetails(String(data.jobId));
          }
          break;
        case 'property':
          if (data.propertyId) {
            navigationService.navigateToPropertyDetails(String(data.propertyId));
          }
          break;
        case 'service':
          if (data.serviceId) {
            navigationService.navigateToServiceDetails(String(data.serviceId));
          }
          break;
        case 'message':
        case 'chat':
          if (data.chatId || data.userId) {
            navigationService.navigateToChat(
              data.chatId ? String(data.chatId) : undefined,
              data.userId ? String(data.userId) : undefined
            );
          }
          break;
        case 'payment':
          if (data.amount && data.paymentType) {
            navigationService.navigateToPayment(
              Number(data.amount),
              String(data.paymentType)
            );
          }
          break;
        default:
          // Navigate to notifications screen
          navigationService.navigateToNotifications();
          break;
      }
    } catch {
      // Error handling notification navigation - navigate to notifications screen as fallback
      try {
        const navigationService = require('./NavigationService').default as {
          navigateToNotifications: () => void;
        };
        navigationService.navigateToNotifications();
      } catch {
        // Could not navigate - app may not be ready yet
      }
    }
  }

  /**
   * Get FCM token
   */
  async getMessagingToken(): Promise<string | null> {
    try {
      if (!messagingModule) {
        return null;
      }

      const msg = this.getMessagingSafe();
      if (!msg) {
        return null;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      const token = await messagingModule.getToken(msg);
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Delete FCM token
   */
  async deleteMessagingToken(): Promise<void> {
    try {
      if (!messagingModule) {
        return;
      }

      const msg = this.getMessagingSafe();
      if (!msg) {
        return;
      }

      await messagingModule.deleteToken(msg);
      
      // Clean up token refresh handler
      if (this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe();
        this.tokenRefreshUnsubscribe = null;
      }
    } catch {
      // Silently handle token deletion errors
    }
  }

  /**
   * Check if Firebase is properly initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup - unregister handlers
   */
  cleanup(): void {
    if (this.tokenRefreshUnsubscribe) {
      this.tokenRefreshUnsubscribe();
      this.tokenRefreshUnsubscribe = null;
    }
  }

  /**
   * Get Firebase app instance
   */
  getApp() {
    const app = this.getFirebaseAppSafe();
    if (!app) {
      throw new Error('Firebase app not available');
    }
    return app;
  }

  /**
   * Get messaging instance
   */
  getMessaging() {
    const msg = this.getMessagingSafe();
    if (!msg) {
      throw new Error('Firebase messaging not available');
    }
    return msg;
  }
}

let instance: FirebaseService | null = null;
const handler: ProxyHandler<FirebaseService> = {
  get(target, prop) {
    try {
      if (!instance) instance = FirebaseService.getInstance();
      const value = (instance as any)[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    } catch (error) {
      // APK crash prevention: If Firebase fails, return safe defaults
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Firebase] Failed to access property:', prop, error);
      }
      // Return safe no-op for functions
      return typeof prop === 'string' && prop !== 'constructor'
        ? async () => Promise.resolve(null)
        : undefined;
    }
  }
};
export default new Proxy({} as FirebaseService, handler);
