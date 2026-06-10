import { AppState, AppStateStatus, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
}

interface BatteryInfo {
  level: number;
  isCharging: boolean;
  isLowPower: boolean;
}

interface ResourceOptimizationConfig {
  enableAutomaticCleanup: boolean;
  memoryThresholdMB: number;
  batteryThreshold: number;
  cleanupIntervalMs: number;
}

class ResourceOptimizer {
  private static instance: ResourceOptimizer;
  private config: ResourceOptimizationConfig = {
    enableAutomaticCleanup: true,
    memoryThresholdMB: 100, // Trigger cleanup above 100MB
    batteryThreshold: 20, // Enter low power mode below 20%
    cleanupIntervalMs: 30000, // Check every 30 seconds
  };
  
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private memoryWarningListeners: Set<() => void> = new Set();
  private batteryWarningListeners: Set<() => void> = new Set();
  private appState: AppStateStatus = 'active';
  private lastCleanupTime: number = 0;
  private isLowMemory: boolean = false;
  private isLowBattery: boolean = false;
  
  private cleanupCallbacks: Array<() => Promise<void>> = [];
  private activeTimers: Set<ReturnType<typeof setTimeout>> = new Set();
  private activeIntervals: Set<ReturnType<typeof setInterval>> = new Set();

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): ResourceOptimizer {
    if (!ResourceOptimizer.instance) {
      ResourceOptimizer.instance = new ResourceOptimizer();
    }
    return ResourceOptimizer.instance;
  }

  private initializeMonitoring() {
    // Monitor app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // Start monitoring if enabled
    if (this.config.enableAutomaticCleanup) {
      this.startMonitoring();
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasInBackground = this.appState === 'background';
    this.appState = nextAppState;

    if (nextAppState === 'background') {
      // App moved to background - aggressive cleanup
      this.performBackgroundCleanup();
    } else if (wasInBackground && nextAppState === 'active') {
      // App returned from background
      this.resumeMonitoring();
    }
  };

  private startMonitoring() {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.checkResourceUsage();
    }, this.config.cleanupIntervalMs);

    // Initial check
    this.checkResourceUsage();
  }

  private stopMonitoring() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private resumeMonitoring() {
    if (this.config.enableAutomaticCleanup) {
      this.startMonitoring();
    }
  }

  private async checkResourceUsage() {
    const memoryInfo = await this.getMemoryInfo();
    const batteryInfo = await this.getBatteryInfo();

    // Check memory usage
    if (memoryInfo.used > this.config.memoryThresholdMB) {
      if (!this.isLowMemory) {
        this.isLowMemory = true;
        
        this.notifyMemoryWarning();
        await this.performMemoryCleanup();
      }
    } else {
      this.isLowMemory = false;
    }

    // Check battery level
    if (batteryInfo.level < this.config.batteryThreshold && !batteryInfo.isCharging) {
      if (!this.isLowBattery) {
        this.isLowBattery = true;
        // Memory usage tracked
        this.notifyBatteryWarning();
        this.enableLowPowerMode();
      }
    } else if (batteryInfo.level > this.config.batteryThreshold + 5 || batteryInfo.isCharging) {
      if (this.isLowBattery) {
        this.isLowBattery = false;
        this.disableLowPowerMode();
      }
    }
  }

  async getMemoryInfo(): Promise<MemoryInfo> {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Get total device memory
        const totalMemory = Device.totalMemory || 0;
        
        // Estimate used memory (this is a simplified approach)
        // In production, you might want to use native modules for accurate measurements
        const usedMemory = await this.estimateMemoryUsage();
        
        return {
          total: Math.round(totalMemory / 1024 / 1024), // Convert to MB
          used: usedMemory,
          percentage: totalMemory > 0 ? (usedMemory * 1024 * 1024 / totalMemory) * 100 : 0,
        };
      }
    } catch (error) {
      
    }

    return { total: 0, used: 0, percentage: 0 };
  }

  private async estimateMemoryUsage(): Promise<number> {
    // Estimate memory usage based on cached data and other factors
    let estimatedMB = 50; // Base app memory

    try {
      // Check AsyncStorage size
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          estimatedMB += value.length / 1024 / 1024;
        }
      }
    } catch (error) {
      
    }

    return Math.round(estimatedMB);
  }

  async getBatteryInfo(): Promise<BatteryInfo> {
    try {
      // In production, you would use expo-battery or a native module
      // For now, returning mock data
      return {
        level: 75,
        isCharging: false,
        isLowPower: false,
      };
    } catch (error) {
      
      return {
        level: 100,
        isCharging: false,
        isLowPower: false,
      };
    }
  }

  private async performMemoryCleanup() {
    const now = Date.now();
    
    // Prevent cleanup from running too frequently
    if (now - this.lastCleanupTime < 10000) {
      return;
    }
    
    this.lastCleanupTime = now;

    try {
      // Run all registered cleanup callbacks
      await Promise.all(
        this.cleanupCallbacks.map(callback => 
          callback().catch(error => {
            // Handle cleanup error
          })
        )
      );

      // Clear image cache if needed
      const { clearImageCache, getImageCacheInfo } = await import('../components/common/OptimizedImage');
      const cacheInfo = getImageCacheInfo();
      
      if (cacheInfo.sizeMB > 20) {
        await clearImageCache();
        
      }

      // Clear network cache if needed
      const { clearNetworkCache, getNetworkCacheStats } = await import('./networkOptimizer');
      const networkStats = getNetworkCacheStats();
      
      if (networkStats.sizeMB > 10) {
        await clearNetworkCache();
        
      }

      // Force garbage collection if available (V8 only)
      if (global.gc) {
        global.gc();
        
      }

    } catch (error) {
      
    }
  }

  private async performBackgroundCleanup() {

    // Cancel all registered timers
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
    
    // Cancel all registered intervals
    this.activeIntervals.forEach(interval => clearInterval(interval));
    this.activeIntervals.clear();
    
    // Perform memory cleanup
    await this.performMemoryCleanup();
    
    // Stop monitoring while in background
    this.stopMonitoring();
  }

  private enableLowPowerMode() {

    // Reduce network polling frequency
    DeviceEventEmitter.emit('lowPowerMode', true);
    
    // Reduce animation frame rate
    if (Platform.OS === 'android') {
      // Android-specific optimizations
      DeviceEventEmitter.emit('reduceAnimations', true);
    }
    
    // Increase cleanup interval to save battery
    this.config.cleanupIntervalMs = 60000; // Check every minute instead
    
    // Restart monitoring with new interval
    this.stopMonitoring();
    this.startMonitoring();
  }

  private disableLowPowerMode() {

    DeviceEventEmitter.emit('lowPowerMode', false);
    DeviceEventEmitter.emit('reduceAnimations', false);
    
    // Restore normal cleanup interval
    this.config.cleanupIntervalMs = 30000;
    
    // Restart monitoring with normal interval
    this.stopMonitoring();
    this.startMonitoring();
  }

  // Register a cleanup callback
  registerCleanupCallback(callback: () => Promise<void>) {
    this.cleanupCallbacks.push(callback);
  }

  // Unregister a cleanup callback
  unregisterCleanupCallback(callback: () => Promise<void>) {
    const index = this.cleanupCallbacks.indexOf(callback);
    if (index > -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  // Register a timer (for cleanup tracking)
  registerTimer(timer: ReturnType<typeof setTimeout>): ReturnType<typeof setTimeout> {
    this.activeTimers.add(timer);
    return timer;
  }

  // Unregister a timer
  unregisterTimer(timer: ReturnType<typeof setTimeout>) {
    this.activeTimers.delete(timer);
    clearTimeout(timer);
  }

  // Register an interval (for cleanup tracking)
  registerInterval(interval: ReturnType<typeof setInterval>): ReturnType<typeof setInterval> {
    this.activeIntervals.add(interval);
    return interval;
  }

  // Unregister an interval
  unregisterInterval(interval: ReturnType<typeof setInterval>) {
    this.activeIntervals.delete(interval);
    clearInterval(interval);
  }

  // Subscribe to memory warnings
  onMemoryWarning(callback: () => void) {
    this.memoryWarningListeners.add(callback);
    return () => this.memoryWarningListeners.delete(callback);
  }

  // Subscribe to battery warnings
  onBatteryWarning(callback: () => void) {
    this.batteryWarningListeners.add(callback);
    return () => this.batteryWarningListeners.delete(callback);
  }

  private notifyMemoryWarning() {
    this.memoryWarningListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        
      }
    });
  }

  private notifyBatteryWarning() {
    this.batteryWarningListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        
      }
    });
  }

  // Manual cleanup trigger
  async triggerCleanup() {
    await this.performMemoryCleanup();
  }

  // Get current resource status
  async getResourceStatus() {
    const memory = await this.getMemoryInfo();
    const battery = await this.getBatteryInfo();
    
    return {
      memory,
      battery,
      isLowMemory: this.isLowMemory,
      isLowBattery: this.isLowBattery,
      isLowPowerMode: this.isLowBattery,
    };
  }

  // Update configuration
  updateConfig(config: Partial<ResourceOptimizationConfig>) {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring with new config
    if (this.config.enableAutomaticCleanup) {
      this.stopMonitoring();
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  }
}

