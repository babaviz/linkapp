import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Subscription } from 'expo-notifications';
import notificationService from '../services/notificationService';
import badgeService from '../services/badgeService';
import { supabase } from '../services/supabaseClient';
import { NotificationResponse } from '../types/notifications';

export function useNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    (async () => {
      try {

        // Environment flags to bypass push setup in internal/testing builds
        const NOTIFS_DISABLED = process.env.EXPO_PUBLIC_NOTIFICATIONS_DISABLED === '1';
        const NOTIFS_MODE = process.env.EXPO_PUBLIC_NOTIFICATIONS_MODE; // 'disabled' | 'firebase' | 'expo' | 'minimal'
        const shouldBypassPush = NOTIFS_DISABLED || (NOTIFS_MODE && NOTIFS_MODE !== 'firebase');

        // Check permission status without requesting it
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status as 'granted' | 'denied' | 'undetermined');

        // Only register for push notifications if allowed by env, permission is granted, and on real device
        if (status === 'granted' && !shouldBypassPush) {
          try {
            // Registering for push notifications
            const t = await notificationService.registerForPushNotifications();
            if (t) {
              setToken(t);
              
            } else {
              // Token registered
            }
          } catch (pushError: any) {
            // Push registration error - handle silently
            const errorMsg = pushError?.message ?? String(pushError);
            // Don't set token, but continue with app functionality
          }
        } else if (shouldBypassPush) {
          // Bypassing push notifications
        } else {
          
        }

        // Listen for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
          // Update badge count when a new notification arrives
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const unreadCount = await notificationService.getUnreadNotificationsCount(user.id);
              await badgeService.setCount(unreadCount);
            }
          } catch (error) {
            console.error('Error updating badge on notification received:', error);
          }
        });

        // Listen for user interaction with notifications
        responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response: any) => {
          notificationService.handleNotificationResponse(response as NotificationResponse);
          
          // Update badge count after user interacts with notification
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const unreadCount = await notificationService.getUnreadNotificationsCount(user.id);
              await badgeService.setCount(unreadCount);
            }
          } catch (error) {
            console.error('Error updating badge on notification response:', error);
          }
        });
      } catch (error) {
        // Error initializing notifications
        // Set a reasonable default
        setPermissionStatus('undetermined');
      }
    })();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    token,
    permissionStatus,
    requestPermissions: () => notificationService.requestPermissions(),
    sendLocal: (args: { title: string; body: string; data?: Record<string, any>; categoryId?: string }) =>
      notificationService.sendLocalNotification({ id: Date.now().toString(), ...args }),
    clearAll: () => notificationService.clearAllNotifications(),
  };
}
