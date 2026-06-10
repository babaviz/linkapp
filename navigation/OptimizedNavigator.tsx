import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { InteractionManager, Platform } from 'react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationState,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { performanceMonitor } from '../utils/performanceMonitor';

// Enable native screens for better performance
enableScreens(true);

interface OptimizedNavigatorProps {
  children: React.ReactNode;
  onStateChange?: (state: NavigationState | undefined) => void;
  linking?: any;
}

// Higher-order component to optimize screen components
export const withScreenOptimization = <P extends object>(
  ScreenComponent: React.ComponentType<P>,
  screenName: string
) => {
  const OptimizedScreen = memo((props: P) => {
    const isMounted = useRef(true);
    const renderStartTime = useRef(Date.now());

    useEffect(() => {
      // Track screen transition performance
      performanceMonitor.startScreenTransition(screenName);
      
      // Use InteractionManager to delay heavy operations
      const interaction = InteractionManager.runAfterInteractions(() => {
        if (isMounted.current) {
          performanceMonitor.endScreenTransition(screenName);
          
          const renderTime = Date.now() - renderStartTime.current;
          if (renderTime > 100) {
            
          }
        }
      });

      return () => {
        isMounted.current = false;
        interaction.cancel();
      };
    }, []);

    // Track frame updates for FPS monitoring
    useEffect(() => {
      const frameCallback = () => {
        if (isMounted.current) {
          performanceMonitor.recordFrame();
          requestAnimationFrame(frameCallback);
        }
      };
      
      const frameId = requestAnimationFrame(frameCallback);
      
      return () => {
        cancelAnimationFrame(frameId);
      };
    }, []);

    return <ScreenComponent {...props} />;
  });

  OptimizedScreen.displayName = `Optimized(${screenName})`;
  
  return OptimizedScreen;
};

