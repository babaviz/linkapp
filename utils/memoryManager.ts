import { PerformanceConfig } from '../config/performance.config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
  accessCount: number;
}

// Type for cache entries with unknown data type
type UnknownCacheEntry = CacheEntry<unknown>;

class MemoryManager {
  private cache: Map<string, UnknownCacheEntry> = new Map();
  private totalCacheSize: number = 0;
  private pruneInterval: ReturnType<typeof setInterval> | null = null;
  private isMonitoring: boolean = false;

  constructor() {
    this.startMonitoring();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.pruneInterval = setInterval(() => {
      this.pruneCache();
    }, PerformanceConfig.memory.pruneInterval);

    // In Node/Jest, don't keep the process alive just for pruning.
    const interval = this.pruneInterval;
    if (interval !== null && typeof interval === 'object') {
      const maybeUnref = (interval as { unref?: unknown }).unref;
      if (typeof maybeUnref === 'function') {
        maybeUnref.call(interval);
      }
    }
  }

  stopMonitoring() {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }
    this.isMonitoring = false;
  }

  set<T>(key: string, data: T, estimatedSize?: number): boolean {
    const size = estimatedSize ?? this.estimateSize(data);

    // If replacing an existing key, account for the old entry size to avoid
    // unnecessary pruning and incorrect "cache full" rejections.
    const existingSize = this.cache.get(key)?.size ?? 0;
    const projectedTotal = this.totalCacheSize - existingSize + size;

    if (projectedTotal > PerformanceConfig.memory.maxCacheSize) {
      this.pruneCache();

      // Recompute after pruning (the existing key may have been pruned)
      const prunedExistingSize = this.cache.get(key)?.size ?? 0;
      const projectedAfterPrune = this.totalCacheSize - prunedExistingSize + size;

      if (projectedAfterPrune > PerformanceConfig.memory.maxCacheSize) {
        return false;
      }
    }

    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.totalCacheSize -= existingEntry.size;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
      accessCount: 0,
    });

    this.totalCacheSize += size;
    return true;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    entry.accessCount++;
    entry.timestamp = Date.now();
    
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    this.totalCacheSize -= entry.size;
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.totalCacheSize = 0;
  }

  private pruneCache(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000;
    
    const entries = Array.from(this.cache.entries());
    
    entries.sort((a, b) => {
      const scoreA = this.calculatePruneScore(a[1], now);
      const scoreB = this.calculatePruneScore(b[1], now);
      return scoreA - scoreB;
    });

    let freedSpace = 0;
    const targetFreeSpace = PerformanceConfig.memory.maxCacheSize * 0.2;

    for (const [key, entry] of entries) {
      if (freedSpace >= targetFreeSpace) break;
      
      const age = now - entry.timestamp;
      if (age > maxAge || entry.accessCount === 0) {
        this.delete(key);
        freedSpace += entry.size;
      }
    }
  }

  private calculatePruneScore(entry: UnknownCacheEntry, now: number): number {
    const age = now - entry.timestamp;
    const ageScore = age / (60 * 1000);
    // Never-accessed entries should be pruned first when space is needed.
    const accessScore = entry.accessCount > 0 ? 100 / entry.accessCount : 1000;
    const sizeScore = entry.size / (1024 * 1024);
    
    return ageScore + sizeScore - accessScore;
  }

  private estimateSize(data: unknown, seen: WeakSet<object> = new WeakSet()): number {
    if (typeof data === 'string') {
      return data.length * 2;
    }
    
    if (typeof data === 'number' || typeof data === 'boolean') {
      return 8;
    }
    
    if (Array.isArray(data)) {
      if (seen.has(data)) return 0;
      seen.add(data);
      return data.reduce((sum, item) => sum + this.estimateSize(item, seen), 0);
    }
    
    if (typeof data === 'object' && data !== null) {
      if (seen.has(data)) return 0;
      seen.add(data);
      return Object.entries(data).reduce(
        (sum, [key, value]) => sum + key.length * 2 + this.estimateSize(value, seen),
        0
      );
    }
    
    return 1024;
  }

  getStats() {
    return {
      totalSize: this.totalCacheSize,
      itemCount: this.cache.size,
      maxSize: PerformanceConfig.memory.maxCacheSize,
      utilizationPercent: (this.totalCacheSize / PerformanceConfig.memory.maxCacheSize) * 100,
    };
  }

  isHealthy(): boolean {
    const stats = this.getStats();
    return stats.utilizationPercent < 80;
  }
}

export const memoryManager = new MemoryManager();

export const useMemoryCache = <T>(key: string) => {
  const get = (): T | null => memoryManager.get<T>(key);
  const set = (data: T): boolean => memoryManager.set(key, data);
  const remove = (): boolean => memoryManager.delete(key);
  const exists = (): boolean => memoryManager.has(key);
  
  return { get, set, remove, exists };
};

export const clearMemoryCache = () => {
  memoryManager.clear();
};

export const getMemoryStats = () => {
  return memoryManager.getStats();
};

export const isMemoryHealthy = () => {
  return memoryManager.isHealthy();
};

// Type for listeners that have a remove method
interface RemovableListener {
  remove: () => void;
}

export class ComponentMemoryManager {
  private subscriptions: Map<string, () => void> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Map<string, RemovableListener> = new Map();

  registerSubscription(key: string, unsubscribe: () => void) {
    this.subscriptions.set(key, unsubscribe);
  }

  registerTimer(key: string, timer: ReturnType<typeof setTimeout>) {
    this.timers.set(key, timer);
  }

  registerListener(key: string, listener: RemovableListener) {
    this.listeners.set(key, listener);
  }

  cleanup() {
    this.subscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('Error cleaning up subscription:', error);
        }
      }
    });
    this.subscriptions.clear();

    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    this.listeners.forEach(listener => {
      try {
        if (typeof listener.remove === 'function') {
          listener.remove();
        }
      } catch (error) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('Error removing listener:', error);
        }
      }
    });
    this.listeners.clear();
  }

  getActiveCount() {
    return {
      subscriptions: this.subscriptions.size,
      timers: this.timers.size,
      listeners: this.listeners.size,
    };
  }
}

export const createComponentMemoryManager = () => new ComponentMemoryManager();
