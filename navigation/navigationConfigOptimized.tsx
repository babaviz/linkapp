/**
 * Optimized Navigation Configuration
 * High-performance screen transitions optimized for 60 FPS
 * Uses React Native Reanimated for smooth animations on Android and iOS
 */

import { Platform, InteractionManager, Easing } from 'react-native';
import { StackNavigationOptions } from '@react-navigation/stack';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';

// Enable native screens for optimal performance
enableScreens(true);

// Optimized transition durations for 60 FPS
// Shorter durations reduce frame drops, especially on Android
const TRANSITION_DURATION = {
  fast: Platform.select({
    android: 200, // Faster on Android for better performance
    ios: 250,
    default: 220,
  }),
  normal: Platform.select({
    android: 250, // Reduced from 300ms for smoother transitions
    ios: 300,
    default: 275,
  }),
  slow: Platform.select({
    android: 300,
    ios: 350,
    default: 325,
  }),
};

// Gesture response distances optimized for performance
const GESTURE_CONFIG = {
  horizontal: Platform.select({
    android: 30, // Reduced for faster response
    ios: 50,
    default: 40,
  }),
  vertical: Platform.select({
    android: 100,
    ios: 135,
    default: 120,
  }),
};

// Optimized default screen options for stack navigator
export const optimizedDefaultOptions: StackNavigationOptions = {
  headerShown: false,
  gestureEnabled: true,
  // Performance optimizations
  freezeOnBlur: Platform.OS === 'android', // Freeze screens when not visible on Android
  // Allow screens to render immediately during transition
  detachPreviousScreen: false, // Best UX: keep previous screen to avoid white flashes
  // Reduce overdraw on Android
  cardStyle: {
    backgroundColor: '#FFFFFF',
  },
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast, // Faster transitions for better perceived performance
        easing: Platform.select({
          android: Easing.out(Easing.cubic),
          ios: Easing.bezier(0.25, 0.1, 0.25, 1),
          default: Easing.out(Easing.cubic),
        }),
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast, // Fast close for snappy feel
        easing: Platform.select({
          android: Easing.in(Easing.cubic),
          ios: Easing.bezier(0.4, 0.0, 1, 1),
          default: Easing.in(Easing.cubic),
        }),
      },
    },
  },
};

// Modal screen options
export const optimizedModalOptions: StackNavigationOptions = {
  ...optimizedDefaultOptions,
  presentation: 'modal',
  gestureEnabled: true,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.normal,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast,
      },
    },
  },
};

// Tab screen options - minimal animations for tab switching
export const optimizedTabOptions: BottomTabNavigationOptions = {
  headerShown: false,
  // Lazy load tabs for better initial performance
  lazy: true,
  // Don't unmount tabs when switching (keeps state)
  unmountOnBlur: false,
};

// Fullscreen modal (e.g., video, camera)
export const optimizedFullscreenModalOptions: StackNavigationOptions = {
  ...optimizedDefaultOptions,
  presentation: 'modal',
  gestureEnabled: false,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast,
      },
    },
  },
};

// Detail screen options
export const optimizedDetailOptions: StackNavigationOptions = {
  ...optimizedDefaultOptions,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast,
      },
    },
  },
};

// Chat screen options
export const optimizedChatOptions: StackNavigationOptions = {
  ...optimizedDefaultOptions,
  // Keep previous screen in memory for quick back navigation
  freezeOnBlur: false,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.fast,
      },
    },
  },
};

// Auth screen options - fade transition
export const optimizedAuthOptions: StackNavigationOptions = {
  ...optimizedDefaultOptions,
  gestureEnabled: false, // Prevent accidental back navigation
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.normal,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: TRANSITION_DURATION.normal,
      },
    },
  },
};

// Performance helper: Defer heavy operations until after transition
export const deferUntilTransitionComplete = (callback: () => void) => {
  // Use InteractionManager to wait for animations to complete
  InteractionManager.runAfterInteractions(() => {
    // Additional delay to ensure transition is fully complete
    requestAnimationFrame(() => {
      callback();
    });
  });
};

// Performance helper: Request animation frame for smooth updates
export const requestSmoothUpdate = (callback: () => void) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback); // Double RAF for smoother updates
  });
};

// Screen-specific option getter
export const getOptimizedScreenOptions = (
  screenType: 'default' | 'modal' | 'fullscreen' | 'detail' | 'chat' | 'auth'
): StackNavigationOptions => {
  switch (screenType) {
    case 'modal':
      return optimizedModalOptions;
    case 'fullscreen':
      return optimizedFullscreenModalOptions;
    case 'detail':
      return optimizedDetailOptions;
    case 'chat':
      return optimizedChatOptions;
    case 'auth':
      return optimizedAuthOptions;
    default:
      return optimizedDefaultOptions;
  }
};

// Export transition constants
export const TRANSITION_CONFIG = {
  duration: TRANSITION_DURATION,
  gesture: GESTURE_CONFIG,
};

// Navigation theme optimized for performance
export const optimizedNavigationTheme = {
  dark: false,
  colors: {
    primary: '#4F46E5',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#111827',
    border: '#E5E7EB',
    notification: '#EF4444',
  },
};

export default {
  optimizedDefaultOptions,
  optimizedModalOptions,
  optimizedTabOptions,
  optimizedFullscreenModalOptions,
  optimizedDetailOptions,
  optimizedChatOptions,
  optimizedAuthOptions,
  getOptimizedScreenOptions,
  TRANSITION_CONFIG,
  optimizedNavigationTheme,
  deferUntilTransitionComplete,
  requestSmoothUpdate,
};