// Export singleton instance
export const resourceOptimizer = ResourceOptimizer.getInstance();

// Export convenience functions
export const registerCleanup = (callback: () => Promise<void>) => {
  resourceOptimizer.registerCleanupCallback(callback);
};

export const triggerManualCleanup = () => {
  return resourceOptimizer.triggerCleanup();
};

export const getResourceStatus = () => {
  return resourceOptimizer.getResourceStatus();
};

// Export managed timer/interval functions
export const createManagedTimer = (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
  const timer = setTimeout(callback, delay);
  return resourceOptimizer.registerTimer(timer);
};

export const createManagedInterval = (callback: () => void, delay: number): ReturnType<typeof setInterval> => {
  const interval = setInterval(callback, delay);
  return resourceOptimizer.registerInterval(interval);
};

export const clearManagedTimer = (timer: ReturnType<typeof setTimeout>) => {
  resourceOptimizer.unregisterTimer(timer);
};

export const clearManagedInterval = (interval: ReturnType<typeof setInterval>) => {
  resourceOptimizer.unregisterInterval(interval);
};

// React hooks
import { useEffect, useState } from 'react';

export const useResourceMonitor = () => {
  const [status, setStatus] = useState<any>(null);
  
  useEffect(() => {
    const updateStatus = async () => {
      const resourceStatus = await resourceOptimizer.getResourceStatus();
      setStatus(resourceStatus);
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return status;
};

export const useMemoryWarning = (callback: () => void) => {
  useEffect(() => {
    const unsubscribe = resourceOptimizer.onMemoryWarning(callback);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [callback]);
};

export const useBatteryWarning = (callback: () => void) => {
  useEffect(() => {
    const unsubscribe = resourceOptimizer.onBatteryWarning(callback);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [callback]);
};

// Export types
