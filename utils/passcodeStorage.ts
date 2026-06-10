/**
 * Passcode Storage Wrapper
 * Provides fallback to AsyncStorage for Expo Go compatibility
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { encodeBase64, decodeBase64 } from './base64';

// Try to import SecureStore, fallback to AsyncStorage if not available
interface SecureStoreType {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

let SecureStore: SecureStoreType | null = null;
try {
  SecureStore = require('expo-secure-store') as SecureStoreType;
} catch {
  SecureStore = null;
}

const PASSCODE_PREFIX = 'datemi_secure_';

/** Build storage key with optional user scope for multi-account support */
function buildKey(key: string, userId?: string | null): string {
  if (userId && userId.trim()) {
    return `${PASSCODE_PREFIX}${userId}_${key}`;
  }
  return PASSCODE_PREFIX + key;
}

/**
 * Storage interface that works in both Expo Go and production
 * Supports optional userId for user-scoped passcode storage (same device, different accounts)
 */
class PasscodeStorage {
  private useSecureStore: boolean;

  constructor() {
    this.useSecureStore = SecureStore !== null && SecureStore.getItemAsync !== undefined;
  }

  async setItem(key: string, value: string, userId?: string | null): Promise<void> {
    if (!value || value.trim() === '') {
      throw new Error('Cannot store empty value');
    }

    const prefixedKey = buildKey(key, userId);
    
    if (this.useSecureStore) {
      try {
        await SecureStore.setItemAsync(prefixedKey, value);
        // Verify the value was stored correctly
        const retrieved = await SecureStore.getItemAsync(prefixedKey);
        if (retrieved !== value) {
          throw new Error('Storage verification failed');
        }
      } catch {
        // Silently fallback to AsyncStorage with encryption
        const encrypted = await this.encrypt(value);
        await AsyncStorage.setItem(prefixedKey, encrypted);
        // Verify the value was stored correctly
        const retrieved = await AsyncStorage.getItem(prefixedKey);
        if (!retrieved) {
          throw new Error('Failed to store encrypted value');
        }
      }
    } else {
      // Use AsyncStorage with basic encryption
      const encrypted = await this.encrypt(value);
      await AsyncStorage.setItem(prefixedKey, encrypted);
      // Verify the value was stored correctly
      const retrieved = await AsyncStorage.getItem(prefixedKey);
      if (!retrieved) {
        throw new Error('Failed to store encrypted value');
      }
    }
  }

  async getItem(key: string, userId?: string | null): Promise<string | null> {
    const prefixedKey = buildKey(key, userId);
    
    if (this.useSecureStore) {
      try {
        const value = await SecureStore.getItemAsync(prefixedKey);
        return value;
      } catch {
        // Silently fallback to AsyncStorage
        const encrypted = await AsyncStorage.getItem(prefixedKey);
        if (encrypted) {
          try {
            return await this.decrypt(encrypted);
          } catch {
            // Decryption failed, return null
            return null;
          }
        }
        return null;
      }
    } else {
      // Use AsyncStorage with decryption
      const encrypted = await AsyncStorage.getItem(prefixedKey);
      if (encrypted) {
        try {
          return await this.decrypt(encrypted);
        } catch {
          // Decryption failed, return null
          return null;
        }
      }
      return null;
    }
  }

  async deleteItem(key: string, userId?: string | null): Promise<void> {
    const prefixedKey = buildKey(key, userId);
    
    if (this.useSecureStore) {
      try {
        await SecureStore.deleteItemAsync(prefixedKey);
      } catch {
        // Silently fallback to AsyncStorage
        await AsyncStorage.removeItem(prefixedKey);
      }
    } else {
      await AsyncStorage.removeItem(prefixedKey);
    }
  }

  /**
   * Basic encryption for AsyncStorage fallback
   * Note: This is less secure than SecureStore but better than plain text
   */
  private async encrypt(text: string): Promise<string> {
    try {
      // Generate a device-specific key
      const deviceKey = await this.getDeviceKey();
      
      // Simple XOR encryption with device key
      let encrypted = '';
      for (let i = 0; i < text.length; i++) {
        encrypted += String.fromCharCode(
          text.charCodeAt(i) ^ deviceKey.charCodeAt(i % deviceKey.length)
        );
      }
      
      // Convert to base64 for storage
      return encodeBase64(encrypted);
    } catch {
      // Fallback to base64 encoding only
      return encodeBase64(text);
    }
  }

  /**
   * Basic decryption for AsyncStorage fallback
   */
  private async decrypt(encrypted: string): Promise<string> {
    try {
      // Get device key
      const deviceKey = await this.getDeviceKey();
      
      // Decode from base64
      const decoded = decodeBase64(encrypted);
      
      // XOR decrypt
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(
          decoded.charCodeAt(i) ^ deviceKey.charCodeAt(i % deviceKey.length)
        );
      }
      
      return decrypted;
    } catch {
      // Fallback to base64 decoding only
      return decodeBase64(encrypted);
    }
  }

  /**
   * Generate a device-specific key for encryption
   */
  private async getDeviceKey(): Promise<string> {
    const DEVICE_KEY = 'device_encryption_key';
    
    // Check if we already have a device key
    let deviceKey = await AsyncStorage.getItem(DEVICE_KEY);
    
    if (!deviceKey) {
      // Generate a new device key
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      deviceKey = randomBytes.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      await AsyncStorage.setItem(DEVICE_KEY, deviceKey);
    }
    
    return deviceKey;
  }
}

// Export singleton instance
export const passcodeStorage = new PasscodeStorage();
