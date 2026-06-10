/**
 * Simplified Theme Provider without circular dependencies
 * This will replace the complex theme system temporarily
 */

import React, { createContext, useContext, ReactNode } from 'react';

// Simple theme interface
interface SimpleTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    white: string;
    black: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

// Default theme
const defaultTheme: SimpleTheme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6366F1', 
    background: '#FFFFFF',
    text: '#1F2937',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

// Context
const SimpleThemeContext = createContext<SimpleTheme>(defaultTheme);

// Provider component
interface SimpleThemeProviderProps {
  children: ReactNode;
  theme?: SimpleTheme;
}

export const SimpleThemeProvider: React.FC<SimpleThemeProviderProps> = ({
  children,
  theme = defaultTheme,
}) => {
  return (
    <SimpleThemeContext.Provider value={theme}>
      {children}
    </SimpleThemeContext.Provider>
  );
};

// Hook to use theme
export const useSimpleTheme = (): SimpleTheme => {
  const context = useContext(SimpleThemeContext);
  if (!context) {
    throw new Error('useSimpleTheme must be used within a SimpleThemeProvider');
  }
  return context;
};

export default SimpleThemeProvider;
