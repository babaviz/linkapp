import { useCallback, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  interpolate,
  Extrapolate,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

interface SpringConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
}

interface TimingConfig {
  duration?: number;
  easing?: typeof Easing.linear;
}

export const useReanimatedOptimized = () => {
  // Shared values for animations
  const fadeValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateValue = useSharedValue(0);
  const heightValue = useSharedValue(0);

  // Optimized spring config
  const springConfig: SpringConfig = {
    damping: 15,
    stiffness: 100,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.001,
    restSpeedThreshold: 0.001,
  };

  // Optimized timing config
  const timingConfig: TimingConfig = {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  };

  // Animated styles
  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeValue.value,
  }));

  const scaleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const translateAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ] as any,
  }));

  const combinedAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeValue.value,
    transform: [
      { scale: scaleValue.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotateValue.value}deg` },
    ] as any,
  }));

  const expandAnimatedStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
    opacity: interpolate(heightValue.value, [0, 100], [0, 1], Extrapolate.CLAMP),
  }));

  // Animation controls
  const fadeIn = useCallback(
    (duration = 300) => {
      'worklet';
      fadeValue.value = withTiming(1, { duration });
    },
    [fadeValue]
  );

  const fadeOut = useCallback(
    (duration = 300) => {
      'worklet';
      fadeValue.value = withTiming(0, { duration });
    },
    [fadeValue]
  );

  const scale = useCallback(
    (toValue: number, config?: SpringConfig) => {
      'worklet';
      scaleValue.value = withSpring(toValue, config || springConfig);
    },
    [scaleValue, springConfig]
  );

  const slideIn = useCallback(
    (fromX = 100, duration = 300) => {
      'worklet';
      translateX.value = fromX;
      translateX.value = withTiming(0, { duration });
    },
    [translateX]
  );

  const slideOut = useCallback(
    (toX = 100, duration = 300) => {
      'worklet';
      translateX.value = withTiming(toX, { duration });
    },
    [translateX]
  );

  const expand = useCallback(
    (toHeight: number, duration = 300) => {
      'worklet';
      heightValue.value = withTiming(toHeight, { duration });
    },
    [heightValue]
  );

  const collapse = useCallback(
    (duration = 300) => {
      'worklet';
      heightValue.value = withTiming(0, { duration });
    },
    [heightValue]
  );

  const bounce = useCallback(() => {
    'worklet';
    scaleValue.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withSpring(1, springConfig)
    );
  }, [scaleValue, springConfig]);

  const shake = useCallback(() => {
    'worklet';
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [translateX]);

  const pulse = useCallback(() => {
    'worklet';
    scaleValue.value = withSequence(
      withTiming(1.05, { duration: 200 }),
      withTiming(0.95, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  }, [scaleValue]);

  const reset = useCallback(() => {
    'worklet';
    fadeValue.value = 0;
    scaleValue.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    rotateValue.value = 0;
    heightValue.value = 0;
  }, [fadeValue, scaleValue, translateX, translateY, rotateValue, heightValue]);

  const cancelAll = useCallback(() => {
    'worklet';
    cancelAnimation(fadeValue);
    cancelAnimation(scaleValue);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    cancelAnimation(rotateValue);
    cancelAnimation(heightValue);
  }, [fadeValue, scaleValue, translateX, translateY, rotateValue, heightValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAll();
    };
  }, [cancelAll]);

  return {
    // Animated values
    fadeValue,
    scaleValue,
    translateX,
    translateY,
    rotateValue,
    heightValue,

    // Animated styles
    fadeAnimatedStyle,
    scaleAnimatedStyle,
    translateAnimatedStyle,
    combinedAnimatedStyle,
    expandAnimatedStyle,

    // Animation controls
    fadeIn,
    fadeOut,
    scale,
    slideIn,
    slideOut,
    expand,
    collapse,
    bounce,
    shake,
    pulse,
    reset,
    cancelAll,

    // Pre-configured animations
    presets: {
      fadeIn: FadeIn.duration(300),
      fadeOut: FadeOut.duration(300),
      slideInRight: SlideInRight.duration(300),
      slideOutLeft: SlideOutLeft.duration(300),
      layout: Layout.springify(),
    },
  };
};

// List item animation hook for staggered animations
export const useListItemAnimation = (index: number, totalItems: number) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    // Staggered entrance animation
    const delay = Math.min(index * 50, 500); // Cap delay at 500ms
    
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300 })
    );
    
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
      })
    );
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
};

// Scroll-based animations
export const useScrollAnimation = (scrollOffset: SharedValue<number>) => {
  const headerHeight = useSharedValue(100);
  const headerOpacity = useSharedValue(1);

  const collapsibleHeaderStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollOffset.value,
      [0, 100],
      [100, 60],
      Extrapolate.CLAMP
    );
    
    const opacity = interpolate(
      scrollOffset.value,
      [0, 50],
      [1, 0],
      Extrapolate.CLAMP
    );

    return {
      height,
      opacity,
    };
  });

  const parallaxStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollOffset.value,
      [0, 200],
      [0, -50],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }],
    };
  });

  return {
    collapsibleHeaderStyle,
    parallaxStyle,
  };
};

// Gesture-based animations helper
export const usePressAnimation = () => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 400,
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut,
  };
};
