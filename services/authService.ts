import { supabase, isSupabaseConfigured } from './supabaseClient';
import { BaseUserProfile } from '../types/user';
import type { Session } from '@supabase/supabase-js';
import transactionalNotificationService from './transactionalNotificationService';
import locationService from './locationService';
import { normalizeUserLocation } from '../utils/locationHelpers';
import logger from '../utils/logger';
import { streamUserSyncService } from './streamUserSyncService';

import { 
  loginRateLimiter, 
  signupRateLimiter, 
  passwordResetRateLimiter, 
  getUserIdentifier, 
  formatRetryMessage 
} from '../utils/rateLimiter';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  city?: string;
  country?: string;
  referralCode?: string;
  referralSource?: string;
  installFingerprint?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface CompleteProfileFromOtpData {
  fullName: string;
  password: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  referralCode?: string;
  referralSource?: string;
}

// Keep UserProfile as an alias to BaseUserProfile for backward compatibility
export type UserProfile = BaseUserProfile;

export const normalizeAuthEmail = (email: string | null | undefined): string => (email || '').trim().toLowerCase();

export type SessionIdentityBasic = {
  userId: string;
  email: string;
  emailNormalized: string;
};

export type SessionUserBasicResult =
  | { status: 'ok'; user: UserProfile }
  | { status: 'no_session' }
  | { status: 'not_configured' }
  | { status: 'error'; message: string };

