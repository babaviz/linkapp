/**
 * VideoCallScreen - Video/Audio calling interface for Date Mi module
 * 
 * Provides full-featured video and audio calling with Stream Video SDK.
 * Only available to Premium tier subscribers.
 * 
 * Handles all call states using Stream Video SDK hooks:
 * - Outgoing call (ringing)
 * - Incoming call (ringing)
 * - Active call (connected)
 * - Reconnecting
 * - Ended
 * 
 * Based on Stream Video React Native SDK best practices:
 * https://getstream.io/video/docs/react-native/
 */

import React, { useEffect, useRef, useCallback, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Animated,
  BackHandler,
  NativeModules,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  StreamVideo,
  StreamCall,
  CallContent,
  NoiseCancellationProvider,
  callManager,
  useCallStateHooks,
  useCall,
  useNoiseCancellation,
  CallingState,
  type CallControlProps,
  type ParticipantVideoFallbackProps,
} from '@stream-io/video-react-native-sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { useStreamVideoClient as useAppStreamVideoClient } from '../../components/call/StreamVideoWrapper';
import {
  selectActiveCall,
  selectCallDuration,
  endCall,
  toggleSpeaker,
  updateCallDuration,
  selectCallError,
  setCallingState,
  setCallError,
  setCallScreenVisible,
  clearError,
} from '../../redux/slices/callSlice';
import { streamVideoService } from '../../services/streamVideoService';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';
import { streamVideoTheme } from '../../theme/streamVideoTheme';
import dateMiNotificationManager from '../../services/dateMiNotificationManager';

// Check if the required Stream Video native module is available on Android.
// Without it, <StreamCall> will crash inside AppStateListener.
const hasStreamNativeModule =
  Platform.OS !== 'android' || NativeModules.StreamVideoAppLifecycle != null;

// Noise cancellation can be unstable on some Android builds/devices (and is optional for call stability).
// Enable only where we have the most reliable runtime behavior.
const hasNoiseCancellationNativeModule =
  Platform.OS === 'ios' && NativeModules.NoiseCancellationReactNative != null;

/**
 * Error boundary that wraps <StreamCall> to catch crashes from the SDK's
 * internal components (e.g. AppStateListener accessing a missing native module).
 */
interface StreamCallErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface StreamCallErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  exhausted: boolean;
}

class StreamCallErrorBoundary extends Component<StreamCallErrorBoundaryProps, StreamCallErrorBoundaryState> {
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: StreamCallErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null, exhausted: false };
  }

  static getDerivedStateFromError(error: Error): StreamCallErrorBoundaryState {
    return { hasError: true, errorMessage: error.message, exhausted: false };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[StreamCallErrorBoundary]', error);
    }

    // Allow up to 2 automatic retries before giving up.
    // Transient SDK errors (e.g., participant state glitch during reconnection)
    // often resolve themselves within a second or two.
    if (this.retryCount < 2) {
      this.retryCount += 1;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      this.retryTimer = setTimeout(() => {
        this.setState({ hasError: false, errorMessage: null, exhausted: false });
      }, 800 * this.retryCount);
    } else {
      // Retries exhausted. Keep the user on the call screen and provide
      // explicit actions (retry / end call) so they never get stuck in a call
      // without controls.
      this.setState({ exhausted: true });
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show a minimal "recovering" placeholder instead of unmounting the tree.
      // This keeps the screen mounted while we wait for the retry timer.
      return (
        <View style={{ flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ color: '#9CA3AF', marginTop: 16, fontSize: 16 }}>
            Restoring call…
          </Text>
          {this.state.exhausted ? (
            <View style={{ marginTop: 18, paddingHorizontal: 24, width: '100%', maxWidth: 420 }}>
              <Text style={{ color: '#9CA3AF', textAlign: 'center', marginBottom: 14, lineHeight: 20 }}>
                The call UI is having trouble recovering. You can try again, or end the call.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.18)',
                    minWidth: 120,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    this.retryCount = 0;
                    this.setState({ hasError: false, errorMessage: null, exhausted: false });
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 12,
                    backgroundColor: '#EF4444',
                    minWidth: 120,
                    alignItems: 'center',
                  }}
                  onPress={this.props.onError}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>End call</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}


