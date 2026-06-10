export const PerformanceConfig = {
  images: {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    cachePolicy: 'memory-disk',
    placeholder: 'blurhash',
    format: 'webp',
    priority: {
      high: ['splash', 'icon', 'avatar'],
      low: ['background', 'thumbnail']
    }
  },
  
  animations: {
    useNativeDriver: true,
    enableWorklets: true,
    reducedMotion: false,
    duration: {
      fast: 150,
      normal: 250,
      slow: 350
    },
    easing: {
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)'
    }
  },
  
  lazyLoading: {
    screens: {
      threshold: 0.5,
      rootMargin: '50px',
      preloadScreens: ['Home', 'Profile', 'Messages']
    },
    components: {
      threshold: 0.1,
      rootMargin: '100px'
    },
    images: {
      threshold: 0.01,
      rootMargin: '200px'
    }
  },
  
  memory: {
    maxCacheSize: 50 * 1024 * 1024,
    imageCacheLimit: 100,
    componentCacheLimit: 20,
    pruneInterval: 60000,
    warningThreshold: 150 * 1024 * 1024
  },
  
  navigation: {
    enableScreens: true,
    // Best UX: avoid blank/white flashes by keeping inactive screens mounted
    // (slightly higher memory use, but smoother transitions)
    detachInactiveScreens: false,
    freezeOnBlur: true,
    animationEnabled: true,
    presentation: 'card',
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 250,
          useNativeDriver: true
        }
      },
      close: {
        animation: 'timing',
        config: {
          duration: 200,
          useNativeDriver: true
        }
      }
    }
  },
  
  startup: {
    priorityComponents: [
      'ThemeProvider',
      'NavigationContainer',
      'StreamChatWrapper'
    ],
    deferredComponents: [
      'AnalyticsProvider',
      'NotificationListener',
      'LocationTracker'
    ],
    initialTimeout: 300,
    maxStartupTime: 3000
  },
  
  bundleOptimization: {
    minify: true,
    inlineRequires: true,
    enableBabelRCLookup: false,
    removePropTypes: true,
    treeshaking: true
  },
  
  monitoring: {
    enabled: true,
    fpsThreshold: 55,
    memoryThreshold: 150,
    startupThreshold: 3000,
    apiResponseThreshold: 2000,
    reportInterval: 30000
  }
};

export type PerformanceConfigType = typeof PerformanceConfig;
