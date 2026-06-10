import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { shareReferral } from '../../utils/referrals';

interface Props {
  referralCode: string;
}

const ReferralInviteCard: React.FC<Props> = ({ referralCode }) => {
  const onShare = async () => {
    await shareReferral(referralCode);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Invite Friends, Unlock Rewards</Text>
      <Text style={styles.subtitle}>
        Verified referrals unlock:
        {"\n"}• Every 10 referrals → 1 week Premium
        {"\n"}• 200 referrals → Ksh 20,000
        {"\n"}• 2,000 referrals → Ksh 200,000
      </Text>
      <View style={styles.codePill}><Text style={styles.codeText}>{referralCode}</Text></View>
      <Pressable onPress={onShare} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>Share Your Code</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 6px 14px rgba(0, 0, 0, 0.10)',
  },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#4b5563', marginTop: 4, marginBottom: 12 },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  codeText: { fontWeight: '700', letterSpacing: 1 },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pressed: { opacity: 0.9 },
  buttonText: { color: 'white', fontWeight: '600' },
});

export default ReferralInviteCard;
