import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import locationService from '../services/locationService';

interface LocationResult {
  location: {
    latitude: number;
    longitude: number;
  } | null;
  address: string;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
}

export const useLocation = () => {
  const [locationData, setLocationData] = useState<LocationResult>({
    location: null,
    address: '',
    isLoading: false,
    error: null,
    hasPermission: false,
  });

  const checkPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      setLocationData(prev => ({ ...prev, hasPermission }));
      return hasPermission;
    } catch (error) {
      if (__DEV__) console.error('Permission check error:', error);
      return false;
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      setLocationData(prev => ({ ...prev, hasPermission }));
      return hasPermission;
    } catch (error) {
      if (__DEV__) console.error('Permission request error:', error);
      setLocationData(prev => ({
        ...prev, 
        error: 'Failed to request location permission',
        hasPermission: false 
      }));
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setLocationData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check permission first
      let hasPermission = await checkPermission();
      
      if (!hasPermission) {
        // Request permission if not granted
        hasPermission = await requestPermission();
        
        if (!hasPermission) {
          setLocationData(prev => ({
            ...prev,
            isLoading: false,
            error: 'Location permission denied',
          }));
          return null;
        }
      }

      // Get current location
      const result = await locationService.getCurrentLocation();
      
      if (result.success && result.location) {
        // Get address
        const reverseResult = await locationService.reverseGeocode(result.location);
        const address = reverseResult.success && reverseResult.address 
          ? reverseResult.address.formattedAddress 
          : `${result.location.latitude.toFixed(6)}, ${result.location.longitude.toFixed(6)}`;
        
        setLocationData({
          location: result.location,
          address,
          isLoading: false,
          error: null,
          hasPermission: true,
        });
        
        return { location: result.location, address };
      } else {
        setLocationData(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to get location',
        }));
        return null;
      }
    } catch (error) {
      if (__DEV__) console.error('Location error:', error);
      setLocationData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to get current location',
      }));
      return null;
    }
  };

  const getAddressForCoordinate = async (coordinate: { latitude: number; longitude: number }) => {
    try {
      const result = await locationService.reverseGeocode(coordinate);
      if (result.success && result.address) {
        return result.address.formattedAddress;
      }
      return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
    } catch (error) {
      if (__DEV__) console.error('Reverse geocode error:', error);
      return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  return {
    ...locationData,
    getCurrentLocation,
    requestPermission,
    checkPermission,
    getAddressForCoordinate,
  };
};

export default useLocation;
