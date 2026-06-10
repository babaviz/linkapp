import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mock MapView component for web
export const MapView = ({ children, style, ...props }) => {
  return (
    <View style={[styles.mapContainer, style]}>
      <Text style={styles.mapPlaceholder}>
        🗺️ Map View
        {'\n'}(Web Preview)
      </Text>
      {children}
    </View>
  );
};

// Mock Marker component
export const Marker = ({ children, ...props }) => {
  return (
    <View style={styles.marker}>
      <Text style={styles.markerText}>📍</Text>
      {children}
    </View>
  );
};

// Mock Callout component
export const Callout = ({ children, ...props }) => {
  return (
    <View style={styles.callout}>
      {children}
    </View>
  );
};

// Mock other components
export const Polyline = () => null;
export const Polygon = () => null;
export const Circle = () => null;
export const Overlay = () => null;

// Mock constants
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#e6f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  mapPlaceholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  marker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  markerText: {
    fontSize: 20,
  },
  callout: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default MapView;