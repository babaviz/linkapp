/**
 * UI Polish System Integration
 * Central integration point for all UI polish systems
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilitySystem } from './accessibilitySystem';
import { PerformanceSystem } from './performanceSystem';
import { UIPolishSystem } from './uiPolishSystem';

export interface UIPolishIntegrationConfig {
  enableAnimations: boolean;
  enableHaptics: boolean;
  enableAccessibility: boolean;
  enablePerformanceMonitoring: boolean;
  persistSettings: boolean;
}

export class UIPolishIntegration {
  private static isInitialized = false;
  private static config: UIPolishIntegrationConfig = {
    enableAnimations: true,
    enableHaptics: true,
    enableAccessibility: true,
    enablePerformanceMonitoring: __DEV__,
    persistSettings: true,
  };

  // Initialize all UI polish systems
  static async initialize(customConfig?: Partial<UIPolishIntegrationConfig>) {
    if (this.isInitialized) {
      return;
    }

    // Merge custom config
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Load persisted settings
    if (this.config.persistSettings) {
      await this.loadPersistedSettings();
    }

    // Initialize systems in correct order
    if (this.config.enableAccessibility) {
      await AccessibilitySystem.initialize();
    }

    if (this.config.enablePerformanceMonitoring) {
      PerformanceSystem.initialize();
    }

    // Configure UI Polish based on accessibility settings
    const accessibilityConfig = AccessibilitySystem.getConfig();
    UIPolishSystem.configure({
      enableAnimations: this.config.enableAnimations && !accessibilityConfig.reduceMotion,
      enableHaptics: this.config.enableHaptics,
      animationScale: accessibilityConfig.fontScale || 1.0,
    });
    // Setup integration listeners
    this.setupIntegrationListeners();

    this.isInitialized = true;
  }

  // Load persisted user settings
  private static async loadPersistedSettings() {
    try {
      const settings = await AsyncStorage.getItem('@ui_polish_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        
        // Apply font scale if persisted
        if (parsedSettings.fontScale) {
          AccessibilitySystem.setFontScale(parsedSettings.fontScale);
        }

        // Apply high contrast if persisted
        if (parsedSettings.highContrast !== undefined) {
          AccessibilitySystem.setHighContrast(parsedSettings.highContrast);
        }
      }
    } catch {
      // Silently fail if settings can't be loaded
    }
  }

  // Save settings to storage
  static async saveSettings(settings: Record<string, unknown>) {
    if (!this.config.persistSettings) return;

    try {
      await AsyncStorage.setItem('@ui_polish_settings', JSON.stringify(settings));
    } catch {
      // Silently fail if settings can't be saved
    }
  }

  // Setup listeners to sync between systems
  private static setupIntegrationListeners() {
    // Listen for accessibility changes and update UI Polish
    AccessibilitySystem.addConfigListener(() => {
      const accessibilityConfig = AccessibilitySystem.getConfig();
      
      UIPolishSystem.configure({
        enableAnimations: this.config.enableAnimations && !accessibilityConfig.reduceMotion,
        animationScale: accessibilityConfig.fontScale,
      });

      // Save settings
      this.saveSettings({
        fontScale: accessibilityConfig.fontScale,
        highContrast: accessibilityConfig.highContrast,
        reduceMotion: accessibilityConfig.reduceMotion,
      });
    });

    // Listen for performance changes and adjust systems
    PerformanceSystem.addPerformanceListener((metrics) => {
      // Auto-adjust based on performance
      if (metrics.frameDrops > 10 || metrics.averageFrameTime > 20) {
        UIPolishSystem.configure({
          enableAnimations: false,
          animationScale: 0.5,
        });
      } else if (metrics.frameDrops < 2 && metrics.averageFrameTime < 16) {
        UIPolishSystem.configure({
          enableAnimations: this.config.enableAnimations,
          animationScale: 1.0,
        });
      }
    });
  }

  // Get current integration status
  static getStatus() {
    return {
      isInitialized: this.isInitialized,
      config: this.config,
      accessibilityConfig: AccessibilitySystem.getConfig(),
      performanceMetrics: PerformanceSystem.getMetrics(),
    };
  }

  // Toggle animation system
  static toggleAnimations(enabled: boolean) {
    this.config.enableAnimations = enabled;
    const accessibilityConfig = AccessibilitySystem.getConfig();
    
    UIPolishSystem.configure({
      enableAnimations: enabled && !accessibilityConfig.reduceMotion,
    });

    this.saveSettings({ enableAnimations: enabled });
  }

  // Toggle haptics
  static toggleHaptics(enabled: boolean) {
    this.config.enableHaptics = enabled;
    UIPolishSystem.configure({ enableHaptics: enabled });
    this.saveSettings({ enableHaptics: enabled });
  }

  // Accessibility helpers
  static setFontScale(scale: number) {
    AccessibilitySystem.setFontScale(scale);
  }

  static setHighContrast(enabled: boolean) {
    AccessibilitySystem.setHighContrast(enabled);
  }

  // Performance helpers
  static enablePerformanceMode() {
    UIPolishSystem.configure({
      enableAnimations: false,
      animationScale: 0.1,
    });
  }

  static disablePerformanceMode() {
    const accessibilityConfig = AccessibilitySystem.getConfig();
    UIPolishSystem.configure({
      enableAnimations: this.config.enableAnimations && !accessibilityConfig.reduceMotion,
      animationScale: accessibilityConfig.fontScale,
    });
  }

  // Development helpers
  static enableDebugMode() {
    PerformanceSystem.enableDevMode();
  }

  static getDebugInfo() {
    return {
      ...this.getStatus(),
      memoryUsage: PerformanceSystem.getMetrics().memoryUsage,
      animationCount: PerformanceSystem.getMetrics().animationCount,
    };
  }

  // Reset all systems
  static reset() {
    PerformanceSystem.reset();
    UIPolishSystem.configure({
      enableAnimations: true,
      enableHaptics: true,
      animationScale: 1.0,
    });
  }
}

// React Hook for using the integrated system
export const useUIPolishIntegration = () => {
  const [status, setStatus] = React.useState(UIPolishIntegration.getStatus());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(UIPolishIntegration.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    status,
    toggleAnimations: UIPolishIntegration.toggleAnimations,
    toggleHaptics: UIPolishIntegration.toggleHaptics,
    setFontScale: UIPolishIntegration.setFontScale,
    setHighContrast: UIPolishIntegration.setHighContrast,
    enablePerformanceMode: UIPolishIntegration.enablePerformanceMode,
    disablePerformanceMode: UIPolishIntegration.disablePerformanceMode,
    getDebugInfo: UIPolishIntegration.getDebugInfo,
  };
};

export default UIPolishIntegration;
