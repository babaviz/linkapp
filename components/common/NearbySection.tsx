import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocationRecommendations } from '../../hooks/useLocationRecommendations';
import { getUserFacingError } from '../../utils/userFacingError';

interface NearbySectionProps<T> {
  module: 'property' | 'jobs' | 'services' | 'datemi';
  title?: string;
  defaultRadiusKm?: number;
  maxResults?: number;
  fetchNearby: (
    location: { latitude: number; longitude: number },
    radiusKm: number,
    limit: number
  ) => Promise<Array<{ item: T; distance?: number; distanceFormatted?: string }>>;
  renderItem: (data: {
    item: T;
    distance?: number;
    distanceFormatted?: string;
  }) => React.ReactElement;
  onItemPress?: (item: T) => void;
  emptyMessage?: string;
}

export function NearbySection<T>({
  module,
  title = '📍 Nearby',
  defaultRadiusKm = 10,
  maxResults = 10,
  fetchNearby,
  renderItem,
  onItemPress,
  emptyMessage = 'No nearby items found'
}: NearbySectionProps<T>) {
  const [nearbyItems, setNearbyItems] = useState<
    Array<{ item: T; distance?: number; distanceFormatted?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(defaultRadiusKm);

  const {
    userLocation,
    isLoadingLocation,
    locationError,
    getUserLocation,
    hasLocationPermission
  } = useLocationRecommendations({
    module,
    autoFetch: true,
    defaultRadiusKm,
    useCurrentLocation: true,
    onLocationError: (error) => {
      if (__DEV__) {
        console.warn('Location error:', error);
      }
    }
  });

  const loadNearbyItems = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    try {
      const results = await fetchNearby(userLocation, radiusKm, maxResults);
      setNearbyItems(results);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading nearby items:', error);
      }
      const friendly = getUserFacingError(error, {
        action: 'load nearby items',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation && !isLoadingLocation) {
      loadNearbyItems();
    }
  }, [userLocation, radiusKm]);

  const handleEnableLocation = async () => {
    const result = await getUserLocation();
    if (result) {
      loadNearbyItems();
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
  };

  if (!hasLocationPermission && !userLocation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.permissionPrompt}>
          <Ionicons name="location-outline" size={48} color="#666" />
          <Text style={styles.permissionText}>
            Enable location to see nearby recommendations
          </Text>
          <TouchableOpacity style={styles.enableButton} onPress={handleEnableLocation}>
            <Ionicons name="location" size={20} color="#fff" />
            <Text style={styles.enableButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.radiusSelector}>
          {[5, 10, 20, 50].map((radius) => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusButton,
                radiusKm === radius && styles.radiusButtonActive
              ]}
              onPress={() => handleRadiusChange(radius)}
            >
              <Text
                style={[
                  styles.radiusButtonText,
                  radiusKm === radius && styles.radiusButtonTextActive
                ]}
              >
                {radius}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {locationError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#e74c3c" />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {(isLoading || isLoadingLocation) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding nearby items...</Text>
        </View>
      )}

      {!isLoading && !isLoadingLocation && nearbyItems.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          <Text style={styles.emptySubtext}>Try increasing the search radius</Text>
        </View>
      )}

      {!isLoading && nearbyItems.length > 0 && (
        <FlatList
          data={nearbyItems}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `nearby-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onItemPress?.(item.item)}
              activeOpacity={0.7}
            >
              {renderItem(item)}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  radiusSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  radiusButtonActive: {
    backgroundColor: '#007AFF',
  },
  radiusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  radiusButtonTextActive: {
    color: '#fff',
  },
  permissionPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#e74c3c',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
