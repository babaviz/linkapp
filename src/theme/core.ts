/**
 * Core theme definitions without circular dependencies
 */

import * as colorsModule from './colors';
import * as typographyModule from './typography';
import * as spacingModule from './spacing';
import * as componentsModule from './components';
import * as helpersModule from './helpers';

// Create the main theme object
export const theme = {
  // Colors
  colors: colorsModule.colors,
  getModuleColors: colorsModule.getModuleColors,
  withOpacity: colorsModule.withOpacity,
  darkColors: colorsModule.darkColors,
  
  // Typography
  typography: typographyModule.typography,
  createTextStyle: typographyModule.createTextStyle,
  getResponsiveFontSize: typographyModule.getResponsiveFontSize,
  
  // Spacing
  spacing: spacingModule.spacing,
  layout: spacingModule.layout,
  getSpacing: spacingModule.getSpacing,
  createSpacing: spacingModule.createSpacing,
  gap: spacingModule.gap,
  getScreenPadding: spacingModule.getScreenPadding,
  getResponsiveSpacing: spacingModule.getResponsiveSpacing,
  
  // Components
  components: componentsModule.componentStyles,
  shadows: componentsModule.shadows,
  borderRadius: componentsModule.borderRadius,
  listItemStyles: componentsModule.listItemStyles,
  sectionStyles: componentsModule.sectionStyles,
  modalStyles: componentsModule.modalStyles,
  tabStyles: componentsModule.tabStyles,
  chipStyles: componentsModule.chipStyles,
  getModuleComponentStyles: componentsModule.getModuleComponentStyles,
  
  // Helpers
  helpers: helpersModule.default,
  breakpoints: helpersModule.breakpoints,
  getDeviceType: helpersModule.getDeviceType,
  scale: helpersModule.scale,
  verticalScale: helpersModule.verticalScale,
  moderateScale: helpersModule.moderateScale,
  getResponsiveValue: helpersModule.getResponsiveValue,
  combineStyles: helpersModule.combineStyles,
  getThemedColor: helpersModule.getThemedColor,
  createModuleTheme: helpersModule.createModuleTheme,
  a11y: helpersModule.a11y,
  transitions: helpersModule.transitions,
  animations: helpersModule.animations,
  conditionalStyle: helpersModule.conditionalStyle,
  elevation: helpersModule.elevation,
  center: helpersModule.center,
  row: helpersModule.row,
  absoluteFill: helpersModule.absoluteFill,
} as const;

// Type for the complete theme
export type Theme = typeof theme;
