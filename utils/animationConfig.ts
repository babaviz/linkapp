/**
 * Animation Configuration Utilities
 * Provides consistent animation timings, easing functions, and configurations
 * across all modules and components in the MyNyumba app
 */

import { Easing } from 'react-native';
import { TransitionSpecs } from '@react-navigation/stack';

// Define TransitionSpec type for type safety
type TransitionSpec = {
  animation: 'spring' | 'timing';
  config: {
    duration?: number;
    easing?: (value: number) => number;
    delay?: number;
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
};

// MARK: - Animation Timing Constants
export const ANIMATION_DURATIONS = {
  // Button press feedback
  TOUCH_FEEDBACK: 150,
  BUTTON_SCALE: 100,
  
  // Loading states
  SKELETON_SHIMMER: 1500,
  LOADING_FADE: 300,
  
  // Screen transitions
  SCREEN_TRANSITION: 250,
  MODAL_TRANSITION: 300,
  TAB_TRANSITION: 200,
  
  // Content animations
  LIST_ITEM_APPEAR: 200,
  CONTENT_FADE: 250,
  STANDARD_UI: 250,
  
  // Interactive elements
  TOOLTIP_APPEAR: 200,
  NOTIFICATION_SLIDE: 350,
  
  // Long animations
  ONBOARDING_SLIDE: 400,
  STORY_VIEWER: 300,
} as const;

// MARK: - Easing Functions
export const EASING_FUNCTIONS = {
  // Standard material design easings
  EASE_OUT: Easing.out(Easing.quad),
  EASE_IN: Easing.in(Easing.quad),
  EASE_IN_OUT: Easing.inOut(Easing.quad),
  
  // Custom easings for specific use cases
  SPRING_OUT: Easing.elastic(1.5),
  BOUNCE_OUT: Easing.bounce,
  
  // Sharp transitions
  LINEAR: Easing.linear,
  
  // Smooth deceleration
  DECEL: Easing.bezier(0.0, 0.0, 0.2, 1.0),
  
  // Quick acceleration
  ACCEL: Easing.bezier(0.4, 0.0, 1.0, 1.0),
  
  // Standard curve (Material Design)
  STANDARD: Easing.bezier(0.4, 0.0, 0.2, 1.0),
} as const;

// MARK: - Touch Feedback Configurations
export const TOUCH_FEEDBACK_CONFIG = {
  // Standard button press
  BUTTON_SCALE: {
    SCALE_DOWN: 0.95,
    SCALE_UP: 1.0,
    OPACITY_DOWN: 1.0,
    OPACITY_UP: 1.0,
    DURATION: ANIMATION_DURATIONS.BUTTON_SCALE,
    EASING: EASING_FUNCTIONS.EASE_OUT,
  },
  
  // Card press
  CARD_SCALE: {
    SCALE_DOWN: 0.98,
    SCALE_UP: 1.0,
    OPACITY_DOWN: 1.0,
    OPACITY_UP: 1.0,
    DURATION: ANIMATION_DURATIONS.TOUCH_FEEDBACK,
    EASING: EASING_FUNCTIONS.EASE_OUT,
  },
  
  // Tab press
  TAB_FEEDBACK: {
    SCALE_DOWN: 1.05,
    SCALE_UP: 1.0,
    OPACITY_DOWN: 1.0,
    OPACITY_UP: 1.0,
    DURATION: ANIMATION_DURATIONS.TAB_TRANSITION,
    EASING: EASING_FUNCTIONS.SPRING_OUT,
  },
  
  // Floating action button
  FAB_PRESS: {
    SCALE_DOWN: 0.92,
    SCALE_UP: 1.0,
    OPACITY_DOWN: 1.0,
    OPACITY_UP: 1.0,
    DURATION: ANIMATION_DURATIONS.BUTTON_SCALE,
    EASING: EASING_FUNCTIONS.BOUNCE_OUT,
  },
  
  // List item press
  LIST_ITEM: {
    SCALE_DOWN: 0.97,
    SCALE_UP: 1.0,
    OPACITY_DOWN: 0.8,
    OPACITY_UP: 1.0,
    DURATION: ANIMATION_DURATIONS.TOUCH_FEEDBACK,
    EASING: EASING_FUNCTIONS.EASE_OUT,
  },
  
  // Button press - add missing opacity properties for consistency
  BUTTON_ENHANCED: {
    SCALE_DOWN: 0.95,
    SCALE_UP: 1.0,
    OPACITY_DOWN: 1.0,
    OPACITY_UP: 1.0,
    DURATION: ANIMATION_DURATIONS.BUTTON_SCALE,
    EASING: EASING_FUNCTIONS.EASE_OUT,
  },
} as const;

// MARK: - Loading Animation Configurations
export const LOADING_ANIMATIONS = {
  // Skeleton shimmer effect
  SKELETON: {
    DURATION: ANIMATION_DURATIONS.SKELETON_SHIMMER,
    EASING: EASING_FUNCTIONS.LINEAR,
    COLORS: {
      BASE: '#f3f4f6',
      HIGHLIGHT: '#e5e7eb',
    },
  },
  
  // Fade in loading
  FADE_IN: {
    DURATION: ANIMATION_DURATIONS.LOADING_FADE,
    EASING: EASING_FUNCTIONS.EASE_OUT,
    FROM_OPACITY: 0,
    TO_OPACITY: 1,
  },
  
  // Slide up loading
  SLIDE_UP: {
    DURATION: ANIMATION_DURATIONS.CONTENT_FADE,
    EASING: EASING_FUNCTIONS.DECEL,
    FROM_Y: 20,
    TO_Y: 0,
  },
  
  // Scale in loading
  SCALE_IN: {
    DURATION: ANIMATION_DURATIONS.LIST_ITEM_APPEAR,
    EASING: EASING_FUNCTIONS.SPRING_OUT,
    FROM_SCALE: 0.8,
    TO_SCALE: 1.0,
  },
} as const;

// MARK: - Navigation Transition Configurations
export const NAVIGATION_TRANSITIONS = {
  // Standard screen transition (slide from right)
  SLIDE_FROM_RIGHT: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.SCREEN_TRANSITION,
        easing: EASING_FUNCTIONS.DECEL,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.SCREEN_TRANSITION,
        easing: EASING_FUNCTIONS.ACCEL,
      },
    },
  },
  
  // Modal transition (slide from bottom)
  SLIDE_FROM_BOTTOM: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.MODAL_TRANSITION,
        easing: EASING_FUNCTIONS.DECEL,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.MODAL_TRANSITION,
        easing: EASING_FUNCTIONS.ACCEL,
      },
    },
  },
  
  // Fade transition
  FADE: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.CONTENT_FADE,
        easing: EASING_FUNCTIONS.EASE_OUT,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.CONTENT_FADE,
        easing: EASING_FUNCTIONS.EASE_IN,
      },
    },
  },
  
  // Tab transition
  TAB_CHANGE: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.TAB_TRANSITION,
        easing: EASING_FUNCTIONS.STANDARD,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: ANIMATION_DURATIONS.TAB_TRANSITION,
        easing: EASING_FUNCTIONS.STANDARD,
      },
    },
  },
} as const;

