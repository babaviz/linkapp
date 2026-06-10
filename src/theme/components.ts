/**
 * Component Styles for LinkApp
 * Defines reusable component style definitions
 */

import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { colors, ModuleName } from './colors';
import { typography } from './typography';
import { spacing, layout } from './spacing';

// Type definitions
export interface ComponentStyles {
  container: ViewStyle;
  card: {
    base: ViewStyle;
    elevated: ViewStyle;
    pressed: ViewStyle;
  };
  button: {
    base: ViewStyle;
    primary: ViewStyle;
    secondary: ViewStyle;
    tertiary: ViewStyle;
    ghost: ViewStyle;
    disabled: ViewStyle;
    sizes: {
      small: ViewStyle;
      medium: ViewStyle;
      large: ViewStyle;
    };
  };
  input: {
    base: ViewStyle;
    focused: ViewStyle;
    error: ViewStyle;
    disabled: ViewStyle;
  };
  badge: {
    base: ViewStyle;
    dot: ViewStyle;
  };
  avatar: {
    small: ImageStyle;
    medium: ImageStyle;
    large: ImageStyle;
  };
  divider: ViewStyle;
  skeleton: ViewStyle;
}

// Shadow styles (using box shadow as per rules)
export const shadows = {
  none: {},
  sm: {
    shadowColor: colors.common.shadow.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.common.shadow.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.common.shadow.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.common.shadow.xl,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
} as const;

// Border radius values
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// Base component styles
export const componentStyles: ComponentStyles = {
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.common.text.inverse,
  },
  
  // Card styles
  card: {
    base: {
      backgroundColor: colors.common.text.inverse,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.common.border.light,
    },
    elevated: {
      backgroundColor: colors.common.text.inverse,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.md,
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  },
  
  // Button styles
  button: {
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      flexDirection: 'row',
    },
    primary: {
      backgroundColor: colors.modules.property.primary.main,
    },
    secondary: {
      backgroundColor: colors.modules.property.secondary.main,
    },
    tertiary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.common.border.main,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    disabled: {
      opacity: 0.5,
    },
    sizes: {
      small: {
        paddingHorizontal: layout.buttonPadding.small.horizontal,
        paddingVertical: layout.buttonPadding.small.vertical,
        minHeight: 32,
      },
      medium: {
        paddingHorizontal: layout.buttonPadding.medium.horizontal,
        paddingVertical: layout.buttonPadding.medium.vertical,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: layout.buttonPadding.large.horizontal,
        paddingVertical: layout.buttonPadding.large.vertical,
        minHeight: 56,
      },
    },
  },
  
  // Input styles
  input: {
    base: {
      borderWidth: 1,
      borderColor: colors.common.border.main,
      borderRadius: borderRadius.md,
      paddingHorizontal: layout.inputPadding.horizontal,
      paddingVertical: layout.inputPadding.vertical,
      backgroundColor: colors.common.text.inverse,
      minHeight: 44,
    },
    focused: {
      borderColor: colors.modules.property.primary.main,
      borderWidth: 2,
    },
    error: {
      borderColor: colors.base.error.main,
      borderWidth: 2,
    },
    disabled: {
      backgroundColor: colors.base.gray[100],
      opacity: 0.7,
    },
  },
  
  // Badge styles
  badge: {
    base: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.base.error.main,
      minWidth: 20,
      minHeight: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.full,
      backgroundColor: colors.base.error.main,
    },
  },
  
  // Avatar styles
  avatar: {
    small: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
    },
    medium: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.full,
    },
    large: {
      width: 64,
      height: 64,
      borderRadius: borderRadius.full,
    },
  },
  
  // Divider styles
  divider: {
    height: 1,
    backgroundColor: colors.common.border.light,
    marginVertical: spacing.md,
  },
  
  // Skeleton loader styles
  skeleton: {
    backgroundColor: colors.base.gray[200],
    overflow: 'hidden',
  },
};

// Module-specific component styles factory
export const getModuleComponentStyles = (moduleName: ModuleName): ComponentStyles => {
  const moduleColors = colors.modules[moduleName];
  
  return {
    ...componentStyles,
    button: {
      ...componentStyles.button,
      primary: {
        backgroundColor: moduleColors.primary.main,
      },
      secondary: {
        backgroundColor: moduleColors.secondary.main,
      },
    },
    input: {
      ...componentStyles.input,
      focused: {
        borderColor: moduleColors.primary.main,
        borderWidth: 2,
      },
    },
    badge: {
      ...componentStyles.badge,
      base: {
        ...componentStyles.badge.base,
        backgroundColor: moduleColors.accent,
      },
      dot: {
        ...componentStyles.badge.dot,
        backgroundColor: moduleColors.accent,
      },
    },
  };
};

// List item styles
export const listItemStyles = {
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.common.text.inverse,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.common.border.light,
    marginLeft: spacing.lg,
  },
} as const;

// Section styles
export const sectionStyles = {
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.common.text.inverse,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
} as const;

// Modal styles
export const modalStyles = {
  backdrop: {
    flex: 1,
    backgroundColor: colors.common.overlay.dark,
    justifyContent: 'flex-end' as const,
  },
  content: {
    backgroundColor: colors.common.text.inverse,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.common.border.main,
    borderRadius: borderRadius.full,
    alignSelf: 'center' as const,
    marginBottom: spacing.lg,
  },
} as const;

// Tab styles
export const tabStyles = {
  container: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.modules.property.primary.main,
  },
  indicator: {
    position: 'absolute' as const,
    bottom: 0,
    height: 2,
    backgroundColor: colors.modules.property.primary.main,
  },
} as const;

// Chip styles
export const chipStyles = {
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.base.gray[100],
  },
  selected: {
    backgroundColor: colors.modules.property.primary.light,
  },
  icon: {
    marginRight: spacing.xs,
  },
} as const;

// Export all component styles
export default {
  componentStyles,
  shadows,
  borderRadius,
  listItemStyles,
  sectionStyles,
  modalStyles,
  tabStyles,
  chipStyles,
  getModuleComponentStyles,
};
