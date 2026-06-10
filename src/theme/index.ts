/**
 * LinkApp Theme System
 * Main export file that combines all theme elements
 */

// Re-export individual modules for convenience
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './components';

// Re-export core theme
export * from './core';

// Export specific items from helpers to avoid conflicts
export {
  breakpoints,
  getDeviceType,
  isIOS,
  isAndroid,
  isWeb,
  scale,
  verticalScale,
  moderateScale,
  getResponsiveValue,
  combineStyles,
  isDarkMode,
  getThemedColor,
  a11y,
  transitions,
  animations,
  getSafeAreaPadding,
  conditionalStyle,
} from './helpers';

// Export types and utilities
import { createModuleTheme } from './types';
import type { ModuleTheme } from './types';
export type { ModuleTheme };
import type { ModuleName } from './colors';
export type { ModuleName } from './colors';

// Re-export Theme type if it exists in core
import { theme } from './core';
export type Theme = typeof theme;

export const moduleThemes = {
  property: createModuleTheme('property'),
  jobs: createModuleTheme('jobs'),
  services: createModuleTheme('services'),
  dating: createModuleTheme('dating'),
} as const;

// Hook for using theme in components (to be implemented with context)
export interface UseThemeResult {
  theme: Theme;
  moduleTheme: ModuleTheme;
  isDarkMode: boolean;
}

// Placeholder for theme hook (will be implemented with React Context)
export const useTheme = (moduleName: ModuleName): UseThemeResult => {
  return {
    theme,
    moduleTheme: moduleThemes[moduleName],
    isDarkMode: false, // Will be connected to actual dark mode state
  };
};

// Common style mixins (imported from core)
import { theme as coreTheme } from './core';
export const mixins = coreTheme.helpers;

// Theme Provider and hooks
export { 
  ThemeProvider,
  useThemeContext,
  useModuleTheme,
  useColors,
  useTypography,
  useSpacing,
  useComponentStyles,
} from './ThemeProvider';

// Default export
export default theme;
