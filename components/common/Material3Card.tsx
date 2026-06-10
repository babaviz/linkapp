/**
 * Material 3 Card Component
 * Implements Material 3 card specifications with elevation and animations
 */

import React, { useState } from 'react';
import { 
  View, 
  Pressable, 
  ViewStyle,
  Platform
} from 'react-native';
import { enhanceTouchTarget } from '../../utils/accessibilityHelpers';

type CardVariant = 'elevated' | 'filled' | 'outlined';
type CardSize = 'small' | 'medium' | 'large';

interface Material3CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  animateOnMount?: boolean;
  hoverEffect?: boolean;
  className?: string;
  elevation?: number;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Material3Card: React.FC<Material3CardProps> = ({
  children,
  variant = 'elevated',
  size = 'medium',
  onPress,
  disabled = false,
  style,
  contentStyle,
  animateOnMount = false,
  hoverEffect = true,
  className,
  elevation,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: {
      padding: 12,
      borderRadius: 8,
    },
    medium: {
      padding: 16,
      borderRadius: 12,
    },
    large: {
      padding: 20,
      borderRadius: 16,
    },
  };

  const config = sizeConfig[size];

  function getBaseElevation(): number {
    switch (variant) {
      case 'elevated':
        return 1;
      case 'filled':
        return 0;
      case 'outlined':
        return 0;
      default:
        return 1;
    }
  }

  function getHoverElevation(): number {
    switch (variant) {
      case 'elevated':
        return 3;
      case 'filled':
        return 1;
      case 'outlined':
        return 1;
      default:
        return 3;
    }
  }

  function getStaticElevationStyle(): ViewStyle {
    const currentElevation = isPressed && hoverEffect ? getHoverElevation() : getBaseElevation();
    
    if (Platform.OS === 'ios') {
      const shadows = [
        { width: 0, height: 0, opacity: 0, radius: 0 },
        { width: 0, height: 1, opacity: 0.05, radius: 1 },
        { width: 0, height: 1, opacity: 0.08, radius: 2 },
        { width: 0, height: 2, opacity: 0.12, radius: 4 },
        { width: 0, height: 4, opacity: 0.16, radius: 8 },
        { width: 0, height: 6, opacity: 0.20, radius: 12 },
      ];
      
      const shadow = shadows[Math.min(currentElevation, 5)];
      
      return {
        shadowColor: '#000',
        shadowOffset: { width: shadow.width, height: shadow.height },
        shadowOpacity: shadow.opacity,
        shadowRadius: shadow.radius,
      };
    } else {
      return {
        elevation: currentElevation,
      };
    }
  }

  // Variant styles
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: '#FFFFFF',
        };
      
      case 'filled':
        return {
          backgroundColor: '#F7F2FA', // Material 3 surface variant
        };
      
      case 'outlined':
        return {
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E0E0E0',
        };
      
      default:
        return {
          backgroundColor: '#FFFFFF',
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Animation handlers with proper native driver usage
  const handlePressIn = () => {
    if (disabled || !onPress) return;
    setIsPressed(true);
  };

  const handlePressOut = () => {
    if (disabled || !onPress) return;
    setIsPressed(false);
  };

  const handlePress = () => {
    if (disabled) return;
    onPress?.();
  };


  const CardContent = () => (
    <View
      style={[
        {
          borderRadius: config.borderRadius,
          overflow: 'hidden',
          opacity: isPressed ? 0.9 : 1,
          transform: [{ scale: isPressed ? 0.98 : 1 }],
        },
        variantStyles,
        getStaticElevationStyle(),
        style,
      ]}
    >
      <View
        style={[
          {
            padding: config.padding,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={{ opacity: disabled ? 0.6 : 1 }}
        accessibilityRole={accessibilityRole as any}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <CardContent />
      </Pressable>
    );
  }

  return <CardContent />;
};

export default Material3Card;
