export const lazyImports = {
  analytics: () => import('../services/firebaseAnalyticsService'),
  performance: () => import('../services/firebasePerformanceService'),
  notifications: () => import('../services/notificationServiceMinimal'),
  chat: () => import('../services/streamChatService'),
  video: () => import('../services/streamVideoService'),
  location: () => import('../services/locationService'),
  maps: () => import('react-native-maps'),
};

export const preloadCriticalDependencies = async () => {
  const critical = [
    lazyImports.analytics(),
    lazyImports.performance(),
  ];
  
  try {
    await Promise.all(critical);
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Failed to preload critical dependencies:', error);
    }
  }
};

export const preloadDeferredDependencies = async () => {
  const deferred = [
    lazyImports.notifications(),
    lazyImports.chat(),
    lazyImports.location(),
  ];
  
  try {
    await Promise.allSettled(deferred);
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Failed to preload deferred dependencies:', error);
    }
  }
};

export const getDependencyStats = () => {
  const stats = {
    total: Object.keys(lazyImports).length,
    loaded: 0,
    pending: Object.keys(lazyImports).length,
  };
  
  return stats;
};
