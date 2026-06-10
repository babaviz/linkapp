/**
 * Themed Button Component
 * Example of how to use the theme system in components
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  TouchableOpacityProps,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { useColors, useComponentStyles, useTypography, useSpacing } from '../../theme';
import { ModuleName } from '../../theme/colors';

interface ThemedButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  moduleOverride?: ModuleName;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  fullWidth = false,
  moduleOverride,
  disabled,
  style,
  ...props
}) => {
  // Get theme values
  const colors = useColors(moduleOverride);
  const componentStyles = useComponentStyles(moduleOverride);
  const typography = useTypography();
  const { spacing } = useSpacing();
  
  // Determine text color based on variant
  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.module.primary.contrast;
      case 'secondary':
        return colors.module.secondary.contrast;
      case 'tertiary':
      case 'ghost':
        return colors.text.primary;
      default:
        return colors.text.inverse;
    }
  };
  
  // Determine button styles
  const buttonStyles = [
    componentStyles.button.base,
    componentStyles.button[variant],
    componentStyles.button.sizes[size],
    fullWidth && { width: '100%' as any },
    (disabled || loading) && componentStyles.button.disabled,
    style,
  ] as any;
  
  // Text styles
  const textStyles = [
    typography.textStyles[size === 'small' ? 'buttonSmall' : 'button'],
    { color: getTextColor() },
  ];
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={getTextColor()} 
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon && (
            <View style={{ marginRight: spacing.xs }}>
              {icon}
            </View>
          )}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
