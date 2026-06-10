import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firebase from '../services/firebase';

/**
 * Notification Utility Functions
 * 
 * This module provides utility functions for handling push notifications
 * using Firebase Cloud Messaging (FCM).
 */

/**
 * Initialize push notifications
 * This ensures Firebase is initialized and notification channels are created
 */
export const initializeNotifications = async (): Promise<boolean> => {
  try {
    // Initialize Firebase if not already initialized
    if (!firebase.isInitialized()) {
      await firebase.initialize();
    }

    return true;
  } catch (error) {
    
    return false;
  }
};

/**
 * Request permission to receive push notifications
 * Note: On Android, this is automatically granted, but we still call it for consistency
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled = 
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    return enabled;
  } catch (error) {
    
    return false;
  }
};

/**
 * Get FCM token for device
 */
export const getDeviceToken = async (): Promise<string | null> => {
  try {
    return await firebase.getMessagingToken();
  } catch (error) {
    
    return null;
  }
};

/**
 * Register for foreground notification handling
 * @param handler Function to be called when notification is received in foreground
 * @returns Unsubscribe function
 */
export const onForegroundMessage = (
  handler: (message: any) => void
): (() => void) => {
  return messaging().onMessage(handler);
};

/**
 * Register for notification opened app handling
 * @param handler Function to be called when app is opened from notification
 * @returns Unsubscribe function
 */
export const onNotificationOpenedApp = (
  handler: (message: any) => void
): (() => void) => {
  return messaging().onNotificationOpenedApp(handler);
};

/**
 * Check if app was opened from a notification
 */
export const getInitialNotification = async (): Promise<any> => {
  return await messaging().getInitialNotification();
};

/**
 * Register for background message handling
 * Note: This must be called outside of any component
 * Typically done in index.js or App.tsx
 */
export const setBackgroundMessageHandler = (
  handler: (message: any) => Promise<void>
): void => {
  messaging().setBackgroundMessageHandler(handler);
};

/**
 * Set FCM badge count (iOS only)
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  if (Platform.OS === 'ios') {
    try {
      await messaging().setAutoInitEnabled(true);
      // Note: setBadgeCount is not available in @react-native-firebase/messaging
      // Badge management should be done through iOS-specific APIs or expo-notifications
    } catch (error) {
      // Badge count setting not supported
    }
  }
};

/**
 * Unregister the device from receiving notifications
 */
export const unregisterDevice = async (): Promise<void> => {
  try {
    await firebase.deleteMessagingToken();
  } catch (error) {
    
  }
};

export default {
  initializeNotifications,
  requestNotificationPermission,
  getDeviceToken,
  onForegroundMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
  setBadgeCount,
  unregisterDevice,
};
