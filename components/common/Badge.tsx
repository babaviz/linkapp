import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  count: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  maxCount?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  animated?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  count,
  position = 'top-right',
  size = 'small',
  color = '#EF4444',
  textColor = '#FFFFFF',
  maxCount = 99,
  style,
  textStyle,
  animated = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  // IMPORTANT:
  // Start from 0 so the badge animates in on first render when `count > 0`.
  // If this ref is initialized with `count`, the mount render can remain scaled to 0
  // (invisible) until the count changes again.
  const previousCount = useRef(0);

  // Get size dimensions
  const getSizeDimensions = () => {
    switch (size) {
      case 'small':
        return { minWidth: 18, height: 18, fontSize: 10, padding: 2 };
      case 'medium':
        return { minWidth: 22, height: 22, fontSize: 12, padding: 3 };
      case 'large':
        return { minWidth: 26, height: 26, fontSize: 14, padding: 4 };
      default:
        return { minWidth: 18, height: 18, fontSize: 10, padding: 2 };
    }
  };

  // Get position styles
  const getPositionStyles = (): ViewStyle => {
    const offset = -8;
    switch (position) {
      case 'top-right':
        return { top: offset, right: offset };
      case 'top-left':
        return { top: offset, left: offset };
      case 'bottom-right':
        return { bottom: offset, right: offset };
      case 'bottom-left':
        return { bottom: offset, left: offset };
      default:
        return { top: offset, right: offset };
    }
  };

  useEffect(() => {
    if (animated) {
      // Animate when count changes
      if (count > 0 && (previousCount.current === 0 || count !== previousCount.current)) {
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            tension: 300,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (count === 0 && previousCount.current > 0) {
        // Animate out when count reaches 0
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (count > 0 && previousCount.current === 0) {
        // Initial appearance animation
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }
    } else {
      scaleAnim.setValue(count > 0 ? 1 : 0);
    }
    
    previousCount.current = count;
  }, [count, animated, scaleAnim]);

  // Don't render if count is 0
  if (count <= 0) {
    return null;
  }

  const dimensions = getSizeDimensions();
  const positionStyles = getPositionStyles();
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          backgroundColor: color,
          borderRadius: dimensions.height / 2,
          minWidth: dimensions.minWidth,
          height: dimensions.height,
          paddingHorizontal: dimensions.padding,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transform: [{ scale: scaleAnim }],
          // Add border for better visibility
          borderWidth: 2,
          borderColor: '#FFFFFF',
          // Add shadow for better visibility
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
          elevation: 5,
        },
        positionStyles,
        style,
      ]}
    >
      <Text
        style={[
          {
            fontSize: dimensions.fontSize,
            fontWeight: '700',
            color: textColor,
            textAlign: 'center',
            includeFontPadding: false,
            textAlignVertical: 'center',
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </Animated.View>
  );
};

export default Badge;
