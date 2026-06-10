// Simple, safe MapView fallback for Expo Go
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

// Try to load react-native-maps, fallback if not available
let MapViewComponent: any;
let MarkerComponent: any;
let CalloutComponent: any;
let PROVIDER_GOOGLE_VALUE: any;
let AnimatedRegionComponent: any;
let CameraComponent: any;
let AnimatedMarkerComponent: any;
let mapsAvailable = false;

try {
  // Only attempt to load on mobile platforms
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const Maps = require('react-native-maps');
    MapViewComponent = Maps.default || Maps.MapView;
    MarkerComponent = Maps.Marker;
    CalloutComponent = Maps.Callout;
    PROVIDER_GOOGLE_VALUE = Maps.PROVIDER_GOOGLE;
    AnimatedRegionComponent = Maps.AnimatedRegion;
    AnimatedMarkerComponent = Maps.Marker?.Animated || Maps.AnimatedMarker;
    mapsAvailable = true;
  }
} catch (error) {
  mapsAvailable = false;
}

const MapView = React.forwardRef<any, any>(({ style, children, region, onPress, ...props }, ref) => {
  // Use actual MapView if available and properly loaded
  if (mapsAvailable && MapViewComponent) {
    try {
      return (
        <MapViewComponent
          ref={ref}
          style={style}
          region={region}
          onPress={onPress}
          {...props}
        >
          {children}
        </MapViewComponent>
      );
    } catch (error) {
      // Fall through to fallback UI
    }
  }
  
  // Fallback UI when maps not available
  return (
  <View style={[styles.fallbackContainer, style]}>
    <View style={styles.fallbackContent}>
      <Text style={styles.fallbackIcon}>🗺️</Text>
      <Text style={styles.fallbackTitle}>Map View</Text>
      {region && (
        <Text style={styles.fallbackCoords}>
          📍 {region.latitude?.toFixed(4)}, {region.longitude?.toFixed(4)}
        </Text>
      )}
      <Text style={styles.fallbackDescription}>
        Interactive maps require a development build.
      </Text>
      <Text style={styles.fallbackInstructions}>
        Run: npx expo run:android
      </Text>
    </View>
    {children}
  </View>
  );
});

MapView.displayName = 'MapView';

const Marker = ({ children, coordinate, title, description, ...props }: { 
  children?: React.ReactNode; 
  coordinate?: any; 
  title?: string; 
  description?: string; 
  [key: string]: any;
}) => {
  // Use actual Marker if available
  if (MarkerComponent) {
    return (
      <MarkerComponent
        coordinate={coordinate}
        title={title}
        description={description}
        {...props}
      >
        {children}
      </MarkerComponent>
    );
  }
  
  // Fallback UI
  return (
  <View style={styles.markerFallback}>
    {title && <Text style={styles.markerTitle}>📍 {title}</Text>}
    {description && <Text style={styles.markerDescription}>{description}</Text>}
    {coordinate && (
      <Text style={styles.markerCoords}>
        {coordinate.latitude?.toFixed(4)}, {coordinate.longitude?.toFixed(4)}
      </Text>
    )}
    {children}
  </View>
  );
};

const Callout = ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
  // Use actual Callout if available
  if (CalloutComponent) {
    return (
      <CalloutComponent {...props}>
        {children}
      </CalloutComponent>
    );
  }
  
  // Fallback UI
  return (
  <View style={styles.calloutFallback}>{children}</View>
  );
};

const PROVIDER_GOOGLE = PROVIDER_GOOGLE_VALUE || 'google';

// Mock AnimatedRegion for fallback
class AnimatedRegion {
  constructor(region: any) {
    return region;
  }
  
  timing(config: any) {
    return {
      start: (callback?: () => void) => {
        if (callback) callback();
      },
    };
  }
}

// Mock Camera for fallback
type Camera = {
  center: { latitude: number; longitude: number };
  pitch?: number;
  heading?: number;
  altitude?: number;
  zoom?: number;
};

// Export AnimatedMarker
const AnimatedMarker = AnimatedMarkerComponent || Marker;

// Export proper AnimatedRegion
const AnimatedRegionExport = AnimatedRegionComponent || AnimatedRegion;

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  fallbackContent: {
    alignItems: 'center',
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fallbackCoords: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  fallbackDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  fallbackInstructions: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  markerFallback: {
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  markerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
  },
  markerDescription: {
    fontSize: 12,
    color: '#7f1d1d',
  },
  markerCoords: {
    fontSize: 10,
    color: '#991b1b',
  },
  calloutFallback: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 6,
  },
});

export default MapView;
export { 
  Marker, 
  Callout, 
  PROVIDER_GOOGLE, 
  AnimatedRegionExport as AnimatedRegion,
  AnimatedMarker
};
export type { Camera };

// Also export Marker.Animated for compatibility
if (Marker && !(Marker as any).Animated) {
  (Marker as any).Animated = AnimatedMarker;
}
