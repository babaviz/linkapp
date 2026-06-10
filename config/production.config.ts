/**
 * Production Configuration for LinkApp
 * Optimized settings for deployment
 */

export const productionConfig = {
  // Performance optimizations
  performance: {
    enableHermes: true, // Enable Hermes JavaScript engine for better performance
    enableProguardInReleaseBuilds: true, // Enable ProGuard for Android
    enableShrinkResources: true, // Shrink unused resources
    useFlipper: false, // Disable Flipper in production
    enableReduxDevtools: false, // Disable Redux DevTools
    consoleLogsEnabled: false, // Disable console logs
  },

  // Image optimization
  images: {
    enableWebP: true, // Use WebP format where supported
    maxImageSize: 1024 * 1024, // 1MB max image size
    compressionQuality: 0.8, // 80% quality
    cacheImages: true, // Enable image caching
    lazyLoadImages: true, // Enable lazy loading
  },

  // Network optimization
  network: {
    timeout: 30000, // 30 seconds timeout
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    enableOfflineMode: true,
    cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
    compressionEnabled: true,
  },

  // Bundle optimization
  bundle: {
    minifyJS: true,
    minifyCSS: true,
    splitChunks: true,
    treeShaking: true,
    sideEffects: false,
    removeComments: true,
    removeConsole: true,
  },

  // Security settings
  security: {
    enableSSLPinning: true,
    enableCertificatePinning: true,
    obfuscateCode: true,
    encryptLocalStorage: true,
    preventScreenshots: true, // For sensitive screens
    requireBiometrics: false, // Optional biometric authentication
  },

  // Analytics and monitoring
  monitoring: {
    enableCrashlytics: true,
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    errorReporting: {
      enabled: true,
      sampleRate: 0.1, // Sample 10% of errors
    },
  },

  // API endpoints (production)
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api.linkapp.com',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-App-Version': process.env.REACT_APP_VERSION || '1.0.0',
    },
  },

  // Feature flags
  features: {
    enableDateMi: true,
    enableEscrowPayments: true,
    enableVideoCall: true,
    enableSubscriptions: true,
    enableRecommendations: true,
    enableOfflineSupport: true,
    enablePushNotifications: true,
    enableInAppPurchases: true,
  },

  // Cache settings
  cache: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupInterval: 24 * 60 * 60 * 1000, // Daily cleanup
  },

  // Logging
  logging: {
    level: 'error', // Only log errors in production
    remoteLogging: true,
    logRetention: 7, // Days
  },
};
