import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import type { TextInput as TextInputType } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaystackProvider } from 'react-native-paystack-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { 
  paystackService, 
  COUNTRY_CONFIGS, 
  SubscriptionPricing
} from '../../services/paystackService';
import countryDetectionService, { SupportedCountry } from '../../services/countryDetectionService';
import { ENV } from '../../config/environment';
import { colors } from '../../src/theme/colors';
import { Dialog } from '../common/Dialog';
import { WebView } from 'react-native-webview';

// Firebase service types for safe lazy loading
interface FirebaseAnalyticsService {
  trackPaymentInitiated: (tier: string, cycle: string, price: number, currency: string) => Promise<void>;
  trackPaymentFailed: (tier: string, cycle: string, reason: string) => Promise<void>;
  trackSubscriptionPurchase: (params: {
    tier: string;
    duration: string;
    price: number;
    currency: string;
    transaction_id: string;
    payment_method: string;
    country: string;
  }) => Promise<void>;
  trackRevenue: (amount: number, currency: string, source: string) => Promise<void>;
  updateSubscriptionTier: (tier: string) => Promise<void>;
}

interface FirebasePerformanceService {
  trackPaymentProcessing: (tier: string, cycle: string) => Promise<void>;
  completePaymentProcessing: (tier: string, cycle: string, success: boolean) => Promise<void>;
}

// Safely import Firebase services
let firebaseAnalyticsService: FirebaseAnalyticsService | null = null;
let firebasePerformanceService: FirebasePerformanceService | null = null;
try {
  firebaseAnalyticsService = require('../../services/firebaseAnalyticsService').default;
  firebasePerformanceService = require('../../services/firebasePerformanceService').default;
} catch {
  // Firebase not available
}

interface PaystackCheckoutProps {
  visible: boolean;
  tier: 'pro' | 'premium';
  billingCycle: 'monthly' | 'yearly';
  featurePackage?: 'messaging' | 'voice_call' | 'video_call';
  onClose: () => void;
  onSuccess: (reference: string) => void;
  onError?: (error: string) => void;
}

