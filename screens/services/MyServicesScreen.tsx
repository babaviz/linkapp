import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { useServiceOperations } from '../../hooks/useServiceOperations';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import EmptyState from '../../components/common/EmptyState';
import { ServiceListSkeleton } from '../../components/services';

export default function MyServicesScreen() {
  const navigation = useNavigation<StackNavigationProp<ServicesStackParamList>>();
  const { isTablet } = getDynamicDimensions();
  const { services, loadOwnerServices, isLoading, error, clearError } = useServiceOperations();
  const user = useSelector((state: RootState) => state.auth.user);

  const loadMyServices = useCallback(async () => {
    if (!user) return;
    await loadOwnerServices({ includeInactive: true });
  }, [user, loadOwnerServices]);

  useFocusEffect(
    useCallback(() => {
      void loadMyServices();
      return undefined;
    }, [loadMyServices])
  );

  const myServices = useMemo(() => {
    return services.map((s) => ({
      id: s.id,
      title: s.serviceName,
      status: s.status === 'active' ? 'Active' : 'Paused',
      views: 0,
      inquiries: 0,
      price: (s.pricingInfo as any)?.amount || (s.pricingInfo as any)?.hourlyRate || 0,
    }));
  }, [services]);

  const renderServiceItem = ({ item }: any) => (
    <TouchableOpacity
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
      }}
      onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <Text style={{ 
          fontSize: fontSize.lg, 
          fontWeight: '700', 
          color: '#111827',
          flex: 1,
          marginRight: spacing.sm
        }}>
          {item.title}
        </Text>
        <View style={{
          backgroundColor: item.status === 'Active' ? '#10B981' : '#F59E0B',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8
        }}>
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: fontSize.xs, 
            fontWeight: '600' 
          }}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={{ 
        fontSize: fontSize.lg, 
        fontWeight: '700', 
        color: '#6366F1',
        marginBottom: spacing.sm
      }}>
        KSh {item.price.toLocaleString()}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: fontSize.sm, color: '#6B7280' }}>Views</Text>
          <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827' }}>{item.views}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: fontSize.sm, color: '#6B7280' }}>Inquiries</Text>
          <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827' }}>{item.inquiries}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ServiceAnalytics', { serviceId: item.id })}
          style={{
            backgroundColor: '#6366F1',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: 8
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600' }}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
              My Services
            </Text>
            {isLoading && myServices.length > 0 && (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" style={{ marginRight: spacing.sm }} />
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('PostService')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: 20
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600' }}>
                + Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Services List */}
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            {isLoading && myServices.length === 0 ? (
              <ServiceListSkeleton
                count={6}
                containerStyle={{ paddingHorizontal: 0 }}
                cardStyle={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
              />
            ) : (
              <FlatList
                data={myServices}
                keyExtractor={(item) => item.id}
                renderItem={renderServiceItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                  error ? (
                    <EmptyState
                      tone="dark"
                      accentColor="#EF4444"
                      icon={<Text style={{ fontSize: 56 }}>⚠️</Text>}
                      title="Couldn't load your services"
                      description={error}
                      style={{ flex: 0, paddingVertical: 40 }}
                      primaryAction={{
                        label: 'Retry',
                        onPress: () => {
                          clearError();
                          void loadMyServices();
                        },
                      }}
                      secondaryAction={{
                        label: 'Browse Categories',
                        onPress: () => navigation.navigate('ServicesHome'),
                      }}
                    />
                  ) : (
                    <EmptyState
                      tone="dark"
                      accentColor="#6366F1"
                      icon={<Text style={{ fontSize: 56 }}>🛠️</Text>}
                      title="No services yet"
                      description="Create your first service listing so customers can find you and send requests."
                      style={{ flex: 0, paddingVertical: 40 }}
                      primaryAction={{
                        label: 'Add a Service',
                        onPress: () => navigation.navigate('PostService'),
                      }}
                      secondaryAction={{
                        label: 'Browse Categories',
                        onPress: () => navigation.navigate('ServicesHome'),
                      }}
                    />
                  )
                }
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