class AuthService {
  /**
   * Fast local session restore.
   *
   * This avoids network calls (no `getUser()` and no profile fetch) and is intended
   * for boot-time routing decisions so users can reach Login/Home quickly.
   */
  async getSessionUserBasicResult(): Promise<SessionUserBasicResult> {
    const startTime = Date.now();
    try {
      if (!isSupabaseConfigured()) {
        logger.debug('[AuthService][getSessionUserBasic] Supabase not configured');
        return { status: 'not_configured' };
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        logger.debug('[AuthService][getSessionUserBasic] Cached session error', {
          errorMessage: error.message,
          durationMs: Date.now() - startTime,
        });
        return { status: 'error', message: error.message };
      }
      if (!session?.user) {
        logger.debug('[AuthService][getSessionUserBasic] No cached session', {
          durationMs: Date.now() - startTime,
        });
        return { status: 'no_session' };
      }

      const u = session.user;
      const now = new Date().toISOString();
      const registeredLocation = normalizeUserLocation(u.user_metadata);

      logger.debug('[AuthService][getSessionUserBasic] Restored cached session user', {
        durationMs: Date.now() - startTime,
        userId: u.id,
      });
      return {
        status: 'ok',
        user: {
        id: u.id,
        email: u.email || '',
        fullName: u.user_metadata?.full_name || 'User',
        phoneNumber: u.user_metadata?.phone || '',
        profileImageUrl: null,
        location: registeredLocation,
        kycStatus: 'pending' as const,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        },
      };
    } catch (error) {
      logger.warn('[AuthService][getSessionUserBasic] Unexpected error', {
        durationMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getSessionUserBasic(): Promise<UserProfile | null> {
    const result = await this.getSessionUserBasicResult();
    return result.status === 'ok' ? result.user : null;
  }

  /**
   * Minimal session identity helper for strict comparisons (no profile fetch).
   * Useful for ensuring local fallback sessions match the user's intended email.
   */
  async getSessionIdentityBasic(): Promise<SessionIdentityBasic | null> {
    const result = await this.getSessionUserBasicResult();
    if (result.status !== 'ok') return null;
    return {
      userId: result.user.id,
      email: result.user.email,
      emailNormalized: normalizeAuthEmail(result.user.email),
    };
  }

  // Sign up new user
  async signUp({
    email,
    password,
    fullName,
    phone,
    city,
    country,
    referralCode,
    referralSource,
    installFingerprint,
  }: SignUpData) {
    try {
      // Normalize and trim all inputs
      email = email.trim().toLowerCase();
      fullName = fullName.trim();
      phone = phone.trim();
      city = city?.trim() || '';
      country = country?.trim() || '';

      const referralCodeSafe = referralCode
        ? (referralCode.trim().match(/[A-Za-z0-9]{4,32}/)?.[0] || '').toUpperCase()
        : '';
      const referralSourceSafe =
        typeof referralSource === 'string' && referralSource.trim().length > 0 ? referralSource.trim() : 'unknown';
      const installFingerprintSafe =
        typeof installFingerprint === 'string' && installFingerprint.trim().length > 0
          ? installFingerprint.trim()
          : '';
      
      // Check rate limit
      const identifier = getUserIdentifier(email);
      const rateLimitCheck = signupRateLimiter.checkLimit(identifier);
      
      if (!rateLimitCheck.allowed) {
        const message = formatRetryMessage(rateLimitCheck.retryAfter || 0);
        throw new Error(`Too many signup attempts. ${message}`);
      }
      
      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        throw new Error('Unable to connect to authentication service. Please check your internet connection and try again.');
      }

      // Enforce one-account-per-email at the profile layer as well.
      // This prevents re-registering with an email that still has a lingering public.users row
      // (e.g., partial or failed deletion flows), even if auth.users no longer has the email.
      const duplicateEmailMessage = 'An account with this email already exists. Please try signing in instead.';
      try {
        const { data: existingProfile, error: existingProfileError } = await (supabase as any)
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (!existingProfileError && existingProfile?.id) {
          throw new Error(duplicateEmailMessage);
        }
      } catch (e) {
        // If the pre-check conclusively found an existing profile, block signup with a friendly message.
        if (e instanceof Error && e.message === duplicateEmailMessage) {
          throw e;
        }
        // Best-effort: if RLS/network prevents the check, we fall back to auth-layer errors.
        if (__DEV__) {
          logger.debug('[AuthService][signUp] Existing profile pre-check failed (non-blocking)', {
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Create auth user with metadata (following official Supabase pattern)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            city: city,
            country: country,
            ...(referralCodeSafe ? { referral_code: referralCodeSafe, referral_source: referralSourceSafe } : {}),
            ...(installFingerprintSafe ? { install_fingerprint: installFingerprintSafe } : {}),
          },
          // Set redirect URL for email verification
          emailRedirectTo: 'linkapp://auth/callback',
        },
      });

      if (error) {
        // Provide more user-friendly error messages
        if (error.message.includes('fetch failed') || error.message.includes('network')) {
          throw new Error('Network connection failed. Please check your internet connection and try again.');
        }
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please try signing in instead.');
        }
        if (
          error.message.toLowerCase().includes('duplicate') &&
          (error.message.includes('users_email_unique') || error.message.toLowerCase().includes('email'))
        ) {
          throw new Error('An account with this email already exists. Please try signing in instead.');
        }
        throw error;
      }

      // Reset rate limit on successful signup
      signupRateLimiter.reset(identifier);

      // Only create user profile if we have a user and session
      // Note: If email confirmation is required, data.user will exist but data.session will be null
      if (data.user) {
        // For email confirmation flow, we might not have a session yet
        if (!data.session) {
          // Email confirmation required - user profile will be created after confirmation
          return { data, error: null };
        }

        // Create user profile in our custom users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            phone,
            kyc_status: 'pending',
            creator_verification_status: 'unverified',
          });

        if (profileError) {
          // Non-blocking: profile creation can be retried on first sign-in via getCurrentUser
          // Avoid failing signup when RLS or transient errors occur.
          if (profileError.message.includes('fetch failed') || profileError.message.includes('network')) {
            // Treat as non-fatal; user account is already created in Auth.
          } else if (profileError.message.includes('duplicate key value')) {
            // Profile already exists; ignore.
          } else {
            // Other DB errors should not block signup; fallback to create profile later.
          }
        }

        // Best-effort: derive and persist coordinates from the signup city/country
        // so "Nearby connections" can work without repeatedly prompting for GPS.
        if (city && country) {
          try {
            const geo = await locationService.geocodeAddress(city, country);
            const candidate = geo.success ? geo.results?.[0]?.coordinate : null;
            if (candidate) {
              const { data: existing } = await supabase
                .from('users')
                .select('location_preferences')
                .eq('id', data.user.id)
                .single();

              const existingPrefs = (existing?.location_preferences || {}) as any;
              const nextPrefs = {
                ...(existingPrefs || {}),
                town: city,
                county: country,
                coordinates: { latitude: candidate.latitude, longitude: candidate.longitude },
              };

              await supabase.from('users').update({ location_preferences: nextPrefs }).eq('id', data.user.id);
            }
          } catch {
            // ignore - non-blocking
          }
        }

        // Generate referral code immediately at signup
        try {
          const { data: refCode, error: refCodeError } = await supabase
            .rpc('generate_referral_code', { user_id_param: data.user.id });

          if (!refCodeError && refCode) {
            await supabase
              .from('user_referral_codes')
              .insert({
                user_id: data.user.id,
                referral_code: refCode
              });
          }
        } catch {
          // Silently handle referral code generation failure
        }
      }

      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      
      // Handle network-related errors with user-friendly messages
      if (errorMessage.includes('fetch failed') || 
          errorMessage.includes('ENOTFOUND') || 
          errorMessage.includes('network') ||
          (error instanceof Error && 'cause' in error && (error.cause as { code?: string })?.code === 'ENOTFOUND')) {
        return { 
          data: null, 
          error: { message: 'Network connection failed. Please check your internet connection and try again.' }
        };
      }
      
      return { data: null, error: { message: errorMessage } };
    }
  }

