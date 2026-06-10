/**
 * User-facing error helpers
 *
 * Goal: convert unknown/technical errors into clear, human-friendly, actionable messages.
 * Keep messages short, contextual, and avoid leaking implementation details.
 */

export type ErrorDisplayStyle = 'alert' | 'inline';

export type UserFacingErrorKind =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'permission'
  | 'rateLimit'
  | 'notFound'
  | 'unknown';

export type UserFacingErrorOptions = {
  /**
   * A short verb phrase describing what the user was trying to do.
   * Examples: "sign in", "load properties", "send your message", "update your profile photo"
   */
  action?: string;
  /**
   * Display style controls whether we include a "What you can do" section.
   */
  displayStyle?: ErrorDisplayStyle;
  /**
   * Optional explicit title/message fallbacks.
   */
  fallbackTitle?: string;
  fallbackMessage?: string;
};

export type UserFacingError = {
  kind: UserFacingErrorKind;
  title: string;
  message: string;
  recoverySteps: string[];
};

const DEFAULT_UNKNOWN_TITLE = 'Something went wrong';
const DEFAULT_UNKNOWN_MESSAGE = 'Please try again.';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isTimeoutMessage(messageLower: string): boolean {
  return (
    messageLower.includes('timeout') ||
    messageLower.includes('timed out') ||
    messageLower.includes('aborterror') ||
    messageLower.includes('aborted') ||
    messageLower.includes('etimedout')
  );
}

function isNetworkMessage(messageLower: string): boolean {
  return (
    messageLower.includes('network request failed') ||
    messageLower.includes('failed to fetch') ||
    messageLower.includes('fetch failed') ||
    messageLower.includes('enotfound') ||
    messageLower.includes('econn') ||
    messageLower.includes('connection') ||
    messageLower.includes('network')
  );
}

function isRateLimitMessage(messageLower: string): boolean {
  return (
    (messageLower.includes('too many') && messageLower.includes('attempt')) ||
    messageLower.includes('rate limit') ||
    messageLower.includes('retry after')
  );
}

function isNotFoundMessage(messageLower: string): boolean {
  return (
    messageLower.includes('not found') ||
    messageLower.includes('does not exist') ||
    messageLower.includes('no longer available')
  );
}

function isAuthMessage(messageLower: string): boolean {
  return (
    messageLower.includes('invalid email or password') ||
    messageLower.includes('invalid login') ||
    messageLower.includes('invalid credentials') ||
    messageLower.includes('unauthorized') ||
    messageLower.includes('session') ||
    messageLower.includes('not authenticated') ||
    messageLower.includes('sign in') ||
    messageLower.includes('login')
  );
}

function isStreamChatTokenSignatureError(messageLower: string): boolean {
  return (
    (messageLower.includes('jwtauth error') && messageLower.includes('signature')) ||
    messageLower.includes('signature is not valid')
  );
}

function isPermissionMessage(messageLower: string): boolean {
  return (
    messageLower.includes('permission') ||
    messageLower.includes('not granted') ||
    messageLower.includes('denied') ||
    messageLower.includes('camera permission') ||
    messageLower.includes('microphone permission') ||
    messageLower.includes('location permission') ||
    messageLower.includes('notification permission')
  );
}

function getPermissionLabel(messageLower: string): string | null {
  if (messageLower.includes('camera')) return 'Camera';
  if (messageLower.includes('microphone')) return 'Microphone';
  if (messageLower.includes('location')) return 'Location';
  if (messageLower.includes('notification')) return 'Notifications';
  if (messageLower.includes('photo') || messageLower.includes('media library') || messageLower.includes('camera roll')) {
    return 'Photos';
  }
  return null;
}

function formatRecoverySteps(displayStyle: ErrorDisplayStyle, steps: string[]): string {
  if (displayStyle !== 'alert' || steps.length === 0) return '';
  return `\n\nWhat you can do:\n- ${steps.join('\n- ')}`;
}

