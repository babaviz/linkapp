import { Dimensions, Platform, PixelRatio } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

interface DeviceInfo {
  platform: 'android' | 'ios' | 'web';
  osVersion: string;
  deviceType: 'phone' | 'tablet' | 'tv' | 'desktop' | 'unknown';
  brand: string | null;
  modelName: string | null;
  isEmulator: boolean;
  supportedAbis?: string[];
  totalMemory: number;
  hasNotch: boolean;
  isLowEndDevice: boolean;
}

interface ScreenInfo {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
}

interface CompatibilityFeatures {
  supportsBlur: boolean;
  supportsShadow: boolean;
  supportsHaptics: boolean;
  supportsVideoCall: boolean;
  supportsAdvancedAnimations: boolean;
  supportsCameraAccess: boolean;
  supportsLocationServices: boolean;
  supportsBackgroundTasks: boolean;
}

class DeviceCompatibility {
  private static instance: DeviceCompatibility;
  private deviceInfo: DeviceInfo;
  private screenInfo: ScreenInfo;
  private compatibilityFeatures: CompatibilityFeatures;
  private orientationListeners: Set<(orientation: 'portrait' | 'landscape') => void> = new Set();

  private constructor() {
    this.deviceInfo = this.detectDeviceInfo();
    this.screenInfo = this.detectScreenInfo();
    this.compatibilityFeatures = this.detectCompatibilityFeatures();
    
    // Listen for orientation changes
    Dimensions.addEventListener('change', this.handleDimensionsChange);
  }

  static getInstance(): DeviceCompatibility {
    if (!DeviceCompatibility.instance) {
      DeviceCompatibility.instance = new DeviceCompatibility();
    }
    return DeviceCompatibility.instance;
  }

  private detectDeviceInfo(): DeviceInfo {
    const platform = Platform.OS as 'android' | 'ios' | 'web';
    const osVersion = Platform.Version.toString();
    const deviceType = Device.deviceType || Device.DeviceType.PHONE;
    
    // Detect if it's a low-end device
    const totalMemory = Device.totalMemory || 0;
    const isLowEndDevice = this.checkIfLowEndDevice(platform, osVersion, totalMemory);

    return {
      platform,
      osVersion,
      deviceType: this.mapDeviceType(deviceType),
      brand: Device.brand,
      modelName: Device.modelName,
      isEmulator: !Device.isDevice,
      supportedAbis: Device.supportedCpuArchitectures,
      totalMemory,
      hasNotch: this.detectNotch(),
      isLowEndDevice,
    };
  }

  private mapDeviceType(deviceType: number): 'phone' | 'tablet' | 'tv' | 'desktop' | 'unknown' {
    switch (deviceType) {
      case Device.DeviceType.PHONE:
        return 'phone';
      case Device.DeviceType.TABLET:
        return 'tablet';
      case Device.DeviceType.TV:
        return 'tv';
      case Device.DeviceType.DESKTOP:
        return 'desktop';
      default:
        return 'unknown';
    }
  }

  private detectNotch(): boolean {
    // Check for notch presence
    if (Platform.OS === 'ios') {
      const { statusBarHeight } = Constants;
      return statusBarHeight > 20;
    }
    
    if (Platform.OS === 'android') {
      const { statusBarHeight } = Constants;
      return statusBarHeight > 24;
    }
    
    return false;
  }

  private checkIfLowEndDevice(platform: string, osVersion: string, totalMemory: number): boolean {
    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    
    if (platform === 'android') {
      const androidVersion = parseFloat(osVersion);
      
      // Android 7.0 (API 24) to 8.0 (API 26) with less than 2GB RAM
      if (androidVersion >= 24 && androidVersion <= 26 && memoryGB < 2) {
        return true;
      }
      
      // Any Android with less than 1.5GB RAM
      if (memoryGB < 1.5) {
        return true;
      }
    }
    
    if (platform === 'ios') {
      // Old iOS devices
      const iosVersion = parseFloat(osVersion);
      if (iosVersion < 12 || memoryGB < 1.5) {
        return true;
      }
    }
    
    return false;
  }

