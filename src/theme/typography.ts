/**
 * Typography System for LinkApp
 * Defines consistent text styles and typography hierarchy
 */

import { Platform, TextStyle } from 'react-native';

// Type definitions
interface FontFamily {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

interface FontFamilies {
  primary: FontFamily;
  secondary: FontFamily;
  mono: string;
}

type FontWeightValue = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';

interface FontWeights {
  thin: FontWeightValue;
  light: FontWeightValue;
  regular: FontWeightValue;
  medium: FontWeightValue;
  semibold: FontWeightValue;
  bold: FontWeightValue;
  extrabold: FontWeightValue;
  black: FontWeightValue;
}

interface FontSizes {
  // Base sizes
  xs: number;
  sm: number;
  base: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '5xl': number;
  '6xl': number;
  '7xl': number;
  // Semantic sizes
  caption: number;
  body2: number;
  body1: number;
  subtitle2: number;
  subtitle1: number;
  h6: number;
  h5: number;
  h4: number;
  h3: number;
  h2: number;
  h1: number;
}

interface LineHeights {
  none: number;
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
}

interface LetterSpacings {
  tighter: number;
  tight: number;
  normal: number;
  wide: number;
  wider: number;
  widest: number;
}

export type TextStyleVariant = 
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'subtitle1' | 'subtitle2'
  | 'body1' | 'body2'
  | 'button' | 'buttonSmall'
  | 'caption' | 'overline'
  | 'link' | 'code';

export type FontWeight = keyof FontWeights;
export type FontSize = keyof FontSizes;
export type LineHeight = keyof LineHeights;
export type LetterSpacing = keyof LetterSpacings;

// Font families
const fontFamilies: FontFamilies = {
  // Primary font family
  primary: Platform.select({
    ios: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    android: {
      regular: 'Roboto',
      medium: 'Roboto-Medium',
      semibold: 'Roboto-Medium',
      bold: 'Roboto-Bold',
    },
  }) as FontFamily,
  
  // Secondary/accent font family (if needed)
  secondary: Platform.select({
    ios: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    android: {
      regular: 'Roboto',
      medium: 'Roboto-Medium',
      semibold: 'Roboto-Medium',
      bold: 'Roboto-Bold',
    },
  }) as FontFamily,
  
  // Monospace font for code/numbers
  mono: Platform.select({
    ios: 'Courier New',
    android: 'monospace',
  }) as string,
};

// Font weights mapping
const fontWeights: FontWeights = Platform.select({
  ios: {
    thin: '100',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  android: {
    thin: '100',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
}) as FontWeights;

// Font sizes scale
const fontSizes: FontSizes = {
  // Base sizes
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  
  // Semantic sizes
  caption: 10,
  body2: 12,
  body1: 14,
  subtitle2: 14,
  subtitle1: 16,
  h6: 18,
  h5: 20,
  h4: 24,
  h3: 30,
  h2: 36,
  h1: 48,
};

// Line heights
const lineHeights: LineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// Letter spacing
const letterSpacings: LetterSpacings = {
  tighter: -0.05,
  tight: -0.025,
  normal: 0,
  wide: 0.025,
  wider: 0.05,
  widest: 0.1,
};

// Pre-defined text styles
const textStyles: Record<TextStyleVariant, TextStyle> = {
  // Headings
  h1: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.h1,
    lineHeight: fontSizes.h1 * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.h2,
    lineHeight: fontSizes.h2 * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontFamily: fontFamilies.primary.semibold,
    fontSize: fontSizes.h3,
    lineHeight: fontSizes.h3 * lineHeights.tight,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.semibold,
  },
  h4: {
    fontFamily: fontFamilies.primary.semibold,
    fontSize: fontSizes.h4,
    lineHeight: fontSizes.h4 * lineHeights.tight,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.semibold,
  },
  h5: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.h5,
    lineHeight: fontSizes.h5 * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.medium,
  },
  h6: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.h6,
    lineHeight: fontSizes.h6 * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
    fontWeight: fontWeights.medium,
  },
  
  // Subtitles
  subtitle1: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.subtitle1,
    lineHeight: fontSizes.subtitle1 * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.medium,
  },
  subtitle2: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.subtitle2,
    lineHeight: fontSizes.subtitle2 * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
    fontWeight: fontWeights.medium,
  },
  
  // Body text
  body1: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.body1,
    lineHeight: fontSizes.body1 * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.regular,
  },
  body2: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.body2,
    lineHeight: fontSizes.body2 * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.regular,
  },
  
  // Special text styles
  button: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacings.wider,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
  },
  buttonSmall: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.wider,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.caption,
    lineHeight: fontSizes.caption * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
    fontWeight: fontWeights.regular,
  },
  overline: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.loose,
    letterSpacing: letterSpacings.widest,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
  },
  
  // Link styles
  link: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.body1,
    lineHeight: fontSizes.body1 * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.regular,
    textDecorationLine: 'underline',
  },
  
  // Code/mono styles
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    fontWeight: fontWeights.regular,
  },
};

// Helper function to create responsive text styles
interface CreateTextStyleOptions {
  size?: TextStyleVariant | FontSize;
  weight?: FontWeight;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  transform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  decoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
}

export const createTextStyle = ({
  size = 'body1',
  weight = 'regular',
  color,
  align,
  lineHeight,
  letterSpacing,
  transform,
  decoration,
}: CreateTextStyleOptions): TextStyle => {
  // Check if size is a variant or a font size key
  const baseStyle = textStyles[size as TextStyleVariant] || {
    fontSize: fontSizes[size as FontSize] || fontSizes.body1,
  };
  
  return {
    ...baseStyle,
    ...(weight && { 
      fontWeight: fontWeights[weight],
      fontFamily: fontFamilies.primary[weight] || fontFamilies.primary.regular,
    }),
    ...(color && { color }),
    ...(align && { textAlign: align }),
    ...(lineHeight && { lineHeight: (baseStyle.fontSize || fontSizes.body1) * lineHeights[lineHeight] }),
    ...(letterSpacing && { letterSpacing: letterSpacings[letterSpacing] }),
    ...(transform && { textTransform: transform }),
    ...(decoration && { textDecorationLine: decoration }),
  };
};

// Responsive font sizes based on screen density
export const getResponsiveFontSize = (size: number): number => {
  // You can implement scaling based on device dimensions
  // For now, returning the base size
  return size;
};

// Export typography system
export const typography = {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  textStyles,
} as const;

export default typography;
