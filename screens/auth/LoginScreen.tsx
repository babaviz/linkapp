import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { signIn, clearError } from '../../redux/slices/authSlice';
import { LoginScreenProps } from '../../types/navigation';
import StandardScreenTitle from '../../components/common/StandardScreenTitle';
import { useResponsiveLayout } from '../../utils/responsive';
import { useNetworkStatus } from '../../utils/networkStatus';
import { getUserFacingError } from '../../utils/userFacingError';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const passwordInputRef = React.useRef<TextInput>(null);
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  const layout = useResponsiveLayout();
  
  // CRITICAL FIX: Track component mount state to prevent state updates after unmount
  const isMountedRef = React.useRef(true);
  
  // PHASE 2 FIX: Monitor network status for better error handling
  const { isConnected } = useNetworkStatus();

  // Debug Supabase configuration

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Demo login removed for production

  const handleSignIn = async () => {
    // Prevent double-submission
    if (isLoading) return;
    
    // Mark that user has attempted to submit
    setHasAttemptedSubmit(true);
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    dispatch(clearError());
    
    // PHASE 2 FIX: Check network connection before attempting login
    if (!isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    let hasErrors = false;

    // Validation
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      hasErrors = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasErrors = true;
    }

    if (!password.trim()) {
      setPasswordError('Please enter your password');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    try {
      // Execute login without timeout wrapper
      // The authSlice and authService already have their own timeouts
      const result = await dispatch(signIn({ 
        email: email.trim().toLowerCase(), 
        password 
      })).unwrap();
      
      // Don't check isMountedRef here - navigation happens automatically via RootNavigator
      // The component will unmount naturally when navigation occurs
      
      // Login successful - state will update and navigation will happen automatically
      // No need to show success message as user will see the home screen
    } catch (error: unknown) {
      const friendly = getUserFacingError(error, { action: 'sign in', displayStyle: 'alert' });

      const buttons: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
      }> = [];

      if (friendly.kind === 'network' || friendly.kind === 'timeout') {
        // FIX: Previously these errors were silently swallowed with a bare
        // `return`, leaving users with zero feedback after the spinner stopped.
        // Now we show a non-blocking alert so they know what happened.
        buttons.push({
          text: 'Try Again',
          onPress: () => {
            dispatch(clearError());
          },
        });
      } else if (friendly.kind === 'auth') {
        buttons.push({
          text: 'Forgot Password',
          onPress: () => navigation.navigate('ForgotPassword'),
        });
      }

      buttons.push({
        text: 'OK',
        style: 'cancel',
        onPress: () => {
          dispatch(clearError());
        },
      });

      Alert.alert(friendly.title, friendly.message, buttons);
    }
  };


  // Clear errors when user successfully authenticates
  React.useEffect(() => {
    if (isAuthenticated) {
      dispatch(clearError());
    }
  }, [isAuthenticated, dispatch]);

  // Clear errors when component mounts
  React.useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  // CRITICAL FIX: Track mount state
  React.useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      // Don't call setState in cleanup - component is unmounting
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
              <StandardScreenTitle style={styles.titleContainer}>Welcome Back</StandardScreenTitle>
              <Text style={styles.subtitle}>
                Sign in to access your LinkApp account
              </Text>
            </View>

            {/* Demo login removed in production builds */}

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[
                  styles.inputWrapper,
                  emailError ? styles.inputWrapperError : {},
                  email && validateEmail(email) ? styles.inputWrapperValid : {}
                ]}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter your email address"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                    accessibilityLabel="Email address input"
                  />
                </View>
                {emailError ? (
                  <Text style={styles.fieldError}>{emailError}</Text>
                ) : email && validateEmail(email) ? (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <MaterialIcons name="check" size={16} color="#10B981" style={{marginRight: 4}} />
                    <Text style={styles.fieldSuccess}>Valid email format</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  passwordError ? styles.inputWrapperError : {},
                  password && password.length >= 6 ? styles.inputWrapperValid : {}
                ]}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.inputField, styles.passwordInput]}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (hasAttemptedSubmit) {
                          setPasswordError('');
                          if (text.trim() && text.trim().length < 6) {
                            setPasswordError('Password must be at least 6 characters');
                          }
                        }
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password"
                      textContentType="password"
                      editable={!isLoading}
                      returnKeyType="go"
                      onSubmitEditing={handleSignIn}
                      ref={passwordInputRef}
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
                {passwordError ? (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                ) : null}
              </View>

              {error && !isAuthenticated && (
                <View style={styles.errorContainer}>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    <MaterialIcons name="warning" size={16} color="#DC2626" style={{marginRight: 8}} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  isLoading || (!email.trim() || !password.trim()) ? styles.buttonDisabled : styles.buttonPrimary
                ]}
                onPress={handleSignIn}
                disabled={isLoading || !email.trim() || !password.trim()}
                accessibilityLabel="Sign in button"
                accessibilityState={{ disabled: isLoading || !email.trim() || !password.trim() }}
              >
                {isLoading ? (
                  <View style={styles.buttonLoading}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={[styles.buttonText, styles.buttonLoadingText]}>
                      Signing In...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => navigation.navigate('VerificationChoice')}
                disabled={isLoading}
                accessible={true}
                accessibilityLabel="Create new account"
                accessibilityHint="Navigate to verification screen"
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading }}
              >
                <Text style={styles.buttonSecondaryText}>Create Account</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={isLoading}
                accessible={true}
                accessibilityLabel="Forgot password"
                accessibilityHint="Navigate to password reset screen"
                accessibilityRole="button"
              >
                <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
              </TouchableOpacity>
            </View>

            {/* Already have an account text */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account? Sign in above
              </Text>
            </View>
          </View>
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
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 16,
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
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0284c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonSecondaryText: {
    color: '#0284c7',
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
  forgotPassword: {
    paddingVertical: 12,
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#0284c7',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
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
  footer: {
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  signUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signUpText: {
    color: '#6B7280',
    fontSize: 16,
  },
  signUpLink: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 16,
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
});
