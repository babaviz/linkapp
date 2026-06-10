"use strict";
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const expo_constants_1 = __importDefault(require("expo-constants"));
// Get environment variables from Expo config
function getEnvVar(key, defaultValue) {
    // First try process.env (works in Node.js/development)
    if (process.env[key]) {
        return process.env[key];
    }
    // Then try Expo Constants (works in React Native app)
    if (expo_constants_1.default.expoConfig?.extra?.[key]) {
        return expo_constants_1.default.expoConfig.extra[key];
    }
    return defaultValue;
}
// Environment configuration for MyNyumbApp
exports.ENV = {
    // Supabase Configuration
    SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://demo.supabase.co'),
    SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'demo_key_placeholder'),
    // App Configuration  
    APP_ENV: getEnvVar('EXPO_PUBLIC_APP_ENV', 'development'),
    API_BASE_URL: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'https://api.mynyumbapp.com'),
    // Payment Configuration (M-Pesa, etc.)
    PAYMENT_API_KEY: getEnvVar('EXPO_PUBLIC_PAYMENT_API_KEY', 'your_payment_key_here'),
    // Stream Chat Configuration
    STREAM_CHAT_API_KEY: getEnvVar('EXPO_PUBLIC_STREAM_CHAT_API_KEY', 'mbk9t7mk8z22'),
    // M-Pesa Configuration
    MPESA: {
        CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || 'your_consumer_key_here',
        CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || 'your_consumer_secret_here',
        PASSKEY: process.env.MPESA_PASSKEY || 'your_passkey_here',
        SHORTCODE: process.env.MPESA_SHORTCODE || 'your_shortcode_here',
        BASE_URL: process.env.MPESA_BASE_URL || 'https://sandbox-api.safaricom.co.ke'
    },
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
