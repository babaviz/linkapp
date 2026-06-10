import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoordinates } from '../types/property';

interface CachedLocation {
  coordinates: LocationCoordinates;
  timestamp: number;
  accuracy?: number;
}

interface LocationCache {
  current: CachedLocation | null;
  history: CachedLocation[];
}

class LocationCacheService {
  private readonly CACHE_KEY = 'user_location_cache';
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000;
  private readonly MAX_HISTORY_SIZE = 10;
  private memoryCache: LocationCache | null = null;

  async getCachedLocation(): Promise<LocationCoordinates | null> {
    try {
      if (this.memoryCache?.current) {
        const isExpired = Date.now() - this.memoryCache.current.timestamp > this.CACHE_EXPIRY_MS;
        if (!isExpired) {
          return this.memoryCache.current.coordinates;
        }
      }

      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const locationCache: LocationCache = JSON.parse(cached);
      
      if (!locationCache.current) return null;

      const isExpired = Date.now() - locationCache.current.timestamp > this.CACHE_EXPIRY_MS;
      if (isExpired) {
        return null;
      }

      this.memoryCache = locationCache;
      return locationCache.current.coordinates;
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to get cached location:', error);
      }
      return null;
    }
  }

  async cacheLocation(coordinates: LocationCoordinates, accuracy?: number): Promise<void> {
    try {
      const cached: CachedLocation = {
        coordinates,
        timestamp: Date.now(),
        accuracy
      };

      let locationCache: LocationCache = {
        current: cached,
        history: []
      };

      const existing = await AsyncStorage.getItem(this.CACHE_KEY);
      if (existing) {
        const existingCache: LocationCache = JSON.parse(existing);
        locationCache.history = existingCache.history || [];
        
        if (existingCache.current) {
          locationCache.history.unshift(existingCache.current);
        }
      }

      locationCache.history = locationCache.history.slice(0, this.MAX_HISTORY_SIZE);

      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(locationCache));
      this.memoryCache = locationCache;
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to cache location:', error);
      }
    }
  }

  async getLocationHistory(): Promise<CachedLocation[]> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) return [];

      const locationCache: LocationCache = JSON.parse(cached);
      return locationCache.history || [];
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to get location history:', error);
      }
      return [];
    }
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      this.memoryCache = null;
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to clear location cache:', error);
      }
    }
  }

  async isCacheValid(): Promise<boolean> {
    const cached = await this.getCachedLocation();
    return cached !== null;
  }

  getCacheExpiryTime(): number {
    return this.CACHE_EXPIRY_MS;
  }
}

// CRITICAL FIX: Use lazy initialization
let instance: LocationCacheService | null = null;
function getInstance(): LocationCacheService {
  if (!instance) instance = new LocationCacheService();
  return instance;
}

export const locationCacheService = new Proxy({} as LocationCacheService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});
export default locationCacheService;
