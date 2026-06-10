import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../services/supabaseClient';
import { useAppDispatch } from '../../redux/hooks';
import { getCurrentUser, setOtpProfileCompletePending } from '../../redux/slices/authSlice';
import { IndeterminateProgressBar } from '../../components/common';
import { clearPasswordRecoveryFlow, startPasswordRecoveryFlow } from '../../services/authFlowStateService';

interface RouteParams {
  access_token?: string;
  refresh_token?: string;
  token_hash?: string;
  type?: string;
}

export default function EmailVerificationScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const isNavigatingRef = useRef(false);

  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  
  const params = route.params as RouteParams;

  useEffect(() => {
    handleEmailVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to create user profile with retry logic
  const createUserProfileIfNeeded = useCallback(async (user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      phone?: string;
    };
  }) => {
    // Retry logic for profile creation
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if user profile already exists
        const { data: existingProfile, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        // If profile exists, we're done
        if (existingProfile) {
          return true;
        }

        // If error is NOT "no rows returned", it might be a network issue
        if (checkError && checkError.code !== 'PGRST116') {
          // Network or other error - wait and retry
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }

        // Profile doesn't exist - create it
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            phone: user.user_metadata?.phone || '',
            kyc_status: 'unverified',
            creator_verification_status: 'unverified',
          });

        if (profileError) {
          // If duplicate key, profile was created between check and insert - success!
          if (profileError.message.includes('duplicate key value') || profileError.code === '23505') {
            return true;
          }
          // Other error - retry if we have attempts left
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          throw profileError;
        }

        // Success!
        return true;
      } catch {
        // If this is the last attempt, return false
        if (attempt === maxRetries - 1) {
          // Log error but don't fail verification - getCurrentUser will handle it
          return false;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    // All retries failed
    return false;
  }, []);

  const handleEmailVerification = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // FIX: Removed unconditional signOut() that was called before verification.
      // If verification fails (expired link, network error) the user would be
      // needlessly signed out.  Supabase's setSession() and verifyOtp() handle
      // session replacement automatically — no manual signOut needed.
      
      // Extract tokens from URL parameters
      const { access_token, refresh_token, token_hash, type } = params || {};
      setMessage(type === 'recovery' ? 'Verifying your reset link...' : 'Verifying your email...');

      // Handle password reset recovery flow
      if (type === 'recovery' && (access_token || token_hash)) {
        // Mark flow active so RootNavigator doesn't route into AppNavigator during recovery.
        startPasswordRecoveryFlow();
        if (access_token && refresh_token) {
          // Set session from recovery tokens
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            clearPasswordRecoveryFlow();
            setVerificationStatus('error');
            setMessage('Password reset link is invalid or has expired. Please request a new one.');
            return;
          }

          if (data.user) {
            // Navigate to reset screen — use replace so this screen is removed from the back stack
            isNavigatingRef.current = true;
            (navigation as any).replace('ResetPassword');
            return;
          }
          clearPasswordRecoveryFlow();
          setVerificationStatus('error');
          setMessage('Password reset link is invalid or has expired. Please request a new one.');
          return;
        } else if (token_hash) {
          // Handle token hash for recovery
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery',
          });

          if (error) {
            clearPasswordRecoveryFlow();
            setVerificationStatus('error');
            setMessage('Password reset link is invalid or has expired. Please request a new one.');
            return;
          }

          if (data.user) {
            // Navigate to reset screen — use replace so this screen is removed from the back stack
            isNavigatingRef.current = true;
            (navigation as any).replace('ResetPassword');
            return;
          }
          clearPasswordRecoveryFlow();
          setVerificationStatus('error');
          setMessage('Password reset link is invalid or has expired. Please request a new one.');
          return;
        } else {
          clearPasswordRecoveryFlow();
          setVerificationStatus('error');
          setMessage('Invalid password reset link. Please request a new one.');
        }
        return;
      }

      // Handle email verification for signup
      if (type === 'signup' && token_hash) {
        // Verify the token hash for email confirmation
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup',
        });

        if (error) {
          setVerificationStatus('error');
          setMessage('Email verification failed. The link may have expired.');
          return;
        }

        if (data.user) {
          // Email verification successful

          // Create user profile if it doesn't exist (with retries)
          await createUserProfileIfNeeded(data.user);
          
          // Auto-login: Keep the session active and fetch user profile
          await dispatch(getCurrentUser());
          
          setVerificationStatus('success');
          setMessage('Email verified successfully! Logging you in...');
          
          // Wait briefly to show success message, then navigate to app
          setTimeout(() => {
            // Navigation will automatically redirect to app because user is now authenticated
          }, 1500);
        }
      } else if (access_token && refresh_token) {
        // Handle direct token-based verification (email verification or other auth flows)
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setVerificationStatus('error');
          setMessage('We couldn’t verify your email. Check your internet connection and try again. If the link is old, request a new verification email.');
          return;
        }

        if (data.user) {
          const meta = data.user.user_metadata || {};
          const hasFullName = typeof meta.full_name === 'string' && meta.full_name.trim().length >= 2;
          const isOtpMagicLink = type === 'magiclink' || type === 'email';

          if (isOtpMagicLink && !hasFullName) {
            dispatch(setOtpProfileCompletePending(true));
            setVerificationStatus('success');
            setMessage('Email verified! Complete your profile.');
            setTimeout(() => {
              (navigation as any).navigate('SignUp', {
                fromOtpVerification: true,
                verifiedIdentifier: data.user?.email ?? '',
                verifiedType: 'email' as const,
              });
            }, 800);
            return;
          }

          await createUserProfileIfNeeded(data.user);
          await dispatch(getCurrentUser());

          setVerificationStatus('success');
          setMessage('Email verified successfully! Logging you in...');

          setTimeout(() => {}, 1500);
        }
      } else {
        // No valid verification parameters
        setVerificationStatus('error');
        setMessage('Invalid verification link. Please try signing up again.');
      }
    } catch {
      setVerificationStatus('error');
      setMessage('We couldn’t verify your email right now. Please try again, or request a new verification email.');
    } finally {
      // Skip state update when we're already navigating away (e.g. recovery replace) to avoid flash
      if (!isNavigatingRef.current) {
        setIsLoading(false);
      }
    }
  }, [params, dispatch, navigation, createUserProfileIfNeeded]);

  const handleContinue = () => {
    if (verificationStatus === 'success') {
      if (params?.type === 'recovery') {
        // Use replace so this screen is removed from the back stack
        (navigation as any).replace('ResetPassword');
      }
      // Otherwise, auto-navigation to app will happen via RootNavigator
    } else {
      if (params?.type === 'recovery') {
        navigation.navigate('ForgotPassword' as never);
      } else {
        navigation.navigate('SignUp' as never);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <View style={{ 
        flex: 1, 
        paddingHorizontal: 24, 
        paddingVertical: 32, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 30, 
            fontWeight: 'bold', 
            color: '#0284c7', 
            marginBottom: 8 
          }}>
            {params?.type === 'recovery' ? '🔐 Password Reset' : '📧 Email Verification'}
          </Text>
        </View>

        {/* Status Content */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          {isLoading ? (
            <>
              <View style={{ width: '70%', maxWidth: 280, marginBottom: 16 }}>
                <IndeterminateProgressBar
                  color="#0284c7"
                  trackColor="rgba(2,132,199,0.2)"
                  height={5}
                />
              </View>
              <Text style={{ 
                fontSize: 18, 
                color: '#374151', 
                textAlign: 'center',
                marginBottom: 8
              }}>
                {message}
              </Text>
            </>
          ) : verificationStatus === 'success' ? (
            <>
              <Text style={{ 
                fontSize: 48, 
                marginBottom: 16 
              }}>
                ✅
              </Text>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600',
                color: '#059669', 
                textAlign: 'center',
                marginBottom: 8
              }}>
                Verification Successful!
              </Text>
              <Text style={{ 
                fontSize: 16, 
                color: '#374151', 
                textAlign: 'center' 
              }}>
                {message}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ 
                fontSize: 48, 
                marginBottom: 16 
              }}>
                ❌
              </Text>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600',
                color: '#dc2626', 
                textAlign: 'center',
                marginBottom: 8
              }}>
                Verification Failed
              </Text>
              <Text style={{ 
                fontSize: 16, 
                color: '#374151', 
                textAlign: 'center' 
              }}>
                {message}
              </Text>
            </>
          )}
        </View>

        {/* Continue Button */}
        {!isLoading && (
          <TouchableOpacity
            style={{
              backgroundColor: '#0284c7',
              paddingVertical: 16,
              paddingHorizontal: 32,
              borderRadius: 8,
              minWidth: 200,
            }}
            onPress={handleContinue}
          >
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
            }}>
              {verificationStatus === 'success' ? (params?.type === 'recovery' ? 'Continue' : 'Continue to App') : 'Try Again'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
