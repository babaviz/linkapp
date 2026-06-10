import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors as themeColors, typography, spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Error boundary for the entire onboarding flow
class OnboardingErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Onboarding Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            We couldn’t load onboarding right now. Please close and reopen the app, then try again.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Safe image component with error handling
const SafeImage = ({ 
  source, 
  style, 
  fallbackIcon = 'image',
  resizeMode = 'cover' 
}: { 
  source: any; 
  style: ViewStyle; 
  fallbackIcon?: keyof typeof MaterialIcons.glyphMap;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  if (error || !source) {
    return (
      <View style={[style, styles.imageFallback]}>
        <MaterialIcons name={fallbackIcon} size={32} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, { resizeMode }]}
        onError={() => setError(true)}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      )}
    </View>
  );
};

// Module card component
const ModuleCard = ({
  module,
  isActive,
  onPress,
}: {
  module: ModuleInfo;
  isActive: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.moduleCard,
        isActive && styles.moduleCardActive,
        { borderColor: isActive ? module.color : 'transparent' },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.moduleIconContainer, { backgroundColor: `${module.color}15` }]}>
        <MaterialIcons name={module.icon as any} size={24} color={module.color} />
      </View>
      <Text style={styles.moduleName}>{module.name}</Text>
    </TouchableOpacity>
  );
};

interface IntentOption {
  id: UserIntent;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: readonly [string, string, ...string[]];
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
  gradient: readonly [string, string, ...string[]];
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
    color: '#0284c7',
    gradient: ['#0284c7', '#0369a1'],
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
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
    recommendedModule: 'DateMiMain',
  },
  {
    id: 'explore_all',
    title: 'Explore Everything',
    description: 'I want to see all features',
    icon: 'explore',
    color: themeColors.secondary[500],
    gradient: [themeColors.secondary[500], themeColors.secondary[600]],
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
    color: '#047857',
    gradient: ['#047857', '#10B981'],
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
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
  },
];

const QUICK_TIPS = [
  {
    id: 'navigation',
    title: 'Easy Navigation',
    description: 'Use the bottom tabs to switch between sections quickly',
    icon: 'apps',
    color: '#3B82F6',
  },
  {
    id: 'search',
    title: 'Universal Search',
    description: 'Search across all sections from the search bar',
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
    color: themeColors.secondary[500],
  },
];

