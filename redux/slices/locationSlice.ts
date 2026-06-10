/**
 * Location Redux Slice
 * Manages location-based state, user location, search history, and map configuration
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { 
  LocationCoordinates, 
  CurrentLocationResult,
  LocationHistory,
  LocationSearchResult,
  MapConfiguration,
  MapRegion,
  LocationBounds,
  GeocodeResult,
  ReverseGeocodeResult
} from '../../types/property';
import locationService from '../../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Location slice state interface
interface LocationState {
  // User's current location
  currentLocation: LocationCoordinates | null;
  isLoadingCurrentLocation: boolean;
  currentLocationError: string | null;
  currentLocationTimestamp: string | null;
  
  // Location permissions
  hasLocationPermission: boolean;
  locationPermissionStatus: string | null;
  shouldAutoDetectLocation: boolean; // Flag for automatic location detection
  
  // Map configuration
  mapConfiguration: MapConfiguration;
  currentMapRegion: MapRegion | null;
  
  // Location search
  searchQuery: string;
  searchResults: LocationSearchResult[];
  isSearching: boolean;
  searchError: string | null;
  
  // Search history
  searchHistory: LocationHistory[];
  isLoadingHistory: boolean;
  
  // Geocoding
  lastGeocodeResult: GeocodeResult | null;
  lastReverseGeocodeResult: ReverseGeocodeResult | null;
  isGeocoding: boolean;
  geocodingError: string | null;
  
  // Recently selected locations
  recentLocations: LocationCoordinates[];
  
  // Location-based property filters
  locationFilters: {
    center: LocationCoordinates | null;
    radiusKm: number;
    bounds: LocationBounds | null;
  };
  
  // UI state
  showLocationPicker: boolean;
  selectedMapLocation: LocationCoordinates | null;
  
  // Performance and caching
  locationCacheExpiry: number; // minutes
  lastLocationUpdate: string | null;
}

// Default map configuration
const defaultMapConfiguration: MapConfiguration = {
  enableClustering: true,
  enableLocationSearch: true,
  showCurrentLocation: true,
  mapStyle: 'standard',
  region: 'kenya',
  searchRadius: 10, // km
  clusterRadius: 50, // pixels
  maxZoom: 18,
  minZoom: 3,
};

// Default Kenya region
const defaultMapRegion: MapRegion = {
  latitude: -0.0236,
  longitude: 37.9062,
  latitudeDelta: 8.0,
  longitudeDelta: 8.0,
};

const initialState: LocationState = {
  // User's current location
  currentLocation: null,
  isLoadingCurrentLocation: false,
  currentLocationError: null,
  currentLocationTimestamp: null,
  
  // Location permissions
  hasLocationPermission: false,
  locationPermissionStatus: null,
  shouldAutoDetectLocation: true,
  
  // Map configuration
  mapConfiguration: defaultMapConfiguration,
  currentMapRegion: defaultMapRegion,
  
  // Location search
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  searchError: null,
  
  // Search history
  searchHistory: [],
  isLoadingHistory: false,
  
  // Geocoding
  lastGeocodeResult: null,
  lastReverseGeocodeResult: null,
  isGeocoding: false,
  geocodingError: null,
  
  // Recently selected locations
  recentLocations: [],
  
  // Location-based property filters
  locationFilters: {
    center: null,
    radiusKm: 10,
    bounds: null,
  },
  
  // UI state
  showLocationPicker: false,
  selectedMapLocation: null,
  
  // Performance and caching
  locationCacheExpiry: 5, // 5 minutes
  lastLocationUpdate: null,
};

// Async Thunks

// Get current location with caching
export const getCurrentLocation = createAsyncThunk(
  'location/getCurrentLocation',
  async (forceRefresh: boolean = false, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const lastUpdate = state.location.lastLocationUpdate;
      const cacheExpiry = state.location.locationCacheExpiry;
      
      // Check if we should use cached location
      if (!forceRefresh && lastUpdate && state.location.currentLocation) {
        const now = new Date().getTime();
        const lastUpdateTime = new Date(lastUpdate).getTime();
        const cacheExpiredTime = cacheExpiry * 60 * 1000; // Convert to milliseconds
        
        if (now - lastUpdateTime < cacheExpiredTime) {
          return {
            location: state.location.currentLocation,
            cached: true,
            timestamp: lastUpdate
          };
        }
      }
      
      const result = await locationService.getCurrentLocation();
      
      if (result.success && result.location) {
        return {
          location: result.location,
          cached: false,
          timestamp: new Date().toISOString()
        };
      } else {
        return rejectWithValue(result.error || 'Failed to get current location');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Location service error');
    }
  }
);

// Check location permissions
export const checkLocationPermissions = createAsyncThunk(
  'location/checkLocationPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const result = await locationService.checkLocationPermissions();
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Permission check failed');
    }
  }
);

// Request location permissions
export const requestLocationPermissions = createAsyncThunk(
  'location/requestLocationPermissions',
  async (autoDetect: boolean = true, { dispatch, rejectWithValue }) => {
    try {
      const result = await locationService.requestLocationPermissions();
      
      // If permission granted and auto-detect is enabled, get current location
      if (result.granted && autoDetect) {
        dispatch(getCurrentLocation(true));
      }
      
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Permission request failed');
    }
  }
);

// Geocode address to coordinates
export const geocodeAddress = createAsyncThunk(
  'location/geocodeAddress',
  async ({ address, region }: { address: string; region?: string }, { rejectWithValue }) => {
    try {
      const result = await locationService.geocodeAddress(address, region);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Geocoding failed');
    }
  }
);

// Reverse geocode coordinates to address
export const reverseGeocodeCoordinates = createAsyncThunk(
  'location/reverseGeocodeCoordinates',
  async (coordinates: LocationCoordinates, { rejectWithValue }) => {
    try {
      const result = await locationService.reverseGeocode(coordinates);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Reverse geocoding failed');
    }
  }
);

// Load search history from storage
export const loadSearchHistory = createAsyncThunk(
  'location/loadSearchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const historyJson = await AsyncStorage.getItem('location_search_history');
      if (historyJson) {
        const history: LocationHistory[] = JSON.parse(historyJson);
        return history;
      }
      return [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load search history');
    }
  }
);

// Save search to history
export const saveSearchToHistory = createAsyncThunk(
  'location/saveSearchToHistory',
  async (searchData: {
    query: string;
    coordinate: LocationCoordinates;
    formattedAddress: string;
    resultCount: number;
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const currentHistory = state.location.searchHistory;
      
      const newHistoryItem: LocationHistory = {
        id: Date.now().toString(),
        query: searchData.query,
        coordinate: searchData.coordinate,
        formattedAddress: searchData.formattedAddress,
        timestamp: new Date().toISOString(),
        resultCount: searchData.resultCount
      };
      
      // Remove duplicates and limit to 20 items
      const updatedHistory = [
        newHistoryItem,
        ...currentHistory.filter(item => 
          item.formattedAddress !== searchData.formattedAddress
        )
      ].slice(0, 20);
      
      await AsyncStorage.setItem('location_search_history', JSON.stringify(updatedHistory));
      return updatedHistory;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save search history');
    }
  }
);

// Clear search history
export const clearSearchHistory = createAsyncThunk(
  'location/clearSearchHistory',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem('location_search_history');
      return [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to clear search history');
    }
  }
);

// Load recent locations
export const loadRecentLocations = createAsyncThunk(
  'location/loadRecentLocations',
  async (_, { rejectWithValue }) => {
    try {
      const recentJson = await AsyncStorage.getItem('recent_locations');
      if (recentJson) {
        const recent: LocationCoordinates[] = JSON.parse(recentJson);
        return recent;
      }
      return [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load recent locations');
    }
  }
);

// Save recent location
export const saveRecentLocation = createAsyncThunk(
  'location/saveRecentLocation',
  async (location: LocationCoordinates, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const currentRecent = state.location.recentLocations;
      
      // Add new location and remove duplicates, limit to 10
      const updatedRecent = [
        location,
        ...currentRecent.filter((item: LocationCoordinates) => 
          !(item.latitude === location.latitude && item.longitude === location.longitude)
        )
      ].slice(0, 10);
      
      await AsyncStorage.setItem('recent_locations', JSON.stringify(updatedRecent));
      return updatedRecent;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save recent location');
    }
  }
);

// Location slice
const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    // Map configuration actions
    updateMapConfiguration: (state, action: PayloadAction<Partial<MapConfiguration>>) => {
      state.mapConfiguration = { ...state.mapConfiguration, ...action.payload };
    },
    
    setMapRegion: (state, action: PayloadAction<MapRegion>) => {
      state.currentMapRegion = action.payload;
    },
    
    // Search actions
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setSearchResults: (state, action: PayloadAction<LocationSearchResult[]>) => {
      state.searchResults = action.payload;
      state.searchError = null;
    },
    
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
      state.searchError = null;
    },
    
    // Location filters
    setLocationFilters: (state, action: PayloadAction<{
      center?: LocationCoordinates | null;
      radiusKm?: number;
      bounds?: LocationBounds | null;
    }>) => {
      state.locationFilters = { ...state.locationFilters, ...action.payload };
    },
    
    clearLocationFilters: (state) => {
      state.locationFilters = {
        center: null,
        radiusKm: 10,
        bounds: null,
      };
    },
    
    // UI state actions
    setShowLocationPicker: (state, action: PayloadAction<boolean>) => {
      state.showLocationPicker = action.payload;
    },
    
    setSelectedMapLocation: (state, action: PayloadAction<LocationCoordinates | null>) => {
      state.selectedMapLocation = action.payload;
      // Save to recent locations if it's a new location
      if (action.payload && state.recentLocations.length < 10) {
        const exists = state.recentLocations.some(
          loc => loc.latitude === action.payload.latitude && 
                 loc.longitude === action.payload.longitude
        );
        if (!exists) {
          state.recentLocations = [action.payload, ...state.recentLocations].slice(0, 10);
        }
      }
    },
    setShouldAutoDetectLocation: (state, action: PayloadAction<boolean>) => {
      state.shouldAutoDetectLocation = action.payload;
    },
    
    // Clear errors
    clearLocationErrors: (state) => {
      state.currentLocationError = null;
      state.searchError = null;
      state.geocodingError = null;
    },
    
    // Cache management
    setCacheExpiry: (state, action: PayloadAction<number>) => {
      state.locationCacheExpiry = action.payload;
    },
    
    // Reset location state
    resetLocationState: (state) => {
      Object.assign(state, initialState);
    },
  },
  
  extraReducers: (builder) => {
    // Current location reducers
    builder
      .addCase(getCurrentLocation.pending, (state) => {
        state.isLoadingCurrentLocation = true;
        state.currentLocationError = null;
      })
      .addCase(getCurrentLocation.fulfilled, (state, action) => {
        state.isLoadingCurrentLocation = false;
        state.currentLocation = action.payload.location;
        state.currentLocationTimestamp = action.payload.timestamp;
        state.lastLocationUpdate = action.payload.timestamp;
        state.currentLocationError = null;
        // Reset auto-detect flag after successful detection
        if (state.shouldAutoDetectLocation) {
          state.shouldAutoDetectLocation = false;
        }
      })
      .addCase(getCurrentLocation.rejected, (state, action) => {
        state.isLoadingCurrentLocation = false;
        state.currentLocationError = action.payload as string;
      });
    
    // Location permissions reducers
    builder
      .addCase(checkLocationPermissions.fulfilled, (state, action) => {
        state.hasLocationPermission = action.payload.granted;
        state.locationPermissionStatus = action.payload.status;
      })
      .addCase(requestLocationPermissions.fulfilled, (state, action) => {
        state.hasLocationPermission = action.payload.granted;
        state.locationPermissionStatus = action.payload.status;
      });
    
    // Geocoding reducers
    builder
      .addCase(geocodeAddress.pending, (state) => {
        state.isGeocoding = true;
        state.geocodingError = null;
      })
      .addCase(geocodeAddress.fulfilled, (state, action) => {
        state.isGeocoding = false;
        state.lastGeocodeResult = action.payload as GeocodeResult;
        if (action.payload.success && action.payload.results) {
          state.searchResults = action.payload.results as any;
        }
      })
      .addCase(geocodeAddress.rejected, (state, action) => {
        state.isGeocoding = false;
        state.geocodingError = action.payload as string;
      });
    
    builder
      .addCase(reverseGeocodeCoordinates.pending, (state) => {
        state.isGeocoding = true;
        state.geocodingError = null;
      })
      .addCase(reverseGeocodeCoordinates.fulfilled, (state, action) => {
        state.isGeocoding = false;
        state.lastReverseGeocodeResult = action.payload;
      })
      .addCase(reverseGeocodeCoordinates.rejected, (state, action) => {
        state.isGeocoding = false;
        state.geocodingError = action.payload as string;
      });
    
    // Search history reducers
    builder
      .addCase(loadSearchHistory.pending, (state) => {
        state.isLoadingHistory = true;
      })
      .addCase(loadSearchHistory.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.searchHistory = action.payload;
      })
      .addCase(loadSearchHistory.rejected, (state) => {
        state.isLoadingHistory = false;
      })
      .addCase(saveSearchToHistory.fulfilled, (state, action) => {
        state.searchHistory = action.payload;
      })
      .addCase(clearSearchHistory.fulfilled, (state) => {
        state.searchHistory = [];
      });
    
    // Recent locations reducers
    builder
      .addCase(loadRecentLocations.fulfilled, (state, action) => {
        state.recentLocations = action.payload;
      })
      .addCase(saveRecentLocation.fulfilled, (state, action) => {
        state.recentLocations = action.payload;
      });
  },
});

// Actions
export const {
  updateMapConfiguration,
  setMapRegion,
  setSearchQuery,
  setSearchResults,
  clearSearchResults,
  setLocationFilters,
  clearLocationFilters,
  setShowLocationPicker,
  setSelectedMapLocation,
  clearLocationErrors,
  setCacheExpiry,
  resetLocationState,
  setShouldAutoDetectLocation,
} = locationSlice.actions;

// Selectors
export const selectCurrentLocation = (state: any) => state.location.currentLocation;
export const selectIsLoadingCurrentLocation = (state: any) => state.location.isLoadingCurrentLocation;
export const selectCurrentLocationError = (state: any) => state.location.currentLocationError;
export const selectHasLocationPermission = (state: any) => state.location.hasLocationPermission;

export const selectMapConfiguration = (state: any) => state.location.mapConfiguration;
export const selectCurrentMapRegion = (state: any) => state.location.currentMapRegion;

export const selectSearchQuery = (state: any) => state.location.searchQuery;
export const selectSearchResults = (state: any) => state.location.searchResults;
export const selectIsSearching = (state: any) => state.location.isSearching;
export const selectSearchError = (state: any) => state.location.searchError;

export const selectSearchHistory = (state: any) => state.location.searchHistory;
export const selectRecentLocations = (state: any) => state.location.recentLocations;

export const selectLocationFilters = (state: any) => state.location.locationFilters;
export const selectSelectedMapLocation = (state: any) => state.location.selectedMapLocation;

export const selectIsGeocoding = (state: any) => state.location.isGeocoding;
export const selectLastGeocodeResult = (state: any) => state.location.lastGeocodeResult;

// Computed selectors
export const selectHasValidCurrentLocation = createSelector(
  [selectCurrentLocation],
  (currentLocation) => {
    return currentLocation && 
           typeof currentLocation.latitude === 'number' && 
           typeof currentLocation.longitude === 'number' &&
           !isNaN(currentLocation.latitude) && 
           !isNaN(currentLocation.longitude);
  }
);

export const selectLocationPermissionStatusText = createSelector(
  [selectHasLocationPermission, (state: any) => state.location.locationPermissionStatus],
  (hasPermission, status) => {
    if (hasPermission) return 'Granted';
    if (status === 'denied') return 'Denied';
    if (status === 'never_ask_again') return 'Denied (Never Ask Again)';
    return 'Not Requested';
  }
);

export const selectLocationCacheStatus = createSelector(
  [(state: any) => state.location.lastLocationUpdate, (state: any) => state.location.locationCacheExpiry],
  (lastUpdate, cacheExpiry) => {
    if (!lastUpdate) return { isValid: false, minutesRemaining: 0 };
    
    const now = new Date().getTime();
    const lastUpdateTime = new Date(lastUpdate).getTime();
    const expiryTime = cacheExpiry * 60 * 1000;
    const timeRemaining = expiryTime - (now - lastUpdateTime);
    
    return {
      isValid: timeRemaining > 0,
      minutesRemaining: Math.max(0, Math.round(timeRemaining / (60 * 1000)))
    };
  }
);

export const selectIsLocationWithinBounds = createSelector(
  [selectCurrentLocation, selectLocationFilters],
  (currentLocation, filters) => {
    if (!currentLocation || !filters.bounds) return true;
    
    return (
      currentLocation.latitude >= filters.bounds.south &&
      currentLocation.latitude <= filters.bounds.north &&
      currentLocation.longitude >= filters.bounds.west &&
      currentLocation.longitude <= filters.bounds.east
    );
  }
);

export default locationSlice.reducer;
