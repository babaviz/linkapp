import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import referralService, { ReferralProgress, Referral } from '../../services/referralService';
import referralTrackingService from '../../services/referralTrackingService';
import { RootState } from '../../redux/store';
import ReferralCodeDisplay from './ReferralCodeDisplay';

const ReferralDashboard: React.FC = () => {
  const userId = useSelector((s: RootState) => s.auth.user?.id) as string | undefined;
  const [progress, setProgress] = useState<ReferralProgress | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [p, r] = await Promise.all([
        referralService.getReferralProgress(userId),
        referralService.getUserReferrals(userId),
      ]);
      setProgress(p.data);
      setReferrals(r.data || []);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  
  // Realtime: refresh dashboard whenever referral statistics change
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = referralTrackingService.subscribeToReferralStats(userId, () => {
      load();
    });
    return unsubscribe;
  }, [userId, load]);

  if (!userId) return null;

  const getNextCashMilestoneInfo = () => {
    if (!progress) return { milestone: 200, amount: 20000, remaining: 200 };
    return referralService.getNextMilestoneInfo(progress.completedReferrals);
  };

  const nextCashInfo = getNextCashMilestoneInfo();
  const premiumEndDate =
    progress?.premiumEndDate && Number.isFinite(new Date(progress.premiumEndDate).getTime())
      ? new Date(progress.premiumEndDate)
      : null;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.container}>
      <View style={styles.section}><ReferralCodeDisplay userId={userId} /></View>
      
      {progress ? (
        <>
          <View style={styles.section}>
            <Text style={styles.heading}>Premium Rewards</Text>
            <View style={styles.premiumCard}>
              <Text style={styles.progressText}>
                Every <Text style={styles.boldText}>10 verified referrals</Text> unlocks <Text style={styles.boldText}>+1 week Premium</Text>
              </Text>
              <Text style={styles.progressSubtext}>
                {progress.referralsUntilReward} more verified referral
                {progress.referralsUntilReward === 1 ? '' : 's'} to unlock your next free week
              </Text>
              <Text style={styles.progressSubtext}>
                Progress this cycle: {progress.currentBatchProgress}/10
              </Text>
              {progress.hasActivePremium && premiumEndDate ? (
                <Text style={styles.premiumActiveText}>
                  Referral Premium active until {premiumEndDate.toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Cash Rewards</Text>
            <View style={styles.progressCard}>
              <Text style={styles.progressText}>
                You've referred <Text style={styles.boldText}>{progress.completedReferrals}</Text> verified users
              </Text>
              {nextCashInfo.remaining > 0 ? (
                <Text style={styles.progressSubtext}>
                  {nextCashInfo.remaining} more to reach Ksh {nextCashInfo.amount.toLocaleString()}
                </Text>
              ) : (
                <Text style={styles.progressSubtext}>Maximum milestone reached!</Text>
              )}
            </View>

            <View style={styles.milestonesContainer}>
              <Text style={styles.subheading}>Cash milestones</Text>
              <View style={styles.milestoneItem}>
                <Text style={styles.milestoneLabel}>200 referrals</Text>
                <Text style={styles.milestoneAmount}>
                  Ksh 20,000 {progress.completedReferrals >= 200 ? '✅' : ''}
                </Text>
              </View>
              <View style={styles.milestoneItem}>
                <Text style={styles.milestoneLabel}>2,000 referrals</Text>
                <Text style={styles.milestoneAmount}>
                  Ksh 200,000 {progress.completedReferrals >= 2000 ? '✅' : ''}
                </Text>
              </View>
            </View>

            {progress.totalCashRewardsKsh > 0 ? (
              <View style={styles.totalRewardsCard}>
                <Text style={styles.totalRewardsLabel}>Total Cash Rewards Earned</Text>
                <Text style={styles.totalRewardsAmount}>
                  Ksh {progress.totalCashRewardsKsh.toLocaleString()}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.heading}>Referral Rewards</Text>
          <Text style={styles.emptyText}>{isLoading ? 'Loading...' : 'No progress available yet.'}</Text>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.heading}>Your Referrals</Text>
        {referrals.length > 0 ? (
          referrals.map((ref) => (
            <View key={ref.id} style={styles.referralItem}>
              <Text style={styles.referralCode}>{ref.referralCode}</Text>
              <Text style={styles.referralStatus}>{ref.status}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            {isLoading ? 'Loading...' : 'No referrals yet. Start inviting friends!'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  subheading: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  progressCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  progressText: { fontSize: 16, color: '#065f46', marginBottom: 4 },
  progressSubtext: { fontSize: 14, color: '#059669', marginTop: 4 },
  boldText: { fontWeight: '700' },
  premiumCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  premiumActiveText: {
    marginTop: 8,
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  milestonesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  milestoneLabel: { fontSize: 14, color: '#374151' },
  milestoneAmount: { fontSize: 14, fontWeight: '600', color: '#059669' },
  totalRewardsCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  totalRewardsLabel: { fontSize: 14, color: '#92400e', marginBottom: 4 },
  totalRewardsAmount: { fontSize: 24, fontWeight: '700', color: '#b45309' },
  referralItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.06)',
  },
  referralCode: { fontWeight: '600' },
  referralStatus: { color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 8 },
});

export default ReferralDashboard;
