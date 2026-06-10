/**
 * Color System for LinkApp
 * Defines module-specific colors while maintaining a cohesive design system
 */

// Type definitions
interface ColorShade {
  light: string;
  main: string;
  dark: string;
}

interface ColorShadeWithContrast extends ColorShade {
  contrast: string;
}

interface GrayScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

interface ModuleColors {
  primary: ColorShadeWithContrast;
  secondary: ColorShadeWithContrast;
  accent: string;
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
}

interface BaseColors {
  white: string;
  black: string;
  gray: GrayScale;
  success: ColorShade;
  warning: ColorShade;
  error: ColorShade;
  info: ColorShade;
}

interface CommonColors {
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };
  border: {
    light: string;
    main: string;
    dark: string;
  };
  overlay: {
    light: string;
    medium: string;
    dark: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

interface SocialColors {
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  whatsapp: string;
  youtube: string;
  google: string;
  apple: string;
}

export type ModuleName = 'property' | 'jobs' | 'services' | 'dating';

// Base colors shared across all modules
const baseColors: BaseColors = {
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // System colors
  success: {
    light: '#86EFAC',
    main: '#22C55E',
    dark: '#16A34A',
  },
  warning: {
    light: '#FDE047',
    main: '#EAB308',
    dark: '#CA8A04',
  },
  error: {
    light: '#FCA5A5',
    main: '#EF4444',
    dark: '#DC2626',
  },
  info: {
    light: '#93C5FD',
    main: '#3B82F6',
    dark: '#2563EB',
  },
};

// Module-specific color palettes
const moduleColors: Record<ModuleName, ModuleColors> = {
  // Property module - Professional and trustworthy blues
  property: {
    primary: {
      light: '#DBEAFE',
      main: '#3B82F6',
      dark: '#1E40AF',
      contrast: '#FFFFFF',
    },
    secondary: {
      light: '#E0E7FF',
      main: '#6366F1',
      dark: '#4338CA',
      contrast: '#FFFFFF',
    },
    accent: '#10B981',
    background: {
      primary: '#FFFFFF',
      secondary: '#F3F4F6',
      tertiary: '#E5E7EB',
    },
  },
  
  // Jobs module - Professional greens
  jobs: {
    primary: {
      light: '#D1FAE5',
      main: '#10B981',
      dark: '#059669',
      contrast: '#FFFFFF',
    },
    secondary: {
      light: '#FEF3C7',
      main: '#F59E0B',
      dark: '#D97706',
      contrast: '#FFFFFF',
    },
    accent: '#6366F1',
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
    },
  },
  
  // Services module - Vibrant purples
  services: {
    primary: {
      light: '#EDE9FE',
      main: '#8B5CF6',
      dark: '#6D28D9',
      contrast: '#FFFFFF',
    },
    secondary: {
      light: '#FCE7F3',
      main: '#EC4899',
      dark: '#DB2777',
      contrast: '#FFFFFF',
    },
    accent: '#14B8A6',
    background: {
      primary: '#FFFFFF',
      secondary: '#FAF5FF',
      tertiary: '#F3E8FF',
    },
  },
  
  // Dating module - Romantic reds and pinks
  dating: {
    primary: {
      light: '#FECACA',
      main: '#F87171',
      dark: '#EF4444',
      contrast: '#FFFFFF',
    },
    secondary: {
      light: '#FBCFE8',
      main: '#F472B6',
      dark: '#EC4899',
      contrast: '#FFFFFF',
    },
    accent: '#A78BFA',
    background: {
      primary: '#FFFFFF',
      secondary: '#FFF1F2',
      tertiary: '#FFE4E6',
    },
  },
};

// Common UI colors used across all modules
const commonColors: CommonColors = {
  text: {
    primary: baseColors.gray[900],
    secondary: baseColors.gray[700],
    tertiary: baseColors.gray[500],
    disabled: baseColors.gray[400],
    inverse: baseColors.white,
  },
  
  border: {
    light: baseColors.gray[200],
    main: baseColors.gray[300],
    dark: baseColors.gray[400],
  },
  
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.5)',
  },
  
  shadow: {
    sm: 'rgba(0, 0, 0, 0.05)',
    md: 'rgba(0, 0, 0, 0.1)',
    lg: 'rgba(0, 0, 0, 0.15)',
    xl: 'rgba(0, 0, 0, 0.25)',
  },
};

// Social media brand colors for integrations
const socialColors: SocialColors = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  whatsapp: '#25D366',
  youtube: '#FF0000',
  google: '#4285F4',
  apple: '#000000',
};

// Export the complete color system
export const colors = {
  base: baseColors,
  modules: moduleColors,
  common: commonColors,
  social: socialColors,
} as const;

// Helper function to get module colors with type safety
export const getModuleColors = (moduleName: ModuleName): ModuleColors => {
  const validModules: ModuleName[] = ['property', 'jobs', 'services', 'dating'];
  
  if (!validModules.includes(moduleName)) {
    
    return moduleColors.property;
  }
  
  return moduleColors[moduleName];
};

// Helper function to get color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  // Validate opacity
  if (opacity < 0 || opacity > 1) {
    
    opacity = Math.max(0, Math.min(1, opacity));
  }
  
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Dark mode colors (for future implementation)
export interface DarkModeColors {
  base: BaseColors;
  modules: Record<ModuleName, ModuleColors>;
  common: CommonColors;
}

// Placeholder for dark mode colors
export const darkColors: DarkModeColors = {
  base: {
    ...baseColors,
    // Inverted gray scale for dark mode
    gray: {
      50: '#171717',
      100: '#262626',
      200: '#404040',
      300: '#525252',
      400: '#737373',
      500: '#A3A3A3',
      600: '#D4D4D4',
      700: '#E5E5E5',
      800: '#F5F5F5',
      900: '#FAFAFA',
    },
  },
  modules: moduleColors, // Will be updated with dark mode specific colors
  common: {
    text: {
      primary: '#FAFAFA',
      secondary: '#E5E5E5',
      tertiary: '#A3A3A3',
      disabled: '#737373',
      inverse: '#171717',
    },
    border: {
      light: '#262626',
      main: '#404040',
      dark: '#525252',
    },
    overlay: commonColors.overlay,
    shadow: commonColors.shadow,
  },
};

export default colors;
