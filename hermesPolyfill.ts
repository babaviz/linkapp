/**
 * Hermes Polyfill
 * Enhanced fixes for Hermes engine compatibility to prevent AppEntry.default errors
 */

// Enhanced polyfills for Hermes compatibility
// Addresses module loading issues that cause _AppEntry.default errors

if (typeof global !== 'undefined') {
  // Fix global object references that can cause module loading issues
  if (!global.global) {
    global.global = global;
  }
  
  // Fix globalThis reference for better compatibility
  if (typeof globalThis !== 'undefined' && !global.globalThis) {
    (global as any).globalThis = globalThis;
  }
  
  // Enhanced queueMicrotask with better error handling
  if (typeof (global as any).queueMicrotask === 'undefined') {
    (global as any).queueMicrotask = function(callback: () => void) {
      try {
        Promise.resolve()
          .then(() => {
            try {
              callback();
            } catch (callbackError) {
              console.error('queueMicrotask callback error:', callbackError);
              throw callbackError;
            }
          })
          .catch((error: Error) => {
            setTimeout(() => {
              throw error;
            }, 0);
          });
      } catch (setupError) {
        console.error('queueMicrotask setup error:', setupError);
        setTimeout(callback, 0);
      }
    };
  }
  
  // Fix performance.now if missing (can cause timing issues)
  if (typeof (global as any).performance === 'undefined') {
    (global as any).performance = {
      now: function() {
        return Date.now();
      }
    };
  } else if (typeof (global as any).performance.now === 'undefined') {
    (global as any).performance.now = function() {
      return Date.now();
    };
  }
  
  // Fix requestAnimationFrame/cancelAnimationFrame for compatibility
  if (typeof (global as any).requestAnimationFrame === 'undefined') {
    (global as any).requestAnimationFrame = function(callback: (time: number) => void) {
      return setTimeout(() => {
        callback(Date.now());
      }, 16); // ~60fps
    };
  }
  
  if (typeof (global as any).cancelAnimationFrame === 'undefined') {
    (global as any).cancelAnimationFrame = function(handle: any) {
      clearTimeout(handle);
    };
  }
  
  // Fix Symbol polyfills that might be missing in Hermes
  if (typeof Symbol !== 'undefined') {
    // Ensure Symbol.iterator exists
    if (!Symbol.iterator) {
      (Symbol as any).iterator = '@@iterator';
    }
    
    // Ensure Symbol.asyncIterator exists
    if (!Symbol.asyncIterator) {
      (Symbol as any).asyncIterator = '@@asyncIterator';
    }
  }
  
  // Fix potential issues with Object methods that Hermes might handle differently
  // Only add if they don't exist or are broken
  try {
    // Test if Object.entries works correctly
    Object.entries({test: 1});
  } catch (e) {
    console.warn('Object.entries test failed, adding polyfill');
    (global as any).Object.entries = function(obj: any) {
      const ownProps = Object.keys(obj);
      let i = ownProps.length;
      const resArray = new Array(i);
      while (i--) {
        resArray[i] = [ownProps[i], obj[ownProps[i]]];
      }
      return resArray;
    };
  }
}

// Export empty object to make this a proper ES module
export {};
