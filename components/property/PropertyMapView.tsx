/**
 * PropertyMapView Component
 * Displays properties on an interactive map with markers and callouts
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Dimensions } from 'react-native';
// Use platform-specific MapView entrypoints; TS may not resolve types for web fallback
 
// @ts-ignore
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from '../MapView';
// On web, '../MapView' resolves to a fallback; ensure TS knows the module exists
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _EnsureMapViewModuleExists = typeof MapView;

// Define Region type locally since react-native-maps is not available
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

type MapViewHandle = {
  animateToRegion?: (region: Region, duration?: number) => void;
  fitToCoordinates?: (
    coordinates: Array<{ latitude: number; longitude: number }>,
    options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean }
  ) => void;
};
import { Property, LocationCoordinates } from '../../types/property';
import { getPropertyStatusInfo, formatPrice } from '../../utils/propertyHelpers';
import locationService from '../../services/locationService';

const { width, height } = Dimensions.get('window');

interface PropertyMapViewProps {
  properties: Property[];
  onPropertyPress?: (property: Property) => void;
  onCurrentLocationPress?: () => void;
  showCurrentLocation?: boolean;
  initialRegion?: Region;
  style?: any;
}

const isValidCoordinate = (coord: LocationCoordinates): boolean => {
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

const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties,
  onPropertyPress,
  onCurrentLocationPress,
  showCurrentLocation = true,
  initialRegion,
  style
}) => {
  const validProperties = properties.filter(p => isValidCoordinate(p.location.coordinates));
  const mapRef = useRef<MapViewHandle | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(
    initialRegion || {
      latitude: -1.286389, // Nairobi center
      longitude: 36.817223,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1
    }
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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

  const getMarkerColor = (property: Property): string => {
    const statusInfo = getPropertyStatusInfo(property.status);
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

    const coordinates = validProperties.map(property => ({
      latitude: property.location.coordinates.latitude,
      longitude: property.location.coordinates.longitude
    }));

    // Add current location if available
    if (currentLocation) {
      coordinates.push(currentLocation);
    }

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true
    });
  };

  return (
    <View style={[{ flex: 1 }, style]}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={false} // We'll handle this manually
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="You are here"
            pinColor="#007AFF"
          >
            <View style={{
              width: 16,
              height: 16,
              backgroundColor: '#3B82F6',
              borderRadius: 8,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5
            }} />
          </Marker>
        )}

        {/* Property Markers */}
        {validProperties.map((property) => (
          <Marker
            key={property.id}
            coordinate={property.location.coordinates}
            pinColor={getMarkerColor(property)}
            onPress={() => handleMarkerPress(property)}
          >
            <Callout
              tooltip={false}
              onPress={() => handleMarkerPress(property)}
            >
              <View style={{
                width: 256,
                padding: 12,
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5
              }}>
                <Text style={{
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: 4
                }} numberOfLines={2}>
                  {property.title}
                </Text>
                
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#059669',
                  marginBottom: 8
                }}>
                  {formatPrice(property.price)}
                </Text>
                
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: '#4B5563'
                  }} numberOfLines={1}>
                    {property.location.town}, {property.location.county}
                  </Text>
                  
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 16,
                    backgroundColor: getMarkerColor(property)
                  }}>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '500'
                    }}>
                      {getPropertyStatusInfo(property.status).label}
                    </Text>
                  </View>
                </View>

                {currentLocation && (
                  <Text style={{
                    fontSize: 12,
                    color: '#6B7280',
                    marginTop: 4
                  }}>
                    {locationService.formatDistance(
                      locationService.calculateDistance(
                        currentLocation,
                        property.location.coordinates
                      )
                    )}
                  </Text>
                )}
                
                <Text style={{
                  fontSize: 12,
                  color: '#059669',
                  marginTop: 8,
                  fontWeight: '500'
                }}>
                  Tap to view details →
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Map Controls */}
      <View style={{
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'column',
        gap: 8
      }}>
        {/* Current Location Button */}
        {showCurrentLocation && (
          <TouchableOpacity
            onPress={handleCurrentLocationPress}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLoadingLocation ? '#9CA3AF' : '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5
            }}
            disabled={isLoadingLocation}
          >
            <Text style={{
              fontSize: 18,
              color: isLoadingLocation ? '#4B5563' : '#059669'
            }}>
              {isLoadingLocation ? '⟳' : '📍'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Fit to Properties Button */}
        {properties.length > 0 && (
          <TouchableOpacity
            onPress={fitToProperties}
            style={{
              width: 48,
              height: 48,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5
            }}
          >
            <Text style={{
              fontSize: 18,
              color: '#059669'
            }}>⌀</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Properties Count Indicator */}
      {validProperties.length > 0 && (
        <View style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: '#374151'
          }}>
            {validProperties.length} {validProperties.length === 1 ? 'property' : 'properties'}
          </Text>
        </View>
      )}

      {/* No Properties Message */}
      {validProperties.length === 0 && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            marginHorizontal: 16
          }}>
            <Text style={{
              textAlign: 'center',
              color: '#4B5563',
              fontSize: 18,
              marginBottom: 8
            }}>
              No properties found in this area
            </Text>
            <Text style={{
              textAlign: 'center',
              color: '#6B7280',
              fontSize: 14
            }}>
              Try adjusting your search filters or zoom out to see more properties
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default PropertyMapView;
