import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceMonitor } from './performanceMonitor';

interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTime?: number; // in milliseconds
  offlineMode?: boolean;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  headers?: Record<string, string>;
}

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  effectiveType?: string;
}

class NetworkOptimizer {
  private static instance: NetworkOptimizer;
  private networkStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  };
  private requestQueue: Map<string, RequestConfig> = new Map();
  private responseCache: Map<string, CachedResponse> = new Map();
  private readonly maxCacheSize = 100; // Maximum number of cached responses
  private readonly defaultCacheTime = 5 * 60 * 1000; // 5 minutes
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;
  private isProcessingQueue = false;

  private constructor() {
    this.initNetworkListener();
    this.loadCacheFromStorage();
  }

  static getInstance(): NetworkOptimizer {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer();
    }
    return NetworkOptimizer.instance;
  }

  private initNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const previousStatus = this.networkStatus.isConnected;
      
      this.networkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        effectiveType: (state.details as any)?.cellularGeneration,
      };

      // Process queued requests when connection is restored
      if (!previousStatus && this.networkStatus.isConnected) {
        
        this.processRequestQueue();
      }

      // Log network status changes
      if (previousStatus !== this.networkStatus.isConnected) {
        // Network status changed
      }
    });
  }

  private async loadCacheFromStorage() {
    try {
      const cacheData = await AsyncStorage.getItem('@network_cache');
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        this.responseCache = new Map(Object.entries(parsed));
        
        // Clean expired entries
        this.cleanExpiredCache();
      }
    } catch (error) {
      
    }
  }

  private async saveCacheToStorage() {
    try {
      const cacheData = Object.fromEntries(this.responseCache);
      await AsyncStorage.setItem('@network_cache', JSON.stringify(cacheData));
    } catch (error) {
      
    }
  }

  private getCacheKey(config: RequestConfig): string {
    const { url, method = 'GET', body } = config;
    return `${method}_${url}_${body ? JSON.stringify(body) : ''}`;
  }

  private cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.responseCache.forEach((response, key) => {
      if (now - response.timestamp > this.defaultCacheTime) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.responseCache.delete(key));

    // Limit cache size
    if (this.responseCache.size > this.maxCacheSize) {
      const sortedEntries = Array.from(this.responseCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, this.responseCache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.responseCache.delete(key));
    }
  }

  async makeRequest<T = any>(config: RequestConfig): Promise<T> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.maxRetries,
      cache = true,
      cacheTime = this.defaultCacheTime,
      offlineMode = true,
    } = config;

    const cacheKey = this.getCacheKey(config);
    const endTimer = performanceMonitor.startApiCall(url);

    // Check cache first
    if (cache && method === 'GET') {
      const cachedResponse = this.responseCache.get(cacheKey);
      
      if (cachedResponse) {
        const age = Date.now() - cachedResponse.timestamp;
        
        if (age < cacheTime) {
          // Request completed
          endTimer();
          return cachedResponse.data as T;
        }
      }
    }

    // Check network status
    if (!this.networkStatus.isConnected) {

      if (offlineMode) {
        // Try to get any cached version (even if expired)
        const cachedResponse = this.responseCache.get(cacheKey);
        if (cachedResponse) {
          
          endTimer();
          return cachedResponse.data as T;
        }
        
        // Queue the request for later
        this.queueRequest(config);
        throw new Error('No network connection. Request queued for later.');
      }
      
      throw new Error('No network connection available.');
    }

    // Check for poor network conditions
    const isPoorNetwork = this.networkStatus.effectiveType === '2g' || 
                          this.networkStatus.effectiveType === 'slow-2g';
    
    const actualTimeout = isPoorNetwork ? timeout * 2 : timeout;
    const actualRetries = isPoorNetwork ? retries + 1 : retries;

    // Make the actual request with retry logic
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= actualRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Cache successful GET responses
        if (cache && method === 'GET') {
          const cachedResponse: CachedResponse = {
            data,
            timestamp: Date.now(),
            headers: Object.fromEntries(response.headers.entries()),
          };
          
          this.responseCache.set(cacheKey, cachedResponse);
          this.saveCacheToStorage();
        }

        endTimer();
        return data as T;
        
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          throw error;
        }

        // Don't retry if it's the last attempt
        if (attempt < actualRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    endTimer();
    
    // Try offline cache as last resort
    if (offlineMode) {
      const cachedResponse = this.responseCache.get(cacheKey);
      if (cachedResponse) {
        
        return cachedResponse.data as T;
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  private queueRequest(config: RequestConfig) {
    const key = this.getCacheKey(config);
    this.requestQueue.set(key, config);
    
  }

  private async processRequestQueue() {
    if (this.isProcessingQueue || this.requestQueue.size === 0) {
      return;
    }

    this.isProcessingQueue = true;

    const requests = Array.from(this.requestQueue.values());
    this.requestQueue.clear();

    for (const config of requests) {
      try {
        await this.makeRequest(config);
        
      } catch (error) {
        
      }
    }

    this.isProcessingQueue = false;
  }

  // Preload data for offline use
  async preloadData(urls: string[]) {

    const promises = urls.map(url => 
      this.makeRequest({ 
        url, 
        cache: true, 
        cacheTime: 24 * 60 * 60 * 1000 // Cache for 24 hours
      }).catch(error => {
        
      })
    );

    await Promise.all(promises);
    
  }

  // Get current network status
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  // Check if network is fast enough for certain operations
  isHighBandwidth(): boolean {
    const fastTypes = ['wifi', '4g', '5g'];
    return fastTypes.includes(this.networkStatus.type) || 
           fastTypes.includes(this.networkStatus.effectiveType || '');
  }

  // Clear all cached responses
  async clearCache() {
    this.responseCache.clear();
    await AsyncStorage.removeItem('@network_cache');
    
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let totalSize = 0;
    let expiredCount = 0;

    this.responseCache.forEach(response => {
      totalSize += JSON.stringify(response.data).length;
      if (now - response.timestamp > this.defaultCacheTime) {
        expiredCount++;
      }
    });

    return {
      entries: this.responseCache.size,
      sizeBytes: totalSize,
      sizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      expiredEntries: expiredCount,
      queuedRequests: this.requestQueue.size,
    };
  }
}

// Export singleton instance
export const networkOptimizer = NetworkOptimizer.getInstance();

// Export convenience functions
export const optimizedFetch = <T = any>(config: RequestConfig): Promise<T> => {
  return networkOptimizer.makeRequest<T>(config);
};

export const preloadForOffline = (urls: string[]) => {
  return networkOptimizer.preloadData(urls);
};

export const getNetworkStatus = () => {
  return networkOptimizer.getNetworkStatus();
};

export const isHighBandwidth = () => {
  return networkOptimizer.isHighBandwidth();
};

export const clearNetworkCache = () => {
  return networkOptimizer.clearCache();
};

export const getNetworkCacheStats = () => {
  return networkOptimizer.getCacheStats();
};

// Export React hook for network status
import { useEffect, useState } from 'react';

export const useNetworkStatus = () => {
  const [status, setStatus] = useState(networkOptimizer.getNetworkStatus());

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        effectiveType: (state.details as any)?.cellularGeneration,
      });
    });

    return unsubscribe;
  }, []);

  return status;
};

// Export types
export type { RequestConfig, NetworkStatus, CachedResponse };
