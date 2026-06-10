/**
 * Global polyfills for React Native - MINIMAL to prevent bundling hang
 * This file must be imported before any other imports
 */

// Critical: Fix global object setup first to prevent module loading errors
if (typeof global === 'undefined') {
  (globalThis as typeof globalThis & { global: typeof globalThis }).global = globalThis;
} else if (!global.global) {
  global.global = global;
}

// CRITICAL: Buffer and crypto polyfills needed for Supabase
let BufferPolyfill: typeof import('buffer').Buffer | null = null;
try {
  BufferPolyfill = require('buffer').Buffer as typeof import('buffer').Buffer;
  require('react-native-get-random-values'); // Required for crypto operations
} catch (error) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[Polyfills] Buffer/crypto polyfills failed:', error);
  }
}

// Make Buffer available globally for crypto operations
if (typeof global !== 'undefined' && BufferPolyfill) {
  (global as typeof global & { Buffer: typeof BufferPolyfill }).Buffer = BufferPolyfill;
}

// CRITICAL: URL polyfill is required for network requests to work
// Without this, you get "Network request failed" errors
try {
  require('react-native-url-polyfill/auto');
} catch (error) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[Polyfills] URL polyfill failed:', error);
  }
}

// Export empty object to make this a proper ES module
export {};
