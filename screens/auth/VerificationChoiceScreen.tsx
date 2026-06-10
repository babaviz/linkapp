import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  useWindowDimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { GoogleGLogo } from '../../components/auth/GoogleGLogo';
import { AuthScreenProps } from '../../types/navigation';
import { typography } from '../../theme';
import { wp } from '../../utils/responsive';
import { googleAuthService } from '../../services/googleAuthService';

type VerificationChoiceScreenProps = AuthScreenProps<'VerificationChoice'>;

export default function VerificationChoiceScreen({ navigation }: VerificationChoiceScreenProps) {
  const { width, height } = useWindowDimensions();
  const isCompactHeight = height < 600;
  const horizontalPadding = Math.max(20, wp(6, width));
  const titleSize = Math.min(wp(7, width), 26);
  const iconSize = Math.min(wp(8, width), 56);
  const cardGap = isCompactHeight ? 10 : 14;
  const headerMarginBottom = isCompactHeight ? 24 : 32;
  const securityMarginTop = isCompactHeight ? 20 : 32;
  const cardPadding = isCompactHeight ? 14 : 18;

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const result = await googleAuthService.signIn();
      if (result.success === false && result.errorType !== 'cancelled') {
        Alert.alert('Sign In Failed', result.message);
      }
    } catch (error: unknown) {
      Alert.alert(
        'Sign In Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

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
          <Text style={[styles.title, { fontSize: titleSize }]}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to verify your account. This keeps LinkApp secure.
          </Text>
        </View>

        <View style={[styles.cardsContainer, { gap: cardGap }]}>
          {/* Google Sign-In button */}
          <TouchableOpacity
            style={styles.googleCard}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#4285F4" style={styles.googleLoader} />
            ) : (
              <View style={styles.googleIconWrapper}>
                <GoogleGLogo size={32} />
              </View>
            )}
            <Text style={styles.googleCardTitle}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or verify with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.card, { padding: cardPadding }]}
            onPress={() => navigation.navigate('PhoneVerification')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#E8F5E9', width: iconSize, height: iconSize, borderRadius: iconSize / 4 }]}>
              <MaterialIcons name="sms" size={Math.min(iconSize * 0.57, 32)} color="#2E7D32" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>SMS Verification</Text>
              <Text style={styles.cardDescription}>
                Receive a one-time code via text message to your phone number
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9E9E9E" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { padding: cardPadding }]}
            onPress={() => navigation.navigate('EmailOTP')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#E3F2FD', width: iconSize, height: iconSize, borderRadius: iconSize / 4 }]}>
              <MaterialIcons name="email" size={Math.min(iconSize * 0.57, 32)} color="#1565C0" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Email Verification</Text>
              <Text style={styles.cardDescription}>
                Receive a one-time code sent to your email address
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        <View style={[styles.securityNote, { marginTop: securityMarginTop }]}>
          <MaterialIcons name="lock" size={16} color="#757575" />
          <Text style={styles.securityNoteText}>
            Verification is required once and never repeated during account setup
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  backButton: {
    marginTop: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
  header: {
    marginTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: typography.fontWeight.bold,
    color: '#1A237E',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: '#546E7A',
    lineHeight: 24,
  },
  cardsContainer: {
    gap: 14,
  },
  googleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    minHeight: 56,
    gap: 14,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#747775',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4.65,
    elevation: 6,
  },
  googleIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLoader: {
    width: 32,
    height: 32,
  },
  googleCardTitle: {
    fontSize: 17,
    fontWeight: typography.fontWeight.bold,
    color: '#1F1F1F',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    color: '#212121',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#757575',
    lineHeight: 19,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 4,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#9E9E9E',
    lineHeight: 18,
  },
});
