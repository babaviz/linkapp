/**
 * Navigation Configuration
 * Smooth screen transitions and navigation options for enhanced UX
 */

import { TransitionSpecs, StackNavigationOptions } from '@react-navigation/stack';
import type { StackCardInterpolationProps } from '@react-navigation/stack';
import { Animated, Platform } from 'react-native';
import { MotionTokens } from '../utils/material3Animations';

// Custom transition specifications following Material 3 motion guidelines
const transitionConfig = {
  animation: 'timing' as const,
  config: {
    duration: MotionTokens.duration.short4,
    easing: MotionTokens.easing.emphasized,
  },
};

const slideFromRightTransition = {
  animation: 'timing' as const,
  config: {
    duration: MotionTokens.duration.short3,
    easing: MotionTokens.easing.decelerate,
  },
};

const fadeTransition = {
  animation: 'timing' as const,
  config: {
    duration: MotionTokens.duration.short4,
    easing: MotionTokens.easing.standard,
  },
};

// Screen transition animations
export const screenTransitions = {
  // Enhanced slide from right with shadow and overlay
  slideFromRight: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: slideFromRightTransition,
      close: slideFromRightTransition,
    },
    cardStyleInterpolator: ({ current, next, layouts }: any) => {
      const translateX = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [layouts.screen.width, 0],
      });

      const overlayOpacity = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.3],
      });

      const shadowOpacity = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.2],
      });

      return {
        cardStyle: {
          transform: [{ translateX }],
          shadowColor: '#000000',
          shadowOpacity,
          shadowOffset: { width: -2, height: 0 },
          shadowRadius: 8,
          elevation: 5,
        },
        overlayStyle: {
          opacity: overlayOpacity,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      };
    },
  },

  // Slide from bottom (modal style)
  slideFromBottom: {
    gestureDirection: 'vertical' as const,
    transitionSpec: {
      open: transitionConfig,
      close: transitionConfig,
    },
    cardStyleInterpolator: ({ current, layouts }: any) => {
      return {
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
        overlayStyle: {
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5],
          }),
        },
      };
    },
  },

// Enhanced fade transition with subtle scale
  fade: {
    transitionSpec: {
      open: fadeTransition,
      close: fadeTransition,
    },
    cardStyleInterpolator: ({ current }: any) => {
      const opacity = current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.8, 1],
      });
      const scale = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1],
      });
      return {
        cardStyle: {
          opacity,
          transform: [{ scale }],
        },
      };
    },
  },

  // Scale and fade (Material Design)
  scaleFromCenter: {
    transitionSpec: {
      open: transitionConfig,
      close: transitionConfig,
    },
    cardStyleInterpolator: ({ current }: any) => {
      const scale = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1],
      });

      const opacity = current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.8, 1],
      });

      return {
        cardStyle: {
          transform: [{ scale }],
          opacity,
        },
      };
    },
  },

  // Shared element transition style
  sharedElement: {
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: MotionTokens.duration.long1,
          easing: MotionTokens.easing.emphasized,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: MotionTokens.duration.medium4,
          easing: MotionTokens.easing.accelerate,
        },
      },
    },
    cardStyleInterpolator: ({ current, layouts }: any) => {
      const translateX = current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [layouts.screen.width * 0.1, 0, 0],
      });

      const scale = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1],
      });

      return {
        cardStyle: {
          transform: [{ translateX }, { scale }],
          opacity: current.progress,
        },
      };
    },
  },

  // Push transition (Android style)
  push: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: transitionConfig,
      close: transitionConfig,
    },
    cardStyleInterpolator: ({ current, next, layouts }: any) => {
      const translateX = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [layouts.screen.width, 0],
      });

      const overlayOpacity = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.07],
      });

      const shadowOpacity = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.3],
      });

      return {
        cardStyle: {
          transform: [{ translateX }],
        },
        overlayStyle: {
          backgroundColor: 'black',
          opacity: overlayOpacity,
        },
        shadowStyle: {
          shadowOpacity,
        },
      };
    },
  },
};

// Default navigation options for different screen types
export const navigationOptions = {
  // Standard screen options
  default: {
    headerShown: true,
    gestureEnabled: true,
    ...screenTransitions.slideFromRight,
    headerStyle: {
      backgroundColor: '#FFFFFF',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    headerTitleStyle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1F2937',
    },
    headerTintColor: '#374151',
  } as StackNavigationOptions,

  // Modal screen options
  modal: {
    headerShown: true,
    gestureEnabled: true,
    presentation: 'modal',
    ...screenTransitions.slideFromBottom,
    headerStyle: {
      backgroundColor: '#FFFFFF',
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
    },
    headerTintColor: '#374151',
  } as StackNavigationOptions,

  // Fullscreen modal
  fullScreenModal: {
    headerShown: false,
    gestureEnabled: false,
    presentation: 'modal',
    ...screenTransitions.slideFromBottom,
  } as StackNavigationOptions,

  // Tab screen options
  tab: {
    headerShown: false,
    gestureEnabled: true,
    ...screenTransitions.fade,
  } as StackNavigationOptions,

  // Details screen (with shared elements)
  details: {
    headerShown: true,
    gestureEnabled: true,
    ...screenTransitions.sharedElement,
    headerStyle: {
      backgroundColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1F2937',
    },
    headerTintColor: '#374151',
    headerBackground: () => (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        }}
      />
    ),
  } as StackNavigationOptions,

  // Chat/messaging screens
  chat: {
    headerShown: true,
    gestureEnabled: true,
    ...screenTransitions.slideFromRight,
    headerStyle: {
      backgroundColor: '#FFFFFF',
      elevation: 2,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
    },
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
    },
    headerTintColor: '#374151',
  } as StackNavigationOptions,

  // Authentication screens
  auth: {
    headerShown: false,
    gestureEnabled: false,
    ...screenTransitions.fade,
    cardStyle: {
      backgroundColor: '#F9FAFB',
    },
  } as StackNavigationOptions,

  // Settings screens
  settings: {
    headerShown: true,
    gestureEnabled: true,
    ...screenTransitions.slideFromRight,
    headerStyle: {
      backgroundColor: '#F9FAFB',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    headerTitleStyle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1F2937',
    },
    headerTintColor: '#374151',
  } as StackNavigationOptions,
};

// Enhanced tab bar configuration with Material 3 theming
export const tabBarConfig = {
  screenOptions: {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderTopWidth: 0,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.08)',
      borderRadius: 24,
      height: 84,
      paddingBottom: Platform.OS === 'ios' ? 20 : 12,
      paddingTop: 8,
      paddingHorizontal: 12,
      marginHorizontal: 16,
      marginBottom: Platform.OS === 'ios' ? 12 : 8,
      position: 'absolute',
      elevation: 8,
      shadowOpacity: 0.12,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
      letterSpacing: 0.2,
    },
    tabBarActiveTintColor: '#10B981',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarShowLabel: false,
    tabBarHideOnKeyboard: true,
    tabBarItemStyle: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
      marginHorizontal: 0,
      borderRadius: 20,
    },
    ...screenTransitions.fade,
  },
};

// Screen-specific transition overrides
export const getScreenOptions = (screenType: keyof typeof navigationOptions) => {
  return navigationOptions[screenType];
};

// Gesture configuration for better navigation experience
export const gestureConfig = {
  gestureEnabled: true,
  gestureResponseDistance: {
    horizontal: 50,
    vertical: 135,
  },
  gestureVelocityImpact: 0.3,
};

export default {
  screenTransitions,
  navigationOptions,
  tabBarConfig,
  getScreenOptions,
  gestureConfig,
};
