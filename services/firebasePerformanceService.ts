import { Platform } from 'react-native';

// Lazy load Firebase modules to prevent crash if not available.
// Use modular API to avoid deprecated namespaced warnings.
let firebaseAppModule: any = null;
let perfModule: any = null;
let crashlyticsModule: any = null;

try {
  firebaseAppModule = require('@react-native-firebase/app');
} catch {
  // Firebase app module not available - performance monitoring will be disabled
}

class FirebasePerformanceService {
  private static instance: FirebasePerformanceService;
  private initialized = false;
  private activeTraces: Map<string, any> = new Map();
  private appStartTime: number;

  private constructor() {
    this.appStartTime = Date.now();
  }

  static getInstance(): FirebasePerformanceService {
    if (!FirebasePerformanceService.instance) {
      FirebasePerformanceService.instance = new FirebasePerformanceService();
    }
    return FirebasePerformanceService.instance;
  }

  private getFirebaseAppSafe(): any | null {
    try {
      const getApps = firebaseAppModule?.getApps;
      const getApp = firebaseAppModule?.getApp;
      if (typeof getApps !== 'function' || typeof getApp !== 'function') {
        return null;
      }
      const apps = getApps();
      if (!Array.isArray(apps) || apps.length === 0) {
        return null;
      }
      return getApp();
    } catch {
      return null;
    }
  }

  private getPerformanceSafe(): any | null {
    try {
      const app = this.getFirebaseAppSafe();
      if (!app) return null;

      if (!perfModule) {
        perfModule = require('@react-native-firebase/perf');
      }
      const getPerformance = perfModule?.getPerformance;
      if (typeof getPerformance !== 'function') {
        return null;
      }
      return getPerformance(app);
    } catch {
      return null;
    }
  }

  private getCrashlyticsSafe(): any | null {
    try {
      const app = this.getFirebaseAppSafe();
      if (!app) return null;

      if (!crashlyticsModule) {
        crashlyticsModule = require('@react-native-firebase/crashlytics');
      }
      const getCrashlytics = crashlyticsModule?.getCrashlytics;
      if (typeof getCrashlytics !== 'function') {
        return null;
      }
      return getCrashlytics();
    } catch {
      return null;
    }
  }

