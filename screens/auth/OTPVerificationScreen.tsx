import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthScreenProps } from '../../types/navigation';
import { useAppDispatch } from '../../redux/hooks';
import { setOtpProfileCompletePending } from '../../redux/slices/authSlice';
import supabaseAuthVerifyService from '../../services/supabaseAuthVerifyService';
import { useNetworkStatus } from '../../utils/networkStatus';
import { typography } from '../../theme';

type OTPVerificationScreenProps = AuthScreenProps<'OTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN_SECONDS = 60;

export default function OTPVerificationScreen({ navigation, route }: OTPVerificationScreenProps) {
  const { verificationMethod, identifier } = route.params;
  const dispatch = useAppDispatch();
  const isEmail = verificationMethod === 'email';

  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const { isConnected } = useNetworkStatus();

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const maskedIdentifier = isEmail
    ? identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : identifier.replace(/(\+\d{1,3})(\d*)(\d{3})/, '$1***$3');

  const currentOtp = otpDigits.join('');

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '') && digit) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
    }
  };

  const handleVerify = useCallback(
    async (code?: string) => {
      const otpCode = code ?? currentOtp;
      if (otpCode.length < OTP_LENGTH) {
        Alert.alert('Incomplete Code', 'Please enter all 6 digits.');
        return;
      }

      if (!isConnected) {
        Alert.alert('No Connection', 'Please check your internet connection and try again.');
        return;
      }

      setIsVerifying(true);
      try {
        const result = await supabaseAuthVerifyService.verifyOtp(
          identifier,
          otpCode,
          verificationMethod
        );

        if (!result.success) {
          if (result.code === 'CODE_EXPIRED' || result.code === 'MAX_ATTEMPTS') {
            Alert.alert('Code Invalid', result.error ?? 'Please request a new code.', [
              {
                text: 'Resend Code',
                onPress: () => {
                  setOtpDigits(Array(OTP_LENGTH).fill(''));
                  setCountdown(RESEND_COUNTDOWN_SECONDS);
                  setCanResend(false);
                  handleResend();
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
          } else {
            Alert.alert('Incorrect Code', result.error ?? 'The code you entered is incorrect. Please try again.');
            setOtpDigits(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
          }
          return;
        }

        dispatch(setOtpProfileCompletePending(true));
        navigation.navigate('SignUp', {
          fromOtpVerification: true,
          verifiedIdentifier: identifier,
          verifiedType: result.verifiedType ?? (verificationMethod === 'email' ? 'email' : 'phone'),
        });
      } finally {
        setIsVerifying(false);
      }
    },
    [currentOtp, identifier, isConnected, navigation, verificationMethod]
  );

  const handleResend = async () => {
    if (!canResend || isResending) return;

    if (!isConnected) {
      Alert.alert('No Connection', 'Please check your internet connection and try again.');
      return;
    }

    setIsResending(true);
    try {
      const result = await supabaseAuthVerifyService.sendOtp(
        identifier,
        verificationMethod
      );

      if (!result.success) {
        if (result.code === 'RATE_LIMITED') {
          Alert.alert('Too Many Attempts', result.error ?? 'Please wait before requesting another code.');
        } else {
          Alert.alert('Error', result.error ?? 'Failed to resend code. Please try again.');
        }
        return;
      }

      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setCountdown(RESEND_COUNTDOWN_SECONDS);
      setCanResend(false);
      Alert.alert('Code Sent', `A new verification code has been sent to ${maskedIdentifier}.`);
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconWrapper, { backgroundColor: isEmail ? '#E3F2FD' : '#E8F5E9' }]}>
            <MaterialIcons
              name={isEmail ? 'mark-email-read' : 'phone-iphone'}
              size={32}
              color={isEmail ? '#1565C0' : '#2E7D32'}
            />
          </View>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{' '}
            <Text style={styles.identifierText}>{maskedIdentifier}</Text>
          </Text>
        </View>

        <View style={styles.otpRow}>
          {otpDigits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[styles.otpCell, digit ? styles.otpCellFilled : null]}
              value={digit}
              onChangeText={(val) => handleDigitChange(index, val)}
              onKeyPress={(e) => handleKeyPress(index, e)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={isResending}>
              {isResending ? (
                <ActivityIndicator size="small" color="#1A237E" />
              ) : (
                <Text style={styles.resendLink}>Resend Code</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdownText}>
              Resend code in{' '}
              <Text style={styles.countdownNumber}>{countdown}s</Text>
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (isVerifying || currentOtp.length < OTP_LENGTH) && styles.verifyButtonDisabled,
            ]}
            onPress={() => handleVerify()}
            disabled={isVerifying || currentOtp.length < OTP_LENGTH}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
  header: {
    marginTop: 28,
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: '#1A237E',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: '#546E7A',
    lineHeight: 24,
  },
  identifierText: {
    fontWeight: '600',
    color: '#1A237E',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 28,
  },
  otpCell: {
    flex: 1,
    height: 58,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    color: '#1A237E',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  otpCellFilled: {
    borderColor: '#1A237E',
    backgroundColor: '#EEF1FF',
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendLink: {
    fontSize: 15,
    color: '#1A237E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  countdownText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  countdownNumber: {
    fontWeight: '600',
    color: '#546E7A',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  verifyButton: {
    backgroundColor: '#1A237E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
});
