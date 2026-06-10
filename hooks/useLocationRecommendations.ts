import { useState, useEffect, useCallback } from 'react';
import { LocationCoordinates } from '../types/property';
import locationRecommendationService from '../services/locationRecommendationService';
import locationService from '../services/locationService';

export interface UseLocationRecommendationsOptions {
  module: 'property' | 'jobs' | 'services' | 'datemi';
  autoFetch?: boolean;
  defaultRadiusKm?: number;
  useCurrentLocation?: boolean;
  onLocationError?: (error: string) => void;
}

export interface LocationRecommendationState {
  userLocation: LocationCoordinates | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  radiusKm: number;
  hasLocationPermission: boolean;
}

export function useLocationRecommendations(options: UseLocationRecommendationsOptions) {
  const {
    module,
    autoFetch = false,
    defaultRadiusKm = 10,
    useCurrentLocation = true,
    onLocationError
  } = options;

  const [state, setState] = useState<LocationRecommendationState>({
    userLocation: null,
    isLoadingLocation: false,
    locationError: null,
    radiusKm: defaultRadiusKm,
    hasLocationPermission: false
  });

  const requestLocationPermission = useCallback(async () => {
    try {
      const result = await locationService.requestLocationPermissions();
      setState(prev => ({ ...prev, hasLocationPermission: result.granted }));
      return result.granted;
    } catch (error) {
      const errorMsg = 'Failed to request location permission';
      setState(prev => ({ ...prev, locationError: errorMsg }));
      onLocationError?.(errorMsg);
      return false;
    }
  }, [onLocationError]);

  const getUserLocation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingLocation: true, locationError: null }));

    try {
      const result = await locationService.getCurrentLocation();

      if (result.success && result.location) {
        setState(prev => ({
          ...prev,
          userLocation: result.location!,
          isLoadingLocation: false,
          hasLocationPermission: true
        }));
        return result.location;
      } else {
        const fallbackLocation = locationRecommendationService.getDefaultLocation();
        setState(prev => ({
          ...prev,
          userLocation: fallbackLocation,
          isLoadingLocation: false,
          locationError: result.error || 'Could not get location, using default',
          hasLocationPermission: false
        }));
        onLocationError?.(result.error || 'Could not get location');
        return fallbackLocation;
      }
    } catch (error: any) {
      const fallbackLocation = locationRecommendationService.getDefaultLocation();
      const errorMsg = error.message || 'Location unavailable';
      
      setState(prev => ({
        ...prev,
        userLocation: fallbackLocation,
        isLoadingLocation: false,
        locationError: errorMsg,
        hasLocationPermission: false
      }));
      
      onLocationError?.(errorMsg);
      return fallbackLocation;
    }
  }, [onLocationError]);

  const setRadius = useCallback((radiusKm: number) => {
    setState(prev => ({ ...prev, radiusKm }));
  }, []);

  const setUserLocation = useCallback((location: LocationCoordinates) => {
    setState(prev => ({ ...prev, userLocation: location }));
  }, []);

  const clearLocationError = useCallback(() => {
    setState(prev => ({ ...prev, locationError: null }));
  }, []);

  const refreshLocation = useCallback(async () => {
    return await getUserLocation();
  }, [getUserLocation]);

  useEffect(() => {
    if (autoFetch && useCurrentLocation) {
      getUserLocation();
    } else if (autoFetch && !useCurrentLocation) {
      setState(prev => ({
        ...prev,
        userLocation: locationRecommendationService.getDefaultLocation()
      }));
    }
  }, [autoFetch, useCurrentLocation, getUserLocation]);

  return {
    ...state,
    getUserLocation,
    requestLocationPermission,
    setRadius,
    setUserLocation,
    clearLocationError,
    refreshLocation,
    getDefaultLocation: locationRecommendationService.getDefaultLocation,
    isLocationValid: (coords: LocationCoordinates) => 
      locationService.isValidCoordinate(coords),
    calculateDistance: (from: LocationCoordinates, to: LocationCoordinates) =>
      locationService.calculateDistance(from, to),
    formatDistance: (distanceKm: number) =>
      locationService.formatDistance(distanceKm)
  };
}

export function useNearbySearch<T extends { location?: any }>(
  items: T[],
  userLocation: LocationCoordinates | null,
  radiusKm: number,
  options?: {
    sortByDistance?: boolean;
    maxResults?: number;
  }
) {
  const [nearbyItems, setNearbyItems] = useState<Array<{
    item: T;
    distance?: number;
    distanceFormatted?: string;
  }>>([]);

  useEffect(() => {
    if (!userLocation || !items.length) {
      setNearbyItems([]);
      return;
    }

    const results = locationRecommendationService.filterByLocation(items, {
      userLocation,
      radiusKm,
      sortByDistance: options?.sortByDistance ?? true
    });

    const limited = results.slice(0, options?.maxResults || items.length);
    setNearbyItems(limited);
  }, [items, userLocation, radiusKm, options?.sortByDistance, options?.maxResults]);

  return nearbyItems;
}