export default function VideoCallScreen() {
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector(selectActiveCall);
  const duration = useAppSelector(selectCallDuration);
  const callError = useAppSelector(selectCallError);
  const isConnecting = useAppSelector((state) => state.call.isConnecting);
  const dateMiMissedCalls = useAppSelector((state) => state.datemi.notifications.missedCalls);
  const { client: streamVideoClient } = useAppStreamVideoClient();
  
  useScreenshotPrevention(true);
  
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isConnectingRef = useRef(isConnecting);

  useEffect(() => {
    isConnectingRef.current = isConnecting;
  }, [isConnecting]);

  // Reactive call instance: re-evaluate whenever activeCall.id changes
  // (set in startCall.fulfilled / acceptCall.fulfilled) so the component
  // always holds the latest reference from the service.
  const [callInstance, setCallInstance] = useState(() => streamVideoService.getCurrentCall());
  
  // Poll for call instance during connection phase
  useEffect(() => {
    let cancelled = false;

    const updateCallInstance = () => {
      if (cancelled) return;
      const current = streamVideoService.getCurrentCall();
      setCallInstance(current);
    };

    updateCallInstance();

    // Defensive polling:
    // On some Android devices, the call instance can become available slightly after Redux
    // flags flip (e.g. acceptCall.fulfilled sets isConnecting=false). Poll briefly anytime
    // we expect a call (partnerId present) but don't yet have an instance.
    if (!activeCall.partnerId) {
      return () => {
        cancelled = true;
      };
    }

    const startedAtMs = Date.now();
    let maxWaitMs = isConnectingRef.current ? 20000 : 12000;
    const pollInterval = setInterval(() => {
      updateCallInstance();
      const hasCall = !!streamVideoService.getCurrentCall();
      // If we ever enter a connection phase, extend the deadline (never shorten).
      maxWaitMs = Math.max(maxWaitMs, isConnectingRef.current ? 20000 : 12000);
      const exceeded = Date.now() - startedAtMs > maxWaitMs;
      if (hasCall || exceeded) {
        clearInterval(pollInterval);
        if (!hasCall && !cancelled) {
          // Avoid leaving the user stuck on "Starting call...".
          dispatch(setCallError('Call could not be connected. Please try again.'));
          streamVideoService.endCall().catch(() => {
            // ignore
          });
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [activeCall.id, activeCall.partnerId, dispatch]);

  // Handle StreamCall error boundary callback
  const handleStreamCallError = useCallback(() => {
    // If the Stream call UI crashes repeatedly, end the call explicitly.
    // This avoids leaving users in an ongoing call without controls.
    dispatch(endCall())
      .unwrap()
      .catch(() => {
        // ignore
      })
      .finally(() => {
        dispatch(setCallScreenVisible(false));
      });
  }, [dispatch]);

  // Safety: if the screen is mounted without an active call instance, close it.
  // (Prevents the UI from getting stuck if the call object is cleaned up before
  // CallingState.LEFT is observed by the screen.)
  // IMPORTANT: Don't close during connection phase - give joinCall() time to complete
  useEffect(() => {
    // If we're connecting, don't close the screen - wait for the call to establish
    if (isConnecting) {
      return;
    }
    
    // If no call instance and no active call info, close the screen
    if (!callInstance && !activeCall.partnerId) {
      dispatch(setCallScreenVisible(false));
      return;
    }

    // If we have partner info but no call instance after connection is done, something went wrong
    if (!callInstance && activeCall.partnerId && activeCall.status === 'left') {
      dispatch(setCallScreenVisible(false));
    }
  }, [activeCall.partnerId, activeCall.status, callInstance, dispatch, isConnecting]);
  
  // Format duration for display
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Pulse animation for ringing state
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Native-call behavior: back always closes the call UI.
        // If the call is still active, also end it first.
        if (activeCall.status !== 'left') {
          dispatch(endCall());
        }
        dispatch(setCallScreenVisible(false));
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [activeCall.status, dispatch])
  );

  // Auto-clear Date Mi missed call alerts when user enters the call screen.
  useFocusEffect(
    useCallback(() => {
      if (dateMiMissedCalls <= 0) return;
      dateMiNotificationManager.clearMissedCalls().catch(() => {
        // ignore
      });
    }, [dateMiMissedCalls])
  );
  
  // Clear error on mount; cleanup timers/animations on unmount
  useEffect(() => {
    dispatch(clearError());
    
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      pulseAnim.stopAnimation();

      // Safety cleanup: never leave a call session running without UI.
      const callToCleanup = streamVideoService.getCurrentCall();
      if (callToCleanup && callToCleanup.state.callingState !== CallingState.LEFT) {
        streamVideoService.endCall().catch(() => {
          // ignore
        });
      }
    };
  }, [dispatch, pulseAnim]);
  
  // Duration timer management
  useEffect(() => {
    // Start duration timer when call is joined
    const isCallActive = activeCall.status === 'joined';
    
    if (isCallActive && !durationInterval.current) {
      const durationRef = { current: duration };
      // Keep the callback reading the latest duration value.
      // (Avoid stale-closure bugs that freeze duration at 1s.)
      durationRef.current = duration;
      durationInterval.current = setInterval(() => {
        durationRef.current += 1;
        dispatch(updateCallDuration(durationRef.current));
      }, 1000);
    }
    
    // Stop timer if call is no longer active
    if (!isCallActive && durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    };
  }, [activeCall.status, duration, dispatch]);

  // Pulse animation for ringing state
  useEffect(() => {
    const isRinging = activeCall.status === 'ringing';
    
    if (isRinging) {
      startPulseAnimation();
    } else {
      pulseAnim.stopAnimation();
    }
    
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [activeCall.status, startPulseAnimation, pulseAnim]);
  
  const handleEndCall = useCallback(async () => {
    try {
      await dispatch(endCall()).unwrap();
    } catch {
      // Ignore end call errors
    } finally {
      // Navigation is handled centrally by CallNavigationCoordinator via Redux state.
      dispatch(setCallScreenVisible(false));
    }
  }, [dispatch]);
  
  // Handle call errors
  if (callError) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient
          colors={['#1F2937', '#111827', '#0F172A']}
          style={styles.errorGradient}
        >
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Call Failed</Text>
            <Text style={styles.errorMessage}>{callError}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => dispatch(setCallScreenVisible(false))}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }
  
  // StreamVideo provider should already be ready (CallNavigationCoordinator gates navigation),
  // but keep a safe loading state for edge cases (deep links, dev reload).
  if (!streamVideoClient) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Initializing...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }
  
  // No call instance - show loading or full "Calling..." UI so caller sees update on all devices
  if (!callInstance) {
    if (isConnecting || activeCall.partnerId) {
      const isRinging = activeCall.status === 'ringing';
      const statusText = isRinging ? 'Calling...' : isConnecting ? 'Connecting...' : 'Starting call...';
      // When ringing, show full outgoing-call UI (avatar + pulse) so UI matches across devices
      if (isRinging) {
        return (
          <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
              colors={activeCall.type === 'video' ? ['#EC4899', '#DB2777', '#BE185D'] : ['#8B5CF6', '#7C3AED', '#6D28D9']}
              style={styles.outgoingCallContainer}
            >
              <View style={styles.outgoingCallContent}>
                <View style={styles.callTypeBadge}>
                  <Ionicons
                    name={activeCall.type === 'video' ? 'videocam' : 'call'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.callTypeBadgeText}>
                    {activeCall.type === 'video' ? 'Video Call' : 'Voice Call'}
                  </Text>
                </View>
                <Animated.View style={[styles.outgoingAvatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.outgoingAvatarRing}>
                    {activeCall.partnerImage ? (
                      <Image source={{ uri: activeCall.partnerImage }} style={styles.outgoingAvatar} />
                    ) : (
                      <View style={styles.outgoingAvatarPlaceholder}>
                        <Ionicons name="person" size={60} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </Animated.View>
                <Text style={styles.outgoingPartnerName}>{activeCall.partnerName}</Text>
                <Text style={styles.outgoingStatusText}>{statusText}</Text>
                <View style={styles.outgoingEndCallContainer}>
                  <TouchableOpacity style={styles.outgoingEndCallButton} onPress={handleEndCall}>
                    <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                  </TouchableOpacity>
                  <Text style={styles.outgoingEndCallText}>Cancel</Text>
                </View>
              </View>
            </LinearGradient>
          </SafeAreaView>
        );
      }
      return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
            style={styles.loadingGradient}
          >
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>{statusText}</Text>
            </View>
          </LinearGradient>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient
          colors={['#1F2937', '#111827', '#0F172A']}
          style={styles.errorGradient}
        >
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="call-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.errorTitle}>No Active Call</Text>
            <Text style={styles.errorMessage}>
              {callError || 'The call has ended or could not be connected.'}
            </Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => dispatch(setCallScreenVisible(false))}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Guard: if the required native module is missing, show a friendly error
  // instead of letting AppStateListener crash inside <StreamCall>.
  if (!hasStreamNativeModule) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient
          colors={['#1F2937', '#111827', '#0F172A']}
          style={styles.errorGradient}
        >
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>{"Couldn't start a voice call"}</Text>
            <Text style={styles.errorMessage}>
              {"We couldn't start a voice call right now.\n\nWhat you can do:\n- Try again\n- If this keeps happening, restart the app"}
            </Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => dispatch(setCallScreenVisible(false))}
            >
              <Text style={styles.errorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <StreamVideo client={streamVideoClient} style={streamVideoTheme}>
      <StreamCallErrorBoundary onError={handleStreamCallError}>
        <StreamCall call={callInstance}>
          {hasNoiseCancellationNativeModule ? (
            <NoiseCancellationProvider>
              <CallScreenContent
                activeCall={activeCall}
                duration={duration}
                pulseAnim={pulseAnim}
                formatDuration={formatDuration}
                isConnecting={isConnecting}
                handleEndCall={handleEndCall}
              />
            </NoiseCancellationProvider>
          ) : (
            <CallScreenContent
              activeCall={activeCall}
              duration={duration}
              pulseAnim={pulseAnim}
              formatDuration={formatDuration}
              isConnecting={isConnecting}
              handleEndCall={handleEndCall}
            />
          )}
        </StreamCall>
      </StreamCallErrorBoundary>
    </StreamVideo>
  );
}

// Separate component to use Stream Video hooks inside StreamCall context
interface CallScreenContentProps {
  activeCall: {
    id: string | null;
    type: 'audio' | 'video' | null;
    partnerId: string | null;
    partnerName: string | null;
    partnerImage?: string;
    status: string;
    isSpeakerEnabled: boolean;
  };
  duration: number;
  pulseAnim: Animated.Value;
  formatDuration: (seconds: number) => string;
  isConnecting: boolean;
  handleEndCall: () => void;
}

function CallScreenContent({
  activeCall,
  duration,
  pulseAnim,
  formatDuration,
  isConnecting,
  handleEndCall,
}: CallScreenContentProps) {
  const dispatch = useAppDispatch();
  
  // Use Stream Video hooks to get real-time call state
  const { useCallCallingState, useRemoteParticipants, useParticipantCount } = useCallStateHooks();
  const callingState = useCallCallingState();
  const remoteParticipants = useRemoteParticipants();
  const participantCount = useParticipantCount();
  const call = useCall();
  const hasEnsuredJoinedCameraRef = useRef(false);

  const remoteConnectionQuality = remoteParticipants[0]?.connectionQuality;
  const connectionUi = React.useMemo(() => {
    const qualityValue = typeof remoteConnectionQuality === 'number' ? remoteConnectionQuality : 0;
    switch (qualityValue) {
      case 3:
        return { label: 'Excellent', color: '#10B981' };
      case 2:
        return { label: 'Good', color: '#22C55E' };
      case 1:
        return { label: 'Poor', color: '#F59E0B' };
      default:
        return { label: 'Connected', color: '#9CA3AF' };
    }
  }, [remoteConnectionQuality]);

  const participantCountText = React.useMemo(() => {
    if (typeof participantCount !== 'number' || !Number.isFinite(participantCount) || participantCount <= 0) {
      return null;
    }
    return participantCount === 1 ? '1 in call' : `${participantCount} in call`;
  }, [participantCount]);
  
  // Sync Stream CallingState with Redux
  useEffect(() => {
    if (callingState) {
      dispatch(setCallingState(callingState));
    }
  }, [callingState, dispatch]);

  // Reset the "initial camera ensure" latch whenever we get a new call instance.
  useEffect(() => {
    hasEnsuredJoinedCameraRef.current = false;
  }, [call?.cid]);

  // Ensure camera is ON when a video call is JOINED.
  // Some Android devices can miss the first enable() due to timing; retry briefly for consistency.
  useEffect(() => {
    if (activeCall.type !== 'video') return;
    if (!call) return;
    if (callingState !== CallingState.JOINED) return;
    if (hasEnsuredJoinedCameraRef.current) return;

    if (call.camera.enabled) {
      hasEnsuredJoinedCameraRef.current = true;
      return;
    }

    let cancelled = false;
    const ensureCameraOn = async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        try {
          if (call.camera.enabled) break;
          await call.camera.enable();
          break;
        } catch {
          if (attempt >= 2) break;
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        }
      }
      if (!cancelled) {
        hasEnsuredJoinedCameraRef.current = true;
      }
    };

    void ensureCameraOn();
    return () => {
      cancelled = true;
    };
  }, [activeCall.type, call, callingState]);
  
  // Determine status text based on calling state
  const getStatusText = useCallback(() => {
    switch (callingState) {
      case undefined:
        return isConnecting ? 'Connecting...' : 'Starting call...';
      case CallingState.UNKNOWN:
      case CallingState.RINGING:
        // Outgoing (caller) vs incoming (callee) ringing
        if (call?.isCreatedByMe) return 'Calling...';
        return isConnecting ? 'Connecting...' : 'Ringing...';
      case CallingState.JOINING:
        return 'Connecting...';
      case CallingState.JOINED:
        return formatDuration(duration);
      case CallingState.RECONNECTING:
        return 'Reconnecting...';
      case CallingState.LEFT:
        return 'Call ended';
      case CallingState.IDLE:
        if (call?.isCreatedByMe) {
          // When using ringing flows, callers often remain in IDLE until they join.
          // Preserve the outgoing "Calling..." UI if Redux already indicates ringing.
          return activeCall.status === 'ringing' ? 'Calling...' : 'Starting call...';
        }
        return isConnecting ? 'Connecting...' : 'Initializing...';
      case CallingState.MIGRATING:
        return 'Switching servers...';
      case CallingState.OFFLINE:
        return 'Waiting for network...';
      case CallingState.RECONNECTING_FAILED:
        return 'Connection lost';
      default:
        return 'Connecting...';
    }
  }, [callingState, duration, formatDuration, call, isConnecting, activeCall.status]);
  
  const resolvedState = callingState ?? CallingState.UNKNOWN;
  const isRecoveryState =
    resolvedState === CallingState.RECONNECTING ||
    resolvedState === CallingState.MIGRATING ||
    resolvedState === CallingState.OFFLINE ||
    resolvedState === CallingState.RECONNECTING_FAILED;
  const isLeft = resolvedState === CallingState.LEFT;
  const isJoined = resolvedState === CallingState.JOINED;

  const hangupLabel = isLeft ? 'Close' : isRecoveryState ? 'End call' : 'Cancel';
  const hangupIconRotation = isLeft ? '0deg' : '135deg';

  const renderCenteredState = (options: {
    iconName: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBackgroundColor: string;
    title: string;
    message: string;
    showSpinner?: boolean;
  }) => {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1F2937', '#111827', '#0F172A']} style={styles.errorGradient}>
          <View style={styles.errorContainer}>
            <View style={[styles.errorIconContainer, { backgroundColor: options.iconBackgroundColor }]}>
              <Ionicons name={options.iconName} size={48} color={options.iconColor} />
            </View>
            <Text style={styles.errorTitle}>{options.title}</Text>
            <Text style={styles.errorMessage}>{options.message}</Text>
            {options.showSpinner ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginBottom: 24 }} />
            ) : null}
            <View style={styles.outgoingEndCallContainer}>
              <TouchableOpacity style={styles.outgoingEndCallButton} onPress={handleEndCall}>
                <Ionicons
                  name="call"
                  size={28}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: hangupIconRotation }] }}
                />
              </TouchableOpacity>
              <Text style={styles.outgoingEndCallText}>{hangupLabel}</Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  };

  if (resolvedState === CallingState.RECONNECTING || resolvedState === CallingState.MIGRATING) {
    return renderCenteredState({
      iconName: 'wifi',
      iconColor: '#F59E0B',
      iconBackgroundColor: 'rgba(245, 158, 11, 0.18)',
      title: 'Restoring connection',
      message: 'Trying to reconnect. Please wait a moment…',
      showSpinner: true,
    });
  }

  if (resolvedState === CallingState.OFFLINE) {
    return renderCenteredState({
      iconName: 'cloud-offline',
      iconColor: '#F59E0B',
      iconBackgroundColor: 'rgba(245, 158, 11, 0.18)',
      title: 'No internet connection',
      message: 'You are offline. Reconnect to continue the call.',
      showSpinner: true,
    });
  }

  if (resolvedState === CallingState.RECONNECTING_FAILED) {
    return renderCenteredState({
      iconName: 'alert-circle',
      iconColor: '#EF4444',
      iconBackgroundColor: 'rgba(239, 68, 68, 0.2)',
      title: 'Connection lost',
      message: "We couldn't reconnect. Please check your network and try calling again.",
      showSpinner: false,
    });
  }

  if (resolvedState === CallingState.LEFT) {
    return renderCenteredState({
      iconName: 'call-outline',
      iconColor: '#9CA3AF',
      iconBackgroundColor: 'rgba(156, 163, 175, 0.18)',
      title: 'Call ended',
      message: 'The call has ended.',
      showSpinner: false,
    });
  }

  // Pre-join UI (UNKNOWN/IDLE/RINGING/JOINING)
  if (!isJoined) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={activeCall.type === 'video' ? ['#EC4899', '#DB2777', '#BE185D'] : ['#8B5CF6', '#7C3AED', '#6D28D9']}
          style={styles.outgoingCallContainer}
        >
          <View style={styles.outgoingCallContent}>
            {/* Call Type Label */}
            <View style={styles.callTypeBadge}>
              <Ionicons 
                name={activeCall.type === 'video' ? 'videocam' : 'call'} 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={styles.callTypeBadgeText}>
                {activeCall.type === 'video' ? 'Video Call' : 'Voice Call'}
              </Text>
            </View>
            
            {/* Animated Avatar */}
            <Animated.View 
              style={[
                styles.outgoingAvatarContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <View style={styles.outgoingAvatarRing}>
                {activeCall.partnerImage ? (
                  <Image
                    source={{ uri: activeCall.partnerImage }}
                    style={styles.outgoingAvatar}
                  />
                ) : (
                  <View style={styles.outgoingAvatarPlaceholder}>
                    <Ionicons name="person" size={60} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </Animated.View>
            
            {/* Partner Name */}
            <Text style={styles.outgoingPartnerName}>{activeCall.partnerName}</Text>
            <Text style={styles.outgoingStatusText}>{getStatusText()}</Text>
            
            {/* End Call Button */}
            <View style={styles.outgoingEndCallContainer}>
              <TouchableOpacity
                style={styles.outgoingEndCallButton}
                onPress={handleEndCall}
              >
                <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.outgoingEndCallText}>{hangupLabel}</Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }
  
  // Active AUDIO call UI (JOINED) - dedicated voice call screen
  // Voice calls get a custom UI with avatar + controls instead of Stream's video grid.
  if (activeCall.type === 'audio') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
          style={styles.audioCallContainer}
        >
          <View style={styles.audioCallContent}>
            {/* Partner Avatar */}
            <View style={styles.avatarContainer}>
              {activeCall.partnerImage ? (
                <Image
                  source={{ uri: activeCall.partnerImage }}
                  style={styles.partnerAvatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={60} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
              </View>
            </View>

            {/* Partner Name & Duration */}
            <Text style={styles.audioPartnerName}>{activeCall.partnerName}</Text>
            <Text style={styles.audioCallDuration}>{getStatusText()}</Text>

            {/* Connection Quality Indicator */}
            <View style={styles.qualityIndicator}>
              <Ionicons name="wifi" size={14} color={connectionUi.color} />
              <Text style={styles.qualityText}>
                {connectionUi.label}
                {participantCountText ? ` • ${participantCountText}` : ''}
              </Text>
            </View>
          </View>

          {/* Audio Controls */}
          <View style={styles.audioControlsContainer}>
            <DateMiCallControls onHangupCallHandler={handleEndCall} />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Active VIDEO call UI (JOINED)
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <CallContent
        onHangupCallHandler={handleEndCall}
        CallControls={DateMiCallControls}
        ParticipantVideoFallback={DateMiParticipantVideoFallback}
        layout="grid"
      />
    </SafeAreaView>
  );
}

function DateMiParticipantVideoFallback({ participant }: ParticipantVideoFallbackProps) {
  const name = participant?.name || 'User';
  const image = participant?.image;
  const isSpeaking = participant?.isSpeaking === true;

  return (
    <View style={styles.videoFallbackContainer}>
      <View style={styles.videoFallbackAvatarWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.videoFallbackAvatar} />
        ) : (
          <View style={styles.videoFallbackAvatarPlaceholder}>
            <Ionicons name="person" size={44} color="#FFFFFF" />
          </View>
        )}
        <View style={[styles.videoFallbackSpeakingDot, isSpeaking && styles.videoFallbackSpeakingDotActive]} />
      </View>
      <Text style={styles.videoFallbackName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.videoFallbackSubtext}>Camera off</Text>
    </View>
  );
}

function NoiseCancellationControlButton() {
  const { isSupported, deviceSupportsAdvancedAudioProcessing, isEnabled, setEnabled } = useNoiseCancellation();

  // Only show on devices that can handle advanced audio processing well.
  if (deviceSupportsAdvancedAudioProcessing !== true) return null;

  // Hide when the call settings/dashboard disable noise cancellation for this call.
  if (isSupported === false) return null;

  // While support check is running (`undefined`), show disabled control to avoid flicker.
  const disabled = isSupported !== true;

  return (
    <TouchableOpacity
      style={[
        styles.controlButton,
        isEnabled && styles.controlButtonActive,
        disabled && styles.controlButtonUnavailable,
      ]}
      onPress={() => setEnabled((prev) => !prev)}
      disabled={disabled}
    >
      <Ionicons name="sparkles" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

function DateMiCallControls({ onHangupCallHandler }: CallControlProps) {
  const dispatch = useAppDispatch();
  const call = useCall();
  const callType = useAppSelector((state) => state.call.activeCall.type);
  const isSpeakerEnabled = useAppSelector((state) => state.call.activeCall.isSpeakerEnabled);

  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const { optimisticIsMute: optimisticVideoMuted, isMute: actualVideoMuted } = useCameraState();
  const {
    optimisticIsMute: optimisticAudioMuted,
    isMute: actualAudioMuted,
    isSpeakingWhileMuted,
  } = useMicrophoneState();

  const isVideoMuted = (optimisticVideoMuted ?? actualVideoMuted) ?? false;
  const isAudioMuted = (optimisticAudioMuted ?? actualAudioMuted) ?? false;

  const isVideoCall = callType === 'video';

  const handleToggleCamera = useCallback(async () => {
    if (!isVideoCall) return;
    try {
      await call?.camera.toggle();
    } catch {
      // ignore
    }
  }, [call, isVideoCall]);

  const handleToggleMicrophone = useCallback(async () => {
    try {
      await call?.microphone.toggle();
    } catch {
      // ignore
    }
  }, [call]);

  const handleFlipCamera = useCallback(async () => {
    if (!isVideoCall) return;
    try {
      await call?.camera.flip();
    } catch {
      // ignore
    }
  }, [call, isVideoCall]);

  const handleToggleSpeaker = useCallback(() => {
    dispatch(toggleSpeaker());
    try {
      const nextEnabled = !isSpeakerEnabled;
      callManager.speaker.setForceSpeakerphoneOn(nextEnabled);
    } catch {
      // ignore
    }
  }, [dispatch, isSpeakerEnabled]);

  return (
    <BlurView intensity={80} tint="dark" style={styles.controlsBlur}>
      {isAudioMuted && isSpeakingWhileMuted ? (
        <View style={styles.speakingWhileMutedBanner}>
          <Ionicons name="mic-off" size={14} color="#F59E0B" />
          <Text style={styles.speakingWhileMutedText}>You're muted</Text>
        </View>
      ) : null}
      <View style={styles.controls}>
        {/* Camera Toggle (Video calls only) */}
        {isVideoCall && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              isVideoMuted && styles.controlButtonDisabled,
            ]}
            onPress={handleToggleCamera}
          >
            <Ionicons
              name={isVideoMuted ? 'videocam-off' : 'videocam'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}

        {/* Microphone Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            isAudioMuted && styles.controlButtonDisabled,
          ]}
          onPress={handleToggleMicrophone}
        >
          <Ionicons
            name={isAudioMuted ? 'mic-off' : 'mic'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Noise Cancellation (supported devices only) */}
        {hasNoiseCancellationNativeModule ? <NoiseCancellationControlButton /> : null}

        {/* Speaker Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            isSpeakerEnabled && styles.controlButtonActive,
          ]}
          onPress={handleToggleSpeaker}
        >
          <Ionicons
            name={isSpeakerEnabled ? 'volume-high' : 'volume-medium'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Switch Camera (Video calls only) */}
        {isVideoCall && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleFlipCamera}
          >
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* End Call */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={() => {
            onHangupCallHandler?.();
          }}
        >
          <Ionicons name="call" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '500',
  },
  // Error state styles
  errorGradient: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Outgoing call styles
  outgoingCallContainer: {
    flex: 1,
  },
  outgoingCallContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 48,
    gap: 8,
  },
  callTypeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outgoingAvatarContainer: {
    marginBottom: 32,
  },
  outgoingAvatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  outgoingAvatar: {
    width: 152,
    height: 152,
    borderRadius: 76,
  },
  outgoingAvatarPlaceholder: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outgoingPartnerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  outgoingStatusText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 80,
  },
  outgoingEndCallContainer: {
    alignItems: 'center',
  },
  outgoingEndCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  outgoingEndCallText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  callInfo: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  partnerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  callDuration: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  controlsBlur: {
    marginHorizontal: 20,
    borderRadius: 30,
    overflow: 'hidden',
  },
  speakingWhileMutedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  speakingWhileMutedText: {
    fontSize: 12,
    color: '#FCD34D',
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  controlButtonUnavailable: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    opacity: 0.6,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  // Audio call specific styles
  audioCallContainer: {
    flex: 1,
  },
  audioCallContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  partnerAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseAnimation: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    opacity: 0.3,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  audioPartnerName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  audioCallDuration: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    marginBottom: 48,
  },
  qualityText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  audioControlsContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  videoControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  videoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 11,
  },
  videoFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1220',
    paddingHorizontal: 16,
  },
  videoFallbackAvatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  videoFallbackAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  videoFallbackAvatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  videoFallbackSpeakingDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(156, 163, 175, 0.9)',
    borderWidth: 2,
    borderColor: '#0B1220',
  },
  videoFallbackSpeakingDotActive: {
    backgroundColor: '#10B981',
  },
  videoFallbackName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  videoFallbackSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
