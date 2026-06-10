/**
 * PropertyLocationMap
 * Simple map component for displaying a single property's location using react-native-maps
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../MapView';
import { spacing } from '../../utils/responsive';

interface PropertyLocationMapProps {
  /** Property location data */
  property?: {
    id: string;
    title: string;
    location: {
      latitude?: number;
      longitude?: number;
      address: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  };
  /** Map height */
  height?: number;
  /** Custom style */
  style?: any;
  /** Show zoom controls */
  showZoomControls?: boolean;
}

const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({
  property,
  height = 250,
  style,
  showZoomControls = true,
}) => {
  // Extract coordinates from property - handle both direct and nested coordinates
  let latitude: number | undefined;
  let longitude: number | undefined;

  if (property?.location) {
    // Try direct latitude/longitude first
    if (property.location.latitude && property.location.longitude) {
      latitude = property.location.latitude;
      longitude = property.location.longitude;
    }
    // Then try coordinates object
    else if (property.location.coordinates) {
      latitude = property.location.coordinates.latitude;
      longitude = property.location.coordinates.longitude;
    }
  }

  // If no coordinates available, show placeholder
  if (!property || !latitude || !longitude) {
    return (
      <View style={[styles.container, { height }, style]}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderIcon}>📍</Text>
          <Text style={styles.placeholderTitle}>Location Map</Text>
          <Text style={styles.placeholderDescription}>
            {property?.location?.address || 'Property location not available'}
          </Text>
        </View>
      </View>
    );
  }

  // Use React Native Maps for all platforms
  return (
    <View style={[styles.container, { height }, style]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={property.title}
          description={property.location.address}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginVertical: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: spacing.lg,
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  placeholderDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: spacing.lg,
  },
  webFallbackIcon: {
    fontSize: 28,
    marginBottom: spacing.md,
  },
  webFallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  webFallbackPropertyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  webFallbackAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  webFallbackCoords: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  webFallbackNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Fallback styles when expo-maps is not available
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  fallbackPropertyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  fallbackAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  fallbackCoords: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fallbackNote: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  fallbackInstructions: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PropertyLocationMap;