function truncateForDetails(input: string, maxLength: number = 220): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getUserFacingError(error: unknown, options: UserFacingErrorOptions = {}): UserFacingError {
  const {
    action,
    displayStyle = 'alert',
    fallbackTitle = DEFAULT_UNKNOWN_TITLE,
    fallbackMessage = DEFAULT_UNKNOWN_MESSAGE,
  } = options;

  const rawMessage = getErrorMessage(error).trim();
  const messageLower = rawMessage.toLowerCase();

  // Special-case: Stream Chat token signature mismatch is a configuration issue,
  // not an end-user auth problem. Avoid misleading "sign in again" guidance.
  if (isStreamChatTokenSignatureError(messageLower)) {
    const safeAction = options.action?.trim();
    const actionPhrase = safeAction ? safeAction : 'do that';
    const title = safeAction ? `Couldn't ${safeAction}` : 'Chat unavailable';
    const message =
      `We couldn't ${actionPhrase} because chat is temporarily unavailable.` +
      (typeof __DEV__ !== 'undefined' && __DEV__
        ? '\n\nDev hint: Stream token signature mismatch. Ensure Supabase Edge Function secret matches the Stream API key used by the app.'
        : '');
    return {
      kind: 'unknown',
      title,
      message,
      recoverySteps: ['Try again', 'If it keeps happening, restart the app'],
    };
  }

  // Classify the error into a user-relevant bucket
  let kind: UserFacingErrorKind = 'unknown';
  if (isPermissionMessage(messageLower)) kind = 'permission';
  else if (isRateLimitMessage(messageLower)) kind = 'rateLimit';
  else if (isTimeoutMessage(messageLower)) kind = 'timeout';
  else if (isNetworkMessage(messageLower)) kind = 'network';
  else if (isNotFoundMessage(messageLower)) kind = 'notFound';
  else if (isAuthMessage(messageLower)) kind = 'auth';

  const safeAction = action?.trim();
  const actionPhrase = safeAction ? safeAction : 'complete that';

  const recoverySteps: string[] = [];
  let title = fallbackTitle;
  let message = fallbackMessage;

  switch (kind) {
    case 'network': {
      title = safeAction ? `Couldn't ${safeAction}` : 'Connection problem';
      message = `We couldn't ${actionPhrase} because your internet connection seems unavailable.`;
      recoverySteps.push('Check your internet connection', 'Try again');
      break;
    }
    case 'timeout': {
      title = safeAction ? `Couldn't ${safeAction}` : 'Taking too long';
      message = `That took too long to respond, so we couldn't ${actionPhrase}.`;
      recoverySteps.push('Try again', 'If it keeps timing out, switch networks or try again later');
      break;
    }
    case 'auth': {
      // Preserve common credential messages, but add a clear next step.
      if (messageLower.includes('invalid email or password') || messageLower.includes('invalid credentials')) {
        title = 'Sign in failed';
        message = 'The email or password you entered doesn’t match. Please check and try again.';
        recoverySteps.push('Re-enter your email and password', 'Use “Forgot password” if you can’t remember it');
      } else if (messageLower.includes('already exists') || messageLower.includes('already registered')) {
        title = 'Account already exists';
        message = 'An account with this email already exists. Please sign in instead.';
        recoverySteps.push('Go to Sign in', 'Use “Forgot password” if needed');
      } else {
        title = 'Sign in required';
        message = `Your session may have expired, so we couldn't ${actionPhrase}. Please sign in again.`;
        recoverySteps.push('Sign in again', 'Then try your action again');
      }
      break;
    }
    case 'permission': {
      const permission = getPermissionLabel(messageLower);
      title = permission ? `${permission} permission needed` : 'Permission needed';
      message = `To ${actionPhrase}, allow access in your device settings.`;
      if (permission) {
        message = `To ${actionPhrase}, allow ${permission} access in your device settings.`;
        recoverySteps.push(`Open Settings and enable ${permission} access`, 'Return to the app and try again');
      } else {
        recoverySteps.push('Open Settings and enable the required permission', 'Return to the app and try again');
      }
      break;
    }
    case 'rateLimit': {
      title = safeAction ? `Couldn't ${safeAction}` : 'Too many attempts';
      message = 'Too many attempts in a short time. Please wait a moment and try again.';
      recoverySteps.push('Wait a moment, then try again');
      break;
    }
    case 'notFound': {
      title = safeAction ? `Couldn't ${safeAction}` : 'Not available';
      message = `We couldn't ${actionPhrase} because this item is no longer available.`;
      recoverySteps.push('Go back and try again', 'Refresh the list and select the item again');
      break;
    }
    case 'unknown':
    default: {
      title = safeAction ? `Couldn't ${safeAction}` : fallbackTitle;
      if (safeAction) {
        message = `We couldn't ${actionPhrase} right now.`;
        // When we have a concrete underlying error message, include a short detail.
        // This helps users (and QA) understand what failed without hiding everything
        // behind a generic message.
        if (rawMessage.length > 0) {
          message = `${message}\n\nDetails: ${truncateForDetails(rawMessage)}`;
        }
      } else {
        message = rawMessage.length > 0 ? truncateForDetails(rawMessage) : fallbackMessage;
      }
      recoverySteps.push('Try again', 'If this keeps happening, restart the app');
      break;
    }
  }

  // Keep inline errors tight (no list formatting)
  if (displayStyle === 'inline') {
    // Use a single actionable hint if available.
    if (kind === 'network') {
      message = safeAction
        ? `We couldn't ${actionPhrase}. Check your internet connection and try again.`
        : 'Check your internet connection and try again.';
    } else if (kind === 'timeout') {
      message = safeAction ? `We couldn't ${actionPhrase} in time. Please try again.` : 'Please try again.';
    } else if (kind === 'permission') {
      const permission = getPermissionLabel(messageLower);
      message = permission
        ? `Allow ${permission} access in Settings, then try again.`
        : 'Allow the required permission in Settings, then try again.';
    }
    return { kind, title, message, recoverySteps };
  }

  return {
    kind,
    title,
    message: `${message}${formatRecoverySteps(displayStyle, recoverySteps)}`,
    recoverySteps,
  };
}

export function getUserFacingErrorMessage(error: unknown, options: UserFacingErrorOptions = {}): string {
  return getUserFacingError(error, { ...options, displayStyle: 'inline' }).message;
}

export function getUserFacingErrorTitle(error: unknown, options: UserFacingErrorOptions = {}): string {
  return getUserFacingError(error, { ...options, displayStyle: 'alert' }).title;
}

