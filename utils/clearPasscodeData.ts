/**
 * Utility to clear old passcode data with invalid keys
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearOldPasscodeData = async (): Promise<void> => {
  try {
    // List of old keys that might have the @ symbol
    const oldKeys = [
      '@datemi_passcode_secure',
      '@datemi_passcode_salt',
      '@datemi_passcode_attempts',
      '@datemi_passcode_lockout',
      '@datemi_secure_passcode_secure',
      '@datemi_secure_passcode_salt',
      '@datemi_secure_passcode_attempts',
      '@datemi_secure_passcode_lockout',
    ];

    // Remove all old keys
    await Promise.all(oldKeys.map(key => 
      AsyncStorage.removeItem(key).catch(() => {})
    ));

  } catch (error) {
    // Non-critical: failed to clear old passcode data
  }
};
