/**
 * Passcode Manager
 * Handles secure storage and validation of passcodes for Date Mi module
 */

import * as Crypto from 'expo-crypto';
import { passcodeStorage } from './passcodeStorage';

const PASSCODE_KEY = 'passcode_secure';
const PASSCODE_SALT_KEY = 'passcode_salt';
const PASSCODE_ATTEMPTS_KEY = 'passcode_attempts';
const PASSCODE_LOCKOUT_KEY = 'passcode_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export interface PasscodeValidation {
  isValid: boolean;
  minLength: number;
  maxLength: number;
  currentLength: number;
  errors: string[];
}

/**
 * Hash passcode with salt for secure storage
 */
const hashPasscode = async (passcode: string, salt: string): Promise<string> => {
  const combined = passcode + salt;
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return digest;
};

/**
 * Generate a random salt for passcode hashing
 */
const generateSalt = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return randomBytes.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
};

/**
 * Save passcode securely
 * @param passcode - The passcode to save
 * @param userId - Optional user ID for user-scoped storage (multi-account support)
 */
export const savePasscode = async (
  passcode: string,
  userId?: string | null
): Promise<boolean> => {
  try {
    // Validate passcode
    const validation = validatePasscode(passcode);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Generate salt and hash passcode
    const salt = await generateSalt();
    if (!salt || salt.length < 16) {
      throw new Error('Failed to generate secure salt');
    }

    const hashedPasscode = await hashPasscode(passcode, salt);
    if (!hashedPasscode || hashedPasscode.length < 32) {
      throw new Error('Failed to hash passcode');
    }

    // Store both securely
    await passcodeStorage.setItem(PASSCODE_KEY, hashedPasscode, userId);
    await passcodeStorage.setItem(PASSCODE_SALT_KEY, salt, userId);

    // Verify both were stored correctly
    const verifyHash = await passcodeStorage.getItem(PASSCODE_KEY, userId);
    const verifySalt = await passcodeStorage.getItem(PASSCODE_SALT_KEY, userId);

    if (verifyHash !== hashedPasscode || verifySalt !== salt) {
      // Clean up partial storage
      await passcodeStorage.deleteItem(PASSCODE_KEY, userId);
      await passcodeStorage.deleteItem(PASSCODE_SALT_KEY, userId);
      throw new Error('Storage verification failed');
    }

    // Reset attempts on successful setup
    await passcodeStorage.deleteItem(PASSCODE_ATTEMPTS_KEY, userId);
    await passcodeStorage.deleteItem(PASSCODE_LOCKOUT_KEY, userId);

    return true;
  } catch {
    return false;
  }
};

/**
 * Verify entered passcode
 * @param enteredPasscode - The passcode entered by the user
 * @param userId - Optional user ID for user-scoped storage
 */
export const verifyPasscode = async (
  enteredPasscode: string,
  userId?: string | null
): Promise<{
  isCorrect: boolean;
  attemptsRemaining: number;
  isLockedOut: boolean;
  lockoutTimeRemaining?: number;
}> => {
  try {
    // Check for lockout
    const lockoutStatus = await checkLockout(userId);
    if (lockoutStatus.isLockedOut) {
      return {
        isCorrect: false,
        attemptsRemaining: 0,
        isLockedOut: true,
        lockoutTimeRemaining: lockoutStatus.timeRemaining,
      };
    }

    // Get stored passcode and salt
    const storedHash = await passcodeStorage.getItem(PASSCODE_KEY, userId);
    const salt = await passcodeStorage.getItem(PASSCODE_SALT_KEY, userId);

    if (!storedHash || !salt) {
      throw new Error('No passcode set');
    }

    // Hash entered passcode and compare
    const enteredHash = await hashPasscode(enteredPasscode, salt);
    const isCorrect = enteredHash === storedHash;

    if (isCorrect) {
      // Reset attempts on successful verification
      await passcodeStorage.deleteItem(PASSCODE_ATTEMPTS_KEY, userId);
      return {
        isCorrect: true,
        attemptsRemaining: MAX_ATTEMPTS,
        isLockedOut: false,
      };
    } else {
      // Increment failed attempts
      const newAttempts = await incrementFailedAttempts(userId);
      const attemptsRemaining = MAX_ATTEMPTS - newAttempts;

      // Check if should lock out
      if (attemptsRemaining <= 0) {
        await setLockout(userId);
        return {
          isCorrect: false,
          attemptsRemaining: 0,
          isLockedOut: true,
          lockoutTimeRemaining: LOCKOUT_DURATION,
        };
      }

      return {
        isCorrect: false,
        attemptsRemaining,
        isLockedOut: false,
      };
    }
  } catch {
    return {
      isCorrect: false,
      attemptsRemaining: 0,
      isLockedOut: false,
    };
  }
};

/**
 * Check if passcode is set
 * @param userId - Optional user ID for user-scoped storage
 */
export const hasPasscode = async (userId?: string | null): Promise<boolean> => {
  try {
    const passcode = await passcodeStorage.getItem(PASSCODE_KEY, userId);
    return passcode !== null;
  } catch {
    return false;
  }
};

