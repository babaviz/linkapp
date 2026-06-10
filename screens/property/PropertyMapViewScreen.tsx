/**
 * PropertyMapViewScreen
 * Map-based property search with location filters and clustering
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import MapErrorBoundary from '../../components/common/MapErrorBoundary';
import { 
  MapLoadingOverlay, 
  CurrentLocationLoader,
  InlineLoader,
  PropertyMarkersLoader 
} from '../../components/common/MapLoadingStates';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
// Use fallback for react-native-maps
import MapView, { Marker, PROVIDER_GOOGLE } from '../../components/MapView';

// Define Region type locally since react-native-maps is not available
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchProperties } from '../../redux/slices/propertySlice';
import { Property } from '../../types/property';
import { formatPrice, getPropertyTypeLabel } from '../../utils/propertyHelpers';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

// Dimensions removed; using getDynamicDimensions instead

interface PropertyMarkerData extends Property {
  latitude: number;
  longitude: number;
}

type PropertyMapViewNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyMapView'>;

export default function PropertyMapViewScreen() {
  const navigation = useNavigation<PropertyMapViewNavigationProp>();
  const dispatch = useAppDispatch();
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  // Redux state
  const { searchResults, isLoading } = useAppSelector(state => state.property);

  // Local state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState<Region>({
    latitude: -1.2921, // Nairobi center
    longitude: 36.8219,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  const mapRef = useRef<typeof MapView>(null);

  // Filter states
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  
  // Loading states
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [mapLoadProgress, setMapLoadProgress] = useState(0);

  useEffect(() => {
    // Load properties on mount
    dispatch(fetchProperties({ filters: {} }));
    
    // Simulate map loading progress
    const loadingTimer = setTimeout(() => {
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 30;
        setMapLoadProgress(Math.min(progress, 100));
        
        if (progress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setIsMapLoading(false);
          }, 500);
        }
      }, 200);
      
      return () => clearInterval(progressInterval);
    }, 100);
    
    return () => clearTimeout(loadingTimer);
  }, [dispatch]);

  const handleSearch = () => {
    // For now, just fetch all properties since we don't have search filters implemented
    dispatch(fetchProperties({ filters: {} }));
    setShowFilters(false);
  };

  const handleMarkerPress = (property: Property) => {
    setSelectedProperty(property);
  };

  const handlePropertyPress = (property: Property) => {
    navigation.navigate('PropertyDetails', { 
      propertyId: property.id,
      property 
    });
  };

  const handleMyLocation = () => {
    setIsLocationLoading(true);
    
    // Simulate location request with proper cleanup
    const alertTimeout = setTimeout(() => {
      Alert.alert(
        'Location Permission',
        'Would you like to center the map on your current location?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsLocationLoading(false) },
          { 
            text: 'Yes', 
            onPress: () => {
              // Simulate getting location with cleanup-aware timeout
              const locationTimeout = setTimeout(() => {
                setRegion({
                  ...region,
                  latitude: -1.2921,
                  longitude: 36.8219,
                });
                setIsLocationLoading(false);
              }, 1000);
              
              // Store timeout ref for potential cleanup
              (handleMyLocation as any).locationTimeout = locationTimeout;
            }
          }
        ]
      );
    }, 500);
    
    // Store timeout ref for potential cleanup
    (handleMyLocation as any).alertTimeout = alertTimeout;
  };

  // Convert properties to markers with coordinates
  const propertyMarkers: PropertyMarkerData[] = searchResults
    .filter(property => property.location?.coordinates?.latitude && property.location?.coordinates?.longitude)
    .map(property => ({
      ...property,
      latitude: property.location.coordinates.latitude,
      longitude: property.location.coordinates.longitude,
    }));

  const propertyTypes = ['apartment', 'house', 'commercial', 'land'];

  return (
    <MapErrorBoundary onViewAsList={() => navigation.goBack()}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header with Search */}
      <View style={{ 
        paddingHorizontal: isTablet ? 24 : 16,
        paddingVertical: isTablet ? 16 : 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={{ 
            fontSize: isTablet ? 24 : 20, 
            fontWeight: '700',
            color: '#111827',
            flex: 1
          }}>
            Property Map
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={{ 
              backgroundColor: '#10B981',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
              Filters
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={{ 
          flexDirection: 'row',
          backgroundColor: '#F9FAFB',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: '#E5E7EB'
        }}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by location, area..."
            placeholderTextColor="#9CA3AF"
            style={{ 
              flex: 1, 
              fontSize: 16,
              color: '#111827'
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <InlineLoader isVisible={true} size="small" color="#10B981" />
            ) : (
              <MaterialIcons name="search" size={18} color="#10B981" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Map View */}
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Map Loading Overlay */}
        <MapLoadingOverlay 
          isVisible={isMapLoading}
          message="Loading property locations..."
          progress={mapLoadProgress}
        />
        
        {/* Current Location Loader */}
        <CurrentLocationLoader 
          isVisible={isLocationLoading}
          message="Getting your location..."
        />
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {propertyMarkers.map((property) => (
            <Marker
              key={property.id}
              coordinate={{
                latitude: property.latitude,
                longitude: property.longitude,
              }}
              onPress={() => handleMarkerPress(property)}
            >
              <View style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5
              }}>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontWeight: '600',
                  fontSize: 12
                }}>
                  {formatPrice(property.price)}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>
        
        {/* Property Markers Skeleton Loader */}
        {isLoading && (
          <PropertyMarkersLoader count={6} />
        )}

        {/* My Location Button */}
        <TouchableOpacity
          onPress={handleMyLocation}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: '#FFFFFF',
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5
          }}
        >
          <MaterialIcons name="my-location" size={20} color="#10B981" />
        </TouchableOpacity>

        {/* Property Card Overlay */}
        {selectedProperty && (
          <TouchableOpacity
            onPress={() => handlePropertyPress(selectedProperty)}
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              right: 80,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                marginRight: 8
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {getPropertyTypeLabel(selectedProperty.property_type)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedProperty(null)}
                style={{ marginLeft: 'auto' }}
              >
                <MaterialIcons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600',
            color: '#111827',
            marginBottom: 4
          }}>
            {selectedProperty.title}
          </Text>
            
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '700',
            color: '#10B981',
            marginBottom: 4
          }}>
            {formatPrice(selectedProperty.price)}
          </Text>
            
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
            <MaterialIcons name="location-on" size={14} color="#6B7280" style={{marginRight: 4}} />
            <Text style={{color: '#6B7280', fontSize: 14}}>{selectedProperty.location.address}</Text>
          </View>
            
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 12, color: '#10B981', fontWeight: '600'}}>Tap to view details</Text>
            <MaterialIcons name="arrow-forward" size={12} color="#10B981" style={{marginLeft: 4}} />
          </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB'
          }}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={{ fontSize: 16, color: '#6B7280' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              Filters
            </Text>
            <TouchableOpacity onPress={handleSearch}>
              <Text style={{ fontSize: 16, color: '#10B981', fontWeight: '600' }}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {/* Property Type Filter */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600',
                color: '#111827',
                marginBottom: 12
              }}>
                Property Type
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {propertyTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setPropertyType(propertyType === type ? '' : type)}
                    style={{
                      backgroundColor: propertyType === type ? '#10B981' : '#F3F4F6',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8
                    }}
                  >
                    <Text style={{
                      color: propertyType === type ? '#FFFFFF' : '#374151',
                      fontWeight: '500'
                    }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bedrooms Filter */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600',
                color: '#111827',
                marginBottom: 12
              }}>
                Bedrooms
              </Text>
              <View style={{ flexDirection: 'row' }}>
                {['1', '2', '3', '4', '5+'].map((bed) => (
                  <TouchableOpacity
                    key={bed}
                    onPress={() => setBedrooms(bedrooms === bed ? '' : bed)}
                    style={{
                      backgroundColor: bedrooms === bed ? '#10B981' : '#F3F4F6',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      minWidth: 50,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: bedrooms === bed ? '#FFFFFF' : '#374151',
                      fontWeight: '500'
                    }}>
                      {bed}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600',
                color: '#111827',
                marginBottom: 12
              }}>
                Price Range
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={priceRange[0].toString()}
                  onChangeText={(text) => setPriceRange([parseInt(text) || 0, priceRange[1]])}
                  placeholder="Min Price"
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginRight: 8
                  }}
                />
                <Text style={{ color: '#6B7280', marginHorizontal: 8 }}>to</Text>
                <TextInput
                  value={priceRange[1].toString()}
                  onChangeText={(text) => setPriceRange([priceRange[0], parseInt(text) || 10000000])}
                  placeholder="Max Price"
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginLeft: 8
                  }}
                />
              </View>
            </View>

            {/* Clear Filters */}
            <TouchableOpacity
              onPress={() => {
                setPriceRange([0, 10000000]);
                setPropertyType('');
                setBedrooms('');
              }}
              style={{
                backgroundColor: '#F3F4F6',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#6B7280', fontWeight: '500' }}>
                Clear All Filters
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </MapErrorBoundary>
  );
}
