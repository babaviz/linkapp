// Import polyfills first - MUST be before all other imports
import './polyfills';

import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useColorScheme,
  View,
  TouchableOpacity,
  Linking,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';

// Prevent the splash screen from auto-hiding before we're ready
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen already hidden or not available
});
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

// Safely import production optimizations
let disableConsoleLogs: () => void = () => {};
try {
  const prodOptimizations = require('./utils/productionOptimizations');
  disableConsoleLogs = prodOptimizations.disableConsoleLogs || (() => {});
} catch (error) {
  console.warn('[App] Production optimizations not available:', error);
}

// Ensure FCM background handler is registered (AFTER polyfills)
// This is wrapped in try-catch to prevent app crash if Firebase isn't configured
try {
  require('./services/firebaseBackgroundHandler');
} catch (error) {
  console.warn('[App] Firebase background handler not available:', error);
}

// Import RootNavigator directly without lazy loading
import RootNavigator from './navigation/RootNavigator';

// Import notification service
import notificationService from './services/notificationServiceMinimal';
import * as Notifications from 'expo-notifications';
import { LinkingService } from './services/linkingService';
// Import PaystackProvider
import { PaystackProvider } from './providers/PaystackProvider';
import { OverlayProvider } from 'stream-chat-expo';
import type { DeepPartial, Theme } from 'stream-chat-expo';
import { streamChatThemeDark } from './theme/streamChatTheme';
// Import Firebase services (lazy loaded to prevent crashes)
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from './components/ErrorBoundary';
import DateMiNotificationBootstrapper from './components/datemi/DateMiNotificationBootstrapper';

// Firebase service types for safe lazy loading
interface FirebaseAnalyticsService {
  trackAppInstall: (source: string) => Promise<void>;
}

interface FirebasePerformanceService {
  trackAppStartTime: () => Promise<void>;
  trackTimeToInteractive: () => Promise<void>;
  logError: (error: Error, context: string) => Promise<void>;
}

// Safely import Firebase services
let firebaseAnalyticsService: FirebaseAnalyticsService | null = null;
let firebasePerformanceService: FirebasePerformanceService | null = null;
try {
  firebaseAnalyticsService = require('./services/firebaseAnalyticsService').default;
  firebasePerformanceService = require('./services/firebasePerformanceService').default;
} catch {
  // Firebase services not available - app will continue without analytics
}

// Safely import chat and call components
let StreamChatWrapper: React.ComponentType<{ children: React.ReactNode; showLoadingIndicator?: boolean }> | null = null;
let DialogContainer: React.ComponentType<any> | null = null;
let handleCallNotificationResponse: ((data: any, actionIdentifier?: string) => Promise<void>) | null = null;
let IncomingCallModal: React.ComponentType<any> | null = null;
let CallEventHandler: React.ComponentType<any> | null = null;
let CallNavigationCoordinator: React.ComponentType<any> | null = null;

try {
  const chatModule = require('./components/chat/StreamChatWrapper');
  StreamChatWrapper = chatModule.StreamChatWrapper;
} catch (error) {
  console.warn('[App] StreamChatWrapper not available:', error);
}

try {
  const dialogModule = require('./utils/dialogService');
  DialogContainer = dialogModule.DialogContainer;
} catch (error) {
  console.warn('[App] DialogContainer not available:', error);
}

try {
  const callHandlerModule = require('./utils/callNotificationHandler');
  handleCallNotificationResponse = callHandlerModule.handleCallNotificationResponse;
} catch (error) {
  console.warn('[App] Call notification handler not available:', error);
}

let StreamVideoWrapper: React.ComponentType<{ children: React.ReactNode }> | null = null;

