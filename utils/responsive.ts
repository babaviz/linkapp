import { PixelRatio, Platform, useWindowDimensions, Dimensions } from 'react-native';

// Responsive breakpoints
export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
} as const;

export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'largeDesktop';

// Device type detection with width parameter
export const getDeviceType = (width?: number): DeviceType => {
  const w = typeof width === 'number' ? width : Dimensions.get('window').width;
  if (w >= BREAKPOINTS.largeDesktop) return 'largeDesktop';
  if (w >= BREAKPOINTS.desktop) return 'desktop';
  if (w >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
};

// Hook for responsive dimensions
export const useResponsiveDimensions = () => {
  const { width, height } = useWindowDimensions();
  const deviceType = getDeviceType(width);
  
  return {
    width,
    height,
    deviceType,
    isPhone: deviceType === 'phone',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop' || deviceType === 'largeDesktop',
    isLargeDesktop: deviceType === 'largeDesktop',
  };
};

// Responsive width percentages (dynamic)
export const wp = (percentage: number, width?: number) => {
  const w = typeof width === 'number' ? width : Dimensions.get('window').width;
  const value = (percentage * w) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive height percentages (dynamic)
export const hp = (percentage: number, height?: number) => {
  const h = typeof height === 'number' ? height : Dimensions.get('window').height;
  const value = (percentage * h) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Dynamic responsive font sizes
export const getResponsiveFontSize = (deviceType: DeviceType) => ({
  xs: deviceType === 'largeDesktop' ? 16 : deviceType === 'desktop' ? 14 : deviceType === 'tablet' ? 14 : 12,
  sm: deviceType === 'largeDesktop' ? 18 : deviceType === 'desktop' ? 16 : deviceType === 'tablet' ? 16 : 14,
  md: deviceType === 'largeDesktop' ? 20 : deviceType === 'desktop' ? 18 : deviceType === 'tablet' ? 18 : 16,
  base: deviceType === 'largeDesktop' ? 20 : deviceType === 'desktop' ? 18 : deviceType === 'tablet' ? 18 : 16,
  lg: deviceType === 'largeDesktop' ? 22 : deviceType === 'desktop' ? 20 : deviceType === 'tablet' ? 20 : 18,
  xl: deviceType === 'largeDesktop' ? 28 : deviceType === 'desktop' ? 24 : deviceType === 'tablet' ? 24 : 20,
  '2xl': deviceType === 'largeDesktop' ? 32 : deviceType === 'desktop' ? 28 : deviceType === 'tablet' ? 28 : 24,
  '3xl': deviceType === 'largeDesktop' ? 36 : deviceType === 'desktop' ? 32 : deviceType === 'tablet' ? 32 : 30,
});

// Backward-compatible static exports (computed once)
export const fontSize = getResponsiveFontSize(getDeviceType());

// Dynamic responsive spacing
export const getResponsiveSpacing = (deviceType: DeviceType) => ({
  xs: deviceType === 'largeDesktop' ? 8 : deviceType === 'desktop' ? 6 : deviceType === 'tablet' ? 6 : 4,
  sm: deviceType === 'largeDesktop' ? 12 : deviceType === 'desktop' ? 10 : deviceType === 'tablet' ? 10 : 8,
  md: deviceType === 'largeDesktop' ? 20 : deviceType === 'desktop' ? 16 : deviceType === 'tablet' ? 16 : 12,
  lg: deviceType === 'largeDesktop' ? 28 : deviceType === 'desktop' ? 24 : deviceType === 'tablet' ? 24 : 20,
  xl: deviceType === 'largeDesktop' ? 40 : deviceType === 'desktop' ? 32 : deviceType === 'tablet' ? 32 : 24,
  '2xl': deviceType === 'largeDesktop' ? 56 : deviceType === 'desktop' ? 48 : deviceType === 'tablet' ? 48 : 32,
});

// Backward-compatible static spacing export
export const spacing = getResponsiveSpacing(getDeviceType());

// Responsive horizontal padding for containers
export const getContainerPadding = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'largeDesktop':
      return { paddingHorizontal: 48, paddingVertical: 32 };
    case 'desktop':
      return { paddingHorizontal: 40, paddingVertical: 28 };
    case 'tablet':
      return { paddingHorizontal: 24, paddingVertical: 20 };
    default:
      return { paddingHorizontal: 16, paddingVertical: 16 };
  }
};

// Responsive content max width for desktop layouts
export const getContentMaxWidth = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'largeDesktop':
      return 1400;
    case 'desktop':
      return 1200;
    case 'tablet':
      return 900;
    default:
      return undefined;
  }
};

// Responsive grid columns with optional override
export const getGridColumns = (deviceType?: DeviceType, maxColumns?: number) => {
  const dt = deviceType ?? getDeviceType();
  let columns: number;
  switch (dt) {
    case 'largeDesktop':
      columns = 4;
      break;
    case 'desktop':
      columns = 3;
      break;
    case 'tablet':
      columns = 2;
      break;
    default:
      columns = 1;
  }
  return maxColumns ? Math.min(columns, maxColumns) : columns;
};

