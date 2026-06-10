/**
 * Enhanced Verification Complete Modal
 * Beautiful UI for verification success in Date Mi
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import Material3Button from '../common/Material3Button';

interface VerificationCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  verificationType?: 'age' | 'photo' | 'identity';
  userName?: string;
  onContinue?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function VerificationCompleteModal({
  visible,
  onClose,
  verificationType = 'age',
  userName = 'User',
  onContinue,
}: VerificationCompleteModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Animate checkmark after modal appears
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          tension: 50,
          friction: 5,
          delay: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkmarkAnim.setValue(0);
    }
  }, [visible]);

  const getVerificationContent = () => {
    switch (verificationType) {
      case 'age':
        return {
          icon: 'verified-user',
          title: 'Age Verification Complete!',
          subtitle: `Welcome to Date Mi, ${userName}!`,
          description: 'Your age has been verified. You can now access all features and start matching with amazing people.',
          benefits: [
            '✓ Full access to all profiles',
            '✓ Unlimited matching',
            '✓ Enhanced security features',
            '✓ Verified badge on your profile',
          ],
        };
      case 'photo':
        return {
          icon: 'camera-alt',
          title: 'Photo Verification Complete!',
          subtitle: 'Your profile is now verified',
          description: 'Your photos have been verified. Other users will see a verified badge on your profile.',
          benefits: [
            '✓ Verified badge on profile',
            '✓ Higher match rate',
            '✓ Increased trust score',
            '✓ Priority in search results',
          ],
        };
      case 'identity':
        return {
          icon: 'badge',
          title: 'Identity Verified!',
          subtitle: 'Premium verification complete',
          description: 'Your identity has been fully verified. Enjoy enhanced trust and premium features.',
          benefits: [
            '✓ Premium verified badge',
            '✓ Top priority in matches',
            '✓ Access to exclusive features',
            '✓ Enhanced profile visibility',
          ],
        };
      default:
        return {
          icon: 'check-circle',
          title: 'Verification Complete!',
          subtitle: 'Welcome to Date Mi',
          description: 'Your verification is complete. Start exploring and matching!',
          benefits: [],
        };
    }
  };

  const content = getVerificationContent();

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView
        intensity={30}
        tint="dark"
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#6B46C1', '#553C9A', '#4A2F8C']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Success Animation Container */}
            <View style={styles.animationContainer}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [
                      { scale: checkmarkAnim },
                      {
                        rotate: checkmarkAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.successCircle}
                >
                  <MaterialIcons name="check" size={60} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              
              {/* Animated rings */}
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.ring,
                    {
                      opacity: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.3 - index * 0.1],
                      }),
                      transform: [
                        {
                          scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1 + index * 0.3],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
              <MaterialIcons
                name={content.icon as any}
                size={32}
                color="#FFFFFF"
                style={styles.contentIcon}
              />
              
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.subtitle}>{content.subtitle}</Text>
              
              <View style={styles.descriptionContainer}>
                <Text style={styles.description}>{content.description}</Text>
              </View>

              {/* Benefits List */}
              {content.benefits.length > 0 && (
                <View style={styles.benefitsContainer}>
                  {content.benefits.map((benefit, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.benefitItem,
                        {
                          opacity: fadeAnim,
                          transform: [
                            {
                              translateX: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-20, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </Animated.View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={handleContinue}
                  style={styles.primaryButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryButtonText}>
                      {onContinue ? 'Continue' : 'Start Matching'}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.secondaryButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Decorative elements */}
            <View style={styles.decoration1} />
            <View style={styles.decoration2} />
            <View style={styles.decoration3} />
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradientBackground: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    position: 'relative',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    height: 120,
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contentContainer: {
    alignItems: 'center',
  },
  contentIcon: {
    marginBottom: 12,
    opacity: 0.9,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 16,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    paddingVertical: 6,
  },
  benefitText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  decoration1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decoration2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  decoration3: {
    position: 'absolute',
    top: 100,
    left: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});
