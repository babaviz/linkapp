import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

type ServiceAnalyticsRouteProp = RouteProp<ServicesStackParamList, 'ServiceAnalytics'>;

export default function ServiceAnalyticsScreen() {
  const navigation = useNavigation();
  const route = useRoute<ServiceAnalyticsRouteProp>();
  const { serviceId } = route.params;
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  const analyticsData = {
    views: 245,
    inquiries: 18,
    conversions: 12,
    revenue: 42000,
    rating: 4.8,
    responseTime: '2 hours'
  };

  const StatCard = ({ title, value, subtitle, color = '#6366F1' }: any) => (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      flex: 1,
      marginHorizontal: spacing.xs
    }}>
      <Text style={{ 
        fontSize: fontSize.sm, 
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 4
      }}>
        {title}
      </Text>
      <Text style={{ 
        fontSize: isTablet ? 28 : 24, 
        fontWeight: '800', 
        color: color,
        marginBottom: 4
      }}>
        {value}
      </Text>
      {subtitle && (
        <Text style={{ 
          fontSize: fontSize.xs, 
          color: '#9CA3AF' 
        }}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={['#6366F1', '#4F46E5', '#4338CA']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: spacing.lg, 
            paddingTop: spacing.md,
            paddingBottom: spacing.md 
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: isTablet ? 24 : 20, 
              fontWeight: '800',
              flex: 1
            }}>
              Service Analytics
            </Text>
          </View>

          {/* Analytics Content */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
            {/* Service Info */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 20,
              padding: spacing.lg,
              marginBottom: spacing.lg
            }}>
              <Text style={{ 
                fontSize: fontSize.lg, 
                fontWeight: '800', 
                color: '#111827',
                marginBottom: spacing.xs
              }}>
                Service ID: {serviceId}
              </Text>
              <Text style={{ 
                fontSize: fontSize.md, 
                color: '#6B7280' 
              }}>
                Analytics for the last 30 days
              </Text>
            </View>

            {/* Stats Grid */}
            <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
              <StatCard 
                title="Total Views" 
                value={analyticsData.views} 
                subtitle="+15% vs last month"
                color="#6366F1"
              />
              <StatCard 
                title="Inquiries" 
                value={analyticsData.inquiries} 
                subtitle="+8% vs last month"
                color="#10B981"
              />
            </View>

            <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
              <StatCard 
                title="Conversions" 
                value={analyticsData.conversions} 
                subtitle="66.7% conversion rate"
                color="#F59E0B"
              />
              <StatCard 
                title="Revenue" 
                value={`KSh ${analyticsData.revenue.toLocaleString()}`} 
                subtitle="+22% vs last month"
                color="#10B981"
              />
            </View>

            <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
              <StatCard 
                title="Rating" 
                value={analyticsData.rating} 
                subtitle="⭐⭐⭐⭐⭐"
                color="#F59E0B"
              />
              <StatCard 
                title="Avg Response" 
                value={analyticsData.responseTime} 
                subtitle="Faster than 85% of providers"
                color="#6366F1"
              />
            </View>

            {/* Performance Insights */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 20,
              padding: spacing.lg,
              marginTop: spacing.md
            }}>
              <Text style={{ 
                fontSize: fontSize.lg, 
                fontWeight: '800', 
                color: '#111827',
                marginBottom: spacing.md
              }}>
                Performance Insights
              </Text>
              
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#10B981', marginBottom: 4 }}>
                  ✅ Great Response Time
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: '#6B7280' }}>
                  You respond to inquiries faster than 85% of service providers
                </Text>
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#F59E0B', marginBottom: 4 }}>
                  📈 Trending Up
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: '#6B7280' }}>
                  Your service views have increased by 15% this month
                </Text>
              </View>

              <View>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#6366F1', marginBottom: 4 }}>
                  💡 Tip
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: '#6B7280' }}>
                  Add more photos to your service to increase inquiries by up to 30%
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
