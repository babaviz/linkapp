/**
 * MapMarker Component
 * Enhanced marker component with clustering, custom icons, callouts, and different states
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { 
  LocationCoordinates, 
  MapMarkerData, 
  Property, 
  PropertyStatus,
  MapClusterData 
} from '../../types/property';
import { formatPrice, getPropertyStatusInfo } from '../../utils/propertyHelpers';
import { spacing, fontSize } from '../../utils/responsive';
import { useTheme } from '@react-navigation/native';

interface MapMarkerProps {
  data: MapMarkerData;
  onPress?: (marker: MapMarkerData) => void;
  onCalloutPress?: (marker: MapMarkerData) => void;
  showCallout?: boolean;
  customIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

interface ClusterMarkerProps {
  cluster: MapClusterData;
  onPress?: (cluster: MapClusterData) => void;
  size?: 'small' | 'medium' | 'large';
}

interface PropertyMarkerProps {
  property: Property;
  onPress?: (property: Property) => void;
  onCalloutPress?: (property: Property) => void;
  showDistance?: boolean;
  userLocation?: LocationCoordinates;
  size?: 'small' | 'medium' | 'large';
}

const { width: screenWidth } = Dimensions.get('window');

// Marker size configurations
const MARKER_SIZES = {
  small: { width: 24, height: 24, iconSize: 12 },
  medium: { width: 32, height: 32, iconSize: 16 },
  large: { width: 40, height: 40, iconSize: 20 },
};

// Property status colors
const STATUS_COLORS = {
  available: '#10b981',
  rented: '#f59e0b', 
  sold: '#ef4444',
  pending: '#8b5cf6',
  expired: '#6b7280',
  draft: '#6b7280',
};

// Marker type icons
const MARKER_ICONS = {
  property: '🏠',
  user: '📍',
  search: '🔍',
  poi: '📌',
};

/**
 * Get marker color based on type and status
 */
const getMarkerColor = (type: string, status?: PropertyStatus): string => {
  if (type === 'property' && status) {
    return STATUS_COLORS[status] || STATUS_COLORS.available;
  }
  
  switch (type) {
    case 'user':
      return '#007AFF';
    case 'search':
      return '#8b5cf6';
    case 'poi':
      return '#ef4444';
    default:
      return STATUS_COLORS.available;
  }
};

/**
 * Get cluster color based on count
 */
const getClusterColor = (count: number): string => {
  if (count > 50) return '#ef4444'; // Red for large clusters
  if (count > 20) return '#f59e0b'; // Orange for medium clusters  
  if (count > 5) return '#10b981';  // Green for small clusters
  return '#007AFF'; // Blue for tiny clusters
};

/**
 * Calculate distance between two coordinates
 */
const calculateDistance = (
  from: LocationCoordinates, 
  to: LocationCoordinates
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Format distance for display
 */
const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
};

/**
 * Generic MapMarker Component
 */
const MapMarker: React.FC<MapMarkerProps> = memo(({
  data,
  onPress,
  onCalloutPress,
  showCallout = true,
  customIcon,
  size = 'medium',
  animated = true
}) => {
  const { colors } = useTheme();
  const markerSize = MARKER_SIZES[size];
  const markerColor = getMarkerColor(data.type, data.status);
  
  return (
    <Marker
      coordinate={data.coordinate}
      onPress={() => onPress?.(data)}
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -markerSize.height / 2 }}
      tracksViewChanges={false} // Optimize performance
    >
      <View style={[
        styles.markerContainer,
        {
          width: markerSize.width,
          height: markerSize.height,
          backgroundColor: markerColor,
        }
      ]}>
        {customIcon || (
          <Text style={[styles.markerIcon, { fontSize: markerSize.iconSize }]}>
            {MARKER_ICONS[data.type as keyof typeof MARKER_ICONS] || '📍'}
          </Text>
        )}
      </View>
      
      {showCallout && (
        <Callout 
          onPress={() => onCalloutPress?.(data)}
          tooltip={false}
        >
          <View style={[styles.calloutContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.calloutTitle, { color: colors.text }]} numberOfLines={2}>
              {data.title}
            </Text>
            {data.description && (
              <Text style={[styles.calloutDescription, { color: colors.text }]} numberOfLines={1}>
                {data.description}
              </Text>
            )}
            <TouchableOpacity
              style={styles.calloutButton}
              onPress={() => onCalloutPress?.(data)}
            >
              <Text style={styles.calloutButtonText}>View Details →</Text>
            </TouchableOpacity>
          </View>
        </Callout>
      )}
    </Marker>
  );
});

/**
 * Cluster Marker Component
 */
