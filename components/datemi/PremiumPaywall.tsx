/**
 * Premium Paywall Component
 * Reusable component to block premium content with friendly upgrade prompts
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface PremiumPaywallProps {
  variant: 'blur' | 'overlay' | 'inline';
  title?: string;
  message?: string;
  feature?: 'messaging' | 'voice_call' | 'video_call';
  requiredTier: 'pro' | 'premium';
  onUpgrade: () => void;
  onClose?: () => void;
  showClose?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const PremiumPaywall: React.FC<PremiumPaywallProps> = ({
  variant = 'overlay',
  title,
  message,
  feature,
  requiredTier,
  onUpgrade,
  onClose,
  showClose = false,
  style,
  children,
}) => {
  const defaultTitle = requiredTier === 'premium' 
    ? '🌟 Premium Feature' 
    : '💎 Pro Feature';
  
  const featureLabel = feature === 'messaging'
    ? 'Messaging'
    : feature === 'voice_call'
      ? 'Voice Calls'
      : feature === 'video_call'
        ? 'Video Calls'
        : null;
  
  const featureEmoji = feature === 'messaging'
    ? '💬'
    : feature === 'voice_call'
      ? '📞'
      : feature === 'video_call'
        ? '🎥'
        : '';

  const defaultMessage = feature === 'messaging'
    ? 'Unlock Messaging for $1/month or upgrade to Pro for all chat features.'
    : feature === 'voice_call'
      ? 'Unlock Voice Calls for $1/month or upgrade to Premium ($2/month) for everything.'
      : feature === 'video_call'
        ? 'Unlock Video Calls for $1/month or upgrade to Premium ($2/month) for everything.'
        : requiredTier === 'premium'
          ? 'Upgrade to Premium to unlock this feature and enhance your dating experience!'
          : 'Upgrade to Pro to unlock this feature and find your perfect match!';

  const resolvedTitle = title || (featureLabel ? `${featureEmoji} Unlock ${featureLabel}` : defaultTitle);
  const resolvedMessage = message || defaultMessage;
  const primaryFeature = feature === 'messaging'
    ? 'Unlimited Messaging'
    : feature === 'voice_call'
      ? 'Voice Calls'
      : feature === 'video_call'
        ? 'Video Calls'
        : requiredTier === 'premium'
          ? 'Video & Voice Calls'
          : 'Unlimited Messaging';
  const isFeaturePaywall = Boolean(featureLabel);
  const overlayCtaText = isFeaturePaywall
    ? `Unlock ${featureLabel} - $1/month`
    : `Upgrade Now - $${requiredTier === 'premium' ? '2' : '1'}/month`;
  const featureBullets = isFeaturePaywall
    ? [
        `Unlimited ${featureLabel} in DateMi`,
        'Keep your current plan',
        'Cancel anytime',
      ]
    : [
        primaryFeature,
        requiredTier === 'premium' ? 'All Pro Features' : 'Advanced Filters',
        requiredTier === 'premium' ? 'Priority Support' : 'See Who Liked You',
      ];

  const renderBlurVariant = () => (
    <View style={[styles.container, style]}>
      {children && (
        <View style={styles.blurredContent} pointerEvents="none">
          {children}
        </View>
      )}
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject}>
        <View style={styles.blurOverlay}>
          <LinearGradient
            colors={['rgba(156, 39, 176, 0.9)', 'rgba(123, 31, 162, 0.95)']}
            style={styles.blurGradient}
          >
            {showClose && onClose && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <View style={styles.iconCircle}>
              <MaterialIcons 
                name={requiredTier === 'premium' ? 'star' : 'workspace-premium'} 
                size={32} 
                color="#FFD700" 
              />
            </View>
            <Text style={styles.blurTitle}>{resolvedTitle}</Text>
            <Text style={styles.blurMessage}>{resolvedMessage}</Text>
            <TouchableOpacity
              style={styles.blurUpgradeButton}
              onPress={onUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.blurUpgradeButtonText}>
                Upgrade to {requiredTier === 'premium' ? 'Premium' : 'Pro'}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#9C27B0" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </BlurView>
    </View>
  );

  const renderOverlayVariant = () => (
    <View style={[styles.container, style]}>
      {children}
      <View style={[StyleSheet.absoluteFillObject, styles.overlayContainer]}>
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.85)']}
          style={styles.overlayGradient}
        >
          <View style={styles.overlayContent}>
            {showClose && onClose && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <View style={[styles.iconCircle, styles.overlayIconCircle]}>
              <MaterialIcons 
                name={requiredTier === 'premium' ? 'star' : 'lock'} 
                size={40} 
                color="#FFD700" 
              />
            </View>
            <Text style={styles.overlayTitle}>{resolvedTitle}</Text>
            <Text style={styles.overlayMessage}>{resolvedMessage}</Text>
            
            <View style={styles.featuresPreview}>
              {featureBullets.map((item) => (
                <View key={item} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={18} color="#10B981" />
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.overlayUpgradeButton}
              onPress={onUpgrade}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#9C27B0', '#7B1FA2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.overlayUpgradeButtonGradient}
              >
                <Text style={styles.overlayUpgradeButtonText}>{overlayCtaText}</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  const renderInlineVariant = () => (
    <View style={[styles.inlineContainer, style]}>
      <LinearGradient
        colors={['#F3E5F5', '#FCE4EC']}
        style={styles.inlineGradient}
      >
        <View style={styles.inlineContent}>
          <View style={styles.inlineHeader}>
            <View style={styles.inlineIconCircle}>
              <MaterialIcons 
                name={requiredTier === 'premium' ? 'star' : 'lock'} 
                size={24} 
                color="#9C27B0" 
              />
            </View>
            <View style={styles.inlineTextContainer}>
              <Text style={styles.inlineTitle}>{resolvedTitle}</Text>
              <Text style={styles.inlineMessage}>{resolvedMessage}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.inlineUpgradeButton}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.inlineUpgradeButtonText}>Upgrade</Text>
            <MaterialIcons name="chevron-right" size={20} color="#9C27B0" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  if (variant === 'blur') {
    return renderBlurVariant();
  } else if (variant === 'overlay') {
    return renderOverlayVariant();
  } else {
    return renderInlineVariant();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  blurredContent: {
    flex: 1,
    opacity: 0.3,
  },
  blurOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blurGradient: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: 340,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  blurTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  blurMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  blurUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  blurUpgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9C27B0',
  },
  overlayContainer: {
    zIndex: 10,
  },
  overlayGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    padding: 32,
    alignItems: 'center',
    maxWidth: 340,
  },
  overlayIconCircle: {
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    borderColor: 'rgba(156, 39, 176, 0.4)',
  },
  overlayTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  overlayMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresPreview: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    flex: 1,
  },
  overlayUpgradeButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  overlayUpgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  overlayUpgradeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inlineContainer: {
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inlineGradient: {
    padding: 16,
  },
  inlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inlineIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(156, 39, 176, 0.2)',
  },
  inlineTextContainer: {
    flex: 1,
  },
  inlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9C27B0',
    marginBottom: 4,
  },
  inlineMessage: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  inlineUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.3)',
  },
  inlineUpgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
});
