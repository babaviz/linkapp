import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, StyleSheet, Animated } from 'react-native';
// Use fallback for react-native-maps
import MapView, { Marker, PROVIDER_GOOGLE } from '../MapView';
import type { Camera } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { getUserFacingError } from '../../utils/userFacingError';

interface MapViewProps {
  markers?: {
    id: string;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    title: string;
    description?: string;
    color?: string;
  }[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  onMarkerPress?: (marker: any) => void;
  showUserLocation?: boolean;
  height?: number;
  style?: any;
  enable3D?: boolean;
  mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain';
  showsBuildings?: boolean;
  showsTraffic?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  animateToRegion?: boolean;
  clusterMarkers?: boolean;
  customMapStyle?: any[];
}

type MapViewHandle = {
  animateCamera?: (camera: Camera, options?: { duration?: number }) => void;
  animateToRegion?: (region: any, duration?: number) => void;
};

const CustomMapView: React.FC<MapViewProps> = ({
  markers = [],
  initialRegion,
  onMapPress,
  onMarkerPress,
  showUserLocation = false,
  height = 300,
  style,
  enable3D = true,
  mapType = 'standard',
  showsBuildings = true,
  showsTraffic = false,
  showsCompass = true,
  showsScale = true,
  animateToRegion = true,
  clusterMarkers = false,
  customMapStyle,
}) => {
  const mapRef = useRef<MapViewHandle | null>(null);
  const animationRef = useRef(new Animated.Value(0)).current;
  const [region, setRegion] = useState(
    initialRegion || {
      latitude: -1.2921, // Nairobi, Kenya
      longitude: 36.8219,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }
  );
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (showUserLocation) {
      getCurrentLocation();
    }
  }, [showUserLocation]);

  useEffect(() => {
    if (mapReady && animateToRegion && initialRegion) {
      animateToLocation(initialRegion);
    }
  }, [mapReady, initialRegion]);

  const animateToLocation = (location: any, duration = 1500) => {
    if (mapRef.current) {
      if (enable3D) {
        const camera: Camera = {
          center: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          pitch: 45,
          heading: 0,
          altitude: 1000,
          zoom: 17,
        };
        mapRef.current?.animateCamera?.(camera, { duration });
      } else {
        mapRef.current?.animateToRegion?.(
          {
            ...location,
            latitudeDelta: location.latitudeDelta || 0.01,
            longitudeDelta: location.longitudeDelta || 0.01,
          },
          duration
        );
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your current location'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(location);
      
      if (!initialRegion && mapReady) {
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        animateToLocation(newRegion);
      }
    } catch (error) {
      
      const friendly = getUserFacingError(error, {
        action: 'get your current location',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const handleMapPress = (event: any) => {
    if (onMapPress) {
      const coordinate = event.nativeEvent.coordinate;
      onMapPress(coordinate);
      
      // Animate to pressed location with 3D effect
      if (enable3D && mapRef.current) {
        const camera: Camera = {
          center: coordinate,
          pitch: 45,
          heading: 0,
          altitude: 800,
          zoom: 17,
        };
        mapRef.current?.animateCamera?.(camera, { duration: 800 });
      }
    }
  };

  const handleMapReady = () => {
    setMapReady(true);
    
    // Entrance animation
    Animated.spring(animationRef, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const renderCustomMarker = (marker: any) => {
    const markerColor = marker.color || '#0D9488';
    return (
      <View style={styles.customMarker}>
        <View style={[styles.markerInner, { backgroundColor: markerColor }]}>
          <Ionicons name="location" size={20} color="#fff" />
        </View>
        <View style={[styles.markerTail, { borderTopColor: markerColor }]} />
      </View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          height,
          opacity: animationRef,
          transform: [
            {
              scale: animationRef.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        }, 
        style
      ]}
    >
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        onPress={handleMapPress}
        onMapReady={handleMapReady}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={showUserLocation}
        showsCompass={showsCompass}
        showsScale={showsScale}
        showsBuildings={showsBuildings}
        showsTraffic={showsTraffic}
        rotateEnabled={enable3D}
        pitchEnabled={enable3D}
        toolbarEnabled={false}
        mapType={mapType}
        customMapStyle={customMapStyle || [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ visibility: "simplified" }],
          },
          {
            featureType: "road",
            elementType: "labels.icon",
            stylers: [{ visibility: "simplified" }],
          },
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ]}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            onPress={() => onMarkerPress && onMarkerPress(marker)}
          >
            {renderCustomMarker(marker)}
          </Marker>
        ))}
        
        {userLocation && showUserLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            title="Your Location"
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationOuter}>
                <View style={styles.userLocationInner} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    alignItems: 'center',
  },
  markerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: '#fff',
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
  userLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 153, 225, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4299E1',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default CustomMapView;