const ClusterMarker: React.FC<ClusterMarkerProps> = memo(({
  cluster,
  onPress,
  size = 'medium'
}) => {
  const markerSize = MARKER_SIZES[size];
  const clusterColor = getClusterColor(cluster.count);
  
  return (
    <Marker
      coordinate={cluster.coordinate}
      onPress={() => onPress?.(cluster)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <View style={[
        styles.clusterContainer,
        {
          width: markerSize.width + 8,
          height: markerSize.height + 8,
          borderColor: clusterColor,
        }
      ]}>
        <View style={[
          styles.clusterInner,
          {
            backgroundColor: clusterColor,
            width: markerSize.width,
            height: markerSize.height,
          }
        ]}>
          <Text style={[
            styles.clusterText,
            { fontSize: markerSize.iconSize }
          ]}>
            {cluster.count > 99 ? '99+' : cluster.count.toString()}
          </Text>
        </View>
      </View>
    </Marker>
  );
});

/**
 * Property-specific Marker Component
 */
const PropertyMarker: React.FC<PropertyMarkerProps> = memo(({
  property,
  onPress,
  onCalloutPress,
  showDistance = false,
  userLocation,
  size = 'medium'
}) => {
  const { colors } = useTheme();
  const markerSize = MARKER_SIZES[size];
  const statusInfo = getPropertyStatusInfo(property.status);
  const markerColor = STATUS_COLORS[property.status] || STATUS_COLORS.available;
  
  // Calculate distance if user location is provided
  const distance = userLocation && showDistance 
    ? calculateDistance(userLocation, property.location.coordinates)
    : undefined;
  
  return (
    <Marker
      coordinate={property.location.coordinates}
      onPress={() => onPress?.(property)}
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -markerSize.height / 2 }}
      tracksViewChanges={false}
    >
      <View style={[
        styles.propertyMarker,
        {
          width: markerSize.width,
          height: markerSize.height,
          backgroundColor: markerColor,
        }
      ]}>
        <Text style={[styles.propertyIcon, { fontSize: markerSize.iconSize }]}>
          🏠
        </Text>
        
        {/* Status indicator */}
        <View style={[styles.statusIndicator, { backgroundColor: markerColor }]} />
      </View>
      
      <Callout 
        onPress={() => onCalloutPress?.(property)}
        tooltip={false}
      >
        <View style={[styles.propertyCallout, { backgroundColor: colors.card }]}>
          <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>
            {property.title}
          </Text>
          
          <Text style={styles.propertyPrice}>
            {formatPrice(property.price, property.currency)}
          </Text>
          
          <View style={styles.propertyInfo}>
            <Text style={[styles.propertyLocation, { color: colors.text }]} numberOfLines={1}>
              {property.location.town}, {property.location.county}
            </Text>
            
            <View style={[styles.propertyStatus, { backgroundColor: markerColor }]}>
              <Text style={styles.propertyStatusText}>{statusInfo.label}</Text>
            </View>
          </View>
          
          {/* Property details */}
          <View style={styles.propertyDetails}>
            {property.bedrooms && (
              <Text style={[styles.propertyDetailText, { color: colors.text }]}>
                🛏️ {property.bedrooms}
              </Text>
            )}
            {property.bathrooms && (
              <Text style={[styles.propertyDetailText, { color: colors.text }]}>
                🛁 {property.bathrooms}
              </Text>
            )}
            {property.area_sqm && (
              <Text style={[styles.propertyDetailText, { color: colors.text }]}>
                📐 {property.area_sqm}m²
              </Text>
            )}
          </View>
          
          {distance && (
            <Text style={styles.propertyDistance}>
              {formatDistance(distance)}
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.propertyCalloutButton}
            onPress={() => onCalloutPress?.(property)}
          >
            <Text style={styles.propertyCalloutButtonText}>View Property →</Text>
          </TouchableOpacity>
        </View>
      </Callout>
    </Marker>
  );
});

const styles = StyleSheet.create({
  markerContainer: {
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerIcon: {
    color: 'white',
    textAlign: 'center',
  },
  clusterContainer: {
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterInner: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  propertyMarker: {
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  propertyIcon: {
    color: 'white',
    textAlign: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  calloutContainer: {
    width: Math.min(screenWidth * 0.6, 200),
    padding: spacing.sm,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  calloutDescription: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  calloutButton: {
    alignSelf: 'flex-start',
    paddingTop: spacing.xs,
  },
  calloutButtonText: {
    color: '#007AFF',
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  propertyCallout: {
    width: Math.min(screenWidth * 0.7, 280),
    padding: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  propertyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  propertyPrice: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: spacing.sm,
  },
  propertyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  propertyLocation: {
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  propertyStatus: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  propertyStatusText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  propertyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  propertyDetailText: {
    fontSize: fontSize.xs,
    flex: 1,
    textAlign: 'center',
  },
  propertyDistance: {
    fontSize: fontSize.xs,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  propertyCalloutButton: {
    backgroundColor: '#007AFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  propertyCalloutButtonText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});

// Export all marker types
export { MapMarker, ClusterMarker, PropertyMarker };
export default MapMarker;
