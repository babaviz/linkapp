import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useReferralPremium from '../../hooks/useReferralPremium';

/**
 * @deprecated This component is deprecated as the referral program has moved to cash rewards.
 * Premium tier rewards are no longer granted through referrals.
 * Kept for backwards compatibility but returns null.
 */
const ReferralPremiumBanner: React.FC = () => {
  // Premium tier rewards are no longer part of the referral program
  // This component is kept for backwards compatibility but is disabled
  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  title: { color: '#065f46', fontWeight: '700' },
  subtitle: { color: '#065f46', marginTop: 4 },
});

export default ReferralPremiumBanner;
