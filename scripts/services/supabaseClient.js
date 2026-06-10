"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupabaseConfiguredLegacy = exports.supabase = void 0;
exports.getSupabase = getSupabase;
exports.recreateSupabaseClient = recreateSupabaseClient;
exports.isSupabaseConfigured = isSupabaseConfigured;
const react_native_1 = require("react-native");
require("react-native-url-polyfill/auto");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const supabase_js_1 = require("@supabase/supabase-js");
const environment_1 = require("../config/environment");
// Function to get current Supabase configuration (allows for dynamic loading)
function getSupabaseConfig() {
    // Re-read environment variables to support dynamic loading (e.g., from tests with dotenv)
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || environment_1.ENV.SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || environment_1.ENV.SUPABASE_ANON_KEY;
    return { url, key };
}
function validateSupabaseCredentials(url, key) {
    // Basic validation - ensure we have non-empty values
    if (!url || !key)
        return false;
    // Check if it's not a demo/placeholder value
    if (url === 'https://demo.supabase.co' || key === 'demo_key_placeholder') {
        return false;
    }
    // More lenient validation - just check for basic URL structure
    return url.startsWith('https://') && key.length > 20;
}
// Get initial configuration
let { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();
let hasValidCredentials = validateSupabaseCredentials(supabaseUrl, supabaseAnonKey);
// Only log configuration check in development/debug mode
if (process.env.NODE_ENV !== 'production') {
     || supabaseAnonKey.includes('demo')
    });
}
// Create Supabase client with React Native optimizations
function createSupabaseClient() {
    const { url, key } = getSupabaseConfig();
    const isConfigured = validateSupabaseCredentials(url, key);
    if (process.env.NODE_ENV !== 'production') {
         + '...',
            keyLength: key.length,
            isConfigured
        });
    }
    return (0, supabase_js_1.createClient)(url, key, {
        auth: {
            // Use AsyncStorage for React Native, but exclude for web
            ...(react_native_1.Platform.OS !== 'web' ? { storage: async_storage_1.default } : {}),
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: react_native_1.Platform.OS === 'web',
            lock: supabase_js_1.processLock,
        },
        // Add global headers for better debugging
        global: {
            headers: {
                'X-Client-Info': 'mynyumbapp@1.0.0',
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
let supabaseInstance = null;
// Get or create Supabase client instance
function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createSupabaseClient();
        // Set up AppState listener for automatic token refresh (React Native only)
        if (react_native_1.Platform.OS !== 'web') {
            react_native_1.AppState.addEventListener('change', (state) => {
                if (state === 'active') {
                    supabaseInstance?.auth.startAutoRefresh();
                }
                else {
                    supabaseInstance?.auth.stopAutoRefresh();
                }
            });
        }
    }
    return supabaseInstance;
}
// Export client for backward compatibility
exports.supabase = getSupabase();
// Force client recreation (useful for testing or config changes)
function recreateSupabaseClient() {
    supabaseInstance = null;
    supabaseInstance = createSupabaseClient();
    // Re-setup AppState listener if needed
    if (react_native_1.Platform.OS !== 'web') {
        react_native_1.AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                supabaseInstance?.auth.startAutoRefresh();
            }
            else {
                supabaseInstance?.auth.stopAutoRefresh();
            }
        });
    }
    return supabaseInstance;
}
// Function to check if Supabase is properly configured (allows for dynamic checking)
function isSupabaseConfigured() {
    const { url, key } = getSupabaseConfig();
    return validateSupabaseCredentials(url, key);
}
// For backward compatibility, export as const as well
exports.isSupabaseConfiguredLegacy = isSupabaseConfigured();
