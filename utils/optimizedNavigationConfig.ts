import { TransitionPresets, CardStyleInterpolators } from '@react-navigation/stack';
import { Easing } from 'react-native';
import { PerformanceConfig } from '../config/performance.config';

export const OptimizedTransitionConfig = {
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: PerformanceConfig.navigation.transitionSpec.open.config.duration,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: PerformanceConfig.navigation.transitionSpec.close.config.duration,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      },
    },
  },
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
};

export const OptimizedNavigationOptions = {
  headerShown: true,
  animationEnabled: PerformanceConfig.navigation.animationEnabled,
  presentation: PerformanceConfig.navigation.presentation,
  gestureEnabled: true,
  gestureResponseDistance: 50,
  cardOverlayEnabled: false,
  cardStyle: { backgroundColor: '#FFFFFF' },
  ...OptimizedTransitionConfig,
};

export const ModalNavigationOptions = {
  ...OptimizedNavigationOptions,
  presentation: 'modal' as const,
  cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
  gestureDirection: 'vertical' as const,
};

export const TransparentModalOptions = {
  ...ModalNavigationOptions,
  cardStyle: { backgroundColor: 'transparent' },
  cardOverlayEnabled: true,
  presentation: 'transparentModal' as const,
};

export const FastTransitionOptions = {
  ...OptimizedNavigationOptions,
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: PerformanceConfig.animations.duration.fast,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: PerformanceConfig.animations.duration.fast,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      },
    },
  },
};

export const FadeTransitionOptions = {
  ...OptimizedNavigationOptions,
  cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 200,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 150,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      },
    },
  },
};

export const BottomTabOptions = {
  lazy: true,
  detachInactiveScreens: PerformanceConfig.navigation.detachInactiveScreens,
  freezeOnBlur: PerformanceConfig.navigation.freezeOnBlur,
  tabBarHideOnKeyboard: true,
};

export const StackNavigationConfig = {
  screenOptions: OptimizedNavigationOptions,
  detachInactiveScreens: PerformanceConfig.navigation.detachInactiveScreens,
};

export const navigationPerformanceOptions = {
  freezeOnBlur: true,
  detachPreviousScreen: false,
  enableGestureHandlers: true,
  useNativeDriver: true,
};

export const getOptimizedScreenOptions = (screenName: string) => {
  const isModal = screenName.toLowerCase().includes('modal');
  const isTransparent = screenName.toLowerCase().includes('transparent');
  
  if (isTransparent) {
    return TransparentModalOptions;
  }
  
  if (isModal) {
    return ModalNavigationOptions;
  }
  
  return OptimizedNavigationOptions;
};
