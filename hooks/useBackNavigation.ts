/**
 * useBackNavigation Hook
 * Provides consistent back navigation handling across the app
 * Handles both Android hardware back button and UI back buttons
 */

import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { navigateToMainTab, type MainTabRouteName } from '../navigation/mainTabNavigation';

interface UseBackNavigationOptions {
  /**
   * Custom handler for back press
   * Return true to prevent default behavior
   * Return false to allow default navigation
   */
  onBackPress?: () => boolean | void;
  
  /**
   * Whether to handle hardware back button
   * Default: true on Android, false on iOS
   */
  handleHardwareBack?: boolean;
  
  /**
   * Fallback screen to navigate when can't go back
   */
  fallbackScreen?: string;
}

/**
 * Hook for handling back navigation consistently
 * @param options Configuration options for back navigation
 */
export function useBackNavigation(options: UseBackNavigationOptions = {}) {
  const navigation = useNavigation();
  const route = useRoute();
  const { 
    onBackPress, 
    handleHardwareBack = Platform.OS === 'android',
    fallbackScreen 
  } = options;

  const currentRouteName = (route as { name?: string } | undefined)?.name;

  const navigateToFallback = useCallback((): boolean => {
    if (!fallbackScreen || fallbackScreen === currentRouteName) {
      return false;
    }

    // Prefer navigating within the current navigator when possible
    const state = (navigation as any).getState?.();
    const routeNames: unknown = state?.routeNames;
    if (Array.isArray(routeNames) && routeNames.includes(fallbackScreen)) {
      (navigation as any).navigate(fallbackScreen);
      return true;
    }

    // If fallback is a main tab route, navigate via the root `MainTabs` screen
    // (works even when current screen is in the root stack, not inside the tab navigator).
    const mainTabRoutes = new Set(['PropertyHub', 'JobsMain', 'ServicesMain', 'DateMiMain', 'ProfileMain']);
    if (mainTabRoutes.has(fallbackScreen)) {
      navigateToMainTab(navigation as any, fallbackScreen as MainTabRouteName);
      return true;
    }

    // Otherwise, attempt a normal navigation (may bubble to parent navigators)
    ;(navigation as any).navigate(fallbackScreen);
    return true;
  }, [fallbackScreen, currentRouteName, navigation]);

  // Handle navigation back action
  const handleBack = useCallback(() => {
    // If custom handler is provided and returns true, don't navigate
    if (onBackPress) {
      const handled = onBackPress();
      if (handled === true) {
        return;
      }
    }

    // Try to go back
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigateToFallback();
    }
  }, [navigation, onBackPress, navigateToFallback]);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      if (!handleHardwareBack) {
        return;
      }

      const onHardwareBackPress = () => {
        // If custom handler is provided
        if (onBackPress) {
          const handled = onBackPress();
          // If handler returns true, prevent default
          if (handled === true) {
            return true;
          }
        }

        // Default behavior: go back if possible
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }

        if (navigateToFallback()) {
          return true;
        }
        
        // Let system handle if we can't navigate
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBackPress
      );

      return () => subscription.remove();
    }, [handleHardwareBack, navigation, onBackPress, navigateToFallback])
  );

  return {
    handleBack,
    canGoBack: navigation.canGoBack(),
  };
}

/**
 * Hook specifically for screens with view modes
 * Handles switching between views before navigating back
 */
export function useViewModeBackNavigation(
  currentViewMode: string,
  defaultViewMode: string,
  setViewMode: (mode: string) => void,
  options: UseBackNavigationOptions = {}
) {
  const navigation = useNavigation();

  const handleViewModeBack = useCallback(() => {
    // If not in default view mode, switch back to it
    if (currentViewMode !== defaultViewMode) {
      setViewMode(defaultViewMode);
      return true; // Prevent default back behavior
    }
    // Let default navigation happen
    return false;
  }, [currentViewMode, defaultViewMode, setViewMode]);

  // Use the base hook with custom handler
  const backNavigation = useBackNavigation({
    ...options,
    onBackPress: () => {
      // First check view mode handler
      const handled = handleViewModeBack();
      if (handled) return true;
      
      // Then check if custom handler exists
      if (options.onBackPress) {
        return options.onBackPress();
      }
      
      return false;
    }
  });

  return {
    ...backNavigation,
    handleViewModeBack,
  };
}
