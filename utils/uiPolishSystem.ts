/**
 * Universal UI Polish System
 * Provides consistent animations, feedback, and polish across all app modules
 */

import { Animated, Vibration } from 'react-native';
import { Material3Animations, MotionTokens } from './material3Animations';

// Try to import expo-haptics, fallback to vibration if not available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  // Use dynamic import instead of require
  import('expo-haptics').then(module => {
    Haptics = module;
  }).catch(() => {
    // Haptics will remain null if import fails
  });
} catch {
  // Haptics will remain null
}

export interface PolishConfig {
  enableHaptics?: boolean;
  enableAnimations?: boolean;
  enableSounds?: boolean;
  animationScale?: number;
}

export class UIPolishSystem {
  private static config: PolishConfig = {
    enableHaptics: true,
    enableAnimations: true,
    enableSounds: false,
    animationScale: 1.0,
  };

  static configure(config: Partial<PolishConfig>) {
    this.config = { ...this.config, ...config };
  }

  // PRESS FEEDBACK SYSTEM
  static createPressAnimation(animatedValue: Animated.Value) {
    return {
      pressIn: () => {
        if (!this.config.enableAnimations) return;
        Material3Animations.pressIn(animatedValue, 0.96).start();
        this.triggerHaptic('light');
      },
      pressOut: () => {
        if (!this.config.enableAnimations) return;
        Material3Animations.pressOut(animatedValue).start();
      },
      success: () => {
        if (!this.config.enableAnimations) return;
        Material3Animations.bounce(animatedValue, 1.05).start();
        this.triggerHaptic('medium');
      }
    };
  }

  // HAPTIC FEEDBACK SYSTEM
  static triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
    if (!this.config.enableHaptics) return;

