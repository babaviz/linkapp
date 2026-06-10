/**
 * MyPropertiesScreen - Property Management Dashboard
 * TaskMaster Task 10: Property Management Dashboard Implementation
 * Allows property owners to manage their listings, view stats, and handle inquiries
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  StyleSheet 
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, shadows, borderRadius } from '../../theme';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { 
  fetchUserProperties, 
  updatePropertyStatus, 
  deleteProperty,
  fetchPropertyStats 
} from '../../redux/slices/propertySlice';
import { 
  fetchOwnerInquiries, 
  fetchInquiryStats 
} from '../../redux/slices/messageSlice';
import { Property, PropertyStatus } from '../../types/property';
import { PropertyCard, PropertyNavigationMenu } from '../../components/property';
import { formatPrice } from '../../utils/propertyHelpers';
import { getUserFacingError } from '../../utils/userFacingError';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';

type MyPropertiesScreenNavigationProp = StackNavigationProp<PropertyStackParamList, 'MyProperties'>;

interface PropertyStatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  subtitle?: string;
}

const PropertyStatsCard: React.FC<PropertyStatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle 
}) => (
  <View style={{
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <View style={{
        width: 40,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
      }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 24,
          fontWeight: '800',
          color: color,
          marginBottom: 2
        }}>{value}</Text>
        <Text style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#6B7280',
          letterSpacing: 0.2
        }}>{title}</Text>
        {subtitle && (
          <Text style={{
            fontSize: 11,
            color: '#9CA3AF',
            marginTop: 2,
            fontWeight: '500'
          }}>{subtitle}</Text>
        )}
      </View>
    </View>
  </View>
);

interface PropertyManagementItemProps {
  property: Property;
  onEdit: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
  onViewInquiries: () => void;
}

const PropertyManagementItem: React.FC<PropertyManagementItemProps> = ({
  property,
  onEdit,
  onStatusChange,
  onDelete,
  onViewInquiries
}) => {
  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case 'available': return '#059669';
      case 'rented': return '#2563EB';
      case 'sold': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status: PropertyStatus) => {
    switch (status) {
      case 'available': return '#D1FAE5';
      case 'rented': return '#DBEAFE';
      case 'sold': return '#F3F4F6';
      default: return '#F3F4F6';
    }
  };

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)'
    }}>
      {/* Property Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{
              width: 48,
              height: 48,
              backgroundColor: '#F8FAFC',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2
            }}>
              <Text style={{ fontSize: 20 }}>🏠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1F2937',
                marginBottom: 4,
                lineHeight: 24
              }}>
                {property.title}
              </Text>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#059669'
              }}>
                {formatPrice(property.price)}
              </Text>
            </View>
          </View>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            fontWeight: '500',
            marginLeft: 60
          }}>
            📍 {property.location.town}, {property.location.county}
          </Text>
        </View>
        <View style={{
          backgroundColor: getStatusBgColor(property.status),
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: getStatusColor(property.status) + '40'
        }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: getStatusColor(property.status),
            textTransform: 'capitalize'
          }}>
            {property.status}
          </Text>
        </View>
      </View>

      {/* Property Stats */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
          <View style={{
            width: 28,
            height: 28,
            backgroundColor: '#F3F4F6',
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8
          }}>
            <Text style={{ fontSize: 12 }}>📅</Text>
          </View>
          <Text style={{
            fontSize: 13,
            color: '#6B7280',
            fontWeight: '500'
          }}>
            Posted {new Date(property.created_at).toLocaleDateString()}
          </Text>
        </View>
        {property.images.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 28,
              height: 28,
              backgroundColor: '#F3F4F6',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8
            }}>
              <Text style={{ fontSize: 12 }}>📷</Text>
            </View>
            <Text style={{
              fontSize: 13,
              color: '#6B7280',
              fontWeight: '500'
            }}>
              {property.images.length} photos
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <TouchableOpacity
          onPress={onViewInquiries}
          style={{
            backgroundColor: '#059669',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            flex: 1,
            alignItems: 'center',
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>💬 Inquiries</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onEdit}
          style={{
            backgroundColor: '#6B7280',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            flex: 1,
            alignItems: 'center',
            shadowColor: '#6B7280',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>✏️ Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onStatusChange}
          style={{
            backgroundColor: '#2563EB',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            flex: 1,
            alignItems: 'center',
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>🔄 Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onDelete}
          style={{
            backgroundColor: '#EF4444',
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            minWidth: 44,
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function MyPropertiesScreen() {
  const navigation = useNavigation<MyPropertiesScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const { user } = useAppSelector(state => state.auth);
  const { 
    userProperties, 
    error,
    stats: propertyStats 
  } = useAppSelector(state => state.property);
  const { 
    inquiryStats 
  } = useAppSelector(state => state.message);

  const [refreshing, setRefreshing] = useState(false); // Only for pull-to-refresh
  const [initialLoading, setInitialLoading] = useState(true); // For first load
  const [backgroundLoading, setBackgroundLoading] = useState(false); // For background updates
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  // Animation for background loading indicator
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  
  useEffect(() => {
    if (backgroundLoading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [backgroundLoading, pulseAnim]);

  const loadDashboardData = useCallback(async (isUserInitiated = false) => {
    if (!user?.id) {
      setInitialLoading(false);
      return;
    }

    // Set appropriate loading state based on context
    if (!isUserInitiated) {
      if (initialLoading) {
        // Keep initialLoading true for first load
      } else {
        setBackgroundLoading(true);
      }
    }

    try {
      await Promise.allSettled([
        dispatch(fetchUserProperties(user.id)),
        dispatch(fetchPropertyStats()),
        dispatch(fetchOwnerInquiries(user.id)),
        dispatch(fetchInquiryStats(user.id))
      ]);
    } catch (error) {
      
    } finally {
      setInitialLoading(false);
      setBackgroundLoading(false);
    }
  }, [user?.id, dispatch]);

  // Load data only once when component mounts and user is available
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  useEffect(() => {
    if (user?.id && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
      loadDashboardData();
    }
  }, [user?.id, hasInitiallyLoaded, loadDashboardData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData(true); // Pass true for user-initiated refresh
    setRefreshing(false);
  }, [loadDashboardData]);

  const handleEditProperty = useCallback((property: Property) => {
    navigation.navigate('EditProperty', { property });
  }, [navigation]);

  const handleStatusChange = useCallback((property: Property) => {
    setSelectedProperty(property);
    setShowStatusModal(true);
  }, []);

  const handleDeleteProperty = useCallback((property: Property) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${property.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProperty(property.id)).unwrap();
              Alert.alert('Success', 'Property deleted successfully.');
            } catch (error: any) {
              const friendly = getUserFacingError(error, {
                action: 'delete this property',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          }
        }
      ]
    );
  }, [dispatch]);

  const handleViewInquiries = useCallback((property: Property) => {
    // Navigate to inquiries screen with property filter
    navigation.navigate('Inquiries');
  }, [navigation]);

  const handleUpdatePropertyStatus = async (newStatus: PropertyStatus) => {
    if (!selectedProperty) return;

    try {
      await dispatch(updatePropertyStatus({ 
        propertyId: selectedProperty.id, 
        status: newStatus 
      })).unwrap();
      
      setShowStatusModal(false);
      setSelectedProperty(null);
      Alert.alert('Success', `Property status updated to ${newStatus}`);
    } catch (error: any) {
      const friendly = getUserFacingError(error, {
        action: 'update this property status',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const renderProperty = useCallback(({ item }: { item: Property }) => (
    <PropertyManagementItem
      property={item}
      onEdit={() => handleEditProperty(item)}
      onStatusChange={() => handleStatusChange(item)}
      onDelete={() => handleDeleteProperty(item)}
      onViewInquiries={() => handleViewInquiries(item)}
    />
  ), [handleEditProperty, handleStatusChange, handleDeleteProperty, handleViewInquiries]);

  // Calculate dashboard metrics (memoized to prevent unnecessary re-renders)
  const dashboardMetrics = useMemo(() => {
    const totalListings = userProperties.length;
    const availableListings = userProperties.filter(p => p.status === 'available').length;
    const rentedListings = userProperties.filter(p => p.status === 'rented').length;
    const soldListings = userProperties.filter(p => p.status === 'sold').length;
    const totalInquiries = inquiryStats?.total_inquiries || 0;
    const pendingInquiries = inquiryStats?.pending_inquiries || 0;
    
    return {
      totalListings,
      availableListings,
      rentedListings,
      soldListings,
      totalInquiries,
      pendingInquiries
    };
  }, [userProperties, inquiryStats]);

  if (!user) {
    return (
      <SafeAreaView style={styles.style1}>
        <View style={styles.style2}>
          <Text style={styles.style3}>
            Please log in to manage your properties
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Enhanced Header - My Properties */}
        <View style={{ 
          paddingHorizontal: spacing.lg, 
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light
        }}>
          {/* Title Row with Better Spacing */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: spacing.lg,
            paddingBottom: spacing.xs
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.secondary[100],
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.lg,
                borderWidth: 1,
                borderColor: colors.border.light,
                ...shadows.base
              }}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={{ 
                color: colors.text.primary, 
                fontSize: isTablet ? 30 : screenWidth < 360 ? 22 : 26, 
                fontWeight: '800',
                letterSpacing: -0.5,
                marginBottom: spacing.xs
              }}>
                My Properties
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: isTablet ? 16 : screenWidth < 360 ? 13 : 15,
                fontWeight: '500',
                letterSpacing: 0.3
              }}>
                {userProperties.length} properties • Manage & track
              </Text>
            </View>

            {/* Three-dot Menu Button */}
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.secondary[100],
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border.light,
                ...shadows.base
              }}
              activeOpacity={0.7}
            >
              <Icon name="more-vert" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Property Hub Style Search Bar */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: spacing.lg,
            paddingHorizontal: spacing.xs
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderRadius: 28,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                marginRight: spacing.md,
                borderWidth: 1,
                borderColor: colors.border.light,
                ...shadows.base
              }}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('PropertySearch', {})}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: colors.secondary[200],
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.sm
              }}>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>🔍</Text>
              </View>
              <Text style={{
                flex: 1,
                fontSize: isTablet ? 16 : 15,
                color: colors.text.tertiary,
                fontWeight: '400',
                fontStyle: 'italic',
                letterSpacing: 0.2
              }}>
                Search and manage your properties...
              </Text>
            </TouchableOpacity>
            
            {/* Location/Map Button - Design System Style */}
            <TouchableOpacity
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border.light,
                ...shadows.base
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.error[500],
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{ fontSize: 12, color: colors.text.inverse, fontWeight: '600' }}>📍</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Enhanced Quick Stats Row */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-around',
            backgroundColor: colors.secondary[50],
            borderRadius: 24,
            paddingVertical: spacing.md,
            borderWidth: 1,
            borderColor: colors.border.light,
            ...shadows.base
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                color: colors.success[600], 
                fontSize: 20, 
                fontWeight: '800'
              }}>
                {userProperties.filter(p => p.status === 'available').length}
              </Text>
              <Text style={{ 
                color: colors.text.secondary, 
                fontSize: 12, 
                fontWeight: '600',
                letterSpacing: 0.5
              }}>
                Available
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                color: colors.warning[600], 
                fontSize: 20, 
                fontWeight: '800'
              }}>
                {userProperties.filter(p => p.status === 'rented').length}
              </Text>
              <Text style={{ 
                color: colors.text.secondary, 
                fontSize: 12, 
                fontWeight: '600',
                letterSpacing: 0.5
              }}>
                Rented
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                color: colors.info[600], 
                fontSize: 20, 
                fontWeight: '800'
              }}>
                {userProperties.filter(p => p.status === 'sold').length}
              </Text>
              <Text style={{ 
                color: colors.text.secondary, 
                fontSize: 12, 
                fontWeight: '600',
                letterSpacing: 0.5
              }}>
                Sold
              </Text>
            </View>
          </View>
        </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Dashboard Overview */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#1F2937',
              letterSpacing: -0.5
            }}>📊 Dashboard Overview</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {backgroundLoading && (
                <View style={{
                  backgroundColor: '#E0F2FE',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Animated.View style={{
                    width: 8,
                    height: 8,
                    backgroundColor: '#0284C7',
                    borderRadius: 4,
                    opacity: pulseAnim,
                  }} />
                  <Text style={{ fontSize: 10, color: '#0284C7', fontWeight: '500' }}>Updating...</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleRefresh}
                style={{
                  backgroundColor: '#F3F4F6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ marginBottom: 24 }}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <PropertyStatsCard
              title="Total"
              value={dashboardMetrics.totalListings}
              icon="🏠"
              color="#2563EB"
              subtitle="Properties"
            />
            <PropertyStatsCard
              title="Available"
              value={dashboardMetrics.availableListings}
              icon="✅"
              color="#059669"
              subtitle="Active listings"
            />
            <PropertyStatsCard
              title="Rented"
              value={dashboardMetrics.rentedListings}
              icon="🔑"
              color="#2563EB"
              subtitle="Occupied"
            />
            <PropertyStatsCard
              title="Sold"
              value={dashboardMetrics.soldListings}
              icon="💰"
              color="#7C3AED"
              subtitle="Completed"
            />
            <PropertyStatsCard
              title="Inquiries"
              value={dashboardMetrics.totalInquiries}
              icon="💬"
              color="#EA580C"
              subtitle={`${dashboardMetrics.pendingInquiries} pending`}
            />
          </ScrollView>
        </View>

        {/* Enhanced Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{
            fontSize: 22,
            fontWeight: '800',
            color: '#1F2937',
            marginBottom: 16,
            letterSpacing: -0.5
          }}>🚀 Quick Actions</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('PostProperty')}
              style={{
                backgroundColor: '#059669',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderRadius: 16,
                flex: 1,
                alignItems: 'center',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 6
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                color: 'white',
                fontWeight: '700',
                fontSize: 15,
                letterSpacing: 0.3
              }}>✨ Add Property</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('Inquiries')}
              style={{
                backgroundColor: '#2563EB',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderRadius: 16,
                flex: 1,
                alignItems: 'center',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 6,
                position: 'relative'
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                color: 'white',
                fontWeight: '700',
                fontSize: 15,
                letterSpacing: 0.3
              }}>💬 View Inquiries</Text>
              {dashboardMetrics.pendingInquiries > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 24,
                  height: 24,
                  backgroundColor: '#EF4444',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'white'
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 10,
                    fontWeight: '700'
                  }}>
                    {dashboardMetrics.pendingInquiries > 9 ? '9+' : dashboardMetrics.pendingInquiries}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error State */}
        {error && (
          <View style={{
            backgroundColor: '#FEF2F2',
            borderWidth: 1,
            borderColor: '#FECACA',
            marginHorizontal: 20,
            marginBottom: 16,
            padding: 16,
            borderRadius: 12
          }}>
            <Text style={{ color: '#DC2626', textAlign: 'center', fontWeight: '500' }}>{error}</Text>
          </View>
        )}

        {/* Enhanced Properties List */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#1F2937',
              letterSpacing: -0.5
            }}>
              🏠 Your Properties ({userProperties.length})
            </Text>
            {userProperties.length > 1 && (
              <TouchableOpacity 
                onPress={() => Alert.alert('Filter Properties', 'Property filtering options coming soon!')}
                style={{
                  backgroundColor: '#F3F4F6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>🔍 Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          {initialLoading && userProperties.length === 0 ? (
            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 40,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 6
            }}>
              <View style={{
                width: 60,
                height: 60,
                backgroundColor: '#F3F4F6',
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <Text style={{ fontSize: 24 }}>⏳</Text>
              </View>
              <Text style={{
                color: '#6B7280',
                fontSize: 18,
                fontWeight: '600',
                marginBottom: 8,
                textAlign: 'center'
              }}>Loading properties...</Text>
              <Text style={{
                color: '#9CA3AF',
                fontSize: 14,
                textAlign: 'center'
              }}>Please wait while we fetch your listings</Text>
            </View>
          ) : userProperties.length === 0 ? (
            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 40,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 6
            }}>
              <View style={{
                width: 80,
                height: 80,
                backgroundColor: '#F3F4F6',
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20
              }}>
                <Text style={{ fontSize: 40 }}>🏠</Text>
              </View>
              <Text style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#1F2937',
                marginBottom: 12,
                textAlign: 'center'
              }}>
                No Properties Yet
              </Text>
              <Text style={{
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 24,
                fontSize: 16,
                lineHeight: 24
              }}>
                Start building your property portfolio by adding your first listing.
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('PostProperty')}
                style={{
                  backgroundColor: '#059669',
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 16,
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 6
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>✨ Post Your First Property</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={userProperties}
              renderItem={renderProperty}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Enhanced Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 12
          }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{
                width: 60,
                height: 60,
                backgroundColor: '#F3F4F6',
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <Text style={{ fontSize: 28 }}>🔄</Text>
              </View>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#1F2937',
                textAlign: 'center',
                marginBottom: 8
              }}>
                Update Property Status
              </Text>
              
              {selectedProperty && (
                <Text style={{
                  fontSize: 14,
                  color: '#6B7280',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  {selectedProperty.title}
                </Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => handleUpdatePropertyStatus('available')}
                style={{
                  backgroundColor: '#059669',
                  paddingVertical: 16,
                  borderRadius: 16,
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: 16
                }}>✅ Mark as Available</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleUpdatePropertyStatus('rented')}
                style={{
                  backgroundColor: '#2563EB',
                  paddingVertical: 16,
                  borderRadius: 16,
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: 16
                }}>🔑 Mark as Rented</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleUpdatePropertyStatus('sold')}
                style={{
                  backgroundColor: '#7C3AED',
                  paddingVertical: 16,
                  borderRadius: 16,
                  shadowColor: '#7C3AED',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: 16
                }}>💰 Mark as Sold</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedProperty(null);
                }}
                style={{
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 16,
                  borderRadius: 16,
                  marginTop: 8
                }}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: '#6B7280',
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: 16
                }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Property Navigation Menu */}
      <PropertyNavigationMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userType="property_owner"
        currentScreen="MyProperties"
      />
    </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  style1: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style2: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center',
  'paddingHorizontal': 24
},
  style3: {
  'fontSize': 18,
  'color': '#4B5563',
  'marginBottom': 16,
  'textAlign': 'center'
},
});
