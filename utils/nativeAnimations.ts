import { 
  withTiming, 
  withSpring, 
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withRepeat
} from 'react-native-reanimated';
import { PerformanceConfig } from '../config/performance.config';

export const AnimationPresets = {
  fast: PerformanceConfig.animations.duration.fast,
  normal: PerformanceConfig.animations.duration.normal,
  slow: PerformanceConfig.animations.duration.slow,
};

export const createNativeTiming = (
  toValue: number,
  duration: number = AnimationPresets.normal,
  callback?: () => void
) => {
  'worklet';
  return withTiming(
    toValue,
    {
      duration,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    },
    callback ? (finished) => {
      if (finished) {
        runOnJS(callback)();
      }
    } : undefined
  );
};

export const createNativeSpring = (
  toValue: number,
  config?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
    overshootClamping?: boolean;
  },
  callback?: () => void
) => {
  'worklet';
  return withSpring(
    toValue,
    {
      damping: config?.damping ?? 20,
      stiffness: config?.stiffness ?? 100,
      mass: config?.mass ?? 1,
      overshootClamping: config?.overshootClamping ?? false,
    },
    callback ? (finished) => {
      if (finished) {
        runOnJS(callback)();
      }
    } : undefined
  );
};

export const createFadeIn = (duration: number = AnimationPresets.normal) => {
  'worklet';
  return createNativeTiming(1, duration);
};

export const createFadeOut = (duration: number = AnimationPresets.normal) => {
  'worklet';
  return createNativeTiming(0, duration);
};

export const createSlideIn = (
  from: number,
  duration: number = AnimationPresets.normal
) => {
  'worklet';
  return createNativeTiming(0, duration);
};

export const createSlideOut = (
  to: number,
  duration: number = AnimationPresets.normal
) => {
  'worklet';
  return createNativeTiming(to, duration);
};

export const createScale = (
  fromScale: number,
  toScale: number,
  duration: number = AnimationPresets.normal
) => {
  'worklet';
  return createNativeTiming(toScale, duration);
};

export const createBounce = () => {
  'worklet';
  return withSequence(
    withSpring(1.1, { damping: 2, stiffness: 100 }),
    withSpring(1, { damping: 10, stiffness: 100 })
  );
};

export const createPulse = (scale: number = 1.05) => {
  'worklet';
  return withRepeat(
    withSequence(
      withTiming(scale, { duration: 600 }),
      withTiming(1, { duration: 600 })
    ),
    -1,
    true
  );
};

export const createShake = () => {
  'worklet';
  return withSequence(
    withTiming(-10, { duration: 50 }),
    withRepeat(withTiming(10, { duration: 50 }), 4, true),
    withTiming(0, { duration: 50 })
  );
};

export const useNativeAnimation = (initialValue: number = 0) => {
  const animatedValue = useSharedValue(initialValue);
  
  const animateTo = (
    toValue: number,
    config?: {
      type?: 'timing' | 'spring';
      duration?: number;
      callback?: () => void;
    }
  ) => {
    if (config?.type === 'spring') {
      animatedValue.value = createNativeSpring(toValue, {}, config.callback);
    } else {
      animatedValue.value = createNativeTiming(
        toValue,
        config?.duration,
        config?.callback
      );
    }
  };

  return {
    animatedValue,
    animateTo,
  };
};

export const useFadeAnimation = (initialOpacity: number = 0) => {
  const opacity = useSharedValue(initialOpacity);
  
  const fadeIn = (duration?: number, callback?: () => void) => {
    opacity.value = createNativeTiming(1, duration, callback);
  };
  
  const fadeOut = (duration?: number, callback?: () => void) => {
    opacity.value = createNativeTiming(0, duration, callback);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  return { opacity, fadeIn, fadeOut, animatedStyle };
};

export const useSlideAnimation = (initialPosition: number = 0) => {
  const translateY = useSharedValue(initialPosition);
  
  const slideIn = (from: number, duration?: number, callback?: () => void) => {
    translateY.value = from;
    translateY.value = createNativeTiming(0, duration, callback);
  };
  
  const slideOut = (to: number, duration?: number, callback?: () => void) => {
    translateY.value = createNativeTiming(to, duration, callback);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  
  return { translateY, slideIn, slideOut, animatedStyle };
};

export const useScaleAnimation = (initialScale: number = 1) => {
  const scale = useSharedValue(initialScale);
  
  const scaleTo = (toScale: number, duration?: number, callback?: () => void) => {
    scale.value = createNativeTiming(toScale, duration, callback);
  };
  
  const bounce = () => {
    scale.value = createBounce();
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return { scale, scaleTo, bounce, animatedStyle };
};

export const useRotateAnimation = (initialRotation: number = 0) => {
  const rotation = useSharedValue(initialRotation);
  
  const rotateTo = (toRotation: number, duration?: number, callback?: () => void) => {
    rotation.value = createNativeTiming(toRotation, duration, callback);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  
  return { rotation, rotateTo, animatedStyle };
};

export const AnimationUtils = {
  createNativeTiming,
  createNativeSpring,
  createFadeIn,
  createFadeOut,
  createSlideIn,
  createSlideOut,
  createScale,
  createBounce,
  createPulse,
  createShake,
};

export const AnimationHooks = {
  useNativeAnimation,
  useFadeAnimation,
  useSlideAnimation,
  useScaleAnimation,
  useRotateAnimation,
};
