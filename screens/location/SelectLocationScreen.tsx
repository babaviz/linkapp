import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  getCurrentLocation,
  requestLocationPermissions,
  reverseGeocodeCoordinates,
  setSelectedMapLocation,
  saveRecentLocation,
  selectCurrentLocation,
  selectHasLocationPermission,
  selectIsLoadingCurrentLocation,
} from '../../redux/slices/locationSlice';
import { spacing, fontSize } from '../../utils/responsive';

// Safe import of MapView components
let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;
let Camera: any;
let AnimatedRegion: any;
try {
  if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps.MapView;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
    Camera = Maps.Camera;
    AnimatedRegion = Maps.AnimatedRegion;
  }
} catch (error) {
  // Import fallback components
  const FallbackMaps = require('../../components/MapView.native');
  MapView = FallbackMaps.default;
  Marker = FallbackMaps.Marker;
  PROVIDER_GOOGLE = FallbackMaps.PROVIDER_GOOGLE;
  AnimatedRegion = FallbackMaps.AnimatedRegion;
}

const { width, height } = Dimensions.get('window');

interface SelectLocationScreenProps {
  onLocationSelect?: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  autoDetectOnLoad?: boolean;
  enable3D?: boolean;
}

const SelectLocationScreen: React.FC<SelectLocationScreenProps> = ({
  onLocationSelect,
  initialLocation,
  autoDetectOnLoad = true,
  enable3D = true,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<typeof MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Redux state
  const currentLocation = useAppSelector(selectCurrentLocation);
  const hasLocationPermission = useAppSelector(selectHasLocationPermission);
  const isLoadingCurrentLocation = useAppSelector(selectIsLoadingCurrentLocation);

  // Local state
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || currentLocation);
  const [selectedAddress, setSelectedAddress] = useState(initialLocation?.address || '');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [markerCoordinate, setMarkerCoordinate] = useState(() => {
    if (AnimatedRegion) {
      return new AnimatedRegion({
        latitude: initialLocation?.latitude || -1.2921,
        longitude: initialLocation?.longitude || 36.8219,
        latitudeDelta: 0,
        longitudeDelta: 0,
      });
    }
    return {
      latitude: initialLocation?.latitude || -1.2921,
      longitude: initialLocation?.longitude || 36.8219,
    };
  });

  // Default Kenya region
  const defaultRegion = {
    latitude: -1.2921,
    longitude: 36.8219,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-detect location on load if permission is granted
    if (autoDetectOnLoad) {
      checkAndRequestLocation();
    }
  }, []);

  const checkAndRequestLocation = async () => {
    try {
      // Check if we already have permission
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Permission granted, get current location
        await detectCurrentLocation();
      } else {
        // Request permission
        const permissionAction = await dispatch(requestLocationPermissions(true) as any);
        if (requestLocationPermissions.fulfilled.match(permissionAction) && permissionAction.payload?.granted) {
          await detectCurrentLocation();
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error checking location permission:', error);
    }
  };

  const detectCurrentLocation = async () => {
    try {
      const locationAction = await dispatch(getCurrentLocation(true) as any);
      if (!getCurrentLocation.fulfilled.match(locationAction)) {
        throw new Error('Failed to get current location');
      }
      const result = locationAction.payload;
      
      if (result.location) {
        const { latitude, longitude } = result.location;
        
        // Animate to current location with 3D effect
        if (mapRef.current) {
          const camera: typeof Camera = {
            center: { latitude, longitude },
            pitch: enable3D ? 45 : 0,
            heading: 0,
            altitude: enable3D ? 1000 : 5000,
            zoom: enable3D ? 17 : 15,
          };
          
          mapRef.current.animateCamera(camera, { duration: 1500 });
        }

        // Update marker position with animation
        if (markerCoordinate && markerCoordinate.timing) {
          markerCoordinate.timing({
            latitude,
            longitude,
            duration: 1000,
            useNativeDriver: false,
          }).start();
        } else {
          // Fallback: update without animation
          setMarkerCoordinate({
            latitude,
            longitude,
          });
        }

        // Get address for current location
        await updateLocationAddress({ latitude, longitude });
        
        setSelectedLocation({ latitude, longitude });
        
        // Show success feedback
        showLocationDetectedFeedback();
      }
    } catch (error) {
      if (__DEV__) console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. You can manually select a location on the map.',
        [{ text: 'OK' }]
      );
    }
  };

  const showLocationDetectedFeedback = () => {
    // Visual feedback when location is detected
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const updateLocationAddress = async (coordinate: { latitude: number; longitude: number }) => {
    setIsLoadingAddress(true);
    try {
      const reverseAction = await dispatch(reverseGeocodeCoordinates(coordinate) as any);
      if (reverseGeocodeCoordinates.fulfilled.match(reverseAction) && reverseAction.payload?.success && reverseAction.payload?.address) {
        setSelectedAddress(reverseAction.payload.address.formattedAddress);
      } else {
        // Fallback to coordinates if reverse geocoding fails
        setSelectedAddress(`${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
      }
    } catch (error) {
      if (__DEV__) console.error('Error getting address:', error);
      setSelectedAddress(`${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { coordinate } = event.nativeEvent;
    
    // Animate marker to new position
    if (markerCoordinate && markerCoordinate.timing) {
      markerCoordinate.timing({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      setMarkerCoordinate({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
    }

    setSelectedLocation(coordinate);
    await updateLocationAddress(coordinate);

    // Animate camera to selected location with 3D effect
    if (mapRef.current && enable3D) {
      const camera: typeof Camera = {
        center: coordinate,
        pitch: 45,
        heading: 0,
        altitude: 800,
        zoom: 17,
      };
      mapRef.current.animateCamera(camera, { duration: 800 });
    }
  };

  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please select a location on the map');
      return;
    }

    // Save to recent locations
    await dispatch(saveRecentLocation(selectedLocation) as any);
    
    // Save selected location to redux
    dispatch(setSelectedMapLocation({
      ...selectedLocation,
      address: selectedAddress,
    }));

    // Callback if provided
    if (onLocationSelect) {
      onLocationSelect({
        ...selectedLocation,
        address: selectedAddress,
      });
    }

    // Navigate back or close
    navigation.goBack();
  };

  const toggleMapStyle = () => {
    if (mapRef.current && enable3D) {
      // Toggle between 2D and 3D view
      mapRef.current.getCamera().then((camera) => {
        const newCamera: typeof Camera = {
          ...camera,
          pitch: camera.pitch === 0 ? 45 : 0,
          altitude: camera.pitch === 0 ? 800 : 5000,
        };
        mapRef.current?.animateCamera(newCamera, { duration: 500 });
      });
    }
  };

  const centerOnCurrentLocation = () => {
    detectCurrentLocation();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            styles.container,
            { 
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Header with SafeArea padding */}
          <View style={[
            styles.header, 
            { 
              backgroundColor: colors.card,
              paddingTop: insets.top + spacing.sm,
            }
          ]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Select Location
          </Text>
          
          <TouchableOpacity
            onPress={handleConfirmLocation}
            style={[styles.confirmButton, selectedLocation && styles.confirmButtonActive]}
            disabled={!selectedLocation}
          >
            <Text style={[
              styles.confirmButtonText,
              { color: selectedLocation ? '#fff' : colors.text + '50' }
            ]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={selectedLocation ? {
              ...selectedLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            } : defaultRegion}
            onPress={handleMapPress}
            onMapReady={() => setMapReady(true)}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            showsBuildings={enable3D}
            showsTraffic={false}
            rotateEnabled={enable3D}
            pitchEnabled={enable3D}
            toolbarEnabled={false}
            mapType="standard"
            customMapStyle={[
              {
                featureType: "all",
                elementType: "geometry",
                stylers: [{ visibility: "simplified" }]
              },
              {
                featureType: "road",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }]
              }
            ]}
          >
            {selectedLocation && Marker && (
              Marker.Animated ? (
                <Marker.Animated
                  coordinate={markerCoordinate}
                  title="Selected Location"
                  description={selectedAddress}
                >
                  <View style={styles.customMarker}>
                    <View style={styles.markerInner}>
                      <Ionicons name="location" size={24} color="#fff" />
                    </View>
                    <View style={styles.markerTail} />
                  </View>
                </Marker.Animated>
              ) : (
                <Marker
                  coordinate={markerCoordinate}
                  title="Selected Location"
                  description={selectedAddress}
                >
                  <View style={styles.customMarker}>
                    <View style={styles.markerInner}>
                      <Ionicons name="location" size={24} color="#fff" />
                    </View>
                    <View style={styles.markerTail} />
                  </View>
                </Marker>
              )
            )}
          </MapView>

          {/* Map Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              style={[styles.mapControlButton, { backgroundColor: colors.card }]}
              onPress={centerOnCurrentLocation}
              disabled={isLoadingCurrentLocation}
            >
              {isLoadingCurrentLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="my-location" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            {enable3D && (
              <TouchableOpacity
                style={[styles.mapControlButton, { backgroundColor: colors.card }]}
                onPress={toggleMapStyle}
              >
                <MaterialIcons name="3d-rotation" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Map Instructions */}
          {mapReady && !selectedLocation && (
            <Animated.View 
              style={[
                styles.instructionBanner,
                { 
                  backgroundColor: colors.card,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.instructionText, { color: colors.text }]}>
                Tap on the map to select a location
              </Text>
            </Animated.View>
          )}
        </View>

          {/* Location Info Card */}
          {selectedLocation && (
            <Animated.View 
              style={[
                styles.locationCard,
                { 
                  backgroundColor: colors.card,
                  transform: [{ translateY: slideAnim }],
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                }
              ]}
            >
            <View style={styles.locationCardHeader}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={[styles.locationLabel, { color: colors.text + '80' }]}>
                  Selected Location
                </Text>
                {isLoadingAddress ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowAddressInput(!showAddressInput)}
                    style={styles.addressContainer}
                  >
                    <Text 
                      style={[styles.locationAddress, { color: colors.text }]}
                      numberOfLines={showAddressInput ? undefined : 2}
                    >
                      {selectedAddress || 'Getting address...'}
                    </Text>
                    <Ionicons 
                      name={showAddressInput ? "chevron-up" : "create-outline"} 
                      size={16} 
                      color={colors.text + '60'} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Editable Address Input */}
            {showAddressInput && (
              <View style={styles.addressInputContainer}>
                <TextInput
                  value={selectedAddress}
                  onChangeText={setSelectedAddress}
                  placeholder="Enter or edit address"
                  placeholderTextColor={colors.text + '50'}
                  style={[
                    styles.addressInput,
                    { 
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    }
                  ]}
                  multiline
                  numberOfLines={2}
                  maxLength={200}
                />
                <Text style={[styles.coordinatesText, { color: colors.text + '60' }]}>
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  confirmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: '#D1D5DB',
  },
  confirmButtonActive: {
    backgroundColor: '#0D9488',
  },
  confirmButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    gap: spacing.sm,
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  instructionBanner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: 60,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  instructionText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    flex: 1,
  },
  locationCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D948810',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  locationAddress: {
    fontSize: fontSize.md,
    flex: 1,
    lineHeight: 22,
  },
  addressInputContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addressInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  coordinatesText: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  customMarker: {
    alignItems: 'center',
  },
  markerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0D9488',
    marginTop: -2,
  },
});

export default SelectLocationScreen;
