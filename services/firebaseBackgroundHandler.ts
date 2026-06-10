/**
 * Background Message Handler for FCM
 * This handler is registered at module scope so Android can invoke it when app is killed/backgrounded
 * Must be imported before App component in App.tsx
 * 
 * Note: This handler runs in a background context - no UI updates allowed
 * Keep processing minimal and don't use React components here
 * 
 * SAFETY: This file uses defensive programming to prevent crashes if Firebase is unavailable
 */

// Register handler only when Firebase + Messaging are available.
// Uses React Native Firebase modular API to avoid deprecated namespaced warnings.
type AnyMessagingModule = {
  getMessaging?: (app?: any) => any;
  setBackgroundMessageHandler?: (messaging: any, handler: (message: any) => Promise<any>) => void;
};

type AnyAppModule = {
  getApps?: () => any[];
  getApp?: () => any;
  initializeApp?: (options?: any) => any;
};

let messagingModule: AnyMessagingModule | null = null;
let appModule: AnyAppModule | null = null;

try {
  messagingModule = require('@react-native-firebase/messaging') as AnyMessagingModule;
  appModule = require('@react-native-firebase/app') as AnyAppModule;
} catch (error) {
  // Firebase messaging not available - app will work without it
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[FCM Background] Firebase messaging not available:', error);
  }
}

try {
  const getApps = appModule?.getApps;
  const getApp = appModule?.getApp;
  const getMessaging = messagingModule?.getMessaging;
  const setBackgroundMessageHandler = messagingModule?.setBackgroundMessageHandler;

  if (!getApps || !getApp || !getMessaging || !setBackgroundMessageHandler) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[FCM Background] Messaging modular API not available');
    }
  } else {
    let hasApp = false;
    try {
      const apps = getApps();
      hasApp = Array.isArray(apps) && apps.length > 0;
    } catch {
      hasApp = false;
    }

    if (!hasApp && typeof appModule?.initializeApp === 'function') {
      try {
        appModule.initializeApp();
        const apps = getApps();
        hasApp = Array.isArray(apps) && apps.length > 0;
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[FCM Background] Initialized Firebase app for background handler');
        }
      } catch (initError) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[FCM Background] Failed to initialize Firebase app:', initError);
        }
      }
    }

    if (!hasApp) {
      // No Firebase app initialized (likely missing google-services config).
      // Skip registering handler to avoid noisy warnings.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[FCM Background] No Firebase app initialized; skipping background handler');
      }
    } else {
      let app: any;
      try {
        app = getApp();
      } catch {
        app = undefined;
      }

      let messaging: any = null;
      try {
        messaging = getMessaging(app);
      } catch (instanceError) {
        messaging = null;
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[FCM Background] Failed to get messaging instance:', instanceError);
        }
      }

      if (messaging) {
        setBackgroundMessageHandler(messaging, async (remoteMessage: any) => {
          try {
            // Extract notification data
            const notification = remoteMessage.notification;
            const data = remoteMessage.data || {};

            // Only try to save to database if we have notification data
            if (notification) {
              try {
                // Dynamically import Supabase to avoid circular dependencies
                const { supabase } = require('./supabaseClient');

                // Check if we have a valid Supabase instance
                if (supabase && typeof supabase.auth?.getUser === 'function') {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (user && user.id) {
                    // Store notification in history
                    await supabase.from('notification_history').insert({
                      user_id: user.id,
                      title: notification.title || 'Notification',
                      body: notification.body || '',
                      category: data.category || data.type || 'system',
                      data: data,
                      status: 'delivered',
                      delivered_at: new Date().toISOString(),
                    });
                  }
                }
              } catch (dbError) {
                // Database error - silently continue
                if (typeof __DEV__ !== 'undefined' && __DEV__) {
                  console.warn('[FCM Background] Failed to save notification to DB:', dbError);
                }
              }
            }
          } catch (handlerError) {
            // Error in background handler - silently continue
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.warn('[FCM Background] Handler error:', handlerError);
            }
          }
        });

        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[FCM Background] Background message handler registered successfully');
        }
      }
    }
  }
} catch (error) {
  // Keep this handler crash-safe.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[FCM Background] Failed to register background handler:', error);
  }
}

export {}; // ensure this file is treated as a module


