/**
 * PropertyMapScreen
 * Screen showcasing the enhanced map functionality with clustering, regional support, and location search
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import MapErrorBoundary from '../../components/common/MapErrorBoundary';
import { MapLoadingOverlay, CurrentLocationLoader } from '../../components/common/MapLoadingStates';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchPropertiesNearLocation } from '../../redux/slices/propertySlice';
import EnhancedPropertyMap from '../../components/property/EnhancedPropertyMap';
import { Property } from '../../types/property';
import { spacing, fontSize } from '../../utils/responsive';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';
import locationService from '../../services/locationService';
import { propertyService } from '../../services/propertyService';
import { NearbySection } from '../../components/common/NearbySection';
import { getUserFacingError } from '../../utils/userFacingError';

type PropertyMapScreenNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyHub'>;

interface MapSettings {
  enableClustering: boolean;
  enableLocationSearch: boolean;
  showCurrentLocation: boolean;
  mapStyle: 'standard' | 'satellite' | 'hybrid' | 'terrain';
  region: 'kenya' | 'uganda' | 'tanzania' | 'global';
}

export default function PropertyMapScreen() {
  const navigation = useNavigation<PropertyMapScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { searchResults, isLoading } = useAppSelector(state => state.property);

  const [properties, setProperties] = useState<Property[]>(searchResults || []);
  const [showSettings, setShowSettings] = useState(false);
  const [searchResults_, setSearchResults] = useState<Property[]>([]);
  const [locationSearchResults, setLocationSearchResults] = useState<Property[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    enableClustering: true,
    enableLocationSearch: true,
    showCurrentLocation: true,
    mapStyle: 'standard',
    region: 'kenya',
  });

  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      setProperties(searchResults);
    }
  }, [searchResults]);
  
  useEffect(() => {
    if (locationSearchResults.length > 0) {
      setProperties(locationSearchResults);
    }
  }, [locationSearchResults]);
  
  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsMapLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const handlePropertyPress = (property: Property) => {
    navigation.navigate('PropertyDetails', {
      propertyId: property.id,
      property: property,
    });
  };

  const fetchNearbyProperties = useCallback(async (
    location: { latitude: number; longitude: number },
    radiusKm: number,
    limit: number
  ) => {
    try {
      const results = await propertyService.getRecommendedPropertiesNearby(
        false,
        radiusKm,
        limit
      );
      return results.map(r => ({
        item: r.property,
        distance: r.distance,
        distanceFormatted: r.distanceFormatted
      }));
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching nearby properties:', error);
      }
      return [];
    }
  }, []);

  const handleCurrentLocationPress = async () => {
    setIsLocationLoading(true);
    try {
      const result = await locationService.getCurrentLocation();
      if (result.success && result.location) {
        await dispatch(fetchPropertiesNearLocation({
          coordinates: result.location,
          radius: 10,
          limit: 50,
        })).unwrap();
        
        Alert.alert('Location Found', 'Showing properties near your current location.');
      } else {
        Alert.alert('Location Error', result.error || 'Could not get your current location.');
      }
    } catch (error) {
      
      const friendly = getUserFacingError(error, {
        action: 'get your current location',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleLocationSearch = useCallback((searchResults: Property[]) => {
    setSearchResults(searchResults);
    setLocationSearchResults(searchResults);
    
    if (searchResults.length > 0) {
      Alert.alert(
        'Properties Found',
        `Found ${searchResults.length} properties in the searched area.`,
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'View List', 
            onPress: () => {
              navigation.navigate('PropertySearchResults', {
                searchQuery: {
                  searchText: 'Location Search Results',
                  properties: searchResults
                }
              });
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'No Properties Found',
        'No properties found in the searched location. Try expanding your search area or adjusting filters.'
      );
    }
  }, [navigation]);

  function updateMapSetting<K extends keyof MapSettings>(
    key: K,
    value: MapSettings[K]
  ) {
    setMapSettings(prev => ({ ...prev, [key]: value }));
  }

  const getMapStyleLabel = (style: string) => {
    const labels = {
      standard: 'Standard',
      satellite: 'Satellite',
      hybrid: 'Hybrid',
      terrain: 'Terrain',
    };
    return labels[style as keyof typeof labels] || 'Standard';
  };

  const getRegionLabel = (region: string) => {
    const labels = {
      kenya: 'Kenya',
      uganda: 'Uganda',
      tanzania: 'Tanzania',
      global: 'Global',
    };
    return labels[region as keyof typeof labels] || 'Global';
  };

  return (
    <MapErrorBoundary onViewAsList={() => navigation.goBack()}>
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Property Map</Text>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(!showSettings)}
        >
          <MaterialIcons name="settings" size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Clustering Toggle */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Clustering</Text>
              <Switch
                value={mapSettings.enableClustering}
                onValueChange={(value) => updateMapSetting('enableClustering', value)}
              />
            </View>

            {/* Location Search Toggle */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Location Search</Text>
              <Switch
                value={mapSettings.enableLocationSearch}
                onValueChange={(value) => updateMapSetting('enableLocationSearch', value)}
              />
            </View>

            {/* Current Location Toggle */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Show Current Location</Text>
              <Switch
                value={mapSettings.showCurrentLocation}
                onValueChange={(value) => updateMapSetting('showCurrentLocation', value)}
              />
            </View>

            {/* Map Style Selection */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Map Style</Text>
              <View style={styles.buttonGroup}>
                {(['standard', 'satellite', 'hybrid', 'terrain'] as const).map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.optionButton,
                      mapSettings.mapStyle === style && styles.optionButtonActive,
                    ]}
                    onPress={() => updateMapSetting('mapStyle', style)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        mapSettings.mapStyle === style && styles.optionButtonTextActive,
                      ]}
                    >
                      {getMapStyleLabel(style)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Region Selection */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Region</Text>
              <View style={styles.buttonGroup}>
                {(['kenya', 'uganda', 'tanzania', 'global'] as const).map((region) => (
                  <TouchableOpacity
                    key={region}
                    style={[
                      styles.optionButton,
                      mapSettings.region === region && styles.optionButtonActive,
                    ]}
                    onPress={() => updateMapSetting('region', region)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        mapSettings.region === region && styles.optionButtonTextActive,
                      ]}
                    >
                      {getRegionLabel(region)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        {/* Map Loading Overlay */}
        <MapLoadingOverlay 
          isVisible={isMapLoading}
          message="Loading enhanced map features..."
        />
        
        {/* Current Location Loader */}
        <CurrentLocationLoader 
          isVisible={isLocationLoading}
          message="Getting your location..."
        />
        <EnhancedPropertyMap
          properties={properties}
          onPropertyPress={handlePropertyPress}
          onCurrentLocationPress={handleCurrentLocationPress}
          onLocationSearch={handleLocationSearch}
          showCurrentLocation={mapSettings.showCurrentLocation}
          enableClustering={mapSettings.enableClustering}
          enableLocationSearch={mapSettings.enableLocationSearch}
          mapStyle={mapSettings.mapStyle}
          region={mapSettings.region}
          style={styles.map}
        />
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Properties:</Text>
          <Text style={styles.statusValue}>{properties.length}</Text>
        </View>
        
        {searchResults_.length > 0 && (
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Search Results:</Text>
            <Text style={styles.statusValue}>{searchResults_.length}</Text>
          </View>
        )}
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Clustering:</Text>
          <Text style={[styles.statusValue, { color: mapSettings.enableClustering ? '#10b981' : '#ef4444' }]}>
            {mapSettings.enableClustering ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* Feature Info Overlay */}
      {!showSettings && (
        <View style={styles.featureInfo}>
          <Text style={styles.featureTitle}>🗺️ Enhanced Map Features</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• 📍 Location search with regional bias</Text>
            <Text style={styles.featureItem}>• 🔍 Smart marker clustering</Text>
            <Text style={styles.featureItem}>• 🌍 Multi-region support</Text>
            <Text style={styles.featureItem}>• 📡 Current location tracking</Text>
            <Text style={styles.featureItem}>• 🛰️ Multiple map styles</Text>
          </View>
        </View>
      )}
      </SafeAreaView>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'white',
    ...getCrossPlatformShadow({ width: 0, height: 2, color: '#000', opacity: 0.1, radius: 4, elevation: 2 }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#374151',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: fontSize.lg,
  },
  settingsPanel: {
    backgroundColor: 'white',
    maxHeight: 200,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...getCrossPlatformShadow({ width: 0, height: 2, color: '#000', opacity: 0.1, radius: 4, elevation: 2 }),
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
    marginLeft: spacing.md,
  },
  optionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginLeft: spacing.xs,
    marginBottom: spacing.xs,
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: fontSize.sm,
    color: '#6b7280',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: 'white',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'space-around',
    ...getCrossPlatformShadow({ width: 0, height: -2, color: '#000', opacity: 0.1, radius: 4, elevation: 2 }),
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: fontSize.xs,
    color: '#6b7280',
    marginBottom: spacing.xs / 2,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    color: '#374151',
  },
  featureInfo: {
    position: 'absolute',
    bottom: 100,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: spacing.md,
    maxWidth: 200,
  },
  featureTitle: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.sm,
  },
  featureList: {
    // gap replaced with margin on individual items
  },
  featureItem: {
    fontSize: fontSize.xs,
    color: 'white',
    lineHeight: 16,
  },
});
