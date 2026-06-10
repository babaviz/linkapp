import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  setCurrentStep,
  addUserIntent,
  removeUserIntent,
  completeOnboarding,
  skipOnboarding,
  type UserIntent,
  type OnboardingStep,
} from '../../redux/slices/onboardingSlice';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, typography, spacing } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IntentOption {
  id: UserIntent;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  recommendedModule?: string;
}

interface ModuleInfo {
  id: string;
  name: string;
  title: string;
  description: string;
  features: string[];
  icon: string;
  color: string;
  gradient: string[];
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'find_property',
    title: 'Find Property',
    description: 'Looking for a place to rent or buy',
    icon: 'search',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
    recommendedModule: 'PropertyHub',
  },
  {
    id: 'list_property',
    title: 'List Property',
    description: 'I have properties to rent or sell',
    icon: 'home',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2'],
    recommendedModule: 'PropertyHub',
  },
  {
    id: 'find_job',
    title: 'Find Work',
    description: 'Seeking job opportunities',
    icon: 'work-outline',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    recommendedModule: 'JobsMain',
  },
  {
    id: 'post_job',
    title: 'Hire Talent',
    description: 'Looking to post job openings',
    icon: 'business-center',
    color: '#047857',
    gradient: ['#047857', '#065F46'],
    recommendedModule: 'JobsMain',
  },
  {
    id: 'find_service',
    title: 'Find Services',
    description: 'Need services or products',
    icon: 'shopping-cart',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    recommendedModule: 'ServicesMain',
  },
  {
    id: 'offer_service',
    title: 'Offer Services',
    description: 'Provide services to others',
    icon: 'storefront',
    color: '#6366F1',
    gradient: ['#6366F1', '#4F46E5'],
    recommendedModule: 'ServicesMain',
  },
  {
    id: 'dating',
    title: 'Meet People',
    description: 'Connect and build relationships',
    icon: 'favorite',
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
    recommendedModule: 'DateMiMain',
  },
  {
    id: 'explore_all',
    title: 'Explore Everything',
    description: 'I want to see all features',
    icon: 'explore',
    color: '#6B7280',
    gradient: ['#6B7280', '#4B5563'],
  },
];

const MODULES: ModuleInfo[] = [
  {
    id: 'PropertyHub',
    name: 'Real Estate',
    title: 'Find Your Perfect Space',
    description: 'Browse, list, and manage properties with powerful search and filtering.',
    features: [
      'Search properties by location, price, type',
      'Save favorites and get alerts',
      'Contact property owners directly',
      'Post your own listings easily',
    ],
    icon: 'home',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
  },
  {
    id: 'JobsMain',
    name: 'Jobs & Careers',
    title: 'Build Your Career',
    description: 'Discover opportunities or find the perfect candidate for your team.',
    features: [
      'Browse jobs by category and location',
      'Create a skills profile to stand out',
      'Apply and track applications',
      'Post jobs and review candidates',
    ],
    icon: 'work',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'ServicesMain',
    name: 'Services & Marketplace',
    title: 'Discover Services',
    description: 'Find trusted service providers or showcase your own expertise.',
    features: [
      'Wide range of service categories',
      'Read reviews and ratings',
      'Direct messaging with providers',
      'Manage service requests easily',
    ],
    icon: 'storefront',
    color: '#6366F1',
    gradient: ['#6366F1', '#4F46E5'],
  },
  {
    id: 'DateMiMain',
    name: 'Date Mi',
    title: 'Meaningful Connections',
    description: 'Meet like-minded people and build genuine relationships.',
    features: [
      'Smart matching algorithm',
      'Safe and verified profiles',
      'Video calls and messaging',
      'Privacy-focused features',
    ],
    icon: 'favorite',
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
  },
];

