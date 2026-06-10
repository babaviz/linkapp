import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

type ServiceRole = 'seeker' | 'owner';

type ServiceCategoriesRouteProp = RouteProp<ServicesStackParamList, 'ServiceCategories'>;
type ServiceCategoriesNavigationProp = StackNavigationProp<ServicesStackParamList, 'ServiceCategories'>;

interface ServiceListing {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviews: number;
  price: string;
  location: string;
  distance: string;
  image: string;
  verified: boolean;
  availability: string;
  specialties: string[];
}

const ServiceCategoriesScreen: React.FC = () => {
  const navigation = useNavigation<ServiceCategoriesNavigationProp>();
  const route = useRoute<ServiceCategoriesRouteProp>();
  const { category, role = 'seeker' } = route.params || {};
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const [savedServices, setSavedServices] = useState<string[]>([]);

  // Demo service listings data
  const serviceListings = useMemo((): ServiceListing[] => {
    const baseServices: ServiceListing[] = [
      {
        id: 'hc-1',
        name: 'Dr. Sarah Medical Clinic',
        description: 'General practice and family medicine services',
        rating: 4.8,
        reviews: 124,
        price: 'KSh 1,500',
        location: 'Nairobi CBD',
        distance: '0.8 km',
        image: '🏥',
        verified: true,
        availability: 'Open now',
        specialties: ['General Medicine', 'Family Care', 'Consultations']
      },
      {
        id: 'hc-2',
        name: 'Wellness Pharmacy Plus',
        description: '24/7 pharmacy with delivery services',
        rating: 4.6,
        reviews: 89,
        price: 'KSh 200',
        location: 'Westlands',
        distance: '1.2 km',
        image: '💊',
        verified: true,
        availability: 'Open 24/7',
        specialties: ['Prescription', 'OTC Medicines', 'Health Products']
      },
      {
        id: 'ed-1',
        name: 'Skills Academy Kenya',
        description: 'Professional IT and business skills training',
        rating: 4.9,
        reviews: 156,
        price: 'KSh 15,000',
        location: 'Karen',
        distance: '3.5 km',
        image: '🎓',
        verified: true,
        availability: 'Mon-Fri 8AM-6PM',
        specialties: ['IT Training', 'Business Skills', 'Certifications']
      },
      {
        id: 'hg-1',
        name: 'GreenThumb Gardens',
        description: 'Complete landscaping and garden maintenance services',
        rating: 4.7,
        reviews: 93,
        price: 'KSh 5,000',
        location: 'Runda',
        distance: '2.1 km',
        image: '🌿',
        verified: true,
        availability: 'Mon-Sat 7AM-5PM',
        specialties: ['Landscaping', 'Garden Maintenance', 'Plant Care']
      },
      {
        id: 'au-1',
        name: 'QuickFix Auto Services',
        description: 'Professional car repair and maintenance',
        rating: 4.5,
        reviews: 201,
        price: 'KSh 3,500',
        location: 'Industrial Area',
        distance: '4.2 km',
        image: '🔧',
        verified: true,
        availability: 'Mon-Sat 8AM-6PM',
        specialties: ['Repairs', 'Maintenance', 'Diagnostics']
      },
      {
        id: 'bw-1',
        name: 'Serenity Spa & Wellness',
        description: 'Full service spa and beauty treatments',
        rating: 4.8,
        reviews: 167,
        price: 'KSh 2,500',
        location: 'Kilimani',
        distance: '1.8 km',
        image: '💆‍♀️',
        verified: true,
        availability: 'Daily 9AM-8PM',
        specialties: ['Spa Services', 'Beauty Treatments', 'Wellness']
      },
    ];

    return baseServices;
  }, [category]);

  const getCategoryTitle = useCallback(() => {
    const categoryTitles: { [key: string]: string } = {
      'healthcare_medical': 'Healthcare & Medical',
      'education_training': 'Education & Training',
      'home_garden': 'Home & Garden',
      'automotive': 'Automotive Services',
      'beauty_wellness': 'Beauty & Wellness',
      'business_services': 'Business Services',
      'construction': 'Construction & Building',
      'entertainment': 'Entertainment & Events',
    };
    
    return category ? categoryTitles[category] || 'Services' : 'All Services';
  }, [category]);

  const handleToggleSaved = useCallback((serviceId: string) => {
    setSavedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  const handleServicePress = useCallback((serviceId: string) => {
    navigation.navigate('ServiceDetails', { serviceId });
  }, [navigation]);

  const renderServiceItem = useCallback(({ item, index }: { item: ServiceListing, index: number }) => {
    const isSaved = savedServices.includes(item.id);
    
    return (
      <Animated.View style={{ marginBottom: spacing.md }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleServicePress(item.id)}
          style={{
            backgroundColor: 'rgba(255,255,255,0.98)',
            borderRadius: 20,
            padding: spacing.lg,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)'
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
            <View style={{
              width: isTablet ? 64 : 56,
              height: isTablet ? 64 : 56,
              borderRadius: isTablet ? 32 : 28,
              backgroundColor: '#6366F1',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
              shadowColor: '#6366F1',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6
            }}>
              <Text style={{ fontSize: isTablet ? 28 : 24 }}>{item.image}</Text>
            </View>
            
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Text style={{ 
                  fontSize: isTablet ? 18 : 16, 
                  fontWeight: '800', 
                  color: '#111827',
                  flex: 1,
                  marginRight: spacing.sm
                }}>
                  {item.name}
                </Text>
                {item.verified && (
                  <View style={{
                    backgroundColor: '#10B981',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <MaterialIcons name="check" size={8} color="#FFFFFF" style={{ marginRight: 2 }} />
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 10, 
                      fontWeight: '700'
                    }}>
                      VERIFIED
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={{ 
                fontSize: isTablet ? 14 : 12, 
                color: '#6B7280',
                marginTop: 2,
                marginBottom: spacing.sm
              }}>
                {item.description}
              </Text>
              
              {/* Rating and Price */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="star" size={12} color="#F59E0B" style={{ marginRight: 3 }} />
                  <Text style={{ 
                    color: '#F59E0B', 
                    fontSize: 12, 
                    fontWeight: '700', 
                    marginRight: 4 
                  }}>
                    {item.rating}
                  </Text>
                  <Text style={{ 
                    color: '#9CA3AF', 
                    fontSize: 10,
                    fontWeight: '500'
                  }}>
                    ({item.reviews})
                  </Text>
                </View>
                
                <Text style={{ 
                  color: '#6366F1', 
                  fontSize: isTablet ? 16 : 14, 
                  fontWeight: '800' 
                }}>
                  {item.price}
                </Text>
              </View>
            </View>
          </View>

          {/* Location and Availability */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="location-on" size={12} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: '#6B7280', marginRight: spacing.md }}>
                {item.location} • {item.distance}
              </Text>
            </View>
            
            <View style={{
              backgroundColor: item.availability.includes('Open') ? '#DCFCE7' : '#FEF3C7',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: item.availability.includes('Open') ? '#BBF7D0' : '#FDE68A'
            }}>
              <Text style={{
                fontSize: 10,
                fontWeight: '600',
                color: item.availability.includes('Open') ? '#166534' : '#92400E'
              }}>
                {item.availability}
              </Text>
            </View>
          </View>

          {/* Specialties */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ marginBottom: spacing.sm }}
            contentInsetAdjustmentBehavior="automatic"
          >
            {item.specialties.map((specialty, idx) => (
              <View 
                key={`${item.id}-specialty-${idx}`}
                style={{
                  backgroundColor: '#EEF2FF',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  marginRight: 6,
                  borderWidth: 1,
                  borderColor: '#C7D2FE'
                }}
              >
                <Text style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: '#4F46E5'
                }}>
                  {specialty}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons - Dynamic based on role */}
          {role === 'seeker' ? (
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#6366F1',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginRight: spacing.xs,
                  shadowColor: '#6366F1',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4
                }}
                onPress={() => handleServicePress(item.id)}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 12, 
                  fontWeight: '700' 
                }}>
                  📞 Contact Now
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: isSaved ? '#F87171' : '#E5E7EB',
                  backgroundColor: isSaved ? '#FEE2E2' : '#F9FAFB'
                }}
                onPress={() => handleToggleSaved(item.id)}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  fontSize: 12,
                  color: isSaved ? '#DC2626' : '#6B7280'
                }}>
                  {isSaved ? '💖' : '🤍'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#10B981',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginRight: spacing.xs,
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4
                }}
                onPress={() => handleServicePress(item.id)}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 12, 
                  fontWeight: '700' 
                }}>
                  ✏️ Edit Service
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#6366F1',
                  backgroundColor: '#EEF2FF'
                }}
                onPress={() => handleServicePress(item.id)}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  fontSize: 12,
                  color: '#4F46E5'
                }}>
                  📊
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [savedServices, isTablet, handleServicePress, handleToggleSaved, role]);

  return (
    <LinearGradient
      colors={['#6366F1', '#4F46E5', '#4338CA']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            paddingHorizontal: spacing.lg, 
            paddingTop: spacing.md,
            paddingBottom: spacing.md 
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
                  justifyContent: 'center',
                  marginRight: spacing.md
                }}
              >
                <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: isTablet ? 24 : 20, 
                  fontWeight: '800'
                }}>
                  {getCategoryTitle()}
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 14,
                  marginTop: 2
                }}>
                  {serviceListings.length} services available
                </Text>
              </View>
            </View>
          </View>

          {/* Services List */}
          <FlatList
            data={serviceListings}
            keyExtractor={(item) => item.id}
            renderItem={renderServiceItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingHorizontal: spacing.lg,
              paddingBottom: 120 
            }}
            style={{ flex: 1 }}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default React.memo(ServiceCategoriesScreen);
