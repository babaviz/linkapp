import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

const HAS_PREVIOUS_AUTH_SESSION_KEY = '@linkapp_has_previous_auth_session_v1';

/**
 * Marks that this device has seen at least one authenticated session.
 * This allows first-launch routing without affecting auth/session behavior.
 */
export async function markAuthenticatedSessionSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_PREVIOUS_AUTH_SESSION_KEY, '1');
  } catch (error) {
    logger.debug('[AuthLaunchState] Failed to persist auth session marker', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Returns true once a user has authenticated on this install before.
 * On storage read errors we default to false so transient errors don't
 * incorrectly route fresh installs to the Login screen instead of Welcome.
 */
export async function hasSeenAuthenticatedSessionBefore(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HAS_PREVIOUS_AUTH_SESSION_KEY);
    return value === '1';
  } catch (error) {
    logger.debug('[AuthLaunchState] Failed to read auth session marker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

