import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  NavigationContainer,
  type LinkingOptions,
  type NavigationContainerRef,
  type NavigationState,
} from '@react-navigation/native';
import { Text, StyleSheet, Platform, InteractionManager, View, BackHandler } from 'react-native';
import { StandardLoadingIndicator } from '../components/common/StandardLoadingIndicator';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { getCurrentUser, restoreSessionUser, setUser } from '../redux/slices/authSlice';
import { loadOnboardingStatus } from '../redux/slices/onboardingSlice';
import { LinkingService } from '../services/linkingService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { typography } from '../theme';
import referralService from '../services/referralService';
import referralTrackingService from '../services/referralTrackingService';
import { clearSubscriptionData, getCurrentSubscription } from '../redux/slices/subscriptionSlice';
import { signOutDateMi } from '../redux/slices/datemiSlice';
import { clearUserState } from '../redux/slices/userSlice';
import logger from '../utils/logger';
import { normalizeUserLocation } from '../utils/locationHelpers';
import { clearUserScopedData } from '../services/logoutCleanupService';
import { clearPasswordRecoveryFlow, isPasswordRecoveryFlowActive } from '../services/authFlowStateService';
import {
  hasSeenAuthenticatedSessionBefore,
  markAuthenticatedSessionSeen,
} from '../services/authLaunchStateService';
import type { AuthStackParamList } from '../types/navigation';

type FirebaseAnalyticsService = {
  logScreenView: (screenName: string) => Promise<void>;
};

type FirebasePerformanceService = {
  startScreenTrace: (screenName: string) => Promise<void>;
  stopScreenTrace: (screenName: string) => Promise<void>;
};

type RootParamList = Record<string, object | undefined>;

/** Only mark "has seen auth before" when the user has a completed profile (full_name set).
 *  This prevents OTP-only sessions (created before SignUp is done) from incorrectly
 *  routing the user to Login on their next cold boot instead of the Welcome/Get Started flow.
 */
function hasCompletedProfile(user: { user_metadata?: Record<string, unknown> | null } | null | undefined): boolean {
  if (!user) return false;
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  return fullName.length >= 2;
}

// Safely import Firebase services to prevent crashes
let firebaseAnalyticsService: FirebaseAnalyticsService | null = null;
let firebasePerformanceService: FirebasePerformanceService | null = null;
try {
  firebaseAnalyticsService = require('../services/firebaseAnalyticsService').default;
  firebasePerformanceService = require('../services/firebasePerformanceService').default;
} catch {
  // Silently ignore if Firebase services are unavailable
}
import { enableScreens } from 'react-native-screens';
import { optimizedNavigationTheme } from './navigationConfigOptimized';

// Enable native screens for optimal performance (must be called before any navigators)
enableScreens(true);

// Loading Component with better UX
const LoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <Text style={styles.appTitle}>LinkApp</Text>
        <StandardLoadingIndicator variant="white" size="large" />
        <View style={styles.loadingCopyContainer}>
          <Text style={styles.loadingPrimaryText}>Getting things ready...</Text>
          <Text style={styles.loadingSecondaryText}>Loading your experience</Text>
        </View>
      </View>
    </View>
  );
};

