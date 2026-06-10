/**
 * Accessibility Components and Utilities
 * Enhanced accessibility features following mobile accessibility guidelines
 */

import React from 'react';
import { Text, View, TouchableOpacity, ViewStyle, TextStyle, AccessibilityInfo } from 'react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import InteractiveComponent from './InteractiveComponent';

interface AccessibleTextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption';
  color?: string;
  style?: TextStyle;
  accessibilityLevel?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

interface AccessibleButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab';
  testID?: string;
  minTouchTarget?: boolean;
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

// Enhanced Text Component with Accessibility
export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  variant = 'body1',
  color,
  style,
  accessibilityLevel,
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...props
}) => {
  // Get base text style from typography system
  const baseStyle = typography.textStyles[variant] || typography.textStyles.body1;
  
  // Enhanced font sizes for better readability (following AA guidelines)
  const getEnhancedFontSize = (baseSize: number) => {
    // Increase font size by 20% for better readability
    return Math.max(baseSize * 1.2, 16); // Minimum 16px for body text
  };

  // Screen title styles should be larger and bolder
  const isScreenTitle = variant === 'h1' || variant === 'h2';
  const enhancedStyle: TextStyle = {
    ...baseStyle,
    fontSize: isScreenTitle ? getEnhancedFontSize(baseStyle.fontSize || 24) + 4 : getEnhancedFontSize(baseStyle.fontSize || 16),
    fontWeight: isScreenTitle ? '700' : baseStyle.fontWeight,
    lineHeight: (baseStyle.fontSize || 16) * 1.4, // Improved line height for readability
    color: color || getAccessibleTextColor(variant),
    ...style,
  };

  const accessibilityProps = {
    accessibilityRole: 'text' as const,
    ...(accessibilityLabel && { accessibilityLabel }),
    ...(accessibilityHint && { accessibilityHint }),
    ...(accessibilityLevel && { accessibilityLevel }),
    ...(testID && { testID }),
  };

  return (
    <Text
      style={enhancedStyle}
      allowFontScaling={true}
      maxFontSizeMultiplier={1.5}
      {...accessibilityProps}
      {...props}
    >
      {children}
    </Text>
  );
};

// Enhanced Button Component with Accessibility
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
  minTouchTarget = true,
  ...props
}) => {
  // Minimum touch target size (44x44 points as per Apple/Google guidelines)
  const minTouchSize = 44;
  
  const buttonStyles = getButtonStyles(variant, size);
  const finalStyle: ViewStyle = {
    ...buttonStyles.container,
    ...(minTouchTarget && {
      minHeight: minTouchSize,
      minWidth: minTouchSize,
    }),
    ...style,
  };

  const finalTextStyle: TextStyle = {
    ...buttonStyles.text,
    ...textStyle,
  };

  const accessibilityProps = {
    accessibilityRole,
    accessible: true,
    accessibilityLabel: accessibilityLabel || (typeof children === 'string' ? children : 'Button'),
    ...(accessibilityHint && { accessibilityHint }),
    ...(disabled && { 
      accessibilityState: { disabled: true },
      accessibilityHint: 'This button is disabled'
    }),
    ...(testID && { testID }),
  };

  return (
    <InteractiveComponent
      onPress={onPress}
      disabled={disabled}
      style={finalStyle}
      animationType="scale-opacity"
      {...accessibilityProps}
      {...props}
    >
      <AccessibleText variant="body1" style={[finalTextStyle, { fontWeight: '600' }] as any}>
        {children}
      </AccessibleText>
    </InteractiveComponent>
  );
};

// Screen Header Component with Accessibility
export const AccessibleScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightAction,
  style,
  testID,
}) => {
  return (
    <View
      style={[headerStyles.container, style]}
      accessibilityRole="header"
      testID={testID}
    >
      <View style={headerStyles.leftSection}>
        {showBackButton && (
          <AccessibleButton
            onPress={onBackPress || (() => {})}
            variant="text"
            size="large"
            style={headerStyles.backButton}
            accessibilityLabel="Go back"
            accessibilityHint="Navigate to previous screen"
            accessibilityRole="button"
            testID={`${testID}-back-button`}
          >
            ←
          </AccessibleButton>
        )}
      </View>

      <View style={headerStyles.centerSection}>
        <AccessibleText
          variant="h4"
          style={headerStyles.title}
          accessibilityLevel={1}
          testID={`${testID}-title`}
        >
          {title}
        </AccessibleText>
        {subtitle && (
          <AccessibleText
            variant="subtitle2"
            style={headerStyles.subtitle}
            accessibilityLevel={2}
            testID={`${testID}-subtitle`}
          >
            {subtitle}
          </AccessibleText>
        )}
      </View>

      <View style={headerStyles.rightSection}>
        {rightAction}
      </View>
    </View>
  );
};

