import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

interface UseOptimizedAnimationsReturn {
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  slideAnim: Animated.Value;
  rotateAnim: Animated.Value;
  startFadeIn: (duration?: number) => void;
  startFadeOut: (duration?: number) => void;
  startScaleIn: (duration?: number) => void;
  startScaleOut: (duration?: number) => void;
  startSlideIn: (duration?: number) => void;
  startSlideOut: (duration?: number) => void;
  startRotation: (duration?: number) => void;
  stopAllAnimations: () => void;
  resetAllAnimations: () => void;
}

export function useOptimizedAnimations(): UseOptimizedAnimationsReturn {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      animationsRef.current.forEach(animation => {
        animation.stop();
      });
      animationsRef.current = [];
    };
  }, []);

  const addAnimation = useCallback((animation: Animated.CompositeAnimation) => {
    animationsRef.current.push(animation);
    return animation;
  }, []);

  const removeAnimation = useCallback((animation: Animated.CompositeAnimation) => {
    const index = animationsRef.current.indexOf(animation);
    if (index > -1) {
      animationsRef.current.splice(index, 1);
    }
  }, []);

  const startFadeIn = useCallback((duration = 300) => {
    const animation = addAnimation(
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    
    animation.start(() => {
      removeAnimation(animation);
    });
  }, [fadeAnim, addAnimation, removeAnimation]);

  const startFadeOut = useCallback((duration = 300) => {
    const animation = addAnimation(
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      })
    );
    
    animation.start(() => {
      removeAnimation(animation);
    });
  }, [fadeAnim, addAnimation, removeAnimation]);

  const startScaleIn = useCallback((duration = 200) => {
    const animation = addAnimation(
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    );
    
    animation.start(() => {
      removeAnimation(animation);
    });
  }, [scaleAnim, addAnimation, removeAnimation]);

  const startScaleOut = useCallback((duration = 200) => {
    const animation = addAnimation(
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    );
    
    animation.start(() => {
      removeAnimation(animation);
    });
  }, [scaleAnim, addAnimation, removeAnimation]);

  const startSlideIn = useCallback((duration = 400) => {
    const animation = addAnimation(
      Animated.timing(slideAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    );
    
    animation.start(() => {
      removeAnimation(animation);
    });
  }, [slideAnim, addAnimation, removeAnimation]);

  const startSlideOut = useCallback((duration = 300) => {
    const animation = addAnimation(
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        easing: Easing.in(Easing.back(1.1)),
        useNativeDriver: true,
      })
    );
    
    animation.start(() => {
      removeAnimation(animation);
    });
  }, [slideAnim, addAnimation, removeAnimation]);

  const startRotation = useCallback((duration = 1000) => {
    const animation = addAnimation(
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );
    
    animation.start();
  }, [rotateAnim, addAnimation]);

  const stopAllAnimations = useCallback(() => {
    animationsRef.current.forEach(animation => {
      animation.stop();
    });
    animationsRef.current = [];
  }, []);

  const resetAllAnimations = useCallback(() => {
    stopAllAnimations();
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    slideAnim.setValue(0);
    rotateAnim.setValue(0);
  }, [fadeAnim, scaleAnim, slideAnim, rotateAnim, stopAllAnimations]);

  return {
    fadeAnim,
    scaleAnim,
    slideAnim,
    rotateAnim,
    startFadeIn,
    startFadeOut,
    startScaleIn,
    startScaleOut,
    startSlideIn,
    startSlideOut,
    startRotation,
    stopAllAnimations,
    resetAllAnimations,
  };
}

/**
 * Hook for entrance animations with staggered timing
 */
export function useEntranceAnimations(itemCount: number, staggerDelay = 100) {
  const animations = useRef<Animated.Value[]>([]);
  
  useEffect(() => {
    // Initialize animations for each item
    animations.current = Array.from({ length: itemCount }, () => new Animated.Value(0));
    
    // Cleanup on unmount
    return () => {
      animations.current = [];
    };
  }, [itemCount]);

  const startEntranceAnimations = useCallback(() => {
    const animationSequences = animations.current.map((anim, index) => 
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: index * staggerDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    Animated.stagger(staggerDelay, animationSequences).start();
  }, [staggerDelay]);

  const resetEntranceAnimations = useCallback(() => {
    animations.current.forEach(anim => anim.setValue(0));
  }, []);

  return {
    animations: animations.current,
    startEntranceAnimations,
    resetEntranceAnimations,
  };
}
