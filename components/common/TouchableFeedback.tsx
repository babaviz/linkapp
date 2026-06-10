/**
 * TouchableFeedback - Enhanced TouchableOpacity with consistent press feedback
 * Provides unified button press feedback across all modules and screens
 * Supports various feedback types with accessibility compliance
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
  ViewStyle,
  View,
  AccessibilityRole,
  Platform,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TOUCH_FEEDBACK_CONFIG, ANIMATION_DURATIONS } from '../../utils/animationConfig';

// Feedback types for different interaction patterns
export type FeedbackType = 'button' | 'card' | 'tab' | 'fab' | 'listItem' | 'minimal';

export interface TouchableFeedbackProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  feedbackType?: FeedbackType;
  
  // Animation customization
  scaleValue?: number;
  opacityValue?: number;
  duration?: number;
  
  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  
  // Haptic feedback
  enableHaptics?: boolean;
  hapticsType?: 'light' | 'medium' | 'heavy' | 'selection';
  
  // Visual feedback
  enableRipple?: boolean;
  rippleColor?: string;
  
  // Size constraints (ensures 44px minimum for accessibility)
  minTouchSize?: number;
  
  // Loading state
  loading?: boolean;
}

const TouchableFeedback: React.FC<TouchableFeedbackProps> = ({
  children,
  onPress,
  style,
  disabled = false,
  feedbackType = 'button',
  scaleValue,
  opacityValue,
  duration,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  enableHaptics = true,
  hapticsType = 'light',
  enableRipple = Platform.OS === 'android',
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  minTouchSize = 44,
  loading = false,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Get feedback configuration based on type
  const getFeedbackConfig = () => {
    switch (feedbackType) {
      case 'card':
        return TOUCH_FEEDBACK_CONFIG.CARD_SCALE;
      case 'tab':
        return TOUCH_FEEDBACK_CONFIG.TAB_FEEDBACK;
      case 'fab':
        return TOUCH_FEEDBACK_CONFIG.FAB_PRESS;
      case 'listItem':
        return TOUCH_FEEDBACK_CONFIG.LIST_ITEM;
      case 'minimal':
        return {
          SCALE_DOWN: 0.99,
          SCALE_UP: 1.0,
          OPACITY_DOWN: 0.9,
          OPACITY_UP: 1.0,
          DURATION: ANIMATION_DURATIONS.TOUCH_FEEDBACK,
          EASING: TOUCH_FEEDBACK_CONFIG.BUTTON_SCALE.EASING,
        };
      default:
        return TOUCH_FEEDBACK_CONFIG.BUTTON_SCALE;
    }
  };

  const config = getFeedbackConfig();
  const finalScaleValue = scaleValue ?? config.SCALE_DOWN;
  const finalOpacityValue = opacityValue ?? (config.OPACITY_DOWN ?? 1);
  const finalDuration = duration ?? config.DURATION;

  const handlePressIn = () => {
    if (disabled || loading) return;

    // Haptic feedback
    if (enableHaptics && Platform.OS === 'ios' && Haptics) {
      try {
        if (hapticsType === 'light') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (hapticsType === 'medium') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (hapticsType === 'heavy') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (hapticsType === 'selection') {
          Haptics.selectionAsync();
        }
      } catch (error) {
        // Haptics not available, continue without feedback
      }
    }

    // Visual feedback animations
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: finalScaleValue,
        duration: finalDuration,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: finalOpacityValue,
        duration: finalDuration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;

    // Return to normal state
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: finalDuration,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: finalDuration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled || loading || !onPress) return;
    onPress();
  };

  // Ensure minimum touch target size for accessibility
  const ensureMinimumTouchSize = (styleArray: ViewStyle[]) => {
    const flatStyle = StyleSheet.flatten(styleArray);
    const hasExplicitSize = flatStyle.width !== undefined || flatStyle.height !== undefined;
    
    if (!hasExplicitSize) {
      return {
        ...flatStyle,
        minWidth: minTouchSize,
        minHeight: minTouchSize,
        alignItems: flatStyle.alignItems || 'center',
        justifyContent: flatStyle.justifyContent || 'center',
      };
    }
    
    return flatStyle;
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  // Combine and process styles
  const processedStyle = ensureMinimumTouchSize(
    Array.isArray(style) ? style : [style || {}]
  );

  const TouchableComponent = enableRipple && Platform.OS === 'android' 
    ? TouchableOpacity // For Android, we could use TouchableNativeFeedback but TouchableOpacity is more consistent
    : TouchableOpacity;

  return (
    <TouchableComponent
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8} // Fallback for platforms without animation
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      style={[processedStyle, { opacity: disabled ? 0.5 : 1 }]}
      {...props}
    >
      <Animated.View style={[animatedStyle, { flex: 1 }]}>
        {children}
      </Animated.View>
    </TouchableComponent>
  );
};

// Specialized components for common use cases
export const ButtonFeedback: React.FC<TouchableFeedbackProps> = (props) => (
  <TouchableFeedback {...props} feedbackType="button" />
);

export const CardFeedback: React.FC<TouchableFeedbackProps> = (props) => (
  <TouchableFeedback {...props} feedbackType="card" />
);

export const TabFeedback: React.FC<TouchableFeedbackProps> = (props) => (
  <TouchableFeedback {...props} feedbackType="tab" />
);

export const FABFeedback: React.FC<TouchableFeedbackProps> = (props) => (
  <TouchableFeedback {...props} feedbackType="fab" />
);

export const ListItemFeedback: React.FC<TouchableFeedbackProps> = (props) => (
  <TouchableFeedback {...props} feedbackType="listItem" />
);

export const MinimalFeedback: React.FC<TouchableFeedbackProps> = (props) => (
  <TouchableFeedback {...props} feedbackType="minimal" />
);

// Custom hook for touch feedback state management
export const useTouchFeedback = (
  feedbackType: FeedbackType = 'button'
) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const config = (() => {
    switch (feedbackType) {
      case 'card':
        return TOUCH_FEEDBACK_CONFIG.CARD_SCALE;
      case 'tab':
        return TOUCH_FEEDBACK_CONFIG.TAB_FEEDBACK;
      case 'fab':
        return TOUCH_FEEDBACK_CONFIG.FAB_PRESS;
      case 'listItem':
        return TOUCH_FEEDBACK_CONFIG.LIST_ITEM;
      default:
        return TOUCH_FEEDBACK_CONFIG.BUTTON_SCALE;
    }
  })();

  const startFeedback = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: config.SCALE_DOWN,
        duration: config.DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: config.OPACITY_DOWN ?? 1,
        duration: config.DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const endFeedback = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: config.SCALE_UP,
        duration: config.DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: config.OPACITY_UP ?? 1,
        duration: config.DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    scaleAnim,
    opacityAnim,
    startFeedback,
    endFeedback,
    animatedStyle: {
      transform: [{ scale: scaleAnim }],
      opacity: opacityAnim,
    },
  };
};

export { TouchableFeedback };
export default TouchableFeedback;

// Re-export specialized components for convenience
export {
  ButtonFeedback as InteractiveButton,
  CardFeedback as InteractiveCard,
  TabFeedback as InteractiveTab,
  FABFeedback as InteractiveFAB,
  ListItemFeedback as InteractiveListItem,
  MinimalFeedback as InteractiveMinimal,
  useTouchFeedback as useButtonFeedback,
  useTouchFeedback as useCardFeedback,
  useTouchFeedback as useFABFeedback,
};
