import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { signUp, completeProfileFromOtp, clearError } from '../../redux/slices/authSlice';
import { SignUpScreenProps } from '../../types/navigation';
import StandardScreenTitle from '../../components/common/StandardScreenTitle';
import { useResponsiveLayout } from '../../utils/responsive';
import { PhoneInput } from '../../components/common/PhoneInput';
import { validatePhoneNumber } from '../../utils/phone';
import PrivacyPolicyModal from '../../components/common/PrivacyPolicyModal';
import { privacyPolicyService } from '../../services/privacyPolicyService';
import { useNetworkStatus } from '../../utils/networkStatus';
import { getUserFacingError } from '../../utils/userFacingError';
import referralTrackingService from '../../services/referralTrackingService';

export default function SignUpScreen({ navigation, route }: SignUpScreenProps) {
  const verificationToken = route?.params?.verificationToken;
  const verifiedIdentifier = route?.params?.verifiedIdentifier;
  const verifiedType = route?.params?.verifiedType;
  const fromOtpVerification = route?.params?.fromOtpVerification ?? false;

  const hasOtpContext =
    fromOtpVerification &&
    typeof verifiedIdentifier === 'string' &&
    verifiedIdentifier.trim().length > 0 &&
    (verifiedType === 'email' || verifiedType === 'phone');

  const hasTwilioVerificationContext =
    !fromOtpVerification &&
    typeof verificationToken === 'string' &&
    verificationToken.trim().length > 0;

  const shouldRedirectToVerification = !hasOtpContext && !hasTwilioVerificationContext;

  React.useEffect(() => {
    if (shouldRedirectToVerification) {
      navigation.replace('VerificationChoice');
    }
  }, [navigation, shouldRedirectToVerification]);

  if (shouldRedirectToVerification) {
    return null;
  }

  const [formData, setFormData] = useState({
    fullName: '',
    email: verifiedType === 'email' ? (verifiedIdentifier ?? '') : '',
    phone: verifiedType === 'phone' ? (verifiedIdentifier ?? '') : '',
    password: '',
    confirmPassword: '',
    city: '',
    country: ''
  });

  const [validationErrors, setValidationErrors] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
    country: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [privacyPolicyError, setPrivacyPolicyError] = useState(false);

  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const layout = useResponsiveLayout();
  
  // CRITICAL FIX: Track component mount state to prevent state updates after unmount
  const isMountedRef = React.useRef(true);
  
  // Refs for keyboard navigation
  const emailInputRef = React.useRef<TextInput>(null);
  const phoneInputRef = React.useRef<TextInput>(null);
  const cityInputRef = React.useRef<TextInput>(null);
  const countryInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const confirmPasswordInputRef = React.useRef<TextInput>(null);
  
  // PHASE 2 FIX: Monitor network status for better error handling
  const { isConnected } = useNetworkStatus();

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation using imported validator
  const validatePhone = validatePhoneNumber;

  const handleSignUp = async () => {
    // Prevent double-submission
    if (isLoading) return;
    
    // PHASE 2 FIX: Check network connection before attempting signup
    if (!isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const { fullName, email, phone, password, confirmPassword, city, country } = formData;
    const errors = {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      city: '',
      country: ''
    };

    // Validation
    if (!fullName.trim()) {
      errors.fullName = 'Please enter your full name';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Please enter your email address';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!phone.trim()) {
      errors.phone = 'Please enter your phone number';
    } else if (!validatePhone(phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!password) {
      errors.password = 'Please create a password';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.password = 'Password must contain at least one special character';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!city.trim()) {
      errors.city = 'Please enter your city';
    }

    if (!country.trim()) {
      errors.country = 'Please enter your country';
    }

    setValidationErrors(errors);

    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) {
      return;
    }

    // Check privacy policy acceptance
    if (!acceptedPrivacyPolicy) {
      setPrivacyPolicyError(true);
      Alert.alert(
        'Privacy Policy Required',
        'Please read and accept our Privacy Policy to create an account.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setPrivacyPolicyError(false);

    try {
      // FIX: Removed fire-and-forget signOut() that triggered a SIGNED_OUT event
      // racing with the signup flow.  Supabase handles session replacement
      // automatically during signUp — no manual signOut needed.
      dispatch(clearError());

      // Server-side: consume the OTP verification token before creating account (Twilio Verify flow only).
      if (!fromOtpVerification && verificationToken) {
        const { default: twilioVerifyService } = await import('../../services/twilioVerifyService');
        const bindResult = await twilioVerifyService.bindVerification(verificationToken);
        if (!bindResult.success) {
          const isExpiredOrUsed =
            bindResult.code === 'TOKEN_EXPIRED' || bindResult.code === 'TOKEN_USED';
          Alert.alert(
            isExpiredOrUsed ? 'Verification Expired' : 'Verification Invalid',
            bindResult.error ?? 'Your verification has expired. Please verify your identity again.',
            [
              {
                text: 'Verify Again',
                onPress: () => navigation.navigate('VerificationChoice'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return;
        }
      }

      // Accept privacy policy before sign up
      await privacyPolicyService.acceptPolicy();

      const [pendingReferral] = await Promise.all([
        referralTrackingService.getPendingReferral(),
      ]);

      if (fromOtpVerification) {
        await dispatch(completeProfileFromOtp({
          fullName: fullName.trim(),
          password,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          city: city.trim(),
          country: country.trim(),
          referralCode: pendingReferral?.code,
          referralSource: pendingReferral?.source,
        })).unwrap();
      } else {
        const installFingerprint = await referralTrackingService.getOrCreateInstallFingerprint();
        await dispatch(signUp({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          city: city.trim(),
          country: country.trim(),
          referralCode: pendingReferral?.code,
          referralSource: pendingReferral?.source,
          installFingerprint,
        })).unwrap();
      }

      if (pendingReferral?.code) {
        referralTrackingService.clearPendingReferral().catch(() => {});
      }
      
      // CRITICAL FIX: Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      Alert.alert(
        'Success! 🎉',
        fromOtpVerification
          ? 'Your account is ready. Welcome to LinkApp!'
          : 'Account created successfully! Please check your email to verify your account.',
        [{ text: 'OK', onPress: fromOtpVerification ? undefined : () => navigation.navigate('Login') }]
      );
    } catch (error: unknown) {
      // CRITICAL FIX: Only show error if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      const friendly = getUserFacingError(error, {
        action: 'create your account',
        displayStyle: 'alert',
      });

      const buttons: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
      }> = [];

      const canSignInInstead =
        friendly.title === 'Account already exists' ||
        friendly.message.toLowerCase().includes('sign in instead');

      if (friendly.kind === 'network' || friendly.kind === 'timeout') {
        buttons.push({ text: 'Try Again', onPress: () => void handleSignUp() });
      }

      if (canSignInInstead) {
        buttons.push({ text: 'Sign In', onPress: () => navigation.navigate('Login') });
      }

      buttons.push({ text: 'OK', style: 'cancel' });

      Alert.alert(friendly.title, friendly.message, buttons);
    }
  };

  const handlePrivacyPolicyAccept = () => {
    setAcceptedPrivacyPolicy(true);
    setPrivacyPolicyError(false);
    setShowPrivacyPolicyModal(false);
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Clear errors when component mounts
  React.useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  // CRITICAL FIX: Comprehensive cleanup on unmount
  React.useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      // DON'T clear error states on unmount - user needs to see them
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[
            styles.content, 
            { 
              maxWidth: layout.isDesktop ? 500 : layout.isTablet ? 450 : undefined,
              paddingHorizontal: layout.containerPadding.paddingHorizontal,
            }
          ]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/splash-icon.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <StandardScreenTitle style={styles.titleContainer}>Create Account</StandardScreenTitle>
              <Text style={styles.subtitle}>
                {fromOtpVerification || hasTwilioVerificationContext
                  ? 'Verified — complete your profile to finish setting up your account'
                  : 'Join LinkApp community today'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={[
                  styles.inputWrapper,
                  validationErrors.fullName ? styles.inputWrapperError : {},
                  formData.fullName && formData.fullName.length >= 2 ? styles.inputWrapperValid : {}
                ]}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    value={formData.fullName}
                    onChangeText={(value) => updateField('fullName', value)}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    blurOnSubmit={false}
                    accessibilityLabel="Full name input"
                  />
                </View>
                {validationErrors.fullName ? (
                  <Text style={styles.fieldError}>{validationErrors.fullName}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, styles.labelInRow]}>Email Address</Text>
                  {verifiedType === 'email' && (
                    <View style={styles.verifiedBadge}>
                      <MaterialIcons name="verified" size={14} color="#10B981" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                </View>
                <View style={[
                  styles.inputWrapper,
                  validationErrors.email ? styles.inputWrapperError : {},
                  formData.email && validateEmail(formData.email) ? styles.inputWrapperValid : {}
                ]}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter your email address"
                    placeholderTextColor="#9CA3AF"
                    value={formData.email}
                    onChangeText={(value) => updateField('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!isLoading && verifiedType !== 'email'}
                    ref={emailInputRef}
                    returnKeyType="next"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                    blurOnSubmit={false}
                    accessibilityLabel="Email address input"
                  />
                </View>
                {validationErrors.email ? (
                  <Text style={styles.fieldError}>{validationErrors.email}</Text>
                ) : formData.email && validateEmail(formData.email) ? (
                  <Text style={styles.fieldSuccess}>✓ Valid email format</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, styles.labelInRow]}>Phone Number</Text>
                  {verifiedType === 'phone' && (
                    <View style={styles.verifiedBadge}>
                      <MaterialIcons name="verified" size={14} color="#10B981" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                </View>
                <PhoneInput
                  value={formData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  error={!!validationErrors.phone}
                  defaultCountry="KE"
                  editable={!isLoading && verifiedType !== 'phone'}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                  onSubmitEditing={() => cityInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                {validationErrors.phone ? (
                  <Text style={styles.fieldError}>{validationErrors.phone}</Text>
                ) : formData.phone && validatePhone(formData.phone) ? (
                  <Text style={styles.fieldSuccess}>✓ Valid phone number</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <View style={[
                  styles.inputWrapper,
                  validationErrors.city ? styles.inputWrapperError : {},
                  formData.city && formData.city.trim().length >= 2 ? styles.inputWrapperValid : {}
                ]}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g., Nairobi, Mombasa, Kisumu"
                    placeholderTextColor="#9CA3AF"
                    value={formData.city}
                    onChangeText={(value) => updateField('city', value)}
                    autoCapitalize="words"
                    editable={!isLoading}
                    ref={cityInputRef}
                    returnKeyType="next"
                    onSubmitEditing={() => countryInputRef.current?.focus()}
                    blurOnSubmit={false}
                    accessibilityLabel="City input"
                  />
                </View>
                {validationErrors.city ? (
                  <Text style={styles.fieldError}>{validationErrors.city}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Country</Text>
                <View style={[
                  styles.inputWrapper,
                  validationErrors.country ? styles.inputWrapperError : {},
                  formData.country && formData.country.trim().length >= 2 ? styles.inputWrapperValid : {}
                ]}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g., Kenya, Uganda, Tanzania"
                    placeholderTextColor="#9CA3AF"
                    value={formData.country}
                    onChangeText={(value) => updateField('country', value)}
                    autoCapitalize="words"
                    editable={!isLoading}
                    ref={countryInputRef}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                    accessibilityLabel="Country input"
                  />
                </View>
                {validationErrors.country ? (
                  <Text style={styles.fieldError}>{validationErrors.country}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  validationErrors.password ? styles.inputWrapperError : {},
                  formData.password && formData.password.length >= 8 && 
                    /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) &&
                    /[A-Z]/.test(formData.password) &&
                    /[0-9]/.test(formData.password) ? styles.inputWrapperValid : {}
                ]}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.inputField, styles.passwordInput]}
                      placeholder="Create a secure password"
                      placeholderTextColor="#9CA3AF"
                      value={formData.password}
                      onChangeText={(value) => updateField('password', value)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      textContentType="newPassword"
                      editable={!isLoading}
                      ref={passwordInputRef}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                      blurOnSubmit={false}
                      accessibilityLabel="Password input"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility-off" : "visibility"}
                        size={24}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {validationErrors.password ? (
                  <Text style={styles.fieldError}>{validationErrors.password}</Text>
                ) : null}
                {formData.password ? (
                  <View style={styles.passwordRequirements}>
                    {(() => {
                      const hasLength = formData.password.length >= 8;
                      const hasUppercase = /[A-Z]/.test(formData.password);
                      const hasNumber = /[0-9]/.test(formData.password);
                      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
                      const metCount = [hasLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
                      const strengthLabel = metCount === 0 ? '' : metCount === 1 ? 'Weak' : metCount <= 3 ? 'Getting there' : 'Secure!';
                      const strengthColor = metCount === 0 ? '#9CA3AF' : metCount === 1 ? '#EF4444' : metCount <= 3 ? '#F59E0B' : '#10B981';
                      return (
                        <>
                          <View style={styles.strengthMeterContainer}>
                            <View style={styles.strengthMeterTrack}>
                              <View
                                style={[
                                  styles.strengthMeterFill,
                                  {
                                    width: `${(metCount / 4) * 100}%`,
                                    backgroundColor: strengthColor,
                                  },
                                ]}
                              />
                            </View>
                            {strengthLabel ? (
                              <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                                {strengthLabel}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.requirementRow}>
                            <MaterialIcons
                              name={hasLength ? 'check-circle' : 'lock-open'}
                              size={18}
                              color={hasLength ? '#10B981' : '#9CA3AF'}
                              style={styles.requirementIcon}
                            />
                            <Text style={[
                              styles.requirement,
                              hasLength ? styles.requirementMet : styles.requirementUnmet
                            ]}>
                              Give it some length (8+ characters)
                            </Text>
                          </View>
                          <View style={styles.requirementRow}>
                            <MaterialIcons
                              name={hasUppercase ? 'check-circle' : 'lock-open'}
                              size={18}
                              color={hasUppercase ? '#10B981' : '#9CA3AF'}
                              style={styles.requirementIcon}
                            />
                            <Text style={[
                              styles.requirement,
                              hasUppercase ? styles.requirementMet : styles.requirementUnmet
                            ]}>
                              Throw in a capital letter (A-Z)
                            </Text>
                          </View>
                          <View style={styles.requirementRow}>
                            <MaterialIcons
                              name={hasNumber ? 'check-circle' : 'lock-open'}
                              size={18}
                              color={hasNumber ? '#10B981' : '#9CA3AF'}
                              style={styles.requirementIcon}
                            />
                            <Text style={[
                              styles.requirement,
                              hasNumber ? styles.requirementMet : styles.requirementUnmet
                            ]}>
                              Add a number for strength (0-9)
                            </Text>
                          </View>
                          <View style={styles.requirementRow}>
                            <MaterialIcons
                              name={hasSpecial ? 'check-circle' : 'lock-open'}
                              size={18}
                              color={hasSpecial ? '#10B981' : '#9CA3AF'}
                              style={styles.requirementIcon}
                            />
                            <Text style={[
                              styles.requirement,
                              hasSpecial ? styles.requirementMet : styles.requirementUnmet
                            ]}>
                              Mix in a special character (e.g., !, #, @)
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[
                  styles.inputWrapper,
                  validationErrors.confirmPassword ? styles.inputWrapperError : {},
                  formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 8 ? styles.inputWrapperValid : {}
                ]}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.inputField, styles.passwordInput]}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={formData.confirmPassword}
                      onChangeText={(value) => updateField('confirmPassword', value)}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      textContentType="newPassword"
                      editable={!isLoading}
                      ref={confirmPasswordInputRef}
                      returnKeyType="go"
                      onSubmitEditing={handleSignUp}
                      accessibilityLabel="Confirm password input"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <MaterialIcons
                        name={showConfirmPassword ? "visibility-off" : "visibility"}
                        size={24}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {validationErrors.confirmPassword ? (
                  <Text style={styles.fieldError}>{validationErrors.confirmPassword}</Text>
                ) : formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 8 ? (
                  <Text style={styles.fieldSuccess}>✓ Passwords match</Text>
                ) : null}
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  isLoading || !formData.email.trim() || !formData.password.trim() || !acceptedPrivacyPolicy ? styles.buttonDisabled : styles.buttonPrimary
                ]}
                onPress={handleSignUp}
                disabled={isLoading || !acceptedPrivacyPolicy}
                accessibilityLabel="Create account button"
                accessibilityState={{ disabled: isLoading || !acceptedPrivacyPolicy }}
              >
                {isLoading ? (
                  <View style={styles.buttonLoading}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={[styles.buttonText, styles.buttonLoadingText]}>
                      Creating Account...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Privacy Policy Acceptance */}
              <View style={styles.privacyContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy);
                    if (!acceptedPrivacyPolicy) {
                      setPrivacyPolicyError(false);
                    }
                  }}
                  disabled={isLoading}
                  accessibilityLabel="Accept Privacy Policy"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedPrivacyPolicy }}
                >
                  <View style={[styles.checkbox, acceptedPrivacyPolicy && styles.checkboxChecked]}>
                    {acceptedPrivacyPolicy && (
                      <MaterialIcons name="check" size={18} color="#ffffff" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I have read and agree to the{' '}
                    <Text
                      style={styles.privacyLink}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowPrivacyPolicyModal(true);
                      }}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>
                {!acceptedPrivacyPolicy && privacyPolicyError && (
                  <Text style={styles.privacyError}>
                    You must accept the Privacy Policy to continue
                  </Text>
                )}
              </View>
            </View>

            {/* Sign In Link */}
            <View style={styles.footer}>
              <View style={styles.signInRow}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (!isLoading) {
                      navigation.navigate('Login');
                    }
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={showPrivacyPolicyModal}
        onAccept={handlePrivacyPolicyAccept}
        onClose={() => setShowPrivacyPolicyModal(false)}
        isFirstView={false}
        showAcceptButton={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  titleContainer: {
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    minHeight: 56,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputWrapperValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  inputField: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 56,
    color: '#1F2937',
    backgroundColor: 'transparent',
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  fieldSuccess: {
    color: '#10B981',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  errorContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  button: {
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 24,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonLoadingText: {
    marginLeft: 12,
  },
  privacyContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  privacyLink: {
    color: '#0284c7',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  privacyError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 36,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 24,
    alignItems: 'center',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInText: {
    color: '#6B7280',
    fontSize: 16,
  },
  signInLink: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 16,
  },
  passwordRequirements: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  strengthMeterContainer: {
    marginBottom: 12,
  },
  strengthMeterTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthMeterFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirement: {
    fontSize: 13,
    flex: 1,
  },
  requirementMet: {
    color: '#10B981',
    fontWeight: '500',
  },
  requirementUnmet: {
    color: '#6B7280',
  },
  passwordContainer: {
    position: 'relative',
    flex: 1,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelInRow: {
    marginBottom: 0,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