  /**
   * Initialize performance monitoring and crashlytics
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const perfInstance = this.getPerformanceSafe();
      const crashInstance = this.getCrashlyticsSafe();
      if (!perfInstance || !crashInstance) {
        // Firebase not available/configured, skip initialization
        return;
      }
      // Enable performance monitoring
      await perfInstance.setPerformanceCollectionEnabled(true);
      
      // Enable crashlytics
      await crashInstance.setCrashlyticsCollectionEnabled(true);
      
      this.initialized = true;
    } catch (error) {
      // Silently handle initialization errors
      if (__DEV__) {
        console.warn('[FirebasePerformance] Initialization failed:', error);
      }
    }
  }

  /**
   * Check if performance monitoring is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ===================== APP STARTUP PERFORMANCE =====================

  /**
   * Track app start time
   */
  async trackAppStartTime(): Promise<void> {
    try {
      const perfInstance = this.getPerformanceSafe();
      if (!perfInstance) return;
      const startupTime = Date.now() - this.appStartTime;
      const trace = await perfInstance.newTrace('app_start');
      
      await trace.start();
      await trace.putMetric('startup_time_ms', startupTime);
      await trace.putAttribute('platform', Platform.OS);
      await trace.stop();
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  /**
   * Track time to interactive
   */
  async trackTimeToInteractive(): Promise<void> {
    try {
      const perfInstance = this.getPerformanceSafe();
      if (!perfInstance) return;
      const timeToInteractive = Date.now() - this.appStartTime;
      const trace = await perfInstance.newTrace('time_to_interactive');
      
      await trace.start();
      await trace.putMetric('tti_ms', timeToInteractive);
      await trace.putAttribute('platform', Platform.OS);
      await trace.stop();
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  // ===================== SCREEN RENDERING =====================

  /**
   * Start tracking screen rendering
   */
  async startScreenTrace(screenName: string): Promise<void> {
    try {
      const perfInstance = this.getPerformanceSafe();
      if (!perfInstance) return;

      const traceName = `screen_${screenName}`;
      
      // Stop any existing trace for this screen
      if (this.activeTraces.has(traceName)) {
        await this.stopScreenTrace(screenName);
      }
      
      const trace = await perfInstance.newTrace(traceName);
      await trace.start();
      
      this.activeTraces.set(traceName, {
        trace,
        startTime: Date.now(),
      });
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  /**
   * Stop tracking screen rendering
   */
  async stopScreenTrace(screenName: string, metadata?: { [key: string]: string }): Promise<void> {
    try {
      const traceName = `screen_${screenName}`;
      const traceData = this.activeTraces.get(traceName);
      
      if (!traceData) {
        return;
      }
      
      const { trace, startTime } = traceData;
      const renderTime = Date.now() - startTime;
      
      await trace.putMetric('render_time_ms', renderTime);
      await trace.putAttribute('screen_name', screenName);
      
      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          await trace.putAttribute(key, value);
        }
      }
      
      await trace.stop();
      this.activeTraces.delete(traceName);
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  // ===================== CUSTOM TRACES =====================

  /**
   * Start a custom trace
   */
  async startTrace(traceName: string): Promise<void> {
    try {
      const perfInstance = this.getPerformanceSafe();
      if (!perfInstance) return;

      // Clean trace name (Firebase has restrictions)
      const cleanName = this.cleanTraceName(traceName);
      
      // Stop any existing trace with the same name
      if (this.activeTraces.has(cleanName)) {
        await this.stopTrace(traceName);
      }
      
      const trace = await perfInstance.newTrace(cleanName);
      await trace.start();
      
      this.activeTraces.set(cleanName, {
        trace,
        startTime: Date.now(),
      });
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  /**
   * Stop a custom trace
   */
  async stopTrace(traceName: string, metrics?: { [key: string]: number }, attributes?: { [key: string]: string }): Promise<void> {
    try {
      const cleanName = this.cleanTraceName(traceName);
      const traceData = this.activeTraces.get(cleanName);
      
      if (!traceData) {
        return;
      }
      
      const { trace, startTime } = traceData;
      const duration = Date.now() - startTime;
      
      // Add duration metric
      await trace.putMetric('duration_ms', duration);
      
      // Add custom metrics
      if (metrics) {
        for (const [key, value] of Object.entries(metrics)) {
          await trace.putMetric(key, value);
        }
      }
      
      // Add custom attributes
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          await trace.putAttribute(key, value);
        }
      }
      
      await trace.stop();
      this.activeTraces.delete(cleanName);
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  /**
   * Measure a synchronous operation
   */
  async measureOperation<T>(operationName: string, operation: () => T, attributes?: { [key: string]: string }): Promise<T> {
    await this.startTrace(operationName);
    
    try {
      const result = operation();
      await this.stopTrace(operationName, undefined, attributes);
      return result;
    } catch (error) {
      await this.stopTrace(operationName, undefined, { ...attributes, error: 'true' });
      throw error;
    }
  }

  /**
   * Measure an asynchronous operation
   */
  async measureAsyncOperation<T>(operationName: string, operation: () => Promise<T>, attributes?: { [key: string]: string }): Promise<T> {
    await this.startTrace(operationName);
    
    try {
      const result = await operation();
      await this.stopTrace(operationName, undefined, attributes);
      return result;
    } catch (error) {
      await this.stopTrace(operationName, undefined, { ...attributes, error: 'true' });
      throw error;
    }
  }

  // ===================== NETWORK PERFORMANCE =====================

  /**
   * Track HTTP request performance
   * Note: Firebase Performance automatically tracks network requests,
   * but you can use this for custom tracking
   */
  async trackNetworkRequest(url: string, method: string, duration: number, statusCode: number, success: boolean): Promise<void> {
    try {
      const perfInstance = this.getPerformanceSafe();
      if (!perfInstance) return;

      // Valid HTTP methods for Firebase Performance
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];
      const httpMethod = validMethods.includes(method.toUpperCase()) ? method.toUpperCase() : 'GET';
      
      const trace = await perfInstance.newHttpMetric(url, httpMethod as any);
      
      await trace.start();
      await trace.setHttpResponseCode(statusCode);
      await trace.setResponseContentType('application/json');
      await trace.putAttribute('success', success.toString());
      await trace.stop();
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  // ===================== PAYMENT PERFORMANCE =====================

  /**
   * Track payment processing time
   */
  async trackPaymentProcessing(tier: string, duration: string): Promise<void> {
    try {
      await this.startTrace(`payment_${tier}_${duration}`);
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  /**
   * Complete payment processing tracking
   */
  async completePaymentProcessing(tier: string, duration: string, success: boolean, processingTime?: number): Promise<void> {
    try {
      const metrics = processingTime ? { processing_time_ms: processingTime } : undefined;
      const attributes = {
        tier,
        duration,
        success: success.toString(),
      };
      
      await this.stopTrace(`payment_${tier}_${duration}`, metrics, attributes);
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }

  // ===================== CRASHLYTICS =====================

  /**
   * Log an error to Crashlytics
   */
  async logError(error: Error, context?: string): Promise<void> {
    try {
      const crashInstance = this.getCrashlyticsSafe();
      if (!crashInstance) return;
      if (context) {
        crashInstance.log(`Context: ${context}`);
      }
      crashInstance.recordError(error);
    } catch (e) {
      // Silently handle crashlytics errors
    }
  }

  /**
   * Log a non-fatal error
   */
  async logNonFatalError(message: string, metadata?: { [key: string]: any }): Promise<void> {
    try {
      const crashInstance = this.getCrashlyticsSafe();
      if (!crashInstance) return;

      crashInstance.log(message);
      
      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          await crashInstance.setAttribute(key, String(value));
        }
      }
    } catch (error) {
      // Silently handle crashlytics errors
    }
  }

  /**
   * Set user identifier for crash reports
   */
  async setUserId(userId: string): Promise<void> {
    try {
      const crashInstance = this.getCrashlyticsSafe();
      if (!crashInstance) return;
      await crashInstance.setUserId(userId);
    } catch (error) {
      // Silently handle crashlytics errors
    }
  }

  /**
   * Set custom key-value pairs for crash reports
   */
  async setCrashAttribute(key: string, value: string): Promise<void> {
    try {
      const crashInstance = this.getCrashlyticsSafe();
      if (!crashInstance) return;
      await crashInstance.setAttribute(key, value);
    } catch (error) {
      // Silently handle crashlytics errors
    }
  }

  /**
   * Set multiple crash attributes at once
   */
  async setCrashAttributes(attributes: { [key: string]: string }): Promise<void> {
    try {
      const crashInstance = this.getCrashlyticsSafe();
      if (!crashInstance) return;
      await crashInstance.setAttributes(attributes);
    } catch (error) {
      // Silently handle crashlytics errors
    }
  }

  /**
   * Enable/disable crash collection
   */
  async setCrashCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      const crashInstance = this.getCrashlyticsSafe();
      if (!crashInstance) return;
      await crashInstance.setCrashlyticsCollectionEnabled(enabled);
    } catch (error) {
      // Silently handle crashlytics errors
    }
  }

  /**
   * Check if app crashed on previous execution
   */
  async didCrashOnPreviousExecution(): Promise<boolean> {
    try {
      const crashInstance = this.getCrashlyticsSafe();
      if (!crashInstance) return false;
      return await crashInstance.didCrashOnPreviousExecution();
    } catch (error) {
      return false;
    }
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Clean trace name to meet Firebase requirements
   * - Must start with a letter
   * - Can only contain letters, numbers, and underscores
   * - Max 100 characters
   */
  private cleanTraceName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[^a-zA-Z]+/, '')
      .substring(0, 100);
  }

  /**
   * Stop all active traces (call this on app cleanup)
   */
  async stopAllTraces(): Promise<void> {
    try {
      const traceNames = Array.from(this.activeTraces.keys());
      
      for (const traceName of traceNames) {
        const traceData = this.activeTraces.get(traceName);
        if (traceData) {
          await traceData.trace.stop();
        }
      }
      
      this.activeTraces.clear();
    } catch (error) {
      // Silently handle performance tracking errors
    }
  }
}

let instance: FirebasePerformanceService | null = null;
const handler: ProxyHandler<FirebasePerformanceService> = {
  get(target, prop) {
    if (!instance) instance = FirebasePerformanceService.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
};
export default new Proxy({} as FirebasePerformanceService, handler);
