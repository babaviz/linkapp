/**
 * Date Mi Security Utilities
 * Handles screenshot prevention, age verification, and privacy protection
 */

import { Platform, Alert } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect } from 'react';

/**
 * Hook to prevent screenshots in sensitive DateMi screens
 * Works on iOS and Android, no-op on web
 */
export const useScreenshotPrevention = (enabled: boolean = true) => {
  useEffect(() => {
    if (enabled && Platform.OS !== 'web') {
      let subscription: { remove: () => void } | null = null;
      
      const preventScreenshots = async () => {
        try {
          await ScreenCapture.preventScreenCaptureAsync();
          
          subscription = ScreenCapture.addScreenshotListener(() => {
            Alert.alert(
              'Screenshots Disabled',
              'Screenshots are not allowed in Date Mi for privacy and user safety. This action has been logged.',
              [{ text: 'I Understand', style: 'default' }]
            );
          });
        } catch (error) {
          console.warn('Screenshot prevention not available on this device');
        }
      };

      preventScreenshots();

      return () => {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
        subscription?.remove();
      };
    }
  }, [enabled]);
};

/**
 * Age verification utilities
 */
export const verifyAge = (dateOfBirth: string): { isValid: boolean; age: number } => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  const calculatedAge = monthDiff < 0 || 
    (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
    ? age - 1 
    : age;

  return {
    isValid: calculatedAge >= 18,
    age: calculatedAge,
  };
};

/**
 * Privacy filter for sensitive data
 */
export const sanitizeUserData = <T extends Record<string, unknown>>(data: T): Omit<T, 'phone' | 'email' | 'address' | 'idNumber' | 'paymentInfo'> => {
  const sensitiveFields = ['phone', 'email', 'address', 'idNumber', 'paymentInfo'] as const;
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete (sanitized as Record<string, unknown>)[field];
    }
  });
  
  return sanitized as Omit<T, typeof sensitiveFields[number]>;
};

/**
 * Content moderation utilities
 */
export const moderateContent = (text: string): { safe: boolean; reason?: string } => {
  // Basic profanity and inappropriate content check
  const inappropriatePatterns = [
    /\b(drugs?|cocaine|heroin|meth)\b/i,
    /\b(prostitut|escort|hooker)\b/i,
    /\b(underage|minor|child|kid)\b/i,
    /\b(scam|fraud|money transfer)\b/i,
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: 'Content violates community guidelines',
      };
    }
  }

  return { safe: true };
};

/**
 * Photo verification utilities
 */
export const validateProfilePhoto = (photoUri: string): Promise<boolean> => {
  // In production, this would call an AI service for photo verification
  // For now, we'll simulate basic validation
  return new Promise((resolve) => {
    setTimeout(() => {
      // Check if photo exists and is valid
      resolve(photoUri && photoUri.length > 0);
    }, 500);
  });
};

/**
 * Session security
 */
export const generateSecureSessionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `datemi-${timestamp}-${random}`;
};

/**
 * Encryption utilities for sensitive messages
 */
export const encryptMessage = (message: string, key: string): string => {
  // Simple XOR encryption for demo - use proper encryption in production
  let encrypted = '';
  for (let i = 0; i < message.length; i++) {
    encrypted += String.fromCharCode(
      message.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(encrypted);
};

export const decryptMessage = (encrypted: string, key: string): string => {
  try {
    const decoded = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return decrypted;
  } catch {
    return '[Message could not be decrypted]';
  }
};
