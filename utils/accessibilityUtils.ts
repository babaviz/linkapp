/**
 * Accessibility Utilities
 * Provides consistent accessibility features and WCAG compliance
 * across all modules and screens in the MyNyumba app
 */

import { AccessibilityInfo, Platform, Dimensions, PixelRatio } from 'react-native';

// MARK: - Touch Target Standards
export const ACCESSIBILITY_STANDARDS = {
  MIN_TOUCH_TARGET: 44, // 44px minimum for iOS and Android
  MIN_TOUCH_TARGET_LARGE: 48, // For primary actions
  SPACING_BETWEEN_TARGETS: 8, // Minimum space between touch targets
  
  // Font scaling support
  FONT_SCALE_LIMITS: {
    MIN: 0.85,
    MAX: 1.3, // Support up to 130% scaling
  },
  
  // Color contrast ratios (WCAG AA)
  CONTRAST_RATIOS: {
    NORMAL_TEXT: 4.5, // 4.5:1 for normal text
    LARGE_TEXT: 3, // 3:1 for large text (18pt+ or 14pt+ bold)
    UI_COMPONENTS: 3, // 3:1 for UI components and graphics
  },
  
  // Animation preferences
  ANIMATION_DURATION_LIMIT: 5000, // 5 seconds max for animations
  REDUCED_MOTION_DURATION: 100, // Reduced duration when motion is reduced
} as const;

// MARK: - Touch Target Utilities
export const ensureMinimumTouchTarget = (
  width: number | string = 'auto',
  height: number | string = 'auto',
  minSize: number = ACCESSIBILITY_STANDARDS.MIN_TOUCH_TARGET
) => {
  const styles: any = {};
  
  if (typeof width === 'number' && width < minSize) {
    styles.width = minSize;
    styles.minWidth = minSize;
  } else if (width !== 'auto') {
    styles.width = width;
  }
  
  if (typeof height === 'number' && height < minSize) {
    styles.height = minSize;
    styles.minHeight = minSize;
  } else if (height !== 'auto') {
    styles.height = height;
  }
  
  // Ensure proper centering when dimensions are adjusted
  if (styles.width || styles.height) {
    styles.alignItems = styles.alignItems || 'center';
    styles.justifyContent = styles.justifyContent || 'center';
  }
  
  return styles;
};

// MARK: - Font Scaling Utilities
export const getScaledFontSize = async (baseFontSize: number): Promise<number> => {
  try {
    // Use PixelRatio to get font scale since AccessibilityInfo.getScaledFontSize doesn't exist
    const fontScale = PixelRatio.getFontScale();
    const scaledSize = baseFontSize * fontScale;
    
    // Apply our font scale limits for better UX
    const { MIN, MAX } = ACCESSIBILITY_STANDARDS.FONT_SCALE_LIMITS;
    const limitedSize = Math.max(
      baseFontSize * MIN,
      Math.min(scaledSize, baseFontSize * MAX)
    );
    
    return Math.round(limitedSize);
  } catch (error) {
    // Fallback to base size if accessibility services are unavailable
    return baseFontSize;
  }
};

export const createResponsiveFontSize = (baseSize: number) => ({
  fontSize: baseSize,
  // This will be automatically handled by React Native's accessibility features
  // but we can provide explicit scaling if needed
});

// MARK: - Color Contrast Utilities
export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const getLuminance = (r: number, g: number, b: number) => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

export const meetsContrastRequirement = (
  textColor: string,
  backgroundColor: string,
  isLargeText: boolean = false,
  level: 'AA' | 'AAA' = 'AA'
): boolean => {
  const ratio = getContrastRatio(textColor, backgroundColor);
  
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  
  // WCAG AA standards
  return isLargeText 
    ? ratio >= ACCESSIBILITY_STANDARDS.CONTRAST_RATIOS.LARGE_TEXT
    : ratio >= ACCESSIBILITY_STANDARDS.CONTRAST_RATIOS.NORMAL_TEXT;
};

// MARK: - Screen Reader Utilities
export const createAccessibilityLabel = (
  primaryText: string,
  secondaryText?: string,
  context?: string
): string => {
  const parts = [primaryText];
  
  if (secondaryText) {
    parts.push(secondaryText);
  }
  
  if (context) {
    parts.push(context);
  }
  
  return parts.join(', ');
};

export const createAccessibilityHint = (
  action: string,
  result?: string
): string => {
  if (result) {
    return `${action}. ${result}`;
  }
  return action;
};

