import { InteractionManager, Platform } from 'react-native';
import { PerformanceConfig } from '../config/performance.config';
import { memoryManager } from './memoryManager';
import { performanceMonitor } from './performanceMonitor';

class PerformanceOptimizer {
  private isOptimizing = false;
  private optimizationInterval: ReturnType<typeof setInterval> | null = null;

  startOptimization() {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    performanceMonitor.startMonitoring();
    
    this.optimizationInterval = setInterval(() => {
      this.runOptimizationCycle();
    }, PerformanceConfig.monitoring.reportInterval);
  }

  stopOptimization() {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    
    this.isOptimizing = false;
    performanceMonitor.stopMonitoring();
  }

  private runOptimizationCycle() {
    InteractionManager.runAfterInteractions(() => {
      const memoryStats = memoryManager.getStats();
      
      if (memoryStats.utilizationPercent > 80) {
        this.optimizeMemory();
      }

      const performanceReport = performanceMonitor.getReport();
      
      if (performanceReport.averageFPS < PerformanceConfig.monitoring.fpsThreshold) {
        this.optimizeRendering();
      }
    });
  }

  private optimizeMemory() {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Performance] Running memory optimization');
    }
    
    memoryManager.clear();

    if (global.gc) {
      global.gc();
    }
  }

  private optimizeRendering() {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Performance] Running rendering optimization');
    }
  }

  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (__DEV__ && duration > 1000) {
        // eslint-disable-next-line no-console
        console.warn(`[Performance] Slow operation: ${operationName} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error(`[Performance] Operation failed: ${operationName} after ${duration}ms`);
      }
      throw error;
    }
  }

  deferTask(task: () => void, priority: 'high' | 'normal' | 'low' = 'normal') {
    const delay = {
      high: 0,
      normal: 100,
      low: 500,
    }[priority];

    setTimeout(() => {
      InteractionManager.runAfterInteractions(task);
    }, delay);
  }

  async runAfterInteractions<T>(task: () => T | Promise<T>): Promise<T> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(async () => {
        const result = await task();
        resolve(result);
      });
    });
  }

  optimizeImages() {
    return {
      maxWidth: PerformanceConfig.images.maxWidth,
      maxHeight: PerformanceConfig.images.maxHeight,
      quality: PerformanceConfig.images.quality,
      format: PerformanceConfig.images.format,
    };
  }

  getOptimizationReport() {
    const performanceReport = performanceMonitor.getReport();
    const memoryStats = memoryManager.getStats();
    
    return {
      performance: performanceReport,
      memory: memoryStats,
      isHealthy: this.isSystemHealthy(),
      recommendations: this.getRecommendations(),
    };
  }

  private isSystemHealthy(): boolean {
    const performanceReport = performanceMonitor.getReport();
    const memoryStats = memoryManager.getStats();
    
    return (
      performanceReport.averageFPS >= PerformanceConfig.monitoring.fpsThreshold &&
      memoryStats.utilizationPercent < 80 &&
      performanceReport.appLaunchTime < PerformanceConfig.monitoring.startupThreshold
    );
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    const performanceReport = performanceMonitor.getReport();
    const memoryStats = memoryManager.getStats();

    if (performanceReport.appLaunchTime > PerformanceConfig.monitoring.startupThreshold) {
      recommendations.push('Reduce app startup time by deferring non-critical initializations');
    }

    if (performanceReport.averageFPS < PerformanceConfig.monitoring.fpsThreshold) {
      recommendations.push('Optimize animations and reduce re-renders');
    }

    if (memoryStats.utilizationPercent > 80) {
      recommendations.push('Clear memory caches and optimize data structures');
    }

    if (Object.keys(performanceReport.apiResponseTimes).some(
      endpoint => performanceReport.apiResponseTimes[endpoint].p95 > PerformanceConfig.monitoring.apiResponseThreshold
    )) {
      recommendations.push('Optimize API calls and implement caching');
    }

    return recommendations;
  }

  enablePerformanceMode() {
    if (Platform.OS === 'android' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Performance] Performance mode enabled');
    }
  }
}

export const performanceOptimizer = new PerformanceOptimizer();

export const measurePerformance = async <T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> => {
  return performanceOptimizer.measureOperation(operationName, operation);
};

export const deferTask = (
  task: () => void,
  priority: 'high' | 'normal' | 'low' = 'normal'
) => {
  performanceOptimizer.deferTask(task, priority);
};

export const runAfterInteractions = async <T>(
  task: () => T | Promise<T>
): Promise<T> => {
  return performanceOptimizer.runAfterInteractions(task);
};

export const getPerformanceReport = () => {
  return performanceOptimizer.getOptimizationReport();
};

export const startPerformanceOptimization = () => {
  performanceOptimizer.startOptimization();
};

export const stopPerformanceOptimization = () => {
  performanceOptimizer.stopOptimization();
};