const OnboardingScreenContent = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { currentStep, userIntents } = useAppSelector((state) => state.onboarding);
  
  const [localStep, setLocalStep] = useState<OnboardingStep>(currentStep);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const navigateToMainTabs = useCallback(() => {
    navigation.replace('MainTabs');
  }, [navigation]);

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
      setLocalStep(nextStep);
      dispatch(setCurrentStep(nextStep));
    }
  }, [localStep, dispatch]);

  const handleIntentToggle = useCallback((intent: UserIntent) => {
    if (userIntents.includes(intent)) {
      dispatch(removeUserIntent(intent));
    } else {
      dispatch(addUserIntent(intent));
    }
  }, [userIntents, dispatch]);

  const handleSkip = useCallback(async () => {
    if (isCompleting) return;

    try {
      setIsCompleting(true);
      await dispatch(skipOnboarding()).unwrap();
      navigateToMainTabs();
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      setIsCompleting(false);
    }
  }, [dispatch, isCompleting, navigateToMainTabs]);

  const handleComplete = useCallback(async () => {
    if (isCompleting) return;

    try {
      setIsCompleting(true);
      await dispatch(completeOnboarding({ userIntents })).unwrap();
      navigateToMainTabs();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsCompleting(false);
    }
  }, [dispatch, isCompleting, navigateToMainTabs, userIntents]);

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#3B82F6', '#6366F1', '#EF4444'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.welcomeGradient,
          { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6] },
        ]}
      >
        <View style={styles.welcomeIconContainer}>
          <View style={styles.welcomeIconBadge}>
            <MaterialIcons name="link" size={56} color="#FFF" />
          </View>
        </View>

        <Text style={styles.welcomeTitle}>Welcome to LinkApp!</Text>
        <Text style={styles.welcomeSubtitle}>
          Your all-in-one platform for properties, jobs, services, and meaningful connections
        </Text>

        <View style={styles.featureGrid}>
          {[
            { icon: 'home', label: 'Real Estate' },
            { icon: 'work', label: 'Jobs' },
            { icon: 'storefront', label: 'Services' },
            { icon: 'favorite', label: 'Date Mi' },
          ].map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconBg}>
                <MaterialIcons name={feature.icon as any} size={32} color="#FFF" />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNextStep}
          disabled={isCompleting}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={isCompleting}
        >
          <Text style={[styles.skipButtonText, styles.skipButtonTextOnGradient]}>
            Skip introduction
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderRoleSelectionStep = () => (
    <View style={[styles.stepContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>What brings you here?</Text>
        <Text style={styles.stepSubtitle}>
          Select one or more options that match your interests
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
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isSelected
                      ? option.gradient
                      : ([themeColors.surface, themeColors.secondary[100]] as const)
                  }
                  style={styles.intentCardGradient}
                >
                  <View style={[
                    styles.intentIconContainer,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : `${option.color}12` }
                  ]}>
                    <MaterialIcons
                      name={option.icon as any}
                      size={28}
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
                      <MaterialIcons name="check-circle" size={20} color="#FFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, styles.continueButton, userIntents.length === 0 && styles.primaryButtonDisabled]}
          onPress={handleNextStep}
          disabled={userIntents.length === 0 || isCompleting}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>
            Continue {userIntents.length > 0 && `(${userIntents.length} selected)`}
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={isCompleting}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderModuleTourStep = () => {
    const currentModule = MODULES[currentModuleIndex];

    return (
      <View style={[styles.stepContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.tourHeader}>
          <Text style={styles.stepTitle}>Explore LinkApp Sections</Text>
          <Text style={styles.tourProgress}>
            {currentModuleIndex + 1} of {MODULES.length}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.tourContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={currentModule.gradient}
            style={styles.moduleCard}
          >
            <View style={styles.moduleIconContainer}>
              <MaterialIcons name={currentModule.icon as any} size={56} color="#FFF" />
            </View>

            <Text style={styles.moduleName}>{currentModule.name}</Text>
            <Text style={styles.moduleTitle}>{currentModule.title}</Text>
            <Text style={styles.moduleDescription}>{currentModule.description}</Text>

            <View style={styles.featuresList}>
              {currentModule.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={18} color="rgba(255,255,255,0.9)" />
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
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={22} color={currentModuleIndex === 0 ? themeColors.secondary[300] : '#3B82F6'} />
              <Text style={[styles.navButtonText, currentModuleIndex === 0 && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            {currentModuleIndex < MODULES.length - 1 ? (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setCurrentModuleIndex(currentModuleIndex + 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>Next</Text>
                <MaterialIcons name="arrow-forward" size={22} color="#3B82F6" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: '#3B82F6' }]}
                onPress={handleNextStep}
                disabled={isCompleting}
                activeOpacity={0.7}
              >
                <Text style={[styles.navButtonText, { color: '#FFF' }]}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={22} color="#FFF" />
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
                { backgroundColor: index === currentModuleIndex ? currentModule.color : themeColors.secondary[300] }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={isCompleting}
        >
          <Text style={styles.skipButtonText}>Skip Tutorial</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderQuickTipsStep = () => (
    <View style={[styles.stepContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>Quick Tips</Text>
        <Text style={styles.stepSubtitle}>
          Here are some helpful tips to get you started
        </Text>

        <View style={styles.tipsContainer}>
          {QUICK_TIPS.map((tip) => (
            <View key={tip.id} style={styles.tipCard}>
              <View style={[styles.tipIconContainer, { backgroundColor: `${tip.color}15` }]}>
                <MaterialIcons name={tip.icon as any} size={28} color={tip.color} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.readySection}>
          <MaterialIcons name="celebration" size={44} color={themeColors.success} />
          <Text style={styles.readyTitle}>You're All Set!</Text>
          <Text style={styles.readySubtitle}>
            Ready to explore LinkApp and discover amazing opportunities?
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, styles.completeButton]}
          onPress={handleComplete}
          disabled={isCompleting}
          activeOpacity={0.9}
        >
          {isCompleting ? (
            <React.Fragment>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.primaryButtonText}>Starting...</Text>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Text style={styles.primaryButtonText}>Start Exploring</Text>
              <MaterialIcons name="rocket-launch" size={20} color="#FFF" />
            </React.Fragment>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {localStep === 'welcome' && renderWelcomeStep()}
      {localStep === 'role_selection' && renderRoleSelectionStep()}
      {localStep === 'module_tour' && renderModuleTourStep()}
      {localStep === 'quick_tips' && renderQuickTipsStep()}
    </SafeAreaView>
  );
};

const OnboardingScreen = () => {
  return (
    <OnboardingErrorBoundary>
      <OnboardingScreenContent />
    </OnboardingErrorBoundary>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  // Error handling and performance styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    color: '#374151',
  },
  imageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  // Optimized flatlist styles
  flatListContent: {
    paddingHorizontal: 16,
  },
  // Update scrollView to prevent VirtualizedList warning
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing[6],
    paddingBottom: 80,
  },
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  stepContainer: {
    flex: 1,
  },
  
  welcomeGradient: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIconContainer: {
    marginBottom: spacing[8],
  },
  welcomeIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  welcomeTitle: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.inverse,
    textAlign: 'center',
    marginBottom: spacing[4],
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.lg,
    color: themeColors.text.inverse,
    textAlign: 'center',
    marginBottom: spacing[12],
    paddingHorizontal: spacing[5],
    opacity: 0.95,
    lineHeight: typography.fontSize.lg * typography.lineHeight.relaxed,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[4],
    marginBottom: spacing[12],
  },
  featureCard: {
    width: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: spacing[5],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  featureIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  featureLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.inverse,
    textAlign: 'center',
  },

  stepTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.primary,
    marginBottom: spacing[3],
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: typography.fontSize.base,
    color: themeColors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    paddingHorizontal: spacing[2],
  },

  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[8],
  },
  intentCard: {
    width: (SCREEN_WIDTH - spacing[6] * 2 - spacing[3]) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  intentCardSelected: {
    elevation: 6,
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  intentCardGradient: {
    padding: spacing[5],
    minHeight: 150,
    position: 'relative',
  },
  intentIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  intentTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.primary,
    marginBottom: spacing[1],
  },
  intentTitleSelected: {
    color: themeColors.text.inverse,
  },
  intentDescription: {
    fontSize: typography.fontSize.sm,
    color: themeColors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  intentDescriptionSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkmark: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
  },

  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[6],
    paddingBottom: spacing[4],
  },
  tourProgress: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.secondary,
  },
  tourContent: {
    padding: spacing[6],
    paddingTop: 0,
  },
  moduleCard: {
    borderRadius: 20,
    padding: spacing[8],
    alignItems: 'center',
    marginBottom: spacing[6],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  moduleCardActive: {
    borderWidth: 2,
  },
  moduleIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  moduleName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  moduleTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.inverse,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  moduleDescription: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  featuresList: {
    width: '100%',
    gap: spacing[3],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  featureText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: themeColors.text.inverse,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  moduleNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: 12,
    backgroundColor: themeColors.secondary[100],
    flex: 1,
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#3B82F6',
  },
  navButtonTextDisabled: {
    color: themeColors.secondary[400],
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
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
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    padding: spacing[5],
    gap: spacing[4],
    borderWidth: 1,
    borderColor: themeColors.border.light,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tipIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.primary,
    marginBottom: spacing[1],
  },
  tipDescription: {
    fontSize: typography.fontSize.sm,
    color: themeColors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  readySection: {
    alignItems: 'center',
    padding: spacing[8],
    backgroundColor: themeColors.successVariants[50],
    borderRadius: 20,
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: `${themeColors.success}20`,
  },
  readyTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: themeColors.success,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  readySubtitle: {
    fontSize: typography.fontSize.base,
    color: themeColors.successVariants[600],
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: '#3B82F6',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: 12,
    marginTop: spacing[4],
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minHeight: 56,
  },
  primaryButtonDisabled: {
    backgroundColor: themeColors.secondary[300],
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: themeColors.text.inverse,
  },
  continueButton: {
    marginTop: spacing[2],
  },
  completeButton: {
    backgroundColor: themeColors.success,
    shadowColor: themeColors.success,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    marginTop: spacing[4],
  },
  skipButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: themeColors.text.secondary,
  },
  skipButtonTextOnGradient: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.95)',
    textDecorationLine: 'underline',
  },
});
