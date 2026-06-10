import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { resetPassword } from '../../redux/slices/authSlice';
import { ForgotPasswordScreenProps } from '../../types/navigation';
import StandardScreenTitle from '../../components/common/StandardScreenTitle';
import { useResponsiveLayout } from '../../utils/responsive';
import { useNetworkStatus } from '../../utils/networkStatus';
import { getUserFacingError } from '../../utils/userFacingError';

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const dispatch = useAppDispatch();
  const { error } = useAppSelector((state) => state.auth);
  const layout = useResponsiveLayout();
  
  // CRITICAL FIX: Track component mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // PHASE 2 FIX: Monitor network status for better error handling
  const { isConnected } = useNetworkStatus();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    // Prevent double-submission
    if (isLoading) return;
    
    // Clear previous errors
    setValidationError('');
    
    // PHASE 2 FIX: Check network connection before attempting password reset
    if (!isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Validation
    if (!email.trim()) {
      setValidationError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);

      // Demo mode removed for production

      // Dispatch the resetPassword action
      const result = await dispatch(resetPassword(email.trim().toLowerCase())).unwrap();
      
      // CRITICAL FIX: Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      if (result) {
        setIsSuccess(true);
        animateSuccess();
        
        Alert.alert(
          'Reset Link Sent',
          'If an account with that email exists, we\'ve sent you a password reset link. Please check your inbox and follow the instructions.',
          [{ text: 'OK', style: 'default' }]
        );
      }

    } catch (error: unknown) {
      // CRITICAL FIX: Only show error if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      const friendly = getUserFacingError(error, {
        action: 'send a reset link',
        displayStyle: 'alert',
      });

      const buttons: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
      }> = [];

      if (friendly.kind === 'network' || friendly.kind === 'timeout') {
        buttons.push({ text: 'Try Again', onPress: () => void handleResetPassword() });
      }

      buttons.push({ text: 'OK', style: 'cancel' });

      Alert.alert(friendly.title, friendly.message, buttons);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const animateSuccess = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleBackToLogin = () => {
    if (!isLoading) {
      navigation.goBack();
    }
  };

  
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
          <Animated.View 
            style={[
              styles.content,
              { 
                maxWidth: layout.isDesktop ? 500 : layout.isTablet ? 450 : undefined,
                paddingHorizontal: layout.containerPadding.paddingHorizontal,
              },
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleBackToLogin}
                accessibilityLabel="Go back to login"
                accessibilityRole="button"
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MaterialIcons name="arrow-back" size={20} color="#6B7280" style={{marginRight: 8}} />
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.headerContent}>
                <View style={styles.logoContainer}>
                  <Image 
                    source={require('../../assets/splash-icon.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <StandardScreenTitle style={styles.titleContainer}>Reset Password</StandardScreenTitle>
                <Text style={styles.subtitle}>
                  Enter your email address and we'll send you instructions to reset your password
                </Text>
              </View>
            </View>

            {/* Success State */}
            {isSuccess && (
              <Animated.View 
                style={[
                  styles.successContainer,
                  {
                    transform: [{
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.successIconContainer}>
                  <MaterialIcons name="check-circle" size={48} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successMessage}>
                  We've sent password reset instructions to your email address. 
                  The link will expire in 24 hours.
                </Text>
              </Animated.View>
            )}

            {/* Form */}
            {!isSuccess && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={[
                    styles.inputWrapper,
                    validationError ? styles.inputWrapperError : {},
                    email && validateEmail(email) ? styles.inputWrapperValid : {}
                  ]}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Enter your email address"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setValidationError('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      editable={!isLoading}
                      returnKeyType="send"
                      onSubmitEditing={handleResetPassword}
                      accessibilityLabel="Email address input"
                      accessibilityHint="Enter the email address associated with your account"
                    />
                  </View>
                  
                  {/* Validation feedback */}
                  {validationError ? (
                    <Text style={styles.fieldError}>{validationError}</Text>
                  ) : email && validateEmail(email) ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <MaterialIcons name="check" size={16} color="#10B981" style={{marginRight: 4}} />
                      <Text style={styles.fieldSuccess}>Valid email format</Text>
                    </View>
                  ) : null}
                </View>

                {/* Error Messages */}
                {error && (
                  <View style={styles.errorContainer}>
                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                      <MaterialIcons name="warning" size={16} color="#DC2626" style={{marginRight: 8}} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  </View>
                )}

                {/* Reset Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    isLoading || !email.trim() ? styles.buttonDisabled : styles.buttonPrimary
                  ]}
                  onPress={handleResetPassword}
                  disabled={isLoading || !email.trim()}
                  accessibilityLabel="Send reset email"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isLoading || !email.trim() }}
                >
                  {isLoading ? (
                    <View style={styles.buttonLoading}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={[styles.buttonText, styles.buttonLoadingText]}>
                        Sending Reset Link...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>


                {/* Security Information */}
                <View style={styles.securityInfo}>
                  <Text style={styles.securityTitle}>🔒 Security Information</Text>
                  <Text style={styles.securityText}>
                    • Reset links expire after 24 hours{'\n'}
                    • Only one reset request allowed per hour{'\n'}
                    • Links can only be used once{'\n'}
                    • Check your spam folder if you don't see the email
                  </Text>
                </View>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Remember your password? </Text>
                <TouchableOpacity 
                  onPress={handleBackToLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
              
              {isSuccess && (
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={() => {
                    setIsSuccess(false);
                    setEmail('');
                    slideAnim.setValue(0);
                  }}
                >
                  <Text style={styles.resendButtonText}>Send Another Reset Link</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    fontSize: 16,
    color: '#0284c7',
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
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
    paddingHorizontal: 20,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    marginBottom: 32,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 32,
    color: '#ffffff',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#15803D',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
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
    marginBottom: 20,
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
  demoContainer: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 16,
  },
  demoTitle: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  demoSubtitle: {
    color: '#0369A1',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  demoButton: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  demoButtonText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  securityInfo: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 24,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 16,
  },
  footerLink: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 16,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resendButtonText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 16,
  },
});
