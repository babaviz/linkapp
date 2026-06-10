import * as Font from 'expo-font';

const fontConfig = {
  'System': {
    weights: ['400', '500', '600', '700'],
    preload: true
  }
};

export const loadOptimizedFonts = async () => {
  try {
    const fontsToLoad: Record<string, any> = {};
    
    Object.entries(fontConfig).forEach(([family, config]) => {
      if (config.preload) {
        config.weights.forEach(weight => {
          const fontKey = `${family}-${weight}`;
        });
      }
    });

    if (Object.keys(fontsToLoad).length > 0) {
      await Font.loadAsync(fontsToLoad);
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const getFontFamily = (weight: '400' | '500' | '600' | '700' = '400'): string => {
  return 'System';
};

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
