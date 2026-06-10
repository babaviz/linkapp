/**
 * Performance Optimization System
 * Ensures smooth UI polish without performance regressions
 */

import React from 'react';
import { InteractionManager, DeviceEventEmitter, Platform } from 'react-native';
import { UIPolishSystem } from './uiPolishSystem';
import { AccessibilitySystem } from './accessibilitySystem';

export interface PerformanceConfig {
  maxConcurrentAnimations: number;
  enableNativeDriver: boolean;
  batchAnimations: boolean;
  frameRateTarget: number;
  memoryThreshold: number;
  enableProfiling: boolean;
}

export interface PerformanceMetrics {
  animationCount: number;
  memoryUsage: number;
  frameDrops: number;
  lastFrameTime: number;
  averageFrameTime: number;
}

export class PerformanceSystem {
  private static config: PerformanceConfig = {
    maxConcurrentAnimations: 8,
    enableNativeDriver: true,
    batchAnimations: true,
    frameRateTarget: 60,
    memoryThreshold: 150, // MB
    enableProfiling: __DEV__,
  };

  private static metrics: PerformanceMetrics = {
    animationCount: 0,
    memoryUsage: 0,
    frameDrops: 0,
    lastFrameTime: 0,
    averageFrameTime: 16.67, // 60fps target
  };

  private static animationQueue: (() => void)[] = [];
  private static isProcessingQueue = false;
  private static frameCallbacks: (() => void)[] = [];
  private static performanceListeners: ((metrics: PerformanceMetrics) => void)[] = [];

  // Initialize performance system
  static initialize() {
    if (this.config.enableProfiling) {
      this.setupPerformanceMonitoring();
    }
    
    // Configure systems based on device capabilities
    this.detectDeviceCapabilities();
    
    // Start performance monitoring
    this.startFrameRateMonitoring();
  }

  // Detect device capabilities and adjust settings
  private static detectDeviceCapabilities() {
    // Basic device capability detection
    // In a real app, you might want to use a library like react-native-device-info
    
    // Adjust animation limits based on platform
    if (Platform.OS === 'android') {
      // Android devices might need more conservative settings
      this.config.maxConcurrentAnimations = 6;
    }

    // Reduce animations on older devices (this is a simplified check)
    const version = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    if (version < 13) {
      this.config.maxConcurrentAnimations = 4;
      UIPolishSystem.configure({ animationScale: 0.8 });
    }
  }

  // Queue animation for performance-aware execution
  static queueAnimation(animationFn: () => void, priority: 'high' | 'normal' | 'low' = 'normal') {
    if (!this.config.batchAnimations) {
      animationFn();
      return;
    }

    // Check if we're under the concurrent animation limit
    if (this.metrics.animationCount < this.config.maxConcurrentAnimations) {
      this.executeAnimation(animationFn);
    } else {
      // Queue for later execution
      if (priority === 'high') {
        this.animationQueue.unshift(animationFn);
      } else {
        this.animationQueue.push(animationFn);
      }
      this.processAnimationQueue();
    }
  }

  // Execute animation with tracking
  private static executeAnimation(animationFn: () => void) {
    this.metrics.animationCount++;
    
    try {
      animationFn();
    } catch (error) {
    }

    // Use InteractionManager to ensure animations don't block interactions
    InteractionManager.runAfterInteractions(() => {
      this.metrics.animationCount = Math.max(0, this.metrics.animationCount - 1);
      this.processAnimationQueue();
    });
  }

