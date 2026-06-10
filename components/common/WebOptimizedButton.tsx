import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors } from '../../src/theme';
import { useResponsiveLayout } from '../../utils/responsive';

interface WebOptimizedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * WebOptimizedButton
 * Button component with hover and focus states optimized for web
 */
export const WebOptimizedButton: React.FC<WebOptimizedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const layout = useResponsiveLayout();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const isWeb = Platform.OS === 'web';
  const isDisabled = disabled || loading;
  
  // Get variant colors
  const getVariantStyles = (): { bg: string; text: string; border?: string } => {
    switch (variant) {
      case 'primary':
        return {
          bg: colors.modules.property.primary.main,
          text: colors.base.white,
        };
      case 'secondary':
        return {
          bg: colors.base.gray[200],
          text: colors.base.gray[900],
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: colors.modules.property.primary.main,
          border: colors.modules.property.primary.main,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: colors.modules.property.primary.main,
        };
      default:
        return {
          bg: colors.modules.property.primary.main,
          text: colors.base.white,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  
  // Size-based padding
  const getSizePadding = () => {
    switch (size) {
      case 'sm':
        return { paddingHorizontal: layout.spacing.sm, paddingVertical: layout.spacing.xs };
      case 'lg':
        return { paddingHorizontal: layout.spacing.lg, paddingVertical: layout.spacing.md };
      default:
        return { paddingHorizontal: layout.spacing.md, paddingVertical: layout.spacing.sm };
    }
  };
  
  const fontSize = size === 'sm' ? layout.fontSize.sm : size === 'lg' ? layout.fontSize.lg : layout.fontSize.md;
  
  // Hover effect for web
  const getHoverStyle = (): ViewStyle => {
    if (!isWeb || !isHovered || isDisabled) return {};
    
    return {
      opacity: 0.9,
      transform: [{ scale: 1.02 }],
    };
  };
  
  // Focus effect for web
  const getFocusStyle = (): ViewStyle => {
    if (!isWeb || !isFocused || isDisabled) return {};
    
    return {
      shadowColor: variantStyles.bg,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    };
  };
  
  const buttonStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: variantStyles.bg,
    borderRadius: layout.borderRadius(),
    ...getSizePadding(),
    ...(variantStyles.border && { borderWidth: 1, borderColor: variantStyles.border }),
    ...(fullWidth && { width: '100%' }),
    ...(isDisabled && { opacity: 0.5 }),
    ...getHoverStyle(),
    ...getFocusStyle(),
  };
  
  const textStyleFinal: TextStyle = {
    color: variantStyles.text,
    fontSize,
    fontWeight: '600',
    textAlign: 'center',
  };
  
  const handleMouseEnter = () => {
    if (isWeb && !isDisabled) setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    if (isWeb) setIsHovered(false);
  };
  
  const handleFocus = () => {
    if (isWeb && !isDisabled) setIsFocused(true);
  };
  
  const handleBlur = () => {
    if (isWeb) setIsFocused(false);
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[buttonStyle, style]}
      activeOpacity={0.8}
      // @ts-ignore - Web-specific props
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={{ marginRight: layout.spacing.xs }}>{icon}</View>
          )}
          <Text style={[textStyleFinal, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <View style={{ marginLeft: layout.spacing.xs }}>{icon}</View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default WebOptimizedButton;