  private detectScreenInfo(): ScreenInfo {
    const { width, height } = Dimensions.get('window');
    const scale = PixelRatio.get();
    const fontScale = PixelRatio.getFontScale();
    
    const shortestSide = Math.min(width, height);
    const longestSide = Math.max(width, height);
    
    return {
      width,
      height,
      scale,
      fontScale,
      isSmallScreen: shortestSide < 360,
      isMediumScreen: shortestSide >= 360 && shortestSide < 400,
      isLargeScreen: shortestSide >= 400,
      isTablet: shortestSide >= 600,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  }

  private detectCompatibilityFeatures(): CompatibilityFeatures {
    const { platform, osVersion, isLowEndDevice } = this.deviceInfo;
    
    const features: CompatibilityFeatures = {
      supportsBlur: true,
      supportsShadow: true,
      supportsHaptics: true,
      supportsVideoCall: true,
      supportsAdvancedAnimations: true,
      supportsCameraAccess: true,
      supportsLocationServices: true,
      supportsBackgroundTasks: true,
    };

    if (platform === 'android') {
      const androidVersion = parseFloat(osVersion);
      
      // Android 7.0 (API 24) specific limitations
      if (androidVersion < 26) {
        features.supportsBlur = false; // Blur effects are performance-heavy on older Android
        features.supportsAdvancedAnimations = !isLowEndDevice;
      }
      
      // Android 7.0-7.1 limitations
      if (androidVersion >= 24 && androidVersion < 26) {
        features.supportsBackgroundTasks = false; // Background limitations introduced
      }
      
      // Low-end device limitations
      if (isLowEndDevice) {
        features.supportsBlur = false;
        features.supportsShadow = false;
        features.supportsAdvancedAnimations = false;
        features.supportsVideoCall = false; // Disable for performance
      }
    }

    if (platform === 'web') {
      features.supportsHaptics = false;
      features.supportsBackgroundTasks = false;
    }

    return features;
  }

  private handleDimensionsChange = ({ window }: { window: { width: number; height: number } }) => {
    const previousOrientation = this.screenInfo.orientation;
    this.screenInfo = this.detectScreenInfo();
    
    if (previousOrientation !== this.screenInfo.orientation) {
      this.notifyOrientationChange(this.screenInfo.orientation);
    }
  };

  private notifyOrientationChange(orientation: 'portrait' | 'landscape') {
    this.orientationListeners.forEach(listener => {
      try {
        listener(orientation);
      } catch (error) {
        
      }
    });
  }

  // Public API
  
  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  getScreenInfo(): ScreenInfo {
    return { ...this.screenInfo };
  }

  getCompatibilityFeatures(): CompatibilityFeatures {
    return { ...this.compatibilityFeatures };
  }

  isAndroid7OrHigher(): boolean {
    if (this.deviceInfo.platform !== 'android') return false;
    return parseFloat(this.deviceInfo.osVersion) >= 24;
  }

  isAndroid8OrHigher(): boolean {
    if (this.deviceInfo.platform !== 'android') return false;
    return parseFloat(this.deviceInfo.osVersion) >= 26;
  }

  shouldReduceAnimations(): boolean {
    return this.deviceInfo.isLowEndDevice || !this.compatibilityFeatures.supportsAdvancedAnimations;
  }

  shouldDisableBlur(): boolean {
    return !this.compatibilityFeatures.supportsBlur;
  }

  shouldDisableShadows(): boolean {
    return !this.compatibilityFeatures.supportsShadow;
  }

  getOptimizedStyles(styles: any): any {
    const optimized = { ...styles };
    
    // Remove shadows on low-end devices
    if (this.shouldDisableShadows()) {
      delete optimized.shadowColor;
      delete optimized.shadowOffset;
      delete optimized.shadowOpacity;
      delete optimized.shadowRadius;
      delete optimized.elevation;
    }
    
    // Simplify border radius on low-end devices
    if (this.deviceInfo.isLowEndDevice && optimized.borderRadius > 8) {
      optimized.borderRadius = 8;
    }
    
    return optimized;
  }

  getResponsiveValue<T>(values: { small?: T; medium?: T; large?: T; tablet?: T; default: T }): T {
    if (this.screenInfo.isTablet && values.tablet !== undefined) {
      return values.tablet;
    }
    if (this.screenInfo.isLargeScreen && values.large !== undefined) {
      return values.large;
    }
    if (this.screenInfo.isMediumScreen && values.medium !== undefined) {
      return values.medium;
    }
    if (this.screenInfo.isSmallScreen && values.small !== undefined) {
      return values.small;
    }
    return values.default;
  }

  getScaledSize(baseSize: number): number {
    const { fontScale, scale } = this.screenInfo;
    
    // Adjust for font scale preferences
    if (fontScale > 1.2) {
      return Math.round(baseSize * 1.1);
    }
    if (fontScale < 0.9) {
      return Math.round(baseSize * 0.95);
    }
    
    return baseSize;
  }

  onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void) {
    this.orientationListeners.add(callback);
    return () => this.orientationListeners.delete(callback);
  }