const QUICK_TIPS = [
  {
    id: 'navigation',
    title: 'Easy Navigation',
    description: 'Use the bottom tabs to switch between modules quickly',
    icon: 'apps',
    color: '#3B82F6',
  },
  {
    id: 'search',
    title: 'Universal Search',
    description: 'Search across all modules from the search bar',
    icon: 'search',
    color: '#10B981',
  },
  {
    id: 'notifications',
    title: 'Stay Updated',
    description: 'Get notified about messages, matches, and opportunities',
    icon: 'notifications',
    color: '#F59E0B',
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Manage your account and preferences in the Profile tab',
    icon: 'person',
    color: '#6366F1',
  },
];

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentStep, userIntents } = useAppSelector((state) => state.onboarding);
  
  const [localStep, setLocalStep] = useState<OnboardingStep>(currentStep);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.95);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [localStep, fadeAnim, slideAnim, scaleAnim]);

  const handleNextStep = useCallback(() => {
    const stepOrder: OnboardingStep[] = [
      'welcome',
      'role_selection',
      'module_tour',
      'quick_tips',
      'completed',
    ];
    const currentIndex = stepOrder.indexOf(localStep);
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setLocalStep(nextStep);
        dispatch(setCurrentStep(nextStep));
      });
    }
  }, [localStep, dispatch, fadeAnim]);

  const handleIntentToggle = useCallback((intent: UserIntent) => {
    if (userIntents.includes(intent)) {
      dispatch(removeUserIntent(intent));
    } else {
      dispatch(addUserIntent(intent));
    }
  }, [userIntents, dispatch]);

  const handleSkip = useCallback(async () => {
    await dispatch(skipOnboarding());
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  }, [dispatch, navigation]);

  const handleComplete = useCallback(async () => {
    await dispatch(completeOnboarding({ userIntents }));
    
    const recommendedModule = INTENT_OPTIONS.find(
      opt => userIntents.includes(opt.id)
    )?.recommendedModule;

    if (recommendedModule && recommendedModule !== 'MainTabs') {
      navigation.reset({
        index: 0,
        routes: [
          { name: 'MainTabs' },
        ],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  }, [dispatch, navigation, userIntents]);

  const renderWelcomeStep = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeGradient}
      >
        <View style={styles.welcomeIconContainer}>
          <MaterialIcons name="waving-hand" size={80} color="#FFF" />
        </View>
        
        <Text style={styles.welcomeTitle}>Welcome to LinkApp!</Text>
        <Text style={styles.welcomeSubtitle}>
          Your all-in-one platform for properties, jobs, services, and meaningful connections
        </Text>

        <View style={styles.featureGrid}>
          {[
            { icon: 'home', label: 'Real Estate', color: '#3B82F6' },
            { icon: 'work', label: 'Jobs', color: '#10B981' },
            { icon: 'storefront', label: 'Services', color: '#6366F1' },
            { icon: 'favorite', label: 'Date Mi', color: '#EC4899' },
          ].map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={[styles.featureIconBg, { backgroundColor: `${feature.color}20` }]}>
                <MaterialIcons name={feature.icon as any} size={32} color={feature.color} />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip Introduction</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderRoleSelectionStep = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>What brings you here?</Text>
        <Text style={styles.stepSubtitle}>
          Select one or more options that match your interests (you can explore all features anytime)
        </Text>

        <View style={styles.intentGrid}>
          {INTENT_OPTIONS.map((option) => {
            const isSelected = userIntents.includes(option.id);
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.intentCard,
                  isSelected && styles.intentCardSelected,
                ]}
                onPress={() => handleIntentToggle(option.id)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isSelected ? option.gradient : ['#F9FAFB', '#F3F4F6']}
                  style={styles.intentCardGradient}
                >
                  <View style={[
                    styles.intentIconContainer,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${option.color}15` }
                  ]}>
                    <MaterialIcons
                      name={option.icon as any}
                      size={32}
                      color={isSelected ? '#FFF' : option.color}
                    />
                  </View>
                  <Text style={[
                    styles.intentTitle,
                    isSelected && styles.intentTitleSelected
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={[
                    styles.intentDescription,
                    isSelected && styles.intentDescriptionSelected
                  ]}>
                    {option.description}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <MaterialIcons name="check-circle" size={24} color="#FFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, styles.continueButton]}
          onPress={handleNextStep}
          disabled={userIntents.length === 0}
        >
          <Text style={styles.primaryButtonText}>
            Continue ({userIntents.length} selected)
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  const renderModuleTourStep = () => {
    const currentModule = MODULES[currentModuleIndex];
    
    return (
      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
        <View style={styles.tourHeader}>
          <Text style={styles.stepTitle}>Explore LinkApp Modules</Text>
          <Text style={styles.tourProgress}>
            {currentModuleIndex + 1} of {MODULES.length}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.tourContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={currentModule.gradient}
            style={styles.moduleCard}
          >
            <View style={styles.moduleIconContainer}>
              <MaterialIcons name={currentModule.icon as any} size={64} color="#FFF" />
            </View>
            
            <Text style={styles.moduleName}>{currentModule.name}</Text>
            <Text style={styles.moduleTitle}>{currentModule.title}</Text>
            <Text style={styles.moduleDescription}>{currentModule.description}</Text>

            <View style={styles.featuresList}>
              {currentModule.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <View style={styles.moduleNavigation}>
            <TouchableOpacity
              style={[styles.navButton, currentModuleIndex === 0 && styles.navButtonDisabled]}
              onPress={() => setCurrentModuleIndex(Math.max(0, currentModuleIndex - 1))}
              disabled={currentModuleIndex === 0}
            >
              <MaterialIcons name="arrow-back" size={24} color={currentModuleIndex === 0 ? '#9CA3AF' : '#3B82F6'} />
              <Text style={[styles.navButtonText, currentModuleIndex === 0 && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            {currentModuleIndex < MODULES.length - 1 ? (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setCurrentModuleIndex(currentModuleIndex + 1)}
              >
                <Text style={styles.navButtonText}>Next</Text>
                <MaterialIcons name="arrow-forward" size={24} color="#3B82F6" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, styles.navButton]}
                onPress={handleNextStep}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.dotsContainer}>
          {MODULES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentModuleIndex && styles.dotActive,
                { backgroundColor: index === currentModuleIndex ? currentModule.color : '#D1D5DB' }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip Tutorial</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderQuickTipsStep = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>Quick Tips</Text>
        <Text style={styles.stepSubtitle}>
          Here are some helpful tips to get you started
        </Text>

        <View style={styles.tipsContainer}>
          {QUICK_TIPS.map((tip, index) => (
            <View key={tip.id} style={styles.tipCard}>
              <View style={[styles.tipIconContainer, { backgroundColor: `${tip.color}15` }]}>
                <MaterialIcons name={tip.icon as any} size={32} color={tip.color} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.readySection}>
          <MaterialIcons name="celebration" size={48} color="#10B981" />
          <Text style={styles.readyTitle}>You're All Set!</Text>
          <Text style={styles.readySubtitle}>
            Ready to explore LinkApp and discover amazing opportunities?
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, styles.completeButton]}
          onPress={handleComplete}
        >
          <Text style={styles.primaryButtonText}>Start Exploring</Text>
          <MaterialIcons name="rocket-launch" size={20} color="#FFF" />
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {localStep === 'welcome' && renderWelcomeStep()}
      {localStep === 'role_selection' && renderRoleSelectionStep()}
      {localStep === 'module_tour' && renderModuleTourStep()}
      {localStep === 'quick_tips' && renderQuickTipsStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stepContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  
  welcomeGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIconContainer: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
    opacity: 0.95,
    lineHeight: 26,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 48,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featureIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },

  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  intentCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  intentCardSelected: {
    elevation: 8,
    shadowOpacity: 0.25,
  },
  intentCardGradient: {
    padding: 20,
    minHeight: 160,
    position: 'relative',
  },
  intentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  intentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  intentTitleSelected: {
    color: '#FFFFFF',
  },
  intentDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  intentDescriptionSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  tourProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tourContent: {
    padding: 24,
    paddingTop: 0,
  },
  moduleCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  moduleIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  moduleTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  moduleDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  moduleNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },

  tipsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  readySection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    marginBottom: 24,
  },
  readyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 16,
    color: '#059669',
    textAlign: 'center',
    lineHeight: 24,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  continueButton: {
    marginTop: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});