  /**
   * Complete profile for a user who signed in via OTP (Supabase signInWithOtp).
   * Sets password and metadata, creates/updates users table row.
   */
  async completeProfileFromOtp({
    fullName,
    password,
    email,
    phone,
    city,
    country,
    referralCode,
    referralSource,
  }: CompleteProfileFromOtpData): Promise<{ data: UserProfile | null; error: { message: string } | null }> {
    try {
      const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !sessionUser) {
        return { data: null, error: { message: 'Session expired. Please verify again.' } };
      }

      const emailNormalized = email.trim().toLowerCase();
      const phoneTrimmed = phone.trim();
      const cityTrimmed = city?.trim() || '';
      const countryTrimmed = country?.trim() || '';
      const referralCodeSafe = referralCode?.trim().match(/[A-Za-z0-9]{4,32}/)?.[0]?.toUpperCase() ?? '';
      const referralSourceSafe = referralSource?.trim() || 'unknown';

      // If the OTP session was created via phone (no auth email), attach a confirmed email
      // so the user can later sign in with email + password.
      const sessionEmailNormalized = normalizeAuthEmail(sessionUser.email);
      if (!sessionEmailNormalized && emailNormalized) {
        const { data: setEmailData, error: setEmailError } = await supabase.functions.invoke<{
          success: boolean;
          email?: string;
          error?: string;
          code?: string;
        }>('otp-set-email', {
          body: { email: emailNormalized },
        });

        if (setEmailError || !setEmailData?.success) {
          let message = setEmailError?.message || setEmailData?.error || 'Failed to set email for this account';
          let code = setEmailData?.code || 'UPDATE_FAILED';

          const context = (setEmailError as unknown as { context?: { json?: () => Promise<unknown> } }).context;
          if (context && typeof context.json === 'function') {
            try {
              const payload = await context.json() as { error?: string; code?: string };
              if (payload?.error) message = payload.error;
              if (payload?.code) code = payload.code;
            } catch {
              // ignore
            }
          }

          if (code === 'EMAIL_TAKEN') {
            return { data: null, error: { message: 'That email is already in use. Please use a different email.' } };
          }

          return { data: null, error: { message } };
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
        data: {
          full_name: fullName.trim(),
          phone: phoneTrimmed || undefined,
          city: cityTrimmed || undefined,
          country: countryTrimmed || undefined,
          ...(referralCodeSafe ? { referral_code: referralCodeSafe, referral_source: referralSourceSafe } : {}),
        },
      });

      if (updateError) {
        if (!updateError.message.toLowerCase().includes('same') && !updateError.message.includes('identical')) {
          return { data: null, error: { message: updateError.message } };
        }
      }

      const { error: upsertError } = await supabase.from('users').upsert(
        {
          id: sessionUser.id,
          email: emailNormalized || undefined,
          full_name: fullName.trim(),
          phone: phoneTrimmed || undefined,
          kyc_status: 'pending',
          creator_verification_status: 'unverified',
        },
        { onConflict: 'id' }
      );

      if (upsertError && !upsertError.message.includes('duplicate')) {
        return { data: null, error: { message: upsertError.message } };
      }

      if (cityTrimmed && countryTrimmed) {
        try {
          const geo = await locationService.geocodeAddress(cityTrimmed, countryTrimmed);
          const candidate = geo.success ? geo.results?.[0]?.coordinate : null;
          if (candidate) {
            await supabase.from('users').update({
              location_preferences: {
                town: cityTrimmed,
                county: countryTrimmed,
                coordinates: { latitude: candidate.latitude, longitude: candidate.longitude },
              },
            }).eq('id', sessionUser.id);
          }
        } catch {
          // Non-blocking
        }
      }

      try {
        const { data: refCode } = await supabase.rpc('generate_referral_code', { user_id_param: sessionUser.id });
        if (refCode) {
          await supabase.from('user_referral_codes').upsert(
            { user_id: sessionUser.id, referral_code: refCode },
            { onConflict: 'user_id' }
          );
        }
      } catch {
        // Non-blocking
      }

      const metadata = sessionUser.user_metadata as Record<string, unknown> || {};
      const location = normalizeUserLocation({ ...metadata, city: cityTrimmed, country: countryTrimmed });

      const profile: UserProfile = {
        id: sessionUser.id,
        email: emailNormalized || '',
        fullName: fullName.trim(),
        phoneNumber: phoneTrimmed,
        profileImageUrl: null,
        location,
        kycStatus: 'pending',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { data: profile, error: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to complete profile';
      return { data: null, error: { message: msg } };
    }
  }

  // Sign in existing user
  async signIn({ email, password }: SignInData) {
    try {
      // Normalize and trim inputs
      email = email.trim().toLowerCase();
      password = password.trim();
      
      // Verify polyfills are loaded
      if (typeof global.Buffer === 'undefined') {
        return {
          data: null,
          error: { message: 'App initialization error. Please restart the app.' }
        };
      }
      
      // Test Supabase connection before attempting login (non-blocking)
      // We run this but don't block on it - just log the result in development
      if (__DEV__) {
        import('./testSupabaseConnection').then(({ testSupabaseConnection }) => {
          testSupabaseConnection();
        }).catch(() => {
          // Silently fail connection test in production
        });
      }
      
      // Check rate limit
      const identifier = getUserIdentifier(email);
      const rateLimitCheck = loginRateLimiter.checkLimit(identifier);
      
      if (!rateLimitCheck.allowed) {
        const message = formatRetryMessage(rateLimitCheck.retryAfter || 0);
        
        // Send account locked alert (non-blocking)
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
          
          if (userData?.id) {
            const minutesRemaining = Math.ceil((rateLimitCheck.retryAfter || 0) / 60);
            transactionalNotificationService.sendAccountLockedAlert(
              userData.id,
              minutesRemaining
            ).catch(() => {});
          }
        } catch {
          // Silently fail - don't block login flow
        }
        
        throw new Error(`Too many login attempts. ${message}`);
      }
      
      // Only try Supabase auth if configured
      if (!isSupabaseConfigured()) {
        return {
          data: null, 
          error: { message: 'App not properly configured. Please contact support.' } 
        };
      }

      // DON'T clear stale session before login - it triggers SIGNED_OUT event
      // which interferes with the login flow by clearing Redux state
      // Supabase will handle replacing the old session automatically
      
      if (__DEV__) {
        console.log('[AuthService] Attempting to sign in with Supabase...');
      }
      
      // Let Supabase handle timeouts - removing custom timeout that interferes
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (__DEV__) {
        console.log('[AuthService] Sign in result received:', { 
          hasData: !!data,
          hasError: !!error,
          errorMessage: error?.message 
        });
      }
      
      // Handle errors first
      if (error) {
        if (__DEV__) {
          console.log('[AuthService] Sign in error detected:', error.message);
        }
        // Provide user-friendly error messages
        if (error.message.includes('fetch failed') || error.message.includes('network') || error.message.includes('timeout')) {
          return { 
            data: null, 
            error: { message: 'Network connection failed. Please check your internet connection and try again.' }
          };
        }
        if (error.message.includes('Invalid login credentials')) {
          // Send failed login alert (non-blocking) - only if we can identify the user
          void (async () => {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();
              
              if (userData?.id) {
                transactionalNotificationService.sendFailedLoginAlert(userData.id, {
                  email,
                  timestamp: new Date().toISOString(),
                }).catch(() => {});
              }
            } catch {
              // Silently fail - don't block login flow
            }
          })();
          
          return { 
            data: null, 
            error: { message: 'Invalid email or password. Please try again.' }
          };
        }
        return { data: null, error };
      }
      
      // Check if we have valid data
      if (!data || !data.user) {
        return {
          data: null,
          error: { message: 'Authentication failed. Please try again.' }
        };
      }
      
      // Check if email is verified
      if (!data.user.email_confirmed_at) {
        if (__DEV__) {
          console.log('[AuthService] Email not verified for user:', data.user.email);
        }
        // Sign out the user immediately
        await supabase.auth.signOut();
        return {
          data: null,
          error: { message: 'Please verify your email before signing in. Check your inbox for the verification link.' }
        };
      }
      
      if (__DEV__) {
        console.log('[AuthService] Email verified, login successful for:', data.user.email);
      }
      
      // Reset rate limit on successful login
      loginRateLimiter.reset(identifier);
      
      // Send sign-in alert notification (non-blocking)
      if (data.user?.id) {
        transactionalNotificationService.sendSignInAlert(data.user.id, {
          email,
          timestamp: new Date().toISOString(),
        }).catch((error) => {
          if (__DEV__) {
            console.error('[AuthService] Failed to send sign-in alert:', error);
          }
        });
      }
      
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      
      // Handle network-related errors
      if (errorMessage.includes('fetch failed') || 
          errorMessage.includes('ENOTFOUND') || 
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          (error instanceof Error && 'cause' in error && (error.cause as { code?: string })?.code === 'ENOTFOUND')) {
        return { 
          data: null, 
          error: { message: 'Network connection failed. Please check your internet connection and try again.' }
        };
      }
      return { data: null, error: { message: errorMessage } };
    }
  }

  // Sign out current user
  async signOut(options?: { scope?: 'global' | 'local' | 'others' }) {
    try {
      const scope = options?.scope ?? 'global';
      const result = await supabase.auth.signOut({ scope });

      // Best-effort: even if server-side revocation fails, ensure local session is cleared
      // so the user can reliably switch accounts on this device.
      if (result.error && scope !== 'local') {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }

      return result;
    } catch (error) {
      // Best-effort local clear even when the primary request errors.
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore
      }
      return { error: error as any };
    }
  }

  // Get current user profile
  async getCurrentUser(options?: { traceId?: string; logContext?: string }): Promise<UserProfile | null> {
    const traceLabel = options?.traceId
      ? `[AuthService][getCurrentUser][${options.traceId}]`
      : '[AuthService][getCurrentUser]';
    const startTime = Date.now();
    try {
      // If Supabase is not configured, return null
      if (!isSupabaseConfigured()) {
        if (__DEV__) {
          console.log(`${traceLabel} Supabase not configured`);
        }
        return null;
      }
      
      // Quick check: if no session exists, return immediately
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        if (__DEV__) {
          console.log(
            `${traceLabel} No session`,
            sessionError ? { message: sessionError.message } : undefined
          );
        }
        return null;
      }
      
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        if (__DEV__) {
          console.log(
            `${traceLabel} Auth user missing`,
            authError ? { message: authError.message } : undefined
          );
        }
        return null;
      }

      const authMetadataLocation = normalizeUserLocation(authUser.user.user_metadata);

      // Single attempt to fetch profile - no retries to prevent timeout
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.user.id)
        .single();

      if (error) {
        // If it's an auth error (invalid JWT, expired session), clear session and return null
        if (error.message?.includes('JWT') || error.message?.includes('expired') || error.code === 'PGRST301') {
          await supabase.auth.signOut({ scope: 'local' });
          return null;
        }
        if (__DEV__) {
          console.log(`${traceLabel} Profile fetch error`, {
            code: error.code,
            message: error.message,
          });
        }
      }

      // If profile doesn't exist, create it automatically (no retries)
      if (error || !profile) {
        
        // PHASE 2 FIX: Use upsert instead of insert to avoid duplicate key errors
        // Profile doesn't exist - create or update it (handles race conditions with triggers)
        const metadata = authUser.user.user_metadata;
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .upsert({
            id: authUser.user.id,
            email: authUser.user.email || '',
            full_name: metadata?.full_name || '',
            phone: metadata?.phone || '',
            kyc_status: 'pending',
            creator_verification_status: 'unverified',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id', // Handle conflicts on the id column
            ignoreDuplicates: false, // Update existing records
          })
          .select()
          .single();
        
        if (!createError && newProfile) {
          const location =
            normalizeUserLocation(newProfile.location_preferences) ?? authMetadataLocation;
          if (__DEV__) {
            console.log(`${traceLabel} Profile created via upsert`, {
              durationMs: Date.now() - startTime,
            });
          }
          return {
            id: newProfile.id,
            email: newProfile.email,
            fullName: newProfile.full_name || '',
            phoneNumber: newProfile.phone || '',
            profileImageUrl: newProfile.profile_image_url || null,
            location,
            kycStatus: (newProfile.kyc_status || 'pending') as 'pending' | 'verified' | 'rejected',
            isActive: true,
            createdAt: newProfile.created_at || new Date().toISOString(),
            updatedAt: newProfile.updated_at || new Date().toISOString(),
          };
        }

        if (__DEV__ && createError) {
          console.log(`${traceLabel} Profile upsert failed`, {
            code: createError.code,
            message: createError.message,
          });
        }
        
        // If duplicate key error, profile exists - fetch it
        if (createError && (createError.code === '23505' || createError.message.includes('duplicate key value'))) {
          const { data: finalProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.user.id)
            .single();
          
          if (finalProfile) {
            const location =
              normalizeUserLocation(finalProfile.location_preferences) ?? authMetadataLocation;
            return {
              id: finalProfile.id,
              email: finalProfile.email,
              fullName: finalProfile.full_name || '',
              phoneNumber: finalProfile.phone || '',
              profileImageUrl: finalProfile.profile_image_url || null,
              location,
              kycStatus: (finalProfile.kyc_status || 'pending') as 'pending' | 'verified' | 'rejected',
              isActive: true,
              createdAt: finalProfile.created_at || new Date().toISOString(),
              updatedAt: finalProfile.updated_at || new Date().toISOString(),
            };
          }
        }
        
        // Failed to fetch or create
        return null;
      }

      if (__DEV__) {
        console.log(`${traceLabel} Profile loaded`, {
          durationMs: Date.now() - startTime,
        });
      }
      const userRecord = profile;
      const location =
        normalizeUserLocation(userRecord.location_preferences) ?? authMetadataLocation;
      return {
        id: userRecord.id,
        email: userRecord.email,
        fullName: userRecord.full_name || '',
        phoneNumber: userRecord.phone || '',
        profileImageUrl: userRecord.profile_image_url || null,
        location,
        kycStatus: (userRecord.kyc_status || 'pending') as 'pending' | 'verified' | 'rejected',
        isActive: true,
        createdAt: userRecord.created_at || new Date().toISOString(),
        updatedAt: userRecord.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      if (__DEV__) {
        console.log(`${traceLabel} Unexpected error`, error);
      }
      return null;
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<UserProfile & { bio?: string; location?: { county: string; town: string } }>) {
    try {
      if (!isSupabaseConfigured()) {
        return {
          data: null,
          error: { message: 'App not properly configured. Please contact support.' } 
        };
      }

      const { data: authUser } = await supabase.auth.getUser();
      
      if (!authUser.user) throw new Error('No authenticated user');

      const updateData: {
        full_name?: string;
        phone?: string;
        profile_image_url?: string | null;
        bio?: string;
        location_preferences?: { county: string; town: string };
        updated_at: string;
      } = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
      if (updates.phoneNumber !== undefined) updateData.phone = updates.phoneNumber;
      if (updates.profileImageUrl !== undefined) updateData.profile_image_url = updates.profileImageUrl;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.location !== undefined) {
        updateData.location_preferences = {
          county: updates.location.county,
          town: updates.location.town
        };
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authUser.user.id)
        .select()
        .single();

      const shouldSyncStream =
        updates.fullName !== undefined || updates.profileImageUrl !== undefined;
      if (!error && shouldSyncStream) {
        streamUserSyncService.syncCurrentUserToStream().catch((syncError) => {
          logger.debug('[AuthService][updateProfile] Stream user sync failed', {
            message: syncError instanceof Error ? syncError.message : String(syncError),
          });
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Reset password
  async resetPassword(email: string) {
    try {
      // Normalize and trim email
      email = email.trim().toLowerCase();
      
      // Check rate limit
      const identifier = getUserIdentifier(email);
      const rateLimitCheck = passwordResetRateLimiter.checkLimit(identifier);
      
      if (!rateLimitCheck.allowed) {
        const message = formatRetryMessage(rateLimitCheck.retryAfter || 0);
        throw new Error(`Too many password reset attempts. ${message}`);
      }
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'linkapp://auth/reset-password',
      });
      
      if (error) {
        // Handle errors with user-friendly messages
        if (error.message.includes('fetch failed') || error.message.includes('network')) {
          return { 
            data: null, 
            error: { message: 'Network connection failed. Please check your internet connection and try again.' }
          };
        }
        return { data: null, error };
      }
      
      // Reset rate limit on success
      passwordResetRateLimiter.reset(identifier);
      
      // Send password reset requested notification (non-blocking)
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();
        
        if (userData?.id) {
          transactionalNotificationService.sendPasswordResetRequestedAlert(userData.id)
            .catch(() => {});
        }
      } catch {
        // Silently fail - don't block password reset flow
      }
      
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      
      // Handle network errors
      if (errorMessage.includes('fetch failed') || 
          errorMessage.includes('network')) {
        return { 
          data: null, 
          error: { message: 'Network connection failed. Please check your internet connection and try again.' }
        };
      }
      return { data: null, error: { message: errorMessage } };
    }
  }

  // Update password (called after password reset)
  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { data: null, error };
      }

      // Send password changed notification (non-blocking)
      if (data.user?.id) {
        transactionalNotificationService.sendPasswordChangedAlert(data.user.id)
          .catch((error) => {
            if (__DEV__) {
              console.error('[AuthService] Failed to send password changed alert:', error);
            }
          });
      }

      return { data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Password update failed') 
      };
    }
  }

  // Resend verification email for email confirmation
  async resendVerificationEmail(email: string) {
    try {
      // Normalize and trim email
      email = email.trim().toLowerCase();
      
      // Check rate limit
      const identifier = getUserIdentifier(email);
      const rateLimitCheck = signupRateLimiter.checkLimit(identifier);
      
      if (!rateLimitCheck.allowed) {
        const message = formatRetryMessage(rateLimitCheck.retryAfter || 0);
        throw new Error(`Too many verification email requests. ${message}`);
      }

      // Resend the confirmation email
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'linkapp://auth/callback',
        },
      });

      if (error) {
        // Handle errors with user-friendly messages
        if (error.message.includes('fetch failed') || error.message.includes('network')) {
          return { 
            data: null, 
            error: { message: 'Network connection failed. Please check your internet connection and try again.' }
          };
        }
        return { data: null, error };
      }

      // Reset rate limit on success
      signupRateLimiter.reset(identifier);

      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
      
      // Handle network errors
      if (errorMessage.includes('fetch failed') || 
          errorMessage.includes('network')) {
        return { 
          data: null, 
          error: { message: 'Network connection failed. Please check your internet connection and try again.' }
        };
      }
      return { data: null, error: { message: errorMessage } };
    }
  }

  // Phone verification for Date Mi (18+ requirement)
  async initiatePhoneVerification(_phone: string) {
    // Implementation will depend on SMS service provider
    // This is a placeholder for the verification logic
    // Send SMS verification code
    // Integration with SMS service (e.g., Twilio, AWS SNS)
    return { success: true, error: null };
  }

  // Age verification for Date Mi feature
  async submitAgeVerification(documentData: {
    documentType: string;
    documentNumber: string;
    dateOfBirth: string;
    documentImageUrl: string;
  }) {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      
      if (!authUser.user) throw new Error('No authenticated user');

      // Store age verification data (secure handling required)
      const { data, error } = await supabase
        .from('age_verifications')
        .insert({
          user_id: authUser.user.id,
          document_type: documentData.documentType,
          document_number: documentData.documentNumber, // Should be encrypted
          date_of_birth: documentData.dateOfBirth,
          document_image_url: documentData.documentImageUrl,
          verification_status: 'pending',
        });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Test Supabase connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!isSupabaseConfigured()) {
        return {
          success: false,
          message: 'Supabase not configured. Please add your credentials to .env file.'
        };
      }

      // Test database connection by querying users table
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return {
          success: false,
          message: `Database connection failed: ${error.message}`
        };
      }

      return {
        success: true,
        message: `Supabase connected successfully! Database has ${count || 0} users.`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Connection test failed: ${errorMessage}`
      };
    }
  }
}

let instance: AuthService | null = null;
function getInstance(): AuthService {
  if (!instance) instance = new AuthService();
  return instance;
}

export const authService = new Proxy({} as AuthService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

