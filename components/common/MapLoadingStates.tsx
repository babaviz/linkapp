/**
 * MapLoadingStates Component
 * Essential loading indicators and skeleton loaders for map screens
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

// Map loading overlay
export const MapLoadingOverlay: React.FC<{
  isVisible: boolean;
  message?: string;
  progress?: number;
}> = ({ isVisible, message = 'Loading map...', progress }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.mapLoadingOverlay}>
      <View style={styles.loadingContent}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
        
        <Text style={styles.loadingTitle}>Loading Map</Text>
        <Text style={styles.loadingMessage}>{message}</Text>
        
        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(100, progress))}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Property markers loading skeleton
export const PropertyMarkersLoader: React.FC<{
  count?: number;
}> = ({ count = 8 }) => {
  return (
    <View style={styles.markersContainer}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonMarker key={index} delay={index * 100} />
      ))}
    </View>
  );
};

// Individual skeleton marker
const SkeletonMarker: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const opacity = new Animated.Value(0.3);
  
  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, [opacity, delay]);
  
  return (
    <Animated.View style={[styles.skeletonMarker, { opacity }]}>
      <View style={styles.skeletonMarkerInner} />
    </Animated.View>
  );
};

// Location search loading
export const LocationSearchLoader: React.FC<{
  isVisible: boolean;
}> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.searchLoader}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.searchLoaderText}>Searching locations...</Text>
    </View>
  );
};

// Current location loading
export const CurrentLocationLoader: React.FC<{
  isVisible: boolean;
  message?: string;
}> = ({ isVisible, message = 'Getting your location...' }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.locationLoader}>
      <View style={styles.locationLoaderContent}>
        <View style={styles.locationLoaderIcon}>
          <Ionicons name="location" size={24} color="#007AFF" />
          <ActivityIndicator 
            size="small" 
            color="#007AFF" 
            style={styles.locationSpinner}
          />
        </View>
        <Text style={styles.locationLoaderText}>{message}</Text>
      </View>
    </View>
  );
};

// Map controls loading placeholder
export const MapControlsSkeleton: React.FC = () => {
  return (
    <View style={styles.controlsSkeleton}>
      <SkeletonBox width={48} height={48} borderRadius={24} />
      <SkeletonBox width={48} height={48} borderRadius={24} />
    </View>
  );
};

// Generic skeleton box
const SkeletonBox: React.FC<{
  width: number;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const opacity = new Animated.Value(0.3);
  
  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, [opacity]);
  
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e5e7eb',
          opacity,
        },
        style
      ]}
    />
  );
};

// Property card loading skeleton
export const PropertyCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardSkeletonHeader}>
        <SkeletonBox width={60} height={20} borderRadius={10} />
        <SkeletonBox width={20} height={20} borderRadius={10} />
      </View>
      
      <SkeletonBox 
        width={screenWidth - 120} 
        height={18} 
        borderRadius={4} 
        style={{ marginBottom: spacing.sm }}
      />
      
      <SkeletonBox 
        width={80} 
        height={22} 
        borderRadius={4} 
        style={{ marginBottom: spacing.sm }}
      />
      
      <SkeletonBox 
        width={screenWidth - 160} 
        height={16} 
        borderRadius={4} 
        style={{ marginBottom: spacing.sm }}
      />
      
      <SkeletonBox 
        width={100} 
        height={14} 
        borderRadius={4} 
      />
    </View>
  );
};

// Inline loading indicator for buttons/actions
export const InlineLoader: React.FC<{
  isVisible: boolean;
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}> = ({ isVisible, size = 'small', color = '#007AFF', text }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.inlineLoader}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text style={[styles.inlineLoaderText, { color }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

// Map region changing indicator
export const MapRegionLoader: React.FC<{
  isVisible: boolean;
}> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.regionLoader}>
      <ActivityIndicator size="small" color="#ffffff" />
      <Text style={styles.regionLoaderText}>Updating view...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Map loading overlay
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
  },
  loadingIcon: {
    marginBottom: spacing.lg,
  },
  loadingTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacing.sm,
  },
  loadingMessage: {
    fontSize: fontSize.md,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Property markers skeleton
  markersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  skeletonMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    top: Math.random() * 300 + 100,
    left: Math.random() * (screenWidth - 64) + 32,
  },
  skeletonMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
  },

  // Location search loader
  searchLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchLoaderText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: '#6b7280',
  },

  // Current location loader
  locationLoader: {
    position: 'absolute',
    top: 100,
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
  },
  locationLoaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.95)',
    padding: spacing.md,
    borderRadius: 8,
  },
  locationLoaderIcon: {
    position: 'relative',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  locationSpinner: {
    position: 'absolute',
  },
  locationLoaderText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '500',
  },

  // Controls skeleton
  controlsSkeleton: {
    position: 'absolute',
    top: 120,
    right: spacing.md,
    gap: spacing.sm,
  },

  // Property card skeleton
  cardSkeleton: {
    backgroundColor: 'white',
    padding: spacing.md,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSkeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Inline loader
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineLoaderText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: '500',
  },

  // Map region loader
  regionLoader: {
    position: 'absolute',
    top: spacing.lg,
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    zIndex: 998,
  },
  regionLoaderText: {
    marginLeft: spacing.sm,
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});

export default {
  MapLoadingOverlay,
  PropertyMarkersLoader,
  LocationSearchLoader,
  CurrentLocationLoader,
  MapControlsSkeleton,
  PropertyCardSkeleton,
  InlineLoader,
  MapRegionLoader,
};
