/**
 * SearchResults Component
 * Universal search results display for all modules
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SkeletonLoader from './SkeletonLoader';
import {
  SearchResult,
  SearchResponse,
  ModuleType
} from '../../types/search';
import { formatDistanceToNow } from 'date-fns';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

interface SearchResultsProps {
  searchResponse: SearchResponse | null;
  module: ModuleType;
  onResultPress: (result: SearchResult) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  emptyStateComponent?: React.ReactNode;
}

const getModuleColor = (module: ModuleType): [string, string] => {
  switch (module) {
    case 'property': return ['#0D9488', '#0F766E'];
    case 'jobs': return ['#7C3AED', '#5B21B6'];
    case 'services': return ['#DC2626', '#B91C1C'];
    case 'datemi': return ['#DB2777', '#BE185D'];
    default: return ['#6B7280', '#4B5563'];
  }
};

const getModuleIcon = (module: ModuleType): string => {
  switch (module) {
    case 'property': return '🏠';
    case 'jobs': return '💼';
    case 'services': return '🔧';
    case 'datemi': return '💕';
    default: return '🔍';
  }
};

const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K`;
  }
  return price.toLocaleString();
};

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResponse,
  module,
  onResultPress,
  onRefresh,
  onLoadMore,
  isLoading = false,
  isRefreshing = false,
  emptyStateComponent
}) => {
  const { width, isTablet } = getDynamicDimensions();
  const moduleColors = getModuleColor(module);
  const moduleIcon = getModuleIcon(module);

  const renderResultCard = ({ item }: { item: SearchResult }) => {
    const getResultMetadata = () => {
      switch (module) {
        case 'property':
          return {
            price: item.metadata?.price ? `KSH ${formatPrice(item.metadata.price)}` : undefined,
            subtitle: item.metadata?.propertyType || 'Property',
            badge: item.metadata?.status || 'Available',
            extra: item.metadata?.bedrooms ? `${item.metadata.bedrooms} bed • ${item.metadata.bathrooms || 1} bath` : undefined
          };
        case 'jobs':
          return {
            price: item.metadata?.salary ? `KSH ${formatPrice(item.metadata.salary)}` : undefined,
            subtitle: item.metadata?.company || 'Job Opportunity',
            badge: 'Open',
            extra: 'Full-time'
          };
        case 'services':
          return {
            subtitle: item.metadata?.provider || 'Service Provider',
            badge: item.metadata?.rating ? `${item.metadata.rating}⭐` : 'New',
            extra: 'Available'
          };
        case 'datemi':
          return {
            subtitle: item.metadata?.age ? `${item.metadata.age} years old` : 'Profile',
            badge: 'Active',
            extra: item.metadata?.interests ? item.metadata.interests.slice(0, 2).join(', ') : undefined
          };
        default:
          return { subtitle: 'Result', badge: 'New' };
      }
    };

    const metadata = getResultMetadata();

    return (
      <TouchableOpacity
        onPress={() => onResultPress(item)}
        activeOpacity={0.7}
        style={styles.resultCard}
      >
        <View style={styles.resultRow}>
          {/* Image */}
          <View style={styles.imageContainer}>
            {item.imageUrl ? (
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.resultImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.moduleIconText}>{moduleIcon}</Text>
              </View>
            )}
            
            {/* Module Badge */}
            <LinearGradient
              colors={moduleColors}
              style={styles.moduleBadge}
            >
              <Text style={styles.moduleBadgeText}>
                {module.toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          {/* Content */}
          <View style={styles.resultContent}>
            {/* Header */}
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleContainer}>
                <Text 
                  style={styles.resultTitle} 
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={styles.resultSubtitle}>
                  {metadata.subtitle}
                </Text>
              </View>
              
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>
                  {metadata.badge}
                </Text>
              </View>
            </View>

            {/* Description */}
            {item.description && (
              <Text 
                style={styles.resultDescription} 
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}

            {/* Footer */}
            <View style={styles.resultFooter}>
              <View style={styles.resultFooterLeft}>
                {item.location && (
                  <View style={styles.locationContainer}>
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {typeof item.location === 'string' 
                        ? item.location.split(',')[0] 
                        : item.location.address || 'Location'}
                    </Text>
                  </View>
                )}
                
                <Text style={styles.timeText}>
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </Text>
              </View>
              
              <View style={styles.resultFooterRight}>
                {metadata.price && (
                  <Text style={styles.priceText}>
                    {metadata.price}
                  </Text>
                )}
                
                {metadata.extra && (
                  <Text style={styles.extraText}>
                    {metadata.extra}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    if (!searchResponse) return null;

    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            Search Results
          </Text>
          <Text style={styles.searchTime}>
            {searchResponse.searchTime}ms
          </Text>
        </View>
        
        <Text style={styles.resultCount}>
          {searchResponse.totalResults.toLocaleString()} results found
          {searchResponse.pagination.totalPages > 1 && 
            ` • Page ${searchResponse.pagination.currentPage} of ${searchResponse.pagination.totalPages}`
          }
        </Text>

        {/* Search Suggestions */}
        {searchResponse.suggestions && searchResponse.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Related searches:</Text>
            <View style={styles.suggestionsGrid}>
              {searchResponse.suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (emptyStateComponent) {
      return emptyStateComponent;
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>🔍</Text>
        <Text style={styles.emptyStateTitle}>
          No results found
        </Text>
        <Text style={styles.emptyStateDescription}>
          Try adjusting your search terms or filters to find what you're looking for.
        </Text>
        
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>Refresh Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.listContainer}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={`search-skeleton-${index}`} style={styles.resultCard}>
          <View style={styles.resultRow}>
            <View style={styles.imageContainer}>
              <SkeletonLoader width="100%" height="100%" borderRadius={0} />
            </View>
            <View style={styles.resultContent}>
              <View style={{ marginBottom: 10 }}>
                <SkeletonLoader
                  width={index % 2 === 0 ? '82%' : '72%'}
                  height={16}
                  borderRadius={4}
                  style={{ marginBottom: 6 }}
                />
                <SkeletonLoader width="55%" height={14} borderRadius={4} />
              </View>
              <SkeletonLoader width="95%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
              <SkeletonLoader width="85%" height={12} borderRadius={4} style={{ marginBottom: 12 }} />
              <View style={styles.resultFooter}>
                <SkeletonLoader width="35%" height={12} borderRadius={4} />
                <SkeletonLoader width="25%" height={12} borderRadius={4} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderFooter = () => {
    if (!searchResponse?.pagination.hasMore) return null;
    
    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity
          onPress={onLoadMore}
          style={styles.loadMoreButton}
        >
          <Text style={styles.loadMoreButtonText}>Load More</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && !searchResponse) {
    return renderLoadingState();
  }

  if (!searchResponse || searchResponse.results.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <FlatList
        data={searchResponse.results}
        keyExtractor={(item) => item.id}
        renderItem={renderResultCard}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={moduleColors}
              tintColor={moduleColors[0]}
            />
          ) : undefined
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  moduleIconText: {
    fontSize: 24,
  },
  moduleBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moduleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  resultContent: {
    flex: 1,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  resultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#047857',
  },
  resultDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  locationIcon: {
    color: '#9CA3AF',
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resultFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  extraText: {
    fontSize: 12,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultCount: {
    fontSize: 14,
    color: '#4B5563',
  },
  suggestionsContainer: {
    marginTop: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#374151',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  footerContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

export default SearchResults;
