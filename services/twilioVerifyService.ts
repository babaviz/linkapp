import { supabase } from './supabaseClient';

export type VerificationChannel = 'sms' | 'email';

export interface SendVerificationResult {
  success: boolean;
  error?: string;
  code?: string;
}

export interface CheckVerificationResult {
  success: boolean;
  verificationToken?: string;
  identifierType?: 'phone' | 'email';
  error?: string;
  code?: string;
}

export interface BindVerificationResult {
  success: boolean;
  identifier?: string;
  identifierType?: 'phone' | 'email';
  error?: string;
  code?: string;
}

async function invokeEdgeFunction<T>(
  fnName: string,
  body: Record<string, string>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fnName, {
    body,
  });

  if (error) {
    // Supabase wraps HTTP error bodies — try to extract the message
    const context = (error as unknown as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = await context.json() as { error?: string; code?: string };
        throw { message: payload.error ?? error.message, code: payload.code };
      } catch (parseError) {
        if ((parseError as { message?: string }).message) throw parseError;
      }
    }
    throw new Error(error.message);
  }

  return data as T;
}

const twilioVerifyService = {
  /**
   * Sends an OTP to the given identifier via Twilio Verify.
   * Enforces rate limiting and duplicate-account checks server-side.
   */
  async sendVerification(
    identifier: string,
    channel: VerificationChannel
  ): Promise<SendVerificationResult> {
    try {
      await invokeEdgeFunction<{ success: boolean }>('twilio-verify-send', {
        identifier,
        channel,
      });
      return { success: true };
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      return {
        success: false,
        error: error.message ?? 'Failed to send verification code',
        code: error.code,
      };
    }
  },

  /**
   * Consumes the verification token server-side before account creation.
   * Validates the token is not expired and not already used, then marks
   * it as used atomically to prevent replay attacks.
   */
  async bindVerification(verificationToken: string): Promise<BindVerificationResult> {
    try {
      const result = await invokeEdgeFunction<{
        success: boolean;
        identifier: string;
        identifierType: 'phone' | 'email';
      }>('twilio-verify-bind', { verificationToken });

      return {
        success: true,
        identifier: result.identifier,
        identifierType: result.identifierType,
      };
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      return {
        success: false,
        error: error.message ?? 'Failed to validate verification token',
        code: error.code,
      };
    }
  },

  /**
   * Verifies the OTP code with Twilio. On success returns a short-lived
   * verificationToken that must be passed to the SignUp flow.
   */
  async checkVerification(
    identifier: string,
    code: string,
    channel: VerificationChannel
  ): Promise<CheckVerificationResult> {
    try {
      const result = await invokeEdgeFunction<{
        success: boolean;
        verificationToken: string;
        identifierType: 'phone' | 'email';
      }>('twilio-verify-check', { identifier, code, channel });

      return {
        success: true,
        verificationToken: result.verificationToken,
        identifierType: result.identifierType,
      };
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      return {
        success: false,
        error: error.message ?? 'Verification failed',
        code: error.code,
      };
    }
  },
};

export default twilioVerifyService;
