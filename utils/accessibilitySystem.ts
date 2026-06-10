/**
 * Enhanced Accessibility System
 * Comprehensive accessibility support with WCAG 2.1 AA compliance
 */

import React from 'react';
import { AccessibilityInfo, Appearance, Platform } from 'react-native';
import { UIPolishSystem } from './uiPolishSystem';

export interface AccessibilityConfig {
  fontSize: number;
  fontScale: number;
  reduceMotion: boolean;
  highContrast: boolean;
  darkMode: boolean;
  screenReaderEnabled: boolean;
  largeTextEnabled: boolean;
}

export class AccessibilitySystem {
  private static config: AccessibilityConfig = {
    fontSize: 16,
    fontScale: 1,
    reduceMotion: false,
    highContrast: false,
    darkMode: false,
    screenReaderEnabled: false,
    largeTextEnabled: false,
  };

  private static listeners: (() => void)[] = [];

  // Initialize accessibility system
  static async initialize() {
    try {
      // Check screen reader status
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      // Check reduce motion status (iOS specific)
      let reduceMotion = false;
      if (Platform.OS === 'ios') {
        try {
          reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        } catch (error) {
        }
      }

      // Get color scheme
      const colorScheme = Appearance.getColorScheme();

      this.config = {
        ...this.config,
        screenReaderEnabled,
        reduceMotion,
        darkMode: colorScheme === 'dark',
      };

      // Set up UI polish system based on accessibility preferences
      this.configureUIPolish();

      // Set up listeners
      this.setupListeners();
    } catch (error) {
    }
  }

  // Configure UI Polish System based on accessibility settings
  private static configureUIPolish() {
    if (this.config.reduceMotion) {
      UIPolishSystem.enableReducedMotion();
    } else {
      UIPolishSystem.enableFullMotion();
    }

    UIPolishSystem.applyThemeAdjustments(this.config.darkMode);
  }