// MARK: - Card Style Interpolators
export const CARD_STYLE_INTERPOLATORS = {
  // Standard slide transition
  SLIDE: ({ current, layouts }: any) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
  }),
  
  // Modal slide from bottom
  MODAL_SLIDE: ({ current, layouts }: any) => ({
    cardStyle: {
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.height, 0],
          }),
        },
      ],
    },
  }),
  
  // Fade transition
  FADE: ({ current }: any) => ({
    cardStyle: {
      opacity: current.progress,
    },
  }),
  
  // Scale transition
  SCALE: ({ current }: any) => ({
    cardStyle: {
      opacity: current.progress,
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.85, 1],
          }),
        },
      ],
    },
  }),
  
  // iOS-style modal
  IOS_MODAL: ({ current, layouts }: any) => ({
    cardStyle: {
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.height, 0],
          }),
        },
        {
          scale: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    },
  }),
} as const;

// MARK: - Service-Specific Color Configurations
export const SERVICE_COLORS = {
  PROPERTY: '#3B82F6',
  JOBS: '#8B5CF6',
  SERVICES: '#10B981',
  STORIES: '#F59E0B',
  DATEMI: '#EF4444',
  PROFILE: '#6B7280',
  SHARED: '#10B981',
} as const;

// MARK: - Animation Presets
export const ANIMATION_PRESETS = {
  // Quick feedback for immediate response
  QUICK_FEEDBACK: {
    duration: ANIMATION_DURATIONS.BUTTON_SCALE,
    easing: EASING_FUNCTIONS.EASE_OUT,
  },
  
  // Standard UI animations
  STANDARD_UI: {
    duration: ANIMATION_DURATIONS.CONTENT_FADE,
    easing: EASING_FUNCTIONS.STANDARD,
  },
  
  // Loading animations
  LOADING: {
    duration: ANIMATION_DURATIONS.LOADING_FADE,
    easing: EASING_FUNCTIONS.EASE_OUT,
  },
  
  // Page transitions
  PAGE_TRANSITION: {
    duration: ANIMATION_DURATIONS.SCREEN_TRANSITION,
    easing: EASING_FUNCTIONS.DECEL,
  },
  
  // Modal animations
  MODAL: {
    duration: ANIMATION_DURATIONS.MODAL_TRANSITION,
    easing: EASING_FUNCTIONS.DECEL,
  },
} as const;

// MARK: - Helper Functions
export const createSpringConfig = (tension: number = 300, friction: number = 7) => ({
  tension,
  friction,
  useNativeDriver: true,
});

export const createTimingConfig = (
  duration: number = ANIMATION_DURATIONS.STANDARD_UI,
  easing = EASING_FUNCTIONS.STANDARD
) => ({
  duration,
  easing,
  useNativeDriver: true,
});

// MARK: - Dark Mode Support
export const getDarkModeColors = (isDarkMode: boolean) => ({
  SKELETON: {
    BASE: isDarkMode ? '#374151' : '#f3f4f6',
    HIGHLIGHT: isDarkMode ? '#4B5563' : '#e5e7eb',
  },
  CARD_BACKGROUND: isDarkMode ? '#1F2937' : '#FFFFFF',
  TEXT_PRIMARY: isDarkMode ? '#F9FAFB' : '#1F2937',
  TEXT_SECONDARY: isDarkMode ? '#D1D5DB' : '#6B7280',
  BORDER: isDarkMode ? '#374151' : '#E5E7EB',
});

export default {
  ANIMATION_DURATIONS,
  EASING_FUNCTIONS,
  TOUCH_FEEDBACK_CONFIG,
  LOADING_ANIMATIONS,
  NAVIGATION_TRANSITIONS,
  CARD_STYLE_INTERPOLATORS,
  SERVICE_COLORS,
  ANIMATION_PRESETS,
  createSpringConfig,
  createTimingConfig,
  getDarkModeColors,
};
