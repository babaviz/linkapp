import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { useServiceOperations } from '../../hooks/useServiceOperations';
import EmptyState from '../../components/common/EmptyState';
import { ServiceListSkeleton } from '../../components/services';

type SavedServicesNavigationProp = StackNavigationProp<ServicesStackParamList, 'SavedServices'>;

export default function SavedServicesScreen() {
  const navigation = useNavigation<SavedServicesNavigationProp>();
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const { toggleSaveService, loadSavedServices } = useServiceOperations();
  const [savedServices, setSavedServices] = useState<any[]>([]);
  const [isLoadingSavedServices, setIsLoadingSavedServices] = useState(true);
  const [removingServiceId, setRemovingServiceId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const fetchSavedServices = async () => {
      setIsLoadingSavedServices(true);
      try {
        const services = await loadSavedServices();
        if (isActive) setSavedServices(services || []);
      } finally {
        if (isActive) setIsLoadingSavedServices(false);
      }
    };
    fetchSavedServices();
    return () => {
      isActive = false;
    };
  }, []);

  const renderSavedServiceItem = ({ item }: any) => (
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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: '#6366F1',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md
        }}>
          <Text style={{ fontSize: 24 }}>{item.image}</Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: fontSize.md, 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: 2
          }}>
            {item.title}
          </Text>
          <Text style={{ 
            fontSize: fontSize.sm, 
            color: '#6B7280',
            marginBottom: 2
          }}>
            {item.provider}
          </Text>
          <Text style={{ 
            fontSize: fontSize.xs, 
            color: '#6366F1',
            fontWeight: '600'
          }}>
            {item.category}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            // Handle remove from saved - show confirmation alert
            Alert.alert(
              'Remove Service',
              `Remove "${item.title}" from your saved services?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Remove', 
                  style: 'destructive',
                  onPress: async () => {
                    if (removingServiceId) return;
                    setRemovingServiceId(item.id);
                    setIsLoadingSavedServices(true);
                    try {
                      await toggleSaveService(item.id);
                      const updatedServices = await loadSavedServices();
                      setSavedServices(updatedServices || []);
                    } finally {
                      setIsLoadingSavedServices(false);
                      setRemovingServiceId(null);
                    }
                  }
                }
              ]
            );
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          disabled={removingServiceId === item.id}
        >
          {removingServiceId === item.id ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <MaterialIcons name="favorite" size={16} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
          <Text style={{ 
            color: '#F59E0B', 
            fontSize: fontSize.sm, 
            fontWeight: '700', 
            marginRight: spacing.xs 
          }}>
            {item.rating}
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: fontSize.xs,
            fontWeight: '600'
          }}>
            ({item.reviews} reviews)
          </Text>
        </View>
        
        <Text style={{ 
          color: '#10B981', 
          fontSize: fontSize.md, 
          fontWeight: '800' 
        }}>
          KSh {item.price.toLocaleString()}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })}
          style={{
            backgroundColor: '#6366F1',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: 8,
            flex: 1
          }}
        >
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: fontSize.sm, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Contact
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })}
          style={{
            backgroundColor: '#10B981',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: 8,
            flex: 1
          }}
        >
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: fontSize.sm, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Book Now
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
              Saved Services
            </Text>
            <Text style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: fontSize.sm,
              fontWeight: '600'
            }}>
              {isLoadingSavedServices && savedServices.length > 0 ? 'Updating…' : `${savedServices.length} saved`}
            </Text>
          </View>

          {/* Saved Services List */}
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            {isLoadingSavedServices && savedServices.length === 0 ? (
              <ServiceListSkeleton
                count={6}
                containerStyle={{ paddingHorizontal: 0 }}
                cardStyle={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
              />
            ) : (
              <FlatList
                data={savedServices}
                keyExtractor={(item) => item.id}
                renderItem={renderSavedServiceItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                  <EmptyState
                    tone="dark"
                    accentColor="#6366F1"
                    icon={<Text style={{ fontSize: 56 }}>⭐</Text>}
                    title="No saved services"
                    description="Save services you like to compare providers and reach out later."
                    style={{ flex: 0, paddingVertical: 40 }}
                    primaryAction={{
                      label: 'Browse Services',
                      onPress: () => navigation.navigate('ServicesHome'),
                    }}
                    secondaryAction={{
                      label: 'Go Back',
                      onPress: () => navigation.goBack(),
                    }}
                  />
                }
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
