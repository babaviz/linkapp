import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapViewProps {
  style?: any;
  region?: any;
  children?: React.ReactNode;
  onRegionChange?: (region: any) => void;
  onRegionChangeComplete?: (region: any) => void;
  provider?: any;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  mapType?: string;
}

// Create a forwardRef component to handle ref
const MapViewComponent = React.forwardRef<any, MapViewProps>(({ 
  style, 
  region, 
  children, 
  onRegionChange,
  onRegionChangeComplete,
  ...props 
}, ref) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>
        Map view is not available on web.{'\n'}
        Use mobile app for full map functionality.
      </Text>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#4B5563',
    textAlign: 'center',
  },
});

MapViewComponent.displayName = 'MapView';

export default MapViewComponent;

export const Marker = ({ 
  coordinate, 
  children, 
  title, 
  description, 
  pinColor, 
  onPress 
}: { 
  coordinate: any; 
  children?: React.ReactNode;
  title?: string;
  description?: string;
  pinColor?: string;
  onPress?: () => void;
}) => (
  <View>
    {children}
  </View>
);

export const Callout = ({ 
  children, 
  tooltip, 
  onPress 
}: { 
  children?: React.ReactNode;
  tooltip?: boolean;
  onPress?: () => void;
}) => (
  <View>
    {children}
  </View>
);

export const PROVIDER_GOOGLE = 'google';
