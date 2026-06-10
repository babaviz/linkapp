/**
 * Spacing System for LinkApp
 * Defines consistent spacing scale for margins, padding, and layout
 */

import { useWindowDimensions } from 'react-native';
import { getDeviceType, DeviceType } from '../../utils/responsive';

// Base spacing unit (4px system)
const BASE_SPACING = 4;

// Type definitions
export type SpacingKey = 
  | 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl'
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 56 | 64 | 72 | 80 | 96;

// Spacing scale based on 4px system
export const spacing = {
  // Semantic sizes
  none: 0,
  xs: BASE_SPACING,              // 4px
  sm: BASE_SPACING * 2,          // 8px
  md: BASE_SPACING * 3,          // 12px
  lg: BASE_SPACING * 4,          // 16px
  xl: BASE_SPACING * 5,          // 20px
  '2xl': BASE_SPACING * 6,       // 24px
  '3xl': BASE_SPACING * 8,       // 32px
  '4xl': BASE_SPACING * 10,      // 40px
  '5xl': BASE_SPACING * 12,      // 48px
  '6xl': BASE_SPACING * 14,      // 56px
  '7xl': BASE_SPACING * 16,      // 64px
  '8xl': BASE_SPACING * 18,      // 72px
  
  // Numeric values
  0: 0,
  1: BASE_SPACING,               // 4px
  2: BASE_SPACING * 2,           // 8px
  3: BASE_SPACING * 3,           // 12px
  4: BASE_SPACING * 4,           // 16px
  5: BASE_SPACING * 5,           // 20px
  6: BASE_SPACING * 6,           // 24px
  8: BASE_SPACING * 8,           // 32px
  10: BASE_SPACING * 10,         // 40px
  12: BASE_SPACING * 12,         // 48px
  16: BASE_SPACING * 16,         // 64px
  20: BASE_SPACING * 20,         // 80px
  24: BASE_SPACING * 24,         // 96px
  32: BASE_SPACING * 32,         // 128px
  40: BASE_SPACING * 40,         // 160px
  48: BASE_SPACING * 48,         // 192px
  56: BASE_SPACING * 56,         // 224px
  64: BASE_SPACING * 64,         // 256px
  72: BASE_SPACING * 72,         // 288px
  80: BASE_SPACING * 80,         // 320px
  96: BASE_SPACING * 96,         // 384px
} as const;

// Layout spacing for common use cases
export const layout = {
  // Screen padding
  screenPadding: {
    horizontal: spacing.lg,
    vertical: spacing.lg,
    top: spacing.xl,
    bottom: spacing.xl,
  },
  
  // Section spacing
  sectionSpacing: {
    small: spacing.xl,
    medium: spacing['3xl'],
    large: spacing['5xl'],
  },
  
  // Card spacing
  cardPadding: {
    small: spacing.sm,
    medium: spacing.md,
    large: spacing.lg,
  },
  
  // List item spacing
  listItemSpacing: {
    compact: spacing.xs,
    default: spacing.sm,
    relaxed: spacing.md,
  },
  
  // Button padding
  buttonPadding: {
    small: {
      horizontal: spacing.sm,
      vertical: spacing.xs,
    },
    medium: {
      horizontal: spacing.md,
      vertical: spacing.sm,
    },
    large: {
      horizontal: spacing.lg,
      vertical: spacing.md,
    },
  },
  
  // Input padding
  inputPadding: {
    horizontal: spacing.md,
    vertical: spacing.md,
  },
  
  // Icon spacing
  iconSpacing: {
    small: spacing.xs,
    medium: spacing.sm,
    large: spacing.md,
  },
} as const;

// Responsive spacing helpers
interface ResponsiveSpacing {
  horizontal: number;
  vertical: number;
}

export const getResponsiveSpacing = (baseSpacing: number, scale = 1): number => {
  return Math.round(baseSpacing * scale);
};

export const getScreenPadding = (width: number, deviceType?: DeviceType): ResponsiveSpacing => {
  const type = deviceType || getDeviceType(width);
  
  switch (type) {
    case 'largeDesktop':
      return { horizontal: spacing['5xl'], vertical: spacing['4xl'] };
    case 'desktop':
      return { horizontal: spacing['4xl'], vertical: spacing['3xl'] };
    case 'tablet':
      return { horizontal: spacing['2xl'], vertical: spacing.xl };
    default:
      return { horizontal: spacing.lg, vertical: spacing.lg };
  }
};

// Hook for responsive spacing
export const useResponsiveSpacing = () => {
  const { width } = useWindowDimensions();
  const deviceType = getDeviceType(width);
  
  return {
    screenPadding: getScreenPadding(width, deviceType),
    deviceType,
    spacing,
    layout,
  };
};

// Helper to create consistent margin/padding objects
interface SpacingObject {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  horizontal?: number;
  vertical?: number;
}

export const createSpacing = (
  value: number | SpacingObject,
  direction?: 'margin' | 'padding'
): Record<string, number> => {
  const prefix = direction || 'padding';
  
  if (typeof value === 'number') {
    return {
      [`${prefix}Top`]: value,
      [`${prefix}Right`]: value,
      [`${prefix}Bottom`]: value,
      [`${prefix}Left`]: value,
    };
  }
  
  const result: Record<string, number> = {};
  
  if (value.horizontal !== undefined) {
    result[`${prefix}Horizontal`] = value.horizontal;
  }
  if (value.vertical !== undefined) {
    result[`${prefix}Vertical`] = value.vertical;
  }
  if (value.top !== undefined) {
    result[`${prefix}Top`] = value.top;
  }
  if (value.right !== undefined) {
    result[`${prefix}Right`] = value.right;
  }
  if (value.bottom !== undefined) {
    result[`${prefix}Bottom`] = value.bottom;
  }
  if (value.left !== undefined) {
    result[`${prefix}Left`] = value.left;
  }
  
  return result;
};

// Helper to get spacing value by key
export const getSpacing = (key: SpacingKey): number => {
  return spacing[key] || 0;
};

// Gap utilities for flexbox layouts
export const gap = {
  row: (size: SpacingKey) => ({
    flexDirection: 'row' as const,
    gap: getSpacing(size),
  }),
  column: (size: SpacingKey) => ({
    flexDirection: 'column' as const,
    gap: getSpacing(size),
  }),
} as const;

// Export spacing system
export default spacing;
