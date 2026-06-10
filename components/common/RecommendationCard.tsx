import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Material3Card from './Material3Card';
import { RecommendationItem } from '../../services/recommendationService';
import InteractiveComponent from './InteractiveComponent';
import { useResponsiveLayout } from '../../utils/responsive';

interface RecommendationCardProps {
  item: RecommendationItem;
  onPress: () => void;
  compact?: boolean;
}

export default function RecommendationCard({ item, onPress, compact = false }: RecommendationCardProps) {
  const layout = useResponsiveLayout();
  
  const getTypeColor = () => {
    switch (item.type) {
      case 'property': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'job': return { bg: '#D1FAE5', text: '#059669' };
      case 'service': return { bg: '#E9D5FF', text: '#7C3AED' };
      case 'profile': return { bg: '#FCE7F3', text: '#DB2777' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const getTypeIcon = () => {
    switch (item.type) {
      case 'property': return 'home';
      case 'job': return 'briefcase';
      case 'service': return 'construct';
      case 'profile': return 'person';
      default: return 'apps';
    }
  };

  const colors = getTypeColor();
  const icon = getTypeIcon();
  
  const cardWidth = layout.isDesktop ? 320 : layout.isTablet ? 280 : 256;
  const imageSize = layout.isDesktop ? 80 : layout.isTablet ? 72 : 64;

  if (compact) {
    return (
      <InteractiveComponent 
        onPress={onPress} 
        style={[
          styles.compactContainer,
          { marginRight: layout.spacing.sm, marginBottom: layout.spacing.sm }
        ]} 
        animationType="scale"
      >
        <Material3Card style={StyleSheet.flatten([styles.compactCard, { width: cardWidth }])}>
          <View style={[styles.compactContent, { padding: layout.spacing.sm }]}>
            <View style={styles.compactRow}>
              {item.imageUrl && (
                <Image 
                  source={{ uri: item.imageUrl }} 
                  style={[
                    styles.compactImage, 
                    { width: imageSize, height: imageSize, borderRadius: layout.borderRadius('sm') }
                  ]}
                  resizeMode="cover"
                />
              )}
              
              <View style={styles.compactTextContainer}>
                <View style={styles.compactHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.text }]}>
                      {item.type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={12} color="#EAB308" />
                    <Text style={styles.ratingText}>
                      {Math.round(item.relevanceScore)}%
                    </Text>
                  </View>
                </View>

                <Text style={[styles.compactTitle, { fontSize: layout.fontSize.sm }]} numberOfLines={2}>
                  {item.title}
                </Text>
                
                <Text style={[styles.compactReason, { fontSize: layout.fontSize.xs }]} numberOfLines={1}>
                  {item.reason}
                </Text>

                {item.price && (
                  <Text style={[styles.compactPrice, { fontSize: layout.fontSize.sm }]}>
                    KES {item.price.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Material3Card>
      </InteractiveComponent>
    );
  }

  const fullImageHeight = layout.isDesktop ? 200 : layout.isTablet ? 180 : 160;
  
  return (
    <InteractiveComponent 
      onPress={onPress} 
      style={[
        styles.fullContainer,
        Platform.OS === 'web' && { cursor: 'pointer' }
      ]} 
      animationType="scale-opacity"
    >
      <Material3Card style={styles.fullCard}>
        <View style={styles.fullContent}>
          {item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={[styles.fullImage, { height: fullImageHeight }]}
              resizeMode="cover"
            />
          )}
          
          <View style={[styles.fullPadding, { padding: layout.spacing.md }]}>
            <View style={styles.fullHeader}>
              <View style={styles.fullHeaderLeft}>
                <View style={[styles.fullTypeBadge, { backgroundColor: colors.bg }]}>
                  <Ionicons name={icon as any} size={14} color={colors.text} />
                  <Text style={[styles.fullTypeBadgeText, { color: colors.text }]}>
                    {item.type.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color="#EAB308" />
                  <Text style={styles.ratingText}>
                    {Math.round(item.relevanceScore)}% match
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.fullTitle, { fontSize: layout.fontSize.lg }]} numberOfLines={2}>
              {item.title}
            </Text>
            
            <Text style={[styles.fullDescription, { fontSize: layout.fontSize.sm }]} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.fullFooter}>
              <View>
                {item.price && (
                  <Text style={styles.fullPrice}>
                    KES {item.price.toLocaleString()}
                  </Text>
                )}
                {item.location && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.reasonBadge}>
                <Text style={styles.reasonText} numberOfLines={1}>
                  {item.reason}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Material3Card>
    </InteractiveComponent>
  );
}

const styles = StyleSheet.create({
  // Compact styles
  compactContainer: {
    marginRight: 12,
    marginBottom: 12,
  },
  compactCard: {
    width: 256,
  },
  compactContent: {
    padding: 12,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  compactImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  compactTextContainer: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compactTitle: {
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  compactReason: {
    color: '#6B7280',
    fontSize: 12,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  // Full styles
  fullContainer: {
    marginRight: 16,
    marginBottom: 16,
  },
  fullCard: {
    width: 320,
  },
  fullContent: {
    padding: 0,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: 192,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  fullPadding: {
    padding: 16,
  },
  fullHeader: {
    marginBottom: 8,
  },
  fullHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  fullDescription: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 12,
  },
  fullFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  // Shared styles
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fullTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullTypeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  reasonBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  reasonText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
