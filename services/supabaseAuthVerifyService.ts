/**
 * Supabase Auth native OTP verification.
 * Supabase generates and validates OTP; Twilio (Verify or Messaging) delivers SMS.
 * When Supabase uses Twilio Verify, GoTrue calls Twilio Verify API; error 60238 may occur.
 */
import { supabase } from './supabaseClient';

export type VerificationChannel = 'sms' | 'email';

export interface SendOtpResult {
  success: boolean;
  error?: string;
  code?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  verifiedIdentifier?: string;
  verifiedType?: 'phone' | 'email';
  error?: string;
  code?: string;
}

const supabaseAuthVerifyService = {
  /**
   * Sends OTP via Supabase Auth. Supabase generates the code; Twilio (SMS) or
   * built-in email delivers it. Configure Phone/Email providers in Supabase Dashboard.
   */
  async sendOtp(
    identifier: string,
    channel: VerificationChannel
  ): Promise<SendOtpResult> {
    try {
      if (channel === 'sms') {
        const { error } = await supabase.auth.signInWithOtp({
          phone: identifier.trim(),
          options: { shouldCreateUser: true },
        });
        if (error) {
          const msg = error.message;
          const lower = msg.toLowerCase();
          let code: string = 'AUTH_ERROR';
          if (lower.includes('rate') || lower.includes('too many')) code = 'RATE_LIMITED';
          else if (
            lower.includes('60238') ||
            lower.includes('blocked by twilio') ||
            lower.includes('verification temporarily blocked')
          )
            code = 'TWILIO_BLOCKED';
          return {
            success: false,
            error: msg,
            code,
          };
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier.trim().toLowerCase(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: 'linkapp://auth/callback',
          },
        });
        if (error) {
          const msg = error.message;
          const lower = msg.toLowerCase();
          let code: string = 'AUTH_ERROR';
          if (lower.includes('rate') || lower.includes('too many')) code = 'RATE_LIMITED';
          else if (lower.includes('60238') || lower.includes('blocked by twilio')) code = 'TWILIO_BLOCKED';
          return {
            success: false,
            error: msg,
            code,
          };
        }
      }
      return { success: true };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        success: false,
        error: e?.message ?? 'Failed to send verification code',
        code: 'AUTH_ERROR',
      };
    }
  },

  /**
   * Verifies OTP with Supabase Auth. On success, user has a session.
   */
  async verifyOtp(
    identifier: string,
    token: string,
    channel: VerificationChannel
  ): Promise<VerifyOtpResult> {
    try {
      const normalizedIdentifier = channel === 'email' ? identifier.trim().toLowerCase() : identifier.trim();
      const trimmedToken = token.trim();

      const { error } =
        channel === 'sms'
          ? await supabase.auth.verifyOtp({
              phone: normalizedIdentifier,
              token: trimmedToken,
              type: 'sms',
            })
          : await supabase.auth.verifyOtp({
              email: normalizedIdentifier,
              token: trimmedToken,
              type: 'email',
            });

      if (error) {
        const isExpired = error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid');
        const isRateLimit = error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('too many');
        return {
          success: false,
          error: error.message,
          code: isExpired ? 'CODE_EXPIRED' : isRateLimit ? 'MAX_ATTEMPTS' : 'AUTH_ERROR',
        };
      }

      const verifiedType: 'phone' | 'email' = channel === 'sms' ? 'phone' : 'email';
      return {
        success: true,
        verifiedIdentifier: normalizedIdentifier,
        verifiedType,
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        success: false,
        error: e?.message ?? 'Verification failed',
        code: 'AUTH_ERROR',
      };
    }
  },
};

export default supabaseAuthVerifyService;
