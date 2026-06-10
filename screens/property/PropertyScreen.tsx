import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, TextInput, Animated, Modal, BackHandler, Platform, InteractionManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchPropertiesNearLocation, fetchProperties } from '../../redux/slices/propertySlice';
import { updateRoleSpecificProfile, setCurrentModule } from '../../redux/slices/userSlice';
import { ENV } from '../../config/environment';
import { PropertyCard, PropertyNavigationMenu, PropertyHeader } from '../../components/property';
import PropertyOwnerActions from '../../components/property/PropertyOwnerActions';
import { 
  // ActivityIndicator, // Commented to prevent re-renders
  PropertyListingLoading,
  InteractiveComponent,
  AccessibleText,
  AccessibleButton,
  StandardScreenTitle
} from '../../components/common';
import UniversalSearch from '../../components/common/UniversalSearch';
import SearchResults from '../../components/common/SearchResults';
import { useUniversalSearch } from '../../hooks/useUniversalSearch';
import { UniversalSearchQuery } from '../../types/search';
import locationService from '../../services/locationService';
import analyticsService from '../../services/analyticsService';
import { Property, PropertyType } from '../../types/property';
import { 
  getDynamicDimensions, 
  getResponsiveMargin, 
  getResponsivePadding, 
  spacing,
  fontSize,
} from '../../utils/responsive';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';
import { useOptimizedAnimations } from '../../hooks/useOptimizedAnimations';
import { useBackNavigation, useViewModeBackNavigation } from '../../hooks/useBackNavigation';
import useRealTimeProperties from '../../hooks/useRealTimeProperties';
import { useActivityIndicators } from '../../hooks/useActivityIndicators';
import { useDynamicSubtitle } from '../../hooks/useUserCountry';
import { syncPropertyAcrossLists, removePropertyFromAllLists } from '../../redux/slices/propertySlice';
import { propertyService } from '../../services/propertyService';
import { colors, shadows, borderRadius } from '../../theme';
import PropertyCategoriesView from './components/PropertyCategoriesView';

type PropertyScreenNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyHub'>;

