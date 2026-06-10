import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';
import PaystackCheckout from '../components/datemi/PaystackCheckout';
import { paystackService } from '../services/paystackService';
import { dateMiFeatureEntitlementService } from '../services/dateMiFeatureEntitlementService';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../redux/store';
import { getCurrentSubscription as getCurrentSubscriptionAction } from '../redux/slices/subscriptionSlice';

const { width } = Dimensions.get('window');

type BillingCycle = 'monthly' | 'yearly';
type Tier = 'pro' | 'premium';
type DateMiFeaturePackage = 'messaging' | 'voice_call' | 'video_call';

type SubscriptionPlansRouteProp = RouteProp<RootStackParamList, 'SubscriptionPlans'>;

export default function SubscriptionPlansScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<SubscriptionPlansRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const entryFeature = route.params?.entryFeature;
  
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('yearly');
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier>('pro');
  const [selectedFeaturePackage, setSelectedFeaturePackage] = useState<DateMiFeaturePackage | null>(null);

  const handleSelectPlan = (tier: Tier) => {
    setSelectedTier(tier);
    setSelectedFeaturePackage(null);
    setShowCheckout(true);
  };
  
  const handleSelectFeaturePackage = (pkg: DateMiFeaturePackage) => {
    // Feature packages are $1/month (DateMi-only)
    setSelectedTier('pro');
    setSelectedBillingCycle('monthly');
    setSelectedFeaturePackage(pkg);
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (reference: string) => {
    if (user?.id) {
      dispatch(getCurrentSubscriptionAction(user.id));
    }

    setShowCheckout(false);
    
    if (selectedFeaturePackage) {
      // Belt-and-suspenders: directly activate entitlement from UI state.
      // verifyTransaction should have already done this, but if it failed
      // (e.g. table missing, network error) the user's entitlement would be
      // silently dropped while Paystack took their money. This ensures activation.
      if (user?.id) {
        dateMiFeatureEntitlementService
          .upsertMonthlyEntitlement({
            userId: user.id,
            feature: selectedFeaturePackage,
            transactionReference: reference,
            source: 'paystack',
          })
          .catch(() => {
            // Non-blocking: verifyTransaction may have already activated it.
          });
      }

      const packageLabel =
        selectedFeaturePackage === 'messaging'
          ? 'Messaging'
          : selectedFeaturePackage === 'voice_call'
            ? 'Voice Calls'
            : 'Video Calls';
      Alert.alert('Success', `${packageLabel} package activated.`, [{ text: 'OK', style: 'cancel' }]);
      return;
    }
    
    navigation.navigate('SubscriptionSuccess', {
      tier: selectedTier,
      billingCycle: selectedBillingCycle,
    });
  };

  const getPrice = (tier: Tier, cycle: BillingCycle) => {
    const pricing = paystackService.getSubscriptionPricing(tier, cycle, 'KE');
    return pricing.formattedPrice;
  };

  const getMonthlyEquivalent = (tier: Tier) => {
    if (selectedBillingCycle === 'monthly') return null;
    
    const yearlyPrice = tier === 'pro' ? 10 : 20;
    const monthlyEquivalent = (yearlyPrice / 12).toFixed(2);
    return `$${monthlyEquivalent}/mo`;
  };

  const proFeatures = [
    { icon: '💬', text: 'Unlimited Messaging', highlight: false },
    { icon: '👀', text: 'See Who Liked You', highlight: false },
    { icon: '🔍', text: 'Advanced Search Filters', highlight: false },
    { icon: '⭐', text: '5 Super Likes per day', highlight: false },
    { icon: '🚫', text: 'Ad-Free Experience', highlight: false },
    { icon: '🎯', text: 'Priority Matching', highlight: false },
  ];

  const premiumFeatures = [
    { icon: '✨', text: 'All Pro Features', highlight: true },
    { icon: '📹', text: 'Unlimited Video Calls', highlight: true },
    { icon: '📞', text: 'Unlimited Voice Calls', highlight: true },
    { icon: '💎', text: 'Unlimited Super Likes', highlight: true },
    { icon: '📊', text: 'Advanced Analytics', highlight: true },
    { icon: '🎁', text: 'Early Access to Features', highlight: true },
  ];
  
  const featurePackages: Array<{
    id: DateMiFeaturePackage;
    title: string;
    description: string;
    gradient: [string, string];
    recommended?: boolean;
  }> = [
    {
      id: 'messaging',
      title: 'Messaging Only',
      description: 'Unlimited DateMi messaging only (no voice/video calls).',
      gradient: ['#2563EB', '#1D4ED8'],
      recommended: entryFeature === 'messaging',
    },
    {
      id: 'voice_call',
      title: 'Voice Calls Only',
      description: 'Unlimited DateMi voice calls only (no messaging/video).',
      gradient: ['#10B981', '#059669'],
      recommended: entryFeature === 'voice_call',
    },
    {
      id: 'video_call',
      title: 'Video Calls Only',
      description: 'Unlimited DateMi video calls only (no messaging/voice).',
      gradient: ['#EC4899', '#DB2777'],
      recommended: entryFeature === 'video_call',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Unlock Premium Dating</Text>
          <Text style={styles.heroSubtitle}>
            Get unlimited access to all features and find your perfect match faster
          </Text>
          <Text style={styles.heroTrialNote}>
            Includes a one-time 14-day free trial (full Premium access).
          </Text>
        </View>

        {/* Billing Cycle Toggle */}
        <View style={styles.billingToggleContainer}>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedBillingCycle === 'monthly' && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBillingCycle('monthly')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.billingOptionText,
                  selectedBillingCycle === 'monthly' && styles.billingOptionTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedBillingCycle === 'yearly' && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBillingCycle('yearly')}
              activeOpacity={0.7}
            >
              <View style={styles.billingOptionContent}>
                <Text
                  style={[
                    styles.billingOptionText,
                    selectedBillingCycle === 'yearly' && styles.billingOptionTextActive,
                  ]}
                >
                  Yearly
                </Text>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>Save 17%</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plans Comparison */}
        <View style={styles.plansContainer}>
          {/* Pro Plan */}
          <View style={styles.planCard}>
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2', '#6A1B9A']}
              style={styles.planGradient}
            >
              <View style={styles.planHeader}>
                <View style={styles.planIconContainer}>
                  <Icon name="workspace-premium" size={32} color="#FFF" />
                </View>
                <Text style={styles.planName}>Pro</Text>
                <Text style={styles.planTagline}>Perfect for serious daters</Text>
              </View>

              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{getPrice('pro', selectedBillingCycle)}</Text>
                <Text style={styles.planPriceCycle}>
                  {selectedBillingCycle === 'monthly' ? 'per month' : 'per year'}
                </Text>
                {selectedBillingCycle === 'yearly' && (
                  <Text style={styles.planPriceEquivalent}>
                    ({getMonthlyEquivalent('pro')} equivalent)
                  </Text>
                )}
              </View>

              <View style={styles.planFeatures}>
                {proFeatures.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => handleSelectPlan('pro')}
                activeOpacity={0.8}
              >
                <Text style={styles.selectButtonText}>Choose Pro</Text>
                <Icon name="arrow-forward" size={20} color="#9C27B0" />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Premium Plan (Popular) */}
          <View style={[styles.planCard, styles.popularPlan]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
            </View>
            
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF8C00']}
              style={styles.planGradient}
            >
              <View style={styles.planHeader}>
                <View style={styles.planIconContainer}>
                  <Icon name="stars" size={32} color="#FFF" />
                </View>
                <Text style={styles.planName}>Premium</Text>
                <Text style={styles.planTagline}>Complete dating experience</Text>
              </View>

              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{getPrice('premium', selectedBillingCycle)}</Text>
                <Text style={styles.planPriceCycle}>
                  {selectedBillingCycle === 'monthly' ? 'per month' : 'per year'}
                </Text>
                {selectedBillingCycle === 'yearly' && (
                  <Text style={styles.planPriceEquivalent}>
                    ({getMonthlyEquivalent('premium')} equivalent)
                  </Text>
                )}
              </View>

              <View style={styles.planFeatures}>
                {premiumFeatures.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                    <Text
                      style={[
                        styles.featureText,
                        feature.highlight && styles.featureTextHighlight,
                      ]}
                    >
                      {feature.text}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.selectButton, styles.selectButtonPremium]}
                onPress={() => handleSelectPlan('premium')}
                activeOpacity={0.8}
              >
                <Text style={styles.selectButtonTextPremium}>Choose Premium</Text>
                <Icon name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
        
        {/* Feature Packages */}
        <View style={styles.featurePackagesSection}>
          <Text style={styles.featurePackagesTitle}>DateMi Feature Packages</Text>
          <Text style={styles.featurePackagesSubtitle}>Unlock only what you need — $1/month each</Text>
          
          <View style={styles.featurePackagesList}>
            {featurePackages.map((pkg) => (
              <View
                key={pkg.id}
                style={[
                  styles.featurePackageCard,
                  pkg.recommended ? styles.featurePackageCardRecommended : null,
                ]}
              >
                {pkg.recommended ? (
                  <View style={styles.featurePackageRecommendedBadge}>
                    <Text style={styles.featurePackageRecommendedBadgeText}>RECOMMENDED</Text>
                  </View>
                ) : null}
                
                <LinearGradient colors={pkg.gradient} style={styles.featurePackageGradient}>
                  <Text style={styles.featurePackageTitle}>{pkg.title}</Text>
                  <Text style={styles.featurePackagePrice}>$1/month</Text>
                  <Text style={styles.featurePackageDescription}>{pkg.description}</Text>
                  
                  <TouchableOpacity
                    style={styles.featurePackageButton}
                    onPress={() => handleSelectFeaturePackage(pkg.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.featurePackageButtonText}>Unlock</Text>
                    <Icon name="arrow-forward" size={18} color={pkg.gradient[0]} />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>

        {/* Trust Indicators */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Icon name="security" size={24} color={colors.primary} />
            <Text style={styles.trustText}>Secure Payment</Text>
          </View>
          <View style={styles.trustItem}>
            <Icon name="cancel" size={24} color={colors.primary} />
            <Text style={styles.trustText}>Cancel Anytime</Text>
          </View>
          <View style={styles.trustItem}>
            <Icon name="verified" size={24} color={colors.primary} />
            <Text style={styles.trustText}>Instant Activation</Text>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Text style={styles.faqAnswer}>
              We accept M-PESA, Airtel Money, and credit/debit cards through our secure Paystack integration.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I upgrade from Pro to Premium?</Text>
            <Text style={styles.faqAnswer}>
              Absolutely! You can upgrade at any time from your subscription management page.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Modal */}
      <PaystackCheckout
        visible={showCheckout}
        tier={selectedTier}
        billingCycle={selectedFeaturePackage ? 'monthly' : selectedBillingCycle}
        featurePackage={selectedFeaturePackage ?? undefined}
        onClose={() => setShowCheckout(false)}
        onSuccess={handleCheckoutSuccess}
        onError={(error) => {
          if (__DEV__) {
            console.error('Payment error:', error);
          }
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
    backgroundColor: colors.background,
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
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  heroSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  heroTrialNote: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  billingToggleContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    width: width - 80,
    maxWidth: 400,
  },
  billingOption: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingOptionActive: {
    backgroundColor: colors.primary,
  },
  billingOptionContent: {
    alignItems: 'center',
  },
  billingOptionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  billingOptionTextActive: {
    color: '#FFFFFF',
  },
  savingsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  plansContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  popularPlan: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: '#000',
  },
  planGradient: {
    padding: spacing[6],
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  planIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  planName: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: spacing[1],
  },
  planTagline: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  planPricing: {
    alignItems: 'center',
    marginBottom: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  planPrice: {
    fontSize: 36,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: spacing[1],
  },
  planPriceCycle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  planPriceEquivalent: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  planFeatures: {
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.95)',
    flex: 1,
  },
  featureTextHighlight: {
    fontWeight: typography.fontWeight.semibold,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing[4],
    borderRadius: 12,
    gap: spacing[2],
  },
  selectButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#9C27B0',
  },
  selectButtonPremium: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  selectButtonTextPremium: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    borderRadius: 16,
    marginBottom: spacing[6],
  },
  trustItem: {
    alignItems: 'center',
    gap: spacing[2],
  },
  trustText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  faqSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  faqTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  faqItem: {
    marginBottom: spacing[5],
  },
  faqQuestion: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  faqAnswer: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  featurePackagesSection: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  featurePackagesTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  featurePackagesSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing[4],
  },
  featurePackagesList: {
    gap: spacing[4],
  },
  featurePackageCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface,
  },
  featurePackageCardRecommended: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  featurePackageRecommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
  },
  featurePackageRecommendedBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  featurePackageGradient: {
    padding: spacing[5],
  },
  featurePackageTitle: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: spacing[1],
  },
  featurePackagePrice: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing[2],
  },
  featurePackageDescription: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: spacing[4],
  },
  featurePackageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing[3],
    borderRadius: 12,
    gap: spacing[2],
  },
  featurePackageButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: '#111827',
  },
});
