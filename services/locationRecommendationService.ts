import locationService from './locationService';
import { LocationCoordinates } from '../types/property';

export interface LocationSearchParams {
  userLocation?: LocationCoordinates;
  radiusKm?: number;
  county?: string;
  town?: string;
  sortByDistance?: boolean;
}

export interface NearbyResult<T> {
  item: T;
  distance?: number;
  distanceFormatted?: string;
}

export interface LocationFilterOptions {
  coordinates: LocationCoordinates;
  address?: string;
  county?: string;
  town?: string;
}

class LocationRecommendationService {
  private readonly DEFAULT_RADIUS_KM = 10;
  private readonly MAX_RADIUS_KM = 100;
  private readonly KENYA_DEFAULT_COORDS: LocationCoordinates = {
    latitude: -1.286389,
    longitude: 36.817223
  };

  async getUserCurrentLocation(): Promise<LocationCoordinates | null> {
    try {
      const result = await locationService.getCurrentLocation();
      if (result.success && result.location) {
        return result.location;
      }
      return null;
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to get user location:', error);
      }
      return null;
    }
  }

  getDefaultLocation(): LocationCoordinates {
    return this.KENYA_DEFAULT_COORDS;
  }

  filterByLocation<T extends { location?: LocationFilterOptions }>(
    items: T[],
    searchParams: LocationSearchParams
  ): NearbyResult<T>[] {
    const centerLocation = searchParams.userLocation || this.KENYA_DEFAULT_COORDS;
    const radius = Math.min(
      searchParams.radiusKm || this.DEFAULT_RADIUS_KM,
      this.MAX_RADIUS_KM
    );

    const results: NearbyResult<T>[] = items
      .map((item) => {
        if (!item.location || !item.location.coordinates) {
          return {
            item,
            distance: Infinity,
            distanceFormatted: 'Distance unknown'
          };
        }

        const distance = locationService.calculateDistance(
          centerLocation,
          item.location.coordinates
        );

        return {
          item,
          distance,
          distanceFormatted: locationService.formatDistance(distance)
        };
      })
      .filter((result) => {
        if (result.distance === Infinity) {
          return false;
        }
        if (searchParams.county && result.item.location?.county) {
          if (result.item.location.county.toLowerCase() !== searchParams.county.toLowerCase()) {
            return false;
          }
        }
        if (searchParams.town && result.item.location?.town) {
          if (!result.item.location.town.toLowerCase().includes(searchParams.town.toLowerCase())) {
            return false;
          }
        }
        return result.distance <= radius;
      });

    if (searchParams.sortByDistance) {
      results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    return results;
  }

  rankByProximity<T extends { location?: LocationFilterOptions }>(
    items: T[],
    userLocation: LocationCoordinates,
    maxResults: number = 20
  ): NearbyResult<T>[] {
    const results: NearbyResult<T>[] = items.map((item) => {
      if (!item.location || !item.location.coordinates) {
        return {
          item,
          distance: Infinity,
          distanceFormatted: 'Distance unknown'
        };
      }

      const distance = locationService.calculateDistance(
        userLocation,
        item.location.coordinates
      );

      return {
        item,
        distance,
        distanceFormatted: locationService.formatDistance(distance)
      };
    });

    results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    return results.slice(0, maxResults);
  }

  async getNearbyRecommendations<T extends { location?: LocationFilterOptions }>(
    items: T[],
    options: {
      radiusKm?: number;
      maxResults?: number;
      useCurrentLocation?: boolean;
      fallbackLocation?: LocationCoordinates;
      county?: string;
      town?: string;
    } = {}
  ): Promise<NearbyResult<T>[]> {
    let centerLocation: LocationCoordinates;

    if (options.useCurrentLocation) {
      const currentLocation = await this.getUserCurrentLocation();
      centerLocation = currentLocation || options.fallbackLocation || this.KENYA_DEFAULT_COORDS;
    } else {
      centerLocation = options.fallbackLocation || this.KENYA_DEFAULT_COORDS;
    }

    const searchParams: LocationSearchParams = {
      userLocation: centerLocation,
      radiusKm: options.radiusKm,
      county: options.county,
      town: options.town,
      sortByDistance: true
    };

    const results = this.filterByLocation(items, searchParams);

    return results.slice(0, options.maxResults || 20);
  }

  buildPostGISDistanceQuery(
    tableName: string,
    latColumn: string,
    lonColumn: string,
    userLat: number,
    userLon: number,
    radiusKm: number
  ): string {
    return `
      SELECT *,
      ST_Distance(
        ST_MakePoint(${userLon}, ${userLat})::geography,
        ST_MakePoint(${lonColumn}, ${latColumn})::geography
      ) / 1000 as distance_km
      FROM ${tableName}
      WHERE ST_DWithin(
        ST_MakePoint(${userLon}, ${userLat})::geography,
        ST_MakePoint(${lonColumn}, ${latColumn})::geography,
        ${radiusKm * 1000}
      )
      ORDER BY distance_km ASC
    `;
  }

  isLocationValid(location?: LocationFilterOptions): boolean {
    if (!location || !location.coordinates) {
      return false;
    }
    return locationService.isValidCoordinate(location.coordinates);
  }

  calculateDistanceBetween(
    location1?: LocationFilterOptions,
    location2?: LocationFilterOptions
  ): number | null {
    if (!this.isLocationValid(location1) || !this.isLocationValid(location2)) {
      return null;
    }
    return locationService.calculateDistance(
      location1!.coordinates,
      location2!.coordinates
    );
  }

  formatLocationForDisplay(location?: LocationFilterOptions): string {
    if (!location) {
      return 'Location not specified';
    }

    const parts: string[] = [];
    if (location.town) parts.push(location.town);
    if (location.county) parts.push(location.county);

    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  }

  async geocodeLocation(address: string, county?: string): Promise<LocationCoordinates | null> {
    try {
      const region = county ? `${address}, ${county}, Kenya` : `${address}, Kenya`;
      const result = await locationService.geocodeAddress(region);

      if (result.success && result.results && result.results.length > 0) {
        return result.results[0].coordinate;
      }

      return null;
    } catch (error) {
      if (__DEV__) {
        console.warn('Geocoding failed:', error);
      }
      return null;
    }
  }

  async reverseGeocodeLocation(
    coordinates: LocationCoordinates
  ): Promise<{ county: string; town: string; address?: string } | null> {
    try {
      const result = await locationService.reverseGeocode(coordinates);

      if (result.success && result.address) {
        return {
          county: result.address.county || 'Unknown',
          town: result.address.city || 'Unknown',
          address: result.address.formattedAddress
        };
      }

      return null;
    } catch (error) {
      if (__DEV__) {
        console.warn('Reverse geocoding failed:', error);
      }
      return null;
    }
  }

  createBoundingBox(
    center: LocationCoordinates,
    radiusKm: number
  ): {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } {
    const latDelta = radiusKm / 111.32;
    const lonDelta = radiusKm / (111.32 * Math.cos(center.latitude * (Math.PI / 180)));

    return {
      minLat: center.latitude - latDelta,
      maxLat: center.latitude + latDelta,
      minLon: center.longitude - lonDelta,
      maxLon: center.longitude + lonDelta
    };
  }

  isWithinBounds(
    coordinates: LocationCoordinates,
    bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
  ): boolean {
    return (
      coordinates.latitude >= bounds.minLat &&
      coordinates.latitude <= bounds.maxLat &&
      coordinates.longitude >= bounds.minLon &&
      coordinates.longitude <= bounds.maxLon
    );
  }

  groupByProximity<T extends { location?: LocationFilterOptions }>(
    items: T[],
    userLocation: LocationCoordinates,
    groupSizes: { nearby: number; medium: number; far: number } = {
      nearby: 5,
      medium: 20,
      far: 50
    }
  ): {
    nearby: NearbyResult<T>[];
    medium: NearbyResult<T>[];
    far: NearbyResult<T>[];
  } {
    const itemsWithDistance = items.map((item) => {
      if (!item.location || !item.location.coordinates) {
        return {
          item,
          distance: Infinity,
          distanceFormatted: 'Distance unknown'
        };
      }

      const distance = locationService.calculateDistance(
        userLocation,
        item.location.coordinates
      );

      return {
        item,
        distance,
        distanceFormatted: locationService.formatDistance(distance)
      };
    });

    itemsWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    return {
      nearby: itemsWithDistance.filter((r) => r.distance! <= groupSizes.nearby),
      medium: itemsWithDistance.filter(
        (r) => r.distance! > groupSizes.nearby && r.distance! <= groupSizes.medium
      ),
      far: itemsWithDistance.filter(
        (r) => r.distance! > groupSizes.medium && r.distance! <= groupSizes.far
      )
    };
  }
}

// CRITICAL FIX: Use lazy initialization
let instance: LocationRecommendationService | null = null;
function getInstance(): LocationRecommendationService {
  if (!instance) instance = new LocationRecommendationService();
  return instance;
}

export const locationRecommendationService = new Proxy({} as LocationRecommendationService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});
export default locationRecommendationService;