  // Android 7.0+ specific optimizations
  getAndroid7Optimizations() {
    if (this.deviceInfo.platform !== 'android') {
      return {};
    }

    const androidVersion = parseFloat(this.deviceInfo.osVersion);
    const optimizations: any = {};

    // Android 7.0 (Nougat) - API 24
    if (androidVersion >= 24 && androidVersion < 25) {
      optimizations.useNativeDriver = false; // Some animations crash with native driver
      optimizations.collapsable = false; // Prevent view collapsing issues
      optimizations.renderToHardwareTextureAndroid = false; // Prevent rendering issues
    }

    // Android 7.1 - API 25
    if (androidVersion >= 25 && androidVersion < 26) {
      optimizations.useNativeDriver = true;
      optimizations.collapsable = false;
      optimizations.renderToHardwareTextureAndroid = true;
    }

    // All Android 7.x versions
    if (androidVersion >= 24 && androidVersion < 26) {
      optimizations.needsOffscreenAlphaCompositing = false; // Performance optimization
      optimizations.shouldRasterizeIOS = false; // Not applicable but good practice
      optimizations.removeClippedSubviews = true; // Improve scroll performance
    }

    return optimizations;
  }

  // Get performance hints based on device
  getPerformanceHints() {
    const hints: string[] = [];

    if (this.deviceInfo.isLowEndDevice) {
      hints.push('Low-end device detected: Animations and effects reduced');
    }

    if (this.deviceInfo.platform === 'android') {
      const androidVersion = parseFloat(this.deviceInfo.osVersion);
      
      if (androidVersion >= 24 && androidVersion < 26) {
        hints.push('Android 7.x detected: Using compatibility mode');
      }
      
      if (androidVersion < 26) {
        hints.push('Consider upgrading to Android 8.0+ for better performance');
      }
    }

    if (!this.compatibilityFeatures.supportsBlur) {
      hints.push('Blur effects disabled for performance');
    }

    if (!this.compatibilityFeatures.supportsShadow) {
      hints.push('Shadow effects disabled for performance');
    }

    return hints;
  }
}

// Export singleton instance
export const deviceCompatibility = DeviceCompatibility.getInstance();

// Export convenience functions
export const getDeviceInfo = () => deviceCompatibility.getDeviceInfo();
export const getScreenInfo = () => deviceCompatibility.getScreenInfo();
export const getCompatibilityFeatures = () => deviceCompatibility.getCompatibilityFeatures();
export const shouldReduceAnimations = () => deviceCompatibility.shouldReduceAnimations();
export const shouldDisableBlur = () => deviceCompatibility.shouldDisableBlur();
export const shouldDisableShadows = () => deviceCompatibility.shouldDisableShadows();
export const getOptimizedStyles = (styles: any) => deviceCompatibility.getOptimizedStyles(styles);
export const getResponsiveValue = <T>(values: any) => deviceCompatibility.getResponsiveValue<T>(values);
export const getScaledSize = (baseSize: number) => deviceCompatibility.getScaledSize(baseSize);
export const getAndroid7Optimizations = () => deviceCompatibility.getAndroid7Optimizations();
export const getPerformanceHints = () => deviceCompatibility.getPerformanceHints();

// React hooks
import { useEffect, useState } from 'react';

export const useDeviceInfo = () => {
  return deviceCompatibility.getDeviceInfo();
};

export const useScreenInfo = () => {
  const [screenInfo, setScreenInfo] = useState(deviceCompatibility.getScreenInfo());

  useEffect(() => {
    const handleChange = () => {
      setScreenInfo(deviceCompatibility.getScreenInfo());
    };

    const unsubscribe = Dimensions.addEventListener('change', handleChange);
    return () => unsubscribe?.remove();
  }, []);

  return screenInfo;
};

export const useOrientation = () => {
  const [orientation, setOrientation] = useState(deviceCompatibility.getScreenInfo().orientation);

  useEffect(() => {
    const unsubscribe = deviceCompatibility.onOrientationChange(setOrientation);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return orientation;
};

export const useResponsiveValue = <T>(values: { small?: T; medium?: T; large?: T; tablet?: T; default: T }) => {
  const screenInfo = useScreenInfo();
  return deviceCompatibility.getResponsiveValue(values);
};

// Export types
export type { DeviceInfo, ScreenInfo, CompatibilityFeatures };
