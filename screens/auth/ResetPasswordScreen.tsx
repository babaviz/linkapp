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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { authService } from '../../services/authService';
import { clearPasswordRecoveryFlow } from '../../services/authFlowStateService';
import { clearUserScopedData } from '../../services/logoutCleanupService';
import StandardScreenTitle from '../../components/common/StandardScreenTitle';
import { useResponsiveLayout } from '../../utils/responsive';
import { getUserFacingError } from '../../utils/userFacingError';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigation = useNavigation();
  const layout = useResponsiveLayout();

  const validatePassword = (pwd: string): { valid: boolean; error?: string } => {
    if (!pwd.trim()) {
      return { valid: false, error: 'Please enter a password' };
    }
    // FIX: Align with SignUpScreen requirements (was only 6 chars)
    if (pwd.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one special character' };
    }
    return { valid: true };
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setPasswordError('');
    setConfirmPasswordError('');

    let hasErrors = false;

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error || '');
      hasErrors = true;
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      hasErrors = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    try {
      setIsLoading(true);

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        Alert.alert(
          'Password reset unavailable',
          'Password reset cannot be completed because the authentication service is not configured. Please try again later or contact support.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
        );
        return;
      }

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (error.message.includes('same as') || error.message.includes('identical')) {
          setPasswordError('New password must be different from your current password');
        } else if (error.message.includes('expired') || error.message.includes('invalid')) {
          Alert.alert(
            'Link Expired',
            'Your password reset link has expired. Please request a new one.',
            [
              {
                text: 'Request New Link',
                onPress: () => navigation.navigate('ForgotPassword' as never),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          const friendly = getUserFacingError(error, {
            action: 'update your password',
            displayStyle: 'alert',
          });
          Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
        }
        return;
      }

      // Success - show the success state, then sign out and navigate to Login automatically
      setIsSuccess(true);

      // Force re-login for security: revoke all sessions + clear local user-scoped state.
      clearPasswordRecoveryFlow();
      await clearUserScopedData({ reason: 'password_reset', mode: 'full' });
      await authService.signOut({ scope: 'global' });

      // Auto-navigate to Login after a brief delay so the user can see the success banner.
      setTimeout(() => {
        (navigation as any).reset({ index: 0, routes: [{ name: 'Login' }] });
      }, 2000);
    } catch (error: unknown) {
      const friendly = getUserFacingError(error, {
        action: 'update your password',
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
      setIsLoading(false);
    }
  };

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
          <View
            style={[
              styles.content,
              {
                maxWidth: layout.isDesktop ? 500 : layout.isTablet ? 450 : undefined,
                paddingHorizontal: layout.containerPadding.paddingHorizontal,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="arrow-back" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                  <Text style={styles.backButtonText}>Back</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.headerContent}>
                <View style={styles.logoContainer}>
                  <MaterialIcons name="lock-reset" size={32} color="#ffffff" />
                </View>
                <StandardScreenTitle style={styles.titleContainer}>Set New Password</StandardScreenTitle>
                <Text style={styles.subtitle}>
                  Enter your new password below. It must be at least 8 characters with an uppercase letter, number, and special character.
                </Text>
              </View>
            </View>

            {/* Success State */}
            {isSuccess && (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <MaterialIcons name="check-circle" size={48} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Password Updated!</Text>
                <Text style={styles.successMessage}>
                  Your password has been successfully updated. You can now sign in with your new password.
                </Text>
              </View>
            )}

            {/* Form */}
            {!isSuccess && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        passwordError ? styles.inputError : {},
                        password && validatePassword(password).valid ? styles.inputValid : {},
                      ]}
                      placeholder="Enter your new password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setPasswordError('');
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      textContentType="newPassword"
                      editable={!isLoading}
                      accessibilityLabel="New password input"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <MaterialIcons
                        name={showPassword ? 'visibility-off' : 'visibility'}
                        size={24}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? (
                    <Text style={styles.fieldError}>{passwordError}</Text>
                  ) : password && validatePassword(password).valid ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="check" size={16} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.fieldSuccess}>Valid password</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        confirmPasswordError ? styles.inputError : {},
                        confirmPassword &&
                        password &&
                        confirmPassword === password &&
                        validatePassword(confirmPassword).valid
                          ? styles.inputValid
                          : {},
                      ]}
                      placeholder="Confirm your new password"
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setConfirmPasswordError('');
                      }}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      textContentType="newPassword"
                      editable={!isLoading}
                      accessibilityLabel="Confirm password input"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <MaterialIcons
                        name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                        size={24}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {confirmPasswordError ? (
                    <Text style={styles.fieldError}>{confirmPasswordError}</Text>
                  ) : confirmPassword &&
                    password &&
                    confirmPassword === password &&
                    validatePassword(confirmPassword).valid ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="check" size={16} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.fieldSuccess}>Passwords match</Text>
                    </View>
                  ) : null}
                </View>

                {/* Security Information */}
                <View style={styles.securityInfo}>
                  <Text style={styles.securityTitle}>🔒 Password Requirements</Text>
                  <Text style={styles.securityText}>
                    • At least 8 characters long{'\n'}
                    • One uppercase letter{'\n'}
                    • One number{'\n'}
                    • One special character{'\n'}
                    • Don't reuse passwords from other accounts
                  </Text>
                </View>

                {/* Reset Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    isLoading ||
                    !password.trim() ||
                    !confirmPassword.trim() ||
                    password !== confirmPassword ||
                    !validatePassword(password).valid
                      ? styles.buttonDisabled
                      : styles.buttonPrimary,
                  ]}
                  onPress={handleResetPassword}
                  disabled={
                    isLoading ||
                    !password.trim() ||
                    !confirmPassword.trim() ||
                    password !== confirmPassword ||
                    !validatePassword(password).valid
                  }
                  accessibilityLabel="Update password"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      isLoading ||
                      !password.trim() ||
                      !confirmPassword.trim() ||
                      password !== confirmPassword ||
                      !validatePassword(password).valid,
                  }}
                >
                  {isLoading ? (
                    <View style={styles.buttonLoading}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={[styles.buttonText, styles.buttonLoadingText]}>Updating Password...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Remember your password? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login' as never)}
                  disabled={isLoading}
                >
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
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
  },
  content: {
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
    width: 80,
    height: 80,
    backgroundColor: '#0284c7',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#0284c7',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
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
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 56,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
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
  passwordContainer: {
    position: 'relative',
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 24,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});

