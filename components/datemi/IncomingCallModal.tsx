/**
 * IncomingCallModal - Modal overlay for incoming video/audio calls
 * 
 * Shows when user receives a call in the Date Mi module.
 * Only Premium tier users can accept calls.
 * 
 * Uses Stream Video SDK's proper call.join() and call.leave({ reject: true })
 * methods for accepting and rejecting calls.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Vibration,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { streamVideoService } from '../../services/streamVideoService';
import {
  selectIncomingCall,
  acceptCall,
  rejectCall,
  clearIncomingCall,
} from '../../redux/slices/callSlice';
import { getUserFacingError } from '../../utils/userFacingError';
import DateMiNotificationService from '../../services/dateMiNotificationService';
import { LinkingService } from '../../services/linkingService';
import { stopRingtone } from '../../utils/ringtoneController';
import { PremiumPaywall } from './PremiumPaywall';

export default function IncomingCallModal() {
  const dispatch = useAppDispatch();
  const incomingCall = useAppSelector(selectIncomingCall);
  const isConnecting = useAppSelector((state) => state.call.isConnecting);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const callNotificationId = useAppSelector((state) => state.call.incomingCall.notificationId);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showPaywall, setShowPaywall] = React.useState(false);
  const [paywallFeature, setPaywallFeature] = React.useState<'voice_call' | 'video_call'>('voice_call');
  
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Handle vibration and animation when call comes in
  // Note: Ringtone is managed by RingingCallsHandler using InCallManager
  useEffect(() => {
    if (incomingCall.isRinging) {
      // Start vibration pattern (Android only)
      if (Platform.OS === 'android') {
        const pattern = [0, 500, 200, 500];
        Vibration.vibrate(pattern, true);
      }
      
      // Start pulse animation
      startPulseAnimation();
    } else {
      // Stop vibration
      Vibration.cancel();
      
      // Stop animation
      pulseAnim.stopAnimation();
      
      // Stop system ringtone managed by InCallManager
      try {
        stopRingtone();
      } catch {
        // ignore
      }
    }
    
    return () => {
      Vibration.cancel();
      
      // Cleanup: ensure system ringtone is stopped
      try {
        stopRingtone();
      } catch {
        // ignore
      }
    };
  }, [incomingCall.isRinging, startPulseAnimation, pulseAnim]);
  
  const handleAccept = useCallback(async () => {
    if (!incomingCall.callId) {
      return;
    }

    // CRITICAL: Stop vibration and ringtone IMMEDIATELY and SYNCHRONOUSLY
    // before any async operations to ensure user feedback is instant
    Vibration.cancel();
    
    try {
      stopRingtone();
    } catch {
      // ignore
    }

    // Auto-dismiss call notification from the tray (async is ok here)
    DateMiNotificationService.dismissCallNotification(callNotificationId).catch(() => {
      // ignore
    });

    try {
      if (!currentUserId) {
        throw new Error('Not signed in');
      }

      const callType = incomingCall.type === 'video' ? 'video' : 'audio';
      const canAccept = await streamVideoService.checkCallEntitlement(currentUserId, callType);
      if (!canAccept) {
        const entryFeature = incomingCall.type === 'video' ? 'video_call' : 'voice_call';
        await dispatch(rejectCall(incomingCall.callId));
        
        // Show modern paywall UI instead of basic alert
        setPaywallFeature(entryFeature);
        setShowPaywall(true);
        return;
      }

      // Accept the call through Redux thunk which uses streamVideoService.joinCall
      await dispatch(acceptCall(incomingCall.callId)).unwrap();
      // Navigation is handled centrally by CallNavigationCoordinator
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'accept the call',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      dispatch(clearIncomingCall());
    }
  }, [incomingCall, dispatch, callNotificationId, currentUserId]);
  
  const handleReject = useCallback(async () => {
    // CRITICAL: Stop vibration and ringtone IMMEDIATELY and SYNCHRONOUSLY
    Vibration.cancel();
    
    try {
      stopRingtone();
    } catch {
      // ignore
    }

    // Auto-dismiss call notification from the tray (async is ok here)
    DateMiNotificationService.dismissCallNotification(callNotificationId).catch(() => {
      // ignore
    });
    
    if (incomingCall.callId) {
      // Reject the call through Redux thunk which uses streamVideoService.rejectIncomingCall
      await dispatch(rejectCall(incomingCall.callId));
    } else {
      // Just clear the incoming call state
      dispatch(clearIncomingCall());
    }
  }, [incomingCall.callId, dispatch, callNotificationId]);
  
  if (!incomingCall.isRinging && !showPaywall) {
    return null;
  }
  
  // Show paywall if entitlement check failed
  if (showPaywall) {
    const featureLabel = paywallFeature === 'video_call' ? 'Video Calls' : 'Voice Calls';
    const featureEmoji = paywallFeature === 'video_call' ? '🎥' : '📞';
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPaywall}
        statusBarTranslucent
        onRequestClose={() => {
          setShowPaywall(false);
          dispatch(clearIncomingCall());
        }}
      >
        <View style={styles.container}>
          <PremiumPaywall
            variant="overlay"
            title={`${featureEmoji} Unlock ${featureLabel}`}
            message={`Unlock ${featureLabel} for $1/month or upgrade to Premium for everything.`}
            feature={paywallFeature}
            requiredTier="premium"
            onUpgrade={() => {
              setShowPaywall(false);
              dispatch(clearIncomingCall());
              // Use setTimeout to ensure modal is dismissed before navigation
              setTimeout(() => {
                LinkingService.navigate('SubscriptionPlans', { entryFeature: paywallFeature });
              }, 100);
            }}
            onClose={() => {
              setShowPaywall(false);
              dispatch(clearIncomingCall());
            }}
            showClose={true}
          />
        </View>
      </Modal>
    );
  }
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={incomingCall.isRinging}
      statusBarTranslucent
      onRequestClose={handleReject}
    >
      <BlurView intensity={95} tint="dark" style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.3)', 'rgba(124, 58, 237, 0.3)']}
          style={styles.callCard}
        >
          {/* Call Type Label */}
          <View style={styles.callTypeContainer}>
            <Ionicons 
              name={incomingCall.type === 'video' ? 'videocam' : 'call'} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.callTypeText}>
              Incoming {incomingCall.type === 'video' ? 'Video' : 'Audio'} Call
            </Text>
          </View>
          
          {/* Caller Avatar */}
          <Animated.View 
            style={[
              styles.avatarContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            {incomingCall.callerImage ? (
              <Image
                source={{ uri: incomingCall.callerImage }}
                style={styles.callerAvatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
              </View>
            )}
          </Animated.View>
          
          {/* Caller Name */}
          <Text style={styles.callerName}>{incomingCall.callerName || 'Unknown'}</Text>
          <Text style={styles.callingText}>
            {isConnecting ? 'Connecting...' : 'is calling you...'}
          </Text>
          
          {/* Action Buttons - Accept or Decline only (1 screen = 1 action) */}
          <View style={styles.actionsContainer}>
            {/* Reject Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              activeOpacity={0.8}
              disabled={isConnecting}
            >
              <View style={[styles.buttonInner, styles.rejectButtonInner]}>
                <Ionicons name="close" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
            
            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              activeOpacity={0.8}
              disabled={isConnecting}
            >
              <View style={[styles.buttonInner, styles.acceptButtonInner]}>
                {isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons 
                    name={incomingCall.type === 'video' ? 'videocam' : 'call'} 
                    size={32} 
                    color="#FFFFFF" 
                  />
                )}
              </View>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  callCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
  },
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
    marginBottom: 24,
  },
  callTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  avatarContainer: {
    marginBottom: 24,
  },
  callerAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  callerName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  callingText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 40,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  buttonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rejectButton: {
    marginRight: 40,
  },
  acceptButton: {
    marginLeft: 40,
  },
  buttonText: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  rejectButtonInner: {
    backgroundColor: '#EF4444',
  },
  acceptButtonInner: {
    backgroundColor: '#10B981',
  },
});
