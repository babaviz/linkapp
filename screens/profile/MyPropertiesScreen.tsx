import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  StyleSheet,
  Animated,
  Image,
  Pressable,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchUserProperties, updatePropertyStatus, deleteProperty } from '../../redux/slices/propertySlice';
import { Property, PropertyStatus } from '../../types/property';
import { formatPrice } from '../../utils/propertyHelpers';
import { useCallback } from 'react';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { getUserFacingError } from '../../utils/userFacingError';
import PropertyListSkeleton from '../../components/property/PropertyListSkeleton';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function MyPropertiesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector(state => state.auth);
  const { userProperties, isLoading } = useAppSelector(state => state.property);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'pending' | 'rented' | 'sold'>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Load properties when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        dispatch(fetchUserProperties(user.id));
      }
    }, [user?.id, dispatch])
  );

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await dispatch(fetchUserProperties(user.id));
    }
    setRefreshing(false);
  };

  // Use Redux properties or empty array
  const properties = userProperties || [];

  const filters = [
    { id: 'all', title: 'All Properties', count: properties.length },
    { id: 'available', title: 'Available', count: properties.filter(p => p.status === 'available').length },
    { id: 'pending', title: 'Pending', count: properties.filter(p => p.status === 'pending').length },
    { id: 'rented', title: 'Rented/Sold', count: properties.filter(p => p.status === 'rented' || p.status === 'sold').length },
  ];

  const filteredProperties = selectedFilter === 'all' 
    ? properties 
    : properties.filter(property => {
        if (selectedFilter === 'rented') {
          return property.status === 'rented' || property.status === 'sold';
        }
        return property.status === selectedFilter;
      });

  const handlePropertyAction = (property: Property, action: string) => {
    if (action === 'View') {
      navigation.navigate('PropertyDetails', { propertyId: property.id, property });
    } else if (action === 'Edit') {
      navigation.navigate('EditProperty', { property });
    } else if (action === 'More Options') {
      showPropertyActionMenu(property);
    }
  };

  const showPropertyActionMenu = (property: Property) => {
    const actions = [];
    
    if (property.status === 'available') {
      actions.push({ text: 'Mark as Rented', onPress: () => handleStatusChange(property.id, 'rented') });
      actions.push({ text: 'Mark as Sold', onPress: () => handleStatusChange(property.id, 'sold') });
    } else if (property.status === 'rented' || property.status === 'sold') {
      actions.push({ text: 'Mark as Available', onPress: () => handleStatusChange(property.id, 'available') });
    }
    
    actions.push({ text: 'Delete Property', onPress: () => handleDeleteProperty(property.id), style: 'destructive' });
    actions.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert(
      property.title,
      'What would you like to do with this property?',
      actions.map(action => ({
        text: action.text,
        style: action.style as any,
        onPress: action.onPress
      }))
    );
  };

  const handleStatusChange = (propertyId: string, newStatus: PropertyStatus) => {
    Alert.alert(
      'Change Property Status',
      `Are you sure you want to mark this property as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await dispatch(updatePropertyStatus({ propertyId, status: newStatus })).unwrap();
              Alert.alert('Success', `Property status updated to ${newStatus}`);
            } catch (error) {
              const friendly = getUserFacingError(error, {
                action: 'update this property status',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  const handleDeleteProperty = (propertyId: string) => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProperty(propertyId)).unwrap();
              Alert.alert('Success', 'Property deleted successfully');
            } catch (error) {
              const friendly = getUserFacingError(error, {
                action: 'delete this property',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  const handleAddProperty = () => {
    navigation.navigate('PostProperty' as never);
  };

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rented':
      case 'sold': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: PropertyStatus) => {
    switch (status) {
      case 'available': return 'Available';
      case 'pending': return 'Under Review';
      case 'rented': return 'Rented';
      case 'sold': return 'Sold';
      default: return status;
    }
  };

  const FilterChip = ({ filter, isSelected, onPress }: {
    filter: { id: string; title: string; count: number };
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        isSelected ? styles.filterChipSelected : styles.filterChipDefault
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterText,
        isSelected ? styles.filterTextSelected : styles.filterTextDefault
      ]}>
        {filter.title}
      </Text>
      <View style={[
        styles.countBadge,
        isSelected ? styles.countBadgeSelected : styles.countBadgeDefault
      ]}>
        <Text style={[
          styles.countText,
          isSelected ? styles.countTextSelected : styles.countTextDefault
        ]}>
          {filter.count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const PropertyCard = ({ property }: { property: Property }) => {
    const statusColor = getStatusColor(property.status);
    return (
      <TouchableOpacity 
        style={styles.propertyCard}
        onPress={() => handlePropertyAction(property, 'View')}
        activeOpacity={0.7}
      >
        <View style={styles.propertyHeader}>
          <View style={styles.propertyLeft}>
            <View style={styles.propertyIconContainer}>
              <MaterialIcons name="home" size={24} color="#3B82F6" />
            </View>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyTitle}>{property.title}</Text>
              <Text style={styles.propertyLocation}>📍 {property.location.town}, {property.location.county}</Text>
              <Text style={styles.propertyType}>
                {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.propertyRight}>
            <Text style={styles.propertyPrice}>{formatPrice(property.price)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(property.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.propertyStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="photo-library" size={16} color="#6B7280" />
            <Text style={styles.statText}>{property.images?.length || 0} photos</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="visibility" size={16} color="#6B7280" />
            <Text style={styles.statText}>{property.view_count || 0} views</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="schedule" size={16} color="#6B7280" />
            <Text style={styles.statText}>
              {new Date(property.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.propertyActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handlePropertyAction(property, 'View')}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handlePropertyAction(property, 'Edit')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.moreButton]}
            onPress={() => handlePropertyAction(property, 'More Options')}
          >
            <MaterialIcons name="more-horiz" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Floating Action Button Component
  const FloatingActionButton = () => {
    const scaleValue = useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.9,
        useNativeDriver: true,
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };
    
    return (
      <Animated.View 
        style={[
          styles.fab, 
          { 
            bottom: Math.max(insets.bottom, 16) + 16,
            transform: [{ scale: scaleValue }] 
          }
        ]}
      >
        <Pressable
          onPress={handleAddProperty}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.fabButton}
          accessibilityLabel="Create new property listing"
          accessibilityRole="button"
          accessibilityHint="Navigate to post a new property"
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Properties</Text>
          <TouchableOpacity
            onPress={handleAddProperty}
            style={styles.addButton}
          >
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 80 }
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
        >
          {/* Summary Stats */}
          <Animated.View style={[
            styles.summarySection,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 30],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialIcons name="analytics" size={20} color="#374151" style={{marginRight: 8}} />
              <Text style={styles.summaryTitle}>Portfolio Overview</Text>
            </View>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{properties.length}</Text>
                <Text style={styles.summaryLabel}>Total Properties</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{properties.filter(p => p.status === 'available').length}</Text>
                <Text style={styles.summaryLabel}>Active Listings</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{properties.reduce((sum, p) => sum + (p.view_count || 0), 0)}</Text>
                <Text style={styles.summaryLabel}>Total Views</Text>
              </View>
            </View>
          </Animated.View>

          {/* Filter Section */}
          <Animated.View style={[
            styles.filterSection,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 25],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.filterTitle}>Filter Properties</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScrollView}
            >
              <View style={styles.filtersContainer}>
                {filters.map((filter) => (
                  <FilterChip
                    key={filter.id}
                    filter={filter}
                    isSelected={selectedFilter === filter.id}
                    onPress={() => setSelectedFilter(filter.id as typeof selectedFilter)}
                  />
                ))}
              </View>
            </ScrollView>
          </Animated.View>

          {/* Properties List */}
          <Animated.View style={[
            styles.propertiesSection,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 20],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.propertiesTitle}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialIcons name="home" size={20} color="#374151" style={{marginRight: 8}} />
                <Text>{selectedFilter === 'all' ? 'All Properties' : `${filters.find(f => f.id === selectedFilter)?.title} Properties`}</Text>
              </View>
            </Text>
            
            {isLoading ? (
              <PropertyListSkeleton count={5} viewMode="list" />
            ) : filteredProperties.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="home" size={48} color="#9CA3AF" style={{marginBottom: 16}} />
                <Text style={styles.emptyTitle}>No Properties Found</Text>
                <Text style={styles.emptyDescription}>
                  {selectedFilter === 'all' 
                    ? "You haven't posted any properties yet. Start by adding your first property!"
                    : `No properties found with status: ${filters.find(f => f.id === selectedFilter)?.title}`}
                </Text>
                {selectedFilter === 'all' && (
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={handleAddProperty}
                  >
                    <Text style={styles.emptyButtonText}>Add Property</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.propertiesList}>
                {filteredProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </View>
            )}
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[
            styles.quickActionsSection,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 15],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialIcons name="rocket-launch" size={20} color="#374151" style={{marginRight: 8}} />
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={handleAddProperty}
              >
                <MaterialIcons name="add" size={24} color="#10B981" />
                <Text style={styles.quickActionText}>Add Property</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => Alert.alert('Feature Coming Soon', 'Analytics dashboard will be available soon!')}
              >
                <MaterialIcons name="trending-up" size={24} color="#10B981" />
                <Text style={styles.quickActionText}>Analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => Alert.alert('Feature Coming Soon', 'Bulk management tools coming soon!')}
              >
                <MaterialIcons name="settings" size={24} color="#10B981" />
                <Text style={styles.quickActionText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Floating Action Button */}
        <FloatingActionButton />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  filtersScrollView: {
    marginBottom: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
  },
  filterChipDefault: {
    backgroundColor: '#f8fafc',
    borderColor: '#e5e7eb',
  },
  filterChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  filterTextDefault: {
    color: '#6B7280',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeDefault: {
    backgroundColor: '#e5e7eb',
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  countTextDefault: {
    color: '#6B7280',
  },
  countTextSelected: {
    color: '#ffffff',
  },
  propertiesSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  propertiesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  propertiesList: {
    gap: 16,
  },
  propertyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  propertyIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyIcon: {
    fontSize: 24,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  propertyLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  propertyType: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  propertyRight: {
    alignItems: 'flex-end',
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  propertyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#3B82F6',
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  moreButton: {
    backgroundColor: '#f3f4f6',
    maxWidth: 50,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  editButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  moreButtonText: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
