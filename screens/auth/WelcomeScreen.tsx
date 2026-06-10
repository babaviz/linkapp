import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreenProps } from '../../types/navigation';
import { typography } from '../../theme';
import { wp } from '../../utils/responsive';

type WelcomeScreenProps = AuthScreenProps<'Welcome'>;

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { width, height } = useWindowDimensions();
  const isCompactHeight = height < 600;
  const maxTaglineWidth = Math.min(wp(85, width), width * 0.85);
  const horizontalPadding = Math.max(20, wp(6, width));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#1A237E' }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" translucent={false} />

      <View style={styles.wrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroSection, isCompactHeight && styles.heroSectionCompact]}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoCircle, { width: wp(20, width), height: wp(20, width), borderRadius: wp(10, width) }]}>
                <Text style={[styles.logoText, { fontSize: Math.min(wp(10, width), 40) }]}>L</Text>
              </View>
            </View>
            <Text style={[styles.appName, { fontSize: Math.min(wp(9, width), 36) }]}>LinkApp</Text>
            <Text style={[styles.tagline, { maxWidth: maxTaglineWidth }]}>
              Your all-in-one platform for property, jobs, services & more
            </Text>
          </View>

          <View style={[styles.featuresRow, isCompactHeight && styles.featuresRowCompact]}>
            {FEATURES.map((feature) => (
              <View key={feature.label} style={styles.featureItem}>
                <Text style={[styles.featureIcon, { fontSize: Math.min(wp(7, width), 28) }]}>{feature.icon}</Text>
                <Text style={[styles.featureLabel, { fontSize: Math.min(wp(3, width), 12) }]}>{feature.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.actionsSection, { paddingHorizontal: horizontalPadding }]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('VerificationChoice')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Already have an account?</Text>
            <Text style={styles.secondaryButtonCta}> Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const FEATURES = [
  { icon: '🏠', label: 'Property' },
  { icon: '💼', label: 'Jobs' },
  { icon: '🔧', label: 'Services' },
  { icon: '❤️', label: 'DateMi' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A237E',
  },
  wrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 8 : 24,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  heroSectionCompact: {
    paddingVertical: 16,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    backgroundColor: '#FF1493',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoText: {
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  appName: {
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 12,
  },
  tagline: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
  },
  featuresRowCompact: {
    paddingVertical: 16,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  featureIcon: {},
  featureLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  actionsSection: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF1493',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
  },
  secondaryButtonCta: {
    color: '#FF1493',
    fontSize: 15,
    fontWeight: typography.fontWeight.semibold,
  },
});