    try {
      if (Haptics) {
        // Use expo-haptics if available
        switch (type) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
        }
      } else {
        // Fallback to React Native Vibration
        switch (type) {
          case 'light':
            Vibration.vibrate(10);
            break;
          case 'medium':
            Vibration.vibrate(20);
            break;
          case 'heavy':
            Vibration.vibrate(50);
            break;
          case 'success':
            Vibration.vibrate([0, 10, 50, 10]);
            break;
          case 'warning':
            Vibration.vibrate([0, 10, 100, 10, 100, 10]);
            break;
          case 'error':
            Vibration.vibrate([0, 50, 100, 50]);
            break;
        }
      }
    } catch {
      // Silently fail if haptic feedback is not supported
    }
  }

  // STAGGERED ANIMATIONS FOR LISTS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static createStaggeredListAnimation(items: any[], delay = 50) {
    const animatedValues = items.map(() => new Animated.Value(0));
    
    const startAnimation = () => {
      if (!this.config.enableAnimations) {
        animatedValues.forEach(value => value.setValue(1));
        return;
      }

      const animations = animatedValues.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: MotionTokens.duration.medium2 * this.config.animationScale!,
          delay: index * delay,
          easing: MotionTokens.easing.decelerate,
          useNativeDriver: true,
        })
      );

      Animated.parallel(animations).start();
    };

    return { animatedValues, startAnimation };
  }

  // ENTRANCE ANIMATIONS
  static createEntranceAnimation(animatedValue: Animated.Value, type: 'fade' | 'slide' | 'scale' | 'bounce' = 'fade') {
    if (!this.config.enableAnimations) {
      animatedValue.setValue(1);
      return;
    }

    switch (type) {
      case 'fade':
        Material3Animations.fadeIn(animatedValue, MotionTokens.duration.medium2 * this.config.animationScale!).start();
        break;
      case 'slide':
        Material3Animations.slideInFromBottom(animatedValue, 50, MotionTokens.duration.medium3 * this.config.animationScale!).start();
        break;
      case 'scale':
        Material3Animations.scaleIn(animatedValue, MotionTokens.duration.medium2 * this.config.animationScale!).start();
        break;
      case 'bounce':
        Material3Animations.bounce(animatedValue, 1.1).start();
        break;
    }
  }

  // LOADING STATE MANAGEMENT
  static createLoadingState() {
    const fadeAnim = new Animated.Value(0);
    const pulseAnim = new Animated.Value(1);

    const startLoading = () => {
      if (!this.config.enableAnimations) {
        fadeAnim.setValue(1);
        return;
      }

      Animated.parallel([
        Material3Animations.fadeIn(fadeAnim),
        Material3Animations.pulse(pulseAnim, 1.1),
      ]).start();
    };

    const stopLoading = () => {
      if (!this.config.enableAnimations) {
        fadeAnim.setValue(0);
        pulseAnim.setValue(1);
        return;
      }

      Material3Animations.fadeOut(fadeAnim).start();
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    };

    return { fadeAnim, pulseAnim, startLoading, stopLoading };
  }

  // CARD ANIMATIONS
  static createCardAnimation(animatedValue: Animated.Value) {
    return {
      hover: () => {
        if (!this.config.enableAnimations) return;
        Animated.timing(animatedValue, {
          toValue: 1.02,
          duration: MotionTokens.duration.short4 * this.config.animationScale!,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }).start();
      },
      unhover: () => {
        if (!this.config.enableAnimations) return;
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: MotionTokens.duration.short4 * this.config.animationScale!,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }).start();
      },
      press: () => {
        if (!this.config.enableAnimations) return;
        Animated.timing(animatedValue, {
          toValue: 0.98,
          duration: MotionTokens.duration.short1 * this.config.animationScale!,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }).start();
        this.triggerHaptic('light');
      },
      release: () => {
        if (!this.config.enableAnimations) return;
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: MotionTokens.duration.short2 * this.config.animationScale!,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }).start();
      }
    };
  }

  // NOTIFICATION ANIMATIONS
  static createNotificationAnimation(animatedValue: Animated.Value, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    if (!this.config.enableAnimations) {
      animatedValue.setValue(1);
      return;
    }

    const slideIn = Animated.timing(animatedValue, {
      toValue: 1,
      duration: MotionTokens.duration.medium3 * this.config.animationScale!,
      easing: MotionTokens.easing.emphasized,
      useNativeDriver: true,
    });

    const slideOut = Animated.timing(animatedValue, {
      toValue: 0,
      duration: MotionTokens.duration.medium2 * this.config.animationScale!,
      easing: MotionTokens.easing.accelerate,
      useNativeDriver: true,
    });

    const show = () => {
      slideIn.start();
      this.triggerHaptic(type === 'error' ? 'error' : type === 'success' ? 'success' : 'medium');
    };

    const hide = (callback?: () => void) => {
      slideOut.start(callback);
    };

    return { show, hide };
  }

  // FAB ANIMATIONS
  static createFABAnimation(animatedValue: Animated.Value) {
    return {
      show: () => {
        if (!this.config.enableAnimations) {
          animatedValue.setValue(1);
          return;
        }
        Material3Animations.scaleIn(animatedValue, MotionTokens.duration.medium2 * this.config.animationScale!).start();
      },
      hide: () => {
        if (!this.config.enableAnimations) {
          animatedValue.setValue(0);
          return;
        }
        Material3Animations.scaleOut(animatedValue, MotionTokens.duration.medium1 * this.config.animationScale!).start();
      },
      press: () => {
        if (!this.config.enableAnimations) return;
        Material3Animations.bounce(animatedValue, 1.1).start();
        this.triggerHaptic('medium');
      }
    };
  }

  // SEARCH ANIMATIONS
  static createSearchAnimation(animatedValue: Animated.Value) {
    return {
      focus: () => {
        if (!this.config.enableAnimations) return;
        Animated.timing(animatedValue, {
          toValue: 1.02,
          duration: MotionTokens.duration.short4 * this.config.animationScale!,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }).start();
        this.triggerHaptic('light');
      },
      blur: () => {
        if (!this.config.enableAnimations) return;
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: MotionTokens.duration.short4 * this.config.animationScale!,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }).start();
      }
    };
  }

  // ACCESSIBILITY HELPERS
  static announceAction(_action: string) {
    // This would integrate with AccessibilityInfo if needed
  }

  // PERFORMANCE OPTIMIZATIONS
  static enableReducedMotion() {
    this.configure({
      enableAnimations: false,
      animationScale: 0,
    });
  }

  static enableFullMotion() {
    this.configure({
      enableAnimations: true,
      animationScale: 1.0,
    });
  }

  // THEME-BASED ADJUSTMENTS
  static applyThemeAdjustments(isDarkMode: boolean) {
    // Could adjust animation parameters based on theme
    if (isDarkMode) {
      this.configure({
        animationScale: 0.9, // Slightly faster animations in dark mode
      });
    } else {
      this.configure({
        animationScale: 1.0,
      });
    }
  }
}

// React Hooks for UI Polish
export const useUIPolish = () => {
  return {
    createPress: (animatedValue: Animated.Value) => UIPolishSystem.createPressAnimation(animatedValue),
    createCard: (animatedValue: Animated.Value) => UIPolishSystem.createCardAnimation(animatedValue),
    createEntrance: (animatedValue: Animated.Value, type?: 'fade' | 'slide' | 'scale' | 'bounce') => 
      UIPolishSystem.createEntranceAnimation(animatedValue, type),
    createLoading: () => UIPolishSystem.createLoadingState(),
    createFAB: (animatedValue: Animated.Value) => UIPolishSystem.createFABAnimation(animatedValue),
    createSearch: (animatedValue: Animated.Value) => UIPolishSystem.createSearchAnimation(animatedValue),
    haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => 
      UIPolishSystem.triggerHaptic(type),
  };
};

export default UIPolishSystem;
