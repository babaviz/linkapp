"use strict";
/**
 * Location Redux Slice
 * Manages location-based state, user location, search history, and map configuration
 */
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectIsLocationWithinBounds = exports.selectLocationCacheStatus = exports.selectLocationPermissionStatusText = exports.selectHasValidCurrentLocation = exports.selectLastGeocodeResult = exports.selectIsGeocoding = exports.selectSelectedMapLocation = exports.selectLocationFilters = exports.selectRecentLocations = exports.selectSearchHistory = exports.selectSearchError = exports.selectIsSearching = exports.selectSearchResults = exports.selectSearchQuery = exports.selectCurrentMapRegion = exports.selectMapConfiguration = exports.selectHasLocationPermission = exports.selectCurrentLocationError = exports.selectIsLoadingCurrentLocation = exports.selectCurrentLocation = exports.resetLocationState = exports.setCacheExpiry = exports.clearLocationErrors = exports.setSelectedMapLocation = exports.setShowLocationPicker = exports.clearLocationFilters = exports.setLocationFilters = exports.clearSearchResults = exports.setSearchResults = exports.setSearchQuery = exports.setMapRegion = exports.updateMapConfiguration = exports.saveRecentLocation = exports.loadRecentLocations = exports.clearSearchHistory = exports.saveSearchToHistory = exports.loadSearchHistory = exports.reverseGeocodeCoordinates = exports.geocodeAddress = exports.requestLocationPermissions = exports.checkLocationPermissions = exports.getCurrentLocation = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const locationService_1 = __importDefault(require("../../services/locationService"));
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
// Default map configuration
const defaultMapConfiguration = {
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
const defaultMapRegion = {
    latitude: -0.0236,
    longitude: 37.9062,
    latitudeDelta: 8.0,
    longitudeDelta: 8.0,
};
const initialState = {
    // User's current location
    currentLocation: null,
    isLoadingCurrentLocation: false,
    currentLocationError: null,
    currentLocationTimestamp: null,
    // Location permissions
    hasLocationPermission: false,
    locationPermissionStatus: null,
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
exports.getCurrentLocation = (0, toolkit_1.createAsyncThunk)('location/getCurrentLocation', async (forceRefresh = false, { getState, rejectWithValue }) => {
    try {
        const state = getState();
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
        const result = await locationService_1.default.getCurrentLocation();
        if (result.success && result.location) {
            return {
                location: result.location,
                cached: false,
                timestamp: new Date().toISOString()
            };
        }
        else {
            return rejectWithValue(result.error || 'Failed to get current location');
        }
    }
    catch (error) {
        return rejectWithValue(error.message || 'Location service error');
    }
});
// Check location permissions
exports.checkLocationPermissions = (0, toolkit_1.createAsyncThunk)('location/checkLocationPermissions', async (_, { rejectWithValue }) => {
    try {
        const result = await locationService_1.default.checkLocationPermissions();
        return result;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Permission check failed');
    }
});
// Request location permissions
exports.requestLocationPermissions = (0, toolkit_1.createAsyncThunk)('location/requestLocationPermissions', async (_, { rejectWithValue }) => {
    try {
        const result = await locationService_1.default.requestLocationPermissions();
        return result;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Permission request failed');
    }
});
// Geocode address to coordinates
exports.geocodeAddress = (0, toolkit_1.createAsyncThunk)('location/geocodeAddress', async ({ address, region }, { rejectWithValue }) => {
    try {
        const result = await locationService_1.default.geocodeAddress(address, region);
        return result;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Geocoding failed');
    }
});
// Reverse geocode coordinates to address
exports.reverseGeocodeCoordinates = (0, toolkit_1.createAsyncThunk)('location/reverseGeocodeCoordinates', async (coordinates, { rejectWithValue }) => {
    try {
        const result = await locationService_1.default.reverseGeocode(coordinates);
        return result;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Reverse geocoding failed');
    }
});
// Load search history from storage
exports.loadSearchHistory = (0, toolkit_1.createAsyncThunk)('location/loadSearchHistory', async (_, { rejectWithValue }) => {
    try {
        const historyJson = await async_storage_1.default.getItem('location_search_history');
        if (historyJson) {
            const history = JSON.parse(historyJson);
            return history;
        }
        return [];
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to load search history');
    }
});
// Save search to history
exports.saveSearchToHistory = (0, toolkit_1.createAsyncThunk)('location/saveSearchToHistory', async (searchData, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const currentHistory = state.location.searchHistory;
        const newHistoryItem = {
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
            ...currentHistory.filter(item => item.formattedAddress !== searchData.formattedAddress)
        ].slice(0, 20);
        await async_storage_1.default.setItem('location_search_history', JSON.stringify(updatedHistory));
        return updatedHistory;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to save search history');
    }
});
// Clear search history
exports.clearSearchHistory = (0, toolkit_1.createAsyncThunk)('location/clearSearchHistory', async (_, { rejectWithValue }) => {
    try {
        await async_storage_1.default.removeItem('location_search_history');
        return [];
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to clear search history');
    }
});
// Load recent locations
exports.loadRecentLocations = (0, toolkit_1.createAsyncThunk)('location/loadRecentLocations', async (_, { rejectWithValue }) => {
    try {
        const recentJson = await async_storage_1.default.getItem('recent_locations');
        if (recentJson) {
            const recent = JSON.parse(recentJson);
            return recent;
        }
        return [];
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to load recent locations');
    }
});
// Save recent location
exports.saveRecentLocation = (0, toolkit_1.createAsyncThunk)('location/saveRecentLocation', async (location, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const currentRecent = state.location.recentLocations;
        // Add new location and remove duplicates, limit to 10
        const updatedRecent = [
            location,
            ...currentRecent.filter((item) => !(item.latitude === location.latitude && item.longitude === location.longitude))
        ].slice(0, 10);
        await async_storage_1.default.setItem('recent_locations', JSON.stringify(updatedRecent));
        return updatedRecent;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to save recent location');
    }
});
// Location slice
const locationSlice = (0, toolkit_1.createSlice)({
    name: 'location',
    initialState,
    reducers: {
        // Map configuration actions
        updateMapConfiguration: (state, action) => {
            state.mapConfiguration = { ...state.mapConfiguration, ...action.payload };
        },
        setMapRegion: (state, action) => {
            state.currentMapRegion = action.payload;
        },
        // Search actions
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
        },
        setSearchResults: (state, action) => {
            state.searchResults = action.payload;
            state.searchError = null;
        },
        clearSearchResults: (state) => {
            state.searchResults = [];
            state.searchQuery = '';
            state.searchError = null;
        },
        // Location filters
        setLocationFilters: (state, action) => {
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
        setShowLocationPicker: (state, action) => {
            state.showLocationPicker = action.payload;
        },
        setSelectedMapLocation: (state, action) => {
            state.selectedMapLocation = action.payload;
        },
        // Clear errors
        clearLocationErrors: (state) => {
            state.currentLocationError = null;
            state.searchError = null;
            state.geocodingError = null;
        },
        // Cache management
        setCacheExpiry: (state, action) => {
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
            .addCase(exports.getCurrentLocation.pending, (state) => {
            state.isLoadingCurrentLocation = true;
            state.currentLocationError = null;
        })
            .addCase(exports.getCurrentLocation.fulfilled, (state, action) => {
            state.isLoadingCurrentLocation = false;
            state.currentLocation = action.payload.location;
            state.currentLocationTimestamp = action.payload.timestamp;
            state.lastLocationUpdate = action.payload.timestamp;
            state.currentLocationError = null;
        })
            .addCase(exports.getCurrentLocation.rejected, (state, action) => {
            state.isLoadingCurrentLocation = false;
            state.currentLocationError = action.payload;
        });
        // Location permissions reducers
        builder
            .addCase(exports.checkLocationPermissions.fulfilled, (state, action) => {
            state.hasLocationPermission = action.payload.granted;
            state.locationPermissionStatus = action.payload.status;
        })
            .addCase(exports.requestLocationPermissions.fulfilled, (state, action) => {
            state.hasLocationPermission = action.payload.granted;
            state.locationPermissionStatus = action.payload.status;
        });
        // Geocoding reducers
        builder
            .addCase(exports.geocodeAddress.pending, (state) => {
            state.isGeocoding = true;
            state.geocodingError = null;
        })
            .addCase(exports.geocodeAddress.fulfilled, (state, action) => {
            state.isGeocoding = false;
            state.lastGeocodeResult = action.payload;
            if (action.payload.success && action.payload.results) {
                state.searchResults = action.payload.results;
            }
        })
            .addCase(exports.geocodeAddress.rejected, (state, action) => {
            state.isGeocoding = false;
            state.geocodingError = action.payload;
        });
        builder
            .addCase(exports.reverseGeocodeCoordinates.pending, (state) => {
            state.isGeocoding = true;
            state.geocodingError = null;
        })
            .addCase(exports.reverseGeocodeCoordinates.fulfilled, (state, action) => {
            state.isGeocoding = false;
            state.lastReverseGeocodeResult = action.payload;
        })
            .addCase(exports.reverseGeocodeCoordinates.rejected, (state, action) => {
            state.isGeocoding = false;
            state.geocodingError = action.payload;
        });
        // Search history reducers
        builder
            .addCase(exports.loadSearchHistory.pending, (state) => {
            state.isLoadingHistory = true;
        })
            .addCase(exports.loadSearchHistory.fulfilled, (state, action) => {
            state.isLoadingHistory = false;
            state.searchHistory = action.payload;
        })
            .addCase(exports.loadSearchHistory.rejected, (state) => {
            state.isLoadingHistory = false;
        })
            .addCase(exports.saveSearchToHistory.fulfilled, (state, action) => {
            state.searchHistory = action.payload;
        })
            .addCase(exports.clearSearchHistory.fulfilled, (state) => {
            state.searchHistory = [];
        });
        // Recent locations reducers
        builder
            .addCase(exports.loadRecentLocations.fulfilled, (state, action) => {
            state.recentLocations = action.payload;
        })
            .addCase(exports.saveRecentLocation.fulfilled, (state, action) => {
            state.recentLocations = action.payload;
        });
    },
});
// Actions
_a = locationSlice.actions, exports.updateMapConfiguration = _a.updateMapConfiguration, exports.setMapRegion = _a.setMapRegion, exports.setSearchQuery = _a.setSearchQuery, exports.setSearchResults = _a.setSearchResults, exports.clearSearchResults = _a.clearSearchResults, exports.setLocationFilters = _a.setLocationFilters, exports.clearLocationFilters = _a.clearLocationFilters, exports.setShowLocationPicker = _a.setShowLocationPicker, exports.setSelectedMapLocation = _a.setSelectedMapLocation, exports.clearLocationErrors = _a.clearLocationErrors, exports.setCacheExpiry = _a.setCacheExpiry, exports.resetLocationState = _a.resetLocationState;
// Selectors
const selectCurrentLocation = (state) => state.location.currentLocation;
exports.selectCurrentLocation = selectCurrentLocation;
const selectIsLoadingCurrentLocation = (state) => state.location.isLoadingCurrentLocation;
exports.selectIsLoadingCurrentLocation = selectIsLoadingCurrentLocation;
const selectCurrentLocationError = (state) => state.location.currentLocationError;
exports.selectCurrentLocationError = selectCurrentLocationError;
const selectHasLocationPermission = (state) => state.location.hasLocationPermission;
exports.selectHasLocationPermission = selectHasLocationPermission;
const selectMapConfiguration = (state) => state.location.mapConfiguration;
exports.selectMapConfiguration = selectMapConfiguration;
const selectCurrentMapRegion = (state) => state.location.currentMapRegion;
exports.selectCurrentMapRegion = selectCurrentMapRegion;
const selectSearchQuery = (state) => state.location.searchQuery;
exports.selectSearchQuery = selectSearchQuery;
const selectSearchResults = (state) => state.location.searchResults;
exports.selectSearchResults = selectSearchResults;
const selectIsSearching = (state) => state.location.isSearching;
exports.selectIsSearching = selectIsSearching;
const selectSearchError = (state) => state.location.searchError;
exports.selectSearchError = selectSearchError;
const selectSearchHistory = (state) => state.location.searchHistory;
exports.selectSearchHistory = selectSearchHistory;
const selectRecentLocations = (state) => state.location.recentLocations;
exports.selectRecentLocations = selectRecentLocations;
const selectLocationFilters = (state) => state.location.locationFilters;
exports.selectLocationFilters = selectLocationFilters;
const selectSelectedMapLocation = (state) => state.location.selectedMapLocation;
exports.selectSelectedMapLocation = selectSelectedMapLocation;
const selectIsGeocoding = (state) => state.location.isGeocoding;
exports.selectIsGeocoding = selectIsGeocoding;
const selectLastGeocodeResult = (state) => state.location.lastGeocodeResult;
exports.selectLastGeocodeResult = selectLastGeocodeResult;
// Computed selectors
exports.selectHasValidCurrentLocation = (0, toolkit_1.createSelector)([exports.selectCurrentLocation], (currentLocation) => {
    return currentLocation &&
        typeof currentLocation.latitude === 'number' &&
        typeof currentLocation.longitude === 'number' &&
        !isNaN(currentLocation.latitude) &&
        !isNaN(currentLocation.longitude);
});
exports.selectLocationPermissionStatusText = (0, toolkit_1.createSelector)([exports.selectHasLocationPermission, (state) => state.location.locationPermissionStatus], (hasPermission, status) => {
    if (hasPermission)
        return 'Granted';
    if (status === 'denied')
        return 'Denied';
    if (status === 'never_ask_again')
        return 'Denied (Never Ask Again)';
    return 'Not Requested';
});
exports.selectLocationCacheStatus = (0, toolkit_1.createSelector)([(state) => state.location.lastLocationUpdate, (state) => state.location.locationCacheExpiry], (lastUpdate, cacheExpiry) => {
    if (!lastUpdate)
        return { isValid: false, minutesRemaining: 0 };
    const now = new Date().getTime();
    const lastUpdateTime = new Date(lastUpdate).getTime();
    const expiryTime = cacheExpiry * 60 * 1000;
    const timeRemaining = expiryTime - (now - lastUpdateTime);
    return {
        isValid: timeRemaining > 0,
        minutesRemaining: Math.max(0, Math.round(timeRemaining / (60 * 1000)))
    };
});
exports.selectIsLocationWithinBounds = (0, toolkit_1.createSelector)([exports.selectCurrentLocation, exports.selectLocationFilters], (currentLocation, filters) => {
    if (!currentLocation || !filters.bounds)
        return true;
    return (currentLocation.latitude >= filters.bounds.south &&
        currentLocation.latitude <= filters.bounds.north &&
        currentLocation.longitude >= filters.bounds.west &&
        currentLocation.longitude <= filters.bounds.east);
});
exports.default = locationSlice.reducer;
