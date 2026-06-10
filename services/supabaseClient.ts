import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../config/environment';
import type { Database } from '../types/supabaseExtended';

// Function to get current Supabase configuration (allows for dynamic loading)
function getSupabaseConfig() {
  // Re-read environment variables to support dynamic loading (e.g., from tests with dotenv)
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ENV.SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY;
  
  return { url, key };
}

function validateSupabaseCredentials(url: string, key: string): boolean {
  // Basic validation - ensure we have non-empty values
  if (!url || !key) return false;
  
  // Check if it's not a demo/placeholder value
  if (url === 'https://demo.supabase.co' || key === 'demo_key_placeholder') {
    return false;
  }
  
  // More lenient validation - just check for basic URL structure
  return url.startsWith('https://') && key.length > 20;
}

// REMOVED: Don't execute at module scope - causes crash if ENV not ready
// Configuration will be validated when client is actually created

// Create Supabase client with React Native optimizations
function createSupabaseClient(): SupabaseClient<Database> {
  const { url, key } = getSupabaseConfig();
  
  if (process.env.NODE_ENV !== 'production') {
    // Configuration logged
  }
  
  return createClient<Database>(url, key, {
    auth: {
      // Use AsyncStorage for React Native, but exclude for web
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      lock: processLock,
    },
    // Add global headers for better debugging
    global: {
      headers: {
        'X-Client-Info': 'linkapp@1.0.0',
      },
    },
    // Configure realtime
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });
}

// Supabase client instance - lazy initialization
let supabaseInstance: SupabaseClient<Database> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let appStateSubscription: any = null;

// Get or create Supabase client instance
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
    
    // PHASE 3 FIX: Set up AppState listener with error handling for automatic token refresh
    if (Platform.OS !== 'web' && !appStateSubscription) {
      appStateSubscription = AppState.addEventListener('change', async (state) => {
        if (state === 'active') {
          try {
            await supabaseInstance?.auth.startAutoRefresh();
          } catch (error) {
            // Log refresh error but don't crash app
            if (__DEV__) {
              console.warn('[Supabase] Auto-refresh start failed:', error);
            }
          }
        } else {
          try {
            supabaseInstance?.auth.stopAutoRefresh();
          } catch (error) {
            // Log stop error but don't crash app  
            if (__DEV__) {
              console.warn('[Supabase] Auto-refresh stop failed:', error);
            }
          }
        }
      });
    }
  }
  return supabaseInstance;
}

// Export client for backward compatibility
// CRITICAL FIX: Use getter instead of immediate execution to prevent crash
// DO NOT change this to `export const supabase = getSupabase();` - it will crash the app!
// Extra defensive: Wrap in try-catch to prevent APK crashes
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    try {
      const client = getSupabase();
      const value = (client as any)[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    } catch (error) {
      // In APK, if Supabase fails to initialize, log and return safe default
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Supabase] Failed to access property:', prop, error);
      }
      // Return safe no-op for functions, undefined for properties
      return typeof prop === 'string' && prop !== 'constructor' 
        ? () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') })
        : undefined;
    }
  }
});

// Force client recreation (useful for testing or config changes)
export function recreateSupabaseClient(): SupabaseClient<Database> {
  // Clean up existing subscription
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  
  supabaseInstance = null;
  supabaseInstance = createSupabaseClient();
  
  // Re-setup AppState listener if needed
  if (Platform.OS !== 'web') {
    appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabaseInstance?.auth.startAutoRefresh();
      } else {
        supabaseInstance?.auth.stopAutoRefresh();
      }
    });
  }
  
  return supabaseInstance;
}

// Function to check if Supabase is properly configured (allows for dynamic checking)
export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseConfig();
  return validateSupabaseCredentials(url, key);
}

// REMOVED: Module-scope execution causes crashes
// Use isSupabaseConfigured() function instead