  // Set up accessibility event listeners
  private static setupListeners() {
    // Screen reader change listener
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        this.config.screenReaderEnabled = enabled;
        this.notifyListeners();
        this.announceScreenReaderStatus(enabled);
      }
    );

    // Reduce motion change listener (iOS only)
    if (Platform.OS === 'ios') {
      try {
        AccessibilityInfo.addEventListener(
          'reduceMotionChanged',
          (enabled) => {
            this.config.reduceMotion = enabled;
            this.configureUIPolish();
            this.notifyListeners();
          }
        );
      } catch (error) {
      }
    }

    // Color scheme change listener
    const colorSchemeSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      this.config.darkMode = colorScheme === 'dark';
      UIPolishSystem.applyThemeAdjustments(this.config.darkMode);
      this.notifyListeners();
    });

    return () => {
      screenReaderSubscription?.remove();
      colorSchemeSubscription?.remove();
    };
  }

  // Get current accessibility configuration
  static getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  // Update font scale
  static setFontScale(scale: number) {
    this.config.fontScale = Math.max(0.8, Math.min(2.0, scale)); // Clamp between 0.8 and 2.0
    this.config.fontSize = 16 * this.config.fontScale;
    this.config.largeTextEnabled = this.config.fontScale > 1.2;
    this.notifyListeners();
  }

  // Toggle high contrast mode
  static setHighContrast(enabled: boolean) {
    this.config.highContrast = enabled;
    this.notifyListeners();
  }

  // Get accessible font size
  static getFontSize(baseSize: number): number {
    return Math.max(baseSize * this.config.fontScale, 14); // Minimum 14px
  }

  // Get minimum tap target size (44x44 points per Apple/Google guidelines)
  static getMinTouchTarget(): number {
    return Math.max(44, 44 * this.config.fontScale);
  }

  // Get accessible colors with proper contrast ratios
  static getAccessibleColors() {
    const colors = {
      // Text colors (WCAG AA compliant - 4.5:1 contrast ratio)
      text: {
        primary: this.config.highContrast 
          ? (this.config.darkMode ? '#FFFFFF' : '#000000')
          : (this.config.darkMode ? '#F9FAFB' : '#111827'),
        secondary: this.config.highContrast
          ? (this.config.darkMode ? '#E5E7EB' : '#374151')
          : (this.config.darkMode ? '#D1D5DB' : '#6B7280'),
        disabled: this.config.highContrast
          ? (this.config.darkMode ? '#9CA3AF' : '#6B7280')
          : (this.config.darkMode ? '#9CA3AF' : '#9CA3AF'),
      },
      
      // Background colors
      background: {
        primary: this.config.darkMode ? '#111827' : '#FFFFFF',
        secondary: this.config.darkMode ? '#1F2937' : '#F9FAFB',
        tertiary: this.config.darkMode ? '#374151' : '#F3F4F6',
      },
      
      // Interactive colors (enhanced for visibility)
      interactive: {
        primary: this.config.highContrast 
          ? (this.config.darkMode ? '#60A5FA' : '#1E40AF')
          : (this.config.darkMode ? '#3B82F6' : '#2563EB'),
        secondary: this.config.highContrast
          ? (this.config.darkMode ? '#34D399' : '#059669')
          : (this.config.darkMode ? '#10B981' : '#10B981'),
        danger: this.config.highContrast
          ? (this.config.darkMode ? '#F87171' : '#DC2626')
          : (this.config.darkMode ? '#EF4444' : '#EF4444'),
      },
      
      // Border colors
      border: {
        light: this.config.darkMode ? '#374151' : '#E5E7EB',
        medium: this.config.darkMode ? '#4B5563' : '#D1D5DB',
        strong: this.config.darkMode ? '#6B7280' : '#9CA3AF',
      },
    };

    return colors;
  }

  // Accessibility announcements
  static announceScreenChange(screenName: string) {
    if (this.config.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(`Navigated to ${screenName} screen`);
    }
  }

  static announceAction(action: string, result?: string) {
    if (this.config.screenReaderEnabled) {
      const message = result ? `${action}. ${result}` : action;
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  static announceLoading(isLoading: boolean, content?: string) {
    if (this.config.screenReaderEnabled) {
      const message = isLoading 
        ? `Loading ${content || 'content'}...`
        : `${content || 'Content'} loaded`;
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  static announceError(error: string) {
    if (this.config.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(`Error: ${error}`);
    }
  }

  static announceSuccess(message: string) {
    if (this.config.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(`Success: ${message}`);
    }
  }

  private static announceScreenReaderStatus(enabled: boolean) {
    const message = enabled 
      ? 'Screen reader enabled. Enhanced accessibility features are now active.'
      : 'Screen reader disabled.';
    AccessibilityInfo.announceForAccessibility(message);
  }

  // Enhanced accessibility props for components
  static getButtonProps(label: string, hint?: string, role?: string) {
    return {
      accessible: true,
      accessibilityRole: (role || 'button') as any,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityState: {},
      // Ensure minimum touch target
      style: {
        minWidth: this.getMinTouchTarget(),
        minHeight: this.getMinTouchTarget(),
      },
    };
  }

  static getTextProps(level?: number, label?: string) {
    return {
      accessible: true,
      accessibilityRole: 'text',
      ...(level && { accessibilityLevel: level }),
      ...(label && { accessibilityLabel: label }),
      allowFontScaling: true,
      maxFontSizeMultiplier: 2.0, // Allow up to 2x scaling
    };
  }

  static getImageProps(alt: string, decorative = false) {
    if (decorative) {
      return {
        accessible: false,
        accessibilityElementsHidden: true,
      };
    }

    return {
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: alt,
    };
  }

  static getListProps(itemCount: number, title?: string) {
    return {
      accessible: true,
      accessibilityRole: 'list',
      ...(title && { accessibilityLabel: `${title}, ${itemCount} items` }),
    };
  }

  static getFormFieldProps(label: string, required = false, error?: string) {
    return {
      accessible: true,
      accessibilityLabel: `${label}${required ? ', required' : ''}`,
      ...(error && { 
        accessibilityHint: `Error: ${error}`,
        accessibilityInvalid: true 
      }),
    };
  }

  // Color contrast utilities
  static checkContrast(foreground: string, background: string): number {
    // Simple contrast ratio calculation (for full implementation, use a proper library)
    // This is a basic version for demonstration
    const getLuminance = (color: string) => {
      // Convert hex to RGB and calculate relative luminance
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  static meetsWCAG(foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean {
    const contrast = this.checkContrast(foreground, background);
    return level === 'AA' ? contrast >= 4.5 : contrast >= 7;
  }

  // Register configuration change listener
  static addConfigListener(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private static notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  // Performance optimization for accessibility
  static shouldRenderAccessibilityElements(): boolean {
    // Only render complex accessibility elements if screen reader is enabled
    return this.config.screenReaderEnabled;
  }

  static getOptimalAnimationDuration(baseDuration: number): number {
    if (this.config.reduceMotion) {
      return baseDuration * 0.1; // Very fast animations
    }
    return baseDuration;
  }

  // Focus management
  static focusNext() {
    AccessibilityInfo.setAccessibilityFocus(null);
  }

  static setFocus(reactTag: number) {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
}

// React Hook for accessibility
export const useAccessibility = () => {
  const [config, setConfig] = React.useState(AccessibilitySystem.getConfig());

  React.useEffect(() => {
    const unsubscribe = AccessibilitySystem.addConfigListener(() => {
      setConfig(AccessibilitySystem.getConfig());
    });

    return unsubscribe;
  }, []);

  return {
    config,
    getFontSize: AccessibilitySystem.getFontSize,
    getMinTouchTarget: AccessibilitySystem.getMinTouchTarget,
    getAccessibleColors: AccessibilitySystem.getAccessibleColors,
    announceScreenChange: AccessibilitySystem.announceScreenChange,
    announceAction: AccessibilitySystem.announceAction,
    announceLoading: AccessibilitySystem.announceLoading,
    announceError: AccessibilitySystem.announceError,
    announceSuccess: AccessibilitySystem.announceSuccess,
    getButtonProps: AccessibilitySystem.getButtonProps,
    getTextProps: AccessibilitySystem.getTextProps,
    getImageProps: AccessibilitySystem.getImageProps,
    getListProps: AccessibilitySystem.getListProps,
    getFormFieldProps: AccessibilitySystem.getFormFieldProps,
    meetsWCAG: AccessibilitySystem.meetsWCAG,
    shouldRenderAccessibilityElements: AccessibilitySystem.shouldRenderAccessibilityElements,
  };
};

export default AccessibilitySystem;
