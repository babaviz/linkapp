/**
 * Comprehensive Security Service
 * Handles HTTPS enforcement, data encryption, API security, and session management
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

interface EncryptionOptions {
  algorithm?: 'AES' | 'RSA';
  keySize?: number;
  iterations?: number;
}

interface SecurityConfig {
  enforceHTTPS: boolean;
  encryptSensitiveData: boolean;
  sanitizeLogs: boolean;
  requireApiKey: boolean;
  sessionTimeout: number; // in minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
}

interface SessionData {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
}

interface ApiKeyData {
  key: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

class SecurityService {
  private config: SecurityConfig = {
    enforceHTTPS: true,
    encryptSensitiveData: true,
    sanitizeLogs: true,
    requireApiKey: true,
    sessionTimeout: 30, // 30 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15 // 15 minutes
  };

  private activeSessions: Map<string, SessionData> = new Map();
  private encryptionKey: string | null = null;
  private sessionCleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeEncryptionKey();
    this.startSessionCleanup();
  }

  /**
   * Initialize encryption key for the application
   */
  private async initializeEncryptionKey() {
    try {
      // Try to get existing key from secure storage
      const storedKey = await SecureStore.getItemAsync('app_encryption_key');
      
      if (storedKey) {
        this.encryptionKey = storedKey;
      } else {
        // Generate new encryption key
        const key = await this.generateSecureKey();
        await SecureStore.setItemAsync('app_encryption_key', key);
        this.encryptionKey = key;
      }
    } catch (error) {
      
      // Fallback to runtime-generated key
      this.encryptionKey = this.generateRandomKey();
    }
  }

  /**
   * Generate a secure encryption key
   */
  private async generateSecureKey(): Promise<string> {
    if (Platform.OS !== 'web') {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      return btoa(String.fromCharCode(...new Uint8Array(randomBytes)));
    } else {
      return this.generateRandomKey();
    }
  }

  /**
   * Generate a random key for web platform
   */
  private generateRandomKey(): string {
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string, options?: EncryptionOptions): string {
    if (!this.config.encryptSensitiveData) {
      return data;
    }

    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      // Use CryptoJS for AES encryption
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string): string {
    if (!this.config.encryptSensitiveData) {
      return encryptedData;
    }

    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store sensitive data securely
   */
  async storeSecureData(key: string, value: any): Promise<void> {
    try {
      const dataString = typeof value === 'string' ? value : JSON.stringify(value);
      const encryptedData = this.encryptData(dataString);
      
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(key, encryptedData);
      } else {
        // For web, use localStorage with encryption
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`secure_${key}`, encryptedData);
        }
      }
    } catch (error) {
      
      throw new Error('Failed to store data securely');
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  async getSecureData(key: string): Promise<any> {
    try {
      let encryptedData: string | null = null;
      
      if (Platform.OS !== 'web') {
        encryptedData = await SecureStore.getItemAsync(key);
      } else {
        // For web, retrieve from localStorage
        if (typeof localStorage !== 'undefined') {
          encryptedData = localStorage.getItem(`secure_${key}`);
        }
      }

      if (!encryptedData) {
        return null;
      }

      const decryptedData = this.decryptData(encryptedData);
      
      try {
        return JSON.parse(decryptedData);
      } catch {
        return decryptedData;
      }
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Delete sensitive data
   */
  async deleteSecureData(key: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(key);
      } else {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(`secure_${key}`);
        }
      }
    } catch (error) {
      
    }
  }

  /**
   * Validate and enforce HTTPS
   */
  enforceHTTPS(url: string): string {
    if (!this.config.enforceHTTPS) {
      return url;
    }

    // Skip enforcement for localhost and development IPs
    const devPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '192.168.',
      '10.0.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '.local',
      'host.docker.internal'
    ];

    // Check if URL contains any development pattern
    const isDevelopment = devPatterns.some(pattern => url.includes(pattern));
    if (isDevelopment) {
      return url;
    }

    // Replace http with https
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }

    // Add https if no protocol specified
    if (!url.startsWith('https://') && !url.startsWith('//') && !url.startsWith('http://')) {
      return `https://${url}`;
    }

    return url;
  }

  /**
   * Sanitize sensitive information from logs
   */
  sanitizeLog(message: string, data?: any): { message: string; data?: any } {
    if (!this.config.sanitizeLogs) {
      return { message, data };
    }

    // List of sensitive patterns to sanitize
    const sensitivePatterns = [
      /password["\s:=]+["']?[\w\S]+["']?/gi,
      /api[_-]?key["\s:=]+["']?[\w\S]+["']?/gi,
      /token["\s:=]+["']?[\w\S]+["']?/gi,
      /secret["\s:=]+["']?[\w\S]+["']?/gi,
      /authorization["\s:=]+["']?[\w\S]+["']?/gi,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email (partial masking)
    ];

    let sanitizedMessage = message;
    sensitivePatterns.forEach(pattern => {
      sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED]');
    });

    // Sanitize data object
    let sanitizedData = data;
    if (data && typeof data === 'object') {
      sanitizedData = this.sanitizeObject(data);
    }

    return { message: sanitizedMessage, data: sanitizedData };
  }

  /**
   * Recursively sanitize objects
   */
  private sanitizeObject(obj: any): any {
    const sensitiveKeys = [
      'password', 'pwd', 'pass',
      'token', 'apiKey', 'api_key', 'apikey',
      'secret', 'private', 'credential',
      'ssn', 'socialSecurityNumber',
      'creditCard', 'cardNumber', 'cvv',
      'email', 'phone', 'address'
    ];

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          sanitized[key] = '[REDACTED]';
        } else if (value && typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    }

    return obj;
  }

  /**
   * Generate API key
   */
  async generateApiKey(name: string, permissions: string[]): Promise<ApiKeyData> {
    const key = await this.generateSecureKey();
    const hashedKey = CryptoJS.SHA256(key).toString();
    
    const apiKeyData: ApiKeyData = {
      key: hashedKey,
      name,
      permissions,
      createdAt: new Date(),
      isActive: true
    };

    // Store API key securely
    await this.storeSecureData(`api_key_${hashedKey}`, apiKeyData);
    
    return { ...apiKeyData, key }; // Return unhashed key once for the user
  }

  /**
   * Validate API key
   */
  async validateApiKey(key: string): Promise<boolean> {
    if (!this.config.requireApiKey) {
      return true;
    }

    try {
      const hashedKey = CryptoJS.SHA256(key).toString();
      const apiKeyData = await this.getSecureData(`api_key_${hashedKey}`);
      
      if (!apiKeyData || !apiKeyData.isActive) {
        return false;
      }

      // Update last used timestamp
      apiKeyData.lastUsed = new Date();
      await this.storeSecureData(`api_key_${hashedKey}`, apiKeyData);
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Create secure session
   */
  async createSession(userId: string, metadata?: any): Promise<SessionData> {
    const sessionId = await this.generateSecureKey();
    
    const session: SessionData = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      isValid: true
    };

    this.activeSessions.set(sessionId, session);
    
    // Store session securely
    await this.storeSecureData(`session_${sessionId}`, session);
    
    // Set session timeout
    this.scheduleSessionTimeout(sessionId);
    
    return session;
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      // Try to load from secure storage
      const storedSession = await this.getSecureData(`session_${sessionId}`);
      if (!storedSession) {
        return false;
      }
      
      // Check if session is expired
      const lastActivity = new Date(storedSession.lastActivity);
      const now = new Date();
      const timeDiff = (now.getTime() - lastActivity.getTime()) / 1000 / 60; // in minutes
      
      if (timeDiff > this.config.sessionTimeout) {
        await this.invalidateSession(sessionId);
        return false;
      }
      
      this.activeSessions.set(sessionId, storedSession);
      return storedSession.isValid;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    await this.storeSecureData(`session_${sessionId}`, session);
    
    // Reset timeout
    this.scheduleSessionTimeout(sessionId);
    
    return session.isValid;
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.isValid = false;
      await this.storeSecureData(`session_${sessionId}`, session);
    }
    
    this.activeSessions.delete(sessionId);
    
    // Schedule deletion of stored session
    setTimeout(async () => {
      await this.deleteSecureData(`session_${sessionId}`);
    }, 5000);
  }

  /**
   * Schedule session timeout
   */
  private scheduleSessionTimeout(sessionId: string) {
    setTimeout(async () => {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        const now = new Date();
        const timeDiff = (now.getTime() - session.lastActivity.getTime()) / 1000 / 60;
        
        if (timeDiff >= this.config.sessionTimeout) {
          await this.invalidateSession(sessionId);
        }
      }
    }, this.config.sessionTimeout * 60 * 1000);
  }

  /**
   * Start periodic session cleanup
   */
  private startSessionCleanup() {
    if (this.sessionCleanupInterval) return;

    this.sessionCleanupInterval = setInterval(async () => {
      const now = new Date();
      
      for (const [sessionId, session] of this.activeSessions.entries()) {
        const timeDiff = (now.getTime() - session.lastActivity.getTime()) / 1000 / 60;
        
        if (timeDiff > this.config.sessionTimeout) {
          await this.invalidateSession(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    // In Node/Jest, prevent this interval from keeping the process alive.
    const interval = this.sessionCleanupInterval;
    if (interval !== null && typeof interval === 'object') {
      const maybeUnref = (interval as { unref?: unknown }).unref;
      if (typeof maybeUnref === 'function') {
        maybeUnref.call(interval);
      }
    }
  }

  /**
   * Hash sensitive data for storage
   */
  hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Generate secure random token
   */
  async generateSecureToken(length: number = 32): Promise<string> {
    if (Platform.OS !== 'web') {
      const randomBytes = await Crypto.getRandomBytesAsync(length);
      return Array.from(new Uint8Array(randomBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      const array = new Uint8Array(length);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(array);
      }
      return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  }

  /**
   * Check if URL is secure
   */
  isSecureUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' || 
             urlObj.hostname === 'localhost' ||
             urlObj.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export const securityService = new SecurityService();
export default securityService;
