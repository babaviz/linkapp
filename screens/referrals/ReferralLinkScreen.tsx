import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import referralTrackingService from '../../services/referralTrackingService';

function sanitizeReferralCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/[A-Za-z0-9]{4,32}/);
  return match ? match[0].toUpperCase() : null;
}

/**
 * ReferralLinkScreen
 *
 * Entry point for referral deep links.
 * Supported URLs:
 * - https://link-app.co/r/<CODE>
 * - linkapp://r/<CODE>
 *
 * Behavior:
 * - Always captures the referral code for later signup attribution.
 * - If user is already signed in, routes to Referral Program (referrals don't apply to existing accounts).
 * - If user is signed out, routes to Sign Up.
 */
export default function ReferralLinkScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const isAuthenticated = useSelector((s: RootState) => Boolean(s.auth.isAuthenticated));
  const userId = useSelector((s: RootState) => s.auth.user?.id) as string | undefined;
  const isSignedIn = Boolean(isAuthenticated && userId);

  useEffect(() => {
    const code = sanitizeReferralCode(route?.params?.code);
    if (code) {
      // Best-effort: ensure pending referral is stored even if the URL listener
      // hasn't run yet (e.g. cold start + bootstrap screen).
      // Avoid overriding an already-captured referral (keeps correct `source`).
      (async () => {
        try {
          const existing = await referralTrackingService.getPendingReferral();
          if (existing?.code === code) return;

          let source: 'web' | 'deeplink' = 'web';
          try {
            const initialUrl = await Linking.getInitialURL();
            if (
              typeof initialUrl === 'string' &&
              (initialUrl.startsWith('linkapp://') || initialUrl.startsWith('exp+linkapp://'))
            ) {
              source = 'deeplink';
            }
          } catch {
            // ignore
          }

          await referralTrackingService.captureReferralCode(code, source);
        } catch {
          // ignore
        }
      })();
    }

    // Referral codes only apply on signup, so existing users should just land on the Referral Program.
    // Use replace to avoid back-button loops into this redirect screen.
    if (isSignedIn) {
      referralTrackingService.clearPendingReferral().catch(() => {});
      navigation.dispatch(StackActions.replace('ReferralProgram'));
      return;
    }

    navigation.dispatch(StackActions.replace('SignUp'));
  }, [isSignedIn, navigation, route?.params?.code]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2E3A8C" />
      <Text style={styles.text}>Opening LinkApp…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});

