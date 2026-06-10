/**
 * Theme Provider for LinkApp
 * Manages theme state and provides theme context to the entire app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as defaultTheme, Theme } from './core';
import { ModuleName, createModuleTheme, ModuleTheme } from './types';

// Context types
interface ThemeContextValue {
  theme: Theme;
  currentModule: ModuleName;
  moduleTheme: ModuleTheme;
  isDarkMode: boolean;
  setCurrentModule: (module: ModuleName) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

// Create the context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  DARK_MODE: '@LinkApp:darkMode',
  LAST_MODULE: '@LinkApp:lastModule',
};

// Provider props
interface ThemeProviderProps {
  children: ReactNode;
  initialModule?: ModuleName;
}

/**
 * Theme Provider Component
 * Wraps the app and provides theme context
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialModule = 'property' 
}) => {
  // State
  const [currentModule, setCurrentModule] = useState<ModuleName>(initialModule);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Use system color scheme as fallback
  const systemColorScheme = useColorScheme();
  
  // Load saved preferences on mount
  useEffect(() => {
    loadSavedPreferences();
  }, []);
  
  // Load preferences from AsyncStorage
  const loadSavedPreferences = async () => {
    try {
      const [savedDarkMode, savedModule] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_MODULE),
      ]);
      
      // Set dark mode
      if (savedDarkMode !== null) {
        setIsDarkMode(savedDarkMode === 'true');
      } else {
        // Use system preference if no saved preference
        setIsDarkMode(systemColorScheme === 'dark');
      }
      
      // Set last used module
      if (savedModule && isValidModule(savedModule)) {
        setCurrentModule(savedModule as ModuleName);
      }
    } catch (error) {
      
    }
  };
  
  // Validate module name
  const isValidModule = (module: string): boolean => {
    const validModules: ModuleName[] = ['property', 'jobs', 'services', 'dating'];
    return validModules.includes(module as ModuleName);
  };
  
  // Update current module
  const updateCurrentModule = async (module: ModuleName) => {
    setCurrentModule(module);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_MODULE, module);
    } catch (error) {
      
    }
  };
  
  // Toggle dark mode
  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(newValue));
    } catch (error) {
      
    }
  };
  
  // Set dark mode explicitly
  const setDarkModeValue = async (enabled: boolean) => {
    setIsDarkMode(enabled);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(enabled));
    } catch (error) {
      
    }
  };
  
  // Get module theme
  const moduleTheme = createModuleTheme(currentModule);
  
  // Context value
  const contextValue: ThemeContextValue = {
    theme: defaultTheme,
    currentModule,
    moduleTheme,
    isDarkMode,
    setCurrentModule: updateCurrentModule,
    toggleDarkMode,
    setDarkMode: setDarkModeValue,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme context
 * @throws Error if used outside of ThemeProvider
 */
export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
};

/**
 * Hook to get theme with module override
 * Allows components to temporarily use a different module's theme
 */
export const useModuleTheme = (overrideModule?: ModuleName) => {
  const { theme, currentModule, moduleTheme, isDarkMode } = useThemeContext();
  
  if (overrideModule && overrideModule !== currentModule) {
    return {
      theme,
      moduleTheme: createModuleTheme(overrideModule),
      currentModule: overrideModule,
      isDarkMode,
    };
  }
  
  return {
    theme,
    moduleTheme,
    currentModule,
    isDarkMode,
  };
};

/**
 * Hook to get colors based on current module and dark mode
 */
export const useColors = (overrideModule?: ModuleName) => {
  const { moduleTheme, isDarkMode } = useModuleTheme(overrideModule);
  const { theme } = useThemeContext();
  
  // TODO: Implement dark mode color mapping
  // For now, return light mode colors
  return {
    ...theme.colors.common,
    module: moduleTheme.colors,
    base: theme.colors.base,
    social: theme.colors.social,
  };
};

/**
 * Hook to get typography styles
 */
export const useTypography = () => {
  const { theme } = useThemeContext();
  return theme.typography;
};

/**
 * Hook to get spacing values
 */
export const useSpacing = () => {
  const { theme } = useThemeContext();
  return {
    spacing: theme.spacing,
    layout: theme.layout,
  };
};

/**
 * Hook to get component styles for current module
 */
export const useComponentStyles = (overrideModule?: ModuleName) => {
  const { moduleTheme } = useModuleTheme(overrideModule);
  return moduleTheme.components;
};

export default ThemeProvider;
