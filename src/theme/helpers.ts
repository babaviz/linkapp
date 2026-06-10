/**
 * Theme Helpers for LinkApp
 * Utility functions for theme manipulation and responsive design
 */

import { PixelRatio, Platform, useWindowDimensions } from 'react-native';
import { colors, withOpacity, ModuleName } from './colors';
import { spacing } from './spacing';
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { BREAKPOINTS, getDeviceType, DeviceType } from '../../utils/responsive';
export { getDeviceType } from '../../utils/responsive';

const pixelRatio = PixelRatio.get();

// Device size breakpoints (aligned with responsive utils)
export const breakpoints = BREAKPOINTS;

// Legacy device size helper (use getDeviceType from responsive.ts instead)
export const getDeviceSize = (width: number) => {
  if (width < 375) return 'small';
  if (width < 414) return 'medium';
  if (width >= 768) return 'large';
  return 'medium';
};

// Platform-specific helpers
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Responsive scaling with width parameter
export const scale = (size: number, width: number): number => {
  const baseWidth = 375; // iPhone 11 Pro width
  const scaleFactor = width / baseWidth;
  const newSize = size * scaleFactor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const verticalScale = (size: number, height: number): number => {
  const baseHeight = 812; // iPhone 11 Pro height
  const scaleFactor = height / baseHeight;
  const newSize = size * scaleFactor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const moderateScale = (size: number, width: number, factor = 0.5): number => {
  return size + (scale(size, width) - size) * factor;
};

// Responsive value helper
type ResponsiveBreakpoint = 'phone' | 'tablet' | 'desktop' | 'largeDesktop';
type ResponsiveValue<T> = T | Partial<Record<ResponsiveBreakpoint, T>>;

export const getResponsiveValue = <T>(value: ResponsiveValue<T>, width: number): T => {
  if (typeof value !== 'object' || value === null || !('phone' in value || 'tablet' in value || 'desktop' in value)) {
    return value as T;
  }
  
  const deviceType = getDeviceType(width);
  const responsiveObj = value as Partial<Record<ResponsiveBreakpoint, T>>;
  
  // Return value for current device type, or fallback
  if (responsiveObj[deviceType]) return responsiveObj[deviceType]!;
  
  // Fallback chain
  if (deviceType === 'largeDesktop' && responsiveObj.desktop) return responsiveObj.desktop;
  if ((deviceType === 'desktop' || deviceType === 'largeDesktop') && responsiveObj.tablet) return responsiveObj.tablet;
  if (responsiveObj.phone) return responsiveObj.phone;
  
  return Object.values(responsiveObj)[0] as T;
};

// Hook for responsive values
export const useResponsiveValue = <T>(value: ResponsiveValue<T>): T => {
  const { width } = useWindowDimensions();
  return getResponsiveValue(value, width);
};

// Style combination helper
type Style = ViewStyle | TextStyle | ImageStyle;

export const combineStyles = <T extends Style>(
  ...styles: Array<T | undefined | false | null>
): T => {
  return Object.assign({}, ...styles.filter(Boolean)) as T;
};

// Dark mode helpers
export const isDarkMode = false; // This should be connected to your app's theme context

export const getThemedColor = (lightColor: string, darkColor?: string): string => {
  return isDarkMode && darkColor ? darkColor : lightColor;
};

// Module theme helpers
export const createModuleTheme = (moduleName: ModuleName) => {
  const moduleColors = colors.modules[moduleName];
  
  return {
    colors: moduleColors,
    // Add module-specific overrides here
    getColor: (colorKey: keyof typeof moduleColors) => moduleColors[colorKey],
    getPrimaryColor: (shade: 'light' | 'main' | 'dark' = 'main') => 
      moduleColors.primary[shade],
    getSecondaryColor: (shade: 'light' | 'main' | 'dark' = 'main') => 
      moduleColors.secondary[shade],
  };
};

// Accessibility helpers
export const a11y = {
  // Minimum touch target size
  minTouchSize: 44,
  
  // Helper to ensure minimum touch target
  touchTarget: (size = 44): ViewStyle => ({
    minWidth: size,
    minHeight: size,
  }),
  
  // Focus styles
  focusStyle: (color = colors.modules.property.primary.main): ViewStyle => ({
    borderWidth: 2,
    borderColor: color,
  }),
  
  // Screen reader label helper
  label: (label: string) => ({
    accessible: true,
    accessibilityLabel: label,
  }),
  
  // Button accessibility
  button: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button' as const,
  }),
};

