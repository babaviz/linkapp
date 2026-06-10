import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  isCancelledResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabaseClient';
import logger from '../utils/logger';

let isConfigured = false;

function mapGoogleErrorHint(code: string): string {
  if (code === 'DEVELOPER_ERROR' || code === '10') {
    return 'oauth_mismatch_sha_or_package';
  }
  if (code === 'SIGN_IN_FAILED') {
    return 'sign_in_failed_retryable';
  }
  if (code === statusCodes.IN_PROGRESS) {
    return 'sign_in_already_in_progress';
  }
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'play_services_missing_or_outdated';
  }
  return 'unknown_google_signin_error';
}

function ensureConfigured() {
  if (isConfigured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    logger.warn('[GoogleAuthService] Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    throw new Error('missing_google_web_client_id');
  }
  GoogleSignin.configure({
    webClientId,
    scopes: ['email', 'profile'],
    offlineAccess: false,
  });
  isConfigured = true;
}

export type GoogleSignInError =
  | 'cancelled'
  | 'play_services_unavailable'
  | 'missing_web_client_id'
  | 'no_id_token'
  | 'supabase_error'
  | 'developer_error'
  | 'unknown';

export type GoogleSignInResult =
  | { success: true; isNewUser: boolean }
  | { success: false; errorType: GoogleSignInError; message: string };

async function getIdToken(): Promise<string | null> {
  const response = await GoogleSignin.signIn();

  // v16: cancelled returns { type: 'cancelled', data: null } without throwing
  if (isCancelledResponse(response)) {
    return null;
  }

  if (isSuccessResponse(response)) {
    // idToken can be null when webClientId is missing — fall back to getTokens()
    if (response.data.idToken) {
      return response.data.idToken;
    }
    const tokens = await GoogleSignin.getTokens();
    return tokens.idToken ?? null;
  }

  return null;
}

export const googleAuthService = {
  async signIn(): Promise<GoogleSignInResult> {
    try {
      ensureConfigured();
    } catch (error: unknown) {
      logger.warn('[GoogleAuthService] ensureConfigured failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        errorType: 'missing_web_client_id',
        message: 'Google sign in is temporarily unavailable. Please update the app and try again.',
      };
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch {
      return {
        success: false,
        errorType: 'play_services_unavailable',
        message: 'Google Play Services is not available on this device.',
      };
    }

    let idToken: string | null = null;

    try {
      idToken = await getIdToken();
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        const errorCode = String(error.code);
        const hint = mapGoogleErrorHint(errorCode);

        if (error.code === statusCodes.IN_PROGRESS) {
          return {
            success: false,
            errorType: 'unknown',
            message: 'Sign in is already in progress.',
          };
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          return {
            success: false,
            errorType: 'play_services_unavailable',
            message: 'Google Play Services is not available on this device.',
          };
        }
        // code 10 / DEVELOPER_ERROR — SHA-1 or package name not registered
        logger.warn('[GoogleAuthService] GoogleSignin.signIn error', {
          code: errorCode,
          hint,
          message: error.message,
        });
        return {
          success: false,
          errorType: 'developer_error',
          message:
            'Google sign in is not configured correctly. Please contact support.',
        };
      }
      logger.warn('[GoogleAuthService] GoogleSignin.signIn unknown error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        errorType: 'unknown',
        message: 'Google sign in failed. Please try again.',
      };
    }

    // User cancelled (returned { type: 'cancelled' })
    if (idToken === null) {
      return {
        success: false,
        errorType: 'cancelled',
        message: 'Sign in was cancelled.',
      };
    }

    const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (supabaseError) {
      logger.warn('[GoogleAuthService] supabase.auth.signInWithIdToken error', {
        message: supabaseError.message,
      });
      return {
        success: false,
        errorType: 'supabase_error',
        message: supabaseError.message || 'Authentication failed. Please try again.',
      };
    }

    const userId = data.user?.id;
    const avatarUrl = data.user?.user_metadata?.avatar_url as string | undefined;
    const isNewUser =
      (Date.now() - new Date(data.user?.created_at ?? 0).getTime()) < 10_000;

    if (avatarUrl && userId) {
      supabase
        .from('users')
        .update({ profile_image_url: avatarUrl })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) {
            logger.warn('[GoogleAuthService] Failed to update avatar_url', {
              message: error.message,
            });
          }
        });
    }

    return { success: true, isNewUser };
  },

  async signOut() {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      logger.warn('[GoogleAuthService] GoogleSignin.signOut error', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
