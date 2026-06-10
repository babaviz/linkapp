import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { showDialog } from '../../utils/dialogService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NumericKeypad from './NumericKeypad';
import { savePasscode, validatePasscode } from '../../utils/passcodeManager';

interface PasscodeSetupProps {
  onSetupComplete: () => void;
  onSkip?: () => void;
  userId?: string | null;
}

export default function PasscodeSetup({ onSetupComplete, onSkip, userId }: PasscodeSetupProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Animation values
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Clear error when typing
    if (error && passcode.length > 0) {
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passcode]);

  const handleNumberPress = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isConfirming) {
      if (confirmPasscode.length < 8) {
        setConfirmPasscode(confirmPasscode + value);
      }
    } else {
      if (passcode.length < 8) {
        setPasscode(passcode + value);
      }
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isConfirming) {
      if (confirmPasscode.length > 0) {
        setConfirmPasscode(confirmPasscode.slice(0, -1));
      }
    } else {
      if (passcode.length > 0) {
        setPasscode(passcode.slice(0, -1));
      }
    }
    setError('');
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isConfirming) {
      setConfirmPasscode('');
    } else {
      setPasscode('');
    }
    setError('');
  };

  const shakeError = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = () => {
    const validation = validatePasscode(passcode);
    if (!validation.isValid) {
      setError(validation.errors[0] || 'Invalid passcode');
      shakeError();
      return;
    }

    // Proceed to confirmation step
    setIsConfirming(true);
    setError('');
    
    // Animate transition
    Animated.timing(fadeAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleConfirm = async () => {
    if (confirmPasscode !== passcode) {
      setError('Passcodes do not match');
      shakeError();
      return;
    }

    setIsProcessing(true);
    setError('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const saved = await savePasscode(passcode, userId);
      
      if (saved) {
        await showDialog({
          title: 'Passcode Set Successfully!',
          message: 'Your passcode has been set successfully. Your Date Mi profile is now protected.',
          type: 'success',
          icon: { name: 'check-circle', color: '#10B981', size: 48 },
          dismissOnBackdrop: false,
          buttons: [
            {
              text: 'Continue',
              style: 'default',
              onPress: onSetupComplete,
            },
          ]
        });
      } else {
        throw new Error('Failed to save passcode');
      }
    } catch {
      setError('Failed to save passcode. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setIsConfirming(false);
    setConfirmPasscode('');
    setError('');
  };

  const renderPasscodeDots = (code: string, maxLength: number = 8) => {
    const dots = [];
    for (let i = 0; i < maxLength; i++) {
      const isFilled = i < code.length;
      
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            isFilled ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      );
    }
    return dots;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 4 }]}>
          {isConfirming && (
            <TouchableOpacity
              style={[styles.backButton, { top: Math.max(insets.top, 20) + 20 }]}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {isConfirming ? 'Confirm Passcode' : 'Set Passcode'}
            </Text>
            {!isConfirming && (
              <Text style={styles.headerSubtitle}>
                Secure your Date Mi profile with a 4–8 digit passcode.
              </Text>
            )}
          </View>
        </View>

        {/* Upper Section */}
        <View style={styles.upperSection}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              <Text style={styles.icon}>🔐</Text>
            </View>
          </View>

          {/* Instructions */}
          {isConfirming && (
            <Animated.View style={[{ opacity: fadeAnimation }]}>
              <Text style={styles.title}>
                Re-enter your passcode
              </Text>
              <Text style={styles.subtitle}>
                Please confirm your passcode to continue
              </Text>
            </Animated.View>
          )}

          {/* Passcode Display */}
          <Animated.View 
            style={[
              styles.passcodeContainer,
              {
                transform: [{ translateX: shakeAnimation }],
              },
            ]}
          >
            <View style={styles.dotsContainer}>
              {renderPasscodeDots(isConfirming ? confirmPasscode : passcode)}
            </View>
            {passcode.length > 0 && !isConfirming && (
              <Text style={styles.lengthIndicator}>
                {passcode.length} digits
              </Text>
            )}
          </Animated.View>

          {/* Error Message */}
          {error ? (
            <Animated.View 
              style={[
                styles.errorContainer,
                { transform: [{ translateX: shakeAnimation }] }
              ]}
            >
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : (
            <View style={styles.errorContainer} />
          )}
        </View>

        {/* Middle Section - Numeric Keypad */}
        <View style={styles.keypadSection}>
          <NumericKeypad
            onPress={handleNumberPress}
            onDelete={handleDelete}
            onClear={handleClear}
            disabled={isProcessing}
            theme="dark"
            showClearButton={
              (isConfirming && confirmPasscode.length > 0) || 
              (!isConfirming && passcode.length > 0)
            }
          />
        </View>

        {/* Bottom Section - Action Buttons */}
        <View style={[styles.actionContainer, { 
          paddingBottom: Math.max(insets.bottom, 20) + 16
        }]}>
          {isConfirming ? (
            <View style={styles.buttonWrapper}>
              <View style={[
                styles.buttonGlow,
                confirmPasscode.length < 4 && styles.buttonGlowDisabled
              ]} />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  confirmPasscode.length < 4 && styles.primaryButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={confirmPasscode.length < 4 || isProcessing}
                activeOpacity={0.9}
              >
                <LinearGradient
                colors={
                  confirmPasscode.length >= 4
                    ? ['#8B5FFF', '#7B4FEF']
                    : ['#666666', '#555555']
                }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.primaryButtonText}>
                    {isProcessing ? 'Setting up...' : 'Confirm & Continue'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonWrapper}>
              <View style={[
                styles.buttonGlow,
                passcode.length < 4 && styles.buttonGlowDisabled
              ]} />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  passcode.length < 4 && styles.primaryButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={passcode.length < 4}
                activeOpacity={0.9}
              >
                <LinearGradient
                colors={
                  passcode.length >= 4
                    ? ['#8B5FFF', '#7B4FEF']
                    : ['#666666', '#555555']
                }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {!isConfirming && onSkip && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 8,
    minHeight: 50,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'absolute',
    left: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  upperSection: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  passcodeContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 10,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotFilled: {
    backgroundColor: '#8B5FFF',
    borderColor: '#8B5FFF',
  },
  lengthIndicator: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
  },
  errorContainer: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  keypadSection: {
    justifyContent: 'center',
    paddingVertical: 20,
  },
  actionContainer: {
    paddingTop: 16,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  buttonWrapper: {
    position: 'relative',
    marginBottom: 12,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5FFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 95, 255, 0.25)',
    shadowColor: '#8B5FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    zIndex: -1,
  },
  buttonGlowDisabled: {
    opacity: 0,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    position: 'relative',
    zIndex: 1,
    textTransform: 'uppercase' as const,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
});
