/**
 * Upgrade Prompt Component
 * Simple prompt to encourage users to upgrade to premium
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import PaystackCheckout from './PaystackCheckout';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { getCurrentSubscription as getCurrentSubscriptionAction } from '../../redux/slices/subscriptionSlice';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  tier?: 'pro' | 'premium';
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onClose,
  feature,
  tier = 'pro',
}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const handleUpgrade = () => {
    setShowCheckout(true);
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
    onClose();
  };

  const getFeatureMessage = () => {
    if (feature) {
      return `${feature} is a premium feature. Upgrade to unlock it!`;
    }
    
    if (tier === 'premium') {
      return 'This feature requires Premium subscription for unlimited access.';
    }
    
    return 'Upgrade to Pro or Premium to unlock amazing features!';
  };

  const getPremiumFeatures = () => {
    const features = [];
    
    if (tier === 'pro') {
      features.push('Unlimited Messages');
      features.push('Advanced Filters');
      features.push('5 Super Likes/day');
      features.push('No Ads');
    } else {
      features.push('All Pro Features');
      features.push('Video & Voice Calls');
      features.push('Unlimited Super Likes');
      features.push('Profile Boost');
      features.push('Priority Support');
    }
    
    return features;
  };

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible && !showCheckout}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <LinearGradient
              colors={['#6B46C1', '#553C9A', '#4C1D95']}
              style={styles.gradient}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <View style={styles.closeButtonCircle}>
                  <MaterialIcons name="close" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="star" size={32} color="#FFD700" />
                </View>
                <Text style={styles.title}>
                  Upgrade to {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Text>
                <Text style={styles.subtitle}>
                  {getFeatureMessage()}
                </Text>
              </View>

              {/* Features List */}
              <View style={styles.featuresContainer}>
                {getPremiumFeatures().map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <MaterialIcons name="check" size={18} color="#10B981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Billing Cycle Selection */}
              <View style={styles.billingCycleContainer}>
                <Text style={styles.billingCycleTitle}>Choose Billing Cycle:</Text>
                <View style={styles.billingOptions}>
                  <TouchableOpacity
                    style={[
                      styles.billingOptionCard,
                      selectedBillingCycle === 'monthly' && styles.billingOptionCardActive,
                    ]}
                    onPress={() => setSelectedBillingCycle('monthly')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.billingOptionLabel,
                      selectedBillingCycle === 'monthly' && styles.billingOptionLabelActive,
                    ]}>Monthly</Text>
                    <Text style={[
                      styles.billingOptionPrice,
                      selectedBillingCycle === 'monthly' && styles.billingOptionPriceActive,
                    ]}>
                      ${tier === 'pro' ? '1' : '2'}/mo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.billingOptionCard,
                      selectedBillingCycle === 'yearly' && styles.billingOptionCardActive,
                    ]}
                    onPress={() => setSelectedBillingCycle('yearly')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.savingsTag}>
                      <Text style={styles.savingsTagText}>Save 17%</Text>
                    </View>
                    <Text style={[
                      styles.billingOptionLabel,
                      selectedBillingCycle === 'yearly' && styles.billingOptionLabelActive,
                    ]}>Yearly</Text>
                    <Text style={[
                      styles.billingOptionPrice,
                      selectedBillingCycle === 'yearly' && styles.billingOptionPriceActive,
                    ]}>
                      ${tier === 'pro' ? '10' : '20'}/yr
                    </Text>
                    <Text style={styles.billingOptionEquivalent}>
                      (${tier === 'pro' ? '0.83' : '1.67'}/mo)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgrade}
                  activeOpacity={0.8}
                >
                  <Text style={styles.upgradeButtonText}>Pay Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Subscription Checkout Modal */}
      <PaystackCheckout
        visible={showCheckout}
        onClose={handleCheckoutClose}
        tier={tier}
        billingCycle={selectedBillingCycle}
        onSuccess={(reference) => {
          void reference;

          if (user?.id) {
            dispatch(getCurrentSubscriptionAction(user.id));
          }

          handleCheckoutClose();
        }}
        onError={(_error) => {
          // Payment error handled by PaystackCheckout component
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1000,
    padding: 4,
  },
  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  gradient: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    flex: 1,
  },
  billingCycleContainer: {
    marginBottom: 20,
  },
  billingCycleTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  billingOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  billingOptionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  billingOptionCardActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#10B981',
  },
  billingOptionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  billingOptionLabelActive: {
    color: '#FFFFFF',
  },
  billingOptionPrice: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 20,
    fontWeight: 'bold',
  },
  billingOptionPriceActive: {
    color: '#FFFFFF',
  },
  billingOptionEquivalent: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 4,
  },
  savingsTag: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtons: {
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
});