export default function RootNavigator() {
  const navigationRef = useRef<NavigationContainerRef<RootParamList>>(null);
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isSigningIn, otpProfileCompletePending } = useAppSelector((state) => state.auth);
  const lastKnownUserIdRef = useRef<string | null>(user?.id ?? null);
  const isPasswordRecoveryRef = useRef(false);
  const routeNameRef = useRef<string | undefined>(undefined);
  const hasActiveSession = isAuthenticated && !!user;
  const [isBootstrapped, setIsBootstrapped] = React.useState(hasActiveSession);
  const [authInitialRouteName, setAuthInitialRouteName] =
    React.useState<keyof AuthStackParamList>('Login');
  const hasRequestedProfileRef = useRef(false);
  const hasActiveSessionRef = useRef(hasActiveSession);
  hasActiveSessionRef.current = hasActiveSession;
  
  // FIX (BUG 4): Use the synchronous `isSigningIn` flag from the Redux store
  // instead of a useEffect-based ref.  The old approach had a timing gap between
  // when signIn.pending fired and when the useEffect updated the ref, allowing
  // SIGNED_OUT events to slip through and wipe auth state during login.
  const isLoggingInRef = useRef(false);
  isLoggingInRef.current = isSigningIn;

  // Track the last known authenticated user id so SIGNED_OUT handlers can clear user-scoped
  // local caches even after Redux state is reset.
  useEffect(() => {
    if (user?.id) {
      lastKnownUserIdRef.current = user.id;
    }
  }, [user?.id]);

  // Memoize navigation theme + linking config to prevent nav resets/re-renders
  const navigationTheme = useMemo(() => optimizedNavigationTheme, []);
  const linkingConfig = useMemo(
    () => LinkingService.getLinkingConfig() as LinkingOptions<RootParamList>,
    []
  );

  const requestUserProfile = useCallback(
    async (sessionUser?: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null } | null) => {
      if (hasRequestedProfileRef.current) return null;
      hasRequestedProfileRef.current = true;

      const result = await dispatch(getCurrentUser());

      // FALLBACK: If getCurrentUser times out or fails, create basic user from session
      if (!result.payload && sessionUser) {
        const metadata = sessionUser.user_metadata || undefined;
        const fullName =
          metadata && typeof metadata.full_name === 'string' ? metadata.full_name : 'User';
        const phoneNumber =
          metadata && typeof metadata.phone === 'string' ? metadata.phone : '';
        const registeredLocation = normalizeUserLocation(metadata);

        const basicUser = {
          id: sessionUser.id,
          email: sessionUser.email || '',
          fullName,
          phoneNumber,
          profileImageUrl: null,
          location: registeredLocation,
          kycStatus: 'pending' as const,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dispatch(setUser(basicUser));
      }

      return result;
    },
    [dispatch]
  );
  
  useEffect(() => {
    if (hasActiveSession && !isBootstrapped) {
      setIsBootstrapped(true);
    }
  }, [hasActiveSession, isBootstrapped]);

  useEffect(() => {
    const traceId = `boot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const initStartTime = Date.now();
    const bootstrapTimeoutId = setTimeout(() => {
      logger.warn(`[RootNavigator][${traceId}] Bootstrap timeout reached (12s)`);
      setIsBootstrapped(true);
    }, 12000);

    const initAuth = async () => {
      try {
        logger.debug(`[RootNavigator][${traceId}] initAuth start`);

        // Ensure token auto-refresh starts on cold boot (AppState 'active' event may not fire).
        if (Platform.OS !== 'web') {
          try {
            await supabase.auth.startAutoRefresh();
          } catch (error) {
            logger.debug(`[RootNavigator][${traceId}] startAutoRefresh failed`, {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Create a one-time latch for the INITIAL_SESSION event. This helps avoid
        // falsely routing users to Auth when AsyncStorage/Supabase init is slow.
        let resolveInitialSession: ((session: unknown | null) => void) | undefined;
        const initialSessionPromise = new Promise<unknown | null>((resolve) => {
          resolveInitialSession = resolve;
        });
        let bootHasAuthenticatedSession = false;

        // Set up auth state listener for session persistence ASAP (captures INITIAL_SESSION).
        const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
          if (event === 'INITIAL_SESSION') {
            resolveInitialSession?.(session);
            resolveInitialSession = undefined;

            if (session?.user) {
              bootHasAuthenticatedSession = true;
              if (hasCompletedProfile(session.user)) {
                void markAuthenticatedSessionSeen();
              }
              const nextUserId = session.user.id;
              const previousUserId = lastKnownUserIdRef.current;
              if (previousUserId && previousUserId !== nextUserId) {
                // User switched accounts (e.g., invite/recovery link) — clear user-scoped caches.
                void clearUserScopedData({
                  reason: 'user_switch',
                  userId: nextUserId,
                  previousUserId,
                  mode: 'full',
                }).catch(() => {});
              }
              lastKnownUserIdRef.current = nextUserId;

              // Fast path: if we have a cached session but restoreSessionUser fails on a cold start,
              // set a minimal user immediately so the app can route to AppNavigator without a restart.
              if (!hasActiveSessionRef.current) {
                const metadata = session.user.user_metadata || undefined;
                const fullName =
                  metadata && typeof metadata.full_name === 'string' ? metadata.full_name : 'User';
                const phoneNumber =
                  metadata && typeof metadata.phone === 'string' ? metadata.phone : '';
                const registeredLocation = normalizeUserLocation(metadata);

                dispatch(
                  setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    fullName,
                    phoneNumber,
                    profileImageUrl: null,
                    location: registeredLocation,
                    kycStatus: 'pending' as const,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                );
              }

              // Fetch full profile + entitlements in the background.
              InteractionManager.runAfterInteractions(() => {
                requestUserProfile(session.user).catch(() => {
                  // Ignore: auth slice already preserves active user on failure
                });
              });
              dispatch(getCurrentSubscription(session.user.id));
            }
            return;
          }

          if (event === 'SIGNED_OUT') {
            // Clear any in-progress password recovery flow marker.
            isPasswordRecoveryRef.current = false;
            clearPasswordRecoveryFlow();

            // Ignore SIGNED_OUT events during active login (from pre-login cleanup)
            if (isLoggingInRef.current) {
              return;
            }
            // Ensure user-scoped local caches are cleared even for non-thunk sign-outs
            // (e.g., token invalidation or local-only signOut calls).
            void clearUserScopedData({
              reason: 'session_invalid',
              userId: lastKnownUserIdRef.current,
              mode: 'critical',
            }).catch(() => {});
            // Reset per-user state so the next session can't inherit stale entitlements/profile data.
            hasRequestedProfileRef.current = false;
            dispatch(clearSubscriptionData());
            dispatch(signOutDateMi());
            dispatch(clearUserState());
            dispatch(setUser(null));
          } else if (event === 'SIGNED_IN' && session) {
            bootHasAuthenticatedSession = true;
            if (hasCompletedProfile(session.user)) {
              void markAuthenticatedSessionSeen();
            }
            // During password recovery, Supabase establishes a temporary session.
            // We keep the user on the Auth stack until they set a new password,
            // then we force a global sign-out and prompt them to log in again.
            if (isPasswordRecoveryRef.current || isPasswordRecoveryFlowActive()) {
              isPasswordRecoveryRef.current = true;
              const nextUserId = session.user.id;
              const previousUserId = lastKnownUserIdRef.current;
              if (previousUserId && previousUserId !== nextUserId) {
                void clearUserScopedData({
                  reason: 'user_switch',
                  userId: nextUserId,
                  previousUserId,
                  mode: 'full',
                }).catch(() => {});
              }
              lastKnownUserIdRef.current = nextUserId;
              return;
            }

            const nextUserId = session.user.id;
            const previousUserId = lastKnownUserIdRef.current;
            if (previousUserId && previousUserId !== nextUserId) {
              void clearUserScopedData({
                reason: 'user_switch',
                userId: nextUserId,
                previousUserId,
                mode: 'full',
              }).catch(() => {});
            }
            lastKnownUserIdRef.current = nextUserId;

            // FIX (BUG 7): Reset the dedup guard so each SIGNED_IN event
            // triggers a fresh full-profile fetch.  Previously, boot-time
            // restoreSessionUser would set hasRequestedProfileRef=true, and
            // then the SIGNED_IN event's requestUserProfile call would be
            // silently skipped, leaving the user with only basic metadata.
            hasRequestedProfileRef.current = false;
            // User signed in - fetch complete user profile
            await requestUserProfile(session.user);

            // Sync subscription status promptly after login so premium/pro roles resolve reliably.
            dispatch(getCurrentSubscription(session.user.id));

            // Reset badge count on successful sign-in
            try {
              const badgeService = (await import('../services/badgeService')).default;
              await badgeService.reset();
            } catch {
              // Silently handle badge reset errors
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Token refreshed - session is still valid
          } else if (event === 'USER_UPDATED' && session) {
            // Ignore USER_UPDATED during password recovery to avoid routing into AppNavigator.
            if (isPasswordRecoveryRef.current || isPasswordRecoveryFlowActive()) {
              return;
            }
            // User profile updated (e.g., password reset)
            const freshUser = await authService.getCurrentUser();
            if (freshUser) {
              dispatch(setUser(freshUser));
            }
          } else if (event === 'PASSWORD_RECOVERY' && session) {
            // Password recovery link clicked - keep user on Auth stack until they set a new password.
            isPasswordRecoveryRef.current = true;

            const nextUserId = session.user.id;
            const previousUserId = lastKnownUserIdRef.current;
            if (previousUserId && previousUserId !== nextUserId) {
              void clearUserScopedData({
                reason: 'user_switch',
                userId: nextUserId,
                previousUserId,
                mode: 'full',
              }).catch(() => {});
            }
            lastKnownUserIdRef.current = nextUserId;
          }
        });

        // Boot-time: restore session user quickly (no network), and load onboarding status in parallel.
        // This prevents blocking the first render on slow profile fetches.
        dispatch(loadOnboardingStatus());
        const restoredUser = await dispatch(restoreSessionUser()).unwrap();
        logger.debug(`[RootNavigator][${traceId}] restoreSessionUser finished`, {
          durationMs: Date.now() - initStartTime,
          hasRestoredUser: !!restoredUser,
          restoredUserId: restoredUser?.id,
        });

        // Kick off subscription sync ASAP so premium/pro entitlements resolve quickly (non-blocking).
        if (restoredUser?.id) {
          bootHasAuthenticatedSession = true;
          // Only mark "has seen auth before" when the restored user has a completed profile.
          if (typeof restoredUser.fullName === 'string' && restoredUser.fullName.trim().length >= 2) {
            void markAuthenticatedSessionSeen();
          }
          dispatch(getCurrentSubscription(restoredUser.id));
        }

        // Hydrate full profile in background (deduped with auth listener below)
        if (restoredUser) {
          InteractionManager.runAfterInteractions(() => {
            requestUserProfile().catch(() => {
              // Ignore: auth slice already preserves active user on failure
            });
          });

          // FIX (BUG 8): Validate the session server-side in the background.
          // restoreSessionUser uses getSession() which only reads local cache —
          // an expired session would appear valid.  getUser() hits the server to
          // confirm the token is still good.  If it's stale we sign out cleanly
          // instead of letting the user see the app then get kicked to login.
          InteractionManager.runAfterInteractions(() => {
            supabase.auth
              .getUser()
              .then(({ error }) => {
                if (!error) return;

                const message = error.message || '';
                const status = (error as unknown as { status?: number }).status;
                const code = (error as unknown as { code?: string }).code;
                const msgLower = message.toLowerCase();

                const isInvalidSessionError =
                  status === 401 ||
                  status === 403 ||
                  code === 'PGRST301' ||
                  msgLower.includes('jwt') ||
                  (msgLower.includes('token') && (msgLower.includes('expired') || msgLower.includes('invalid'))) ||
                  msgLower.includes('auth session missing') ||
                  msgLower.includes('not authenticated');

                if (isInvalidSessionError) {
                  logger.warn(
                    '[RootNavigator] Session validation failed — signing out locally:',
                    { status, code, message }
                  );
                  supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                  return;
                }

                // Non-fatal: transient network / timeout errors should not clear a valid cached session.
                logger.warn('[RootNavigator] Session validation error (non-fatal)', { status, code, message });
              })
              .catch(() => {
                // Non-blocking: if the network is down the auto-refresh
                // listener will handle it when connectivity returns.
              });
          });
        }

        // If no user was restored, give INITIAL_SESSION a brief chance to hydrate
        // (avoids the “login screen until reopen” cold-start bug).
        if (!restoredUser) {
          const initialSessionWaitMs = 1200;
          const initialSessionResult = await Promise.race([
            initialSessionPromise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), initialSessionWaitMs)),
          ]);
          const hasInitialSessionUser =
            !!(initialSessionResult &&
              typeof initialSessionResult === 'object' &&
              'user' in initialSessionResult &&
              (initialSessionResult as { user?: unknown }).user);
          if (hasInitialSessionUser) {
            bootHasAuthenticatedSession = true;
            void markAuthenticatedSessionSeen();
          }
        }

        // First-launch routing:
        // - Fresh install/no previous authenticated session -> Welcome (OTP onboarding flow)
        // - Returning/logged-out users -> Login
        if (!bootHasAuthenticatedSession) {
          const hasSeenAuthBefore = await hasSeenAuthenticatedSessionBefore();
          setAuthInitialRouteName(hasSeenAuthBefore ? 'Login' : 'Welcome');
        } else {
          setAuthInitialRouteName('Login');
        }

        return authListener;
      } finally {
        logger.debug(`[RootNavigator][${traceId}] initAuth complete`, {
          durationMs: Date.now() - initStartTime,
        });
        setIsBootstrapped(true);
      }
    };
    
    let authListener: { subscription?: { unsubscribe?: () => void } } | undefined;
    initAuth().then((listener) => {
      authListener = listener;
    }).catch((_e) => {
      // IMPORTANT: Always catch to avoid unhandled rejections (can trigger dev-client reload).
      void _e;
    });
    
    return () => {
      clearTimeout(bootstrapTimeoutId);
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch, requestUserProfile]);
  
  // Initialize referral code on auth
  useEffect(() => {
    if (isAuthenticated && user) {
      // Defer initialization to avoid blocking UI
      InteractionManager.runAfterInteractions(async () => {
        try {
          // Ensure referral code exists early so UI can display/share immediately
          referralService.getUserReferralCode(user.id);
        } catch {
          // Silently handle referral code initialization errors
        }
      });
    }
  }, [isAuthenticated, user, dispatch]);
  
  // Initialize deep linking
  useEffect(() => {
    // Set navigation reference for deep linking when navigation is ready
    const setNavigationRef = () => {
      if (navigationRef.current) {
        LinkingService.setNavigationRef(navigationRef.current);
      }
    };
    
    // Try immediately
    setNavigationRef();
    
    // Also try after a short delay to ensure navigation is ready
    const timeoutId = setTimeout(setNavigationRef, 100);
    
    // Initialize deep linking handlers
    let subscription: { remove?: () => void } | null = null;
    
    const initLinking = async () => {
      subscription = await LinkingService.initializeDeepLinking();
      await referralTrackingService.initialize();
    };
    
    initLinking().catch((_e) => {
      // IMPORTANT: Always catch to avoid unhandled rejections (can trigger dev-client reload).
      void _e;
    });
    
    // Cleanup subscription on unmount
    return () => {
      clearTimeout(timeoutId);
      if (subscription?.remove) {
        subscription.remove();
      }
      referralTrackingService.dispose();
    };
  }, []);

  // Handle Android back button on main screens
  useEffect(() => {
    const getActiveRouteName = (navState: NavigationState | undefined): string | undefined => {
      if (!navState || !Array.isArray(navState.routes) || navState.routes.length === 0) return undefined;

      const currentRoute = navState.routes[navState.index ?? 0];
      // Nested navigator state lives on `route.state` (typed loosely by react-navigation).
      const nestedState = (currentRoute as unknown as { state?: NavigationState }).state;
      if (nestedState) return getActiveRouteName(nestedState);
      return (currentRoute as unknown as { name?: string }).name;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const navigation = navigationRef.current;
      if (!navigation) return false;

      // NOTE: `getRootState()`/`getState()` can be undefined briefly while navigation initializes/transitions.
      const rootState = navigation.getRootState?.() ?? navigation.getState?.();
      const activeLeafRouteName = getActiveRouteName(rootState);

      // Main tab screens where back button should exit app (prevents tab back switching)
      const mainTabScreens = ['PropertyHub', 'JobsMain', 'ServicesMain', 'DateMiMain', 'ProfileMain'];

      // Exit immediately when MainTabs is the only root route, regardless of which tab is active.
      // This avoids Android "back switches tabs" behavior and matches expected UX.
      if (rootState && Array.isArray(rootState.routes) && rootState.routes.length <= 1) {
        const topRoute = rootState.routes[0] as unknown as { name?: string };
        if (topRoute?.name === 'MainTabs' && activeLeafRouteName && mainTabScreens.includes(activeLeafRouteName)) {
          BackHandler.exitApp();
          return true;
        }
      }
      
      // For other screens, use default back navigation
      return false;
    });

    return () => backHandler.remove();
  }, []);

  // Optimized state change handler with deferred heavy operations
  const handleStateChange = React.useCallback(async () => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    
    if (previousRouteName !== currentRouteName && currentRouteName) {
      // Immediate lightweight operations
      routeNameRef.current = currentRouteName;
      
      // Defer heavy operations until after transition completes
      InteractionManager.runAfterInteractions(async () => {
        // Track screen view in Firebase Analytics (deferred)
        if (firebaseAnalyticsService) {
          try {
            await firebaseAnalyticsService.logScreenView(currentRouteName);
          } catch {
            // Silently handle Firebase errors
          }
        }
        
        // Track screen rendering performance (deferred)
        if (firebasePerformanceService) {
          try {
            if (previousRouteName) {
              await firebasePerformanceService.stopScreenTrace(previousRouteName);
            }
            await firebasePerformanceService.startScreenTrace(currentRouteName);
          } catch {
            // Silently handle Firebase errors
          }
        }
      });
    }
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linkingConfig}
      onReady={() => {
        // CRITICAL:
        // Ensure global navigation ref is set deterministically once the container is ready.
        // Some devices can miss the earlier effect-based setNavigationRef() timing, which
        // makes LinkingService.navigate() a no-op and breaks call-screen navigation.
        if (navigationRef.current) {
          LinkingService.setNavigationRef(navigationRef.current);
        }
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={handleStateChange}
      // Performance optimizations
      documentTitle={{
        enabled: Platform.OS !== 'android', // Disable on Android for better performance
      }}
    >
      {!isBootstrapped ? (
        <LoadingScreen />
      ) : (
        isAuthenticated && user && !otpProfileCompletePending ? (
          <AppNavigator />
        ) : (
          <AuthNavigator initialRouteName={authInitialRouteName} />
        )
      )}
    </NavigationContainer>
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
    fontWeight: typography.fontWeight.bold,
    color: '#FF1493',
    marginBottom: 32,
    letterSpacing: 2,
    textAlign: 'center',
  },
  loadingCopyContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  loadingPrimaryText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    opacity: 0.95,
    textAlign: 'center',
  },
  loadingSecondaryText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    opacity: 0.85,
    marginTop: 6,
    textAlign: 'center',
  },
});