// Utility Functions
const getAccessibleTextColor = (variant: string): string => {
  // Ensure high contrast ratios (AA compliance)
  const isDark = false; // This could be dynamic based on theme
  
  if (isDark) {
    return colors.common.text.inverse;
  }

  switch (variant) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      return colors.common.text.primary; // Highest contrast for headings
    case 'subtitle1':
    case 'subtitle2':
      return colors.common.text.primary;
    case 'body1':
    case 'body2':
      return colors.common.text.primary;
    case 'caption':
      return colors.common.text.secondary; // Still needs to meet AA contrast
    default:
      return colors.common.text.primary;
  }
};

const getButtonStyles = (variant: string, size: string) => {
  const sizeConfig = {
    small: { padding: 12, fontSize: 14, height: 36 },
    medium: { padding: 16, fontSize: 16, height: 44 },
    large: { padding: 20, fontSize: 18, height: 52 },
  };

  const config = sizeConfig[size as keyof typeof sizeConfig] || sizeConfig.medium;

  const variants = {
    primary: {
      container: {
        backgroundColor: colors.modules.property.primary.main,
        borderRadius: 8,
        paddingHorizontal: config.padding,
        paddingVertical: config.padding * 0.75,
        minHeight: config.height,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.common.shadow.md,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
      } as ViewStyle,
      text: {
        color: colors.modules.property.primary.contrast,
        fontSize: config.fontSize,
        fontWeight: '600',
        textAlign: 'center',
      } as TextStyle,
    },
    secondary: {
      container: {
        backgroundColor: colors.modules.property.secondary.light,
        borderRadius: 8,
        paddingHorizontal: config.padding,
        paddingVertical: config.padding * 0.75,
        minHeight: config.height,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      text: {
        color: colors.modules.property.secondary.main,
        fontSize: config.fontSize,
        fontWeight: '600',
        textAlign: 'center',
      } as TextStyle,
    },
    outlined: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.modules.property.primary.main,
        borderRadius: 8,
        paddingHorizontal: config.padding,
        paddingVertical: config.padding * 0.75,
        minHeight: config.height,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      text: {
        color: colors.modules.property.primary.main,
        fontSize: config.fontSize,
        fontWeight: '600',
        textAlign: 'center',
      } as TextStyle,
    },
    text: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 8,
        paddingHorizontal: config.padding * 0.5,
        paddingVertical: config.padding * 0.5,
        minHeight: config.height,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      text: {
        color: colors.modules.property.primary.main,
        fontSize: config.fontSize,
        fontWeight: '500',
        textAlign: 'center',
      } as TextStyle,
    },
  };

  return variants[variant as keyof typeof variants] || variants.primary;
};

// Header Styles
const headerStyles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.base.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border.light,
    minHeight: 64, // Ensure minimum touch target for header elements
  } as ViewStyle,
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  } as ViewStyle,
  centerSection: {
    flex: 3,
    alignItems: 'center',
  } as ViewStyle,
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  } as ViewStyle,
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  title: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 22, // Larger title for better readability
    color: colors.common.text.primary,
  } as TextStyle,
  subtitle: {
    textAlign: 'center',
    marginTop: 2,
    color: colors.common.text.secondary,
  } as TextStyle,
};

// Accessibility Helper Functions
export const announceScreenChange = (screenName: string) => {
  AccessibilityInfo.announceForAccessibility(`Navigated to ${screenName} screen`);
};

export const announceAction = (action: string) => {
  AccessibilityInfo.announceForAccessibility(action);
};

// Export all components
export default {
  AccessibleText,
  AccessibleButton,
  AccessibleScreenHeader,
  announceScreenChange,
  announceAction,
};
