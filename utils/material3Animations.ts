/**
 * Material 3 Animation System
 * Implements Material Design 3 motion specifications
 * Standard durations, easings, and transitions
 */

import { Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';

// Material 3 Motion Tokens
export const MotionTokens = {
  // Duration tokens
  duration: {
    short1: 50,   // Micro-interactions
    short2: 100,  // Small UI element transitions
    short3: 150,  // Small UI element transitions
    short4: 200,  // Standard transitions
    medium1: 250, // Medium transitions
    medium2: 300, // Standard component transitions
    medium3: 350, // Standard component transitions  
    medium4: 400, // FAB transitions, larger components
    long1: 450,   // Large area transitions
    long2: 500,   // Screen transitions
    long3: 550,   // Screen transitions
    long4: 600,   // Complex screen transitions
  },

  // Easing tokens
  easing: {
    // Standard easing - most common
    standard: Easing.bezier(0.2, 0.0, 0, 1.0),
    // Decelerate easing - for entering elements
    decelerate: Easing.bezier(0.0, 0.0, 0.2, 1.0),
    // Accelerate easing - for exiting elements  
    accelerate: Easing.bezier(0.4, 0.0, 1.0, 1.0),
    // Emphasized easing - for important transitions
    emphasized: Easing.bezier(0.2, 0.0, 0, 1.0),
    // Linear easing - for continuous motion
    linear: Easing.linear,
  }
};

// Pre-configured animation types
export class Material3Animations {
  /**
   * Standard fade in animation
   */
  static fadeIn(animatedValue: Animated.Value, duration = MotionTokens.duration.medium2): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: MotionTokens.easing.decelerate,
      useNativeDriver: true,
    });
  }

  /**
   * Standard fade out animation
   */
  static fadeOut(animatedValue: Animated.Value, duration = MotionTokens.duration.medium2): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: MotionTokens.easing.accelerate,
      useNativeDriver: true,
    });
  }

  /**
   * Scale in animation (for appearing elements)
   */
  static scaleIn(animatedValue: Animated.Value, duration = MotionTokens.duration.medium2): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: MotionTokens.easing.decelerate,
      useNativeDriver: true,
    });
  }

  /**
   * Scale out animation (for disappearing elements)
   */
  static scaleOut(animatedValue: Animated.Value, duration = MotionTokens.duration.medium2): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: MotionTokens.easing.accelerate,
      useNativeDriver: true,
    });
  }

  /**
   * Slide in from bottom animation
   */
  static slideInFromBottom(animatedValue: Animated.Value, distance = 50, duration = MotionTokens.duration.medium3): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: MotionTokens.easing.decelerate,
      useNativeDriver: true,
    });
  }

  /**
   * Slide out to bottom animation
   */
  static slideOutToBottom(animatedValue: Animated.Value, distance = 50, duration = MotionTokens.duration.medium3): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: distance,
      duration,
      easing: MotionTokens.easing.accelerate,
      useNativeDriver: true,
    });
  }

  /**
   * Press animation (scale down slightly)
   */
  static pressIn(animatedValue: Animated.Value, scale = 0.95): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: scale,
      duration: MotionTokens.duration.short1,
      easing: MotionTokens.easing.standard,
      useNativeDriver: true,
    });
  }

  /**
   * Press release animation (scale back to normal)
   */
  static pressOut(animatedValue: Animated.Value): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: MotionTokens.duration.short2,
      easing: MotionTokens.easing.standard,
      useNativeDriver: true,
    });
  }

  /**
   * Bounce animation for interaction feedback
   */
  static bounce(animatedValue: Animated.Value, scale = 1.1): Animated.CompositeAnimation {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: scale,
        duration: MotionTokens.duration.short3,
        easing: MotionTokens.easing.decelerate,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: MotionTokens.duration.short4,
        easing: MotionTokens.easing.standard,
        useNativeDriver: true,
      }),
    ]);
  }

  /**
   * Pulse animation for activity indicators
   */
  static pulse(animatedValue: Animated.Value, scale = 1.2): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: scale,
          duration: MotionTokens.duration.medium4,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: MotionTokens.duration.medium4,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }),
      ])
    );
  }

  /**
   * Staggered list animation
   */
  static staggeredFadeIn(animatedValues: Animated.Value[], staggerDelay = 50): Animated.CompositeAnimation {
    const animations = animatedValues.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: MotionTokens.duration.medium2,
        delay: index * staggerDelay,
        easing: MotionTokens.easing.decelerate,
        useNativeDriver: true,
      })
    );
    return Animated.parallel(animations);
  }

  /**
   * Ripple effect animation (for button press feedback)
   */
  static ripple(animatedValue: Animated.Value, duration = MotionTokens.duration.medium4): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: MotionTokens.easing.linear,
      useNativeDriver: false, // Can't use native driver for width/height
    });
  }

  /**
   * Card hover animation (elevation change)
   */
  static elevationChange(animatedValue: Animated.Value, targetElevation: number): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: targetElevation,
      duration: MotionTokens.duration.short4,
      easing: MotionTokens.easing.standard,
      useNativeDriver: false, // Elevation changes can't use native driver
    });
  }

  /**
   * Loading spinner rotation
   */
  static rotate(animatedValue: Animated.Value): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: MotionTokens.duration.long2,
        easing: MotionTokens.easing.linear,
        useNativeDriver: true,
      })
    );
  }

  /**
   * Shimmer animation for skeleton loaders
   */
  static shimmer(animatedValue: Animated.Value): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: MotionTokens.duration.long1,
          easing: MotionTokens.easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: MotionTokens.duration.long1,
          easing: MotionTokens.easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
  }

  /**
   * Combined fade and slide animation
   */
  static fadeSlideIn(animatedValue: Animated.Value, delay = 0, duration = MotionTokens.duration.medium3): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      delay,
      easing: MotionTokens.easing.decelerate,
      useNativeDriver: true,
    });
  }
}

