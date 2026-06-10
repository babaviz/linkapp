/**
 * Themed Card Component
 * Example of using theme system with box shadows
 */

import React from 'react';
import { View, ViewProps, Pressable } from 'react-native';
import { useComponentStyles, shadows } from '../../theme';
import { ModuleName } from '../../theme/colors';

interface ThemedCardProps extends ViewProps {
  variant?: 'base' | 'elevated';
  pressable?: boolean;
  onPress?: () => void;
  shadow?: keyof typeof shadows;
  moduleOverride?: ModuleName;
  children: React.ReactNode;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  variant = 'base',
  pressable = false,
  onPress,
  shadow = variant === 'elevated' ? 'md' : 'none',
  moduleOverride,
  style,
  children,
  ...props
}) => {
  // Get component styles
  const componentStyles = useComponentStyles(moduleOverride);
  
  // Card styles
  const cardStyles = [
    variant === 'elevated' 
      ? componentStyles.card.elevated 
      : componentStyles.card.base,
    shadows[shadow],
    style,
  ];
  
  if (pressable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyles,
          pressed && componentStyles.card.pressed,
        ]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
  
  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
};