// Error boundary component for the property screen
class PropertyErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    console.error('[PropertyScreen] Error boundary caught:', error);
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[PropertyScreen] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: '#fff'
        }}>
          <Text style={{ fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
            We couldn’t load properties right now.
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center' }}>
            Check your internet connection and tap “Try Again”. If it keeps happening, restart the app.
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8
            }}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{ color: '#fff' }}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function PropertyScreenContent() {
  const navigation = useNavigation<PropertyScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { searchResults, isLoading: isPropertyLoading, error: propertyError } = useAppSelector(state => state.property);
  const { currentProfile, profileSwitchContext } = useAppSelector(state => state.user);
  const { user } = useAppSelector(state => state.auth);
  const isDarkMode = false; // Use light mode for now, can be made configurable later
  
  // Track if we've attempted to load data
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get responsive dimensions and safe area insets
  const { width: screenWidth, deviceType, isTablet } = getDynamicDimensions();
  const insets = useSafeAreaInsets();
  
  
  // Optimized animations
  const {
    fadeAnim,
    startFadeIn,
    startSlideIn,
    stopAllAnimations
  } = useOptimizedAnimations();
  
  
  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<PropertyType | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'properties'>('categories');
  const [searchText, setSearchText] = useState('');
  const [userType, setUserType] = useState<'tenant' | 'property_owner'>(
    currentProfile?.propertyProfile?.role || 'tenant'
  );

  const trackPropertyActivity = useCallback(
    (action: 'browse' | 'search', metadata?: Record<string, any>) => {
      if (!user?.id) return;
      analyticsService.trackActivity({
        userId: user.id,
        action,
        contentType: 'property',
        contentId: action === 'search' ? 'PropertySearch' : 'PropertyHub',
        metadata: {
          screen: 'PropertyHub',
          role: userType,
          selectedType: selectedType || null,
          ...(metadata || {}),
        },
      });
    },
    [user?.id, userType, selectedType]
  );

  const { activityData } = useActivityIndicators({
    module: 'property',
    userRole: userType,
    refreshInterval: 30000,
    enabled: true
  });

  const dynamicSubtitle = useDynamicSubtitle(
    'Find your perfect home in {country}',
    'Find your perfect home'
  );

  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [detectedLocationLabel, setDetectedLocationLabel] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNavigationMenu, setShowNavigationMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [showOwnerActions, setShowOwnerActions] = useState(false);
  const [selectedOwnerCategory, setSelectedOwnerCategory] = useState<string>('');

  // Resolve a human-friendly location label from GPS coordinates (no DB updates).
  useEffect(() => {
    let isActive = true;

    const resolveLocationLabel = async () => {
      if (!userLocation) return;

      try {
        const place = await locationService.getCountyAndTownFromCoordinates(userLocation);

        const county = (place.county || '').trim();
        const town = (place.town || '').trim();

        let label: string | null = null;

        if (county) {
          // Avoid overly-generic town labels like "CBD" in the header.
          const townLower = town.toLowerCase();
          const countyLower = county.toLowerCase();

          if (town && townLower !== 'cbd' && townLower !== countyLower) {
            label = `${town}, ${county}`;
          } else {
            label = county;
          }
        } else if (town) {
          label = town;
        }

        if (isActive) {
          setDetectedLocationLabel(label);
        }
      } catch {
        // Silent fallback - keep existing subtitle
      }
    };

    resolveLocationLabel();

    return () => {
      isActive = false;
    };
  }, [userLocation]);
  
  useFocusEffect(
    useCallback(() => {
      trackPropertyActivity('browse');
    }, [trackPropertyActivity])
  );

  // Universal search integration
  const {
    searchResults: universalSearchResults,
    isSearching: isUniversalSearching,
    showSearch,
    toggleSearch,
    performSearch: performUniversalSearch,
    clearResults: clearUniversalResults
  } = useUniversalSearch({ 
    module: 'property', 
    defaultFilters: selectedType ? { property: { property_type: selectedType } } : {} 
  });

  // Handle initial data loading with better error handling
  useEffect(() => {
    let isMounted = true;
    let interactionTask: { cancel?: () => void } | null = null;
    
    const initializeScreen = async () => {
      try {
        // Set initial loading state
        if (isMounted) {
          setIsLoading(true);
        }
        
        // Initialize module and animations
        dispatch(setCurrentModule('property'));
        startFadeIn(200);
        startSlideIn(250);

        // Defer non-critical boot work so the first frame paints instantly.
        interactionTask = InteractionManager.runAfterInteractions(() => {
          void (async () => {
            try {
              const result = await locationService.getCurrentLocation();
              if (result.success && result.location && isMounted) {
                setUserLocation({
                  latitude: result.location.latitude,
                  longitude: result.location.longitude
                });
              }
            } catch (error) {
              console.warn('Failed to load user location:', error);
            }
          })();
        });

        // Load initial properties without artificial startup delays.
        try {
          const searchQuery = {
            filters: {},
            sort_by: 'date_newest' as const,
            page: 1,
            limit: 20
          };
          await dispatch(fetchProperties(searchQuery)).unwrap();
        } catch (error) {
          console.error('Failed to load properties:', error);
        }
        
      } catch (error) {
        console.error('Error initializing property screen:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setInitialLoadComplete(true);
        }
      }
    };
    
    void initializeScreen();
    
    return () => {
      isMounted = false;
      interactionTask?.cancel?.();
      stopAllAnimations();
    };
  }, [dispatch, startFadeIn, startSlideIn, stopAllAnimations]);

  // Use the back navigation hook with view mode support
  const { handleBack } = useViewModeBackNavigation(
    viewMode,
    'categories',
    (mode: 'categories' | 'properties') => setViewMode(mode),
    {
      fallbackScreen: 'PropertyHub'
    }
  );
  
  useEffect(() => {
    if (selectedType) {
      loadProperties();
    }
  }, [selectedType]);

  // Realtime: subscribe to property changes and sync Redux lists
  useRealTimeProperties({
    subscriptionId: 'property-global',
    onPropertyChange: async (payload) => {
      try {
        if (payload.eventType === 'DELETE') {
          dispatch(removePropertyFromAllLists(payload.property.id) as any);
          return;
        }
        const latest = await propertyService.getPropertyById(payload.property.id);
        if (latest) {
          dispatch(syncPropertyAcrossLists(latest) as any);
        }
      } catch (_) {
        // ignore
      }
    },
  });

  const getCurrentUserLocation = async () => {
    try {
      const result = await locationService.getCurrentLocation();
      if (result.success && result.location) {
        setUserLocation(result.location);
      }
    } catch (error) {
      // Location access failed - handle gracefully
    }
  };

  const loadProperties = async () => {
    try {
      const searchQuery = {
        filters: selectedType ? { property_type: selectedType } : {},
        sort_by: 'date_newest' as const,
        page: 1,
        limit: 20
      };
      
      await dispatch(fetchProperties(searchQuery)).unwrap();
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading properties:', error);
      }
    }
  };
  
  // Handle role change and update user profile
  const handleRoleChange = async (newRole: 'tenant' | 'property_owner') => {
    try {
      setUserType(newRole);
      
      // Update the user's property profile
      await dispatch(updateRoleSpecificProfile({
        module: 'property',
        role: newRole,
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 1000000 },
          locationPreferences: [],
          amenityPreferences: [],
        }
      })).unwrap();
      
      // Role updated successfully
    } catch (error) {
      // Error handling - could show user notification here
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  };

  const handlePropertyPress = (property: Property) => {
    // Navigate to PropertyDetailsScreen
    navigation.navigate('PropertyDetails', { 
      propertyId: property.id,
      property: property 
    });
  };

  const handlePropertyTypePress = (type: PropertyType) => {
    setSelectedType(type === selectedType ? null : type);
    // Filter will be applied via useEffect when selectedType changes
  };

  const handleNearMeSearch = async () => {
    trackPropertyActivity('search', { kind: 'near_me' });
    if (!userLocation) {
      try {
        const result = await locationService.getCurrentLocation();
        if (result.success && result.location) {
          setUserLocation(result.location);
          loadPropertiesNearMe(result.location);
        } else {
          locationService.showLocationPermissionDialog();
        }
      } catch (error) {
        locationService.showLocationPermissionDialog();
      }
    } else {
      loadPropertiesNearMe(userLocation);
    }
  };

  const loadPropertiesNearMe = async (location: {latitude: number; longitude: number}) => {
    try {
      await dispatch(fetchPropertiesNearLocation({
        coordinates: location,
        radius: 10, // 10km radius
        limit: 20,
        propertyType: selectedType || undefined
      })).unwrap();
    } catch (error) {
      // Error handling - could show user notification here
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'properties' ? 'categories' : 'properties');
  };

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setSearchText(searchTerm);
    if (searchTerm.trim()) {
      trackPropertyActivity('search', { kind: 'text', queryLength: searchTerm.trim().length });
      setViewMode('properties');
      // Trigger property search
      loadPropertiesWithSearch(searchTerm);
    }
  }, [trackPropertyActivity]);
  
  // Handle universal search
  const handleUniversalSearch = useCallback(async (query: UniversalSearchQuery) => {
    const success = await performUniversalSearch(query);
    if (success) {
      const raw = (query.searchText || '').trim();
      trackPropertyActivity('search', {
        kind: 'universal',
        hasQuery: raw.length > 0,
        queryLength: raw.length,
        filterKeys: query.filters ? Object.keys(query.filters) : [],
      });
      setViewMode('properties');
      setSearchText(query.searchText || '');
      // Type-safe access to property-specific filters
      const propertyFilters = query.filters as any;
      if (propertyFilters?.propertyType) {
        setSelectedType(propertyFilters.propertyType as PropertyType);
      }
    }
  }, [performUniversalSearch, trackPropertyActivity]);
  
  // Enhanced search button handler
  const handleSearchButtonPress = useCallback(() => {
    toggleSearch(true);
  }, [toggleSearch]);

  // Handle category press with optimized navigation
  const handleCategoryPress = useCallback((category: string) => {
    // If property owner, show owner actions modal
    if (userType === 'property_owner') {
      setSelectedOwnerCategory(category);
      setShowOwnerActions(true);
      return;
    }
    
    // For tenants, navigate to property listings
    // Map display names to proper PropertyType values
    const categoryMapping: Record<string, PropertyType> = {
      'Houses': 'houses',
      'Apartments': 'apartments',
      'Apartments New': 'apartments',
      'One Bedroom': 'one_bedroom',
      'Two Bedroom': 'two_bedroom',
      'Three Bedroom': 'three_bedroom',
      'Bedsitters': 'bedsitters',
      'Commercial': 'commercial',
      'Industrial Parks': 'industrial',
      'Office Spaces': 'offices',
      'Land': 'land_plots',
      'Penthouses': 'penthouse',
      'Student Housing': 'student_housing',
      'Container House': 'container_house',
      'Container Houses': 'container_house',
      'Cabin': 'cabin',
      'Cabins': 'cabin',
      'Farm House': 'farm_house',
      'Farm Houses': 'farm_house',
      'Cottage': 'cottage',
      'Cottages': 'cottage',
      'Condo': 'condo',
      'Condos': 'condo',
      'Condominiums': 'condo',
      'Studio': 'studio',
      'Studios': 'studio',
      'Studio Apartments': 'studio',
      'Bungalow': 'bungalow',
      'Bungalows': 'bungalow',
      'Villa': 'villa',
      'Villas': 'villa',
      'Town House': 'town_house',
      'Town Houses': 'town_house',
      'Townhouse': 'townhouse',
      'Townhouses': 'townhouse',
      '5 Bedroom': 'five_bedroom',
      'Five Bedroom': 'five_bedroom',
      'Mansionate': 'mansionate',
      'Mansionates': 'mansionate',
      'Duplex House': 'duplex_house',
      'Duplex Houses': 'duplex_house',
      'Duplex': 'duplex_house'
    };
    
    const propertyType = categoryMapping[category as keyof typeof categoryMapping] || category.toLowerCase() as PropertyType;
    
    // Set state immediately for instant UI response
    requestAnimationFrame(() => {
      setSelectedType(propertyType);
      setViewMode('properties');
    });
    // Data loading happens via useEffect when selectedType changes
  }, [userType]);

  // Handle view all properties
  const handleViewAllProperties = async () => {
    setSelectedType(null);
    setViewMode('properties');
    await loadProperties();
  };

  const loadPropertiesWithSearch = async (searchTerm: string) => {
    try {
      const searchQuery = {
        search_text: searchTerm,
        filters: selectedType ? { property_type: selectedType } : {},
        sort_by: 'date_newest' as const,
        page: 1,
        limit: 20
      };
      
      await dispatch(fetchProperties(searchQuery)).unwrap();
    } catch (error) {
      if (__DEV__) {
        console.error('Error searching properties:', error);
      }
    }
  };

  // Handle category selection in properties view
  const handleCategorySelection = useCallback((category: string, index: number) => {
    setSelectedCategoryIndex(index);
    if (category === 'All') {
      setSelectedType(null);
    } else {
      const typeMap: { [key: string]: PropertyType } = {
        'Residential': 'house',
        'Commercial': 'commercial',
        'Land': 'land'
      };
      setSelectedType(typeMap[category] || null);
    }
  }, []);

  if (viewMode === 'properties') {
    // Empty state component
    const EmptyStateComponent = () => (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: spacing[6],
        paddingTop: 100
      }}>
        <Text style={{ fontSize: 40, marginBottom: spacing[2] }}>🏠</Text>
        <Text style={{ 
          color: isDarkMode ? colors.text.tertiary : colors.text.secondary,
          fontSize: 16,
          textAlign: 'center',
          marginBottom: spacing[4]
        }}>
          No properties found
        </Text>
        <TouchableOpacity 
          onPress={handleViewAllProperties} 
          style={{ 
            backgroundColor: colors.primary,
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[3],
            borderRadius: borderRadius.lg,
            ...shadows.sm
          }}
        >
          <Text style={{ 
            color: colors.white, 
            fontWeight: '600',
            fontSize: 16
          }}>
            View All Properties
          </Text>
        </TouchableOpacity>
      </View>
    );

    // Loading component with enhanced skeleton
    const LoadingComponent = () => (
      <PropertyListingLoading style={{ flex: 1 }} />
    );

    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: isDarkMode ? colors.secondary[800] : colors.background 
      }}>
        <FlatList
          data={searchResults}
          ListHeaderComponent={(
            <PropertyHeader
              isDarkMode={isDarkMode}
              currentProfile={currentProfile}
              user={user}
              onBackPress={() => {
                // Handle back press - go to categories view
                setViewMode('categories');
                setSelectedType(null);
                setSelectedCategoryIndex(0);
              }}
              onSearchPress={handleSearchButtonPress}
              showBackButton={true}
              showCategories={true}
              onCategoryPress={handleCategorySelection}
              selectedCategory={selectedCategoryIndex}
            />
          )}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={handlePropertyPress}
              showStatus={true}
            />
          )}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={isLoading && searchResults.length === 0 ? LoadingComponent : EmptyStateComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={searchResults.length === 0 ? { flex: 1 } : { paddingBottom: 95 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
        />

        {/* Universal Search Modal */}
        {showSearch && (
          <UniversalSearch
            module="property"
            onSearch={handleUniversalSearch}
            onClose={() => toggleSearch(false)}
            placeholder="Search properties, locations, features..."
            autoFocus={true}
            initialQuery={searchText}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? colors.secondary[800] : colors.background }}>
      <Animated.View 
        style={[
          { flex: 1 },
          { opacity: fadeAnim }
        ]}
      >
        {/* Enhanced Header - Matching Jobs & Skills Style */}
        <View style={{ 
          paddingHorizontal: isTablet ? 32 : screenWidth < 360 ? 12 : 16, 
          paddingTop: isTablet ? 32 : screenWidth < 360 ? 16 : 20,
          paddingBottom: isTablet ? 16 : 8,
          backgroundColor: isDarkMode ? colors.secondary[800] : colors.background
        }}>
          {/* Header with Title and 3-dot menu */}
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: isDarkMode ? colors.text.inverse : colors.text.primary, 
                  fontSize: isTablet ? 36 : screenWidth < 360 ? 24 : 30, 
                  fontWeight: '800',
                  letterSpacing: -0.5,
                  marginBottom: isTablet ? 12 : 8
                }}>
                  Real Estate
                </Text>
              </View>
              {/* 3-dot menu button */}
              <TouchableOpacity
                onPress={() => setShowQuickActions(true)}
                style={{
                  width: 44,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 22,
                  backgroundColor: isDarkMode ? colors.secondary[600] : colors.secondary[100],
                  marginTop: 4
                }}
                activeOpacity={0.7}
                accessible={true}
                accessibilityLabel="Property menu"
                accessibilityHint="Opens quick actions menu for searching and managing properties"
                accessibilityRole="button"
              >
                <MaterialIcons name="more-vert" size={24} color={isDarkMode ? colors.text.inverse : colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={{
              color: isDarkMode ? colors.text.tertiary : colors.text.secondary,
              fontSize: isTablet ? 18 : screenWidth < 360 ? 14 : 16,
              fontWeight: '400',
              lineHeight: isTablet ? 28 : screenWidth < 360 ? 20 : 24
            }}>
              {detectedLocationLabel ? `Find your perfect home in ${detectedLocationLabel}` : dynamicSubtitle}
            </Text>

            {/* Subtle Live Indicator */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: 4, 
                  backgroundColor: colors.primary,
                  marginRight: spacing.xs
                }} />
                <Text style={{ 
                  fontSize: fontSize.xs, 
                  color: isDarkMode ? colors.text.tertiary : colors.text.secondary,
                  fontWeight: '500'
                }}>
                  {activityData?.activity || 'Updating activity...'}
                </Text>
              </View>
            </View>
          </View>

          {/* Enhanced Pill-Style Role Switcher - Matching Jobs Screen */}
          <View style={{ marginBottom: isTablet ? 16 : 8, alignItems: 'center' }}>
            <View style={{ 
              backgroundColor: isDarkMode ? colors.secondary[200] : colors.secondary[100],
              borderRadius: isTablet ? 24 : 20,
              padding: isTablet ? 3 : 2,
              flexDirection: 'row',
              width: isTablet ? '60%' : screenWidth < 360 ? '90%' : '80%',
              maxWidth: isTablet ? 400 : 280,
              height: isTablet ? 52 : screenWidth < 360 ? 40 : 44
            }}>
              <TouchableOpacity
                onPress={() => handleRoleChange('tenant')}
                style={{ 
                  flex: 1,
                  height: '100%',
                  backgroundColor: userType === 'tenant' ? colors.white : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: userType === 'tenant' ? (isTablet ? 21 : 18) : 0,
                  ...getCrossPlatformShadow({
                    width: 0,
                    height: 2,
                    radius: 4,
                    opacity: userType === 'tenant' ? 0.15 : 0,
                    color: '#000000',
                    elevation: userType === 'tenant' ? 3 : 0
                  })
                }}
                activeOpacity={0.8}
                accessible={true}
                accessibilityLabel="Tenant mode"
                accessibilityHint="Switch to tenant mode to search for properties"
                accessibilityRole="button"
                accessibilityState={{ selected: userType === 'tenant' }}
              >
                <Text style={{ 
                  color: userType === 'tenant' ? colors.primary : colors.text.secondary, 
                  fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Tenant
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRoleChange('property_owner')}
                style={{ 
                  flex: 1,
                  height: '100%',
                  backgroundColor: userType === 'property_owner' ? colors.white : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: userType === 'property_owner' ? (isTablet ? 21 : 18) : 0,
                  ...getCrossPlatformShadow({
                    width: 0,
                    height: 2,
                    radius: 4,
                    opacity: userType === 'property_owner' ? 0.15 : 0,
                    color: '#000000',
                    elevation: userType === 'property_owner' ? 3 : 0
                  })
                }}
                activeOpacity={0.8}
                accessible={true}
                accessibilityLabel="Property owner mode"
                accessibilityHint="Switch to property owner mode to manage your listings"
                accessibilityRole="button"
                accessibilityState={{ selected: userType === 'property_owner' }}
              >
                <Text style={{ 
                  color: userType === 'property_owner' ? colors.primary : colors.text.secondary, 
                  fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Property Owner
                </Text>
              </TouchableOpacity>
            </View>
          </View>


        </View>

        {/* Property Categories Grid - Fluid Container */}
        <View style={{ 
          flex: 1, 
          paddingHorizontal: 0, 
          paddingTop: 0, 
          paddingBottom: 0 
        }}>
          <PropertyCategoriesView 
            onCategoryPress={handleCategoryPress} 
            isDarkMode={isDarkMode}
            userType={userType}
          />
        </View>
      </Animated.View>

      {/* PropertyNavigationMenu */}
      <PropertyNavigationMenu
        visible={showNavigationMenu}
        onClose={() => setShowNavigationMenu(false)}
        userType={userType}
        currentScreen="PropertyHub"
        onSearch={() => toggleSearch(true)}
        onNearMeSearch={handleNearMeSearch}
        searchText={searchText}
      />
      
      {/* WhatsApp-style Quick Actions Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showQuickActions}
        onRequestClose={() => setShowQuickActions(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-start',
            paddingTop: 100
          }}
          onPress={() => setShowQuickActions(false)}
          activeOpacity={1}
        >
          <View style={{
            margin: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10
          }}>
            {/* Search/Management Section */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: '#111827', 
                marginBottom: 12 
              }}>
                {userType === 'tenant' ? 'Find Properties' : 'Property Management'}
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                paddingHorizontal: 16,
                paddingVertical: 12
              }}>
                <Text style={{ color: '#9CA3AF', marginRight: 8, fontSize: 16 }}>
                  {userType === 'tenant' ? '🔍' : '🏢'}
                </Text>
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={userType === 'tenant' ? "Search location, type, price..." : "Enter property details..."}
                  placeholderTextColor="#9CA3AF"
                  style={{ 
                    flex: 1, 
                    fontSize: 16,
                    color: '#111827'
                  }}
                  onSubmitEditing={() => {
                    if (userType === 'tenant') {
                      handleSearch(searchText);
                    } else {
                      navigation.navigate('PostProperty');
                    }
                    setShowQuickActions(false);
                  }}
                  returnKeyType={userType === 'tenant' ? "search" : "done"}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (userType === 'tenant') {
                    handleSearch(searchText);
                  } else {
                    navigation.navigate('PostProperty');
                  }
                  setShowQuickActions(false);
                }}
                style={{
                  backgroundColor: userType === 'tenant' ? '#10B981' : '#059669',
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginTop: 8,
                  alignItems: 'center'
                }}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 16, 
                  fontWeight: '600' 
                }}>
                  {userType === 'tenant' ? 'Search Properties' : 'Add Property'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Action Buttons for Tenants */}
            {userType === 'tenant' && (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    handleNearMeSearch();
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📍</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    Properties Near Me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('SavedProperties');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>❤️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Saved Properties
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PropertyCompare');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>⚖️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Compare Properties
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PropertyMap');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>🗺️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Map View
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    (navigation as any).navigate('DateMiConversations');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    My Chats
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Action Buttons for Property Owners */}
            {userType === 'property_owner' && (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PostProperty');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>✏️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    Add Property
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('MyProperties');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>🏢</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    Manage Listings
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PropertyInquiries');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    View Inquiries
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('MyProperties');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFF7ED',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#FDBA74'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📊</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#D97706' 
                  }}>
                    Listing Stats
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    (navigation as any).navigate('DateMiConversations');
                    setShowQuickActions(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    My Chats
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Universal Search Modal */}
      {showSearch && (
        <UniversalSearch
          module="property"
          onSearch={handleUniversalSearch}
          onClose={() => toggleSearch(false)}
          placeholder="Search properties, locations, features..."
          autoFocus={true}
          initialQuery={searchText}
        />
      )}
      
      {/* Property Owner Actions Modal */}
      <PropertyOwnerActions
        visible={showOwnerActions}
        onClose={() => {
          setShowOwnerActions(false);
          setSelectedOwnerCategory('');
        }}
        category={selectedOwnerCategory}
      />
    </SafeAreaView>
  );
}

const PropertyScreen = () => {
  return (
    <PropertyErrorBoundary>
      <PropertyScreenContent />
    </PropertyErrorBoundary>
  );
};

export default PropertyScreen;