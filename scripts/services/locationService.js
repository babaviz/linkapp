"use strict";
/**
 * Location Service
 * Handles GPS functionality, permissions, and location-based operations
 */
const __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    let desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
const __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
const __importStar = (this && this.__importStar) || (function () {
    let ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            const ar = [];
            for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        const result = {};
        if (mod != null) for (let k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const Location = __importStar(require("expo-location"));
const react_native_1 = require("react-native");
class LocationService {
    constructor() {
        this.permissionStatus = null;
    }
    static getInstance() {
        if (!LocationService.instance) {
            LocationService.instance = new LocationService();
        }
        return LocationService.instance;
    }
    /**
     * Request location permissions from the user
     */
    async requestLocationPermissions() {
        try {
            const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
            this.permissionStatus = status;
            return {
                granted: status === Location.PermissionStatus.GRANTED,
                status,
                canAskAgain
            };
        }
        catch (error) {
            
            return {
                granted: false,
                status: Location.PermissionStatus.DENIED
            };
        }
    }
    /**
     * Check current location permission status
     */
    async checkLocationPermissions() {
        try {
            const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
            this.permissionStatus = status;
            return {
                granted: status === Location.PermissionStatus.GRANTED,
                status,
                canAskAgain
            };
        }
        catch (error) {
            
            return {
                granted: false,
                status: Location.PermissionStatus.DENIED
            };
        }
    }
    /**
     * Get user's current location
     */
    async getCurrentLocation() {
        try {
            // Check permissions first
            const permissionResult = await this.checkLocationPermissions();
            if (!permissionResult.granted) {
                // Try to request permissions
                const requestResult = await this.requestLocationPermissions();
                if (!requestResult.granted) {
                    return {
                        success: false,
                        error: 'Location permission denied. Please enable location access in settings.'
                    };
                }
            }
            // Get current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 5000,
                distanceInterval: 10
            });
            return {
                success: true,
                location: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                }
            };
        }
        catch (error) {
            
            let errorMessage = 'Unable to get current location.';
            if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
                errorMessage = 'Location services are disabled. Please enable them in settings.';
            }
            else if (error.code === 'E_LOCATION_TIMEOUT') {
                errorMessage = 'Location request timed out. Please try again.';
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
    async getCountyAndTownFromCoordinates(coordinates) {
        try {
            const results = await Location.reverseGeocodeAsync({
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
            });
            const place = results && results.length > 0 ? results[0] : undefined;
            // Heuristics to derive county and town from reverse geocode fields
            const rawCounty = (place?.region || place?.city || place?.subregion || '').toString();
            const county = rawCounty.replace(/ County$/i, '') || 'Nairobi';
            const town = (place?.district ||
                place?.subregion ||
                place?.city ||
                place?.name ||
                'CBD').toString();
            return { county, town };
        }
        catch (error) {
            
            return { county: 'Nairobi', town: 'CBD' };
        }
    }
    /**
     * Calculate distance between two coordinates (in kilometers)
     */
    calculateDistance(from, to) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(to.latitude - from.latitude);
        const dLon = this.toRadians(to.longitude - from.longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Format distance for display
     */
    formatDistance(distanceKm) {
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m away`;
        }
        else if (distanceKm < 10) {
            return `${distanceKm}km away`;
        }
        else {
            return `${Math.round(distanceKm)}km away`;
        }
    }
    /**
     * Check if location services are enabled
     */
    async isLocationEnabled() {
        try {
            return await Location.hasServicesEnabledAsync();
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Show location permission dialog
     */
    showLocationPermissionDialog() {
        react_native_1.Alert.alert('Location Access Required', 'This app needs location access to show properties near you and provide location-based services.', [
            {
                text: 'Cancel',
                style: 'cancel'
            },
            {
                text: 'Open Settings',
                onPress: () => Location.enableNetworkProviderAsync()
            }
        ]);
    }
    /**
     * Get location-based region for map centering
     */
    getMapRegion(coordinates, latitudeDelta = 0.01, longitudeDelta = 0.01) {
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
    isWithinKenyaBounds(coordinates) {
        // Kenya approximate bounds
        const kenyaBounds = {
            north: 5.0,
            south: -4.7,
            east: 42.0,
            west: 33.9
        };
        return (coordinates.latitude >= kenyaBounds.south &&
            coordinates.latitude <= kenyaBounds.north &&
            coordinates.longitude >= kenyaBounds.west &&
            coordinates.longitude <= kenyaBounds.east);
    }
    /**
     * Forward geocoding - convert address/place name to coordinates
     */
    async geocodeAddress(address, region) {
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
            }
            else {
                return {
                    success: false,
                    error: 'No results found for the given address'
                };
            }
        }
        catch (error) {
            
            return {
                success: false,
                error: error.message || 'Geocoding failed'
            };
        }
    }
    /**
     * Enhanced reverse geocoding with more detailed address information
     */
    async reverseGeocode(coordinates) {
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
            }
            else {
                return {
                    success: false,
                    error: 'No address found for the given coordinates'
                };
            }
        }
        catch (error) {
            
            return {
                success: false,
                error: error.message || 'Reverse geocoding failed'
            };
        }
    }
    /**
     * Get multiple nearby places with enhanced search
     */
    async searchNearbyPlaces(coordinates, query, radius = 5) {
        try {
            // This is a simplified implementation as Expo Location doesn't have
            // built-in nearby search. In a production app, you'd integrate with
            // Google Places API or similar service.
            const searchQuery = `${query} near ${coordinates.latitude},${coordinates.longitude}`;
            const results = await Location.geocodeAsync(searchQuery);
            if (results && results.length > 0) {
                const nearbyPlaces = results
                    .map(result => {
                    const distance = this.calculateDistance(coordinates, { latitude: result.latitude, longitude: result.longitude });
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
            }
            else {
                return {
                    success: false,
                    error: 'No places found nearby'
                };
            }
        }
        catch (error) {
            
            return {
                success: false,
                error: error.message || 'Nearby search failed'
            };
        }
    }
    /**
     * Get region bounds for different countries
     */
    getRegionBounds(region) {
        const bounds = {
            kenya: { north: 5.0, south: -4.7, east: 42.0, west: 33.9 },
            uganda: { north: 4.2, south: -1.5, east: 35.0, west: 29.5 },
            tanzania: { north: -0.9, south: -11.7, east: 40.6, west: 29.3 },
            global: { north: 85, south: -85, east: 180, west: -180 }
        };
        return bounds[region.toLowerCase()] || bounds.global;
    }
    /**
     * Check if coordinates are within a specific region
     */
    isWithinRegionBounds(coordinates, region) {
        const bounds = this.getRegionBounds(region);
        return (coordinates.latitude >= bounds.south &&
            coordinates.latitude <= bounds.north &&
            coordinates.longitude >= bounds.west &&
            coordinates.longitude <= bounds.east);
    }
}
exports.default = LocationService.getInstance();