  // Process queued animations
  private static processAnimationQueue() {
    if (this.isProcessingQueue || this.animationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Process queue on next frame
    requestAnimationFrame(() => {
      while (
        this.animationQueue.length > 0 && 
        this.metrics.animationCount < this.config.maxConcurrentAnimations
      ) {
        const animationFn = this.animationQueue.shift();
        if (animationFn) {
          this.executeAnimation(animationFn);
        }
      }
      this.isProcessingQueue = false;
    });
  }

  // Frame rate monitoring
  private static startFrameRateMonitoring() {
    if (!this.config.enableProfiling) return;

    let lastTime = performance.now();
    let frameCount = 0;
    const frameTimes: number[] = [];
    
    const measureFrame = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      lastTime = currentTime;
      
      frameTimes.push(frameTime);
      frameCount++;
      
      // Calculate metrics every second
      if (frameCount >= 60) {
        const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
        const frameDrops = frameTimes.filter(time => time > 20).length; // 20ms = dropped frame at 60fps
        
        this.metrics.averageFrameTime = avgFrameTime;
        this.metrics.frameDrops += frameDrops;
        this.metrics.lastFrameTime = currentTime;
        
        // Notify listeners
        this.notifyPerformanceListeners();
        
        // Auto-adjust if performance is poor
        this.autoAdjustPerformance(avgFrameTime, frameDrops);
        
        // Reset for next measurement
        frameTimes.length = 0;
        frameCount = 0;
      }
      
      // Continue monitoring
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  // Auto-adjust performance settings based on metrics
  private static autoAdjustPerformance(avgFrameTime: number, frameDrops: number) {
    // If we're dropping too many frames, reduce animation complexity
    if (frameDrops > 10 || avgFrameTime > 20) {
      if (this.config.maxConcurrentAnimations > 2) {
        this.config.maxConcurrentAnimations -= 1;
        UIPolishSystem.configure({ animationScale: 0.7 });
      }
    } else if (frameDrops < 2 && avgFrameTime < 16) {
      // Performance is good, we can increase complexity slightly
      if (this.config.maxConcurrentAnimations < 8) {
        this.config.maxConcurrentAnimations += 1;
        UIPolishSystem.configure({ animationScale: 1.0 });
      }
    }
  }

  // Memory monitoring
  static monitorMemoryUsage() {
    if (!this.config.enableProfiling) return;

    // Note: React Native doesn't have built-in memory monitoring
    // This would require a native module or third-party library
    // For now, we'll simulate memory monitoring
    
    setInterval(() => {
      // Simulate memory check
      const simulatedMemoryUsage = Math.random() * 200; // MB
      this.metrics.memoryUsage = simulatedMemoryUsage;
      
      if (simulatedMemoryUsage > this.config.memoryThreshold) {
        this.handleHighMemoryUsage();
      }
    }, 5000);
  }

  // Handle high memory usage
  private static handleHighMemoryUsage() {
    // Reduce animation complexity
    UIPolishSystem.configure({ 
      animationScale: 0.5,
      enableAnimations: false 
    });
    
    // Clear animation queue
    this.animationQueue.length = 0;
    
    // Notify accessibility system
    AccessibilitySystem.announceAction('Performance mode enabled to save memory');
  }

  // Performance-aware component rendering
  static shouldAnimateComponent(componentId: string): boolean {
    // Skip animations if we're at the limit
    if (this.metrics.animationCount >= this.config.maxConcurrentAnimations) {
      return false;
    }

    // Skip animations if accessibility requires reduced motion
    const accessibilityConfig = AccessibilitySystem.getConfig();
    if (accessibilityConfig.reduceMotion) {
      return false;
    }

    // Skip animations if performance is poor
    if (this.metrics.frameDrops > 5 || this.metrics.averageFrameTime > 20) {
      return false;
    }

    return true;
  }

  // Batch DOM updates for better performance
  static batchUpdate(updateFn: () => void) {
    InteractionManager.runAfterInteractions(() => {
      try {
        updateFn();
      } catch (error) {
      }
    });
  }

  // Optimize image loading
  static getOptimizedImageProps(uri: string, size: { width: number; height: number }) {
    return {
      source: { uri },
      style: size,
      resizeMode: 'cover' as const,
      // Enable image caching
      cache: 'force-cache' as const,
      // Lazy loading for better performance
      loading: 'lazy' as const,
    };
  }

  // List optimization helpers
  static getOptimizedListProps(itemCount: number) {
    return {
      windowSize: 10, // Render 10 items around visible area
      initialNumToRender: 10, // Initial render count
      maxToRenderPerBatch: 5, // Batch size for incremental rendering
      updateCellsBatchingPeriod: 16, // 60fps batching
      removeClippedSubviews: itemCount > 50, // Remove off-screen items for large lists
      getItemLayout: itemCount > 100 ? undefined : (data: any, index: number) => ({
        length: 80, // Estimated item height
        offset: 80 * index,
        index,
      }),
    };
  }

  // Network request optimization
  static optimizeNetworkRequests() {
    // This would integrate with your network layer
    return {
      timeout: 10000,
      retry: 2,
      // Batch requests when possible
      batchingEnabled: true,
      // Cache responses
      cacheEnabled: true,
    };
  }

  // Setup performance monitoring listeners
  private static setupPerformanceMonitoring() {
    if (Platform.OS === 'ios') {
      // iOS-specific performance monitoring
      DeviceEventEmitter.addListener('memoryWarning', () => {
        this.handleHighMemoryUsage();
      });
    }

  // Global error boundary for performance issues
    if (__DEV__) {
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        if (args[0] && args[0].includes('VirtualizedList')) {
          // Handle VirtualizedList performance warnings
          this.handleListPerformanceWarning();
        }
        originalConsoleWarn.apply(console, args);
      };
    }
  }

  // Handle list performance warnings
  private static handleListPerformanceWarning() {
    // You could emit an event here to update list components
    DeviceEventEmitter.emit('optimizeListRendering');
  }

  // Performance metrics API
  static getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  static addPerformanceListener(callback: (metrics: PerformanceMetrics) => void) {
    this.performanceListeners.push(callback);
    return () => {
      const index = this.performanceListeners.indexOf(callback);
      if (index > -1) {
        this.performanceListeners.splice(index, 1);
      }
    };
  }

  private static notifyPerformanceListeners() {
    this.performanceListeners.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
      }
    });
  }

  // Integration helpers for different backends
  static getReduxMiddleware() {
    return (store: any) => (next: any) => (action: any) => {
      // Batch Redux updates for better performance
      this.batchUpdate(() => {
        return next(action);
      });
    };
  }

  static getSupabaseConfig() {
    return {
      // Optimize Supabase connections
      db: {
        schema: 'public',
        headers: { 'x-client-info': 'mynumbapp' },
      },
      realtime: {
        // Reduce realtime update frequency for better performance
        params: {
          eventsPerSecond: 5,
        },
      },
    };
  }

  static getStreamChatConfig() {
    return {
      // Optimize Stream Chat performance
      options: {
        // Limit message history for better performance
        limit: 25,
        // Reduce polling frequency
        longPollTimeout: 30000,
      },
    };
  }

  // Development helpers
  static enableDevMode() {
    this.config.enableProfiling = true;
  }

  static disableDevMode() {
    this.config.enableProfiling = false;
  }

  // Reset performance state
  static reset() {
    this.metrics = {
      animationCount: 0,
      memoryUsage: 0,
      frameDrops: 0,
      lastFrameTime: 0,
      averageFrameTime: 16.67,
    };
    this.animationQueue.length = 0;
    this.isProcessingQueue = false;
  }
}

// React Hook for performance monitoring
export const usePerformance = () => {
  const [metrics, setMetrics] = React.useState(PerformanceSystem.getMetrics());

  React.useEffect(() => {
    const unsubscribe = PerformanceSystem.addPerformanceListener(setMetrics);
    return unsubscribe;
  }, []);

  return {
    metrics,
    shouldAnimate: PerformanceSystem.shouldAnimateComponent,
    queueAnimation: PerformanceSystem.queueAnimation,
    batchUpdate: PerformanceSystem.batchUpdate,
    getOptimizedImageProps: PerformanceSystem.getOptimizedImageProps,
    getOptimizedListProps: PerformanceSystem.getOptimizedListProps,
  };
};

export default PerformanceSystem;
