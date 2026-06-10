/**
 * EnhancedPropertyMap Component
 * Advanced map with clustering, regional support, and location search
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, {
  Marker,
  Callout,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  Region,
  LatLng,
} from 'react-native-maps';
import MapClusterer from 'react-native-map-clustering';
import * as Location from 'expo-location';
import { Property, LocationCoordinates } from '../../types/property';
import { getPropertyStatusInfo, formatPrice } from '../../utils/propertyHelpers';
import locationService from '../../services/locationService';
import { spacing, fontSize } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');

interface EnhancedPropertyMapProps {
  properties: Property[];
  onPropertyPress?: (property: Property) => void;
  onCurrentLocationPress?: () => void;
  onLocationSearch?: (searchResults: Property[]) => void;
  showCurrentLocation?: boolean;
  enableClustering?: boolean;
  enableLocationSearch?: boolean;
  initialRegion?: Region;
  mapStyle?: 'standard' | 'satellite' | 'hybrid' | 'terrain';
  region?: 'kenya' | 'uganda' | 'tanzania' | 'global';
  style?: any;
}

interface GeocodeResult {
  coordinate: LatLng;
  name: string;
  formattedAddress: string;
}

const REGION_CONFIGS = {
  kenya: {
    center: { latitude: -0.0236, longitude: 37.9062 },
    bounds: { north: 5.0, south: -4.7, east: 42.0, west: 33.9 },
    mapProvider: PROVIDER_GOOGLE as typeof PROVIDER_GOOGLE,
    searchBias: 'country:ke',
  },
  uganda: {
    center: { latitude: 1.3733, longitude: 32.2903 },
    bounds: { north: 4.2, south: -1.5, east: 35.0, west: 29.5 },
    mapProvider: PROVIDER_GOOGLE as typeof PROVIDER_GOOGLE,
    searchBias: 'country:ug',
  },
  tanzania: {
    center: { latitude: -6.3690, longitude: 34.8888 },
    bounds: { north: -0.9, south: -11.7, east: 40.6, west: 29.3 },
    mapProvider: PROVIDER_GOOGLE as typeof PROVIDER_GOOGLE,
    searchBias: 'country:tz',
  },
  global: {
    center: { latitude: 0, longitude: 0 },
    bounds: { north: 85, south: -85, east: 180, west: -180 },
    mapProvider: PROVIDER_DEFAULT as typeof PROVIDER_DEFAULT,
    searchBias: '',
  },
} as const;

const isValidCoordinate = (coord: LatLng): boolean => {
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
};

const EnhancedPropertyMap: React.FC<EnhancedPropertyMapProps> = ({
  properties = [],
  onPropertyPress,
  onCurrentLocationPress,
  onLocationSearch,
  showCurrentLocation = true,
  enableClustering = true,
  enableLocationSearch = true,
  initialRegion,
  mapStyle = 'standard',
  region = 'kenya',
  style,
}) => {
  const validProperties = properties.filter(p => isValidCoordinate(p.location.coordinates));
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(
    initialRegion || {
      ...REGION_CONFIGS[region].center,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentUserLocation();
    }
  }, [showCurrentLocation]);

  const getCurrentUserLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const result = await locationService.getCurrentLocation();

      if (result.success && result.location) {
        setCurrentLocation(result.location);

        // Center map on user location if no initial region provided
        if (!initialRegion) {
          const newRegion = locationService.getMapRegion(result.location, 0.05, 0.05);
          setMapRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        }
      } else {
        
      }
    } catch (error) {
      
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Enhanced geocoding with regional bias
  const performLocationSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const regionConfig = REGION_CONFIGS[region];
      const searchQuery = regionConfig.searchBias 
        ? `${query} ${regionConfig.searchBias}` 
        : query;

      const geocodeResult = await Location.geocodeAsync(searchQuery);
      
      if (geocodeResult && geocodeResult.length > 0) {
        const results: GeocodeResult[] = geocodeResult
          .filter(result => {
            // Filter results based on region bounds
            const bounds = regionConfig.bounds;
            return (
              result.latitude >= bounds.south &&
              result.latitude <= bounds.north &&
              result.longitude >= bounds.west &&
              result.longitude <= bounds.east
            );
          })
          .map((result, index) => ({
            coordinate: {
              latitude: result.latitude,
              longitude: result.longitude,
            },
            name: `Location ${index + 1}`,
            formattedAddress: `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
          }))
          .slice(0, 5); // Limit to 5 results

        setGeocodeResults(results);
        setShowSearchResults(results.length > 0);

        if (results.length > 0) {
          // Animate to first result
          const firstResult = results[0];
          const newRegion = locationService.getMapRegion(firstResult.coordinate, 0.02, 0.02);
          mapRef.current?.animateToRegion(newRegion, 1000);

          // Find nearby properties
          const nearbyProperties = findPropertiesNearLocation(firstResult.coordinate, 5); // 5km radius
          onLocationSearch?.(nearbyProperties);
        }
      } else {
        Alert.alert('No Results', 'No locations found for your search query.');
        setGeocodeResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      
      Alert.alert('Search Error', 'Unable to search for location. Please try again.');
      setGeocodeResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [region, properties, onLocationSearch]);

  // Find properties near a specific location
  const findPropertiesNearLocation = (location: LatLng, radiusKm: number): Property[] => {
    return validProperties.filter(property => {
      const distance = locationService.calculateDistance(
        location,
        property.location.coordinates
      );
      return distance <= radiusKm;
    });
  };

  const handleMarkerPress = (property: Property) => {
    onPropertyPress?.(property);
  };

  const handleCurrentLocationPress = () => {
    if (isLoadingLocation) return;

    if (currentLocation) {
      const region = locationService.getMapRegion(currentLocation, 0.02, 0.02);
      mapRef.current?.animateToRegion(region, 1000);
      onCurrentLocationPress?.();
    } else {
      getCurrentUserLocation();
    }
  };

  const handleSearchResultPress = (result: GeocodeResult) => {
    const newRegion = locationService.getMapRegion(result.coordinate, 0.02, 0.02);
    mapRef.current?.animateToRegion(newRegion, 1000);
    setShowSearchResults(false);
    
    const nearbyProperties = findPropertiesNearLocation(result.coordinate, 5);
    onLocationSearch?.(nearbyProperties);
  };

  const getMarkerColor = (property: Property): string => {
    switch (property.status) {
      case 'available':
        return '#10b981'; // Green
      case 'rented':
        return '#f59e0b'; // Orange
      case 'sold':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const fitToProperties = () => {
    if (validProperties.length === 0) return;

    const coordinates = validProperties.map(property => property.location.coordinates);

    // Add current location if available
    if (currentLocation) {
      coordinates.push(currentLocation);
    }

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  };

  // Custom cluster marker
  const renderCluster = (cluster: any) => {
    const { id, geometry, properties: clusterProps } = cluster;
    const points = clusterProps.point_count;
    
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
        }}
      >
        <View style={styles.clusterContainer}>
          <View style={[styles.clusterMarker, { backgroundColor: points > 20 ? '#ef4444' : points > 10 ? '#f59e0b' : '#10b981' }]}>
            <Text style={styles.clusterText}>{points}</Text>
          </View>
        </View>
      </Marker>
    );
  };

  // Custom property marker
  const renderMarker = (property: Property) => (
    <Marker
      key={property.id}
      coordinate={property.location.coordinates}
      onPress={() => handleMarkerPress(property)}
    >
      <View style={[styles.propertyMarker, { backgroundColor: getMarkerColor(property) }]}>
        <Text style={styles.propertyMarkerText}>🏠</Text>
      </View>
      <Callout onPress={() => handleMarkerPress(property)}>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle} numberOfLines={2}>
            {property.title}
          </Text>
          <Text style={styles.calloutPrice}>
            {formatPrice(property.price)}
          </Text>
          <View style={styles.calloutLocation}>
            <Text style={styles.calloutLocationText} numberOfLines={1}>
              {property.location.town}, {property.location.county}
            </Text>
            <View style={[styles.calloutStatus, { backgroundColor: getMarkerColor(property) }]}>
              <Text style={styles.calloutStatusText}>
                {getPropertyStatusInfo(property.status).label}
              </Text>
            </View>
          </View>
          {currentLocation && (
            <Text style={styles.calloutDistance}>
              {locationService.formatDistance(
                locationService.calculateDistance(
                  currentLocation,
                  property.location.coordinates
                )
              )}
            </Text>
          )}
          <Text style={styles.calloutAction}>Tap to view details →</Text>
        </View>
      </Callout>
    </Marker>
  );

  const MapComponent = enableClustering ? MapClusterer : MapView;

  return (
    <View style={[styles.container, style]}>
      {/* Search Bar */}
      {enableLocationSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search locations in ${region.charAt(0).toUpperCase() + region.slice(1)}...`}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => performLocationSearch(searchText)}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => performLocationSearch(searchText)}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results */}
      {showSearchResults && (
        <View style={styles.searchResults}>
          {geocodeResults.map((result, index) => (
            <TouchableOpacity
              key={index}
              style={styles.searchResultItem}
              onPress={() => handleSearchResultPress(result)}
            >
              <Text style={styles.searchResultName}>{result.name}</Text>
              <Text style={styles.searchResultAddress}>{result.formattedAddress}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Map */}
      <MapComponent
        ref={mapRef}
        style={styles.map}
        provider={REGION_CONFIGS[region].mapProvider}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={false} // We handle this manually
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType={mapStyle}
        clusterColor="#007AFF"
        clusterTextColor="#ffffff"
        renderCluster={enableClustering ? renderCluster : undefined}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="You are here"
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>
        )}

        {/* Property Markers */}
        {validProperties.map(renderMarker)}

        {/* Search Result Markers */}
        {geocodeResults.map((result, index) => (
          <Marker
            key={`search-${index}`}
            coordinate={result.coordinate}
            title={result.name}
            description={result.formattedAddress}
          >
            <View style={styles.searchResultMarker}>
              <Text style={styles.searchResultMarkerText}>📍</Text>
            </View>
          </Marker>
        ))}
      </MapComponent>

      {/* Map Controls */}
      <View style={styles.controls}>
        {/* Current Location Button */}
        {showCurrentLocation && (
          <TouchableOpacity
            onPress={handleCurrentLocationPress}
            style={[styles.controlButton, isLoadingLocation && styles.controlButtonDisabled]}
            disabled={isLoadingLocation}
          >
            <Text style={styles.controlButtonText}>
              {isLoadingLocation ? '⟳' : '📍'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Fit to Properties Button */}
        {validProperties.length > 0 && (
          <TouchableOpacity
            onPress={fitToProperties}
            style={styles.controlButton}
          >
            <Text style={styles.controlButtonText}>⌂</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Properties Count Indicator */}
      {validProperties.length > 0 && (
        <View style={styles.propertiesCount}>
          <Text style={styles.propertiesCountText}>
            {validProperties.length} {validProperties.length === 1 ? 'property' : 'properties'}
          </Text>
        </View>
      )}

      {/* No Properties Message */}
      {validProperties.length === 0 && (
        <View style={styles.noPropertiesOverlay}>
          <View style={styles.noPropertiesContainer}>
            <Text style={styles.noPropertiesTitle}>
              No properties found in this area
            </Text>
            <Text style={styles.noPropertiesSubtitle}>
              Try adjusting your search filters or zoom out to see more properties
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: '#374151',
  },
  searchButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#007AFF',
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  searchButtonText: {
    color: 'white',
    fontSize: fontSize.lg,
  },
  searchResults: {
    position: 'absolute',
    top: spacing.lg + 50,
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxHeight: 200,
  },
  searchResultItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchResultName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  searchResultAddress: {
    fontSize: fontSize.sm,
    color: '#6b7280',
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: spacing.xl + 60,
    right: spacing.md,
    flexDirection: 'column',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  controlButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  controlButtonText: {
    fontSize: fontSize.lg,
  },
  propertiesCount: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    backgroundColor: 'white',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  propertiesCountText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#374151',
  },
  noPropertiesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  noPropertiesContainer: {
    backgroundColor: 'white',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  noPropertiesTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  noPropertiesSubtitle: {
    fontSize: fontSize.sm,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Marker styles
  clusterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  clusterText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  propertyMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  propertyMarkerText: {
    fontSize: fontSize.md,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
  searchResultMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  searchResultMarkerText: {
    fontSize: fontSize.md,
  },
  // Callout styles
  calloutContainer: {
    width: 250,
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  calloutTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  calloutPrice: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: spacing.sm,
  },
  calloutLocation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  calloutLocationText: {
    fontSize: fontSize.sm,
    color: '#6b7280',
    flex: 1,
  },
  calloutStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  calloutStatusText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  calloutDistance: {
    fontSize: fontSize.xs,
    color: '#9ca3af',
    marginBottom: spacing.sm,
  },
  calloutAction: {
    fontSize: fontSize.xs,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default EnhancedPropertyMap;