// Material 3 Elevation System
export const ElevationSystem = {
  // Material 3 elevation levels
  level0: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  level4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  level5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 5,
  },
};

// Helper functions
export const createAnimatedValue = (initialValue = 0) => new Animated.Value(initialValue);

export const createSpringConfig = (tension = 300, friction = 30) => ({
  tension,
  friction,
  useNativeDriver: true,
});

// Export standard easing for compatibility
export const standardEase = MotionTokens.easing.standard;

// Animation presets for common UI patterns
export const AnimationPresets = {
  // Card entrance
  cardEntrance: (animatedValue: Animated.Value) =>
    Animated.parallel([
      Material3Animations.fadeIn(animatedValue),
      Material3Animations.scaleIn(animatedValue),
    ]),

  // Button press feedback
  buttonPress: (scaleValue: Animated.Value, rippleValue: Animated.Value) =>
    Animated.parallel([
      Material3Animations.pressIn(scaleValue),
      Material3Animations.ripple(rippleValue),
    ]),

  // Loading state
  loadingPulse: (animatedValue: Animated.Value) =>
    Material3Animations.pulse(animatedValue, 1.05),

  // Success feedback
  successBounce: (animatedValue: Animated.Value) =>
    Material3Animations.bounce(animatedValue, 1.15),
};

// React Hooks for common animations
export const useScale = (initialValue = 0) => {
  const scaleAnim = useRef(new Animated.Value(initialValue)).current;
  
  useEffect(() => {
    Material3Animations.scaleIn(scaleAnim).start();
  }, [scaleAnim]);
  
  return scaleAnim;
};

export const useSlide = (initialValue = 0) => {
  const slideAnim = useRef(new Animated.Value(initialValue)).current;
  
  useEffect(() => {
    Material3Animations.fadeIn(slideAnim).start();
  }, [slideAnim]);
  
  return slideAnim;
};

export const useFade = (initialValue = 0) => {
  const fadeAnim = useRef(new Animated.Value(initialValue)).current;
  
  useEffect(() => {
    Material3Animations.fadeIn(fadeAnim).start();
  }, [fadeAnim]);
  
  return fadeAnim;
};

// Create a material3Animations object with hooks
export const material3Animations = {
  useScale,
  useSlide,
  useFade,
  fadeSlideIn: Material3Animations.fadeSlideIn,
  fadeIn: Material3Animations.fadeIn,
  fadeOut: Material3Animations.fadeOut,
  scaleIn: Material3Animations.scaleIn,
  scaleOut: Material3Animations.scaleOut,
  slideInFromBottom: Material3Animations.slideInFromBottom,
  slideOutToBottom: Material3Animations.slideOutToBottom,
  bounce: Material3Animations.bounce,
  pulse: Material3Animations.pulse,
  MotionTokens,
  ElevationSystem,
  AnimationPresets,
};

export default Material3Animations;