// Custom navigation options for performance
export const getOptimizedScreenOptions = (isHighPriority: boolean = false) => {
  const baseOptions = {
    animation: Platform.select({
      ios: 'default',
      android: isHighPriority ? 'none' : 'fade',
    }),
    animationDuration: isHighPriority ? 0 : 250,
    gestureEnabled: !isHighPriority,
    cardStyleInterpolator: isHighPriority ? undefined : ({ current: { progress } }: any) => ({
      cardStyle: {
        opacity: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    }),
  };

  if (Platform.OS === 'android') {
    return {
      ...baseOptions,
      // Android-specific optimizations
      detachPreviousScreen: !isHighPriority,
      freezeOnBlur: true,
      lazy: !isHighPriority,
    };
  }

  return baseOptions;
};

// Optimized Stack Navigator options
export const optimizedStackNavigatorConfig = {
  screenOptions: {
    headerShown: true,
    ...Platform.select({
      android: {
        // Android optimizations
        animation: 'fade',
        animationDuration: 250,
        detachPreviousScreen: false,
        freezeOnBlur: true,
      },
      ios: {
        // iOS optimizations
        animation: 'default',
        gestureEnabled: true,
      },
    }),
  },
};

// Optimized Tab Navigator options
export const optimizedTabNavigatorConfig = {
  screenOptions: {
    lazy: true,
    unmountOnBlur: false,
    tabBarHideOnKeyboard: Platform.OS === 'android',
    ...Platform.select({
      android: {
        // Reduce overdraw on Android
        tabBarStyle: {
          elevation: 0,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
        },
      },
      ios: {
        tabBarStyle: {
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
      },
    }),
  },
  // Tab bar performance options
  tabBarOptions: {
    renderIndicator: () => null, // Disable indicator for better performance
    optimizationsEnabled: true,
    removeClippedSubviews: Platform.OS === 'android',
  },
};

// Navigation performance monitor
class NavigationPerformanceMonitor {
  private transitionStartTimes: Map<string, number> = new Map();
  private screenRenderTimes: Map<string, number[]> = new Map();

  startTransition(routeName: string) {
    this.transitionStartTimes.set(routeName, Date.now());
  }

  endTransition(routeName: string) {
    const startTime = this.transitionStartTimes.get(routeName);
    if (startTime) {
      const duration = Date.now() - startTime;
      
      const times = this.screenRenderTimes.get(routeName) || [];
      times.push(duration);
      
      // Keep only last 10 measurements
      if (times.length > 10) times.shift();
      
      this.screenRenderTimes.set(routeName, times);
      this.transitionStartTimes.delete(routeName);

      // Log slow transitions
      if (duration > 300) {
        
      }
    }
  }

  getAverageTransitionTime(routeName: string): number {
    const times = this.screenRenderTimes.get(routeName);
    if (!times || times.length === 0) return 0;
    
    return Math.round(
      times.reduce((a, b) => a + b, 0) / times.length
    );
  }

  getAllMetrics() {
    const metrics: Record<string, { avg: number; count: number }> = {};
    
    this.screenRenderTimes.forEach((times, route) => {
      metrics[route] = {
        avg: this.getAverageTransitionTime(route),
        count: times.length,
      };
    });
    
    return metrics;
  }
}

const navPerfMonitor = new NavigationPerformanceMonitor();

// Optimized Navigation Container
const OptimizedNavigator: React.FC<OptimizedNavigatorProps> = memo(({
  children,
  onStateChange,
  linking,
}) => {
  const navigationRef = useNavigationContainerRef();
  const previousRouteNameRef = useRef<string | undefined>(undefined);
  
  const handleStateChange = useCallback((state: NavigationState | undefined) => {
    if (state) {
      const currentRouteName = state.routes[state.index]?.name;
      
      if (currentRouteName && currentRouteName !== previousRouteNameRef.current) {
        // Track navigation performance
        navPerfMonitor.endTransition(currentRouteName);
        
        // Start monitoring for next transition
        navPerfMonitor.startTransition(currentRouteName);
        
        previousRouteNameRef.current = currentRouteName;
      }
    }
    
    onStateChange?.(state);
  }, [onStateChange]);

  // Memoize navigation theme for performance
  const navigationTheme = useMemo(() => ({
    dark: false,
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#000000',
      border: '#E0E0E0',
      notification: '#FF453A',
    },
  }), []);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onStateChange={handleStateChange}
      linking={linking}
      documentTitle={{
        enabled: false, // Disable for performance on Android
      }}
    >
      {children}
    </NavigationContainer>
  );
});

OptimizedNavigator.displayName = 'OptimizedNavigator';

// Export navigation performance utilities
export const getNavigationMetrics = () => navPerfMonitor.getAllMetrics();

// Hook for optimized navigation
export const useOptimizedNavigation = () => {
  const navigation = useNavigationContainerRef();
  
  const navigate = useCallback((name: string, params?: any) => {
    // Defer navigation to next frame for smoother animations
    requestAnimationFrame(() => {
      if (navigation.isReady()) {
        navPerfMonitor.startTransition(name);
        (navigation as any).navigate(name, params);
      }
    });
  }, [navigation]);
  
  const goBack = useCallback(() => {
    requestAnimationFrame(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    });
  }, [navigation]);
  
  return {
    navigate,
    goBack,
    navigation,
  };
};

// Lazy loading wrapper for screens
export const lazyScreen = (
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  screenName: string
) => {
  const LazyComponent = React.lazy(importFn);
  
  return memo((props: any) => {
    const [isReady, setIsReady] = React.useState(false);
    
    useEffect(() => {
      // Delay rendering for smooth transition
      const timer = requestAnimationFrame(() => {
        setIsReady(true);
      });
      
      return () => cancelAnimationFrame(timer);
    }, []);
    
    if (!isReady) {
      return null; // Or a lightweight placeholder
    }
    
    return (
      <React.Suspense fallback={null}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  });
};

export default OptimizedNavigator;
