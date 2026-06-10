/**
 * Accessibility Helpers and Utilities
 * Comprehensive accessibility support functions
 */

import { Dimensions, PixelRatio, AccessibilityInfo } from 'react-native';
import { colors } from '../src/theme/colors';

interface AccessibilitySettings {
  fontSize: number;
  contrast: 'normal' | 'high';
  reduceMotion: boolean;
  screenReaderEnabled: boolean;
}

// Get current accessibility settings
export const getAccessibilitySettings = async (): Promise<AccessibilitySettings> => {
  try {
    const [
      screenReaderEnabled,
      reduceMotionEnabled,
      // You can add more accessibility checks here
    ] = await Promise.all([
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.isReduceMotionEnabled(),
    ]);

    // Get font scale from device settings
    const fontScale = PixelRatio.getFontScale();

    return {
      fontSize: fontScale,
      contrast: 'normal', // This would need platform-specific implementation
      reduceMotion: reduceMotionEnabled,
      screenReaderEnabled,
    };
  } catch (error) {
    
    return {
      fontSize: 1,
      contrast: 'normal',
      reduceMotion: false,
      screenReaderEnabled: false,
    };
  }
};

// Calculate accessible font sizes
export const getAccessibleFontSize = (baseSize: number, fontScale?: number): number => {
  const scale = fontScale || PixelRatio.getFontScale();
  const scaledSize = baseSize * scale;
  
  // Ensure minimum readable size
  const minSize = 12;
  // Cap maximum size for layout consistency
  const maxSize = baseSize * 2;
  
  return Math.max(minSize, Math.min(scaledSize, maxSize));
};

// Get contrast ratio between two colors
export const getContrastRatio = (color1: string, color2: string): number => {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd convert hex to RGB and calculate luminance
  
  const getLuminance = (color: string): number => {
    // Basic luminance calculation for hex colors
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Simplified relative luminance
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

// Check if color combination meets WCAG AA standards
export const meetsWCAGAA = (foreground: string, background: string): boolean => {
  const contrast = getContrastRatio(foreground, background);
  return contrast >= 4.5; // WCAG AA standard for normal text
};

// Check if color combination meets WCAG AAA standards
export const meetsWCAGAAA = (foreground: string, background: string): boolean => {
  const contrast = getContrastRatio(foreground, background);
  return contrast >= 7; // WCAG AAA standard for normal text
};

// Get accessible colors based on current theme
export const getAccessibleColors = (isDarkMode: boolean = false) => {
  const baseColors = colors.common;
  
  if (isDarkMode) {
    return {
      background: colors.base.gray[900],
      surface: colors.base.gray[800],
      primary: colors.modules.property.primary.light,
      text: {
        primary: colors.base.gray[50],
        secondary: colors.base.gray[300],
        tertiary: colors.base.gray[400],
        disabled: colors.base.gray[600],
      },
      border: {
        light: colors.base.gray[700],
        main: colors.base.gray[600],
        dark: colors.base.gray[500],
      },
    };
  }
  
  return {
    background: colors.base.white,
    surface: colors.base.gray[50],
    primary: colors.modules.property.primary.main,
    text: {
      primary: colors.base.gray[900],
      secondary: colors.base.gray[700],
      tertiary: colors.base.gray[500],
      disabled: colors.base.gray[400],
    },
    border: {
      light: colors.base.gray[200],
      main: colors.base.gray[300],
      dark: colors.base.gray[400],
    },
  };
};

// Calculate minimum touch target size
export const getMinimumTouchTarget = (): { width: number; height: number } => {
  // Platform-specific minimum touch targets
  // iOS: 44x44 points, Android: 48x48 dp
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  
  return {
    width: isTablet ? 48 : 44,
    height: isTablet ? 48 : 44,
  };
};

// Enhance touch target if needed
export const enhanceTouchTarget = (
  currentWidth: number,
  currentHeight: number
): { width: number; height: number; paddingHorizontal: number; paddingVertical: number } => {
  const minimum = getMinimumTouchTarget();
  
  const enhancedWidth = Math.max(currentWidth, minimum.width);
  const enhancedHeight = Math.max(currentHeight, minimum.height);
  
  return {
    width: enhancedWidth,
    height: enhancedHeight,
    paddingHorizontal: Math.max(0, (enhancedWidth - currentWidth) / 2),
    paddingVertical: Math.max(0, (enhancedHeight - currentHeight) / 2),
  };
};

// Animation settings based on accessibility preferences
export const getAccessibleAnimationSettings = (reduceMotion: boolean = false) => {
  if (reduceMotion) {
    return {
      duration: 0,
      useNativeDriver: false,
      animationsEnabled: false,
    };
  }
  
  return {
    duration: 300,
    useNativeDriver: true,
    animationsEnabled: true,
  };
};

// Screen reader announcements
export const announceToScreenReader = (message: string, delay: number = 100) => {
  setTimeout(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, delay);
};

// Focus management for screen readers
export const setAccessibilityFocus = (ref: any) => {
  if (ref?.current) {
    AccessibilityInfo.setAccessibilityFocus(ref.current);
  }
};

// Generate accessible labels
export const generateAccessibleLabel = (
  text: string,
  role: string,
  state?: { disabled?: boolean; selected?: boolean; expanded?: boolean }
): string => {
  let label = `${text}, ${role}`;
  
  if (state) {
    if (state.disabled) label += ', disabled';
    if (state.selected) label += ', selected';
    if (state.expanded !== undefined) {
      label += state.expanded ? ', expanded' : ', collapsed';
    }
  }
  
  return label;
};

// Semantic colors for different states
export const getSemanticColors = (isDarkMode: boolean = false) => {
  return {
    success: isDarkMode ? colors.base.success.light : colors.base.success.main,
    warning: isDarkMode ? colors.base.warning.light : colors.base.warning.main,
    error: isDarkMode ? colors.base.error.light : colors.base.error.main,
    info: isDarkMode ? colors.base.info.light : colors.base.info.main,
  };
};

// Responsive spacing based on screen size
export const getResponsiveSpacing = () => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isSmallScreen = width < 360;
  
  if (isSmallScreen) {
    return {
      xs: 2,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      xxl: 20,
    };
  }
  
  if (isTablet) {
    return {
      xs: 6,
      sm: 12,
      md: 18,
      lg: 24,
      xl: 32,
      xxl: 40,
    };
  }
  
  return {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  };
};

export default {
  getAccessibilitySettings,
  getAccessibleFontSize,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getAccessibleColors,
  getMinimumTouchTarget,
  enhanceTouchTarget,
  getAccessibleAnimationSettings,
  announceToScreenReader,
  setAccessibilityFocus,
  generateAccessibleLabel,
  getSemanticColors,
  getResponsiveSpacing,
};
