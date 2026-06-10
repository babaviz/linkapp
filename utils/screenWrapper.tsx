/**
 * Universal Screen Wrapper
 * Automatically optimizes all screens for 60 FPS performance
 * Defers heavy operations, reduces re-renders, and ensures smooth transitions
 */

import React, { memo, useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface ScreenWrapperOptions {
  /**
   * Screen name for tracking
   */
  screenName: string;
  
  /**
   * Whether to defer all heavy operations until after transition
   */
  deferHeavyOperations?: boolean;
  
  /**
   * Whether to defer data loading
   */
  deferDataLoading?: boolean;
  
  /**
   * Whether to reload data on focus (useFocusEffect)
   */
  reloadOnFocus?: boolean;
  
  /**
   * Custom onMount callback (will be deferred if deferHeavyOperations is true)
   */
  onMount?: () => void | Promise<void>;
  
  /**
   * Custom onFocus callback (will be deferred)
   */
  onFocus?: () => void | Promise<void>;
  
  /**
   * Whether this screen needs fast initial render
   */
  fastRender?: boolean;
}

/**
 * Higher-order component that wraps screens with automatic performance optimizations
 */
export function withScreenWrapper<P extends object>(
  ScreenComponent: React.ComponentType<P>,
  options: ScreenWrapperOptions
) {
  const OptimizedScreen = memo((props: P) => {
    const isMountedRef = useRef(true);
    const hasRenderedRef = useRef(false);
    const onMountCalledRef = useRef(false);

    // Immediate render optimization - show screen immediately
    useEffect(() => {
      isMountedRef.current = true;
      
      // Request immediate render for fast visual feedback
      if (options.fastRender !== false) {
        requestAnimationFrame(() => {
          hasRenderedRef.current = true;
        });
      } else {
        hasRenderedRef.current = true;
      }

      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // Deferred mount operations
    useEffect(() => {
      if (!isMountedRef.current || onMountCalledRef.current) return;
      
      const executeMount = () => {
        if (!isMountedRef.current) return;
        onMountCalledRef.current = true;
        
        if (options.onMount) {
          if (options.deferHeavyOperations !== false) {
            // Defer heavy operations until after transition
            InteractionManager.runAfterInteractions(() => {
              requestAnimationFrame(() => {
                if (isMountedRef.current) {
                  Promise.resolve(options.onMount?.()).catch((error) => {
                    // Non-critical: screen mount operation failed
                  });
                }
              });
            });
          } else {
            // Execute immediately if not deferring
            Promise.resolve(options.onMount?.()).catch((error) => {
              // Non-critical: screen mount operation failed
            });
          }
        }
      };

      if (options.fastRender !== false) {
        // Fast render: show screen immediately, defer operations
        requestAnimationFrame(() => {
          requestAnimationFrame(executeMount);
        });
      } else {
        executeMount();
      }
    }, []);

    // Optimized focus effect - only reload if explicitly requested
    const reloadOnFocus = options.reloadOnFocus;
    const onFocus = options.onFocus;
    useFocusEffect(
      useCallback(() => {
        if (!reloadOnFocus || !onFocus) return;

        const executeFocus = () => {
          if (!isMountedRef.current) return;
          
          // Defer focus operations
          InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
              if (isMountedRef.current && onFocus) {
                Promise.resolve(onFocus()).catch((error) => {
                  // Non-critical: screen focus operation failed
                });
              }
            });
          });
        };

        // Small delay to ensure transition is complete
        const timeoutId = setTimeout(executeFocus, 100);
        
        return () => {
          clearTimeout(timeoutId);
        };
      }, [reloadOnFocus, onFocus])
    );

    return <ScreenComponent {...props} />;
  });

  OptimizedScreen.displayName = `ScreenWrapper(${options.screenName})`;
  
  return OptimizedScreen;
}

/**
 * Hook for optimized screen operations
 */
export function useOptimizedScreen(options: {
  screenName: string;
  onMount?: () => void | Promise<void>;
  onFocus?: () => void | Promise<void>;
  deferOperations?: boolean;
}) {
  const isMountedRef = useRef(true);
  const onMountCalledRef = useRef(false);
  const { onMount, onFocus, deferOperations } = options;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Deferred mount
  useEffect(() => {
    if (!onMount || onMountCalledRef.current) return;
    
    const execute = () => {
      if (!isMountedRef.current) return;
      onMountCalledRef.current = true;
      
      if (deferOperations !== false) {
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            if (isMountedRef.current && onMount) {
              Promise.resolve(onMount()).catch((error) => {
                // Non-critical: mount failed
              });
            }
          });
        });
      } else {
        Promise.resolve(onMount()).catch((error) => {
          // Non-critical: mount failed
        });
      }
    };

    // Delay for smooth transition
    requestAnimationFrame(() => {
      requestAnimationFrame(execute);
    });
  }, [onMount, deferOperations]);

  // Optimized focus effect
  useFocusEffect(
    useCallback(() => {
      if (!onFocus) return;

      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && onFocus) {
          InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current && onFocus) {
              Promise.resolve(onFocus()).catch((error) => {
                // Non-critical: focus failed
              });
            }
          });
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [onFocus])
  );

  return {
    isMounted: () => isMountedRef.current,
  };
}

/**
 * Defer operation until after transition
 */
export function deferOperation(callback: () => void | Promise<void>) {
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        Promise.resolve(callback()).catch((error) => {
          // Non-critical: deferred operation failed
        });
      });
    });
  });
}

/**
 * Fast operation - execute on next frame
 */
export function fastOperation(callback: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

export default {
  withScreenWrapper,
  useOptimizedScreen,
  deferOperation,
  fastOperation,
};

