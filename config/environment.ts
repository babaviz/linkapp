// CRITICAL FIX: Safely import Constants with better error handling
let Constants: any = null;
try {
  Constants = require('expo-constants').default;
} catch (error) {
  // Silently fail - will use process.env fallback
  if (__DEV__) {
    console.warn('[ENV] expo-constants not available, using process.env fallback:', error);
  }
}

// Safer environment variable access with comprehensive fallbacks
function getEnvVar(key: string, defaultValue: string): string {
  try {
    // First try process.env (works in Node.js/development)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key]!;
    }
    
    // Then try Expo Constants.expoConfig.extra (Expo SDK 46+)
    if (Constants && Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra[key]) {
      return Constants.expoConfig.extra[key];
    }
    
    // Fallback to Constants.manifest.extra (older Expo versions)
    if (Constants && Constants.manifest && (Constants.manifest as any).extra && (Constants.manifest as any).extra[key]) {
      return (Constants.manifest as any).extra[key];
    }
    
    // Fallback to Constants.manifest2.extra (EAS builds)
    if (Constants && Constants.manifest2 && Constants.manifest2.extra && Constants.manifest2.extra[key]) {
      return Constants.manifest2.extra[key];
    }
  } catch (error) {
    // If any error occurs accessing environment variables, log in dev and use default
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`[ENV] Error accessing ${key}:`, error);
    }
  }
  
  return defaultValue;
}

// Environment configuration for LinkApp
// Production values should be set via EAS environment variables or Netlify environment variables
// These defaults are fallbacks and should NOT be used in production

const isProduction = getEnvVar('EXPO_PUBLIC_APP_ENV', 'development') === 'production';

// Validate production keys - logs warnings instead of throwing to prevent app crashes
function validateProductionKey(_key: string, value: string, keyName: string): string {
  if (isProduction) {
    // In production, warn about non-empty values but don't crash
    if (!value || value.trim() === '') {
      // Log warning but don't crash - allow app to start and show user-friendly error
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        // eslint-disable-next-line no-console
        console.warn(`[ENV] Warning: ${keyName} is not set in production environment`);
      }
      return value;
    }
    // In production, warn about test/demo/placeholder values but don't crash
    if (value.includes('demo') || value.includes('test') || value.includes('placeholder') || value.includes('your_')) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        // eslint-disable-next-line no-console
        console.warn(`[ENV] Warning: ${keyName} appears to contain a test/demo value`);
      }
    }
  }
  return value;
}

// Runtime validation of critical environment variables
function validateCriticalEnvVars(): void {
  // Skip validation in production APK to prevent crashes
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  
  const critical = [
    { key: 'EXPO_PUBLIC_SUPABASE_URL', name: 'Supabase URL' },
    { key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', name: 'Supabase Anon Key' },
    { key: 'EXPO_PUBLIC_STREAM_CHAT_API_KEY', name: 'Stream Chat API Key' }
  ];
  
  const missing: string[] = [];
  const placeholder: string[] = [];
  
  critical.forEach(({ key, name }) => {
    const value = getEnvVar(key, '');
    if (!value || value.trim() === '') {
      missing.push(name);
    } else if (value.includes('demo') || value.includes('placeholder') || value.includes('your_')) {
      placeholder.push(name);
    }
  });
  
  if (missing.length > 0 && typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing critical environment variables:', missing.join(', '));
  }
  
  if (placeholder.length > 0 && typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[ENV] Placeholder values detected for:', placeholder.join(', '));
  }
}

// CRITICAL FIX: Don't create ENV object at module scope - use lazy getters via Proxy
// This prevents crashes when Constants/env vars aren't ready yet

let cachedEnv: any = null;

function createEnvObject() {
  if (cachedEnv) return cachedEnv;
  
  // Defensive: Wrap in try-catch to prevent crashes in APK
  try {
  cachedEnv = {
    // Supabase Configuration
    SUPABASE_URL: validateProductionKey(
      'EXPO_PUBLIC_SUPABASE_URL',
      getEnvVar('EXPO_PUBLIC_SUPABASE_URL', ''),
      'SUPABASE_URL'
    ),
    SUPABASE_ANON_KEY: validateProductionKey(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', ''),
      'SUPABASE_ANON_KEY'
    ),
    
    // App Configuration  
    APP_ENV: getEnvVar('EXPO_PUBLIC_APP_ENV', 'development'),
    API_BASE_URL: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'https://api.linkapp.com'),
    
    // Payment Configuration (Paystack, etc.)
    PAYMENT_API_KEY: getEnvVar('EXPO_PUBLIC_PAYMENT_API_KEY', ''),
    
    // Stream Chat Configuration
    STREAM_CHAT_API_KEY: getEnvVar('EXPO_PUBLIC_STREAM_CHAT_API_KEY', ''),

    // Stream Video Configuration (can be different from Stream Chat)
    // IMPORTANT: If this is empty, Stream Video will be treated as "not configured"
    // to avoid unstable websocket retries/reloads in dev builds.
    STREAM_VIDEO_API_KEY: getEnvVar('EXPO_PUBLIC_STREAM_VIDEO_API_KEY', ''),
    
    // Paystack Configuration
    PAYSTACK: {
      PUBLIC_KEY: validateProductionKey(
        'EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY',
        getEnvVar('EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY', ''),
        'PAYSTACK_PUBLIC_KEY'
      ),
      SECRET_KEY: validateProductionKey(
        'EXPO_PUBLIC_PAYSTACK_SECRET_KEY',
        getEnvVar('EXPO_PUBLIC_PAYSTACK_SECRET_KEY', ''),
        'PAYSTACK_SECRET_KEY'
      ),
    },
    
    // App URL for callbacks
    APP_URL: getEnvVar('EXPO_PUBLIC_APP_URL', 'https://link-app.co'),
    
    // Video Calling Configuration
    WEBRTC_CONFIG: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    },
    
    // Feature Flags
    FEATURES: {
      DATE_MI_ENABLED: true,
      VIDEO_CALLING_ENABLED: true,
      ESCROW_PAYMENTS_ENABLED: true,
      CONTENT_PROTECTION_ENABLED: true
    }
  };
  
  return cachedEnv;
  } catch (error) {
    // If env creation fails, return minimal safe defaults
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ENV] Failed to create env object:', error);
    }
    return {
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
      APP_ENV: 'production',
      API_BASE_URL: '',
      PAYMENT_API_KEY: '',
      STREAM_CHAT_API_KEY: '',
      PAYSTACK: { PUBLIC_KEY: '', SECRET_KEY: '' },
      APP_URL: '',
      WEBRTC_CONFIG: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      FEATURES: {
        DATE_MI_ENABLED: false,
        VIDEO_CALLING_ENABLED: false,
        ESCROW_PAYMENTS_ENABLED: false,
        CONTENT_PROTECTION_ENABLED: false
      }
    };
  }
}

// Export ENV as Proxy that creates the object on first property access
export const ENV = new Proxy({} as any, {
  get(target, prop) {
    const env = createEnvObject();
    return env[prop];
  }
});
