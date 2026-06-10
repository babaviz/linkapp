import { PerformanceObserver } from 'perf_hooks';
import { AppState, AppStateStatus } from 'react-native';

interface PerformanceMetrics {
  appLaunchTime: number;
  screenTransitionTimes: Map<string, number>;
  apiResponseTimes: Map<string, number[]>;
  memoryUsage: number[];
  fps: number[];
  batteryLevel?: number;
  lowFPSCount: number;
  criticalFPSCount: number;
  lastFPSWarning?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    appLaunchTime: 0,
    screenTransitionTimes: new Map(),
    apiResponseTimes: new Map(),
    memoryUsage: [],
    fps: [],
    lowFPSCount: 0,
    criticalFPSCount: 0,
  };
  
  private appStartTime: number = Date.now();
  private lastFrameTime: number = Date.now();
  private frameCount: number = 0;
  private fpsInterval?: ReturnType<typeof setInterval>;
  private memoryInterval?: ReturnType<typeof setInterval>;
  private isMonitoring: boolean = false;

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        this.startMonitoring();
      } else if (nextAppState === 'background') {
        this.stopMonitoring();
      }
    });
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Monitor FPS
    this.fpsInterval = setInterval(() => {
      this.calculateFPS();
    }, 1000);

    // Monitor memory usage
    this.memoryInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5000);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = undefined;
    }
    
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = undefined;
    }
  }

  // App launch slow warning
  recordAppLaunch() {
    this.metrics.appLaunchTime = Date.now() - this.appStartTime;
    
    if (this.metrics.appLaunchTime > 3000) {
      // App launch took too long
    } else {
      // App launched quickly
    }
  }

  // Track screen transitions
  startScreenTransition(screenName: string) {
    this.metrics.screenTransitionTimes.set(screenName, Date.now());
  }

  endScreenTransition(screenName: string) {
    const startTime = this.metrics.screenTransitionTimes.get(screenName);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.metrics.screenTransitionTimes.set(screenName, duration);
      
      if (duration > 300) {
        // Screen transition slow
      }
    }
  }

  // Track API response times
  startApiCall(endpoint: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      const times = this.metrics.apiResponseTimes.get(endpoint) || [];
      times.push(duration);
      
      // Keep only last 100 measurements
      if (times.length > 100) times.shift();
      
      this.metrics.apiResponseTimes.set(endpoint, times);
      
      if (duration > 2000) {
        // API call took too long
      }
    };
  }

  // Calculate FPS
  private calculateFPS() {
    const now = Date.now();
    const delta = now - this.lastFrameTime;
    const fps = this.frameCount > 0 ? Math.round(1000 / (delta / this.frameCount)) : 60;
    
    this.metrics.fps.push(fps);
    
    // Keep only last 60 measurements
    if (this.metrics.fps.length > 60) this.metrics.fps.shift();
    
    // Track low FPS occurrences
    if (fps < 30) {
      this.metrics.criticalFPSCount++;
      this.metrics.lastFPSWarning = now;
      // Critical FPS drop
    } else if (fps < 55) {
      this.metrics.lowFPSCount++;
    }
    
    this.frameCount = 0;
    this.lastFrameTime = now;
  }

  // Monitor frame updates
  recordFrame() {
    this.frameCount++;
  }

  // Check memory usage
  private checkMemoryUsage() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memoryMB = Math.round(((performance as any).memory as any).usedJSHeapSize / 1048576);
      this.metrics.memoryUsage.push(memoryMB);
      
      // Keep only last 100 measurements
      if (this.metrics.memoryUsage.length > 100) this.metrics.memoryUsage.shift();
      
      // Warn if memory usage is high
      if (memoryMB > 150) {
        // High memory usage warning
      }
    }
  }

  // Get performance report
  getReport() {
    const avgFPS = this.metrics.fps.length > 0
      ? Math.round(this.metrics.fps.reduce((a, b) => a + b, 0) / this.metrics.fps.length)
      : 0;
      
    const avgMemory = this.metrics.memoryUsage.length > 0
      ? Math.round(this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length)
      : 0;

    const apiStats: { [key: string]: { avg: number; p95: number } } = {};
    
    this.metrics.apiResponseTimes.forEach((times, endpoint) => {
      if (times.length > 0) {
        const sorted = [...times].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        
        apiStats[endpoint] = {
          avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          p95: sorted[p95Index] || sorted[sorted.length - 1],
        };
      }
    });

    return {
      appLaunchTime: this.metrics.appLaunchTime,
      averageFPS: avgFPS,
      averageMemoryMB: avgMemory,
      apiResponseTimes: apiStats,
      screenTransitions: Object.fromEntries(this.metrics.screenTransitionTimes),
    };
  }

  // Check if metrics meet performance targets
  meetsPerformanceTargets(): boolean {
    const report = this.getReport();
    
    // Check app launch time (< 3 seconds)
    if (report.appLaunchTime > 3000) return false;
    
    // Check FPS (>= 60)
    if (report.averageFPS < 55) return false;
    
    // Check API response times (95% < 2 seconds)
    for (const endpoint in report.apiResponseTimes) {
      if (report.apiResponseTimes[endpoint].p95 > 2000) return false;
    }
    
    // Check memory usage (< 150MB average)
    if (report.averageMemoryMB > 150) return false;
    
    return true;
  }

  // Clear all metrics
  reset() {
    this.metrics = {
      appLaunchTime: 0,
      screenTransitionTimes: new Map(),
      apiResponseTimes: new Map(),
      memoryUsage: [],
      fps: [],
      lowFPSCount: 0,
      criticalFPSCount: 0
    };
    this.appStartTime = Date.now();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export helper hooks for React components
export const usePerformanceMonitor = () => {
  return performanceMonitor;
};

// Export types
export type { PerformanceMetrics };
