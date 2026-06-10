import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RelatedItem } from '../../services/relatedCategoryRecommendationService';
import { colors } from '../../theme';

interface RelatedItemsSectionProps {
  items: RelatedItem[];
  title?: string;
  isLoading?: boolean;
  onItemPress: (item: RelatedItem) => void;
  emptyMessage?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = screenWidth * 0.42;

export const RelatedItemsSection: React.FC<RelatedItemsSectionProps> = ({
  items,
  title = 'Related Items',
  isLoading = false,
  onItemPress,
  emptyMessage = 'No related items found'
}) => {
  const renderItem = ({ item }: { item: RelatedItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => onItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemImageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <MaterialIcons
              name={
                item.type === 'property'
                  ? 'home'
                  : item.type === 'job'
                  ? 'work'
                  : 'build'
              }
              size={40}
              color={colors.secondary[400]}
            />
          </View>
        )}
        
        {item.metadata?.verified && (
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={16} color={colors.white} />
          </View>
        )}
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.location && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color={colors.secondary[500]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}

        {item.price && (
          <Text style={styles.priceText} numberOfLines={1}>
            {typeof item.price === 'number'
              ? `KSh ${item.price.toLocaleString()}`
              : item.price}
          </Text>
        )}

        {item.matchReason && (
          <View style={styles.matchBadge}>
            <MaterialIcons name="star" size={12} color={colors.primaryVariants[600]} />
            <Text style={styles.matchText} numberOfLines={1}>
              {item.matchReason}
            </Text>
          </View>
        )}

        {item.metadata?.rating && (
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color="#FFA500" />
            <Text style={styles.ratingText}>
              {item.metadata.rating.toFixed(1)}
            </Text>
            {item.metadata.reviewCount && (
              <Text style={styles.reviewCount}>
                ({item.metadata.reviewCount})
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="search-off" size={48} color={colors.secondary[400]} />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryVariants[500]} />
          <Text style={styles.loadingText}>Finding related items...</Text>
        </View>
      </View>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {items.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{items.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary[900],
  },
  countBadge: {
    backgroundColor: colors.primaryVariants[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryVariants[700],
  },
  listContent: {
    paddingHorizontal: 12,
  },
  itemCard: {
    width: ITEM_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  itemImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.secondary[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primaryVariants[500],
    borderRadius: 12,
    padding: 4,
  },
  itemContent: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary[900],
    marginBottom: 6,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.secondary[600],
    marginLeft: 4,
    flex: 1,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryVariants[600],
    marginBottom: 6,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryVariants[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  matchText: {
    fontSize: 10,
    color: colors.primaryVariants[700],
    marginLeft: 4,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary[700],
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: colors.secondary[500],
    marginLeft: 2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.secondary[600],
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.secondary[600],
    textAlign: 'center',
  },
});