try {
  const datemiModule = require('./components/datemi');
  IncomingCallModal = datemiModule.IncomingCallModal;
  const callEventModule = require('./components/call/CallEventHandler');
  CallEventHandler = callEventModule.CallEventHandler;
  const callNavModule = require('./components/call/CallNavigationCoordinator');
  CallNavigationCoordinator = callNavModule.CallNavigationCoordinator;
  const streamVideoWrapperModule = require('./components/call/StreamVideoWrapper');
  StreamVideoWrapper = streamVideoWrapperModule.StreamVideoWrapper;
} catch (error) {
  console.warn('[App] DateMi/Call components not available:', error);
}

// Loading component while app initializes
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <View style={styles.loadingContent}>
      <Text style={styles.appTitle}>LinkApp</Text>
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingSpinner} />
      <View style={styles.loadingCopyContainer}>
        <Text style={styles.loadingPrimaryText}>Getting things ready...</Text>
        <Text style={styles.loadingSecondaryText}>Loading your experience</Text>
      </View>
    </View>
  </View>
);

const BootErrorScreen = ({
  message,
  onReload,
  isReloading,
}: {
  message: string;
  onReload: () => void;
  isReloading: boolean;
}) => {
  return (
    <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>⚠️ App failed to start</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        {!isReloading && (
          <TouchableOpacity style={styles.errorButton} onPress={onReload}>
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
        {isReloading && (
          <View style={styles.errorReloadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.errorReloadingText}>Restarting app...</Text>
          </View>
        )}
        <Text style={styles.errorHintText}>
          If this persists, please close and restart the app manually.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const StreamChatOverlayProviders = ({
  children,
  isDarkMode,
}: {
  children: React.ReactNode;
  isDarkMode: boolean;
}) => {
  // Force Stream Chat (and Stream UI surfaces) to dark for consistency.
  // We keep the prop for compatibility with existing call sites.
  void isDarkMode;
  return (
    <OverlayProvider
      value={{
        style: streamChatThemeDark as DeepPartial<Theme>,
      }}
    >
      {children}
    </OverlayProvider>
  );
};

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [isReloading, setIsReloading] = React.useState(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const isMountedRef = React.useRef(true);
  const lastHandledNotificationKeyRef = React.useRef<string | null>(null);

  const formatBootError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      return error.message || 'Unknown error';
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }, []);

  // Hide splash screen once app is ready
  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Splash screen already hidden
      }
    }
  }, [isReady]);
  
  useEffect(() => {
    isMountedRef.current = true;

    // Capture fatal runtime errors so we don't end up with a silent white screen.
    // (These can happen in production-like runs where RedBox is disabled.)
    interface ErrorUtilsInterface {
      getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    }
    
    const errorUtils = (global as { ErrorUtils?: ErrorUtilsInterface }).ErrorUtils;
    const defaultHandler =
      typeof errorUtils?.getGlobalHandler === 'function' ? errorUtils.getGlobalHandler() : undefined;

    if (typeof errorUtils?.setGlobalHandler === 'function') {
      errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        const errorStr = formatBootError(error);
        const isStreamSdkError =
          errorStr.includes('stream-io') ||
          errorStr.includes('video.stream-io') ||
          errorStr.includes('coordinator') ||
          errorStr.includes('[coordinator]');
        const isWsLikeError =
          errorStr.includes('1006') ||
          errorStr.includes('WS failed') ||
          errorStr.includes('WebSocket');
        const isStreamWsError = isStreamSdkError && isWsLikeError;

        // Stream Video/Chat websocket failures are retry-level errors that must never
        // crash the app or trigger a dev-client reload.
        if (isStreamWsError) {
          return;
        }

        if (isMountedRef.current) {
          setBootError(errorStr + (isFatal ? ' (fatal)' : ''));
        }
        if (typeof defaultHandler === 'function') {
          defaultHandler(error, isFatal);
        }
      });
    }

    interface UnhandledRejectionEvent {
      reason?: unknown;
    }
    
    const previousUnhandledRejection = (globalThis as { onunhandledrejection?: unknown }).onunhandledrejection;
    (globalThis as { onunhandledrejection?: (event: UnhandledRejectionEvent) => void }).onunhandledrejection = (event: UnhandledRejectionEvent) => {
      // Swallow non-fatal rejections from Stream Video/Chat WebSocket failures.
      // These are retry-level errors that the SDKs handle internally and should
      // never surface as boot errors or trigger app reloads.
      const reasonStr = formatBootError(event?.reason ?? event);
      const isStreamSdkError =
        reasonStr.includes('stream-io') ||
        reasonStr.includes('video.stream-io') ||
        reasonStr.includes('coordinator') ||
        reasonStr.includes('[coordinator]');
      const isWsLikeError =
        reasonStr.includes('1006') ||
        reasonStr.includes('WS failed') ||
        reasonStr.includes('WebSocket');
      const isStreamWsError = isStreamSdkError && isWsLikeError;

      if (isStreamWsError) {
        // Silently ignore Stream SDK WebSocket errors - they are retried internally
        return;
      }

      if (isMountedRef.current) {
        setBootError(reasonStr);
      }
      if (typeof previousUnhandledRejection === 'function') {
        (previousUnhandledRejection as (event: UnhandledRejectionEvent) => void)(event);
      }
    };

    // Disable console logs in production
    disableConsoleLogs();

    const initializeApp = async () => {
      const startTime = Date.now();

      try {
        // Track app start time only if Firebase is available
        if (firebasePerformanceService) {
          try {
            await firebasePerformanceService.trackAppStartTime();
          } catch {
            // Silently handle Firebase tracking errors
          }
        }
        
        setIsReady(true);

        const deferredTasks = async () => {
          try {
            const hasLaunchedBefore = await AsyncStorage.getItem('has_launched_before');
            if (!hasLaunchedBefore) {
              if (firebaseAnalyticsService) {
                try {
                  await firebaseAnalyticsService.trackAppInstall('organic');
                } catch {
                  // Silently handle Firebase analytics errors
                }
              }
              await AsyncStorage.setItem('has_launched_before', 'true');
            }

            if (Platform.OS === 'android' || Platform.OS === 'ios') {
              try {
                await notificationService.initialize();
              } catch (error) {
                // Silently handle notification initialization errors
                if (__DEV__) {
                  // eslint-disable-next-line no-console
                  console.warn('Notification initialization failed:', error);
                }
              }
            }

            const endTime = Date.now();
            const startupTime = endTime - startTime;
            
            if (firebasePerformanceService) {
              try {
                await firebasePerformanceService.trackTimeToInteractive();
              } catch {
                // Silently handle Firebase tracking errors
              }
            }
            
            if (startupTime > 3000 && __DEV__) {
              // eslint-disable-next-line no-console
              console.warn(`Slow startup: ${startupTime}ms`);
            }
          } catch (error) {
            if (firebasePerformanceService) {
              try {
                await firebasePerformanceService.logError(error as Error, 'Deferred initialization');
              } catch {
                // Ignore Firebase errors
              }
            }
          }
        };

        setTimeout(deferredTasks, 100);

      } catch (initError) {
        if (isMountedRef.current) {
          setBootError(formatBootError(initError));
        }
        if (firebasePerformanceService) {
          try {
            await firebasePerformanceService.logError(initError as Error, 'App initialization');
          } catch {
            // Ignore Firebase errors
          }
        }
        setIsReady(true);
      }
    };

    // Centralized notification routing via NotificationNavigationService.
    // All notification types (calls, messages, jobs, services, etc.) are
    // handled in one place with optimistic "1 screen = 1 action" navigation.
    const handleNotificationResponse = (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response) return;

      try {
        const { notification } = response;
        const { data } = notification.request.content;
        const notificationData = data as Record<string, unknown> | undefined;

        const key = `${notification.request.identifier}:${response.actionIdentifier || ''}`;
        if (lastHandledNotificationKeyRef.current === key) return;
        lastHandledNotificationKeyRef.current = key;

        if (!notificationData) return;

        // Delegate all routing to the centralized navigation service
        const { default: notificationNavigationService } = require('./services/notificationNavigationService');
        notificationNavigationService.navigateFromNotification(
          notificationData,
          response.actionIdentifier || undefined
        );
      } catch {
        // Ignore notification parsing errors (never crash app boot)
      }
    };

    // Set up notification response listener (calls + chat navigation)
    const notificationResponseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    // Cold start: handle the last notification response once on boot (best-effort).
    // Guarded for SDK/version differences.
    (async () => {
      try {
        // If the app was opened via a deep link, don't override navigation
        // with a stale "last notification response" from a previous session.
        const initialUrl = await Linking.getInitialURL();
        if (typeof initialUrl === 'string' && initialUrl.trim().length > 0) {
          return;
        }

        const getLast = (Notifications as unknown as { getLastNotificationResponseAsync?: () => Promise<any> })
          .getLastNotificationResponseAsync;
        if (!getLast) return;
        const lastResponse = await getLast();
        handleNotificationResponse(lastResponse);

        const clearLast = (Notifications as unknown as { clearLastNotificationResponseAsync?: () => Promise<void> })
          .clearLastNotificationResponseAsync;
        if (clearLast) {
          await clearLast();
        }
      } catch {
        // Ignore
      }
    })();

    initializeApp();

    // Cleanup notification listener on unmount
    return () => {
      isMountedRef.current = false;
      (globalThis as { onunhandledrejection?: unknown }).onunhandledrejection = previousUnhandledRejection;
      notificationResponseListener.remove();
    };
  }, [formatBootError]);

  // Fallback splash hide (in case layout event doesn't fire on some devices)
  useEffect(() => {
    if (!isReady) return;
    const timeoutId = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {
        // Ignore
      });
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [isReady]);

  if (!isReady) {
    return <LoadingScreen />;
  }

  if (bootError) {
    return (
      <BootErrorScreen
        message={bootError}
        isReloading={isReloading}
        onReload={async () => {
          setIsReloading(true);
          try {
            await new Promise(resolve => setTimeout(resolve, 300));
            await Updates.reloadAsync();
          } catch {
            setIsReloading(false);
            setBootError(`${bootError}\n\nReload failed. Please close and restart the app manually.`);
          }
        }}
      />
    );
  }

  // Wrap content with video wrapper if available
  const videoContent = (chatContent: React.ReactNode) => {
    if (StreamVideoWrapper) {
      return (
        <StreamVideoWrapper>
          {CallNavigationCoordinator && <CallNavigationCoordinator />}
          {chatContent}
        </StreamVideoWrapper>
      );
    }
    return chatContent;
  };

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <StreamChatOverlayProviders isDarkMode={isDarkMode}>
            <PaystackProvider>
              {StreamChatWrapper ? (
                <StreamChatWrapper showLoadingIndicator={false}>
                  <DateMiNotificationBootstrapper />
                  {/* CallEventHandler initializes video service and sets up event handlers */}
                  {CallEventHandler && <CallEventHandler />}
                  {videoContent(
                    <>
                      <RootNavigator />
                      {DialogContainer && <DialogContainer isDarkMode={isDarkMode} />}
                      {IncomingCallModal && <IncomingCallModal />}
                      <StatusBar 
                        style="auto"
                        backgroundColor="transparent"
                        translucent={Platform.OS === 'android'}
                      />
                    </>
                  )}
                </StreamChatWrapper>
              ) : (
                <>
                  <RootNavigator />
                  <StatusBar 
                    style="auto"
                    backgroundColor="transparent"
                    translucent={Platform.OS === 'android'}
                  />
                </>
              )}
            </PaystackProvider>
          </StreamChatOverlayProviders>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#2E3A8C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 32,
    letterSpacing: 2,
    textAlign: 'center',
  },
  loadingSpinner: {
    marginVertical: 20,
  },
  loadingCopyContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  loadingPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
  loadingSecondaryText: {
    marginTop: 6,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.85,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 16,
  },
  errorButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorReloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorReloadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  errorHintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'left',
    lineHeight: 16,
  },
});
