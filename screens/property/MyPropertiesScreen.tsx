/**
 * MyPropertiesScreen - Modern Property Management Dashboard
 * Redesigned with Material 3 UI principles for better UX
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  StatusBar,
  StyleSheet,
  Animated,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { Material3Card } from '../../components/common';
import { 
  getDynamicDimensions, 
  spacing,
  fontSize,
  getCrossPlatformShadow
} from '../../utils/responsive';
import { getUserFacingError } from '../../utils/userFacingError';
import { 
  fetchUserProperties, 
  updatePropertyStatus, 
  deleteProperty 
} from '../../redux/slices/propertySlice';
import { Property, PropertyStatus } from '../../types/property';
import { formatPrice } from '../../utils/propertyHelpers';

type MyPropertiesScreenNavigationProp = StackNavigationProp<any, 'MyProperties'>;

// Loading Skeleton Component
const PropertyCardSkeleton: React.FC = () => (
  <View style={[styles.propertyCard, { backgroundColor: '#F9FAFB' }]}>
    <View style={styles.skeletonHeader}>
      <View style={[styles.skeletonBox, { width: '70%', height: 20 }]} />
      <View style={[styles.skeletonBox, { width: 80, height: 24, borderRadius: 12 }]} />
    </View>
    <View style={styles.skeletonMeta}>
      <View style={[styles.skeletonBox, { width: '40%', height: 16, marginRight: spacing.sm }]} />
      <View style={[styles.skeletonBox, { width: '30%', height: 16 }]} />
    </View>
    <View style={[styles.skeletonBox, { width: '50%', height: 18, marginVertical: spacing.sm }]} />
    <View style={styles.skeletonActions}>
      <View style={[styles.skeletonBox, { width: '30%', height: 36 }]} />
      <View style={[styles.skeletonBox, { width: '25%', height: 36 }]} />
      <View style={[styles.skeletonBox, { width: '20%', height: 36 }]} />
    </View>
  </View>
);

// Floating Action Button Component
interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps & { bottomInset: number }> = ({ 
  onPress, 
  accessibilityLabel,
  accessibilityRole,
  bottomInset
}) => {
  const scaleValue = useState(new Animated.Value(1))[0];
  
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
          bottom: Math.max(bottomInset, 16) + 16,
          transform: [{ scale: scaleValue }] 
        }
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.fabButton}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole as any}
        accessibilityHint="Navigate to post a new property"
      >
        <Icon name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
};

export default function MyPropertiesScreen() {
  const navigation = useNavigation<MyPropertiesScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const { user } = useAppSelector(state => state.auth);
  const { userProperties, isLoading } = useAppSelector(state => state.property);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'rented' | 'sold'>('all');
  const [error, setError] = useState<string | null>(null);

  const properties = useMemo(() => {
    return userProperties || [];
  }, [userProperties]);

  useEffect(() => {
    loadMyProperties();
  }, []);

  const loadMyProperties = async () => {
    if (!user?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    setError(null);
    try {
      await dispatch(fetchUserProperties(user.id)).unwrap();
    } catch (error) {
      setError('Failed to load your properties. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyProperties();
    setRefreshing(false);
  };

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case 'available': return { bg: '#D1FAE5', text: '#047857', border: '#34D399' };
      case 'rented': return { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' };
      case 'sold': return { bg: '#FEE2E2', text: '#DC2626', border: '#F87171' };
      default: return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    }
  };

  const filteredProperties = properties?.filter(property => 
    selectedStatus === 'all' || property.status === selectedStatus
  ) || [];

  const statusCounts = {
    all: properties?.length || 0,
    available: properties?.filter(p => p.status === 'available')?.length || 0,
    rented: properties?.filter(p => p.status === 'rented')?.length || 0,
    sold: properties?.filter(p => p.status === 'sold')?.length || 0,
  };

  const handleViewProperty = (property: Property) => {
    navigation.navigate('PropertyDetails', { propertyId: property.id, property });
  };

  const handleEditProperty = (property: Property) => {
    navigation.navigate('EditProperty', { property });
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

  const renderPropertyCard = ({ item: property }: { item: Property }) => {
    const statusStyle = getStatusColor(property.status);
    
    return (
      <Material3Card 
        variant="elevated" 
        style={{ ...styles.propertyCard as any, ...(isTablet ? { maxWidth: 600, alignSelf: 'center', width: '100%' } : {}) }}
        onPress={() => handleViewProperty(property)}
        accessibilityRole="button"
        accessibilityLabel={`Property listing for ${property.title}. Price: ${formatPrice(property.price)}. Status: ${property.status}.`}
        accessibilityHint="Tap to view property details"
      >
        {/* Header with title and status */}
        <View style={styles.propertyHeader}>
          <View style={styles.propertyTitleContainer}>
            <Text style={styles.propertyTitle} numberOfLines={2}>
              {property.title}
            </Text>
            <View style={styles.propertyLocation}>
              <Icon name="location-on" size={14} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>
                {property.location.town}, {property.location.county}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Property meta info */}
        <View style={styles.propertyMeta}>
            <View style={[styles.metaItem, { marginBottom: spacing.xs }]}>
              <Icon name="home" size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
              </Text>
            </View>
          {property.bedrooms && (
            <View style={[styles.metaItem, { marginBottom: spacing.xs }]}>
              <Icon name="hotel" size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                {`${property.bedrooms} bed${property.bedrooms > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
          {property.area_sqm && (
            <View style={[styles.metaItem, { marginBottom: spacing.xs }]}>
              <Icon name="square-foot" size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                {`${property.area_sqm} m²`}
              </Text>
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            {formatPrice(property.price)}
          </Text>
          <Text style={styles.pricePeriod}>/month</Text>
        </View>

        {/* Property stats */}
        <View style={styles.propertyStats}>
          <View style={styles.statItem}>
            <Icon name="schedule" size={18} color="#6B7280" />
            <Text style={styles.statText}>
              {new Date(property.created_at).toLocaleDateString()}
            </Text>
          </View>
          {property.images && property.images.length > 0 && (
            <View style={styles.statItem}>
              <Icon name="photo-library" size={18} color="#3B82F6" />
              <Text style={styles.statText}>
                {`${property.images.length} photo${property.images.length > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Icon name="visibility" size={18} color="#10B981" />
              <Text style={styles.statText}>
                {`${Math.floor(Math.random() * 100)} views`}
              </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleViewProperty(property)}
            style={[styles.actionButton, styles.primaryAction, { marginRight: spacing.sm }]}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${property.title}`}
          >
            <Icon name="visibility" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleEditProperty(property)}
            style={[styles.actionButton, styles.secondaryAction, { marginRight: spacing.sm }]}
            accessibilityRole="button"
            accessibilityLabel={`Edit property: ${property.title}`}
          >
            <Icon name="edit" size={18} color="#374151" />
            <Text style={styles.secondaryActionText}>Edit</Text>
          </TouchableOpacity>
          
          <View style={styles.moreActionsContainer}>
            <TouchableOpacity
              onPress={() => showPropertyActionMenu(property)}
              style={[styles.actionButton, styles.tertiaryAction]}
              accessibilityRole="button"
              accessibilityLabel="More actions for this property"
              accessibilityHint="Shows menu with status change and delete options"
            >
              <Icon name="more-vert" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </Material3Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header skeleton */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[styles.skeletonBox, { width: 40, height: 40, borderRadius: 20 }]} />
              <View style={[styles.skeletonBox, { width: 160, height: 24 }]} />
              <View style={[styles.skeletonBox, { width: 80, height: 32, borderRadius: 16 }]} />
            </View>
          </View>
          
          {/* Loading property cards */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3].map((i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Properties</Text>
              <View style={{ width: 40 }} />
            </View>
          </View>
          
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Couldn’t load your properties</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity onPress={loadMyProperties} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>My Properties</Text>
              <Text style={styles.headerSubtitle}>
                {`${properties?.length || 0} properties • ${properties?.reduce((sum, p) => sum + (Math.floor(Math.random() * 100)), 0) || 0} total views`}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Status Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          >
            {(['all', 'available', 'rented', 'sold'] as const).map((status) => {
              const isSelected = selectedStatus === status;
              const count = statusCounts[status];
              
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  style={[
                    styles.filterTab,
                    isSelected ? styles.filterTabActive : styles.filterTabInactive
                  ]}
                >
                  <Text style={[
                    styles.filterTabText,
                    isSelected ? styles.filterTabTextActive : styles.filterTabTextInactive
                  ]}>
                    {`${status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} (${count})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Properties List */}
        <FlatList
          data={filteredProperties}
          renderItem={renderPropertyCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#059669']}
              tintColor="#059669"
              title="Pull to refresh"
              titleColor="#6B7280"
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 80 }
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (<View style={{ height: spacing.md }} />)}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="home-work" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {selectedStatus === 'all' ? 'No Properties Yet' : `No ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Properties`}
              </Text>
              <Text style={styles.emptyMessage}>
                {selectedStatus === 'all' 
                  ? 'Start building your property portfolio by adding your first listing!'
                  : `You don't have any ${selectedStatus} properties at the moment.`
                }
              </Text>
              {selectedStatus === 'all' && (
                <TouchableOpacity onPress={() => navigation.navigate('PostProperty')} style={styles.emptyActionButton}>
                  <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.emptyActionText}>Post Your First Property</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        {/* Floating Action Button */}
        <FloatingActionButton 
          onPress={() => navigation.navigate('PostProperty')} 
          accessibilityLabel="Create new property listing"
          accessibilityRole="button"
          bottomInset={insets.bottom}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Base container
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header styles
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: '#64748B',
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Filter tabs
  filterContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: '#059669',
  },
  filterTabInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabTextInactive: {
    color: '#475569',
  },
  
  // List container
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  
  // Property Card Styles
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...getCrossPlatformShadow({
      height: 2,
      radius: 8,
      opacity: 0.1,
      elevation: 3,
    }),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  
  // Property Header
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  propertyTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  propertyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.xs,
  },
  propertyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: fontSize.sm,
    color: '#475569',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  
  // Property Meta Info
  propertyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginRight: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Price
  priceContainer: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#059669',
  },
  pricePeriod: {
    fontSize: fontSize.sm,
    color: '#047857',
    marginLeft: 4,
  },
  
  // Property Stats
  propertyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: fontSize.xs,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#059669',
    flex: 1,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryAction: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
  },
  secondaryActionText: {
    color: '#475569',
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 6,
  },
  tertiaryAction: {
    backgroundColor: '#F8FAFC',
    width: 44,
  },
  moreActionsContainer: {
    alignItems: 'flex-end',
  },
  
  // Loading Skeleton
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  skeletonMeta: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  skeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonBox: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    opacity: 0.6,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: fontSize.base,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  emptyActionButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    ...getCrossPlatformShadow({
      height: 4,
      radius: 8,
      opacity: 0.15,
      elevation: 4,
    }),
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    ...getCrossPlatformShadow({
      height: 8,
      radius: 16,
      opacity: 0.25,
      elevation: 8,
    }),
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
