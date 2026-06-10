/**
 * InteractiveComponent - Universal component for consistent press feedback
 * Provides consistent tap animations across all interactive elements in the app
 */

import React, { useRef, useState } from 'react';
import { Animated, Pressable, PressableProps, ViewStyle } from 'react-native';
import { Material3Animations, MotionTokens } from '../../utils/material3Animations';

export interface InteractiveComponentProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  animationType?: 'scale' | 'opacity' | 'scale-opacity' | 'none';
  scaleValue?: number;
  opacityValue?: number;
  disabled?: boolean;
  rippleEffect?: boolean;
  rippleColor?: string;
  hapticFeedback?: boolean;
}

const InteractiveComponent: React.FC<InteractiveComponentProps> = ({
  children,
  style,
  animationType = 'scale-opacity',
  scaleValue = 0.96,
  opacityValue = 0.7,
  disabled = false,
  rippleEffect = false,
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  hapticFeedback = true,
  onPressIn,
  onPressOut,
  onPress,
  ...pressableProps
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  const handlePressIn = (event: any) => {
    if (disabled) return;

    setIsPressed(true);

    const animations: Animated.CompositeAnimation[] = [];

    // Scale animation
    if (animationType === 'scale' || animationType === 'scale-opacity') {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: scaleValue,
          duration: MotionTokens.duration.short1,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        })
      );
    }

    // Opacity animation
    if (animationType === 'opacity' || animationType === 'scale-opacity') {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: opacityValue,
          duration: MotionTokens.duration.short1,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        })
      );
    }

    // Ripple animation
    if (rippleEffect) {
      rippleAnim.setValue(0);
      animations.push(
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: MotionTokens.duration.medium4,
          easing: MotionTokens.easing.linear,
          useNativeDriver: false,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }

    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (disabled) return;

    setIsPressed(false);

    const animations: Animated.CompositeAnimation[] = [];

    // Scale animation back to normal
    if (animationType === 'scale' || animationType === 'scale-opacity') {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: MotionTokens.duration.short2,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        })
      );
    }

    // Opacity animation back to normal
    if (animationType === 'opacity' || animationType === 'scale-opacity') {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: MotionTokens.duration.short2,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }

    onPressOut?.(event);
  };

  const handlePress = (event: any) => {
    if (disabled) return;

    // Haptic feedback (if enabled)
    if (hapticFeedback) {
      // Import HapticFeedback at the top if available
      // HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
    }

    // Success bounce animation for important actions
    if (animationType !== 'none') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: MotionTokens.duration.short3,
          easing: MotionTokens.easing.decelerate,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: MotionTokens.duration.short4,
          easing: MotionTokens.easing.standard,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onPress?.(event);
  };

  // Ripple interpolations
  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.3, 0.2, 0],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[
        {
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...pressableProps}
    >
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
          rippleEffect && {
            overflow: 'hidden',
          },
        ]}
      >
        {/* Ripple Effect */}
        {rippleEffect && (
          <Animated.View
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 200,
              height: 200,
              marginTop: -100,
              marginLeft: -100,
              backgroundColor: rippleColor,
              borderRadius: 100,
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            }}
            pointerEvents="none"
          />
        )}
        
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default InteractiveComponent;
