import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthScreenProps } from '../../types/navigation';
import { PhoneInput } from '../../components/common/PhoneInput';
import { validatePhoneNumber } from '../../utils/phone';
import { useNetworkStatus } from '../../utils/networkStatus';
import supabaseAuthVerifyService from '../../services/supabaseAuthVerifyService';
import { typography } from '../../theme';
import { wp } from '../../utils/responsive';
import AppAlertModal from '../../components/common/AppAlertModal';

type PhoneVerificationScreenProps = AuthScreenProps<'PhoneVerification'>;

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'info-outline' | 'person' | 'error-outline' | 'wifi-off' | 'sms';
  buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' }[];
}

export default function PhoneVerificationScreen({ navigation }: PhoneVerificationScreenProps) {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  const { isConnected } = useNetworkStatus();

  const showAlert = (config: Omit<AlertState, 'visible'>) =>
    setAlert({ ...config, visible: true });
  const hideAlert = () => setAlert((prev) => ({ ...prev, visible: false }));
  const { width, height } = useWindowDimensions();
  const isCompactHeight = height < 600;
  const horizontalPadding = Math.max(20, wp(6, width));
  const titleSize = Math.min(wp(6.5, width), 24);
  const iconSize = Math.min(wp(15, width), 60);
  const headerMarginBottom = isCompactHeight ? 24 : 36;
  const footerPaddingTop = isCompactHeight ? 20 : 28;
  const footerPaddingBottom = 24;

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      showAlert({
        title: 'Phone Required',
        message: 'Please enter your phone number.',
        icon: 'info-outline',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    if (!validatePhoneNumber(phone)) {
      showAlert({
        title: 'Invalid Phone',
        message: 'Please enter a valid phone number including country code (e.g. +254700000000).',
        icon: 'error-outline',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    if (!isConnected) {
      showAlert({
        title: 'No Connection',
        message: 'Please check your internet connection and try again.',
        icon: 'wifi-off',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await supabaseAuthVerifyService.sendOtp(phone.trim(), 'sms');

      if (!result.success) {
        if (result.code === 'RATE_LIMITED') {
          showAlert({
            title: 'Too Many Attempts',
            message: result.error ?? 'Please wait before trying again.',
            icon: 'error-outline',
            buttons: [{ text: 'OK', style: 'default' }],
          });
        } else if (result.code === 'TWILIO_BLOCKED') {
          showAlert({
            title: 'SMS Verification Unavailable',
            message: 'SMS verification is not available for this number right now. Please use email verification instead.',
            icon: 'sms',
            buttons: [
              { text: 'Use Email', onPress: () => navigation.navigate('EmailOTP'), style: 'default' },
              { text: 'Cancel', style: 'cancel' },
            ],
          });
        } else {
          showAlert({
            title: 'Error',
            message: result.error ?? 'Failed to send verification code. Try email instead if SMS is unavailable.',
            icon: 'sms',
            buttons: [
              { text: 'Use Email', onPress: () => navigation.navigate('EmailOTP'), style: 'default' },
              { text: 'Cancel', style: 'cancel' },
            ],
          });
        }
        return;
      }

      navigation.navigate('OTPVerification', {
        verificationMethod: 'sms',
        identifier: phone.trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: Platform.OS === 'android' ? 8 : 16,
            },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>

          <View style={[styles.header, { marginBottom: headerMarginBottom }]}>
            <View style={[styles.iconWrapper, { width: iconSize, height: iconSize, borderRadius: iconSize / 3.75 }]}>
              <MaterialIcons name="sms" size={Math.min(iconSize * 0.53, 32)} color="#2E7D32" />
            </View>
            <Text style={[styles.title, { fontSize: titleSize }]}>Enter Your Phone Number</Text>
            <Text style={styles.subtitle}>
              We'll send a 6-digit verification code to your number via SMS.
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <PhoneInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
            />
            <Text style={styles.inputHint}>Include your country code (e.g. +254 for Kenya)</Text>
          </View>

          <View style={[styles.footer, { paddingTop: footerPaddingTop, paddingBottom: footerPaddingBottom }]}>
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleSendOTP}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.continueButtonText}>Send Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        icon={alert.icon}
        buttons={alert.buttons}
        onClose={hideAlert}
      />
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    marginTop: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
  header: {
    marginTop: 24,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    backgroundColor: '#E8F5E9',
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
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
  },
  inputHint: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  footer: {
    marginTop: 8,
  },
  continueButton: {
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
  continueButtonDisabled: {
    opacity: 0.65,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
});
