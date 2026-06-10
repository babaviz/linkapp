import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchProperties } from '../../redux/slices/propertySlice';
import { PropertyCard, PropertyNavigationMenu } from '../../components/property';
import { Property, PropertySearchQuery } from '../../types/property';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import SearchBar from '../../components/common/SearchBar';
import { useColorScheme } from 'react-native';

type PropertySearchResultsNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertySearchResults'>;

interface RouteParams {
  searchQuery: any;
}

export default function PropertySearchResultsScreen() {
  const navigation = useNavigation<PropertySearchResultsNavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { searchResults, isLoading, error } = useAppSelector(state => state.property);
  const { isTablet, width } = getDynamicDimensions();
  
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date_newest' | 'price_asc' | 'price_desc'>('date_newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showMenu, setShowMenu] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const { searchQuery } = (route.params as RouteParams) || {};

  const buildSearchQuery = (): PropertySearchQuery => {
    return {
      search_text: searchText || searchQuery?.searchText,
      filters: searchQuery?.filters || {},
      sort_by: sortBy,
      page: 1,
      limit: 20,
    };
  };

  // Theme colors
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    surfaceSecondary: isDark ? '#334155' : '#F1F5F9',
    border: isDark ? '#475569' : '#E2E8F0',
    borderFocused: isDark ? '#60A5FA' : '#3B82F6',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textTertiary: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#60A5FA' : '#3B82F6',
    primaryDark: isDark ? '#3B82F6' : '#1E40AF',
    success: isDark ? '#10B981' : '#059669',
    warning: isDark ? '#F59E0B' : '#D97706',
    error: isDark ? '#EF4444' : '#DC2626',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.08)',
  };

  // Helper function to get proper category titles
  const getCategoryTitle = (propertyType: string): string => {
    const categoryTitles: { [key: string]: string } = {
      'houses': 'Houses',
      'house': 'Houses', 
      'apartments': 'Apartments',
      'apartment': 'Apartments',
      'one_bedroom': '1 Bedroom Properties',
      'two_bedroom': '2 Bedroom Properties', 
      'three_bedroom': '3 Bedroom Properties',
      'bedsitters': 'Bedsitters',
      'bedsitter': 'Bedsitters',
      'commercial': 'Commercial Properties',
      'industrial': 'Industrial Properties',
      'offices': 'Office Spaces',
      'office_space': 'Office Spaces',
      'land_plots': 'Land & Plots',
      'land': 'Land & Plots',
      'student_housing': 'Student Housing',
      'penthouse': 'Penthouses'
    };
    
    return categoryTitles[propertyType] || `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1).replace('_', ' ')} Properties`;
  };

  useEffect(() => {
    // Handle category-based navigation - load properties by type
    if (searchQuery?.propertyType && !searchResults.length && !isLoading) {
      
      // Fetch properties from Supabase with search query filters
      dispatch(fetchProperties(buildSearchQuery()));
    }
    // Results should already be loaded from search, but refresh if needed
    else if (!searchResults.length && !isLoading && searchQuery) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, dispatch]);

  const handleRefresh = async () => {
    if (!searchQuery) return;
    
    setRefreshing(true);
    try {
      // Fetch properties from Supabase (sorting handled in slice)
      dispatch(fetchProperties(buildSearchQuery()));
    } catch (error) {
      
      Alert.alert('Refresh Error', 'Failed to refresh search results. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewSearch = (query: string) => {
    if (query.trim()) {
      // Fetch properties with updated search query
      setSearchText(query);
      const updatedQuery: PropertySearchQuery = {
        search_text: query,
        filters: searchQuery?.filters || {},
        sort_by: sortBy,
        page: 1,
        limit: 20,
      };
      dispatch(fetchProperties(updatedQuery));
    }
  };

  const handleSort = async (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) return;
    
    setSortBy(newSortBy);
    try {
      // Fetch properties with new sort order (handled in slice)
      const updatedQuery: PropertySearchQuery = {
        search_text: searchText || searchQuery?.searchText,
        filters: searchQuery?.filters || {},
        sort_by: newSortBy,
        page: 1,
        limit: 20,
      };
      dispatch(fetchProperties(updatedQuery));
    } catch (error) {
      
    }
  };

  const handlePropertyPress = (property: Property) => {
    navigation.navigate('PropertyDetails', { 
      propertyId: property.id,
      property: property 
    });
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'price_asc': return 'Price: Low to High';
      case 'price_desc': return 'Price: High to Low';
      default: return 'Newest First';
    }
  };

  const renderHeader = () => (
    <View style={[styles.resultsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.resultsHeaderContent}>
        <View style={styles.resultsInfo}>
          <Text 
            style={[styles.resultsCount, { color: colors.text }]}
            accessibilityRole="text"
            accessibilityLabel={`${searchResults.length} properties found`}
          >
            {searchResults.length} Properties Found
          </Text>
          {searchQuery?.searchText && (
            <Text style={[styles.resultsQuery, { color: colors.textSecondary }]}>
              for "{searchQuery.searchText}"
            </Text>
          )}
        </View>
        
        <View style={styles.resultsActions}>
          {/* Sort Button */}
          <TouchableOpacity
            onPress={() => {
              const sortOptions = [
                { key: 'date_newest', label: 'Newest First' },
                { key: 'price_asc', label: 'Price: Low to High' },
                { key: 'price_desc', label: 'Price: High to Low' }
              ];
              const currentIndex = sortOptions.findIndex(opt => opt.key === sortBy);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              handleSort(sortOptions[nextIndex].key as typeof sortBy);
            }}
            style={[styles.actionButton, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityRole="button"
            accessibilityLabel={`Current sort: ${getSortLabel()}`}
            accessibilityHint="Tap to change sort order"
          >
            <MaterialIcons name="sort" size={16} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              {getSortLabel()}
            </Text>
          </TouchableOpacity>

          {/* View Mode Toggle */}
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={[styles.viewModeButton, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityRole="button"
            accessibilityLabel={`Current view: ${viewMode}`}
            accessibilityHint="Tap to change view mode"
          >
            <MaterialIcons 
              name={viewMode === 'list' ? 'grid-view' : 'view-list'} 
              size={20} 
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}
      accessibilityRole="text"
      accessibilityLabel="No properties found">
      <MaterialIcons name="search-off" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        No properties found
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
        Try adjusting your search criteria or browse all properties
      </Text>
      <TouchableOpacity 
        onPress={() => navigation.navigate('PropertySearch', {})}
        style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="Refine search"
        accessibilityHint="Navigate to property search to adjust criteria"
      >
        <MaterialIcons name="search" size={20} color="#FFFFFF" style={{ marginRight: spacing.xs }} />
        <Text style={styles.emptyStateButtonText}>Refine Search</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading search results">
      <MaterialIcons name="search" size={48} color={colors.primary} />
      <Text style={[styles.loadingStateTitle, { color: colors.text }]}>Searching properties...</Text>
      <Text style={[styles.loadingStateSubtitle, { color: colors.textSecondary }]}>This may take a moment</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Enhanced Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Title Row */}
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityRole="button"
            accessibilityLabel="Go back to search"
            accessibilityHint="Navigate back to property search"
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text 
              style={[
                styles.headerTitle, 
                { 
                  color: colors.text,
                  fontSize: isTablet ? fontSize['2xl'] : fontSize.xl
                }
              ]}
              accessibilityRole="header"
            >
              {searchQuery?.propertyType 
                ? getCategoryTitle(searchQuery.propertyType)
                : 'Search Results'
              }
            </Text>
            <Text 
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              accessibilityRole="text"
            >
              {searchQuery?.location || 'All locations'} • {searchResults.length} found
            </Text>
          </View>

          {/* Menu Button */}
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={[styles.menuButton, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            accessibilityHint="Open menu with additional options"
            activeOpacity={0.7}
          >
            <MaterialIcons name="more-vert" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Enhanced Search Bar */}
        <View style={styles.searchBarContainer}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            onSubmit={handleNewSearch}
            placeholder={searchQuery?.searchText || 'Search properties...'}
            accessibilityLabel="Refine search input"
            accessibilityHint="Enter new search terms to refine results"
            testID="search-results-refine"
            variant="outlined"
            size="medium"
            containerStyle={[
              styles.searchBarStyle,
              { 
                backgroundColor: colors.surface, 
                borderColor: colors.border
              }
            ]}
            rightIcon="tune"
            onRightIconPress={() => navigation.navigate('PropertySearch', {})}
          />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {isLoading && searchResults.length === 0 ? (
          renderLoadingState()
        ) : searchResults.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {renderHeader()}
            <FlatList
              data={searchResults}
              renderItem={({ item }) => (
                <PropertyCard
                  property={item}
                  onPress={handlePropertyPress}
                  showStatus={true}
                />
              )}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                  progressBackgroundColor={colors.surface}
                />
              }
              contentContainerStyle={[
                styles.listContent,
                { 
                  paddingHorizontal: viewMode === 'grid' ? spacing.sm : 0,
                  paddingBottom: spacing.xl * 2
                }
              ]}
              showsVerticalScrollIndicator={false}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode}
              accessibilityRole="list"
              accessibilityLabel={`${searchResults.length} property results`}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={8}
              getItemLayout={viewMode === 'list' ? (data, index) => (
                { length: 200, offset: 200 * index, index }
              ) : undefined}
            />
          </>
        )}
      </View>

      {/* Error State */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error }]}>
          <MaterialIcons name="error" size={20} color="#FFFFFF" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Floating Action Button for New Search */}
      <TouchableOpacity
        onPress={() => navigation.navigate('PropertySearch', {})}
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
        accessibilityRole="button"
        accessibilityLabel="New search"
        accessibilityHint="Navigate to property search to start a new search"
        activeOpacity={0.8}
      >
        <MaterialIcons name="search" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Property Navigation Menu */}
      <PropertyNavigationMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userType="tenant"
        currentScreen="PropertySearchResults"
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.xs,
  },
  searchBarStyle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mainContent: {
    flex: 1,
  },
  resultsHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsInfo: {
    flex: 1,
  },
  resultsCount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  resultsQuery: {
    fontSize: fontSize.sm,
  },
  resultsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  viewModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingStateTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  loadingStateSubtitle: {
    fontSize: fontSize.sm,
  },
  errorBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 1000,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