/**
 * Remove passcode (for reset functionality)
 * @param userId - Optional user ID for user-scoped storage
 */
export const removePasscode = async (userId?: string | null): Promise<boolean> => {
  try {
    await passcodeStorage.deleteItem(PASSCODE_KEY, userId);
    await passcodeStorage.deleteItem(PASSCODE_SALT_KEY, userId);
    await passcodeStorage.deleteItem(PASSCODE_ATTEMPTS_KEY, userId);
    await passcodeStorage.deleteItem(PASSCODE_LOCKOUT_KEY, userId);
    return true;
  } catch {
    return false;
  }
};

/**
 * Remove passcode for a specific user (used on account switch to clear previous user's data)
 */
export const removePasscodeForUser = async (userId: string): Promise<boolean> => {
  return removePasscode(userId);
};

/**
 * Migrate legacy (non-user-scoped) passcode to user-scoped storage.
 * Called when user has legacy passcode but no user-scoped passcode yet.
 */
export const migratePasscodeToUser = async (userId: string): Promise<boolean> => {
  try {
    const legacyHash = await passcodeStorage.getItem(PASSCODE_KEY, null);
    const legacySalt = await passcodeStorage.getItem(PASSCODE_SALT_KEY, null);
    if (!legacyHash || !legacySalt) return false;

    await passcodeStorage.setItem(PASSCODE_KEY, legacyHash, userId);
    await passcodeStorage.setItem(PASSCODE_SALT_KEY, legacySalt, userId);

    await passcodeStorage.deleteItem(PASSCODE_KEY, null);
    await passcodeStorage.deleteItem(PASSCODE_SALT_KEY, null);
    await passcodeStorage.deleteItem(PASSCODE_ATTEMPTS_KEY, null);
    await passcodeStorage.deleteItem(PASSCODE_LOCKOUT_KEY, null);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate passcode format
 */
export const validatePasscode = (passcode: string): PasscodeValidation => {
  const errors: string[] = [];
  const minLength = 4;
  const maxLength = 8;
  const currentLength = passcode.length;

  // Check if it's numeric only
  if (!/^\d*$/.test(passcode)) {
    errors.push('Passcode must contain only numbers');
  }

  // Check length
  if (currentLength < minLength) {
    errors.push(`Passcode must be at least ${minLength} digits`);
  }

  if (currentLength > maxLength) {
    errors.push(`Passcode must be no more than ${maxLength} digits`);
  }

  return {
    isValid: errors.length === 0 && currentLength >= minLength && currentLength <= maxLength,
    minLength,
    maxLength,
    currentLength,
    errors,
  };
};

/**
 * Increment failed attempts counter
 */
const incrementFailedAttempts = async (userId?: string | null): Promise<number> => {
  try {
    const currentAttempts = await passcodeStorage.getItem(PASSCODE_ATTEMPTS_KEY, userId);
    const attempts = currentAttempts ? parseInt(currentAttempts) + 1 : 1;
    await passcodeStorage.setItem(PASSCODE_ATTEMPTS_KEY, attempts.toString(), userId);
    return attempts;
  } catch {
    return 1;
  }
};

/**
 * Set lockout after max failed attempts
 */
const setLockout = async (userId?: string | null): Promise<void> => {
  const lockoutUntil = Date.now() + LOCKOUT_DURATION;
  await passcodeStorage.setItem(PASSCODE_LOCKOUT_KEY, lockoutUntil.toString(), userId);
};

/**
 * Check if currently locked out
 */
const checkLockout = async (userId?: string | null): Promise<{
  isLockedOut: boolean;
  timeRemaining: number;
}> => {
  try {
    const lockoutUntil = await passcodeStorage.getItem(PASSCODE_LOCKOUT_KEY, userId);
    if (!lockoutUntil) {
      return { isLockedOut: false, timeRemaining: 0 };
    }

    const lockoutTime = parseInt(lockoutUntil);
    const now = Date.now();

    if (now < lockoutTime) {
      return {
        isLockedOut: true,
        timeRemaining: lockoutTime - now,
      };
    } else {
      // Lockout expired, clear it
      await passcodeStorage.deleteItem(PASSCODE_LOCKOUT_KEY, userId);
      await passcodeStorage.deleteItem(PASSCODE_ATTEMPTS_KEY, userId);
      return { isLockedOut: false, timeRemaining: 0 };
    }
  } catch {
    return { isLockedOut: false, timeRemaining: 0 };
  }
};

/**
 * Get remaining attempts
 * @param userId - Optional user ID for user-scoped storage
 */
export const getRemainingAttempts = async (userId?: string | null): Promise<number> => {
  try {
    const attempts = await passcodeStorage.getItem(PASSCODE_ATTEMPTS_KEY, userId);
    return MAX_ATTEMPTS - (attempts ? parseInt(attempts) : 0);
  } catch {
    return MAX_ATTEMPTS;
  }
};