// Responsive card width with dynamic dimensions
export const getCardWidth = (width?: number, deviceType?: DeviceType, columns?: number) => {
  const w = typeof width === 'number' ? width : Dimensions.get('window').width;
  const dt = deviceType ?? getDeviceType(w);
  const containerPadding = getContainerPadding(dt);
  const margin = containerPadding.paddingHorizontal * 2;
  const numColumns = columns || getGridColumns(dt);
  const gapSize = dt === 'largeDesktop' ? 24 : dt === 'desktop' ? 20 : dt === 'tablet' ? 16 : 12;
  const totalGap = (numColumns - 1) * gapSize;
  
  const maxWidth = getContentMaxWidth(dt);
  const effectiveWidth = maxWidth && w > maxWidth ? maxWidth : w;
  
  return (effectiveWidth - margin - totalGap) / numColumns;
};

// Responsive icon sizes with device-specific multipliers
export const getIconSize = (size: 'sm' | 'md' | 'lg' | 'xl', deviceType?: DeviceType) => {
  const dt = deviceType ?? getDeviceType();
  const multiplier = dt === 'largeDesktop' ? 1.5 : dt === 'desktop' ? 1.4 : dt === 'tablet' ? 1.2 : 1;
  
  const sizes = {
    sm: 16 * multiplier,
    md: 24 * multiplier,
    lg: 32 * multiplier,
    xl: 48 * multiplier,
  };
  
  return Math.round(sizes[size]);
};

// Cross-platform shadow utility
export const getCrossPlatformShadow = (options: {
  width?: number;
  height?: number;
  radius?: number;
  opacity?: number;
  color?: string;
  elevation?: number;
}) => {
  const {
    width = 0,
    height = 2,
    radius = 4,
    opacity = 0.1,
    color = '#000',
    elevation = 3
  } = options;

  // Platform-specific shadow implementation
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: { width, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
    };
  } else if (Platform.OS === 'android') {
    return {
      elevation,
      shadowColor: color,
    };
  } else {
    // Web platform - use CSS box-shadow equivalent
    return {
      shadowColor: color,
      shadowOffset: { width, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
      // Web-specific shadow
      boxShadow: `${width}px ${height}px ${radius}px ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    };
  }
};

// Get gap size for flexbox and grids
export const getGapSize = (deviceType: DeviceType, size: 'sm' | 'md' | 'lg' = 'md') => {
  const baseGaps = {
    sm: { phone: 8, tablet: 12, desktop: 16, largeDesktop: 20 },
    md: { phone: 12, tablet: 16, desktop: 20, largeDesktop: 24 },
    lg: { phone: 16, tablet: 20, desktop: 24, largeDesktop: 32 },
  };
  return baseGaps[size][deviceType];
};

// Backward-compatible helpers
export const getResponsiveMargin = () => {
  const dt = getDeviceType();
  switch (dt) {
    case 'largeDesktop':
      return 'mx-10 px-10';
    case 'desktop':
      return 'mx-8 px-8';
    case 'tablet':
      return 'mx-6 px-6';
    default:
      return 'mx-4 px-4';
  }
};

export const getResponsivePadding = () => {
  const dt = getDeviceType();
  switch (dt) {
    case 'largeDesktop':
      return 'p-10';
    case 'desktop':
      return 'p-8';
    case 'tablet':
      return 'p-6';
    default:
      return 'p-4';
  }
};

// Get border radius based on device type
export const getBorderRadius = (deviceType: DeviceType, size: 'sm' | 'md' | 'lg' = 'md') => {
  const baseRadius = {
    sm: { phone: 8, tablet: 10, desktop: 12, largeDesktop: 14 },
    md: { phone: 12, tablet: 14, desktop: 16, largeDesktop: 18 },
    lg: { phone: 16, tablet: 18, desktop: 20, largeDesktop: 24 },
  };
  return baseRadius[size][deviceType];
};

// Hook for responsive layout values
export const useResponsiveLayout = () => {
  const dimensions = useResponsiveDimensions();
  const { deviceType, width, height } = dimensions;
  
  return {
    ...dimensions,
    fontSize: getResponsiveFontSize(deviceType),
    spacing: getResponsiveSpacing(deviceType),
    containerPadding: getContainerPadding(deviceType),
    contentMaxWidth: getContentMaxWidth(deviceType),
    gridColumns: getGridColumns(deviceType),
    cardWidth: getCardWidth(width, deviceType),
    iconSize: (size: 'sm' | 'md' | 'lg' | 'xl') => getIconSize(size, deviceType),
    gapSize: (size?: 'sm' | 'md' | 'lg') => getGapSize(deviceType, size),
    borderRadius: (size?: 'sm' | 'md' | 'lg') => getBorderRadius(deviceType, size),
  };
};

// Backward-compatible dynamic dimensions (non-hook)
export const getDynamicDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const deviceType = getDeviceType(width);
  return {
    width,
    height,
    deviceType,
    isTablet: width >= BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.desktop,
  };
};
