/**
 * StreamVideoWrapper Component
 * 
 * Provides Stream Video context at the app root level.
 * This enables the useCalls hook to work globally for incoming call detection.
 * 
 * The wrapper initializes the StreamVideoClient when user is authenticated
 * and provides the context for all child components.
 * 
 * IMPORTANT: Uses a stable tree structure to avoid remounting children
 * when the video client connects/disconnects. Children are always rendered
 * at the same depth in the React tree regardless of client state.
 */

import React, { useEffect, useState, useRef, createContext, useContext, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { StreamVideo, StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { useAppSelector } from '../../redux/hooks';
import { streamVideoService } from '../../services/streamVideoService';
import { RingingCallsHandler } from './RingingCallsHandler';

interface StreamVideoContextValue {
  client: StreamVideoClient | null;
  isReady: boolean;
  error: string | null;
}

const StreamVideoContext = createContext<StreamVideoContextValue>({
  client: null,
  isReady: false,
  error: null,
});

export function useStreamVideoClient() {
  return useContext(StreamVideoContext);
}

interface StreamVideoWrapperProps {
  children: React.ReactNode;
}

export function StreamVideoWrapper({ children }: StreamVideoWrapperProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  
  // If the app was opened from a call notification, `streamVideoService.initialize()`
  // may have already created the client before this component mounts.
  const [client, setClient] = useState<StreamVideoClient | null>(() => streamVideoService.getClient());
  const [isReady, setIsReady] = useState(() => streamVideoService.getClient() !== null);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track initialization state to avoid re-render loops
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastPrewarmUserIdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Track mount state to avoid setting state after unmount
  const isMountedRef = useRef(true);

  // Non-blocking warm-up after auth: prime token cache + permission status checks.
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      lastPrewarmUserIdRef.current = null;
      return;
    }
    if (lastPrewarmUserIdRef.current === currentUserId) return;
    lastPrewarmUserIdRef.current = currentUserId;

    streamVideoService.prewarm({ checkPermissions: true }).catch(() => {
      // ignore
    });
  }, [currentUserId, isAuthenticated]);

  // Keep the client warm on foreground (token refresh + permission status checks).
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isAuthenticated && currentUserId) {
          streamVideoService.prewarm({ checkPermissions: false }).catch(() => {
            // ignore
          });
        }
      }
      appStateRef.current = nextAppState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [currentUserId, isAuthenticated]);

  // Initialize when user is authenticated - only once
  useEffect(() => {
    // Skip if already initialized or initializing
    if (hasInitializedRef.current || isInitializingRef.current) {
      return;
    }
    
    // Skip if not authenticated or no user
    if (!isAuthenticated || !currentUserId) {
      return;
    }
    
    // Skip if client already exists
    if (client) {
      hasInitializedRef.current = true;
      return;
    }

    const initializeClient = async () => {
      isInitializingRef.current = true;
      if (isMountedRef.current) setError(null);
      
      try {
        // Initialize the video service which creates the client
        const success = await streamVideoService.initialize();
        
        if (!isMountedRef.current) return;

        if (success) {
          const videoClient = streamVideoService.getClient();
          setClient(videoClient);
          setIsReady(true);
          hasInitializedRef.current = true;
        } else {
          // Initialization failed - might be due to subscription tier
          // This is not an error state, just means video calls won't be available
          const initError = streamVideoService.getLastInitError();
          // Always mark as ready + initialized so we don't retry in a loop
          setIsReady(true);
          hasInitializedRef.current = true;
          if (initError && !initError.includes('Premium')) {
            setError(initError);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to initialize video');
          // Mark as initialized to prevent retry loops that cause reloads
          setIsReady(true);
          hasInitializedRef.current = true;
        }
      } finally {
        isInitializingRef.current = false;
      }
    };

    // Initialize ASAP after auth so incoming ringing calls are detected immediately.
    // This runs in the background and never wraps/unmounts the navigation tree.
    void initializeClient();
    // Only depend on auth state and premium access, NOT on `client` to avoid re-init loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUserId]);

  // Reconcile local state with the singleton service (defensive).
  // If the service creates a client elsewhere (e.g. cold-start accept flow),
  // ensure this wrapper picks it up so call UI/buttons become available.
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    if (client) return;

    const existingClient = streamVideoService.getClient();
    if (!existingClient) return;

    if (!isMountedRef.current) return;
    setClient(existingClient);
    setIsReady(true);
    setError(null);
    hasInitializedRef.current = true;
  }, [isAuthenticated, currentUserId, client]);

  // Cleanup when user logs out
  useEffect(() => {
    if (!isAuthenticated && client) {
      streamVideoService.disconnect().catch(() => {
        // Ignore disconnect errors
      });
      setClient(null);
      setIsReady(false);
      setError(null);
      hasInitializedRef.current = false;
      isInitializingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const contextValue = useMemo<StreamVideoContextValue>(() => ({
    client,
    isReady,
    error,
  }), [client, isReady, error]);

  return (
    <StreamVideoContext.Provider value={contextValue}>
      {/* IMPORTANT:
          Never wrap/unwrap the navigation tree with <StreamVideo> dynamically.
          Doing so re-mounts the whole subtree and can reset users back to the Home screen.

          Instead, render the app UI as-is, and mount a tiny StreamVideo subtree only for
          components that need the SDK context (like `useCalls()` for incoming ringing calls). */}
      {children}
      {client ? (
        <StreamVideo client={client}>
          <RingingCallsHandler />
        </StreamVideo>
      ) : null}
    </StreamVideoContext.Provider>
  );
}

export default StreamVideoWrapper;
