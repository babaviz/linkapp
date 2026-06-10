import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Property } from '../../types/property';

interface NearbyPropertyCardProps {
  property: Property;
  distance?: number;
  distanceFormatted?: string;
}

export function NearbyPropertyCard({
  property,
  distance,
  distanceFormatted
}: NearbyPropertyCardProps) {
  const imageUrl = property.images && property.images.length > 0
    ? property.images[0]
    : 'https://via.placeholder.com/200x150?text=No+Image';

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      
      {distanceFormatted && (
        <View style={styles.distanceBadge}>
          <Ionicons name="location" size={12} color="#fff" />
          <Text style={styles.distanceText}>{distanceFormatted}</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {property.title}
        </Text>
        
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.location} numberOfLines={1}>
            {property.location.town}, {property.location.county}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          {property.bedrooms && (
            <View style={styles.detail}>
              <Ionicons name="bed-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{property.bedrooms}</Text>
            </View>
          )}
          {property.bathrooms && (
            <View style={styles.detail}>
              <Ionicons name="water-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{property.bathrooms}</Text>
            </View>
          )}
          {property.area_sqm && (
            <View style={styles.detail}>
              <Ionicons name="resize-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{property.area_sqm}m²</Text>
            </View>
          )}
        </View>

        <Text style={styles.price}>
          KSH {property.price.toLocaleString()}
          <Text style={styles.pricePeriod}>
            {property.price_period === 'monthly' ? '/mo' : ''}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  location: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  pricePeriod: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
});
