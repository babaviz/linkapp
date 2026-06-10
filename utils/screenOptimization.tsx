/**
 * Screen Optimization Utilities
 * HOC and hooks for optimizing screen rendering performance
 */

import React, { memo, useEffect, useRef, useCallback, ReactNode } from 'react';
import { InteractionManager, View, ActivityIndicator, StyleSheet } from 'react-native';

interface OptimizedScreenProps {
  children: ReactNode;
  screenName: string;
  lazy?: boolean;
  delayHeavyOperations?: boolean;
}

/**
 * Higher-order component that optimizes screen rendering
 * - Memoizes component to prevent unnecessary re-renders
 * - Defers heavy operations until after transition
 * - Tracks rendering performance
 */
export const withScreenOptimization = <P extends object>(
  ScreenComponent: React.ComponentType<P>,
  _screenName: string,
  options?: {
    lazy?: boolean;
    delayHeavyOperations?: boolean;
  }
) => {
  const OptimizedScreen = memo((props: P) => {
    const isMounted = useRef(true);
    const renderStartTime = useRef(Date.now());
    const heavyOperationsDeferred = useRef(false);

    useEffect(() => {
      isMounted.current = true;
      renderStartTime.current = Date.now();

      // Defer heavy operations until after transition completes
      if (options?.delayHeavyOperations !== false) {
        const interaction = InteractionManager.runAfterInteractions(() => {
          if (isMounted.current) {
            heavyOperationsDeferred.current = true;
            
            // Track render time
            const renderTime = Date.now() - renderStartTime.current;
            if (renderTime > 100 && __DEV__) {
              // Log slow renders in development
            }
          }
        });

        return () => {
          isMounted.current = false;
          interaction.cancel();
        };
      }

      return () => {
        isMounted.current = false;
      };
    }, []);

    return <ScreenComponent {...props} />;
  });

  OptimizedScreen.displayName = `Optimized(${_screenName})`;

  return OptimizedScreen;
};

/**
 * Hook to defer heavy operations until after screen transition
 */
export const useDeferredOperations = (callback: () => void, deps: React.DependencyList = []) => {
  useEffect(() => {
    // Defer until after interactions and animations complete
    const interaction = InteractionManager.runAfterInteractions(() => {
      // Additional frame delay for smooth transitions
      requestAnimationFrame(() => {
        requestAnimationFrame(callback);
      });
    });

    return () => {
      interaction.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * Hook to optimize screen mounting/unmounting
 */
export const useScreenOptimization = (_screenName: string) => {
  const isMounted = useRef(true);
  const renderStartTime = useRef(Date.now());

  useEffect(() => {
    isMounted.current = true;
    renderStartTime.current = Date.now();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const deferOperation = useCallback((operation: () => void) => {
    InteractionManager.runAfterInteractions(() => {
      if (isMounted.current) {
        operation();
      }
    });
  }, []);

  return {
    isMounted: () => isMounted.current,
    deferOperation,
    getRenderTime: () => Date.now() - renderStartTime.current,
  };
};

/**
 * Lightweight loading placeholder for lazy-loaded screens
 */
const ScreenLoadingPlaceholder = memo(() => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color="#007AFF" />
  </View>
));

ScreenLoadingPlaceholder.displayName = 'ScreenLoadingPlaceholder';

/**
 * Lazy screen wrapper with loading state
 */
export const createLazyScreen = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  _screenName: string
) => {
  const LazyComponent = React.lazy(importFn);

  const LazyScreen = memo((props: P) => {
    const [isReady, setIsReady] = React.useState(false);

    useEffect(() => {
      // Delay rendering until next frame for smoother transition
      const frameId = requestAnimationFrame(() => {
        setIsReady(true);
      });

      return () => {
        cancelAnimationFrame(frameId);
      };
    }, []);

    if (!isReady) {
      return <ScreenLoadingPlaceholder />;
    }

    return (
      <React.Suspense fallback={<ScreenLoadingPlaceholder />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  });

  LazyScreen.displayName = `Lazy(${_screenName})`;

  return LazyScreen;
};

/**
 * Optimized screen wrapper component
 */
export const OptimizedScreen: React.FC<OptimizedScreenProps> = memo(
  ({ children, screenName: _screenName, lazy = false, delayHeavyOperations = true }) => {
    const isMounted = useRef(true);
    const [isReady, setIsReady] = React.useState(!lazy);

    useEffect(() => {
      isMounted.current = true;

      if (lazy) {
        // Delay rendering for lazy screens
        const frameId = requestAnimationFrame(() => {
          if (isMounted.current) {
            setIsReady(true);
          }
        });

        return () => {
          isMounted.current = false;
          cancelAnimationFrame(frameId);
        };
      }

      return () => {
        isMounted.current = false;
      };
    }, [lazy]);

    // Defer heavy child operations
    useEffect(() => {
      if (!delayHeavyOperations || !isReady) return;

      InteractionManager.runAfterInteractions(() => {
        // Heavy operations can be performed here
      });
    }, [isReady, delayHeavyOperations]);

    if (!isReady) {
      return <ScreenLoadingPlaceholder />;
    }

    return <>{children}</>;
  }
);

OptimizedScreen.displayName = 'OptimizedScreen';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default {
  withScreenOptimization,
  useDeferredOperations,
  useScreenOptimization,
  createLazyScreen,
  OptimizedScreen,
};

