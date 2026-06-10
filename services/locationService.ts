/**
 * Location Service
 * Handles GPS functionality, permissions, and location-based operations
 */

import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import { LocationCoordinates } from '../types/property';
import locationCacheService from './locationCacheService';

export interface LocationPermissionResult {
  granted: boolean;
  status: Location.PermissionStatus;
  canAskAgain?: boolean;
}

export interface CurrentLocationResult {
  success: boolean;
  location?: LocationCoordinates;
  error?: string;
}

class LocationService {
  private static instance: LocationService;
  private permissionStatus: Location.PermissionStatus | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions from the user
   */
  async requestLocationPermissions(): Promise<LocationPermissionResult> {
    try {
      // Check if location is available on this platform
      if (Platform.OS === 'web') {
        if (__DEV__) console.log('Location permissions not available on web');
        return {
          granted: false,
          status: Location.PermissionStatus.DENIED
        };
      }

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      this.permissionStatus = status;

      if (__DEV__) console.log('Location permission status:', status);
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        status,
        canAskAgain
      };
    } catch (error) {
      if (__DEV__) console.error('Error requesting location permissions:', error);
      return {
        granted: false,
        status: Location.PermissionStatus.DENIED
      };
    }
  }

  /**
   * Check current location permission status
   */
  async checkLocationPermissions(): Promise<LocationPermissionResult> {
    try {
      // Check if location is available on this platform
      if (Platform.OS === 'web') {
        return {
          granted: false,
          status: Location.PermissionStatus.DENIED
        };
      }

      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      this.permissionStatus = status;

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        status,
        canAskAgain
      };
    } catch (error) {
      if (__DEV__) console.log('Error checking location permissions:', error);
      return {
        granted: false,
        status: Location.PermissionStatus.DENIED
      };
    }
  }

  /**
   * Get user's current location with caching support
   */
  async getCurrentLocation(options?: {
    useCache?: boolean;
    forceRefresh?: boolean;
  }): Promise<CurrentLocationResult> {
    const { useCache = true, forceRefresh = false } = options || {};

    try {
      if (useCache && !forceRefresh) {
        const cachedLocation = await locationCacheService.getCachedLocation();
        if (cachedLocation) {
          return {
            success: true,
            location: cachedLocation
          };
        }
      }

      const permissionResult = await this.checkLocationPermissions();
      
      if (!permissionResult.granted) {
        const requestResult = await this.requestLocationPermissions();
        
        if (!requestResult.granted) {
          const cachedLocation = await locationCacheService.getCachedLocation();
          if (cachedLocation) {
            return {
              success: true,
              location: cachedLocation
            };
          }
          
          return {
            success: false,
            error: 'Location permission denied. Please enable location access in settings.'
          };
        }
      }

      const isLocationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationServicesEnabled) {
        const cachedLocation = await locationCacheService.getCachedLocation();
        if (cachedLocation) {
          return {
            success: true,
            location: cachedLocation
          };
        }
        
        return {
          success: false,
          error: 'Location services are disabled. Please enable them in settings.'
        };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10
      });

      const coordinates: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      await locationCacheService.cacheLocation(coordinates, location.coords.accuracy || undefined);

      return {
        success: true,
        location: coordinates
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error getting current location:', error);
      
      const cachedLocation = await locationCacheService.getCachedLocation();
      if (cachedLocation) {
        return {
          success: true,
          location: cachedLocation
        };
      }
      
      let errorMessage = 'Unable to get current location.';
      
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorMessage = 'Location services are disabled. Please enable them in settings.';
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location unavailable. Please check your device settings.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Reverse geocode coordinates into approximate county and town for Kenya
   */
  async getCountyAndTownFromCoordinates(coordinates: LocationCoordinates): Promise<{ county: string; town: string }> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      const place = results && results.length > 0 ? results[0] : undefined;

      // Heuristics to derive county and town from reverse geocode fields
      const rawCounty = (place?.region || place?.city || place?.subregion || '').toString();
      const county = rawCounty.replace(/ County$/i, '') || 'Nairobi';

      const town = (
        place?.district ||
        place?.subregion ||
        place?.city ||
        place?.name ||
        'CBD'
      ).toString();

      return { county, town };
    } catch (error) {
      
      return { county: 'Nairobi', town: 'CBD' };
    }
  }

  /**
   * Validate if coordinates are valid
   */
  isValidCoordinate(coord: LocationCoordinates): boolean {
    const { latitude, longitude } = coord;
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !(latitude === 0 && longitude === 0)
    );
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  calculateDistance(
    from: LocationCoordinates,
    to: LocationCoordinates
  ): number {
    if (!this.isValidCoordinate(from) || !this.isValidCoordinate(to)) {
      return Infinity;
    }
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) * 
      Math.cos(this.toRadians(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else if (distanceKm < 10) {
      return `${distanceKm}km away`;
    } else {
      return `${Math.round(distanceKm)}km away`;
    }
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Show location permission dialog
   */
  showLocationPermissionDialog(): void {
    Alert.alert(
      'Location Access Required',
      'This app needs location access to show properties near you and provide location-based services.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open Settings',
          onPress: () => Location.enableNetworkProviderAsync()
        }
      ]
    );
  }

  /**
   * Get location-based region for map centering
   */
  getMapRegion(coordinates: LocationCoordinates, latitudeDelta: number = 0.01, longitudeDelta: number = 0.01) {
    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      latitudeDelta,
      longitudeDelta
    };
  }

  /**
   * Check if coordinates are within Kenya bounds
   */
  isWithinKenyaBounds(coordinates: LocationCoordinates): boolean {
    // Kenya approximate bounds
    const kenyaBounds = {
      north: 5.0,
      south: -4.7,
      east: 42.0,
      west: 33.9
    };

    return (
      coordinates.latitude >= kenyaBounds.south &&
      coordinates.latitude <= kenyaBounds.north &&
      coordinates.longitude >= kenyaBounds.west &&
      coordinates.longitude <= kenyaBounds.east
    );
  }

  /**
   * Forward geocoding - convert address/place name to coordinates
   */
  async geocodeAddress(address: string, region?: string): Promise<{
    success: boolean;
    results?: Array<{
      coordinate: LocationCoordinates;
      formattedAddress: string;
      accuracy?: number;
    }>;
    error?: string;
  }> {
    try {
      // Add region bias for better accuracy
      const searchQuery = region ? `${address}, ${region}` : address;
      
      const results = await Location.geocodeAsync(searchQuery);
      
      if (results && results.length > 0) {
        const geocodeResults = results
          .filter(result => {
            // Filter out results that are too far from expected region
            if (region === 'Kenya' || region === 'kenya') {
              return this.isWithinKenyaBounds({
                latitude: result.latitude,
                longitude: result.longitude
              });
            }
            return true; // Allow all results for other regions
          })
          .map(result => ({
            coordinate: {
              latitude: result.latitude,
              longitude: result.longitude
            },
            formattedAddress: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
            accuracy: result.accuracy || undefined
          }));

        return {
          success: true,
          results: geocodeResults.slice(0, 10) // Limit to 10 results
        };
      } else {
        return {
          success: false,
          error: 'No results found for the given address'
        };
      }
    } catch (error: any) {
      
      return {
        success: false,
        error: error.message || 'Geocoding failed'
      };
    }
  }

  /**
   * Enhanced reverse geocoding with more detailed address information
   */
  async reverseGeocode(coordinates: LocationCoordinates): Promise<{
    success: boolean;
    address?: {
      street?: string;
      city?: string;
      county?: string;
      country?: string;
      postalCode?: string;
      formattedAddress: string;
    };
    error?: string;
  }> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      if (results && results.length > 0) {
        const place = results[0];
        
        // Extract address components
        const street = place.street || place.name;
        const city = place.city || place.district || place.subregion;
        const county = place.region ? place.region.replace(/ County$/i, '') : undefined;
        const country = place.country;
        const postalCode = place.postalCode;
        
        // Format address
        const addressParts = [
          street,
          city,
          county,
          country,
          postalCode
        ].filter(Boolean);
        
        const formattedAddress = addressParts.length > 0 
          ? addressParts.join(', ') 
          : `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;

        return {
          success: true,
          address: {
            street,
            city,
            county,
            country,
            postalCode,
            formattedAddress
          }
        };
      } else {
        return {
          success: false,
          error: 'No address found for the given coordinates'
        };
      }
    } catch (error: any) {
      
      return {
        success: false,
        error: error.message || 'Reverse geocoding failed'
      };
    }
  }

  /**
   * Get multiple nearby places with enhanced search
   */
  async searchNearbyPlaces(coordinates: LocationCoordinates, query: string, radius: number = 5): Promise<{
    success: boolean;
    places?: Array<{
      coordinate: LocationCoordinates;
      name: string;
      distance: number;
      formattedAddress: string;
    }>;
    error?: string;
  }> {
    try {
      // This is a simplified implementation as Expo Location doesn't have
      // built-in nearby search. In a production app, you'd integrate with
      // Google Places API or similar service.
      
      const searchQuery = `${query} near ${coordinates.latitude},${coordinates.longitude}`;
      const results = await Location.geocodeAsync(searchQuery);
      
      if (results && results.length > 0) {
        const nearbyPlaces = results
          .map(result => {
            const distance = this.calculateDistance(
              coordinates,
              { latitude: result.latitude, longitude: result.longitude }
            );
            
            return {
              coordinate: {
                latitude: result.latitude,
                longitude: result.longitude
              },
              name: query,
              distance,
              formattedAddress: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`
            };
          })
          .filter(place => place.distance <= radius)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 20); // Limit to 20 results

        return {
          success: true,
          places: nearbyPlaces
        };
      } else {
        return {
          success: false,
          error: 'No places found nearby'
        };
      }
    } catch (error: any) {
      
      return {
        success: false,
        error: error.message || 'Nearby search failed'
      };
    }
  }

  /**
   * Get region bounds for different countries
   */
  getRegionBounds(region: string): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const bounds = {
      kenya: { north: 5.0, south: -4.7, east: 42.0, west: 33.9 },
      uganda: { north: 4.2, south: -1.5, east: 35.0, west: 29.5 },
      tanzania: { north: -0.9, south: -11.7, east: 40.6, west: 29.3 },
      global: { north: 85, south: -85, east: 180, west: -180 }
    };

    return bounds[region.toLowerCase() as keyof typeof bounds] || bounds.global;
  }

  /**
   * Check if coordinates are within a specific region
   */
  isWithinRegionBounds(coordinates: LocationCoordinates, region: string): boolean {
    const bounds = this.getRegionBounds(region);
    
    return (
      coordinates.latitude >= bounds.south &&
      coordinates.latitude <= bounds.north &&
      coordinates.longitude >= bounds.west &&
      coordinates.longitude <= bounds.east
    );
  }
}

// CRITICAL FIX: Don't instantiate at module scope - causes crash!
let instance: LocationService | null = null;
const handler: ProxyHandler<LocationService> = {
  get(target, prop) {
    if (!instance) instance = LocationService.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
};
export default new Proxy({} as LocationService, handler);
