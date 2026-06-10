import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { useServiceOperations } from '../../hooks/useServiceOperations';
import { ServiceListing } from '../../types/service';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import EmptyState from '../../components/common/EmptyState';
import { ServiceListSkeleton } from '../../components/services';
import { useSearchDebounce } from '../../hooks/useDebounce';

type ServiceCategoriesRouteProp = RouteProp<ServicesStackParamList, 'ServiceCategories'>;
type ServiceCategoriesNavigationProp = StackNavigationProp<ServicesStackParamList, 'ServiceCategories'>;

// Memoized screen for stable navigation performance
const EnhancedServiceCategoriesScreen = React.memo(function EnhancedServiceCategoriesScreen() {
  const navigation = useNavigation<ServiceCategoriesNavigationProp>();
  const route = useRoute<ServiceCategoriesRouteProp>();
  const { category, subcategory, role = 'seeker', createdServiceId, createdService } = route.params || {};
  const insets = useSafeAreaInsets();
  
  // Removed debug logging for production
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  // Service operations hook
  const {
    services,
    savedServices,
    isLoading,
    error,
    searchServices,
    getServiceDetails,
    contactProvider,
    toggleSaveService,
    isServiceSaved,
    clearError
  } = useServiceOperations();

  // State
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState({
    priceRange: { min: 0, max: 100000 },
    verified: false,
    availability: '',
    sortBy: 'rating' as 'price' | 'rating' | 'distance' | 'recent'
  });
  const [optimisticService, setOptimisticService] = useState<ServiceListing | null>(createdService ?? null);
  const hasFocusedOnceRef = useRef(false);

  const { debouncedSearchTerm: debouncedSearchText } = useSearchDebounce(searchText, 300);
  
  const resetSearchAndFilters = useCallback(() => {
    setSearchText('');
    setSelectedFilters({
      priceRange: { min: 0, max: 100000 },
      verified: false,
      availability: '',
      sortBy: 'rating',
    });
    setShowFilters(false);
  }, []);

  useEffect(() => {
    if (createdService) {
      setOptimisticService(createdService);
    }
  }, [createdService]);

  useEffect(() => {
    let isActive = true;
    if (!createdServiceId) return;
    if (optimisticService?.id === createdServiceId) return;

    (async () => {
      const svc = await getServiceDetails(createdServiceId);
      if (!isActive) return;
      if (svc) setOptimisticService(svc);
    })();

    return () => {
      isActive = false;
    };
  }, [createdServiceId, getServiceDetails, optimisticService?.id]);

  // Track services state changes
  useEffect(() => {
    // No console logging in production
  }, [services]);

  const loadServices = useCallback(async () => {
    const baseSearch = debouncedSearchText.trim();

    let effectiveSearchText = baseSearch;

    if (!effectiveSearchText && category) {
      const key = category.toLowerCase();
      switch (key) {
        case 'tools':
          effectiveSearchText = 'tools';
          break;
        case 'materials':
          effectiveSearchText = 'materials';
          break;
        case 'rental':
          effectiveSearchText = 'rental';
          break;
        case 'movers':
          effectiveSearchText = 'movers';
          break;
        case 'paint':
          effectiveSearchText = 'paint';
          break;
        case 'tiles':
          effectiveSearchText = 'tiles';
          break;
        default:
          break;
      }
    }

    await searchServices({
      category: category === 'search' ? undefined : category,
      subcategory,
      searchText: effectiveSearchText || undefined,
      priceRange: selectedFilters.priceRange,
      verified: selectedFilters.verified,
      availability: selectedFilters.availability,
      sortBy: selectedFilters.sortBy
    });
  }, [category, subcategory, selectedFilters, debouncedSearchText, searchServices]);

  // Load services on mount and whenever route params/filters/search change.
  // When no category/subcategory is provided, this acts as an "All Services" search.
  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  // Reload on focus (e.g., return from Post/Edit flows) without double-loading on first mount.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnceRef.current) {
        void loadServices();
      } else {
        hasFocusedOnceRef.current = true;
      }
      return undefined;
    }, [loadServices])
  );

  // Handle contact service
  const handleContactService = useCallback(async (service: ServiceListing) => {
    Alert.alert(
      'Contact Provider',
      `How would you like to contact this service provider?`,
      [
        {
          text: '📞 Call',
          onPress: () => contactProvider(service.id, 'phone')
        },
        {
          text: '📧 Email',
          onPress: () => contactProvider(service.id, 'email')
        },
        {
          text: '💬 WhatsApp',
          onPress: () => contactProvider(service.id, 'whatsapp')
        },
        {
          text: '📨 In-App Message',
          onPress: () => contactProvider(service.id, 'in_app', 'Hello, I am interested in your service.')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  }, [contactProvider]);

  // Handle save/unsave
  const handleToggleSave = useCallback(async (serviceId: string) => {
    if (savingServiceId) return;
    setSavingServiceId(serviceId);
    try {
      await toggleSaveService(serviceId);
    } finally {
      setSavingServiceId(null);
    }
  }, [toggleSaveService, savingServiceId]);

  // Compute dynamic title based on route params
  const screenTitle = useMemo(() => {
    if (subcategory) {
      return subcategory.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    if (category) {
      const categoryTitles: Record<string, string> = {
        'education_training': 'Education & Training',
        'healthcare_medical': 'Healthcare & Medical',
        'beauty_wellness': 'Beauty & Wellness',
        'construction': 'Construction & Building',
        'automotive': 'Automotive Services',
        'home_garden': 'Home & Garden',
        'business_services': 'Business Services',
        'entertainment': 'Entertainment & Events'
      };
      return categoryTitles[category] || category.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    return 'All Services';
  }, [category, subcategory]);

  const displayServices = useMemo(() => {
    const candidate = optimisticService;
    if (!candidate) return services;

    const alreadyInList = services.some((svc) => svc.id === candidate.id);
    if (alreadyInList) return services;

    const hasCategoryFilter = !!category && category !== 'all' && category !== 'search';
    if (hasCategoryFilter && candidate.category.toLowerCase() !== category.toLowerCase()) {
      return services;
    }

    if (subcategory) {
      const target = subcategory.toLowerCase();
      const matchesSubcategory =
        (candidate.subcategory || '').toLowerCase() === target ||
        (candidate.tags || []).some((t) => t.toLowerCase() === target);

      if (!matchesSubcategory) return services;
    }

    return [candidate, ...services];
  }, [optimisticService, services, category, subcategory]);

  // Handle service press
  const handleServicePress = useCallback((service: ServiceListing) => {
    navigation.navigate('ServiceDetails', { serviceId: service.id });
  }, [navigation]);

  // Render service item
  const renderServiceItem = ({ item }: { item: ServiceListing }) => (
    <TouchableOpacity
      onPress={() => handleServicePress(item)}
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
      }}
    >
      {/* Service Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#6366F1',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md
        }}>
          <Text style={{ fontSize: 24 }}>
            {item.category.includes('Healthcare') ? '🏥' :
             item.category.includes('Education') ? '🎓' :
             item.category.includes('Beauty') ? '💆‍♀️' :
             item.category.includes('Home') ? '🏡' : '🛠️'}
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              fontSize: fontSize.md,
              fontWeight: '700',
              color: '#111827',
              flex: 1
            }}>
              {item.serviceName}
            </Text>
            {item.rating && item.rating >= 4.0 && (
              <View style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6
              }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                  VERIFIED
                </Text>
              </View>
            )}
          </View>
          
          <Text style={{
            fontSize: fontSize.sm,
            color: '#6B7280',
            marginTop: 4
          }} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>

      {/* Service Details */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <MaterialIcons name="location-on" size={14} color="#6B7280" />
        <Text style={{ fontSize: fontSize.xs, color: '#6B7280', marginLeft: 4 }}>
          {item.location}
        </Text>
        
        <View style={{ flex: 1 }} />
        
        <Text style={{
          fontSize: fontSize.md,
          fontWeight: '700',
          color: '#6366F1'
        }}>
          KSh {item.pricingInfo.amount?.toLocaleString() || 'Contact'}
        </Text>
      </View>

      {/* Rating */}
      {item.rating && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <MaterialIcons name="star" size={14} color="#F59E0B" />
          <Text style={{
            fontSize: fontSize.xs,
            color: '#F59E0B',
            marginLeft: 4,
            fontWeight: '600'
          }}>
            {item.rating.toFixed(1)}
          </Text>
          <Text style={{
            fontSize: fontSize.xs,
            color: '#9CA3AF',
            marginLeft: 4
          }}>
            ({item.reviewCount || 0} reviews)
          </Text>
        </View>
      )}

      {/* Tags */}
      {item.subcategory && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.sm }}
        >
          {[item.subcategory].map((tag, index) => (
            <View
              key={index}
              style={{
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                marginRight: 6
              }}
            >
              <Text style={{
                fontSize: fontSize.xs,
                color: '#4B5563'
              }}>
                {tag}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <TouchableOpacity
          onPress={() => handleContactService(item)}
          style={{
            flex: 1,
            backgroundColor: '#6366F1',
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            marginRight: spacing.xs
          }}
        >
          <Text style={{
            color: 'white',
            fontSize: fontSize.sm,
            fontWeight: '600'
          }}>
            Contact Provider
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleToggleSave(item.id)}
          disabled={savingServiceId === item.id}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isServiceSaved(item.id) ? '#EF4444' : '#E5E7EB',
            backgroundColor: isServiceSaved(item.id) ? '#FEE2E2' : 'white',
            opacity: savingServiceId === item.id ? 0.7 : 1,
          }}
        >
          {savingServiceId === item.id ? (
            <ActivityIndicator
              size="small"
              color={isServiceSaved(item.id) ? '#EF4444' : '#6B7280'}
            />
          ) : (
            <MaterialIcons
              name={isServiceSaved(item.id) ? "favorite" : "favorite-border"}
              size={20}
              color={isServiceSaved(item.id) ? '#EF4444' : '#6B7280'}
            />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render filters modal
  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.lg),
          maxHeight: '80%'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.lg
          }}>
            <Text style={{
              fontSize: fontSize.lg,
              fontWeight: '700',
              flex: 1
            }}>
              Filters
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Sort By */}
          <Text style={{
            fontSize: fontSize.md,
            fontWeight: '600',
            marginBottom: spacing.sm
          }}>
            Sort By
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {['rating', 'price', 'recent'].map(sort => (
              <TouchableOpacity
                key={sort}
                onPress={() => setSelectedFilters(prev => ({ ...prev, sortBy: sort as any }))}
                style={{
                  backgroundColor: selectedFilters.sortBy === sort ? '#6366F1' : '#F3F4F6',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: spacing.sm,
                  marginBottom: spacing.sm
                }}
              >
                <Text style={{
                  color: selectedFilters.sortBy === sort ? 'white' : '#4B5563',
                  fontSize: fontSize.sm,
                  textTransform: 'capitalize'
                }}>
                  {sort}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Verified Only */}
          <TouchableOpacity
            onPress={() => setSelectedFilters(prev => ({ ...prev, verified: !prev.verified }))}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.lg
            }}
          >
            <View style={{
              width: 24,
              height: 24,
              borderWidth: 2,
              borderColor: selectedFilters.verified ? '#6366F1' : '#D1D5DB',
              backgroundColor: selectedFilters.verified ? '#6366F1' : 'white',
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.sm
            }}>
              {selectedFilters.verified && (
                <MaterialIcons name="check" size={16} color="white" />
              )}
            </View>
            <Text style={{ fontSize: fontSize.md }}>
              Verified Providers Only
            </Text>
          </TouchableOpacity>

          {/* Apply Button */}
          <TouchableOpacity
            onPress={() => {
              setShowFilters(false);
              void loadServices();
            }}
            style={{
              backgroundColor: '#6366F1',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center'
            }}
          >
            <Text style={{
              color: 'white',
              fontSize: fontSize.md,
              fontWeight: '600'
            }}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient
      colors={['#6366F1', '#4F46E5', '#4338CA']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        {/* Header */}
        <View style={{
          backgroundColor: 'transparent',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{
            fontSize: fontSize.lg,
            fontWeight: '700',
            marginLeft: spacing.md,
            flex: 1,
            color: '#FFFFFF'
          }}>
            {screenTitle}
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MaterialIcons name="filter-list" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Category/Subcategory Badge */}
        {(category || subcategory) && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.sm,
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)'
          }}>
            <Text style={{
              fontSize: fontSize.xs,
              fontWeight: '600',
              color: '#FFFFFF'
            }}>
              {subcategory ? '📂 Subcategory' : '📁 Category'}: {screenTitle}
            </Text>
          </View>
        )}

        {/* Search Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 12,
          paddingHorizontal: spacing.md,
          paddingVertical: 10
        }}>
          <MaterialIcons name="search" size={20} color="#6B7280" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search services..."
            placeholderTextColor="#9CA3AF"
            style={{
              flex: 1,
              marginLeft: spacing.sm,
              fontSize: fontSize.md,
              color: '#111827'
            }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialIcons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
          {isLoading && displayServices.length > 0 && (
            <ActivityIndicator size="small" color="#6B7280" style={{ marginLeft: spacing.sm }} />
          )}
        </View>
      </View>

        {/* Content */}
        {isLoading && displayServices.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.lg) }}
          >
            <ServiceListSkeleton
              count={6}
              containerStyle={{ padding: spacing.lg }}
              cardStyle={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
            />
          </ScrollView>
        ) : displayServices.length === 0 ? (
          error ? (
            <EmptyState
              tone="dark"
              accentColor="#EF4444"
              icon={<Text style={{ fontSize: 56 }}>⚠️</Text>}
              title="Couldn't load services"
              description={error}
              primaryAction={{
                label: 'Retry',
                onPress: () => {
                  clearError();
                  void loadServices();
                },
              }}
              secondaryAction={{
                label: 'Open Filters',
                onPress: () => setShowFilters(true),
              }}
              style={{ flex: 1 }}
            />
          ) : (
            <EmptyState
              tone="dark"
              accentColor="#6366F1"
              icon={<Text style={{ fontSize: 56 }}>🔍</Text>}
              title="No services found"
              description={
                role === 'owner'
                  ? 'Be the first in this category. Post a service so customers can discover you.'
                  : 'Try adjusting your search or filters to find what you’re looking for.'
              }
              primaryAction={{
                label: role === 'owner' ? 'Post a Service' : 'Clear Filters',
                onPress: () => {
                  if (role === 'owner') {
                    navigation.navigate('PostService', {
                      category: category && category !== 'search' ? category : undefined,
                      subcategory,
                    });
                    return;
                  }
                  resetSearchAndFilters();
                },
              }}
              secondaryAction={{
                label: role === 'owner' ? 'View My Services' : 'Open Filters',
                onPress: () => {
                  if (role === 'owner') {
                    navigation.navigate('MyServices');
                    return;
                  }
                  setShowFilters(true);
                },
              }}
              style={{ flex: 1 }}
            />
          )
        ) : (
          <FlatList
            data={displayServices}
            keyExtractor={item => item.id}
            renderItem={renderServiceItem}
            contentContainerStyle={{
              padding: spacing.lg
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Filters Modal */}
        {renderFiltersModal()}
      </SafeAreaView>
    </LinearGradient>
  );
});

export default EnhancedServiceCategoriesScreen;