const PaystackCheckoutContent: React.FC<PaystackCheckoutProps> = ({
  visible,
  tier,
  billingCycle,
  featurePackage,
  onClose,
  onSuccess,
  onError,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  // Removed direct popup usage; using authorization_url WebView flow
  
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>('KE');
  const [countryDetected, setCountryDetected] = useState(false);
  const [detectionMethod, setDetectionMethod] = useState<string>('');
  const [pricing, setPricing] = useState<SubscriptionPricing | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStage, setPaymentStage] = useState<'idle' | 'initializing' | 'verifying' | 'retrying'>('idle');
  const [detectingCountry, setDetectingCountry] = useState(true);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ visible: boolean; title: string; message: string }>({ 
    visible: false, 
    title: '', 
    message: '' 
  });
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [webviewVisible, setWebviewVisible] = useState(false);
  const [webviewProgress, setWebviewProgress] = useState(0);
  const [currentReference, setCurrentReference] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [emailInputError, setEmailInputError] = useState('');
  const emailInputRef = useRef<TextInputType | null>(null);

  const countryConfig = paystackService.getCountryConfig(selectedCountry);
  const paymentMethods = paystackService.getPaymentMethods(selectedCountry);
  const [retryAttempted, setRetryAttempted] = useState(false);

  useEffect(() => {
    if (webviewVisible) {
      setWebviewProgress(0);
    }
  }, [webviewVisible, authUrl]);

  const getProcessingCopy = (): { title: string; message: string; progress: number } => {
    switch (paymentStage) {
      case 'verifying':
        return {
          title: 'Verifying payment…',
          message: 'Please wait while we confirm your payment. This usually takes a few seconds.',
          progress: 0.7,
        };
      case 'retrying':
        return {
          title: 'Restarting checkout…',
          message: 'Refreshing your payment session.',
          progress: 0.5,
        };
      case 'initializing':
      default:
        return {
          title: 'Starting secure checkout…',
          message: 'Preparing your payment link.',
          progress: 0.35,
        };
    }
  };


  useEffect(() => {
    const detectCountry = async () => {
      setDetectingCountry(true);
      try {
        const result = await countryDetectionService.detectUserCountry(user?.id);
        setSelectedCountry(result.countryCode);
        setCountryDetected(true);
        setDetectionMethod(result.detectionMethod);
        
        if (result.confidence === 'low') {
          setErrorDialog({
            visible: true,
            title: 'Country Detection',
            message: `We couldn't detect your location precisely. Defaulted to ${result.countryName || 'Kenya'}. You can change this below.`
          });
        }
      } catch {
        setSelectedCountry('KE');
        setCountryDetected(true);
      } finally {
        setDetectingCountry(false);
      }
    };
    
    if (visible && user) {
      detectCountry();
    }
  }, [visible, user]);

  const checkoutTier: 'pro' | 'premium' = featurePackage ? 'pro' : tier;
  const checkoutBillingCycle: 'monthly' | 'yearly' = featurePackage ? 'monthly' : billingCycle;
  
  useEffect(() => {
    const newPricing = paystackService.getSubscriptionPricing(checkoutTier, checkoutBillingCycle, selectedCountry);
    setPricing(newPricing);
  }, [checkoutTier, checkoutBillingCycle, selectedCountry]);
  
  const getFeaturePackageLabel = useCallback((): string => {
    if (!featurePackage) return '';
    if (featurePackage === 'messaging') return 'Messaging Only';
    if (featurePackage === 'voice_call') return 'Voice Calls Only';
    return 'Video Calls Only';
  }, [featurePackage]);
  
  const getCheckoutFeatures = useCallback((): string[] => {
    if (!featurePackage) {
      return paystackService.getSubscriptionFeatures(checkoutTier);
    }
    
    switch (featurePackage) {
      case 'messaging':
        return [
          '✅ Unlimited DateMi messaging',
          '🔒 Voice calls sold separately',
          '🔒 Video calls sold separately',
        ];
      case 'voice_call':
        return [
          '✅ Unlimited DateMi voice calls',
          '🔒 Messaging sold separately',
          '🔒 Video calls sold separately',
        ];
      case 'video_call':
        return [
          '✅ Unlimited DateMi video calls',
          '🔒 Messaging sold separately',
          '🔒 Voice calls sold separately',
        ];
      default:
        return [];
    }
  }, [featurePackage, checkoutTier]);

  const isValidEmail = (email: string): boolean => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail);
  };

  const normalizeEmailForPayment = (rawEmail: string): string => {
    const trimmed = rawEmail.trim();
    if (!trimmed) {
      return trimmed;
    }

    const lower = trimmed.toLowerCase();

    // Some payment processors (including Paystack) reject test/demo domains like .test
    // For those special cases (e.g. Play Store reviewer accounts), fall back to a safe internal email
    if (lower.endsWith('.test') || lower.includes('@linkapp.test')) {
      return 'support@link-app.co';
    }

    return trimmed;
  };

  useEffect(() => {
    if (visible && user && (!user.email || !isValidEmail(user.email))) {
      // Pre-fill with user's email if they have one so they can edit it
      if (user.email) {
        setTempEmail(user.email);
      }
    }
  }, [visible, user]);

  useEffect(() => {
    // After showing an email-related error and dismissing the dialog,
    // automatically focus the email field so the keyboard stays open for editing
    if (!errorDialog.visible && emailInputError && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [errorDialog.visible, emailInputError]);

  const handleInitiatePayment = async () => {
    if (!user || !pricing) {
      setErrorDialog({
        visible: true,
        title: 'Error',
        message: 'Unable to process payment. Please try again.'
      });
      return;
    }

    const emailToUse = tempEmail.trim() || user.email || '';

    if (!emailToUse || emailToUse === '') {
      setEmailInputError('Email address is required for payment');
      setErrorDialog({
        visible: true,
        title: 'Email Required',
        message: 'Please enter your email address to proceed with payment.'
      });
      return;
    }

    if (!isValidEmail(emailToUse)) {
      setEmailInputError('Please enter a valid email address (for example name@gmail.com)');
      setErrorDialog({
        visible: true,
        title: 'Invalid Email',
        message: 'Please use a valid email address so we can send your payment receipt.'
      });
      return;
    }

    if (loading) {
      return;
    }
    
    setEmailInputError('');

    // Check if Paystack is configured
    if (!ENV.PAYSTACK?.PUBLIC_KEY || !ENV.PAYSTACK?.SECRET_KEY) {
      setErrorDialog({
        visible: true,
        title: 'Configuration Error',
        message: 'Payment gateway is not configured. Please contact support.'
      });
      return;
    }

    // Validate production keys are being used (not test keys)
    const isProduction = ENV.APP_ENV === 'production';
    const publicKey = ENV.PAYSTACK?.PUBLIC_KEY || '';
    const secretKey = ENV.PAYSTACK?.SECRET_KEY || '';
    
    if (isProduction) {
      const isTestPublicKey = publicKey.startsWith('pk_test_');
      const isTestSecretKey = secretKey.startsWith('sk_test_');
      
      if (isTestPublicKey || isTestSecretKey) {
        setErrorDialog({
          visible: true,
          title: 'Payment Configuration Error',
          message:
            'This build is using Paystack TEST keys (pk_test_ / sk_test_). ' +
            'For production and Play Store review, set EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY and ' +
            'EXPO_PUBLIC_PAYSTACK_SECRET_KEY to your LIVE keys (pk_live_ / sk_live_) and rebuild.'
        });
        return;
      }
      
      // Ensure live keys are present
      if (!publicKey.startsWith('pk_live_') || !secretKey.startsWith('sk_live_')) {
        setErrorDialog({
          visible: true,
          title: 'Payment Configuration Error',
          message: 'Invalid payment gateway configuration. Please contact support.'
        });
        return;
      }
    }

    setPaymentStage('initializing');
    setLoading(true);
    
    if (firebaseAnalyticsService) {
      try {
        await firebaseAnalyticsService.trackPaymentInitiated(
          featurePackage ? `datemi_${featurePackage}` : tier,
          checkoutBillingCycle,
          pricing.localPrice,
          pricing.currency
        );
      } catch {
        // Silently handle Firebase errors
      }
    }
    
    if (firebasePerformanceService) {
      try {
        await firebasePerformanceService.trackPaymentProcessing(
          featurePackage ? `datemi_${featurePackage}` : tier,
          checkoutBillingCycle
        );
      } catch {
        // Silently handle Firebase errors
      }
    }
    
    try {
      const availableChannels = paymentMethods.map(m => m.channels).flat();
      const paymentEmail = normalizeEmailForPayment(emailToUse);
      
      const result = await paystackService.initializeTransaction(
        user.id,
        paymentEmail,
        checkoutTier,
        checkoutBillingCycle,
        selectedCountry,
        availableChannels.length > 0 ? availableChannels.join(',') : undefined,
        featurePackage ? { productType: 'datemi_feature_package', featurePackage } : undefined
      );

      if (result.status && result.data.authorization_url && result.data.reference) {
        setAuthUrl(result.data.authorization_url);
        setCurrentReference(result.data.reference);
        setWebviewVisible(true);
        setPaymentStage('idle');
        setLoading(false);
      } else {
        throw new Error(result.message || 'Failed to initialize payment');
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      let errorMessage = errorObj.message || 'Failed to initialize payment';
      
      // Check for specific error types
      if (errorMessage.includes('Invalid Email')) {
        errorMessage = 'The email address is not accepted by the payment processor. Please use a real email address (Gmail, Yahoo, Outlook, etc.).';
        setEmailInputError('Please use a real email address');
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('Paystack initialization failed')) {
        // Extract the actual error from Paystack if available
        const match = errorMessage.match(/Paystack initialization failed: (.+)/);
        if (match) {
          errorMessage = `Payment gateway error: ${match[1]}. Please try again or contact support.`;
        }
      }
      
      if (firebaseAnalyticsService) {
        try {
          await firebaseAnalyticsService.trackPaymentFailed(
            featurePackage ? `datemi_${featurePackage}` : tier,
            checkoutBillingCycle,
            errorMessage
          );
        } catch {
          // Silently handle Firebase errors
        }
      }
      
      if (firebasePerformanceService) {
        try {
          await firebasePerformanceService.completePaymentProcessing(
            featurePackage ? `datemi_${featurePackage}` : tier,
            checkoutBillingCycle,
            false
          );
        } catch {
          // Silently handle Firebase errors
        }
      }
      
      setErrorDialog({
        visible: true,
        title: 'Payment Error',
        message: errorMessage
      });
      onError?.(errorMessage);
      setPaymentStage('idle');
      setLoading(false);
    }
  };

  const handlePaystackSuccess = useCallback(async (response: { reference?: string; transactionRef?: string; trans?: string; status?: string }) => {
    setPaymentStage('verifying');
    setLoading(true);
    
    try {
      const reference = response.reference || response.transactionRef || response.trans;
      
      if (!reference) {
        throw new Error('No transaction reference received');
      }
      
      const verification = await paystackService.verifyTransaction(reference);
      
      if (verification.status && verification.data.status === 'success') {
        // Best-effort analytics/performance tracking (never block payment success UX)
        if (pricing && firebaseAnalyticsService) {
          try {
            await firebaseAnalyticsService.trackSubscriptionPurchase({
              tier: featurePackage ? `datemi_${featurePackage}` : tier,
              duration: checkoutBillingCycle,
              price: pricing.localPrice,
              currency: pricing.currency,
              transaction_id: reference,
              payment_method: 'paystack',
              country: selectedCountry,
            });

            await firebaseAnalyticsService.trackRevenue(
              pricing.localPrice,
              pricing.currency,
              featurePackage ? 'datemi_feature_package' : 'subscription'
            );

            // Only update subscription tier analytics when purchasing a tier.
            if (!featurePackage) {
              await firebaseAnalyticsService.updateSubscriptionTier(tier);
            }
          } catch {
            // Non-blocking
          }
        }

        if (firebasePerformanceService) {
          try {
            await firebasePerformanceService.completePaymentProcessing(
              featurePackage ? `datemi_${featurePackage}` : tier,
              checkoutBillingCycle,
              true
            );
          } catch {
            // Non-blocking
          }
        }
        
        onSuccess(reference);
        onClose();
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      
      if (firebaseAnalyticsService) {
        try {
          await firebaseAnalyticsService.trackPaymentFailed(
            featurePackage ? `datemi_${featurePackage}` : tier,
            checkoutBillingCycle,
            errorMessage
          );
        } catch {
          // Non-blocking
        }
      }

      if (firebasePerformanceService) {
        try {
          await firebasePerformanceService.completePaymentProcessing(
            featurePackage ? `datemi_${featurePackage}` : tier,
            checkoutBillingCycle,
            false
          );
        } catch {
          // Non-blocking
        }
      }
      
      setErrorDialog({
        visible: true,
        title: 'Verification Error',
        message: 'Payment received but verification failed. Please contact support.'
      });
      
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      setPaymentStage('idle');
    }
  }, [tier, checkoutBillingCycle, pricing, selectedCountry, featurePackage, onSuccess, onError, onClose]);

  const handlePaystackClose = useCallback(async () => {
    setLoading(false);
    setPaymentStage('idle');
    
    // Fallback: if the user closed the checkout but Paystack already processed the payment,
    // verify using the last known reference so entitlements activate immediately.
    if (currentReference) {
      try {
        const verification = await paystackService.verifyTransaction(currentReference);
        if (verification.status && verification.data.status === 'success') {
          onSuccess(currentReference);
          onClose();
          return;
        }
      } catch {
        // Ignore and treat as cancellation below.
      }
    }

    if (firebaseAnalyticsService) {
      try {
        await firebaseAnalyticsService.trackPaymentFailed(
          featurePackage ? `datemi_${featurePackage}` : tier,
          checkoutBillingCycle,
          'user_cancelled'
        );
      } catch {
        // Non-blocking
      }
    }

    if (firebasePerformanceService) {
      try {
        await firebasePerformanceService.completePaymentProcessing(
          featurePackage ? `datemi_${featurePackage}` : tier,
          checkoutBillingCycle,
          false
        );
      } catch {
        // Non-blocking
      }
    }
  }, [checkoutBillingCycle, currentReference, featurePackage, onClose, onSuccess, tier]);

  const handlePaystackError = useCallback(async (error: { message?: string }) => {
    const errorMessageRaw = (error?.message || '').toLowerCase();

    // Automatically retry once on duplicate reference/session errors
    if ((errorMessageRaw.includes('duplicate') || errorMessageRaw.includes('reference')) && !retryAttempted && user && pricing) {
      setRetryAttempted(true);
      let retried = false;
      try {
        setPaymentStage('retrying');
        setLoading(true);
        const rawEmail = tempEmail.trim() || user.email || '';
        const emailToUse = normalizeEmailForPayment(rawEmail);
        const availableChannels = paymentMethods.map(m => m.channels).flat();
        const retryResult = await paystackService.initializeTransaction(
          user.id,
          emailToUse,
          checkoutTier,
          checkoutBillingCycle,
          selectedCountry,
          availableChannels.length > 0 ? availableChannels.join(',') : undefined,
          featurePackage ? { productType: 'datemi_feature_package', featurePackage } : undefined
        );

        if (retryResult.status && retryResult.data.authorization_url && retryResult.data.reference) {
          setAuthUrl(retryResult.data.authorization_url);
          setCurrentReference(retryResult.data.reference);
          setWebviewVisible(true);
          retried = true;
          return;
        }
      } catch {
        // Fall through to show error dialog below
      } finally {
        // Keep loading active if we successfully re-launched checkout
        // to avoid duplicate button presses; only clear if retry did not proceed
        if (retried === false) {
          setLoading(false);
          setPaymentStage('idle');
        }
      }
    }
    
    const errorMessage = error?.message || 'Payment failed';

    if (firebaseAnalyticsService) {
      try {
        await firebaseAnalyticsService.trackPaymentFailed(
          featurePackage ? `datemi_${featurePackage}` : tier,
          checkoutBillingCycle,
          errorMessage
        );
      } catch {
        // Non-blocking
      }
    }

    if (firebasePerformanceService) {
      try {
        await firebasePerformanceService.completePaymentProcessing(
          featurePackage ? `datemi_${featurePackage}` : tier,
          checkoutBillingCycle,
          false
        );
      } catch {
        // Non-blocking
      }
    }
    
    setErrorDialog({
      visible: true,
      title: 'Payment Error',
      message: errorMessage.toLowerCase().includes('duplicate')
        ? 'Payment session expired. Please try again.'
        : errorMessage
    });
    
    onError?.(errorMessage);
    setLoading(false);
    setPaymentStage('idle');
  }, [
    retryAttempted,
    user,
    pricing,
    tier,
    checkoutTier,
    checkoutBillingCycle,
    featurePackage,
    selectedCountry,
    onError,
    paymentMethods,
    tempEmail,
  ]);

  const handleWebViewNavChange = useCallback((navState: { url: string }) => {
    const url = navState?.url || '';
    if (!url) return;

    const successPrefix = `${ENV.APP_URL}/subscription/success`;
    const successPath = '/subscription/success';
    if (url.startsWith(successPrefix) || url.includes(successPath)) {
      // Extract reference from query params (RN-safe parser)
      let referenceFromUrl: string | undefined;
      const qsIndex = url.indexOf('?');
      if (qsIndex >= 0) {
        const queryString = url.substring(qsIndex + 1);
        const pairs = queryString.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key === 'reference' && value) {
            referenceFromUrl = decodeURIComponent(value);
            break;
          }
        }
      } else {
        const match = url.match(/[?&]reference=([^&]+)/);
        referenceFromUrl = match ? decodeURIComponent(match[1]) : undefined;
      }

      const ref = referenceFromUrl || currentReference || undefined;
      setWebviewVisible(false);
      if (ref) {
        handlePaystackSuccess({ reference: ref });
      } else {
        handlePaystackError({ message: 'Payment completed but no reference returned' });
      }
    }
  }, [currentReference, handlePaystackSuccess, handlePaystackError]);

  const CountrySelector = () => {
    const getCountryFlag = () => {
      switch (selectedCountry) {
        case 'KE': return '🇰🇪';
        case 'UG': return '🇺🇬';
        case 'TZ': return '🇹🇿';
        case 'OTHER': return '🌍';
        default: return '🇰🇪';
      }
    };

    return (
      <View>
        {detectingCountry ? (
          <View style={styles.detectingContainer}>
            <ActivityIndicator size="small" color={colors.modules.dating.primary.main} />
            <Text style={styles.detectingText}>Detecting your location...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={() => setShowCountryPicker(true)}
          >
            <View style={styles.countrySelectorContent}>
              <Text style={styles.countryFlag}>{getCountryFlag()}</Text>
              <View style={styles.countryTextContainer}>
                <Text style={styles.countryName}>{countryConfig.name}</Text>
                {countryDetected && detectionMethod && (
                  <Text style={styles.detectionLabel}>
                    Detected via {detectionMethod === 'gps' ? 'GPS' : detectionMethod === 'ip' ? 'IP' : 'stored preference'}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-down" size={24} color={colors.common.text.primary} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const PaymentMethodSelector = () => (
    <View style={styles.paymentMethodsContainer}>
      <Text style={styles.sectionTitle}>Available Payment Methods</Text>
      <Text style={styles.paymentMethodNote}>
        You'll select your preferred payment method on the next screen
      </Text>
      <View style={styles.paymentMethodsList}>
        {paymentMethods.map((method) => (
          <View
            key={method.provider}
            style={styles.paymentMethodDisplay}
          >
            <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
            <Text style={styles.paymentMethodDisplayName}>{method.displayName}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const PricingDisplay = () => (
    <View style={styles.pricingContainer}>
      <View style={styles.pricingCard}>
        <Text style={styles.tierName}>
          {featurePackage ? getFeaturePackageLabel() : `${checkoutTier.toUpperCase()} Plan`}
        </Text>
        <Text style={styles.billingCycle}>
          {checkoutBillingCycle === 'monthly' ? 'Monthly' : 'Annual'} Billing
        </Text>
        <Text style={styles.price}>{pricing?.formattedPrice}</Text>
        {checkoutBillingCycle === 'yearly' && (
          <Text style={styles.savings}>
            Save 17% with annual billing!
          </Text>
        )}
      </View>
      
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>What's included:</Text>
        {getCheckoutFeatures().map((feature, index) => (
          <Text key={index} style={styles.featureItem}>{feature}</Text>
        ))}
      </View>
    </View>
  );

  const handleEmailChange = useCallback((text: string) => {
    setTempEmail(text);
    if (emailInputError) {
      setEmailInputError('');
    }
  }, [emailInputError]);

  const EmailInputSection = React.memo(() => {
    // Show if user has no email, has an invalid email, or we have an email validation error
    const shouldShow = !!emailInputError || !user?.email || (user.email ? !isValidEmail(user.email) : false);
    
    if (!shouldShow) return null;

    return (
      <TouchableWithoutFeedback onPress={() => emailInputRef.current?.focus()}>
        <View style={styles.emailRequiredSection}>
          <View style={styles.emailRequiredHeader}>
            <MaterialCommunityIcons name="email-alert" size={24} color={colors.modules.dating.primary.main} />
            <Text style={styles.emailRequiredTitle}>Email Required</Text>
          </View>
          <Text style={styles.emailRequiredText}>
            Please enter your email address to complete the payment.
          </Text>
          
          <View style={styles.emailInputWrapper}>
            <TextInput
              ref={emailInputRef}
              style={[
                styles.emailInputField,
                emailInputError ? styles.emailInputFieldError : null
              ]}
              placeholder="your.email@gmail.com"
              placeholderTextColor={colors.common.text.secondary}
              value={tempEmail}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
            />
          </View>
          
          {emailInputError ? (
            <View style={styles.emailErrorRow}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.emailErrorText}>{emailInputError}</Text>
            </View>
          ) : null}
        </View>
      </TouchableWithoutFeedback>
    );
  });

  const CountryPickerModal = () => {
    const modalInsets = useSafeAreaInsets();
    
    const handleCountrySelect = async (code: SupportedCountry) => {
      setSelectedCountry(code);
      setShowCountryPicker(false);
      
      if (user?.id) {
        await countryDetectionService.setManualCountry(user.id, code);
        setDetectionMethod('manual');
      }
    };

    return (
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContentContainer} edges={['bottom']}>
            <View style={[styles.modalContent, { paddingBottom: modalInsets.bottom }]}>
              <Text style={styles.modalTitle}>Select Your Country</Text>
              <Text style={styles.modalSubtitle}>
                Choose your country to see available payment methods
              </Text>
              {countryDetectionService.getSupportedCountries().map((country) => {
                const config = COUNTRY_CONFIGS[country.code] || COUNTRY_CONFIGS['OTHER'];
                return (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryOption,
                      selectedCountry === country.code && styles.selectedCountryOption
                    ]}
                    onPress={() => handleCountrySelect(country.code)}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <View style={styles.countryInfo}>
                      <Text style={styles.countryOptionName}>{country.name}</Text>
                      <Text style={styles.countryCurrency}>
                        {country.code === 'OTHER' 
                          ? 'International cards accepted (USD)'
                          : `Currency: ${config.currencySymbol} (${config.currency})`
                        }
                      </Text>
                    </View>
                    {selectedCountry === country.code && (
                      <MaterialCommunityIcons name="check" size={24} color={colors.modules.dating.primary.main} />
                    )}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCountryPicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={28} color={colors.common.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{featurePackage ? 'Complete Your Purchase' : 'Complete Your Subscription'}</Text>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <CountrySelector />
          {pricing && <PricingDisplay />}
          <EmailInputSection />
          <PaymentMethodSelector />

          <View style={styles.securityNote}>
            <MaterialCommunityIcons name="lock" size={20} color={colors.common.text.secondary} />
            <Text style={styles.securityText}>
              Your payment information is secure and encrypted
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.payButton,
              loading && styles.payButtonDisabled
            ]}
            onPress={handleInitiatePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <MaterialCommunityIcons name="lock" size={28} color="#fff" />
                <Text style={styles.payButtonText}>
                  Pay {pricing?.formattedPrice || ''}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>

        <CountryPickerModal />
      </SafeAreaView>

      {/* Payment processing overlay (improves perceived performance & reduces anxiety) */}
      {loading && paymentStage !== 'idle' && !webviewVisible && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="small" color={colors.modules.dating.primary.main} />
            <Text style={styles.processingTitle}>{getProcessingCopy().title}</Text>
            <Text style={styles.processingMessage}>{getProcessingCopy().message}</Text>
            <View style={styles.processingProgressTrack}>
              <View
                style={[
                  styles.processingProgressFill,
                  { width: `${Math.round(getProcessingCopy().progress * 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* Paystack Authorization WebView */}
      {webviewVisible && authUrl && (
        <View style={StyleSheet.absoluteFillObject}>
          <SafeAreaView style={styles.webviewContainer} edges={['top', 'bottom']}>
            <View style={styles.webviewHeader}>
              <TouchableOpacity 
                onPress={() => setShowCancelDialog(true)} 
                style={styles.webviewCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.common.text.primary} />
              </TouchableOpacity>
              <Text style={styles.webviewHeaderTitle}>Secure Paystack Checkout</Text>
            </View>
            {webviewProgress > 0 && webviewProgress < 1 ? (
              <View style={styles.webviewProgressTrack}>
                <View style={[styles.webviewProgressFill, { width: `${Math.round(webviewProgress * 100)}%` }]} />
              </View>
            ) : null}
            <WebView
              source={{ uri: authUrl }}
              onNavigationStateChange={handleWebViewNavChange}
              startInLoadingState
              onLoadProgress={({ nativeEvent }) => setWebviewProgress(nativeEvent.progress)}
              onLoadEnd={() => setWebviewProgress(1)}
            />
            <View style={styles.webviewFooter}>
              <TouchableOpacity 
                style={styles.cancelPaymentButton}
                onPress={() => setShowCancelDialog(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.common.text.secondary} />
                <Text style={styles.cancelPaymentText}>Cancel Payment</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}

      <Dialog
        visible={errorDialog.visible}
        title={errorDialog.title}
        message={errorDialog.message}
        type="warning"
        onClose={() => setErrorDialog({ visible: false, title: '', message: '' })}
        buttons={[
          { 
            text: 'OK', 
            onPress: () => setErrorDialog({ visible: false, title: '', message: '' }),
            style: 'default'
          }
        ]}
      />

      <Dialog
        visible={showCancelDialog}
        title="Cancel Payment?"
        message="Are you sure you want to cancel this payment? Your subscription will not be activated."
        type="warning"
        onClose={() => setShowCancelDialog(false)}
        buttons={[
          { 
            text: 'Continue Payment', 
            onPress: () => setShowCancelDialog(false),
            style: 'default'
          },
          { 
            text: 'Cancel Payment', 
            onPress: () => {
              setShowCancelDialog(false);
              setWebviewVisible(false);
              handlePaystackClose();
            },
            style: 'destructive'
          }
        ]}
      />
    </Modal>
  );
};

const PaystackCheckout: React.FC<PaystackCheckoutProps> = (props) => {
  // Only enable debug mode in development, never in production
  const isDebugMode = __DEV__ && ENV.APP_ENV !== 'production';
  
  return (
    <PaystackProvider 
      publicKey={ENV.PAYSTACK?.PUBLIC_KEY || ''}
      debug={isDebugMode}
    >
      <PaystackCheckoutContent {...props} />
    </PaystackProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border.light,
  },
  closeButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.text.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  countrySelector: {
    backgroundColor: colors.base.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.common.border.light,
  },
  countrySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryTextContainer: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.common.text.primary,
  },
  detectionLabel: {
    fontSize: 11,
    color: colors.common.text.secondary,
    marginTop: 2,
  },
  detectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.base.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.common.border.light,
  },
  detectingText: {
    fontSize: 14,
    color: colors.common.text.secondary,
    marginLeft: 12,
  },
  pricingContainer: {
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: colors.modules.dating.primary.main,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  billingCycle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  savings: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  featuresContainer: {
    backgroundColor: colors.base.gray[50],
    borderRadius: 12,
    padding: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.common.text.primary,
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    color: colors.common.text.secondary,
    marginBottom: 8,
    paddingLeft: 8,
  },
  paymentMethodsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.common.text.primary,
    marginBottom: 8,
  },
  paymentMethodNote: {
    fontSize: 14,
    color: colors.common.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  paymentMethodsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.base.gray[50],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.common.border.light,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  paymentMethodDisplayName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.common.text.primary,
  },
  checkIcon: {
    marginLeft: 8,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.base.gray[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: colors.common.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: colors.base.white,
    borderTopWidth: 1,
    borderTopColor: colors.common.border.light,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.modules.dating.primary.main,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 12,
    minHeight: 64,
    width: '100%',
    shadowColor: colors.modules.dating.primary.main,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 12,
    color: colors.common.text.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  emailModalFullScreen: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  emailModalBackdropFlex: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContentContainer: {
    backgroundColor: colors.base.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.common.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.base.gray[50],
  },
  selectedCountryOption: {
    backgroundColor: colors.modules.dating.primary.light,
  },
  countryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  countryOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.common.text.primary,
  },
  countryCurrency: {
    fontSize: 14,
    color: colors.common.text.secondary,
    marginTop: 2,
  },
  modalCloseButton: {
    backgroundColor: colors.base.gray[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: colors.common.text.primary,
    fontWeight: '600',
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: colors.base.white,
  },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.base.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border.light,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  webviewCloseButton: {
    padding: 8,
    marginRight: 8,
  },
  webviewHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.common.text.primary,
  },
  webviewProgressTrack: {
    height: 3,
    backgroundColor: colors.base.gray[200],
  },
  webviewProgressFill: {
    height: '100%',
    backgroundColor: colors.modules.dating.primary.main,
  },
  webviewFooter: {
    backgroundColor: colors.base.white,
    borderTopWidth: 1,
    borderTopColor: colors.common.border.light,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.base.gray[50],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  cancelPaymentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.common.text.secondary,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  processingCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.base.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  processingTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.common.text.primary,
    textAlign: 'center',
  },
  processingMessage: {
    marginTop: 6,
    fontSize: 13,
    color: colors.common.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  processingProgressTrack: {
    marginTop: 12,
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.base.gray[200],
    overflow: 'hidden',
  },
  processingProgressFill: {
    height: '100%',
    backgroundColor: colors.modules.dating.primary.main,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  emailRequiredSection: {
    backgroundColor: colors.modules.dating.primary.light,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.modules.dating.primary.main,
  },
  emailRequiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  emailRequiredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.text.primary,
  },
  emailRequiredText: {
    fontSize: 14,
    color: colors.common.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  emailInputWrapper: {
    marginBottom: 8,
  },
  emailInputField: {
    backgroundColor: colors.base.white,
    borderWidth: 2,
    borderColor: colors.common.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.common.text.primary,
  },
  emailInputFieldError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  emailErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailErrorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default PaystackCheckout;
