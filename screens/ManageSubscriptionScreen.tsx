import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { showDialog } from '../utils/dialogService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../redux/store';
import { colors, spacing, typography } from '../theme';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { Subscription } from '../types/subscription';
import subscriptionService from '../services/subscriptionService';
import entitlementService from '../services/entitlementService';
import PaystackCheckout from '../components/datemi/PaystackCheckout';
import { format } from 'date-fns';
import { getCurrentSubscription as getCurrentSubscriptionAction } from '../redux/slices/subscriptionSlice';
import useEntitlement from '../hooks/useEntitlement';

interface ExpiryAlert {
  daysUntilExpiry: number;
  message: string;
  severity: 'warning' | 'critical';
}

export default function ManageSubscriptionScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { entitlement, refresh: refreshEntitlement } = useEntitlement();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expiryAlert, setExpiryAlert] = useState<ExpiryAlert | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<'pro' | 'premium'>('pro');
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Load subscription function
  const loadSubscription = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Check and update expired subscriptions
      await subscriptionService.checkAndUpdateExpiredSubscriptions(user.id);
      
      // Load current subscription
      const currentSub = await subscriptionService.getCurrentSubscription(user.id);
      setSubscription(currentSub);
      await refreshEntitlement({ forceRefresh: true });
      
      // Check expiry and set alert will be handled by useEffect
    } catch (error: unknown) {
      await showDialog({
        title: 'Error',
        message: 'Failed to load subscription details',
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshEntitlement, user?.id]);

  // Check for expiry alerts
  const checkSubscriptionExpiry = useCallback(() => {
    const now = new Date();
    const entitlementExpiry = entitlement.expiresAt ? new Date(entitlement.expiresAt) : null;
    const entitlementDaysRemaining =
      entitlementExpiry && Number.isFinite(entitlementExpiry.getTime())
        ? Math.ceil((entitlementExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : Number.NaN;

    // Trials can be extended by other Premium-equivalent sources (e.g. referral premium weeks).
    // Always compute trial time remaining from the trial-specific end date when present.
    const trialExpiry = entitlement.trial?.trialEndDate
      ? new Date(entitlement.trial.trialEndDate)
      : entitlementExpiry;
    const trialDaysRemaining =
      trialExpiry && Number.isFinite(trialExpiry.getTime())
        ? Math.ceil((trialExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : Number.NaN;

    if (entitlement.state === 'BONUS_ACTIVE' && Number.isFinite(entitlementDaysRemaining)) {
      const bonusDays = Math.max(0, entitlementDaysRemaining);
      const bonusMessage =
        bonusDays <= 0
          ? 'Your referral Premium ends today. Refer 10 more verified users to unlock another free week, or subscribe to keep full access.'
          : bonusDays === 1
            ? 'Your referral Premium ends tomorrow. Refer 10 more verified users to unlock another free week, or subscribe to keep full access.'
            : `Your referral Premium ends in ${bonusDays} days. Refer 10 more verified users to unlock another free week, or subscribe to keep full access.`;

      setExpiryAlert({
        daysUntilExpiry: bonusDays,
        message: bonusMessage,
        severity: bonusDays <= 3 ? 'critical' : 'warning',
      });
      return;
    }

    if (entitlement.state === 'TRIAL_ACTIVE' && Number.isFinite(trialDaysRemaining)) {
      const trialDays = Math.max(0, trialDaysRemaining);
      const trialMessage =
        trialDays <= 0
          ? 'Your free trial ends today. Subscribe now to avoid feature restrictions.'
          : trialDays === 1
            ? 'Your free trial ends tomorrow. Subscribe to keep full Premium access.'
            : `Your free trial ends in ${trialDays} days. Subscribe to keep full Premium access.`;

      setExpiryAlert({
        daysUntilExpiry: trialDays,
        message: trialMessage,
        severity: trialDays <= 3 ? 'critical' : 'warning',
      });
      return;
    }

    const trialEndMs = entitlement.trial?.trialEndDate
      ? new Date(entitlement.trial.trialEndDate).getTime()
      : Number.NaN;
    if (
      entitlement.state === 'FREE' &&
      entitlement.trial &&
      entitlement.trial.trialActive === false &&
      Number.isFinite(trialEndMs) &&
      trialEndMs <= now.getTime()
    ) {
      setExpiryAlert({
        daysUntilExpiry: 0,
        message: 'Your free trial has ended. Subscribe to restore Pro and Premium features.',
        severity: 'critical',
      });
      return;
    }

    if (!subscription || subscription.status !== 'active') {
      setExpiryAlert(null);
      return;
    }

    const endDate = new Date(subscription.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Show alert if subscription expires within 7 days
    if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
      let message = '';
      let severity: 'warning' | 'critical' = 'warning';

      if (daysUntilExpiry === 0) {
        message = 'Your subscription expires today! Renew now to continue enjoying premium features.';
        severity = 'critical';
      } else if (daysUntilExpiry === 1) {
        message = 'Your subscription expires tomorrow! Renew now to avoid interruption.';
        severity = 'critical';
      } else if (daysUntilExpiry <= 3) {
        message = `Your subscription expires in ${daysUntilExpiry} days! Renew now to continue your access.`;
        severity = 'critical';
      } else {
        message = `Your subscription expires in ${daysUntilExpiry} days. Consider renewing to maintain uninterrupted access.`;
        severity = 'warning';
      }

      setExpiryAlert({
        daysUntilExpiry,
        message,
        severity,
      });
    } else if (daysUntilExpiry < 0) {
      // Subscription already expired
      setExpiryAlert({
        daysUntilExpiry: 0,
        message: 'Your subscription has expired. Renew now to restore access to premium features.',
        severity: 'critical',
      });
    } else {
      setExpiryAlert(null);
    }
  }, [entitlement, subscription]);

  // Real-time subscription status check
  useFocusEffect(
    useCallback(() => {
      loadSubscription();
      
      // Set up interval to check subscription status every minute
      const interval = setInterval(() => {
        checkSubscriptionExpiry();
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }, [loadSubscription, checkSubscriptionExpiry])
  );

  // Check for expiry alerts when subscription changes
  useEffect(() => {
    checkSubscriptionExpiry();
  }, [checkSubscriptionExpiry]);


  const handleRenew = () => {
    if (!subscription) {
      setCheckoutTier('premium');
      setCheckoutBillingCycle('monthly');
      setShowCheckout(true);
      return;
    }

    setCheckoutTier(subscription.tier as 'pro' | 'premium');
    setCheckoutBillingCycle(subscription.billingCycle);
    setShowCheckout(true);
  };

  const handleUpgrade = (tier: 'pro' | 'premium', cycle: 'monthly' | 'yearly' = 'yearly') => {
    setCheckoutTier(tier);
    setCheckoutBillingCycle(cycle);
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = async (_reference: string) => {
    if (user?.id) {
      dispatch(getCurrentSubscriptionAction(user.id));
      entitlementService.invalidateUser(user.id);
      await refreshEntitlement({ forceRefresh: true });
    }

    setShowCheckout(false);
    await showDialog({
      title: 'Success!',
      message: 'Your subscription has been updated successfully.',
      type: 'success',
      buttons: [
        {
          text: 'OK',
          onPress: () => {
            void loadSubscription();
          },
        },
      ]
    });
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    await showDialog({
      title: 'Cancel Subscription',
      message: `Are you sure you want to cancel your ${subscription.tier} subscription? You'll continue to have access until ${format(new Date(subscription.endDate), 'MMM dd, yyyy')}.`,
      type: 'warning',
      icon: { name: 'cancel', color: '#F59E0B', size: 32 },
      buttons: [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionService.cancelSubscription(subscription.id, user!.id);
              await showDialog({
                title: 'Success',
                message: 'Your subscription has been cancelled. You will retain access until the end of your billing period.',
                type: 'success',
                buttons: [{ text: 'OK' }]
              });
              loadSubscription();
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
              await showDialog({
                title: 'Error',
                message: errorMessage,
                type: 'error',
                buttons: [{ text: 'OK' }]
              });
            }
          },
        },
      ]
    });
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getDaysRemaining = () => {
    if (entitlement.expiresAt) {
      const now = new Date();
      const expiryDate = new Date(entitlement.expiresAt);
      const days = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    }

    if (!subscription || subscription.status !== 'active') return 0;
    
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getTierGradient = (tier: string): [string, string] => {
    switch (tier) {
      case 'premium':
        return ['#FFD700', '#FFA500'];
      case 'pro':
        return ['#9C27B0', '#673AB7'];
      default:
        return ['#808080', '#606060'];
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'stars';
      case 'pro':
        return 'workspace-premium';
      default:
        return 'person';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Subscription</Text>
        </View>
        <ScrollView
          style={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <SkeletonLoader width="45%" height={18} style={{ marginBottom: spacing[3] }} />
            <SkeletonLoader width="100%" height={160} borderRadius={16} style={{ marginBottom: spacing[4] }} />

            <SkeletonLoader width="35%" height={18} style={{ marginBottom: spacing[3] }} />
            <SkeletonLoader width="100%" height={120} borderRadius={12} style={{ marginBottom: spacing[4] }} />

            <SkeletonLoader width="55%" height={18} style={{ marginBottom: spacing[3] }} />
            <SkeletonLoader width="100%" height={56} borderRadius={12} style={{ marginBottom: spacing[3] }} />
            <SkeletonLoader width="100%" height={56} borderRadius={12} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Subscription</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadSubscription}
            tintColor={colors.primary}
          />
        }
      >
        {/* Expiry Alert Banner */}
        {expiryAlert && (
          <View style={[
            styles.alertBanner,
            expiryAlert.severity === 'critical' ? styles.alertBannerCritical : styles.alertBannerWarning
          ]}>
            <Icon 
              name={expiryAlert.severity === 'critical' ? 'warning' : 'info'} 
              size={24} 
              color="#FFF" 
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {entitlement.state === 'BONUS_ACTIVE'
                  ? 'Referral Premium Active'
                  : entitlement.state === 'TRIAL_ACTIVE'
                    ? '14-Day Free Trial Active'
                  : expiryAlert.severity === 'critical'
                    ? 'Subscription Expiring Soon!'
                    : 'Subscription Reminder'}
              </Text>
              <Text style={styles.alertMessage}>{expiryAlert.message}</Text>
              {expiryAlert.daysUntilExpiry <= 7 && (
                <TouchableOpacity
                  style={styles.alertButton}
                  onPress={handleRenew}
                >
                  <Text style={styles.alertButtonText}>
                    {entitlement.state === 'TRIAL_ACTIVE' || entitlement.state === 'BONUS_ACTIVE'
                      ? 'Subscribe Now'
                      : 'Renew Now'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {subscription ? (
          <>
            {/* Current Subscription Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Plan</Text>
              
              <LinearGradient
                colors={getTierGradient(subscription.tier)}
                style={styles.subscriptionCard}
              >
                <View style={styles.subscriptionHeader}>
                  <View style={styles.tierInfo}>
                    <Icon 
                      name={getTierIcon(subscription.tier)} 
                      size={32} 
                      color="#FFF" 
                    />
                    <View style={styles.tierTextContainer}>
                      <Text style={styles.tierName}>
                        {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                      </Text>
                      <Text style={styles.tierBilling}>
                        {subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)} Plan
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    subscription.status === 'active' ? styles.statusActive : styles.statusInactive
                  ]}>
                    <Text style={styles.statusText}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Subscription Details */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Icon name="calendar-today" size={20} color="rgba(255,255,255,0.9)" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Start Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(subscription.startDate)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Icon name="event" size={20} color="rgba(255,255,255,0.9)" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Expiry Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(subscription.endDate)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Icon name="schedule" size={20} color="rgba(255,255,255,0.9)" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Time Remaining</Text>
                      <Text style={styles.detailValue}>
                        {getDaysRemaining()} {getDaysRemaining() === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                  </View>

                  {subscription.amount && (
                    <View style={styles.detailRow}>
                      <Icon name="attach-money" size={20} color="rgba(255,255,255,0.9)" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Amount Paid</Text>
                        <Text style={styles.detailValue}>
                          {subscription.currency || 'KES'} {subscription.amount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Icon name="autorenew" size={20} color="rgba(255,255,255,0.9)" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Auto-Renew</Text>
                      <Text style={styles.detailValue}>
                        {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                  </View>

                  {subscription.paymentMethod && (
                    <View style={styles.detailRow}>
                      <Icon name="payment" size={20} color="rgba(255,255,255,0.9)" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Payment Method</Text>
                        <Text style={styles.detailValue}>
                          {subscription.paymentMethod.charAt(0).toUpperCase() + subscription.paymentMethod.slice(1)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              
              {subscription.status === 'active' && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleRenew}
                  >
                    <Icon name="refresh" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText}>Renew Subscription</Text>
                    <Icon name="chevron-right" size={24} color={colors.text.secondary} />
                  </TouchableOpacity>

                  {subscription.tier === 'pro' && (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpgrade('premium', 'yearly')}
                      >
                        <Icon name="trending-up" size={24} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.actionButtonText}>Upgrade to Premium</Text>
                          <Text style={styles.actionButtonSubtext}>Yearly - Save 17%</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color={colors.text.secondary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpgrade('premium', 'monthly')}
                      >
                        <Icon name="trending-up" size={24} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.actionButtonText}>Upgrade to Premium</Text>
                          <Text style={styles.actionButtonSubtext}>Monthly billing</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color={colors.text.secondary} />
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={handleCancelSubscription}
                  >
                    <Icon name="cancel" size={24} color="#FF4444" />
                    <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
                      Cancel Subscription
                    </Text>
                    <Icon name="chevron-right" size={24} color={colors.text.secondary} />
                  </TouchableOpacity>
                </>
              )}

              {subscription.status !== 'active' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => (navigation as any).navigate('SubscriptionPlans')}
                >
                  <Icon name="star" size={24} color={colors.primary} />
                  <Text style={styles.actionButtonText}>View Subscription Plans</Text>
                  <Icon name="chevron-right" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <View style={styles.noSubscriptionContainer}>
            <Icon name="subscriptions" size={64} color={colors.text.secondary} />
            <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
            <Text style={styles.noSubscriptionText}>
              Subscribe to unlock premium features and enhance your dating experience.
            </Text>
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => (navigation as any).navigate('SubscriptionPlans')}
            >
              <Text style={styles.subscribeButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Paystack Checkout Modal */}
      <PaystackCheckout
        visible={showCheckout}
        tier={checkoutTier}
        billingCycle={checkoutBillingCycle}
        onClose={() => setShowCheckout(false)}
        onSuccess={handleCheckoutSuccess}
        onError={async (error) => {
          await showDialog({
            title: 'Payment Error',
            message: error,
            type: 'error',
            buttons: [{ text: 'OK' }]
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[2],
    marginRight: spacing[3],
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing[4],
  },
  alertBanner: {
    flexDirection: 'row',
    padding: spacing[4],
    margin: spacing[4],
    borderRadius: 12,
    gap: spacing[3],
  },
  alertBannerWarning: {
    backgroundColor: '#F59E0B',
  },
  alertBannerCritical: {
    backgroundColor: '#EF4444',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#FFF',
    marginBottom: spacing[1],
  },
  alertMessage: {
    fontSize: typography.fontSize.base,
    color: '#FFF',
    marginBottom: spacing[2],
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    color: '#FFF',
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  subscriptionCard: {
    borderRadius: 16,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  tierTextContainer: {
    gap: spacing[1],
  },
  tierName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#FFF',
  },
  tierBilling: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusInactive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFF',
  },
  detailsContainer: {
    gap: spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing[1],
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFF',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  actionButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  actionButtonSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  cancelButtonText: {
    color: '#FF4444',
  },
  noSubscriptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[12],
  },
  noSubscriptionTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  noSubscriptionText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
});
