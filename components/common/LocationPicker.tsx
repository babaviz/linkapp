import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Alert, 
  Modal, 
  ScrollView, 
  StyleSheet, 
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import type { Camera } from 'react-native-maps';
import { 
  LocationCoordinates, 
  LocationSearchResult, 
  LocationHistory,
  GeocodeResult 
} from '../../types/property';
import locationService from '../../services/locationService';
import { spacing, fontSize } from '../../utils/responsive';
import { useTheme, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { getUserFacingError, getUserFacingErrorMessage } from '../../utils/userFacingError';
import {
  getCurrentLocation as getCurrentLocationThunk,
  requestLocationPermissions,
  selectHasLocationPermission,
} from '../../redux/slices/locationSlice';

interface LocationPickerProps {
  value?: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  placeholder?: string;
  style?: any;
  required?: boolean;
  region?: string; // For regional search bias
  enableHistory?: boolean;
  enableAutocomplete?: boolean;
  validateAddress?: boolean;
  maxHistoryItems?: number;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onLocationSelect,
  placeholder = "Select location",
  style,
  required = false,
  region = 'kenya',
  enableHistory = true,
  enableAutocomplete = true,
  validateAddress = false,
  maxHistoryItems = 10
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const animationRef = useRef(new Animated.Value(0)).current;
  
  // Redux selectors
  const hasLocationPermission = useAppSelector(selectHasLocationPermission);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(value);
  const [addressText, setAddressText] = useState(value?.address || '');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [autoDetectTriggered, setAutoDetectTriggered] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [enable3D, setEnable3D] = useState(true);
  
  // Enhanced search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState<LocationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Validation states
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (value) {
      setSelectedLocation(value);
      setAddressText(value.address || '');
    }
  }, [value]);
  
  // Load search history on component mount
  useEffect(() => {
    if (enableHistory) {
      loadSearchHistory();
    }
  }, [enableHistory]);
  
  // Auto-detect location when modal opens with permission
  useEffect(() => {
    if (isModalVisible && !autoDetectTriggered && hasLocationPermission && !selectedLocation) {
      setAutoDetectTriggered(true);
      setTimeout(() => {
        getCurrentLocationWithAnimation();
      }, 500);
    }
  }, [isModalVisible, hasLocationPermission, autoDetectTriggered]);
  
  // Load search history from storage
  const loadSearchHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('location_search_history');
      if (historyJson) {
        const history: LocationHistory[] = JSON.parse(historyJson);
        setSearchHistory(history.slice(0, maxHistoryItems));
      }
    } catch (error) {
      
    }
  };
  
  // Save search to history
  const saveToHistory = async (location: LocationCoordinates, address: string, query: string) => {
    if (!enableHistory) return;
    
    try {
      const newHistoryItem: LocationHistory = {
        id: Date.now().toString(),
        query,
        coordinate: location,
        formattedAddress: address,
        timestamp: new Date().toISOString(),
        resultCount: 1
      };
      
      const updatedHistory = [newHistoryItem, ...searchHistory.filter(item => 
        item.formattedAddress !== address
      )].slice(0, maxHistoryItems);
      
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem('location_search_history', JSON.stringify(updatedHistory));
    } catch (error) {
      
    }
  };
  
  // Clear search history
  const clearSearchHistory = async () => {
    try {
      await AsyncStorage.removeItem('location_search_history');
      setSearchHistory([]);
    } catch (error) {
      
    }
  };
  
  // Enhanced search with autocomplete
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !enableAutocomplete) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    setAddressError(null);
    
    try {
      const geocodeResult = await locationService.geocodeAddress(query, region);
      
      if (geocodeResult.success && geocodeResult.results) {
        // Transform results to include name field required by LocationSearchResult interface
        const transformedResults: LocationSearchResult[] = geocodeResult.results.map(result => ({
          ...result,
          name: result.formattedAddress.split(',')[0] || 'Unknown Location'
        }));
        setSearchResults(transformedResults);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
        if (query.length > 2) {
          setAddressError(geocodeResult.error || 'No results found');
        }
      }
    } catch (error) {
      
      setSearchResults([]);
      setShowSearchResults(false);
      setAddressError(getUserFacingErrorMessage(error, { action: 'search for a location' }));
    } finally {
      setIsSearching(false);
    }
  }, [enableAutocomplete, region]);
  
  // Debounced search
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300); // 300ms debounce
  };
  
  // Validate address
  const validateLocationAddress = async (coordinate: LocationCoordinates): Promise<boolean> => {
    if (!validateAddress) return true;
    
    setIsValidating(true);
    setAddressError(null);
    
    try {
      const result = await locationService.reverseGeocode(coordinate);
      
      if (result.success && result.address) {
        return true;
      } else {
        setAddressError('Unable to validate address for this location');
        return false;
      }
    } catch (error) {
      
      setAddressError(getUserFacingErrorMessage(error, { action: 'validate that address' }));
      return false;
    } finally {
      setIsValidating(false);
    }
  };
  
  // Select search result
  const handleSearchResultSelect = async (result: LocationSearchResult) => {
    setIsLoadingAddress(true);
    
    try {
      const isValid = await validateLocationAddress(result.coordinate);
      if (isValid) {
        const locationData = {
          ...result.coordinate,
          address: result.formattedAddress
        };
        
        setSelectedLocation(locationData);
        setAddressText(result.formattedAddress);
        setShowSearchResults(false);
        setSearchQuery('');
        
        // Save to history
        await saveToHistory(result.coordinate, result.formattedAddress, searchQuery);
      }
    } catch (error) {
      
      const friendly = getUserFacingError(error, {
        action: 'select this location',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsLoadingAddress(false);
    }
  };
  
  // Select from history
  const handleHistorySelect = async (historyItem: LocationHistory) => {
    const locationData = {
      ...historyItem.coordinate,
      address: historyItem.formattedAddress
    };
    
    setSelectedLocation(locationData);
    setAddressText(historyItem.formattedAddress);
    setShowHistory(false);
    setSearchQuery('');
  };

  // Prefer using the local hook if Redux thunk dispatching is problematic
  const handleGetCurrentLocation = async () => {
    setIsLoadingAddress(true);
    setAddressError(null);
    
    try {
      // Check permission first
      if (!hasLocationPermission) {
        const permAction = await dispatch(requestLocationPermissions(false) as any);
        if (!requestLocationPermissions.fulfilled.match(permAction) || !permAction.payload?.granted) {
          setAddressError('Location permission denied');
          Alert.alert('Permission Required', 'Location permission is required to use current location');
          return;
        }
      }
      
      const locationAction = await dispatch(getCurrentLocationThunk(true) as any);
      if (getCurrentLocationThunk.fulfilled.match(locationAction) && locationAction.payload?.location) {
        const reverseResult = await locationService.reverseGeocode(locationAction.payload.location);
        const formattedAddress = reverseResult.success && reverseResult.address 
          ? reverseResult.address.formattedAddress 
          : 'Current Location';
          
        const locationData = {
          ...locationAction.payload.location,
          address: formattedAddress
        };
        
        const isValid = await validateLocationAddress(locationAction.payload.location);
        if (isValid) {
          setSelectedLocation(locationData);
          setAddressText(formattedAddress);
          
          // Animate map to current location with 3D effect
          if (mapRef.current && enable3D) {
            const camera: Camera = {
              center: locationAction.payload.location,
              pitch: 45,
              heading: 0,
              altitude: 1000,
              zoom: 17,
            };
            mapRef.current.animateCamera(camera, { duration: 1500 });
          }
          
          // Save to history
          await saveToHistory(locationAction.payload.location, formattedAddress, 'Current Location');
        }
      } else {
        setAddressError('Unable to get current location');
        Alert.alert('Location Error', 'Unable to get current location');
      }
    } catch (error) {
      if (__DEV__) console.error('Location error:', error);
      setAddressError(getUserFacingErrorMessage(error, { action: 'get your current location' }));
      const friendly = getUserFacingError(error, {
        action: 'get your current location',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsLoadingAddress(false);
    }
  };
  
  const getCurrentLocationWithAnimation = async () => {
    // Animate entrance effect
    Animated.spring(animationRef, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    await handleGetCurrentLocation();
  };

  const handleMapPress = async (coordinate: { latitude: number; longitude: number }) => {
    setIsLoadingAddress(true);
    try {
      const addressResult = await Location.reverseGeocodeAsync(coordinate);
      const address = addressResult[0];
      const formattedAddress = address 
        ? `${address.street || ''} ${address.city || ''}, ${address.region || ''}, ${address.country || ''}`.trim()
        : `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;

      const locationData = {
        ...coordinate,
        address: formattedAddress
      };

      setSelectedLocation(locationData);
      setAddressText(formattedAddress);
      
      // Animate to selected location with 3D effect
      if (mapRef.current && enable3D) {
        const camera: Camera = {
          center: coordinate,
          pitch: 45,
          heading: 0,
          altitude: 800,
          zoom: 17,
        };
        mapRef.current.animateCamera(camera, { duration: 800 });
      }
    } catch (error) {
      if (__DEV__) console.error('Reverse geocode error:', error);
      const locationData = {
        ...coordinate,
        address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`
      };
      setSelectedLocation(locationData);
      setAddressText(locationData.address);
    } finally {
      setIsLoadingAddress(false);
    }
  };
  
  const toggleMapView = () => {
    if (mapRef.current) {
      if (enable3D) {
        mapRef.current.getCamera().then((camera) => {
          const newCamera: Camera = {
            ...camera,
            pitch: camera.pitch === 0 ? 45 : 0,
            altitude: camera.pitch === 0 ? 800 : 5000,
          };
          mapRef.current?.animateCamera(newCamera, { duration: 500 });
        });
      }
    }
  };
  
  const openFullScreenMap = () => {
    setIsModalVisible(false);
    (navigation as any).navigate('SelectLocation', {
      initialLocation: selectedLocation,
      onLocationSelect: (location: any) => {
        setSelectedLocation(location);
        setAddressText(location.address);
        onLocationSelect(location);
      },
      autoDetectOnLoad: !selectedLocation,
      enable3D: true,
    });
  };

  const confirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect({
        ...selectedLocation,
        address: addressText
      });
      setIsModalVisible(false);
    }
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setAddressText('');
    onLocationSelect({ latitude: 0, longitude: 0, address: '' });
  };

  return (
    <>
      <View style={[styles.container, style]}>
        <Pressable
          onPress={() => setIsModalVisible(true)}
          style={styles.selector}
        >
          <View style={styles.selectorContent}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <Text 
              style={[
                styles.selectorText,
                addressText ? styles.selectedText : styles.placeholderText
              ]}
              numberOfLines={1}
            >
              {addressText || placeholder}
            </Text>
          </View>
          {addressText ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                clearLocation();
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          )}
        </Pressable>
        {required && !addressText && (
          <Text style={styles.errorText}>Location is required</Text>
        )}
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header with SafeArea padding */}
          <View style={[
            styles.modalHeader, 
            { 
              borderBottomColor: colors.border,
              paddingTop: insets.top + spacing.sm,
            }
          ]}>
            <Pressable
              onPress={() => {
                setIsModalVisible(false);
                setShowSearchResults(false);
                setShowHistory(false);
                setSearchQuery('');
                setAddressError(null);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
            <Pressable
              onPress={confirmLocation}
              disabled={!selectedLocation || isValidating}
              style={[
                styles.doneButton,
                (selectedLocation && !isValidating) ? styles.doneButtonActive : styles.doneButtonDisabled
              ]}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[
                  styles.doneButtonText,
                  (selectedLocation && !isValidating) ? styles.doneButtonTextActive : styles.doneButtonTextDisabled
                ]}>
                  Done
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
          >
            {/* Enhanced Search Bar */}
            {enableAutocomplete && (
            <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
              <View style={[styles.searchInputContainer, { borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearchQueryChange}
                  placeholder={`Search locations in ${region}...`}
                  placeholderTextColor={colors.text + '80'}
                  style={[styles.searchInput, { color: colors.text }]}
                  returnKeyType="search"
                  onSubmitEditing={() => performSearch(searchQuery)}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoader} />
                )}
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                      Keyboard.dismiss();
                    }}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.text} />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Search/History Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setShowSearchResults(!showSearchResults && searchResults.length > 0);
                    setShowHistory(false);
                  }}
                  style={[styles.toggleButton, showSearchResults && styles.toggleButtonActive]}
                  disabled={searchResults.length === 0}
                >
                  <Text style={[styles.toggleText, { color: showSearchResults ? '#fff' : colors.text }]}>
                    Results ({searchResults.length})
                  </Text>
                </TouchableOpacity>
                
                {enableHistory && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowHistory(!showHistory);
                      setShowSearchResults(false);
                    }}
                    style={[styles.toggleButton, showHistory && styles.toggleButtonActive]}
                  >
                    <Text style={[styles.toggleText, { color: showHistory ? '#fff' : colors.text }]}>
                      History ({searchHistory.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={[styles.resultsContainer, { backgroundColor: colors.card, maxHeight: 200 }]}>
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `search-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSearchResultSelect(item)}
                    disabled={isLoadingAddress}
                  >
                    <View style={styles.resultIcon}>
                      <Ionicons name="location" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.resultText}>
                      <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.resultAddress, { color: colors.text + '80' }]} numberOfLines={2}>
                        {item.formattedAddress}
                      </Text>
                      {item.distance && (
                        <Text style={[styles.resultDistance, { color: colors.primary }]}>
                          ~{item.distance.toFixed(1)}km away
                        </Text>
                      )}
                    </View>
                    {isLoadingAddress && (
                      <ActivityIndicator size="small" color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.resultsList}
              />
            </View>
          )}

          {/* Search History */}
          {showHistory && searchHistory.length > 0 && (
            <View style={[styles.historyContainer, { backgroundColor: colors.card, maxHeight: 150 }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Searches</Text>
                <TouchableOpacity onPress={clearSearchHistory} style={styles.clearHistoryButton}>
                  <Text style={[styles.clearHistoryText, { color: colors.primary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={searchHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.historyItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleHistorySelect(item)}
                  >
                    <View style={styles.historyIcon}>
                      <Ionicons name="time" size={16} color={colors.text + '60'} />
                    </View>
                    <View style={styles.historyText}>
                      <Text style={[styles.historyQuery, { color: colors.text }]} numberOfLines={1}>
                        {item.query}
                      </Text>
                      <Text style={[styles.historyAddress, { color: colors.text + '80' }]} numberOfLines={1}>
                        {item.formattedAddress}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.historyList}
              />
            </View>
          )}

          {/* Quick Actions */}
          <View style={[styles.quickActionsContainer, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={handleGetCurrentLocation}
              style={styles.currentLocationButton}
              disabled={isLoadingAddress}
            >
              <View style={[styles.currentLocationIcon, { backgroundColor: colors.primary + '20' }]}>
                {isLoadingAddress ? (
                  <ActivityIndicator size={16} color={colors.primary} />
                ) : (
                  <Ionicons name="locate" size={20} color={colors.primary} />
                )}
              </View>
              <View style={styles.currentLocationTextContainer}>
                <Text style={[styles.currentLocationTitle, { color: colors.text }]}>Use Current Location</Text>
                <Text style={[styles.currentLocationSubtitle, { color: colors.text + '80' }]}>
                  {isLoadingAddress ? 'Getting your location...' : 'Automatically detect your location'}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={[styles.mapInstructions, { color: colors.text + '80' }]}>
                Tap on the map to select a location
              </Text>
              <TouchableOpacity
                onPress={openFullScreenMap}
                style={[styles.fullScreenButton, { backgroundColor: colors.primary + '20' }]}
              >
                <MaterialIcons name="fullscreen" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.mapWrapper, { borderColor: colors.border }]}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={selectedLocation ? {
                  ...selectedLocation,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                } : {
                  latitude: -1.2921,
                  longitude: 36.8219,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(event: MapPressEvent) => handleMapPress(event.nativeEvent.coordinate)}
                showsUserLocation={hasLocationPermission}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
                showsBuildings={enable3D}
                rotateEnabled={enable3D}
                pitchEnabled={enable3D}
                mapType={mapStyle}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={selectedLocation}
                    title="Selected Location"
                    description={addressText}
                  >
                    <View style={styles.customMarker}>
                      <View style={styles.markerInner}>
                        <Ionicons name="location" size={20} color="#fff" />
                      </View>
                      <View style={styles.markerTail} />
                    </View>
                  </Marker>
                )}
              </MapView>
              
              {/* Map Controls */}
              <View style={styles.mapControls}>
                <TouchableOpacity
                  style={[styles.mapControlButton, { backgroundColor: colors.card }]}
                  onPress={handleGetCurrentLocation}
                  disabled={isLoadingAddress}
                >
                  {isLoadingAddress ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialIcons name="my-location" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                {enable3D && (
                  <TouchableOpacity
                    style={[styles.mapControlButton, { backgroundColor: colors.card }]}
                    onPress={toggleMapView}
                  >
                    <MaterialIcons name="3d-rotation" size={20} color={colors.text} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Address Input with Validation */}
            <View style={[styles.addressContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Text style={[styles.addressLabel, { color: colors.text }]}>Address</Text>
              <TextInput
                value={addressText}
                onChangeText={setAddressText}
                placeholder="Enter or edit address"
                placeholderTextColor={colors.text + '60'}
                style={[
                  styles.addressInput, 
                  { 
                    color: colors.text, 
                    borderColor: addressError ? '#ef4444' : colors.border,
                    backgroundColor: colors.card 
                  }
                ]}
                multiline
                numberOfLines={2}
              />
              
              {/* Validation Status */}
              {(isLoadingAddress || isValidating) && (
                <View style={styles.validationContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.validationText, { color: colors.primary }]}>
                    {isValidating ? 'Validating address...' : 'Loading address...'}
                  </Text>
                </View>
              )}
              
              {addressError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{addressError}</Text>
                </View>
              )}
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles can be passed via props
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    height: 300,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  fullScreenButton: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  customMarker: {
    alignItems: 'center',
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  markerTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0D9488',
    marginTop: -1,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  selectorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    marginLeft: spacing.sm,
    flex: 1,
    fontSize: fontSize.md,
  },
  selectedText: {
    color: '#111827',
  },
  placeholderText: {
    color: '#6B7280',
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  doneButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  doneButtonActive: {
    backgroundColor: '#0D9488',
  },
  doneButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  doneButtonText: {
    fontWeight: '500',
    fontSize: fontSize.sm,
  },
  doneButtonTextActive: {
    color: 'white',
  },
  doneButtonTextDisabled: {
    color: '#6B7280',
  },
  
  // Enhanced Search Styles
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
  searchLoader: {
    marginLeft: spacing.sm,
  },
  clearSearchButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  
  // Search Results Styles
  resultsContainer: {
    maxHeight: 200,
    borderBottomWidth: 1,
  },
  resultsList: {
    paddingHorizontal: spacing.md,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.xs / 2,
  },
  resultAddress: {
    fontSize: fontSize.sm,
    lineHeight: 16,
  },
  resultDistance: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    marginTop: spacing.xs / 2,
  },
  
  // History Styles
  historyContainer: {
    maxHeight: 180,
    borderBottomWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  clearHistoryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearHistoryText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  historyList: {
    paddingHorizontal: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  historyIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  historyText: {
    flex: 1,
  },
  historyQuery: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs / 2,
  },
  historyAddress: {
    fontSize: fontSize.xs,
  },
  
  // Quick Actions Styles
  quickActionsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  currentLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  currentLocationTitle: {
    fontWeight: '500',
    fontSize: fontSize.md,
  },
  currentLocationSubtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs / 2,
  },
  
  // Map Styles
  mapContainer: {
    flex: 1,
    padding: spacing.md,
  },
  mapInstructions: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  
  // Address Input Styles
  addressContainer: {
    marginTop: spacing.md,
  },
  addressLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  addressInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Validation Styles
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  validationText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: '#ef4444',
  },
});

export default LocationPicker;