// Commonly used accessibility labels for the app
export const ACCESSIBILITY_LABELS = {
  BUTTONS: {
    BACK: 'Go back',
    CLOSE: 'Close',
    SAVE: 'Save changes',
    DELETE: 'Delete item',
    EDIT: 'Edit item',
    SHARE: 'Share item',
    FAVORITE: 'Add to favorites',
    UNFAVORITE: 'Remove from favorites',
    CALL: 'Make phone call',
    EMAIL: 'Send email',
    MESSAGE: 'Send message',
  },
  NAVIGATION: {
    PROPERTY_TAB: 'Property listings, tab',
    JOBS_TAB: 'Jobs marketplace, tab',
    SERVICES_TAB: 'Services directory, tab',
    STORIES_TAB: 'Community stories, tab',
    DATEMI_TAB: 'Dating platform, tab',
    PROFILE_TAB: 'User profile, tab',
  },
  STATES: {
    LOADING: 'Loading content',
    ERROR: 'Error occurred',
    EMPTY: 'No content available',
    SELECTED: 'Selected',
    EXPANDED: 'Expanded',
    COLLAPSED: 'Collapsed',
  },
} as const;

// MARK: - Motion and Animation Utilities
export const shouldReduceMotion = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch (error) {
    return false; // Default to allowing motion if detection fails
  }
};

export const getAccessibleAnimationDuration = async (
  normalDuration: number
): Promise<number> => {
  const reduceMotion = await shouldReduceMotion();
  return reduceMotion 
    ? ACCESSIBILITY_STANDARDS.REDUCED_MOTION_DURATION
    : normalDuration;
};

// MARK: - Focus Management
export const setAccessibilityFocus = (ref: any) => {
  if (ref?.current && Platform.OS === 'ios') {
    AccessibilityInfo.setAccessibilityFocus(ref.current);
  }
};

export const announceForAccessibility = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message);
};

// MARK: - Device and Screen Utilities
export const isLargeScreen = (): boolean => {
  const { width, height } = Dimensions.get('window');
  const screenArea = width * height;
  const tabletThreshold = 500000; // Approximate threshold for tablet screens
  
  return screenArea > tabletThreshold;
};

export const getOptimalTouchTargetSize = (): number => {
  const isTablet = isLargeScreen();
  return isTablet 
    ? ACCESSIBILITY_STANDARDS.MIN_TOUCH_TARGET_LARGE
    : ACCESSIBILITY_STANDARDS.MIN_TOUCH_TARGET;
};

// MARK: - Accessibility State Helpers
export const createAccessibilityState = (options: {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean;
  expanded?: boolean;
  busy?: boolean;
}) => {
  const state: any = {};
  
  if (options.disabled !== undefined) state.disabled = options.disabled;
  if (options.selected !== undefined) state.selected = options.selected;
  if (options.checked !== undefined) state.checked = options.checked;
  if (options.expanded !== undefined) state.expanded = options.expanded;
  if (options.busy !== undefined) state.busy = options.busy;
  
  return state;
};

// MARK: - Service-Specific Accessibility Helpers
export const getServiceAccessibilityProps = (
  serviceType: 'property' | 'jobs' | 'services' | 'stories' | 'datemi' | 'profile',
  itemType: 'card' | 'button' | 'list-item' | 'tab',
  itemData?: any
) => {
  const baseProps: any = {
    accessible: true,
    accessibilityRole: itemType === 'tab' ? 'tab' : itemType === 'card' ? 'button' : 'button',
  };
  
  // Service-specific customizations
  switch (serviceType) {
    case 'property':
      if (itemType === 'card' && itemData) {
        baseProps.accessibilityLabel = createAccessibilityLabel(
          itemData.title || 'Property listing',
          itemData.price ? `Price: ${itemData.price}` : undefined,
          itemData.location ? `Location: ${itemData.location}` : undefined
        );
        baseProps.accessibilityHint = 'Double tap to view property details';
      }
      break;
      
    case 'jobs':
      if (itemType === 'card' && itemData) {
        baseProps.accessibilityLabel = createAccessibilityLabel(
          itemData.title || 'Job posting',
          itemData.company ? `Company: ${itemData.company}` : undefined,
          itemData.location ? `Location: ${itemData.location}` : undefined
        );
        baseProps.accessibilityHint = 'Double tap to view job details';
      }
      break;
      
    case 'services':
      if (itemType === 'card' && itemData) {
        baseProps.accessibilityLabel = createAccessibilityLabel(
          itemData.title || 'Service listing',
          itemData.category ? `Category: ${itemData.category}` : undefined,
          itemData.provider ? `Provider: ${itemData.provider}` : undefined
        );
        baseProps.accessibilityHint = 'Double tap to view service details';
      }
      break;
      
    default:
      break;
  }
  
  return baseProps;
};

// MARK: - Export utilities
export default {
  ACCESSIBILITY_STANDARDS,
  ensureMinimumTouchTarget,
  getScaledFontSize,
  createResponsiveFontSize,
  getContrastRatio,
  meetsContrastRequirement,
  createAccessibilityLabel,
  createAccessibilityHint,
  ACCESSIBILITY_LABELS,
  shouldReduceMotion,
  getAccessibleAnimationDuration,
  setAccessibilityFocus,
  announceForAccessibility,
  isLargeScreen,
  getOptimalTouchTargetSize,
  createAccessibilityState,
  getServiceAccessibilityProps,
};
