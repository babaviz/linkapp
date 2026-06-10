/**
 * Material 3 Button Component
 * Implements all Material 3 button types with proper animations and elevation
 */

import React, { useRef, useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  View, 
  Animated, 
  Pressable,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { Material3Animations, ElevationSystem, MotionTokens } from '../../utils/material3Animations';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

interface Material3ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  color?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Material3Button: React.FC<Material3ButtonProps> = ({
  children,
  onPress,
  variant = 'filled',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  color = '#6750A4', // Material 3 primary color
  fullWidth = false,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 32,
      fontSize: 12,
      iconSize: 16,
    },
    medium: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      minHeight: 40,
      fontSize: 14,
      iconSize: 20,
    },
    large: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      minHeight: 48,
      fontSize: 16,
      iconSize: 24,
    },
  };

  const config = sizeConfig[size];

  // Variant styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    const alpha = disabled ? 0.38 : 1;
    
    switch (variant) {
      case 'filled':
        return {
          container: {
            backgroundColor: disabled ? '#E0E0E0' : color,
            ...ElevationSystem.level1,
          },
          text: {
            color: disabled ? '#9E9E9E' : '#FFFFFF',
            fontWeight: '600' as const,
          },
        };
      
      case 'tonal':
        return {
          container: {
            backgroundColor: disabled ? '#E0E0E0' : `${color}20`,
            ...ElevationSystem.level0,
          },
          text: {
            color: disabled ? '#9E9E9E' : color,
            fontWeight: '600' as const,
          },
        };
      
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: disabled ? '#E0E0E0' : color,
            ...ElevationSystem.level0,
          },
          text: {
            color: disabled ? '#9E9E9E' : color,
            fontWeight: '600' as const,
          },
        };
      
      case 'text':
        return {
          container: {
            backgroundColor: 'transparent',
            ...ElevationSystem.level0,
          },
          text: {
            color: disabled ? '#9E9E9E' : color,
            fontWeight: '600' as const,
          },
        };
      
      default:
        return {
          container: { backgroundColor: color },
          text: { color: '#FFFFFF' },
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Animation handlers
  const handlePressIn = () => {
    if (disabled || loading) return;
    
    setIsPressed(true);
    rippleAnim.setValue(0);
    
    Animated.parallel([
      Material3Animations.pressIn(scaleAnim, 0.96),
      Material3Animations.ripple(rippleAnim),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    setIsPressed(false);
    Material3Animations.pressOut(scaleAnim).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    
    // Success bounce animation
    Material3Animations.bounce(scaleAnim, 1.02).start();
    onPress?.();
  };

  // Loading animation
  React.useEffect(() => {
    if (loading) {
      Material3Animations.rotate(loadingAnim).start();
    } else {
      loadingAnim.setValue(0);
    }
  }, [loading]);

  // Ripple interpolation
  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.3, 0.2, 0],
  });

  const loadingRotation = loadingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        {
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: config.paddingHorizontal,
            paddingVertical: config.paddingVertical,
            minHeight: config.minHeight,
            borderRadius: 20, // Material 3 button border radius
            overflow: 'hidden',
            transform: [{ scale: scaleAnim }],
          },
          variantStyles.container,
        ]}
      >
        {/* Ripple Effect */}
        <Animated.View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 200,
            height: 200,
            marginTop: -100,
            marginLeft: -100,
            backgroundColor: variant === 'filled' ? '#FFFFFF' : color,
            borderRadius: 100,
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          }}
          pointerEvents="none"
        />

        {/* Loading Spinner */}
        {loading && (
          <Animated.View
            style={[
              {
                width: config.iconSize,
                height: config.iconSize,
                marginRight: 8,
                borderWidth: 2,
                borderColor: variant === 'filled' ? '#FFFFFF' : color,
                borderTopColor: 'transparent',
                borderRadius: config.iconSize / 2,
                transform: [{ rotate: loadingRotation }],
              },
            ]}
          />
        )}

        {/* Left Icon */}
        {icon && iconPosition === 'left' && !loading && (
          <Text
            style={{
              fontSize: config.iconSize,
              marginRight: 8,
              lineHeight: config.iconSize,
            }}
          >
            {icon}
          </Text>
        )}

        {/* Button Text */}
        <Text
          style={[
            {
              fontSize: config.fontSize,
              letterSpacing: 0.1,
              textAlign: 'center',
            },
            variantStyles.text,
            textStyle,
          ]}
        >
          {children}
        </Text>

        {/* Right Icon */}
        {icon && iconPosition === 'right' && !loading && (
          <Text
            style={{
              fontSize: config.iconSize,
              marginLeft: 8,
              lineHeight: config.iconSize,
            }}
          >
            {icon}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

export default Material3Button;
