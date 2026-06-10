import { Platform } from 'react-native';

/**
 * Cross-platform shadow utility for React Native
 * Handles shadows properly across iOS, Android, and web platforms
 */

export interface ShadowOptions {
  width?: number;
  height?: number;
  radius?: number;
  opacity?: number;
  color?: string;
  elevation?: number;
}

/**
 * Get cross-platform shadow styles
 * @param options Shadow configuration options
 * @returns Platform-specific shadow styles
 */
export const getCrossPlatformShadow = (options: ShadowOptions = {}) => {
  const {
    width = 0,
    height = 2,
    radius = 4,
    opacity = 0.1,
    color = '#000',
    elevation = 3
  } = options;

  // iOS platform - use native shadow properties
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: { width, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
    };
  }
  
  // Android platform - use elevation
  if (Platform.OS === 'android') {
    return {
      elevation,
      shadowColor: color,
    };
  }
  
  // Web platform - use CSS box-shadow equivalent
  return {
    shadowColor: color,
    shadowOffset: { width, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    // Web-specific shadow using CSS box-shadow
    boxShadow: `${width}px ${height}px ${radius}px ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  };
};

/**
 * Predefined shadow presets for common use cases
 */
export const shadowPresets = {
  // Small subtle shadow
  small: () => getCrossPlatformShadow({
    width: 0,
    height: 1,
    radius: 2,
    opacity: 0.1,
    elevation: 1
  }),
  
  // Medium shadow for cards
  medium: () => getCrossPlatformShadow({
    width: 0,
    height: 2,
    radius: 4,
    opacity: 0.15,
    elevation: 3
  }),
  
  // Large shadow for modals/overlays
  large: () => getCrossPlatformShadow({
    width: 0,
    height: 4,
    radius: 8,
    opacity: 0.2,
    elevation: 6
  }),
  
  // Extra large shadow for elevated elements
  xlarge: () => getCrossPlatformShadow({
    width: 0,
    height: 6,
    radius: 12,
    opacity: 0.25,
    elevation: 10
  }),
  
  // Custom shadow with specific color
  custom: (color: string, options: Partial<ShadowOptions> = {}) => 
    getCrossPlatformShadow({
      width: 0,
      height: 2,
      radius: 4,
      opacity: 0.15,
      elevation: 3,
      color,
      ...options
    })
};

/**
 * Get shadow for active/pressed states
 * @param baseOptions Base shadow options
 * @param isActive Whether the element is active/pressed
 * @returns Shadow styles with active state adjustments
 */
export const getActiveShadow = (baseOptions: ShadowOptions, isActive: boolean) => {
  if (!isActive) {
    return getCrossPlatformShadow({
      ...baseOptions,
      opacity: 0,
      elevation: 0
    });
  }
  
  return getCrossPlatformShadow(baseOptions);
};

/**
 * Get shadow for different elevation levels
 * @param level Elevation level (1-5)
 * @returns Shadow styles for the specified elevation level
 */
export const getElevationShadow = (level: 1 | 2 | 3 | 4 | 5) => {
  const elevationMap = {
    1: { height: 1, radius: 2, opacity: 0.1, elevation: 1 },
    2: { height: 2, radius: 4, opacity: 0.15, elevation: 2 },
    3: { height: 3, radius: 6, opacity: 0.2, elevation: 4 },
    4: { height: 4, radius: 8, opacity: 0.25, elevation: 6 },
    5: { height: 6, radius: 12, opacity: 0.3, elevation: 8 }
  };
  
  return getCrossPlatformShadow({
    width: 0,
    ...elevationMap[level]
  });
};

export default getCrossPlatformShadow;
