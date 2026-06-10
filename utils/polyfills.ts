// Polyfills for React Native
import { Buffer as BufferPolyfill } from 'buffer';

// Make Buffer available globally
if (typeof global !== 'undefined') {
  (global as any).Buffer = BufferPolyfill;
  
  // WebRTC polyfills
  (global as any).process = (global as any).process || {};
  (global as any).process.nextTick = (global as any).process.nextTick || setImmediate;
}

// Export Buffer for use in other files
export { BufferPolyfill as Buffer };
