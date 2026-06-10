/**
 * Production Optimizations Utility
 * Removes development-only code and optimizes for production
 */

import { productionConfig } from '../config/production.config';
import { ENV } from '../config/environment';

// Disable console logs in production
export const disableConsoleLogs = () => {
  // Only disable logs for true production environment (store builds).
  // This avoids "no logs" confusion when running `expo start --no-dev --minify`
  // against non-production envs like preview/testing.
  const isProductionEnv = ENV.APP_ENV === 'production';

  if (isProductionEnv && !productionConfig.performance.consoleLogsEnabled) {
    // These assignments are intentional for production - disable all console methods
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.trace = () => {};
    console.group = () => {};
    console.groupEnd = () => {};
    console.groupCollapsed = () => {};
    console.table = () => {};
    console.time = () => {};
    console.timeEnd = () => {};
  }
};

// Image optimization helper
export const optimizeImage = (uri: string, quality: number = 0.8): string => {
  if (!uri) return '';
  
  // Add image optimization parameters if using a CDN
  if (uri.includes('cloudinary') || uri.includes('imgix')) {
    const separator = uri.includes('?') ? '&' : '?';
    return `${uri}${separator}q=${quality * 100}&auto=format&fit=max`;
  }
  
  return uri;
};

// Lazy load images
export const lazyLoadImage = (uri: string, placeholder?: string) => {
  return {
    uri: productionConfig.images.lazyLoadImages ? placeholder || '' : uri,
    priority: productionConfig.images.lazyLoadImages ? 'low' : 'normal',
    cache: productionConfig.images.cacheImages ? 'force-cache' : 'default',
  };
};

// Memory management
export const cleanupMemory = () => {
  if (global.gc) {
    global.gc();
  }
};

// Network request optimization
export const optimizeNetworkRequest = (url: string, options: Record<string, unknown> = {}): Record<string, unknown> => {
  const optimizedOptions: Record<string, unknown> = {
    ...options,
    headers: {
      ...productionConfig.api.headers,
      ...(options.headers as Record<string, unknown> || {}),
    },
  };

  // Add compression headers
  if (productionConfig.network.compressionEnabled) {
    optimizedOptions.headers = {
      ...(optimizedOptions.headers as Record<string, unknown>),
      'Accept-Encoding': 'gzip, deflate, br',
    };
  }

  // Add timeout
  if (productionConfig.network.timeout && 'timeout' in optimizedOptions) {
    optimizedOptions.timeout = productionConfig.network.timeout;
  }

  return optimizedOptions;
};

  // Error handling wrapper for production
export const productionErrorHandler = (error: Error, componentName?: string): void => {
  if (__DEV__) {
    // This console.error is already wrapped in __DEV__ check
    // eslint-disable-next-line no-console
    console.error(`Error in ${componentName}:`, error);
  } else {
    // Send to error tracking service in production
    if (productionConfig.monitoring.errorReporting.enabled) {
      // Implement error tracking service integration
      // e.g., Sentry, Crashlytics, etc.
      logErrorToService(error, componentName);
    }
  }
};

// Mock error logging service (replace with actual service)
const logErrorToService = (error: Error, componentName?: string): void => {
  // This would be replaced with actual error tracking service
  // Silently track errors without logging
  if (productionConfig.monitoring.enableCrashlytics) {
    // Crashlytics.recordError(error);
    // Future: Send errorData to tracking service
    void error;
    void componentName;
  }
};

// Performance monitoring
export const measurePerformance = <T>(name: string, fn: () => T): T => {
  if (!productionConfig.monitoring.enablePerformanceMonitoring) {
    return fn();
  }
  
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  
  const duration = end - start;
  
  // Log performance metrics
  if (__DEV__) {
    // This console.log is already wrapped in __DEV__ check
    // eslint-disable-next-line no-console
    console.log(`Performance [${name}]: ${duration}ms`);
  } else if (productionConfig.monitoring.enableAnalytics) {
    // Send to analytics service
    // Analytics.track('performance_metric', { name, duration });
    void duration;
  }
  
  return result;
};

// Cache management
export const cacheManager = {
  set: async (key: string, value: unknown, ttl?: number): Promise<void> => {
    // Future implementation: Store in AsyncStorage
    void key;
    void value;
    void ttl;
  },
  
  get: async (_key: string): Promise<unknown | null> => {
    // Future implementation: Retrieve from AsyncStorage
    return null;
  },
  
  clear: async (): Promise<void> => {
    // Future implementation: Clear expired cache items
  },
};

// Initialize production optimizations
export const initializeProductionOptimizations = () => {
  disableConsoleLogs();
  
  // Set up periodic cache cleanup
  setInterval(() => {
    cacheManager.clear();
  }, productionConfig.cache.cleanupInterval);
  
  // Set up memory cleanup
  setInterval(() => {
    cleanupMemory();
  }, 60000); // Every minute
};

export default {
  disableConsoleLogs,
  optimizeImage,
  lazyLoadImage,
  cleanupMemory,
  optimizeNetworkRequest,
  productionErrorHandler,
  measurePerformance,
  cacheManager,
  initializeProductionOptimizations,
};