// Animation helpers
export const transitions = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

export const animations = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  slideInUp: {
    from: { 
      opacity: 0,
      transform: [{ translateY: 20 }],
    },
    to: { 
      opacity: 1,
      transform: [{ translateY: 0 }],
    },
  },
  slideInRight: {
    from: { 
      opacity: 0,
      transform: [{ translateX: 20 }],
    },
    to: { 
      opacity: 1,
      transform: [{ translateX: 0 }],
    },
  },
  scaleIn: {
    from: { 
      opacity: 0,
      transform: [{ scale: 0.9 }],
    },
    to: { 
      opacity: 1,
      transform: [{ scale: 1 }],
    },
  },
} as const;

// Safe area helpers
export const getSafeAreaPadding = (insets: { top: number; bottom: number; left: number; right: number }) => ({
  paddingTop: Math.max(insets.top, spacing.xl),
  paddingBottom: Math.max(insets.bottom, spacing.lg),
  paddingLeft: Math.max(insets.left, spacing.lg),
  paddingRight: Math.max(insets.right, spacing.lg),
});

// Conditional style helper
export const conditionalStyle = <T extends Style>(
  condition: boolean,
  styleIfTrue: T,
  styleIfFalse?: T
): T | {} => {
  if (condition) return styleIfTrue;
  return styleIfFalse || {};
};

// Style sheet helpers
export const createStyleSheet = <T extends Record<string, Style>>(
  styles: T | ((theme: typeof colors) => T)
): T => {
  if (typeof styles === 'function') {
    return styles(colors);
  }
  return styles;
};

// Elevation helper with box shadow for web
export const elevation = (level: number): ViewStyle => {
  const shadow: ViewStyle = {
    elevation: level,
    shadowColor: colors.common.shadow.lg,
    shadowOffset: { width: 0, height: level / 2 },
    shadowOpacity: 0.2,
    shadowRadius: level,
  };
  
  if (isWeb) {
    return {
      ...shadow,
      // @ts-ignore - Web-specific property
      boxShadow: `0 ${level / 2}px ${level}px rgba(0, 0, 0, 0.2)`,
    };
  }
  
  return shadow;
};

// Layout helpers
export const center: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
};

export const row: ViewStyle = {
  flexDirection: 'row',
};

export const absoluteFill: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// Web-specific style helpers
export const webHoverStyle = (hoverStyle: ViewStyle | TextStyle): ViewStyle | TextStyle => {
  if (!isWeb) return {};
  return {
    // @ts-ignore - Web-specific pseudo-class
    ':hover': hoverStyle,
  };
};

export const webFocusStyle = (focusStyle: ViewStyle | TextStyle): ViewStyle | TextStyle => {
  if (!isWeb) return {};
  return {
    // @ts-ignore - Web-specific pseudo-class
    ':focus': focusStyle,
  };
};

// Export all helpers
export default {
  breakpoints,
  getDeviceType,
  getDeviceSize,
  isIOS,
  isAndroid,
  isWeb,
  scale,
  verticalScale,
  moderateScale,
  getResponsiveValue,
  useResponsiveValue,
  combineStyles,
  getThemedColor,
  createModuleTheme,
  a11y,
  transitions,
  animations,
  getSafeAreaPadding,
  conditionalStyle,
  createStyleSheet,
  elevation,
  webHoverStyle,
  webFocusStyle,
  center,
  row,
  absoluteFill,
};
