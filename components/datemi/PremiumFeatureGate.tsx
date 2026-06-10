import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import usePremiumAccess, { PremiumFeatures } from '../../hooks/usePremiumAccess';
import { SUBSCRIPTION_TIERS } from '../../types/subscription';
import { getDynamicDimensions } from '../../utils/responsive';

interface PremiumFeatureGateProps {
  feature: keyof PremiumFeatures;
  children: React.ReactNode;
  onUpgrade?: () => void;
  showModal?: boolean;
  modalTitle?: string;
  modalDescription?: string;
}

const { width, height } = Dimensions.get('window');

export default function PremiumFeatureGate({
  feature,
  children,
  onUpgrade,
  showModal = true,
  modalTitle,
  modalDescription,
}: PremiumFeatureGateProps) {
  const { isTablet } = getDynamicDimensions();
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const premiumAccess = usePremiumAccess();
  
  const canAccess = premiumAccess.canAccess(feature);
  const upgradeMessage = premiumAccess.getUpgradeMessage(feature);
  
  const requiredTier = getRequiredTierForFeature(feature);
  const targetTier = SUBSCRIPTION_TIERS.find(t => t.id === requiredTier);
  
  function getRequiredTierForFeature(feature: keyof PremiumFeatures): 'pro' | 'premium' {
    const premiumOnlyFeatures = [
      'videoCalls', 'contentCreation', 'monetizationTools', 
      'escrowPayments', 'creatorAnalytics', 'premiumBadge', 'featuredProfile'
    ];
    return premiumOnlyFeatures.includes(feature) ? 'premium' : 'pro';
  }
  
  const handleFeatureAccess = () => {
    if (canAccess) {
      return;
    }
    
    if (showModal) {
      setShowUpgradeModal(true);
    } else if (onUpgrade) {
      onUpgrade();
    }
  };
  
  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    if (onUpgrade) {
      onUpgrade();
    }
  };
  
  // If user has access, render children normally
  if (canAccess) {
    return <>{children}</>;
  }
  
  // Render locked state
  return (
    <>
      <View style={{ position: 'relative' }}>
        {/* Blurred/locked content */}
        <View style={{
          opacity: 0.3,
          pointerEvents: 'none',
        }}>
          {children}
        </View>
        
        {/* Overlay with upgrade prompt */}
        <TouchableOpacity
          onPress={handleFeatureAccess}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <LinearGradient
            colors={(targetTier?.gradientColors || ['#8B5CF6', '#7C3AED']) as [string, string, ...string[]]}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              alignItems: 'center',
              flexDirection: 'row',
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔒</Text>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '600',
            }}>
              {requiredTier === 'premium' ? 'Premium' : 'Pro'} Feature
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <BlurView
          intensity={20}
          tint="dark"
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <View style={{
            width: Math.min(width - 40, 400),
            backgroundColor: 'rgba(30,30,30,0.95)',
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}>
            {/* Icon */}
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: `${targetTier?.gradientColors?.[0] || '#8B5CF6'}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 40 }}>✨</Text>
            </View>
            
            {/* Title */}
            <Text style={{
              color: '#FFFFFF',
              fontSize: 24,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 12,
            }}>
              {modalTitle || `Unlock ${requiredTier === 'premium' ? 'Premium' : 'Pro'} Features`}
            </Text>
            
            {/* Description */}
            <Text style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 16,
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 24,
            }}>
              {modalDescription || upgradeMessage}
            </Text>
            
            {/* Features preview */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 16,
              width: '100%',
              marginBottom: 24,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 12,
              }}>
                {targetTier?.name} includes:
              </Text>
              {targetTier?.features.slice(0, 4).map((featureText, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <Text style={{ color: targetTier?.gradientColors?.[0] || '#8B5CF6', marginRight: 8 }}>✓</Text>
                  <Text style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 14,
                    flex: 1,
                  }}>
                    {featureText}
                  </Text>
                </View>
              ))}
              {targetTier && targetTier.features.length > 4 && (
                <Text style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  fontStyle: 'italic',
                  marginTop: 4,
                }}>
                  +{targetTier.features.length - 4} more features
                </Text>
              )}
            </View>
            
            {/* Buttons */}
            <View style={{
              flexDirection: 'row',
              width: '100%',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => setShowUpgradeModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleUpgrade}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(targetTier?.gradientColors || ['#8B5CF6', '#7C3AED']) as [string, string, ...string[]]}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: 'bold',
                  }}>
                    Upgrade Now
                  </Text>
                  {targetTier && typeof targetTier.price.monthly === 'number' && targetTier.price.monthly > 0 && (
                    <Text style={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: 12,
                      marginTop: 2,
                    }}>
                      KES {targetTier.price.monthly.toLocaleString()}/mo
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </>
  );
}
