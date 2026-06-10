/**
 * Error Recovery Utilities
 * 
 * This file provides utilities for graceful error recovery in the app,
 * ensuring that the UI can continue to function even when critical errors occur.
 */

import { Platform } from 'react-native';

// A map to track errors that have been logged to prevent duplicate logs
const errorLoggedMap = new Map<string, number>();

/**
 * Log an error with rate limiting to prevent log flooding
 * @param component The component where the error occurred
 * @param error The error object
 * @param context Additional context information
 */
export function logError(component: string, error: any, context?: Record<string, any>) {
  const errorMessage = error?.message || String(error);
  const errorKey = `${component}:${errorMessage}`;
  
  // Rate limit identical errors
  const now = Date.now();
  const lastLogged = errorLoggedMap.get(errorKey) || 0;
  if (now - lastLogged < 5000) { // 5 seconds rate limiting
    return;
  }
  
  errorLoggedMap.set(errorKey, now);
  
  // Log the error with component and context information
  
}

/**
 * Wraps an async function with error handling that recovers gracefully
 * @param func The async function to execute
 * @param fallbackValue The fallback value to return if an error occurs
 * @param component The component name for error logging
 * @param context Additional context information
 * @returns A promise that resolves to either the function result or fallback value
 */
export async function withErrorRecovery<T>(
  func: () => Promise<T>,
  fallbackValue: T,
  component: string,
  context?: Record<string, any>
): Promise<T> {
  try {
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        logError(component, new Error('Operation timed out'), {
          ...context,
          type: 'timeout',
        });
        resolve(null);
      }, 5000); // 5 second timeout
    });
    
    // Race between the actual operation and timeout
    const result = await Promise.race([func(), timeoutPromise]);
    return result === null ? fallbackValue : (result as T);
  } catch (error) {
    logError(component, error, context);
    return fallbackValue;
  }
}

/**
 * High-order component pattern for error recovery in component functions
 * @param component The component name for error logging
 * @returns A function that wraps component methods with error recovery
 */
export function createErrorBoundary(component: string) {
  return {
    async execute<T>(
      func: () => Promise<T>,
      fallbackValue: T,
      context?: Record<string, any>
    ): Promise<T> {
      return withErrorRecovery(func, fallbackValue, component, context);
    },
    
    wrap<T extends (...args: any[]) => any>(
      func: T,
      fallbackValue: ReturnType<T>,
      methodName?: string
    ): T {
      return ((...args: Parameters<T>): ReturnType<T> => {
        try {
          const result = func(...args);
          
          // Handle promise results
          if (result instanceof Promise) {
            return withErrorRecovery(
              () => result,
              fallbackValue,
              `${component}.${methodName || func.name || 'anonymous'}`,
              { args }
            ) as unknown as ReturnType<T>;
          }
          
          return result;
        } catch (error) {
          logError(
            `${component}.${methodName || func.name || 'anonymous'}`,
            error,
            { args }
          );
          return fallbackValue;
        }
      }) as T;
    }
  };
}

/**
 * Global error handler for unhandled promises
 */
export function setupGlobalErrorHandlers() {
  if (Platform.OS !== 'web') {
    // Set up global error handler for unhandled promises
    try {
      const errorUtils = (global as any).ErrorUtils;
      if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
        const originalHandler = errorUtils.getGlobalHandler?.() ||
          ((error: Error) => {  });
        
        errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          logError('GlobalError', error, { isFatal });
          
          // Don't crash on non-fatal errors
          if (!isFatal) {
            
            return;
          }
          
          // Call original handler for fatal errors
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });

      }
    } catch (err) {
      
    }
  }
}
