import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NumericKeypad from './NumericKeypad';
import { verifyPasscode, getRemainingAttempts } from '../../utils/passcodeManager';

interface PasscodeEntryProps {
  onSuccess: () => void;
  onForgotPasscode?: () => void;
  userId?: string | null;
}

export default function PasscodeEntry({ onSuccess, onForgotPasscode, userId }: PasscodeEntryProps) {
  const [passcode, setPasscode] = useState('');
  const [attempts, setAttempts] = useState(5);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const insets = useSafeAreaInsets();
  
  // Animation values - use useRef to persist across renders
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const checkAttempts = useCallback(async () => {
    const remaining = await getRemainingAttempts(userId);
    setAttempts(remaining);
  }, [userId]);

  useEffect(() => {
    // Check initial attempts remaining
    checkAttempts();
  }, [checkAttempts]);

  useEffect(() => {
    // Handle lockout timer
    if (isLockedOut && lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1000) {
            setIsLockedOut(false);
            checkAttempts();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLockedOut, lockoutTime, checkAttempts]);

  const shakeError = useCallback(() => {
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
  }, [shakeAnimation]);


  const handleVerify = useCallback(async () => {
    if (passcode.length < 4) {
      setError('Passcode must be at least 4 digits');
      shakeError();
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyPasscode(passcode, userId);

      if (result.isCorrect) {
        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Success animation
        Animated.timing(scaleAnimation, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onSuccess();
        });
      } else {
        setPasscode('');
        setAttempts(result.attemptsRemaining);
        
        if (result.isLockedOut) {
          setIsLockedOut(true);
          setLockoutTime(result.lockoutTimeRemaining || 0);
          setError('Too many attempts. Please try again later.');
        } else {
          setError(
            result.attemptsRemaining > 0
              ? `Incorrect passcode. ${result.attemptsRemaining} attempt${
                  result.attemptsRemaining === 1 ? '' : 's'
                } remaining`
              : 'Incorrect passcode'
          );
        }
        
        shakeError();
      }
    } catch {
      setError(
        onForgotPasscode
          ? 'We couldn’t verify your passcode. Please try again, or tap “Forgot Passcode?”.'
          : 'We couldn’t verify your passcode. Please try again.'
      );
      shakeError();
    } finally {
      setIsVerifying(false);
    }
  }, [passcode, shakeError, onSuccess, scaleAnimation]);

  useEffect(() => {
    if (passcode.length === 8) {
      const timer = setTimeout(() => {
        handleVerify();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [passcode, handleVerify]);

  const handleNumberPress = (value: string) => {
    if (!isLockedOut && passcode.length < 8) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPasscode(passcode + value);
      setError('');
    }
  };

  const handleDelete = () => {
    if (!isLockedOut) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (passcode.length > 0) {
        setPasscode(passcode.slice(0, -1));
      }
      setError('');
    }
  };

  const handleClear = () => {
    if (!isLockedOut) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPasscode('');
      setError('');
    }
  };

  const formatLockoutTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderPasscodeDots = () => {
    const dots = [];
    for (let i = 0; i < 8; i++) {
      const isFilled = i < passcode.length;
      
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Enter Passcode</Text>
        </View>

        {/* Upper Section */}
        <View style={styles.upperSection}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              {isLockedOut ? (
                <Ionicons name="time-outline" size={40} color="#FF6B6B" />
              ) : (
                <Text style={styles.icon}>🔒</Text>
              )}
            </View>
          </View>

          {/* Instructions */}
          <Text style={styles.title}>
            {isLockedOut ? 'Account Locked' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isLockedOut
              ? `Too many failed attempts. Try again in ${formatLockoutTime(lockoutTime)}`
              : 'Enter your passcode to access Date Mi'}
          </Text>

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
              {renderPasscodeDots()}
            </View>
          </Animated.View>

          {/* Error/Status Message */}
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
            <View style={styles.errorContainer}>
              {!isLockedOut && attempts < 5 && attempts > 0 && (
                <Text style={styles.warningText}>
                  {attempts} attempt{attempts === 1 ? '' : 's'} remaining
                </Text>
              )}
            </View>
          )}

          {/* Security Info */}
          {!isLockedOut && attempts <= 2 && attempts > 0 && (
            <View style={styles.securityInfo}>
              <Ionicons name="information-circle" size={16} color="#FFB74D" />
              <Text style={styles.securityText}>
                After {attempts} more failed attempt{attempts === 1 ? '' : 's'}, 
                your account will be temporarily locked for security
              </Text>
            </View>
          )}
        </View>

        {/* Middle Section - Numeric Keypad */}
        <View style={[styles.keypadSection, { marginBottom: Math.max(insets.bottom, 20) + 100 }]}>
          <NumericKeypad
            onPress={handleNumberPress}
            onDelete={handleDelete}
            onClear={handleClear}
            disabled={isVerifying || isLockedOut}
            theme="dark"
            showClearButton={passcode.length > 0}
          />
          
          {/* Submit Button - always rendered to prevent layout shifts */}
          <View style={styles.submitButtonWrapper}>
            {!isLockedOut && (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (passcode.length < 4 || isVerifying) && styles.submitButtonHidden,
                ]}
                onPress={handleVerify}
                activeOpacity={0.8}
                disabled={isVerifying || passcode.length < 4}
              >
                <LinearGradient
                  colors={['#8B5FFF', '#7B4FEF']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.submitButtonText}>
                    {isVerifying ? 'Verifying...' : 'VERIFY'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Forgot Passcode Button - Immediately after keypad */}
          {!isLockedOut && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={onForgotPasscode}
              activeOpacity={0.7}
              disabled={isVerifying}
            >
              <Text style={styles.forgotButtonText}>Forgot Passcode?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Section - Lockout Info */}
        {isLockedOut && (
          <View style={[styles.actionContainer, { 
            paddingBottom: Math.max(insets.bottom, 20) + 80
          }]}>
            <View style={styles.lockoutInfo}>
              <Text style={styles.lockoutTitle}>Security Lockout Active</Text>
              <Text style={styles.lockoutText}>
                For your security, access has been temporarily restricted due to multiple failed attempts.
              </Text>
              <Text style={styles.lockoutTimer}>
                Time remaining: {formatLockoutTime(lockoutTime)}
              </Text>
            </View>
          </View>
        )}
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
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  upperSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  iconContainer: {
    alignItems: 'center',
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
    fontSize: 32,
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
  errorContainer: {
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 13,
    color: '#FFB74D',
    textAlign: 'center',
  },
  securityInfo: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    alignItems: 'flex-start',
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#FFB74D',
    lineHeight: 18,
  },
  keypadSection: {
    justifyContent: 'flex-end',
  },
  submitButtonWrapper: {
    minHeight: 56,
    marginTop: 12,
    marginBottom: 8,
    justifyContent: 'center',
  },
  submitButton: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5FFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  submitButtonHidden: {
    opacity: 0,
  },
  submitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  actionContainer: {
    paddingTop: 8,
    paddingBottom: 80,
    paddingHorizontal: 0,
  },
  forgotButton: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  forgotButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  lockoutInfo: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  lockoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockoutText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  lockoutTimer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
