/**
 * CallScreen - Video/Audio calling screen for testing
 * 
 * This is a standalone test screen that follows the GetStream tutorial.
 * It uses the app's existing streamVideoService for integration.
 * 
 * Based on: https://getstream.io/video/sdk/react-native/tutorial/video-calling/
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Call,
  StreamCall,
  CallContent,
  useStreamVideoClient,
  useCallStateHooks,
  CallingState,
  HangUpCallButton,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  useCall,
  CallControlProps,
} from '@stream-io/video-react-native-sdk';

type Props = { 
  goToHomeScreen: () => void; 
  callId: string;
  callType?: 'audio' | 'video';
};

/**
 * Custom call controls component following GetStream tutorial pattern
 */
const CustomCallControls = ({ onHangupCallHandler }: CallControlProps) => {
  const call = useCall();
  
  return (
    <View style={styles.customCallControlsContainer}>
      <ToggleAudioPublishingButton onPressHandler={call?.microphone.toggle} />
      <ToggleVideoPublishingButton onPressHandler={call?.camera.toggle} />
      <HangUpCallButton onHangupCallHandler={onHangupCallHandler} />
    </View>
  );
};

/**
 * Custom top bar showing participants and dominant speaker
 */
const CustomTopView = () => {
  const { useParticipants, useDominantSpeaker } = useCallStateHooks();
  const participants = useParticipants();
  const dominantSpeaker = useDominantSpeaker();
  
  return (
    <View style={styles.topContainer}>
      <Text
        ellipsizeMode="tail"
        numberOfLines={1}
        style={styles.topText}
      >
        {participants.length > 0 
          ? `Call with ${participants.map(p => p.name || 'User').join(', ')}`
          : 'Connecting...'}
      </Text>
      {dominantSpeaker?.name && (
        <Text style={styles.topTextSmall}>
          Speaking: {dominantSpeaker.name}
        </Text>
      )}
    </View>
  );
};

/**
 * Participant count display component
 */
const ParticipantCountText = () => {
  const { useParticipantCount } = useCallStateHooks();
  const participantCount = useParticipantCount();
  
  return (
    <View style={styles.participantBadge}>
      <Ionicons name="people" size={16} color="#FFFFFF" />
      <Text style={styles.participantText}>{participantCount} participant{participantCount !== 1 ? 's' : ''}</Text>
    </View>
  );
};

/**
 * Call state display component
 */
const CallStateIndicator = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  
  const getStateText = () => {
    switch (callingState) {
      case CallingState.RINGING:
        return 'Ringing...';
      case CallingState.JOINING:
        return 'Connecting...';
      case CallingState.JOINED:
        return 'Connected';
      case CallingState.RECONNECTING:
        return 'Reconnecting...';
      case CallingState.LEFT:
        return 'Call ended';
      default:
        return 'Initializing...';
    }
  };
  
  const getStateColor = () => {
    switch (callingState) {
      case CallingState.JOINED:
        return '#10B981';
      case CallingState.RINGING:
      case CallingState.JOINING:
        return '#F59E0B';
      case CallingState.RECONNECTING:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };
  
  return (
    <View style={[styles.stateIndicator, { backgroundColor: getStateColor() }]}>
      {callingState === CallingState.JOINING && (
        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
      )}
      <Text style={styles.stateText}>{getStateText()}</Text>
    </View>
  );
};

export const CallScreen = ({ goToHomeScreen, callId, callType = 'video' }: Props) => {
  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const client = useStreamVideoClient();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const callRef = useRef<Call | null>(null); // Ref for cleanup

  // Start pulse animation for loading/ringing state
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (isLoading) {
      animation.start();
    }
    
    return () => {
      animation.stop();
      pulseAnim.setValue(1);
    };
  }, [isLoading, pulseAnim]);

  // Update ref when call changes (for cleanup)
  useEffect(() => {
    callRef.current = call;
  }, [call]);

  // Create and join call following GetStream tutorial pattern
  useEffect(() => {
    if (!client) {
      setError('Video client not initialized. Please ensure you are logged in.');
      setIsLoading(false);
      return;
    }

    const initializeCall = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create call instance using 'default' call type (as per tutorial)
        const newCall = client.call('default', callId);
        
        // Join the call with create: true (creates if doesn't exist)
        await newCall.join({ create: true });
        
        setCall(newCall);
        callRef.current = newCall; // Update ref immediately
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to join call';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeCall();

    // Cleanup: leave call on unmount using ref
    return () => {
      const currentCall = callRef.current;
      if (currentCall?.state.callingState !== CallingState.LEFT) {
        currentCall?.leave().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [client, callId]);

  // Handle hangup
  const handleHangup = useCallback(async () => {
    try {
      if (call) {
        await call.leave();
      }
    } catch {
      // Ignore leave errors
    } finally {
      goToHomeScreen();
    }
  }, [call, goToHomeScreen]);

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Call Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={goToHomeScreen}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (isLoading || !call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingIcon, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons 
              name={callType === 'video' ? 'videocam' : 'call'} 
              size={48} 
              color="#FFFFFF" 
            />
          </Animated.View>
          <Text style={styles.loadingTitle}>
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
          <Text style={styles.loadingText}>Joining call...</Text>
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
          
          <TouchableOpacity style={styles.cancelButton} onPress={goToHomeScreen}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Active call UI using StreamCall context
  return (
    <StreamCall call={call}>
      <SafeAreaView style={styles.callContainer}>
        {/* Top bar with call info */}
        <View style={styles.callHeader}>
          <CustomTopView />
          <View style={styles.headerRight}>
            <CallStateIndicator />
            <ParticipantCountText />
          </View>
        </View>
        
        {/* Main call content */}
        <View style={styles.callContent}>
          <CallContent
            onHangupCallHandler={handleHangup}
            CallControls={CustomCallControls}
            layout="grid"
          />
        </View>
      </SafeAreaView>
    </StreamCall>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  callContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 24,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Error styles
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
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Call header styles
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  // Call content
  callContent: {
    flex: 1,
  },
  // Top view styles
  topContainer: {
    maxWidth: '60%',
  },
  topText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topTextSmall: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  // Participant badge
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  participantText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // State indicator
  stateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stateText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Custom call controls
  customCallControlsContainer: {
    position: 'absolute',
    bottom: 40,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '85%',
    marginHorizontal: '7.5%',
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 5,
  },
});