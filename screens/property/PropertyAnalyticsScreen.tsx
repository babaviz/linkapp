/**
 * PropertyAnalyticsScreen
 * Property listing analytics with views, contacts, and performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { Property } from '../../types/property';
import { formatPrice, getPropertyTypeLabel } from '../../utils/propertyHelpers';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

type PropertyAnalyticsRouteProp = RouteProp<PropertyStackParamList, 'PropertyAnalytics'>;
type PropertyAnalyticsNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyAnalytics'>;

interface AnalyticsData {
  totalViews: number;
  todayViews: number;
  weekViews: number;
  totalContacts: number;
  todayContacts: number;
  weekContacts: number;
  favoritesCount: number;
  shareCount: number;
  viewsHistory: { date: string; views: number }[];
  contactsHistory: { date: string; contacts: number }[];
  topSources: { source: string; count: number; percentage: number }[];
  demographics: {
    locations: { location: string; percentage: number }[];
    devices: { device: string; percentage: number }[];
  };
}

export default function PropertyAnalyticsScreen() {
  const route = useRoute<PropertyAnalyticsRouteProp>();
  const navigation = useNavigation<PropertyAnalyticsNavigationProp>();
  const dispatch = useAppDispatch();
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  const { propertyId, property: routeProperty } = route.params;

  // For demo purposes, using mock analytics data
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalViews: 1247,
    todayViews: 23,
    weekViews: 156,
    totalContacts: 34,
    todayContacts: 2,
    weekContacts: 8,
    favoritesCount: 45,
    shareCount: 12,
    viewsHistory: [
      { date: '2025-01-01', views: 12 },
      { date: '2025-01-02', views: 18 },
      { date: '2025-01-03', views: 25 },
      { date: '2025-01-04', views: 15 },
      { date: '2025-01-05', views: 32 },
      { date: '2025-01-06', views: 28 },
      { date: '2025-01-07', views: 23 }
    ],
    contactsHistory: [
      { date: '2025-01-01', contacts: 1 },
      { date: '2025-01-02', contacts: 2 },
      { date: '2025-01-03', contacts: 0 },
      { date: '2025-01-04', contacts: 1 },
      { date: '2025-01-05', contacts: 3 },
      { date: '2025-01-06', contacts: 1 },
      { date: '2025-01-07', contacts: 2 }
    ],
    topSources: [
      { source: 'Property Search', count: 456, percentage: 36.6 },
      { source: 'Map View', count: 287, percentage: 23.0 },
      { source: 'Featured', count: 198, percentage: 15.9 },
      { source: 'Direct Link', count: 145, percentage: 11.6 },
      { source: 'Social Media', count: 89, percentage: 7.1 },
      { source: 'Other', count: 72, percentage: 5.8 }
    ],
    demographics: {
      locations: [
        { location: 'Nairobi', percentage: 45.2 },
        { location: 'Mombasa', percentage: 18.3 },
        { location: 'Kisumu', percentage: 12.1 },
        { location: 'Nakuru', percentage: 8.7 },
        { location: 'Eldoret', percentage: 6.9 },
        { location: 'Other', percentage: 8.8 }
      ],
      devices: [
        { device: 'Mobile', percentage: 68.4 },
        { device: 'Desktop', percentage: 24.7 },
        { device: 'Tablet', percentage: 6.9 }
      ]
    }
  });

  const [refreshing, setRefreshing] = useState(false);
  const [timeFrame, setTimeFrame] = useState<'day' | 'week' | 'month'>('week');

  // For demo, using a sample property
  const property = routeProperty || {
    id: propertyId,
    owner_id: 'demo-owner',
    title: 'Modern 3BR Apartment in Westlands',
    price: 8500000,
    property_type: 'apartments' as const,
    currency: 'KSH' as const,
    location: {
      address: 'Westlands, Nairobi',
      coordinates: { latitude: -1.2693, longitude: 36.8084 },
      county: 'Nairobi',
      town: 'Westlands'
    },
    images: [],
    amenities: ['Parking', 'Security'],
    status: 'available' as const,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  } as Property;

  const handleRefresh = () => {
    setRefreshing(true);
    // In real app, fetch fresh analytics data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const calculateConversionRate = () => {
    if (analyticsData.totalViews === 0) return 0;
    return ((analyticsData.totalContacts / analyticsData.totalViews) * 100).toFixed(1);
  };

  const StatCard = ({ title, value, subtitle, change, color = '#10B981' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    change?: string;
    color?: string;
  }) => (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: color
    }}>
      <Text style={{ 
        fontSize: 14, 
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 4
      }}>
        {title}
      </Text>
      <Text style={{ 
        fontSize: 24, 
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2
      }}>
        {value}
      </Text>
      {subtitle && (
        <Text style={{ 
          fontSize: 12, 
          color: '#9CA3AF'
        }}>
          {subtitle}
        </Text>
      )}
      {change && (
        <Text style={{ 
          fontSize: 12, 
          color: change.startsWith('+') ? '#10B981' : '#EF4444',
          fontWeight: '500',
          marginTop: 4
        }}>
          {change}
        </Text>
      )}
    </View>
  );

  const SimpleChart = ({ data, color = '#10B981', height = 60 }: {
    data: number[];
    color?: string;
    height?: number;
  }) => {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        height,
        paddingHorizontal: 4
      }}>
        {data.map((value, index) => {
          const heightPercentage = ((value - minValue) / range) * 0.8 + 0.2;
          return (
            <View
              key={index}
              style={{
                flex: 1,
                backgroundColor: color,
                height: height * heightPercentage,
                marginHorizontal: 1,
                borderRadius: 2,
                opacity: 0.8
              }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ 
        paddingHorizontal: isTablet ? 24 : 16,
        paddingVertical: isTablet ? 16 : 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: isTablet ? 20 : 18, 
                fontWeight: '700',
                color: '#111827'
              }}>
                📊 Property Analytics
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280'
              }} numberOfLines={1}>
                {property.title}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('PropertyDetails', {
              propertyId: property.id,
              property
            })}
            style={{ 
              backgroundColor: '#10B981',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
              View Listing
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Frame Selector */}
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          {[
            { key: 'day', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' }
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setTimeFrame(option.key as any)}
              style={{
                backgroundColor: timeFrame === option.key ? '#10B981' : '#F3F4F6',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8
              }}
            >
              <Text style={{
                color: timeFrame === option.key ? '#FFFFFF' : '#374151',
                fontWeight: '500',
                fontSize: 14
              }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: isTablet ? 24 : 16,
          paddingVertical: 16
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600',
            color: '#111827',
            marginBottom: 16
          }}>
            Key Metrics
          </Text>

          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <StatCard
                title="Total Views"
                value={analyticsData.totalViews.toLocaleString()}
                subtitle="All time"
                change="+12% vs last week"
                color="#3B82F6"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <StatCard
                title="This Week"
                value={analyticsData.weekViews}
                subtitle="Views"
                change="+8% vs last week"
                color="#10B981"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <StatCard
                title="Total Contacts"
                value={analyticsData.totalContacts}
                subtitle="Inquiries received"
                change="+3 this week"
                color="#F59E0B"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <StatCard
                title="Conversion Rate"
                value={`${calculateConversionRate()}%`}
                subtitle="Views to contacts"
                color="#8B5CF6"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <StatCard
                title="Favorites"
                value={analyticsData.favoritesCount}
                subtitle="Times saved"
                color="#EF4444"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <StatCard
                title="Shares"
                value={analyticsData.shareCount}
                subtitle="Times shared"
                color="#06B6D4"
              />
            </View>
          </View>
        </View>

        {/* Views Trend */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600',
            color: '#111827',
            marginBottom: 12
          }}>
            Views Trend (Last 7 Days)
          </Text>
          <SimpleChart 
            data={analyticsData.viewsHistory.map(d => d.views)}
            color="#3B82F6"
            height={80}
          />
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginTop: 8
          }}>
            {analyticsData.viewsHistory.map((day, index) => (
              <Text key={index} style={{ 
                fontSize: 10, 
                color: '#9CA3AF',
                textAlign: 'center'
              }}>
                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
              </Text>
            ))}
          </View>
        </View>

        {/* Traffic Sources */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600',
            color: '#111827',
            marginBottom: 12
          }}>
            Traffic Sources
          </Text>
          
          {analyticsData.topSources.map((source, index) => (
            <View 
              key={index}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                marginBottom: 12
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: 2
                }}>
                  {source.source}
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: '#6B7280'
                }}>
                  {source.count} views ({source.percentage}%)
                </Text>
              </View>
              <View style={{
                backgroundColor: '#F3F4F6',
                height: 8,
                borderRadius: 4,
                width: 100,
                overflow: 'hidden'
              }}>
                <View style={{
                  backgroundColor: '#10B981',
                  height: '100%',
                  width: `${source.percentage}%`,
                  borderRadius: 4
                }} />
              </View>
            </View>
          ))}
        </View>

        {/* Demographics */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600',
            color: '#111827',
            marginBottom: 16
          }}>
            Viewer Demographics
          </Text>

          {/* Top Locations */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '500',
              color: '#374151',
              marginBottom: 8
            }}>
              Top Locations
            </Text>
            {analyticsData.demographics.locations.slice(0, 3).map((location, index) => (
              <View 
                key={index}
                style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 4
                }}
              >
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                  {location.location}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' }}>
                  {location.percentage}%
                </Text>
              </View>
            ))}
          </View>

          {/* Device Types */}
          <View>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '500',
              color: '#374151',
              marginBottom: 8
            }}>
              Device Types
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {analyticsData.demographics.devices.map((device, index) => (
                <View 
                  key={index}
                  style={{ 
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 8,
                    backgroundColor: index === 0 ? '#F0FDF4' : index === 1 ? '#EFF6FF' : '#FDF2F8',
                    marginHorizontal: 2,
                    borderRadius: 8
                  }}
                >
                  <Text style={{ 
                    fontSize: 18,
                    marginBottom: 4
                  }}>
                    {device.device === 'Mobile' ? '📱' : device.device === 'Desktop' ? '💻' : '📊'}
                  </Text>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    {device.device}
                  </Text>
                  <Text style={{ 
                    fontSize: 11, 
                    color: '#6B7280'
                  }}>
                    {device.percentage}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Performance Tips */}
        <View style={{
          backgroundColor: '#F0FDF4',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: '#BBF7D0'
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600',
            color: '#065F46',
            marginBottom: 12
          }}>
            💡 Performance Tips
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: '#047857',
            lineHeight: 20,
            marginBottom: 8
          }}>
            • Your listing has a {calculateConversionRate()}% conversion rate
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: '#047857',
            lineHeight: 20,
            marginBottom: 8
          }}>
            • Add more photos to increase engagement
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: '#047857',
            lineHeight: 20
          }}>
            • Update your description to improve visibility
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
